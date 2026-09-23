(function(){'use strict';
function boot(){const E=window.AstroEphemeris,root=document.getElementById('sky-instrument');if(!E||!root)return;
const now=new Date(),sample=new Date('2000-01-01T12:00:00Z');
const fmt=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
const symbols=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const bodies=[['Sun','☉','#e6c681'],['Moon','☽','#e8ecdc'],['Mercury','☿','#b4c8b9'],['Venus','♀','#d5b89a'],['Mars','♂','#d79479'],['Jupiter','♃','#bdcbb0'],['Saturn','♄','#c6ba82']];
let staticSvg='<svg viewBox="0 0 360 360" aria-hidden="true"><defs><radialGradient id="sky-heart"><stop stop-color="#708169" stop-opacity=".25"/><stop offset="1" stop-color="#122b2c" stop-opacity="0"/></radialGradient></defs><circle cx="180" cy="180" r="155" fill="url(#sky-heart)" stroke="#adc099" stroke-opacity=".22"/><circle cx="180" cy="180" r="140" fill="none" stroke="#cbbf8b" stroke-opacity=".3"/><circle cx="180" cy="180" r="109" fill="none" stroke="#adc099" stroke-opacity=".3"/><circle cx="180" cy="180" r="73" fill="none" stroke="#adc099" stroke-opacity=".16" stroke-dasharray="2 5"/>';
for(let i=0;i<72;i++){const a=i*5*Math.PI/180;const r=i%6===0?125:135;staticSvg+='<path d="M '+(180+140*Math.cos(a))+' '+(180+140*Math.sin(a))+' L '+(180+r*Math.cos(a))+' '+(180+r*Math.sin(a))+'" stroke="#c1c99c" stroke-opacity="'+(i%6===0?.5:.2)+'" stroke-width=".8"/>';}
symbols.forEach((s,i)=>{const a=(i*30+15)*Math.PI/180;staticSvg+='<text x="'+(180+151*Math.cos(a))+'" y="'+(180+151*Math.sin(a)+3)+'" fill="#b2c29b" font-size="10" text-anchor="middle">'+s+'\uFE0E</text>';});
staticSvg+='<circle cx="180" cy="180" r="43" fill="#e0d5a4" opacity=".06"/><circle cx="180" cy="180" r="31" fill="#b7c39b" opacity=".07"/><path d="m180 156 4 20 20 4-20 4-4 20-4-20-20-4 20-4Z" fill="#d9c697" opacity=".82"/>';
bodies.forEach(([name,glyph,color],i)=>{staticSvg+='<g class="body-point" id="intro-'+name+'"><circle r="'+(name==='Sun'?9:7)+'" fill="'+color+'" stroke="#122c2b" stroke-width="2"/><text y="-13" fill="'+color+'" font-size="11" text-anchor="middle">'+glyph+'</text></g>';});
staticSvg+='</svg>';root.innerHTML=staticSvg;
let stage=0,timer=null,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
const set=(id,t)=>{document.getElementById(id).textContent=t;};
function draw(n){stage=n;const date=n===0?now:sample;const positions=E.allPlanetPositions(date.getTime()/86400000+2440587.5);
bodies.forEach(([name],i)=>{const p=positions[name],a=(p.lon-90)*Math.PI/180,r=94-(i%3)*15;document.getElementById('intro-'+name).style.transform='translate('+(180+r*Math.cos(a))+'px,'+(180+r*Math.sin(a))+'px)';});
const moonSign=E.signOf(positions.Moon.lon),sunSign=E.signOf(positions.Sun.lon);
set('demo-mode',n===0?'The sky right now':'Example · 1 Jan 2000 · 12:00 UTC');
set('demo-kicker',['01 / A living sky','02 / Turn back the sky','03 / Now imagine your moment'][n]);
set('demo-title',['This moment. Already extraordinary.','One birth moment. A whole new picture.','Your Sun. Your Moon. Your story.'][n]);
set('demo-detail',n===0?'Moon in '+moonSign+' · '+fmt.format(now)+' UTC':n===1?'Watch the planets return to our example date.':'Example: Sun in '+sunSign+' · Moon in '+moonSign);
document.querySelectorAll('.showcase-progress span').forEach((el,i)=>el.classList.toggle('active',i===n));
root.setAttribute('aria-label',n===0?'Calculated zodiac positions for the current sky':'Example zodiac positions for 1 January 2000 at 12:00 UTC');
if(!paused&&n<2)timer=setTimeout(()=>draw(n+1),n===0?4300:4500);else if(n===2){set('demo-pause','Replay ↺');document.getElementById('demo-pause').setAttribute('aria-label','Replay sky demonstration');}
}
const pause=document.getElementById('demo-pause');if(paused){pause.textContent='Play ▷';pause.setAttribute('aria-label','Play sky demonstration');}
pause.addEventListener('click',()=>{if(stage===2){clearTimeout(timer);paused=false;pause.textContent='Pause Ⅱ';pause.setAttribute('aria-label','Pause sky demonstration');draw(0);return;}paused=!paused;clearTimeout(timer);pause.textContent=paused?'Play ▷':'Pause Ⅱ';pause.setAttribute('aria-label',paused?'Play sky demonstration':'Pause sky demonstration');if(!paused)timer=setTimeout(()=>draw(stage+1),3000);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);paused=true;if(stage<2){pause.textContent='Play ▷';pause.setAttribute('aria-label','Play sky demonstration');}}});
try{draw(0);}catch{set('demo-title','A sky waiting to be discovered.');set('demo-detail','Continue to calculate your own birth chart.');pause.hidden=true;}
}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();})();
