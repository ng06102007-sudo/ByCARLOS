// BYCARLOS: the TikToks, shown as in the TikTok app (#bycarlos). A full-screen vertical feed: scroll or swipe from one
// video to the next, each one plays when it is on screen. Like (or double-tap), comment, save, share and follow work
// on this device: what a visitor does is kept in localStorage, nothing is sent anywhere. Videos: "media /tiktok/".
(() => {
  const root = document.getElementById('case-bycarlos');
  if (!root) return;
  const MEDIA = 'media/tiktok/';
  const IDS = [33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];   // newest first
  const HANDLE = 'bycarlos';
  const store = {
    get(k, d) { try { const v = localStorage.getItem('tk.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('tk.' + k, JSON.stringify(v)); } catch (e) {} },
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const I = {
    heart: '<svg viewBox="0 0 48 48"><path d="M24 42s-15-9.2-18.6-18.2C2.8 17.3 6.8 9 14.6 9c4.3 0 7.4 2.5 9.4 5.6C26 11.5 29.1 9 33.4 9 41.2 9 45.2 17.3 42.6 23.8 39 32.8 24 42 24 42z"/></svg>',
    comment: '<svg viewBox="0 0 48 48"><path d="M24 6C12.4 6 4 13.6 4 23c0 4.6 2 8.8 5.4 11.9L8 43l9.1-4.6c2.2.6 4.5.9 6.9.9 11.6 0 20-7.6 20-17S35.6 6 24 6zm-9 19.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5zm9 0a2.5 2.5 0 110-5 2.5 2.5 0 010 5zm9 0a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/></svg>',
    save: '<svg viewBox="0 0 48 48"><path d="M12 5h24a3 3 0 013 3v35l-15-9-15 9V8a3 3 0 013-3z"/></svg>',
    share: '<svg viewBox="0 0 48 48"><path d="M27 8l17 15-17 15v-9C15 29 9 33 4 41c2-12 8-22 23-24V8z"/></svg>',
    play: '<svg viewBox="0 0 48 48"><path d="M16 10l24 14-24 14z"/></svg>',
    sound: '<svg viewBox="0 0 48 48"><path d="M8 18h8l10-8v28l-10-8H8z"/><path d="M32 16c3 2 5 5 5 8s-2 6-5 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
    mute: '<svg viewBox="0 0 48 48"><path d="M8 18h8l10-8v28l-10-8H8z"/><path d="M33 19l10 10M43 19L33 29" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
    note: '<svg viewBox="0 0 24 24"><path d="M9 17.5a2.5 2.5 0 11-2-2.45V5l11-2v11.5a2.5 2.5 0 11-2-2.45V6.4L9 7.7z"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z"/></svg>',
    friends: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="4"/><path d="M1 21c0-4.4 3.6-7 8-7s8 2.6 8 7z"/><circle cx="18" cy="9" r="3"/><path d="M18 14c3 0 5 2 5 5h-4c0-2-.4-3.6-1-5z"/></svg>',
    inbox: '<svg viewBox="0 0 24 24"><path d="M3 5h18v12H8l-5 4z"/></svg>',
    me: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4.5"/><path d="M3 22c0-5 4-8 9-8s9 3 9 8z"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15 4l-8 8 8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  };
  const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.0', '') + 'K' : String(n);

  const avatar = MEDIA + 'avatar.jpg';
  root.innerHTML = `
    <div class="tk">
      <header class="tk-top">
        <a class="tk-back" href="#my-projects" aria-label="Back to my projects">${I.back}</a>
        <nav class="tk-tabs" aria-label="Feed"><span>Following</span><b>For You</b></nav>
        <button type="button" class="tk-mo-btn" aria-label="Making-of: how the TikToks are filmed, graded and edited">Making-of</button>
      </header>
      <div class="tk-feed" tabindex="0" aria-label="BYCARLOS TikToks: scroll or swipe to go from one video to the next"></div>
      <div class="tk-unmute" role="button" tabindex="0">${I.mute}<span>Tap for sound</span></div>
      <div class="tk-arrows" aria-hidden="true"><button type="button" data-d="-1">${I.up}</button><button type="button" data-d="1" style="transform:rotate(180deg)">${I.up}</button></div>
      <nav class="tk-nav" aria-label="TikTok menu">
        <button type="button" class="on" data-tab="home">${I.home}<span>Home</span></button>
        <button type="button" data-tab="friends">${I.friends}<span>Friends</span></button>
        <button type="button" class="tk-plus" aria-label="Create" tabindex="-1"><i></i></button>
        <button type="button" data-tab="inbox">${I.inbox}<span>Inbox</span></button>
        <button type="button" data-tab="profile">${I.me}<span>Profile</span></button>
      </nav>
      <section class="tk-sheet tk-comments" hidden aria-label="Comments">
        <header><b class="tk-c-count"></b><button type="button" class="tk-x" aria-label="Close">${I.close}</button></header>
        <ul class="tk-c-list"></ul>
        <form class="tk-c-form"><img src="${avatar}" alt=""><input type="text" maxlength="150" placeholder="Add comment..." aria-label="Add a comment"><button type="submit">Post</button></form>
      </section>
      <section class="tk-sheet tk-share" hidden aria-label="Share">
        <header><b>Share to</b><button type="button" class="tk-x" aria-label="Close">${I.close}</button></header>
        <div class="tk-share-row"><button type="button" data-share="copy"><i>${I.link}</i>Copy link</button><button type="button" data-share="native"><i>${I.share}</i>More</button></div>
        <p class="tk-toast" aria-live="polite"></p>
      </section>
      <section class="tk-profile" hidden aria-label="BYCARLOS profile">
        <header class="tk-p-head"><a class="tk-p-close" href="#my-projects" aria-label="Back to my projects">${I.back}</a><b>${HANDLE}</b><span></span></header>
        <img class="tk-p-avatar" src="${avatar}" alt="BYCARLOS profile picture">
        <p class="tk-p-name">@${HANDLE}</p>
        <ul class="tk-p-stats"><li><b class="tk-p-following">0</b>Following</li><li><b class="tk-p-followers">0</b>Followers</li><li><b class="tk-p-likes">0</b>Likes</li></ul>
        <button type="button" class="tk-follow-big">Follow</button>
        <p class="tk-p-bio">Filmed, edited and graded by BYCARLOS.</p>
        <div class="tk-p-tabs"><b aria-label="Videos"><svg viewBox="0 0 24 24"><path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z"/></svg></b></div>
        <div class="tk-p-grid"></div>
      </section>
      <div class="tk-heart-burst" aria-hidden="true"></div>
    </div>`;


  // ── the making-of, on each side of the phone on a computer (left: why, the rushes, the kit; right: the colour and the
  //    edit), in a sheet from the top bar on a phone. Screenshots of the edit go in "media /tiktok/montage/": a missing
  //    one simply hides its frame.
  const MO = MEDIA + 'making-of/', MT = MEDIA + 'montage/';
  const pair = (t, n) => `<div class="sw-compare tk-cmp" style="--pos:50%" tabindex="0" role="slider" aria-label="Colour grading of a TikTok, frame ${n}: drag the handle to compare the log footage and the graded image" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"><img src="${MO}etalonnage%20apres%20${t}.jpg" alt="The graded image" draggable="false"><img class="sw-compare-raw" src="${MO}etalonnage%20avant%20${t}.jpg" alt="The same frame in D-Log M, before grading" draggable="false"><span class="sw-compare-bar" aria-hidden="true"></span><span class="sw-compare-tag l" aria-hidden="true">Graded</span><span class="sw-compare-tag r" aria-hidden="true">Log</span></div>`;
  const shot = (f, alt, cap) => `<figure class="tk-shot"><img src="${MT}${encodeURIComponent(f)}" alt="${alt}" loading="lazy" onerror="this.closest('figure').remove()"><figcaption>${cap}</figcaption></figure>`;
  const left = `
    <section class="tk-side-block"><p class="tk-side-tag">01 / Why TikTok</p>
      <h3>One minute,<br><span>the whole chain.</span></h3>
      <p>I make TikToks to talk about what I love, design, brands, architecture and watches, and to practise the whole chain of a video on my own: the idea and the script, the shoot, the edit, the colour and the subtitles. Each video is a short exercise in telling a story in under a minute.</p></section>
    <section class="tk-side-block"><p class="tk-side-tag">02 / Making-of</p>
      <h3>Straight out<br><span>of the camera.</span></h3>
      <p>The raw rushes, as the camera records them: flat and grey, in log, so the image keeps the most detail in the highlights and the shadows for the grade.</p>
      <div class="tk-rushes">${[1, 2, 3].map(n => `<video src="${MO}rush%20log%20${n}.mp4" muted loop playsinline preload="none" aria-label="Raw rush ${n}, D-Log M"></video>`).join('')}</div></section>
    <section class="tk-side-block"><p class="tk-side-tag">03 / The kit</p>
      <ul class="tk-kit">
        <li><i>Camera</i>DJI Osmo Pocket 4, filmed in D-Log M</li>
        <li><i>Colour</i>DaVinci Resolve: log converted, graded, a .cube LUT as a base</li>
        <li><i>Edit</i>Adobe Premiere Pro: cuts, zooms, sound design, animated titles, subtitles</li>
        <li><i>Format</i>Vertical 9:16, exported for TikTok</li>
      </ul></section>`;
  const right = `
    <section class="tk-side-block"><p class="tk-side-tag">04 / Colour grading</p>
      <h3>From log<br><span>to the look.</span></h3>
      <p>Filmed in log on the DJI Osmo Pocket 4, then graded in DaVinci Resolve: contrast, saturation and skin tones brought back, then the look. Drag the handle: the same frame, before and after.</p>
      <div class="tk-cmps">${pair(9, 1)}${pair(15, 2)}</div>
      ${shot('davinci 1.jpg', 'DaVinci Resolve, the Color page: the node tree and the scopes', 'DaVinci Resolve · Color page')}${shot('davinci 2.jpg', 'DaVinci Resolve, the grade of a TikTok', 'DaVinci Resolve · the grade')}</section>
    <section class="tk-side-block"><p class="tk-side-tag">05 / The edit</p>
      <h3>Cut in<br><span>Premiere Pro.</span></h3>
      <p>Every TikTok is cut in Adobe Premiere Pro on a vertical timeline: the rhythm of the cuts, punch-in zooms, sound effects and music, animated titles and burnt-in subtitles.</p>
      ${shot('premiere 1.jpg', 'Adobe Premiere Pro, the timeline of a TikTok', 'Premiere Pro · the timeline')}${shot('premiere 2.jpg', 'Adobe Premiere Pro, titles and subtitles', 'Premiere Pro · titles and subtitles')}</section>`;
  const sideL = document.createElement('aside'), sideR = document.createElement('aside');
  sideL.className = 'tk-side tk-side-l'; sideR.className = 'tk-side tk-side-r';
  sideL.setAttribute('aria-label', 'Making-of: why, the rushes, the kit'); sideR.setAttribute('aria-label', 'Making-of: the colour and the edit');
  sideL.innerHTML = left; sideR.innerHTML = right;
  root.append(sideL, sideR);
  const moClose = document.createElement('button'); moClose.type = 'button'; moClose.className = 'tk-mo-close'; moClose.setAttribute('aria-label', 'Close the making-of'); moClose.innerHTML = I.close; root.append(moClose);
  const rushes = [...root.querySelectorAll('.tk-rushes video')];
  const rushIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !root.hidden) { e.target.preload = 'auto'; e.target.play().catch(() => {}); } else e.target.pause(); }), { threshold: 0.3 });
  rushes.forEach(v => rushIO.observe(v));
  root.querySelector('.tk-mo-btn').addEventListener('click', () => { root.classList.add('mo-open'); if (current) current.querySelector('video').pause(); });
  moClose.addEventListener('click', () => { root.classList.remove('mo-open'); if (current && prof.hidden) current.querySelector('video').play().catch(() => {}); });

  const feed = root.querySelector('.tk-feed');
  const followed = () => store.get('follow', false);
  const slides = IDS.map((id, k) => {
    const liked = store.get('like.' + id, false), saved = store.get('save.' + id, false), comments = store.get('comments.' + id, []);
    const el = document.createElement('article');
    el.className = 'tk-slide'; el.dataset.id = id;
    el.setAttribute('aria-label', `BYCARLOS TikTok ${IDS.length - k} of ${IDS.length}`);
    el.innerHTML = `
      <video playsinline loop muted preload="${k < 2 ? 'auto' : 'none'}" poster="${MEDIA}posters/tiktok%20${id}.jpg" src="${MEDIA}tiktok%20${id}.mp4"></video>
      <div class="tk-paused" aria-hidden="true">${I.play}</div>
      <aside class="tk-rail">
        <div class="tk-ava"><img src="${avatar}" alt="@${HANDLE}"><button type="button" class="tk-follow ${followed() ? 'on' : ''}" aria-label="Follow @${HANDLE}">+</button></div>
        <button type="button" class="tk-like ${liked ? 'on' : ''}" aria-pressed="${liked}" aria-label="Like">${I.heart}<span>${fmt(liked ? 1 : 0)}</span></button>
        <button type="button" class="tk-comment" aria-label="Comments">${I.comment}<span>${fmt(comments.length)}</span></button>
        <button type="button" class="tk-save ${saved ? 'on' : ''}" aria-pressed="${saved}" aria-label="Save">${I.save}<span>${fmt(saved ? 1 : 0)}</span></button>
        <button type="button" class="tk-share-btn" aria-label="Share">${I.share}<span>Share</span></button>
        <div class="tk-disc" aria-hidden="true"><img src="${avatar}" alt=""></div>
      </aside>
      <div class="tk-meta">
        <p class="tk-user">@${HANDLE}</p>
        <p class="tk-cap">#bycarlos #fyp #edit · Episode ${IDS.length - k}</p>
        <p class="tk-music">${I.note}<span><span>original sound - ${HANDLE} · original sound - ${HANDLE} · </span></span></p>
      </div>
      <div class="tk-progress"><i></i></div>`;
    feed.append(el);
    return el;
  });

  // ── playback: the video on screen plays, the others pause; sound once the visitor asks for it
  let soundOn = false, current = null;
  const unmute = root.querySelector('.tk-unmute');
  const setSound = on => { soundOn = on; slides.forEach(s => { s.querySelector('video').muted = !on; }); unmute.hidden = on; };
  unmute.addEventListener('click', () => { setSound(true); if (current) current.querySelector('video').play().catch(() => {}); });
  unmute.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); unmute.click(); } });
  const activate = s => {
    if (current === s) return;
    if (current) { const v = current.querySelector('video'); v.pause(); }
    current = s;
    const i = slides.indexOf(s);
    slides.forEach((x, k) => { const v = x.querySelector('video'); if (Math.abs(k - i) <= 1 && v.preload === 'none') v.preload = 'auto'; });
    if (root.hidden) return;
    const v = s.querySelector('video'); v.muted = !soundOn; v.currentTime = 0;
    s.classList.remove('paused'); v.play().catch(err => { if (err && err.name === 'NotAllowedError' && prof.hidden) { v.muted = true; v.play().catch(() => {}); } });
  };
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && e.intersectionRatio > 0.6) activate(e.target); }), { root: feed, threshold: [0.6] });
  slides.forEach(s => io.observe(s));
  slides.forEach(s => {
    const v = s.querySelector('video'), bar = s.querySelector('.tk-progress i');
    v.addEventListener('timeupdate', () => { if (v.duration) bar.style.transform = `scaleX(${v.currentTime / v.duration})`; });
  });

  // ── tap: pause / play; double tap: like with a heart where the finger was
  const burst = root.querySelector('.tk-heart-burst');
  let lastTap = 0, tapTimer = 0;
  feed.addEventListener('click', e => {
    const s = e.target.closest('.tk-slide'); if (!s || e.target.closest('.tk-rail, .tk-meta')) return;
    const now = Date.now();
    if (now - lastTap < 280) {
      clearTimeout(tapTimer); lastTap = 0;
      like(s, true);
      const h = document.createElement('i'); h.innerHTML = I.heart; const r = root.getBoundingClientRect();
      h.style.left = (e.clientX - r.left) + 'px'; h.style.top = (e.clientY - r.top) + 'px'; h.style.setProperty('--r', (Math.random() * 40 - 20) + 'deg');
      burst.append(h); setTimeout(() => h.remove(), 900);
      return;
    }
    lastTap = now;
    tapTimer = setTimeout(() => {
      const v = s.querySelector('video');
      if (!soundOn) { setSound(true); v.play().catch(() => {}); s.classList.remove('paused'); return; }
      if (v.paused) { v.play().catch(() => {}); s.classList.remove('paused'); } else { v.pause(); s.classList.add('paused'); }
    }, 280);
  });

  // ── like, save, follow (kept on this device)
  const like = (s, onlyOn) => {
    const id = s.dataset.id, b = s.querySelector('.tk-like'), on = onlyOn ? true : !b.classList.contains('on');
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.querySelector('span').textContent = fmt(on ? 1 : 0);
    if (on) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
    store.set('like.' + id, on); profileStats();
  };
  const setFollow = on => { store.set('follow', on); root.querySelectorAll('.tk-follow').forEach(b => b.classList.toggle('on', on)); const big = root.querySelector('.tk-follow-big'); big.textContent = on ? 'Following' : 'Follow'; big.classList.toggle('on', on); profileStats(); };
  feed.addEventListener('click', e => {
    const s = e.target.closest('.tk-slide'); if (!s) return;
    if (e.target.closest('.tk-like')) like(s);
    else if (e.target.closest('.tk-save')) { const b = s.querySelector('.tk-save'), on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.querySelector('span').textContent = fmt(on ? 1 : 0); store.set('save.' + s.dataset.id, on); }
    else if (e.target.closest('.tk-follow')) setFollow(!followed());
    else if (e.target.closest('.tk-comment')) openComments(s);
    else if (e.target.closest('.tk-share-btn')) openShare(s);
    else if (e.target.closest('.tk-ava img, .tk-user')) openProfile();
  });

  // ── comments: a bottom sheet; a visitor's comments stay on their device
  const cSheet = root.querySelector('.tk-comments'), cList = cSheet.querySelector('.tk-c-list'), cForm = cSheet.querySelector('.tk-c-form'), cInput = cForm.querySelector('input');
  let cFor = null;
  const renderComments = () => {
    const list = store.get('comments.' + cFor.dataset.id, []);
    cSheet.querySelector('.tk-c-count').textContent = list.length + (list.length === 1 ? ' comment' : ' comments');
    cList.innerHTML = list.length ? list.map(c => `<li><img src="${avatar}" alt=""><div><b>You</b><p>${esc(c.t)}</p><time>${new Date(c.d).toLocaleDateString()}</time></div></li>`).join('') : '<li class="tk-c-empty">Be the first to comment.</li>';
    cFor.querySelector('.tk-comment span').textContent = fmt(list.length);
  };
  const openComments = s => { cFor = s; renderComments(); cSheet.hidden = false; setTimeout(() => cInput.focus(), 250); };
  cForm.addEventListener('submit', e => {
    e.preventDefault(); const t = cInput.value.trim(); if (!t || !cFor) return;
    const list = store.get('comments.' + cFor.dataset.id, []); list.push({ t, d: Date.now() }); store.set('comments.' + cFor.dataset.id, list);
    cInput.value = ''; renderComments(); cList.scrollTop = cList.scrollHeight;
  });

  // ── share: copy the link, or the system share sheet where there is one
  const sSheet = root.querySelector('.tk-share'), toast = sSheet.querySelector('.tk-toast');
  const openShare = () => { toast.textContent = ''; sSheet.hidden = false; };
  sSheet.addEventListener('click', async e => {
    const b = e.target.closest('[data-share]'); if (!b) return;
    const url = location.href.split('#')[0] + '#bycarlos';
    if (b.dataset.share === 'copy') { try { await navigator.clipboard.writeText(url); toast.textContent = 'Link copied'; } catch (err) { toast.textContent = url; } }
    else if (navigator.share) { navigator.share({ title: 'BYCARLOS on TikTok', url }).catch(() => {}); }
    else { toast.textContent = 'Sharing is not available here: the link is ' + url; }
  });
  root.querySelectorAll('.tk-sheet .tk-x').forEach(x => x.addEventListener('click', () => { x.closest('.tk-sheet').hidden = true; }));

  // ── profile: the grid of every video; a tap goes back to the feed on that video
  const prof = root.querySelector('.tk-profile'), grid = prof.querySelector('.tk-p-grid');
  grid.innerHTML = IDS.map(id => `<button type="button" data-id="${id}" aria-label="Open this video"><img src="${MEDIA}posters/tiktok%20${id}.jpg" alt="" loading="lazy"><span>${I.play}</span></button>`).join('');
  const profileStats = () => {
    prof.querySelector('.tk-p-followers').textContent = fmt(followed() ? 1 : 0);
    prof.querySelector('.tk-p-likes').textContent = fmt(IDS.filter(id => store.get('like.' + id, false)).length);
  };
  const openProfile = () => { profileStats(); prof.hidden = false; root.querySelectorAll('.tk-nav [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === 'profile')); if (current) current.querySelector('video').pause(); };
  const closeProfile = () => { prof.hidden = true; root.querySelectorAll('.tk-nav [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === 'home')); if (current) current.querySelector('video').play().catch(() => {}); };
  prof.querySelector('.tk-follow-big').addEventListener('click', () => setFollow(!followed()));
  grid.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (!b) return; closeProfile(); slides.find(s => s.dataset.id === b.dataset.id).scrollIntoView({ behavior: 'instant', block: 'start' }); });
  root.querySelector('.tk-nav').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; if (b.dataset.tab === 'profile') openProfile(); else closeProfile(); });
  setFollow(followed());

  // ── keyboard and the arrows on a computer: one video up or down
  const step = d => { const i = Math.max(0, Math.min(slides.length - 1, slides.indexOf(current) + d)); slides[i].scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  root.querySelector('.tk-arrows').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b) step(+b.dataset.d); });
  addEventListener('keydown', e => {
    if (root.hidden || e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
    else if (e.key === 'Escape') { root.querySelectorAll('.tk-sheet').forEach(x => { x.hidden = true; }); }
  });

  // ── when the page opens or closes (the site's hash routing)
  // ── the intro, each time the page opens (about 3 s): "ByCarlos" turns over with a soft halo moving behind it,
  //    gives way to the profile picture and @bycarlos, then fades out on the profile, already laid out underneath.
  //    CSS only (index.html, .tk-intro); with reduced motion, a plain fade.
  const intro = document.createElement('div');
  intro.className = 'tk-intro'; intro.setAttribute('aria-hidden', 'true');
  intro.innerHTML = `<i class="tk-intro-halo"></i><img class="tk-intro-logo" src="media/logo%20bycarlos%20blanc.png" alt=""><div class="tk-intro-me"><img src="${avatar}" alt=""><p>@${HANDLE}</p></div>`;
  root.append(intro);
  let wasOpen = false, introTimer = 0;
  const playIntro = () => {
    clearTimeout(introTimer);
    intro.classList.remove('run'); void intro.offsetWidth; intro.classList.add('run');
    introTimer = setTimeout(() => intro.classList.remove('run'), matchMedia('(prefers-reduced-motion: reduce)').matches ? 1300 : 3200);
  };
  const sync = () => {
    if (root.hidden) { wasOpen = false; clearTimeout(introTimer); intro.classList.remove('run'); slides.forEach(s => s.querySelector('video').pause()); document.documentElement.classList.remove('tk-open'); return; }
    if (!wasOpen) { wasOpen = true; playIntro(); }
    document.documentElement.classList.add('tk-open');
    // BYCARLOS opens on the account, as when you land on a TikTok profile; a video in the grid opens the feed
    const s = current || slides[0]; current = null; activate(s); openProfile();
  };
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['hidden'] });
  sync();
})();
