
/* Frikital CG · interfaz del panel · v1.1.0 */
(function(w){
'use strict';

var FRK = w.FRK;
if(!FRK) return;

if(typeof ESC === 'undefined'){
  console.error('No se encontró la escaleta ESC.');
  return;
}

var main = document.getElementById('main');
var nav = document.getElementById('vistas');
var toast = document.getElementById('toast');

var vista = 'control';
var seccion = 1;

function estilos(){
  if(document.getElementById('frk-ui-style')) return;

  var s = document.createElement('style');
  s.id = 'frk-ui-style';
  s.textContent = `
    #vistas{display:flex;gap:8px;flex-wrap:wrap}
    #vistas button,.frk-secciones button{
      padding:9px 13px;border:1px solid #594276;border-radius:8px;
      background:#211338;color:white;cursor:pointer
    }
    #vistas button.activo,.frk-secciones button.activo{
      background:#5B2A9E;border-color:#E6177F
    }
    #main{padding:22px;max-width:1500px;margin:auto;color:#fff}
    .frk-heading{margin-bottom:20px}
    .frk-heading h2{margin:0 0 6px;font-size:24px}
    .frk-muted{color:#b9accb;font-size:13px}
    .frk-secciones{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}
    .frk-secciones button{min-width:42px}
    .frk-seccion-titulo{padding:18px;background:#211735;
      border:1px solid #49345f;border-radius:12px;margin-bottom:16px}
    .frk-seccion-titulo h3{margin:0 0 6px}
    .frk-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px}
    .frk-card{background:#211735;border:1px solid #49345f;border-radius:12px;padding:17px}
    .frk-card h3{font-size:17px;margin:0 0 8px}
    .frk-tag{display:inline-block;font-size:11px;padding:4px 8px;
      border-radius:20px;background:#392653;color:#d9c5f4;margin-bottom:12px}
    .frk-state{font-size:12px;color:#b9accb;margin:12px 0}
    .frk-state.on{color:#63e6a1}
    .frk-actions{display:flex;gap:8px}
    .frk-actions button{flex:1;padding:11px 8px;border:0;border-radius:7px;
      font-weight:700;cursor:pointer}
    .frk-show{background:#E6177F;color:white}
    .frk-hide{background:#443653;color:white}
    .frk-bloque{background:#211735;border:1px solid #49345f;
      border-radius:10px;margin-bottom:12px;overflow:hidden}
    .frk-bloque-head{display:flex;justify-content:space-between;
      gap:12px;padding:14px 16px;background:#2b1c40}
    .frk-bloque-head strong{font-size:14px}
    .frk-tiempo{color:#50C3FF;font-size:12px;white-space:nowrap}
    .frk-bloque-body{padding:15px 16px}
    .frk-dato{margin:0 0 12px}
    .frk-dato:last-child{margin-bottom:0}
    .frk-dato b{display:block;color:#E9B6D4;font-size:11px;
      margin-bottom:4px;text-transform:uppercase}
    .frk-dato p{margin:0;white-space:pre-wrap;line-height:1.5;font-size:13px}
    .frk-empty{padding:25px;background:#211735;border-radius:10px;color:#c9bbd8}
    @media(max-width:600px){
      #main{padding:14px}
      .frk-bloque-head{flex-direction:column}
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

function esc(v){
  return String(v == null ? '' : v).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

function botoneraVistas(){
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

function selectorSecciones(){
  return '<div class="frk-secciones">'+ESC.map(function(s){
    return '<button data-seccion="'+s.n+'" class="'+
      (Number(seccion)===Number(s.n)?'activo':'')+'">'+s.n+'</button>';
  }).join('')+'</div>';
}

function contenidoBloque(p){
  var campos = [
    ['Cámara / realización',p.cam],
    ['Texto de conducción',p.tx],
    ['Gráficas',p.gr],
    ['Notas de producción',p.nt]
  ];

  return campos.filter(function(x){
    return x[1] && String(x[1]).trim();
  }).map(function(x){
    return '<div class="frk-dato"><b>'+esc(x[0])+
      '</b><p>'+esc(x[1])+'</p></div>';
  }).join('');
}

function escaletaHTML(){
  var s = ESC.find(function(x){return Number(x.n)===Number(seccion)});
  if(!s) return '<div class="frk-empty">Sección no encontrada.</div>';

  var html = selectorSecciones();

  html += '<div class="frk-seccion-titulo">';
  html += '<span class="frk-tag">SECCIÓN '+esc(s.n)+'</span>';
  html += '<h3>'+esc(s.t || s.tit || 'Sin título')+'</h3>';
  html += '<div class="frk-muted">'+
    (s.p ? s.p.length : 0)+' bloques técnicos</div>';
  html += '</div>';

  html += '<div class="frk-escaleta">';

  (s.p || []).forEach(function(p,i){
    html += '<article class="frk-bloque">';
    html += '<div class="frk-bloque-head">';
    html += '<strong>'+(i+1)+'. '+esc(p.b || 'Bloque sin título')+'</strong>';
    html += '<span class="frk-tiempo">'+
      esc(p.tc || '--:--')+' · '+esc(p.d || '--:--')+'</span>';
    html += '</div>';
    html += '<div class="frk-bloque-body">';
    html += contenidoBloque(p) || '<div class="frk-muted">Sin indicaciones adicionales.</div>';
    html += '</div></article>';
  });

  html += '</div>';
  return html;
}

function graficasHTML(){
  var cfg = FRK.store.config();
  var live = FRK.store.live();
  var ids = cfg.order || [];
  var html = '<h2 style="margin:28px 0 15px">Control de gráficas</h2>';
  html += '<div class="frk-grid">';

  ids.forEach(function(id){
    var g = cfg.graphics[id];
    if(!g) return;

    var activa = !!(live[id] && live[id].on);
    var tipo = g.type === 'video' ? 'VIDEO' :
      g.type === 'gc_apoyo' ? 'GC DE APOYO' :
      g.type === 'gc_nombre' ? 'NOMBRE Y CARGO' : g.type;

    var texto = g.fields
      ? Object.keys(g.fields).map(function(k){return g.fields[k]}).join(' · ')
      : (g.video ? g.video.src : '');

    html += '<article class="frk-card">';
    html += '<span class="frk-tag">'+esc(tipo)+'</span>';
    html += '<h3>'+esc(g.name || id)+'</h3>';
    html += '<div class="frk-muted">'+esc(texto)+'</div>';
    html += '<p class="frk-state '+(activa?'on':'')+'">'+
      (activa?'● AL AIRE':'○ OCULTA')+'</p>';
    html += '<div class="frk-actions">';
    html += '<button class="frk-show" data-accion="mostrar" data-id="'+esc(id)+'">MOSTRAR</button>';
    html += '<button class="frk-hide" data-accion="ocultar" data-id="'+esc(id)+'">OCULTAR</button>';
    html += '</div></article>';
  });

  html += '</div>';
  return html;
}

function render(){
  botoneraVistas();

  if(vista === 'control'){
    main.innerHTML =
      '<section class="frk-heading">'+
      '<h2>Control de programa</h2>'+
      '<div class="frk-muted">Sala '+esc(FRK.sala)+
      ' · Escaleta técnica y gráficas</div></section>'+
      escaletaHTML()+graficasHTML();
  }else if(vista === 'visual'){
    main.innerHTML =
      '<section class="frk-heading"><h2>Control + Visual</h2></section>'+
      '<div class="frk-empty">La integración de monitores preview y aire se realizará en la siguiente etapa.</div>';
  }else{
    main.innerHTML =
      '<section class="frk-heading"><h2>Botonera general</h2></section>'+
      '<div class="frk-empty">La botonera optimizada para iPad se habilitará en la siguiente etapa.</div>'+
      graficasHTML();
  }
}

nav.addEventListener('click',function(e){
  var b = e.target.closest('[data-vista]');
  if(!b) return;
  vista = b.dataset.vista;
  render();
});

main.addEventListener('click',function(e){
  var sec = e.target.closest('[data-seccion]');
  if(sec){
    seccion = Number(sec.dataset.seccion);
    render();
    return;
  }

  var b = e.target.closest('[data-accion]');
  if(!b) return;

  var tarea = b.dataset.accion === 'mostrar'
    ? FRK.mostrar(b.dataset.id)
    : FRK.ocultar(b.dataset.id);

  tarea.then(function(){
    aviso(b.dataset.accion === 'mostrar'
      ? 'Gráfica enviada al aire'
      : 'Gráfica ocultada');
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
  aviso('Configuración disponible próximamente');
});

FRK.suscribir(render);

estilos();
render();

})(window);
