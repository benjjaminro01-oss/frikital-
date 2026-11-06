/* Frikital CG · núcleo: utilidades, configuración por defecto y sincronización · v1.0.0 */
(function(w){
var CG=w.CG=w.CG||{}; CG.VERSION='1.0.0'; CG.cfg=CG.cfg||{};
var U=CG.util={};
U.qs=function(k){return new URLSearchParams(location.search).get(k)};
U.clone=function(o){return o===undefined?undefined:JSON.parse(JSON.stringify(o))};
U.uid=function(p){return (p||'g')+Math.random().toString(36).slice(2,7)};
U.get=function(o,path){var p=String(path).split('/').filter(Boolean);for(var i=0;i<p.length;i++){if(o==null)return undefined;o=o[p[i]]}return o};
U.set=function(o,path,val){var p=String(path).split('/').filter(Boolean);if(!p.length)return val;var c=o;
  for(var i=0;i<p.length-1;i++){if(c[p[i]]==null||typeof c[p[i]]!=='object')c[p[i]]={};c=c[p[i]]}
  if(val===null||val===undefined)delete c[p[p.length-1]];else c[p[p.length-1]]=val;return o};
U.hasPending=function(obj){var s=JSON.stringify(obj||{});return /PENDIENTE_/.test(s)};
U.merge=function(a,b){if(b==null)return a;if(typeof b!=='object'||Array.isArray(b))return b;var o=Array.isArray(a)?{}:Object.assign({},a);
  Object.keys(b).forEach(function(k){o[k]=(a&&typeof a[k]==='object'&&!Array.isArray(a[k]))?U.merge(a[k],b[k]):b[k]});return o};

/* ---- Configuración por defecto (etapa 1: gráficas aprobadas ya replicadas) ---- */
CG.defaultConfig=function(){return {
 v:1,
 general:{programa:'Frikital Fest 2026',velocidad:1,logo:'media/img/logo_fest_blanco.png'},
 order:['carton_inicio','motion_apertura','lt_general','lt_invitado'],
 graphics:{
  carton_inicio:{id:'carton_inicio',name:'Cartón inicio',type:'video',group:'fondo',kind:'CARTÓN',key:'F13',
    video:{src:'media/video/carton_inicio.mp4',bg:'opaque',loop:true,audio:false,onEnd:'hold'},enter:null,exit:null},
  motion_apertura:{id:'motion_apertura',name:'Motion apertura',type:'video',group:'motion',kind:'MOTION',key:'F14',
    video:{src:'media/video/motion_apertura.mp4',bg:'opaque',loop:false,audio:true,onEnd:'hide'},enter:null,exit:null},
  lt_general:{id:'lt_general',name:'Lower third general',type:'gc_apoyo',group:'gc',kind:'GC',key:'F15',
    fields:{texto:'FRIKITAL FEST 2026 · EN VIVO'},colors:{},enter:null,exit:null},
  lt_invitado:{id:'lt_invitado',name:'Identificación de invitado',type:'gc_nombre',group:'gc',kind:'GC',key:'F16',
    fields:{nombre:'PENDIENTE_NOMBRE',cargo:'PENDIENTE_CARGO'},colors:{},enter:null,exit:null}
 },
 buttons:[],transitions:{},library:{}
};};

/* ---- Almacén sincronizado: state = {config, live} ---- */
CG.createStore=function(o){
 var sala=o.sala||'frikital', mode=o.mode||'online', dbUrl=(o.dbUrl||'').replace(/\/$/,'');
 var state={config:null,live:{}}, subs=[], statusSubs=[], es=null, bc=null, lsKey='cg:'+sala;
 function emit(path){subs.forEach(function(f){try{f(path,state)}catch(e){console.error(e)}})}
 function status(s){statusSubs.forEach(function(f){f(s)})}
 function applyPut(path,data){
   if(!path||path==='/'){state=data||{config:null,live:{}};if(!state.live)state.live={}}
   else U.set(state,path,data);
   emit(path);
 }
 var store={
  mode:mode, sala:sala,
  state:function(){return state},
  config:function(){var c=state.config,d=CG.defaultConfig();if(!c)return d;
    return {v:c.v||1,general:Object.assign({},d.general,c.general),order:c.order||[],graphics:c.graphics||{},buttons:c.buttons||[],transitions:c.transitions||{},library:c.library||{}}},
  live:function(){return state.live||{}},
  onChange:function(f){subs.push(f)}, onStatus:function(f){statusSubs.push(f)},
  /* escribe un valor (null = borrar) */
  set:function(path,val){applyPut('/'+path.replace(/^\//,''),val);store._write(path,val)},
  /* escribe varios valores a la vez: {ruta: valor} */
  multi:function(map){Object.keys(map).forEach(function(p){applyPut('/'+p.replace(/^\//,''),map[p])});store._writeMulti(map)},
  start:function(){
    if(mode==='local'){
      try{var raw=localStorage.getItem(lsKey);if(raw){state=JSON.parse(raw);if(!state.live)state.live={}}}catch(e){}
      try{bc=new BroadcastChannel('cg-'+sala);bc.onmessage=function(m){applyRemote(m.data)}}catch(e){}
      w.addEventListener('storage',function(e){if(e.key===lsKey&&e.newValue){try{state=JSON.parse(e.newValue);if(!state.live)state.live={};emit('/')}catch(x){}}});
      status('local · listo');emit('/');
    }else{
      if(!/^https:\/\//.test(dbUrl)){status('SIN URL DE BASE DE DATOS (usa ?db= o js/firebase-config.js)');emit('/');return}
      connect();
    }
  },
  _persist:function(){try{localStorage.setItem(lsKey,JSON.stringify(state))}catch(e){}},
  _write:function(path,val){
    if(mode==='local'){store._persist();try{bc&&bc.postMessage({t:'put',path:'/'+path,data:val===undefined?null:val})}catch(e){}return}
    return fetch(dbUrl+'/rooms/'+sala+'/'+path+'.json',{method:'PUT',body:JSON.stringify(val===undefined?null:val)}).catch(function(){status('error de escritura')});
  },
  _writeMulti:function(map){
    if(mode==='local'){store._persist();try{bc&&bc.postMessage({t:'multi',map:map})}catch(e){}return}
    return fetch(dbUrl+'/rooms/'+sala+'.json',{method:'PATCH',body:JSON.stringify(map)}).catch(function(){status('error de escritura')});
  }
 };
 function applyRemote(m){
   if(m.t==='put')applyPut(m.path,m.data);
   else if(m.t==='multi')Object.keys(m.map).forEach(function(p){applyPut('/'+p.replace(/^\//,''),m.map[p])});
 }
 function connect(){
   status('conectando…');
   es=new EventSource(dbUrl+'/rooms/'+sala+'.json');
   es.addEventListener('open',function(){status('en línea')});
   es.addEventListener('put',function(e){var d=JSON.parse(e.data);applyPut(d.path,d.data)});
   es.addEventListener('patch',function(e){var d=JSON.parse(e.data);Object.keys(d.data||{}).forEach(function(k){applyPut((d.path==='/'?'':d.path)+'/'+k,d.data[k])})});
   es.addEventListener('error',function(){status('reconectando…')});
   es.addEventListener('cancel',function(){status('acceso denegado (revisa las reglas)')});
 }
 return store;
};
})(window);
