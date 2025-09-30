(function(){
  const ready = (fn)=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();
  ready(()=>{
    // Inject UI container
    if (document.getElementById('onyx-ui')) return;
    const ui = document.createElement('div');
    ui.id = 'onyx-ui';
    ui.innerHTML = `<div class="hud"><div id="leaderboard"><h3>Leaderboard</h3><div class="lb-list"></div></div></div>`;
    document.body.appendChild(ui);

    const lbList = ui.querySelector('#leaderboard .lb-list');
    const lbCanvas = document.getElementById('leaderboard-canvas');
    if (!lbCanvas) return;
    const lbCtx = lbCanvas.getContext('2d');
    if (!lbCtx) return;

    const origClearRect = lbCtx.clearRect.bind(lbCtx);
    const origFillText = lbCtx.fillText.bind(lbCtx);
    const origStroke = lbCtx.stroke ? lbCtx.stroke.bind(lbCtx) : null;

    let cap = {entries:[], active:false};
    lbCtx.clearRect = function(x,y,w,h){ cap.entries=[]; cap.active=true; return origClearRect(x,y,w,h); };
    lbCtx.fillText = function(text,x,y,...rest){
      try{ if(cap.active && typeof text==='string'){ cap.entries.push({text:String(text),x,y}); } }catch(e){}
      return origFillText(text,x,y,...rest);
    };

    function flush(){
      if(!cap.entries.length) return;
      const names = [];
      for(const e of cap.entries){
        const t = (e.text||'').trim();
        if(!t) continue;
        if(/^\d+$/.test(t)) continue;
        if(/mass|score|leaderboard/i.test(t)) continue;
        if(!names.includes(t)) names.push(t);
      }
      lbList.innerHTML = names.slice(0,10).map((n,i)=>`<div class="lb-position"><span class="pos">${i+1}</span><span class="name">${n}</span></div>`).join('');
      cap.entries=[]; cap.active=false;
    }

    if (origStroke){
      lbCtx.stroke = function(...args){ const r = origStroke(...args); requestAnimationFrame(flush); return r; };
    } else {
      setInterval(flush, 200);
    }
  });
})();