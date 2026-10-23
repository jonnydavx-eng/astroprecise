(function(){
  'use strict';
  function boot(){
    const E=window.AstroEphemeris;
    if(!E)return;
    const now=new Date();
    const set=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text;};
    set('today-date',new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long'}).format(now));
    const jd=now.getTime()/86400000+2440587.5;
    let positions;
    try{positions=E.allPlanetPositions(jd);}catch{set('moon-phase','Sky unavailable');set('moon-detail','Please reload to try again.');return;}
    const sun=positions.Sun,moon=positions.Moon;
    const elong=E.mod360(moon.lon-sun.lon);
    const illuminated=Math.round((1-Math.cos(elong*Math.PI/180))*50);
    const phase=elong<22.5?'New Moon':elong<67.5?'Waxing crescent':elong<112.5?'First quarter':elong<157.5?'Waxing gibbous':elong<202.5?'Full Moon':elong<247.5?'Waning gibbous':elong<292.5?'Last quarter':elong<337.5?'Waning crescent':'New Moon';
    set('moon-phase',phase);set('moon-detail',illuminated+'% illuminated · Moon in '+E.signOf(moon.lon));set('sun-sign',E.signOf(sun.lon));set('moon-sign',E.signOf(moon.lon));set('moon-light',illuminated+'% illuminated');set('sky-time',new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZoneName:'short'}).format(now).replace(/GMT\+0(?![\d:])/,'GMT')+' · computed on this device');
    const moonGraphic=document.getElementById('moon-graphic');
    if(moonGraphic){
      const rad=96,c=112,cos=Math.cos(elong*Math.PI/180),wax=elong<=180;
      // Orthographic phase model: illuminated limb and elliptical terminator.
      const limbSweep=wax?1:0,termSweep=(wax?cos<0:cos>=0)?1:0;
      const d=`M ${c} ${c-rad} A ${rad} ${rad} 0 0 ${limbSweep} ${c} ${c+rad} A ${Math.max(.01,Math.abs(cos)*rad)} ${rad} 0 0 ${termSweep} ${c} ${c-rad} Z`;
      moonGraphic.innerHTML='<svg viewBox="0 0 224 224" role="img" aria-label="Approximate illuminated Moon phase, northern view"><defs><clipPath id="moon-disc"><circle cx="112" cy="112" r="96"/></clipPath><mask id="moon-lit"><path d="'+d+'" fill="white"/></mask></defs><circle cx="112" cy="112" r="108" fill="none" stroke="#aabda3" stroke-opacity=".22"/><circle cx="112" cy="112" r="96" fill="#30423d"/><image href="assets/textures/moon_sm.webp" x="16" y="16" width="192" height="192" preserveAspectRatio="xMidYMid slice" clip-path="url(#moon-disc)" opacity=".16"/><g mask="url(#moon-lit)"><circle cx="112" cy="112" r="96" fill="#e0ddbd"/><image href="assets/textures/moon_sm.webp" x="16" y="16" width="192" height="192" preserveAspectRatio="xMidYMid slice" clip-path="url(#moon-disc)" opacity=".78"/></g></svg>';
    }
    const planetRows=document.getElementById('planet-rows');if(planetRows){Object.entries(positions).forEach(([name,p])=>{const tr=document.createElement('tr');[name,E.signOf(p.lon),(p.lon%30).toFixed(1)+'°'].forEach(text=>{const td=document.createElement('td');td.textContent=text;tr.append(td);});planetRows.append(tr);});}
    // Upcoming sky events: every event is computed here by js/sky-upcoming.js
    // (WeeklySky finders + eclipse geometry on AstroEphemeris). No stored list.
    const listRoot=document.getElementById('upcoming-events');
    const nextRoot=document.getElementById('next-up');
    if((listRoot||nextRoot)&&window.UpcomingSky&&window.WeeklySky){
      setTimeout(()=>{try{renderUpcoming(now,listRoot,nextRoot);}catch{
        if(listRoot)listRoot.textContent='Could not calculate upcoming events. Reload to try again.';
        if(nextRoot)nextRoot.textContent='Could not calculate the next sky event. Reload to try again.';
      }},60);
    }
  }
  function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
  function link(ev){if(!ev.href)return null;const a=el('a','row-link',ev.linkLabel+' ↗');a.href=ev.href;return a;}
  function renderNext(root,ev,eclipse,now){
    const U=window.UpcomingSky;root.replaceChildren();
    if(!ev){root.append(el('p','next-note','Nothing found in the next 90 days.'));return;}
    const copy=el('div','next-copy');copy.append(el('p','eyebrow','Next up in the sky'),el('h2',null,ev.title));
    if(ev.subtitle)copy.append(el('p','next-sub',ev.subtitle));
    copy.append(el('p','next-note',ev.note));
    const when=el('div','next-when');const t=el('time',null,U.formatUK(ev));t.dateTime=new Date(ev.tDate).toISOString();
    const cd=el('p','countdown');cd.setAttribute('aria-label','Time until this event');
    const tick=()=>{const left=U.countdown(ev.tDate,Date.now(),ev.approx);cd.textContent=left?'In '+left:'Happening now';};tick();
    if(root._tick)clearInterval(root._tick);root._tick=setInterval(tick,30000);
    when.append(t,cd);const a=link(ev);if(a)when.append(a);
    root.append(copy,when);
    if(eclipse){const p=el('p','next-eclipse');p.append(el('strong',null,'Next eclipse: '),document.createTextNode(eclipse.title+', '+U.formatUK(eclipse)+' ('+eclipse.subtitle+').'));root.append(p);}
  }
  function renderUpcoming(now,listRoot,nextRoot){
    const U=window.UpcomingSky;
    let days=90;let report=U.build(now,days);
    const eclipse=U.nextEclipse(now,400);
    if(nextRoot)renderNext(nextRoot,report.events[0],eclipse,now);
    if(!listRoot)return;
    const chips=document.querySelectorAll('[data-upcoming-type]');
    const more=document.getElementById('upcoming-more');
    const count=document.getElementById('upcoming-count');
    let active='all';
    function draw(){
      listRoot.replaceChildren();
      const visible=report.events.filter(e=>active==='all'||e.types.indexOf(active)!==-1);
      if(count)count.textContent=visible.length+' event'+(visible.length===1?'':'s')+' in the next '+(days===90?'90 days':'12 months')+' · times in UK time (GMT/BST)';
      if(!visible.length){const li=el('li','notice','No '+(U.TYPE_LABELS[active]||'events').toLowerCase()+' in the next '+(days===90?'90 days':'12 months')+'.'+(active==='eclipse'&&eclipse?' The next one is '+eclipse.title.toLowerCase()+' on '+U.formatUK(eclipse)+'.':''));listRoot.append(li);return;}
      let month='';
      visible.forEach(e=>{
        const m=U.monthKeyUK(e);
        if(m!==month){month=m;const h=el('li','upcoming-month',m);h.setAttribute('role','presentation');listRoot.append(h);}
        const li=el('li','event-row upcoming-row');li.dataset.kind=e.kind;li.dataset.types=e.types.join(' ');li.dataset.source=e.source;
        const time=el('time',null,U.formatUK(e));time.dateTime=new Date(e.tDate).toISOString();
        const copy=el('div');copy.append(el('h3',null,e.title));if(e.subtitle)copy.append(el('p','row-sub',e.subtitle));copy.append(el('p','row-note',e.note));const a=link(e);if(a)copy.append(a);
        li.append(time,copy,el('span','tag',e.approx?'Approximate timing':U.TYPE_LABELS[e.types[0]]));
        listRoot.append(li);
      });
    }
    chips.forEach(btn=>btn.addEventListener('click',()=>{active=btn.dataset.upcomingType;chips.forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));draw();}));
    if(more)more.addEventListener('click',()=>{days=days===90?365:90;report=U.build(now,days);more.textContent=days===90?'Show the next 12 months':'Show the next 90 days';draw();});
    draw();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
