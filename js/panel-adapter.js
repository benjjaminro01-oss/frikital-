
/* Frikital CG · adaptador del panel · v1.1.0 */
(function(w){
'use strict';

var CG = w.CG;

if(!CG || !CG.createStore){
  console.error('Frikital CG: no se encontró el núcleo.');
  return;
}

var q = CG.util.qs;
var sala = q('sala') || CG.cfg.sala || 'frikital';

var store = CG.createStore({
  sala: sala,
  mode: 'online',
  dbUrl: q('db') || CG.cfg.databaseURL || ''
});

var iniciado = false;
var inicializado = false;

/* Estado de conexión */
store.onStatus(function(s){
  var el = document.getElementById('modo');
  if(el) el.textContent = s;
});

/* Si la sala está vacía, carga la configuración por defecto */
store.onChange(function(path, state){
  if(path === '/' && !state.config && !inicializado){
    inicializado = true;
    store.set('config', CG.defaultConfig()).catch(function(e){
      console.error('No se pudo inicializar la configuración:',e);
    });
  }
});

/* Activar una gráfica */
function mostrar(id, cambios){
  var cfg = store.config();
  var g = cfg.graphics[id];

  if(!g){
    console.warn('Gráfica no encontrada:',id);
    return Promise.reject(new Error('Gráfica inexistente'));
  }

  var live = {
    on: true,
    n: Date.now(),
    t: Date.now(),
    fields: Object.assign({},g.fields || {},cambios && cambios.fields || {}),
    colors: Object.assign({},g.colors || {},cambios && cambios.colors || {})
  };

  return store.set('live/'+id,live);
}

/* Ocultar una gráfica */
function ocultar(id){
  return store.set('live/'+id,null);
}

/* Limpiar todas las gráficas al aire */
function limpiar(){
  return store.set('live',{});
}

/* Modificar la configuración de una gráfica */
function editar(id, cambios){
  var cfg = store.config();
  var g = cfg.graphics[id];

  if(!g){
    return Promise.reject(new Error('Gráfica inexistente: '+id));
  }

  var actualizado = CG.util.merge(g,cambios);

  return store.set('config/graphics/'+id,actualizado);
}

/* Actualizar los datos de una gráfica que ya está al aire */
function actualizar(id, campos){
  var actual = store.live()[id];

  if(!actual || !actual.on){
    return Promise.reject(new Error('La gráfica no está al aire'));
  }

  var fields = Object.assign({},actual.fields || {},campos || {});

  return store.set('live/'+id+'/fields',fields);
}

/* -----------------------------------------
   TARJETAS DE GC POR SECCIÓN
----------------------------------------- */

/* Identificador seguro para Firebase */
function nuevoId(){
  return 'gc_' + Date.now() + '_' +
    Math.random().toString(36).slice(2,8);
}

/* Normalizar número de sección */
function claveSeccion(numero){
  return String(numero).replace(/[^a-zA-Z0-9_-]/g,'');
}

/* Obtener tarjetas guardadas de una sección */
function obtenerTarjetas(seccion){
  var cfg = store.config();
  var grupos = cfg.sectionGCs || {};
  var tarjetas = grupos[claveSeccion(seccion)] || {};

  return Object.keys(tarjetas)
    .map(function(id){
      return tarjetas[id];
    })
    .sort(function(a,b){
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
}

/* Crear una tarjeta nueva y vacía */
function crearTarjeta(seccion){
  var cfg = store.config();
  var base = cfg.graphics.lt_invitado || {};
  var fields = Object.assign({},base.fields || {});

  fields.nombre = '';
  fields.cargo = '';

  var tarjeta = {
    id: nuevoId(),
    titulo: 'Nuevo invitado',
    fields: fields,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  return guardarTarjeta(seccion,tarjeta);
}

/* Guardar una tarjeta nueva o existente */
function guardarTarjeta(seccion, tarjeta){
  if(!tarjeta){
    return Promise.reject(new Error('Faltan los datos de la tarjeta'));
  }

  var sec = claveSeccion(seccion);

  if(!sec){
    return Promise.reject(new Error('Sección no válida'));
  }

  var id = tarjeta.id || nuevoId();

  var guardada = {
    id: id,
    titulo: tarjeta.titulo || 'Invitado',
    fields: Object.assign({},tarjeta.fields || {}),
    createdAt: tarjeta.createdAt || Date.now(),
    updatedAt: Date.now()
  };

  return store.set(
    'config/sectionGCs/'+sec+'/'+id,
    guardada
  ).then(function(){
    return guardada;
  });
}

/* Duplicar una tarjeta existente */
function duplicarTarjeta(seccion,id){
  var tarjetas = obtenerTarjetas(seccion);

  var original = tarjetas.find(function(t){
    return t.id === id;
  });

  if(!original){
    return Promise.reject(new Error('No se encontró la tarjeta'));
  }

  var copia = {
    id: nuevoId(),
    titulo: (original.titulo || 'Invitado') + ' (copia)',
    fields: Object.assign({},original.fields || {}),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  return guardarTarjeta(seccion,copia);
}

/* Recuperar una tarjeta específica */
function obtenerTarjeta(seccion,id){
  return obtenerTarjetas(seccion).find(function(t){
    return t.id === id;
  }) || null;
}

/* Mostrar una tarjeta en el GC de invitados de OBS */
function mostrarTarjeta(seccion,id){
  var tarjeta = obtenerTarjeta(seccion,id);

  if(!tarjeta){
    return Promise.reject(new Error('No se encontró la tarjeta'));
  }

  return mostrar('lt_invitado',{
    fields: Object.assign({},tarjeta.fields || {})
  });
}

/* -----------------------------------------
   ESTADO GENERAL
----------------------------------------- */

/* Obtener configuración y estado actual */
function obtener(){
  return {
    config: store.config(),
    live: store.live(),
    state: store.state()
  };
}

/* Escuchar cambios */
function suscribir(callback){
  store.onChange(function(path,state){
    callback(obtener(),path);
  });
}

/* API pública del panel */
w.FRK = {
  sala: sala,
  store: store,

  mostrar: mostrar,
  ocultar: ocultar,
  limpiar: limpiar,
  editar: editar,
  actualizar: actualizar,

  obtener: obtener,
  suscribir: suscribir,

  obtenerTarjetas: obtenerTarjetas,
  obtenerTarjeta: obtenerTarjeta,
  crearTarjeta: crearTarjeta,
  guardarTarjeta: guardarTarjeta,
  duplicarTarjeta: duplicarTarjeta,
  mostrarTarjeta: mostrarTarjeta,

  iniciar: function(){
    if(iniciado) return Promise.resolve();
    iniciado = true;
    return store.start();
  }
};

})(window);

/* Iniciar conexión */
window.FRK.iniciar().catch(function(error){
  console.error('Frikital CG · Error de conexión:',error);
});
