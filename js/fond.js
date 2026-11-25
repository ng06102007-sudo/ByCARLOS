// Shared background for the site pages: film grain + a background video player.
// Needs on the page: <div class="bgwrap" id="bgwrap"><video class="bg" id="bg" src="…"></video></div>
// and <div class="grain" id="grain">. The page then drives the video with Fond.play([...]).

// Film grain: one tile of random dark specks, repeated over the screen and jittered by CSS.
// Only dark specks, each with its own transparency: no white noise over the picture, and no blend mode
// (Safari cannot blend a layer with a <video>: mix-blend-mode is ignored there).
(() => {
  const d = Math.min(devicePixelRatio || 1, 2), n = Math.round(220 * d), STRENGTH = 0.3;
  const c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'), img = g.createImageData(n, n), px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    px[i] = px[i + 1] = px[i + 2] = 0;                                  // black…
    px[i + 3] = Math.round(Math.random() * STRENGTH * 255);             // …more or less see-through
  }
  g.putImageData(img, 0, 0);
  document.getElementById('grain').style.backgroundImage = `url(${c.toDataURL('image/png')})`;
})();

// Background player.
//   Fond.play([{ src }, { src }, …])   plays each clip once in turn and loops the last one, with no gap
//                                      ({ src, once: true } as the last step: plays once and stays on its last frame)
//                                      (every clip is preloaded and only shown once it is really playing).
//   { src, reverse: true }             plays that clip backwards (decoded frame by frame, drawn on a canvas).
//   Fond.preload([src, …])             starts downloading clips that will be needed soon.
//   Fond.prepareReverse(src)           decodes a clip ahead of time so playing it backwards starts at once.
// If the browser refuses to start video (Safari in Low Power Mode), every clip is decoded with WebCodecs
// and drawn on the canvas instead, which that rule does not cover.
// When that is not possible either (the site opened as a local file: the clips can't be read with fetch),
// the paused <video> is moved forward frame by frame with currentTime: seeking is still allowed.
window.Fond = (() => {
  const wrap = document.getElementById('bgwrap');
  const first = document.getElementById('bg');
  const hasDecoder = 'VideoDecoder' in window && 'EncodedVideoChunk' in window;
  const clips = new Map();
  let token = 0, z = 1, shown = null, lastSeq = null;
  let canvasMode = /[?&]canvas\b/.test(location.search);           // ?canvas tests the fallback in any browser
  let seekMode = /[?&]seek\b/.test(location.search);               // ?seek tests the last fallback in any browser
  const isFile = location.protocol === 'file:';

  const mute = el => { el.muted = true; el.defaultMuted = true; el.playsInline = true; };
  const clip = src => {
    if (clips.has(src)) return clips.get(src);
    let el = first && first.getAttribute('src') === src && ![...clips.values()].includes(first) ? first : null;
    if (!el) {
      el = document.createElement('video');
      el.className = 'bg'; el.setAttribute('aria-hidden', 'true'); el.preload = 'auto'; el.src = src;
      wrap.append(el);
    }
    mute(el); clips.set(src, el);
    return el;
  };

  // put a video or the canvas on top; the previous layer is hidden a moment later (no flash in between)
  const bringUp = el => {
    el.style.zIndex = ++z; el.classList.add('on');
    const prev = shown; shown = el;
    if (prev && prev !== el) setTimeout(() => {
      if (shown === prev) return;
      prev.classList.remove('on');
      if (prev.tagName === 'VIDEO') prev.pause();
    }, 90);
  };
  const ended = el => new Promise(res => el.addEventListener('ended', res, { once: true }));

  async function play(seq) {
    const my = ++token; lastSeq = seq;
    for (let i = 0; i < seq.length; i++) {
      if (my !== token) return;
      const step = seq[i], last = i === seq.length - 1;
      if (step.reverse) { await playReverse(step.src, my); continue; }
      if (seekMode) {
        try { await seekClip(step.src, last && !step.once, my, false); } catch (e) { return waitForGesture(); }
        continue;
      }
      if (canvasMode) {
        try { await canvasClip(step.src, last, my); }
        catch (e) { if (my !== token) return; canvasMode = false; seekMode = true; i--; }   // can't decode it ourselves: move the video by hand
        continue;
      }
      const el = clip(step.src);
      el.loop = last && !step.once;
      if (el !== shown) { try { el.currentTime = 0; } catch (e) {} }
      try { await el.play(); }
      catch (e) {
        if (my !== token) return;
        if (el.error || el.networkState === 3) { if (last) return; continue; }   // the file is missing or unreadable: skip it, the previous clip stays on screen
        clips.forEach(v => v.pause());
        if (!hasDecoder || isFile) seekMode = true; else canvasMode = true;
        i--; continue;                                                   // same step again, another way
      }
      if (my !== token) return;
      bringUp(el);
      if (!last) await ended(el);
    }
  }

  // no way to play without a click: start again on the first click, tap or key press
  function waitForGesture() {
    canvasMode = false;
    const evs = ['pointerdown', 'touchstart', 'keydown'];
    const go = () => { evs.forEach(e => removeEventListener(e, go)); if (lastSeq) play(lastSeq); };
    evs.forEach(e => addEventListener(e, go, { passive: true }));
  }

  // ---------- canvas (WebCodecs) ----------
  let cv = null, ctx = null;
  const ensureCanvas = () => {
    if (cv) return;
    cv = document.createElement('canvas');
    cv.className = 'bg'; cv.setAttribute('aria-hidden', 'true');
    wrap.append(cv); ctx = cv.getContext('2d');
    const fit = () => { const d = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(innerWidth * d); cv.height = Math.round(innerHeight * d); };
    fit(); addEventListener('resize', fit);
  };
  const paint = (img, w, h) => {
    const W = cv.width, H = cv.height, k = Math.max(W / w, H / h);
    ctx.drawImage(img, (W - w * k) / 2, (H - h * k) / 2, w * k, h * k);
  };

  const loadScript = src => new Promise((res, rej) => {
    if (window.MP4Box) return res();
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s);
  });

  // read an MP4 as it downloads and pull out its compressed frames (kept, so loops and reverse reuse them)
  const demuxed = new Map();
  const demux = src => {
    if (demuxed.has(src)) return demuxed.get(src);
    const job = (async () => {
      await loadScript('js/mp4box.all.min.js');
      const file = MP4Box.createFile();
      const out = { config: null, samples: [], complete: false, length: 0 };
      let doneRes; out.done = new Promise(r => { doneRes = r; });
      const ready = new Promise((res, rej) => {
        file.onError = rej;
        file.onReady = info => {
          const tr = info.videoTracks[0];
          if (!tr) return rej(new Error('no video track'));
          let description;
          for (const e of file.getTrackById(tr.id).mdia.minf.stbl.stsd.entries) {
            const box = e.avcC || e.hvcC;
            if (box) { const st = new DataStream(undefined, 0, DataStream.BIG_ENDIAN); box.write(st); description = new Uint8Array(st.buffer, 8); }
          }
          out.config = { codec: tr.codec, codedWidth: tr.video.width, codedHeight: tr.video.height, description };
          file.setExtractionOptions(tr.id, null, { nbSamples: 24 });
          file.start();
        };
        file.onSamples = (id, user, list) => {
          for (const s of list) out.samples.push({ key: s.is_sync, ts: 1e6 * s.cts / s.timescale, dur: 1e6 * s.duration / s.timescale, data: s.data });
          res();
        };
      });
      const reader = (await fetch(src)).body.getReader(); let offset = 0;
      (async () => {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const buf = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
          buf.fileStart = offset; offset += value.byteLength;
          file.appendBuffer(buf);
        }
        file.flush();
        out.length = out.samples.reduce((m, s) => Math.max(m, s.ts + s.dur), 0);
        out.complete = true; doneRes();
      })();
      await ready;
      if (!(await VideoDecoder.isConfigSupported(out.config)).supported) throw new Error('codec not supported');
      return out;
    })();
    demuxed.set(src, job);
    return job;
  };

  // play one clip on the canvas; a looping clip resolves once it is showing and runs until the next play()
  async function canvasClip(src, loop, my) {
    const m = await demux(src);
    if (my !== token) return;
    ensureCanvas();
    return new Promise(resolve => {
      const queue = []; let idx = 0, round = 0, t0 = null, flushing = false, flushed = false, up = false, flushT = 0;
      const dec = new VideoDecoder({ output: f => queue.push(f), error: e => console.warn('video decode', e) });
      dec.configure(m.config);
      const stop = () => { queue.forEach(f => f.close()); queue.length = 0; try { dec.close(); } catch (e) {} };
      const feed = () => {
        while (dec.state === 'configured' && dec.decodeQueueSize + queue.length < 8) {
          if (idx >= m.samples.length) {
            if (!m.complete || !m.length) return;
            if (!loop) { if (!flushing) { flushing = true; flushT = performance.now(); dec.flush().then(() => { flushed = true; }, () => { flushed = true; }); } return; }
            idx = 0; round++;
          }
          const s = m.samples[idx++];
          dec.decode(new EncodedVideoChunk({ type: s.key ? 'key' : 'delta', timestamp: s.ts + round * m.length, duration: s.dur, data: s.data }));
        }
      };
      const tick = now => {
        if (my !== token) { stop(); return resolve(); }
        feed();
        if (queue.length) {
          if (t0 === null || (now - t0) * 1000 - queue[0].timestamp > 5e5) t0 = now - queue[0].timestamp / 1000;
          const ct = (now - t0) * 1000;
          let frame = null;
          while (queue.length && queue[0].timestamp <= ct) { if (frame) frame.close(); frame = queue.shift(); }
          if (frame) {
            paint(frame, frame.displayWidth, frame.displayHeight); frame.close();
            if (!up) { up = true; bringUp(cv); if (loop) resolve(); }
          }
        } else if (!loop && (flushed || (flushing && now - flushT > 500))) { stop(); return resolve(); }   // clip over (or the decoder is stuck: move on)
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  // decode a whole (short) clip into still images, in order, so it can be shown backwards
  const reversedCache = new Map();
  const prepareReverse = src => {
    if (!hasDecoder) return Promise.resolve(null);
    if (reversedCache.has(src)) return reversedCache.get(src);
    const job = (async () => {
      const m = await demux(src); await m.done;
      const w = Math.min(960, m.config.codedWidth), h = Math.round(w * m.config.codedHeight / m.config.codedWidth);
      const frames = [];
      const dec = new VideoDecoder({
        output: f => {
          try {
            const c = document.createElement('canvas'); c.width = w; c.height = h;
            c.getContext('2d').drawImage(f, 0, 0, w, h);
            frames.push({ ts: f.timestamp, b: c });
          } finally { f.close(); }
        },
        error: e => console.warn('reverse decode', e),
      });
      dec.configure(m.config);
      for (const s of m.samples) dec.decode(new EncodedVideoChunk({ type: s.key ? 'key' : 'delta', timestamp: s.ts, duration: s.dur, data: s.data }));
      await dec.flush(); dec.close();
      frames.sort((a, b) => a.ts - b.ts);
      return { frames, w, h, step: m.length / Math.max(1, frames.length) };
    })().catch(e => { console.warn(e); return null; });
    reversedCache.set(src, job);
    return job;
  };

  // backwards with the browser's own player (Safari can play a <video> at a negative speed; Chrome can't)
  async function nativeReverse(src, my) {
    const el = clip(src);
    if (!(el.duration > 0)) await new Promise(res => { el.addEventListener('loadedmetadata', res, { once: true }); setTimeout(res, 800); });
    if (my !== token || !(el.duration > 0)) return false;
    try {
      el.pause(); el.loop = false;
      const seeked = new Promise(res => { el.addEventListener('seeked', res, { once: true }); setTimeout(res, 400); });
      el.currentTime = Math.max(0, el.duration - 0.04);
      await seeked;                                                     // start from the very last frame
      el.playbackRate = -1;
    } catch (e) { el.playbackRate = 1; return false; }
    if (my !== token) return true;
    if (el.playbackRate !== -1) { el.playbackRate = 1; return false; }
    try { await el.play(); } catch (e) { el.playbackRate = 1; return false; }
    if (my !== token) { el.pause(); el.playbackRate = 1; return true; }
    bringUp(el);                                                        // on screen straight away, so the first moments aren't cut
    const t1 = el.currentTime;
    await new Promise(res => setTimeout(res, 160));
    if (my !== token || !(el.currentTime < t1)) { el.pause(); el.playbackRate = 1; return my !== token; }   // not really going backwards
    await new Promise(res => {
      const limit = performance.now() + el.duration * 1000 + 600;
      const check = () => (my !== token || el.paused || el.currentTime <= 0.05 || performance.now() > limit) ? res() : requestAnimationFrame(check);
      check();
    });
    el.pause(); el.playbackRate = 1;
    return true;
  }

  // last fallback: the browser won't play, so the paused video is moved forward (or backwards) by hand,
  // one seek after another, in step with the clock; a looping clip resolves once it is showing
  async function seekClip(src, loop, my, backwards) {
    const el = clip(src);
    if (!(el.duration > 0)) await new Promise(res => { el.addEventListener('loadedmetadata', res, { once: true }); setTimeout(res, 4000); });
    if (my !== token) return;
    if (!(el.duration > 0)) throw new Error('no metadata');
    el.pause(); el.loop = false;
    const D = el.duration, last = Math.max(0, D - 0.04);
    return new Promise(resolve => {
      let t0 = null, busySeek = false, up = false, done = false;
      const onSeeked = () => {
        busySeek = false;
        if (!up) { up = true; bringUp(el); if (loop) resolve(); }
        if (done) { el.removeEventListener('seeked', onSeeked); resolve(); }
      };
      el.addEventListener('seeked', onSeeked);
      const tick = now => {
        if (my !== token) { el.removeEventListener('seeked', onSeeked); return resolve(); }
        if (t0 === null) t0 = now;
        let t = (now - t0) / 1000;
        if (t >= D) {
          if (loop) { t0 = now; t = 0; }
          else { done = true; if (!busySeek) { busySeek = true; el.currentTime = backwards ? 0 : last; } return; }
        }
        if (!busySeek) {
          busySeek = true;
          const at = backwards ? Math.max(0, last - t) : Math.min(last, t);
          if (typeof el.fastSeek === 'function' && D > 6) el.fastSeek(at); else el.currentTime = at;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  async function playReverse(src, my) {
    if (seekMode) { await seekClip(src, false, my, true); return; }
    const r = await Promise.race([prepareReverse(src), new Promise(res => setTimeout(() => res(null), 1200))]);
    if (my !== token) return;
    if (!r || !r.frames.length) {                                      // no decoded frames (e.g. Safari): use the player instead
      if (!(await nativeReverse(src, my)) && my === token) await seekClip(src, false, my, true);   // or, if it refuses, move it by hand
      return;
    }
    ensureCanvas();
    await new Promise(resolve => {
      let t0 = null, shownIdx = -1;
      const tick = now => {
        if (my !== token) return resolve();
        if (t0 === null) t0 = now;
        const i = Math.min(r.frames.length - 1, Math.floor((now - t0) * 1000 / r.step));
        if (i !== shownIdx) {
          shownIdx = i;
          paint(r.frames[r.frames.length - 1 - i].b, r.w, r.h);
          if (i === 0) bringUp(cv);
        }
        if ((now - t0) * 1000 >= r.frames.length * r.step) return resolve();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  return {
    play,
    source: () => shown,                                               // the layer currently on screen (video or canvas)
    preload: list => list.forEach(src => { if (!canvasMode) clip(src); }),
    prepareReverse,
  };
})();
