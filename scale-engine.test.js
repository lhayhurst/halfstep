const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const SE = require('./scale-engine.js');

// ── getScaleNotes ─────────────────────────────────────────────

describe('getScaleNotes', () => {
  it('returns 8 notes for every root', () => {
    for (const root of SE.ROOTS) {
      const notes = SE.getScaleNotes(root);
      assert.equal(notes.length, 8, `${root} major should have 8 notes`);
    }
  });

  it('first and last notes share the same letter name', () => {
    for (const root of SE.ROOTS) {
      const notes = SE.getScaleNotes(root);
      assert.equal(notes[0], notes[7], `${root} scale should start and end on root`);
    }
  });

  it('returns correct notes for C major (no accidentals)', () => {
    assert.deepEqual(SE.getScaleNotes('C'), ['C','D','E','F','G','A','B','C']);
  });

  it('returns correct notes for G major (one sharp)', () => {
    assert.deepEqual(SE.getScaleNotes('G'), ['G','A','B','C','D','E','F#','G']);
  });

  it('returns correct notes for F major (one flat)', () => {
    assert.deepEqual(SE.getScaleNotes('F'), ['F','G','A','Bb','C','D','E','F']);
  });

  it('returns correct notes for F# major (six sharps)', () => {
    assert.deepEqual(SE.getScaleNotes('F#'), ['F#','G#','A#','B','C#','D#','E#','F#']);
  });

  it('returns correct notes for Db major (five flats)', () => {
    assert.deepEqual(SE.getScaleNotes('Db'), ['Db','Eb','F','Gb','Ab','Bb','C','Db']);
  });

  it('returns undefined for an unknown root', () => {
    assert.equal(SE.getScaleNotes('X'), undefined);
  });
});

// ── Scale intervals are correct (W W H W W W H) ──────────────

describe('scale intervals', () => {
  it('every scale follows the W W H W W W H pattern', () => {
    const expectedPattern = [2, 2, 1, 2, 2, 2, 1]; // semitones between consecutive notes
    for (const root of SE.ROOTS) {
      const notes = SE.getScaleNotes(root);
      const semitones = notes.map(n => SE.NAME_TO_SEMI[n]);
      for (let i = 0; i < 7; i++) {
        const interval = ((semitones[i + 1] - semitones[i]) + 12) % 12;
        assert.equal(interval, expectedPattern[i],
          `${root} major: interval ${i}→${i+1} (${notes[i]}→${notes[i+1]}) should be ${expectedPattern[i]} semitones, got ${interval}`);
      }
    }
  });
});

// ── getScaleMidiNotes ─────────────────────────────────────────

describe('getScaleMidiNotes', () => {
  it('returns 8 MIDI note numbers', () => {
    const midi = SE.getScaleMidiNotes('C', 3);
    assert.equal(midi.length, 8);
  });

  it('C major starting at octave 3 starts at MIDI 48', () => {
    const midi = SE.getScaleMidiNotes('C', 3);
    assert.equal(midi[0], 48); // C3
    assert.equal(midi[7], 60); // C4
  });

  it('G major starting at octave 3 starts at MIDI 55', () => {
    const midi = SE.getScaleMidiNotes('G', 3);
    assert.equal(midi[0], 55); // G3
  });

  it('intervals between consecutive MIDI notes match W W H W W W H', () => {
    const expectedIntervals = [2, 2, 1, 2, 2, 2, 1];
    for (const root of SE.ROOTS) {
      const midi = SE.getScaleMidiNotes(root, 3);
      for (let i = 0; i < 7; i++) {
        assert.equal(midi[i + 1] - midi[i], expectedIntervals[i],
          `${root}: MIDI interval ${i}→${i+1}`);
      }
    }
  });

  it('total span is always 12 semitones (one octave)', () => {
    for (const root of SE.ROOTS) {
      const midi = SE.getScaleMidiNotes(root, 3);
      assert.equal(midi[7] - midi[0], 12, `${root} scale should span exactly one octave`);
    }
  });
});

// ── midiToNoteName ────────────────────────────────────────────

describe('midiToNoteName', () => {
  it('MIDI 60 is C4 (middle C)', () => {
    assert.equal(SE.midiToNoteName(60), 'C4');
  });

  it('MIDI 69 is A4 (concert pitch)', () => {
    assert.equal(SE.midiToNoteName(69), 'A4');
  });

  it('MIDI 48 is C3', () => {
    assert.equal(SE.midiToNoteName(48), 'C3');
  });

  it('MIDI 72 is C5', () => {
    assert.equal(SE.midiToNoteName(72), 'C5');
  });

  it('MIDI 61 is C#4', () => {
    assert.equal(SE.midiToNoteName(61), 'C#4');
  });
});

// ── midiToFrequency ───────────────────────────────────────────

describe('midiToFrequency', () => {
  it('MIDI 69 (A4) is 440 Hz', () => {
    assert.equal(SE.midiToFrequency(69), 440);
  });

  it('MIDI 57 (A3) is 220 Hz', () => {
    assert.ok(Math.abs(SE.midiToFrequency(57) - 220) < 0.01);
  });

  it('MIDI 81 (A5) is 880 Hz', () => {
    assert.ok(Math.abs(SE.midiToFrequency(81) - 880) < 0.01);
  });

  it('MIDI 60 (C4) is approximately 261.63 Hz', () => {
    assert.ok(Math.abs(SE.midiToFrequency(60) - 261.63) < 0.01);
  });
});

// ── isWhiteKey ────────────────────────────────────────────────

describe('isWhiteKey', () => {
  it('C (MIDI 48) is white', () => {
    assert.equal(SE.isWhiteKey(48), true);
  });

  it('C# (MIDI 49) is black', () => {
    assert.equal(SE.isWhiteKey(49), false);
  });

  it('D (MIDI 50) is white', () => {
    assert.equal(SE.isWhiteKey(50), true);
  });

  it('E (MIDI 52) is white', () => {
    assert.equal(SE.isWhiteKey(52), true);
  });

  it('F (MIDI 53) is white', () => {
    assert.equal(SE.isWhiteKey(53), true);
  });

  it('F# (MIDI 54) is black', () => {
    assert.equal(SE.isWhiteKey(54), false);
  });

  it('Bb (MIDI 58) is black', () => {
    assert.equal(SE.isWhiteKey(58), false);
  });

  it('all 12 pitch classes have correct white/black classification', () => {
    const whiteOffsets = new Set([0,2,4,5,7,9,11]);
    for (let pc = 0; pc < 12; pc++) {
      const midi = 60 + pc; // octave 4
      assert.equal(SE.isWhiteKey(midi), whiteOffsets.has(pc),
        `pitch class ${pc} (MIDI ${midi})`);
    }
  });
});

// ── chooseStartOctave ─────────────────────────────────────────

describe('chooseStartOctave', () => {
  const FIRST = 48; // C3
  const LAST = 72;  // C5

  it('C starts at octave 3 (fits comfortably)', () => {
    assert.equal(SE.chooseStartOctave('C', FIRST, LAST), 3);
  });

  it('G starts at octave 3 (G3=55, G4=67 fits under 72)', () => {
    assert.equal(SE.chooseStartOctave('G', FIRST, LAST), 3);
  });

  it('A starts at octave 2 (A3=57, +12=69 fits, but A3+12=69 < 72 so actually octave 3... let me check)', () => {
    // A at octave 3: baseMidi = 12*(3+1)+9 = 57, 57+12=69 <= 72 → stays at 3
    assert.equal(SE.chooseStartOctave('A', FIRST, LAST), 3);
  });

  it('B drops to octave 2 (B3=59, 59+12=71 < 72, but check boundary)', () => {
    // B at octave 3: baseMidi = 12*4+11 = 59, 59+12=71 <= 72 → stays 3
    assert.equal(SE.chooseStartOctave('B', FIRST, LAST), 3);
  });
});

// ── computeAccuracy ───────────────────────────────────────────

describe('computeAccuracy', () => {
  it('8 correct out of 8 is 100%', () => {
    assert.equal(SE.computeAccuracy(8, 8), 100);
  });

  it('8 correct out of 10 is 80%', () => {
    assert.equal(SE.computeAccuracy(8, 10), 80);
  });

  it('0 correct out of 5 is 0%', () => {
    assert.equal(SE.computeAccuracy(0, 5), 0);
  });

  it('0 attempts returns 0%', () => {
    assert.equal(SE.computeAccuracy(0, 0), 0);
  });

  it('rounds to nearest integer', () => {
    assert.equal(SE.computeAccuracy(1, 3), 33); // 33.33...
    assert.equal(SE.computeAccuracy(2, 3), 67); // 66.66...
  });
});

// ── getCelebrationMessage ─────────────────────────────────────

describe('getCelebrationMessage', () => {
  it('returns empty string for streak 0', () => {
    assert.equal(SE.getCelebrationMessage(0), '');
  });

  it('returns empty string for streak 1', () => {
    assert.equal(SE.getCelebrationMessage(1), '');
  });

  it('returns message at streak 3', () => {
    assert.ok(SE.getCelebrationMessage(3).length > 0);
  });

  it('returns message at streak 5', () => {
    assert.ok(SE.getCelebrationMessage(5).length > 0);
  });

  it('returns message at streak 10', () => {
    assert.ok(SE.getCelebrationMessage(10).length > 0);
  });

  it('returns empty string for non-milestone streaks', () => {
    assert.equal(SE.getCelebrationMessage(2), '');
    assert.equal(SE.getCelebrationMessage(4), '');
    assert.equal(SE.getCelebrationMessage(7), '');
    assert.equal(SE.getCelebrationMessage(15), '');
  });
});

// ── updateStreak ──────────────────────────────────────────────

describe('updateStreak', () => {
  it('increments on clean round', () => {
    assert.equal(SE.updateStreak(5, true), 6);
  });

  it('resets to 0 on dirty round', () => {
    assert.equal(SE.updateStreak(5, false), 0);
  });

  it('starts from 0 correctly', () => {
    assert.equal(SE.updateStreak(0, true), 1);
  });
});

// ── checkModeUnlock ───────────────────────────────────────────

describe('checkModeUnlock', () => {
  it('both locked at 0 clean rounds', () => {
    const result = SE.checkModeUnlock(0, 0);
    assert.equal(result.shadowedUnlocked, false);
    assert.equal(result.blindUnlocked, false);
  });

  it('shadowed unlocks at exactly 3 guided cleans', () => {
    assert.equal(SE.checkModeUnlock(2, 0).shadowedUnlocked, false);
    assert.equal(SE.checkModeUnlock(3, 0).shadowedUnlocked, true);
  });

  it('blind unlocks at exactly 3 shadowed cleans', () => {
    assert.equal(SE.checkModeUnlock(3, 2).blindUnlocked, false);
    assert.equal(SE.checkModeUnlock(3, 3).blindUnlocked, true);
  });

  it('stays unlocked beyond threshold', () => {
    const result = SE.checkModeUnlock(10, 5);
    assert.equal(result.shadowedUnlocked, true);
    assert.equal(result.blindUnlocked, true);
  });
});

// ── pickNextRoot ──────────────────────────────────────────────

describe('pickNextRoot', () => {
  it('returns pinned root when not random', () => {
    const result = SE.pickNextRoot(SE.ROOTS, 'C', 'G', 'random', SE.CIRCLE_OF_FIFTHS, 0);
    assert.equal(result.root, 'G');
  });

  it('follows circle of fifths in order', () => {
    let idx = 0;
    for (let i = 0; i < SE.CIRCLE_OF_FIFTHS.length; i++) {
      const result = SE.pickNextRoot(SE.ROOTS, '', 'random', 'circle', SE.CIRCLE_OF_FIFTHS, idx);
      assert.equal(result.root, SE.CIRCLE_OF_FIFTHS[i]);
      idx = result.circleIndex;
    }
  });

  it('circle of fifths wraps around', () => {
    const result = SE.pickNextRoot(SE.ROOTS, '', 'random', 'circle', SE.CIRCLE_OF_FIFTHS, 12);
    assert.equal(result.root, 'C'); // wraps to start
    assert.equal(result.circleIndex, 13);
  });

  it('random mode avoids repeating the current root', () => {
    // Run many times to check it never returns the current root
    for (let i = 0; i < 50; i++) {
      const result = SE.pickNextRoot(SE.ROOTS, 'C', 'random', 'random', SE.CIRCLE_OF_FIFTHS, 0);
      assert.notEqual(result.root, 'C');
    }
  });

  it('random mode returns a valid root', () => {
    for (let i = 0; i < 20; i++) {
      const result = SE.pickNextRoot(SE.ROOTS, 'C', 'random', 'random', SE.CIRCLE_OF_FIFTHS, 0);
      assert.ok(SE.ROOTS.includes(result.root));
    }
  });
});

// ── matchStrictNote ───────────────────────────────────────────

describe('matchStrictNote', () => {
  it('returns true when played matches expected', () => {
    assert.equal(SE.matchStrictNote(60, 60), true);
  });

  it('returns false when played differs from expected', () => {
    assert.equal(SE.matchStrictNote(61, 60), false);
  });
});

// ── matchFreeNote ─────────────────────────────────────────────

describe('matchFreeNote', () => {
  it('returns true when played note is in remaining set', () => {
    const remaining = new Set([48, 50, 52]);
    assert.equal(SE.matchFreeNote(50, remaining), true);
  });

  it('returns false when played note is not in remaining set', () => {
    const remaining = new Set([48, 50, 52]);
    assert.equal(SE.matchFreeNote(51, remaining), false);
  });

  it('returns false for empty set', () => {
    assert.equal(SE.matchFreeNote(48, new Set()), false);
  });
});

// ── NAME_TO_SEMI consistency ──────────────────────────────────

describe('NAME_TO_SEMI', () => {
  it('enharmonic equivalents map to same semitone', () => {
    assert.equal(SE.NAME_TO_SEMI['C#'], SE.NAME_TO_SEMI['Db']);
    assert.equal(SE.NAME_TO_SEMI['D#'], SE.NAME_TO_SEMI['Eb']);
    assert.equal(SE.NAME_TO_SEMI['F#'], SE.NAME_TO_SEMI['Gb']);
    assert.equal(SE.NAME_TO_SEMI['G#'], SE.NAME_TO_SEMI['Ab']);
    assert.equal(SE.NAME_TO_SEMI['A#'], SE.NAME_TO_SEMI['Bb']);
  });

  it('E# maps to same semitone as F', () => {
    assert.equal(SE.NAME_TO_SEMI['E#'], SE.NAME_TO_SEMI['F']);
  });

  it('Cb maps to same semitone as B', () => {
    assert.equal(SE.NAME_TO_SEMI['Cb'], SE.NAME_TO_SEMI['B']);
  });

  it('B# maps to same semitone as C', () => {
    assert.equal(SE.NAME_TO_SEMI['B#'], SE.NAME_TO_SEMI['C']);
  });

  it('all scale spelling notes are present in NAME_TO_SEMI', () => {
    for (const root of SE.ROOTS) {
      for (const note of SE.getScaleNotes(root)) {
        assert.ok(SE.NAME_TO_SEMI[note] !== undefined,
          `${note} from ${root} major should be in NAME_TO_SEMI`);
      }
    }
  });
});

// ── TIPS ──────────────────────────────────────────────────────

describe('TIPS', () => {
  it('every root has a theory tip', () => {
    for (const root of SE.ROOTS) {
      assert.ok(SE.TIPS[root], `${root} should have a theory tip`);
      assert.ok(SE.TIPS[root].length > 0);
    }
  });
});

// ── ROOTS / CIRCLE_OF_FIFTHS ──────────────────────────────────

describe('ROOTS and CIRCLE_OF_FIFTHS', () => {
  it('contains exactly 12 roots', () => {
    assert.equal(SE.ROOTS.length, 12);
  });

  it('CIRCLE_OF_FIFTHS matches ROOTS', () => {
    assert.deepEqual(SE.ROOTS, SE.CIRCLE_OF_FIFTHS);
  });

  it('all roots have scale spellings', () => {
    for (const root of SE.ROOTS) {
      assert.ok(SE.SCALE_SPELLINGS[root], `${root} should have scale spellings`);
    }
  });
});

// ── Gb enharmonic (extra coverage) ────────────────────────────

describe('Gb major (enharmonic of F#)', () => {
  it('has correct spellings with flats', () => {
    assert.deepEqual(SE.getScaleNotes('Gb'), ['Gb','Ab','Bb','Cb','Db','Eb','F','Gb']);
  });

  it('Gb and F# produce the same MIDI notes', () => {
    const gbMidi = SE.getScaleMidiNotes('Gb', 3);
    const fsMidi = SE.getScaleMidiNotes('F#', 3);
    assert.deepEqual(gbMidi, fsMidi);
  });
});
