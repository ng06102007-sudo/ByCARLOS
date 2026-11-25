// GAMAR GM-01: the data of its page (the page itself is drawn by js/gamar-watch-page.js, the same template for every watch).
// Paths are inside "media /gamar/". An empty field or an empty list simply hides its block on the page.
(window.GAMAR_WATCHES = window.GAMAR_WATCHES || {})['gm-01'] = {
  name: 'GM-01',
  tagline: 'Steel · blue dial · integrated bracelet',

  // 2. Presentation and inspiration: YOUR TEXT here (one paragraph per line of the list)
  intro: [
    // 'Write the presentation of the GM-01 here.',
  ],
  inspiration: [
    // 'Write what inspired the GM-01 here.',
  ],

  // 3. Research sketchbook: sketches, matt grey 3D views, curve studies, short notes; `ref` = a short comparison
  sketchbook: [
    { img: 'gm-01/cadran dessin 1.jpg', kind: 'sketch', note: 'First layout of the dial: twelve batons, the date at six.' },
    { img: 'gm-01/cadran dessin 2.jpg', kind: 'sketch', note: 'The minute track moves to the flange; the logo under twelve.' },
    { img: 'gm-01/cadran degrade.jpg', kind: 'study', note: 'Gradient map: the blue darkens towards the edge.' },
    { img: 'gm-01/brut face.webp', kind: 'clay', note: 'The faceted bezel, eight flats over a round case.',
      ref: 'Like the octagonal bezel of the Audemars Piguet Royal Oak (Gérald Genta, 1972), here made of eight unequal facets.' },
    { img: 'gm-01/brut profil.jpg', kind: 'clay', note: 'Profile: the bracelet flows out of the case without a lug.',
      ref: 'The integrated bracelet, a family trait of 1970s sports watches.' },
    // { img: 'gm-01/courbes.jpg', kind: 'curves', note: '…' },   ← curve studies: none yet
  ],

  // 4. The movement
  movement: {
    ref: 'Sellita SW300-1',
    detail: 'Swiss automatic · 28,800 vibrations an hour · date',
    reason: '',            // ← why this calibre (not documented yet)
    photos: [ { img: 'gm-01/mouvement dos.webp', caption: 'The SW300 from the back, with its oscillating weight' } ],
    sound: '',             // ← a real recording of its tick-tock, e.g. 'son/sw300.m4a' (missing)
  },

  // 5. First 3D renders, in the order they were made
  firstRenders: ['gm-01/test 4.jpg', 'gm-01/test 5.jpg', 'gm-01/test 2.jpg', 'gm-01/test 1.jpg', 'gm-01/test 3.jpg',
    'gm-01/rendu brut dos.jpg', 'gm-01/test 6.jpg', 'gm-01/test 7.jpg', 'gm-01/pre rendu.jpg'],

  // 6. Grey model against the final render: same angle, same framing
  compare: { raw: 'gm-01/brut face.webp', final: 'trio/gm-01.webp' },

  // 7. Every final render, video and animation
  gallery: [
    { img: 'trio/gm-01.webp' }, { img: 'gm01 face.jpg' }, { img: 'gm01 trois quarts.jpg' }, { img: 'gm01 trois quarts 2.jpg' },
    { img: 'gm01 profil.jpg' }, { img: 'gm01 dos.jpg' }, { img: 'gm01 cadran.jpg' }, { img: 'gm01 macro.jpg' },
    { img: 'gm-01/rendu 1.jpg' }, { img: 'gm-01/rendu 2.jpg' }, { img: 'gm-01/rendu 3.jpg' }, { img: 'gm-01/rendu 4.jpg' },
    { img: 'gm-01/rendu 5.jpg' }, { img: 'gm-01/rendu final dos.jpg' }, { img: 'gm-01/cadran rendu.jpg' }, { img: 'gm01 coming soon.jpg' },
    // { video: 'gm-01/film.mp4', poster: 'gm-01/film.jpg' },   ← no video yet
  ],
};
