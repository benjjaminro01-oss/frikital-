
/* Frikital CG · interfaz inicial del panel · v1.0.0 */
(function(w){
'use strict';

var FRK = w.FRK;

if(!FRK){
  console.error('Frikital CG: falta panel-adapter.js');
  return;
}

var main = document.getElementById('main');
var nav = document.getElementById('vistas');
var toast = document.getElementById('toast');

var vista = 'control';

function css(){
  if(document.getElementById('frk-ui-style')) return;

  var s = document.createElement('style');
  s.id = 'frk-ui-style';
  s.textContent = `
    #vistas{display:flex;gap:8px;flex-wrap:wrap}
    #vistas button{padding:9px 13px;border:1px solid #594276;
      border-radius:8px;background:#211338;color:white;cursor:pointer}
    #vistas button.activo{background:#5B2A9E;border-color:#E6177F}
    #main{padding:22px;max-width:1500px;margin:auto;color:#fff}
    .frk-heading{margin-bottom:20px}
    .frk-heading h2{margin:0 0 6px;font-size:24px}
    .frk-muted{color:#b9accb;font-size:13px}
    .frk-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px}
    .frk-card{background:#211735;border:1px solid #49345f;border-radius:12px;padding:17px}
    .frk-card h3{font-size:17px;margin:0 0 8px}
    .frk-tag{display:inline-block;font-size:11px;padding:4px 8px;
      border-radius:20px;background:#392653;color:#d9c5f4;margin-bottom:12px}
    .frk-state{font-size:12px;color:#b9accb;margin-bottom:14px}
    .frk-state.on{color:#63e6a1}
    .frk-actions{display:flex;gap:8px}
    .frk-actions button{flex:1;padding:11px 8px;border:0;border-radius:7px;
      font-weight:700;cursor:pointer}
    .frk-show{background:#E6177F;color:white}
    .frk-hide{background:#443653;color:white}
    .frk-empty{padding:25px;background:#211735;border-radius:10px;color:#c9bbd8}
    #frk-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
      padding:12px 18px;background:#211735;border:1px solid #5B2A9E;
      border-radius:8px;z-index:9999;display:none;color:white}
    @media(max-width:600px){
      #main{padding:14px}
      .frk-actions button{padding:14px 6px}
    }
  `;
  document.head.appendChild(s);
}

function aviso(msg){
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(aviso.timer);
  aviso.timer = setTimeout(function(){
    toast.style.display = 'none';
  },2600);
}

function escapar(v){
  return String(v == null ? '' : v).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

function botonesNav(){
  var opciones = [
    ['control','CONTROL'],
    ['visual','CONTROL + VISUAL'],
    ['botonera','BOTONERA GENERAL']
  ];

  nav.innerHTML = opciones.map(function(x){
    return '<button data-vista="'+x[0]+'" class="'+
      (vista===x[0]?'activo':'')+'">'+x[1]+'</button>';
  }).join('');
}

function vistaControl(){
  var cfg = FRK.store.config();
  var live = FRK.store.live();
  var ids = cfg.order || [];
  var html = '';

  html += '<section class="frk-heading">';
  html += '<h2>Control de gráficas</h2>';
  html += '<div class="frk-muted">Sala: '+escapar(FRK.sala)+
    ' · Activación directa hacia la salida OBS</div>';
  html += '</section>';

  html += '<div class="frk-grid">';

  ids.forEach(function(id){
    var g = cfg.graphics[id];
    if(!g) return;

    var activa = !!(live[id] && live[id].on);
    var detalle = g.type === 'video' ? 'VIDEO' :
      g.type === 'gc_apoyo' ? 'GC DE APOYO' :
      g.type === 'gc_nombre' ? 'NOMBRE Y CARGO' : g.type;

    var texto = '';
    if(g.fields){
      texto = Object.keys(g.fields).map(function(k){
        return g.fields[k];
      }).join(' · ');
    }else if(g.video){
      texto = g.video.src || 'Video sin archivo';
    }

    html += '<article class="frk-card">';
    html += '<span class="frk-tag">'+escapar(detalle)+'</span>';
    html += '<h3>'+escapar(g.name || id)+'</h3>';
    html += '<div class="frk-muted">'+escapar(texto)+'</div>';
    html += '<p class="frk-state '+(activa?'on':'')+'">'+
      (activa?'● AL AIRE':'○ OCULTA')+'</p>';
    html += '<div class="frk-actions">';
    html += '<button class="frk-show" data-accion="mostrar" data-id="'+
      escapar(id)+'">MOSTRAR</button>';
    html += '<button class="frk-hide" data-accion="ocultar" data-id="'+
      escapar(id)+'">OCULTAR</button>';
    html += '</div></article>';
  });

  html += '</div>';

  if(!ids.length){
    html += '<div class="frk-empty">No hay gráficas configuradas.</div>';
  }

  main.innerHTML = html;
}

function vistaPendiente(nombre){
  main.innerHTML =
    '<section class="frk-heading"><h2>'+nombre+'</h2></section>'+
    '<div class="frk-empty">Esta vista se habilitará en la siguiente etapa. '+
    'Por ahora estamos validando el control de gráficas y la conexión con OBS.</div>';
}

function render(){
  botonesNav();

  if(vista === 'control') vistaControl();
  else if(vista === 'visual') vistaPendiente('Control + Visual');
  else vistaPendiente('Botonera general');
}

nav.addEventListener('click',function(e){
  var b = e.target.closest('[data-vista]');
  if(!b) return;
  vista = b.dataset.vista;
  render();
});

main.addEventListener('click',function(e){
  var b = e.target.closest('[data-accion]');
  if(!b) return;

  var id = b.dataset.id;
  var accion = b.dataset.accion;

  var tarea = accion === 'mostrar'
    ? FRK.mostrar(id)
    : FRK.ocultar(id);

  tarea.then(function(){
    aviso(accion === 'mostrar' ? 'Gráfica enviada al aire' : 'Gráfica ocultada');
  }).catch(function(error){
    console.error(error);
    aviso('Error: '+error.message);
  });
});

document.getElementById('limpiar').addEventListener('click',function(){
  FRK.limpiar().then(function(){
    aviso('Salida limpiada');
  }).catch(function(error){
    aviso('Error: '+error.message);
  });
});

document.getElementById('cfg').addEventListener('click',function(){
  aviso('Configuración: disponible en una próxima etapa');
});

FRK.suscribir(render);

css();
render();

})(window);
