(function(){
  'use strict';
  const script=document.currentScript;
  const base=new URL('../',script?script.src:location.href);
  const url=p=>new URL(p,base).href;
  const here=location.pathname.split('/').pop()||'index.html';
  const rows=[['index.html','Today','<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>'],['chart.html','Birth chart','<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m12 3 3 12-11-3 14-5-6 14"/>'],['explore.html','Explore','<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>'],['charts.html','Saved','<path d="M6 3h12v18l-6-4-6 4Z"/>']];
  const primary=rows.some(r=>r[0]===here)?here:(['profile.html','sky-card.html'].includes(here)?'charts.html':here==='deep-reading.html'?'chart.html':'explore.html');
  function links(mobile){return rows.map(r=>'<a href="'+url(r[0])+'"'+(r[0]===primary?' aria-current="page"':'')+'>'+(mobile?'<svg viewBox="0 0 24 24" aria-hidden="true">'+r[2]+'</svg>':'')+'<span>'+r[1]+'</span></a>').join('');}
  function boot(){
    if(document.getElementById('ap-next-header'))return;
    const fresh=document.body.classList.contains('ap-next');
    if(!fresh)document.body.classList.add('ap-legacy');
    if(here==='observatory.html')document.body.classList.add('ap-observatory');
    document.documentElement.classList.add('ap-next-shell');
    if(!document.querySelector('link[href*="ap-next.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href=url('css/ap-next.css?v=915');document.head.append(l);}
    const logo='<a class="ap-next-logo" href="'+url('index.html')+'" aria-label="AstroPrecise home"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width=".8" aria-hidden="true"><circle cx="16" cy="16" r="13"/><circle cx="16" cy="16" r="8"/><path d="M16 0v32M0 16h32M5 5l22 22M5 27 27 5"/><path d="m16 8 2.2 5.8L24 16l-5.8 2.2L16 24l-2.2-5.8L8 16l5.8-2.2Z" fill="currentColor"/></svg>AstroPrecise</a>';
    const header=document.createElement('header');header.id='ap-next-header';header.className='ap-next-header';header.innerHTML='<div class="nav-inner">'+logo+'<nav class="ap-next-desktop" aria-label="Primary">'+links(false)+'</nav><a class="ap-next-studio" href="'+url('shop.html')+'">The Studio ↗</a></div>';
    const navPlaceholder=document.querySelector('[data-ap-next-nav]');if(navPlaceholder)navPlaceholder.replaceWith(header);else document.body.prepend(header);
    const main=document.querySelector('main');if(main){if(!main.id)main.id='main-content';const skip=document.createElement('a');skip.href='#'+main.id;skip.className='ap-skip';skip.textContent='Skip to content';document.body.prepend(skip);}
    if(!fresh){const crumb=document.createElement('div');crumb.className='tool-crumb';const a=document.createElement('a');a.href=url('explore.html');a.textContent='← All tools & guides';crumb.append(a);header.after(crumb);}
    const tabs=document.createElement('nav');tabs.className='ap-next-tabs';tabs.setAttribute('aria-label','Primary mobile navigation');tabs.innerHTML=links(true);document.body.append(tabs);
    const footer=document.createElement('footer');footer.className='ap-next-footer';footer.innerHTML='<div class="wrap"><div class="footer-top"><div>'+logo+'<p>A little more perspective.<br>Astronomy you can explore. Astrology you can reflect on.</p></div><nav aria-label="Information">'+[['guides.html','Start learning'],['accuracy.html','Our calculations'],['observatory.html','3D observatory'],['privacy.html','Privacy'],['terms.html','Terms'],['refunds.html','Refunds'],['contact.html','Contact']].map(r=>'<a href="'+url(r[0])+'">'+r[1]+'</a>').join('')+'</nav></div><div class="footer-bottom"><span>© '+new Date().getFullYear()+' AstroPrecise · Made for the curious.</span><span>Birth calculations stay on your device. No account needed.</span></div></div>';
    const footerPlaceholder=document.querySelector('[data-ap-next-footer]');if(footerPlaceholder)footerPlaceholder.replaceWith(footer);else document.body.append(footer);
    window.APNext={base:url(''),escape:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
    document.dispatchEvent(new Event('ap-next-ready'));
    if(fresh&&'serviceWorker'in navigator&&!new URLSearchParams(location.search).has('nosw')){
      navigator.serviceWorker.register(url('sw.js')).then(reg=>{
        function offer(){if(!reg.waiting||!navigator.serviceWorker.controller||document.querySelector('.ap-update'))return;const note=document.createElement('div');note.className='ap-update';note.setAttribute('role','status');note.append(document.createTextNode('An updated AstroPrecise is ready. Finish any unsaved changes first. '));const btn=document.createElement('button');btn.className='button-secondary';btn.textContent='Update now';btn.onclick=()=>{navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});reg.waiting.postMessage({type:'SKIP_WAITING'});};note.append(btn);document.body.append(note);}
        offer();reg.addEventListener('updatefound',()=>{const installing=reg.installing;if(installing)installing.addEventListener('statechange',offer);});
      }).catch(()=>{});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
