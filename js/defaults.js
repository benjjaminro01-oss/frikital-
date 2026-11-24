/* Bajo Presión CG · configuración por defecto (v1)
   Todo lo que no está confirmado queda como PENDIENTE_... (editable en el panel, nunca sale en pantalla). */
(function () {
  "use strict";
  var BP = window.BP = window.BP || {};
  BP.DEFAULT_DB = "https://bajo-presion-7e430-default-rtdb.firebaseio.com";   // Firebase Realtime Database del proyecto (no es un secreto)

  var AZUL = "#288CFF", CIAN = "#50C3FF", NARANJA = "#FF8C1E", NAVY = "#06112B", BLANCO = "#FFFFFF";

  function gcPersona(id, orden, nombre, tecla, etiqueta, pendiente, tab, tabText) {
    return {
      id: id, nombre: nombre, tipo: "gc_persona", capa: "gc", orden: orden, tecla: tecla, boton: true,
      datos: { nombre: pendiente, etiqueta: etiqueta, tab: tab, tabText: tabText, cap: NARANJA },
      entra: { tipo: "directo" }, sale: { tipo: "directo" }
    };
  }

  BP.DEFAULT_CONFIG = {
    version: 1,
    programa: {
      nombre: "Bajo Presión", ciudad: "Talca, Región del Maule", formato: "Grabado · mín. 25 min · 2 bloques",
      logo: "assets/logo.png", velocidad: 1
    },
    graficas: {
      gc_conductor:      gcPersona("gc_conductor", 1, "GC conductor", "F13", "CONDUCTOR", "PENDIENTE_NOMBRE_CONDUCTOR", AZUL, BLANCO),
      gc_participante1:  gcPersona("gc_participante1", 2, "GC participante 1", "F14", "PARTICIPANTE 1", "PENDIENTE_NOMBRE_PARTICIPANTE_1", CIAN, NAVY),
      gc_participante2:  gcPersona("gc_participante2", 3, "GC participante 2", "F15", "PARTICIPANTE 2", "PENDIENTE_NOMBRE_PARTICIPANTE_2", CIAN, NAVY),
      gc_participante3:  gcPersona("gc_participante3", 4, "GC participante 3", "F16", "PARTICIPANTE 3", "PENDIENTE_NOMBRE_PARTICIPANTE_3", CIAN, NAVY),
      cortina_programa: {
        id: "cortina_programa", nombre: "Cortina programa", tipo: "video", capa: "video", orden: 5, tecla: "F18", boton: true,
        datos: { medio: "cortina_programa", repetir: false },
        entra: { tipo: "directo" }, sale: { tipo: "directo" }
      },
      logo_esquina: {
        id: "logo_esquina", nombre: "Logo esquina", tipo: "logo", capa: "logo", orden: 12, tecla: "F22", boton: true,
        datos: { posicion: "tr", ancho: 210 },
        entra: { tipo: "directo" }, sale: { tipo: "directo" }
      }
    },
    medios: {
      cortina_programa:   { id: "cortina_programa",   nombre: "Cortina programa",       mp4: "media/cortina_programa.mp4",   webm: "media/cortina_programa.webm",   chroma: null },
      cortina_juego1:     { id: "cortina_juego1",     nombre: "Cortina Juego 1",        mp4: "media/cortina_juego1.mp4",     webm: "media/cortina_juego1.webm",     chroma: null },
      cortina_juego2:     { id: "cortina_juego2",     nombre: "Cortina Juego 2",        mp4: "media/cortina_juego2.mp4",     webm: "media/cortina_juego2.webm",     chroma: null },
      cortina_juego3:     { id: "cortina_juego3",     nombre: "Cortina Juego 3",        mp4: "media/cortina_juego3.mp4",     webm: "media/cortina_juego3.webm",     chroma: null },
      cortina_juego4:     { id: "cortina_juego4",     nombre: "Cortina Juego 4",        mp4: "media/cortina_juego4.mp4",     webm: "media/cortina_juego4.webm",     chroma: null },
      totem_publicitario: { id: "totem_publicitario", nombre: "Tótem publicitario",     mp4: "media/totem_publicitario.mp4", webm: "media/totem_publicitario.webm", chroma: { color: "#34FE00", similitud: 0.32, suavidad: 0.08 } }
    },
    transiciones: {}
  };
  function cortinaJuego(n, tecla) {
    return { id: "cortina_juego" + n, nombre: "Cortina Juego " + n, tipo: "video", capa: "video", orden: 5 + n, tecla: tecla, boton: true,
      datos: { medio: "cortina_juego" + n, repetir: false }, entra: { tipo: "directo" }, sale: { tipo: "directo" } };
  }
  var G = BP.DEFAULT_CONFIG.graficas;
  G.cortina_juego1 = cortinaJuego(1, "F17"); G.cortina_juego2 = cortinaJuego(2, "F19");
  G.cortina_juego3 = cortinaJuego(3, "F21"); G.cortina_juego4 = cortinaJuego(4, "F23");
  // Ficha: "Pase al noticiero" (Transición, F20): el texto/video no está confirmado -> queda PENDIENTE y no sale en pantalla
  G.pase_noticiero = { id: "pase_noticiero", nombre: "Pase al noticiero", tipo: "video", capa: "video", orden: 11, tecla: "F20", boton: true,
    datos: { medio: "PENDIENTE_VIDEO_PASE_AL_NOTICIERO", repetir: false }, entra: { tipo: "directo" }, sale: { tipo: "directo" } };

  // Huincha "PREGUNTA Y RESPONDE": capa propia "huincha" (independiente de gc/logo/video). Tiene su tarjeta en el panel, por eso no va en la botonera.
  G.huincha_pregunta = { id: "huincha_pregunta", nombre: "Huincha — Pregunta y responde", tipo: "huincha", capa: "huincha", orden: 13, tecla: "", boton: false,
    datos: { etiqueta: "PREGUNTA Y RESPONDE", texto: "" }, entra: { tipo: "directo" }, sale: { tipo: "directo" } };

  // botonera por defecto: un botón por gráfica marcada con "boton", en su orden
  var slots = {}, ids = Object.keys(G).filter(function (k) { return G[k].boton; }).sort(function (a, b) { return G[a].orden - G[b].orden; });
  ids.forEach(function (id, i) { slots["b" + (i + 1)] = { gid: id, orden: i + 1, tecla: G[id].tecla }; });
  BP.DEFAULT_CONFIG.botonera = slots;
})();
