import { buildDeepReading, chartBalance } from './deep-reading.js?v=913';

const $=id=>document.getElementById(id);
const BODIES=['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
const TITLES=['The moment you began','Your three starting points','The shape of your chart','The patterns between planets','The longer story','Your chart, under today’s sky','A note to your future self'];
const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cap=value=>value.charAt(0).toUpperCase()+value.slice(1);
let chart=null,reading=null;

function natalMirrorBeat(row){
  if(row.timeKnown!==true||row.timeAccuracy!=='exact'||!window.APMirrorHour)return null;
  const match=window.APMirrorHour.detectFromClock(row.birthTime);
  if(!match)return null;
  const beat=window.APMirrorHour.sittingBeat(match,{source:'natal'});
  return {...beat,serif:match.folk+' '+beat.honesty};
}

function readChart(){
  try{const raw=sessionStorage.getItem('ap-next-reading');if(raw){const value=JSON.parse(raw);if(value&&value.positions)return value;}}catch(_){}
  try{const saved=JSON.parse(localStorage.getItem('ap_charts')||'[]');if(!Array.isArray(saved)||!saved.length)return null;const active=localStorage.getItem('ap_active_chart');return saved.find(c=>String(c.id)===active)||saved[0];}catch(_){return null;}
}
function longitude(positions,key){const p=positions[key]??positions[cap(key)];if(p==null)return null;const value=typeof p==='number'?p:(p.lon??p.longitude);return Number.isFinite(value)?value:null;}
function natalFromChart(row){
  const natal={},ranges=row.uncertainty?.signRanges||{};
  BODIES.forEach(key=>{if(!row.timeKnown&&(key==='moon'||ranges[key]?.length>1))return;const lon=longitude(row.positions||{},key);if(lon!==null)natal[key]=lon;});
  if(row.timeKnown){const asc=row.ascendant??row.asc??longitude(row.positions||{},'Ascendant'),mc=row.mc??row.midheaven??longitude(row.positions||{},'Midheaven');if(Number.isFinite(asc))natal.asc=asc;if(Number.isFinite(mc))natal.mc=mc;}
  return natal;
}
function currentTransits(){const now=new Date(),e=window.AstroEphemeris;if(!e)return null;const jd=e.julianDay(now.getUTCFullYear(),now.getUTCMonth()+1,now.getUTCDate(),now.getUTCHours(),now.getUTCMinutes()),all=e.allPlanetPositions(jd),result={};BODIES.forEach(key=>{const p=all[cap(key)];const lon=typeof p==='number'?p:p?.lon??p?.longitude;if(Number.isFinite(lon))result[key]=lon;});return {positions:result,date:now.toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})};}
function adaptUnknown(result,row,base,deep,natal){
  // The legacy library assumes both lights have precise longitudes. Replace
  // those passages when the chart deliberately withholds a position.
  const ranges=row.uncertainty?.signRanges||{};
  const sun=ranges.sun?.join(' or ')||row.sunSign||'not confirmed';
  const moon=ranges.moon?.join(' or ')||row.moonSign||'not confirmed';
  const noSun=!Number.isFinite(natal.sun),noMoon=!Number.isFinite(natal.moon);
  result.chapters[0].serif=['The numbers behind this reading come from your chart. The language draws on astrological traditions. Those traditions can offer a way to reflect; they do not measure your character or decide what happens next.'];
  if(!row.timeKnown){
    result.chapters[0].lead=noSun?'Your birth date crosses a Sun-sign boundary. We keep that uncertainty visible and begin with the placements the date can support.':result.chapters[0].lead;
    result.chapters[0].mono=result.chapters[0].mono.map(line=>/^(Sun|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto) —/.test(line)?line+' · approximate noon position':line);
    const sunLine=noSun?'Your Sun may be '+sun+'. A birth time is needed before choosing a single sign.':deep.chapters.ch2.sun.replace('{theme}',sun+': '+deep.signThemes[sun]);
    const moonLine=moon==='not confirmed'?'Your Moon sign remains open because this chart does not contain a confirmed Moon position.':ranges.moon?.length>1?'Your Moon may be '+moon+'. It changed sign during your birth date, so we leave both possibilities open.':ranges.moon?.length===1?'Your Moon stays in '+moon+' across the checked birth date. In the traditional language of this sign, emotional needs can relate to '+(deep.signThemes[moon]||'its symbolic themes')+'. Its exact degree is withheld.':'Your saved chart lists a Moon in '+moon+' at its reference time. Without a day-range check, we cannot confirm that sign for your birth hour. Its exact degree is withheld.';
    result.chapters[1]={n:2,title:TITLES[1],lead:sunLine,serif:[moonLine,'Your rising sign and houses wait for a reliable birth time. They are omitted from this reading.'],mono:[],textbook:[]};
    if(noSun)result.chapters[6].serif=['This chart is a moment to reflect on, not an instruction to follow. My Sun may be '+sun+', and I can leave that question open. I can notice patterns without turning them into limits. When a description helps, I can use it. When it does not, I can set it down. My next choice still belongs to me.'];
  }
  const balance=chartBalance(natal),maximum=Math.max(...Object.values(balance.el)),leaders=Object.keys(balance.el).filter(k=>balance.el[k]===maximum);
  result.chapters[2].lead=leaders.length>1?'Your chart gives equal weight to '+leaders.join(' and ')+'.':'Your chart places the most planets in '+leaders[0]+' signs.';
  if(leaders.length>1)result.chapters[2].serif[0]=leaders.map(key=>cap(key)+': '+deep.elements[key]).join(' ');
  result.chapters[2].serif.push('These counts describe the selected placements, not a personality score. '+(!row.timeKnown?'They exclude the Moon and any placement whose sign is uncertain.':''));
  if(noMoon)result.chapters[0].mono=result.chapters[0].mono.filter(line=>!/^Moon —/.test(line));
  result.chapters[5].lead=result.chapters[5].mono.length?'These are the planetary contacts calculated when you opened this reading. In astrology they offer themes to reflect on, without telling you what your day will bring.':'Today’s planetary positions are unavailable in this reading. The other chapters still reflect your birth chart; no current contact is being guessed.';
  const mirrorBeat=natalMirrorBeat(row);
  if(mirrorBeat){result.chapters[0].serif.push(mirrorBeat.title+'. '+mirrorBeat.serif);result.chapters[0].mono.push(mirrorBeat.mono);}
  return result;
}
function render(result){
  $('story-signature').textContent=[chart.sunSign?'Sun in '+chart.sunSign:'',chart.moonSign?'Moon in '+chart.moonSign:'',chart.timeKnown&&chart.risingSign?chart.risingSign+' rising':''].filter(Boolean).join(' · ');
  const method=({whole:'Whole Sign',equal:'Equal',placidus:'Placidus'})[chart.houseSystem]||chart.houseSystem||'Recorded';
  $('story-precision').textContent=(chart.birthDate||chart.date||'')+' · '+(chart.birthCity||chart.city||'Your birthplace')+' · '+(chart.timeKnown?(chart.timeAccuracy==='approximate'?'Approximate birth time ':'Birth time ')+chart.birthTime+' · '+method+' houses'+(chart.timeAccuracy==='approximate'?' · rising and houses provisional':''):'Birth time unknown · rising and houses omitted; date-based positions approximate');
  $('story-chapters').innerHTML=result.chapters.map((ch,index)=>{
    const paragraphs=[ch.lead,...ch.serif].filter(line=>line&&typeof line==='string'&&!/undefined|NaN|\{\w+\}/.test(line));
    return '<details class="story-chapter" id="story-chapter-'+(index+1)+'"'+(index===0?' open':'')+'><summary><span class="story-chapter-number">0'+(index+1)+'</span><h2>'+TITLES[index]+'</h2><span class="story-expand" aria-hidden="true">+</span></summary><div class="story-chapter-body">'+paragraphs.map((p,i)=>'<p'+(i===0&&ch.lead?' class="story-lead"':'')+'>'+esc(p)+'</p>').join('')+(ch.mono.length?'<details class="story-receipts"><summary>See the placements behind this chapter</summary><ul>'+ch.mono.filter(line=>!/undefined|NaN/.test(line)).map(line=>'<li>'+esc(line)+'</li>').join('')+'</ul></details>':'')+(index<6?'<button class="story-continue" type="button" data-next-chapter="'+(index+2)+'">Continue: '+TITLES[index+1]+' <span aria-hidden="true">→</span></button>':'')+'</div></details>';
  }).join('');
  document.querySelectorAll('[data-next-chapter]').forEach(button=>button.addEventListener('click',()=>{const next=$('story-chapter-'+button.dataset.nextChapter);next.open=true;next.querySelector('summary').focus({preventScroll:true});next.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}));
  $('story-content').hidden=false;$('story-status').textContent='';
}
function empty(message){$('story-status').textContent='';$('story-empty').hidden=false;if(message)$('story-empty-copy').textContent=message;}
async function start(){
  chart=readChart();if(!chart){empty('Your chart hasn’t arrived in this browser yet. Start with your birth details and the story will follow.');return;}
  const natal=natalFromChart(chart);if(Object.keys(natal).length<5){empty('This saved chart needs its planetary positions refreshed. Create the chart again to open your story.');return;}
  $('story-status').textContent='Turning your placements into a story…';
  try{
    const [base,deep]=await Promise.all(['reading-templates','deep-templates'].map(async name=>{const response=await fetch('js/'+name+'.json?v=913',{credentials:'same-origin'});if(!response.ok)throw new Error('Template unavailable');return response.json();}));
    const now=currentTransits();
    reading=buildDeepReading(natal,base,deep,{birth:{dateText:chart.birthDate||chart.date,timeText:chart.timeKnown?chart.birthTime:'',place:chart.birthCity||chart.city,zone:chart.tz},timeAccuracy:chart.timeAccuracy||(chart.timeKnown?'exact':'unknown'),houseSystem:chart.houseSystem||'whole',houseCusps:chart.timeKnown?chart.houses:null,transits:now?.positions,transitDateText:now?.date});
    adaptUnknown(reading,chart,base,deep,natal);render(reading);
  }catch(error){empty('The reading language couldn’t load. Your chart is still on this device. Return to your chart and try “Read my sky story” again.');}
}
$('keep-my-sky').addEventListener('click',()=>{
  try{sessionStorage.setItem('ap-next-sky',JSON.stringify(chart));sessionStorage.setItem('ap-sky-card-handoff',JSON.stringify({date:chart.birthDate,time:chart.timeKnown?chart.birthTime:'',zone:chart.tz,city:chart.birthCity||chart.city,lat:chart.lat,lon:chart.lon,timeKnown:chart.timeKnown}));location.href='sky-card.html';}
  catch(_){$('story-keep-status').textContent='This browser is blocking the handoff. Download your reading below to keep it. Your saved chart, if you saved one, is still in Saved charts.';}
});
$('story-download').addEventListener('click',()=>{if(!reading)return;const lines=['Your sky story · AstroPrecise',$('story-precision').textContent,'','Symbolic reflection, not a scientific personality assessment or prediction.',''];reading.chapters.forEach((ch,i)=>{lines.push(TITLES[i],...[ch.lead,...ch.serif,...ch.mono].filter(line=>typeof line==='string'&&line&&!/undefined|NaN|\{\w+\}/.test(line)),'');});const url=URL.createObjectURL(new Blob([lines.join('\n\n')],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='astroprecise-sky-story.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
start();
