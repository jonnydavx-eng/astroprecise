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
    set('moon-phase',phase);set('moon-detail',illuminated+'% illuminated · Moon in '+E.signOf(moon.lon));set('sun-sign',E.signOf(sun.lon));set('moon-sign',E.signOf(moon.lon));set('moon-light',illuminated+'% illuminated');set('sky-time',new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'}).format(now)+' UTC · computed on this device');
    const moonGraphic=document.getElementById('moon-graphic');
    if(moonGraphic){
      const rad=96,c=112,cos=Math.cos(elong*Math.PI/180),wax=elong<=180;
      // Orthographic phase model: illuminated limb and elliptical terminator.
      const limbSweep=wax?1:0,termSweep=(wax?cos<0:cos>=0)?1:0;
      const d=`M ${c} ${c-rad} A ${rad} ${rad} 0 0 ${limbSweep} ${c} ${c+rad} A ${Math.max(.01,Math.abs(cos)*rad)} ${rad} 0 0 ${termSweep} ${c} ${c-rad} Z`;
      moonGraphic.innerHTML='<svg viewBox="0 0 224 224" role="img" aria-label="Approximate illuminated Moon phase, northern view"><defs><clipPath id="moon-disc"><circle cx="112" cy="112" r="96"/></clipPath><mask id="moon-lit"><path d="'+d+'" fill="white"/></mask></defs><circle cx="112" cy="112" r="108" fill="none" stroke="#aabda3" stroke-opacity=".22"/><circle cx="112" cy="112" r="96" fill="#30423d"/><image href="assets/textures/moon_sm.webp" x="16" y="16" width="192" height="192" preserveAspectRatio="xMidYMid slice" clip-path="url(#moon-disc)" opacity=".16"/><g mask="url(#moon-lit)"><circle cx="112" cy="112" r="96" fill="#e0ddbd"/><image href="assets/textures/moon_sm.webp" x="16" y="16" width="192" height="192" preserveAspectRatio="xMidYMid slice" clip-path="url(#moon-disc)" opacity=".78"/></g></svg>';
    }
    const planetRows=document.getElementById('planet-rows');if(planetRows){Object.entries(positions).forEach(([name,p])=>{const tr=document.createElement('tr');[name,E.signOf(p.lon),(p.lon%30).toFixed(1)+'°'].forEach(text=>{const td=document.createElement('td');td.textContent=text;tr.append(td);});planetRows.append(tr);});}
    const eventRoot=document.getElementById('upcoming-events');
    if(eventRoot&&window.WeeklySky){
      const full=eventRoot.dataset.full==='true';
      const selected=document.getElementById('event-type');
      // Compute after the first useful screen has painted.
      setTimeout(()=>{try{
        let events=WeeklySky.buildWeekReport(now).events;
        const next=new Date(now.getTime()+7*86400000);events=events.concat(WeeklySky.buildWeekReport(next).events).filter(e=>new Date(e.tDate)>=now);
        function draw(){eventRoot.replaceChildren();let visible=events.filter(e=>!selected||selected.value==='all'||e.kind===selected.value).slice(0,full?24:3);
          if(!visible.length){const li=document.createElement('li');li.className='notice';li.textContent='No events of this kind in the next two calendar weeks. Try another filter.';eventRoot.append(li);}
          visible.forEach(e=>{const li=document.createElement('li');li.className='event-row';const time=document.createElement('time');time.dateTime=new Date(e.tDate).toISOString();time.textContent=(e.approx?'Around ':'')+new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'}).format(new Date(e.tDate))+' UTC';const copy=document.createElement('div');const h=document.createElement('h3');h.textContent=e.title;const p=document.createElement('p');p.textContent=e.kind==='phase'?'The Moon reaches this phase.':e.kind==='ingress'?'Crosses a tropical zodiac boundary; this is not a change of constellation.':e.kind==='station'?'Apparent motion changes direction as seen from Earth.':'A geometric angle between the two bodies, as seen from Earth.';copy.append(h,p);const tag=document.createElement('span');tag.className='tag';tag.textContent=e.approx?'Approximate timing':'Computed event';li.append(time,copy,tag);eventRoot.append(li);});}
        draw();if(selected)selected.addEventListener('change',draw);
      }catch{eventRoot.textContent='Could not calculate upcoming events. Reload to try again.';}},80);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
