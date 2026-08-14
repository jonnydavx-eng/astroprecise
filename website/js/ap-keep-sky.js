/* Keep this sky — one local PNG of the current 3D view. No account. No SKU. */
(function () {
  'use strict';

  function filename() {
    return 'astroprecise-sky.png';
  }

  function keep() {
    var orr = document.getElementById('orr');
    var btn = document.getElementById('keep-sky');
    if (!orr || typeof orr.captureStill !== 'function') {
      if (btn) btn.textContent = 'Sky not ready';
      return;
    }
    var still = orr.captureStill();
    if (!still || !still.toBlob) {
      if (btn) btn.textContent = 'Could not keep this sky';
      return;
    }
    still.toBlob(function (blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename();
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      if (btn) {
        var old = btn.textContent;
        btn.textContent = 'Saved on this device';
        setTimeout(function () { btn.textContent = old; }, 1800);
      }
    }, 'image/png');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('keep-sky');
    if (btn) btn.addEventListener('click', keep);
  });
})();
