/* AstroPrecise: a small, private, mobile-first chart experience. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const E = () => window.AstroEphemeris;
  const GLYPHS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
  const PLANETS = [
    ['sun','Sun','☉','Identity & expression'],['moon','Moon','☽','Emotions & comfort'],
    ['mercury','Mercury','☿','Thinking & communication'],['venus','Venus','♀','Connection & values'],
    ['mars','Mars','♂','Drive & action'],['jupiter','Jupiter','♃','Growth & possibility'],
    ['saturn','Saturn','♄','Responsibility & structure'],['uranus','Uranus','♅','Change & independence'],
    ['neptune','Neptune','♆','Imagination & ideals'],['pluto','Pluto','♇','Power & transformation']
  ];
  const THEMES = {
    Aries:{quality:'initiative, directness and the courage to begin',need:'space to act and a fresh challenge',approach:'direct, energetic and ready to start',prompt:'Where could a small, brave first step matter more than a perfect plan?'},
    Taurus:{quality:'steadiness, pleasure and the value of what lasts',need:'reliability, physical comfort and time to settle',approach:'measured, grounded and attentive to what feels real',prompt:'What helps you feel grounded — and when does comfort become holding on?'},
    Gemini:{quality:'curiosity, language and the exchange of ideas',need:'conversation, variety and room to ask questions',approach:'curious, conversational and quick to make connections',prompt:'Which question are you curious about before you already know the answer?'},
    Cancer:{quality:'care, belonging and a sense of emotional history',need:'safety, familiar people and space for your feelings',approach:'observant, protective and sensitive to the atmosphere',prompt:'What does feeling at home mean to you, beyond a place?'},
    Leo:{quality:'creativity, warmth and the wish to express yourself',need:'warmth, appreciation and the freedom to play',approach:'expressive, warm and willing to be seen',prompt:'What would you make or share if you weren’t waiting for applause?'},
    Virgo:{quality:'discernment, craft and making useful improvements',need:'a manageable rhythm and something practical to tend',approach:'attentive, thoughtful and aware of small details',prompt:'Where would good enough give you more freedom than getting it exactly right?'},
    Libra:{quality:'balance, relationships and seeing another point of view',need:'reciprocity, ease and room to talk things through',approach:'considerate, sociable and alert to the balance between people',prompt:'Where can you make room for someone else without giving away your own voice?'},
    Scorpio:{quality:'depth, honesty and staying with difficult questions',need:'trust, privacy and emotionally honest connection',approach:'intentional, private and interested in what lies beneath the surface',prompt:'What deserves your trust — and what would help you offer it gradually?'},
    Sagittarius:{quality:'exploration, meaning and a wider perspective',need:'freedom, possibility and something to look forward to',approach:'open, candid and drawn toward possibility',prompt:'Which belief becomes more useful when you allow it to change?'},
    Capricorn:{quality:'commitment, patience and building something worthwhile',need:'dependability, clear boundaries and a sense of progress',approach:'composed, purposeful and attentive to responsibility',prompt:'What are you building, and does the pace leave room for living?'},
    Aquarius:{quality:'independence, ideas and thinking beyond convention',need:'autonomy, friendship and space to see things differently',approach:'individual, thoughtful and willing to question the usual way',prompt:'Where could your different perspective help someone feel less alone?'},
    Pisces:{quality:'imagination, empathy and sensitivity to subtle things',need:'gentleness, creative space and time to decompress',approach:'receptive, imaginative and responsive to the mood around you',prompt:'What helps you stay open to others while keeping a boundary of your own?'}
  };
  let chosenPlace = null;
  let currentResult = null;
  let searchSequence = 0;
  let searchController = null;
  let savedId = null;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDegree = value => { const minute = Math.floor((value % 1) * 60); return Math.floor(value) + '° ' + String(minute).padStart(2,'0') + '′'; };
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  function validZone(zone) { try { return !!zone && !!new Intl.DateTimeFormat('en-GB',{timeZone:zone}).format(); } catch (_) { return false; } }
  function validPlace(place) { return place && validZone(place.tz) && Number.isFinite(place.lat) && Math.abs(place.lat)<=90 && Number.isFinite(place.lon) && Math.abs(place.lon)<=180; }
  function civilParts(ms, zone) {
    const p = {};
    new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms)).forEach(part => { if(part.type!=='literal') p[part.type] = Number(part.value); });
    return p;
  }
  // Test all offsets near the date and round-trip each candidate. This detects
  // both skipped clock times and repeated ones instead of silently choosing.
  function civilCandidates(date, time, zone) {
    const [y,m,d] = date.split('-').map(Number);
    const [hh,mm] = time.split(':').map(Number);
    const naive = Date.UTC(y,m-1,d,hh,mm);
    const offsets = new Set();
    for(let hours=-48;hours<=48;hours+=6) {
      const probe=naive+hours*3600000, p=civilParts(probe,zone);
      offsets.add(Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-probe);
    }
    const candidates=[];
    for(const offset of offsets) {
      const ms=naive-offset,p=civilParts(ms,zone);
      if(p.year===y && p.month===m && p.day===d && p.hour===hh && p.minute===mm) candidates.push(ms);
    }
    return [...new Set(candidates)].sort((a,b)=>a-b);
  }
  function dayBoundary(date, zone, end) {
    for(let shift=0;shift<1440;shift++) {
      const minute=end?1439-shift:shift;
      const time=String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
      const options=civilCandidates(date,time,zone);
      if(options.length) return options[end?options.length-1:0];
    }
    throw new Error('That date did not occur in this place because the local calendar changed. Please check the birth record.');
  }
  function calculateAt(ms, place) {
    const d=new Date(ms);
    return E().calculateNatalChart(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),d.getUTCHours(),d.getUTCMinutes(),place.lat,place.lon,'whole','true');
  }
  function calculate(input) {
    if(!E() || typeof E().calculateNatalChart!=='function') throw new Error('The chart engine hasn’t loaded. Please refresh this page and try again.');
    if(!validPlace(input.place)) throw new Error('Choose your birth place from the matching places before continuing.');
    const day=new Date(input.date+'T12:00:00Z');
    const today=new Date();const todayText=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||!Number.isFinite(day.getTime())||day.toISOString().slice(0,10)!==input.date||input.date<'1900-01-01'||input.date>todayText) throw new Error('Enter a valid birth date between 1900 and today.');
    if(input.timeKnown&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time))throw new Error('Enter a valid local birth time, or choose “I don’t know my birth time”.');
    const candidates=civilCandidates(input.date,input.timeKnown?input.time:'12:00',input.place.tz);
    if(!candidates.length) throw new Error('This local time was skipped when the clocks changed. Please check your birth record, or choose “I don’t know my birth time”.');
    if(input.timeKnown && candidates.length>1 && !input.fold) {
      const error=new Error('This time happened twice when the clocks went back. Choose which occurrence below the time field.');
      error.fold=true; throw error;
    }
    const ms=candidates[input.fold==='later'?candidates.length-1:0];
    const raw=calculateAt(ms,input.place), ranges={};
    if(!input.timeKnown) {
      const start=calculateAt(dayBoundary(input.date,input.place.tz,false),input.place);
      const end=calculateAt(dayBoundary(input.date,input.place.tz,true),input.place);
      for(const [key] of PLANETS) ranges[key]=[...new Set([start.positions[key].sign,raw.positions[key].sign,end.positions[key].sign])];
    }
    const positions={};
    for(const [key,label] of PLANETS) {
      if(!input.timeKnown && ranges[key].length>1) continue;
      const p=raw.positions[key];
      positions[label]=!input.timeKnown&&key==='moon'?{sign:p.sign}:{lon:p.longitude,longitude:p.longitude,sign:p.sign,degree:p.degree,retrograde:p.retrograde};
    }
    if(input.timeKnown) for(const [key,label] of [['asc','Ascendant'],['mc','Midheaven']]) {
      const p=raw.positions[key]; positions[label]={lon:p.longitude,longitude:p.longitude,sign:p.sign,degree:p.degree,retrograde:false};
    }
    // No noon-derived angle escapes into saved data when the time is unknown.
    const data={name:'My birth chart',birthDate:input.date,birthTime:input.timeKnown?input.time:null,timeKnown:input.timeKnown,timeAccuracy:input.timeKnown?'exact':'unknown',timezoneKnown:true,birthCity:input.place.name,city:input.place.name,lat:input.place.lat,lon:input.place.lon,tz:input.place.tz,houseSystem:'whole',nodeMode:'true',jd:raw.jd,positions,ascendant:input.timeKnown?raw.ascendant:null,asc:input.timeKnown?raw.ascendant:null,mc:input.timeKnown?raw.midheaven:null,houses:input.timeKnown?raw.houses:null,aspects:[],sunSign:positions.Sun?positions.Sun.sign:null,moonSign:positions.Moon?positions.Moon.sign:null,risingSign:input.timeKnown?raw.positions.asc.sign:null,engineV:3,timeFold:input.fold||null,uncertainty:input.timeKnown?null:{assumedLocalTime:'12:00',signRanges:ranges}};
    if(input.timeKnown&&input.timeAccuracy==='approximate')data.timeAccuracy='approximate';
    return {data,raw,ranges,instant:new Date(ms).toISOString(),input};
  }
  function pickPlace(place) {
    if(!validPlace(place)) return;
    chosenPlace=place; $('birth-place').value=place.name; $('place-options').hidden=true;
    $('place-status').textContent=place.name+' · '+place.tz.replace(/_/g,' ');
    $('birth-place').removeAttribute('aria-invalid'); resetFold();
  }
  function renderPlaces(places) {
    const container=$('place-options'); container.replaceChildren();
    places.filter(validPlace).slice(0,7).forEach(place=>{
      const button=document.createElement('button');button.type='button';
      const name=document.createElement('strong'); name.textContent=place.name+(place.country?' · '+place.country:'');
      const zone=document.createElement('span');zone.textContent=place.tz.replace(/_/g,' ');
      button.append(name,zone);button.addEventListener('click',()=>pickPlace(place));container.append(button);
    });
    container.hidden=!container.childElementCount;
  }
  function offlineSearch() {
    searchSequence++; if(searchController) searchController.abort();
    chosenPlace=null;resetFold();
    const query=normalize($('birth-place').value);
    const places=query.length>=2?((E()&&E().CITIES)||[]).filter(city=>normalize(city.name+' '+city.country).includes(query)).sort((a,b)=>Number(normalize(b.name).startsWith(query))-Number(normalize(a.name).startsWith(query))):[];
    renderPlaces(places);
    $('place-status').textContent=query.length<2?'':places.length?'Choose your place from the matches above.':'No offline match. Use “Search more towns online” to look it up.';
  }
  async function onlineSearch() {
    const query=$('birth-place').value.trim();
    if(query.length<2) { $('place-status').textContent='Type at least two letters of your town first.';$('birth-place').focus();return; }
    const sequence=++searchSequence;
    if(searchController) searchController.abort();
    searchController=new AbortController(); const controller=searchController;
    const timer=setTimeout(()=>controller.abort(),9000);
    $('search-world').disabled=true;$('place-status').textContent='Looking for matching towns…';
    try {
      const response=await fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(query)+'&count=7&language=en&format=json',{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
      if(!response.ok) throw new Error('Search unavailable');
      const result=await response.json();if(sequence!==searchSequence)return;
      const places=(result.results||[]).map(row=>({name:[row.name,row.admin1&&row.admin1!==row.name?row.admin1:'',row.country].filter(Boolean).join(', '),lat:Number(row.latitude),lon:Number(row.longitude),tz:row.timezone||''})).filter(validPlace);
      renderPlaces(places);$('place-status').textContent=places.length?'Choose the correct town from the matches above.':'No matching town found. Try a nearby larger town or add the country.';
    } catch(error) {
      if(sequence===searchSequence) $('place-status').textContent='Online town search couldn’t connect. Try again, or choose a nearby city from the offline list.';
    } finally { clearTimeout(timer);$('search-world').disabled=false; }
  }
  function resetFold() { $('fold-field').hidden=true;$('birth-fold').value=''; }
  function placementCard(label,symbol,sign,position,copy) {
    return '<article class="chart-placement"><div class="chart-placement-top"><span class="chart-placement-symbol" aria-hidden="true">'+symbol+'</span>'+label+'</div><h3>'+esc(sign)+'</h3><p class="chart-position">'+esc(position)+'</p><p>'+esc(copy)+'</p></article>';
  }
  function birthMirrorMatch(data) {
    if(data.timeKnown!==true || data.timeAccuracy!=='exact' || !window.APMirrorHour) return null;
    return window.APMirrorHour.detectFromClock(data.birthTime);
  }
  function renderBirthMirror(data) {
    const host=$('birth-mirror-badge'),match=birthMirrorMatch(data);
    const copy=match?window.APMirrorHour.badgeCopy(match):null;
    host.hidden=!copy;
    host.innerHTML=copy?'<strong>'+esc(copy.label)+' · '+esc(copy.time)+'</strong><p>'+esc(copy.folk)+'</p><small>'+esc(copy.honesty)+'</small>':'';
  }
  function renderWheel(result) {
    const {raw,input,ranges}=result, cx=240,cy=240;
    const rotation=input.timeKnown?raw.ascendant:0;
    const point=(longitude,radius)=>{const a=(180+(longitude-rotation))*Math.PI/180;return [cx+radius*Math.cos(a),cy-radius*Math.sin(a)];};
    let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" role="img" aria-labelledby="wheel-label wheel-desc"><title id="wheel-label">Your tropical zodiac chart wheel</title><desc id="wheel-desc">Planetary positions shown around the zodiac. A full text table follows.'+(input.timeKnown?' The rising point is on the left.':' The Moon is omitted because the birth time is unknown.')+'</desc><circle cx="240" cy="240" r="224" fill="#ebe6d9" stroke="#162625" stroke-opacity=".3"/><circle cx="240" cy="240" r="184" fill="#f4f1e9" stroke="#162625" stroke-opacity=".25"/>';
    for(let i=0;i<12;i++) {
      const a=point(i*30,184),b=point(i*30,224),label=point(i*30+15,205);
      svg+='<path d="M'+a.join(' ')+'L'+b.join(' ')+'" stroke="#162625" stroke-opacity=".25"/><text x="'+label[0]+'" y="'+(label[1]+7)+'" text-anchor="middle" fill="#162625" font-size="23">'+GLYPHS[i]+'</text>';
    }
    if(input.timeKnown) {
      raw.houses.forEach((lon,index)=>{const a=point(lon,83),b=point(lon,184),n=point(lon+15,95);svg+='<path d="M'+a.join(' ')+'L'+b.join(' ')+'" stroke="#162625" stroke-opacity=".13"/><text x="'+n[0]+'" y="'+(n[1]+3)+'" text-anchor="middle" fill="#58635b" font-size="9">'+(index+1)+'</text>';});
      svg+='<path d="M16 240H53" stroke="#8a6034" stroke-width="2"/><text x="57" y="244" fill="#8a6034" font-size="11">ASC</text>';
    }
    const planets=PLANETS.filter(([key])=>input.timeKnown || (key!=='moon' && ranges[key].length===1)).map(([key,label,symbol])=>({key,label,symbol,lon:raw.positions[key].longitude})).sort((a,b)=>a.lon-b.lon);
    const placed=[];
    for(const planet of planets) {
      let lane=0;
      while(lane<4 && placed.some(p=>p.lane===lane && Math.min(Math.abs(p.lon-planet.lon),360-Math.abs(p.lon-planet.lon))<11)) lane++;
      placed.push({...planet,lane});const exact=point(planet.lon,181),label=point(planet.lon,165-lane*22);
      svg+='<line x1="'+exact[0]+'" y1="'+exact[1]+'" x2="'+label[0]+'" y2="'+label[1]+'" stroke="#8a6034" stroke-opacity=".5"/><circle cx="'+exact[0]+'" cy="'+exact[1]+'" r="2.4" fill="#8a6034"/><circle cx="'+label[0]+'" cy="'+label[1]+'" r="12" fill="#f4f1e9"/><text x="'+label[0]+'" y="'+(label[1]+6)+'" text-anchor="middle" fill="#162625" font-size="20"><title>'+planet.label+' in '+raw.positions[planet.key].sign+'</title>'+planet.symbol+'</text>';
    }
    svg+='<circle cx="240" cy="240" r="62" fill="#dce5d6"/><text x="240" y="229" text-anchor="middle" fill="#162625" font-size="25">✦</text><text x="240" y="254" text-anchor="middle" fill="#162625" font-size="9" letter-spacing="2">YOUR SKY</text></svg>';
    $('birth-wheel').innerHTML=svg;
  }
  function renderResult(result) {
    const {data,raw,input,ranges}=result;
    const sunRange=input.timeKnown?[raw.positions.sun.sign]:ranges.sun;
    const moonRange=input.timeKnown?[raw.positions.moon.sign]:ranges.moon;
    const sun=sunRange[0],moon=moonRange[0],rising=data.risingSign;
    $('result-meta').textContent=new Intl.DateTimeFormat('en-GB',{dateStyle:'long',timeZone:'UTC'}).format(new Date(input.date+'T12:00:00Z'))+' · '+(input.timeKnown?input.time+' local time':'Birth time unknown')+' · '+input.place.name;
    $('result-caveat').textContent=input.timeKnown?'Calculated using '+input.place.tz.replace(/_/g,' ')+'. Tropical zodiac · Whole Sign houses. These are symbolic themes to explore, not fixed facts about you.':'Your time is unknown, so rising and houses are left out. Planetary degrees are approximate noon positions. We checked sign changes across your local birth date; the Moon’s exact position is withheld.';
    if(data.timeAccuracy==='approximate')$('result-caveat').textContent='Your birth time is approximate. Rising, houses and Moon position are provisional at the entered time and may change. '+$('result-caveat').textContent;
    renderBirthMirror(data);
    const sunCopy=sunRange.length>1?'The Sun changed sign on your birth date. Your birth time is needed to choose between these signs.':'In astrology, a '+sun+' Sun brings attention to '+THEMES[sun].quality+'. Think of it as a lens on how you express yourself.';
    const moonCopy=moonRange.length>1?'The Moon changed sign during your birth date. Either sign is possible; we need your birth time to know which.':'A '+moon+' Moon is traditionally associated with a need for '+THEMES[moon].need+'. It offers a prompt to notice what helps you feel at ease.';
    $('big-three').innerHTML=placementCard('Sun · your expression','☉',sunRange.join(' or '),input.timeKnown?fmtDegree(raw.positions.sun.degree):sunRange.length===1?'Sign stays the same across this date':'Birth time needed',sunCopy)+placementCard('Moon · your inner world','☽',moonRange.join(' or '),input.timeKnown?fmtDegree(raw.positions.moon.degree):moonRange.length===1?'Sign stays the same across this date':'Birth time needed',moonCopy)+placementCard('Rising · your approach','↗',rising||'Time needed',rising?fmtDegree(raw.positions.asc.degree):'Left open, rather than guessed',rising?'With '+rising+' rising, astrology describes an approach that can be '+THEMES[rising].approach+'. See whether that matches how you meet unfamiliar situations.':'Your rising sign depends on the time and place of birth. Add a reliable birth time above to reveal it and the houses.');
    $('reading-summary').textContent=sunRange.length===1?(moonRange.length===1?'Your '+sun+' Sun highlights '+THEMES[sun].quality+', while your '+moon+' Moon turns attention to '+THEMES[moon].need+'. These themes may complement each other or pull in different directions.':'Start with your '+sun+' Sun: '+THEMES[sun].quality+'. Your Moon remains an open question until you have a birth time.'):'Your birth date falls across a Sun-sign change. Keep both possibilities open until you can add a birth time; the other planetary placements still offer themes to explore.';
    $('reflection-prompt').textContent=sunRange.length===1?THEMES[sun].prompt:'Which descriptions fit your lived experience — and which can you comfortably leave behind?';
    $('positions-note').textContent=input.timeKnown?'Positions are rounded down to the nearest arcminute. ℞ marks apparent retrograde motion.':'These are approximate local-noon positions, not confirmed birth-time degrees. Where a sign changes, both possibilities are listed. Moon degrees are withheld.';
    $('planet-rows').innerHTML=PLANETS.map(([key,label,symbol,theme])=>{const p=raw.positions[key],signs=input.timeKnown?[p.sign]:ranges[key],degree=!input.timeKnown&&(key==='moon'||signs.length>1)?'Time needed':(input.timeKnown?'':'≈ ')+fmtDegree(p.degree);return '<tr><td><span class="planet-symbol" aria-hidden="true">'+symbol+'</span>'+label+'</td><td>'+signs.map(esc).join(' / ')+'</td><td>'+degree+(input.timeKnown&&p.retrograde?' ℞':'')+'</td><td>'+esc(theme)+'</td></tr>';}).join('');
    renderWheel(result);$('chart-builder').hidden=true;document.querySelector('.chart-intro').hidden=true;$('chart-result').hidden=false;$('save-status').textContent='';$('save-chart').disabled=false;$('save-chart').textContent='Save on this device';
    $('chart-name').value=data.name==='My birth chart'?'':data.name;
    $('result-title').focus({preventScroll:true});$('chart-result').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }
  function showError(message,field) { $('form-error').textContent=message;$('form-error').hidden=false;if(field){$(field).setAttribute('aria-invalid','true');$(field).focus();} }
  function submit(event) {
    if(event)event.preventDefault();$('form-error').hidden=true;
    ['birth-date','birth-time','birth-place','birth-fold'].forEach(id=>$(id).removeAttribute('aria-invalid'));
    const date=$('birth-date').value,time=$('birth-time').value,timeKnown=!$('time-unknown').checked&&!!time;
    if(!date || !$('birth-date').validity.valid) {showError('Enter a valid birth date between 1900 and today.','birth-date');return;}
    if(!chosenPlace) {showError('Choose your birth place from the matching places.','birth-place');return;}
    $('calculate-chart').disabled=true;
    try {
      const result=calculate({date,time,timeKnown,timeAccuracy:timeKnown&&$('time-approximate').checked?'approximate':timeKnown?'exact':'unknown',place:{...chosenPlace},fold:$('birth-fold').value});
      currentResult=result;savedId=null;renderResult(result);
      window.dispatchEvent(new CustomEvent('ap:chart-ready',{detail:{chart:result.data}}));
    }catch(error){if(error.fold){$('fold-field').hidden=false;showError(error.message,'birth-fold');}else showError(error.message);}
    finally{$('calculate-chart').disabled=false;}
  }
  function loadProfile() {
    if(window.AstroProfile)return Promise.resolve(window.AstroProfile);
    return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='js/profile.js?v=915';script.onload=()=>window.AstroProfile?resolve(window.AstroProfile):reject(new Error('Storage is unavailable'));script.onerror=()=>{script.remove();reject(new Error('Storage could not load'));};document.head.append(script);});
  }
  async function saveChart() {
    if(!currentResult)return;
    const button=$('save-chart');button.disabled=true;$('save-status').textContent='Saving on this device…';
    try {
      // A malformed legacy library must never be silently replaced.
      const stored=localStorage.getItem('ap_charts');if(stored && !Array.isArray(JSON.parse(stored)))throw new Error('Existing library needs recovery');
      const profile=await loadProfile();
      const data={...currentResult.data,name:$('chart-name').value.trim()||'My birth chart'};
      if(savedId)data.id=savedId;
      const saved=profile.saveChart(data);
      if(!profile.getChart(saved.id))throw new Error('Save could not be verified');
      savedId=saved.id;currentResult.data=saved;
      try{localStorage.setItem('ap_active_chart',String(saved.id));}catch(_){}
      $('save-status').textContent='Saved in this browser. You can find it in Saved charts.';button.textContent='Save changes';
    }catch(error){$('save-status').textContent='This browser couldn’t save your chart. Download the reading to keep a copy.';}
    finally{button.disabled=false;}
  }
  function downloadReading() {
    if(!currentResult)return;
    const {input,raw,ranges}=currentResult;
    const lines=[$('chart-name').value.trim()||'My birth chart','AstroPrecise','',$('result-meta').textContent,$('result-caveat').textContent,''];
    document.querySelectorAll('.chart-placement').forEach(card=>lines.push(card.innerText.trim(),''));
    lines.push('Reflection',$('reading-summary').textContent,$('reflection-prompt').textContent,'','Planetary placements');
    PLANETS.forEach(([key,label])=>{const p=raw.positions[key],signs=input.timeKnown?[p.sign]:ranges[key];lines.push(label+': '+signs.join(' or ')+(input.timeKnown||key!=='moon'&&signs.length===1?' · '+(input.timeKnown?'':'approximately ')+fmtDegree(p.degree):' · birth time needed'));});
    lines.push('','Tropical zodiac · Whole Sign houses · Built-in approximate astronomical engine.','Astrology is symbolic reflection, not a scientific personality assessment or prediction.','This file contains personal birth details. Keep it somewhere you trust.');
    const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='astroprecise-birth-reading.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('save-status').textContent='Your reading is ready to download. Keep the file somewhere you trust.';
  }
  function restoreSaved() {
    let handoff=null;
    const id=new URLSearchParams(location.search).get('id');
    try { handoff=sessionStorage.getItem('ap-next-chart-open');if(handoff)sessionStorage.removeItem('ap-next-chart-open'); } catch (_) { /* Optional handoff; the calculator still works without storage. */ }
    if(!handoff&&!id)return;
    try {
      let row=handoff?JSON.parse(handoff):null;
      if(!row&&id){const library=JSON.parse(localStorage.getItem('ap_charts')||'[]');row=Array.isArray(library)?library.find(chart=>String(chart.id)===id):null;}
      if(!row){showError('This saved chart wasn’t found in this browser. You can create a new chart below.');return;}
      const place={name:row.birthCity||row.city||'Saved birthplace',lat:Number(row.lat),lon:Number(row.lon),tz:row.tz};
      if(!validPlace(place))throw new Error('Your saved chart needs its birthplace selected again.');
      $('birth-date').value=row.birthDate||row.date||'';$('birth-time').value=row.birthTime||row.time||'';$('time-unknown').checked=row.timeKnown===false||!$('birth-time').value;$('birth-time').disabled=$('time-unknown').checked;pickPlace(place);
      $('time-approximate').checked=row.timeAccuracy==='approximate';$('time-approximate').disabled=$('time-unknown').checked;
      const savedMethod=String(row.houseSystem||'unspecified').toLowerCase().replace(/[\s_-]/g,'');
      if(!['whole','wholesign'].includes(savedMethod)||row.nodeMode!=='true'){
        savedId=null;showError('This saved chart uses '+(row.houseSystem||'an unspecified house method')+' houses and '+(row.nodeMode||'an unspecified')+' node calculation. This calculator uses Whole Sign houses and the true node. “Create my birth chart” recalculates as a new chart and keeps the original saved chart.');return;
      }
      const result=calculate({date:$('birth-date').value,time:$('birth-time').value,timeKnown:!$('time-unknown').checked,timeAccuracy:row.timeAccuracy||'exact',place,fold:row.timeFold||''});
      result.data.name=row.name||'My birth chart';result.data.id=row.id;currentResult=result;savedId=row.id;renderResult(result);$('save-chart').textContent='Save changes';
    }catch(error){if(error.fold){$('fold-field').hidden=false;showError(error.message,'birth-fold');}else showError(error.message||'We couldn’t open this chart. Re-enter the birth details to create it again.');}
  }
  // Do not depend on locale-specific date formatting for the native input bound.
  const now=new Date();$('birth-date').max=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  $('birth-chart-form').addEventListener('submit',submit);
  $('birth-place').addEventListener('input',offlineSearch);
  $('search-world').addEventListener('click',onlineSearch);
  $('birth-date').addEventListener('input',resetFold);$('birth-time').addEventListener('input',resetFold);
  $('time-unknown').addEventListener('change',()=>{$('birth-time').disabled=$('time-unknown').checked;$('time-approximate').disabled=$('time-unknown').checked;resetFold();});
  $('edit-chart').addEventListener('click',()=>{$('chart-builder').hidden=false;document.querySelector('.chart-intro').hidden=false;$('chart-result').hidden=true;$('birth-date').focus({preventScroll:true});$('chart-builder').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});});
  $('save-chart').addEventListener('click',saveChart);$('download-chart').addEventListener('click',downloadReading);
  $('read-my-sky').addEventListener('click',()=>{
    if(!currentResult)return;
    try{sessionStorage.setItem('ap-next-reading',JSON.stringify(currentResult.data));location.href='deep-reading.html';}
    catch(_){$('reading-handoff-status').textContent='This browser is blocking the handoff. Save this chart on your device first, then open the story from the link below.';const link=document.createElement('a');link.href='deep-reading.html';link.textContent='Open my sky story →';$('reading-handoff-status').append(document.createElement('br'),link);}
  });
  $('birth-chart-form').addEventListener('submit',()=>{$('result-title').textContent='Your birth chart';});
  window.APChartNext={getResult:()=>currentResult?JSON.parse(JSON.stringify(currentResult.data)):null,calculate,civilCandidates};
  restoreSaved();
})();
