/* Bajo Presión CG · motor de la SALIDA (v1)
   Lee el estado compartido (state/aire, o state/preview con ?canal=preview) y dibuja las gráficas.
   No depende de que el panel esté abierto: el estado vive en el Store (localStorage o Firebase).
   Reglas:
     - Una gráfica por "capa" (gc, logo, video...): la nueva reemplaza a la anterior.
     - Si la gráfica trae transición ("via"), primero entra la transición y el cambio ocurre en el punto de corte.
     - Si algún dato es PENDIENTE_..., la gráfica NO se muestra (se informa al panel en state/estado/<capa>).
*/
(function () {
  "use strict";
  var BP = window.BP;
  var P = BP.params(), canal = P.canal === "preview" ? "preview" : "aire", escribe = !P.monitor;   // los monitores del panel solo miran
  var store = BP.createStore(P);
  var cfg = BP.DEFAULT_CONFIG, want = {}, actual = {}, cola = Promise.resolve();
  var $ = function (id) { return document.getElementById(id); };
    var capas = { logo: $("capa-logo"), gc: $("capa-gc"), video: $("capa-video") }, capaTrans = $("capa-trans");
  // capa de la huincha: se crea aquí (no hace falta tocar salida.html); su orden de apilado está en salida.css
  capas.huincha = $("capa-huincha") || (function () { var c = document.createElement("div"); c.id = "capa-huincha"; c.className = "capa"; $("stage").insertBefore(c, capas.gc); return c; })();

  // ---------- lienzo 1920x1080 escalado al tamaño de la fuente de navegador
  function fit() { $("stage").style.transform = "scale(" + Math.min(innerWidth / 1920, innerHeight / 1080) + ")"; }
  addEventListener("resize", fit); fit();
  if (P.fondo) { document.body.className = "fondo-" + P.fondo; }

  // ---------- gráfica: logo de esquina
  function Logo(layer, datos) {
    var img = document.createElement("img"), pos = datos.posicion || "tr", w = +datos.ancho || 210;
    img.src = (cfg.programa && cfg.programa.logo) || "assets/logo.png"; img.className = "logo-img"; img.style.width = w + "px";
    if (pos.indexOf("l") >= 0) { img.style.left = "60px"; } else { img.style.right = "60px"; }
    if (pos.indexOf("b") >= 0) { img.style.bottom = "50px"; } else { img.style.top = "45px"; }
    layer.appendChild(img); this.el = img;
  }
  Logo.prototype.in = function () { this.el.animate([{ opacity: 0, transform: "scale(.9)" }, { opacity: 1, transform: "scale(1)" }], { duration: BP.dur(450), easing: "cubic-bezier(.16,.84,.24,1)", fill: "both" }); };
  Logo.prototype.out = function () {
    var self = this;
    return new Promise(function (res) {
      var a = self.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: BP.dur(300), fill: "both" });
      a.onfinish = function () { if (self.el.parentNode) { self.el.parentNode.removeChild(self.el); } res(); };
    });
  };

  // ---------- croma: quita el color de fondo (ej. verde #34FE00) con un filtro SVG (alfa por distancia al color + corrección de borde verde)
  function chromaFiltro(id, ch) {
    var fid = "bp-ck-" + String(id).replace(/[^A-Za-z0-9_-]/g, ""), hex, rgb, dom, D0, sim, suav, T, co, av, i, svg;
    if (document.getElementById(fid)) { return fid; }
    hex = String(ch.color || "#34FE00").replace("#", ""); rgb = [0, 2, 4].map(function (k) { return parseInt(hex.substr(k, 2), 16) / 255; });
    dom = rgb[0] >= rgb[1] && rgb[0] >= rgb[2] ? 0 : (rgb[1] >= rgb[2] ? 1 : 2);                  // canal dominante del color de croma
    D0 = rgb[dom] - (rgb[0] + rgb[1] + rgb[2] - rgb[dom]) / 2;
    sim = ch.similitud == null ? 0.32 : +ch.similitud; suav = Math.max(0.02, ch.suavidad == null ? 0.08 : +ch.suavidad);
    T = D0 * (1 - sim); co = [0.5 / suav, 0.5 / suav, 0.5 / suav]; co[dom] = -1 / suav;           // alfa = (T - (dominante - promedio de los otros)) / suavidad
    av = [1, 0, 0, 0, 0,  0, 1, 0, 0, 0,  0, 0, 1, 0, 0,  0, 0, 0, 1, 0];
    for (i = 0; i < 3; i++) { av[dom * 5 + i] = (i === dom) ? 0 : 0.5; }                           // límite = promedio de los otros dos + margen
    av[dom * 5 + 4] = 0.14;                                                                         // el margen evita alterar colores de la paleta (ej. celeste #50C3FF)
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.cssText = "position:absolute;left:0;top:0";
    svg.innerHTML = '<filter id="' + fid + '" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">' +
      '<feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  ' + co[0] + " " + co[1] + " " + co[2] + " 0 " + (T / suav) + '" result="m"/>' +
      '<feColorMatrix in="SourceGraphic" type="matrix" values="' + av.join(" ") + '" result="a"/>' +
      '<feBlend in="SourceGraphic" in2="a" mode="darken" result="d"/><feComposite in="d" in2="m" operator="in"/></filter>';
    document.body.appendChild(svg);
    return fid;
  }

  // ---------- gráfica: imagen fija (PNG/WebP/JPG a pantalla completa 1920x1080; queda hasta que se oculte)
  function Imagen(layer, datos) {
    var m = (cfg.medios || {})[datos.medio] || {}, img = document.createElement("img");
    img.className = "video-el"; img.src = m.img || "";
    if (m.chroma) { img.style.filter = "url(#" + chromaFiltro(datos.medio, m.chroma) + ")"; }
    img.addEventListener("error", function () { console.warn("imagen no disponible", datos.medio); if (img.parentNode) { img.parentNode.removeChild(img); } });
    layer.appendChild(img); this.el = img;
  }
  Imagen.prototype.in = function () { this.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: BP.dur(250), fill: "both" }); };
  Imagen.prototype.out = function () {
    var self = this;
    return new Promise(function (res) {
      var a = self.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: BP.dur(250), fill: "both" });
      a.onfinish = function () { if (self.el.parentNode) { self.el.parentNode.removeChild(self.el); } res(); };
    });
  };

  // ---------- gráfica: video (cortina, tótem...). Se reproduce una vez y se retira sola al terminar.
  function fuentesVideo(m) {
    var h = "";
    if (m.webm) { h += '<source src="' + m.webm + '" type="video/webm">'; }
    if (m.mp4) { h += '<source src="' + m.mp4 + '" type="video/mp4">'; }
    return h;
  }
  function Video(layer, datos, onend, opts) {
    var m = (cfg.medios || {})[datos.medio] || {}, v = document.createElement("video"), self = this;
    v.className = "video-el"; v.playsInline = true; v.preload = "auto"; v.muted = canal === "preview" || P.silencio === "1" || !!(opts && opts.mudo);
    v.loop = !!datos.repetir; v.innerHTML = fuentesVideo(m);
    if (m.chroma) { v.style.filter = "url(#" + chromaFiltro(datos.medio, m.chroma) + ")"; }
    layer.appendChild(v); this.el = v; this.onend = onend; this.corte = null;
    v.addEventListener("ended", function () { if (self.onend) { self.onend(); } });
    v.addEventListener("error", function () { console.warn("video no disponible", datos.medio); if (opts && opts.onerror) { opts.onerror(); } if (self.onend) { self.onend(); } }, true);
  }
  Video.prototype.in = function () {
    var v = this.el, p = v.play();
    if (p && p.catch) { p.catch(function () { v.muted = true; v.play().catch(function () {}); }); }
  };
  Video.prototype.out = function () { var v = this.el; try { v.pause(); } catch (e) {} if (v.parentNode) { v.parentNode.removeChild(v); } return Promise.resolve(); };

  // ---------- gráfica: huincha "PULSA Y RESPONDE"
  // El texto se ajusta solo: 1 línea grande, hasta 2 líneas más chicas y, si aun así no cabe, una línea que se desplaza (con pausa inicial).
  // Si cambia solo el texto (ACTUALIZAR) se hace un cambio suave sin sacar la barra.
  var HU_SEP = "\u00a0\u00a0\u00a0\u25c6\u00a0\u00a0\u00a0", HU_EASE = "cubic-bezier(.16,.84,.24,1)";
  function huEtiqueta(d) { var e = String(d && d.etiqueta || "").toUpperCase(); return (!e || e === "PREGUNTA Y RESPONDE") ? "PULSA Y RESPONDE" : e; }   // el nombre anterior ya no se usa, aunque quede guardado en el estado
  function huTexto(t) { return String(t == null ? "" : t).replace(/\s+/g, " ").trim().slice(0, 400); }
  function huAn(node, kf, o) { o = o || {}; return node.animate(kf, { duration: BP.dur(o.duration || 400), delay: BP.dur(o.delay || 0), easing: o.easing || HU_EASE, fill: "both" }); }
  function Huincha(layer, datos) {
    var d = document.createElement("div");
    d.className = "hu";
    d.innerHTML = '<div class="hu-in"><div class="hu-shape"><div class="hu-bg"></div><div class="hu-bgi"></div><div class="hu-cap"></div></div>' +
      '<div class="hu-tab"><span></span></div><div class="hu-win"><div class="hu-txt"></div></div><div class="hu-gauge"></div></div>';
    this.el = d; this.inn = d.firstChild; this.shape = d.querySelector(".hu-shape"); this.tab = d.querySelector(".hu-tab"); this.win = d.querySelector(".hu-win");
    this.txt = d.querySelector(".hu-txt"); this.gauge = d.querySelector(".hu-gauge"); this.marq = null; this.fx = null; this.texto = "";
    d.querySelector(".hu-tab span").textContent = huEtiqueta(datos);
    layer.appendChild(d);
    this.setTexto(huTexto(datos.texto));
  }
  Huincha.prototype.setTexto = function (t) {
    var win = this.win, el = this.txt, sizes = [66, 60, 54, 50, 46, 42], i, ok = false, maxH = win.clientHeight, a, b, w;
    if (this.marq) { this.marq.cancel(); this.marq = null; }
    this.texto = t; win.classList.remove("scroll"); el.textContent = t;
    for (i = 0; i < sizes.length && !ok; i++) { el.style.fontSize = sizes[i] + "px"; ok = el.offsetHeight <= maxH; }
    if (ok) { return; }
    win.classList.add("scroll"); el.style.fontSize = "56px"; el.textContent = "";
    a = document.createElement("span"); b = document.createElement("span"); a.textContent = t + HU_SEP; b.textContent = t + HU_SEP; el.appendChild(a); el.appendChild(b);
    w = a.offsetWidth;
    this.marq = el.animate([{ transform: "translateX(0)" }, { transform: "translateX(-" + w + "px)" }], { duration: w / 130 * 1000, delay: 2500, iterations: Infinity, easing: "linear" });
  };
  Huincha.prototype.in = function () {
    huAn(this.shape, [{ transform: "scaleX(0)", opacity: 0 }, { transform: "scaleX(1)", opacity: 1 }], { duration: 520 });
    huAn(this.tab, [{ transform: "translateY(34px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: 420, delay: 380 });
    this.fx = huAn(this.win, [{ transform: "translateX(-50px)", opacity: 0 }, { transform: "translateX(0)", opacity: 1 }], { duration: 520, delay: 330 });
    huAn(this.gauge, [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }], { duration: 650, delay: 450 });
  };
  Huincha.prototype.update = function (datos) {
    var self = this, t = huTexto(datos.texto);
    this.tab.querySelector("span").textContent = huEtiqueta(datos);                                  // ACTUALIZAR también refresca el rótulo
    if (t === this.texto) { return Promise.resolve(); }
    return new Promise(function (res) {
      var prev = self.fx, o = huAn(self.win, [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-14px)" }], { duration: 200, easing: "ease-in" });
      self.fx = o;
      o.onfinish = function () {
        self.setTexto(t);
        var n = huAn(self.win, [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 380 });
        self.fx = n; o.cancel(); if (prev) { prev.cancel(); }
        res();
      };
    });
  };
  Huincha.prototype.out = function () {
    var self = this;
    return new Promise(function (res) {
      var a = huAn(self.inn, [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(40px)" }], { duration: 420, easing: "cubic-bezier(.5,0,.75,0)" });
      a.onfinish = function () { self.destroy(); res(); };
    });
  };
  Huincha.prototype.destroy = function () { if (this.marq) { this.marq.cancel(); } if (this.el.parentNode) { this.el.parentNode.removeChild(this.el); } };
  function huVacia(g, datos) { return g.tipo === "huincha" && !huTexto(datos && datos.texto); }   // una huincha sin texto nunca se dibuja

  // ---------- fábrica por tipo
  function crear(g, datos, capa, e) {
    if (g.tipo === "huincha") { return huVacia(g, datos) ? null : new Huincha(capas.huincha, datos); }
    if (g.tipo === "gc_persona") { var gc = new BP.GCPersona(capas.gc); gc.render(datos); return gc; }
    if (g.tipo === "logo") { return new Logo(capas.logo, datos); }
    if (g.tipo === "imagen") { return new Imagen(capas.video, datos); }
    if (g.tipo === "video") {
      return new Video(capas.video, datos, function () {         // al terminar: se limpia la capa y el estado (solo en AIRE)
        var cur = actual[capa];
        if (cur && cur.ts === e.ts && !datos.repetir) {
          if (escribe) { var s = store.get("state/" + canal + "/" + capa); if (s && s.ts === e.ts) { store.remove("state/" + canal + "/" + capa); } }
        }
      }, { onerror: function () { informar(capa, e, false, "No se pudo reproducir «" + datos.medio + "»: archivo no encontrado o códec no compatible"); } });
    }
    return null;
  }

  // ---------- transiciones (video con punto de corte)
  function transicion(via, aplicar) {
    return new Promise(function (res) {
      var corte = false;
      function hacerCorte() { if (!corte) { corte = true; Promise.resolve(aplicar()).then(function () {}); } }
      if (via.tipo === "video" && via.medio) {
        var t = new Video(capaTrans, { medio: via.medio, repetir: false }, function () { hacerCorte(); t.out(); res(); }, {});
        t.in();
        setTimeout(hacerCorte, Math.max(0, +via.corte || 0));
      } else { hacerCorte(); res(); }
    });
  }

  // ---------- estado de cada capa hacia el panel
  function informar(capa, e, ok, motivo) {
    if (canal !== "aire" || !escribe) { return; }
    store.set("state/estado/" + capa, { ts: e.ts, gid: e.gid, ok: ok, motivo: motivo || "" });
  }

  // ---------- mostrar / ocultar (siempre en cola: nunca se pisan las animaciones)
  function mostrar(capa, e) {
    var g = (cfg.graficas || {})[e.gid] || (BP.DEFAULT_CONFIG.graficas || {})[e.gid];   // si la sala aun no tiene la gráfica nueva, se usa la de defaults
    if (!g) { informar(capa, e, false, "gráfica inexistente"); return Promise.resolve(); }
    var datos = e.datos || g.datos || {};
    if (BP.esPendiente(datos)) {                       // nunca se muestra un PENDIENTE_: se avisa al panel y se deja todo como estaba
      informar(capa, e, false, "PENDIENTE: faltan datos, no se muestra");
      if (canal === "aire" && escribe) {
        var prev0 = actual[capa];
        if (prev0) { want[capa] = prev0.ts; store.set("state/aire/" + capa, prev0.entry); } else { store.remove("state/aire/" + capa); }
      }
      return Promise.resolve();
    }
    informar(capa, e, true);
    var via = e.via && (cfg.transiciones || {})[e.via];
    function aplicar() {
      var cur = actual[capa], prev;
      if (cur && cur.gid === e.gid && cur.inst.update && !huVacia(g, datos)) {     // misma gráfica con otro contenido: se actualiza sin sacarla
        actual[capa] = { ts: e.ts, gid: e.gid, inst: cur.inst, entry: e };
        return cur.inst.update(datos);
      }
      prev = cur ? cur.inst.out() : Promise.resolve();
      return prev.then(function () {
        var inst = crear(g, datos, capa, e);
        if (!inst) { return; }
        actual[capa] = { ts: e.ts, gid: e.gid, inst: inst, entry: e };
        inst.in();
      });
    }
    return via ? transicion(via, aplicar) : aplicar();
  }
  function ocultar(capa) {
    var cur = actual[capa]; actual[capa] = null;
    return cur ? cur.inst.out() : Promise.resolve();
  }
  function encolar(fn) { cola = cola.then(fn).catch(function (err) { console.error(err); }); }

  function reconciliar(air) {
    Object.keys(air).forEach(function (capa) {
      var e = air[capa];
      if (!e || !e.gid || !capas[capa]) { return; }
      if (want[capa] !== e.ts) { want[capa] = e.ts; encolar(function () { return mostrar(capa, e); }); }
    });
    Object.keys(want).forEach(function (capa) {
      if (!air[capa]) { delete want[capa]; encolar(function () { return ocultar(capa); }); }
    });
  }

  store.onChange(function (t) {
    if (t.config && t.config.programa) { cfg = t.config; BP.vel = +cfg.programa.velocidad || 1; }
    reconciliar(BP.getPath(t, "state/" + canal) || {});
  });
  window.BP.salida = { store: store, canal: canal };
})();
