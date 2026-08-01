/* Void Orrery — live schematic solar system + ephemeris utilities */
(function () {
  if (window.VoidEphem) return;
  var J2000 = 2451545.0, DEG = Math.PI / 180;
  var SIGNS = [["Aries","♈\uFE0E"],["Taurus","♉\uFE0E"],["Gemini","♊\uFE0E"],["Cancer","♋\uFE0E"],["Leo","♌\uFE0E"],["Virgo","♍\uFE0E"],["Libra","♎\uFE0E"],["Scorpio","♏\uFE0E"],["Sagittarius","♐\uFE0E"],["Capricorn","♑\uFE0E"],["Aquarius","♒\uFE0E"],["Pisces","♓\uFE0E"]];
  var P = [
    { key:"mercury", name:"Mercury", glyph:"☿", a:0.387, L0:252.2509, rate:149472.6747, size:0.38, color:0x9b9187, c2:"#6e675f", band:0, kind:"cratered", tilt:0.03, spin:0.00005 },
    { key:"venus",   name:"Venus",   glyph:"♀", a:0.723, L0:181.9798, rate:58517.8156,  size:0.95, color:0xd9bd8f, c2:"#b09468", band:0.35, kind:"venus", tilt:177, spin:-0.00002 },
    { key:"earth",   name:"Earth",   glyph:"♁", a:1.000, L0:100.4644, rate:35999.3720,  size:1.00, color:0x4a7fd9, c2:"#2c5a9e", band:0, tex:"earth", tilt:23.4, spin:0.003 },
    { key:"mars",    name:"Mars",    glyph:"♂", a:1.524, L0:355.4473, rate:19140.3027,  size:0.53, color:0xc1633e, c2:"#8f4227", band:0.2, kind:"mars", tilt:25.2, spin:0.0029 },
    { key:"jupiter", name:"Jupiter", glyph:"♃", a:5.203, L0:34.3964,  rate:3034.7462,   size:3.20, color:0xc9a97e, c2:"#9d7d54", band:0.9, kind:"gas", tilt:3.1, spin:0.0073 },
    { key:"saturn",  name:"Saturn",  glyph:"♄", a:9.537, L0:49.9542,  rate:1222.4939,   size:2.80, color:0x9fdcec, c2:"#ab9468", band:0.7, kind:"gas", rings:true, tilt:26.7, spin:0.0067 },
    { key:"uranus",  name:"Uranus",  glyph:"♅", a:19.191, L0:313.2381, rate:428.4820,   size:1.90, color:0x9fd4d9, c2:"#6fa9b0", band:0.25, kind:"ice", tilt:97.8, spin:0.0042 },
    { key:"neptune", name:"Neptune", glyph:"♆", a:30.069, L0:304.8800, rate:218.4620,   size:1.85, color:0x5f7fd9, c2:"#3e57a5", band:0.35, kind:"ice", tilt:28.3, spin:0.0045 },
    { key:"pluto",   name:"Pluto",   glyph:"♇", a:39.482, L0:238.9295, rate:145.1780,  size:0.19, color:0xbfa792, c2:"#8a7660", band:0, kind:"cratered", tilt:119.6, spin:0.0005 }
  ];
  function norm(x) { x %= 360; return x < 0 ? x + 360 : x; }
  function jd(d) { return d.getTime() / 86400000 + 2440587.5; }
  function dateOf(j) { return new Date((j - 2440587.5) * 86400000); }
  function helioLon(p, j) { return norm(p.L0 + p.rate * ((j - J2000) / 36525)); }
  function helioXY(p, j) { var l = helioLon(p, j) * DEG; return [p.a * Math.cos(l), p.a * Math.sin(l)]; }
  function geoLon(p, j) { var e = helioXY(P[2], j), v = helioXY(p, j); return norm(Math.atan2(v[1] - e[1], v[0] - e[0]) / DEG); }
  function sunLon(j) { var dd = j - J2000; var g = (357.529 + 0.98560028 * dd) * DEG; return norm(helioLon(P[2], j) + 180 + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)); }
  function moonLon(j) { var dd = j - J2000; var M = (134.963 + 13.064993 * dd) * DEG; return norm(218.316 + 13.176396 * dd + 6.289 * Math.sin(M)); }
  function distAU(p, j) { var e = helioXY(P[2], j), v = helioXY(p, j); return Math.hypot(v[0] - e[0], v[1] - e[1]); }
  function sign(l) { l = norm(l); var i = Math.floor(l / 30); return { name: SIGNS[i][0], glyph: SIGNS[i][1], deg: Math.floor(l % 30), min: Math.round((l % 1) * 60) % 60 }; }
  function moonPhase(j) {
    var age = ((j - 2451550.1) % 29.530588 + 29.530588) % 29.530588;
    var illum = (1 - Math.cos(2 * Math.PI * age / 29.530588)) / 2;
    var name = age < 1.85 ? "New Moon" : age < 5.54 ? "Waxing Crescent" : age < 9.23 ? "First Quarter" : age < 12.91 ? "Waxing Gibbous" : age < 16.61 ? "Full Moon" : age < 20.3 ? "Waning Gibbous" : age < 23.99 ? "Last Quarter" : age < 27.68 ? "Waning Crescent" : "New Moon";
    var toFull = (14.765 - age + 29.530588) % 29.530588;
    return { age: age, illum: illum, name: name, daysToFull: toFull };
  }
  function positions(d) {
    var j = jd(d), rows = [];
    rows.push({ key: "sun", name: "Sun", glyph: "☉\uFE0E", lon: sunLon(j), sign: sign(sunLon(j)), dist: distAU ? Math.hypot.apply(null, helioXY(P[2], j)) : 1, retro: false });
    rows.push({ key: "moon", name: "Moon", glyph: "☽\uFE0E", lon: moonLon(j), sign: sign(moonLon(j)), dist: 0.00257, retro: false });
    for (var i = 0; i < P.length; i++) {
      var p = P[i]; if (p.key === "earth") continue;
      var glyphFixed = { mercury: "☿\uFE0E", venus: "♀\uFE0E", earth: "♁\uFE0E", mars: "♂\uFE0E", jupiter: "♃\uFE0E", saturn: "♄\uFE0E", uranus: "♅\uFE0E", neptune: "♆\uFE0E", pluto: "♇\uFE0E" };
      var l2 = geoLon(p, j), l22 = geoLon(p, j + 1);
      var diff = ((l22 - l2 + 540) % 360) - 180;
      rows.push({ key: p.key, name: p.name, glyph: glyphFixed[p.key] || p.glyph, lon: l2, sign: sign(l2), dist: distAU(p, j), retro: diff < 0 });
    }
    return { jd: j, rows: rows, moon: moonPhase(j) };
  }
  window.VoidEphem = { J2000: J2000, SIGNS: SIGNS, PLANETS: P, jd: jd, dateOf: dateOf, helioLon: helioLon, geoLon: geoLon, sunLon: sunLon, moonLon: moonLon, sign: sign, distAU: distAU, moonPhase: moonPhase, positions: positions, norm: norm };
  var EPS = 23.4393 * DEG;
  function altAz(lamDeg, j, latD, lonD) {
    var l = lamDeg * DEG;
    var dec = Math.asin(Math.sin(EPS) * Math.sin(l));
    var ra = Math.atan2(Math.cos(EPS) * Math.sin(l), Math.cos(l));
    var lst = norm(280.46061837 + 360.98564736629 * (j - J2000) + lonD) * DEG;
    var H = lst - ra;
    var phi = latD * DEG;
    var alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
    var az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)) + Math.PI;
    return { alt: alt, az: az };
  }

  if (customElements.get("void-orrery")) return;
  var R = function (a) { return 30 * Math.pow(a, 0.42); };
  var SZ = function (p) { return p.size * 1.15 + 1.5; };

  function hex2rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function planetTexture(p) {
    var W = 512, H = 256, cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d");
    var base = hex2rgb("#" + p.color.toString(16).padStart(6, "0")), dark = hex2rgb(p.c2);
    var ph1 = Math.random() * 9, ph2 = Math.random() * 9;
    for (var y = 0; y < H; y++) {
      var t = y / H;
      var b = p.kind === "gas" ? (Math.sin(t * 34 + ph1) * 0.5 + Math.sin(t * 13 + ph2) * 0.35 + Math.sin(t * 71) * 0.15) :
              p.kind === "ice" ? Math.sin(t * 9 + ph1) * 0.5 : 0;
      var amt = (p.band || 0) * 0.4 * b;
      var limb = 1 - Math.pow(Math.abs(t - 0.5) * 2, 3) * 0.55;
      ctx.fillStyle = "rgb(" + ((base[0] * (1 + amt) * limb) | 0) + "," + ((base[1] * (1 + amt * 0.8) * limb) | 0) + "," + ((base[2] * (1 + amt * 0.6) * limb) | 0) + ")";
      ctx.fillRect(0, y, W, 1);
    }
    if (p.kind === "gas" || p.kind === "ice") {
      for (var s = 0; s < 46; s++) {
        ctx.globalAlpha = 0.05 + Math.random() * 0.07;
        ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "rgb(" + dark.join(",") + ")";
        ctx.beginPath(); ctx.ellipse(Math.random() * W, Math.random() * H, 60 + Math.random() * 260, 2 + Math.random() * 5, 0, 0, 7); ctx.fill();
      }
    }
    if (p.key === "jupiter") {
      ctx.globalAlpha = 0.85; ctx.fillStyle = "#b3502e";
      ctx.beginPath(); ctx.ellipse(W * 0.68, H * 0.63, 30, 13, 0, 0, 7); ctx.fill();
      ctx.globalAlpha = 0.5; ctx.strokeStyle = "#d8825d"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(W * 0.68, H * 0.63, 36, 17, 0, 0, 7); ctx.stroke();
    }
    if (p.kind === "mars") {
      for (var m2 = 0; m2 < 9; m2++) {
        ctx.globalAlpha = 0.14 + Math.random() * 0.1; ctx.fillStyle = "#5c3120";
        ctx.beginPath(); ctx.ellipse(Math.random() * W, H * (0.3 + Math.random() * 0.4), 40 + Math.random() * 90, 14 + Math.random() * 26, Math.random(), 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 0.9; ctx.fillStyle = "#f4ece2";
      ctx.beginPath(); ctx.ellipse(W * 0.5, 4, 150, 14, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(W * 0.5, H - 4, 130, 11, 0, 0, 7); ctx.fill();
    }
    if (p.kind === "cratered") {
      for (var c2 = 0; c2 < 110; c2++) {
        var cx2 = Math.random() * W, cy2 = Math.random() * H, cr = 1.5 + Math.random() * 7;
        ctx.globalAlpha = 0.16 + Math.random() * 0.14; ctx.fillStyle = "rgb(" + dark.join(",") + ")";
        ctx.beginPath(); ctx.arc(cx2, cy2, cr, 0, 7); ctx.fill();
        ctx.globalAlpha = 0.12; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx2, cy2 - 0.8, cr, 0, 7); ctx.stroke();
      }
    }
    if (p.kind === "venus") {
      for (var v2 = 0; v2 < 26; v2++) {
        ctx.globalAlpha = 0.05 + Math.random() * 0.05; ctx.strokeStyle = Math.random() > 0.5 ? "#fff8ea" : "#a8845a";
        ctx.lineWidth = 4 + Math.random() * 9;
        var vy = Math.random() * H;
        ctx.beginPath(); ctx.moveTo(0, vy);
        ctx.bezierCurveTo(W * 0.3, vy + 30 * (Math.random() - 0.5), W * 0.7, vy - 30 * (Math.random() - 0.5), W, vy + 16 * (Math.random() - 0.5));
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    var tx = srgbTex(new THREE.CanvasTexture(cv)); tx.anisotropy = 4; return tx; // sRGB-authored
  }
  function ringTexture() {
    var cv = document.createElement("canvas"); cv.width = 512; cv.height = 4;
    var ctx = cv.getContext("2d");
    for (var x = 0; x < 512; x++) {
      var r = x / 512;
      var a = 0.75 + 0.25 * Math.sin(r * 90) * Math.sin(r * 33);
      if (r < 0.08) a *= r / 0.08 * 0.4;
      if (r > 0.52 && r < 0.6) a *= 0.12;
      if (r > 0.93) a *= (1 - r) / 0.07;
      var warm = 205 + Math.sin(r * 40) * 14;
      ctx.fillStyle = "rgba(" + (warm | 0) + "," + ((warm * 0.92) | 0) + "," + ((warm * 0.76) | 0) + "," + (a * 0.9).toFixed(3) + ")";
      ctx.fillRect(x, 0, 1, 4);
    }
    return srgbTex(new THREE.CanvasTexture(cv)); // sRGB ring gradient
  }
  function sunTexture() {
    var cv = document.createElement("canvas"); cv.width = 256; cv.height = 128;
    var ctx = cv.getContext("2d");
    ctx.fillStyle = "#ffcf8f"; ctx.fillRect(0, 0, 256, 128);
    for (var i = 0; i < 420; i++) {
      ctx.globalAlpha = 0.05 + Math.random() * 0.06;
      ctx.fillStyle = Math.random() > 0.5 ? "#fff3d8" : "#f0a45a";
      ctx.beginPath(); ctx.arc(Math.random() * 256, Math.random() * 128, 2 + Math.random() * 9, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    return srgbTex(new THREE.CanvasTexture(cv)); // sRGB sun surface
  }
  function glowSprite(colorStops, size) {
    var cv = document.createElement("canvas"); cv.width = cv.height = 128;
    var ctx = cv.getContext("2d");
    var g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    colorStops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    var m = new THREE.SpriteMaterial({ map: srgbTex(new THREE.CanvasTexture(cv)), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    var sp = new THREE.Sprite(m); sp.scale.set(size, size, 1); return sp;
  }
  function atmoShell(r, color, power, intensity) {
    var mat = new THREE.ShaderMaterial({
      uniforms: { c: { value: new THREE.Color(color).convertSRGBToLinear() }, p: { value: power }, s: { value: intensity } },
      vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vec4 wp = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-wp.xyz); gl_Position = projectionMatrix * wp; }",
      fragmentShader: "uniform vec3 c; uniform float p; uniform float s; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), p); gl_FragColor = vec4(c, f * s);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}", // r128 provides these chunks + sRGBToLinear to ShaderMaterial
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });
    return new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), mat);
  }
  function hexA2(hex, a) { var n = parseInt(hex.slice(1), 16); return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }
  // filmic-pipeline helpers: authored colors/textures are sRGB — mark/convert so ACES + sRGB output round-trips the existing look
  function srgbTex(t) { t.encoding = THREE.sRGBEncoding; return t; }
  function srgb2lin(x) { return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }
  function linCols(a) { for (var li = 0; li < a.length; li++) a[li] = srgb2lin(a[li]); return a; }

  var VoidOrrery = /** @class */ (function () {
    function C() { return Reflect.construct(HTMLElement, [], C); }
    C.prototype = Object.create(HTMLElement.prototype, { constructor: { value: C } });
    Object.setPrototypeOf(C, HTMLElement);

    C.observedAttributes = ["motion", "orbits"];
    C.prototype.connectedCallback = function () {
      if (this._init) {
        if (this._raf) cancelAnimationFrame(this._raf);
        if (this._loopFn) this._loopFn();
        return;
      }
      this._init = true;
      this.style.display = "block"; this.style.width = "100%"; this.style.height = "100%"; this.style.position = "relative";
      if (!this._ph) {
        var ph = this._ph = document.createElement("div");
        ph.style.cssText = "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;pointer-events:none";
        ph.innerHTML = '<div style="width:180px;height:180px;border-radius:50%;border:1px solid rgba(159,220,236,.28);box-shadow:inset 0 0 60px rgba(159,220,236,.1)"></div><div style="font:10px/1 IBM Plex Mono,monospace;letter-spacing:.3em;color:rgba(230,234,242,.4)">WAKING THE ENGINE…</div>';
        this.appendChild(ph);
      }
      var self = this;
      if (!window.THREE) {
        if (!window.__threeLoad) window.__threeLoad = new Promise(function (res) {
          var s = document.createElement("script");
          s.src = "./js/vendor/three.r128.min.js"; // self-hosted first — no CDN on the LCP path
          s.onload = res;
          s.onerror = function () {
            var c = document.createElement("script");
            c.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
            c.onload = res; c.onerror = res; document.head.appendChild(c);
          };
          document.head.appendChild(s);
        });
        window.__threeLoad.then(function () {
          if (!self.isConnected || self._renderer) return; // detached, or a second .then attached after reconnect
          if (window.THREE) self._boot(); else self.innerHTML = '<div style="color:#556;padding:40px;font:12px monospace">3D engine unavailable</div>';
        });
        return;
      }
      this._boot();
    };
    C.prototype._boot = function () {
      var self = this;
      if (this._ph) { this._ph.remove(); this._ph = null; }
      this._live = true; this._jd = jd(new Date()); this._scrubJD = null;
      this._disposed = false; this._contextLost = false; // fresh boot — clear teardown/context flags
      var sf = this.getAttribute("start-focus") || this.getAttribute("startfocus");
      var sr = parseFloat(this.getAttribute("start-radius") || this.getAttribute("startradius"));
      this._focus = sf || "earth";
      this._theta = -2.4; this._phi = 0.7;
      this._dTheta = -0.6; this._dPhi = 1.12;
      var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (sf || sr) { this._radius = sr || 44; this._dRadius = sr || 44; this._intro = false; }
      else if (reduced) { this._radius = this._dRadius = 44; this._intro = false; }
      else { this._radius = 210000; this._dRadius = 210000; this._intro = true; }
      this._target = new THREE.Vector3(); this._dTarget = new THREE.Vector3();
      var renderer;
      try {
        renderer = this._renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 2, alpha: false, powerPreference: "high-performance" });
      } catch (e) {
        // WebGL unavailable/blocked — static observatory poster keeps the hero alive; HUD + CTAs sit above.
        this._posterFallback();
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 760 ? 1.5 : 2));
      renderer.domElement.style.display = "block";
      this.appendChild(renderer.domElement);
      this._w = this.clientWidth || 1; this._h = this.clientHeight || 1;
      renderer.setSize(this._w, this._h);
      // filmic output pipeline (constants verified present in the vendored r128 build)
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      // GPU context loss: stop the loop and swap to the same poster used when WebGL is unavailable
      this._onCtxLost = function (e) {
        e.preventDefault(); // allow the browser to attempt a restore
        if (self._contextLost) return;
        self._contextLost = true;
        if (self._raf) { cancelAnimationFrame(self._raf); self._raf = null; }
        self._posterFallback();
      };
      this._onCtxOK = function () { // context restored — full teardown + normal reboot (reuses existing paths)
        if (!self._contextLost || self._disposed || !self.isConnected) return;
        self._teardown();
        self._boot();
      };
      renderer.domElement.addEventListener("webglcontextlost", this._onCtxLost, false);
      renderer.domElement.addEventListener("webglcontextrestored", this._onCtxOK, false);
      var scene = this._scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
      var cam = this._cam = new THREE.PerspectiveCamera(46, 1, 0.1, 600000);
      // stars
      var starGeo = new THREE.BufferGeometry(), pts = [], cols = [];
      for (var i = 0; i < 2800; i++) {
        var r = 550 + Math.random() * 500, t = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
        pts.push(r * Math.sin(ph) * Math.cos(t), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(t));
        var c = 0.6 + Math.random() * 0.4, blue = Math.random() > 0.7 ? 1.12 : 1;
        cols.push(c * 0.92, c * 0.95, Math.min(1, c * blue));
      }
      starGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      starGeo.setAttribute("color", new THREE.Float32BufferAttribute(linCols(cols), 3)); // authored sRGB → linear
      var starMat = new THREE.PointsMaterial({ size: 1.5, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
      scene.add(new THREE.Points(starGeo, starMat));
      var mwGeo = new THREE.BufferGeometry(), mwPts = [], mwCols = [];
      for (var q = 0; q < 4200; q++) {
        var ang = Math.random() * Math.PI * 2;
        var spread = (Math.random() + Math.random() + Math.random() - 1.5) * 0.42;
        var rr2 = 700 + Math.random() * 260;
        var vx = Math.cos(ang), vy = spread, vz = Math.sin(ang);
        var ty = vy * Math.cos(1.1) - vz * Math.sin(1.1), tz = vy * Math.sin(1.1) + vz * Math.cos(1.1);
        mwPts.push(vx * rr2, ty * rr2, tz * rr2);
        var warm = Math.random() > 0.55;
        var b2 = 0.25 + Math.random() * 0.45;
        mwCols.push(b2 * (warm ? 1 : 0.8), b2 * 0.85, b2 * (warm ? 0.72 : 1.05));
      }
      mwGeo.setAttribute("position", new THREE.Float32BufferAttribute(mwPts, 3));
      mwGeo.setAttribute("color", new THREE.Float32BufferAttribute(linCols(mwCols), 3)); // authored sRGB → linear
      var mwMat = new THREE.PointsMaterial({ size: 1.1, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
      scene.add(new THREE.Points(mwGeo, mwMat));
      var ambLight = new THREE.AmbientLight(0x36405c, 0.9); ambLight.color.convertSRGBToLinear(); scene.add(ambLight); // authored sRGB → linear
      var sunLight = new THREE.PointLight(0xfff0d8, 1.7, 0, 2); sunLight.color.convertSRGBToLinear(); scene.add(sunLight); // authored sRGB → linear
      // sun
      var sun = new THREE.Mesh(new THREE.SphereGeometry(6, 48, 32), new THREE.MeshBasicMaterial({ map: sunTexture() }));
      sun.userData.key = "sun"; scene.add(sun);
      sun.add(glowSprite([[0, "rgba(255,220,160,.9)"], [0.25, "rgba(255,190,110,.35)"], [1, "rgba(255,170,80,0)"]], 52));
      var corona = glowSprite([[0, "rgba(255,200,130,.5)"], [0.4, "rgba(255,170,90,.18)"], [1, "rgba(255,150,70,0)"]], 110);
      sun.add(corona);
      this._meshes = { sun: sun }; this._spinners = []; this._cones = []; this._sizes = { sun: 6, moon: 0.72 };
      this._spinners.push({ m: sun, s: 0.00012 });
      // orbits + planets
      this._orbitLines = [];
      var loader = new THREE.TextureLoader(); loader.crossOrigin = "anonymous";
      P.forEach(function (p) {
        var seg = [], rr = R(p.a);
        for (var k = 0; k <= 128; k++) { var an = k / 128 * Math.PI * 2; seg.push(rr * Math.cos(an), 0, -rr * Math.sin(an)); }
        var og = new THREE.BufferGeometry(); og.setAttribute("position", new THREE.Float32BufferAttribute(seg, 3));
        var line = new THREE.Line(og, new THREE.LineBasicMaterial({ color: 0x28324a, transparent: true, opacity: 0.85 }));
        line.material.color.convertSRGBToLinear(); // authored sRGB → linear
        scene.add(line); self._orbitLines.push(line);
        var mat = p.tex === "earth"
          ? new THREE.MeshPhongMaterial({ map: planetTexture(p), specular: 0x223344, shininess: 14 })
          : new THREE.MeshStandardMaterial({ map: planetTexture(p), roughness: 0.92, metalness: 0 });
        var texFile = { mercury: "mercurymap.webp", venus: "venusmap.webp", mars: "marsmap1k.webp", jupiter: "jupitermap.webp", saturn: "saturnmap.webp", uranus: "uranusmap.webp", neptune: "neptunemap.webp" }[p.key];
        if (texFile) loader.load("./img/textures/" + texFile,
          function (t) { t.anisotropy = 8; t.encoding = THREE.sRGBEncoding; mat.map = t; mat.needsUpdate = true; });
        var m = new THREE.Mesh(new THREE.SphereGeometry(SZ(p), 48, 32), mat);
        m.userData.key = p.key;
        var grp = new THREE.Group(); grp.userData.key = p.key;
        grp.rotation.z = (p.tilt || 0) * DEG;
        grp.add(m); scene.add(grp);
        self._meshes[p.key] = grp; self._sizes[p.key] = SZ(p);
        self._spinners.push({ m: m, s: p.spin || 0.0016 });
        var haloTint = { mercury: "#9b9187", venus: "#ffd9a0", mars: "#e0764a", jupiter: "#e8c9a0", saturn: "#eed9ac", uranus: "#a8e2e8", neptune: "#7f9ff0", pluto: "#bfa792" }[p.key];
        if (haloTint) grp.add(glowSprite([[0, hexA2(haloTint, 0)], [0.42, hexA2(haloTint, 0.16)], [0.62, hexA2(haloTint, 0.05)], [1, hexA2(haloTint, 0)]], SZ(p) * 3.4));
        var atmoCfg = { earth: [0x6ea0ff, 3.6, 0.5], venus: [0xffe8c0, 2.6, 0.5], mars: [0xe08050, 3.4, 0.32], jupiter: [0xffd9a8, 3.0, 0.28], saturn: [0xf0e0b8, 3.0, 0.28], uranus: [0xaaf0f0, 3.0, 0.4], neptune: [0x88aaff, 3.0, 0.45] }[p.key];
        if (atmoCfg) grp.add(atmoShell(SZ(p) * 1.04, atmoCfg[0], atmoCfg[1], atmoCfg[2]));
        var cone = new THREE.Mesh(new THREE.ConeGeometry(SZ(p) * 0.26, SZ(p) * 0.78, 8), new THREE.MeshBasicMaterial({ color: 0x5a6f9e, transparent: true, opacity: 0 }));
        cone.material.color.convertSRGBToLinear(); // authored sRGB → linear
        scene.add(cone); self._cones.push({ c: cone, p: p });
        if (p.tex === "earth") {
          var dayT = null, nightT = null;
          var trySwap = function () {
            if (!dayT || !nightT) return;
            m.material = new THREE.ShaderMaterial({
              uniforms: { dayTex: { value: dayT }, nightTex: { value: nightT } },
              vertexShader: "varying vec2 vUv; varying vec3 vN; varying vec3 vP; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vP = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
              fragmentShader: "uniform sampler2D dayTex; uniform sampler2D nightTex; varying vec2 vUv; varying vec3 vN; varying vec3 vP; void main(){ vec3 sunDir = normalize(-vP); float d = dot(normalize(vN), sunDir); float k = smoothstep(-0.12, 0.3, d); vec3 day = sRGBToLinear(texture2D(dayTex, vUv)).rgb; vec3 night = sRGBToLinear(texture2D(nightTex, vUv)).rgb * vec3(1.6, 1.35, 1.0); vec3 col = mix(night * 0.95, day, k); gl_FragColor = vec4(col, 1.0);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}" // r128 ShaderMaterial prefix provides sRGBToLinear + these chunks
            });
          };
          loader.load("./img/textures/earth_atmos_2048.webp",
            function (t) { t.anisotropy = 8; t.encoding = THREE.sRGBEncoding; dayT = t; mat.map = t; mat.needsUpdate = true; trySwap(); });
          loader.load("./img/textures/earth_lights_2048.webp",
            function (t) { t.encoding = THREE.sRGBEncoding; nightT = t; trySwap(); });
          var clouds = new THREE.Mesh(new THREE.SphereGeometry(SZ(p) * 1.02, 48, 32), new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.85, depthWrite: false }));
          clouds.visible = false;
          loader.load("./img/textures/earth_clouds_1024.webp",
            function (t) { t.encoding = THREE.sRGBEncoding; clouds.material.map = t; clouds.material.needsUpdate = true; clouds.visible = true; });
          grp.add(clouds); self._spinners.push({ m: clouds, s: 0.0034 });
          grp.add(glowSprite([[0, "rgba(110,160,255,.16)"], [0.5, "rgba(110,160,255,.05)"], [1, "rgba(110,160,255,0)"]], SZ(p) * 2.9));
        }
        if (p.rings) {
          var inner = SZ(p) * 1.35, outer = SZ(p) * 2.4;
          var rg = new THREE.RingGeometry(inner, outer, 160, 1);
          var rpos = rg.attributes.position, ruv = rg.attributes.uv, v3 = new THREE.Vector3();
          for (var ri = 0; ri < rpos.count; ri++) { v3.fromBufferAttribute(rpos, ri); ruv.setXY(ri, (v3.length() - inner) / (outer - inner), 0.5); }
          var ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ map: ringTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
          ring.rotation.x = Math.PI / 2; grp.add(ring);
        }
      });
      // moon
      // asteroid belt
      function gauss2() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }
      var beltGeo = new THREE.BufferGeometry(), bp = [], bcl = [];
      for (var bi = 0; bi < 2400; bi++) {
        var ba = Math.random() * Math.PI * 2, br = 41.5 + Math.random() * 8 + gauss2() * 1.5;
        bp.push(br * Math.cos(ba), gauss2() * 0.9, -br * Math.sin(ba));
        var bb = 0.35 + Math.random() * 0.4;
        bcl.push(bb, bb * 0.9, bb * 0.78);
      }
      beltGeo.setAttribute("position", new THREE.Float32BufferAttribute(bp, 3));
      beltGeo.setAttribute("color", new THREE.Float32BufferAttribute(linCols(bcl), 3)); // authored sRGB → linear
      var beltMat = new THREE.PointsMaterial({ size: 1.1, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false });
      var belt = new THREE.Points(beltGeo, beltMat); scene.add(belt);
      // comet with anti-sun tail
      var cometHead = glowSprite([[0, "rgba(210,235,255,.95)"], [0.3, "rgba(140,190,255,.4)"], [1, "rgba(140,190,255,0)"]], 7);
      scene.add(cometHead);
      var tailBits = [];
      for (var tb = 0; tb < 30; tb++) { var bit = glowSprite([[0, "rgba(150,200,255,.5)"], [1, "rgba(150,200,255,0)"]], 4); scene.add(bit); tailBits.push(bit); }
      // anamorphic sun streak
      var flare = (function () {
        var cv2 = document.createElement("canvas"); cv2.width = 256; cv2.height = 24;
        var fx = cv2.getContext("2d");
        var g2 = fx.createLinearGradient(0, 0, 256, 0);
        g2.addColorStop(0, "rgba(160,200,255,0)"); g2.addColorStop(0.5, "rgba(255,240,220,.9)"); g2.addColorStop(1, "rgba(160,200,255,0)");
        fx.fillStyle = g2; fx.fillRect(0, 6, 256, 12);
        var m2 = new THREE.SpriteMaterial({ map: srgbTex(new THREE.CanvasTexture(cv2)), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
        var s2 = new THREE.Sprite(m2); s2.scale.set(150, 9, 1); return s2;
      })();
      scene.add(flare);
      var moon = new THREE.Mesh(new THREE.SphereGeometry(0.72, 28, 20), new THREE.MeshStandardMaterial({ color: 0xb8b8b8, roughness: 1 }));
      moon.material.color.convertSRGBToLinear(); // authored sRGB → linear
      moon.userData.key = "moon"; scene.add(moon); this._meshes.moon = moon;
      loader.load("./img/textures/moon_1024.webp",
        function (t) { t.encoding = THREE.sRGBEncoding; moon.material.map = t; moon.material.color.set(0xffffff); moon.material.needsUpdate = true; });
      function ringSprite() {
        var cv = document.createElement("canvas"); cv.width = cv.height = 256;
        var cx = cv.getContext("2d");
        var g = cx.createRadialGradient(128, 128, 0, 128, 128, 128);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(0.42, "rgba(0,0,0,0)");
        g.addColorStop(0.55, "rgba(139,124,246,.3)");
        g.addColorStop(0.68, "rgba(111,214,208,.22)");
        g.addColorStop(0.82, "rgba(159,220,236,.12)");
        g.addColorStop(1, "rgba(159,220,236,0)");
        cx.fillStyle = g; cx.fillRect(0, 0, 256, 256);
        var m = new THREE.SpriteMaterial({ map: srgbTex(new THREE.CanvasTexture(cv)), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
        return new THREE.Sprite(m);
      }
      var focusRing = ringSprite(); focusRing.material.opacity = 0; scene.add(focusRing);
      // brass instrument reticle — real 3D rings in the ecliptic plane
      var retGroup = new THREE.Group(); scene.add(retGroup);
      function ringLine(rr, op) {
        var rg2 = new THREE.BufferGeometry(), rpts = [];
        for (var ri2 = 0; ri2 <= 96; ri2++) { var ra2 = ri2 / 96 * Math.PI * 2; rpts.push(rr * Math.cos(ra2), 0, rr * Math.sin(ra2)); }
        rg2.setAttribute("position", new THREE.Float32BufferAttribute(rpts, 3));
        var rm2 = new THREE.LineBasicMaterial({ color: 0x9fdcec, transparent: true, opacity: op });
        rm2.color.convertSRGBToLinear(); // authored sRGB → linear
        retGroup.add(new THREE.Line(rg2, rm2)); return rm2;
      }
      var retM1 = ringLine(1, 0), retM2 = ringLine(1.18, 0);
      var tickGeo = new THREE.BufferGeometry(), tpts = [];
      [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach(function (ta) { tpts.push(Math.cos(ta) * 1.02, 0, Math.sin(ta) * 1.02, Math.cos(ta) * 1.3, 0, Math.sin(ta) * 1.3); });
      tickGeo.setAttribute("position", new THREE.Float32BufferAttribute(tpts, 3));
      var tickMat = new THREE.LineBasicMaterial({ color: 0x9fdcec, transparent: true, opacity: 0 });
      tickMat.color.convertSRGBToLinear(); // authored sRGB → linear
      retGroup.add(new THREE.LineSegments(tickGeo, tickMat));
      // look-up mode: geocentric sky markers
      var skyDefs = [["sun", "☉ SUN", "#ffd9a0"], ["moon", "☽ MOON", "#e6eaf2"], ["mercury", "☿ MERCURY", "#c9c2b8"], ["venus", "♀ VENUS", "#ffe2b0"], ["mars", "♂ MARS", "#ff9a70"], ["jupiter", "♃ JUPITER", "#ffd9a8"], ["saturn", "♄ SATURN", "#eed9ac"]];
      var skyItems = [];
      skyDefs.forEach(function (d2) {
        var glow = glowSprite([[0, hexA(d2[2], 0.95)], [0.3, hexA(d2[2], 0.4)], [1, hexA(d2[2], 0)]], 70);
        var lbl = textSprite(d2[1], "#c7d3ea"); lbl.scale.set(260, 32.5, 1);
        glow.material.opacity = 0; lbl.material.opacity = 0;
        scene.add(glow); scene.add(lbl);
        skyItems.push({ key: d2[0], p: P.find(function (q) { return q.key === d2[0]; }), glow: glow, lbl: lbl });
      });
      // true-horizon assets (geolocated look-up)
      var horizonGeo = new THREE.BufferGeometry(), hzPts = [];
      for (var hz = 0; hz <= 120; hz++) { var ha = hz / 120 * Math.PI * 2; hzPts.push(Math.cos(ha), 0, Math.sin(ha)); }
      horizonGeo.setAttribute("position", new THREE.Float32BufferAttribute(hzPts, 3));
      var horizonMat = new THREE.LineBasicMaterial({ color: 0x9fdcec, transparent: true, opacity: 0 });
      horizonMat.color.convertSRGBToLinear(); // authored sRGB → linear
      var horizonRing = new THREE.Line(horizonGeo, horizonMat);
      horizonRing.visible = false; scene.add(horizonRing);
      var cardSprites = [];
      [["N", 0], ["E", 90], ["S", 180], ["W", 270]].forEach(function (cd) {
        var lbl2 = textSprite(cd[0], "#9fdcec"); lbl2.scale.set(90, 11.25, 1); lbl2.material.opacity = 0;
        scene.add(lbl2); cardSprites.push({ s: lbl2, az: cd[1] * DEG });
      });
      var meteorGeo = new THREE.BufferGeometry();
      meteorGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3));
      var meteorMat = new THREE.LineBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0 });
      meteorMat.color.convertSRGBToLinear(); // authored sRGB → linear
      scene.add(new THREE.Line(meteorGeo, meteorMat));
      var meteorT = -1, nextMeteor = performance.now() + 6000;
      var meteorPos = new THREE.Vector3(), meteorVel = new THREE.Vector3();
      // ---- cosmic scale ladder ----
      self._fontWatch = []; // canvas-baked text is redrawn once real fonts arrive (fonts.ready)
      function hexA(hex, a) { var n = parseInt(hex.slice(1), 16); return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }
      function textSprite(txt, color) {
        var cv = document.createElement("canvas"); cv.width = 512; cv.height = 64;
        var cx = cv.getContext("2d");
        cx.font = "500 26px 'IBM Plex Mono', monospace"; cx.fillStyle = color || "#c7d3ea";
        cx.textAlign = "center"; cx.globalAlpha = 0.95;
        var sp2 = txt.split("").join("\u200a\u200a");
        cx.fillText(sp2, 256, 42);
        var m = new THREE.SpriteMaterial({ map: srgbTex(new THREE.CanvasTexture(cv)), transparent: true, depthWrite: false });
        return new THREE.Sprite(m);
      }
      var STARS = [["Sirius","#cfe0ff",1.6],["Alpha Centauri","#ffe9c4",1.2],["Vega","#d6e4ff",1.3],["Arcturus","#ffcf9e",1.4],["Capella","#fff0c9",1.2],["Rigel","#c9dcff",1.5],["Procyon","#f2f4ff",1.1],["Betelgeuse","#ffb08a",1.7],["Altair","#e8eeff",1.1],["Aldebaran","#ffc394",1.3],["Antares","#ff9e7d",1.6],["Spica","#cdd9ff",1.2],["Polaris","#eef2ff",1.1],["Deneb","#dfe9ff",1.3]];
      var gStars = new THREE.Group(); scene.add(gStars); this._starFadeMats = [];
      STARS.forEach(function (s, i) {
        var th = i * 2.399 + 0.7, ph2 = Math.acos(2 * ((i * 0.618 + 0.21) % 1) - 1);
        var rr = 1500 + (i % 5) * 300;
        var x = rr * Math.sin(ph2) * Math.cos(th), y = rr * Math.cos(ph2) * 0.6, z = rr * Math.sin(ph2) * Math.sin(th);
        var spr = glowSprite([[0, "rgba(255,255,255,.95)"], [0.22, hexA(s[1], 0.55)], [1, hexA(s[1], 0)]], 90 * s[2]);
        spr.position.set(x, y, z); spr.material.opacity = 0; gStars.add(spr); self._starFadeMats.push(spr.material);
        var lbl = textSprite(s[0].toUpperCase(), "#9fdcec");
        lbl.scale.set(300, 37, 1); lbl.position.set(x, y - 70 * s[2] - 50, z);
        lbl.material.opacity = 0; gStars.add(lbl); self._starFadeMats.push(lbl.material);
        self._fontWatch.push(function () {
          var cv2 = lbl.material.map.image, cx2 = cv2.getContext("2d");
          cx2.clearRect(0, 0, cv2.width, cv2.height);
          cx2.font = "500 26px 'IBM Plex Mono', monospace"; cx2.fillStyle = "#9fdcec";
          cx2.textAlign = "center"; cx2.globalAlpha = 0.95;
          cx2.fillText(s[0].toUpperCase().split("").join("\u200a\u200a"), 256, 42);
          lbl.material.map.needsUpdate = true;
        });
      });
      // nebulae among the stars
      self._nebMats = [];
      [["#8b7cf6", 2200, 400, -600], ["#6fd6d0", -1900, -300, 1400], ["#e696c8", 600, 700, 2300]].forEach(function (nb) {
        var neb = glowSprite([[0, hexA(nb[0], 0.5)], [0.45, hexA(nb[0], 0.16)], [1, hexA(nb[0], 0)]], 1);
        neb.scale.set(1500 + Math.random() * 600, 600 + Math.random() * 300, 1);
        neb.material.rotation = Math.random() * 3;
        neb.position.set(nb[1], nb[2], nb[3]); neb.material.opacity = 0;
        gStars.add(neb); self._nebMats.push(neb.material);
      });
      // zodiac ring on the ecliptic (true longitudes)
      var zodGlyphs = ["♈\uFE0E","♉\uFE0E","♊\uFE0E","♋\uFE0E","♌\uFE0E","♍\uFE0E","♎\uFE0E","♏\uFE0E","♐\uFE0E","♑\uFE0E","♒\uFE0E","♓\uFE0E"];
      self._zodMats = [];
      zodGlyphs.forEach(function (zg, zi) {
        var cvz = document.createElement("canvas"); cvz.width = cvz.height = 128;
        var czx = cvz.getContext("2d");
        czx.font = "84px 'Schibsted Grotesk', Arial, sans-serif"; czx.textAlign = "center"; czx.textBaseline = "middle";
        czx.fillStyle = "rgba(159,220,236,.9)"; czx.fillText(zg, 64, 68);
        var zm = new THREE.SpriteMaterial({ map: srgbTex(new THREE.CanvasTexture(cvz)), transparent: true, depthWrite: false });
        zm.opacity = 0;
        var zs = new THREE.Sprite(zm);
        var za = (zi * 30 + 15) * DEG;
        zs.position.set(330 * Math.cos(za), 0, -330 * Math.sin(za));
        zs.scale.set(26, 26, 1);
        scene.add(zs); self._zodMats.push(zm);
        self._fontWatch.push(function () {
          var cv3 = zm.map.image, cz2 = cv3.getContext("2d");
          cz2.clearRect(0, 0, 128, 128);
          cz2.font = "84px 'Schibsted Grotesk', Arial, sans-serif"; cz2.textAlign = "center"; cz2.textBaseline = "middle";
          cz2.fillStyle = "rgba(159,220,236,.9)"; cz2.fillText(zg, 64, 68);
          zm.map.needsUpdate = true;
        });
      });
      var eclGeo = new THREE.BufferGeometry(), eclPts = [];
      for (var ez = 0; ez <= 180; ez++) { var ea = ez / 180 * Math.PI * 2; eclPts.push(305 * Math.cos(ea), 0, -305 * Math.sin(ea)); }
      eclGeo.setAttribute("position", new THREE.Float32BufferAttribute(eclPts, 3));
      var eclMat = new THREE.LineBasicMaterial({ color: 0x9fdcec, transparent: true, opacity: 0 });
      eclMat.color.convertSRGBToLinear(); // authored sRGB → linear
      scene.add(new THREE.Line(eclGeo, eclMat));
      // layered barred-spiral galaxy
      var gGalaxy = new THREE.Group();
      gGalaxy.position.set(-13000, -2600, 9000); gGalaxy.rotation.x = 0.42; gGalaxy.rotation.z = 0.1;
      scene.add(gGalaxy);
      self._galMats = [];
      function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }
      function buildSpiral(count, size, opacity, dust) {
        var geo = new THREE.BufferGeometry(), ps = [], cs = [];
        for (var i2 = 0; i2 < count; i2++) {
          var arm = i2 % 4, t3 = Math.pow(Math.random(), 0.5) * 3.4;
          // logarithmic spiral r = a*e^(b*theta) — real grand-design pitch (~12°)
          var th3 = t3 * 2.4 + arm * Math.PI * 0.5;
          var r3 = 1250 * Math.exp(0.23 * th3);
          var spread = gauss() * (260 + r3 * 0.07) / (dust ? 1.6 : 1);
          var perp = th3 + Math.PI / 2;
          var x3 = r3 * Math.cos(th3) + Math.cos(perp) * spread, z3 = r3 * Math.sin(th3) + Math.sin(perp) * spread;
          if (dust) { th3 += 0.05; x3 = r3 * Math.cos(th3) + Math.cos(perp) * spread * 0.5; z3 = r3 * Math.sin(th3) + Math.sin(perp) * spread * 0.5; }
          var bar2 = !dust && i2 % 8 === 0;
          if (bar2) { r3 = Math.abs(gauss()) * 3000; th3 = Math.random() * 6.3; x3 = r3 * Math.cos(th3) * 1.8; z3 = r3 * Math.sin(th3) * 0.62; }
          var y3 = gauss() * Math.max(80, 560 - r3 * 0.018);
          ps.push(x3, y3, z3);
          if (dust) { cs.push(0.02, 0.015, 0.01); }
          else {
            var rr4 = Math.hypot(x3, z3);
            var mix = Math.min(1, rr4 / 21000);
            var pink = Math.random() < 0.05 && rr4 > 5200;
            var cb2 = 0.42 + Math.random() * 0.58;
            if (pink) cs.push(cb2 * 1.15, cb2 * 0.52, cb2 * 0.78);
            else if (bar2) cs.push(cb2 * 1.08, cb2 * 0.9, cb2 * 0.62);
            else cs.push(cb2 * (1 - mix * 0.45), cb2 * (0.86 - mix * 0.06), cb2 * (0.58 + mix * 0.55));
          }
        }
        geo.setAttribute("position", new THREE.Float32BufferAttribute(ps, 3));
        geo.setAttribute("color", new THREE.Float32BufferAttribute(linCols(cs), 3)); // authored sRGB → linear
        var mm = new THREE.PointsMaterial({ size: size, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, blending: dust ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false });
        gGalaxy.add(new THREE.Points(geo, mm));
        self._galMats.push({ m: mm, k: opacity });
        return mm;
      }
      buildSpiral(26000, 1.5, 0.85, false);
      buildSpiral(3200, 2.6, 0.95, false);
      buildSpiral(7000, 2.4, 0.55, true);
      // HII knots along the arms — star-forming regions
      (function () {
        for (var h2 = 0; h2 < 26; h2++) {
          var arm = h2 % 4, t5 = 0.55 + Math.random() * 2.6;
          var th5 = t5 * 2.4 + arm * Math.PI * 0.5;
          var r5 = 1250 * Math.exp(0.23 * th5);
          var tint = h2 % 3 === 0 ? "#ff9ec8" : h2 % 3 === 1 ? "#9ec8ff" : "#ffd9b0";
          var knot = glowSprite([[0, hexA(tint, 0.7)], [0.4, hexA(tint, 0.2)], [1, hexA(tint, 0)]], 700 + Math.random() * 900);
          knot.position.set(r5 * Math.cos(th5), gauss() * 120, r5 * Math.sin(th5));
          gGalaxy.add(knot); self._galMats.push({ m: knot.material, k: 0.5 });
        }
      })();
      (function () {
        var geo = new THREE.BufferGeometry(), ps = [], cs = [];
        for (var i3 = 0; i3 < 1400; i3++) {
          var rr3 = Math.pow(Math.random(), 0.5) * 15000 + 1500, t4 = Math.random() * 6.3, p4 = Math.acos(2 * Math.random() - 1);
          ps.push(rr3 * Math.sin(p4) * Math.cos(t4), rr3 * Math.cos(p4) * 0.75, rr3 * Math.sin(p4) * Math.sin(t4));
          var cb3 = 0.2 + Math.random() * 0.3; cs.push(cb3, cb3 * 0.92, cb3 * 0.8);
        }
        geo.setAttribute("position", new THREE.Float32BufferAttribute(ps, 3));
        geo.setAttribute("color", new THREE.Float32BufferAttribute(linCols(cs), 3)); // authored sRGB → linear
        var mm = new THREE.PointsMaterial({ size: 1.3, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
        gGalaxy.add(new THREE.Points(geo, mm));
        self._galMats.push({ m: mm, k: 0.45 });
      })();
      var coreGlow = glowSprite([[0, "rgba(255,232,190,.9)"], [0.3, "rgba(255,205,140,.35)"], [1, "rgba(255,190,120,0)"]], 7800);
      coreGlow.material.opacity = 0; gGalaxy.add(coreGlow);
      self._galMats.push({ m: coreGlow.material, k: 0.5 });
      var coreInner = glowSprite([[0, "rgba(255,248,232,.95)"], [0.35, "rgba(255,224,170,.4)"], [1, "rgba(255,205,140,0)"]], 3000);
      coreInner.material.opacity = 0; gGalaxy.add(coreInner);
      self._galMats.push({ m: coreInner.material, k: 0.85 });
      var youLbl = textSprite("· YOU ARE HERE", "#e6eaf2");
      youLbl.scale.set(4200, 620, 1); youLbl.position.set(0, 1100, 0); youLbl.material.opacity = 0;
      scene.add(youLbl);
      function galaxySprite(tint) {
        var cv2 = document.createElement("canvas"); cv2.width = cv2.height = 128;
        var g2 = cv2.getContext("2d");
        g2.translate(64, 64);
        var flat = 0.25 + Math.random() * 0.65;
        g2.scale(1, flat);
        var grad = g2.createRadialGradient(0, 0, 0, 0, 0, 60);
        grad.addColorStop(0, "rgba(255,244,224,.95)");
        grad.addColorStop(0.25, hexA(tint, 0.5));
        grad.addColorStop(1, hexA(tint, 0));
        g2.fillStyle = grad; g2.fillRect(-64, -64 / flat, 128, 128 / flat);
        if (Math.random() > 0.5) {
          g2.strokeStyle = hexA(tint, 0.35); g2.lineWidth = 3;
          g2.beginPath(); g2.arc(6, 0, 26, 0.3, 2.6); g2.stroke();
          g2.beginPath(); g2.arc(-6, 0, 26, Math.PI + 0.3, Math.PI + 2.6); g2.stroke();
        }
        var m = new THREE.SpriteMaterial({ map: srgbTex(new THREE.CanvasTexture(cv2)), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
        return new THREE.Sprite(m);
      }
      var cosMats = [], cosPos = [];
      for (var ci = 0; ci < 190; ci++) {
        var tint = ["#ffd9b8", "#cfe0ff", "#e6c4f0", "#fff3d6"][ci % 4];
        var bl = galaxySprite(tint);
        var seed = ci % 9;
        var sa = seed * 0.698 + 0.4, sb = Math.acos(2 * ((seed * 0.618 + 0.17) % 1) - 1);
        var rc = 80000 + (seed % 4) * 42000 + gauss() * 26000;
        bl.position.set(rc * Math.sin(sb) * Math.cos(sa) + gauss() * 20000, rc * Math.cos(sb) * 0.7 + gauss() * 14000, rc * Math.sin(sb) * Math.sin(sa) + gauss() * 20000);
        var sc2 = 1200 + Math.random() * 4600; bl.scale.set(sc2, sc2, 1);
        bl.material.rotation = Math.random() * Math.PI; bl.material.opacity = 0;
        scene.add(bl); cosMats.push(bl.material); cosPos.push(bl.position);
      }
      var andro = galaxySprite("#cfe0ff"); andro.scale.set(15000, 5600, 1); andro.material.rotation = 0.6;
      andro.position.set(135000, 34000, -88000); andro.material.opacity = 0; scene.add(andro); cosMats.push(andro.material);
      var androLbl = textSprite("ANDROMEDA · 2.5 MILLION LIGHT-YEARS", "#9fdcec");
      androLbl.scale.set(30000, 3750, 1); androLbl.position.set(135000, 22000, -88000);
      androLbl.material.opacity = 0; scene.add(androLbl); cosMats.push(androLbl.material);
      [[-16000, -6400, 14500, 2800], [-19000, -8200, 11500, 1900]].forEach(function (mg) {
        var cl = glowSprite([[0, "rgba(240,240,255,.55)"], [0.5, "rgba(220,225,255,.18)"], [1, "rgba(220,225,255,0)"]], mg[3]);
        cl.position.set(gGalaxy.position.x + mg[0], gGalaxy.position.y + mg[1], gGalaxy.position.z + mg[2]);
        cl.material.opacity = 0; scene.add(cl);
        self._galMats.push({ m: cl.material, k: 0.5 });
      });
      var webPts = [];
      for (var wi = 0; wi < cosPos.length; wi++) for (var wj = wi + 1; wj < cosPos.length; wj++) {
        if (webPts.length > 780) break;
        if (cosPos[wi].distanceTo(cosPos[wj]) < 42000) webPts.push(cosPos[wi].x, cosPos[wi].y, cosPos[wi].z, cosPos[wj].x, cosPos[wj].y, cosPos[wj].z);
      }
      var webGeo = new THREE.BufferGeometry();
      webGeo.setAttribute("position", new THREE.Float32BufferAttribute(webPts, 3));
      var webMat = new THREE.LineBasicMaterial({ color: 0x6f86c9, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      webMat.color.convertSRGBToLinear(); // authored sRGB → linear
      scene.add(new THREE.LineSegments(webGeo, webMat));
      // interactions
      var el = renderer.domElement, dragging = false, activePointer = null, lx = 0, ly = 0, moved = 0, pinch = null;
      el.style.cursor = "grab"; el.style.touchAction = "pan-y"; // vertical swipes scroll the page; horizontal drags orbit
      var touchPts = {}, pinchDist = 0; // two-pointer pinch → zoom (the mobile scale ladder)
      function dropPt(id) { delete touchPts[id]; if (Object.keys(touchPts).length < 2) pinchDist = 0; }
      function endDrag(e) {
        if (!dragging || e.pointerId !== activePointer) return false;
        dragging = false; activePointer = null; el.style.cursor = "grab";
        if (e.type !== "lostpointercapture" && el.hasPointerCapture && el.hasPointerCapture(e.pointerId)) {
          try { el.releasePointerCapture(e.pointerId); } catch (ignore) {}
        }
        return true;
      }
      el.addEventListener("pointerdown", function (e) {
        touchPts[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(touchPts);
        if (ids.length === 2) { // second finger → pinch mode, stop any orbit drag
          var a = touchPts[ids[0]], b = touchPts[ids[1]];
          pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dragging) { dragging = false; activePointer = null; el.style.cursor = "grab"; }
          return;
        }
        if (dragging) return; if (self._flightMode) { self._flightMode = 0; self.dispatchEvent(new CustomEvent("flightstage", { detail: null, bubbles: true })); } self._intro = false; dragging = true; activePointer = e.pointerId; moved = 0; lx = e.clientX; ly = e.clientY; try { el.setPointerCapture(e.pointerId); } catch (ignore) {} el.style.cursor = "grabbing"; });
      el.addEventListener("pointermove", function (e) {
        if (touchPts[e.pointerId]) { touchPts[e.pointerId].x = e.clientX; touchPts[e.pointerId].y = e.clientY; }
        var ids = Object.keys(touchPts);
        if (ids.length === 2 && pinchDist > 0) { // pinch zoom
          var a = touchPts[ids[0]], b = touchPts[ids[1]];
          var d = Math.hypot(a.x - b.x, a.y - b.y);
          self._intro = false;
          self._dRadius = Math.max(7, Math.min(260000, self._dRadius * (1 - (d - pinchDist) / 300)));
          pinchDist = d;
          return;
        }
        if (!dragging || e.pointerId !== activePointer) return;
        if (e.pointerType === "mouse" && e.buttons === 0) { endDrag(e); return; }
        var dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
        self._dTheta -= dx * 0.005; self._dPhi = Math.max(0.12, Math.min(1.45, self._dPhi - dy * 0.004));
      });
      el.addEventListener("pointerup", function (e) {
        var wasPinch = pinchDist > 0; dropPt(e.pointerId);
        if (wasPinch) { endDrag(e); return; } // pinch, not a click
        if (!endDrag(e)) return;
        if (moved < 6) { // click → pick
          var rect = el.getBoundingClientRect();
          var v = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
          var rc = new THREE.Raycaster(); rc.setFromCamera(v, cam);
          var list = Object.keys(self._meshes).map(function (k) { return self._meshes[k]; });
          var hit = rc.intersectObjects(list, true)[0];
          if (hit) {
            var hk = hit.object.userData.key || (hit.object.parent && hit.object.parent.userData.key);
            if (hk) self.flyTo(hk);
          }
        }
      });
      el.addEventListener("pointercancel", function (e) { dropPt(e.pointerId); endDrag(e); });
      el.addEventListener("lostpointercapture", function (e) { dropPt(e.pointerId); endDrag(e); });
      el.addEventListener("wheel", function (e) { if (self.getAttribute("data-wheel") === "off") return; e.preventDefault(); if (self._flightMode) { self._flightMode = 0; self.dispatchEvent(new CustomEvent("flightstage", { detail: null, bubbles: true })); } self._intro = false; self._lookUpMode = 0; self._lookUpPending = 0; self._dRadius = Math.max(7, Math.min(260000, self._dRadius * (1 + e.deltaY * 0.0012))); }, { passive: false });
      // resize
      var ro = new ResizeObserver(function () {
        var w = self.clientWidth || 1, h = self.clientHeight || 1;
        renderer.setSize(w, h); if (self._composer) self._composer.setSize(w, h); // keep bloom targets in sync
        cam.aspect = w / h; cam.updateProjectionMatrix();
      });
      ro.observe(this); this._ro = ro;
      self._vis = true;
      var vio = new IntersectionObserver(function (es) { self._vis = es[0].isIntersecting; });
      vio.observe(this); this._vio = vio;
      var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      function ss(a, b, x) { var u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); }
      // loop
      var loop = function () {
        self._raf = requestAnimationFrame(loop);
        if (!self._vis || document.hidden) return;        var lw = self.clientWidth || 1, lh = self.clientHeight || 1;
        if (lw !== self._w || lh !== self._h) { self._w = lw; self._h = lh; renderer.setSize(lw, lh); if (self._composer) self._composer.setSize(lw, lh); cam.aspect = lw / lh; cam.updateProjectionMatrix(); }
        starMat.opacity = (0.87 + 0.05 * Math.sin(performance.now() * 0.0011) + 0.04 * Math.sin(performance.now() * 0.0023 + 1.7)) * (1 - ss(9000, 30000, self._radius));
        var rad = self._radius;
        var starsF = ss(320, 1600, rad) * (1 - ss(9000, 30000, rad));
        for (var fi = 0; fi < self._starFadeMats.length; fi++) self._starFadeMats[fi].opacity = starsF;
        mwMat.opacity = 0.55 * (1 - ss(5000, 18000, rad));
        for (var gm = 0; gm < self._galMats.length; gm++) self._galMats[gm].m.opacity = self._galMats[gm].k * ss(4000, 22000, rad);
        gGalaxy.rotation.y += 0.00004;
        for (var nm = 0; nm < self._nebMats.length; nm++) self._nebMats[nm].opacity = starsF * 0.5;
        var zf = ss(130, 320, rad) * (1 - ss(1400, 3000, rad));
        for (var zm2 = 0; zm2 < self._zodMats.length; zm2++) self._zodMats[zm2].opacity = zf * 0.85;
        eclMat.opacity = zf * 0.4;
        if (self._natalMats) for (var nt = 0; nt < self._natalMats.length; nt++) self._natalMats[nt].opacity = zf * 0.95;
        belt.rotation.y = (((j - J2000) / 36525) * 8000 * DEG) % (Math.PI * 2);
        beltMat.opacity = 0.5 * (1 - ss(700, 1600, rad));
        var cm2 = norm(142 + (j - J2000) * 0.88) * DEG;
        var th4 = cm2 + 1.25 * Math.sin(cm2);
        var cr2 = 35.7 / (1 + 0.624 * Math.cos(th4));
        cometHead.position.set(cr2 * Math.cos(th4), 0.6, -cr2 * Math.sin(th4));
        cometHead.material.opacity = 0.95 * (1 - ss(900, 2000, rad));
        var cdx = cometHead.position.x / cr2, cdz = cometHead.position.z / cr2;
        for (var tb2 = 0; tb2 < tailBits.length; tb2++) {
          var tt2 = (tb2 + 1) / tailBits.length;
          var stretch = (4 + tt2 * 26) * (1 + (1 - Math.min(cr2, 60) / 60) * 1.4);
          tailBits[tb2].position.set(cometHead.position.x + cdx * tt2 * stretch, 0.6 + tt2 * 1.2, cometHead.position.z + cdz * tt2 * stretch);
          tailBits[tb2].material.opacity = 0.5 * (1 - tt2) * (1 - ss(700, 1600, rad));
          var bsc = 3.5 * (1 - tt2 * 0.7) * (1 + (1 - Math.min(cr2, 60) / 60) * 1.5);
          tailBits[tb2].scale.set(bsc, bsc, 1);
        }
        flare.material.opacity = 0.4 * ss(46, 150, rad) * (1 - ss(700, 1500, rad)) * (0.85 + 0.15 * Math.sin(performance.now() * 0.0007));
        for (var cn = 0; cn < self._cones.length; cn++) {
          var cno = self._cones[cn], lC = helioLon(cno.p, j) * DEG;
          var tX = -Math.sin(lC), tZ = -Math.cos(lC);
          var posC = self._meshes[cno.p.key].position;
          cno.c.position.set(posC.x + tX * SZ(cno.p) * 2.7, 0, posC.z + tZ * SZ(cno.p) * 2.7);
          cno.c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(tX, 0, tZ));
          cno.c.material.opacity = 0.7 * (1 - ss(320, 900, rad)) * ss(16, 44, rad);
        }
        var nowMs = performance.now();
        if (meteorT < 0 && nowMs > nextMeteor && rad < 900) {
          meteorT = 0;
          meteorPos.set((Math.random() - 0.5) * rad * 1.6, rad * 0.35, (Math.random() - 0.5) * rad * 1.6);
          meteorVel.set(Math.random() - 0.5, -0.55, Math.random() - 0.5).normalize().multiplyScalar(rad * 0.035);
        }
        if (meteorT >= 0) {
          meteorT += 0.016;
          meteorPos.add(meteorVel);
          var pa2 = meteorGeo.attributes.position;
          pa2.setXYZ(0, meteorPos.x, meteorPos.y, meteorPos.z);
          pa2.setXYZ(1, meteorPos.x - meteorVel.x * 6, meteorPos.y - meteorVel.y * 6, meteorPos.z - meteorVel.z * 6);
          pa2.needsUpdate = true;
          meteorGeo.computeBoundingSphere();
          meteorMat.opacity = Math.max(0, 0.9 * (1 - meteorT / 1.1)) * (1 - ss(600, 1200, rad));
          if (meteorT > 1.2) { meteorT = -1; nextMeteor = nowMs + 5000 + Math.random() * 9000; }
        }
        youLbl.material.opacity = ss(9000, 26000, rad) * (1 - ss(120000, 200000, rad));
        var cosF = 0.85 * ss(55000, 150000, rad);
        for (var ci2 = 0; ci2 < cosMats.length; ci2++) cosMats[ci2].opacity = cosF;
        webMat.opacity = cosF * 0.22;
        if (self._intro) {
          self._introT = (self._introT || 0) + 0.0166;
          var kt = Math.min(1, self._introT / 7);
          kt = kt * kt * (3 - 2 * kt);
          var lr = Math.exp(Math.log(210000) * (1 - kt) + Math.log(26) * kt);
          self._dRadius = lr; self._radius = lr;
          self._dPhi = 0.7 + 0.42 * kt;
          self._dTheta += 0.0018 * (1 - kt * 0.5);
          if (kt >= 1) self._intro = false;
        }
        if (self._flightMode) {
          self._flightT += 0.0166;
          var FS = [
            { until: 6, r: 240, phi: 0.9, spin: 0.004, label: "LEAVING HOME", sub: "Eight light-minutes between you and the Sun." },
            { until: 13, r: 950, phi: 0.72, spin: 0.0022, label: "THE WHOLE SYSTEM", sub: "Every world you will ever meet, in one frame." },
            { until: 21, r: 2700, phi: 0.98, spin: 0.0015, label: "THE NEIGHBORHOOD", sub: "Every star a sun — Sirius' light left 8.6 years ago." },
            { until: 30, r: 45000, phi: 0.6, spin: 0.001, label: "THE GALAXY", sub: "A hundred billion suns. One orbit: 230 million years." },
            { until: 42, r: 212000, phi: 0.86, spin: 0.0006, label: "THE DEEP FIELD", sub: "Every smudge a galaxy — this light left before Earth had trees." }
          ];
          var stF = 0; while (stF < FS.length - 1 && self._flightT > FS[stF].until) stF++;
          var curF = FS[stF];
          if (stF !== self._flightStage) {
            self._flightStage = stF;
            self.dispatchEvent(new CustomEvent("flightstage", { detail: { idx: stF, total: FS.length, label: curF.label, sub: curF.sub }, bubbles: true }));
          }
          self._dRadius += (curF.r - self._dRadius) * 0.02;
          self._dPhi += (curF.phi - self._dPhi) * 0.015;
          self._dTheta += curF.spin;
          if (self._flightT > 46) { self._flightMode = 0; self.dispatchEvent(new CustomEvent("flightstage", { detail: null, bubbles: true })); }
        }
        starMat.size += ((self._flightMode && self._flightStage >= 2 ? 2.7 : 1.5) - starMat.size) * 0.04;
        if (self._lookUpPending && rad < 42) { self._lookUpPending = 0; self._lookUpMode = 1; self._dPhi = 1.32; }
        var lvl = rad < 70 ? "EARTH" : rad < 900 ? "SYSTEM" : rad < 15000 ? "STARS" : rad < 90000 ? "GALAXY" : "COSMOS";
        if (lvl !== self._lvl) { self._lvl = lvl; self.dispatchEvent(new CustomEvent("scalechange", { detail: { level: lvl }, bubbles: true })); }
        if (self._live) self._jd = jd(new Date());
        else if (self._scrubJD != null) self._jd += (self._scrubJD - self._jd) * 0.14;
        var j = self._jd;
        P.forEach(function (p) {
          var l = helioLon(p, j) * DEG, rr = R(p.a), m = self._meshes[p.key];
          m.position.set(rr * Math.cos(l), 0, -rr * Math.sin(l));
        });
        for (var si = 0; si < self._spinners.length; si++) self._spinners[si].m.rotation.y += self._spinners[si].s;
        var em = self._meshes.earth.position, ml = moonLon(j) * DEG;
        self._meshes.moon.position.set(em.x + 5 * Math.cos(ml), 0.4, em.z - 5 * Math.sin(ml));
        self._meshes.moon.rotation.y = ml + Math.PI; // tidally locked — same face to Earth
        var motion = self.getAttribute("motion");
        if (!dragging && motion !== "off" && !reduced) self._dTheta += 0.00045;
        // focus target
        var f = self._focus, tgt = self._dTarget;
        if (f && self._meshes[f]) tgt.copy(self._meshes[f].position); else tgt.set(0, 0, 0);
        self._target.lerp(tgt, 0.08);
        self._theta += (self._dTheta - self._theta) * 0.09;
        self._phi += (self._dPhi - self._phi) * 0.09;
        self._radius += (self._dRadius - self._radius) * 0.07;
        var lum = self._lookUpMode ? 1 : 0;
        self._skyLum = (self._skyLum || 0) + (lum - (self._skyLum || 0)) * 0.07;
        if (self._skyLum > 0.01) {
          var epS = self._meshes.earth.position;
          var geoMode = self._obsLat != null;
          var RS = 1500;
          for (var sk = 0; sk < skyItems.length; sk++) {
            var it2 = skyItems[sk];
            var lonS = it2.key === "sun" ? sunLon(j) : it2.key === "moon" ? moonLon(j) : geoLon(it2.p, j);
            var dim = 1, mxS, myS, mzS;
            if (geoMode) {
              var aa2 = altAz(lonS, j, self._obsLat, self._obsLon);
              var ch2 = Math.cos(aa2.alt);
              mxS = epS.x + RS * Math.sin(aa2.az) * ch2;
              myS = epS.y + RS * Math.sin(aa2.alt);
              mzS = epS.z + RS * Math.cos(aa2.az) * ch2;
              if (aa2.alt < 0) dim = 0.15;
            } else {
              var aS = lonS * DEG;
              mxS = epS.x + RS * Math.cos(aS); myS = epS.y + 30; mzS = epS.z - RS * Math.sin(aS);
            }
            it2.glow.position.set(mxS, myS, mzS);
            it2.lbl.position.set(mxS, myS - 110, mzS);
            it2.glow.material.opacity = self._skyLum * 0.95 * dim;
            it2.lbl.material.opacity = self._skyLum * 0.85 * dim;
          }
          horizonRing.visible = geoMode && self._skyLum > 0.03;
          if (geoMode) {
            horizonRing.position.copy(epS); horizonRing.scale.set(RS, RS, RS);
            horizonMat.opacity = self._skyLum * 0.45;
            for (var cs2 = 0; cs2 < cardSprites.length; cs2++) {
              var cd2 = cardSprites[cs2];
              cd2.s.position.set(epS.x + RS * 0.98 * Math.sin(cd2.az), epS.y + 26, epS.z + RS * 0.98 * Math.cos(cd2.az));
              cd2.s.material.opacity = self._skyLum * 0.9;
            }
          } else for (var cs3 = 0; cs3 < cardSprites.length; cs3++) cardSprites[cs3].s.material.opacity = 0;
        } else horizonRing.visible = false;
        if (self._lookUpMode) {
          var epL = self._meshes.earth.position;
          var spL = Math.sin(self._phi), tL = self._theta;
          cam.position.set(epL.x, epL.y + 3.6, epL.z);
          self._target.set(epL.x + spL * Math.cos(tL) * 400, epL.y + 3.6 + Math.cos(self._phi) * 400, epL.z - spL * Math.sin(tL) * 400);
        } else {
          var sp = Math.sin(self._phi), t2 = self._theta;
          cam.position.set(self._target.x + self._radius * sp * Math.cos(t2), self._target.y + self._radius * Math.cos(self._phi), self._target.z + self._radius * sp * Math.sin(t2));
        }
        var fk2 = self._focus;
        var settle = 1 - Math.min(1, Math.abs(self._radius - self._dRadius) / Math.max(self._dRadius * 0.6, 0.001));
        var retT = 0;
        if (fk2 && self._meshes[fk2] && !self._lookUpMode) {
          var fpos = self._meshes[fk2].position;
          focusRing.position.copy(fpos); retGroup.position.copy(fpos);
          var fs = (self._sizes[fk2] || 2) * 4.4;
          focusRing.scale.set(fs, fs, 1);
          var rs2 = (self._sizes[fk2] || 2) * 2.3 * (1 + 0.03 * Math.sin(performance.now() * 0.0013));
          retGroup.scale.set(rs2, rs2, rs2);
          retGroup.rotation.y += 0.0035;
          retT = Math.pow(Math.max(0, settle), 2) * (1 - ss(80, 380, rad));
        }
        focusRing.material.opacity += (retT * 0.26 - focusRing.material.opacity) * 0.08;
        retM1.opacity += (retT * 0.95 - retM1.opacity) * 0.08;
        retM2.opacity += (retT * 0.4 - retM2.opacity) * 0.08;
        tickMat.opacity += (retT * 0.75 - tickMat.opacity) * 0.08;
        corona.material.opacity = 0.3 + 0.09 * Math.sin(performance.now() * 0.0011);
        cam.lookAt(self._target);
        if (self._composer) { // bloom chain when available — a hard failure falls back to plain
          try { self._composer.render(); } catch (eR) { self._composer = null; renderer.render(scene, cam); }
        } else renderer.render(scene, cam);
      };
      self._loopFn = loop;
      // pause the render loop while the tab is hidden; resume exactly one loop on return (never two)
      this._onVis = function () {
        if (document.visibilityState === "hidden") {
          if (self._raf) { cancelAnimationFrame(self._raf); self._raf = null; }
        } else if (!self._raf && !self._contextLost && !self._disposed && self._loopFn) {
          self._raf = requestAnimationFrame(self._loopFn);
        }
      };
      document.addEventListener("visibilitychange", this._onVis);
      loop();
      // Canvas-baked text sprites are drawn before webfonts finish loading on a
      // cold visit; redraw them in place once the real faces are available.
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
          if (self._disposed || self._contextLost || !self._fontWatch) return;
          self._fontWatch.forEach(function (fn) { try { fn(); } catch (e0) {} });
          if (self._natalList) self.setNatal(self._natalList);
        });
      }
      // optional subtle bloom (r128 examples/js builds, self-hosted) — kill switch: ?nobloom=1
      var noBloom = /[?&]nobloom=1\b/.test(window.location.search);
      var pxr = renderer.getPixelRatio();
      var fbPix = self._w * self._h * pxr * pxr; // effective framebuffer pixels
      var bloomOK = !noBloom && (navigator.hardwareConcurrency || 8) > 4 && fbPix <= 5500000;
      var buildBloom = function () {
        if (self._composer || self._disposed || self._contextLost || self._renderer !== renderer) return; // stale async load
        try {
          var composer = new THREE.EffectComposer(renderer);
          composer.addPass(new THREE.RenderPass(scene, cam));
          composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(self._w, self._h), 0.35, 0.55, 0.8)); // subtle
          // r128 applies tone mapping into render targets but outputEncoding only to screen — re-encode on the final pass
          composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));
          self._composer = composer;
          // black-output probe (ap-v780: a silently-broken final pass rendered the hero
          // black on every device). Compare composer vs plain output at sample points —
          // if the plain frame has lit pixels and the composer frame has none, drop the
          // composer and keep plain rendering for this device.
          setTimeout(function () {
            if (!self._composer || self._disposed || self._contextLost) return;
            try {
              var gl = renderer.getContext();
              var bw = gl.drawingBufferWidth, bh = gl.drawingBufferHeight;
              var pts = [[0.5, 0.5], [0.25, 0.25], [0.75, 0.75], [0.1, 0.5], [0.9, 0.5], [0.5, 0.1], [0.5, 0.9], [0.33, 0.66], [0.66, 0.33], [0.2, 0.8], [0.8, 0.2], [0.5, 0.35], [0.35, 0.5], [0.65, 0.5], [0.5, 0.65], [0.15, 0.15], [0.85, 0.85]];
              var buf = new Uint8Array(4);
              var probe = function () {
                var lit = 0;
                for (var pi = 0; pi < pts.length; pi++) {
                  gl.readPixels(Math.floor(pts[pi][0] * bw), Math.floor(pts[pi][1] * bh), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
                  if (buf[0] > 4 || buf[1] > 4 || buf[2] > 4) lit++;
                }
                return lit;
              };
              self._composer.render(); var litC = probe();
              renderer.render(scene, cam); var litP = probe();
              if (litP > 0 && litC === 0) { self._composer = null; console.warn("[orrery] bloom disabled: black-output probe failed"); }
            } catch (eP) { self._composer = null; }
          }, 600);
        } catch (err) { self._composer = null; } // any failure → keep plain rendering
      };
      if (bloomOK) {
        if (THREE.UnrealBloomPass && THREE.EffectComposer && THREE.GammaCorrectionShader) buildBloom();
        else {
          var bloomFiles = ["CopyShader", "LuminosityHighPassShader", "GammaCorrectionShader", "EffectComposer", "ShaderPass", "RenderPass", "UnrealBloomPass"];
          var seq = Promise.resolve();
          bloomFiles.forEach(function (bf) {
            seq = seq.then(function () {
              return new Promise(function (res, rej) {
                var sc = document.createElement("script");
                sc.src = "./js/vendor/three-r128-" + bf + ".js";
                sc.onload = res; sc.onerror = rej;
                document.head.appendChild(sc);
              });
            });
          });
          seq.then(buildBloom).catch(function () { /* bloom files unavailable — plain rendering continues */ });
        }
      }
    };
    C.prototype.attributeChangedCallback = function (n, o, v) {
      if (n === "orbits" && this._orbitLines) this._orbitLines.forEach(function (l) { l.visible = v !== "off"; });
    };
    C.prototype._posterFallback = function () {
      // static observatory poster — shared by the no-WebGL path and the context-lost path
      this.innerHTML = '<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 62%,rgba(159,220,236,.12),transparent 62%),radial-gradient(ellipse at 50% 118%,rgba(230,161,92,.09),transparent 55%)"></div><div style="position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);width:180px;height:180px;border-radius:50%;border:1px solid rgba(159,220,236,.28);box-shadow:0 0 60px rgba(159,220,236,.15),inset 0 0 60px rgba(159,220,236,.1)"></div>';
    };
    C.prototype._teardown = function () { // full GPU cleanup so repeated mount/unmount can't leak
      if (this._disposed) return;
      this._disposed = true;
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
      if (this._onVis) { document.removeEventListener("visibilitychange", this._onVis); this._onVis = null; }
      if (this._ro) { this._ro.disconnect(); this._ro = null; }
      if (this._vio) { this._vio.disconnect(); this._vio = null; }
      var r = this._renderer;
      if (r) {
        if (this._onCtxLost) { r.domElement.removeEventListener("webglcontextlost", this._onCtxLost); this._onCtxLost = null; }
        if (this._onCtxOK) { r.domElement.removeEventListener("webglcontextrestored", this._onCtxOK); this._onCtxOK = null; }
        if (this._composer) { // bloom: pass render targets + composer buffers
          this._composer.passes.forEach(function (p) { if (typeof p.dispose === "function") p.dispose(); });
          if (this._composer.renderTarget1) this._composer.renderTarget1.dispose();
          if (this._composer.renderTarget2) this._composer.renderTarget2.dispose();
          this._composer = null;
        }
        if (this._scene) this._scene.traverse(function (o) { // geometries, materials, textures
          if (o.geometry) o.geometry.dispose();
          var ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
          ms.forEach(function (m) {
            for (var k in m) { var v = m[k]; if (v && v.isTexture) v.dispose(); }
            if (m.uniforms) for (var u in m.uniforms) { var uv = m.uniforms[u] && m.uniforms[u].value; if (uv && uv.isTexture) uv.dispose(); }
            if (typeof m.dispose === "function") m.dispose();
          });
        });
        if (r.domElement.parentNode === this) this.removeChild(r.domElement);
        r.dispose();
        if (typeof r.forceContextLoss === "function") r.forceContextLoss(); // release the GL context slot across remounts
        this._renderer = null;
      }
      this._scene = null; this._cam = null; this._loopFn = null; this._composer = null;
      this._meshes = null; this._spinners = null; this._cones = null; this._orbitLines = null; this._sizes = null;
      this._starFadeMats = null; this._nebMats = null; this._zodMats = null; this._galMats = null;
      this._natalMats = null; this._natalGroup = null;
      this._contextLost = false;
      this._init = false; // next connect performs a full clean boot
      this._ph = null;
      this.innerHTML = ""; // canvas, poster and placeholder are all created by this element
    };
    C.prototype.disconnectedCallback = function () { this._teardown(); };
    C.prototype.flyTo = function (key) {
      this._flightMode = 0; this._intro = false; this._lookUpMode = 0; this._lookUpPending = 0;
      if (key !== this._focus) { this._dTheta += 0.85; this._dPhi = 0.92; }
      this._focus = key;
      var info = { key: key };
      if (key === "sun") { this._dRadius = 34; info.name = "Sun"; info.glyph = "☉\uFE0E"; }
      else if (key === "moon") { this._dRadius = 7.5; info.name = "Moon"; info.glyph = "☽\uFE0E"; }
      else if (!key) { this._dRadius = 210; this._dPhi = 0.9; info.name = "The System"; info.glyph = "✦"; }
      else { var p = P.find(function (q) { return q.key === key; }); if (p) { this._dRadius = SZ(p) * 7 + 5; info.name = p.name; info.glyph = p.glyph; } }
      this.dispatchEvent(new CustomEvent("planetfocus", { detail: info, bubbles: true }));
    };
    C.prototype.setJD = function (j) { this._live = false; this._scrubJD = j; };
    C.prototype.flyScale = function (level) {
      this._flightMode = 0; this._intro = false; this._lookUpMode = 0; this._lookUpPending = 0;
      if (level === "EARTH") return this.flyTo("earth");
      this._focus = null;
      var names = { SYSTEM: "The System", STARS: "The Neighborhood", GALAXY: "The Galaxy", COSMOS: "The Deep Field" };
      this._dRadius = { SYSTEM: 210, STARS: 2600, GALAXY: 45000, COSMOS: 185000 }[level] || 210;
      if (level !== "SYSTEM") this._dPhi = 0.95;
      this.dispatchEvent(new CustomEvent("planetfocus", { detail: { key: null, name: names[level] || level, glyph: "✦" }, bubbles: true }));
    };
    C.prototype.flight = function () { this._focus = null; this._intro = false; this._lookUpMode = 0; this._lookUpPending = 0; this._flightMode = 1; this._flightT = 0; this._flightStage = -1; };
    C.prototype.setObserver = function (lat, lon) { this._obsLat = lat; this._obsLon = lon; };
    C.prototype.lookUp = function () {
      this._intro = false; this._flightMode = 0; this._focus = "earth";
      this._lookUpMode = 0; this._lookUpPending = 1;
      this._dRadius = 26; this._dPhi = 1.05;
      var nm3 = this._obsLat != null ? "Your Local Sky" : "The Night Sky";
      this.dispatchEvent(new CustomEvent("planetfocus", { detail: { key: null, name: nm3, glyph: "✷" }, bubbles: true }));
    };
    C.prototype.setNatal = function (list) {
      var self = this;
      if (!window.THREE || !this._scene) return;
      if (!this._natalGroup) { this._natalGroup = new THREE.Group(); this._scene.add(this._natalGroup); }
      var g = this._natalGroup;
      while (g.children.length) g.remove(g.children[0]);
      this._natalMats = [];
      this._natalList = list || null;
      if (!list) return;
      list.forEach(function (it) {
        var cv = document.createElement("canvas"); cv.width = cv.height = 128;
        var cx = cv.getContext("2d");
        cx.font = "70px 'Schibsted Grotesk', Arial, sans-serif"; cx.textAlign = "center"; cx.textBaseline = "middle";
        cx.shadowColor = "rgba(159,220,236,.9)"; cx.shadowBlur = 18;
        cx.fillStyle = "rgba(230,238,255,.95)"; cx.fillText(it.glyph, 64, 56);
        cx.shadowBlur = 0; cx.font = "500 15px 'IBM Plex Mono', monospace"; cx.fillStyle = "rgba(159,220,236,.9)";
        cx.fillText("YOUR " + it.name.toUpperCase(), 64, 108);
        var m = new THREE.SpriteMaterial({ map: srgbTex(new THREE.CanvasTexture(cv)), transparent: true, depthWrite: false });
        m.opacity = 0;
        var s = new THREE.Sprite(m);
        var a = it.lon * Math.PI / 180;
        s.position.set(275 * Math.cos(a), 0, -275 * Math.sin(a));
        s.scale.set(30, 30, 1);
        g.add(s); self._natalMats.push(m);
      });
    };
    C.prototype.setLive = function () { this._live = true; this._scrubJD = null; };
    C.prototype.getJD = function () { return this._jd; };
    return C;
  })();
  customElements.define("void-orrery", VoidOrrery);
})();
