// 3D model of the DJI Osmo Pocket Rig, at the top of its project page (index.html, #rig3d).
// The model comes from "pub cam dji.blend" (the STL parts, assembled), exported to glTF.
//   - it turns slowly on its own, and can be turned with the mouse, moved (right-drag or shift-drag) and zoomed
//     (trackpad pinch, ⌘/ctrl + wheel, or the + / − buttons; the plain wheel still scrolls the page)
//   - on a phone: swipe sideways to turn it, two fingers to move it and pinch to zoom (an up/down swipe still scrolls)
//   - scrolling down takes it apart, piece by piece (an exploded view), with each part's name; taken apart, it can still be turned, moved and zoomed
// three.js comes from a CDN (classic scripts, so it also works when the site is opened as a local file);
// the model is in "media /dji cam/rig 3d.glb.js" as base64 for the same reason (Safari won't fetch local files).
(() => {
  const root = document.getElementById('rig3d');
  if (!root) return;
  const stage = root.querySelector('.rig3d-stage'), canvas = root.querySelector('canvas');
  const hint = root.querySelector('.rig3d-hint'), labelsEl = root.querySelector('.rig3d-labels');
  const tools = root.querySelector('.rig3d-tools');
  const CDN = 'https://cdn.jsdelivr.net/npm/three@0.147.0/';
  const MODEL = 'media/dji%20cam/rig%203d.glb.js', OSMO = 'media/dji%20cam/osmo%20pocket%203.glb.js';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(pointer: coarse)').matches;

  // in the Blender scene the camera rail and its rear cover are pulled out behind the body and the Osmo Pocket
  // sticks half out of it: these moves (Blender units and axes) put everything back in, so the rig starts assembled
  const ASSEMBLE = { supportosmo: [0, -2.8, 0], capotarriere: [0, -2.8, 0] };   // (the Osmo Pocket is placed by seatOsmo)
  // how far each part travels in the exploded view, in Blender units and axes (x right, y back, z up),
  // along the rig's length: the hood and lens ring forward, the rail and rear cover back, handles up and down
  const EXPLODE = {
    corpsfront2: [0, -2.4, 0], boitiercerculaire: [0, -1.25, 0], boitierprincipale: [0, 0, 0],
    poigneehaute: [0, 0, 1.7], obj1handle2step: [0, 0, -1.5], supportpourpoignet: [-1.6, 0, -0.4],
    supportosmo: [0, 3.6, 0], capotarriere: [0, 5.4, 0], dji: [0, 3.6, 0.35],   // the camera rides out on its rail, just lifted off it
  };
  // part names, from the file names of the STL parts
  const key = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const LABELS = {
    boitierprincipale: 'Main housing', corpsfront2: 'Front body · hood', boitiercerculaire: 'Lens ring',
    capotarriere: 'Rear cover', obj1handle2step: 'Side handle', poigneehaute: 'Top handle',
    poigneeosmo: 'Grip', supportosmo: 'Camera rail', supportpourpoignet: 'Grip mount', dji: 'DJI Osmo Pocket 3',
  };

  const load = src => new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s);
  });
  let started = false, visible = false;
  const start = async () => {
    if (started) return; started = true;
    try {
      if (!window.THREE) await load(CDN + 'build/three.min.js');
      await Promise.all(['examples/js/loaders/GLTFLoader.js', 'examples/js/controls/OrbitControls.js', 'examples/js/environments/RoomEnvironment.js']
        .map(p => load(CDN + p)));
      await Promise.all([window.RIG_GLB_B64 || load(MODEL), window.OSMO_GLB_B64 || load(OSMO)]);
      init();
    } catch (e) { console.warn('rig 3d', e); root.classList.add('failed'); }
  };
  new IntersectionObserver(es => {
    visible = es.some(e => e.isIntersecting);
    if (visible) start();
  }, { rootMargin: '300px 0px' }).observe(root);

  // how far the tall wrapper has scrolled past, 0 … 1 (the stage itself stays on screen with position: sticky, in the CSS)
  const progress = () => {
    const r = root.getBoundingClientRect(), run = root.offsetHeight - stage.offsetHeight;
    const y = Math.min(Math.max(-r.top, 0), Math.max(run, 0));
    return run > 0 ? y / run : 0;
  };

  // The Osmo Pocket 3. Its copy inside the Blender scene stands upright beside the rig, so the original model
  // (OSMO Pocket 3 original.gltf: upright, gimbal on top, lens towards -z) is seated here instead, at the same size,
  // the way it rides in the rig (exploded render, rendu 5): lying on the camera rail, handle along the rig,
  // gimbal head forward, its camera turned 90° on the gimbal so the lens looks out through the hood.
  // (model space here = the glTF's: Blender units, y up, +z towards the front of the rig)
  function seatOsmo(T, model, original) {
    const old = model.getObjectByName('dji');
    const hood = model.getObjectByName('corps_front-2'), body = model.getObjectByName('boitier_principale');
    const rail = model.getObjectByName('support_osmo');
    if (!old || !hood || !body) return;
    const v = new T.Vector3(), box = o => new T.Box3().setFromObject(o);
    // its size in the Blender scene: compare two gimbal pieces found in both copies (longest side of each)
    const REFS = ['mesh_18_218nr', 'mesh_18_224nr'];
    const longest = (root, n) => { const o = root.getObjectByName(n); return o ? Math.max(...box(o).getSize(v).toArray()) : 0; };
    const oldLens = REFS.map(n => longest(old, n));
    const ratios = REFS.map((n, i) => oldLens[i] / longest(original, n)).filter(r => isFinite(r) && r > 0);
    old.removeFromParent();

    // 1. turn the camera on its gimbal so the lens (the glass, mesh_18_221) points to the top of the Osmo
    original.updateMatrixWorld(true);
    const tilt = original.getObjectByName('Cam_tilt'), head = original.getObjectByName('mesh_18_228nr');
    const glass = original.getObjectByName('mesh_18_221nr');
    if (tilt && head && glass) {
      const hc = box(head).getCenter(new T.Vector3());
      const look = box(glass).getCenter(new T.Vector3()).sub(hc).normalize();   // where the lens faces now
      const up = new T.Vector3(0, 1, 0), axis = look.clone().cross(up);
      if (axis.lengthSq() > 1e-6) {
        const q = new T.Matrix4().makeRotationAxis(axis.normalize(), look.angleTo(up));
        const about = new T.Matrix4().makeTranslation(hc.x, hc.y, hc.z).multiply(q).multiply(new T.Matrix4().makeTranslation(-hc.x, -hc.y, -hc.z));
        const local = tilt.parent.matrixWorld.clone().invert().multiply(about).multiply(tilt.matrixWorld);
        local.decompose(tilt.position, tilt.quaternion, tilt.scale);
        original.updateMatrixWorld(true);
      }
    }

    // 2. lay it down: its top (+y) to the front of the rig (+z), its lens side (-z) onto the rail (-y)
    original.matrix.makeBasis(new T.Vector3(-1, 0, 0), new T.Vector3(0, 0, 1), new T.Vector3(0, 1, 0));
    original.matrix.decompose(original.position, original.quaternion, original.scale);
    const osmo = new T.Group(); osmo.name = 'dji';
    osmo.add(original); model.add(osmo);
    osmo.scale.setScalar(ratios.length ? ratios.reduce((a, b) => a + b) / ratios.length : 0.7);
    model.updateMatrixWorld(true);

    // 3. place it: lens on the hood's axis sideways, lying on the rail (or the floor of the body), its front inside the body
    const ob = box(osmo), hc = box(hood).getCenter(new T.Vector3()), bb = box(body);
    const lens = glass ? box(glass).getCenter(new T.Vector3()) : ob.getCenter(new T.Vector3());
    const floor = rail ? box(rail).max.y : bb.min.y + 0.06;
    osmo.position.x += hc.x - lens.x;
    osmo.position.y += floor - ob.min.y;
    osmo.position.z += bb.max.z - 0.06 - ob.max.z;
    model.updateMatrixWorld(true);
  }

  function init() {
    const T = window.THREE;
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));   // lighter than full Retina
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    const scene = new T.Scene();
    const pm = new T.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture;
    const keyL = new T.DirectionalLight(0xffffff, 0.9); keyL.position.set(3, 5, 4); scene.add(keyL);
    const rim = new T.DirectionalLight(0xff9a50, 1.1); rim.position.set(-5, 2, -4); scene.add(rim);   // warm, like the fire behind

    const camera = new T.PerspectiveCamera(28, 1, 0.01, 500);
    const controls = new T.OrbitControls(camera, canvas);
    controls.enableZoom = false; controls.enablePan = true; controls.enableDamping = true;   // zoom is ours (see below): the wheel scrolls the page
    controls.screenSpacePanning = true; controls.keyPanSpeed = 0;
    controls.autoRotate = !reduced; controls.autoRotateSpeed = 0.7;
    canvas.style.touchAction = 'pan-y';   // an up/down swipe scrolls the page (and takes the rig apart); sideways turns it
    if (touch) hint.textContent = 'Swipe sideways to turn · two fingers to move and zoom · scroll to take it apart ↓';

    // printed PLA: matte black with fine layer lines (the STL parts have no UVs, so the lines are drawn in the shader)
    const pla = new T.MeshStandardMaterial({ color: 0x030304, roughness: 0.68, metalness: 0, flatShading: true, envMapIntensity: 0.18 });
    pla.onBeforeCompile = sh => {
      sh.uniforms.uLayer = { value: 55 };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vObj;\nuniform float uLayer;')
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          float ln = smoothstep(0.25, 0.75, abs(fract(vObj.z * uLayer) - 0.5) * 2.0);
          diffuseColor.rgb *= 0.8 + 0.2 * ln;
          roughnessFactor = clamp(roughnessFactor + 0.15 * (1.0 - ln), 0.0, 1.0);`);
    };

    const bytes = Uint8Array.from(atob(window.RIG_GLB_B64), c => c.charCodeAt(0));
    const osmoBytes = Uint8Array.from(atob(window.OSMO_GLB_B64), c => c.charCodeAt(0));
    const parse = b => new Promise((res, rej) => new T.GLTFLoader().parse(b.buffer, '', res, rej));
    Promise.all([parse(bytes), parse(osmoBytes)]).then(([gltf, osmoGltf]) => {
      const model = gltf.scene;
      const loose = [];
      model.traverse(o => { if (key(o.name) === 'poigneeosmo') loose.push(o); });
      loose.forEach(o => o.removeFromParent());                          // a spare grip laid out in front of the rig in the Blender scene, not mounted
      model.traverse(o => {
        if (!o.isMesh) return;
        const m = o.material;
        if (m && /printed plastic/i.test(m.name)) o.material = pla;   // the printed parts
        else { if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals(); if (m) m.envMapIntensity = 0.9; }
      });
      // assemble it (see ASSEMBLE), then centre and size it
      model.updateMatrixWorld(true);
      model.traverse(o => {
        const a = ASSEMBLE[key(o.name)]; if (!a) return;
        const w0 = o.getWorldPosition(new T.Vector3()), w1 = w0.clone().add(new T.Vector3(a[0], a[2], -a[1]));
        o.position.add(o.parent.worldToLocal(w1).sub(o.parent.worldToLocal(w0.clone())));
      });
      model.updateMatrixWorld(true);
      seatOsmo(T, model, osmoGltf.scene);
      model.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(model), c = box.getCenter(new T.Vector3());
      const s = 4 / box.getSize(new T.Vector3()).length();
      const pivot = new T.Group(); scene.add(pivot);
      model.position.sub(c); const holder = new T.Group(); holder.scale.setScalar(s); holder.add(model); pivot.add(holder);
      pivot.updateMatrixWorld(true);
      const R = 2;   // half of the scaled diagonal

      // the parts: the pieces under "Empty", the grip mount and the camera
      const empty = model.getObjectByName('Empty');
      const parts = [...(empty ? empty.children : []), ...model.children.filter(o => o !== empty)];
      const pv = new T.Vector3(), info = [];
      parts.forEach(p => {
        const b = new T.Box3().setFromObject(p); if (b.isEmpty()) return;
        const wc = b.getCenter(new T.Vector3());                       // world centre (assembly centre is the origin)
        const k = key(p.name);
        const e = EXPLODE[k] || wc.toArray().map(v => v / s * 0.6);
        const off = new T.Vector3(e[0], e[2], -e[1]).multiplyScalar(s);   // Blender (x, y, z) -> glTF (x, z, -y), then to the page's scale
        // that world offset, in the part's parent space
        const a = p.parent.worldToLocal(wc.clone()), b2 = p.parent.worldToLocal(wc.clone().add(off));
        const li = document.createElement('li');
        li.innerHTML = `<b>${String(info.length + 1).padStart(2, '0')}</b>${LABELS[k] || p.name}`;
        labelsEl.append(li);
        info.push({ p, base: p.position.clone(), local: b2.sub(a), wc, off, li });
      });

      const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
      let dist = 1;
      const resize = () => {
        const w = stage.clientWidth, h = stage.clientHeight;
        renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
        const fit = R / Math.sin(T.MathUtils.degToRad(camera.fov / 2));
        dist = fit * (camera.aspect < 1 ? 1.15 / camera.aspect : 1.0);
      };
      resize(); addEventListener('resize', resize);
      camera.position.set(0.9, 0.45, 1).normalize().multiplyScalar(dist);
      controls.update();

      // zoom: 1 = framed; smaller = closer. Pinch on a trackpad (a wheel event with ctrlKey), ⌘/ctrl + wheel, or the buttons
      let zoom = 1;
      const setZoom = z => { zoom = Math.min(2.2, Math.max(0.22, z)); };
      canvas.addEventListener('wheel', ev => {
        if (!(ev.ctrlKey || ev.metaKey)) return;                         // the plain wheel scrolls the page (and takes the rig apart)
        ev.preventDefault();
        setZoom(zoom * Math.exp(ev.deltaY * (ev.deltaMode ? 0.05 : 0.0025)));
      }, { passive: false });
      const fingers = new Map(); let pinch = 0;                          // two-finger pinch on a phone (OrbitControls moves it, we zoom)
      const spread = () => { const [a, b] = [...fingers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
      canvas.addEventListener('pointerdown', ev => { if (ev.pointerType !== 'touch') return; fingers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY }); if (fingers.size === 2) pinch = spread(); });
      canvas.addEventListener('pointermove', ev => {
        if (!fingers.has(ev.pointerId)) return;
        fingers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        if (fingers.size === 2 && pinch) { const d = spread(); if (d > 0) { setZoom(zoom * pinch / d); pinch = d; } }
      });
      const lift = ev => { fingers.delete(ev.pointerId); pinch = fingers.size === 2 ? spread() : 0; };
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => canvas.addEventListener(t, lift));
      if (tools) tools.addEventListener('click', ev => {
        const b = ev.target.closest('button'); if (!b) return;
        const z = b.dataset.z;
        if (z === 'in') setZoom(zoom / 1.35);
        else if (z === 'out') setZoom(zoom * 1.35);
        else { controls.target.set(0, 0, 0); setZoom(1); }
      });

      const tmp = new T.Vector3(), side = new T.Vector3(), off = new T.Vector3();
      let lastE = 0, held = false;                                       // held: someone is turning / moving it right now
      controls.addEventListener('start', () => { held = true; });
      controls.addEventListener('end', () => { held = false; });
      const frame = () => {
        requestAnimationFrame(frame);
        if (!visible || root.closest('[hidden]')) return;
        const e = ease((progress() - 0.08) / 0.72);
        info.forEach(it => { it.p.position.copy(it.base).addScaledVector(it.local, e); });
        // while it comes apart: turn to a three-quarter side view (the parts spread along the rig's length) and pull back
        controls.autoRotate = !reduced && e < 0.02;
        off.copy(camera.position).sub(controls.target);                    // the camera, seen from the point it turns around
        const de = Math.abs(e - lastE); lastE = e;
        if (e > 0.02 && de > 1e-4 && !held) {                             // only while it is being scrolled apart: once it's open, it can be turned and moved freely
          const len = off.length();
          side.set(1, 0.42, 0.32).normalize();
          off.normalize().lerp(side, Math.min(1, de * 5)).normalize().multiplyScalar(len);
        }
        const want = dist * (1 + 0.75 * e) * zoom;
        off.setLength(off.length() + (want - off.length()) * 0.15);
        camera.position.copy(controls.target).add(off);
        controls.update();
        renderer.render(scene, camera);
        hint.style.opacity = e > 0.04 ? 0 : 1;
        // names next to each part once it is apart
        const show = ease((e - 0.6) / 0.3), w = stage.clientWidth, h = stage.clientHeight;
        info.forEach(it => {
          tmp.copy(it.wc).addScaledVector(it.off, e).project(camera);
          it.li.style.transform = `translate(${((tmp.x + 1) / 2 * w).toFixed(1)}px, ${((1 - tmp.y) / 2 * h).toFixed(1)}px) translate(-50%, -50%)`;
          it.li.style.opacity = show;
        });
      };
      root.classList.add('ready');
      frame();
    }).catch(err => { console.warn('rig 3d', err); root.classList.add('failed'); });
  }
})();
