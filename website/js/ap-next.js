(function(){
  'use strict';
  const script=document.currentScript;
  const base=new URL('../',script?script.src:location.href);
  const url=p=>new URL(p,base).href;
  const here=location.pathname.split('/').pop()||'index.html';
  const rows=[['index.html','Today','<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>'],['chart.html','Birth chart','<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m12 3 3 12-11-3 14-5-6 14"/>'],['explore.html','Explore','<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>'],['charts.html','Saved','<path d="M6 3h12v18l-6-4-6 4Z"/>']];
  // Which section is current: one of the four tabs, the Studio (shop), or none for
  // information pages (legal, contact, method) so they don't claim to be Explore.
  const STUDIO_PAGES=['shop.html'];
  const INFO_PAGES=['privacy.html','terms.html','refunds.html','contact.html','digital-product-terms.html','accuracy.html','why.html','404.html','offline.html'];
  const primary=rows.some(r=>r[0]===here)?here:(['profile.html','sky-card.html'].includes(here)?'charts.html':here==='deep-reading.html'?'chart.html':STUDIO_PAGES.includes(here)||INFO_PAGES.includes(here)?'':'explore.html');
  const studioCurrent=STUDIO_PAGES.includes(here);
  function links(mobile){return rows.map(r=>'<a href="'+url(r[0])+'"'+(r[0]===primary?' aria-current="page"':'')+'>'+(mobile?'<svg viewBox="0 0 24 24" aria-hidden="true">'+r[2]+'</svg>':'')+'<span>'+r[1]+'</span></a>').join('');}
  // Observatory: the instrument fills the screen under the shared header and
  // crumb (it used to sit under a retired fixed bar). Measure the real chrome
  // so the model, phone selectors and time rail stay above the fold and above
  // the phone tab bar at any size.
  function fitObservatory(header){
    const root=document.documentElement;
    const crumb=document.querySelector('.tool-crumb');
    const tabs=document.querySelector('.ap-next-tabs');
    const flowH=el=>{if(!el)return 0;const cs=getComputedStyle(el);return cs.display==='none'||cs.position==='absolute'||cs.position==='fixed'?0:el.offsetHeight;};
    let queued=false;
    function measure(){
      queued=false;
      root.style.setProperty('--ap-shell-top',((header?header.offsetHeight:0)+(crumb?crumb.offsetHeight:0))+'px');
      root.style.setProperty('--ap-next-tabs-h',(tabs&&getComputedStyle(tabs).display!=='none'?tabs.offsetHeight:0)+'px');
      root.style.setProperty('--ap-obs-intro-h',flowH(document.querySelector('.ap-live-intro'))+'px');
      root.style.setProperty('--ap-obs-deck-h',flowH(document.querySelector('.ap-mobile-flight-deck'))+'px');
    }
    function queue(){if(!queued){queued=true;requestAnimationFrame(measure);}}
    measure();
    addEventListener('resize',queue);
    if('ResizeObserver'in window){const ro=new ResizeObserver(queue);[header,crumb,tabs,document.querySelector('.ap-live-intro'),document.querySelector('.ap-mobile-flight-deck')].forEach(el=>{if(el)ro.observe(el);});}
    new MutationObserver(queue).observe(document.body,{attributes:true,attributeFilter:['class']});
  }
  function boot(){
    if(document.getElementById('ap-next-header'))return;
    const fresh=document.body.classList.contains('ap-next')||document.body.classList.contains('ap-editorial');
    if(!fresh)document.body.classList.add('ap-legacy');
    if(here==='observatory.html')document.body.classList.add('ap-observatory');
    document.documentElement.classList.add('ap-next-shell');
    if(!document.querySelector('link[href*="ap-next.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href=url('css/ap-next.css?v=934');document.head.append(l);}
    const logo='<a class="ap-next-logo" href="'+url('index.html')+'" aria-label="AstroPrecise home"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 11A21 21 0 0 1 32 53Z" fill="currentColor"/><circle cx="32" cy="32" r="21" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M41.45 18.92C42.11 24.25 43.32 25.46 48.65 26.12 43.32 26.78 42.11 27.99 41.45 33.32 40.79 27.99 39.58 26.78 34.25 26.12 39.58 25.46 40.79 24.25 41.45 18.92Z" fill="#B4693E"/><path d="M32 4.5V9" stroke="#B4693E" stroke-width="3" stroke-linecap="round"/></svg>AstroPrecise</a>';
    const header=document.createElement('header');header.id='ap-next-header';header.className='ap-next-header';header.innerHTML='<div class="nav-inner">'+logo+'<nav class="ap-next-desktop" aria-label="Primary">'+links(false)+'</nav><a class="ap-next-studio" href="'+url('shop.html')+'"'+(studioCurrent?' aria-current="page"':'')+'>The Studio ↗</a></div>';
    const navPlaceholder=document.querySelector('[data-ap-next-nav]');if(navPlaceholder)navPlaceholder.replaceWith(header);else document.body.prepend(header);
    const main=document.querySelector('main');if(main){if(!main.id)main.id='main-content';
    // Add a skip link only when the page doesn't already have one pointing at main.
    if(!document.querySelector('a[href="#'+main.id+'"]')){const skip=document.createElement('a');skip.href='#'+main.id;skip.className='ap-skip';skip.textContent='Skip to content';document.body.prepend(skip);}}
    if(!fresh){const crumb=document.createElement('div');crumb.className='tool-crumb';const a=document.createElement('a');a.href=url('explore.html');a.textContent='← Explore';crumb.append(a);header.after(crumb);}
    const tabs=document.createElement('nav');tabs.className='ap-next-tabs';tabs.setAttribute('aria-label','Primary mobile navigation');tabs.innerHTML=links(true);document.body.append(tabs);
    const footer=document.createElement('footer');footer.className='ap-next-footer';footer.innerHTML='<div class="wrap"><div class="footer-top"><div>'+logo+'<p>A little more perspective.<br>Astronomy you can explore. Astrology you can reflect on.</p></div><nav aria-label="Information">'+[['guides.html','Start learning'],['accuracy.html','Our calculations'],['observatory.html','3D observatory'],['privacy.html','Privacy'],['terms.html','Terms'],['refunds.html','Refunds'],['contact.html','Contact']].map(r=>'<a href="'+url(r[0])+'">'+r[1]+'</a>').join('')+'</nav></div><p class="footer-disclaimer">Astrology on AstroPrecise is symbolic and offered for reflection and entertainment. The planetary positions are calculated carefully; the meanings are interpretation, not prediction or advice. Nothing here is medical, financial, legal or psychological advice.</p><div class="footer-bottom"><span>© '+new Date().getFullYear()+' AstroPrecise · Made for the curious.</span><span>Birth calculations stay on your device. No account needed.</span></div></div>';
    const footerPlaceholder=document.querySelector('[data-ap-next-footer]');if(footerPlaceholder)footerPlaceholder.replaceWith(footer);else document.body.append(footer);
    window.APNext={base:url(''),escape:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
    if(here==='observatory.html')fitObservatory(header);
    document.dispatchEvent(new Event('ap-next-ready'));
    if(fresh&&'serviceWorker'in navigator&&!new URLSearchParams(location.search).has('nosw')){
      navigator.serviceWorker.register(url('sw.js')).then(reg=>{
        function offer(){if(!reg.waiting||!navigator.serviceWorker.controller||document.querySelector('.ap-update'))return;try{if(sessionStorage.getItem('ap-update-later'))return;}catch(e){}const note=document.createElement('div');note.className='ap-update';note.setAttribute('role','status');note.append(document.createTextNode('An updated AstroPrecise is ready. Finish any unsaved changes first. '));const btn=document.createElement('button');btn.className='button-secondary';btn.textContent='Update now';btn.onclick=()=>{navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});reg.waiting.postMessage({type:'SKIP_WAITING'});};const later=document.createElement('button');later.className='button-secondary';later.textContent='Later';later.onclick=()=>{try{sessionStorage.setItem('ap-update-later','1');}catch(e){}note.remove();};note.append(btn,later);document.body.append(note);}
        offer();reg.addEventListener('updatefound',()=>{const installing=reg.installing;if(installing)installing.addEventListener('statechange',offer);});
      }).catch(()=>{});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
