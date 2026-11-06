/* Frikital CG · adaptador del panel · v1.0.0 */
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
