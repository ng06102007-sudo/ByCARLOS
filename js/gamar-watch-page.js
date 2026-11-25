// GAMAR: one template for the three watch pages.
// Each page has <div class="gm-body" data-watch="gm-02"></div> under its 3D model; the data comes from js/gamar/<id>.js
// (window.GAMAR_WATCHES[id]). Paths in the data are relative to "media /gamar/". An empty field or list hides its block.
(() => {
  const DATA = window.GAMAR_WATCHES || {};
  const MEDIA = 'media/gamar/';
  const url = p => MEDIA + p.split('/').map(encodeURIComponent).join('/');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const list = a => (Array.isArray(a) ? a : []).filter(Boolean);
  const KIND = { sketch: 'Sketch', clay: 'Matt grey 3D', study: 'Study', curves: 'Curves' };

  const section = (cls, title, inner) => inner ? `<section class="gm-part ${cls}"><h3><span>${title}</span></h3>${inner}</section>` : '';

  function render(id, w) {
    const name = esc(w.name || id);
    let html = '';

    // 2. presentation and inspiration (the owner's own text)
    const intro = list(w.intro).map(p => `<p>${esc(p)}</p>`).join('');
    const insp = list(w.inspiration).map(p => `<p>${esc(p)}</p>`).join('');
    if (intro || insp) html += `<section class="gm-part gm-words">${intro ? `<div class="gm-intro-text">${intro}</div>` : ''}${insp ? `<div class="gm-insp"><h3><span>Inspiration</span></h3>${insp}</div>` : ''}</section>`;

    // 3. research sketchbook
    const sk = list(w.sketchbook).filter(s => s.img).map((s, i) => `<figure class="gm-sk gm-sk-${esc(s.kind || 'study')}" style="--r:${[-1.2, .8, -.4, 1.1, -.9, .5][i % 6]}deg">`
      + `<img class="cast" src="${url(s.img)}" alt="${esc(name + ', ' + (KIND[s.kind] || 'study').toLowerCase() + ': ' + (s.note || ''))}" loading="lazy">`
      + `<figcaption><b>${String(i + 1).padStart(2, '0')} · ${KIND[s.kind] || 'Study'}</b>${s.note ? `<span>${esc(s.note)}</span>` : ''}${s.ref ? `<i>↳ ${esc(s.ref)}</i>` : ''}</figcaption></figure>`).join('');
    html += section('gm-book', 'Research sketchbook', sk && `<div class="gm-sketchbook">${sk}</div>`);

    // 4. the chosen movement
    const m = w.movement || {};
    if (m.ref || list(m.photos).length) {
      const photos = list(m.photos).filter(p => p.img).map(p => `<figure><img class="cast gm-cutout" src="${url(p.img)}" alt="${esc((m.ref || 'The movement') + (p.caption ? ', ' + p.caption : ''))}" loading="lazy">${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}</figure>`).join('');
      html += section('gm-move', 'The movement',
        (m.ref ? `<p class="gm-calibre">${esc(m.ref)}</p>` : '')
        + (m.detail ? `<p class="gm-calibre-detail">${esc(m.detail)}</p>` : '')
        + (m.reason ? `<p class="gm-calibre-why">${esc(m.reason)}</p>` : '')
        + (m.sound ? `<button type="button" class="gm-listen" data-sound="${url(m.sound)}" aria-pressed="false"><span class="gm-listen-dot" aria-hidden="true"></span><span class="gm-listen-label">Listen to the movement</span></button>` : '')
        + (photos ? `<div class="gm-move-photos" style="--n:${Math.min(list(m.photos).length, 3)}">${photos}</div>` : ''));
    }

    // 5. first 3D renders, in the order they were made
    const fr = list(w.firstRenders).map(p => typeof p === 'string' ? { img: p } : p).filter(p => p.img);
    html += section('gm-first', 'First 3D renders', fr.length && `<div class="gm-steps gm-first-grid" style="--n:${Math.min(fr.length, 4)}">`
      + fr.map((p, i) => `<figure><img class="cast" src="${url(p.img)}" alt="${esc(name)}, early render ${i + 1}" loading="lazy"><figcaption><b>${String(i + 1).padStart(2, '0')}</b>${esc(p.caption || '')}</figcaption></figure>`).join('') + '</div>');

    // 6. grey model against the final render, same angle and framing
    const c = w.compare || {};
    if (c.raw && c.final) html += section('gm-cmp', 'From grey to material',
      `<div class="sw-compare gm-compare gm-compare-big" style="--pos:50%" tabindex="0" role="slider" aria-label="Compare the matt grey model and the final render of the ${name}: drag the handle, or use the arrow keys" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">`
      + `<img src="${url(c.final)}" alt="The ${name}, final render" draggable="false"><img class="sw-compare-raw" src="${url(c.raw)}" alt="The ${name}, matt grey model, same angle" draggable="false">`
      + `<span class="sw-compare-bar" aria-hidden="true"></span><span class="sw-compare-tag l" aria-hidden="true">Render</span><span class="sw-compare-tag r" aria-hidden="true">Grey model</span></div>`);

    // 7. every final render, video and animation
    const g = list(w.gallery).map((it, i) => it.video
      ? `<figure class="gm-g gm-g-video"><video class="auto" src="${url(it.video)}"${it.poster ? ` poster="${url(it.poster)}"` : ''} muted loop playsinline preload="none" aria-label="${esc(it.caption || name + ', film ' + (i + 1))}"></video></figure>`
      : it.img ? `<figure class="gm-g"><img class="cast" src="${url(it.img)}" alt="${esc(it.caption || name + ', final render ' + (i + 1))}" loading="lazy"></figure>` : '').join('');
    html += section('gm-gal', 'Gallery', g && `<div class="gm-gallery">${g}</div>`);

    return html;
  }

  document.querySelectorAll('.gm-body[data-watch]').forEach(box => {
    const w = DATA[box.dataset.watch];
    if (!w) { box.hidden = true; return; }
    box.innerHTML = render(box.dataset.watch, w);
    // an image that fails to load takes its frame away with it
    box.querySelectorAll('img').forEach(img => img.addEventListener('error', () => {
      const fig = img.closest('figure') || img.closest('.sw-compare');
      if (fig) fig.remove();
      box.querySelectorAll('.gm-part').forEach(s => { if (!s.querySelector('img, video, p')) s.remove(); });
    }));
  });

  // "Listen to the movement": the real tick-tock, play / pause, one at a time
  let playing = null;
  const stop = () => { if (!playing) return; playing.a.pause(); playing.b.setAttribute('aria-pressed', 'false'); playing.b.querySelector('.gm-listen-label').textContent = 'Listen to the movement'; playing = null; };
  document.querySelectorAll('.gm-listen').forEach(b => {
    const a = new Audio(); a.loop = true; a.preload = 'none';
    a.addEventListener('error', () => b.remove());
    b.addEventListener('click', () => {
      if (playing && playing.b === b) return stop();
      stop();
      if (!a.src) a.src = b.dataset.sound;
      a.play().then(() => { playing = { a, b }; b.setAttribute('aria-pressed', 'true'); b.querySelector('.gm-listen-label').textContent = 'Pause'; }).catch(() => {});
    });
  });
  addEventListener('hashchange', stop);
})();
