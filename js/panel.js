/* Frikital CG · panel de control · v1.1.0 */
(function(w){
'use strict';
var CG=w.CG,U=CG.util;
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
function h(tag,p){var e=document.createElement(tag);p=p||{};
  Object.keys(p).forEach(function(k){var v=p[k];if(v==null||v===false)return;
    if(k==='class')e.className=v;else if(k==='text')e.textContent=v;else if(k==='html')e.innerHTML=v;
    else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),v);else if(v===true)e.setAttribute(k,'');else e.setAttribute(k,v)});
  for(var i=2;i<arguments.length;i++)add(e,arguments[i]);return e}
function add(e,c){if(c==null||c===false)return;if(Array.isArray(c))c.forEach(function(x){add(e,x)});else e.appendChild(typeof c==='string'||typeof c==='number'?document.createTextNode(c):c)}
function toast(msg){var t=h('div',{class:'toast',text:msg});document.body.appendChild(t);setTimeout(function(){t.remove()},3200)}

/* ---------- conexión (se guarda en este equipo) ---------- */
var saved={};try{saved=JSON.parse(localStorage.getItem('cg:conn')||'{}')}catch(e){}
var cfgDb=/^https:/.test(CG.cfg.databaseURL||'')?CG.cfg.databaseURL:'';
var conn={sala:U.qs('sala')||saved.sala||CG.cfg.sala||'frikital',db:U.qs('db')||saved.db||cfgDb};
conn.mode=U.qs('local')==='1'?'local':(saved.mode||(conn.db?'online':'local'));
var store=CG.createStore({sala:conn.sala,mode:conn.mode,dbUrl:conn.db});
var ui={view:'control',stream:1,step:0,all:false,edit:false};
try{Object.assign(ui,JSON.parse(localStorage.getItem('cg:ui')||'{}'))}catch(e){}
ui.all=false;ui.edit=false;
function saveUi(){try{localStorage.setItem('cg:ui',JSON.stringify({view:ui.view,stream:ui.stream}))}catch(e){}}
var libretos=null,statusTxt='';

/* ---------- acceso a datos ---------- */
function cfg(){return store.config()}
function G(id){return cfg().graphics[id]}
function isOn(id){var l=store.live()[id];return !!(l&&l.on)}
function keyOf(id){var b=cfg().buttons.filter(function(x){return x.gid===id})[0];return b&&b.key||''}
function pend(g){return g.type!=='video'&&U.hasPending(g.fields)}
function nofile(g){return g.type==='video'&&!(g.video&&g.video.src)}
function whyNot(g){if(pend(g))return 'Tiene campos PENDIENTE_ por completar.';if(nofile(g))return 'Falta el archivo de video.';if(g.needsOk&&!g.ok)return 'Valida nombre y cargo antes de mostrar.';return ''}
function snap(g){return {fields:U.clone(g.fields||{}),colors:U.clone(g.colors||{})}}
function cset(id,sub,val){store.set('config/graphics/'+id+'/'+sub,val)}

/* ---------- acciones en vivo ---------- */
function show(id){var g=G(id);if(!g)return false;var why=whyNot(g);if(why){toast(g.name+': '+why);return false}
  var live=store.live(),map={},prev=live[id]||{};
  Object.keys(live).forEach(function(o){var go=G(o);if(o!==id&&live[o]&&live[o].on&&go&&(go.group||o)===(g.group||id))map['live/'+o+'/on']=false});
  map['live/'+id]=Object.assign({on:true,t:Date.now(),n:(prev.n||0)+1},snap(g));
  store.multi(map);return true}
function hide(id){store.set('live/'+id+'/on',false)}
function toggle(id){isOn(id)?hide(id):show(id)}
function update(id){var g=G(id);if(!g)return;if(!isOn(id)){toast('La gráfica no está al aire.');return}
  var why=whyNot(g);if(why){toast(why);return}
  var s=snap(g),m={};m['live/'+id+'/fields']=s.fields;m['live/'+id+'/colors']=Object.keys(s.colors).length?s.colors:null;
  if(g.type==='video')m['live/'+id+'/n']=((store.live()[id]||{}).n||0)+1;store.multi(m)}
function clearAll(){var live=store.live(),m={};Object.keys(live).forEach(function(id){if(live[id]&&live[id].on)m['live/'+id+'/on']=false});
  if(Object.keys(m).length)store.multi(m);preview(null)}

/* ---------- monitores (vista previa y al aire) ---------- */
var mons=null;
function ensureMons(){
  if(mons)return mons;
  var host=$('#monHost'),prevStore=CG.createMemStore(store);
  function mk(cls,st){var wrap=h('div',{class:'mon '+cls}),stage=h('div',{class:'mon-stage'});wrap.appendChild(stage);host.appendChild(wrap);
    var r=new CG.Renderer(stage,st,{side:'mon',mute:true});
    function fit(){var s=wrap.clientWidth/1920;if(s>0)stage.style.transform='scale('+s+')'}
    if(w.ResizeObserver)new ResizeObserver(fit).observe(wrap);fit();
    return {wrap:wrap,stage:stage,r:r,fit:fit}}
  mons={prevStore:prevStore,prev:mk('',prevStore),air:mk('air',store),prevId:null};
  mons.prev.r.sync();mons.air.r.sync();return mons}
function attachMon(m,where){where.appendChild(m.wrap);m.fit();m.r.items.forEach(function(it){it.refit&&it.refit()})}
function preview(id){var m=ensureMons();
  if(!id||m.prevId===id){m.prevId=null;m.prevStore.setLive({});return}
  var g=G(id);if(!g)return;
  if(g.type==='video'&&nofile(g)){toast('Falta el archivo de video.');return}
  m.prevId=id;var o={};o[id]=Object.assign({on:true,t:Date.now(),n:Date.now()},snap(g));m.prevStore.setLive(o)}

/* ---------- escaleta: gráficas asociadas a cada paso ---------- */
function stepGids(sn,st){
  var b=(st.block||'').toUpperCase(),g=st.graphic||'',out=[],C=cfg().graphics;
  function add(id){if(C[id]&&out.indexOf(id)<0)out.push(id)}
  if(/PREVIO|ESPERA/.test(b))add('carton_inicio');
  else if(b==='APERTURA')add('motion_apertura');
  if(/motion graphic final/i.test(g)){add('motion_final');add('carton_final')}
  else if(/motion graphic cierre/i.test(g)){add('motion_cierre');if(/cartón fijo/i.test(g))add('carton_inicio')}
  var q=g.match(/Lower third:\s*[“"]([^”"]+)[”"]/),matched=false;
  if(q){var t=q[1].trim().toUpperCase();Object.keys(C).forEach(function(id){var x=C[id];if(x.type==='gc_apoyo'&&x.fields&&x.fields.texto){var xt=x.fields.texto.toUpperCase();if(xt===t||xt.indexOf(t)===0){add(id);matched=true}}})}
  if(/Organizan/.test(g))add('placa_organizacion');
  if(/2\.ª edición/i.test(g))add('placa_datos');
  if(/Aprendizaje práctico/i.test(g))add('placa_aprendizaje');
  if(!matched||!q){
    if(sn===2&&/JEDI/.test(b)&&/PRESENTACI/.test(b))add('lt_jedi');
    if(sn===2&&/LUDOPALOOZA/.test(b)&&/TRANSICI/.test(b))add('lt_ludopalooza');
    if(/PRESENTACI[ÓO]N( INVITADO)?$/.test(b)){if(sn===3)add('lt_dario');if(sn===4)add('lt_luis');if(sn===5)add('lt_jackfredo')}
    if(sn===6&&/PRESENTACI.N RED BULL/.test(b))add('lt_redbull');
    if(sn===6&&/TRANSICI.N MUVIX/.test(b))add('lt_muvix');
    if(sn===6&&/TRANSICI.N BIMEDIA/.test(b))add('lt_bimedia');
    if(sn===7&&/PREMIACI/.test(b))add('gc_premiacion');
    if(sn===7&&/MENSAJE/.test(b))add('lt_jorge');
    if(sn===1&&/Jackfredo/.test(g))add('lt_jackfredo');
  }
  return out}
var STN=['Apertura','Jedi + Ludopalooza','Darío Cuesta','Luis Galáz','Jackfredo','Marcas','Premiación'];
function streamGids(sn){var s=libretos&&libretos[sn];if(!s)return [];var out=[];
  s.steps.forEach(function(st){stepGids(sn,st).forEach(function(id){if(out.indexOf(id)<0)out.push(id)})});return out}

/* ---------- editor de gráfica (tarjeta y botonera) ---------- */
var DEF={gc_apoyo:[['c1','Fondo 1','#4c3371'],['c2','Fondo 2 (centro)','#674c8f'],['borde','Borde','#ffffff'],['sombra','Sombra','#db1582'],['texto','Texto','#ffffff']],
 gc_nombre:[['barra1','Barra 1','#684d90'],['barra2','Barra 2','#452d69'],['acento','Barra de cargo','#2695d3'],['texto','Nombre','#ffffff'],['texto2','Cargo','#ffffff']]};
function fieldInput(g,key,label){
  var v=(g.fields&&g.fields[key])||'';
  var i=h('input',{type:'text',value:v,autocomplete:'off',spellcheck:'false','data-g':g.id,'data-k':key});
  function mark(){i.classList.toggle('pend',/PENDIENTE_/.test(i.value))}mark();
  i.addEventListener('input',function(){mark();cset(g.id,'fields/'+key,i.value);refreshCardState(g.id)});
  return h('div',null,h('span',{class:'fl',text:label}),i)}
function colorEditor(g){var defs=DEF[g.type];if(!defs)return null;
  var box=h('div',{class:'colors'});
  defs.forEach(function(d){var cur=(g.colors&&g.colors[d[0]])||d[2];
    var inp=h('input',{type:'color',value:cur});
    inp.addEventListener('input',function(){cset(g.id,'colors/'+d[0],inp.value)});
    box.appendChild(h('label',null,inp,d[1],h('button',{class:'btn small',title:'Restablecer',text:'↺',onclick:function(){cset(g.id,'colors/'+d[0],null);inp.value=d[2]}})))});
  return h('details',{class:'cols2'},h('summary',{text:'Colores'}),box)}
function libOptions(sel,cur){var L=cfg().library||{},found=false;
  Object.keys(L).forEach(function(k){var o=h('option',{value:L[k].src,text:L[k].name});if(L[k].src===cur){o.selected=true;found=true}sel.appendChild(o)});
  var e=h('option',{value:'',text:'— sin archivo (pendiente) —'});if(!cur)e.selected=true;sel.insertBefore(e,sel.firstChild);
  if(cur&&!found){var o=h('option',{value:cur,text:cur,selected:true});sel.appendChild(o)}}
function videoEditor(g){var v=g.video||{},box=h('div');
  var sel=h('select');libOptions(sel,v.src);sel.addEventListener('change',function(){cset(g.id,'video/src',sel.value);refreshCardState(g.id)});
  var up=h('button',{class:'btn small',text:'Subir archivo…',onclick:function(){pickFile('video/mp4,video/webm,video/quicktime',function(f){uploadMedia(f,function(src){cset(g.id,'video/src',src);rerender()})})}});
  box.appendChild(h('span',{class:'fl',text:'Archivo (biblioteca)'}));box.appendChild(h('div',{class:'row'},sel,up));
  var bg=h('select');[['opaque','Opaco (sin transparencia)'],['alpha','Transparente / imagen'],['chroma','Fondo verde (chroma)']].forEach(function(o){bg.appendChild(h('option',{value:o[0],text:o[1],selected:(v.bg||'opaque')===o[0]}))});
  bg.addEventListener('change',function(){cset(g.id,'video/bg',bg.value);rerender()});
  var en=h('select');[['hide','Ocultar solo'],['hold','Quedarse al final']].forEach(function(o){en.appendChild(h('option',{value:o[0],text:o[1],selected:(v.onEnd||'hold')===o[0]}))});
  en.addEventListener('change',function(){cset(g.id,'video/onEnd',en.value)});
  box.appendChild(h('div',{class:'row'},h('div',null,h('span',{class:'fl',text:'Fondo'}),bg),h('div',null,h('span',{class:'fl',text:'Al terminar'}),en)));
  function chk(label,key){var c=h('input',{type:'checkbox'});c.checked=!!v[key];c.addEventListener('change',function(){cset(g.id,'video/'+key,c.checked)});return h('label',{class:'check'},c,label)}
  box.appendChild(h('div',{class:'row'},chk('Repetir en bucle','loop'),chk('Con sonido','audio')));
  if(v.bg==='chroma'){var kc=h('input',{type:'color',value:v.key||'#00ff00'});kc.addEventListener('input',function(){cset(g.id,'video/key',kc.value)});
    var sim=h('input',{type:'range',min:0,max:.8,step:.01,value:v.sim==null?.32:v.sim});sim.addEventListener('input',function(){cset(g.id,'video/sim',+sim.value)});
    var sm=h('input',{type:'range',min:0,max:.4,step:.01,value:v.smooth==null?.12:v.smooth});sm.addEventListener('input',function(){cset(g.id,'video/smooth',+sm.value)});
    box.appendChild(h('div',{class:'row'},h('div',null,h('span',{class:'fl',text:'Color a quitar'}),kc),h('div',null,h('span',{class:'fl',text:'Tolerancia'}),sim),h('div',null,h('span',{class:'fl',text:'Suavizado'}),sm)))}
  return box}
function editorBody(g){var b=h('div');
  if(g.type==='gc_apoyo')b.appendChild(fieldInput(g,'texto','Texto'));
  else if(g.type==='gc_nombre')b.appendChild(h('div',{class:'row'},fieldInput(g,'nombre','Nombre'),fieldInput(g,'cargo','Cargo')));
  else if(g.type==='video')b.appendChild(videoEditor(g));
  if(g.needsOk){var c=h('input',{type:'checkbox'});c.checked=!!g.ok;c.addEventListener('change',function(){cset(g.id,'ok',c.checked);refreshCardState(g.id)});
    b.appendChild(h('label',{class:'check'},c,'Nombre y cargo validados con la persona / institución'))}
  var ce=colorEditor(g);if(ce)b.appendChild(ce);
  return b}

function pickFile(accept,cb){var i=h('input',{type:'file',accept:accept});i.onchange=function(){if(i.files[0])cb(i.files[0])};i.click()}
function uploadMedia(file,done){toast('Subiendo '+file.name+'…');
  CG.media.upload(file,store).then(function(r){var L=U.clone(cfg().library||{});
    L[r.id]={id:r.id,name:file.name,src:r.src,type:/image/.test(file.type)?'image':'video',size:file.size};store.set('config/library',L);toast('Archivo listo: '+file.name);done&&done(r.src,r)})
   .catch(function(e){toast(e.message||'No se pudo subir el archivo.')})}

function card(id){var g=G(id);if(!g)return null;
  var c=h('div',{class:'card'+(isOn(id)?' on':''),'data-gid':id});
  var chips=[h('span',{class:'chip',text:g.kind||'GC'})];var k=keyOf(id);if(k)chips.push(h('span',{class:'chip',text:k}));
  c.appendChild(h('div',{class:'ch'},h('span',{class:'dot'}),h('span',{class:'cname',text:g.name}),chips,h('span',{class:'chip bad warnc',text:'PENDIENTE'}),h('span',{class:'chip warn okc',text:'VALIDAR'})));
  c.appendChild(editorBody(g));
  c.appendChild(h('div',{class:'warn-txt why'}));
  c.appendChild(h('div',{class:'acts'},
    h('button',{class:'btn green',text:'Mostrar',onclick:function(){show(id)}}),
    h('button',{class:'btn redd',text:'Ocultar',onclick:function(){hide(id)}}),
    h('button',{class:'btn',text:'Actualizar',onclick:function(){update(id)}}),
    h('button',{class:'btn prevb',text:'Prev',onclick:function(){preview(id);refreshPrevButtons()}})));
  stateOfCard(c,g);return c}
function stateOfCard(c,g){var why=whyNot(g);
  $('.warnc',c).style.display=(pend(g)||nofile(g))?'':'none';$('.okc',c).style.display=(g.needsOk&&!g.ok)?'':'none';
  $('.why',c).textContent=why;$('.why',c).style.display=why?'':'none'}
function refreshCardState(id){$$('.card[data-gid="'+id+'"]').forEach(function(c){stateOfCard(c,G(id))});$$('.bb[data-gid="'+id+'"]').forEach(function(b){b.classList.toggle('off',!!whyNot(G(id)))})}
function refreshPrevButtons(){var p=mons&&mons.prevId;$$('.card').forEach(function(c){$('.prevb',c).classList.toggle('act',c.getAttribute('data-gid')===p)})}
function refreshLive(){$$('.card').forEach(function(c){var on=isOn(c.getAttribute('data-gid'));c.classList.toggle('on',on)});
  $$('.bb').forEach(function(b){b.classList.toggle('on',isOn(b.getAttribute('data-gid')))});
  $$('.gchip').forEach(function(b){b.classList.toggle('on',isOn(b.getAttribute('data-gid')))})}

/* ---------- dispositivo ---------- */
function deviceMode(){var d=localStorage.getItem('cg:device')||'auto';
  if(d==='auto')return (w.matchMedia&&w.matchMedia('(pointer:coarse)').matches)||w.innerWidth<820?'botonera':'completo';return d}

/* ---------- vistas ---------- */
var app=function(){return $('#app')};
function rerender(){
  var a=app();if(!a)return;a.innerHTML='';
  if(!store.config())return;
  var dev=deviceMode();if(dev==='botonera')ui.view='botonera';
  a.appendChild(header(dev));
  if(ui.view==='botonera')a.appendChild(botonera());
  else a.appendChild(control(ui.view==='visual'));
  refreshLive();refreshPrevButtons()}
function header(dev){
  var tabs=h('nav',{class:'tabs'});
  if(dev!=='botonera')[['control','Control'],['visual','Control + Visual'],['botonera','Botonera']].forEach(function(t){
    tabs.appendChild(h('button',{class:'btn'+(ui.view===t[0]?' act':''),text:t[1],onclick:function(){ui.view=t[0];saveUi();rerender()}}))});
  var st=h('span',{class:'status',id:'status'});
  return h('header',{class:'top'},h('div',{class:'logo',html:'FRIKITAL <b>CG</b>'}),tabs,h('div',{class:'grow'}),st,
    h('button',{class:'btn pink',text:'Limpiar salida',onclick:clearAll}),h('button',{class:'btn',title:'Configuración','aria-label':'Configuración',text:'⚙',onclick:function(){openSettings('botonera')}}))}
function setStatus(){var s=$('#status');if(!s)return;var ok=store.mode==='local'||/en línea/.test(statusTxt);
  s.className='status'+(ok?' ok':'');s.innerHTML='<i></i>';s.appendChild(document.createTextNode((store.mode==='local'?'modo local':'en línea')+' · sala '+conn.sala+(ok||!statusTxt?'':' · '+statusTxt)))}

function control(withMon){
  var wrap=h('div'),n=ui.stream;
  var sb=h('div',{class:'streams'});
  for(var i=1;i<=7;i++)(function(i){sb.appendChild(h('button',{class:'st'+(i===n?' act':''),onclick:function(){ui.stream=i;ui.step=0;saveUi();rerender()}},h('b',{text:i}),h('small',{text:STN[i-1]})))})(i);
  wrap.appendChild(sb);
  if(withMon){var m=ensureMons(),pv=h('div',{class:'monbox'},h('h4',{text:'VISTA PREVIA · solo operador'})),ar=h('div',{class:'monbox'},h('h4',{class:'air',text:'AL AIRE'}));
    wrap.appendChild(h('div',{class:'mons'},pv,ar));attachMon(m.prev,pv);attachMon(m.air,ar)}
  var s=libretos&&libretos[n],cols=h('div',{class:'cols'});
  /* escaleta */
  var esc=h('div',{class:'sec'});
  esc.appendChild(h('h3',null,'Escaleta · Streaming '+n,
    h('button',{class:'btn small',text:'◀ Re Pág',onclick:function(){stepMove(-1)}}),h('button',{class:'btn small',text:'Av Pág ▶',onclick:function(){stepMove(1)}})));
  if(!s)esc.appendChild(h('div',{class:'help',text:'Cargando libreto…'}));
  else s.steps.forEach(function(st,idx){
    var gids=stepGids(n,st);
    var el=h('div',{class:'step'+(idx===ui.step?' cur':''),'data-i':idx,onclick:function(){ui.step=idx;markSteps()}},
      h('div',{class:'l1'},h('span',{class:'tc',text:st.tc+' · '+st.dur}),h('span',{class:'bl',text:st.block}),h('span',{class:'cm',text:st.cam||''})),
      h('div',{class:'l2',text:st.graphic||''}),st.notes?h('div',{class:'l3',text:st.notes}):null,
      h('div',{class:'txt',text:st.text||''}),
      gids.length?h('div',{class:'gchips'},gids.map(function(id){return h('button',{class:'gchip','data-gid':id,text:G(id).name,onclick:function(ev){ev.stopPropagation();toggle(id)}})})):null);
    el.addEventListener('dblclick',function(){el.classList.toggle('open')});
    esc.appendChild(el)});
  /* gráficas */
  var gr=h('div',{class:'sec'});
  var ids=ui.all?cfg().order.filter(function(id){return G(id)}):streamGids(n);
  gr.appendChild(h('h3',null,'Gráficas · '+(ui.all?'todas':STN[n-1].toUpperCase()),
    h('button',{class:'btn small',text:ui.all?'Solo este streaming':'Ver todas',onclick:function(){ui.all=!ui.all;rerender()}})));
  if(!ids.length)gr.appendChild(h('div',{class:'help',text:'Este streaming no tiene gráficas asociadas.'}));
  ids.forEach(function(id){var c=card(id);c&&gr.appendChild(c)});
  cols.appendChild(esc);cols.appendChild(gr);wrap.appendChild(cols);return wrap}
function markSteps(){$$('.step').forEach(function(e){e.classList.toggle('cur',+e.getAttribute('data-i')===ui.step)})}
function stepMove(d){var s=libretos&&libretos[ui.stream];if(!s)return;ui.step=Math.max(0,Math.min(s.steps.length-1,ui.step+d));markSteps();
  var e=$('.step.cur');if(e&&e.scrollIntoView)e.scrollIntoView({block:'nearest',behavior:'smooth'})}

/* ---------- botonera ---------- */
function botonera(){
  var wrap=h('div'),B=cfg().buttons;
  wrap.appendChild(h('div',{class:'bhead'},
    h('button',{class:'btn'+(ui.edit?' act':''),text:ui.edit?'Terminar edición':'Editar botonera',onclick:function(){ui.edit=!ui.edit;rerender()}}),
    ui.edit?h('button',{class:'btn green',text:'+ Botón',onclick:function(){var o=cfg().order.filter(function(id){return !B.some(function(b){return b.gid===id})})[0]||cfg().order[0];
      store.set('config/buttons',B.concat([{gid:o,key:''}]));rerender()}}):null,
    ui.edit?h('span',{class:'help',text:'Toca un botón para editarlo. Arrastra para ordenar (o usa ◀ ▶ dentro del editor).'}):null));
  var grid=h('div',{class:'bgrid'});
  B.forEach(function(b,i){var g=G(b.gid);if(!g)return;
    var el=h('div',{class:'bb'+(ui.edit?' edit':'')+(whyNot(g)?' off':''),'data-gid':b.gid,'data-i':i,draggable:ui.edit?'true':null,role:'button',tabindex:0},
      h('div',{class:'nm',text:g.name}),
      h('div',{class:'meta'},h('span',{class:'chip',text:g.kind||'GC'}),b.key?h('span',{class:'chip',text:b.key}):null,(pend(g)||nofile(g))?h('span',{class:'chip bad',text:'PENDIENTE'}):null),
      ui.edit?h('span',{class:'mv',text:'✎'}):null);
    el.addEventListener('click',function(){if(ui.edit)editButton(i);else toggle(b.gid)});
    if(ui.edit){
      el.addEventListener('dragstart',function(e){e.dataTransfer.setData('text/plain',String(i));el.classList.add('drag')});
      el.addEventListener('dragend',function(){el.classList.remove('drag')});
      el.addEventListener('dragover',function(e){e.preventDefault()});
      el.addEventListener('drop',function(e){e.preventDefault();var from=+e.dataTransfer.getData('text/plain');if(isNaN(from)||from===i)return;
        var arr=B.slice(),m=arr.splice(from,1)[0];arr.splice(i,0,m);store.set('config/buttons',arr);rerender()})}
    grid.appendChild(el)});
  if(!B.length)wrap.appendChild(h('div',{class:'help',style:'padding:0 16px',text:'No hay botones. Entra a Editar botonera y agrega uno.'}));
  wrap.appendChild(grid);return wrap}
function keyCapture(input,onKey){
  input.readOnly=true;input.placeholder='pulsa una tecla';
  input.addEventListener('keydown',function(e){e.preventDefault();e.stopPropagation();var k=normKey(e);if(!k)return;input.value=k;onKey(k)})}
function normKey(e){var k=e.key;if(['Shift','Control','Alt','Meta','CapsLock','Dead'].indexOf(k)>=0)return '';if(k===' ')return 'Space';return k.length===1?k.toUpperCase():k}
function editButton(i){
  var B=U.clone(cfg().buttons),b=B[i];if(!b)return;
  var body=h('div'),g;
  function build(){body.innerHTML='';g=G(b.gid);
    var sel=h('select');cfg().order.forEach(function(id){if(G(id))sel.appendChild(h('option',{value:id,text:G(id).name,selected:id===b.gid}))});
    sel.addEventListener('change',function(){B[i].gid=sel.value;b=B[i];store.set('config/buttons',B);build()});
    var key=h('input',{type:'text',class:'keyin',value:b.key||''});
    keyCapture(key,function(k){B[i].key=k;store.set('config/buttons',B)});
    body.appendChild(h('span',{class:'fl',text:'Gráfica'}));body.appendChild(sel);
    body.appendChild(h('span',{class:'fl',text:'Tecla (F13–F24 o cualquier tecla)'}));
    body.appendChild(h('div',{class:'row'},key,h('button',{class:'btn small',text:'Quitar tecla',onclick:function(){B[i].key='';store.set('config/buttons',B);key.value=''}})));
    if(B.some(function(x,j){return j!==i&&x.key&&x.key===b.key}))body.appendChild(h('div',{class:'warn-txt',text:'Ojo: otra gráfica usa la misma tecla.'}));
    body.appendChild(h('hr',{style:'border-color:#392a72;margin:14px 0'}));
    body.appendChild(editorBody(g));
    body.appendChild(h('div',{class:'acts'},
      h('button',{class:'btn',text:'◀ Mover',disabled:i===0,onclick:function(){var a=B.slice(),m=a.splice(i,1)[0];a.splice(i-1,0,m);store.set('config/buttons',a);closeModal();rerender()}}),
      h('button',{class:'btn',text:'Mover ▶',disabled:i===B.length-1,onclick:function(){var a=B.slice(),m=a.splice(i,1)[0];a.splice(i+1,0,m);store.set('config/buttons',a);closeModal();rerender()}}),
      h('button',{class:'btn',text:'Actualizar al aire',onclick:function(){update(b.gid)}}),
      h('button',{class:'btn redd',text:'Quitar botón',onclick:function(){B.splice(i,1);store.set('config/buttons',B);closeModal();rerender()}})))}
  build();modal('Editar botón',body,function(){rerender()})}

/* ---------- ventanas ---------- */
var openModals=[];
function modal(title,content,onClose){
  var ov=h('div',{class:'ov'}),m=h('div',{class:'modal'},h('div',{class:'mh'},h('h2',{text:title}),h('button',{class:'btn',text:'Cerrar',onclick:function(){closeModal()}})),content);
  ov.appendChild(m);ov.addEventListener('mousedown',function(e){if(e.target===ov)closeModal()});document.body.appendChild(ov);
  openModals.push({ov:ov,onClose:onClose});return ov}
function closeModal(){var m=openModals.pop();if(!m)return;m.ov.remove();m.onClose&&m.onClose()}

/* ---------- configuración ---------- */
var testRend=null,testWrap=null,testDemo=null;
function ensureTest(){
  if(testRend)return;
  testWrap=h('div',{class:'mon testmon'});var stage=h('div',{class:'mon-stage'});testDemo=h('div',{class:'demo',text:'ANTES'});stage.appendChild(testDemo);testWrap.appendChild(stage);
  testRend=new CG.Renderer(stage,CG.createMemStore(store),{side:'test',mute:false});
  var fit=function(){var s=testWrap.clientWidth/1920;if(s>0)stage.style.transform='scale('+s+')'};if(w.ResizeObserver)new ResizeObserver(fit).observe(testWrap);testWrap._fit=fit}
function slug(s){return (s||'g').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,18)||'g'}
function trOptions(sel,cur){sel.appendChild(h('option',{value:'',text:'Sin transición'}));var T=cfg().transitions||{};
  Object.keys(T).forEach(function(k){sel.appendChild(h('option',{value:k,text:T[k].name,selected:k===cur}))})}
function openSettings(tab){
  var body=h('div'),tabs=h('div',{class:'mtabs'}),cur=tab||'botonera';
  var T=[['botonera','Botonera'],['graficas','Gráficas'],['transiciones','Transiciones'],['dispositivo','Dispositivo'],['general','General']];
  function paint(){tabs.innerHTML='';T.forEach(function(t){tabs.appendChild(h('button',{class:'btn'+(cur===t[0]?' act':''),text:t[1],onclick:function(){cur=t[0];paint()}}))});
    body.innerHTML='';({botonera:tabBotonera,graficas:tabGraficas,transiciones:tabTransiciones,dispositivo:tabDispositivo,general:tabGeneral})[cur](body,paint)}
  var wrap=h('div',null,tabs,body);paint();modal('Configuración',wrap,function(){rerender()})}

function tabBotonera(b,paint){
  b.appendChild(h('div',{class:'help',text:'Elige qué gráficas tienen botón y con qué tecla se activan (F13–F24 o cualquier otra). Un toque muestra, otro oculta.'}));
  var B=U.clone(cfg().buttons),list=h('div',{class:'tbl'});
  function save(){store.set('config/buttons',B)}
  B.forEach(function(x,i){
    var sel=h('select',{class:'grow'});cfg().order.forEach(function(id){if(G(id))sel.appendChild(h('option',{value:id,text:G(id).name,selected:id===x.gid}))});
    sel.onchange=function(){x.gid=sel.value;save()};
    var key=h('input',{type:'text',class:'keyin',value:x.key||''});keyCapture(key,function(k){x.key=k;save();paint()});
    list.appendChild(h('div',{class:'trow'},h('span',{class:'chip',text:i+1}),sel,key,
      h('button',{class:'btn small',text:'▲',disabled:i===0,onclick:function(){var m=B.splice(i,1)[0];B.splice(i-1,0,m);save();paint()}}),
      h('button',{class:'btn small',text:'▼',disabled:i===B.length-1,onclick:function(){var m=B.splice(i,1)[0];B.splice(i+1,0,m);save();paint()}}),
      h('button',{class:'btn small redd',text:'✕',onclick:function(){B.splice(i,1);save();paint()}})))});
  b.appendChild(list);
  b.appendChild(h('div',{class:'acts'},h('button',{class:'btn green',text:'+ Agregar botón',onclick:function(){var o=cfg().order.filter(function(id){return !B.some(function(q){return q.gid===id})})[0]||cfg().order[0];B.push({gid:o,key:''});save();paint()}})))}

function tabGraficas(b,paint){
  b.appendChild(h('div',{class:'help',html:'Renombra, crea, duplica o elimina gráficas. <b>Entra con / Sale con</b>: si eliges una transición, primero corre la transición y la gráfica cambia en el corte, con la pantalla tapada. <b>Grupo</b>: dos gráficas del mismo grupo no se superponen (la nueva reemplaza a la anterior).'}));
  var list=h('div',{class:'tbl'}),groups=['gc','placa','fondo','motion'];
  cfg().order.forEach(function(id){var g=G(id);if(!g)return;
    var name=h('input',{type:'text',class:'grow',value:g.name});name.oninput=function(){cset(id,'name',name.value)};
    function trSel(prop){var s=h('select');trOptions(s,g[prop]||'');s.onchange=function(){cset(id,prop,s.value||null)};return s}
    var grp=h('select');groups.forEach(function(x){grp.appendChild(h('option',{value:x,text:'Grupo: '+x,selected:(g.group||id)===x}))});grp.appendChild(h('option',{value:id,text:'Independiente',selected:(g.group||id)===id&&groups.indexOf(g.group)<0}));
    grp.onchange=function(){cset(id,'group',grp.value)};
    var en=trSel('enter'),ex=trSel('exit');
    list.appendChild(h('div',{class:'trow'},name,h('span',{class:'chip',text:g.type==='video'?'VIDEO':(g.type==='gc_nombre'?'NOMBRE':'TEXTO')}),grp,
      h('label',{class:'help'},'Entra con ',en),h('label',{class:'help'},'Sale con ',ex),
      h('button',{class:'btn small',text:'Duplicar',onclick:function(){dupGraphic(id);paint()}}),
      h('button',{class:'btn small redd',text:'Eliminar',onclick:function(){if(confirm('¿Eliminar "'+g.name+'"?')){delGraphic(id);paint()}}})))});
  b.appendChild(list);
  var tsel=h('select');[['gc_apoyo','GC de texto (como GC 1)'],['gc_nombre','GC de nombre y cargo (como GC 2)'],['video','Video / animación']].forEach(function(o){tsel.appendChild(h('option',{value:o[0],text:o[1]}))});
  var nm=h('input',{type:'text',placeholder:'Nombre de la nueva gráfica'});
  b.appendChild(h('div',{class:'row',style:'margin-top:14px'},nm,tsel,h('button',{class:'btn green',text:'+ Crear',onclick:function(){
    if(!nm.value.trim()){toast('Escribe un nombre.');return}newGraphic(nm.value.trim(),tsel.value);paint()}})))}
function newGraphic(name,type){var id=slug(name)+'_'+Math.random().toString(36).slice(2,5);
  var g={id:id,name:name,type:type,group:type==='video'?'motion':'gc',kind:type==='video'?'MOTION':'GC',colors:{},enter:null,exit:null};
  if(type==='gc_apoyo')g.fields={texto:'PENDIENTE_TEXTO'};else if(type==='gc_nombre')g.fields={nombre:'PENDIENTE_NOMBRE',cargo:'PENDIENTE_CARGO'};
  else g.video={src:'',bg:'opaque',loop:false,audio:true,onEnd:'hide',key:'#00ff00',sim:.32,smooth:.12};
  var order=cfg().order.concat([id]),m={};m['config/graphics/'+id]=g;m['config/order']=order;store.multi(m)}
function dupGraphic(id){var c=U.clone(G(id)),nid=slug(c.name)+'_'+Math.random().toString(36).slice(2,5);c.id=nid;c.name+=' (copia)';if(c.needsOk)c.ok=false;
  var order=cfg().order.slice();order.splice(order.indexOf(id)+1,0,nid);var m={};m['config/graphics/'+nid]=c;m['config/order']=order;store.multi(m)}
function delGraphic(id){var m={};m['config/graphics/'+id]=null;m['config/order']=cfg().order.filter(function(x){return x!==id});
  m['config/buttons']=cfg().buttons.filter(function(x){return x.gid!==id});m['live/'+id]=null;store.multi(m)}

function tabTransiciones(b,paint){
  b.appendChild(h('div',{class:'help',html:'Sube tus propios MP4/WebM o crea cortinas animadas. <b>Punto de corte</b>: momento de la transición en que la pantalla está tapada y la gráfica cambia. Usa PROBAR para verlo.'}));
  ensureTest();b.appendChild(testWrap);testDemo.textContent='ANTES';setTimeout(function(){testWrap._fit&&testWrap._fit();testRend.sync()},30);
  var T=cfg().transitions||{},list=h('div',{class:'tbl'});
  Object.keys(T).forEach(function(id){var t=T[id];
    function tset(k,v){store.set('config/transitions/'+id+'/'+k,v)}
    var name=h('input',{type:'text',class:'grow',value:t.name});name.oninput=function(){tset('name',name.value)};
    var row=h('div',{class:'trow'},name,h('span',{class:'chip',text:t.kind==='video'?'VIDEO':'CORTINA'}));
    if(t.kind==='video'){
      var bg=h('select');[['opaque','Opaco'],['alpha','Transparente'],['chroma','Fondo verde']].forEach(function(o){bg.appendChild(h('option',{value:o[0],text:o[1],selected:(t.bg||'opaque')===o[0]}))});bg.onchange=function(){tset('bg',bg.value);paint()};
      var au=h('input',{type:'checkbox'});au.checked=!!t.audio;au.onchange=function(){tset('audio',au.checked)};
      row.appendChild(bg);row.appendChild(h('label',{class:'check'},au,'Sonido'));
    }else{
      var st=h('select');[['wipe','Cortina'],['diagonal','Diagonal'],['iris','Círculo'],['barras','Barras']].forEach(function(o){st.appendChild(h('option',{value:o[0],text:o[1],selected:(t.style||'wipe')===o[0]}))});st.onchange=function(){tset('style',st.value)};
      var dur=h('input',{type:'number',min:300,max:3000,step:50,value:t.dur||900,style:'width:110px'});dur.oninput=function(){tset('dur',+dur.value)};
      var c1=h('input',{type:'color',value:t.c1||'#e0267f'});c1.oninput=function(){tset('c1',c1.value)};var c2=h('input',{type:'color',value:t.c2||'#2f9de0'});c2.oninput=function(){tset('c2',c2.value)};
      row.appendChild(st);row.appendChild(h('label',{class:'help'},'ms ',dur));row.appendChild(c1);row.appendChild(c2)}
    var cutv=h('span',{class:'chip',text:Math.round((t.cut==null?.5:t.cut)*100)+'%'});
    var cut=h('input',{type:'range',min:0,max:100,step:1,value:Math.round((t.cut==null?.5:t.cut)*100),style:'flex:1 1 200px'});
    cut.oninput=function(){cutv.textContent=cut.value+'%';tset('cut',cut.value/100)};
    row.appendChild(h('span',{class:'help',text:'Corte'}));row.appendChild(cut);row.appendChild(cutv);
    row.appendChild(h('button',{class:'btn small green',text:'Probar',onclick:function(){testRend.sync();testDemo.textContent='ANTES';testRend.runTransition(id,function(){testDemo.textContent='DESPUÉS'})}}));
    row.appendChild(h('button',{class:'btn small redd',text:'✕',onclick:function(){if(!confirm('¿Eliminar la transición?'))return;var m={};m['config/transitions/'+id]=null;
      Object.keys(cfg().graphics).forEach(function(g){var x=G(g);if(x.enter===id)m['config/graphics/'+g+'/enter']=null;if(x.exit===id)m['config/graphics/'+g+'/exit']=null});store.multi(m);paint()}}));
    list.appendChild(row)});
  if(!Object.keys(T).length)list.appendChild(h('div',{class:'help',text:'Aún no hay transiciones.'}));
  b.appendChild(list);
  var nm=h('input',{type:'text',placeholder:'Nombre de la transición'});
  b.appendChild(h('div',{class:'row',style:'margin-top:14px'},nm,
    h('button',{class:'btn green',text:'+ Nueva cortina animada',onclick:function(){var id=U.uid('t'),m={};m['config/transitions/'+id]={id:id,name:nm.value.trim()||'Cortina',kind:'cortina',style:'wipe',dur:900,cut:.5,c1:'#e0267f',c2:'#2f9de0'};store.multi(m);paint()}}),
    h('button',{class:'btn',text:'Subir video MP4/WebM…',onclick:function(){pickFile('video/mp4,video/webm',function(f){uploadMedia(f,function(src){var id=U.uid('t'),m={};
      m['config/transitions/'+id]={id:id,name:nm.value.trim()||f.name,kind:'video',src:src,bg:'opaque',cut:.5,audio:false,key:'#00ff00',sim:.32,smooth:.12};store.multi(m);paint()})})}})))}

function tabDispositivo(b,paint){
  b.appendChild(h('div',{class:'help',text:'Define qué se muestra en este equipo. Automático: celular y tablet muestran solo la botonera; el computador, el panel completo. Se guarda solo en este equipo.'}));
  var cur=localStorage.getItem('cg:device')||'auto';
  [['auto','Automático'],['botonera','Solo botonera'],['completo','Panel completo']].forEach(function(o){
    var r=h('input',{type:'radio',name:'dev'});r.checked=cur===o[0];r.onchange=function(){localStorage.setItem('cg:device',o[0])};
    b.appendChild(h('label',{class:'check'},r,o[1]))});
  b.appendChild(h('div',{class:'help',text:'Ahora mismo este equipo usa: '+(deviceMode()==='botonera'?'solo botonera':'panel completo')+'.'}))}

function tabGeneral(b,paint){
  var g=cfg().general;
  var pn=h('input',{type:'text',value:g.programa||''});pn.oninput=function(){store.set('config/general/programa',pn.value)};
  b.appendChild(h('span',{class:'fl',text:'Nombre del programa'}));b.appendChild(pn);
  b.appendChild(h('span',{class:'fl',text:'Logo (imagen para el panel)'}));
  b.appendChild(h('div',{class:'row'},g.logo?h('img',{src:g.logo,style:'max-height:56px;flex:0 0 auto'}):h('span',{class:'help',text:'Sin logo'}),
    h('button',{class:'btn small',text:'Subir logo…',onclick:function(){pickFile('image/*',function(f){var img=new Image();img.onload=function(){var s=Math.min(1,480/img.width),c=document.createElement('canvas');c.width=img.width*s;c.height=img.height*s;c.getContext('2d').drawImage(img,0,0,c.width,c.height);store.set('config/general/logo',c.toDataURL('image/png'));paint()};img.src=URL.createObjectURL(f)})}}),
    g.logo?h('button',{class:'btn small redd',text:'Quitar',onclick:function(){store.set('config/general/logo','');paint()}}):null));
  var vel=h('input',{type:'range',min:.5,max:2,step:.1,value:g.velocidad||1}),vl=h('span',{class:'chip',text:'x'+(g.velocidad||1)});
  vel.oninput=function(){vl.textContent='x'+vel.value;store.set('config/general/velocidad',+vel.value)};
  b.appendChild(h('span',{class:'fl',text:'Velocidad de animaciones'}));b.appendChild(h('div',{class:'row'},vel,vl));
  /* biblioteca */
  b.appendChild(h('span',{class:'fl',text:'Biblioteca de videos'}));
  var L=cfg().library||{},list=h('div',{class:'tbl'});
  Object.keys(L).forEach(function(id){var x=L[id];list.appendChild(h('div',{class:'trow'},h('span',{class:'grow',text:x.name}),h('span',{class:'chip',text:/^db:/.test(x.src)?'EN LA SALA':/^idb:/.test(x.src)?'SOLO ESTE EQUIPO':'REPOSITORIO'}),
    h('button',{class:'btn small redd',text:'✕',onclick:function(){store.set('config/library/'+id,null);paint()}})))});
  b.appendChild(list);
  b.appendChild(h('div',{class:'acts'},h('button',{class:'btn',text:'Subir MP4/WebM…',onclick:function(){pickFile('video/mp4,video/webm,video/quicktime',function(f){uploadMedia(f,function(){paint()})})}})));
  b.appendChild(h('div',{class:'help',text:'Archivos grandes (más de 24 MB) conviene dejarlos en la carpeta media/ del repositorio y escribir su ruta en la biblioteca de tu copia de seguridad.'}));
  /* copia de seguridad */
  b.appendChild(h('span',{class:'fl',text:'Copia de seguridad'}));
  b.appendChild(h('div',{class:'acts'},
    h('button',{class:'btn',text:'Descargar copia',onclick:function(){var blob=new Blob([JSON.stringify({app:'frikital-cg',v:cfg().v,config:cfg()},null,1)],{type:'application/json'}),a=h('a',{href:URL.createObjectURL(blob),download:'frikital-cg-copia.json'});a.click()}}),
    h('button',{class:'btn',text:'Restaurar copia…',onclick:function(){pickFile('application/json',function(f){f.text().then(function(t){try{var j=JSON.parse(t);if(!j.config||!j.config.graphics)throw 0;if(!confirm('Esto reemplaza toda la configuración. ¿Continuar?'))return;clearAll();store.set('config',j.config);toast('Copia restaurada');paint()}catch(e){toast('El archivo no es una copia válida.')}})})}}),
    h('button',{class:'btn redd',text:'Restablecer catálogo',onclick:function(){if(confirm('Vuelve al catálogo original de la ficha (pierdes tus cambios). ¿Seguro?')){clearAll();store.set('config',CG.defaultConfig());paint()}}})));
  /* conexión */
  b.appendChild(h('span',{class:'fl',text:'Conexión de este equipo'}));
  var mode=conn.mode,rl=h('input',{type:'radio',name:'cm'}),ro=h('input',{type:'radio',name:'cm'});rl.checked=mode==='local';ro.checked=mode==='online';
  rl.onchange=function(){mode='local'};ro.onchange=function(){mode='online'};
  var sala=h('input',{type:'text',value:conn.sala}),db=h('input',{type:'text',value:conn.db,placeholder:'https://tu-proyecto-default-rtdb.firebaseio.com'});
  b.appendChild(h('label',{class:'check'},rl,'Local (un solo computador, sin internet)'));b.appendChild(h('label',{class:'check'},ro,'En línea (varios equipos, Firebase)'));
  b.appendChild(h('div',{class:'row'},h('div',null,h('span',{class:'fl',text:'Sala'}),sala),h('div',null,h('span',{class:'fl',text:'URL de Realtime Database'}),db)));
  b.appendChild(h('div',{class:'acts'},h('button',{class:'btn pink',text:'Guardar y recargar',onclick:function(){
    if(mode==='online'&&!/^(https:\/\/|http:\/\/localhost)/.test(db.value.trim())){toast('Falta la URL https:// de la base de datos.');return}
    localStorage.setItem('cg:conn',JSON.stringify({sala:sala.value.trim()||'frikital',db:db.value.trim().replace(/\/$/,''),mode:mode}));location.reload()}})));
  var base=new URL('salida.html',location.href).href,q='?sala='+encodeURIComponent(conn.sala)+(conn.mode==='local'?'&local=1':'&db='+encodeURIComponent(conn.db));
  b.appendChild(h('span',{class:'fl',text:'Enlace para la fuente de navegador de OBS (1920×1080)'}));
  b.appendChild(h('div',{class:'url',text:base+q}));
  b.appendChild(h('div',{class:'acts'},h('button',{class:'btn small',text:'Copiar enlace',onclick:function(){(navigator.clipboard?navigator.clipboard.writeText(base+q):Promise.reject()).then(function(){toast('Enlace copiado')},function(){toast('Copia el enlace a mano')})}})))}

/* ---------- teclado y arranque ---------- */
document.addEventListener('keydown',function(e){
  var t=e.target;if(t&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)&&!t.readOnly)return;
  if(openModals.length||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key==='PageDown'||e.key==='PageUp'){if(ui.view!=='botonera'&&deviceMode()!=='botonera'){e.preventDefault();stepMove(e.key==='PageDown'?1:-1)}return}
  var k=normKey(e);if(!k)return;var b=cfg().buttons.filter(function(x){return x.key&&x.key===k})[0];
  if(b){e.preventDefault();if(!e.repeat)toggle(b.gid)}});
var raf=0;
function schedule(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;rerender();setStatus()})}
store.onStatus(function(s){statusTxt=s;setStatus()});
store.onChange(function(path){
  if(!store.synced)return;
  if(!store.state().config){store.set('config',CG.defaultConfig());return}
  if(/^\/live/.test(path)){refreshLive();return}
  var a=document.activeElement;
  if(a&&/^(INPUT|TEXTAREA)$/.test(a.tagName)&&/\/(fields|colors|name|dur|cut|c1|c2|key|sim|smooth)/.test(path)){return}
  schedule()});
fetch('data/libretos.json?v=1.1.0').then(function(r){return r.json()}).then(function(j){libretos=j;schedule()}).catch(function(){});
store.start();
w.CGP={store:store,show:show,hide:hide,toggle:toggle,update:update,clearAll:clearAll,preview:preview,rerender:rerender,ui:ui,conn:conn};
})(window);
