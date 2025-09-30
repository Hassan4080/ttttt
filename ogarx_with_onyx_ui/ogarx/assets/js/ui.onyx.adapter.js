(function(){
  // Ensure earliest run but safe if DOM already ready
  const ready = (fn)=> (document.readyState==='loading') ? document.addEventListener('DOMContentLoaded', fn) : fn();

  function ensureUI(){
    if (document.getElementById('onyx-ui')) return document.getElementById('onyx-ui');
    const ui = document.createElement('div');
    ui.id = 'onyx-ui';
    ui.innerHTML = `
      <div class="hud">
        <div id="leaderboard">
          <h3>Leaderboard</h3>
          <div class="lb-list"></div>
        </div>
      </div>`;
    document.body.appendChild(ui);
    return ui;
  }

  function startMirror(){
    const ui = ensureUI();
    const lbList = ui.querySelector('#leaderboard .lb-list');
    const lbCanvas = document.getElementById('leaderboard-canvas');
    if (!lbCanvas) { console.warn('[ONYX-UI] leaderboard-canvas not found'); return; }

    // Wrap context creation so we always intercept, even if game grabs later.
    const origGetContext = lbCanvas.getContext.bind(lbCanvas);
    lbCanvas.getContext = function(type, opts){
      const ctx = origGetContext(type, opts);
      try { hookCtx(ctx); } catch(e){ console.warn('[ONYX-UI] hookCtx error', e); }
      return ctx;
    };

    // If context already exists, hook it now
    const ctx = lbCanvas.getContext('2d');
    if (ctx) { try { hookCtx(ctx); } catch(e){} }

    function hookCtx(ctx){
      if (ctx.__onyxHooked) return;
      ctx.__onyxHooked = true;

      const origClearRect = ctx.clearRect.bind(ctx);
      const origFillText  = ctx.fillText.bind(ctx);
      const origStrokeText= ctx.strokeText ? ctx.strokeText.bind(ctx) : null;

      let cap = {entries:[], active:false, lastFlush:0};

      ctx.clearRect = function(x,y,w,h){
        cap.entries=[]; cap.active=true;
        return origClearRect(x,y,w,h);
      };

      function capture(text, x, y){
        if (!cap.active) return;
        if (typeof text !== 'string') text = String(text ?? '');
        cap.entries.push({ text: text.trim(), x, y });
      }

      ctx.fillText = function(text, x, y, ...rest){
        try { capture(text,x,y); } catch(e){}
        return origFillText(text, x, y, ...rest);
      };
      if (origStrokeText){
        ctx.strokeText = function(text, x, y, ...rest){
          try { capture(text,x,y); } catch(e){}
          return origStrokeText(text, x, y, ...rest);
        };
      }

      function flush(){
        if (!cap.entries.length) return;
        // Heuristics: keep meaningful non-empty strings; drop pure numbers and headers
        const names = [];
        for (const e of cap.entries){
          const t = e.text;
          if (!t) continue;
          if (/^\d+$/.test(t)) continue;
          if (/^(mass|score|leaderboard)$/i.test(t)) continue;
          if (!names.includes(t)) names.push(t);
        }
        // Render to DOM
        lbList.innerHTML = names.slice(0, 10).map((n,i)=>
          `<div class="lb-position"><span class="pos">${i+1}</span><span class="name">${n}</span></div>`
        ).join('');
        cap.entries=[]; cap.active=false;
      }

      // Flush after each animation frame
      const observe = ()=> requestAnimationFrame(flush);
      // Some draw paths may not call stroke, so schedule periodic flush too
      setInterval(()=>{ flush(); }, 250);

      // Also patch common calls that usually happen near the end of a draw
      ['stroke','beginPath','closePath','restore'].forEach(m=>{
        if (typeof ctx[m] === 'function'){
          const orig = ctx[m].bind(ctx);
          ctx[m] = function(...args){ const r = orig(...args); observe(); return r; };
        }
      });
    }
  }

  ready(startMirror);
})();
