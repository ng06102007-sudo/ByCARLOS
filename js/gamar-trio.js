// GAMAR: the three watches behind the Alps (#gamar-trio). At first only the mountains show, on black. Scrolling raises
// the GM-02, the GM-01 SM and the GM-01 from behind the ridge (the masked panorama in front hides the lower straps),
// and brings in each name above its watch. The sky stays black. Everything follows the scroll and runs back
// when scrolling up. On a phone the watches are larger and the row then slides from one watch to the next.
// Before they come up, the GAMAR emblem glows in the dark sky behind the ridge; it fades out as they rise.
(() => {
  const root = document.getElementById('gamar-trio');
  if (!root) return;
  const row = root.querySelector('.gm-trio-row');
  const ws = [...root.querySelectorAll('.gm-trio-w')], names = ws.map(w => w.querySelector('figcaption'));
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const mobile = matchMedia('(max-width: 700px)');
  const logo = root.querySelector('.gm-trio-logo');

  let target = 0, cur = -1, last = 0, raf = 0;
  const read = () => {
    const r = root.getBoundingClientRect(), run = r.height - innerHeight;
    target = Math.min(1, Math.max(0, -r.top / Math.max(1, run)));
  };
  const paint = p => {
    const phone = mobile.matches, H = innerHeight;
    // rise: a quarter of a second apart, the middle watch last; when hidden the dials sit well below the ridge
    const span = phone ? [0.04, 0.34] : [0.06, 0.62];
    // hidden: each watch starts below the bottom edge, behind the mountains
    const drop = ws.map(w => H - (w.offsetTop - 0.8 * w.offsetWidth) + 20);
    const rise = ws.map((_, i) => ss(span[0] + [0, 0.05, 0.025][i], span[1] + [0, 0.05, 0.025][i], p));
    // the names appear as soon as the dials come out
    ws.forEach((w, i) => {
      w.style.transform = `translate3d(0, ${((1 - rise[i]) * drop[i]).toFixed(1)}px, 0)`;
      const n = ss(phone ? 0.16 : 0.28, phone ? 0.32 : 0.56, p) * Math.min(1, rise[i] * 1.6);
      names[i].style.opacity = n.toFixed(3);
      names[i].style.transform = `translate(-50%, ${((1 - n) * 10).toFixed(1)}px)`;
    });
    // phone: start on the GM-02, slide to the GM-01 SM, then to the GM-01
    let x = 0;
    if (phone) {
      const s = ss(0.42, 0.6, p) + ss(0.7, 0.88, p);          // 0 → 1 → 2
      x = (1 - s) * innerWidth * 0.72;
    }
    row.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
    logo.style.opacity = (1 - ss(phone ? 0.04 : 0.06, phone ? 0.18 : 0.26, p)).toFixed(3);   // gone as the watches come up
  };
  const step = t => {
    raf = 0;
    if (root.closest('[hidden]')) return;
    const dt = last ? Math.min(64, t - last) : 16.7; last = t;
    read();
    if (cur < 0) cur = target;
    cur += (target - cur) * (1 - Math.pow(0.84, dt / 16.7));   // eased: follows the gesture without stepping
    if (Math.abs(target - cur) < 0.0004) cur = target;
    paint(cur);
    if (cur !== target) raf = requestAnimationFrame(step); else last = 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', () => { cur = -1; kick(); });
  addEventListener('hashchange', () => setTimeout(() => { cur = -1; kick(); }, 50));
  kick();
})();
