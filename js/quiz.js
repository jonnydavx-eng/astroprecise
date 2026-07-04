"use strict";const AstroQuiz=(()=>{const v="ap_quiz_archetype",q="Astro Precise",g=[{id:"pioneer",name:"The Pioneer",element:"fire",modality:"Cardinal",sign:"Aries",planet:"Mars",tagline:"Fire \xB7 Cardinal",blurb:"You move first and ask later. Where others see a wall, you see a starting line. Bold, restless, and allergic to waiting, you carry the spark that gets things moving \u2014 the one who lights the match the rest of us warm our hands by.",strengths:["Initiative","Courage","Raw momentum"],growth:"Letting a fire burn slow enough to last."},{id:"sovereign",name:"The Sovereign",element:"fire",modality:"Fixed",sign:"Leo",planet:"Sun",tagline:"Fire \xB7 Fixed",blurb:"You were built to be seen \u2014 and to make others feel seen in return. Warm, loyal and quietly magnetic, you hold the centre of the room without grasping for it. People orbit your generosity. Your gift is radiance; your work is to share the light, never to hoard it.",strengths:["Warmth","Loyalty","Presence"],growth:"Shining for others, not only at them."},{id:"alchemist",name:"The Alchemist",element:"fire",modality:"Mutable",sign:"Sagittarius",planet:"Jupiter",tagline:"Fire \xB7 Mutable",blurb:"You turn every experience into meaning. A seeker by nature, you chase the horizon for the view, not the destination \u2014 collecting truths, philosophies and far-off places. Optimism is your fuel and freedom your oxygen. You remind everyone that the world is bigger than their fear of it.",strengths:["Vision","Optimism","Wanderlust"],growth:"Landing the wisdom you keep gathering."},{id:"builder",name:"The Builder",element:"earth",modality:"Cardinal",sign:"Capricorn",planet:"Saturn",tagline:"Earth \xB7 Cardinal",blurb:"You play the long game and you play it to win. Patient, disciplined and quietly ambitious, you turn intentions into structures that outlast the mood that made them. While others chase the spark, you lay the foundation. Your legacy is built one deliberate stone at a time.",strengths:["Discipline","Endurance","Strategy"],growth:"Letting the summit be enough to rest on."},{id:"cultivator",name:"The Cultivator",element:"earth",modality:"Fixed",sign:"Taurus",planet:"Venus",tagline:"Earth \xB7 Fixed",blurb:"You make the world more beautiful, more comfortable, more real. Sensual and steady, you trust what you can touch and savour what you have. You are the calm in the storm \u2014 the one who plants something and stays long enough to watch it bloom. Your peace is contagious.",strengths:["Steadiness","Sensuality","Devotion"],growth:"Bending before the wind asks you to break."},{id:"artisan",name:"The Artisan",element:"earth",modality:"Mutable",sign:"Virgo",planet:"Mercury",tagline:"Earth \xB7 Mutable",blurb:"You see the detail everyone else misses, then quietly make it right. Precise, helpful and devoted to craft, you find the sacred in the small \u2014 a tidy system, a kind correction, a job done properly. The world runs smoother because you cared enough to refine it.",strengths:["Precision","Service","Discernment"],growth:'Calling "good enough" a kind of perfect too.'},{id:"messenger",name:"The Messenger",element:"air",modality:"Mutable",sign:"Gemini",planet:"Mercury",tagline:"Air \xB7 Mutable",blurb:"Ideas move through you like weather. Curious, quick and endlessly connective, you can talk to anyone and link anything to anything. You carry sparks between minds that would never have met. Your superpower is translation \u2014 turning the complicated into the human.",strengths:["Curiosity","Wit","Adaptability"],growth:"Going deep on the few, not wide on the all."},{id:"diplomat",name:"The Diplomat",element:"air",modality:"Cardinal",sign:"Libra",planet:"Venus",tagline:"Air \xB7 Cardinal",blurb:"You feel the balance in every room and tilt it gently back toward harmony. Fair, charming and relational to the core, you build bridges where others draw lines. You see every side \u2014 sometimes all at once \u2014 and your grace is in choosing connection over being right.",strengths:["Harmony","Fairness","Charm"],growth:"Choosing yourself without losing the peace."},{id:"visionary",name:"The Visionary",element:"air",modality:"Fixed",sign:"Aquarius",planet:"Uranus",tagline:"Air \xB7 Fixed",blurb:"You live a few years ahead of everyone else. Independent, inventive and unmistakably yourself, you care about the whole more than the crowd. You break the rule that needed breaking and dream the future the rest of us catch up to. Belonging, for you, is never the same as conforming.",strengths:["Originality","Humanity","Independence"],growth:"Letting people close to the future you see."},{id:"mystic",name:"The Mystic",element:"water",modality:"Mutable",sign:"Pisces",planet:"Neptune",tagline:"Water \xB7 Mutable",blurb:"You feel the unseen current under everything. Dreamy, compassionate and porous to the world, you dissolve the line between yourself and others \u2014 for better and for deeper. Art, empathy and the spiritual are your native tongue. You remind us that mystery is not a problem to solve.",strengths:["Empathy","Imagination","Compassion"],growth:"Keeping a shore while you swim the deep."},{id:"guardian",name:"The Guardian",element:"water",modality:"Cardinal",sign:"Cancer",planet:"Moon",tagline:"Water \xB7 Cardinal",blurb:"You make safety wherever you go. Tender, intuitive and fiercely protective, you read the emotional room before a word is spoken and you tend to what matters most \u2014 your people, your roots, your home. Your strength is soft and unshakeable: the tide that always returns.",strengths:["Nurture","Intuition","Loyalty"],growth:"Letting yourself be held in return."},{id:"sorcerer",name:"The Sorcerer",element:"water",modality:"Fixed",sign:"Scorpio",planet:"Pluto",tagline:"Water \xB7 Fixed",blurb:"You go all the way down and come back transformed. Intense, perceptive and unafraid of the dark, you see through surfaces to the truth beneath. You feel deeply and commit completely. Where others flinch, you alchemise \u2014 turning crisis into power, and endings into beginnings.",strengths:["Depth","Magnetism","Resilience"],growth:"Trusting before you have read the whole room."}],_={};g.forEach(e=>{_[e.element+":"+e.modality]=e.id});const p=[{q:"A free weekend lands in your lap. What actually happens?",options:[{text:"I start something \u2014 a project, a trip, a plan only I can see yet",el:"fire",mod:"Cardinal"},{text:"I get hands-on: cook, garden, make, build something real",el:"earth",mod:"Fixed"},{text:"I meet people, swap ideas, fall down a dozen rabbit holes",el:"air",mod:"Mutable"},{text:"I retreat into feeling \u2014 music, water, a long quiet dream",el:"water",mod:"Mutable"}]},{q:"When the group can't agree, you tend to be the one who\u2026",options:[{text:"Just decides and gets us moving",el:"fire",mod:"Cardinal"},{text:"Holds steady and refuses to be rushed into nonsense",el:"earth",mod:"Fixed"},{text:"Finds the words that let everyone feel heard",el:"air",mod:"Cardinal"},{text:"Senses what people actually need underneath the argument",el:"water",mod:"Cardinal"}]},{q:"Which compliment would secretly mean the most?",options:[{text:'"You make things happen."',el:"fire",mod:"Cardinal"},{text:`"You're someone I can always rely on."`,el:"earth",mod:"Fixed"},{text:'"Talking to you makes me think differently."',el:"air",mod:"Mutable"},{text:'"Being around you, I feel completely understood."',el:"water",mod:"Mutable"}]},{q:"Your relationship with change is best described as\u2026",options:[{text:"I love it \u2014 I'm usually the one causing it",el:"fire",mod:"Mutable"},{text:"I'd rather build something that lasts than chase the new",el:"earth",mod:"Cardinal"},{text:"I adapt instantly \u2014 I'm water that finds the gap",el:"air",mod:"Mutable"},{text:"I transform through it, even when it hurts",el:"water",mod:"Fixed"}]},{q:"Pick the night sky that calls to you.",options:[{text:"A blazing comet tearing a bright line across the dark",el:"fire",mod:"Fixed"},{text:"A steady, full harvest moon low and gold on the horizon",el:"earth",mod:"Mutable"},{text:"A wide field of stars, each one a story to connect",el:"air",mod:"Fixed"},{text:"The deep tide pulling beneath an unseen new moon",el:"water",mod:"Cardinal"}]},{q:"At your absolute best, what do you bring to the world?",options:[{text:"The spark \u2014 courage, momentum, the first brave move",el:"fire",mod:"Cardinal"},{text:"The foundation \u2014 beauty, patience, things that endure",el:"earth",mod:"Fixed"},{text:"The connection \u2014 ideas, fairness, bridges between minds",el:"air",mod:"Cardinal"},{text:"The depth \u2014 empathy, intuition, the truth beneath",el:"water",mod:"Fixed"}]}];let o=null,c=0,h={},m={},b=null;function y(){c=0,h={fire:0,earth:0,air:0,water:0},m={Cardinal:0,Fixed:0,Mutable:0},b=null}function u(e){return String(e).replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[a])}function k(){let e="fire",a=-1;for(const i of Object.keys(h))h[i]>a&&(a=h[i],e=i);let n="Cardinal",t=-1;for(const i of Object.keys(m))m[i]>t&&(t=m[i],n=i);const l=_[e+":"+n];return g.find(i=>i.id===l)||g[0]}function f(){if(w(),o.classList.remove("aq-mount--result"),c>=p.length){x();return}const e=p[c],a=Math.round(c/p.length*100);o.innerHTML=`
      <div class="aq-card">
        <div class="aq-progress-label">Question ${c+1} of ${p.length}</div>
        <h2 class="aq-question">${u(e.q)}</h2>
        <div class="aq-options" role="group" aria-label="Answer choices">
          ${e.options.map((n,t)=>`
            <button class="aq-option" data-index="${t}"
              data-element="${n.el}">
              <span class="aq-option__dot" aria-hidden="true"></span>
              <span class="aq-option__text">${u(n.text)}</span>
            </button>
          `).join("")}
        </div>
        <div class="aq-progress" aria-hidden="true">
          <div class="aq-progress__fill" style="width:${a}%"></div>
        </div>
      </div>
    `,o.querySelectorAll(".aq-option").forEach(n=>{n.addEventListener("click",()=>{const t=parseInt(n.dataset.index,10),l=e.options[t];h[l.el]=(h[l.el]||0)+2,m[l.mod]=(m[l.mod]||0)+2,c++,f(),o.scrollIntoView({behavior:"smooth",block:"start"})})})}function C(e){const a=window.AP_MON||{},n=d=>typeof d=="string"&&/^https?:\/\//i.test(d.trim()),t=a.commerce&&Array.isArray(a.commerce.products)?a.commerce.products:[],i={fire:"sky-tee",air:"sky-tee",earth:"natal-poster",water:"deep-reading"}[e.element]||"natal-poster",r=t.find(d=>d.id===i)||t.find(d=>d.id==="natal-poster")||t[0]||null,s=[];if(s.push(`
      <a class="aq-route aq-route--primary" href="chart.html">
        <span class="aq-route__icon" aria-hidden="true"><svg class="eng-i" aria-hidden="true"><use href="#ei-star4"/></svg></span>
        <span class="aq-route__body">
          <span class="aq-route__title">Cast your real birth chart</span>
          <span class="aq-route__sub">See your actual Sun, Moon &amp; Rising \u2014 computed from the real sky, free.</span>
        </span>
        <span class="aq-route__arrow" aria-hidden="true">\u2192</span>
      </a>
    `),n(a.deepReadingUrl)?s.push(`
        <a class="aq-route" href="${u(a.deepReadingUrl.trim())}" target="_blank" rel="noopener sponsored">
          <span class="aq-route__icon" aria-hidden="true">\u2767</span>
          <span class="aq-route__body">
            <span class="aq-route__title">Get your Deep Reading</span>
            <span class="aq-route__sub">A long-form written reading of your whole chart, yours to keep.</span>
          </span>
          <span class="aq-route__arrow" aria-hidden="true">\u2192</span>
        </a>
      `):s.push(`
        <button class="aq-route" id="aq-deep-reading" type="button">
          <span class="aq-route__icon" aria-hidden="true">\u2767</span>
          <span class="aq-route__body">
            <span class="aq-route__title">Be first to read your Deep Reading</span>
            <span class="aq-route__sub">Long-form written readings open soon \u2014 get told when they do.</span>
          </span>
          <span class="aq-route__arrow" aria-hidden="true">\u2192</span>
        </button>
      `),r){const d=n(r.fulfilUrl),$=d?u(r.fulfilUrl.trim()):"shop.html",L=d?' target="_blank" rel="noopener sponsored"':"",A=typeof r.price=="number"?"$"+r.price.toFixed(2):"";s.push(`
        <a class="aq-route" href="${$}"${L}>
          <span class="aq-route__icon" aria-hidden="true">\u25C8</span>
          <span class="aq-route__body">
            <span class="aq-route__title">${u(r.name)}${A?' \xB7 <span class="aq-route__price">'+A+"</span>":""}</span>
            <span class="aq-route__sub">${d?"A piece matched to your archetype \u2014 made from your own chart.":"A piece matched to your archetype \u2014 the shop opens soon."}</span>
          </span>
          <span class="aq-route__arrow" aria-hidden="true">\u2192</span>
        </a>
      `)}return s.join("")}function I(){return`
      <form class="aq-email" id="aq-email-form" novalidate>
        <label class="aq-email__label" for="aq-email-input">
          Want your archetype + 3 cosmic wallpapers? Drop your email.
        </label>
        <div class="aq-email__row">
          <input class="aq-email__input" id="aq-email-input" type="email"
            inputmode="email" autocomplete="email" placeholder="you@example.com"
            aria-label="Email address" />
          <button class="btn btn--gold btn--sm" type="submit">Send it</button>
        </div>
        <p class="aq-email__note" id="aq-email-note">
          Private by design \u2014 your email is saved on your device until a list is live.
        </p>
      </form>
    `}function T(){const e=o.querySelector("#aq-email-form");if(!e)return;const a=e.querySelector("#aq-email-input"),n=e.querySelector("#aq-email-note"),t=window.AP_MON||{},l=i=>typeof i=="string"&&/^https?:\/\//i.test(i.trim());e.addEventListener("submit",i=>{i.preventDefault();const r=(a.value||"").trim();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r)){n.textContent="That email doesn't look right \u2014 mind checking it?",n.style.color="var(--color-danger, #ef4444)",a.focus();return}if(l(t.emailUrl))try{const s=document.createElement("form");s.method="POST",s.action=t.emailUrl.trim(),s.target="_blank",s.rel="noopener";const d=document.createElement("input");d.type="hidden",d.name="email",d.value=r,s.appendChild(d),document.body.appendChild(s),s.submit(),s.remove()}catch{}else try{const s=JSON.parse(localStorage.getItem("ap_email_intent")||"[]");s.push({email:r,source:"quiz",archetype:b,at:Date.now()}),localStorage.setItem("ap_email_intent",JSON.stringify(s))}catch{}n.textContent="Saved \u2014 you're on the list. Thank you.",n.style.color="var(--color-gold, #C2A05E)",a.disabled=!0,e.querySelector('button[type="submit"]').disabled=!0})}function w(){o&&o.classList.remove("is-booting","is-revealing")}function M(){o&&o.classList.add("aq-mount--result")}function x(){const e=k();b=e.id,M();try{localStorage.setItem(v,JSON.stringify({id:e.id,name:e.name,element:e.element,modality:e.modality,sign:e.sign,planet:e.planet,at:Date.now()}))}catch{}const a=window.AstroIcons&&window.AstroIcons.sign?window.AstroIcons.sign(e.sign,{xl:!0,label:e.name}):'<span class="aq-orb-fallback eng-star-mark" style="color:var(--gold);"></span>',n=`My cosmic archetype is ${e.name} (${e.tagline}) \u2014 Discover yours at ${q}`;w(),o.innerHTML=`
      <div class="aq-result" data-element="${e.element}">
        <div class="aq-result__eyebrow">Your Cosmic Archetype</div>
        <div class="aq-result__orb">${a}</div>
        <h2 class="aq-result__name">${u(e.name)}</h2>
        <div class="aq-result__tagline">${u(e.tagline)} \xB7 guided by ${u(e.planet)}</div>
        <p class="aq-result__blurb">${u(e.blurb)}</p>

        <div class="aq-traits">
          <div class="aq-traits__block">
            <span class="aq-traits__label">Your gifts</span>
            <ul class="aq-traits__list">
              ${e.strengths.map(r=>`<li>${u(r)}</li>`).join("")}
            </ul>
          </div>
          <div class="aq-traits__block">
            <span class="aq-traits__label">Your growing edge</span>
            <p class="aq-traits__edge">${u(e.growth)}</p>
          </div>
        </div>

        <div class="aq-disclaimer">
          This quiz is a doorway, not a reading. Your <em>real</em> archetype lives in
          your actual birth chart \u2014 cast it free below to see the true sky you were born under.
        </div>

        <div class="aq-routes">
          ${C(e)}
        </div>

        ${I()}

        <div class="aq-share">
          <button class="btn btn--outline btn--sm" id="aq-share-btn" type="button">Share \u2197</button>
          <button class="btn btn--outline btn--sm" id="aq-restart-btn" type="button">Take it again</button>
        </div>
      </div>
    `;const t=o.querySelector("#aq-deep-reading");t&&t.addEventListener("click",()=>{const r=o.querySelector("#aq-email-input");r&&(r.focus(),r.scrollIntoView({behavior:"smooth",block:"center"})),window.AstroApp&&AstroApp.showToast&&AstroApp.showToast("Almost there","Deep Readings open soon \u2014 leave your email to be first.","info")}),T();const l=o.querySelector("#aq-share-btn");l&&l.addEventListener("click",()=>{const r=window.location.href.split("#")[0];navigator.share?navigator.share({title:e.name+" \u2014 "+q,text:n,url:r}).catch(()=>{}):navigator.clipboard&&navigator.clipboard.writeText(n+" "+r).then(()=>{l.textContent="Copied!",setTimeout(()=>{l.textContent="Share \u2197"},2e3)}).catch(()=>{})});const i=o.querySelector("#aq-restart-btn");i&&i.addEventListener("click",()=>{y(),f(),o.scrollIntoView({behavior:"smooth",block:"start"})}),o.scrollIntoView({behavior:"smooth",block:"start"})}function S(e){const a=o.querySelector("#aq-start-btn");a&&!a.dataset.wired&&(a.dataset.wired="1",a.addEventListener("click",()=>{y(),f()}));const n=o.querySelector("#aq-resume-btn");n&&!n.dataset.wired&&(n.dataset.wired="1",n.addEventListener("click",()=>{const t=g.find(l=>l.id===e.id);t&&(y(),h[t.element]=10,m[t.modality]=10,c=p.length,x())}))}function E(){w(),o.classList.remove("aq-mount--result");let e=null;try{e=JSON.parse(localStorage.getItem(v)||"null")}catch{}const a=o.querySelector(".aq-intro");if(a){if(e&&e.name&&!o.querySelector("#aq-resume-btn")){const t=document.createElement("button");t.className="aq-resume",t.id="aq-resume-btn",t.type="button",t.innerHTML="Last time you were <strong>"+u(e.name)+"</strong> \u2014 view it again",a.appendChild(t)}S(e);return}const n=e&&e.name?`
      <button class="aq-resume" id="aq-resume-btn" type="button">
        Last time you were <strong>${u(e.name)}</strong> \u2014 view it again
      </button>
    `:"";o.innerHTML=`
      <div class="aq-card aq-intro">
        <div class="aq-intro__seal" aria-hidden="true"><span class="eng-star-mark" style="color:var(--gold);width:1.4em;height:1.4em;"></span></div>
        <h2 class="aq-intro__title">Which cosmic archetype are you?</h2>
        <p class="aq-intro__sub">
          Six questions. One archetype, drawn from the timeless language of element,
          modality and planet. It takes about ninety seconds \u2014 and points you toward
          your real chart at the end.
        </p>
        <button class="btn btn--primary btn--lg" id="aq-start-btn" type="button">Begin the quiz</button>
        ${n}
      </div>
    `,S(e)}function Y(e){o=document.getElementById(e||"aq-mount"),o&&(y(),E())}return{init:Y,ARCHETYPES:g,QUESTIONS:p,_resolve:k}})();window.AstroQuiz=AstroQuiz,document.addEventListener("DOMContentLoaded",()=>{document.getElementById("aq-mount")&&AstroQuiz.init("aq-mount")});
