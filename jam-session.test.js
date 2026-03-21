const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const JS = require('./jam-session.js');
const SE = require('./scale-engine.js');

// ── createJam ─────────────────────────────────────────────────

describe('createJam', () => {
  it('returns IDLE phase', () => {
    assert.equal(JS.createJam().phase, 'IDLE');
  });

  it('has zero score and empty stats', () => {
    const j = JS.createJam();
    assert.equal(j.score, 0);
    assert.equal(j.notesPlayed, 0);
    assert.equal(j.inKeyCount, 0);
    assert.equal(j.outOfKeyCount, 0);
  });
});

// ── startJam ──────────────────────────────────────────────────

describe('startJam', () => {
  it('transitions IDLE to JAMMING', () => {
    let j = JS.createJam();
    j = JS.transition(j, JS.actions.startJam('C', 1000));
    assert.equal(j.phase, 'JAMMING');
  });

  it('stores root and computes scale pitch classes', () => {
    let j = JS.createJam();
    j = JS.transition(j, JS.actions.startJam('C', 1000));
    assert.equal(j.root, 'C');
    // C major pitch classes: C=0, D=2, E=4, F=5, G=7, A=9, B=11
    assert.deepEqual(j.scalePitchClasses, [0, 2, 4, 5, 7, 9, 11]);
  });

  it('works for sharp keys', () => {
    let j = JS.createJam();
    j = JS.transition(j, JS.actions.startJam('G', 1000));
    // G major: G=7, A=9, B=11, C=0, D=2, E=4, F#=6
    assert.ok(j.scalePitchClasses.includes(6)); // F#
    assert.ok(!j.scalePitchClasses.includes(5)); // no F natural
  });

  it('works for flat keys', () => {
    let j = JS.createJam();
    j = JS.transition(j, JS.actions.startJam('F', 1000));
    // F major: F=5, G=7, A=9, Bb=10, C=0, D=2, E=4
    assert.ok(j.scalePitchClasses.includes(10)); // Bb
    assert.ok(!j.scalePitchClasses.includes(11)); // no B natural
  });

  it('records startedAt', () => {
    let j = JS.createJam();
    j = JS.transition(j, JS.actions.startJam('C', 5000));
    assert.equal(j.startedAt, 5000);
  });

  it('resets score and stats', () => {
    let j = JS.createJam();
    j = JS.transition(j, JS.actions.startJam('C', 1000));
    j = JS.transition(j, JS.actions.playNote(60, 1100)); // C in key
    assert.equal(j.score, 1);
    // Start again — should reset
    j = JS.transition(j, JS.actions.stopJam(2000));
    j = JS.transition(j, JS.actions.startJam('G', 3000));
    assert.equal(j.score, 0);
    assert.equal(j.notesPlayed, 0);
  });

  it('is a no-op from JAMMING', () => {
    let j = JS.createJam();
    j = JS.transition(j, JS.actions.startJam('C', 1000));
    const j2 = JS.transition(j, JS.actions.startJam('G', 2000));
    assert.equal(j2.root, 'C'); // unchanged
  });
});

// ── playNote ──────────────────────────────────────────────────

describe('playNote', () => {
  it('in-key note adds +1 score', () => {
    let j = JS.createJam();
    j = JS.transition(j, JS.actions.startJam('C', 1000));
    j = JS.transition(j, JS.actions.playNote(60, 1100)); // C
    assert.equal(j.score, 1);
    assert.equal(j.inKeyCount, 1);
    assert.equal(j.notesPlayed, 1);
  });

  it('out-of-key note subtracts 1 score', () => {
    let j = JS.createJam();
    j = JS.transition(j, JS.actions.startJam('C', 1000));
    j = JS.transition(j, JS.actions.playNote(61, 1100)); // C#, not in C major
    assert.equal(j.score, -1);
    assert.equal(j.outOfKeyCount, 1);
    assert.equal(j.notesPlayed, 1);
  });

  it('accepts any octave of an in-key note', () => {
    let j = JS.createJam();
    j = JS.transition(j, JS.actions.startJam('C', 1000));
    j = JS.transition(j, JS.actions.playNote(48, 1100)); // C3
    j = JS.transition(j, JS.actions.playNote(72, 1200)); // C5
    assert.equal(j.score, 2);
    assert.equal(j.inKeyCount, 2);
  });

  it('score can go negative', () => {
    let j = JS.createJam();
    j = JS.transition(j, JS.actions.startJam('C', 1000));
    j = JS.transition(j, JS.actions.playNote(61, 1100)); // C#
    j = JS.transition(j, JS.actions.playNote(63, 1200)); // Eb
    j = JS.transition(j, JS.actions.playNote(66, 1300)); // F#
    assert.equal(j.score, -3);
  });

  it('is a no-op when not JAMMING', () => {
    let j = JS.createJam();
    const j2 = JS.transition(j, JS.actions.playNote(60, 1000));
    assert.equal(j2.score, 0);
    assert.equal(j2.notesPlayed, 0);
  });

  it('tracks last note result for UI feedback', () => {
    let j = JS.createJam();
    j = JS.transition(j, JS.actions.startJam('C', 1000));
    j = JS.transition(j, JS.actions.playNote(60, 1100));
    assert.equal(j.lastNoteInKey, true);
    j = JS.transition(j, JS.actions.playNote(61, 1200));
    assert.equal(j.lastNoteInKey, false);
  });
});

// ── stopJam ───────────────────────────────────────────────────

describe('stopJam', () => {
  it('transitions JAMMING to DONE', () => {
    let j = JS.createJam();
    j = JS.transition(j, JS.actions.startJam('C', 1000));
    j = JS.transition(j, JS.actions.stopJam(5000));
    assert.equal(j.phase, 'DONE');
  });

  it('records durationMs', () => {
    let j = JS.createJam();
    j = JS.transition(j, JS.actions.startJam('C', 1000));
    j = JS.transition(j, JS.actions.stopJam(4000));
    assert.equal(j.durationMs, 3000);
  });

  it('preserves score and stats', () => {
    let j = JS.createJam();
    j = JS.transition(j, JS.actions.startJam('C', 1000));
    j = JS.transition(j, JS.actions.playNote(60, 1100));
    j = JS.transition(j, JS.actions.playNote(61, 1200));
    j = JS.transition(j, JS.actions.stopJam(2000));
    assert.equal(j.score, 0); // +1 -1
    assert.equal(j.notesPlayed, 2);
    assert.equal(j.inKeyCount, 1);
    assert.equal(j.outOfKeyCount, 1);
  });

  it('is a no-op from IDLE', () => {
    let j = JS.createJam();
    const j2 = JS.transition(j, JS.actions.stopJam(1000));
    assert.equal(j2.phase, 'IDLE');
  });
});

// ── getAccuracy ───────────────────────────────────────────────

describe('getAccuracy', () => {
  it('returns 0 with no notes played', () => {
    assert.equal(JS.getAccuracy(JS.createJam()), 0);
  });

  it('returns 100 when all in key', () => {
    let j = JS.createJam();
    j = JS.transition(j, JS.actions.startJam('C', 1000));
    j = JS.transition(j, JS.actions.playNote(60, 1100));
    j = JS.transition(j, JS.actions.playNote(62, 1200));
    assert.equal(JS.getAccuracy(j), 100);
  });

  it('returns correct percentage', () => {
    let j = JS.createJam();
    j = JS.transition(j, JS.actions.startJam('C', 1000));
    j = JS.transition(j, JS.actions.playNote(60, 1100)); // in
    j = JS.transition(j, JS.actions.playNote(61, 1200)); // out
    j = JS.transition(j, JS.actions.playNote(62, 1300)); // in
    j = JS.transition(j, JS.actions.playNote(64, 1400)); // in
    assert.equal(JS.getAccuracy(j), 75);
  });
});

// ── isNoteInScale (pure helper) ───────────────────────────────

describe('isNoteInScale', () => {
  it('returns true for in-key pitch class', () => {
    assert.equal(JS.isNoteInScale(60, [0, 2, 4, 5, 7, 9, 11]), true); // C
  });

  it('returns false for out-of-key pitch class', () => {
    assert.equal(JS.isNoteInScale(61, [0, 2, 4, 5, 7, 9, 11]), false); // C#
  });

  it('works across octaves', () => {
    assert.equal(JS.isNoteInScale(48, [0, 2, 4, 5, 7, 9, 11]), true); // C3
    assert.equal(JS.isNoteInScale(49, [0, 2, 4, 5, 7, 9, 11]), false); // C#3
  });
});

// ── Journal ───────────────────────────────────────────────────

describe('jam journal', () => {
  it('starts with empty journal', () => {
    assert.deepEqual(JS.createJam().journal, []);
  });

  it('adds entry on stopJam', () => {
    let j = JS.createJam();
    j = JS.transition(j, JS.actions.startJam('C', 1000));
    j = JS.transition(j, JS.actions.playNote(60, 1100));
    j = JS.transition(j, JS.actions.playNote(61, 1200));
    j = JS.transition(j, JS.actions.stopJam(3000));
    assert.equal(j.journal.length, 1);
    assert.equal(j.journal[0].root, 'C');
    assert.equal(j.journal[0].notesPlayed, 2);
    assert.equal(j.journal[0].score, 0); // +1 -1
    assert.equal(j.journal[0].durationMs, 2000);
  });

  it('journal persists across sessions', () => {
    let j = JS.createJam();
    j = JS.transition(j, JS.actions.startJam('C', 1000));
    j = JS.transition(j, JS.actions.playNote(60, 1100));
    j = JS.transition(j, JS.actions.stopJam(2000));
    j = JS.transition(j, JS.actions.startJam('G', 3000));
    j = JS.transition(j, JS.actions.playNote(55, 3100));
    j = JS.transition(j, JS.actions.stopJam(4000));
    assert.equal(j.journal.length, 2);
    assert.equal(j.journal[0].root, 'C');
    assert.equal(j.journal[1].root, 'G');
  });
});
