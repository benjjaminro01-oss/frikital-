
/* Frikital CG · núcleo y sincronización Firebase · v1.1.0 */
(function (w) {
  "use strict";

  var CG = w.CG = w.CG || {};
  CG.VERSION = "1.1.0";
  CG.cfg = CG.cfg || {};

  var U = CG.util = {};

  U.qs = function (k) {
    return new URLSearchParams(location.search).get(k);
  };

  U.clone = function (o) {
    return o === undefined ? undefined : JSON.parse(JSON.stringify(o));
  };

  U.uid = function (p) {
    return (p || "g") + Math.random().toString(36).slice(2, 7);
  };

  U.get = function (o, path) {
    var p = String(path).split("/").filter(Boolean);
    for (var i = 0; i < p.length; i++) {
      if (o == null) return undefined;
      o = o[p[i]];
    }
    return o;
  };

  U.set = function (o, path, val) {
    var p = String(path).split("/").filter(Boolean);
    if (!p.length) return val;
    var c = o;
    for (var i = 0; i < p.length - 1; i++) {
      if (c[p[i]] == null || typeof c[p[i]] !== "object") {
        c[p[i]] = {};
      }
      c = c[p[i]];
    }
    if (val === null || val === undefined) {
      delete c[p[p.length - 1]];
    } else {
      c[p[p.length - 1]] = val;
    }
    return o;
  };

  U.hasPending = function (obj) {
    return /PENDIENTE_/.test(JSON.stringify(obj || {}));
  };

  U.merge = function (a, b) {
    if (b == null) return a;
    if (typeof b !== "object" || Array.isArray(b)) return b;
    var o = Array.isArray(a) ? {} : Object.assign({}, a);
    Object.keys(b).forEach(function (k) {
      o[k] = (a && typeof a[k] === "object" && !Array.isArray(a[k]))
        ? U.merge(a[k], b[k])
        : b[k];
    });
    return o;
  };

  /* Configuración gráfica por defecto */
  CG.defaultConfig = function () {
    return {
      v: 1,
      general: {
        programa: "Frikital Fest 2026",
        velocidad: 1,
        logo: "media/img/logo_fest_blanco.png"
      },
      order: [
        "carton_inicio",
        "motion_apertura",
        "lt_general",
        "lt_invitado"
      ],
      graphics: {
        carton_inicio: {
          id: "carton_inicio",
          name: "Cartón inicio",
          type: "video",
          group: "fondo",
          kind: "CARTÓN",
          key: "F13",
          video: {
            src: "media/video/carton_inicio.mp4",
            bg: "opaque",
            loop: true,
            audio: false,
            onEnd: "hold"
          },
          enter: null,
          exit: null
        },
        motion_apertura: {
          id: "motion_apertura",
          name: "Motion apertura",
          type: "video",
          group: "motion",
          kind: "MOTION",
          key: "F14",
          video: {
            src: "media/video/motion_apertura.mp4",
            bg: "opaque",
            loop: false,
            audio: true,
            onEnd: "hide"
          },
          enter: null,
          exit: null
        },
        lt_general: {
          id: "lt_general",
          name: "Lower third general",
          type: "gc_apoyo",
          group: "gc",
          kind: "GC",
          key: "F15",
          fields: {
            texto: "FRIKITAL FEST 2026 · EN VIVO"
          },
          colors: {},
          enter: null,
          exit: null
        },
        lt_invitado: {
          id: "lt_invitado",
          name: "Identificación de invitado",
          type: "gc_nombre",
          group: "gc",
          kind: "GC",
          key: "F16",
          fields: {
            nombre: "PENDIENTE_NOMBRE",
            cargo: "PENDIENTE_CARGO"
          },
          colors: {},
          enter: null,
          exit: null
        }
      },
      buttons: [],
      transitions: {},
      library: {}
    };
  };

  /* Carga del SDK oficial Firebase Compat */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var scripts = document.getElementsByTagName("script");

      for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].src === src) {
          scripts[i].addEventListener("load", resolve, { once: true });
          if (w.firebase) {
            resolve();
            return;
          }
          scripts[i].addEventListener("error", reject, { once: true });
          return;
        }
      }

      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function () {
        reject(new Error("No se pudo cargar Firebase: " + src));
      };
      document.head.appendChild(s);
    });
  }

  function loadFirebase() {
    var base = "https://www.gstatic.com/firebasejs/10.12.2/firebase-";

    return loadScript(base + "app-compat.js")
      .then(function () {
        return loadScript(base + "auth-compat.js");
      })
      .then(function () {
        return loadScript(base + "database-compat.js");
      });
  }

  /* Almacén sincronizado: state = { config, live } */
  CG.createStore = function (o) {
    o = o || {};

    var sala = o.sala || "frikital";
    var mode = o.mode || "online";
    var dbUrl = (o.dbUrl || "").replace(/\/$/, "");
    var firebaseConfig = o.firebaseConfig ||
      (CG.cfg && CG.cfg.firebase);

    var state = {
      config: null,
      live: {}
    };

    var subs = [];
    var statusSubs = [];
    var bc = null;
    var lsKey = "cg:" + sala;
    var ref = null;
    var ready = Promise.resolve();

    function emit(path) {
      subs.forEach(function (f) {
        try {
          f(path, state);
        } catch (e) {
          console.error(e);
        }
      });
    }

    function status(s) {
      statusSubs.forEach(function (f) {
        try {
          f(s);
        } catch (e) {
          console.error(e);
        }
      });
    }

    function applyPut(path, data) {
      if (!path || path === "/") {
        state = data || { config: null, live: {} };
        if (!state.live) state.live = {};
      } else {
        U.set(state, path, data);
      }
      emit(path);
    }

    function normalizeMap(map) {
      var result = {};
      Object.keys(map).forEach(function (p) {
        result[p.replace(/^\/+/, "")] = map[p] === undefined ? null : map[p];
      });
      return result;
    }

    var store = {
      mode: mode,
      sala: sala,

      state: function () {
        return state;
      },

      config: function () {
        var c = state.config;
        var d = CG.defaultConfig();

        if (!c) return d;

        return {
          v: c.v || 1,
          general: Object.assign({}, d.general, c.general),
          order: c.order || [],
          graphics: c.graphics || {},
          buttons: c.buttons || [],
          transitions: c.transitions || {},
          library: c.library || {}
        };
      },

      live: function () {
        return state.live || {};
      },

      onChange: function (f) {
        subs.push(f);
      },

      onStatus: function (f) {
        statusSubs.push(f);
      },

      set: function (path, val) {
        path = path.replace(/^\/+/, "");
        applyPut("/" + path, val);
        return store._write(path, val);
      },

      multi: function (map) {
        Object.keys(map).forEach(function (p) {
          applyPut("/" + p.replace(/^\/+/, ""), map[p]);
        });
        return store._writeMulti(map);
      },

      start: function () {
        if (mode === "local") {
          try {
            var raw = localStorage.getItem(lsKey);
            if (raw) {
              state = JSON.parse(raw);
              if (!state.live) state.live = {};
            }
          } catch (e) {}

          try {
            bc = new BroadcastChannel("cg-" + sala);
            bc.onmessage = function (m) {
              applyRemote(m.data);
            };
          } catch (e) {}

          w.addEventListener("storage", function (e) {
            if (e.key === lsKey && e.newValue) {
              try {
                state = JSON.parse(e.newValue);
                if (!state.live) state.live = {};
                emit("/");
              } catch (x) {}
            }
          });

          status("local · listo");
          emit("/");
          return;
        }

        if (!firebaseConfig || !firebaseConfig.apiKey) {
          status("FALTA CONFIGURACIÓN FIREBASE");
          return;
        }

        status("conectando con Firebase…");

        ready = loadFirebase()
          .then(function () {
            if (!w.firebase.apps.length) {
              w.firebase.initializeApp(firebaseConfig);
            }
            return w.firebase.auth().signInAnonymously();
          })
          .then(function () {
            var database = w.firebase.database();

            if (dbUrl) {
              database = w.firebase.database();
            }

            ref = database.ref("rooms/" + sala);

            ref.on("value", function (snapshot) {
              var data = snapshot.val() || {
                config: null,
                live: {}
              };

              applyPut("/", data);
              status("en línea · sala " + sala);
            }, function (error) {
              status("error de lectura: " + error.message);
            });
          })
          .catch(function (error) {
            console.error("Firebase:", error);
            status("ERROR FIREBASE: " +
              (error.code || error.message || error));
          });
      },

      _persist: function () {
        try {
          localStorage.setItem(lsKey, JSON.stringify(state));
        } catch (e) {}
      },

      _write: function (path, val) {
        if (mode === "local") {
          store._persist();
          try {
            bc && bc.postMessage({
              t: "put",
              path: "/" + path,
              data: val === undefined ? null : val
            });
          } catch (e) {}
          return Promise.resolve();
        }

        return ready.then(function () {
          if (!ref) throw new Error("Firebase todavía no está conectado");
          return ref.child(path).set(val === undefined ? null : val);
        }).catch(function (error) {
          console.error("Firebase escritura:", error);
          status("error de escritura: " + error.message);
        });
      },

      _writeMulti: function (map) {
        if (mode === "local") {
          store._persist();
          try {
            bc && bc.postMessage({
              t: "multi",
              map: map
            });
          } catch (e) {}
          return Promise.resolve();
        }

        return ready.then(function () {
          if (!ref) throw new Error("Firebase todavía no está conectado");
          return ref.update(normalizeMap(map));
        }).catch(function (error) {
          console.error("Firebase escritura:", error);
          status("error de escritura: " + error.message);
        });
      }
    };

    function applyRemote(m) {
      if (!m) return;

      if (m.t === "put") {
        applyPut(m.path, m.data);
      } else if (m.t === "multi") {
        Object.keys(m.map || {}).forEach(function (p) {
          applyPut("/" + p.replace(/^\/+/, ""), m.map[p]);
        });
      }
    }

    return store;
  };
})(window);
