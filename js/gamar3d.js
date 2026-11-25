// 3D models of the GAMAR watches, at the top of each watch's page (index.html: #gm01-3d, #gm02-3d, #sm-3d).
// One engine, one set-up per watch (WATCHES, at the bottom). Each model is the watch's own Blender assembly, lightened
// and Draco-compressed, saved as base64 in "media /gamar/*.glb.js" so Safari can open it as a local file.
//   - lit with the same studio HDRI as the Storm Watch renders; steel polished, brushed or blasted as in Blender
//   - it turns slowly on its own; drag to turn, right-drag or shift-drag to move, pinch / ⌘ + wheel / + − to zoom
//   - scrolling down takes it apart along its axis, with each part's name; taken apart it can still be turned
//   - the buttons change the forged carbon, the dial or the strap; the hands show the viewer's time
// Forged carbon: real scans ("media /gamar/carbone textures.js"), laid on in three flat projections in the shader,
// as the CAD parts have no UVs; the same projection draws the brushing and the Côtes de Genève.
// Shares its page layout with js/rig3d.js (the .rig3d classes) and its light and textures with js/watch3d.js.
(() => {
  const CDN = 'https://cdn.jsdelivr.net/npm/three@0.147.0/';
  const SW = 'media/storm%20watch/';
  const GM = 'media/gamar/';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(pointer: coarse)').matches;
  const key = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // ?debug in the address: errors written on the page (to read them in Safari, whose console is out of reach)
  const dbg = /debug/.test(location.search) ? (() => {
    const d = document.createElement('pre');
    d.style.cssText = 'position:fixed;left:8px;top:70px;z-index:99999;max-width:92vw;max-height:70vh;overflow:hidden;color:#7f7;background:rgba(0,0,0,.85);font:11px/1.3 monospace;white-space:pre-wrap;pointer-events:none;margin:0';
    const put = () => document.body && !d.isConnected && document.body.append(d); put(); document.addEventListener('DOMContentLoaded', put);
    const log = (...a) => { d.textContent += a.map(x => (x && x.message) || String(x)).join(' ').slice(0, 600) + '\n'; put(); };
    const ce = console.error, cw = console.warn;
    console.error = (...a) => { log('E', ...a); ce.apply(console, a); }; console.warn = (...a) => { log('W', ...a); cw.apply(console, a); };
    addEventListener('error', e => log('ERR', e.message, e.filename, e.lineno)); addEventListener('unhandledrejection', e => log('REJ', e.reason));
    return log;
  })() : () => {};
  const load = src => new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s);
  });
  let libs = null;
  const libraries = () => libs || (libs = (async () => {
    if (!window.THREE) await load(CDN + 'build/three.min.js');
    const need = [['GLTFLoader', 'examples/js/loaders/GLTFLoader.js'], ['OrbitControls', 'examples/js/controls/OrbitControls.js'],
      ['RoomEnvironment', 'examples/js/environments/RoomEnvironment.js'], ['DRACOLoader', 'examples/js/loaders/DRACOLoader.js'],
      ['RGBELoader', 'examples/js/loaders/RGBELoader.js']].filter(([n]) => !THREE[n]);
    await Promise.all(need.map(([, p]) => load(CDN + p)));
    if (!window.SW_TEXTURES) await load(SW + 'textures%203d.js').catch(() => {});
    if (!window.SW_STUDIO_HDR) await load(SW + 'studio%20hdr.js').catch(() => {});
  })());

  function watch3d(root, cfg) {
    const stage = root.querySelector('.rig3d-stage'), canvas = root.querySelector('canvas');
    const hint = root.querySelector('.rig3d-hint'), labelsEl = root.querySelector('.rig3d-labels');
    const tools = root.querySelector('.rig3d-tools'), picks = root.querySelector('.watch3d-variants');
    let started = false, visible = false;
    const wait = document.createElement('p'); wait.className = 'gm3d-loading'; wait.textContent = 'Loading the 3D model…';
    const start = async () => {
      if (started) return; started = true;
      stage.append(wait);
      try {
        await libraries();
        if (cfg.carbon && !window.GM_CARBON) await load(GM + 'carbone%20textures.js');
        if (!window[cfg.global]) await load(cfg.model);
        dbg(cfg.el, 'model loaded', (window[cfg.global] || '').length);
        init();
      } catch (e) { console.warn('gamar 3d', e); root.classList.add('failed'); wait.textContent = 'The 3D model could not load'; }
    };
    new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) start(); }, { rootMargin: '900px 0px' }).observe(root);

    const kindOf = name => {
      if (name.includes('__')) return name.split('__')[0];
      const k = key(name); const m = (cfg.kinds || []).find(([p]) => k.includes(p)); return m ? m[1] : null;
    };
    // how far the tall wrapper has scrolled past, 0 … 1 (the stage itself stays on screen with position: sticky)
    const progress = () => {
      const r = root.getBoundingClientRect(), run = root.offsetHeight - stage.offsetHeight;
      const y = Math.min(Math.max(-r.top, 0), Math.max(run, 0));
      return run > 0 ? y / run : 0;
    };

    function init() {
      const T = window.THREE;
      if (T.ColorManagement) T.ColorManagement.legacyMode = false;
      const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });   // precise depth: close parts no longer flicker
      let pr = Math.min(devicePixelRatio || 1, 1.5);   // sharp enough, much lighter than full Retina
      renderer.setPixelRatio(pr);
      renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = cfg.exposure || 1.2;
      const scene = new T.Scene();
      const pm = new T.PMREMGenerator(renderer);
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
      } catch (e) { console.warn('gamar 3d: studio light', e); }
      scene.environment = env || pm.fromScene(new T.RoomEnvironment(), 0.03).texture;
      const keyL = new T.DirectionalLight(0xffffff, 0.6); keyL.position.set(3, 6, 4); scene.add(keyL);
      const rim = new T.DirectionalLight(0xffffff, 0.5); rim.position.set(-5, 2, -4); scene.add(rim);
      scene.add(new T.HemisphereLight(0xffffff, 0x202022, 0.35));

      const camera = new T.PerspectiveCamera(28, 1, 0.1, 60);   // a tight depth range: close parts do not flicker
      const controls = new T.OrbitControls(camera, canvas);
      controls.enableZoom = false; controls.enablePan = true; controls.enableDamping = true;
      controls.screenSpacePanning = true; controls.keyPanSpeed = 0;
      controls.autoRotate = false; controls.autoRotateSpeed = 0.6;   // the watch waits face on; it turns only when dragged
      canvas.style.touchAction = 'pan-y';
      if (touch && hint) hint.textContent = 'Swipe sideways to turn · two fingers to move and zoom · scroll to take it apart ↓';

      // ---------- materials ----------
      const texture = src => {
        const t = new T.TextureLoader().load(src);
        t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.encoding = T.sRGBEncoding; return t;
      };
      const swTex = file => texture((window.SW_TEXTURES && window.SW_TEXTURES[file]) || SW + encodeURIComponent(file));
      const scaleU = { value: 1 };
      const tri = (mat, uniforms, colour, rough, tag) => {   // three flat projections of a texture, blended by the normal
        mat.onBeforeCompile = sh => {
          Object.assign(sh.uniforms, uniforms); sh.uniforms.uScale = scaleU;
          sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj; varying vec3 vObjN;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position; vObjN = normal;');
          sh.fragmentShader = sh.fragmentShader
            .replace('#include <common>', `#include <common>
              varying vec3 vObj; varying vec3 vObjN; uniform sampler2D uTex; uniform float uScale; uniform float uTiles; uniform vec3 uTint; vec3 vTri;`)
            .replace('#include <color_fragment>', `#include <color_fragment>
              vec3 bw = pow(abs(normalize(vObjN)), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
              vec3 p = vObj * uScale * uTiles;
              vTri = texture2D(uTex, p.zy).rgb * bw.x + texture2D(uTex, p.xz).rgb * bw.y + texture2D(uTex, p.xy).rgb * bw.z;
              float v = vTri.g; ${colour}`)
            .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
              { float v = vTri.g; ${rough} }`);
        };
        mat.customProgramCacheKey = () => 'tri' + tag;
        return mat;
      };
      const M = (c, metal, rough, more) => new T.MeshPhysicalMaterial(Object.assign({ color: c, metalness: metal, roughness: rough }, more || {}));
      const P = {
        polished: M(0xf0f1f4, 1, 0.08, { envMapIntensity: 2.2 }),
        brushed: tri(M(0xd2d5da, 1, 0.18, { envMapIntensity: 1.6 }), { uTex: { value: swTex('texture acier brosse.jpg') }, uTiles: { value: 6 }, uTint: { value: new T.Color(1, 1, 1) } },
          'diffuseColor.rgb *= 0.86 + 0.28 * v;', 'roughnessFactor = 0.16 + 0.22 * (1.0 - v);', 'brushed'),
        blasted: M(0xb4b8be, 1, 0.42, { envMapIntensity: 1.3 }),
        dark: M(0x1d1e21, 0.9, 0.38, { envMapIntensity: 1.1 }),
        lume: M(0xf4f4f0, 0, 0.32, { clearcoat: 1, clearcoatRoughness: 0.1 }),
        print: M(0xf2f2f2, 0, 0.45),
        chapter: M(0xd9dce1, 1, 0.5),
        dateDisc: M(0xf2f2f0, 0, 0.6),
        glass: M(0xffffff, 0, 0.01, { transparent: true, opacity: 0.1, depthWrite: false, envMapIntensity: 2.4, clearcoat: 1 }),
        gold: M(0xd9a94e, 1, 0.22, { envMapIntensity: 1.6 }),
        ruby: M(0x9b0c2a, 0.1, 0.15, { clearcoat: 1 }),
        seal: M(0x101012, 0, 0.8),
        geneva: tri(M(0xdadde2, 1, 0.2), { uTex: { value: swTex('texture cotes de geneve.jpg') }, uTiles: { value: 4 }, uTint: { value: new T.Color(1, 1, 1) } },
          'diffuseColor.rgb *= 0.55 + 0.65 * v;', 'roughnessFactor = 0.08 + 0.4 * (1.0 - v);', 'geneva'),
        strap: M(0x141416, 0, 0.75, { sheen: 0.4, sheenRoughness: 0.8 }),
        // a thin needle in mirror chrome only reflects the dark studio: satin light steel keeps it visible on the dial
        // sandblasted metal: fine speckle in the colour and the roughness, as on the GM-02 skeleton dial (light) and its bridges (black)
        grainLight: null, grainDark: null,
        nylon: M(0xf1f1ee, 0, 0.7, { sheen: 0.6, sheenRoughness: 0.6 }),   // white nylon, matt
        needle: M(0xf2f3f6, 0.35, 0.28, { clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.4 }),
      };
      const weaveU = { uTex: { value: null }, uTiles: { value: 30 }, uTint: { value: new T.Color(1, 1, 1) } };
      P.strapWeave = tri(M(0x141416, 0, 0.7, { sheen: 0.5, sheenRoughness: 0.7 }), weaveU,
        'diffuseColor.rgb *= 0.48 + 0.75 * v;', 'roughnessFactor = 0.5 + 0.35 * (1.0 - v);', 'weave');
      if (window.GM_CARBON && window.GM_CARBON.toile) weaveU.uTex.value = texture(window.GM_CARBON.toile);
      // the dial: lacquered metal, with fine vertical stripes where the watch has them; its colour is the one picked
      P.dial = M(cfg.dialColor || 0x12309c, 0.4, 0.34, { clearcoat: 0.8, clearcoatRoughness: 0.08, envMapIntensity: 1 });   // lacquer over metal: the colour stays rich
      const grain = (c, metal, rough, tag) => {
        const m = M(c, metal, rough, { envMapIntensity: 1.1 });
        m.onBeforeCompile = sh => {
          sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
          sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj; float gN;')
            .replace('#include <color_fragment>', `#include <color_fragment>
              vec3 gq = floor(vObj * 1800.0);
              gN = fract(sin(dot(gq, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
              diffuseColor.rgb *= 0.8 + 0.35 * gN;`)
            .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
              roughnessFactor = clamp(roughnessFactor + 0.25 * (gN - 0.5), 0.05, 1.0);`);
        };
        m.customProgramCacheKey = () => 'grain' + tag;
        return m;
      };
      P.grainLight = grain(0xaeb1b6, 0.55, 0.6, 'light');
      P.caseSteel = tri(M(0x2b2c30, 1, 0.24, { envMapIntensity: 2.4 }), { uTex: { value: swTex('texture acier brosse.jpg') }, uTiles: { value: 6 }, uTint: { value: new T.Color(1, 1, 1) } },
        // the faces turned upwards are brushed, every other face (sides, bevels, chamfers) polished to a mirror
        'float upF = smoothstep(0.72, 0.9, normalize(vObjN).y); diffuseColor.rgb *= mix(1.08, 0.86 + 0.28 * v, upF);',
        'float upR = smoothstep(0.72, 0.9, normalize(vObjN).y); roughnessFactor = mix(0.09, 0.2 + 0.22 * (1.0 - v), upR);', 'casesteel2');
      P.buckle = tri(M(0xd2d5da, 1, 0.2, { envMapIntensity: 1.6 }), { uTex: { value: swTex('texture acier brosse.jpg') }, uTiles: { value: 6 }, uTint: { value: new T.Color(1, 1, 1) } },
        'diffuseColor.rgb *= 0.86 + 0.28 * v;', 'roughnessFactor = 0.18 + 0.22 * (1.0 - v);', 'buckle');
      P.grainDark = grain(0x1e1f22, 0.5, 0.55, 'dark');
      // the dial rendered flat in Blender, laid on from above (12 o'clock up), centred on the dial and as wide as it
      const dialU = { uDial: { value: null }, uDC: { value: new T.Vector2() }, uDS: { value: 1 }, uFlip: { value: new T.Vector2(1, 1) } };
      const dm = cfg.dialMap && window.GM_CARBON && window.GM_CARBON[cfg.dialMap.tex];
      if (dm) {
        dialU.uDial.value = texture(dm); dialU.uDial.value.wrapS = dialU.uDial.value.wrapT = T.ClampToEdgeWrapping;
        dialU.uFlip.value.set(cfg.dialMap.flipU ? -1 : 1, cfg.dialMap.flipV ? -1 : 1);
        P.dial.color.setHex(0xffffff); P.dial.metalness = 0.25; P.dial.roughness = 0.38;
        P.dial.onBeforeCompile = sh => {
          Object.assign(sh.uniforms, dialU);
          sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
          sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj; uniform sampler2D uDial; uniform vec2 uDC; uniform float uDS; uniform vec2 uFlip;')
            .replace('#include <color_fragment>', `#include <color_fragment>
              vec2 duv = vec2(uFlip.x * (vObj.x - uDC.x), uFlip.y * (vObj.z - uDC.y)) / uDS + 0.5;
              diffuseColor.rgb *= texture2D(uDial, clamp(duv, 0.002, 0.998)).rgb;`);
        };
        P.dial.customProgramCacheKey = () => 'dialmap';
      } else if (cfg.dialStripes) {
        P.dial.onBeforeCompile = sh => {
          sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
          sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
            .replace('#include <color_fragment>', `#include <color_fragment>
              float st = smoothstep(0.35, 0.5, abs(fract(vObj.x / ${cfg.dialStripes.toFixed(3)}) - 0.5));
              diffuseColor.rgb *= 0.78 + 0.32 * st;`);
        };
        P.dial.customProgramCacheKey = () => 'stripes';
      }
      // the case of the GM-02, in forged carbon: the face of the material on the top and the bottom, the cut edge (the
      // "tranche", its layers running round the case) on the sides and on every bevelled edge; a smooth clear coat over it
      const carbonU = { uTop: { value: null }, uSide: { value: null }, uTiles: { value: 1.35 }, uSideW: { value: 0.5 }, uSideV: { value: 20 }, uBump: { value: 0.08 }, uGain: { value: 1 } };
      const cTex = k => { const src = window.GM_CARBON && window.GM_CARBON[k]; if (!src) return null; const t = texture(src); t.wrapS = t.wrapT = T.MirroredRepeatWrapping; return t; };
      if (cfg.carbonCase) { carbonU.uTop.value = cTex('gamar_face'); carbonU.uSide.value = cTex('gamar_tranche'); }
      P.carbon = M(0xffffff, 0, 0.5, { clearcoat: 0.6, clearcoatRoughness: 0.22, envMapIntensity: 0.9, emissive: 0xffffff, emissiveIntensity: 0.06 });   // satin, as in the renders
      P.carbon.extensions = { derivatives: true };
      P.carbon.onBeforeCompile = sh => {
        Object.assign(sh.uniforms, carbonU); sh.uniforms.uScale = scaleU;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj; varying vec3 vObjN;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position; vObjN = normal;');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', `#include <common>
            varying vec3 vObj; varying vec3 vObjN; uniform sampler2D uTop; uniform sampler2D uSide; uniform float uScale;
            uniform float uTiles; uniform float uSideW; uniform float uSideV; uniform float uBump; uniform float uGain; float cH;
            // the face, laid without repeating: the top is cut into cells, each takes the scan from a random point,
            // and near its borders a cell melts into the next, so there is no mirror and no pattern coming back
            vec2 hash2(vec2 c) { return fract(sin(vec2(dot(c, vec2(127.1, 311.7)), dot(c, vec2(269.5, 183.3)))) * 43758.5453); }
            vec3 faceAt(vec2 uv, float bias) {
              vec2 c = floor(uv), f = fract(uv);
              vec2 w = smoothstep(0.78, 1.0, f);
              vec3 a = texture2D(uTop, uv + hash2(c) * 7.0, bias).rgb;
              vec3 b = texture2D(uTop, uv + hash2(c + vec2(1.0, 0.0)) * 7.0, bias).rgb;
              vec3 d = texture2D(uTop, uv + hash2(c + vec2(0.0, 1.0)) * 7.0, bias).rgb;
              vec3 e = texture2D(uTop, uv + hash2(c + vec2(1.0, 1.0)) * 7.0, bias).rgb;
              return mix(mix(a, b, w.x), mix(d, e, w.x), w.y);
            }
            // the tranche: one continuous band running right round the case (its position measured as an angle round the
            // centre, so every side and every bevel follows on from the next); its layers horizontal; rows stacked up the
            // height, each shifted at random along the band, so no mirror and no visible repeat
            vec3 tranche(vec3 q, float bias) {
              float sAround = atan(q.z, q.x) * 0.5;
              float a = q.y * uSideV, r = floor(a), fa = fract(a);
              float off = fract(sin(r * 91.7 + 3.1) * 43758.5453) * 7.0;
              // the level of detail is taken from the continuous position, not from the cut-up one: no lines at the joins,
              // and a little softer than strict, so fine fibres seen at a slant do not shimmer
              vec2 cont = vec2(a, sAround / uSideW);
              vec2 dS = vec2(dFdx(sAround), dFdy(sAround)); if (abs(dS.x) > 1.0 || abs(dS.y) > 1.0) { float sb = atan(-q.z, -q.x) * 0.5; dS = vec2(dFdx(sb), dFdy(sb)); }
              vec2 gx = vec2(dFdx(a), dS.x / uSideW) * 1.6 * exp2(bias), gy = vec2(dFdy(a), dS.y / uSideW) * 1.6 * exp2(bias);
              return textureGrad(uSide, vec2(fa, cont.y + off), gx, gy).rgb;
            }`)
          .replace('#include <color_fragment>', `#include <color_fragment>
            vec3 cn = normalize(vObjN);
            vec3 cp = vObj * uScale;
            float faceW = smoothstep(0.96, 0.995, abs(cn.y));         // only the flat top and bottom show the face; every slope is tranche
            vec2 sw = pow(abs(cn.xz), vec2(4.0)); sw /= (sw.x + sw.y + 1e-5);
            vec3 cFace = faceAt(cp.xz * uTiles + 0.37, 0.0);
            vec3 cSide = tranche(cp, 0.0);
            vec3 cCol = mix(cSide, cFace, faceW);
            vec3 cSoft = mix(tranche(cp, 2.0),
              faceAt(cp.xz * uTiles + 0.37, 2.0), faceW);
            cH = dot(cSoft, vec3(0.3333));
            diffuseColor.rgb = cCol * mix(0.6, 1.0, faceW) * uGain;   // the cut edge reads darker, as in the renders`)
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
            totalEmissiveRadiance *= diffuseColor.rgb;`)
          .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
            // the carbon fibre (the dark parts of the scan) is metallic and satin, the coloured resin matt
            float cFib = 1.0 - smoothstep(0.035, 0.09, cH);
            roughnessFactor = mix(0.6, 0.48, cFib);   // a soft sheen on the fibre, no sparkle`)
          .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
            metalnessFactor = mix(0.0, 0.15, 1.0 - smoothstep(0.035, 0.09, cH));`)
          .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
            {   // a light relief from the texture, under the clear coat
              vec3 dpdx = dFdx(-vViewPosition), dpdy = dFdy(-vViewPosition);
              float dhx = dFdx(cH), dhy = dFdy(cH);
              vec3 r1 = cross(dpdy, normal), r2 = cross(normal, dpdx);
              float det = dot(dpdx, r1);
              normal = normalize(abs(det) * normal - uBump * sign(det) * (dhx * r1 + dhy * r2));
            }`);
      };
      P.carbon.customProgramCacheKey = () => 'gamarcarbon';

      const rules = (cfg.materials || []).map(([p, m]) => [key(p), m]).sort((a, b) => b[0].length - a[0].length);
      const forMaterial = name => { const k = key(name); const r = rules.find(([p]) => k.startsWith(p)); return r ? P[r[1]] : null; };

      const draco = new T.DRACOLoader(); draco.setDecoderPath(CDN + 'examples/js/libs/draco/');
      const loader = new T.GLTFLoader(); loader.setDRACOLoader(draco);
      const bytes = Uint8Array.from(atob(window[cfg.global]), c => c.charCodeAt(0));
      loader.parse(bytes.buffer, '', gltf => {
        const model = gltf.scene;
        const byKind = {}, parts = [];
        model.children.forEach(o => {
          const k = kindOf(o.name); if (!k || (cfg.hide || []).includes(k)) { o.visible = false; return; }   // hide: parts see-through in Blender
          o.userData.kind = k; (byKind[k] = byKind[k] || []).push(o); parts.push(o);
          o.traverse(m => {
            if (!m.isMesh) return;
            const kr = cfg.kindMaterials && cfg.kindMaterials[k] && cfg.kindMaterials[k].find(([p]) => key(m.material && m.material.name).startsWith(key(p)));
            let mine = kr ? P[kr[1]] : forMaterial(m.material && m.material.name);
            if (!mine && cfg.byKind && cfg.byKind[k]) mine = P[cfg.byKind[k]];
            if (!mine) { mine = m.material; mine.envMapIntensity = 1.3; }   // the Blender colours, as exported
            m.material = mine; m.material.side = T.DoubleSide;
            if (mine === P.glass) m.renderOrder = 2;
          });
        });
        if (dm) {   // where the flat dial goes: the parts of the dial, in the model's own coordinates
          const db = new T.Box3();
          (cfg.dialMap.kinds || ['dial']).forEach(k => (byKind[k] || []).forEach(o => o.traverse(m => { if (m.isMesh) { m.geometry.computeBoundingBox(); db.union(m.geometry.boundingBox); } })));
          if (!db.isEmpty()) { const c = db.getCenter(new T.Vector3()), z = db.getSize(new T.Vector3()); dialU.uDC.value.set(c.x, c.z); dialU.uDS.value = Math.max(z.x, z.z) * (cfg.dialMap.scale || 1); }
        }
        // hands: their origins sit on the dial's axis (set in Blender); rest angle = their farthest point from the axis
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
        const up = new T.Vector3(0, 1, 0), qa = new T.Quaternion();
        const rotor = (byKind.rotor || [])[0]; if (rotor) rotor.userData.q0 = rotor.quaternion.clone();
        const balance = (byKind.balance || [])[0]; if (balance) balance.userData.q0 = balance.quaternion.clone();
        const ratchet = (byKind.ratchet || [])[0]; if (ratchet) ratchet.userData.q0 = ratchet.quaternion.clone();
        const TWELVE = cfg.twelve;
        const setTime = () => {
          const d = new Date(), s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, hr = (d.getHours() % 12) + m / 60;
          const turn = { hour: hr / 12, minute: m / 60, second: s / 60 };
          hands.forEach(h => h.quaternion.copy(h.userData.q0).premultiply(qa.setFromAxisAngle(up, TWELVE - turn[h.userData.kind] * Math.PI * 2 - h.userData.rest)));
        };

        model.updateMatrixWorld(true);
        const centreOf = list => { const b = new T.Box3(); (list || []).forEach(o => b.expandByObject(o)); return b.isEmpty() ? null : b.getCenter(new T.Vector3()); };
        const caseBox = new T.Box3(); (byKind.case || [model]).forEach(o => caseBox.expandByObject(o));
        const W = caseBox.getSize(new T.Vector3()).x;
        scaleU.value = 1 / W;
        const box = new T.Box3().setFromObject(model), c = box.getCenter(new T.Vector3());
        const s = 4 / box.getSize(new T.Vector3()).length();
        const pivot = new T.Group(); scene.add(pivot);
        model.position.sub(c); const holder = new T.Group(); holder.scale.setScalar(s); holder.add(model); pivot.add(holder);
        holder.updateMatrixWorld(true);
        const sideways = new T.Vector3(1, 0, 0), crownC = centreOf(byKind.crown), cc = centreOf(byKind.case);
        if (crownC && cc) { sideways.copy(crownC).sub(cc); sideways.y = 0; if (sideways.lengthSq() > 1e-12) sideways.normalize(); }
        const info = [], named = new Set();
        const E = cfg.explode, SIDEWAYS = cfg.sideways || {}, SIDE = cfg.side || {}, flip = cfg.flipExplode ? -1 : 1;
        parts.forEach(o => {
          const k = o.userData.kind;
          const b = new T.Box3().setFromObject(o); if (b.isEmpty()) return;
          const wc = b.getCenter(new T.Vector3()), sz = b.getSize(new T.Vector3());
          const off = new T.Vector3(0, flip * (E[k] || 0) * W * s, 0).addScaledVector(sideways, (SIDEWAYS[k] || 0) * W * s);
          const a = o.parent.worldToLocal(wc.clone()), b2 = o.parent.worldToLocal(wc.clone().add(off));
          let li = null;
          if (cfg.labels[k] && !named.has(k)) {
            named.add(k);
            li = document.createElement('li'); li.innerHTML = `<b>${String(named.size).padStart(2, '0')}</b><span></span>`;
            li.querySelector('span').textContent = cfg.labels[k]; li.dataset.kind = k;
            labelsEl.append(li);
          }
          info.push({ p: o, base: o.position.clone(), local: b2.sub(a), wc, off, li, r: Math.min(Math.max(sz.x, sz.z) / 2, 0.6 * W * s), side: SIDE[k] || (named.size % 2 ? 1 : -1) });
        });

        // ---------- the choices: forged carbon, dial, strap ----------
        const carbonTex = {};
        const apply = {
          dial: o => P.dial.color.setHex(o.c),
          carbon: o => { carbonU.uTop.value = cTex(o.face); carbonU.uSide.value = cTex(o.side); carbonU.uGain.value = o.gain || 1; carbonU.uSideW.value = o.sideW || 0.5; carbonU.uSideV.value = o.sideV || 20; },   // the colourway: its face and its tranche
          strap: o => { P.strap.color.setHex(o.c); P.strapWeave.color.setHex(o.c); if (o.buckle) { P.buckle.color.setHex(o.buckle); P.caseSteel.color.setHex(o.buckle); } if (o.nylon) P.nylon.color.setHex(o.nylon); },   // black strap: black steel buckle, bezel and case; white strap: natural steel   // black strap: black steel buckle
        };
        const choose = (g, id) => {
          const grp = cfg.groups.find(x => x.key === g), o = grp.options.find(x => x.id === id);
          apply[g](o);
          if (grp.labelKind) { const li = labelsEl.querySelector(`li[data-kind="${grp.labelKind}"] span`); if (li) li.textContent = o.label || cfg.labels[grp.labelKind]; }
          if (picks) picks.querySelectorAll(`[data-g="${g}"]`).forEach(b => b.setAttribute('aria-pressed', b.dataset.v === id));
          const out = picks && picks.querySelector(`[data-out="${g}"]`); if (out) out.textContent = o.name;
        };
        if (picks) {
          picks.innerHTML = '';
          cfg.groups.forEach(grp => {
            const row = document.createElement('div'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', grp.title);
            row.innerHTML = `<span class="vl">${grp.title}</span>` + grp.options.map(o =>
              `<button type="button" class="sw" data-g="${grp.key}" data-v="${o.id}" aria-pressed="false" aria-label="${o.name}" title="${o.name}" style="--c:${o.swatch}"></button>`).join('') +
              `<output class="vo" data-out="${grp.key}"></output>`;
            picks.append(row);
          });
          picks.addEventListener('click', ev => { const b = ev.target.closest('[data-g]'); if (b) choose(b.dataset.g, b.dataset.v); });
        }
        cfg.groups.forEach(g => choose(g.key, g.options[0].id));

        const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
        let dist = 1;
        const resize = () => {
          const w = stage.clientWidth, h = stage.clientHeight;
          renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
          dist = 2 / Math.sin(T.MathUtils.degToRad(camera.fov / 2)) * (camera.aspect < 1 ? 1.1 / camera.aspect * (cfg.fit || 1) : 0.95);   // fit: on a tall screen, closer for a watch whose bracelet makes the whole much larger than the head
        };
        resize(); addEventListener('resize', resize);
        const v0 = cfg.view || [0, 1, 0.06];   // face on, dial towards the viewer
        camera.position.set(v0[0], v0[1], v0[2]).normalize().multiplyScalar(dist); controls.update();

        const z0 = cfg.zoom || 0.74;   // large from the first screen
        let zoom = z0;
        const setZoom = z => { zoom = Math.min(2.2, Math.max(0.18, z)); };
        canvas.addEventListener('wheel', ev => {
          if (!(ev.ctrlKey || ev.metaKey)) return;
          ev.preventDefault(); setZoom(zoom * Math.exp(ev.deltaY * (ev.deltaMode ? 0.05 : 0.0025)));
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
          if (b.dataset.z === 'in') setZoom(zoom / 1.35);
          else if (b.dataset.z === 'out') setZoom(zoom * 1.35);
          else { controls.target.set(0, 0, 0); setZoom(z0); camera.position.set(v0[0], v0[1], v0[2]).normalize().multiplyScalar(dist * z0); }
        });

        const tmp = new T.Vector3(), side = new T.Vector3(), off = new T.Vector3(), right = new T.Vector3();
        let lastE = 0, held = false;
        controls.addEventListener('start', () => { held = true; });
        controls.addEventListener('end', () => { held = false; });
        let failedOnce = false, lastT = 0, slow = 0;
        const frame = () => {
          requestAnimationFrame(frame);
          if (!visible || root.closest('[hidden]')) return;
          const now = performance.now();
          if (lastT) { slow = slow * 0.95 + (now - lastT > 26 ? 0.05 : 0); if (slow > 0.6 && pr > 1) { pr = 1; renderer.setPixelRatio(pr); resize(); slow = 0; } }
          lastT = now;
          try { draw(); } catch (e) { if (!failedOnce) { failedOnce = true; console.warn('gamar 3d frame', cfg.el, e, e.stack); } }
        };
        const look = new T.Vector3(); let lastDrop = 0;
        const draw = () => {
          const e = ease((progress() - 0.08) / 0.72);
          info.forEach(it => { it.p.position.copy(it.base).addScaledVector(it.local, e); });
          setTime();
          // the balance wheel swings to and fro on its staff, 4 times a second (28,800 beats an hour), about 270° each way
          if (balance && !reduced) balance.quaternion.copy(balance.userData.q0).multiply(qa.setFromAxisAngle(up, 4.7 * Math.sin(performance.now() / 1000 * Math.PI * 2 * 4)));
          if (ratchet && !reduced) ratchet.quaternion.copy(ratchet.userData.q0).multiply(qa.setFromAxisAngle(up, -performance.now() / 1000 * 0.05));   // the barrel's ratchet wheel, slowly wound by the rotor
          if (rotor && !reduced) rotor.quaternion.copy(rotor.userData.q0).premultiply(qa.setFromAxisAngle(up, -performance.now() / 1000 * 1.3));   // the rotor winds the watch
          
          off.copy(camera.position).sub(controls.target);
          const de = Math.abs(e - lastE); lastE = e;
          if (e > 0.02 && de > 1e-4 && !held) {
            const len = off.length(); side.set(1, 0.28, 0.9).normalize();
            off.normalize().lerp(side, Math.min(1, de * 5)).normalize().multiplyScalar(len);
          }
          const want = dist * (1 + 0.55 * e) * zoom;
          off.setLength(off.length() + (want - off.length()) * 0.15);
          const drop = -0.25 * e; controls.target.y += drop - lastDrop; lastDrop = drop;   // taken apart: aim a little lower, the strap stays in view
          camera.position.copy(controls.target).add(off);
          controls.update(); renderer.render(scene, camera);
          if (hint) hint.style.opacity = e > 0.04 ? 0 : 1;
          const shown = ease((e - 0.6) / 0.3), w = stage.clientWidth, h = stage.clientHeight;
          right.setFromMatrixColumn(camera.matrixWorld, 0);
          info.forEach(it => {
            if (!it.li) return;
            // a name that would run off the screen goes on the other side of its part
            const lw = it.li.offsetWidth + 12;
            let sd = it.side;
            tmp.copy(it.wc).addScaledVector(it.off, e).addScaledVector(right, it.r * 1.08 * sd).project(camera);
            let x = (tmp.x + 1) / 2 * w;
            if ((sd < 0 && x - lw < 4) || (sd > 0 && x + lw > w - 4)) {
              sd = -sd; tmp.copy(it.wc).addScaledVector(it.off, e).addScaledVector(right, it.r * 1.08 * sd).project(camera); x = (tmp.x + 1) / 2 * w;
            }
            it.li.style.transform = `translate(${x.toFixed(1)}px, ${((1 - tmp.y) / 2 * h).toFixed(1)}px) translate(${sd > 0 ? '8px' : 'calc(-100% - 8px)'}, -50%)`;
            it.li.style.opacity = shown;
          });
        };
        dbg(cfg.el, 'parts', parts.length, 'size', W.toFixed(3), 'scale', s.toFixed(3));
        if (/debug/.test(location.search)) (window.__gm3d = window.__gm3d || {})[cfg.el] = { camera, controls, dialU, setZoom, byKind, P, model, renderer, scene };
        wait.remove(); root.classList.add('ready'); frame();
      }, err => { console.warn('gamar 3d', err); root.classList.add('failed'); });
    }
  }

  // ---------- the three watches ----------
  const WATCHES = {
    gm01: {
      el: 'gm01-3d', model: GM + 'gm-01.glb.js', global: 'GM01_GLB_B64', dialColor: 0x1a3ab4, carbon: true, dialMap: { tex: 'cadran_gm01', kinds: ['dial', 'flange'], flipV: true }, twelve: Math.PI / 2, dialStripes: 0.03, fit: 0.72,
      explode: { strap: -0.95, back: -0.66, backseal: -0.55, rotor: -0.46, movement: -0.34, date: -0.2, ring: -0.12, case: 0,
        dial: 0.18, flange: 0.24, hour: 0.3, minute: 0.34, second: 0.38, seal: 0.46, bezel: 0.55 },
      sideways: { crown: 0.36, tube: 0.2 }, side: { crown: 1 },
      labels: { case: 'Case · brushed and polished steel', bezel: 'Faceted bezel', dial: 'Blue dial', flange: 'Minute track', seal: 'Gaskets',
        hour: 'Hands', date: 'Date disc', movement: 'Sellita SW300 automatic movement', rotor: 'Oscillating weight',
        back: 'Caseback · sapphire window', crown: 'Crown', strap: 'Integrated steel bracelet' },
      materials: [['material016', 'dial'], ['material011', 'dial'], ['gold001', 'dial'], ['material012', 'dateDisc'], ['material001', 'lume'], ['material002', 'print'],
        ['material007', 'chapter'], ['material010', 'brushed'], ['carchrome', 'polished'], ['acierbrosse', 'brushed'], ['aciermicrobille', 'blasted'], ['pyrexglass', 'glass']],
      byKind: { rotor: 'geneva', movement: 'geneva', date: 'dateDisc', ring: 'blasted', flange: 'chapter', seal: 'seal', backseal: 'seal', strap: 'brushed', dial: 'dial' },   // the dial plate has no material in Blender
      kindMaterials: { dial: [['material001', 'dial']], flange: [['material007', 'dial']], second: [['carchrome', 'needle']] },   // on the dial, Material.001 is the blue plate (elsewhere it is the lume)
      groups: [],
    },
    gm02: {
      el: 'gm02-3d', model: GM + 'gm-02.glb.js', global: 'GM02_GLB_B64', twelve: Math.PI / 2, fit: 0.8, exposure: 1.3, carbon: true, carbonCase: true, hide: ['plate'],
      // the crown: steel and a nylon ring, both following the strap (black, or steel and white)
      kindMaterials: { dial: [['acierbrossegm2', 'grainLight']], strap: [['acierbrossegm2', 'buckle'], ['sandblasted', 'buckle']], crown: [['rubberblack', 'nylon'], ['sandblasted', 'caseSteel']], frame: [['sandblasted', 'caseSteel']], back: [['sandblasted', 'caseSteel']], movement: [['acierbrossegm2041', 'grainDark'], ['aciermicrobille', 'grainDark'], ['acierbrossegm2', 'grainLight']] },   // skeleton dial sandblasted light grey, bridges sandblasted black, wheels light
      explode: { strap: -0.95, backglass: -0.7, back: -0.62, backseal: -0.54, movement: -0.36, balance: -0.36, crystal: 0.72, case: 0, frame: 0.2, dial: 0.34, hour: 0.44, minute: 0.48, second: 0.52, seal: 0.6 },
      sideways: { crown: 0.4, tube: 0.22 }, side: { crown: 1 },
      labels: { crystal: 'Sapphire crystal', backglass: 'Sapphire caseback', case: 'Case · GAMAR forged carbon', frame: 'Steel frame and bezel', dial: 'Skeleton dial', hour: 'Hands',
        movement: 'Skeletonised Sellita SW210 movement', back: 'Caseback · sapphire window, six screws', crown: 'Crown · steel and nylon', strap: 'Rubber strap and buckle', seal: 'Gaskets' },
      materials: [['gamarcarboneforge', 'carbon'], ['forgedcarbon', 'carbon'], ['acierbrossegm2', 'brushed'], ['aciermicrobille', 'blasted'], ['carchrome', 'polished'],
        ['stainlesssteel', 'polished'], ['shinygold', 'gold'], ['rubberblack', 'strap'], ['pyrexglass', 'glass'], ['sandblasted', 'dark']],
      byKind: { movement: 'geneva', seal: 'seal', backseal: 'seal', strap: 'strap' },
      groups: [
        { key: 'carbon', title: 'Forged carbon', labelKind: 'case', options: [
          { id: 'gamar', name: 'GAMAR turquoise forged carbon', swatch: '#2f8a8f', face: 'gamar_face', side: 'gamar_tranche', label: 'Case · GAMAR turquoise forged carbon' },
          { id: 'black', name: 'Black forged carbon', swatch: '#1c1c1e', face: 'noir_face', side: 'tranche_noir_v', gain: 1.5, sideW: 1.4, sideV: 34, label: 'Case · black forged carbon' },
          { id: 'white', name: 'White forged carbon', swatch: '#e6e7e9', face: 'blanc_face', side: 'tranche_blanc_v', sideW: 1.4, sideV: 34, label: 'Case · white forged carbon' }] },
        { key: 'strap', title: 'Strap', options: [
          { id: 'black', name: 'Black rubber strap', swatch: '#141416', c: 0x141416, buckle: 0x2b2c30, nylon: 0x161618 },
          { id: 'white', name: 'White rubber strap', swatch: '#e8e8e6', c: 0xe8e8e6, buckle: 0xd2d5da, nylon: 0xf1f1ee }] }],
    },
    sm: {
      el: 'sm-3d', model: GM + 'gm-01-sm.glb.js?v=2', global: 'GMSM_GLB_B64', carbon: true, dialMap: { tex: 'cadran_sm', kinds: ['dial'], flipV: true }, dialColor: 0x111113, twelve: Math.PI / 2, fit: 0.8,
      explode: { strap: -0.95, back: -0.6, backglass: -0.56, backseal: -0.5, screws: -0.44, movement: -0.34, case: 0, dial: 0.2, hour: 0.3, minute: 0.34, second: 0.38, seal: 0.46, bezel: 0.54, crystal: 0.64 , rotor: -0.42, balance: -0.34, ratchet: -0.34 },
      sideways: { crown: 0.4, tube: 0.22 }, side: { crown: 1 },
      labels: { rotor: 'Oscillating weight', case: 'Case · vertical brushing, polished bevels', bezel: 'Screwed bezel', crystal: 'Anti-reflective sapphire', dial: 'Black grained dial · Two made one', hour: 'Hands · Super-LumiNova',
        movement: 'Sellita SW200 automatic movement', back: 'Caseback', backglass: 'Sapphire window', crown: 'Crown', strap: 'Canvas-textured rubber strap', seal: 'Gaskets', screws: 'Casing screws' },
      materials: [['cadrannoirgraine', 'dial'], ['impressiontampographie', 'print'], ['indexacierbrosse', 'brushed'], ['brushedstainless', 'brushed'], ['acierbrossevertical', 'brushed'],
        ['acierbrossecornes', 'brushed'], ['carchrome', 'polished'], ['aiguillesacier', 'polished'], ['superluminova', 'lume'], ['saphir', 'glass'], ['pyrexglass', 'glass'],
        ['braceletcaoutchouc', 'strapWeave'], ['sandblasted', 'blasted'], ['aciermicrobille', 'blasted'], ['aciergrisfonces', 'dark'], ['aciergris', 'blasted'],
        ['shinygold', 'gold'], ['material001', 'ruby'], ['circularbrushed', 'geneva'], ['acierbrossegm2', 'brushed']],
      kindMaterials: { dial: [['', 'dial']] },   // the new dial: the flat render laid over all of it
      byKind: { movement: 'geneva', seal: 'seal', backseal: 'seal', strap: 'strap', screws: 'blasted' },
      groups: [
        { key: 'strap', title: 'Strap', options: [
          { id: 'black', name: 'Black canvas rubber', swatch: '#141416', c: 0x141416 },
          { id: 'grey', name: 'Grey canvas rubber', swatch: '#6d7075', c: 0x6d7075 },
          { id: 'orange', name: 'Orange canvas rubber', swatch: '#e0601f', c: 0xe0601f },
          { id: 'navy', name: 'Navy canvas rubber', swatch: '#1b2a4a', c: 0x1b2a4a },
          { id: 'khaki', name: 'Khaki green canvas rubber', swatch: '#5f6440', c: 0x5f6440 }] }],
    },
  };
  Object.values(WATCHES).forEach(cfg => { const root = document.getElementById(cfg.el); if (root) watch3d(root, cfg); });
})();
