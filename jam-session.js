// ── Jam Session ───────────────────────────────────────────────
// Pure reducer for free-form jam mode.
// Pick a scale, play freely, scored on staying in key.
//
// Phases: IDLE → JAMMING → DONE

var JamSession = (function() {
  var SE = (typeof ScaleEngine !== 'undefined') ? ScaleEngine : require('./scale-engine.js');

  function createJam() {
    return {
      phase: 'IDLE',
      root: null,
      scalePitchClasses: [],
      score: 0,
      notesPlayed: 0,
      inKeyCount: 0,
      outOfKeyCount: 0,
      lastNoteInKey: null,
      startedAt: null,
      durationMs: null,
    };
  }

  var actions = {
    startJam: function(root, now) {
      return { type: 'START_JAM', root: root, now: now };
    },
    playNote: function(midi, now) {
      return { type: 'PLAY_NOTE', midi: midi, now: now };
    },
    stopJam: function(now) {
      return { type: 'STOP_JAM', now: now };
    },
  };

  function transition(state, action) {
    switch (action.type) {
      case 'START_JAM': return handleStartJam(state, action);
      case 'PLAY_NOTE': return handlePlayNote(state, action);
      case 'STOP_JAM':  return handleStopJam(state, action);
      default:          return state;
    }
  }

  function handleStartJam(state, action) {
    if (state.phase === 'JAMMING') return state;
    var scaleNotes = SE.getScaleNotes(action.root);
    var pitchClasses = [];
    for (var i = 0; i < 7; i++) {
      pitchClasses.push(SE.NAME_TO_SEMI[scaleNotes[i]]);
    }
    return {
      phase: 'JAMMING',
      root: action.root,
      scalePitchClasses: pitchClasses,
      score: 0,
      notesPlayed: 0,
      inKeyCount: 0,
      outOfKeyCount: 0,
      lastNoteInKey: null,
      startedAt: action.now,
      durationMs: null,
    };
  }

  function handlePlayNote(state, action) {
    if (state.phase !== 'JAMMING') return state;
    var inKey = isNoteInScale(action.midi, state.scalePitchClasses);
    return {
      ...state,
      score: state.score + (inKey ? 1 : -1),
      notesPlayed: state.notesPlayed + 1,
      inKeyCount: state.inKeyCount + (inKey ? 1 : 0),
      outOfKeyCount: state.outOfKeyCount + (inKey ? 0 : 1),
      lastNoteInKey: inKey,
    };
  }

  function handleStopJam(state, action) {
    if (state.phase !== 'JAMMING') return state;
    return {
      ...state,
      phase: 'DONE',
      durationMs: action.now - state.startedAt,
    };
  }

  function isNoteInScale(midi, scalePitchClasses) {
    return scalePitchClasses.indexOf(midi % 12) !== -1;
  }

  function getAccuracy(state) {
    if (state.notesPlayed === 0) return 0;
    return Math.round((state.inKeyCount / state.notesPlayed) * 100);
  }

  return {
    createJam: createJam,
    transition: transition,
    actions: actions,
    isNoteInScale: isNoteInScale,
    getAccuracy: getAccuracy,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = JamSession;
}
