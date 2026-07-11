"use strict";
/* Astro Precise Horizon — section nav + chart finder (no fake chat harness) */

(function () {
  function $(id) { return document.getElementById(id); }

  function finderHTML() {
    return `<aside id="apChartFinder" class="ap-finder" hidden aria-label="Chart tool finder">` +
      `<div class="ap-finder__head">` +
      `<div><b class="ap-finder__title">Chart finder</b>` +
      `<span class="ap-finder__sub">Jump to computed tools</span></div>` +
      `<button type="button" class="ap-finder__close" id="apFinderClose" aria-label="Close">✕</button></div>` +
      `<nav class="ap-finder__links" aria-label="Chart tools">` +
      `<a class="ap-finder__link" href="chart.html">Cast natal chart</a>` +
      `<a class="ap-finder__link" href="what-is-my-rising-sign.html">Rising sign guide</a>` +
      `<a class="ap-finder__link" href="transits.html">Current transits</a>` +
      `<a class="ap-finder__link" href="cosmic-story.html">Cosmic story sample</a>` +
      `<a class="ap-finder__link" href="guides.html">Sky guides</a>` +
      `</nav></aside>` +
      `<button type="button" id="apFinderFab" class="ap-finder-fab" aria-label="Open chart finder" aria-expanded="false">` +
      `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>` +
      `<circle cx="12" cy="12" r="2.5" fill="currentColor"/></svg><span>Tools</span></button>`;
  }

  function mountFinder() {
    if ($("apChartFinder")) return;
    // Structure clean: floating Tools FAB fights bottom-nav + primary CTAs — skip sitewide.
    // Finder remains available via nav "More" / drawer if needed later.
    return;
  }

  function wireFinder() {
    const panel = $("apChartFinder");
    const fab = $("apFinderFab");
    const close = $("apFinderClose");
    if (!panel || !fab) return;

    const open = () => {
      panel.hidden = false;
      fab.setAttribute("aria-expanded", "true");
      close?.focus();
    };
    const shut = () => {
      panel.hidden = true;
      fab.setAttribute("aria-expanded", "false");
      fab.focus();
    };

    fab.addEventListener("click", () => (panel.hidden ? open() : shut()));
    close?.addEventListener("click", shut);
    panel.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", () => shut());
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !panel.hidden) shut();
    });
    document.addEventListener("click", (e) => {
      if (panel.hidden) return;
      if (!panel.contains(e.target) && !fab.contains(e.target)) shut();
    });
  }

  function initAwardLayout() {
    const header = $("apMasthead");
    const floatNav = $("apFloatNav");
    if (header) {
      const onScroll = () => header.classList.toggle("is-compact", window.scrollY > 48);
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
    if (floatNav) {
      floatNav.hidden = true;
      if (typeof IntersectionObserver !== "undefined") {
        const hero = document.querySelector(".ap-chapter--hero");
        const syncNav = (hide) => {
          floatNav.hidden = hide;
          document.body.classList.toggle("ap-award-511--nav-visible", !hide);
        };
        const syncFromHero = (intersecting) => {
          if (window.scrollY < 72) {
            syncNav(true);
            return;
          }
          syncNav(!!intersecting);
        };
        const obs = new IntersectionObserver((entries) => {
          syncFromHero(!!(entries[0] && entries[0].isIntersecting));
        }, { threshold: 0.08, rootMargin: "-4% 0px -36% 0px" });
        if (hero) obs.observe(hero);
        else syncNav(false);
        syncFromHero(true);
        window.addEventListener("scroll", () => {
          if (window.scrollY < 72) syncNav(true);
        }, { passive: true });
      }

      floatNav.querySelectorAll("[data-ap-jump]").forEach((link) => {
        link.addEventListener("click", (e) => {
          const id = link.dataset.apJump;
          const el = id && $(id);
          if (el) {
            e.preventDefault();
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      });

      initScrollSpy(floatNav);
    }
  }

  function initScrollSpy(floatNav) {
    const links = [...floatNav.querySelectorAll("[data-ap-jump]")];
    const sections = links.map((link) => {
      const el = $(link.dataset.apJump);
      return el ? { id: link.dataset.apJump, el, link } : null;
    }).filter(Boolean);
    if (!sections.length) return;

    const setActive = (id) => {
      sections.forEach(({ id: sid, link }) => {
        const on = sid === id;
        link.classList.toggle("is-active", on);
        if (on) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    };

    const pickFromScroll = () => {
      const anchor = window.innerHeight * 0.24;
      let bestId = sections[0].id;
      let bestDist = Infinity;
      sections.forEach(({ id, el }) => {
        const top = el.getBoundingClientRect().top;
        if (top > anchor + 120) return;
        const dist = Math.abs(top - anchor);
        if (dist < bestDist) {
          bestDist = dist;
          bestId = id;
        }
      });
      setActive(bestId);
    };

    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        pickFromScroll();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    pickFromScroll();
  }

  function initCompareReveal() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = document.querySelectorAll(".ap-reveal");
    if (!targets.length) return;

    const reveal = (el) => el.classList.add("ap-revealed");

    if (reduceMotion || typeof IntersectionObserver === "undefined") {
      targets.forEach(reveal);
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        reveal(en.target);
        io.unobserve(en.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -40px 0px" });

    targets.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.9 && r.bottom > 0) {
        reveal(el);
      } else {
        io.observe(el);
      }
    });
  }

  /** Home-only bottom tabs — index does not load app.js (no AstroApp.initBottomNav). */
  function initHomeBottomNav() {
    if (document.querySelector(".bottom-nav")) return;
    // Only on award home (masthead path); other pages get tabs from app.js.
    if (!document.body.classList.contains("ap-award-511")) return;
    if (!document.querySelector("#apMasthead, .masthead")) return;

    var tabs = (window.AP_NAV && window.AP_NAV.NAV_BOTTOM_TABS) || [
      ["index.html", "Observatory", "star4"],
      ["chart.html", "Chart", "spiral"],
      ["ephemeris.html", "The Sky", "telescope"],
      ["horoscope.html", "Daily", "crescent"],
    ];
    var nav = document.createElement("nav");
    nav.className = "bottom-nav";
    nav.setAttribute("aria-label", "Mobile tab bar");
    // Home may lack the global symbol sprite — use compact glyphs that don't depend on <use>.
    var GLYPH = {
      star4: "✦",
      spiral: "◎",
      telescope: "⌖",
      crescent: "☽",
    };
    function icon(id) {
      return (
        '<span class="bottom-nav__glyph" aria-hidden="true">' +
        (GLYPH[id] || "·") +
        "</span>"
      );
    }
    var tabsHtml = tabs
      .map(function (row) {
        var href = row[0];
        var label = row[1];
        var ic = row[2] || "star4";
        return (
          '<a href="' +
          href +
          '" class="bottom-nav__item">' +
          '<span class="bottom-nav__icon" aria-hidden="true">' +
          icon(ic) +
          "</span>" +
          '<span class="bottom-nav__label">' +
          label +
          "</span></a>"
        );
      })
      .join("");
    nav.innerHTML =
      '<div class="bottom-nav__shell">' +
      '<div class="bottom-nav__tabs">' +
      tabsHtml +
      "</div>" +
      '<div class="bottom-nav__pinned">' +
      '<a href="chart.html" class="bottom-nav__item bottom-nav__item--cast" aria-label="Cast your chart">' +
      '<span class="bottom-nav__icon" aria-hidden="true">' +
      icon("spiral") +
      "</span>" +
      '<span class="bottom-nav__label">Cast</span></a></div></div>';
    document.body.appendChild(nav);
    requestAnimationFrame(function () {
      var h = nav.offsetHeight;
      if (h > 0) document.documentElement.style.setProperty("--bottom-nav-h", h + "px");
    });
  }

  function init() {
    mountFinder();
    wireFinder();
    initAwardLayout();
    initCompareReveal();
    initHomeBottomNav();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();