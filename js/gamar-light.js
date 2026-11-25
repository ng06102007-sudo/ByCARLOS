// The GAMAR page opens on the GM-02 (#gamar-light): 13 Cycles renders (front view, transparent WebP, 1800 px) from
// "model 3D gm02.blend", the same camera each time, with the studio light swept across the watch and faded in and out.
// The scroll through the tall strip picks the frame: dark → full light → dark.
// Made to stay smooth: every frame is decoded once, ahead of time, then two neighbouring frames are cross-faded on a
// canvas (no picture is swapped or decoded while scrolling), and the light follows the scroll with a light easing.
(() => {
  const root = document.getElementById('gamar-light');
  if (!root) return;
  const poster = root.querySelector('.gm-light-a'), canvas = root.querySelector('.gm-light-canvas');
  const ctx = canvas.getContext('2d');
  const N = 13, src = i => `media/gamar/lumiere/f${String(i).padStart(2, '0')}.webp?v=3`;
  const frames = new Array(N).fill(null);
  let started = false, live = false;

  const loadAll = () => {
    if (started) return; started = true;
    const one = i => new Promise(res => {
      const im = new Image(); im.decoding = 'async'; im.src = src(i);
      const done = f => { frames[i] = f; res(); };
      im.onload = () => im.decode().catch(() => {})
        .then(() => (window.createImageBitmap ? createImageBitmap(im).catch(() => im) : im)).then(done);
      im.onerror = () => res();
    });
    // the middle (lit) frames first, then outwards
    const order = [...Array(N).keys()].sort((a, b) => Math.abs(a - 6) - Math.abs(b - 6));
    Promise.all(order.map(one)).then(() => { live = frames.every(Boolean); root.classList.toggle('live', live); size(); kick(); });
  };

  let W = 0;
  const size = () => {
    const w = canvas.getBoundingClientRect().width; if (!w) return;
    const px = Math.min(1800, Math.round(w * Math.min(devicePixelRatio || 1, 2)));
    if (px !== W) { W = canvas.width = canvas.height = px; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; shown = -1; }
  };

  const nearest = i => { for (let d = 0; d < N; d++) { if (frames[i - d]) return frames[i - d]; if (frames[i + d]) return frames[i + d]; } return null; };
  let shown = -1;
  const paint = p => {
    if (!W) return;
    const f = p * (N - 1), i = Math.min(N - 2, Math.floor(f)), k = Math.round((f - i) * 200) / 200;   // 200 steps are plenty
    const key = i + k; if (key === shown) return; shown = key;
    const a = frames[i] || nearest(i), b = frames[i + 1];
    ctx.clearRect(0, 0, W, W);
    if (a) { ctx.globalAlpha = 1; ctx.drawImage(a, 0, 0, W, W); }
    if (b && k > 0) { ctx.globalAlpha = k; ctx.drawImage(b, 0, 0, W, W); }
    ctx.globalAlpha = 1;
  };

  let target = 0, cur = 0, last = 0, raf = 0;
  const read = () => {
    const r = root.getBoundingClientRect(), run = r.height - innerHeight;
    target = Math.min(1, Math.max(0, -r.top / Math.max(1, run)));
  };
  const step = t => {
    raf = 0;
    if (root.closest('[hidden]')) return;
    loadAll();
    const dt = last ? Math.min(64, t - last) : 16.7; last = t;
    read();
    cur += (target - cur) * (1 - Math.pow(0.86, dt / 16.7));   // eased: follows the scroll without stepping
    if (Math.abs(target - cur) < 0.0004) cur = target;
    if (live) paint(cur);
    root.style.setProperty('--lit', Math.pow(Math.sin(Math.PI * cur), 2).toFixed(3));   // the emblem and the name come with the light
    root.classList.toggle('moved', cur > 0.03);
    if (cur !== target) raf = requestAnimationFrame(step); else last = 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', () => { size(); kick(); });
  addEventListener('hashchange', () => setTimeout(() => { size(); kick(); }, 50));
  kick();
})();
