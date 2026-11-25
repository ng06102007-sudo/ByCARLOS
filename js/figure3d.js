// A turnable 3D model inside a project page (the 1980 figurine, on the "Other 3D projects" page: #figure3d).
// The model is "media /travaux 3d/figurine.glb.js" (from "figure boxe.blend", lightened and Draco-compressed, base64 so
// Safari can open it as a local file). It has no colours of its own, so it is shown in grey printed plastic with fine
// layer lines, the way it comes off a home 3D printer.
//   - it turns slowly on its own; drag to turn it, right-drag or shift-drag to move it,
//     trackpad pinch, ⌘/ctrl + wheel or the + / − buttons to zoom, ↺ to reset (the plain wheel still scrolls the page)
(() => {
  const root = document.getElementById('figure3d');
  if (!root) return;
  const canvas = root.querySelector('canvas'), tools = root.querySelector('.fig3d-tools');
  const CDN = 'https://cdn.jsdelivr.net/npm/three@0.147.0/';
  const MODEL = 'media/travaux%203d/figurine.glb.js';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const load = src => new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s);
  });
  let started = false, visible = false;
  const start = async () => {
    if (started) return; started = true;
    try {
      if (!window.THREE) await load(CDN + 'build/three.min.js');
      const need = [['GLTFLoader', 'examples/js/loaders/GLTFLoader.js'], ['OrbitControls', 'examples/js/controls/OrbitControls.js'],
        ['RoomEnvironment', 'examples/js/environments/RoomEnvironment.js'], ['DRACOLoader', 'examples/js/loaders/DRACOLoader.js']]
        .filter(([n]) => !THREE[n]);
      await Promise.all(need.map(([, p]) => load(CDN + p)));
      if (!window.FIGURINE_GLB_B64) await load(MODEL);
      init();
    } catch (e) { console.warn('figure 3d', e); root.classList.add('failed'); }
  };
  new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) start(); }, { rootMargin: '300px 0px' }).observe(root);

  function init() {
    const T = window.THREE;
    if (T.ColorManagement) T.ColorManagement.legacyMode = false;
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));   // lighter than full Retina
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    const scene = new T.Scene();
    scene.environment = new T.PMREMGenerator(renderer).fromScene(new T.RoomEnvironment(), 0.04).texture;
    const key = new T.DirectionalLight(0xffffff, 1.1); key.position.set(2, 4, 3); scene.add(key);
    const rim = new T.DirectionalLight(0xffffff, 0.6); rim.position.set(-3, 2, -3); scene.add(rim);

    const camera = new T.PerspectiveCamera(30, 1, 0.01, 100);
    const controls = new T.OrbitControls(camera, canvas);
    controls.enableZoom = false; controls.enablePan = true; controls.enableDamping = true; controls.screenSpacePanning = true;
    controls.autoRotate = !reduced; controls.autoRotateSpeed = 1.2;
    canvas.style.touchAction = 'pan-y';

    // grey PLA, with fine horizontal layer lines drawn in the shader (the model has no UVs)
    const pla = new T.MeshStandardMaterial({ color: 0x6f7176, roughness: 0.66, metalness: 0, envMapIntensity: 0.4 });
    pla.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vH;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = position.y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vH;')
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          float ln = smoothstep(0.2, 0.8, abs(fract(vH * 260.0) - 0.5) * 2.0);
          diffuseColor.rgb *= 0.9 + 0.1 * ln;
          roughnessFactor = clamp(roughnessFactor + 0.12 * (1.0 - ln), 0.0, 1.0);`);
    };

    const draco = new T.DRACOLoader(); draco.setDecoderPath(CDN + 'examples/js/libs/draco/');
    const loader = new T.GLTFLoader(); loader.setDRACOLoader(draco);
    const bytes = Uint8Array.from(atob(window.FIGURINE_GLB_B64), c => c.charCodeAt(0));
    loader.parse(bytes.buffer, '', gltf => {
      const model = gltf.scene;
      model.traverse(o => { if (o.isMesh) o.material = pla; });
      const box = new T.Box3().setFromObject(model), c = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
      const s = 2 / size.y; model.position.sub(c);
      const holder = new T.Group(); holder.scale.setScalar(s); holder.add(model); scene.add(holder);
      let dist = 1;
      const resize = () => {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
        dist = 1.25 / Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * Math.max(1, 0.75 / camera.aspect);
      };
      resize(); addEventListener('resize', resize);
      camera.position.set(0, 0.15, 1).normalize().multiplyScalar(dist); controls.update();

      let zoom = 1; const setZoom = z => { zoom = Math.min(2, Math.max(0.3, z)); };
      canvas.addEventListener('wheel', ev => {
        if (!(ev.ctrlKey || ev.metaKey)) return;
        ev.preventDefault(); setZoom(zoom * Math.exp(ev.deltaY * (ev.deltaMode ? 0.05 : 0.0025)));
      }, { passive: false });
      if (tools) tools.addEventListener('click', ev => {
        const b = ev.target.closest('button'); if (!b) return;
        if (b.dataset.z === 'in') setZoom(zoom / 1.3);
        else if (b.dataset.z === 'out') setZoom(zoom * 1.3);
        else { controls.target.set(0, 0, 0); setZoom(1); }
      });
      const off = new T.Vector3();
      const frame = () => {
        requestAnimationFrame(frame);
        if (!visible || root.closest('[hidden]')) return;
        off.copy(camera.position).sub(controls.target);
        off.setLength(off.length() + (dist * zoom - off.length()) * 0.15);
        camera.position.copy(controls.target).add(off);
        controls.update(); renderer.render(scene, camera);
      };
      root.classList.add('ready'); frame();
    }, err => { console.warn('figure 3d', err); root.classList.add('failed'); });
  }
})();
