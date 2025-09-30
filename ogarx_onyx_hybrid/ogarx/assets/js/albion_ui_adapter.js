
(function(){
  const ready = (fn)=> document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', fn) : fn();
  const $ = (s)=> document.querySelector(s);
  const setVal = (el, v)=>{ if(!el) return; el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); };
  const click = (el)=> el && el.click();

  ready(()=>{
    try { ['lastMode','autoPlay','autoplay','continue','resume','spectate','playState'].forEach(k=>localStorage.removeItem(k)); } catch(e){}

    if ($('#albion-ui')) return;
    const ui = document.createElement('div');
    ui.id = 'albion-ui';
    ui.innerHTML = `
      <div class="panel topbar">
        <div class="brand">Albion</div>
        <div><button class="btn" id="alb-settings">Settings</button></div>
      </div>
      <div class="panel menu" id="alb-menu">
        <div style="grid-column:1 / -1;"><h3>Play</h3></div>
        <div class="field"><label>Tag</label><input id="alb-tag" maxlength="5" placeholder="Tag"></div>
        <div class="field"><label>Nickname</label><input id="alb-name" maxlength="15" placeholder="Nickname"></div>
        <div class="field"><label>Server</label><select id="alb-server"></select></div>
        <div class="footer">
          <button class="btn" id="alb-spectate">Spectate</button>
          <button class="btn" id="alb-play">Play</button>
        </div>
      </div>
      <div class="panel hud" id="alb-hud">
        <h4>Leaderboard</h4>
        <div class="lb-list" id="alb-lb"></div>
      </div>
    `;
    document.body.appendChild(ui);

    const og = {
      tag: $('#tag'), name: $('#nickname'), servers: $('#servers'),
      play: $('#play'), spectate: $('#spectate'), settings: $('#open-settings'),
      lbCanvas: $('#leaderboard-canvas')
    };

    const albServers = $('#alb-server');
    if (og.servers && albServers){
      Array.from(og.servers.options).forEach(opt=>{
        const o = document.createElement('option');
        o.value = opt.value; o.textContent = opt.textContent;
        albServers.appendChild(o);
      });
      albServers.value = og.servers.value;
    }

    $('#alb-tag')?.addEventListener('input', e=> setVal(og.tag, e.target.value));
    $('#alb-name')?.addEventListener('input', e=> setVal(og.name, e.target.value));
    $('#alb-server')?.addEventListener('change', e=> setVal(og.servers, e.target.value));

    $('#alb-play')?.addEventListener('click', ()=> click(og.play));
    $('#alb-spectate')?.addEventListener('click', ()=> click(og.spectate));
    $('#alb-settings')?.addEventListener('click', ()=> click(og.settings));

    const lbDom = $('#alb-lb');
    const lbCanvas = og.lbCanvas;
    if (lbCanvas){
      const originalGetContext = lbCanvas.getContext.bind(lbCanvas);
      lbCanvas.getContext = function(type, opts){
        const ctx = originalGetContext(type, opts);
        hookLB(ctx);
        return ctx;
      };
      const ctx = lbCanvas.getContext('2d');
      if (ctx) hookLB(ctx);
    }

    function hookLB(ctx){
      if (ctx.__albHooked) return;
      ctx.__albHooked = true;
      const origClearRect = ctx.clearRect.bind(ctx);
      const origFillText  = ctx.fillText.bind(ctx);
      const origStrokeText= ctx.strokeText ? ctx.strokeText.bind(ctx) : null;

      let cap = { entries:[], active:false };
      ctx.clearRect = function(x,y,w,h){ cap.entries=[]; cap.active=true; return origClearRect(x,y,w,h); };
      function capText(t){
        if (!cap.active) return;
        t = ('' + (t ?? '')).trim();
        if (t) cap.entries.push(t);
      }
      ctx.fillText = function(t,x,y,...r){ capText(t); return origFillText(t,x,y,...r); };
      if (origStrokeText){
        ctx.strokeText = function(t,x,y,...r){ capText(t); return origStrokeText(t,x,y,...r); };
      }
      function flush(){
        if (!cap.entries.length) return;
        const names = [];
        for (const t of cap.entries){
          if (!t || /^\d+$/.test(t) || /^(mass|score|leaderboard)$/i.test(t)) continue;
          if (!names.includes(t)) names.push(t);
        }
        lbDom.innerHTML = names.slice(0,10).map((n,i)=>`<div class="row"><span class="pos">${i+1}</span><span>${n}</span></div>`).join('');
        cap.entries=[]; cap.active=false;
      }
      const tick = ()=> requestAnimationFrame(flush);
      ['stroke','beginPath','closePath','restore'].forEach(m=>{
        if (typeof ctx[m] === 'function'){
          const o = ctx[m].bind(ctx);
          ctx[m] = function(...a){ const r = o(...a); tick(); return r; };
        }
      });
      setInterval(flush, 250);
    }
  });
})();
