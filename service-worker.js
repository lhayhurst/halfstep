const CACHE_NAME = 'halfstep-v26';

const SAMPLE_NAMES = [
  'C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'
];

// Build sample paths for C2 (MIDI 36) to C6 (MIDI 84)
const SAMPLES = [];
for (let m = 36; m <= 84; m++) {
  const note = SAMPLE_NAMES[m % 12];
  const octave = Math.floor(m / 12) - 1;
  SAMPLES.push('./samples/' + note + octave + '.mp3');
}

const ASSETS = [
  './',
  './index.html',
  './scale-engine.js',
  './training-session.js',
  './melody-data.js',
  './melody-engine.js',
  './circle-walk.js',
  './jam-session.js',
  './chord-engine.js',
  './manifest.json',
  './service-worker.js',
  ...SAMPLES
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
