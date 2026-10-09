/* The GBL diamond: a brilliant-cut mesh turned in 3D, projected with perspective and lit per facet.
   Same geometry and shading as the app (lib/core/design/widgets/diamond_3d.dart). No libraries. */
(function () {
  var canvas = document.querySelector('canvas.gem');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var N = 16, step = (2 * Math.PI) / N;
  var verts = [], faces = [];
  function add(r, y, a) { verts.push([r * Math.cos(a), y, r * Math.sin(a)]); return verts.length - 1; }
  var table = [], girdle = [], mid = [], i;
  for (i = 0; i < N; i++) table.push(add(0.56, 0.42, i * step));
  for (i = 0; i < N; i++) girdle.push(add(1.0, 0.0, (i + 0.5) * step));
  for (i = 0; i < N; i++) mid.push(add(0.48, -0.42, i * step));
  var culet = verts.length; verts.push([0, -0.98, 0]);
  var top = verts.length; verts.push([0, 0.42, 0]);
  function w(k) { return (k + N) % N; }
  for (i = 0; i < N; i++) {
    var t = (i % 4) * 0.035;
    faces.push({ v: [top, table[w(i + 1)], table[i]], tone: t });
    faces.push({ v: [table[i], table[w(i + 1)], girdle[i]], tone: 0.02 + t });
    faces.push({ v: [girdle[i], table[w(i + 1)], girdle[w(i + 1)]], tone: -0.03 + t });
    faces.push({ v: [girdle[w(i - 1)], table[i], girdle[i]], tone: 0.04 - t });
    faces.push({ v: [girdle[w(i - 1)], girdle[i], mid[i]], tone: -0.02 + t });
    faces.push({ v: [mid[i], girdle[i], mid[w(i + 1)]], tone: 0.03 - t });
    faces.push({ v: [mid[i], mid[w(i + 1)], culet], tone: -0.05 + t });
  }

  function norm(a) { var l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  var light = norm([-0.55, 0.75, 0.5]);
  var half = norm([light[0], light[1], light[2] + 1]);
  var ramp = [[7, 26, 68], [18, 60, 143], [31, 111, 235], [124, 196, 242], [214, 243, 248], [255, 255, 255]];
  function shade(v) {
    v = Math.max(0, Math.min(1, v));
    var x = v * (ramp.length - 1), k = Math.min(Math.floor(x), ramp.length - 2), f = x - k, a = ramp[k], b = ramp[k + 1];
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * f) + ',' + Math.round(a[1] + (b[1] - a[1]) * f) + ',' + Math.round(a[2] + (b[2] - a[2]) * f) + ')';
  }

  function draw(t) {
    var dpr = window.devicePixelRatio || 1, css = canvas.clientWidth || 240;
    if (canvas.width !== Math.round(css * dpr)) { canvas.width = Math.round(css * dpr); canvas.height = canvas.width; }
    var s = canvas.width, cx = s / 2, cy = s * 0.46;
    ctx.clearRect(0, 0, s, s);
    var yaw = t * 2 * Math.PI, pitch = -0.38 + 0.06 * Math.sin(t * 4 * Math.PI), bob = Math.sin(t * 2 * Math.PI) * s * 0.012, scale = s * 0.36;

    var g = ctx.createRadialGradient(cx, cy + bob, 0, cx, cy + bob, s * 0.5);
    g.addColorStop(0, 'rgba(31,111,235,0.38)'); g.addColorStop(1, 'rgba(31,111,235,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy + bob, s * 0.5, 0, 7); ctx.fill();

    var cy_ = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    var world = verts.map(function (v) {
      var x1 = v[0] * cy_ + v[2] * sy, z1 = -v[0] * sy + v[2] * cy_;
      return [x1, v[1] * cp - z1 * sp, v[1] * sp + z1 * cp];
    });
    function proj(v) { var k = 5 / (5 - v[2]); return [cx + v[0] * scale * k, cy + bob - v[1] * scale * k]; }
    var pts = world.map(proj), drawn = [], sparkles = [];
    faces.forEach(function (f) {
      var a = world[f.v[0]], b = world[f.v[1]], d = world[f.v[2]];
      var n = norm(cross(sub(b, a), sub(d, a)));
      if (n[2] <= 0) return;
      var zc = 0; f.v.forEach(function (k) { zc += world[k][2]; }); zc /= f.v.length;
      var diffuse = Math.max(-1, Math.min(1, dot(n, light))) * 0.5 + 0.5;
      var glint = Math.pow(Math.max(0, Math.min(1, dot(n, half))), 38);
      var rim = 1 - Math.max(0, Math.min(1, n[2]));
      var v = diffuse * 0.78 + rim * 0.16 + f.tone + glint * 0.9;
      drawn.push({ z: zc, f: f, color: shade(v), glint: glint });
      if (glint > 0.5) {
        var cxs = 0, cys = 0; f.v.forEach(function (k) { cxs += pts[k][0]; cys += pts[k][1]; });
        sparkles.push([cxs / f.v.length, cys / f.v.length, glint]);
      }
    });
    drawn.sort(function (p, q) { return p.z - q.z; });
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(0.6, s / 300);
    drawn.forEach(function (d) {
      ctx.beginPath(); ctx.moveTo(pts[d.f.v[0]][0], pts[d.f.v[0]][1]);
      for (var k = 1; k < d.f.v.length; k++) ctx.lineTo(pts[d.f.v[k]][0], pts[d.f.v[k]][1]);
      ctx.closePath(); ctx.fillStyle = d.color; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.stroke();
      if (d.glint > 0.35) { ctx.fillStyle = 'rgba(255,255,255,' + ((d.glint - 0.35) * 0.6).toFixed(3) + ')'; ctx.fill(); }
    });
    sparkles.forEach(function (p) {
      var r = s * 0.07 * p[2], x = p[0], y = p[1];
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.moveTo(x, y - r);
      ctx.quadraticCurveTo(x, y, x + r * 0.55, y); ctx.quadraticCurveTo(x, y, x, y + r);
      ctx.quadraticCurveTo(x, y, x - r * 0.55, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
    });
  }

  if (still) { draw(0.62); return; }
  var start = null;
  function frame(ts) { if (start === null) start = ts; draw(((ts - start) / 16000) % 1); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
})();
