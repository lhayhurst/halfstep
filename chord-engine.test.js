const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const CE = require('./chord-engine.js');
const SE = require('./scale-engine.js');

// ── Chord theory ──────────────────────────────────────────────

describe('CHORD_TEMPLATES', () => {
  it('has major, minor, diminished triads', () => {
    assert.deepEqual(CE.CHORD_TEMPLATES.maj, [0, 4, 7]);
    assert.deepEqual(CE.CHORD_TEMPLATES.min, [0, 3, 7]);
    assert.deepEqual(CE.CHORD_TEMPLATES.dim, [0, 3, 6]);
  });
});

describe('DIATONIC_TRIADS', () => {
  it('has 7 triads', () => {
    assert.equal(CE.DIATONIC_TRIADS.length, 7);
  });

  it('I is major, ii is minor, vii is diminished', () => {
    assert.equal(CE.DIATONIC_TRIADS[0].quality, 'maj');
    assert.equal(CE.DIATONIC_TRIADS[1].quality, 'min');
    assert.equal(CE.DIATONIC_TRIADS[6].quality, 'dim');
  });
});

describe('resolveChordPCS', () => {
  it('C major in key of C = {0, 4, 7}', () => {
    const pcs = CE.resolveChordPCS('C', { degree: 1, quality: 'maj' });
    assert.deepEqual(pcs, new Set([0, 4, 7]));
  });

  it('F major (IV) in key of C = {5, 9, 0}', () => {
    const pcs = CE.resolveChordPCS('C', { degree: 4, quality: 'maj' });
    assert.deepEqual(pcs, new Set([5, 9, 0]));
  });

  it('Dm (ii) in key of C = {2, 5, 9}', () => {
    const pcs = CE.resolveChordPCS('C', { degree: 2, quality: 'min' });
    assert.deepEqual(pcs, new Set([2, 5, 9]));
  });

  it('Bdim (vii) in key of C = {11, 2, 5}', () => {
    const pcs = CE.resolveChordPCS('C', { degree: 7, quality: 'dim' });
    assert.deepEqual(pcs, new Set([11, 2, 5]));
  });

  it('works in key of G (has F#)', () => {
    // V in G = D major = {2, 6, 9}
    const pcs = CE.resolveChordPCS('G', { degree: 5, quality: 'maj' });
    assert.deepEqual(pcs, new Set([2, 6, 9]));
  });

  it('works in key of F (has Bb)', () => {
    // IV in F = Bb major = {10, 2, 5}
    const pcs = CE.resolveChordPCS('F', { degree: 4, quality: 'maj' });
    assert.deepEqual(pcs, new Set([10, 2, 5]));
  });
});

describe('chordDisplayName', () => {
  it('C major = "C"', () => {
    assert.equal(CE.chordDisplayName('C', { degree: 1, quality: 'maj' }), 'C');
  });

  it('Dm in C = "Dm"', () => {
    assert.equal(CE.chordDisplayName('C', { degree: 2, quality: 'min' }), 'Dm');
  });

  it('Bdim in C = "Bdim"', () => {
    assert.equal(CE.chordDisplayName('C', { degree: 7, quality: 'dim' }), 'Bdim');
  });

  it('F# in key of G (degree 7 = F#dim)', () => {
    assert.equal(CE.chordDisplayName('G', { degree: 7, quality: 'dim' }), 'F#dim');
  });
});

describe('identifyChord', () => {
  it('identifies C major from {0, 4, 7}', () => {
    const result = CE.identifyChord(new Set([0, 4, 7]));
    assert.ok(result);
    assert.equal(result.root, 'C');
    assert.equal(result.quality, 'maj');
  });

  it('identifies A minor from {9, 0, 4}', () => {
    const result = CE.identifyChord(new Set([9, 0, 4]));
    assert.ok(result);
    assert.equal(result.root, 'A');
    assert.equal(result.quality, 'min');
  });

  it('identifies B diminished from {11, 2, 5}', () => {
    const result = CE.identifyChord(new Set([11, 2, 5]));
    assert.ok(result);
    assert.equal(result.quality, 'dim');
  });

  it('returns null for unrecognized pitch class set', () => {
    const result = CE.identifyChord(new Set([0, 1, 2]));
    assert.equal(result, null);
  });

  it('returns null for fewer than 3 notes', () => {
    assert.equal(CE.identifyChord(new Set([0, 4])), null);
    assert.equal(CE.identifyChord(new Set([0])), null);
  });
});

describe('detectInversion', () => {
  it('root position when root is lowest', () => {
    assert.equal(CE.detectInversion([48, 52, 55], 0, 'maj'), 'root'); // C E G
  });

  it('1st inversion when 3rd is lowest', () => {
    assert.equal(CE.detectInversion([52, 55, 60], 0, 'maj'), '1st'); // E G C
  });

  it('2nd inversion when 5th is lowest', () => {
    assert.equal(CE.detectInversion([55, 60, 64], 0, 'maj'), '2nd'); // G C E
  });

  it('works for minor chords', () => {
    assert.equal(CE.detectInversion([50, 53, 57], 2, 'min'), 'root'); // D F A
    assert.equal(CE.detectInversion([53, 57, 62], 2, 'min'), '1st'); // F A D
  });
});

// ── Progressions library ──────────────────────────────────────

describe('PROGRESSIONS', () => {
  it('has at least 15 progressions', () => {
    assert.ok(CE.PROGRESSIONS.length >= 15);
  });

  it('all have id, name, chords array', () => {
    CE.PROGRESSIONS.forEach(p => {
      assert.ok(p.id, p.name + ' should have id');
      assert.ok(p.name, 'should have name');
      assert.ok(Array.isArray(p.chords) && p.chords.length > 0, p.id + ' should have chords');
    });
  });

  it('all chord specs have degree, quality, roman', () => {
    CE.PROGRESSIONS.forEach(p => {
      p.chords.forEach((c, i) => {
        assert.ok(c.degree >= 1 && c.degree <= 7, `${p.id} chord ${i} degree`);
        assert.ok(c.quality, `${p.id} chord ${i} quality`);
        assert.ok(c.roman, `${p.id} chord ${i} roman`);
      });
    });
  });

  it('getProgression returns by id', () => {
    const p = CE.getProgression('I-IV-V-I');
    assert.ok(p);
    assert.equal(p.chords.length, 4);
  });

  it('getProgression returns undefined for unknown', () => {
    assert.equal(CE.getProgression('nonexistent'), undefined);
  });
});

// ── State machine ─────────────────────────────────────────────

describe('createChordSession', () => {
  it('returns IDLE phase', () => {
    assert.equal(CE.createChordSession().phase, 'IDLE');
  });

  it('has empty heldNotes and journal', () => {
    const s = CE.createChordSession();
    assert.deepEqual(s.heldNotes, []);
    assert.deepEqual(s.journal, []);
  });
});

describe('startProgression', () => {
  it('transitions IDLE to PLAYING', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startProgression('I-IV-V-I', 'C', 1000));
    assert.equal(s.phase, 'PLAYING');
  });

  it('resolves all chords with PCS and display names', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startProgression('I-IV-V-I', 'C', 1000));
    assert.equal(s.progression.length, 4);
    assert.equal(s.progression[0].name, 'C');
    assert.deepEqual(s.progression[0].pcs, new Set([0, 4, 7]));
    assert.equal(s.progression[1].name, 'F');
  });

  it('sets currentIndex to 0', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startProgression('I-IV-V-I', 'C', 1000));
    assert.equal(s.currentIndex, 0);
  });
});

describe('noteOn / noteOff', () => {
  it('noteOn adds to heldNotes', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startProgression('I-IV-V-I', 'C', 1000));
    s = CE.transition(s, CE.actions.noteOn(60));
    assert.deepEqual(s.heldNotes, [60]);
    s = CE.transition(s, CE.actions.noteOn(64));
    assert.deepEqual(s.heldNotes, [60, 64]);
  });

  it('noteOff removes from heldNotes', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startProgression('I-IV-V-I', 'C', 1000));
    s = CE.transition(s, CE.actions.noteOn(60));
    s = CE.transition(s, CE.actions.noteOn(64));
    s = CE.transition(s, CE.actions.noteOff(60));
    assert.deepEqual(s.heldNotes, [64]);
  });

  it('noteOff for unheld note is safe', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startProgression('I-IV-V-I', 'C', 1000));
    s = CE.transition(s, CE.actions.noteOff(99));
    assert.deepEqual(s.heldNotes, []);
  });
});

describe('chord matching', () => {
  function startedSession(key) {
    let s = CE.createChordSession();
    return CE.transition(s, CE.actions.startProgression('I-IV-V-I', key || 'C', 1000));
  }

  it('matching all 3 notes triggers CHORD_COMPLETE', () => {
    let s = startedSession();
    s = CE.transition(s, CE.actions.noteOn(48)); // C
    s = CE.transition(s, CE.actions.noteOn(52)); // E
    assert.equal(s.phase, 'PLAYING'); // not yet
    s = CE.transition(s, CE.actions.noteOn(55)); // G
    assert.equal(s.phase, 'CHORD_COMPLETE');
  });

  it('accepts any octave', () => {
    let s = startedSession();
    s = CE.transition(s, CE.actions.noteOn(60)); // C4
    s = CE.transition(s, CE.actions.noteOn(64)); // E4
    s = CE.transition(s, CE.actions.noteOn(67)); // G4
    assert.equal(s.phase, 'CHORD_COMPLETE');
  });

  it('accepts inversions', () => {
    let s = startedSession();
    s = CE.transition(s, CE.actions.noteOn(52)); // E (1st inversion)
    s = CE.transition(s, CE.actions.noteOn(55)); // G
    s = CE.transition(s, CE.actions.noteOn(60)); // C
    assert.equal(s.phase, 'CHORD_COMPLETE');
  });

  it('accepts octave doublings', () => {
    let s = startedSession();
    s = CE.transition(s, CE.actions.noteOn(48)); // C3
    s = CE.transition(s, CE.actions.noteOn(52)); // E3
    s = CE.transition(s, CE.actions.noteOn(55)); // G3
    // Already matched, but adding C4 should not break anything
    assert.equal(s.phase, 'CHORD_COMPLETE');
  });

  it('wrong notes do not match', () => {
    let s = startedSession();
    s = CE.transition(s, CE.actions.noteOn(48)); // C
    s = CE.transition(s, CE.actions.noteOn(52)); // E
    s = CE.transition(s, CE.actions.noteOn(54)); // F# (wrong)
    assert.equal(s.phase, 'PLAYING');
  });

  it('records lastMatch with name and inversion', () => {
    let s = startedSession();
    s = CE.transition(s, CE.actions.noteOn(52)); // E (1st inv)
    s = CE.transition(s, CE.actions.noteOn(55)); // G
    s = CE.transition(s, CE.actions.noteOn(60)); // C
    assert.ok(s.lastMatch);
    assert.equal(s.lastMatch.name, 'C');
    assert.equal(s.lastMatch.inversion, '1st');
  });
});

describe('progression flow', () => {
  it('advance moves to next chord', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startProgression('I-IV-V-I', 'C', 1000));
    // Play C major
    s = CE.transition(s, CE.actions.noteOn(48));
    s = CE.transition(s, CE.actions.noteOn(52));
    s = CE.transition(s, CE.actions.noteOn(55));
    assert.equal(s.phase, 'CHORD_COMPLETE');
    assert.equal(s.currentIndex, 0);
    // Advance
    s = CE.transition(s, CE.actions.advance());
    assert.equal(s.phase, 'PLAYING');
    assert.equal(s.currentIndex, 1);
    assert.deepEqual(s.heldNotes, []); // cleared
  });

  it('last chord completes progression', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startProgression('ii-V-I', 'C', 1000));
    // ii = Dm
    s = CE.transition(s, CE.actions.noteOn(50)); // D
    s = CE.transition(s, CE.actions.noteOn(53)); // F
    s = CE.transition(s, CE.actions.noteOn(57)); // A
    s = CE.transition(s, CE.actions.advance());
    // V = G
    s = CE.transition(s, CE.actions.noteOn(55)); // G
    s = CE.transition(s, CE.actions.noteOn(59)); // B
    s = CE.transition(s, CE.actions.noteOn(62)); // D
    s = CE.transition(s, CE.actions.advance());
    // I = C
    s = CE.transition(s, CE.actions.noteOn(48)); // C
    s = CE.transition(s, CE.actions.noteOn(52)); // E
    s = CE.transition(s, CE.actions.noteOn(55)); // G
    // Last chord — should be PROGRESSION_COMPLETE
    assert.equal(s.phase, 'PROGRESSION_COMPLETE');
  });

  it('last chord sets currentIndex past the end on completion', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startProgression('ii-V-I', 'C', 1000));
    // Play all 3 chords
    s = CE.transition(s, CE.actions.noteOn(50));
    s = CE.transition(s, CE.actions.noteOn(53));
    s = CE.transition(s, CE.actions.noteOn(57));
    s = CE.transition(s, CE.actions.advance());
    s = CE.transition(s, CE.actions.noteOn(55));
    s = CE.transition(s, CE.actions.noteOn(59));
    s = CE.transition(s, CE.actions.noteOn(62));
    s = CE.transition(s, CE.actions.advance());
    s = CE.transition(s, CE.actions.noteOn(48));
    s = CE.transition(s, CE.actions.noteOn(52));
    s = CE.transition(s, CE.actions.noteOn(55));
    assert.equal(s.phase, 'PROGRESSION_COMPLETE');
    // currentIndex should be past the last chord so all cards render as 'done'
    assert.equal(s.currentIndex, 3); // length of progression
  });

  it('adds journal entry on completion', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startProgression('ii-V-I', 'C', 1000));
    s = CE.transition(s, CE.actions.noteOn(50));
    s = CE.transition(s, CE.actions.noteOn(53));
    s = CE.transition(s, CE.actions.noteOn(57));
    s = CE.transition(s, CE.actions.advance());
    s = CE.transition(s, CE.actions.noteOn(55));
    s = CE.transition(s, CE.actions.noteOn(59));
    s = CE.transition(s, CE.actions.noteOn(62));
    s = CE.transition(s, CE.actions.advance());
    s = CE.transition(s, CE.actions.noteOn(48));
    s = CE.transition(s, CE.actions.noteOn(52));
    s = CE.transition(s, CE.actions.noteOn(55));
    assert.equal(s.journal.length, 1);
    assert.equal(s.journal[0].progressionName, 'ii-V-I');
  });
});

describe('free chord mode', () => {
  it('transitions to FREE_CHORD', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startFreeChord());
    assert.equal(s.phase, 'FREE_CHORD');
  });

  it('identifies held chord', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startFreeChord());
    s = CE.transition(s, CE.actions.noteOn(60)); // C
    s = CE.transition(s, CE.actions.noteOn(64)); // E
    s = CE.transition(s, CE.actions.noteOn(67)); // G
    assert.ok(s.identifiedChord);
    assert.equal(s.identifiedChord.root, 'C');
    assert.equal(s.identifiedChord.quality, 'maj');
  });

  it('updates as notes change', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startFreeChord());
    s = CE.transition(s, CE.actions.noteOn(57)); // A
    s = CE.transition(s, CE.actions.noteOn(60)); // C
    s = CE.transition(s, CE.actions.noteOn(64)); // E
    assert.equal(s.identifiedChord.root, 'A');
    assert.equal(s.identifiedChord.quality, 'min');
  });

  it('clears identification when notes released', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startFreeChord());
    s = CE.transition(s, CE.actions.noteOn(60));
    s = CE.transition(s, CE.actions.noteOn(64));
    s = CE.transition(s, CE.actions.noteOn(67));
    s = CE.transition(s, CE.actions.noteOff(60));
    s = CE.transition(s, CE.actions.noteOff(64));
    s = CE.transition(s, CE.actions.noteOff(67));
    assert.equal(s.identifiedChord, null);
  });
});

describe('stop', () => {
  it('returns to IDLE', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startProgression('I-IV-V-I', 'C', 1000));
    s = CE.transition(s, CE.actions.stop());
    assert.equal(s.phase, 'IDLE');
  });

  it('clears heldNotes', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startProgression('I-IV-V-I', 'C', 1000));
    s = CE.transition(s, CE.actions.noteOn(60));
    s = CE.transition(s, CE.actions.stop());
    assert.deepEqual(s.heldNotes, []);
  });

  it('preserves journal', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startProgression('ii-V-I', 'C', 1000));
    // Complete the progression...
    s = CE.transition(s, CE.actions.noteOn(50));
    s = CE.transition(s, CE.actions.noteOn(53));
    s = CE.transition(s, CE.actions.noteOn(57));
    s = CE.transition(s, CE.actions.advance());
    s = CE.transition(s, CE.actions.noteOn(55));
    s = CE.transition(s, CE.actions.noteOn(59));
    s = CE.transition(s, CE.actions.noteOn(62));
    s = CE.transition(s, CE.actions.advance());
    s = CE.transition(s, CE.actions.noteOn(48));
    s = CE.transition(s, CE.actions.noteOn(52));
    s = CE.transition(s, CE.actions.noteOn(55));
    assert.equal(s.journal.length, 1);
    s = CE.transition(s, CE.actions.stop());
    assert.equal(s.journal.length, 1);
  });
});

// ── Inversion drill ───────────────────────────────────────────

describe('startInversionDrill', () => {
  it('transitions to INVERSION_DRILL phase', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startInversionDrill('C', { degree: 1, quality: 'maj', roman: 'I' }));
    assert.equal(s.phase, 'INVERSION_DRILL');
  });

  it('generates 3 steps: root, 1st, 2nd inversion', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startInversionDrill('C', { degree: 1, quality: 'maj', roman: 'I' }));
    assert.equal(s.inversionDrill.steps.length, 3);
    assert.equal(s.inversionDrill.steps[0].inversion, 'root');
    assert.equal(s.inversionDrill.steps[1].inversion, '1st');
    assert.equal(s.inversionDrill.steps[2].inversion, '2nd');
  });

  it('steps have correct expected bass note', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startInversionDrill('C', { degree: 1, quality: 'maj', roman: 'I' }));
    // C major: root=C(0), 3rd=E(4), 5th=G(7)
    assert.equal(s.inversionDrill.steps[0].bassPC, 0); // root position: C in bass
    assert.equal(s.inversionDrill.steps[1].bassPC, 4); // 1st inversion: E in bass
    assert.equal(s.inversionDrill.steps[2].bassPC, 7); // 2nd inversion: G in bass
  });

  it('starts at step 0', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startInversionDrill('C', { degree: 1, quality: 'maj', roman: 'I' }));
    assert.equal(s.inversionDrill.currentStep, 0);
  });

  it('stores chord name and PCS', () => {
    let s = CE.createChordSession();
    s = CE.transition(s, CE.actions.startInversionDrill('C', { degree: 1, quality: 'maj', roman: 'I' }));
    assert.equal(s.inversionDrill.chordName, 'C');
    assert.deepEqual(s.inversionDrill.pcs, new Set([0, 4, 7]));
  });
});

describe('inversion drill noteOn matching', () => {
  function drillSession(key, chordSpec) {
    let s = CE.createChordSession();
    return CE.transition(s, CE.actions.startInversionDrill(key || 'C', chordSpec || { degree: 1, quality: 'maj', roman: 'I' }));
  }

  it('correct PCS + correct bass = match, advance', () => {
    let s = drillSession();
    // Root position: C in bass (C3=48, E3=52, G3=55)
    s = CE.transition(s, CE.actions.noteOn(48));
    s = CE.transition(s, CE.actions.noteOn(52));
    s = CE.transition(s, CE.actions.noteOn(55));
    assert.equal(s.inversionDrill.currentStep, 1); // advanced
    assert.deepEqual(s.heldNotes, []); // cleared for next
  });

  it('correct PCS but wrong bass = no match', () => {
    let s = drillSession();
    // 1st inversion played when root expected: E in bass
    s = CE.transition(s, CE.actions.noteOn(52)); // E (lowest)
    s = CE.transition(s, CE.actions.noteOn(55)); // G
    s = CE.transition(s, CE.actions.noteOn(60)); // C
    assert.equal(s.inversionDrill.currentStep, 0); // NOT advanced
    assert.equal(s.inversionDrill.wrongInversion, true);
  });

  it('completing all 3 inversions finishes drill', () => {
    let s = drillSession();
    // Root: C E G
    s = CE.transition(s, CE.actions.noteOn(48));
    s = CE.transition(s, CE.actions.noteOn(52));
    s = CE.transition(s, CE.actions.noteOn(55));
    // 1st: E G C
    s = CE.transition(s, CE.actions.noteOn(52));
    s = CE.transition(s, CE.actions.noteOn(55));
    s = CE.transition(s, CE.actions.noteOn(60));
    // 2nd: G C E
    s = CE.transition(s, CE.actions.noteOn(55));
    s = CE.transition(s, CE.actions.noteOn(60));
    s = CE.transition(s, CE.actions.noteOn(64));
    assert.equal(s.phase, 'INVERSION_COMPLETE');
  });

  it('adds journal entry on completion', () => {
    let s = drillSession();
    s = CE.transition(s, CE.actions.noteOn(48));
    s = CE.transition(s, CE.actions.noteOn(52));
    s = CE.transition(s, CE.actions.noteOn(55));
    s = CE.transition(s, CE.actions.noteOn(52));
    s = CE.transition(s, CE.actions.noteOn(55));
    s = CE.transition(s, CE.actions.noteOn(60));
    s = CE.transition(s, CE.actions.noteOn(55));
    s = CE.transition(s, CE.actions.noteOn(60));
    s = CE.transition(s, CE.actions.noteOn(64));
    assert.equal(s.phase, 'INVERSION_COMPLETE');
    assert.equal(s.journal.length, 1);
    assert.equal(s.journal[0].chordName, 'C');
    assert.equal(s.journal[0].type, 'inversion');
  });

  it('works for minor chords', () => {
    // Dm: D=2, F=5, A=9
    let s = drillSession('C', { degree: 2, quality: 'min', roman: 'ii' });
    assert.equal(s.inversionDrill.steps[0].bassPC, 2); // D
    assert.equal(s.inversionDrill.steps[1].bassPC, 5); // F
    assert.equal(s.inversionDrill.steps[2].bassPC, 9); // A
  });
});
