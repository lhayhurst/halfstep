const CACHE_NAME = 'halfstep-v14';

const SAMPLE_NAMES = [
  'C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'
];

// Build sample paths for C3 (MIDI 48) to C5 (MIDI 72)
const SAMPLES = [];
for (let m = 48; m <= 72; m++) {
  const note = SAMPLE_NAMES[m % 12];
  const octave = Math.floor(m / 12) - 1;
  SAMPLES.push('./samples/' + note + octave + '.mp3');
}

const ASSETS = [
  './',
  './index.html',
  './scale-engine.js',
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
