from pathlib import Path

root = Path(r"C:\Users\jonny\OneDrive\astroprecise")
web = root / "website"

css = r"""/* Phone pass 14 Aug 2026 — 390x844 Act 1.
   Type floor, 44px taps, stage height, overflow, ember primaries.
   Does not swap WebGL for 2D. */

@media (max-width: 980px) {
  .logo-text,
  .navbar__logo {
    white-space: nowrap;
  }

  p:not(.eyebrow):not(.ap-live-eyebrow):not(.ap-model-hint):not(.sr-only):not(.navbar__drawer-heading):not(.navbar__more-label):not(.ap-shop-kicker):not(.chart-hero__eyebrow):not(.chart-hero__timecode):not(.chart-form__progress):not(.ap-eclipse-live__time):not(.ap-panel-label):not(.ap-live-proof):not(.form-label):not(.chart-form__time-label):not(.tn-hero__eyebrow):not(.ap-legal-links):not(.ap-guide-links),
  main li,
  .ap-live-copy,
  .standfirst,
  .tn-hero__sub,
  .tn-section__sub,
  .tn-locator__status,
  .tn-awaiting,
  .form-hint,
  .ap-angles ol,
  .ap-ledger p,
  .ap-site-footer p,
  .ap-site-footer__brand p {
    font-size: 16px;
    line-height: 1.5;
  }

  .ap-live-home #dock button,
  .ap-live-home #mladder button,
  .ap-live-home .ap-orrery-cosmic-flight,
  .ap-control-note,
  .ap-model-hint,
  .ap-model-status,
  .ap-live-home .ap-flight-launch span,
  .ap-ledger > span {
    font-size: 11px;
    line-height: 1.35;
  }

  input:not([type='hidden']):not([type='checkbox']):not([type='radio']):not([type='range']),
  select,
  textarea {
    font-size: 16px;
    max-width: 100%;
    box-sizing: border-box;
  }

  #ap-cosmic-flight-launch,
  .ap-orrery-cosmic-flight,
  .ap-award-511 .ap-orrery-cosmic-flight,
  .ap-ab button,
  #keep-sky,
  .ap-keep-row .btn-invite,
  .ap-live-home #dock button,
  .ap-live-home #mladder button,
  .navbar__mobile-menu .navbar__link,
  .navbar__toggle,
  .tn-btn,
  .ap-city-item,
  .ap-eclipse-live__button,
  .ap-eclipse-live__lens-button {
    min-width: 44px !important;
    min-height: 44px !important;
    box-sizing: border-box;
  }

  .ap-ab button,
  #keep-sky,
  .ap-keep-row .btn-invite,
  .ap-orrery-cosmic-flight {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .ap-model-stage,
  .ap-eclipse-live__stage {
    min-height: 360px;
  }
  .ap-room-sky {
    height: min(50svh, 480px);
    min-height: 360px;
  }
  .ap-room-sky .ap-model-stage {
    min-height: 360px;
  }

  .btn-primary,
  .btn--primary,
  .ap-action--primary,
  .tn-btn--primary {
    background: #FF6428;
    color: #170702;
    border-color: #FF6428;
  }

  body:has(.tn-hero) .site-header {
    contain: none;
    overflow: visible;
  }
}
"""
(web / "css" / "ap-phone-pass.css").write_text(css, encoding="utf-8", newline="\n")
print("wrote phone-pass css")

sw = web / "sw.js"
s = sw.read_text(encoding="utf-8")
s2 = s.replace('const V = "ap-v860"', 'const V = "ap-v858"').replace('const V = "ap-v859"', 'const V = "ap-v858"')
if 'const V = "ap-v858"' not in s2:
    raise SystemExit("SW replace failed")
sw.write_text(s2, encoding="utf-8", newline="\n")
print("sw -> 858")

eh = web / "eclipse.html"
et = eh.read_text(encoding="utf-8")
old = "No account · no birth data is sent · historical time-zone rules are applied · manual entry has no location, so angles require a saved full chart · if time is unknown, Moon contacts are withheld"
new = "No account · birth date and time stay here · a place search sends only the town name to a public geocoder · historical time-zone rules are applied · manual entry has no location, so angles require a saved full chart · if time is unknown, Moon contacts are withheld"
if old not in et:
    print("eclipse note marker missing")
else:
    eh.write_text(et.replace(old, new, 1), encoding="utf-8", newline="\n")
    print("eclipse note honest")

cp = web / "js" / "chart-page.js"
ct = cp.read_text(encoding="utf-8")
old = "    const name = document.getElementById('name-input').value.trim() || 'Birth Chart';"
new = "    const nameEl = document.getElementById('name-input');\n    const name = ((nameEl && nameEl.value) || '').trim() || 'Birth Chart';"
if old not in ct:
    print("chart-page name marker missing")
else:
    cp.write_text(ct.replace(old, new, 1), encoding="utf-8", newline="\n")
    print("chart-page name guard")

ec = web / "js" / "ap-eclipse-contact-v835.js"
etj = ec.read_text(encoding="utf-8")
old = "function manualNatal(engine) {\n  const dateValue = byId('dob').value;\n  const timeValue = byId('tob').value;\n  const zone = ((byId('tz') || {}).value || '').trim();\n  if (!dateValue) throw new Error('Enter a birth date or use a saved chart.');"
new = "function manualNatal(engine) {\n  const dob = byId('dob');\n  const tob = byId('tob');\n  const dateValue = dob ? dob.value : '';\n  const timeValue = tob ? tob.value : '';\n  const zone = ((byId('tz') || {}).value || '').trim();\n  if (!dateValue) throw new Error('Enter a birth date or use a saved chart.');"
if old not in etj:
    print("eclipse contact marker missing")
else:
    ec.write_text(etj.replace(old, new, 1), encoding="utf-8", newline="\n")
    print("eclipse contact guard")

ch = web / "chart.html"
cht = ch.read_text(encoding="utf-8")
if "window.AP_ASSET_V='838'" in cht:
    ch.write_text(cht.replace("window.AP_ASSET_V='838'", "window.AP_ASSET_V='858'", 1), encoding="utf-8", newline="\n")
    print("chart AP_ASSET_V 838->858")
else:
    print("chart AP_ASSET_V already", [ln.strip() for ln in cht.splitlines() if "AP_ASSET_V" in ln][:2])

tn = web / "css" / "tonight-page.css"
tt = tn.read_text(encoding="utf-8")
if "background: #6AB0FF;" in tt:
    tn.write_text(tt.replace("background: #6AB0FF;", "background: #FF6428;", 1), encoding="utf-8", newline="\n")
    print("tonight primary ember")
else:
    print("tonight blue already gone")

home = web / "css" / "ap-home-v835.css"
ht = home.read_text(encoding="utf-8")
old = ".ap-live-home #mladder button,\n.ap-live-home #dock button { min-height: 40px; padding: 7px 8px; font-size: 8px; letter-spacing: .045em; }"
new = ".ap-live-home #mladder button,\n.ap-live-home #dock button { min-height: 44px; padding: 7px 8px; font-size: 11px; letter-spacing: .045em; }"
if old in ht:
    home.write_text(ht.replace(old, new, 1), encoding="utf-8", newline="\n")
    print("home dock 44/11")
else:
    print("home dock marker missing")

print("DONE")
