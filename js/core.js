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

/* ---- Configuración por defecto: catálogo completo de la ficha ---- */
CG.defaultConfig=function(){
 var G={};
 function gc(id,name,texto,x){G[id]=Object.assign({id:id,name:name,type:'gc_apoyo',group:'gc',kind:'GC',fields:{texto:texto},colors:{},enter:null,exit:null},x||{})}
 function nm(id,name,nombre,cargo,x){G[id]=Object.assign({id:id,name:name,type:'gc_nombre',group:'gc',kind:'GC',fields:{nombre:nombre,cargo:cargo},colors:{},enter:null,exit:null},x||{})}
 function vid(id,name,kind,src,o,x){G[id]=Object.assign({id:id,name:name,type:'video',group:o.group,kind:kind,video:{src:src,bg:'opaque',loop:!!o.loop,audio:!!o.audio,onEnd:o.onEnd||'hold',key:'#00ff00',sim:.32,smooth:.12},enter:null,exit:null},x||{})}
 vid('carton_inicio','Cartón inicio','CARTÓN','media/video/carton_inicio.mp4',{group:'fondo',loop:true});
 vid('motion_apertura','Motion apertura','MOTION','media/video/motion_apertura.mp4',{group:'motion',audio:true,onEnd:'hide'});
 gc('lt_general','Lower third general','FRIKITAL FEST 2026 · EN VIVO');
 gc('lt_comunidades','Lower third de sección · Comunidades','COMUNIDADES GEEK');
 gc('lt_tecnologia','Lower third tecnológico','TECNOLOGÍA E INNOVACIÓN');
 gc('lt_ilustracion','Lower third de ilustración','ILUSTRACIÓN Y CULTURA VISUAL');
 gc('lt_colaboradores','Lower third de colaboradores','COLABORADORES FRIKITAL FEST 2026');
 gc('lt_premiacion','Lower third de premiación','CEREMONIA DE PREMIACIÓN');
 nm('lt_dario','Darío Cuesta','DARÍO CUESTA','DIRECTOR NACIONAL',{needsOk:true,ok:false});
 nm('lt_luis','Luis Galáz','LUIS GALÁZ','DIRECTOR DE CARRERA',{needsOk:true,ok:false});
 nm('lt_jackfredo','Jackfredo','JACKFREDO','ILUSTRADOR',{needsOk:true,ok:false});
 nm('lt_jorge','Jorge Córdova Pacheco','JORGE CÓRDOVA PACHECO','DIRECTOR DE CARRERA / PRODUCTOR GENERAL',{needsOk:true,ok:false});
 nm('lt_mume','Mume','MUME','PENDIENTE_CARGO');
 nm('lt_conductor','Conductor/a','PENDIENTE_NOMBRE','PENDIENTE_CARGO');
 nm('lt_jedi','Representante Comunidad Jedi','PENDIENTE_NOMBRE','PENDIENTE_CARGO');
 nm('lt_ludopalooza','Representante Ludopalooza','PENDIENTE_NOMBRE','PENDIENTE_CARGO');
 nm('lt_redbull','Representante Red Bull','PENDIENTE_NOMBRE','PENDIENTE_CARGO');
 nm('lt_muvix','Representante Muvix','PENDIENTE_NOMBRE','PENDIENTE_CARGO');
 nm('lt_bimedia','Representante BiMedia','PENDIENTE_NOMBRE','PENDIENTE_CARGO');
 nm('lt_invitado','Invitado (genérico)','PENDIENTE_NOMBRE','PENDIENTE_CARGO');
 gc('placa_organizacion','Placa de organización','ORGANIZAN: ÁREA DE COMUNICACIÓN Y DISEÑO + ÁREA DE INFORMÁTICA');
 gc('placa_datos','Placa de datos del festival','2.ª EDICIÓN · DESDE LAS 10:00 · SANTO TOMÁS TALCA');
 gc('placa_aprendizaje','Placa de aprendizaje','APRENDIZAJE PRÁCTICO · TRABAJO COLABORATIVO · COMUNIDAD');
 nm('gc_premiacion','Gráfica de premiación','PENDIENTE_GANADOR/A','PENDIENTE_CATEGORÍA · PUESTO');
 vid('motion_cierre','Motion cierre','MOTION','',{group:'motion',audio:true,onEnd:'hide'});
 vid('motion_final','Motion final','MOTION','',{group:'motion',audio:true,onEnd:'hide'});
 vid('carton_final','Cartón final','CARTÓN','',{group:'fondo',loop:true});
 var keys={carton_inicio:'F13',motion_apertura:'F14',lt_general:'F15',lt_invitado:'F16',placa_datos:'F17',placa_organizacion:'F18',placa_aprendizaje:'F19',motion_cierre:'F20',motion_final:'F21',carton_final:'F22',gc_premiacion:'F23',lt_premiacion:'F24'};
 var order=Object.keys(G);
 return {v:2,
  general:{programa:'Frikital Fest 2026',velocidad:1,logo:''},
  order:order,graphics:G,
  buttons:Object.keys(keys).map(function(id){return {gid:id,key:keys[id]}}),
  transitions:{},
  library:{
   lib_carton:{id:'lib_carton',name:'carton_inicio.mp4',src:'media/video/carton_inicio.mp4',type:'video'},
   lib_motion:{id:'lib_motion',name:'motion_apertura.mp4',src:'media/video/motion_apertura.mp4',type:'video'}}};
};

/* ---- Almacén sincronizado: state = {config, live} ---- */
CG.createStore=function(o){
 var sala=o.sala||'frikital', mode=o.mode||'online', dbUrl=(o.dbUrl||'').replace(/\/$/,'');
 var state={config:null,live:{}}, subs=[], statusSubs=[], es=null, bc=null, lsKey='cg:'+sala;
 function emit(path){subs.forEach(function(f){try{f(path,state)}catch(e){console.error(e)}})}
 function status(s){statusSubs.forEach(function(f){f(s)})}
 function applyPut(path,data){
   if(!path||path==='/'){store.synced=true;state=data||{config:null,live:{}};if(!state.live)state.live={}}
   else U.set(state,path,data);
   emit(path);
 }
 var store={
  mode:mode, sala:sala, dbUrl:dbUrl, synced:false,
  state:function(){return state},
  config:function(){var c=state.config,d=CG.defaultConfig();if(!c)return d;
    return {v:c.v||2,general:Object.assign({},d.general,c.general),order:c.order||[],graphics:c.graphics||{},buttons:c.buttons||[],transitions:c.transitions||{},library:c.library||{}}},
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
      store.synced=true;status('local · listo');emit('/');
    }else{
      if(!/^(https:\/\/|http:\/\/localhost)/.test(dbUrl)){status('SIN URL DE BASE DE DATOS (usa ?db= o js/firebase-config.js)');emit('/');return}
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

/* ---- Almacén en memoria para el monitor de VISTA PREVIA (no se sincroniza) ---- */
(function(w){var CG=w.CG;
CG.createMemStore=function(real){var live={},subs=[];
 function emit(){subs.forEach(function(f){try{f('/live')}catch(e){console.error(e)}})}
 return {mode:'mem',config:function(){return real.config()},live:function(){return live},
  onChange:function(f){subs.push(f);real.onChange(function(p){if(!/^\/live/.test(p))f(p)})},
  set:function(){},setLive:function(l){live=l||{};emit()}};};

/* ---- Medios: archivos del repositorio, IndexedDB (local) o fragmentos en la base de datos (en línea) ---- */
function idb(){return new Promise(function(res,rej){var r=indexedDB.open('cg-media',1);r.onupgradeneeded=function(){r.result.createObjectStore('f')};r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)}})}
function idbGet(k){return idb().then(function(d){return new Promise(function(res){var q=d.transaction('f').objectStore('f').get(k);q.onsuccess=function(){res(q.result||null)};q.onerror=function(){res(null)}})})}
function idbPut(k,v){return idb().then(function(d){return new Promise(function(res,rej){var t=d.transaction('f','readwrite');t.objectStore('f').put(v,k);t.oncomplete=res;t.onerror=function(){rej(t.error)}})})}
function b64(buf){var s='',u=new Uint8Array(buf),n=0x8000;for(var i=0;i<u.length;i+=n)s+=String.fromCharCode.apply(null,u.subarray(i,i+n));return btoa(s)}
function unb64(str){var s=atob(str),u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}
var urlCache={};
CG.media={
 MAX:24*1024*1024,
 resolve:function(src,store){
  if(!src)return Promise.resolve('');
  if(urlCache[src])return Promise.resolve(urlCache[src]);
  var m=/^(idb|db):(.+)$/.exec(src);if(!m)return Promise.resolve(src);
  var id=m[2];
  return idbGet(id).then(function(blob){
    if(blob||m[1]==='idb')return blob;
    var base=store.dbUrl+'/rooms/'+store.sala+'/media/'+id;
    return fetch(base+'/meta.json').then(function(r){return r.json()}).then(function(meta){
      if(!meta)return null;var ps=[];for(var i=0;i<meta.n;i++)ps.push(fetch(base+'/chunks/'+i+'.json').then(function(r){return r.json()}));
      return Promise.all(ps).then(function(parts){var blob=new Blob(parts.map(unb64),{type:meta.type});idbPut(id,blob);return blob})});
  }).then(function(blob){if(!blob)return '';return urlCache[src]=URL.createObjectURL(blob)}).catch(function(){return ''});
 },
 upload:function(file,store,onProg){
  var id=U.uid('m');
  if(store.mode==='local'){return idbPut(id,file).then(function(){return {id:id,src:'idb:'+id}})}
  if(file.size>CG.media.MAX)return Promise.reject(new Error('El archivo pesa más de 24 MB: súbelo a la carpeta media/ del repositorio.'));
  return file.arrayBuffer().then(function(buf){
    var s=b64(buf),CH=400000,n=Math.ceil(s.length/CH),base=store.dbUrl+'/rooms/'+store.sala+'/media/'+id,i=0;
    function next(){if(i>=n)return fetch(base+'/meta.json',{method:'PUT',body:JSON.stringify({n:n,type:file.type||'video/mp4',size:file.size,name:file.name})});
      var p=fetch(base+'/chunks/'+i+'.json',{method:'PUT',body:JSON.stringify(s.slice(i*CH,(i+1)*CH))}).then(function(r){if(!r.ok)throw new Error('La base de datos rechazó el archivo (revisa las reglas).')});i++;onProg&&onProg(i/n);return p.then(next)}
    return next();
  }).then(function(){return idbPut(id,file)}).then(function(){return {id:id,src:'db:'+id}});
 }
};
var U=CG.util;

/* ---- Chroma key por WebGL: devuelve un canvas con el verde (o el color elegido) transparente ---- */
CG.chroma=function(video,o){
 var c=document.createElement('canvas');c.width=1920;c.height=1080;
 var gl=c.getContext('webgl',{premultipliedAlpha:false,alpha:true});if(!gl)return c;
 function sh(t,s){var x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);return x}
 var p=gl.createProgram();
 gl.attachShader(p,sh(gl.VERTEX_SHADER,'attribute vec2 a;varying vec2 uv;void main(){uv=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0,1);}'));
 gl.attachShader(p,sh(gl.FRAGMENT_SHADER,'precision mediump float;uniform sampler2D t;uniform vec3 k;uniform float s,m;varying vec2 uv;void main(){vec4 c=texture2D(t,uv);float d=distance(c.rgb,k);float a=smoothstep(s,s+m,d);if(k.g>k.r&&k.g>k.b){c.g=min(c.g,max(c.r,c.b));}gl_FragColor=vec4(c.rgb,a);}'));
 gl.linkProgram(p);gl.useProgram(p);
 var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
 var a=gl.getAttribLocation(p,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
 var tx=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tx);
 [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T].forEach(function(q){gl.texParameteri(gl.TEXTURE_2D,q,gl.CLAMP_TO_EDGE)});
 [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER].forEach(function(q){gl.texParameteri(gl.TEXTURE_2D,q,gl.LINEAR)});
 function hex(h){h=(h||'#00ff00').replace('#','');return [0,2,4].map(function(i){return parseInt(h.substr(i,2),16)/255})}
 c.setParams=function(q){var k=hex(q.key);gl.uniform3f(gl.getUniformLocation(p,'k'),k[0],k[1],k[2]);gl.uniform1f(gl.getUniformLocation(p,'s'),q.sim==null?.32:q.sim);gl.uniform1f(gl.getUniformLocation(p,'m'),q.smooth==null?.12:q.smooth)};
 c.setParams(o||{});
 function draw(){if(video.readyState>=2){try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,video);gl.viewport(0,0,1920,1080);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)}catch(e){}}
  if(!video.paused&&!video.ended)loop()}
 function loop(){if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(draw);else requestAnimationFrame(draw)}
 video.addEventListener('play',loop);video.addEventListener('seeked',draw);video.addEventListener('loadeddata',draw);
 return c;
};
})(window);
