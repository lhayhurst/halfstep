// ── Circle Walk ───────────────────────────────────────────────
// Pure reducer for walking the circle of fifths.
// Orchestrates a sequence of scale rounds — one per key.
//
// Phases: IDLE → WALKING → KEY_COMPLETE → WALKING → ... → WALK_COMPLETE

var CircleWalk = (function() {
  var SE = (typeof ScaleEngine !== 'undefined') ? ScaleEngine : require('./scale-engine.js');

  var CIRCLE = SE.CIRCLE_OF_FIFTHS;

  function createWalk() {
    var revealed = new Array(12).fill(false);
    revealed[0] = true; // C is always revealed
    return {
      phase: 'IDLE',
      circle: [...CIRCLE],
      currentIndex: 0,
      completed: new Array(12).fill(false),
      attempts: new Array(12).fill(0),
      direction: 'ascending',
      mode: 'guided',
      startedAt: null,
      completedAt: null,
      quizPhase: 'IDLE',
      quizRevealed: revealed,
      quizCurrent: 1,
      quizMistakes: 0,
    };
  }

  var actions = {
    startWalk: function(direction, mode, now) {
      return { type: 'START_WALK', direction: direction, mode: mode, now: now };
    },
    keyClean: function(now) {
      return { type: 'KEY_CLEAN', now: now };
    },
    keyDirty: function() {
      return { type: 'KEY_DIRTY' };
    },
    acknowledgeKey: function() {
      return { type: 'ACKNOWLEDGE_KEY' };
    },
    stopWalk: function() {
      return { type: 'STOP_WALK' };
    },
    resetWalk: function() {
      return { type: 'RESET_WALK' };
    },
    startQuiz: function() {
      return { type: 'START_QUIZ' };
    },
    guessKey: function(key) {
      return { type: 'GUESS_KEY', key: key };
    },
    resetQuiz: function() {
      return { type: 'RESET_QUIZ' };
    },
  };

  function transition(state, action) {
    switch (action.type) {
      case 'START_WALK':     return handleStartWalk(state, action);
      case 'KEY_CLEAN':      return handleKeyClean(state, action);
      case 'KEY_DIRTY':      return handleKeyDirty(state);
      case 'ACKNOWLEDGE_KEY': return handleAcknowledgeKey(state);
      case 'STOP_WALK':      return handleStopWalk(state);
      case 'RESET_WALK':     return createWalk();
      case 'START_QUIZ':     return handleStartQuiz(state);
      case 'GUESS_KEY':      return handleGuessKey(state, action);
      case 'RESET_QUIZ':     return handleResetQuiz(state);
      default:               return state;
    }
  }

  function handleStartWalk(state, action) {
    if (state.phase !== 'IDLE') return state;
    return {
      ...state,
      phase: 'WALKING',
      direction: action.direction,
      mode: action.mode,
      startedAt: action.now,
      completedAt: null,
    };
  }

  function handleKeyClean(state, action) {
    if (state.phase !== 'WALKING') return state;
    var idx = state.currentIndex;
    var newCompleted = [...state.completed];
    newCompleted[idx] = true;
    var newAttempts = [...state.attempts];
    newAttempts[idx] = newAttempts[idx] + 1;

    var allDone = newCompleted.every(function(c) { return c; });

    return {
      ...state,
      phase: allDone ? 'WALK_COMPLETE' : 'KEY_COMPLETE',
      completed: newCompleted,
      attempts: newAttempts,
      completedAt: allDone ? action.now : null,
    };
  }

  function handleKeyDirty(state) {
    if (state.phase !== 'WALKING') return state;
    var newAttempts = [...state.attempts];
    newAttempts[state.currentIndex] = newAttempts[state.currentIndex] + 1;
    return { ...state, attempts: newAttempts };
  }

  function handleAcknowledgeKey(state) {
    if (state.phase !== 'KEY_COMPLETE') return state;
    return {
      ...state,
      phase: 'WALKING',
      currentIndex: state.currentIndex + 1,
    };
  }

  function handleStopWalk(state) {
    if (state.phase === 'IDLE') return state;
    return { ...state, phase: 'IDLE' };
  }

  function handleStartQuiz(state) {
    if (state.quizPhase === 'QUIZZING') return state;
    var revealed = new Array(12).fill(false);
    revealed[0] = true; // C is shown but user must play it to start
    return { ...state, quizPhase: 'QUIZZING', quizRevealed: revealed, quizCurrent: 0, quizMistakes: 0 };
  }

  function handleGuessKey(state, action) {
    if (state.quizPhase !== 'QUIZZING') return state;
    var correct = state.circle[state.quizCurrent] === action.key;
    if (correct) {
      var newRevealed = [...state.quizRevealed];
      newRevealed[state.quizCurrent] = true;
      var nextIdx = state.quizCurrent + 1;
      var allRevealed = nextIdx >= 12;
      return {
        ...state,
        quizRevealed: newRevealed,
        quizCurrent: allRevealed ? state.quizCurrent : nextIdx,
        quizPhase: allRevealed ? 'QUIZ_COMPLETE' : 'QUIZZING',
      };
    }
    return { ...state, quizMistakes: state.quizMistakes + 1 };
  }

  function handleResetQuiz(state) {
    var revealed = new Array(12).fill(false);
    revealed[0] = true;
    return { ...state, quizPhase: 'IDLE', quizRevealed: revealed, quizCurrent: 1, quizMistakes: 0 };
  }

  // ── Queries ─────────────────────────────────────────────────

  function getCurrentKey(state) {
    return state.circle[state.currentIndex];
  }

  function getNextKey(state) {
    var next = state.currentIndex + 1;
    return next < 12 ? state.circle[next] : null;
  }

  function getProgress(state) {
    var completed = state.completed.filter(function(c) { return c; }).length;
    return {
      completed: completed,
      total: 12,
      percent: Math.round((completed / 12) * 100),
    };
  }

  function isComplete(state) {
    return state.phase === 'WALK_COMPLETE';
  }

  function getCircleNodes(state) {
    return state.circle.map(function(key, i) {
      return {
        key: key,
        completed: state.completed[i],
        current: i === state.currentIndex && state.phase === 'WALKING',
        index: i,
      };
    });
  }

  function getQuizChoices(state) {
    var choices = [];
    for (var i = 0; i < 12; i++) {
      if (!state.quizRevealed[i]) choices.push(state.circle[i]);
    }
    // Shuffle
    for (var j = choices.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = choices[j];
      choices[j] = choices[k];
      choices[k] = tmp;
    }
    return choices;
  }

  function getQuizTarget(state) {
    return state.circle[state.quizCurrent];
  }

  function isQuizComplete(state) {
    return state.quizPhase === 'QUIZ_COMPLETE';
  }

  // ── Serialization ───────────────────────────────────────────

  function serializeWalk(state) {
    return JSON.stringify({
      currentIndex: state.currentIndex,
      completed: state.completed,
      attempts: state.attempts,
      direction: state.direction,
      mode: state.mode,
      startedAt: state.startedAt,
    });
  }

  function deserializeWalk(json) {
    var base = createWalk();
    if (!json) return base;
    try {
      var data = typeof json === 'string' ? JSON.parse(json) : json;
      if (typeof data.currentIndex === 'number' && data.currentIndex >= 0 && data.currentIndex < 12) {
        base.currentIndex = data.currentIndex;
      }
      if (Array.isArray(data.completed) && data.completed.length === 12) {
        base.completed = data.completed;
      }
      if (Array.isArray(data.attempts) && data.attempts.length === 12) {
        base.attempts = data.attempts;
      }
      if (data.direction) base.direction = data.direction;
      if (data.mode) base.mode = data.mode;
      if (data.startedAt) base.startedAt = data.startedAt;
    } catch (e) {
      return createWalk();
    }
    return base;
  }

  return {
    createWalk: createWalk,
    transition: transition,
    actions: actions,
    getCurrentKey: getCurrentKey,
    getNextKey: getNextKey,
    getProgress: getProgress,
    isComplete: isComplete,
    getCircleNodes: getCircleNodes,
    serializeWalk: serializeWalk,
    deserializeWalk: deserializeWalk,
    getQuizChoices: getQuizChoices,
    getQuizTarget: getQuizTarget,
    isQuizComplete: isQuizComplete,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CircleWalk;
}
