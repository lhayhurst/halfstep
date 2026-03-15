// ── Circle Walk ───────────────────────────────────────────────
// Pure reducer for walking the circle of fifths.
// Orchestrates a sequence of scale rounds — one per key.
//
// Phases: IDLE → WALKING → KEY_COMPLETE → WALKING → ... → WALK_COMPLETE

var CircleWalk = (function() {
  var SE = (typeof ScaleEngine !== 'undefined') ? ScaleEngine : require('./scale-engine.js');

  var CIRCLE = SE.CIRCLE_OF_FIFTHS;

  function createWalk() {
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
  };

  function transition(state, action) {
    switch (action.type) {
      case 'START_WALK':     return handleStartWalk(state, action);
      case 'KEY_CLEAN':      return handleKeyClean(state, action);
      case 'KEY_DIRTY':      return handleKeyDirty(state);
      case 'ACKNOWLEDGE_KEY': return handleAcknowledgeKey(state);
      case 'STOP_WALK':      return handleStopWalk(state);
      case 'RESET_WALK':     return createWalk();
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
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CircleWalk;
}
