// 3D model of the Storm Watch SW-02, at the top of its project page (index.html, #watch3d).
// Two real versions, each exported from its own Blender file (lightened, Draco-compressed, base64 so Safari can open it
// as a local file):
//   carbon: "media /storm watch carbon.blend" -> "media /storm watch/sw-02 carbone.glb.js" (shown first)
//   steel:  "media /storm watch steel.blend"  -> "media /storm watch/sw-02 acier.glb.js"   (loaded when it is picked)
// Each is the full assembly as rendered: case, bezel, dial and numerals, hands, Miyota movement and gold rotor,
// crystals, crown, fabric strap.
//   - it turns slowly on its own, and can be turned with the mouse (or a sideways swipe), moved (right-drag, shift-drag,
//     two fingers) and zoomed (trackpad pinch, ⌘/ctrl + wheel, the + / − buttons)
//   - scrolling down takes it apart along its axis, part by part, with each part's name; taken apart it can still be turned
//   - the buttons switch between the carbon and the steel watch, and change the strap's colour
//   - the hands show the time of whoever is looking at it (the seconds hand sweeps, as on an automatic movement)
// Shares its page layout with js/rig3d.js (the .rig3d classes).
(() => {
  const root = document.getElementById('watch3d');
  if (!root) return;
  const stage = root.querySelector('.rig3d-stage'), canvas = root.querySelector('canvas');
  const hint = root.querySelector('.rig3d-hint'), labelsEl = root.querySelector('.rig3d-labels');
  const tools = root.querySelector('.rig3d-tools'), picks = root.querySelector('.watch3d-variants');
  const CDN = 'https://cdn.jsdelivr.net/npm/three@0.147.0/';
  const MEDIA = 'media/storm%20watch/';
  const MODELS = {
    carbon: { src: MEDIA + 'sw-02%20carbone.glb.js', global: 'SW02_CARBON_GLB_B64', strap: 'grey' },
    steel: { src: MEDIA + 'sw-02%20acier.glb.js', global: 'SW02_STEEL_GLB_B64', strap: 'black' },
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(pointer: coarse)').matches;

  // object and material names from the Blender files, reduced to letters and digits
  const key = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const KINDS = [   // [piece of the object's name, kind]
    ['fabinboitier', 'case'], ['cadran1', 'bezel'], ['cadranversion', 'dial'], ['chiffres', 'dial'],
    ['aiguilleheure', 'hour'], ['aiguilleminute', 'minute'], ['aiguilleseconde', 'second'],
    ['balancier', 'balance'], ['rouebarillet', 'barrel'], ['roueechappement', 'escape'], ['rouequatrieme', 'fourth'], ['rouetroisieme', 'third'], ['ouvementassemblagecomple', 'movement'], ['mouvementassemblageco', 'movement'], ['vism08', 'movement'],
    ['rotor', 'rotor'], ['plaquefixation', 'plate'], ['verreavant', 'crystal'], ['verre250', 'back'], ['verre001', 'back'],
    ['jointverre004', 'backseal'], ['jointverre006', 'backseal'], ['jointverre', 'seal'], ['couronne', 'crown'],
    ['tubedecourone', 'tube'], ['visfhc', 'screw'], ['bracelet', 'strap'], ['gamcomstrap', 'strap'], ['buckle', 'strap'], ['cube', 'strap'],
  ];
  const kindOf = name => { const k = key(name); const m = KINDS.find(([p]) => k.includes(p)); return m ? m[1] : null; };
  // how far each part travels in the exploded view, as a share of the case's width, along the watch's axis
  // (out of the dial) or towards the crown: the front parts rise in the order they are fitted, the back drops
  const EXPLODE = {
    back: -0.62, backseal: -0.55, rotor: -0.36, case: 0, strap: 0, plate: 0.2, movement: 0.32, balance: 0.32, barrel: 0.32, escape: 0.32, fourth: 0.32, third: 0.32,
    dial: 0.56, hour: 0.7, minute: 0.8, second: 0.9, bezel: 1.12, seal: 1.26, crystal: 1.4, screw: 1.62,
  };
  const SIDEWAYS = { crown: 0.42, tube: 0.24 };
  const LIFT = 0.5;
  const MIRROR = false;         // see build()
  const TWELVE = 0;             // where 12 o'clock is on the dial, as an angle (0 = towards +x)   // while it opens, the whole watch slides down by this share of the case's width, to stay centred
  const LABELS = {
    case: { carbon: 'Forged-carbon case', steel: 'Monobloc 316L steel case' },
    bezel: { carbon: 'Bezel', steel: 'Polished and brushed steel bezel' },
    strap: 'Rubber strap, canvas finish',
    dial: 'Dial and numerals', hour: 'Hands · red-tipped seconds',
    movement: 'Miyota 9039 automatic movement', balance: 'Balance wheel · 4 Hz', rotor: 'Gold rotor', crystal: 'Sapphire crystal', back: 'Caseback crystal',
    crown: 'Screw-down crown', screw: 'Bezel screws',
  };
  const STRAPS = { grey: 0x45474c, black: 0x0e0e10, orange: 0xd2420c, blue: 0x1f3f86, green: 0x323f22 };

  const load = src => new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s);
  });
  let started = false, visible = false;
  const start = async () => {
    if (started) return; started = true;
    try {
      if (!window.THREE) await load(CDN + 'build/three.min.js');
      const need = [['GLTFLoader', 'examples/js/loaders/GLTFLoader.js'], ['OrbitControls', 'examples/js/controls/OrbitControls.js'],
        ['RoomEnvironment', 'examples/js/environments/RoomEnvironment.js'], ['DRACOLoader', 'examples/js/loaders/DRACOLoader.js'], ['RGBELoader', 'examples/js/loaders/RGBELoader.js']]
        .filter(([n]) => !THREE[n]);
      await Promise.all(need.map(([, p]) => load(CDN + p)));
      if (!window.SW_TEXTURES) await load(MEDIA + 'textures%203d.js').catch(() => {});
      if (!window.SW_STUDIO_HDR) await load(MEDIA + 'studio%20hdr.js').catch(() => {});   // the renders' studio light   // textures as data: Safari refuses local image files in WebGL
      init();
    } catch (e) { console.warn('watch 3d', e); root.classList.add('failed'); }
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

  function init() {
    const T = window.THREE;
    if (T.ColorManagement) T.ColorManagement.legacyMode = false;   // colours below are written as sRGB, like on the page
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));   // lighter than full Retina
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
    const scene = new T.Scene();
    const pm = new T.PMREMGenerator(renderer);
    // lit like the renders: the studio HDRI of the poster's Blender scene (a black studio with soft boxes), for the
    // reflections that make steel, sapphire and lacquer read as real; a soft fill so the dark parts keep their shape
    let env = null;
    try {
      if (window.SW_STUDIO_HDR && T.RGBELoader) {
        const raw = Uint8Array.from(atob(window.SW_STUDIO_HDR), c => c.charCodeAt(0));
        const d = new T.RGBELoader().setDataType(T.HalfFloatType).parse(raw.buffer);
        const hdr = new T.DataTexture(d.data, d.width, d.height, T.RGBAFormat, d.type);
        hdr.flipY = true; hdr.minFilter = hdr.magFilter = T.LinearFilter; hdr.generateMipmaps = false;
        hdr.encoding = T.LinearEncoding; hdr.mapping = T.EquirectangularReflectionMapping; hdr.needsUpdate = true;
        env = pm.fromEquirectangular(hdr).texture;
      }
    } catch (e) { console.warn('watch 3d: studio light', e); }
    scene.environment = env || pm.fromScene(new T.RoomEnvironment(), 0.03).texture;
    const keyL = new T.DirectionalLight(0xffffff, env ? 0.6 : 1.0); keyL.position.set(3, 6, 4); scene.add(keyL);
    const rim = new T.DirectionalLight(0xffffff, env ? 0.5 : 0.8); rim.position.set(-5, 2, -4); scene.add(rim);
    scene.add(new T.HemisphereLight(0xffffff, 0x202022, env ? 0.35 : 0));

    const camera = new T.PerspectiveCamera(28, 1, 0.01, 500);
    const controls = new T.OrbitControls(camera, canvas);
    controls.enableZoom = false; controls.enablePan = true; controls.enableDamping = true;   // zoom is ours: the wheel scrolls the page
    controls.screenSpacePanning = true; controls.keyPanSpeed = 0;
    controls.autoRotate = !reduced; controls.autoRotateSpeed = 0.6;
    canvas.style.touchAction = 'pan-y';   // an up/down swipe scrolls the page; sideways turns it
    if (touch) hint.textContent = 'Swipe sideways to turn · two fingers to move and zoom · scroll to take it apart ↓';

    // materials. The models keep their Blender material names; the ones made of textures or node groups in Blender
    // (forged carbon, brushed steel, the canvas rubber strap) are remade here with the same textures, the simple ones
    // (chrome, the dial's white and red) come as they are. The parts have no UVs, as in Blender (object coordinates),
    // so each texture is laid on in the shader: three flat projections, blended by the surface's direction
    const texture = (file, colour) => {
      const t = new T.TextureLoader().load((window.SW_TEXTURES && window.SW_TEXTURES[file]) || MEDIA + encodeURIComponent(file));
      t.encoding = colour ? T.sRGBEncoding : T.LinearEncoding; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8;
      return t;
    };
    const scaleU = { value: 1 };                                          // 1 / the case's width, set for each watch
    // tri(material, texture, tiles across the case, GLSL for the colour, GLSL for the roughness); v = the texture's value
    const tri = (mat, tex, tiles, colour, rough) => {
      mat.onBeforeCompile = sh => {
        sh.uniforms.uTex = { value: tex }; sh.uniforms.uScale = scaleU; sh.uniforms.uTiles = { value: tiles };
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vObj; varying vec3 vObjN;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position; vObjN = normal;');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vObj; varying vec3 vObjN; uniform sampler2D uTex; uniform float uScale; uniform float uTiles; float vTri;')
          .replace('#include <color_fragment>', `#include <color_fragment>
            vec3 bw = pow(abs(normalize(vObjN)), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
            vec3 p = vObj * uScale * uTiles;
            vTri = texture2D(uTex, p.zy).g * bw.x + texture2D(uTex, p.xz).g * bw.y + texture2D(uTex, p.xy).g * bw.z;
            float v = vTri; ${colour}`)
          .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
            { float v = vTri; ${rough} }`);
      };
      mat.customProgramCacheKey = () => 'tri' + tiles + colour + rough;
      return mat;
    };
    const M = (c, metal, rough, more) => new T.MeshPhysicalMaterial(Object.assign({ color: c, metalness: metal, roughness: rough }, more || {}));
    // forged carbon: black resin with lighter flakes (the texture is a low-contrast grey: its flakes sit at 0.11 … 0.2), under a clear coat
    // matte black resin; only the flakes are metallic and catch the light, under a thin satin coat
    const flakes = (mat, amount) => {                                    // amount (GLSL): 0 = resin, 1 = flake
      const before = mat.onBeforeCompile;
      mat.onBeforeCompile = (sh, r) => {
        if (before) before(sh, r);
        sh.fragmentShader = sh.fragmentShader.replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
          { float cf = ${amount};
            diffuseColor.rgb = mix(vec3(0.006, 0.0062, 0.0068), vec3(0.075, 0.077, 0.082), cf);   // charcoal resin, soft grey flakes (as in the renders)
            metalnessFactor = 0.45 * cf;
            roughnessFactor = mix(0.52, 0.36, cf); }`);
      };
      const key0 = mat.customProgramCacheKey.bind(mat);
      mat.customProgramCacheKey = () => key0() + 'flakes' + amount;
      return mat;
    };
    const carbon = flakes(tri(M(0xffffff, 0, 0.6, { clearcoat: 0.25, clearcoatRoughness: 0.35, envMapIntensity: 0.9 }), texture('texture carbone.jpg', true), 5.5,
      '', ''), 'smoothstep(0.075, 0.17, vTri)');
    // forged carbon on the parts that carry their UVs: the material of the Blender file, as is — its colour texture with
    // Brightness/Contrast (+0.13 / 0.48) applied, fully metallic, roughness 0.58, its normal map
    const uvTex = (file, colour) => { const t = texture(file, colour); t.flipY = false; return t; };   // glTF UVs
    // (its colour texture is a low-contrast grey: resin at 0.2 … 0.3, flakes at 0.3 … 0.4, read here as linear 0.03 … 0.13)
    const carbonUV = flakes(new T.MeshPhysicalMaterial({ map: uvTex('texture carbone couleur.jpg', true), normalMap: uvTex('texture carbone normale.jpg', false),
      normalScale: new T.Vector2(1.5, 1.5), metalness: 0, roughness: 0.6, clearcoat: 0.25, clearcoatRoughness: 0.35, envMapIntensity: 1 }), 'smoothstep(0.045, 0.11, diffuseColor.g)');
    const brushTex = texture('texture acier brosse.jpg', false);
    const brushedOf = (c, base) => tri(M(c, 1, base), brushTex, 5,
      'diffuseColor.rgb *= 0.86 + 0.28 * v;', `roughnessFactor = ${base.toFixed(2)} + 0.22 * (1.0 - v);`);
    const steel = M(0xf0f1f4, 1, 0.1, { envMapIntensity: 2.2 });   // mirror-polished 316L: a touch of spread so the studio's soft boxes show in it
    const brushed = brushedOf(0xc9ccd2, 0.16);
    const darkSteel = brushedOf(0x3b3d42, 0.2);
    const blasted = M(0x9a9ea5, 1, 0.45);
    const numerals = M(0xf4f4f4, 0, 0.35);   // white lacquer, not metal
    const gold = M(0xd8ae62, 1, 0.22);
    const blue = M(0x4a74b4, 1, 0.2);
    const dialPlate = M(0x040405, 0, 0.4, { envMapIntensity: 0.7, clearcoat: 0.6, clearcoatRoughness: 0.05 });   // glossy black lacquer
    const rubber = M(0x101012, 0, 0.7, { sheen: 0.2 });
    const lining = M(0x2c2d31, 0, 0.8);
    // the strap's other faces (smooth underside, edges, lining): the same colour as its canvas top, a shade darker
    const strapUnder = M(0x2c2d31, 0, 0.62, { sheen: 0.25 });
    // the strap: canvas-textured rubber (the weave's height map from the GAMAR strap: raised threads lighter and shinier)
    const strapM = tri(new T.MeshStandardMaterial({ color: STRAPS.grey, roughness: 0.9, metalness: 0, envMapIntensity: 0.4 }),
      texture('texture toile bracelet.jpg', false), 18,
      'diffuseColor.rgb *= 0.7 + 0.45 * v;', 'roughnessFactor = 0.92 - 0.22 * v;');
    const glass = M(0xffffff, 0, 0.01, { transparent: true, opacity: 0.1, depthWrite: false, envMapIntensity: 2.4, clearcoat: 1 });
    // the movement, finished like a fine watch (textures generated in Blender, as the model has none):
    // plates in perlage (circular graining), bridges in Côtes de Genève, ruby jewels
    const perlage = tri(M(0xd3d6db, 1, 0.3), texture('texture perlage.jpg', false), 3.2,
      'diffuseColor.rgb *= 0.62 + 0.6 * v;', 'roughnessFactor = 0.12 + 0.42 * (1.0 - v);');
    const geneva = tri(M(0xdadde2, 1, 0.2), texture('texture cotes de geneve.jpg', false), 2.2,
      'diffuseColor.rgb *= 0.55 + 0.65 * v;', 'roughnessFactor = 0.08 + 0.4 * (1.0 - v);');
    const ruby = M(0x9e0c1e, 0.1, 0.08, { clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.4, sheen: 0.4, sheenColor: new T.Color(0xff4060) });
    // the hands, as in the Blender file: polished black steel with white lacquered details, the seconds hand red-tipped
    const handSteel = M(0x1c1d20, 1, 0.16, { envMapIntensity: 0.9 });
    const lacquer = M(0xf2f2f0, 0, 0.32, { clearcoat: 1, clearcoatRoughness: 0.1 });
    const redTip = M(0xc8160e, 0.2, 0.3, { clearcoat: 1 });
    const HANDS = { carchrome: handSteel, material: lacquer, acierrouge: redTip };
    const MOVEMENT = { aciergris: perlage, planarsurfacetop: perlage, steel: geneva, azurefrostglass: ruby, gold, aciermicrobille: blasted };
    const BY_MATERIAL = {   // Blender material name (start) -> the material used here
      carchrome: steel, forgedcarbon: carbon, carbonneforgee: carbon, aciergris: numerals, bracelet: strapM, grisinterbracelet: strapUnder, stainlesssteel: darkSteel,
      braceletcaoutchouctoile: strapM, braceletcaoutchouclisse: strapUnder, acierbrosse: brushed,
      brushedstainlesssteel: brushed, darksteel: darkSteel, carpaint: dialPlate, gold, steel: blasted,
      planarsurfacetop: blasted, aciermicrobille: blasted, azurefrostglass: blue, pyrexglass: glass, glass,
    };
    const forMaterial = name => {
      const k = key(name || ''); let best = null;
      Object.keys(BY_MATERIAL).forEach(p => { if (k.startsWith(p) && (!best || p.length > best.length)) best = p; });
      return best ? BY_MATERIAL[best] : null;
    };

    const draco = new T.DRACOLoader(); draco.setDecoderPath(CDN + 'examples/js/libs/draco/');
    const loader = new T.GLTFLoader(); loader.setDRACOLoader(draco);
    const pivot = new T.Group(); scene.add(pivot);
    const up = new T.Vector3(0, 1, 0), qa = new T.Quaternion();
    const watches = {};   // name -> { holder, info, hands, W }
    let current = null, R = 2;

    // build one watch from its glTF: materials, hands, exploded-view moves and part names
    const build = (gltf, variant) => {
      const model = gltf.scene;
      const byKind = {}, parts = [];
      model.children.forEach(o => {                                       // the parts: the top-level objects of the file
        const k = kindOf(o.name); if (!k) return;
        o.userData.kind = k; (byKind[k] = byKind[k] || []).push(o); parts.push(o);
        o.traverse(m => {
          if (!m.isMesh) return;
          m.userData.src = (m.material && m.material.name) || '';           // the Blender material, before it is swapped below
          let mine = forMaterial(m.material && m.material.name);
          if (k === 'hour' || k === 'minute' || k === 'second') {
            const hk = key((m.material && m.material.name) || ''), hit = Object.keys(HANDS).find(p => hk.startsWith(p));
            if (hit) mine = HANDS[hit];
          }
          if (['movement', 'balance', 'barrel', 'escape', 'fourth', 'third'].includes(k)) {                     // the movement gets its own finishes
            const mk = key((m.material && m.material.name) || ''), hit = Object.keys(MOVEMENT).find(p => mk.startsWith(p));
            if (hit) mine = MOVEMENT[hit];
          }
          if (mine === numerals && k === 'strap') mine = brushed;          // the clasp shares the numerals' grey steel in Blender
          if (mine === carbon && m.geometry.attributes.uv) mine = carbonUV;   // UVs exported: the real material
          if (mine) m.material = mine;
          else if (m.material && !m.material.name) m.material = { backseal: rubber, plate: blasted, movement: steel }[k] || steel;   // parts with no material
          if (m.material === glass) m.renderOrder = 2;
          m.material.side = T.DoubleSide;                                // the lightened CAD meshes have a few flipped or open faces
        });
      });
      // the hands: their origins sit on the dial's axis (set in Blender), so they turn on their own spot.
      // Where each points now = its farthest point from the axis, as an angle in the dial plane (Blender x, y = glTF x, -z)
      const hands = ['hour', 'minute', 'second'].map(k => (byKind[k] || [])[0]).filter(Boolean);
      hands.forEach(h => {
        let best = -1, ang = 0;
        h.traverse(m => {
          if (!m.isMesh) return;
          const a = m.geometry.attributes.position;
          for (let i = 0; i < a.count; i++) { const x = a.getX(i), y = -a.getZ(i), d = x * x + y * y; if (d > best) { best = d; ang = Math.atan2(y, x); } }
        });
        h.userData.rest = ang; h.userData.q0 = h.quaternion.clone();
      });

      // the rotor: hung on a pivot set on the dial's axis (where the hands' origins are), so it can swing like a real
      // automatic rotor; the pivot then stands in for it in the exploded view
      let rotor = null;
      if (byKind.rotor && hands[0]) {
        const r = byKind.rotor[0];
        rotor = new T.Group(); rotor.name = 'rotor pivot'; rotor.userData.kind = 'rotor';
        rotor.position.set(hands[0].position.x, r.position.y, hands[0].position.z);
        r.parent.add(rotor); rotor.updateMatrixWorld(true); rotor.attach(r);
        parts[parts.indexOf(r)] = rotor; byKind.rotor[0] = rotor;
      }

      model.updateMatrixWorld(true);
      const centreOf = list => { const b = new T.Box3(); (list || []).forEach(o => b.expandByObject(o)); return b.isEmpty() ? null : b.getCenter(new T.Vector3()); };
      const caseBox = new T.Box3(); (byKind.case || [model]).forEach(o => caseBox.expandByObject(o));
      const front = centreOf(byKind.crystal);
      // the dial should face up (+y). In a file whose watch sits under a mirroring parent it faces down: mirror it back
      // (a mirror, not a turn, or the dial's writing would read backwards)
      const flip = front && front.y < caseBox.getCenter(new T.Vector3()).y;
      const W = caseBox.getSize(new T.Vector3()).x;                       // the case's width, in the file's units
      const box = new T.Box3().setFromObject(model), c = box.getCenter(new T.Vector3());
      const s = 4 / box.getSize(new T.Vector3()).length();
      model.position.sub(c); const holder = new T.Group(); holder.scale.setScalar(s); holder.add(model);
      if (flip) holder.scale.y = -s;
      // the exported geometry comes out mirrored (the dial's writing reads backwards): mirror it back across x
      if (MIRROR) holder.scale.x = -s;
      holder.visible = false; pivot.add(holder);
      holder.updateMatrixWorld(true);

      // sideways = from the case's centre towards the crown, level (in the page's space)
      const sideways = new T.Vector3(0, 0, 1), crownC = centreOf(byKind.crown), cc = centreOf(byKind.case);
      if (crownC && cc) { sideways.copy(crownC).sub(cc); sideways.y = 0; if (sideways.lengthSq() > 1e-12) sideways.normalize(); else sideways.set(0, 0, 1); }
      const info = [], named = new Set();
      parts.forEach(o => {
        const k = o.userData.kind;
        const b = new T.Box3().setFromObject(o); if (b.isEmpty()) return;
        const wc = b.getCenter(new T.Vector3());
        // along the axis (up, out of the dial) or sideways, towards the crown
        const off = new T.Vector3(0, (EXPLODE[k] || 0) * W * s, 0).addScaledVector(sideways, (SIDEWAYS[k] || 0) * W * s);
        const a = o.parent.worldToLocal(wc.clone()), b2 = o.parent.worldToLocal(wc.clone().add(off));
        let li = null;
        if (LABELS[k] && !named.has(k)) {                                  // one name per kind (four screws, one label)
          named.add(k);
          const l = LABELS[k];
          li = document.createElement('li'); li.hidden = true;
          li.innerHTML = `<b>${String(named.size).padStart(2, '0')}</b>`; li.append(typeof l === 'string' ? l : l[variant]);
          labelsEl.append(li);
        }
        const sz = b.getSize(new T.Vector3());
        info.push({ p: o, base: o.position.clone(), local: b2.sub(a), wc, off, li, r: Math.min(Math.max(sz.x, sz.z) / 2, 0.62 * W * s), side: named.size % 2 ? 1 : -1 });
      });
      // the balance: only its gold wheel turns; the steel cock over it and the jewel stay put. Its origin sits on the
      // wheel's own axis (set in Blender), so the wheel turns on its spot
      const balNode = (byKind.balance || [])[0] || null, balance = [];
      if (balNode) balNode.traverse(m => { if (m.isMesh && key(m.userData.src).startsWith('gold')) { m.userData.q0 = m.quaternion.clone(); balance.push(m); } });
      const train = ['barrel', 'third', 'fourth', 'escape'].map(k => (byKind[k] || [])[0]).filter(Boolean);   // same: origins on their axes
      train.forEach(w => { w.userData.q0 = w.quaternion.clone(); });
      return { holder, info, hands, rotor, balance, train, W, lift: LIFT * W * s };
    };

    const setStrap = v => {
      strapM.color.setHex(STRAPS[v]);
      strapUnder.color.setHex(STRAPS[v]).multiplyScalar(0.72);            // every face of the strap takes the colour
      if (picks) picks.querySelectorAll('[data-strap]').forEach(b => b.setAttribute('aria-pressed', b.dataset.strap === v));
    };
    const show = v => {
      Object.entries(watches).forEach(([n, w]) => {
        w.holder.visible = n === v;
        w.info.forEach(it => { if (it.li) it.li.hidden = n !== v; });
      });
      current = watches[v];
      scaleU.value = 1 / current.W;                                       // the textures are sized on the case's width
      setStrap(MODELS[v].strap);
      if (picks) picks.querySelectorAll('[data-case]').forEach(b => b.setAttribute('aria-pressed', b.dataset.case === v));
    };
    const loading = {};
    const get = v => loading[v] || (loading[v] = (async () => {
      const m = MODELS[v];
      if (!window[m.global]) await load(m.src);
      const bytes = Uint8Array.from(atob(window[m.global]), c => c.charCodeAt(0));
      const gltf = await new Promise((res, rej) => loader.parse(bytes.buffer, '', res, rej));
      watches[v] = build(gltf, v);
      return watches[v];
    })());
    const pick = async v => {
      if (picks) picks.querySelectorAll('[data-case]').forEach(b => b.setAttribute('aria-pressed', b.dataset.case === v));
      root.classList.add('switching');
      try { await get(v); show(v); } catch (e) { console.warn('watch 3d', e); }
      root.classList.remove('switching');
    };
    if (picks) picks.addEventListener('click', ev => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.case) pick(b.dataset.case);
      if (b.dataset.strap) setStrap(b.dataset.strap);
    });

    // 12 o'clock is towards the lugs at +x (the crown, at -y, is then at 3)
    const setTime = () => {
      if (!current) return;
      const d = new Date(), s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, hr = (d.getHours() % 12) + m / 60;
      const turn = { hour: hr / 12, minute: m / 60, second: s / 60 };
      // target angle in the dial plane, as seen on screen: 12 o'clock at TWELVE, then clockwise;
      // in the model's own (mirrored) space an angle a shows at pi - a
      current.hands.forEach(h => {
        const onScreen = TWELVE - turn[h.userData.kind] * Math.PI * 2;
        const inModel = MIRROR ? Math.PI - onScreen : onScreen;
        h.quaternion.copy(h.userData.q0).premultiply(qa.setFromAxisAngle(up, inModel - h.userData.rest));
      });
    };

    const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
    let dist = 1;
    const resize = () => {
      const w = stage.clientWidth, h = stage.clientHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      const fit = R / Math.sin(T.MathUtils.degToRad(camera.fov / 2));
      dist = fit * (camera.aspect < 1 ? 1.1 / camera.aspect : 0.95);
    };
    resize(); addEventListener('resize', resize);
    camera.position.set(0.55, 1.0, 0.95).normalize().multiplyScalar(dist);   // three-quarters, from above the dial
    controls.update();

    // zoom: 1 = framed; smaller = closer
    let zoom = 1;
    const setZoom = z => { zoom = Math.min(2.2, Math.max(0.18, z)); };
    canvas.addEventListener('wheel', ev => {
      if (!(ev.ctrlKey || ev.metaKey)) return;
      ev.preventDefault();
      setZoom(zoom * Math.exp(ev.deltaY * (ev.deltaMode ? 0.05 : 0.0025)));
    }, { passive: false });
    const fingers = new Map(); let pinch = 0;
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

    const tmp = new T.Vector3(), side = new T.Vector3(), off = new T.Vector3(), right = new T.Vector3();
    let lastE = 0, held = false;
    controls.addEventListener('start', () => { held = true; });
    controls.addEventListener('end', () => { held = false; });
    // each name beside its part, at the part's edge, alternately on the right and the left; they show only once the
    // watch is well apart, and are taken off the page (not just made clear) as soon as it closes again
    const placeNames = e => {
      const shown = ease((e - 0.6) / 0.3), w = stage.clientWidth, h = stage.clientHeight;
      camera.updateMatrixWorld(); right.setFromMatrixColumn(camera.matrixWorld, 0);
      current.info.forEach(it => {
        if (!it.li) return;
        it.li.style.opacity = shown;
        it.li.style.visibility = shown > 0.01 ? 'visible' : 'hidden';
        if (shown <= 0.01) return;
        tmp.copy(it.wc).addScaledVector(it.off, e).add(pivot.position).addScaledVector(right, it.r * 1.08 * it.side).project(camera);
        it.li.style.transform = `translate(${((tmp.x + 1) / 2 * w).toFixed(1)}px, ${((1 - tmp.y) / 2 * h).toFixed(1)}px) translate(${it.side > 0 ? '8px' : 'calc(-100% - 8px)'}, -50%)`;
      });
    };
    const animate = () => {
      setTime();
      if (current.rotor && !reduced) {                                    // the rotor turns round and round, winding the watch
        const t = performance.now() / 1000;
        current.rotor.rotation.y = -t * 1.3 + 0.25 * Math.sin(t * 2.1);  // about one turn every 5 s, with a slight surge
      }
      // the movement at its real pace (Miyota 9039: 28,800 vibrations an hour, 4 Hz). Seen from the dial, a negative angle
      // turns clockwise; each wheel turns the other way from the one it meshes with.
      if (!reduced) {
        const t = performance.now() / 1000;
        const spin = (o, a) => o.quaternion.copy(o.userData.q0).premultiply(qa.setFromAxisAngle(up, a));
        // balance: swings to and fro four times a second, about 270° each way
        current.balance.forEach(m => spin(m, 4.7 * Math.sin(t * Math.PI * 2 * 4)));
        current.train.forEach(w => {
          const k = w.userData.kind;
          if (k === 'escape') {                                           // 8 beats a second, a tooth (1/40 turn) at each, snapping
            const b = t * 8, step = Math.floor(b) + Math.min(1, (b % 1) * 6);
            spin(w, step / 40 * Math.PI * 2);
          }
          else if (k === 'fourth') spin(w, -t / 60 * Math.PI * 2);        // the seconds wheel: one turn a minute
          else if (k === 'third') spin(w, t / 450 * Math.PI * 2);         // one turn in about 7½ minutes
          else if (k === 'barrel') spin(w, t / 28800 * Math.PI * 2);      // the mainspring barrel: one turn in about 8 hours
        });
      }
    };
    let warned = false;
    const frame = () => {
      requestAnimationFrame(frame);
      if (!visible || !current || root.closest('[hidden]')) return;
      const e = ease((progress() - 0.08) / 0.72);
      current.info.forEach(it => { it.p.position.copy(it.base).addScaledVector(it.local, e); });
      pivot.position.y = -current.lift * e;
      try { animate(); } catch (err) { if (!warned) { warned = true; console.warn('watch 3d: movement', err); } }
      // while it comes apart: swing round to a side view (the parts stack along the axis) and pull back;
      // only while it is being scrolled, so once it's open it can be turned freely
      controls.autoRotate = !reduced && e < 0.02;
      off.copy(camera.position).sub(controls.target);
      const de = Math.abs(e - lastE); lastE = e;
      if (e > 0.02 && de > 1e-4 && !held) {
        const len = off.length();
        side.set(1, 0.28, 0.9).normalize();   // low, nearly level: the layers stand apart on screen
        off.normalize().lerp(side, Math.min(1, de * 5)).normalize().multiplyScalar(len);
      }
      const want = dist * (1 + 0.85 * e) * zoom;
      off.setLength(off.length() + (want - off.length()) * 0.15);
      camera.position.copy(controls.target).add(off);
      controls.update();
      hint.style.opacity = e > 0.04 ? 0 : 1;
      placeNames(e);                                                    // before drawing, so nothing can leave the names behind
      renderer.render(scene, camera);
    };
    get('carbon').then(() => {
      show('carbon');
      root.classList.add('ready');
      frame();
    }).catch(err => { console.warn('watch 3d', err); root.classList.add('failed'); });
  }
})();
