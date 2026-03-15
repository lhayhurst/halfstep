// ── Melody Data ───────────────────────────────────────────────
// Melody library and resolution utilities.
// Melodies are encoded as scale degree sequences so they work in any key.

var MelodyData = (function() {
  var SE = (typeof ScaleEngine !== 'undefined') ? ScaleEngine : require('./scale-engine.js');

  function validateMelody(melody) {
    if (!melody || typeof melody !== 'object') return false;
    if (!melody.id || !melody.name || !melody.source) return false;
    if (!melody.bpm || melody.bpm <= 0) return false;
    if (!Array.isArray(melody.notes) || melody.notes.length === 0) return false;
    if (typeof melody.difficulty !== 'number') return false;
    for (var i = 0; i < melody.notes.length; i++) {
      var note = melody.notes[i];
      if (!Array.isArray(note) || note.length !== 2) return false;
      if (note[0] < 1 || note[0] > 8) return false;
      if (note[1] <= 0) return false;
    }
    return true;
  }

  function resolveMelodyToMidi(melody, key, octave) {
    var scaleNotes = SE.getScaleNotes(key);
    var scaleMidi = SE.getScaleMidiNotes(key, octave);
    var msPerBeat = 60000 / melody.bpm;
    var cumulativeBeats = 0;
    return melody.notes.map(function(n) {
      var degree = n[0], duration = n[1];
      var idx = degree - 1;
      var midi = scaleMidi[idx];
      var label = scaleNotes[idx];
      var beatTimeMs = Math.round(cumulativeBeats * msPerBeat);
      cumulativeBeats += duration;
      return { midi: midi, degree: degree, label: label, beatTimeMs: beatTimeMs, duration: duration };
    });
  }

  function getMelody(id) {
    return MELODIES.find(function(m) { return m.id === id; });
  }

  function getMelodiesByDifficulty(level) {
    return MELODIES.filter(function(m) { return m.difficulty === level; });
  }

  var MELODIES = [
    {
      id: 'mary-had-a-little-lamb', name: 'Mary Had a Little Lamb', source: 'Traditional',
      key: 'C', difficulty: 1, bpm: 110,
      notes: [
        [3,1],[2,1],[1,1],[2,1],[3,1],[3,1],[3,2],
        [2,1],[2,1],[2,2],[3,1],[5,1],[5,2],
        [3,1],[2,1],[1,1],[2,1],[3,1],[3,1],[3,1],[3,1],
        [2,1],[2,1],[3,1],[2,1],[1,2],
      ],
    },
    {
      id: 'twinkle-twinkle', name: 'Twinkle Twinkle Little Star', source: 'Traditional',
      key: 'C', difficulty: 1, bpm: 100,
      notes: [
        [1,1],[1,1],[5,1],[5,1],[6,1],[6,1],[5,2],
        [4,1],[4,1],[3,1],[3,1],[2,1],[2,1],[1,2],
        [5,1],[5,1],[4,1],[4,1],[3,1],[3,1],[2,2],
        [5,1],[5,1],[4,1],[4,1],[3,1],[3,1],[2,2],
        [1,1],[1,1],[5,1],[5,1],[6,1],[6,1],[5,2],
        [4,1],[4,1],[3,1],[3,1],[2,1],[2,1],[1,2],
      ],
    },
    {
      id: 'ode-to-joy', name: 'Ode to Joy', source: 'Beethoven',
      key: 'C', difficulty: 1, bpm: 108,
      notes: [
        [3,1],[3,1],[4,1],[5,1],[5,1],[4,1],[3,1],[2,1],
        [1,1],[1,1],[2,1],[3,1],[3,1.5],[2,0.5],[2,2],
        [3,1],[3,1],[4,1],[5,1],[5,1],[4,1],[3,1],[2,1],
        [1,1],[1,1],[2,1],[3,1],[2,1.5],[1,0.5],[1,2],
      ],
    },
    {
      id: 'happy-birthday', name: 'Happy Birthday', source: 'Traditional',
      key: 'C', difficulty: 2, bpm: 100,
      notes: [
        [5,0.75],[5,0.25],[6,1],[5,1],[1,1],[7,2],
        [5,0.75],[5,0.25],[6,1],[5,1],[2,1],[1,2],
        [5,0.75],[5,0.25],[5,1],[3,1],[1,1],[7,1],[6,1],
        [4,0.75],[4,0.25],[3,1],[1,1],[2,1],[1,2],
      ],
    },
    {
      id: 'fur-elise', name: 'F\u00FCr Elise (theme)', source: 'Beethoven',
      key: 'C', difficulty: 2, bpm: 130,
      notes: [
        [3,0.5],[2,0.5],[3,0.5],[2,0.5],[3,0.5],[7,0.5],[2,0.5],[1,0.5],
        [6,1.5],[1,0.5],[3,0.5],[6,0.5],
        [7,1.5],[3,0.5],[2,0.5],[7,0.5],
        [1,1.5],[3,0.5],[2,0.5],[3,0.5],
        [2,0.5],[3,0.5],[7,0.5],[2,0.5],[1,0.5],
        [6,1.5],
      ],
    },
    {
      id: 'when-the-saints', name: 'When the Saints Go Marching In', source: 'Traditional',
      key: 'C', difficulty: 1, bpm: 116,
      notes: [
        [1,1],[3,1],[4,1],[5,4],
        [1,1],[3,1],[4,1],[5,4],
        [1,1],[3,1],[4,1],[5,2],[3,2],
        [1,2],[3,2],[2,4],
        [3,1],[3,1],[2,1],[1,2],[1,1],[3,1],
        [5,2],[5,2],[4,2],
        [3,2],[4,1],[5,2],[3,2],
        [1,2],[2,2],[1,4],
      ],
    },
  ];

  return {
    MELODIES: MELODIES, validateMelody: validateMelody,
    resolveMelodyToMidi: resolveMelodyToMidi, getMelody: getMelody,
    getMelodiesByDifficulty: getMelodiesByDifficulty,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MelodyData;
}
