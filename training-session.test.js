const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const TS = require('./training-session.js');
const SE = require('./scale-engine.js');

// ── createSession ─────────────────────────────────────────────

describe('createSession', () => {
  it('returns state with phase FREE_PLAY', () => {
    const s = TS.createSession();
    assert.equal(s.phase, 'FREE_PLAY');
  });

  it('has null round and result', () => {
    const s = TS.createSession();
    assert.equal(s.round, null);
    assert.equal(s.result, null);
  });

  it('has zero streak and empty journal', () => {
    const s = TS.createSession();
    assert.equal(s.streak, 0);
    assert.deepEqual(s.journal, []);
  });

  it('accepts initial mastery', () => {
    const mastery = SE.createEmptyMastery();
    mastery['C'].guidedClean = 5;
    const s = TS.createSession({ mastery });
    assert.equal(s.mastery['C'].guidedClean, 5);
  });

  it('creates empty mastery if none provided', () => {
    const s = TS.createSession();
    assert.ok(s.mastery);
    assert.equal(s.mastery['C'].guidedClean, 0);
  });
});

// ── startRound ────────────────────────────────────────────────

describe('startRound transition', () => {
  it('transitions from FREE_PLAY to TRAINING', () => {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound('C', 'ascending', 'guided', 3, 1000));
    assert.equal(s.phase, 'TRAINING');
  });

  it('populates round with correct ascending scale', () => {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound('C', 'ascending', 'guided', 3, 1000));
    assert.deepEqual(s.round.scaleNames, ['C','D','E','F','G','A','B','C']);
    assert.equal(s.round.scaleMidi.length, 8);
    assert.equal(s.round.scaleMidi[0], 48); // C3
  });

  it('populates round with descending scale', () => {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound('C', 'descending', 'guided', 3, 1000));
    assert.deepEqual(s.round.scaleNames, ['C','B','A','G','F','E','D','C']);
  });

  it('populates round with both (up and down) scale', () => {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound('C', 'both', 'guided', 3, 1000));
    assert.equal(s.round.scaleNames.length, 15); // 8 up + 7 down (shared top note)
    assert.equal(s.round.scaleNames[0], 'C');
    assert.equal(s.round.scaleNames[7], 'C'); // top
    assert.equal(s.round.scaleNames[14], 'C'); // bottom
  });

  it('resets round counters', () => {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound('C', 'ascending', 'guided', 3, 1000));
    assert.equal(s.round.expectedIndex, 0);
    assert.equal(s.round.attempts, 0);
    assert.equal(s.round.correctCount, 0);
    assert.deepEqual(s.round.mistakes, []);
  });

  it('records startedAt timestamp', () => {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound('C', 'ascending', 'guided', 3, 5000));
    assert.equal(s.round.startedAt, 5000);
  });

  it('records root, direction, mode on the round', () => {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound('G', 'descending', 'shadowed', 3, 1000));
    assert.equal(s.round.root, 'G');
    assert.equal(s.round.direction, 'descending');
    assert.equal(s.round.mode, 'shadowed');
  });

  it('allows restart from TRAINING (re-enters TRAINING)', () => {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound('C', 'ascending', 'guided', 3, 1000));
    s = TS.transition(s, TS.actions.startRound('G', 'ascending', 'guided', 3, 2000));
    assert.equal(s.phase, 'TRAINING');
    assert.equal(s.round.root, 'G');
  });

  it('restart does not add journal entry', () => {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound('C', 'ascending', 'guided', 3, 1000));
    s = TS.transition(s, TS.actions.startRound('G', 'ascending', 'guided', 3, 2000));
    assert.equal(s.journal.length, 0);
  });

  it('stores highlight data (ascending scale for keyboard display)', () => {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound('C', 'descending', 'guided', 3, 1000));
    assert.deepEqual(s.round.highlightNames, ['C','D','E','F','G','A','B','C']);
    assert.equal(s.round.highlightMidi[0], 48);
  });
});

// ── playNote in TRAINING ──────────────────────────────────────

describe('playNote transition', () => {
  function startedSession(root, direction) {
    let s = TS.createSession();
    return TS.transition(s, TS.actions.startRound(root || 'C', direction || 'ascending', 'guided', 3, 1000));
  }

  it('correct pitch class advances expectedIndex', () => {
    let s = startedSession();
    s = TS.transition(s, TS.actions.playNote(48, 1100)); // C3
    assert.equal(s.round.expectedIndex, 1);
    assert.equal(s.round.correctCount, 1);
    assert.equal(s.round.attempts, 1);
  });

  it('accepts any octave of the correct pitch class', () => {
    let s = startedSession();
    s = TS.transition(s, TS.actions.playNote(60, 1100)); // C4 instead of C3
    assert.equal(s.round.expectedIndex, 1);
    assert.equal(s.round.correctCount, 1);
  });

  it('wrong pitch class does not advance', () => {
    let s = startedSession();
    s = TS.transition(s, TS.actions.playNote(49, 1100)); // C#3, expected C
    assert.equal(s.round.expectedIndex, 0);
    assert.equal(s.round.correctCount, 0);
    assert.equal(s.round.attempts, 1);
  });

  it('wrong note adds to mistakes', () => {
    let s = startedSession();
    s = TS.transition(s, TS.actions.playNote(49, 1100));
    assert.equal(s.round.mistakes.length, 1);
    assert.equal(s.round.mistakes[0].playedMidi, 49);
    assert.equal(s.round.mistakes[0].expectedName, 'C');
  });

  it('last correct note transitions to ROUND_COMPLETE', () => {
    let s = startedSession();
    const midiNotes = SE.getScaleMidiNotes('C', 3);
    for (const midi of midiNotes) {
      s = TS.transition(s, TS.actions.playNote(midi, 1100));
    }
    assert.equal(s.phase, 'ROUND_COMPLETE');
  });

  it('playNote in FREE_PLAY returns state unchanged', () => {
    const s = TS.createSession();
    const s2 = TS.transition(s, TS.actions.playNote(60, 1000));
    assert.equal(s2.phase, 'FREE_PLAY');
    assert.equal(s2.round, null);
  });

  it('playNote in ROUND_COMPLETE returns state unchanged', () => {
    let s = startedSession();
    const midiNotes = SE.getScaleMidiNotes('C', 3);
    for (const midi of midiNotes) {
      s = TS.transition(s, TS.actions.playNote(midi, 1100));
    }
    assert.equal(s.phase, 'ROUND_COMPLETE');
    const s2 = TS.transition(s, TS.actions.playNote(60, 2000));
    assert.equal(s2.phase, 'ROUND_COMPLETE');
  });
});

// ── Round completion ──────────────────────────────────────────

describe('round completion', () => {
  function completeCleanRound(root, mode) {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound(root || 'C', 'ascending', mode || 'guided', 3, 1000));
    const midiNotes = SE.getScaleMidiNotes(root || 'C', 3);
    for (const midi of midiNotes) {
      s = TS.transition(s, TS.actions.playNote(midi, 2000));
    }
    return s;
  }

  it('populates result on completion', () => {
    const s = completeCleanRound();
    assert.ok(s.result);
    assert.equal(s.result.root, 'C');
    assert.equal(s.result.direction, 'ascending');
    assert.equal(s.result.mode, 'guided');
    assert.equal(s.result.accuracy, 100);
    assert.equal(s.result.clean, true);
  });

  it('calculates duration from startedAt to completion', () => {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound('C', 'ascending', 'guided', 3, 1000));
    const midiNotes = SE.getScaleMidiNotes('C', 3);
    for (let i = 0; i < midiNotes.length; i++) {
      s = TS.transition(s, TS.actions.playNote(midiNotes[i], 1000 + (i + 1) * 500));
    }
    assert.equal(s.result.durationMs, 4000); // last note at 5000 - startedAt 1000
  });

  it('appends to journal', () => {
    const s = completeCleanRound();
    assert.equal(s.journal.length, 1);
    assert.equal(s.journal[0].root, 'C');
    assert.equal(s.journal[0].id, 1);
  });

  it('journal entries have sequential ids', () => {
    let s = completeCleanRound();
    s = TS.transition(s, TS.actions.acknowledge());
    s = TS.transition(s, TS.actions.startRound('G', 'ascending', 'guided', 3, 3000));
    const midiNotes = SE.getScaleMidiNotes('G', 3);
    for (const midi of midiNotes) {
      s = TS.transition(s, TS.actions.playNote(midi, 4000));
    }
    assert.equal(s.journal.length, 2);
    assert.equal(s.journal[1].id, 2);
  });

  it('clean round increments streak', () => {
    const s = completeCleanRound();
    assert.equal(s.streak, 1);
  });

  it('dirty round resets streak', () => {
    let s = TS.createSession();
    // First do a clean round to get streak to 1
    s = TS.transition(s, TS.actions.startRound('C', 'ascending', 'guided', 3, 1000));
    const midiNotes = SE.getScaleMidiNotes('C', 3);
    for (const midi of midiNotes) {
      s = TS.transition(s, TS.actions.playNote(midi, 2000));
    }
    assert.equal(s.streak, 1);

    // Now do a dirty round
    s = TS.transition(s, TS.actions.acknowledge());
    s = TS.transition(s, TS.actions.startRound('C', 'ascending', 'guided', 3, 3000));
    s = TS.transition(s, TS.actions.playNote(49, 3100)); // wrong note
    s = TS.transition(s, TS.actions.playNote(48, 3200)); // correct C
    // play rest correctly
    for (let i = 1; i < midiNotes.length; i++) {
      s = TS.transition(s, TS.actions.playNote(midiNotes[i], 3300 + i * 100));
    }
    assert.equal(s.streak, 0);
    assert.equal(s.result.clean, false);
  });

  it('clean round updates mastery', () => {
    const s = completeCleanRound('C', 'guided');
    assert.equal(s.mastery['C'].guidedClean, 1);
  });

  it('dirty round does not update mastery', () => {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound('C', 'ascending', 'guided', 3, 1000));
    s = TS.transition(s, TS.actions.playNote(49, 1100)); // wrong
    const midiNotes = SE.getScaleMidiNotes('C', 3);
    for (const midi of midiNotes) {
      s = TS.transition(s, TS.actions.playNote(midi, 2000));
    }
    assert.equal(s.mastery['C'].guidedClean, 0);
  });

  it('accuracy is calculated correctly with mistakes', () => {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound('C', 'ascending', 'guided', 3, 1000));
    // Play 2 wrong notes before the first correct one
    s = TS.transition(s, TS.actions.playNote(49, 1100)); // wrong
    s = TS.transition(s, TS.actions.playNote(51, 1200)); // wrong
    const midiNotes = SE.getScaleMidiNotes('C', 3);
    for (const midi of midiNotes) {
      s = TS.transition(s, TS.actions.playNote(midi, 2000));
    }
    // 8 correct out of 10 attempts = 80%
    assert.equal(s.result.accuracy, 80);
  });
});

// ── stopRound ─────────────────────────────────────────────────

describe('stopRound transition', () => {
  it('transitions from TRAINING to FREE_PLAY', () => {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound('C', 'ascending', 'guided', 3, 1000));
    s = TS.transition(s, TS.actions.stopRound());
    assert.equal(s.phase, 'FREE_PLAY');
  });

  it('clears round and result', () => {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound('C', 'ascending', 'guided', 3, 1000));
    s = TS.transition(s, TS.actions.stopRound());
    assert.equal(s.round, null);
    assert.equal(s.result, null);
  });

  it('does not add journal entry', () => {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound('C', 'ascending', 'guided', 3, 1000));
    s = TS.transition(s, TS.actions.stopRound());
    assert.equal(s.journal.length, 0);
  });

  it('preserves streak', () => {
    let s = TS.createSession();
    // Complete a clean round first
    s = TS.transition(s, TS.actions.startRound('C', 'ascending', 'guided', 3, 1000));
    const midiNotes = SE.getScaleMidiNotes('C', 3);
    for (const midi of midiNotes) {
      s = TS.transition(s, TS.actions.playNote(midi, 2000));
    }
    assert.equal(s.streak, 1);
    s = TS.transition(s, TS.actions.acknowledge());

    // Start and stop another round
    s = TS.transition(s, TS.actions.startRound('G', 'ascending', 'guided', 3, 3000));
    s = TS.transition(s, TS.actions.stopRound());
    assert.equal(s.streak, 1); // unchanged
  });

  it('stopRound from FREE_PLAY is a no-op', () => {
    const s = TS.createSession();
    const s2 = TS.transition(s, TS.actions.stopRound());
    assert.equal(s2.phase, 'FREE_PLAY');
  });
});

// ── acknowledge ───────────────────────────────────────────────

describe('acknowledge transition', () => {
  function completedSession() {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound('C', 'ascending', 'guided', 3, 1000));
    const midiNotes = SE.getScaleMidiNotes('C', 3);
    for (const midi of midiNotes) {
      s = TS.transition(s, TS.actions.playNote(midi, 2000));
    }
    return s;
  }

  it('transitions from ROUND_COMPLETE to FREE_PLAY', () => {
    let s = completedSession();
    s = TS.transition(s, TS.actions.acknowledge());
    assert.equal(s.phase, 'FREE_PLAY');
  });

  it('clears round and result', () => {
    let s = completedSession();
    s = TS.transition(s, TS.actions.acknowledge());
    assert.equal(s.round, null);
    assert.equal(s.result, null);
  });

  it('preserves journal', () => {
    let s = completedSession();
    s = TS.transition(s, TS.actions.acknowledge());
    assert.equal(s.journal.length, 1);
  });

  it('preserves streak and mastery', () => {
    let s = completedSession();
    const streak = s.streak;
    const mastery = s.mastery;
    s = TS.transition(s, TS.actions.acknowledge());
    assert.equal(s.streak, streak);
    assert.deepEqual(s.mastery, mastery);
  });
});

// ── Query helpers ─────────────────────────────────────────────

describe('isTraining', () => {
  it('returns true in TRAINING phase', () => {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound('C', 'ascending', 'guided', 3, 1000));
    assert.equal(TS.isTraining(s), true);
  });

  it('returns false in FREE_PLAY', () => {
    assert.equal(TS.isTraining(TS.createSession()), false);
  });

  it('returns false in ROUND_COMPLETE', () => {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound('C', 'ascending', 'guided', 3, 1000));
    const midiNotes = SE.getScaleMidiNotes('C', 3);
    for (const midi of midiNotes) {
      s = TS.transition(s, TS.actions.playNote(midi, 2000));
    }
    assert.equal(TS.isTraining(s), false);
  });
});

describe('getCurrentExpectedNote', () => {
  it('returns the expected note name and midi', () => {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound('C', 'ascending', 'guided', 3, 1000));
    const note = TS.getCurrentExpectedNote(s);
    assert.equal(note.name, 'C');
    assert.equal(note.midi, 48);
  });

  it('advances after correct note', () => {
    let s = TS.createSession();
    s = TS.transition(s, TS.actions.startRound('C', 'ascending', 'guided', 3, 1000));
    s = TS.transition(s, TS.actions.playNote(48, 1100));
    const note = TS.getCurrentExpectedNote(s);
    assert.equal(note.name, 'D');
  });

  it('returns null when not training', () => {
    assert.equal(TS.getCurrentExpectedNote(TS.createSession()), null);
  });
});

describe('getJournalStats', () => {
  it('returns zeros for empty journal', () => {
    const stats = TS.getJournalStats([]);
    assert.equal(stats.totalRounds, 0);
    assert.equal(stats.avgAccuracy, 0);
    assert.equal(stats.cleanCount, 0);
  });

  it('computes stats for journal entries', () => {
    const journal = [
      { id: 1, accuracy: 100, clean: true },
      { id: 2, accuracy: 80, clean: false },
      { id: 3, accuracy: 100, clean: true },
    ];
    const stats = TS.getJournalStats(journal);
    assert.equal(stats.totalRounds, 3);
    assert.equal(stats.avgAccuracy, 93);
    assert.equal(stats.cleanCount, 2);
  });
});
