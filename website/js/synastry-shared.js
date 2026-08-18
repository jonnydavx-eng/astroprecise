/* ═══════════════════════════════════════════════════════════════════════════
 * synastry-shared.js — window.APSynastry
 * Shared, honest synastry helpers used by BOTH compatibility.html and the
 * homepage Couples tool, so the two never diverge.
 *
 * The headline of a compatibility reading is a CHARACTER LABEL derived from the
 * balance of the REAL measured inter-chart aspects (how many bring ease vs
 * friction) — deliberately NOT a fabricated percentage. The old headline %
 * (element-matrix + sine jitter) overclaimed a precision synastry does not have.
 *
 * (buildChart/localToUT are lifted here from compatibility-page.js so the
 *  homepage can cast two charts without duplicating local→UT logic.)
 * ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var HARMONIOUS = { trine: 1, sextile: 1, conjunction: 1 };

  // Weighted tally of harmonious vs dynamic contacts. Tighter orbs count more.
  function harmonyStats(aspects) {
    var harmonious = 0, dynamic = 0, total = 0, hCount = 0, dCount = 0;
    (aspects || []).forEach(function (a) {
      var name = String(a.aspect || '').toLowerCase();
      var isHarm = a.harmony ? a.harmony === 'harmonious' : !!HARMONIOUS[name];
      var orb = parseFloat(a.orb);
      if (isNaN(orb)) orb = 4;
      var w = Math.max(0.5, 1.6 - orb / 8);   // tighter orb → heavier weight
      total += w;
      if (isHarm) { harmonious += w; hCount++; } else { dynamic += w; dCount++; }
    });
    var count = (aspects || []).length;
    return {
      harmonious: harmonious, dynamic: dynamic, total: total,
      harmoniousCount: hCount, dynamicCount: dCount, count: count,
      ratio: total > 0 ? harmonious / total : 0.5
    };
  }

  // Qualitative character band from the aspect balance — NO percentage.
  // tone drives colour: 'harmony' | 'neutral' | 'tension'.
  function character(result) {
    var aspects = (result && result.synastryAspects) || [];
    var s = harmonyStats(aspects);
    if (s.count < 3) {
      return { label: 'Independent Orbits', tone: 'neutral', stats: s,
        blurb: 'Few close contacts between your two charts — a connection with plenty of room to define itself.' };
    }
    if (s.ratio >= 0.66) return { label: 'Natural Harmony', tone: 'harmony', stats: s,
      blurb: 'The measured aspects between your charts lean strongly toward ease and mutual support.' };
    if (s.ratio >= 0.54) return { label: 'Warm Balance', tone: 'harmony', stats: s,
      blurb: 'More flowing contacts than friction — an easy connection with a few honest growth edges.' };
    if (s.ratio >= 0.44) return { label: 'Dynamic Balance', tone: 'neutral', stats: s,
      blurb: 'A near-even mix of ease and friction — engaging, with real things to work on together.' };
    if (s.ratio >= 0.32) return { label: 'Growth Through Friction', tone: 'tension', stats: s,
      blurb: 'More challenging contacts than flowing ones — intense, and rich in growth if you both lean in.' };
    return { label: 'Fierce Chemistry', tone: 'tension', stats: s,
      blurb: 'Mostly dynamic contacts — magnetic and demanding; here, the friction is the point.' };
  }

  window.APSynastry = window.APSynastry || {};
  window.APSynastry.harmonyStats = harmonyStats;
  window.APSynastry.character = character;
})();
