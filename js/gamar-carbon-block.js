// GAMAR: a block of forged carbon in 3D, in the "02 / The case" part of the GM-02 page.
// Same scans as the watch ("media /gamar/carbone textures.js"): the face of the carbon on the top and the bottom,
// the layered tranche around the sides, laid lengthwise as on the case. It turns slowly; drag to turn it; the buttons
// change the colourway (GAMAR turquoise, black, white).
(() => {
  const roots = document.querySelectorAll('.gm-carbon-block');
  if (!roots.length) return;
  const CDN = 'https://cdn.jsdelivr.net/npm/three@0.147.0/';
  const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WAYS = { gamar: ['gamar_face', 'gamar_tranche'], noir: ['noir_face', 'tranche_noir_v'], blanc: ['blanc_face', 'tranche_blanc_v'] };

  const libs = async () => {
    if (!window.THREE) await load(CDN + 'build/three.min.js');
    if (!THREE.OrbitControls) await load(CDN + 'examples/js/controls/OrbitControls.js');
    if (!THREE.RoomEnvironment) await load(CDN + 'examples/js/environments/RoomEnvironment.js');
    if (!window.GM_CARBON) await load('media/gamar/carbone%20textures.js');
  };

  const start = async root => {
    await libs();
    const T = THREE, canvas = root.querySelector('canvas');
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
    const scene = new T.Scene();
    const pm = new T.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture;
    const key = new T.DirectionalLight(0xffffff, 1.4); key.position.set(3, 5, 2); scene.add(key);
    const rim = new T.DirectionalLight(0xffffff, 0.8); rim.position.set(-4, 2, -3); scene.add(rim);   // a second light so the glints show as it turns
    const camera = new T.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(2.3, 1.9, 2.7);
    const controls = new T.OrbitControls(camera, canvas);
    controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true;
    controls.autoRotate = !reduced; controls.autoRotateSpeed = 1.2;
    canvas.style.touchAction = 'pan-y';

    // the block: 1.9 long, 1.2 deep, 0.3 thick
    const W = 1.9, D = 1.2, H = 0.3;
    const geo = new T.BoxGeometry(W, H, D);
    // from each scan, three maps are drawn on a canvas: the colour, a normal map (relief taken from the brightness, so the
    // fibres stand slightly proud of the resin) and a roughness / metalness map (bright fibres glossy with a light metallic
    // glint, dark resin matt)
    const cache = {};
    const derive = src => cache[src] || (cache[src] = new Promise(res => {
      const im = new Image(); im.onload = () => {
        const k = Math.min(1, 1024 / Math.max(im.width, im.height)), w = Math.round(im.width * k), h = Math.round(im.height * k);
        const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h);
        const d = x.getImageData(0, 0, w, h).data, L = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) L[i] = (0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2]) / 255;
        const nC = document.createElement('canvas'), oC = document.createElement('canvas'); nC.width = oC.width = w; nC.height = oC.height = h;
        const nx = nC.getContext('2d'), ox = oC.getContext('2d'), nD = nx.createImageData(w, h), oD = ox.createImageData(w, h);
        const at = (i, j) => L[Math.min(h - 1, Math.max(0, j)) * w + Math.min(w - 1, Math.max(0, i))];
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
          const o = (j * w + i) * 4, gx = (at(i + 1, j) - at(i - 1, j)) * 5, gy = (at(i, j + 1) - at(i, j - 1)) * 5;
          const n = 1 / Math.hypot(gx, gy, 1);
          nD.data[o] = (-gx * n * 0.5 + 0.5) * 255; nD.data[o + 1] = (gy * n * 0.5 + 0.5) * 255; nD.data[o + 2] = (n * 0.5 + 0.5) * 255; nD.data[o + 3] = 255;
          const l = L[j * w + i];
          oD.data[o] = 255; oD.data[o + 1] = (0.9 - 0.75 * Math.pow(l, 0.8)) * 255; oD.data[o + 2] = Math.pow(l, 1.4) * 0.6 * 255;   // bright fibres: glossy and slightly metallic; dark resin: matt oD.data[o + 3] = 255;
        }
        nx.putImageData(nD, 0, 0); ox.putImageData(oD, 0, 0);
        res({ map: c, normal: nC, orm: oC });
      };
      im.src = src;
    }));
    const tex = (img, rx, ry, rot, colour) => {
      const t = new T.CanvasTexture(img); if (colour) t.encoding = T.sRGBEncoding; t.wrapS = t.wrapT = T.MirroredRepeatWrapping;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.repeat.set(rx, ry);
      if (rot) { t.center.set(0.5, 0.5); t.rotation = rot; }
      return t;
    };
    const mat = (m, rx, ry, rot) => {
      const orm = tex(m.orm, rx, ry, rot);
      return new T.MeshPhysicalMaterial({ map: tex(m.map, rx, ry, rot, true), normalMap: tex(m.normal, rx, ry, rot), normalScale: new T.Vector2(1.6, 1.6),
        roughnessMap: orm, metalnessMap: orm, roughness: 1, metalness: 1, clearcoat: 0.12, clearcoatRoughness: 0.5 });
    };
    // face order of a BoxGeometry: +x, -x, +y (top), -y (bottom), +z, -z
    // the tranche scan is a tall strip: turned a quarter so its layers run along each side, one scan stretched over
    // the whole length of the side, its width repeated across the thickness so the layers stay fine
    // with the quarter turn, the first repeat counts the layers across the thickness and the second the scans along the
    // length: the blue (GAMAR turquoise) tranche gets finer layers, every tranche one long scan stretched along the side
    const SIDES = { gamar: [3.2, 0.8], noir: [1, 1], blanc: [1, 1] };
    // the steel block (GM-01, GM-01 SM): brushed on the top and the bottom, mirror-polished on the sides, as on the cases
    const steelTone = { steel: 0x9fa3a8, black: 0x1e1f21 };
    const brush = (() => { const n = 512, c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'), d = x.createImageData(n, n);
      for (let j = 0; j < n; j++) { const v = (Math.sin(j * 12.9898 + 3.1) * 43758.5453) % 1; for (let i = 0; i < n; i++) { const o = (j * n + i) * 4; d.data[o] = 128; d.data[o + 1] = 128 + (Math.abs(v) - 0.5) * 120; d.data[o + 2] = 225; d.data[o + 3] = 255; } }
      x.putImageData(d, 0, 0); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1, 2); return t; })();
    const steel = () => {
      const col = steelTone[root.dataset.way] || steelTone.steel;
      const top = new T.MeshPhysicalMaterial({ color: col, metalness: 1, roughness: 0.34, normalMap: brush, normalScale: new T.Vector2(1.2, 1.2), envMapIntensity: 0.85 });
      const side = new T.MeshPhysicalMaterial({ color: col, metalness: 1, roughness: 0.08, envMapIntensity: 0.9 });
      return [side, side, top, top, side, side];
    };
    const mats = async () => {
      if (root.dataset.material === 'steel') return steel();
      const [sx, sy] = SIDES[root.dataset.way || 'gamar'];
      const [f, s] = await Promise.all(WAYS[root.dataset.way || 'gamar'].map(k => derive(GM_CARBON[k])));
      return [mat(s, sx, sy, Math.PI / 2), mat(s, sx, sy, Math.PI / 2), mat(f, 1, D / W), mat(f, 1, D / W),
              mat(s, sx, sy, Math.PI / 2), mat(s, sx, sy, Math.PI / 2)];
    };
    const block = new T.Mesh(geo, await mats());
    block.rotation.y = -0.35;
    scene.add(block);

    root.querySelectorAll('[data-way]').forEach(b => b.addEventListener('click', () => {
      root.dataset.way = b.dataset.way;
      root.querySelectorAll('[data-way]').forEach(x => x.setAttribute('aria-pressed', x === b));
      const old = block.material;
      mats().then(m => { block.material = m; if (root.dataset.material !== 'steel') old.forEach(o => { [o.map, o.normalMap, o.roughnessMap].forEach(t => t && t.dispose()); o.dispose(); }); });
    }));

    // the camera stands back far enough for the whole block to stay inside the frame from every angle
    const radius = 0.5 * Math.hypot(W, H, D);
    const size = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      const half = Math.min(T.MathUtils.degToRad(camera.fov / 2), Math.atan(Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
      camera.position.setLength(radius / Math.sin(half) * 1.06);
    };
    size(); addEventListener('resize', size);
    let on = true;
    new IntersectionObserver(es => { on = es.some(e => e.isIntersecting); }).observe(root);
    renderer.setAnimationLoop(() => { if (!on || root.closest('[hidden]')) return; controls.update(); renderer.render(scene, camera); });
    root.classList.add('ready');
    root.__gcb = { T, camera, controls, block, renderer, scene };
  };

  roots.forEach(root => {
    let started = false;
    new IntersectionObserver(es => { if (!started && es.some(e => e.isIntersecting)) { started = true; start(root).catch(e => { console.warn('carbon block', e); root.classList.add('failed'); }); } }, { rootMargin: '600px 0px' }).observe(root);
  });
})();
