const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const ME = require('./melody-engine.js');
const MD = require('./melody-data.js');

// Helper: create a playing session with a simple 3-note melody
function playingSession(opts) {
  const o = opts || {};
  const s = ME.createMelodySession();
  return ME.transition(s, ME.actions.startMelody(
    o.melodyId || 'ode-to-joy',
    o.key || 'C',
    o.subMode || 'scale',
    o.speed || 1.0,
    o.hitWindowMs || 300,
    o.now || 0,
    o.octave || 4
  ));
}

// ── createMelodySession ───────────────────────────────────────

describe('createMelodySession', () => {
  it('returns state with phase IDLE', () => {
    const s = ME.createMelodySession();
    assert.equal(s.phase, 'IDLE');
  });

  it('has null melody and empty score', () => {
    const s = ME.createMelodySession();
    assert.equal(s.melody, null);
    assert.equal(s.scrollPositionMs, 0);
    assert.deepEqual(s.noteStates, []);
    assert.deepEqual(s.score, { hits: 0, misses: 0, streak: 0, maxStreak: 0, multiplier: 1, total: 0 });
  });
});

// ── startMelody ───────────────────────────────────────────────

describe('startMelody transition', () => {
  it('transitions IDLE to PLAYING', () => {
    const s = playingSession();
    assert.equal(s.phase, 'PLAYING');
  });

  it('resolves melody notes with MIDI and timing', () => {
    const s = playingSession({ melodyId: 'ode-to-joy', key: 'C' });
    assert.ok(s.melody.notes.length > 0);
    assert.equal(s.melody.notes[0].midi, 64); // E4 (degree 3 in C)
    assert.equal(s.melody.notes[0].beatTimeMs, 0);
  });

  it('initializes all noteStates as pending', () => {
    const s = playingSession();
    s.noteStates.forEach(ns => assert.equal(ns.status, 'pending'));
    assert.equal(s.noteStates.length, s.melody.notes.length);
  });

  it('stores config', () => {
    const s = playingSession({ key: 'G', subMode: 'keyboard', speed: 1.5, hitWindowMs: 200 });
    assert.equal(s.config.key, 'G');
    assert.equal(s.config.subMode, 'keyboard');
    assert.equal(s.config.speed, 1.5);
    assert.equal(s.config.hitWindowMs, 200);
  });

  it('resets scroll position and score', () => {
    const s = playingSession();
    assert.equal(s.scrollPositionMs, 0);
    assert.equal(s.score.hits, 0);
  });

  it('records startedAt', () => {
    const s = playingSession({ now: 5000 });
    assert.equal(s.startedAt, 5000);
  });
});

// ── tick ──────────────────────────────────────────────────────

describe('tick transition', () => {
  it('advances scrollPositionMs by dt * speed', () => {
    let s = playingSession({ speed: 1.0 });
    s = ME.transition(s, ME.actions.tick(100));
    assert.equal(s.scrollPositionMs, 100);
  });

  it('applies speed multiplier', () => {
    let s = playingSession({ speed: 2.0 });
    s = ME.transition(s, ME.actions.tick(100));
    assert.equal(s.scrollPositionMs, 200);
  });

  it('slow speed (0.5x) gives more time before a note is missed', () => {
    const hitWindow = 300;
    let fast = playingSession({ speed: 1.0, hitWindowMs: hitWindow });
    let slow = playingSession({ speed: 0.5, hitWindowMs: hitWindow });
    const beatTime = fast.melody.notes[0].beatTimeMs;
    // After 400ms real time at 1.0x: scroll = 400, past beatTime + 300 → missed
    fast = ME.transition(fast, ME.actions.tick(beatTime + hitWindow + 1));
    assert.equal(fast.noteStates[0].status, 'missed');
    // After 400ms real time at 0.5x: scroll = 200, not past beatTime + 300 → still pending
    slow = ME.transition(slow, ME.actions.tick(beatTime + hitWindow + 1));
    assert.equal(slow.noteStates[0].status, 'pending');
  });

  it('marks a note as missed when scroll passes beatTime + hitWindow', () => {
    let s = playingSession({ hitWindowMs: 300 });
    const firstNoteBeatTime = s.melody.notes[0].beatTimeMs;
    // Advance past the first note's hit window
    s = ME.transition(s, ME.actions.tick(firstNoteBeatTime + 301));
    assert.equal(s.noteStates[0].status, 'missed');
  });

  it('does not mark note as missed while still in hit window', () => {
    let s = playingSession({ hitWindowMs: 300 });
    s = ME.transition(s, ME.actions.tick(200));
    assert.equal(s.noteStates[0].status, 'pending');
  });

  it('increments misses count when note is missed', () => {
    let s = playingSession({ hitWindowMs: 300 });
    s = ME.transition(s, ME.actions.tick(301));
    assert.equal(s.score.misses, 1);
  });

  it('resets streak on miss', () => {
    let s = playingSession({ hitWindowMs: 300 });
    // Hit the first note to build streak
    s = ME.transition(s, ME.actions.playNote(s.melody.notes[0].midi, 0));
    assert.equal(s.score.streak, 1);
    // Skip the second note
    const secondBeatTime = s.melody.notes[1].beatTimeMs;
    s = ME.transition(s, ME.actions.tick(secondBeatTime + 301));
    assert.equal(s.score.streak, 0);
  });

  it('transitions to COMPLETE when all notes are resolved', () => {
    let s = playingSession({ hitWindowMs: 10 });
    // Advance past ALL notes
    const lastNote = s.melody.notes[s.melody.notes.length - 1];
    s = ME.transition(s, ME.actions.tick(lastNote.beatTimeMs + 100));
    assert.equal(s.phase, 'COMPLETE');
  });

  it('tick in IDLE is a no-op', () => {
    const s = ME.createMelodySession();
    const s2 = ME.transition(s, ME.actions.tick(100));
    assert.equal(s2.phase, 'IDLE');
  });
});

// ── playNote ──────────────────────────────────────────────────

describe('playNote transition', () => {
  it('hits a note when pitch class matches within hit window', () => {
    let s = playingSession({ hitWindowMs: 300 });
    const expectedMidi = s.melody.notes[0].midi;
    s = ME.transition(s, ME.actions.playNote(expectedMidi, 0));
    assert.equal(s.noteStates[0].status, 'hit');
  });

  it('accepts any octave of the correct pitch class', () => {
    let s = playingSession({ hitWindowMs: 300 });
    const expectedMidi = s.melody.notes[0].midi;
    s = ME.transition(s, ME.actions.playNote(expectedMidi + 12, 0)); // one octave up
    assert.equal(s.noteStates[0].status, 'hit');
  });

  it('records hitDeltaMs', () => {
    let s = playingSession({ hitWindowMs: 300 });
    // First note is at beatTimeMs 0, play it at scroll position 50
    s = ME.transition(s, ME.actions.tick(50));
    s = ME.transition(s, ME.actions.playNote(s.melody.notes[0].midi, 0));
    assert.equal(s.noteStates[0].hitDeltaMs, 50); // 50ms late
  });

  it('does not hit note outside hit window', () => {
    let s = playingSession({ hitWindowMs: 100 });
    // First note at beatTimeMs 0, scroll to 200 (past window)
    s = ME.transition(s, ME.actions.tick(200));
    // Note should be missed by tick already
    assert.equal(s.noteStates[0].status, 'missed');
  });

  it('wrong pitch class does not hit any note', () => {
    let s = playingSession({ hitWindowMs: 300 });
    const expectedMidi = s.melody.notes[0].midi;
    s = ME.transition(s, ME.actions.playNote(expectedMidi + 1, 0)); // semitone off
    assert.equal(s.noteStates[0].status, 'pending');
  });

  it('increments hits and streak on successful hit', () => {
    let s = playingSession({ hitWindowMs: 300 });
    s = ME.transition(s, ME.actions.playNote(s.melody.notes[0].midi, 0));
    assert.equal(s.score.hits, 1);
    assert.equal(s.score.streak, 1);
  });

  it('tracks maxStreak', () => {
    let s = playingSession({ hitWindowMs: 300 });
    // Hit first two notes, advancing scroll to their beat times
    s = ME.transition(s, ME.actions.playNote(s.melody.notes[0].midi, 0));
    const note1Time = s.melody.notes[1].beatTimeMs;
    s = ME.transition(s, ME.actions.tick(note1Time));
    s = ME.transition(s, ME.actions.playNote(s.melody.notes[1].midi, 0));
    assert.equal(s.score.maxStreak, 2);
    // Now miss the third note
    const note2Time = s.melody.notes[2].beatTimeMs;
    s = ME.transition(s, ME.actions.tick(note2Time + 301));
    assert.equal(s.score.maxStreak, 2); // preserved
    assert.equal(s.score.streak, 0);    // reset
  });

  it('playNote in IDLE is a no-op', () => {
    const s = ME.createMelodySession();
    const s2 = ME.transition(s, ME.actions.playNote(60, 0));
    assert.equal(s2.phase, 'IDLE');
  });
});

// ── stop ──────────────────────────────────────────────────────

describe('stop transition', () => {
  it('transitions PLAYING to IDLE', () => {
    let s = playingSession();
    s = ME.transition(s, ME.actions.stop());
    assert.equal(s.phase, 'IDLE');
  });

  it('clears melody and noteStates', () => {
    let s = playingSession();
    s = ME.transition(s, ME.actions.stop());
    assert.equal(s.melody, null);
    assert.deepEqual(s.noteStates, []);
  });

  it('stop from IDLE is a no-op', () => {
    const s = ME.createMelodySession();
    const s2 = ME.transition(s, ME.actions.stop());
    assert.equal(s2.phase, 'IDLE');
  });
});

// ── Scoring ───────────────────────────────────────────────────

describe('scoring', () => {
  it('multiplier increases at streak 10', () => {
    let s = playingSession({ hitWindowMs: 5000 });
    for (let i = 0; i < 10 && i < s.melody.notes.length; i++) {
      s = ME.transition(s, ME.actions.playNote(s.melody.notes[i].midi, 0));
    }
    assert.equal(s.score.multiplier, 2);
  });

  it('score accumulates with multiplier', () => {
    let s = playingSession({ hitWindowMs: 5000 });
    // First hit: 100 * 1 = 100
    s = ME.transition(s, ME.actions.playNote(s.melody.notes[0].midi, 0));
    assert.equal(s.score.total, 100);
    // Second hit: 100 * 1 = 100, total = 200
    s = ME.transition(s, ME.actions.playNote(s.melody.notes[1].midi, 0));
    assert.equal(s.score.total, 200);
  });
});

describe('computeRating', () => {
  it('returns S for 95%+', () => {
    assert.equal(ME.computeRating(95), 'S');
    assert.equal(ME.computeRating(100), 'S');
  });

  it('returns A for 85-94%', () => {
    assert.equal(ME.computeRating(85), 'A');
    assert.equal(ME.computeRating(94), 'A');
  });

  it('returns B for 70-84%', () => {
    assert.equal(ME.computeRating(70), 'B');
  });

  it('returns C for 50-69%', () => {
    assert.equal(ME.computeRating(50), 'C');
  });

  it('returns D for below 50%', () => {
    assert.equal(ME.computeRating(49), 'D');
    assert.equal(ME.computeRating(0), 'D');
  });
});

// ── Completion result ─────────────────────────────────────────

describe('tick on IDLE state is safe', () => {
  it('tick returns IDLE state unchanged (no crash)', () => {
    const s = ME.createMelodySession();
    assert.equal(s.phase, 'IDLE');
    const s2 = ME.transition(s, ME.actions.tick(16));
    assert.equal(s2.phase, 'IDLE');
    assert.equal(s2.scrollPositionMs, 0);
  });

  it('playNote on IDLE state is safe (no crash)', () => {
    const s = ME.createMelodySession();
    const s2 = ME.transition(s, ME.actions.playNote(60, 1000));
    assert.equal(s2.phase, 'IDLE');
  });
});

describe('completion result', () => {
  it('phase is COMPLETE with result populated', () => {
    let s = playingSession({ hitWindowMs: 10 });
    const lastNote = s.melody.notes[s.melody.notes.length - 1];
    s = ME.transition(s, ME.actions.tick(lastNote.beatTimeMs + 100));
    assert.equal(s.phase, 'COMPLETE');
    assert.ok(s.result);
  });

  it('result has accuracy, rating, hits, misses', () => {
    let s = playingSession({ hitWindowMs: 5000 });
    const totalNotes = s.melody.notes.length;
    const toHit = 5;
    for (let i = 0; i < toHit; i++) {
      s = ME.transition(s, ME.actions.tick(s.melody.notes[i].beatTimeMs));
      s = ME.transition(s, ME.actions.playNote(s.melody.notes[i].midi, 0));
    }
    const lastNote = s.melody.notes[totalNotes - 1];
    s = ME.transition(s, ME.actions.tick(lastNote.beatTimeMs + 5001));
    assert.ok(s.result);
    assert.equal(s.result.hits, toHit);
    assert.equal(s.result.misses, totalNotes - toHit);
    assert.ok(s.result.accuracy >= 0 && s.result.accuracy <= 100);
    assert.ok(['S','A','B','C','D'].includes(s.result.rating));
  });
});

// ── Journal ───────────────────────────────────────────────────

describe('melody journal', () => {
  it('starts with empty journal', () => {
    const s = ME.createMelodySession();
    assert.deepEqual(s.journal, []);
  });

  it('appends entry on completion', () => {
    let s = playingSession({ hitWindowMs: 10 });
    const lastNote = s.melody.notes[s.melody.notes.length - 1];
    s = ME.transition(s, ME.actions.tick(lastNote.beatTimeMs + 100));
    assert.equal(s.journal.length, 1);
    assert.equal(s.journal[0].id, 1);
    assert.equal(s.journal[0].melodyName, 'Ode to Joy');
    assert.ok(s.journal[0].rating);
    assert.ok(typeof s.journal[0].accuracy === 'number');
  });

  it('journal entries have sequential ids across rounds', () => {
    let s = playingSession({ hitWindowMs: 10 });
    let lastNote = s.melody.notes[s.melody.notes.length - 1];
    s = ME.transition(s, ME.actions.tick(lastNote.beatTimeMs + 100));
    // Start another round
    s = ME.transition(s, ME.actions.startMelody('twinkle-twinkle', 'C', 'scale', 1.0, 10, 5000, 4));
    lastNote = s.melody.notes[s.melody.notes.length - 1];
    s = ME.transition(s, ME.actions.tick(lastNote.beatTimeMs + 100));
    assert.equal(s.journal.length, 2);
    assert.equal(s.journal[0].id, 1);
    assert.equal(s.journal[1].id, 2);
    assert.equal(s.journal[1].melodyName, 'Twinkle Twinkle Little Star');
  });

  it('journal persists through stop', () => {
    let s = playingSession({ hitWindowMs: 10 });
    const lastNote = s.melody.notes[s.melody.notes.length - 1];
    s = ME.transition(s, ME.actions.tick(lastNote.beatTimeMs + 100));
    assert.equal(s.journal.length, 1);
    // Starting a new round and stopping should keep journal
    s = ME.transition(s, ME.actions.startMelody('ode-to-joy', 'C', 'scale', 1.0, 10, 5000, 4));
    s = ME.transition(s, ME.actions.stop());
    assert.equal(s.journal.length, 1); // stop doesn't add entry
  });

  it('stop does not add journal entry', () => {
    let s = playingSession({ hitWindowMs: 300 });
    s = ME.transition(s, ME.actions.stop());
    assert.equal(s.journal.length, 0);
  });
});
