/* Astro Precise — <space-ambience> living backdrop.
 * Computed drifting starfield on a fixed 2D canvas behind page content. */
(function () {
  'use strict';
  if (customElements.get('space-ambience')) return;
  var C = function () { return Reflect.construct(HTMLElement, [], C); };
  C.prototype = Object.create(HTMLElement.prototype, { constructor: { value: C } });
  Object.setPrototypeOf(C, HTMLElement);
  C.prototype.connectedCallback = function () {
    if (this._init) return; this._init = true;
    var self = this;
    this.setAttribute('aria-hidden', 'true');
    this.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;display:block';
    var cv = document.createElement('canvas');
    cv.style.cssText = 'width:100%;height:100%;display:block';
    this.appendChild(cv);
    var ctx = cv.getContext('2d');
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var density = +(this.getAttribute('density') || 220);
    var stars = [], W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() {
      W = self.clientWidth || innerWidth; H = self.clientHeight || innerHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = [];
      var n = Math.round(density * Math.min(1.6, W * H / 900000));
      for (var i = 0; i < n; i++) stars.push({
        x: Math.random() * W, y: Math.random() * H,
        z: 0.25 + Math.random() * 0.75,
        tw: Math.random() * 6.28, ts: 0.4 + Math.random() * 1.1,
        blue: Math.random() > 0.72
      });
    }
    size();
    var ro = new ResizeObserver(size); ro.observe(this); this._ro = ro;
    var meteor = null, nextMeteor = performance.now() + 9000;
    var last = 0;
    function frame(now) {
      self._raf = requestAnimationFrame(frame);
      if (document.hidden || now - last < 33) return;
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        if (!reduced) {
          s.x -= s.z * 2.2 * dt; s.y += s.z * 0.5 * dt;
          if (s.x < -2) { s.x = W + 2; s.y = Math.random() * H; }
          if (s.y > H + 2) { s.y = -2; }
          s.tw += s.ts * dt;
        }
        var a = 0.28 + s.z * 0.42 + (reduced ? 0 : Math.sin(s.tw) * 0.14);
        ctx.globalAlpha = Math.max(0.08, a);
        ctx.fillStyle = s.blue ? '#c9ddff' : '#e9f0f6';
        var r = s.z * 1.25;
        ctx.fillRect(s.x - r / 2, s.y - r / 2, r, r);
      }
      if (!reduced) {
        if (!meteor && now > nextMeteor) {
          meteor = { x: Math.random() * W * 0.8 + W * 0.1, y: Math.random() * H * 0.3, vx: (Math.random() - 0.3) * 420, vy: 300 + Math.random() * 200, life: 0 };
        }
        if (meteor) {
          meteor.life += dt; meteor.x += meteor.vx * dt; meteor.y += meteor.vy * dt;
          var op = Math.max(0, 0.8 * (1 - meteor.life / 0.9));
          ctx.globalAlpha = op; ctx.strokeStyle = '#cfe0ff'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(meteor.x, meteor.y);
          ctx.lineTo(meteor.x - meteor.vx * 0.09, meteor.y - meteor.vy * 0.09); ctx.stroke();
          if (meteor.life > 1) { meteor = null; nextMeteor = now + 8000 + Math.random() * 14000; }
        }
      }
      ctx.globalAlpha = 1;
      if (reduced) { cancelAnimationFrame(self._raf); }
    }
    this._raf = requestAnimationFrame(frame);
  };
  C.prototype.disconnectedCallback = function () {
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._ro) this._ro.disconnect();
  };
  customElements.define('space-ambience', C);
})();
