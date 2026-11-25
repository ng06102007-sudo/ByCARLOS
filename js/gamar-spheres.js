// GAMAR: the materials of each watch as spheres, in one 3D canvas per page (.gm-spheres, data-set = gm02 | sm | gm01),
// as they were set up in Blender. GM-02: the three forged carbons (real scans, with a relief and glossy fibres taken from
// their brightness), the steels, the sandblasted dial, the black grain bridges, the gold balance, the rubber.
// GM-01 SM: steels, the grained black dial, the lume, the canvas rubber in its five colours. GM-01: steels, the blue dial,
// the date disc, the lume, the sapphire, the movement plate and rotor.
(() => {
  document.querySelectorAll('.gm-spheres').forEach(root => {
  const CDN = 'https://cdn.jsdelivr.net/npm/three@0.147.0/';
  const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // a canvas texture from a function of (x, y) in 0..1 -> [r, g, b] 0..255
  const paint = (n, f) => { const c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'), d = x.createImageData(n, n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const o = (j * n + i) * 4, v = f(i / n, j / n, i, j); d.data[o] = v[0]; d.data[o + 1] = v[1]; d.data[o + 2] = v[2]; d.data[o + 3] = 255; }
    x.putImageData(d, 0, 0); return c; };
  const rnd = (i, j, s) => { const v = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };

  const start = async () => {
    const SET = root.dataset.set || 'gm02';
    if (!window.THREE) await load(CDN + 'build/three.min.js');
    if (!THREE.RoomEnvironment) await load(CDN + 'examples/js/environments/RoomEnvironment.js');
    if (!window.GM_CARBON) await load('media/gamar/carbone%20textures.js');
    const T = THREE, canvas = root.querySelector('canvas');
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    const scene = new T.Scene();
    scene.environment = new T.PMREMGenerator(renderer).fromScene(new T.RoomEnvironment(), 0.04).texture;
    const key = new T.DirectionalLight(0xffffff, 1.2); key.position.set(-3, 4, 5); scene.add(key);
    const camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 50); camera.position.set(0, 0, 10);

    const tex = (c, colour, rep = 1) => { const t = new T.CanvasTexture(c); if (colour) t.encoding = T.sRGBEncoding; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8; return t; };
    // the carbon scans: colour, relief and gloss from their brightness (as on the block and the watch)
    const carbon = src => new Promise(res => { const im = new Image(); im.onload = () => {
      const n = 512, c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'); x.drawImage(im, 0, 0, n, n);
      const d = x.getImageData(0, 0, n, n).data, L = new Float32Array(n * n);
      for (let i = 0; i < n * n; i++) L[i] = (0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2]) / 255;
      const at = (i, j) => L[((j + n) % n) * n + ((i + n) % n)];
      const nm = paint(n, (u, v, i, j) => { const gx = (at(i + 1, j) - at(i - 1, j)) * 5, gy = (at(i, j + 1) - at(i, j - 1)) * 5, k = 1 / Math.hypot(gx, gy, 1); return [(-gx * k * .5 + .5) * 255, (gy * k * .5 + .5) * 255, (k * .5 + .5) * 255]; });
      const orm = paint(n, (u, v, i, j) => { const l = at(i, j); return [255, (0.9 - 0.75 * Math.pow(l, 0.8)) * 255, Math.pow(l, 1.4) * 0.6 * 255]; });
      const o = tex(orm, false, 1.5);
      res(new T.MeshPhysicalMaterial({ map: tex(c, true, 1.5), normalMap: tex(nm, false, 1.5), normalScale: new T.Vector2(1.4, 1.4), roughnessMap: o, metalnessMap: o, roughness: 1, metalness: 1, clearcoat: 0.12, clearcoatRoughness: 0.5 }));
    }; im.src = src; });
    // brushing: fine horizontal lines as a normal map; sandblasting and grain: a speckled relief
    const brushN = tex(paint(512, (u, v, i, j) => { const s = (rnd(0, j, 3) - 0.5) * 0.5; return [128, 128 + s * 255, 230]; }), false, 2);
    const blastN = tex(paint(256, (u, v, i, j) => [128 + (rnd(i, j, 1) - .5) * 70, 128 + (rnd(i, j, 2) - .5) * 70, 235]), false, 3);
    const stripeN = tex(paint(512, (u, v, i, j) => [128 + Math.sin(i / 3) * 40, 128, 235]), false, 1);
    const M = (o) => new T.MeshPhysicalMaterial(o);
    const toile = GM_CARBON.toile && tex(await new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = GM_CARBON.toile; }), true, 2);
    const strap = c => M({ color: c, map: toile || null, metalness: 0, roughness: 0.85, envMapIntensity: 0.4 });
    const lists = {
      gm02: () => [
        ['GAMAR turquoise carbon', carbon(GM_CARBON.gamar_face)],
        ['Black carbon', carbon(GM_CARBON.noir_face)],
        ['White carbon', carbon(GM_CARBON.blanc_face)],
        ['Polished steel', M({ color: 0xd9dadc, metalness: 1, roughness: 0.12 })],
        ['Brushed steel', M({ color: 0xc9cbce, metalness: 1, roughness: 0.32, normalMap: brushN, normalScale: new T.Vector2(0.6, 0.6) })],
        ['Black steel', M({ color: 0x141516, metalness: 1, roughness: 0.38, envMapIntensity: 0.6 })],
        ['Sandblasted dial', M({ color: 0x8b8d91, metalness: 0.6, roughness: 0.66, envMapIntensity: 0.8, normalMap: blastN, normalScale: new T.Vector2(0.5, 0.5) })],
        ['Black grain bridges', M({ color: 0x0c0c0d, metalness: 0.4, roughness: 0.6, envMapIntensity: 0.5, normalMap: blastN, normalScale: new T.Vector2(0.8, 0.8) })],
        ['Gold balance', M({ color: 0xd8b25e, metalness: 1, roughness: 0.22 })],
        ['Rubber strap', M({ color: 0x0a0a0a, metalness: 0, roughness: 0.9, envMapIntensity: 0.35 })],
      ],
      sm: () => [
        ['Polished steel', M({ color: 0xd9dadc, metalness: 1, roughness: 0.1 })],
        ['Vertical brushing', M({ color: 0xc9cbce, metalness: 1, roughness: 0.3, normalMap: brushN, normalScale: new T.Vector2(0.7, 0.7) })],
        ['Grained black dial', M({ color: 0x151516, metalness: 0.2, roughness: 0.7, envMapIntensity: 0.6, normalMap: blastN, normalScale: new T.Vector2(0.9, 0.9) })],
        ['Super-LumiNova', M({ color: 0xe9eef0, metalness: 0, roughness: 0.6, emissive: 0x8fd3ff, emissiveIntensity: 0.18 })],
        ['Red lacquer', M({ color: 0xa3141b, metalness: 0, roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.1 })],
        ['Canvas rubber · black', strap(0x1a1a1a)],
        ['Canvas rubber · grey', strap(0x77797c)],
        ['Canvas rubber · orange', strap(0xd8662a)],
        ['Canvas rubber · navy', strap(0x1d2a4a)],
        ['Canvas rubber · khaki', strap(0x5f6440)],
      ],
      gm01: () => [
        ['Polished steel', M({ color: 0xd9dadc, metalness: 1, roughness: 0.1 })],
        ['Brushed steel', M({ color: 0xc9cbce, metalness: 1, roughness: 0.32, normalMap: brushN, normalScale: new T.Vector2(0.6, 0.6) })],
        ['Blue striped dial', M({ color: 0x2546c8, metalness: 0.5, roughness: 0.35, normalMap: stripeN, normalScale: new T.Vector2(0.8, 0.8) })],
        ['White date disc', M({ color: 0xf2f2ef, metalness: 0, roughness: 0.45 })],
        ['Super-LumiNova', M({ color: 0xe9eef0, metalness: 0, roughness: 0.6, emissive: 0x8fd3ff, emissiveIntensity: 0.18 })],
        ['Sapphire crystal', M({ color: 0xffffff, metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.4, ior: 1.77, clearcoat: 1 })],
        ['Movement plate', M({ color: 0xb9bcbf, metalness: 1, roughness: 0.4, normalMap: blastN, normalScale: new T.Vector2(0.4, 0.4) })],
        ['Rhodium rotor', M({ color: 0xd2d4d7, metalness: 1, roughness: 0.22, normalMap: stripeN, normalScale: new T.Vector2(0.4, 0.4) })],
      ],
    };
    const list = lists[SET]();
    const mats = await Promise.all(list.map(([, m]) => m));
    const geo = new T.SphereGeometry(0.42, 96, 64);
    const balls = mats.map(m => { const b = new T.Mesh(geo, m); scene.add(b); return b; });

    // the labels, laid out with the spheres
    const labels = root.querySelector('.gm-spheres-labels');
    labels.innerHTML = list.map(([n]) => `<li>${n}</li>`).join('');
    const items = [...labels.children];
    const layout = () => {
      const w = canvas.clientWidth, cols = w < 560 ? 2 : w < 900 ? 4 : 5, rows = Math.ceil(balls.length / cols);
      const cell = w / cols, h = Math.round(cell * rows * 1.18);
      canvas.style.height = h + 'px'; renderer.setSize(w, h, false);
      // orthographic: one unit per cell
      camera.left = 0; camera.right = cols; camera.top = 0; camera.bottom = -rows * 1.18; camera.updateProjectionMatrix();
      balls.forEach((b, k) => { const c = k % cols, r = Math.floor(k / cols); b.position.set(c + 0.5, -(r * 1.18 + 0.5), 0); });
      items.forEach((li, k) => { const c = k % cols, r = Math.floor(k / cols); li.style.left = ((c + 0.5) / cols * 100) + '%'; li.style.top = ((r * 1.18 + 1.0) / (rows * 1.18) * 100) + '%'; });
    };
    layout(); addEventListener('resize', layout);
    let on = true;
    new IntersectionObserver(es => { on = es.some(e => e.isIntersecting); }).observe(root);
    renderer.setAnimationLoop(t => { if (!on || root.closest('[hidden]')) return; if (!reduced) balls.forEach((b, k) => { b.rotation.y = t / 4000 + k; }); renderer.render(scene, camera); });
    root.classList.add('ready');
  };
  let started = false;
  new IntersectionObserver(es => { if (!started && es.some(e => e.isIntersecting)) { started = true; start().catch(e => { console.warn('spheres', e); root.classList.add('failed'); }); } }, { rootMargin: '600px 0px' }).observe(root);
  });
})();
