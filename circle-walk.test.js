const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const CW = require('./circle-walk.js');
const SE = require('./scale-engine.js');

// ── createWalk ────────────────────────────────────────────────

describe('createWalk', () => {
  it('returns IDLE phase', () => {
    assert.equal(CW.createWalk().phase, 'IDLE');
  });

  it('has 12 keys matching circle of fifths', () => {
    const w = CW.createWalk();
    assert.deepEqual(w.circle, SE.CIRCLE_OF_FIFTHS);
    assert.equal(w.circle.length, 12);
  });

  it('all keys uncompleted, zero attempts', () => {
    const w = CW.createWalk();
    assert.equal(w.completed.length, 12);
    assert.ok(w.completed.every(c => c === false));
    assert.ok(w.attempts.every(a => a === 0));
  });

  it('currentIndex is 0', () => {
    assert.equal(CW.createWalk().currentIndex, 0);
  });
});

// ── startWalk ─────────────────────────────────────────────────

describe('startWalk', () => {
  it('transitions IDLE to WALKING', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    assert.equal(w.phase, 'WALKING');
  });

  it('sets currentIndex to 0', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    assert.equal(w.currentIndex, 0);
  });

  it('locks direction and mode', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('descending', 'shadowed', 1000));
    assert.equal(w.direction, 'descending');
    assert.equal(w.mode, 'shadowed');
  });

  it('records startedAt', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 5000));
    assert.equal(w.startedAt, 5000);
  });

  it('is a no-op from WALKING', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    const w2 = CW.transition(w, CW.actions.startWalk('descending', 'blind', 2000));
    assert.equal(w2.direction, 'ascending'); // unchanged
  });
});

// ── keyClean ──────────────────────────────────────────────────

describe('keyClean', () => {
  it('marks current key completed', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    w = CW.transition(w, CW.actions.keyClean(2000));
    assert.equal(w.completed[0], true);
  });

  it('transitions to KEY_COMPLETE', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    w = CW.transition(w, CW.actions.keyClean(2000));
    assert.equal(w.phase, 'KEY_COMPLETE');
  });

  it('increments attempts for current key', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    w = CW.transition(w, CW.actions.keyClean(2000));
    assert.equal(w.attempts[0], 1);
  });

  it('12th keyClean transitions to WALK_COMPLETE', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    // Complete first 11
    for (let i = 0; i < 11; i++) {
      w = CW.transition(w, CW.actions.keyClean(2000 + i));
      w = CW.transition(w, CW.actions.acknowledgeKey());
    }
    assert.equal(w.currentIndex, 11);
    // Complete 12th
    w = CW.transition(w, CW.actions.keyClean(9000));
    assert.equal(w.phase, 'WALK_COMPLETE');
    assert.ok(w.completedAt);
    assert.ok(w.completed.every(c => c === true));
  });
});

// ── keyDirty ──────────────────────────────────────────────────

describe('keyDirty', () => {
  it('stays in WALKING', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    w = CW.transition(w, CW.actions.keyDirty());
    assert.equal(w.phase, 'WALKING');
  });

  it('does NOT mark key completed', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    w = CW.transition(w, CW.actions.keyDirty());
    assert.equal(w.completed[0], false);
  });

  it('increments attempts', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    w = CW.transition(w, CW.actions.keyDirty());
    w = CW.transition(w, CW.actions.keyDirty());
    assert.equal(w.attempts[0], 2);
  });

  it('stays on same currentIndex', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    w = CW.transition(w, CW.actions.keyDirty());
    assert.equal(w.currentIndex, 0);
  });
});

// ── acknowledgeKey ────────────────────────────────────────────

describe('acknowledgeKey', () => {
  it('advances currentIndex', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    w = CW.transition(w, CW.actions.keyClean(2000));
    w = CW.transition(w, CW.actions.acknowledgeKey());
    assert.equal(w.currentIndex, 1);
  });

  it('transitions KEY_COMPLETE to WALKING', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    w = CW.transition(w, CW.actions.keyClean(2000));
    w = CW.transition(w, CW.actions.acknowledgeKey());
    assert.equal(w.phase, 'WALKING');
  });

  it('is a no-op from WALKING', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    const w2 = CW.transition(w, CW.actions.acknowledgeKey());
    assert.equal(w2.currentIndex, 0); // unchanged
  });
});

// ── stopWalk ──────────────────────────────────────────────────

describe('stopWalk', () => {
  it('transitions to IDLE', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    w = CW.transition(w, CW.actions.stopWalk());
    assert.equal(w.phase, 'IDLE');
  });

  it('preserves completed progress', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    w = CW.transition(w, CW.actions.keyClean(2000));
    w = CW.transition(w, CW.actions.acknowledgeKey());
    w = CW.transition(w, CW.actions.stopWalk());
    assert.equal(w.completed[0], true);
    assert.equal(w.currentIndex, 1);
  });
});

// ── resetWalk ─────────────────────────────────────────────────

describe('resetWalk', () => {
  it('clears all progress', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    w = CW.transition(w, CW.actions.keyClean(2000));
    w = CW.transition(w, CW.actions.acknowledgeKey());
    w = CW.transition(w, CW.actions.resetWalk());
    assert.equal(w.phase, 'IDLE');
    assert.equal(w.currentIndex, 0);
    assert.ok(w.completed.every(c => c === false));
    assert.ok(w.attempts.every(a => a === 0));
  });
});

// ── Query functions ───────────────────────────────────────────

describe('getCurrentKey', () => {
  it('returns the key at currentIndex', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    assert.equal(CW.getCurrentKey(w), 'C');
    w = CW.transition(w, CW.actions.keyClean(2000));
    w = CW.transition(w, CW.actions.acknowledgeKey());
    assert.equal(CW.getCurrentKey(w), 'G');
  });
});

describe('getNextKey', () => {
  it('returns the next key after current', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    assert.equal(CW.getNextKey(w), 'G'); // next after C
  });

  it('returns null on last key', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    for (let i = 0; i < 11; i++) {
      w = CW.transition(w, CW.actions.keyClean(2000 + i));
      w = CW.transition(w, CW.actions.acknowledgeKey());
    }
    assert.equal(w.currentIndex, 11);
    assert.equal(CW.getNextKey(w), null);
  });
});

describe('getProgress', () => {
  it('returns correct counts', () => {
    let w = CW.createWalk();
    assert.deepEqual(CW.getProgress(w), { completed: 0, total: 12, percent: 0 });
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    w = CW.transition(w, CW.actions.keyClean(2000));
    w = CW.transition(w, CW.actions.acknowledgeKey());
    const p = CW.getProgress(w);
    assert.equal(p.completed, 1);
    assert.equal(p.total, 12);
    assert.equal(p.percent, 8);
  });
});

describe('getCircleNodes', () => {
  it('returns 12 nodes with correct flags', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('ascending', 'guided', 1000));
    w = CW.transition(w, CW.actions.keyClean(2000));
    w = CW.transition(w, CW.actions.acknowledgeKey());
    // Now on G (index 1), C (index 0) completed
    const nodes = CW.getCircleNodes(w);
    assert.equal(nodes.length, 12);
    assert.equal(nodes[0].key, 'C');
    assert.equal(nodes[0].completed, true);
    assert.equal(nodes[0].current, false);
    assert.equal(nodes[1].key, 'G');
    assert.equal(nodes[1].current, true);
    assert.equal(nodes[1].completed, false);
    assert.equal(nodes[2].completed, false);
    assert.equal(nodes[2].current, false);
  });
});

// ── Serialization ─────────────────────────────────────────────

describe('serializeWalk / deserializeWalk', () => {
  it('roundtrips correctly', () => {
    let w = CW.createWalk();
    w = CW.transition(w, CW.actions.startWalk('descending', 'shadowed', 1000));
    w = CW.transition(w, CW.actions.keyClean(2000));
    w = CW.transition(w, CW.actions.acknowledgeKey());
    w = CW.transition(w, CW.actions.stopWalk());

    const json = CW.serializeWalk(w);
    const restored = CW.deserializeWalk(json);
    assert.equal(restored.phase, 'IDLE');
    assert.equal(restored.currentIndex, 1);
    assert.equal(restored.completed[0], true);
    assert.equal(restored.direction, 'descending');
    assert.equal(restored.mode, 'shadowed');
  });

  it('handles null/corrupt data gracefully', () => {
    const w = CW.deserializeWalk(null);
    assert.equal(w.phase, 'IDLE');
    assert.equal(w.completed.length, 12);
  });

  it('handles malformed JSON gracefully', () => {
    const w = CW.deserializeWalk('not json');
    assert.equal(w.phase, 'IDLE');
  });

  it('handles partial data gracefully', () => {
    const w = CW.deserializeWalk(JSON.stringify({ currentIndex: 5 }));
    assert.equal(w.phase, 'IDLE');
    assert.equal(w.currentIndex, 5);
    assert.equal(w.completed.length, 12);
  });
});
