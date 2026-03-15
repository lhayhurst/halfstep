// ── Scale Engine ──────────────────────────────────────────────
// Pure domain logic for major scale generation, note matching, and scoring.
// No DOM, no side effects — fully testable.

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

const SCALE_SPELLINGS = {
  'C':  ['C','D','E','F','G','A','B','C'],
  'G':  ['G','A','B','C','D','E','F#','G'],
  'D':  ['D','E','F#','G','A','B','C#','D'],
  'A':  ['A','B','C#','D','E','F#','G#','A'],
  'E':  ['E','F#','G#','A','B','C#','D#','E'],
  'B':  ['B','C#','D#','E','F#','G#','A#','B'],
  'F#': ['F#','G#','A#','B','C#','D#','E#','F#'],
  'Gb': ['Gb','Ab','Bb','Cb','Db','Eb','F','Gb'],
  'F':  ['F','G','A','Bb','C','D','E','F'],
  'Bb': ['Bb','C','D','Eb','F','G','A','Bb'],
  'Eb': ['Eb','F','G','Ab','Bb','C','D','Eb'],
  'Ab': ['Ab','Bb','C','Db','Eb','F','G','Ab'],
  'Db': ['Db','Eb','F','Gb','Ab','Bb','C','Db'],
};

const ROOTS = ['C','G','D','A','E','B','F#','F','Bb','Eb','Ab','Db'];
const CIRCLE_OF_FIFTHS = ['C','G','D','A','E','B','F#','F','Bb','Eb','Ab','Db'];

const NAME_TO_SEMI = {
  'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'E#':5,'Fb':4,
  'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,
  'B':11,'B#':0,'Cb':11
};

const MAJOR_INTERVALS = [0,2,4,5,7,9,11,12];

const TIPS = {
  'C':  'The all-natural scale \u2014 no sharps or flats.',
  'G':  'Watch out for F# \u2014 your 7\u21928 half step needs a sharp.',
  'D':  'Two sharps: F# and C#.',
  'A':  'Three sharps: F#, C#, and G#.',
  'E':  'Four sharps: F#, C#, G#, and D#.',
  'B':  'Five sharps: F#, C#, G#, D#, and A#.',
  'F#': 'Six sharps \u2014 every note is sharp except B and E (well, E# = F).',
  'F':  'One flat: Bb. The only major scale with a single flat.',
  'Bb': 'Two flats: Bb and Eb.',
  'Eb': 'Three flats: Bb, Eb, and Ab.',
  'Ab': 'Four flats: Ab, Bb, Db, and Eb.',
  'Db': 'Five flats: Db, Eb, Gb, Ab, and Bb.',
};

function getScaleNotes(root) {
  return SCALE_SPELLINGS[root];
}

function getScaleMidiNotes(root, startOctave) {
  const rootSemi = NAME_TO_SEMI[root];
  const baseMidi = 12 * (startOctave + 1) + rootSemi;
  return MAJOR_INTERVALS.map(i => baseMidi + i);
}

function midiToNoteName(midi) {
  return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
}

function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function isWhiteKey(midi) {
  return [0,2,4,5,7,9,11].includes(midi % 12);
}

function chooseStartOctave(root, firstMidi, lastMidi) {
  let startOctave = 3;
  const rootSemi = NAME_TO_SEMI[root];
  const baseMidi = 12 * (startOctave + 1) + rootSemi;
  if (baseMidi + 12 > lastMidi) startOctave = 2;
  const adjBase = 12 * (startOctave + 1) + rootSemi;
  if (adjBase < firstMidi) startOctave = 3;
  return startOctave;
}

function computeAccuracy(correctCount, totalAttempts) {
  if (totalAttempts === 0) return 0;
  return Math.round((correctCount / totalAttempts) * 100);
}

function getCelebrationMessage(streak) {
  if (streak === 3) return 'Nice! 3 in a row!';
  if (streak === 5) return 'On fire! 5 streak!';
  if (streak === 10) return 'Unstoppable! 10 streak!';
  return '';
}

function updateStreak(currentStreak, roundClean) {
  return roundClean ? currentStreak + 1 : 0;
}

function checkModeUnlock(guidedClean, shadowedClean) {
  return {
    shadowedUnlocked: guidedClean >= 3,
    blindUnlocked: shadowedClean >= 3,
  };
}

function pickNextRoot(roots, currentRoot, pinnedRoot, orderMode, circleOfFifths, circleIndex) {
  if (pinnedRoot !== 'random') return { root: pinnedRoot, circleIndex };

  if (orderMode === 'circle') {
    const root = circleOfFifths[circleIndex % circleOfFifths.length];
    return { root, circleIndex: circleIndex + 1 };
  }

  let r;
  do {
    r = roots[Math.floor(Math.random() * roots.length)];
  } while (r === currentRoot && roots.length > 1);
  return { root: r, circleIndex };
}

function matchStrictNote(playedMidi, expectedMidi) {
  return playedMidi === expectedMidi;
}

function matchFreeNote(playedMidi, remainingMidiSet) {
  return remainingMidiSet.has(playedMidi);
}

// ── Exports (Node.js) / globals (browser) ─────────────────────
const ScaleEngine = {
  NOTE_NAMES,
  SCALE_SPELLINGS,
  ROOTS,
  CIRCLE_OF_FIFTHS,
  NAME_TO_SEMI,
  MAJOR_INTERVALS,
  TIPS,
  getScaleNotes,
  getScaleMidiNotes,
  midiToNoteName,
  midiToFrequency,
  isWhiteKey,
  chooseStartOctave,
  computeAccuracy,
  getCelebrationMessage,
  updateStreak,
  checkModeUnlock,
  pickNextRoot,
  matchStrictNote,
  matchFreeNote,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScaleEngine;
}
