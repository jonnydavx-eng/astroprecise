from pathlib import Path
p = Path(r"C:\Users\jonny\OneDrive\astroprecise\website\css\ap-phone-pass.css")
p.write_text("""/* Phone pass 14 Aug 2026 — size, tap, overflow, 3D stage height only.
   No colour, wordmark, UTC, or WebGL engine changes. */

@media (max-width: 980px) {
  /* Readable body / paragraphs. Micro chrome (eyebrows, hints, timecodes) stays. */
  p:not(.eyebrow):not(.ap-live-eyebrow):not(.ap-model-hint):not(.sr-only):not(.navbar__drawer-heading):not(.navbar__more-label):not(.ap-shop-kicker):not(.chart-hero__eyebrow):not(.chart-hero__timecode):not(.chart-form__progress):not(.ap-eclipse-live__time):not(.ap-panel-label):not(.ap-live-proof):not(.form-label):not(.chart-form__time-label):not(.tn-hero__eyebrow):not(.ap-legal-links):not(.ap-guide-links),
  main li,
  .ap-live-copy,
  .standfirst,
  .tn-hero__sub,
  .tn-section__sub,
  .tn-locator__status,
  .tn-awaiting,
  .tn-honesty,
  .form-hint,
  .ap-angles-note,
  .ap-zone-note,
  .ap-shop-status,
  .ap-eclipse-contact__note,
  .ap-email-cta__hint,
  .ap-angles ol,
  .ap-ledger p,
  .ap-site-footer p,
  .ap-site-footer__brand p,
  .ap-shop-card li,
  .ap-edition li {
    font-size: 16px !important;
    line-height: 1.5;
  }

  input:not([type='hidden']):not([type='checkbox']):not([type='radio']):not([type='range']),
  select,
  textarea {
    font-size: 16px !important;
    max-width: 100%;
    box-sizing: border-box;
  }

  /* 44px tap floor for the controls that measured short. */
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
  .ap-city-item {
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

  /* Stage must keep a real phone height. Do not touch the WebGL engine. */
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

  /* Tonight header used contain:layout which can trap the fixed drawer. */
  body:has(.tn-hero) .site-header {
    contain: none;
    overflow: visible;
  }
}
""", encoding="utf-8")
print("rewrote phone-pass css", p.stat().st_size)
