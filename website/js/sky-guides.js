"use strict";
/* Sky Guides — editorial section (Travel Radar parity for Astro Precise) */

(function () {
  const TIPS_KEY = "ap_guide_tips_done";
  const THEME_GRADS = {
    gold: "radial-gradient(ellipse 120% 80% at 18% 22%, rgba(236,230,216,0.22) 0%, transparent 55%), linear-gradient(135deg, #E8D4A0 0%, #C2A05E 22%, #D97B52 48%, #4A7EB8 82%, #0C1016 100%)",
    meridian: "radial-gradient(ellipse 100% 70% at 82% 18%, rgba(111,160,216,0.28) 0%, transparent 50%), linear-gradient(135deg, #5B9BD5 0%, #6FA0D8 32%, #C2A05E 58%, #121826 100%)",
    silver: "radial-gradient(ellipse 90% 65% at 12% 78%, rgba(236,230,216,0.18) 0%, transparent 48%), linear-gradient(135deg, #D8D0C0 0%, #ECE6D8 34%, #8BAED4 68%, #121826 100%)",
    violet: "radial-gradient(ellipse 110% 75% at 70% 30%, rgba(155,143,212,0.32) 0%, transparent 52%), linear-gradient(135deg, #9B8FD4 0%, #8B7EC8 38%, #C2A05E 64%, #1A2230 100%)",
    rose: "radial-gradient(ellipse 95% 68% at 24% 72%, rgba(232,196,160,0.26) 0%, transparent 50%), linear-gradient(135deg, #E8C4A0 0%, #D4A882 32%, #C2A05E 55%, #5B8EC8 100%)",
    indigo: "radial-gradient(ellipse 100% 72% at 88% 42%, rgba(90,122,158,0.3) 0%, transparent 48%), linear-gradient(135deg, #3D4F68 0%, #5A7A9E 40%, #C2A05E 68%, #0C1016 100%)",
    coral: "radial-gradient(ellipse 105% 70% at 16% 38%, rgba(232,148,114,0.28) 0%, transparent 50%), linear-gradient(135deg, #E89472 0%, #D97B52 38%, #C2A05E 62%, #F0E9DA 100%)",
    dusk: "radial-gradient(ellipse 120% 80% at 50% 12%, rgba(194,160,94,0.2) 0%, transparent 55%), linear-gradient(135deg, #1A2840 0%, #2E3F5C 36%, #C2A05E 60%, #2A1E0E 100%)",
    sage: "radial-gradient(ellipse 90% 65% at 78% 68%, rgba(127,168,90,0.26) 0%, transparent 48%), linear-gradient(135deg, #7FA85A 0%, #8FB36B 36%, #C2A05E 62%, #0C1016 100%)",
    slate: "radial-gradient(ellipse 100% 72% at 22% 28%, rgba(138,155,176,0.24) 0%, transparent 50%), linear-gradient(135deg, #5A6A7E 0%, #8A9BB0 38%, #C2A05E 65%, #0C1016 100%)",
    air: "radial-gradient(ellipse 110% 75% at 62% 22%, rgba(168,212,255,0.3) 0%, transparent 52%), linear-gradient(135deg, #A8D4FF 0%, #93c5fd 40%, #C2A05E 66%, #ECE6D8 100%)",
  };

  let catalog = null;
  let guidesCache = [];
  let guidesFeatured = null;
  let guideFilter = "all";
  let readerOpenId = null;
  let overlayTrap = null;
  let readerLastFocus = null;
  /* Render mode — set via data-sg-mode on the #skyGuidesWrap mount:
     "full" (default): filter chips + hero + complete card grid (library page).
     "teaser": featured hero + TEASER_CARDS cards + browse-all link (homepage). */
  let sectionMode = "full";
  const TEASER_CARDS = 3;
  const DOC_TITLE = document.title;

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function themeGrad(name) {
    return THEME_GRADS[name] || THEME_GRADS.gold;
  }

  function categoryLabel(cat) {
    const map = {
      chart: "Chart", transits: "Transits", moon: "Moon", rising: "Rising",
      compatibility: "Synastry", retrograde: "Retrograde", season: "Season",
      readings: "Readings", beginner: "Beginner",
    };
    return map[cat] || cat || "Guide";
  }

  function featuredForMonth(m) {
    const picks = {
      0: "saturn-return-prep", 1: "rising-sign-guide", 2: "mercury-mind",
      3: "transit-timing", 4: "season-briefing", 5: "moon-phase-living",
      6: "birth-chart-basics", 7: "cosmic-story-read", 8: "synastry-honest",
      9: "retrograde-survival", 10: "privacy-first-astro", 11: "saturn-return-prep",
    };
    return picks[m % 12];
  }

  function enrichGuide(raw) {
    if (!raw) return null;
    return Object.assign({}, raw, {
      theme_grad: themeGrad(raw.theme),
    });
  }

  function loadTips() {
    try { return JSON.parse(localStorage.getItem(TIPS_KEY) || "{}"); }
    catch (e) { return {}; }
  }

  function saveTips(store) {
    try { localStorage.setItem(TIPS_KEY, JSON.stringify(store || {})); } catch (e) { /* */ }
  }

  function tipDone(store, id, idx) {
    const list = store[id];
    return Array.isArray(list) && list.includes(idx);
  }

  function toggleTip(id, idx) {
    const store = loadTips();
    const list = [...(store[id] || [])];
    const pos = list.indexOf(idx);
    if (pos >= 0) list.splice(pos, 1); else list.push(idx);
    list.sort((a, b) => a - b);
    if (list.length) store[id] = list; else delete store[id];
    saveTips(store);
    return tipDone(store, id, idx);
  }

  function tipsHTML(guide) {
    const tips = guide.tips || [];
    if (!tips.length) return "";
    const store = loadTips();
    const done = tips.filter((_, i) => tipDone(store, guide.id, i)).length;
    const progress = tips.length > 1 ? `<span class="sg-tips-progress">${done}/${tips.length} done</span>` : "";
    const items = tips.map((t, i) => {
      const checked = tipDone(store, guide.id, i);
      return `<li><button type="button" class="sg-tip-item${checked ? " done" : ""}"` +
        ` role="checkbox" aria-checked="${checked}" data-sg-tip="${esc(guide.id)}:${i}">` +
        `<span class="sg-tip-box" aria-hidden="true"></span>` +
        `<span class="sg-tip-text">${esc(t)}</span></button></li>`;
    }).join("");
    return `<div class="sg-reader-tips"><h4 class="sg-reader-tips-title">Quick tips${progress}</h4>` +
      `<ul class="sg-tips-list">${items}</ul></div>`;
  }

  function linkPills(links) {
    return (links || []).map(l =>
      `<a class="sg-link-pill" href="${esc(l.href || "#")}">` +
      `<span class="sg-pill-label">${esc(l.label || "")}</span>` +
      (l.hook ? `<span class="sg-pill-hook">${esc(l.hook)}</span>` : "") +
      `</a>`
    ).join("");
  }

  function matchingFilter(filter, list) {
    if (filter === "all") return list.slice();
    return list.filter(g => g.category === filter);
  }

  function heroForFilter(filter, list) {
    const pool = matchingFilter(filter, list);
    if (!pool.length) return null;
    if (filter === "all") return guidesFeatured || pool[0];
    if (guidesFeatured && guidesFeatured.category === filter) return guidesFeatured;
    return pool[0];
  }

  function categoryCounts(list) {
    const counts = { all: list.length };
    list.forEach(g => { if (g.category) counts[g.category] = (counts[g.category] || 0) + 1; });
    return counts;
  }

  function filterHTML(cats, counts) {
    const chips = [{ id: "all", label: "All guides", count: counts.all }].concat(
      cats.map(c => ({ id: c, label: categoryLabel(c), count: counts[c] }))
    );
    return `<div class="sg-filter-row" role="toolbar" aria-label="Filter sky guides">` +
      chips.map(c => {
        const n = c.count != null ? `<span class="sg-filter-count">${c.count}</span>` : "";
        return `<button type="button" class="sg-filter-chip${guideFilter === c.id ? " on" : ""}"` +
          ` data-sg-filter="${esc(c.id)}" aria-pressed="${guideFilter === c.id}">` +
          `${esc(c.label)}${n}</button>`;
      }).join("") + `</div>`;
  }

  function heroHTML(guide, opts) {
    if (!guide) return "";
    opts = opts || {};
    const openAttr = opts.noOpen ? "" :
      ` data-sg-open="${esc(guide.id)}" role="button" tabindex="0" aria-label="Read guide: ${esc(guide.title)}"`;
    return `<div class="sg-hero${opts.noOpen ? "" : " sg-hero-click"}" data-sg-id="${esc(guide.id)}"${openAttr}>` +
      `<div class="sg-hero-art" style="background:${esc(guide.theme_grad)}"></div>` +
      `<div class="sg-hero-scrim"></div>` +
      `<div class="sg-hero-body">` +
      `<div class="sg-hero-kicker">` +
      (opts.featured ? `<span class="sg-featured-badge">Featured this month</span>` : "") +
      `<span class="sg-cat">${esc(categoryLabel(guide.category))}</span>` +
      (guide.trend_tag ? `<span class="sg-trend-tag">${esc(guide.trend_tag)}</span>` : "") +
      `<span class="sg-read">${guide.read_mins || 3} min read</span></div>` +
      `<h3 class="sg-hero-title">${esc(guide.title)}</h3>` +
      `<p class="sg-hero-dek">${esc(guide.dek)}</p>` +
      (opts.noOpen ? `<div class="sg-link-row">${linkPills(guide.links)}</div>` : `<span class="sg-hero-cta">Read guide →</span>`) +
      `</div></div>`;
  }

  function cardHTML(guide) {
    return `<div class="sg-card-wrap"><button type="button" class="sg-card" data-sg-open="${esc(guide.id)}">` +
      `<div class="sg-card-media"><div class="sg-card-art" style="background:${esc(guide.theme_grad)}"></div>` +
      `<div class="sg-card-scrim"></div></div>` +
      `<div class="sg-card-body">` +
      `<span class="sg-cat">${esc(categoryLabel(guide.category))}</span>` +
      `<span class="sg-card-title">${esc(guide.title)}</span>` +
      `<span class="sg-card-dek">${esc((guide.dek || "").slice(0, 100))}${(guide.dek || "").length > 100 ? "…" : ""}</span>` +
      `</div></button></div>`;
  }

  function relatedFor(current, list, limit) {
    limit = limit == null ? 4 : limit;
    const pool = list.filter(g => g.id !== current.id);
    const linkSet = new Set((current.links || []).map(l => l.href));
    const scored = pool.map(g => {
      let score = 0;
      if (g.category === current.category) score += 3;
      (g.links || []).forEach(l => { if (linkSet.has(l.href)) score += 2; });
      return { g, score };
    }).filter(x => x.score > 0);
    scored.sort((a, b) => b.score - a.score);
    let picks = scored.slice(0, limit).map(x => x.g);
    if (!picks.length) {
      const same = pool.filter(g => g.category === current.category);
      picks = (same.length ? same : pool).slice(0, limit);
    }
    return picks;
  }

  function relatedHTML(current, list) {
    const related = relatedFor(current, list);
    if (!related.length) return "";
    return `<section class="sg-related" aria-label="Related guides">` +
      `<h4 class="sg-related-heading">Related guides</h4>` +
      `<div class="sg-related-strip">` +
      related.map(g =>
        `<button type="button" class="sg-related-card" data-sg-open="${esc(g.id)}">` +
        `<span class="sg-cat">${esc(categoryLabel(g.category))}</span>` +
        `<span class="sg-related-title">${esc(g.title)}</span></button>`
      ).join("") + `</div></section>`;
  }

  function shareUrl(id) {
    const base = location.origin + location.pathname;
    return base + "#guides?story=" + encodeURIComponent(id);
  }

  function sharePanelHTML(guide) {
    const url = shareUrl(guide.id);
    const label = navigator.share ? "Share guide" : "Copy share link";
    return `<div class="sg-share-panel" aria-label="Share this guide">` +
      `<div class="sg-share-thumb" style="background:${esc(guide.theme_grad)}" aria-hidden="true"></div>` +
      `<div class="sg-share-main">` +
      `<span class="sg-share-label">Share this guide</span>` +
      `<button type="button" class="sg-share-url" data-sg-copy="${esc(url)}">${esc(url.replace(/^https?:\/\/[^/]+/, ""))}</button>` +
      `<div class="sg-share-toolbar">` +
      `<button type="button" class="sg-share-chip" data-sg-copy="${esc(url)}">Copy link</button>` +
      `<button type="button" class="sg-share-chip sg-share-chip-primary" data-sg-share="${esc(guide.id)}">${esc(label)}</button>` +
      `</div></div></div>`;
  }

  function readerHTML(guide, list) {
    const body = (guide.body || []).map(p => `<p class="sg-reader-p">${esc(p)}</p>`).join("");
    return `<div class="sg-reader">` +
      `<div class="sg-reader-hero">` +
      `<div class="sg-reader-art" style="background:${esc(guide.theme_grad)}"></div>` +
      `<div class="sg-reader-scrim"></div>` +
      `<div class="sg-reader-hero-body">` +
      `<span class="sg-cat">${esc(categoryLabel(guide.category))}</span>` +
      `<h3 class="sg-reader-title">${esc(guide.title)}</h3>` +
      `<p class="sg-reader-dek">${esc(guide.dek)}</p></div></div>` +
      `<div class="sg-reader-content">` +
      body + tipsHTML(guide) +
      `<h4 class="sg-reader-links-title">Explore next</h4>` +
      `<div class="sg-link-row">${linkPills(guide.links)}</div>` +
      `<div class="sg-reader-actions">${sharePanelHTML(guide)}</div>` +
      relatedHTML(guide, list) +
      `<p class="sg-reader-note">${esc((catalog && catalog.editorial_note) || "")}</p>` +
      `</div></div>`;
  }

  function renderSection() {
    const wrap = $("skyGuidesWrap");
    const heroSlot = $("skyGuidesHero");
    const gridOut = $("skyGuidesOut");
    const filterSlot = $("skyGuidesFilter");
    if (!wrap || !gridOut) return;

    if (sectionMode === "teaser") {
      const teaserHero = guidesFeatured || guidesCache[0] || null;
      const teaserGrid = guidesCache
        .filter(g => !teaserHero || g.id !== teaserHero.id)
        .slice(0, TEASER_CARDS);
      if (filterSlot) filterSlot.innerHTML = "";
      if (heroSlot) {
        heroSlot.innerHTML = teaserHero
          ? heroHTML(teaserHero, { featured: !!(guidesFeatured && teaserHero.id === guidesFeatured.id) })
          : "";
      }
      gridOut.innerHTML =
        `<div class="sg-grid">${teaserGrid.map(cardHTML).join("")}</div>` +
        `<p class="sg-browse-all-row"><a class="sg-browse-all" href="guides.html">` +
        `Browse all ${guidesCache.length} sky guides →</a></p>`;
      wrap.hidden = false;
      return;
    }

    const cats = [...new Set(guidesCache.map(g => g.category).filter(Boolean))];
    const counts = categoryCounts(guidesCache);
    if (filterSlot) filterSlot.innerHTML = filterHTML(cats, counts);

    const hero = heroForFilter(guideFilter, guidesCache);
    const pool = matchingFilter(guideFilter, guidesCache);
    const grid = pool.filter(g => !hero || g.id !== hero.id);

    if (heroSlot) {
      const featured = !!(hero && guidesFeatured && hero.id === guidesFeatured.id && guideFilter === "all");
      heroSlot.innerHTML = hero ? heroHTML(hero, { featured }) : "";
    }
    const note = guideFilter !== "all" && grid.length
      ? `<p class="sg-grid-note">${grid.length} more ${categoryLabel(guideFilter).toLowerCase()} guide${grid.length === 1 ? "" : "s"}</p>` : "";
    const empty = !pool.length
      ? `<div class="sg-empty">No guides in this filter yet. <button type="button" class="sg-reset" data-sg-filter="all">Show all</button></div>`
      : `<div class="sg-grid">${grid.map(cardHTML).join("")}</div>`;
    gridOut.innerHTML = note + empty;
    wrap.hidden = false;
  }

  function syncGuideHash(id, replace) {
    const hash = id ? "guides?story=" + encodeURIComponent(id) : "guides";
    const url = location.pathname + location.search + "#" + hash;
    if (replace) history.replaceState(null, "", url);
    else history.pushState(null, "", url);
  }

  function parseGuideHash() {
    const h = (location.hash || "").replace(/^#/, "");
    if (!h.startsWith("guides")) return null;
    const q = h.indexOf("?");
    if (q < 0) return null;
    const params = new URLSearchParams(h.slice(q + 1));
    return params.get("story") || null;
  }

  function trapFocus(root) {
    if (overlayTrap) overlayTrap();
    const focusable = root.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const nodes = [...focusable].filter(el => !el.disabled && el.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0], last = nodes[nodes.length - 1];
    function onKey(e) {
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    root.addEventListener("keydown", onKey);
    overlayTrap = () => { root.removeEventListener("keydown", onKey); overlayTrap = null; };
    first.focus();
  }

  function openReader(id, opts) {
    opts = opts || {};
    const guide = guidesCache.find(g => g.id === id);
    const ov = $("sgOverlay");
    const body = $("sgOverlayBody");
    if (!guide || !ov || !body) return;
    const swapping = readerOpenId && readerOpenId !== id;
    if (!readerOpenId) readerLastFocus = document.activeElement;
    readerOpenId = id;
    body.innerHTML = readerHTML(guide, guidesCache);
    ov.hidden = false;
    document.body.classList.add("sg-reader-open");
    trapFocus(ov);
    if (opts.fromHash) { /* hash already correct */ }
    else if (swapping || opts.inOverlay) syncGuideHash(id, true);
    else syncGuideHash(id, false);
    document.title = guide.title + " — Astro Precise";
    const sheet = ov.querySelector(".sg-overlay-sheet");
    if (sheet) {
      sheet.classList.remove("sg-sheet-scrolled");
      const onScroll = () => {
        if (sheet.scrollTop > 24) sheet.classList.add("sg-sheet-scrolled");
      };
      sheet.addEventListener("scroll", onScroll, { passive: true });
      sheet._sgScrollFn = onScroll;
    }
  }

  function closeReader(opts) {
    opts = opts || {};
    const ov = $("sgOverlay");
    if (!ov || ov.hidden) return;
    const sheet = ov.querySelector(".sg-overlay-sheet");
    if (sheet && sheet._sgScrollFn) {
      sheet.removeEventListener("scroll", sheet._sgScrollFn);
      sheet._sgScrollFn = null;
      sheet.classList.remove("sg-sheet-scrolled");
    }
    ov.hidden = true;
    document.body.classList.remove("sg-reader-open");
    if (overlayTrap) overlayTrap();
    readerOpenId = null;
    document.title = DOC_TITLE;
    if (!opts.fromHash) syncGuideHash(null, true);
    if (readerLastFocus && typeof readerLastFocus.focus === "function") {
      try { readerLastFocus.focus(); } catch (e) { /* */ }
    }
    readerLastFocus = null;
  }

  function showToast(msg) {
    const t = $("apToast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(showToast._tm);
    showToast._tm = setTimeout(() => t.classList.remove("show"), 2800);
  }

  async function shareGuide(id) {
    const guide = guidesCache.find(g => g.id === id);
    const url = shareUrl(id);
    if (navigator.share) {
      try {
        await navigator.share({ title: guide && guide.title, text: guide && guide.dek, url });
        showToast("Guide shared");
        return;
      } catch (e) { if (e && e.name === "AbortError") return; }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      showToast("Link copied — paste anywhere");
    }
  }

  function wireEvents() {
    if (wireEvents._done) return;
    wireEvents._done = true;

    document.addEventListener("click", (e) => {
      if (e.target.closest("a.sg-link-pill")) return;

      const open = e.target.closest("[data-sg-open]");
      if (open) {
        e.preventDefault();
        openReader(open.dataset.sgOpen, { inOverlay: !!readerOpenId });
        return;
      }

      const filt = e.target.closest("[data-sg-filter]");
      if (filt) {
        guideFilter = filt.dataset.sgFilter || "all";
        renderSection();
        return;
      }

      const tip = e.target.closest("[data-sg-tip]");
      if (tip) {
        const [gid, idx] = (tip.dataset.sgTip || "").split(":");
        const done = toggleTip(gid, parseInt(idx, 10));
        tip.classList.toggle("done", done);
        tip.setAttribute("aria-checked", done ? "true" : "false");
        const prog = tip.closest(".sg-reader-tips")?.querySelector(".sg-tips-progress");
        if (prog) {
          const items = tip.closest(".sg-tips-list")?.querySelectorAll(".sg-tip-item") || [];
          const n = [...items].filter(b => b.classList.contains("done")).length;
          prog.textContent = `${n}/${items.length} done`;
        }
        return;
      }

      const copy = e.target.closest("[data-sg-copy]");
      if (copy) {
        const url = copy.dataset.sgCopy;
        if (url && navigator.clipboard) {
          navigator.clipboard.writeText(url).then(() => showToast("Link copied"));
        }
        return;
      }

      const share = e.target.closest("[data-sg-share]");
      if (share) { shareGuide(share.dataset.sgShare); return; }

      if (e.target.closest("#sgOverlayClose") || e.target.closest("#sgOverlayScrim")) {
        closeReader();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && readerOpenId) { closeReader(); return; }
      const open = e.target.closest && e.target.closest("[data-sg-open]");
      if (open && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        openReader(open.dataset.sgOpen, { inOverlay: !!readerOpenId });
      }
    });

    function syncFromHash() {
      const id = parseGuideHash();
      if (id) {
        const hit = guidesCache.find(g => g.id === id);
        if (hit) openReader(id, { fromHash: true });
        else {
          history.replaceState(null, "", location.pathname + location.search + "#guides");
          const mount = $("skyGuidesWrap");
          if (mount) mount.scrollIntoView({ block: "start" });
          showToast("Guide not found — browse the catalogue below");
          if (readerOpenId) closeReader({ fromHash: true });
        }
      } else if (readerOpenId) closeReader({ fromHash: true });
    }

    window.addEventListener("popstate", syncFromHash);
    window.addEventListener("hashchange", syncFromHash);
  }

  async function init() {
    const mount = $("skyGuidesWrap");
    const gridOut = $("skyGuidesOut");
    if (!mount) return;
    sectionMode = mount.dataset.sgMode === "teaser" ? "teaser" : "full";
    wireEvents();
    if (gridOut) gridOut.innerHTML = '<p class="sg-loading" role="status">Loading sky guides…</p>';
    try {
      const res = await fetch("data/sky_guides.json");
      if (!res.ok) throw new Error("HTTP " + res.status);
      catalog = await res.json();
      guidesCache = (catalog.stories || []).map(enrichGuide);
      const featId = featuredForMonth(new Date().getMonth());
      guidesFeatured = guidesCache.find(g => g.id === featId) || guidesCache[0];
      renderSection();
      document.dispatchEvent(new CustomEvent("ap-sky-guides-ready"));
      const deep = parseGuideHash();
      if (deep) {
        const hit = guidesCache.find(g => g.id === deep);
        if (hit) openReader(deep, { fromHash: true });
        else {
          history.replaceState(null, "", location.pathname + location.search + "#guides");
          mount.scrollIntoView({ block: "start" });
          showToast("Guide not found — browse the catalogue below");
        }
      }
    } catch (e) {
      console.info("Sky Guides:", e.message);
      if (gridOut) {
        gridOut.innerHTML = '<div class="sg-empty">Could not load guides. <button type="button" class="sg-reset" onclick="location.reload()">Retry</button></div>';
      }
      mount.hidden = false;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.SkyGuides = { openReader, closeReader, renderSection };
})();