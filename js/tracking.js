// Motion-tracking overlay for the My projects screen.
//
// It really looks at the background: every frame, the video (or the canvas that replaces it) is drawn
// small (about 192 px wide) and turned to grey. High-contrast details — corners, edges of the flames,
// the house, the horse — are picked as tracking points (Shi-Tomasi corner score), then followed from one
// frame to the next by matching a small patch of pixels around each point. Points that are lost or have
// lived long enough fade out and new ones are found elsewhere, so the selection slowly wanders around the image.
//
// On top of the points: thin lines to the nearest neighbours, a few selection frames with corner ticks,
// small numeric read-outs and, rarely, a blue accent. Everything is kept faint over the text of the page.
//
//   Tracking.start(getProtectedRects)  fade in and run (getProtectedRects returns the text areas to keep clear)
//   Tracking.stop()                    fade out and stop
// With "reduce motion" turned on, it draws a still analysis of the frame and refreshes it every few seconds.
window.Tracking = (() => {
  const BLUE = '61, 107, 255';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const cv = document.createElement('canvas');
  cv.className = 'tracking'; cv.setAttribute('aria-hidden', 'true');
  (document.getElementById('grain') || document.body.firstChild).before(cv);   // under the film grain, above the video
  const ctx = cv.getContext('2d');
  const an = document.createElement('canvas');                                  // small analysis copy of the background
  const actx = an.getContext('2d', { willReadFrequently: true });

  let W = 0, H = 0, dpr = 1, AW = 0, AH = 0, k = 1, mobile = false;
  let gray = null, prev = null, readable = true;
  let points = [], boxes = [], nextId = 1, frameNo = 0;
  let running = false, raf = 0, lastT = 0, lastDetect = 0, lastBox = 0, alpha = 0, fading = 0;
  let protectedRects = [], getRects = () => [], staticTimer = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pad = (n, l) => String(Math.round(n)).padStart(l, '0');

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight; mobile = W < 700;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    AW = mobile ? 120 : 192; AH = Math.max(40, Math.round(AW * H / W)); k = W / AW;
    an.width = AW; an.height = AH;
    gray = new Float32Array(AW * AH); prev = new Float32Array(AW * AH);
    points = []; boxes = [];
    protectedRects = getRects();
  }

  // ---------- reading the background ----------
  function grab() {
    const src = window.Fond && Fond.source && Fond.source();
    if (!src || !readable) return false;
    const sw = src.videoWidth || src.width, sh = src.videoHeight || src.height;
    if (!sw || !sh) return false;
    const s = Math.max(AW / sw, AH / sh);                                    // same framing as object-fit: cover
    try {
      actx.drawImage(src, (AW - sw * s) / 2, (AH - sh * s) / 2, sw * s, sh * s);
      const d = actx.getImageData(0, 0, AW, AH).data;
      const t = prev; prev = gray; gray = t;
      for (let i = 0, j = 0; i < gray.length; i++, j += 4) gray[i] = d[j] * .299 + d[j + 1] * .587 + d[j + 2] * .114;
      return true;
    } catch (e) { readable = false; return false; }                           // pixels not readable (e.g. opened as a file)
  }

  // corner strength (smallest eigenvalue of the local gradient matrix) on a coarse grid
  // (details that flicker from one frame to the next, like flames, are skipped: they can't be followed)
  function findCorners(n) {
    const g = gray, f = prev, out = [];
    for (let y = 4; y < AH - 4; y += 2) for (let x = 4; x < AW - 4; x += 2) {
      let a = 0, b = 0, c = 0, flick = 0;
      for (let v = -2; v <= 2; v++) for (let u = -2; u <= 2; u++) {
        const i = (y + v) * AW + x + u;
        const ix = g[i + 1] - g[i - 1], iy = g[i + AW] - g[i - AW];
        a += ix * ix; b += ix * iy; c += iy * iy; flick += Math.abs(g[i] - f[i]);
      }
      if (flick / 25 > 9) continue;
      const score = (a + c) / 2 - Math.sqrt(((a - c) / 2) ** 2 + b * b);
      if (score > 900) out.push({ x, y, score });
    }
    out.sort((p, q) => q.score - p.score);
    const pool = out.slice(0, 60), picked = [], minD = mobile ? 14 : 12;
    while (picked.length < n && pool.length) {                                 // a little randomness: new areas get picked over time
      const c = pool.splice(Math.floor(Math.random() * Math.min(pool.length, 12)), 1)[0];
      const far = [...points, ...picked].every(p => (p.x - c.x) ** 2 + (p.y - c.y) ** 2 > minD * minD);
      if (far) picked.push(c);
    }
    return picked;
  }

  // follow one point: best match of its 7x7 patch (brightness-neutral) within ±4 px
  function track(p) {
    const R = 3, S = 4, g = gray, f = prev;
    if (p.x < R + S + 1 || p.y < R + S + 1 || p.x > AW - R - S - 2 || p.y > AH - R - S - 2) return false;
    const px = Math.round(p.x), py = Math.round(p.y);
    let tm = 0; for (let v = -R; v <= R; v++) for (let u = -R; u <= R; u++) tm += f[(py + v) * AW + px + u];
    tm /= 49;
    let best = 1e9, bx = 0, by = 0;
    for (let dy = -S; dy <= S; dy++) for (let dx = -S; dx <= S; dx++) {
      let cm = 0; for (let v = -R; v <= R; v++) for (let u = -R; u <= R; u++) cm += g[(py + dy + v) * AW + px + dx + u];
      cm /= 49;
      let e = 0;
      for (let v = -R; v <= R && e < best; v++) for (let u = -R; u <= R; u++)
        e += Math.abs((g[(py + dy + v) * AW + px + dx + u] - cm) - (f[(py + v) * AW + px + u] - tm));
      if (e < best) { best = e; bx = dx; by = dy; }
    }
    p.err = best / 49;
    if (p.err > 26) { p.miss = (p.miss || 0) + 1; return p.miss < 6; }    // a few bad frames are tolerated: the point holds still
    p.miss = 0;
    p.x = px + bx; p.y = py + by;
    return true;
  }

  // ---------- keeping the text readable ----------
  const inText = (x, y, m = 0) => protectedRects.some(r => x > r.left - m && x < r.right + m && y > r.top - m && y < r.bottom + m);

  // ---------- simulation step ----------
  function step(now, dt) {
    const target = mobile ? 9 : 16;
    const ok = grab();
    if (ok) {
      frameNo++;
      for (const p of points) if (!p.dying && (!track(p) || now > p.dieAt)) { p.dying = true; p.deadAt = now; }
      if (now - lastDetect > 350 && points.filter(p => !p.dying).length < target) {
        lastDetect = now;
        for (const c of findCorners(Math.min(2, target - points.length)))
          points.push({ id: nextId++, x: c.x, y: c.y, sx: c.x * k, sy: c.y * k, born: now, dieAt: now + rand(4000, 9000), blue: Math.random() < .1 });
      }
    } else {
      // no pixels to read: gentle drifting points, so the screen still looks alive
      if (points.length < target && now - lastDetect > 350) {
        lastDetect = now;
        points.push({ id: nextId++, x: rand(8, AW - 8), y: rand(8, AH - 8), sx: 0, sy: 0, born: now, dieAt: now + rand(4000, 9000), blue: Math.random() < .1, vx: rand(-2, 2), vy: rand(-1.5, 1.5) });
        const p = points[points.length - 1]; p.sx = p.x * k; p.sy = p.y * k;
      }
      for (const p of points) { p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; if (now > p.dieAt && !p.dying) { p.dying = true; p.deadAt = now; } }
    }
    points = points.filter(p => !p.dying || now - p.deadAt < 600);
    const ease = 1 - Math.pow(.001, dt);                                        // smooth, frame-rate independent
    for (const p of points) { p.sx += (p.x * k - p.sx) * ease; p.sy += (p.y * k - p.sy) * ease; }

    // selection frames: a new one every ~2 s on a settled point away from the text
    const maxBoxes = mobile ? 2 : 3;
    boxes = boxes.filter(b => now - b.born < b.life + 500 && points.some(p => p.id === b.pid));
    if (now - lastBox > rand(1600, 2600)) {
      const free = points.filter(p => !p.dying && now - p.born > 700 && !boxes.some(b => b.pid === p.id) && !inText(p.sx, p.sy, 40));
      if (free.length) {
        lastBox = now;
        if (boxes.length >= maxBoxes) boxes.shift();
        const p = free[Math.floor(Math.random() * free.length)];
        const size = mobile ? rand(28, 46) : rand(36, 72);
        boxes.push({ pid: p.id, born: now, life: rand(3200, 5600), w: size * rand(.85, 1.3), h: size, blue: p.blue || Math.random() < .15 });
      }
    }
  }

  // ---------- drawing ----------
  function fadeOf(p, now) {
    const inn = Math.min(1, (now - p.born) / 500);
    return p.dying ? inn * Math.max(0, 1 - (now - p.deadAt) / 600) : inn;
  }

  function draw(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (alpha <= 0) return;
    ctx.lineWidth = 1;
    const col = (blue, a) => `rgba(${blue ? BLUE : '255, 255, 255'}, ${a * alpha})`;
    const dim = (x, y) => inText(x, y, 6) ? .4 : 1;

    // lines to the nearest neighbours (they reconnect as the points move)
    const maxD = Math.min(W, H) * (mobile ? .32 : .26), done = new Set();
    for (const p of points) {
      const near = points.filter(q => q !== p).map(q => ({ q, d: Math.hypot(q.sx - p.sx, q.sy - p.sy) }))
        .filter(o => o.d < maxD).sort((a, b) => a.d - b.d).slice(0, 2);
      for (const { q, d } of near) {
        const key = p.id < q.id ? p.id + '-' + q.id : q.id + '-' + p.id;
        if (done.has(key)) continue; done.add(key);
        const a = .5 * Math.min(fadeOf(p, now), fadeOf(q, now)) * Math.sqrt(1 - d / maxD) * Math.min(dim(p.sx, p.sy), dim(q.sx, q.sy));
        ctx.strokeStyle = col(p.blue && q.blue, a);
        ctx.beginPath(); ctx.moveTo(p.sx, p.sy); ctx.lineTo(q.sx, q.sy); ctx.stroke();
      }
    }

    // the points: small open squares, with a dot in the middle
    for (const p of points) {
      const a = fadeOf(p, now) * dim(p.sx, p.sy);
      ctx.strokeStyle = col(p.blue, .95 * a);
      ctx.strokeRect(Math.round(p.sx) - 2.5, Math.round(p.sy) - 2.5, 5, 5);
      ctx.fillStyle = col(p.blue, .9 * a);
      ctx.fillRect(Math.round(p.sx) - .5, Math.round(p.sy) - .5, 1, 1);
    }

    // selection frames with corner ticks and read-outs
    ctx.font = `300 ${mobile ? 8 : 9}px "Helv LT", "Helvetica LT Pro", Helvetica, Arial, sans-serif`;
    ctx.textBaseline = 'alphabetic';
    for (const b of boxes) {
      const p = points.find(q => q.id === b.pid); if (!p) continue;
      const age = now - b.born, grow = Math.min(1, age / 320), out = Math.max(0, Math.min(1, (b.life + 500 - age) / 500));
      const a = Math.min(grow, out) * fadeOf(p, now);
      if (a <= 0) continue;
      const w = b.w * (.6 + .4 * grow), h = b.h * (.6 + .4 * grow);
      const x = Math.round(p.sx - w / 2) + .5, y = Math.round(p.sy - h / 2) + .5, t = Math.min(8, w / 4);
      ctx.strokeStyle = col(b.blue, .3 * a); ctx.strokeRect(x, y, w, h);
      ctx.strokeStyle = col(b.blue, .9 * a);
      ctx.beginPath();
      ctx.moveTo(x, y + t); ctx.lineTo(x, y); ctx.lineTo(x + t, y);
      ctx.moveTo(x + w - t, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + t);
      ctx.moveTo(x + w, y + h - t); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - t, y + h);
      ctx.moveTo(x + t, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - t);
      ctx.stroke();
      ctx.fillStyle = col(b.blue, .78 * a);
      const conf = Math.max(.5, 1 - (p.err || 4) / 40);
      ctx.fillText(`TRK ${pad(p.id, 3)}  ${conf.toFixed(2)}`, x, y - 4);
      if (!mobile) ctx.fillText(`X ${pad(p.sx, 4)}  Y ${pad(p.sy, 4)}`, x, y + h + 11);
    }

    // a quiet read-out in the corner
    ctx.fillStyle = col(false, .5);
    ctx.fillText(`TRACKING  ${pad(points.filter(p => !p.dying).length, 2)} PTS  ·  F ${pad(frameNo, 5)}${readable ? '' : '  ·  SIM'}`, 16, H - 14);
  }

  // ---------- running ----------
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(.1, (now - (lastT || now)) / 1000);
    if (now - lastT < 30) { alpha = Math.max(0, Math.min(1, alpha + fading * .03)); draw(now); return; }   // analyse ~30 times a second
    lastT = now;
    alpha = Math.max(0, Math.min(1, alpha + fading * dt * 1.6));
    if (fading < 0 && alpha <= 0) { cancelAnimationFrame(raf); raf = 0; running = false; ctx.clearRect(0, 0, cv.width, cv.height); return; }
    step(now, dt);
    draw(now);
  }

  // reduced motion: a still analysis of the current frame, refreshed every few seconds
  function stillFrame() {
    if (!running) return;
    const now = performance.now();
    points = []; boxes = [];
    if (grab() && grab()) {                                                    // two reads of the same still frame: nothing counts as flickering
      for (const c of findCorners(mobile ? 8 : 14)) points.push({ id: nextId++, x: c.x, y: c.y, sx: c.x * k, sy: c.y * k, born: now - 1000, dieAt: 1e12, blue: Math.random() < .1 });
    } else {
      for (let i = 0; i < (mobile ? 8 : 14); i++) { const x = rand(8, AW - 8), y = rand(8, AH - 8); points.push({ id: nextId++, x, y, sx: x * k, sy: y * k, born: now - 1000, dieAt: 1e12 }); }
    }
    frameNo++;
    const free = points.filter(p => !inText(p.sx, p.sy, 40)).slice(0, mobile ? 2 : 3);
    for (const p of free) boxes.push({ pid: p.id, born: now - 1000, life: 1e12, w: 52, h: 44, blue: Math.random() < .2 });
    alpha = 1; draw(now + 1000);
    staticTimer = setTimeout(stillFrame, 6000);
  }

  addEventListener('resize', () => { if (running) resize(); });

  return {
    start(rects) {
      if (rects) getRects = rects;
      resize();
      running = true; cv.classList.add('on');
      clearTimeout(staticTimer);
      if (reduceMotion.matches) { cancelAnimationFrame(raf); raf = 0; staticTimer = setTimeout(stillFrame, 900); return; }
      fading = 1;
      cancelAnimationFrame(raf); lastT = 0; raf = requestAnimationFrame(loop);   // always (re)start the loop cleanly
    },
    stop() {
      clearTimeout(staticTimer);
      cv.classList.remove('on');
      if (reduceMotion.matches || !raf) { running = false; cancelAnimationFrame(raf); raf = 0; ctx.clearRect(0, 0, cv.width, cv.height); return; }
      fading = -1;
    },
    refreshRects() { protectedRects = getRects(); },
    state: () => ({ points: points.length, live: points.filter(p => !p.dying).length, boxes: boxes.length, readable, frameNo, alpha, AW, AH,
      src: (window.Fond && Fond.source && Fond.source() || {}).tagName,
      pts: points.map(p => [Math.round(p.sx), Math.round(p.sy), p.id, p.blue ? 1 : 0]),
      bx: boxes.map(b => { const p = points.find(q => q.id === b.pid); return p ? [Math.round(p.sx), Math.round(p.sy), b.blue ? 1 : 0, inText(p.sx, p.sy, 40) ? 1 : 0] : null; }) }),   // for checking only
  };
})();
