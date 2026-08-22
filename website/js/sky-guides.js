"use strict";
/* Sky Guides — editorial section (Travel Radar parity for Astro Precise) */

(function () {
  const TIPS_KEY = "ap_guide_tips_done";
  // Theme names are stable content aliases; every painted gradient uses the
  // cool-spectrum Midnight Meridian system regardless of its legacy key.
  const THEME_GRADS = {
    gold: "radial-gradient(ellipse 120% 80% at 18% 22%, rgba(139,169,255,0.28) 0%, transparent 55%), linear-gradient(135deg, #A897FF 0%, #8BA9FF 24%, #79C7F2 50%, #17263B 82%, #040812 100%)",
    meridian: "radial-gradient(ellipse 100% 70% at 82% 18%, rgba(121,199,242,0.28) 0%, transparent 50%), linear-gradient(135deg, #A5BCFF 0%, #8BA9FF 32%, #A897FF 60%, #0A1424 100%)",
    silver: "radial-gradient(ellipse 90% 65% at 12% 78%, rgba(238,244,250,0.2) 0%, transparent 48%), linear-gradient(135deg, #C9D6E3 0%, #EEF4FA 34%, #93A8BF 68%, #0A1424 100%)",
    violet: "radial-gradient(ellipse 110% 75% at 70% 30%, rgba(168,151,255,0.34) 0%, transparent 52%), linear-gradient(135deg, #A897FF 0%, #8BA9FF 38%, #79C7F2 64%, #101D30 100%)",
    rose: "radial-gradient(ellipse 95% 68% at 24% 72%, rgba(255,142,168,0.3) 0%, transparent 50%), linear-gradient(135deg, #FF8EA8 0%, #A897FF 32%, #8BA9FF 58%, #101D30 100%)",
    indigo: "radial-gradient(ellipse 100% 72% at 88% 42%, rgba(139,169,255,0.3) 0%, transparent 48%), linear-gradient(135deg, #17263B 0%, #8BA9FF 40%, #A897FF 68%, #040812 100%)",
    coral: "radial-gradient(ellipse 105% 70% at 16% 38%, rgba(255,142,168,0.3) 0%, transparent 50%), linear-gradient(135deg, #FF8EA8 0%, #A897FF 38%, #79C7F2 64%, #EEF4FA 100%)",
    dusk: "radial-gradient(ellipse 120% 80% at 50% 12%, rgba(168,151,255,0.24) 0%, transparent 55%), linear-gradient(135deg, #0A1424 0%, #17263B 36%, #A897FF 62%, #040812 100%)",
    sage: "radial-gradient(ellipse 90% 65% at 78% 68%, rgba(111,208,179,0.28) 0%, transparent 48%), linear-gradient(135deg, #6FD0B3 0%, #79C7F2 36%, #8BA9FF 62%, #040812 100%)",
    slate: "radial-gradient(ellipse 100% 72% at 22% 28%, rgba(147,168,191,0.26) 0%, transparent 50%), linear-gradient(135deg, #17263B 0%, #93A8BF 38%, #8BA9FF 65%, #040812 100%)",
    air: "radial-gradient(ellipse 110% 75% at 62% 22%, rgba(121,199,242,0.3) 0%, transparent 52%), linear-gradient(135deg, #79C7F2 0%, #A5BCFF 40%, #A897FF 66%, #EEF4FA 100%)",
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

  function safeHistoryUrl(hash) {
    const incoming = new URLSearchParams(location.search || "");
    const kept = new URLSearchParams();
    ["nosw", "lite"].forEach(key => {
      if (incoming.get(key) === "1") kept.set(key, "1");
    });
    return location.pathname + (kept.toString() ? "?" + kept.toString() : "") + (hash || "");
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
    const url = safeHistoryUrl("#" + hash);
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
          history.replaceState(null, "", safeHistoryUrl("#guides"));
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
          history.replaceState(null, "", safeHistoryUrl("#guides"));
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
