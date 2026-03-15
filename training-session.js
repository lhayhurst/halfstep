// ── Training Session ──────────────────────────────────────────
// Pure reducer for the training state machine.
// No side effects — fully testable.
//
// States: FREE_PLAY → TRAINING → ROUND_COMPLETE → FREE_PLAY
//
// Depends on ScaleEngine for scale data and mastery tracking.

const SE = (typeof ScaleEngine !== 'undefined') ? ScaleEngine : require('./scale-engine.js');

// ── Expected sequence builder ─────────────────────────────────

function buildExpectedSequence(scaleNames, midiNotes, direction) {
  if (direction === 'ascending') {
    return { names: [...scaleNames], midi: [...midiNotes] };
  }
  if (direction === 'descending') {
    return { names: [...scaleNames].reverse(), midi: [...midiNotes].reverse() };
  }
  // both: up then down, skip repeated top note
  const namesDown = [...scaleNames].reverse().slice(1);
  const midiDown = [...midiNotes].reverse().slice(1);
  return {
    names: [...scaleNames, ...namesDown],
    midi: [...midiNotes, ...midiDown],
  };
}

// ── Factory ───────────────────────────────────────────────────

function createSession(config) {
  const cfg = config || {};
  return {
    phase: 'FREE_PLAY',
    round: null,
    result: null,
    streak: 0,
    journal: [],
    mastery: cfg.mastery || SE.createEmptyMastery(),
  };
}

// ── Action creators ───────────────────────────────────────────

const actions = {
  startRound(root, direction, mode, startOctave, now) {
    return { type: 'START_ROUND', root, direction, mode, startOctave, now };
  },
  playNote(midi, now) {
    return { type: 'PLAY_NOTE', midi, now };
  },
  stopRound() {
    return { type: 'STOP_ROUND' };
  },
  acknowledge() {
    return { type: 'ACKNOWLEDGE' };
  },
};

// ── Reducer ───────────────────────────────────────────────────

function transition(state, action) {
  switch (action.type) {
    case 'START_ROUND': return handleStartRound(state, action);
    case 'PLAY_NOTE':   return handlePlayNote(state, action);
    case 'STOP_ROUND':  return handleStopRound(state);
    case 'ACKNOWLEDGE': return handleAcknowledge(state);
    default:            return state;
  }
}

function handleStartRound(state, action) {
  const { root, direction, mode, startOctave, now } = action;

  const rawNames = SE.getScaleNotes(root);
  const rawMidi = SE.getScaleMidiNotes(root, startOctave);
  const seq = buildExpectedSequence(rawNames, rawMidi, direction);

  return {
    ...state,
    phase: 'TRAINING',
    result: null,
    round: {
      root,
      direction,
      mode,
      scaleNames: seq.names,
      scaleMidi: seq.midi,
      highlightNames: [...rawNames],
      highlightMidi: [...rawMidi],
      expectedIndex: 0,
      attempts: 0,
      correctCount: 0,
      mistakes: [],
      startedAt: now,
    },
  };
}

function handlePlayNote(state, action) {
  if (state.phase !== 'TRAINING') return state;

  const { midi, now } = action;
  const round = state.round;
  const expectedMidi = round.scaleMidi[round.expectedIndex];
  const playedPitchClass = midi % 12;
  const expectedPitchClass = expectedMidi % 12;
  const correct = playedPitchClass === expectedPitchClass;

  const newRound = {
    ...round,
    attempts: round.attempts + 1,
    correctCount: correct ? round.correctCount + 1 : round.correctCount,
    expectedIndex: correct ? round.expectedIndex + 1 : round.expectedIndex,
    mistakes: correct ? round.mistakes : [
      ...round.mistakes,
      { playedMidi: midi, expectedName: round.scaleNames[round.expectedIndex] },
    ],
  };

  // Check if round is complete
  if (correct && newRound.expectedIndex >= newRound.scaleNames.length) {
    return completeRound(state, newRound, now);
  }

  return { ...state, round: newRound };
}

function completeRound(state, round, now) {
  const accuracy = Math.round((round.correctCount / round.attempts) * 100);
  const clean = round.mistakes.length === 0;
  const durationMs = now - round.startedAt;

  const result = {
    root: round.root,
    direction: round.direction,
    mode: round.mode,
    accuracy,
    clean,
    mistakes: round.mistakes,
    durationMs,
    completedAt: now,
  };

  const journalEntry = {
    id: state.journal.length + 1,
    ...result,
  };

  const newStreak = clean ? state.streak + 1 : 0;
  const newMastery = clean
    ? SE.recordCleanRound(state.mastery, round.root, round.mode)
    : state.mastery;

  return {
    ...state,
    phase: 'ROUND_COMPLETE',
    round,
    result,
    streak: newStreak,
    journal: [...state.journal, journalEntry],
    mastery: newMastery,
  };
}

function handleStopRound(state) {
  if (state.phase !== 'TRAINING') return state;
  return {
    ...state,
    phase: 'FREE_PLAY',
    round: null,
    result: null,
  };
}

function handleAcknowledge(state) {
  if (state.phase !== 'ROUND_COMPLETE') return state;
  return {
    ...state,
    phase: 'FREE_PLAY',
    round: null,
    result: null,
  };
}

// ── Query helpers ─────────────────────────────────────────────

function isTraining(state) {
  return state.phase === 'TRAINING';
}

function getCurrentExpectedNote(state) {
  if (state.phase !== 'TRAINING' || !state.round) return null;
  const i = state.round.expectedIndex;
  return {
    name: state.round.scaleNames[i],
    midi: state.round.scaleMidi[i],
  };
}

function getJournalStats(journal) {
  if (journal.length === 0) {
    return { totalRounds: 0, avgAccuracy: 0, cleanCount: 0 };
  }
  const totalRounds = journal.length;
  const avgAccuracy = Math.round(journal.reduce((sum, e) => sum + e.accuracy, 0) / totalRounds);
  const cleanCount = journal.filter(e => e.clean).length;
  return { totalRounds, avgAccuracy, cleanCount };
}

// ── Exports ───────────────────────────────────────────────────

const TrainingSession = {
  createSession,
  transition,
  actions,
  isTraining,
  getCurrentExpectedNote,
  getJournalStats,
  buildExpectedSequence,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TrainingSession;
}
