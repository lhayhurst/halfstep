// ── Melody Engine ─────────────────────────────────────────────
// Pure reducer for Guitar Hero-style melody gameplay.
// No side effects — fully testable.
//
// Phases: IDLE → PLAYING → COMPLETE

var MelodyEngine = (function() {
  var MD = (typeof MelodyData !== 'undefined') ? MelodyData : require('./melody-data.js');

  function createMelodySession() {
    return {
      phase: 'IDLE', config: null, melody: null,
      scrollPositionMs: 0, noteStates: [],
      score: { hits: 0, misses: 0, streak: 0, maxStreak: 0, multiplier: 1, total: 0 },
      startedAt: null, result: null, journal: [],
    };
  }

  var actions = {
    startMelody: function(melodyId, key, subMode, speed, hitWindowMs, now, octave) {
      return { type: 'START_MELODY', melodyId: melodyId, key: key, subMode: subMode, speed: speed, hitWindowMs: hitWindowMs, now: now, octave: octave };
    },
    tick: function(dt) { return { type: 'TICK', dt: dt }; },
    playNote: function(midi, now) { return { type: 'PLAY_NOTE', midi: midi, now: now }; },
    stop: function() { return { type: 'STOP' }; },
  };

  function transition(state, action) {
    switch (action.type) {
      case 'START_MELODY': return handleStartMelody(state, action);
      case 'TICK':         return handleTick(state, action);
      case 'PLAY_NOTE':    return handlePlayNote(state, action);
      case 'STOP':         return handleStop(state);
      default:             return state;
    }
  }

  function handleStartMelody(state, action) {
    var melodyDef = MD.getMelody(action.melodyId);
    if (!melodyDef) return state;
    var resolvedNotes = MD.resolveMelodyToMidi(melodyDef, action.key, action.octave || 4);
    return {
      ...state, phase: 'PLAYING',
      config: { melodyId: action.melodyId, key: action.key, subMode: action.subMode, speed: action.speed, hitWindowMs: action.hitWindowMs },
      melody: { notes: resolvedNotes, bpm: melodyDef.bpm, name: melodyDef.name },
      scrollPositionMs: 0,
      noteStates: resolvedNotes.map(function() { return { status: 'pending', hitDeltaMs: null }; }),
      score: { hits: 0, misses: 0, streak: 0, maxStreak: 0, multiplier: 1, total: 0 },
      startedAt: action.now, result: null,
    };
  }

  function handleTick(state, action) {
    if (state.phase !== 'PLAYING') return state;
    var newScroll = state.scrollPositionMs + action.dt * state.config.speed;
    var hitWindow = state.config.hitWindowMs;
    var newNoteStates = [...state.noteStates];
    var newScore = { ...state.score };
    var changed = false;

    for (var i = 0; i < state.melody.notes.length; i++) {
      if (newNoteStates[i].status !== 'pending') continue;
      if (newScroll > state.melody.notes[i].beatTimeMs + hitWindow) {
        newNoteStates[i] = { status: 'missed', hitDeltaMs: null };
        newScore.misses++;
        newScore.streak = 0;
        newScore.multiplier = 1;
        changed = true;
      }
    }

    var newState = {
      ...state, scrollPositionMs: newScroll,
      noteStates: changed ? newNoteStates : state.noteStates,
      score: changed ? newScore : state.score,
    };
    return allResolved(newState) ? completeSession(newState) : newState;
  }

  function handlePlayNote(state, action) {
    if (state.phase !== 'PLAYING') return state;
    var playedPC = action.midi % 12;
    var hitWindow = state.config.hitWindowMs;
    var scroll = state.scrollPositionMs;
    var hitIdx = -1;

    for (var i = 0; i < state.melody.notes.length; i++) {
      if (state.noteStates[i].status !== 'pending') continue;
      var note = state.melody.notes[i];
      var delta = Math.abs(note.beatTimeMs - scroll);
      if (delta <= hitWindow && note.midi % 12 === playedPC) { hitIdx = i; break; }
    }
    if (hitIdx === -1) return state;

    var hitDelta = Math.abs(state.melody.notes[hitIdx].beatTimeMs - scroll);
    var newNoteStates = [...state.noteStates];
    newNoteStates[hitIdx] = { status: 'hit', hitDeltaMs: hitDelta };
    var newStreak = state.score.streak + 1;
    var newMultiplier = Math.floor(newStreak / 10) + 1;
    var newScore = {
      ...state.score, hits: state.score.hits + 1,
      streak: newStreak, maxStreak: Math.max(state.score.maxStreak, newStreak),
      multiplier: newMultiplier, total: state.score.total + 100 * state.score.multiplier,
    };
    var newState = { ...state, noteStates: newNoteStates, score: newScore };
    return allResolved(newState) ? completeSession(newState) : newState;
  }

  function handleStop(state) {
    if (state.phase === 'IDLE') return state;
    return { ...state, phase: 'IDLE', config: null, melody: null, noteStates: [], scrollPositionMs: 0, result: null };
  }

  function allResolved(state) {
    return state.noteStates.every(function(ns) { return ns.status !== 'pending'; });
  }

  function completeSession(state) {
    var hits = state.score.hits, misses = state.score.misses;
    var totalNotes = hits + misses;
    var accuracy = totalNotes > 0 ? Math.round((hits / totalNotes) * 100) : 0;
    var result = {
      melodyName: state.melody.name, hits: hits, misses: misses,
      accuracy: accuracy, maxStreak: state.score.maxStreak,
      total: state.score.total, rating: computeRating(accuracy),
    };
    var journalEntry = {
      id: state.journal.length + 1,
      ...result,
      key: state.config.key,
    };
    return {
      ...state, phase: 'COMPLETE', result: result,
      journal: [...state.journal, journalEntry],
    };
  }

  function computeRating(accuracy) {
    if (accuracy >= 95) return 'S';
    if (accuracy >= 85) return 'A';
    if (accuracy >= 70) return 'B';
    if (accuracy >= 50) return 'C';
    return 'D';
  }

  return {
    createMelodySession: createMelodySession, transition: transition,
    actions: actions, computeRating: computeRating,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MelodyEngine;
}
