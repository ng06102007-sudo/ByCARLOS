// GAMAR GM-01 SM (Steel Matter): the data of its page (template: js/gamar-watch-page.js).
// Paths are inside "media /gamar/". An empty field or an empty list simply hides its block on the page.
(window.GAMAR_WATCHES = window.GAMAR_WATCHES || {})['gm-01-sm'] = {
  name: 'GM-01 SM',
  tagline: 'Steel Matter · Two made one',

  // 2. Presentation and inspiration: YOUR TEXT here (one paragraph per line of the list)
  intro: [
    // 'Write the presentation of the GM-01 SM here.',
  ],
  inspiration: [
    // 'Write what inspired the GM-01 SM here.',
  ],

  // 3. Research sketchbook
  sketchbook: [
    { img: 'gm-01-sm/brut face.webp', kind: 'clay', note: 'An octagon with soft lugs; four screws hold the bezel.' },
    { img: 'gm-01-sm/brut profil.jpg', kind: 'clay', note: 'Profile: a thin case, the strap tucked under the lugs.' },
    { img: 'gm-01-sm/controle brossage.jpg', kind: 'study', note: 'Check: vertical brushing on the case, polished bevels.' },
    { img: 'gm-01-sm/controle cornes.jpg', kind: 'study', note: 'Check: where the lugs meet the strap.' },
    { img: 'gm-01-sm/corne.jpg', kind: 'study', note: 'The polished edge of a lug.' },
    { img: 'gm-01-sm/texture tressage.jpg', kind: 'study', note: 'The canvas weave moulded into the rubber.' },
    { img: 'gm-01-sm/texture cadran grain.jpg', kind: 'study', note: 'The grain of the black dial.' },
  ],

  // 4. The movement
  movement: {
    ref: 'Sellita SW200-1',
    detail: 'Swiss automatic · 28,800 vibrations an hour',
    reason: '',            // ← why this calibre (not documented yet)
    photos: [ { img: 'gm-01-sm/mouvement dos.webp', caption: 'The SW200 from the back: gold rotor, balance, rubies' },
              { img: 'gm-01-sm/dos mouvement.jpg', caption: 'Seen through the caseback' } ],
    sound: '',             // ← a real recording of its tick-tock (missing)
  },

  // 5. First 3D renders, in the order they were made
  firstRenders: ['gm-01-sm/studio_v1.jpg', 'gm-01-sm/studio test.jpg', 'gm-01-sm/studio_v2.jpg', 'gm-01-sm/studio_v3.jpg',
    'gm-01-sm/studio_v4.jpg', 'gm-01-sm/studio_v5.jpg', 'gm-01-sm/studio_v6.jpg', 'gm-01-sm/studio_v7.jpg', 'gm-01-sm/studio_v8.jpg'],

  // 6. Grey model against the final render
  compare: { raw: 'gm-01-sm/brut face.webp', final: 'trio/gm-01-sm.webp' },

  // 7. Every final render, video and animation
  gallery: [
    { img: 'trio/gm-01-sm.webp' }, { img: 'sm face.jpg' }, { img: 'sm trois quarts.jpg' }, { img: 'sm dos.jpg' }, { img: 'sm finish.jpg' },
    { img: 'sm studio noir.jpg' }, { img: 'sm studio clair.jpg' }, { img: 'gm-01-sm/face finale.jpg' },
    { img: 'claude aiguilles_macro.jpg' }, { img: 'claude lume_chiffre.jpg' }, { img: 'claude index_macro.jpg' },
    { img: 'claude macro_lunette_v3.jpg' }, { img: 'claude brossage_macro.jpg' }, { img: 'claude bracelet_macro.jpg' },
    { img: 'claude apres_cadran.jpg' },
    // { video: '…' },   ← no video yet
  ],
};
