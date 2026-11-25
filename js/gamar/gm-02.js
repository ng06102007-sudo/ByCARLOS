// GAMAR GM-02: the data of its page (template: js/gamar-watch-page.js).
// Paths are inside "media /gamar/". An empty field or an empty list simply hides its block on the page.
(window.GAMAR_WATCHES = window.GAMAR_WATCHES || {})['gm-02'] = {
  name: 'GM-02',
  tagline: 'Forged carbon · skeleton dial',

  // 2. Presentation and inspiration: YOUR TEXT here (one paragraph per line of the list)
  intro: [
    // 'Write the presentation of the GM-02 here.',
  ],
  inspiration: [
    // 'Write what inspired the GM-02 here.',
  ],

  // 3. Research sketchbook
  sketchbook: [
    { img: 'gm-02/brut face.webp', kind: 'clay', note: 'The skeleton dial: bridges cut away down to the movement.',
      ref: 'The bridges branch like the veins of a dragonfly wing: thin frames around open cells.' },
    { img: 'gm-02/brut profil.jpg', kind: 'clay', note: 'Profile: a faceted carbon shell around a round steel frame.' },
    { img: 'gm-02/cadran 1 sans couleur.jpg', kind: 'study', note: 'The dial as geometry only.' },
    { img: 'gm-02/cadran 2 pre couleur.jpg', kind: 'study', note: 'First colours placed.' },
    { img: 'gm-02/cadran 3 couleur.jpg', kind: 'study', note: 'Final materials.' },
    { img: 'gm-02/carbone gamar.jpg', kind: 'study', note: 'The GAMAR forged carbon: turquoise, blue, black.' },
  ],

  // 4. The movement
  movement: {
    ref: 'Sellita SW210-1, skeletonised',
    detail: 'Swiss hand-wound base · 28,800 vibrations an hour · bridges cut away',
    reason: '',            // ← why this calibre (not documented yet)
    photos: [ { img: 'mouvement face.jpg', caption: 'Dial side' }, { img: 'mouvement dos.jpg', caption: 'Back: balance and rubies' } ],
    sound: '',             // ← a real recording of its tick-tock (missing)
  },

  // 5. First 3D renders, in the order they were made
  firstRenders: ['gm-02/test 6.jpg', 'gm-02/test 1.jpg', 'gm-02/test 4.jpg', 'gm-02/test 3.jpg', 'gm-02/test 2.jpg',
    'gm-02/cadran squelette.jpg', 'gm-02/test 5.jpg'],

  // 6. Grey model against the final render
  compare: { raw: 'gm-02/brut face.webp', final: 'trio/gm-02.webp' },

  // 7. Every final render, video and animation
  gallery: [
    { video: 'film reveal.mp4', poster: 'film reveal.jpg' }, { video: 'film macro.mp4', poster: 'film macro.jpg' },
    { img: 'trio/gm-02.webp' }, { img: 'gm-02/bleu face.jpg' }, { img: 'gm-02/bleu trois quarts.jpg' }, { img: 'gm-02/bleu dos.jpg' },
    { img: 'gm-02/coloris vert.jpg' }, { img: 'gm-02/coloris rose.jpg' }, { img: 'gm-02/coloris jaune.jpg' },
    { img: 'gm02 rose.jpg' }, { img: 'gm02 vert.jpg' }, { img: 'gm02 sarcelle.jpg' }, { img: 'gm02 jaune.jpg' },
    { img: 'gm02 dos.jpg' }, { img: 'gm02 trio.jpg' }, { img: 'gm02 profil.jpg' },
  ],
};
