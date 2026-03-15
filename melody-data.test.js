const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const MD = require('./melody-data.js');
const SE = require('./scale-engine.js');

// ── validateMelody ────────────────────────────────────────────

describe('validateMelody', () => {
  it('accepts a well-formed melody', () => {
    assert.equal(MD.validateMelody({
      id: 'test', name: 'Test', source: 'Test', key: 'C',
      difficulty: 1, bpm: 120, notes: [[1, 1], [2, 1], [3, 1]],
    }), true);
  });

  it('rejects melody missing id', () => {
    assert.equal(MD.validateMelody({
      name: 'Test', source: 'Test', key: 'C',
      difficulty: 1, bpm: 120, notes: [[1, 1]],
    }), false);
  });

  it('rejects melody with empty notes', () => {
    assert.equal(MD.validateMelody({
      id: 'test', name: 'Test', source: 'Test', key: 'C',
      difficulty: 1, bpm: 120, notes: [],
    }), false);
  });

  it('rejects melody with invalid scale degree (0 or 8+)', () => {
    assert.equal(MD.validateMelody({
      id: 'test', name: 'Test', source: 'Test', key: 'C',
      difficulty: 1, bpm: 120, notes: [[0, 1], [8, 1]],
    }), false);
  });

  it('rejects melody with invalid duration', () => {
    assert.equal(MD.validateMelody({
      id: 'test', name: 'Test', source: 'Test', key: 'C',
      difficulty: 1, bpm: 120, notes: [[1, 0], [2, -1]],
    }), false);
  });

  it('rejects non-object input', () => {
    assert.equal(MD.validateMelody(null), false);
    assert.equal(MD.validateMelody('hello'), false);
  });
});

// ── resolveMelodyToMidi ───────────────────────────────────────

describe('resolveMelodyToMidi', () => {
  it('resolves scale degrees to MIDI in key of C, octave 4', () => {
    const melody = {
      id: 'test', name: 'Test', source: 'Test', key: 'C',
      difficulty: 1, bpm: 120, notes: [[1, 1], [2, 1], [3, 1]],
    };
    const resolved = MD.resolveMelodyToMidi(melody, 'C', 4);
    assert.equal(resolved[0].midi, 60); // C4
    assert.equal(resolved[1].midi, 62); // D4
    assert.equal(resolved[2].midi, 64); // E4
  });

  it('resolves in key of G with correct sharps', () => {
    const melody = {
      id: 'test', name: 'Test', source: 'Test', key: 'C',
      difficulty: 1, bpm: 120, notes: [[1, 1], [7, 1]],
    };
    const resolved = MD.resolveMelodyToMidi(melody, 'G', 3);
    assert.equal(resolved[0].midi, 55); // G3
    assert.equal(resolved[1].midi, 66); // F#4
  });

  it('includes scale degree and label for each note', () => {
    const melody = {
      id: 'test', name: 'Test', source: 'Test', key: 'C',
      difficulty: 1, bpm: 120, notes: [[1, 1], [3, 1]],
    };
    const resolved = MD.resolveMelodyToMidi(melody, 'C', 4);
    assert.equal(resolved[0].degree, 1);
    assert.equal(resolved[0].label, 'C');
    assert.equal(resolved[1].degree, 3);
    assert.equal(resolved[1].label, 'E');
  });

  it('computes beatTimeMs from BPM and cumulative durations', () => {
    const melody = {
      id: 'test', name: 'Test', source: 'Test', key: 'C',
      difficulty: 1, bpm: 120, // 1 beat = 500ms
      notes: [[1, 1], [2, 1], [3, 2]], // quarter, quarter, half
    };
    const resolved = MD.resolveMelodyToMidi(melody, 'C', 4);
    assert.equal(resolved[0].beatTimeMs, 0);
    assert.equal(resolved[1].beatTimeMs, 500);   // after 1 beat
    assert.equal(resolved[2].beatTimeMs, 1000);   // after 2 beats
  });

  it('handles dotted rhythms', () => {
    const melody = {
      id: 'test', name: 'Test', source: 'Test', key: 'C',
      difficulty: 1, bpm: 60, // 1 beat = 1000ms
      notes: [[1, 1.5], [2, 0.5]],
    };
    const resolved = MD.resolveMelodyToMidi(melody, 'C', 4);
    assert.equal(resolved[0].beatTimeMs, 0);
    assert.equal(resolved[1].beatTimeMs, 1500);
  });

  it('handles degree 8 as octave (same as 1 but one octave up)', () => {
    const melody = {
      id: 'test', name: 'Test', source: 'Test', key: 'C',
      difficulty: 1, bpm: 120, notes: [[1, 1], [8, 1]],
    };
    const resolved = MD.resolveMelodyToMidi(melody, 'C', 4);
    assert.equal(resolved[0].midi, 60); // C4
    assert.equal(resolved[1].midi, 72); // C5
  });
});

// ── getMelody ─────────────────────────────────────────────────

describe('getMelody', () => {
  it('returns a melody by id', () => {
    const m = MD.getMelody('ode-to-joy');
    assert.ok(m);
    assert.equal(m.id, 'ode-to-joy');
    assert.equal(m.name, 'Ode to Joy');
  });

  it('returns undefined for unknown id', () => {
    assert.equal(MD.getMelody('nonexistent'), undefined);
  });
});

// ── getMelodiesByDifficulty ───────────────────────────────────

describe('getMelodiesByDifficulty', () => {
  it('returns only melodies matching difficulty', () => {
    const easy = MD.getMelodiesByDifficulty(1);
    assert.ok(easy.length > 0);
    easy.forEach(m => assert.equal(m.difficulty, 1));
  });

  it('returns empty array for unused difficulty', () => {
    const none = MD.getMelodiesByDifficulty(99);
    assert.deepEqual(none, []);
  });
});

// ── MELODIES library ──────────────────────────────────────────

describe('MELODIES library', () => {
  it('has at least 5 melodies', () => {
    assert.ok(MD.MELODIES.length >= 5);
  });

  it('all melodies pass validation', () => {
    MD.MELODIES.forEach(m => {
      assert.ok(MD.validateMelody(m), `${m.id} should be valid`);
    });
  });

  it('all melodies have unique ids', () => {
    const ids = MD.MELODIES.map(m => m.id);
    assert.equal(ids.length, new Set(ids).size);
  });

  it('all melodies resolve without error in key of C', () => {
    MD.MELODIES.forEach(m => {
      const resolved = MD.resolveMelodyToMidi(m, 'C', 4);
      assert.ok(resolved.length > 0, `${m.id} should resolve to notes`);
      resolved.forEach(n => {
        assert.ok(n.midi >= 0 && n.midi <= 127, `${m.id} MIDI note ${n.midi} out of range`);
        assert.ok(n.beatTimeMs >= 0, `${m.id} beatTimeMs should be >= 0`);
      });
    });
  });
});
