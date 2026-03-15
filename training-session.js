// ── Training Session ──────────────────────────────────────────
// Pure reducer for the training state machine.
// No side effects — fully testable.
//
// States: FREE_PLAY → TRAINING → ROUND_COMPLETE → FREE_PLAY
//
// Depends on ScaleEngine for scale data and mastery tracking.

var TrainingSession = (function() {
  var SE = (typeof ScaleEngine !== 'undefined') ? ScaleEngine : require('./scale-engine.js');

  function buildExpectedSequence(scaleNames, midiNotes, direction) {
    if (direction === 'ascending') {
      return { names: [...scaleNames], midi: [...midiNotes] };
    }
    if (direction === 'descending') {
      return { names: [...scaleNames].reverse(), midi: [...midiNotes].reverse() };
    }
    var namesDown = [...scaleNames].reverse().slice(1);
    var midiDown = [...midiNotes].reverse().slice(1);
    return {
      names: [...scaleNames, ...namesDown],
      midi: [...midiNotes, ...midiDown],
    };
  }

  function createSession(config) {
    var cfg = config || {};
    return {
      phase: 'FREE_PLAY',
      round: null,
      result: null,
      streak: 0,
      journal: [],
      mastery: cfg.mastery || SE.createEmptyMastery(),
    };
  }

  var actions = {
    startRound: function(root, direction, mode, startOctave, now) {
      return { type: 'START_ROUND', root: root, direction: direction, mode: mode, startOctave: startOctave, now: now };
    },
    playNote: function(midi, now) {
      return { type: 'PLAY_NOTE', midi: midi, now: now };
    },
    stopRound: function() {
      return { type: 'STOP_ROUND' };
    },
    acknowledge: function() {
      return { type: 'ACKNOWLEDGE' };
    },
  };

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
    var root = action.root, direction = action.direction, mode = action.mode;
    var startOctave = action.startOctave, now = action.now;
    var rawNames = SE.getScaleNotes(root);
    var rawMidi = SE.getScaleMidiNotes(root, startOctave);
    var seq = buildExpectedSequence(rawNames, rawMidi, direction);

    return {
      ...state,
      phase: 'TRAINING',
      result: null,
      round: {
        root: root, direction: direction, mode: mode,
        scaleNames: seq.names, scaleMidi: seq.midi,
        highlightNames: [...rawNames], highlightMidi: [...rawMidi],
        expectedIndex: 0, attempts: 0, correctCount: 0, mistakes: [],
        startedAt: now,
      },
    };
  }

  function handlePlayNote(state, action) {
    if (state.phase !== 'TRAINING') return state;
    var midi = action.midi, now = action.now;
    var round = state.round;
    var expectedMidi = round.scaleMidi[round.expectedIndex];
    var playedPC = midi % 12, expectedPC = expectedMidi % 12;
    var correct = playedPC === expectedPC;

    var newRound = {
      ...round,
      attempts: round.attempts + 1,
      correctCount: correct ? round.correctCount + 1 : round.correctCount,
      expectedIndex: correct ? round.expectedIndex + 1 : round.expectedIndex,
      mistakes: correct ? round.mistakes : [
        ...round.mistakes,
        { playedMidi: midi, expectedName: round.scaleNames[round.expectedIndex] },
      ],
    };

    if (correct && newRound.expectedIndex >= newRound.scaleNames.length) {
      return completeRound(state, newRound, now);
    }
    return { ...state, round: newRound };
  }

  function completeRound(state, round, now) {
    var accuracy = Math.round((round.correctCount / round.attempts) * 100);
    var clean = round.mistakes.length === 0;
    var durationMs = now - round.startedAt;
    var result = {
      root: round.root, direction: round.direction, mode: round.mode,
      accuracy: accuracy, clean: clean, mistakes: round.mistakes,
      durationMs: durationMs, completedAt: now,
    };
    var journalEntry = { id: state.journal.length + 1, ...result };
    var newStreak = clean ? state.streak + 1 : 0;
    var newMastery = clean
      ? SE.recordCleanRound(state.mastery, round.root, round.mode)
      : state.mastery;

    return {
      ...state, phase: 'ROUND_COMPLETE', round: round, result: result,
      streak: newStreak, journal: [...state.journal, journalEntry], mastery: newMastery,
    };
  }

  function handleStopRound(state) {
    if (state.phase !== 'TRAINING') return state;
    return { ...state, phase: 'FREE_PLAY', round: null, result: null };
  }

  function handleAcknowledge(state) {
    if (state.phase !== 'ROUND_COMPLETE') return state;
    return { ...state, phase: 'FREE_PLAY', round: null, result: null };
  }

  function isTraining(state) { return state.phase === 'TRAINING'; }

  function getCurrentExpectedNote(state) {
    if (state.phase !== 'TRAINING' || !state.round) return null;
    var i = state.round.expectedIndex;
    return { name: state.round.scaleNames[i], midi: state.round.scaleMidi[i] };
  }

  function getJournalStats(journal) {
    if (journal.length === 0) return { totalRounds: 0, avgAccuracy: 0, cleanCount: 0 };
    var totalRounds = journal.length;
    var avgAccuracy = Math.round(journal.reduce(function(sum, e) { return sum + e.accuracy; }, 0) / totalRounds);
    var cleanCount = journal.filter(function(e) { return e.clean; }).length;
    return { totalRounds: totalRounds, avgAccuracy: avgAccuracy, cleanCount: cleanCount };
  }

  return {
    createSession: createSession, transition: transition, actions: actions,
    isTraining: isTraining, getCurrentExpectedNote: getCurrentExpectedNote,
    getJournalStats: getJournalStats, buildExpectedSequence: buildExpectedSequence,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TrainingSession;
}
