/* Frikital CG · motor de renderizado de la salida · v1.0.0 */
(function(w){
var CG=w.CG, U=CG.util;
var STAR='<svg viewBox="0 0 100 100"><path fill="#fff" d="M50 0C54 30 70 46 100 50C70 54 54 70 50 100C46 70 30 54 0 50C30 46 46 30 50 0Z"/></svg>';
function fit(span,box,base,min){ /* achica la tipografía si el texto no cabe */
  span.style.fontSize=base+'px'; var maxW=box.clientWidth||box.offsetWidth; 
  if(span.offsetWidth>maxW&&maxW>0){span.style.fontSize=Math.max(min||26,Math.floor(base*maxW/span.offsetWidth))+'px'}
}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function cssVars(el,map){Object.keys(map).forEach(function(k){if(map[k])el.style.setProperty(k,map[k])})}

function Renderer(stage,store,opts){
  this.stage=stage;this.store=store;this.opts=opts||{};this.items=new Map();this.vids={};this.blocked={};this.trBusy=false;this.cutDone=true;this.pendingCut=[];
  this.layers={};var self=this;
  ['fondo','placa','gc','motion','trans'].forEach(function(n){var d=document.createElement('div');d.className='layer z-'+n;stage.appendChild(d);self.layers[n]=d});
  store.onChange(function(path){self.sync(path)});
  if(document.fonts){var rf=function(){self.items.forEach(function(it){it.refit&&it.refit()})};document.fonts.load('64px A4Speed').then(rf,rf);document.fonts.ready.then(rf)}
}
var P=Renderer.prototype;
P.sp=function(){return Math.max(.25,Math.min(3,this.store.config().general.velocidad||1))};
P.anim=function(el,kf,o){o=Object.assign({fill:'both'},o);o.duration=(o.duration||300)/this.sp();if(o.delay)o.delay=o.delay/this.sp();return el.animate(kf,o)};
P.layerFor=function(g){return this.layers[g.type==='video'?(g.group==='motion'?'motion':'fondo'):(g.group==='placa'?'placa':'gc')]};

/* Videos (de gráficas y de transiciones): elementos persistentes y precargados, sin retardo al mostrar */
P.mkVideo=function(key,layer,o,src){
  var cur=this.vids[key];if(cur&&cur.src0===src&&cur.bg===o.bg)return;
  if(cur){cur.v.remove();cur.vis.remove()}
  var self=this,v=document.createElement('video');v.preload='auto';v.playsInline=true;v.muted=true;v.setAttribute('playsinline','');
  var vis=v;
  if(o.bg==='chroma'){vis=CG.chroma(v,o);v.style.display='none'}
  layer.appendChild(v);if(vis!==v)layer.appendChild(vis);
  var rec={v:v,vis:vis,src0:src,bg:o.bg};this.vids[key]=rec;
  CG.media.resolve(src,this.store).then(function(url){if(self.vids[key]===rec&&url){v.src=url;v.load()}});
  return rec;
};
P.preload=function(){
  var cfg=this.store.config(),self=this;
  Object.keys(cfg.graphics).forEach(function(id){var g=cfg.graphics[id];if(g.type!=='video'||!g.video||!g.video.src)return;
    var r=self.mkVideo('g:'+id,self.layerFor(g),g.video,g.video.src);
    if(r&&!r.bound){r.bound=true;r.v.addEventListener('ended',function(){var c=self.store.config().graphics[id];
      if(c&&c.video&&c.video.onEnd==='hide'&&!c.video.loop&&self.opts.side==='salida')self.store.set('live/'+id+'/on',false)})}
    if(r&&g.video.bg==='chroma'&&r.vis.setParams)r.vis.setParams(g.video);
  });
  Object.keys(cfg.transitions||{}).forEach(function(id){var t=cfg.transitions[id];if(t.kind!=='video'||!t.src)return;self.mkVideo('t:'+id,self.layers.trans,t,t.src)});
};

P.sync=function(){
  var cfg=this.store.config(),live=this.store.live(),self=this;
  this.preload();
  var want={};
  Object.keys(live).forEach(function(id){var l=live[id];if(l&&l.on&&cfg.graphics[id])want[id]=l});
  var byG={};Object.keys(want).forEach(function(id){var g=cfg.graphics[id].group||id;(byG[g]=byG[g]||[]).push(id)});
  Object.keys(byG).forEach(function(k){var ids=byG[k];if(ids.length>1){ids.sort(function(a,b){return (want[b].t||0)-(want[a].t||0)});ids.slice(1).forEach(function(id){delete want[id]})}});
  this.items.forEach(function(it,id){if(!want[id]&&!it.leaving)self.hide(id)});
  Object.keys(want).forEach(function(id){
    var g=cfg.graphics[id],l=want[id],it=self.items.get(id);
    var data={f:Object.assign({},g.fields,l.fields),c:Object.assign({},g.colors,l.colors)};
    var sig=JSON.stringify(data);
    if(g.type!=='video'&&U.hasPending(data.f)){self.blocked[id]=true;return}
    delete self.blocked[id];
    if(!it||it.leaving){if(it)self.items.delete(id);self.show(id,g,l,data,sig)}
    else if(it.n!==l.n||it.sig!==sig){
      if(g.type==='video'){if(it.n!==l.n&&it.mounted)self.restartVideo(id)}
      else it.update&&it.mounted&&it.update(data);
      it.n=l.n;it.sig=sig}
  });
  var dbg=document.getElementById('debug');if(dbg)dbg.dataset.on=Object.keys(want).join(',');
};
P.show=function(id,g,l,data,sig){
  var it={id:id,n:l.n,sig:sig,type:g.type,mounted:false},self=this;this.items.set(id,it);
  var go=function(){
    if(it.cancelled)return;it.mounted=true;
    if(g.type==='video')return self.showVideo(it,g);
    var mk={gc_apoyo:self.mountGC1,gc_nombre:self.mountGC2}[g.type];
    if(!mk){self.items.delete(id);return}
    mk.call(self,it,g,data);
  };
  if(g.enter)this.runTransition(g.enter,go);else go();
};
P.hide=function(id){
  var it=this.items.get(id);if(!it)return;
  if(!it.mounted){it.cancelled=true;this.items.delete(id);return}
  it.leaving=true;var self=this,g=this.store.config().graphics[id]||{};
  var fin=function(fast){
    if(it.type==='video'){var r=self.vids['g:'+id];if(r){r.vis.classList.remove('on');r.v.pause();try{r.v.currentTime=0}catch(e){}}if(self.items.get(id)===it)self.items.delete(id);return}
    var done=function(){it.el&&it.el.remove();if(self.items.get(id)===it)self.items.delete(id)};
    if(it.out&&!fast)it.out(done);else done();
  };
  if(g.exit)this.runTransition(g.exit,function(){fin(true)});else fin(false);
};
P.restartVideo=function(id){var r=this.vids['g:'+id];if(!r)return;try{r.v.currentTime=0}catch(e){}r.v.play().catch(function(){})};
P.showVideo=function(it,g){
  var r=this.vids['g:'+it.id];if(!r){this.items.delete(it.id);return}
  var o=g.video||{},v=r.v;v.loop=!!o.loop;v.muted=!o.audio||!!this.opts.mute;v.playbackRate=1;try{v.currentTime=0}catch(e){}
  r.vis.classList.add('on');
  var p=v.play();if(p&&p.catch)p.catch(function(){v.muted=true;v.play().catch(function(){})});
};

/* ---------- Transiciones: salen primero, la gráfica cambia en el corte (pantalla tapada) ---------- */
P.runTransition=function(tid,mid){
  var tr=(this.store.config().transitions||{})[tid],self=this,L=this.layers.trans;
  if(!tr){mid();return}
  /* si ya hay una transición en curso: si aún no llegó al corte, este cambio ocurre en el mismo corte */
  if(this.trBusy){if(!this.cutDone)this.pendingCut.push(mid);else mid();return}
  this.trBusy=true;this.cutDone=false;this.pendingCut=[];var called=false;
  function cut(){if(called)return;called=true;self.cutDone=true;[mid].concat(self.pendingCut).forEach(function(f){try{f()}catch(e){console.error(e)}});self.pendingCut=[]}
  function end(){self.trBusy=false;cut()}
  var cutF=tr.cut==null?.5:tr.cut;
  if(tr.kind==='video'){
    var r=this.vids['t:'+tid];
    if(!r||!r.v.src||r.v.readyState<2||!(r.v.duration>0)){end();return}
    var v=r.v;v.currentTime=0;v.playbackRate=this.sp();v.muted=!tr.audio||!!this.opts.mute;r.vis.classList.add('on');
    var cutT=cutF*v.duration;
    var tick=function(){if(!called&&v.currentTime>=cutT)cut();if(!v.ended&&!v.paused)requestAnimationFrame(tick)};
    v.onended=function(){r.vis.classList.remove('on');v.pause();end()};
    v.play().then(function(){requestAnimationFrame(tick)}).catch(function(){r.vis.classList.remove('on');end()});
    setTimeout(function(){if(self.trBusy&&v.paused&&!v.ended){r.vis.classList.remove('on');end()}},((v.duration||3)*1000/this.sp())+1500);
    return;
  }
  var D=(tr.dur||900)/this.sp(),c1=tr.c1||'#e0267f',c2=tr.c2||'#2f9de0',st=tr.style||'wipe';
  var box=document.createElement('div');box.className='tr';L.appendChild(box);
  var ease='cubic-bezier(.65,0,.35,1)',anims=[],extra=70/this.sp();
  function kf(A,B,C){return [{clipPath:A,transform:'none',offset:0,easing:ease},{clipPath:B,transform:'none',offset:cutF,easing:ease},{clipPath:C,transform:'none',offset:1}]}
  if(st==='wipe'||st==='diagonal'){
    [c2,c1].forEach(function(col,i){var d=document.createElement('div');d.className='slab';d.style.background=col;box.appendChild(d);
      var o={duration:D,delay:i*70/self.sp(),fill:'both'};
      if(st==='wipe')anims.push(d.animate(kf('inset(0 100% 0 0)','inset(0 0 0 0)','inset(0 0 0 100%)'),o));
      else{d.style.transform='skewX(-18deg)';anims.push(d.animate([{transform:'translateX(-110%) skewX(-18deg)',offset:0,easing:ease},{transform:'translateX(0) skewX(-18deg)',offset:cutF,easing:ease},{transform:'translateX(110%) skewX(-18deg)',offset:1}],o))}
    });
  }else if(st==='iris'){
    [c2,c1].forEach(function(col,i){var d=document.createElement('div');d.className='slab';d.style.cssText='left:0;width:100%;background:'+col;box.appendChild(d);
      anims.push(d.animate(kf('circle(0% at 50% 50%)','circle(78% at 50% 50%)','circle(0% at 50% 50%)'),{duration:D,delay:i*70/self.sp(),fill:'both'}))});
  }else{ /* barras */
    var N=6;for(var i=0;i<N;i++){var d=document.createElement('div');d.className='bar';d.style.cssText='left:'+(i*100/N)+'%;width:'+(100/N+.2)+'%;background:'+(i%2?c2:c1);box.appendChild(d);
      anims.push(d.animate(kf('inset(0 0 100% 0)','inset(0 0 0 0)','inset(100% 0 0 0)'),{duration:D,delay:i*45/self.sp(),fill:'both'}))}
    extra=(N-1)*45/self.sp();
  }
  setTimeout(cut,cutF*D+extra);
  setTimeout(function(){box.remove();self.trBusy=false;cut()},D+extra+80);
};

/* ---------- GC apoyo · réplica de GC_1 ---------- */
P.mountGC1=function(it,g,data){
  var self=this,S=.652;
  function L(y){return 51+S*(994-y)} function R(y){return 1569+S*(994-y)}
  function poly(top,bot,ins,dx,dy){return 'polygon('+[[L(top)+ins+dx,top+dy],[R(top)-ins+dx,top+dy],[R(bot)-ins+dx,bot+dy],[L(bot)+ins+dx,bot+dy]].map(function(p){return p[0].toFixed(1)+'px '+p[1]+'px'}).join(',')+')'}
  var el=document.createElement('div');el.className='gc gc1 layer';
  el.innerHTML='<div class="wipe layer">'+
    '<div class="l gc1-shadow" style="clip-path:'+poly(821,994,0,14,10)+'"></div>'+
    '<div class="l gc1-border" style="clip-path:'+poly(821,994,0,0,0)+'"></div>'+
    '<div class="l gc1-fill" style="clip-path:'+poly(829,986,10,0,0)+'"></div>'+
    '<div class="gc1-text"><span class="t"></span></div>'+
    '<img class="gc1-planet" alt="" src="media/img/gc1_planeta.png">'+
    '<div class="gc1-sp a">'+STAR+'</div><div class="gc1-sp b">'+STAR+'</div></div>';
  /* los .l comparten posición absoluta de pantalla completa */
  el.querySelectorAll('.l').forEach(function(n){n.style.position='absolute';n.style.inset='0'});
  this.layerFor(g).appendChild(el);it.el=el;
  var wipe=el.querySelector('.wipe'),box=el.querySelector('.gc1-text'),t=el.querySelector('.t');
  function apply(d){cssVars(el,{'--c1':d.c.c1,'--c2':d.c.c2,'--bd':d.c.borde,'--sh':d.c.sombra,'--tx':d.c.texto});t.textContent=d.f.texto||'';fit(t,box,76,30)}
  apply(data);it.refit=function(){fit(t,box,76,30)};
  it.update=function(d){self.anim(t,[{opacity:1},{opacity:0,offset:.4},{opacity:1}],{duration:260});setTimeout(function(){apply(d)},90)};
  var pl=el.querySelector('.gc1-planet'),sp=el.querySelectorAll('.gc1-sp');
  var wa=self.anim(wipe,[{clipPath:'inset(0 1820px 0 0)'},{clipPath:'inset(0 170px 0 0)'}],{duration:300,easing:'cubic-bezier(.55,0,.9,.55)'});wa.onfinish=function(){wa.cancel();wipe.style.clipPath='none'};
  self.anim(pl,[{opacity:0,transform:'translateY(70px) scale(.55)'},{opacity:1,transform:'translateY(-12px) scale(1.1)',offset:.6},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:450,delay:280,easing:'cubic-bezier(.2,.7,.3,1)'});
  sp.forEach(function(s,i){self.anim(s,[{opacity:0,scale:'0'},{opacity:1,scale:'1'}],{duration:260,delay:520+i*90,easing:'cubic-bezier(.2,.9,.3,1.4)'})});
  it.out=function(done){var a=self.anim(wipe,[{clipPath:'inset(0 170px 0 0)'},{clipPath:'inset(0 1820px 0 0)'}],{duration:230,easing:'cubic-bezier(.3,.1,.6,1)'});a.onfinish=done};
};

/* ---------- GC nombre y cargo · réplica de GC_2 ---------- */
P.mountGC2=function(it,g,data){
  var self=this;
  var el=document.createElement('div');el.className='gc gc2 layer';
  el.innerHTML='<div class="gc2-bars"><div class="gc2-wipe">'+
    '<div class="gc2-purple"><div class="gc2-sheen"></div><div class="gc2-nombre"><span class="n"></span></div></div>'+
    '<div class="gc2-blue"><div class="gc2-cargo"><span class="c"></span></div></div></div></div>'+
    '<img class="gc2-avatar" alt="" src="media/img/gc2_avatar.png">';
  this.layerFor(g).appendChild(el);it.el=el;
  var wipe=el.querySelector('.gc2-wipe'),pu=el.querySelector('.gc2-purple'),bl=el.querySelector('.gc2-blue'),av=el.querySelector('.gc2-avatar'),
      n=el.querySelector('.n'),c=el.querySelector('.c');
  n.style.display=c.style.display='inline-block';
  function layout(d){
    cssVars(el,{'--b1':d.c.barra1,'--b2':d.c.barra2,'--ac':d.c.acento,'--tx':d.c.texto,'--tx2':d.c.texto2});
    n.textContent=d.f.nombre||'';c.textContent=d.f.cargo||'';
    n.style.fontSize='64px';c.style.fontSize='40px';
    if(n.offsetWidth>1325)n.style.fontSize=Math.max(30,Math.floor(64*1325/n.offsetWidth))+'px';
    if(c.offsetWidth>1253)c.style.fontSize=Math.max(22,Math.floor(40*1253/c.offsetWidth))+'px';
    var wp=Math.min(1560,Math.max(1065,100+n.offsetWidth+90+45)),wb=Math.min(1380,Math.max(712,62+c.offsetWidth+50+15));
    el.style.setProperty('--wp',wp+'px');el.style.setProperty('--wb',wb+'px');
    it.end=Math.max(290+wp,345+wb)+20;
  }
  layout(data);it.refit=function(){layout(it.data||data)};it.data=data;
  pu.style.transition=bl.style.transition='width .28s ease';
  it.update=function(d){it.data=d;self.anim(el.querySelector('.gc2-bars'),[{opacity:1},{opacity:.35,offset:.4},{opacity:1}],{duration:260});setTimeout(function(){layout(d)},90)};
  self.anim(av,[{transform:'scale(0)'},{transform:'scale(1.17)',offset:.55},{transform:'scale(1)'}],{duration:500,easing:'cubic-bezier(.2,.8,.3,1)'});
  var wa=self.anim(wipe,[{clipPath:'inset(0 1685px 0 0)'},{clipPath:'inset(0 '+Math.max(0,1920-it.end)+'px 0 0)'}],{duration:380,delay:100,easing:'cubic-bezier(.1,.7,.2,1)'});wa.onfinish=function(){wa.cancel();wipe.style.clipPath='none'};
  it.out=function(done){
    self.anim(wipe,[{clipPath:'inset(0 '+Math.max(0,1920-it.end)+'px 0 0)'},{clipPath:'inset(0 1685px 0 0)'}],{duration:400,easing:'cubic-bezier(.5,0,.9,.55)'});
    var a=self.anim(av,[{transform:'scale(1)'},{transform:'scale(0)'}],{duration:280,delay:200,easing:'cubic-bezier(.6,-.3,.8,.6)'});a.onfinish=done;
  };
};
CG.Renderer=Renderer;
})(window);
