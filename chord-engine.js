// ── Chord Engine ──────────────────────────────────────────────
// Pure reducer for chord progression training and free chord identification.
// No side effects — fully testable.
//
// Phases: IDLE → PLAYING → CHORD_COMPLETE → PLAYING → ... → PROGRESSION_COMPLETE
//         IDLE → FREE_CHORD

var ChordEngine = (function() {
  var SE = (typeof ScaleEngine !== 'undefined') ? ScaleEngine : require('./scale-engine.js');

  // ── Chord theory constants ──────────────────────────────────

  var CHORD_TEMPLATES = {
    maj:  [0, 4, 7],
    min:  [0, 3, 7],
    dim:  [0, 3, 6],
    aug:  [0, 4, 8],
    maj7: [0, 4, 7, 11],
    min7: [0, 3, 7, 10],
    dom7: [0, 4, 7, 10],
    hdim7:[0, 3, 6, 10],
    dim7: [0, 3, 6, 9],
  };

  var QUALITY_SUFFIXES = {
    maj: '', min: 'm', dim: 'dim', aug: 'aug',
    maj7: 'maj7', min7: 'm7', dom7: '7', hdim7: 'm7b5', dim7: 'dim7',
  };

  var DIATONIC_TRIADS = [
    { degree: 1, quality: 'maj', roman: 'I' },
    { degree: 2, quality: 'min', roman: 'ii' },
    { degree: 3, quality: 'min', roman: 'iii' },
    { degree: 4, quality: 'maj', roman: 'IV' },
    { degree: 5, quality: 'maj', roman: 'V' },
    { degree: 6, quality: 'min', roman: 'vi' },
    { degree: 7, quality: 'dim', roman: 'vii\u00B0' },
  ];

  // ── Chord theory functions ──────────────────────────────────

  function resolveChordPCS(key, chordSpec) {
    var scaleNotes = SE.getScaleNotes(key);
    var rootName = scaleNotes[chordSpec.degree - 1];
    var rootSemi = SE.NAME_TO_SEMI[rootName];
    var template = CHORD_TEMPLATES[chordSpec.quality];
    return new Set(template.map(function(i) { return (rootSemi + i) % 12; }));
  }

  function chordDisplayName(key, chordSpec) {
    var scaleNotes = SE.getScaleNotes(key);
    var rootName = scaleNotes[chordSpec.degree - 1];
    return rootName + (QUALITY_SUFFIXES[chordSpec.quality] || '');
  }

  function identifyChord(pitchClassSet) {
    if (pitchClassSet.size < 3) return null;
    var pcs = Array.from(pitchClassSet);
    // Try each pitch class as a potential root
    for (var r = 0; r < 12; r++) {
      var normalized = pcs.map(function(p) { return (p - r + 12) % 12; }).sort(function(a,b) { return a-b; });
      for (var quality in CHORD_TEMPLATES) {
        var template = CHORD_TEMPLATES[quality];
        if (template.length !== normalized.length) continue;
        if (template.every(function(t, i) { return t === normalized[i]; })) {
          return { root: SE.NOTE_NAMES[r], quality: quality };
        }
      }
    }
    return null;
  }

  function detectInversion(heldNotes, rootSemi, quality) {
    var lowest = Math.min.apply(null, heldNotes);
    var lowestPC = lowest % 12;
    var template = CHORD_TEMPLATES[quality];
    var third = (rootSemi + template[1]) % 12;
    var fifth = (rootSemi + template[2]) % 12;
    if (lowestPC === rootSemi) return 'root';
    if (lowestPC === third) return '1st';
    if (lowestPC === fifth) return '2nd';
    return 'root';
  }

  // ── Progression library ─────────────────────────────────────

  var PROGRESSIONS = [
    // ── Fundamentals ──────────────────────────────
    {
      id: 'I-IV', name: 'I-IV',
      description: 'The simplest two-chord vamp.',
      songs: 'Born in the USA, Paperback Writer',
      category: 'pop', difficulty: 1,
      chords: [
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 4, quality: 'maj', roman: 'IV' },
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 4, quality: 'maj', roman: 'IV' },
      ],
    },
    {
      id: 'I-V', name: 'I-V',
      description: 'Tonic to dominant and back.',
      songs: 'Jambalaya, Achy Breaky Heart',
      category: 'pop', difficulty: 1,
      chords: [
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 5, quality: 'maj', roman: 'V' },
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 5, quality: 'maj', roman: 'V' },
      ],
    },
    {
      id: 'I-IV-V-I', name: 'I-IV-V-I',
      description: 'The backbone of Western harmony.',
      songs: 'Twist and Shout, Wild Thing',
      category: 'classical', difficulty: 1,
      chords: [
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 4, quality: 'maj', roman: 'IV' },
        { degree: 5, quality: 'maj', roman: 'V' },
        { degree: 1, quality: 'maj', roman: 'I' },
      ],
    },
    // ── Pop / Rock ────────────────────────────────
    {
      id: 'I-V-vi-IV', name: 'I-V-vi-IV',
      description: 'The most popular progression in modern pop.',
      songs: 'Let It Be, No Woman No Cry, Someone Like You',
      category: 'pop', difficulty: 1,
      chords: [
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 5, quality: 'maj', roman: 'V' },
        { degree: 6, quality: 'min', roman: 'vi' },
        { degree: 4, quality: 'maj', roman: 'IV' },
      ],
    },
    {
      id: 'I-vi-IV-V', name: 'I-vi-IV-V',
      description: 'The classic 50s doo-wop progression.',
      songs: 'Earth Angel, Heart and Soul, Crocodile Rock',
      category: 'pop', difficulty: 1,
      chords: [
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 6, quality: 'min', roman: 'vi' },
        { degree: 4, quality: 'maj', roman: 'IV' },
        { degree: 5, quality: 'maj', roman: 'V' },
      ],
    },
    {
      id: 'vi-IV-I-V', name: 'vi-IV-I-V',
      description: 'Starting on the minor gives an emotional edge.',
      songs: 'Numb, Love the Way You Lie, Grenade',
      category: 'pop', difficulty: 1,
      chords: [
        { degree: 6, quality: 'min', roman: 'vi' },
        { degree: 4, quality: 'maj', roman: 'IV' },
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 5, quality: 'maj', roman: 'V' },
      ],
    },
    {
      id: 'I-IV-vi-V', name: 'I-IV-vi-V',
      description: 'A warm, rising progression.',
      songs: 'Hey Jude, Let Her Go',
      category: 'pop', difficulty: 1,
      chords: [
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 4, quality: 'maj', roman: 'IV' },
        { degree: 6, quality: 'min', roman: 'vi' },
        { degree: 5, quality: 'maj', roman: 'V' },
      ],
    },
    {
      id: 'I-iii-IV-V', name: 'I-iii-IV-V',
      description: 'Stepwise climb through the scale.',
      songs: 'Lean On Me, Here Comes the Sun',
      category: 'pop', difficulty: 1,
      chords: [
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 3, quality: 'min', roman: 'iii' },
        { degree: 4, quality: 'maj', roman: 'IV' },
        { degree: 5, quality: 'maj', roman: 'V' },
      ],
    },
    {
      id: 'I-V-IV-V', name: 'I-V-IV-V',
      description: 'Dominant bounce with the IV as a neighbor.',
      songs: 'Wild Thing, La Bamba',
      category: 'pop', difficulty: 1,
      chords: [
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 5, quality: 'maj', roman: 'V' },
        { degree: 4, quality: 'maj', roman: 'IV' },
        { degree: 5, quality: 'maj', roman: 'V' },
      ],
    },
    {
      id: 'I-IV-V-IV', name: 'I-IV-V-IV',
      description: 'Rocking between subdominant and dominant.',
      songs: 'With or Without You, Africa',
      category: 'pop', difficulty: 1,
      chords: [
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 4, quality: 'maj', roman: 'IV' },
        { degree: 5, quality: 'maj', roman: 'V' },
        { degree: 4, quality: 'maj', roman: 'IV' },
      ],
    },
    {
      id: 'vi-V-IV-V', name: 'vi-V-IV-V',
      description: 'Minor start with descending then rising motion.',
      songs: 'Stairway to Heaven (intro)',
      category: 'pop', difficulty: 1,
      chords: [
        { degree: 6, quality: 'min', roman: 'vi' },
        { degree: 5, quality: 'maj', roman: 'V' },
        { degree: 4, quality: 'maj', roman: 'IV' },
        { degree: 5, quality: 'maj', roman: 'V' },
      ],
    },
    // ── Jazz ──────────────────────────────────────
    {
      id: 'ii-V-I', name: 'ii-V-I',
      description: 'The most important progression in jazz.',
      songs: 'Sunday Morning, Fly Me to the Moon',
      category: 'jazz', difficulty: 2,
      chords: [
        { degree: 2, quality: 'min', roman: 'ii' },
        { degree: 5, quality: 'maj', roman: 'V' },
        { degree: 1, quality: 'maj', roman: 'I' },
      ],
    },
    {
      id: 'I-vi-ii-V', name: 'I-vi-ii-V',
      description: 'Rhythm changes \u2014 the jazz standard form.',
      songs: 'I Got Rhythm, Anthropology',
      category: 'jazz', difficulty: 2,
      chords: [
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 6, quality: 'min', roman: 'vi' },
        { degree: 2, quality: 'min', roman: 'ii' },
        { degree: 5, quality: 'maj', roman: 'V' },
      ],
    },
    {
      id: 'ii-V-I-vi', name: 'ii-V-I-vi',
      description: 'The turnaround \u2014 loops back to start.',
      songs: 'Common in jazz standards',
      category: 'jazz', difficulty: 2,
      chords: [
        { degree: 2, quality: 'min', roman: 'ii' },
        { degree: 5, quality: 'maj', roman: 'V' },
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 6, quality: 'min', roman: 'vi' },
      ],
    },
    {
      id: 'I-IV-ii-V', name: 'I-IV-ii-V',
      description: 'Smooth descending motion through the harmony.',
      songs: 'Common in jazz and gospel',
      category: 'jazz', difficulty: 2,
      chords: [
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 4, quality: 'maj', roman: 'IV' },
        { degree: 2, quality: 'min', roman: 'ii' },
        { degree: 5, quality: 'maj', roman: 'V' },
      ],
    },
    // ── Blues ──────────────────────────────────────
    {
      id: '12-bar-blues', name: '12-Bar Blues',
      description: 'The foundation of blues, rock, and jazz.',
      songs: 'Johnny B. Goode, Hound Dog, Sweet Home Chicago',
      category: 'blues', difficulty: 2,
      chords: [
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 4, quality: 'maj', roman: 'IV' },
        { degree: 4, quality: 'maj', roman: 'IV' },
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 5, quality: 'maj', roman: 'V' },
        { degree: 4, quality: 'maj', roman: 'IV' },
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 5, quality: 'maj', roman: 'V' },
      ],
    },
    // ── Classical ─────────────────────────────────
    {
      id: 'pachelbel', name: 'I-V-vi-iii-IV-I-IV-V',
      description: 'The Pachelbel Canon progression.',
      songs: 'Canon in D, Memories (Maroon 5)',
      category: 'classical', difficulty: 2,
      chords: [
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 5, quality: 'maj', roman: 'V' },
        { degree: 6, quality: 'min', roman: 'vi' },
        { degree: 3, quality: 'min', roman: 'iii' },
        { degree: 4, quality: 'maj', roman: 'IV' },
        { degree: 1, quality: 'maj', roman: 'I' },
        { degree: 4, quality: 'maj', roman: 'IV' },
        { degree: 5, quality: 'maj', roman: 'V' },
      ],
    },
    {
      id: 'vi-V-IV-III', name: 'vi-V-IV-III',
      description: 'The Andalusian cadence \u2014 descending from minor.',
      songs: 'Hit the Road Jack, Smooth Criminal',
      category: 'classical', difficulty: 2,
      chords: [
        { degree: 6, quality: 'min', roman: 'vi' },
        { degree: 5, quality: 'maj', roman: 'V' },
        { degree: 4, quality: 'maj', roman: 'IV' },
        { degree: 3, quality: 'maj', roman: 'III' },
      ],
    },
  ];

  function getProgression(id) {
    return PROGRESSIONS.find(function(p) { return p.id === id; });
  }

  // ── State machine ───────────────────────────────────────────

  function createChordSession() {
    return {
      phase: 'IDLE',
      config: null,
      progression: null,
      currentIndex: 0,
      heldNotes: [],
      attempts: 0,
      correctCount: 0,
      lastMatch: null,
      identifiedChord: null,
      startedAt: null,
      result: null,
      journal: [],
    };
  }

  var actions = {
    startProgression: function(progressionId, key, now) {
      return { type: 'START_PROGRESSION', progressionId: progressionId, key: key, now: now };
    },
    startFreeChord: function() {
      return { type: 'START_FREE_CHORD' };
    },
    noteOn: function(midi) {
      return { type: 'NOTE_ON', midi: midi };
    },
    noteOff: function(midi) {
      return { type: 'NOTE_OFF', midi: midi };
    },
    advance: function() {
      return { type: 'ADVANCE' };
    },
    startInversionDrill: function(key, chordSpec) {
      return { type: 'START_INVERSION_DRILL', key: key, chordSpec: chordSpec };
    },
    stop: function() {
      return { type: 'STOP' };
    },
  };

  function transition(state, action) {
    switch (action.type) {
      case 'START_PROGRESSION': return handleStartProgression(state, action);
      case 'START_FREE_CHORD':  return handleStartFreeChord(state);
      case 'NOTE_ON':           return handleNoteOn(state, action);
      case 'NOTE_OFF':          return handleNoteOff(state, action);
      case 'ADVANCE':           return handleAdvance(state);
      case 'START_INVERSION_DRILL': return handleStartInversionDrill(state, action);
      case 'STOP':              return handleStop(state);
      default:                  return state;
    }
  }

  function handleStartProgression(state, action) {
    var progDef = getProgression(action.progressionId);
    if (!progDef) return state;
    var resolved = progDef.chords.map(function(c) {
      return {
        degree: c.degree, quality: c.quality, roman: c.roman,
        pcs: resolveChordPCS(action.key, c),
        name: chordDisplayName(action.key, c),
      };
    });
    return {
      ...state,
      phase: 'PLAYING',
      config: { progressionId: action.progressionId, key: action.key, progressionName: progDef.name },
      progression: resolved,
      currentIndex: 0,
      heldNotes: [],
      attempts: 0,
      correctCount: 0,
      lastMatch: null,
      identifiedChord: null,
      startedAt: action.now,
      result: null,
    };
  }

  function handleStartFreeChord(state) {
    return {
      ...state,
      phase: 'FREE_CHORD',
      config: null,
      progression: null,
      currentIndex: 0,
      heldNotes: [],
      identifiedChord: null,
      lastMatch: null,
    };
  }

  function handleNoteOn(state, action) {
    if (state.phase === 'INVERSION_DRILL') return handleInversionNoteOn(state, action);
    if (state.phase !== 'PLAYING' && state.phase !== 'FREE_CHORD') return state;

    var newHeld = state.heldNotes.concat([action.midi]);
    var heldPCS = new Set(newHeld.map(function(n) { return n % 12; }));

    if (state.phase === 'FREE_CHORD') {
      var identified = heldPCS.size >= 3 ? identifyChord(heldPCS) : null;
      if (identified) {
        var rootSemi = SE.NAME_TO_SEMI[identified.root];
        identified.inversion = detectInversion(newHeld, rootSemi, identified.quality);
        identified.displayName = identified.root + (QUALITY_SUFFIXES[identified.quality] || '');
      }
      return { ...state, heldNotes: newHeld, identifiedChord: identified };
    }

    // PLAYING mode — check for chord match
    var expected = state.progression[state.currentIndex];
    if (setsEqual(heldPCS, expected.pcs)) {
      var rootSemiP = SE.NAME_TO_SEMI[expected.name.charAt(0)];
      // Resolve root semi more carefully from the resolved chord
      var scaleNotes = SE.getScaleNotes(state.config.key);
      var rootName = scaleNotes[expected.degree - 1];
      rootSemiP = SE.NAME_TO_SEMI[rootName];
      var inv = detectInversion(newHeld, rootSemiP, expected.quality);
      var match = { name: expected.name, inversion: inv };

      var isLast = state.currentIndex >= state.progression.length - 1;
      if (isLast) {
        var journalEntry = {
          id: state.journal.length + 1,
          progressionName: state.config.progressionName,
          key: state.config.key,
          correctCount: state.correctCount + 1,
          totalChords: state.progression.length,
        };
        return {
          ...state,
          phase: 'PROGRESSION_COMPLETE',
          currentIndex: state.currentIndex + 1,
          heldNotes: newHeld,
          correctCount: state.correctCount + 1,
          lastMatch: match,
          journal: [].concat(state.journal, [journalEntry]),
        };
      }

      return {
        ...state,
        phase: 'CHORD_COMPLETE',
        heldNotes: newHeld,
        correctCount: state.correctCount + 1,
        lastMatch: match,
      };
    }

    return { ...state, heldNotes: newHeld };
  }

  function handleNoteOff(state, action) {
    if (state.phase !== 'PLAYING' && state.phase !== 'FREE_CHORD' && state.phase !== 'CHORD_COMPLETE' && state.phase !== 'INVERSION_DRILL') return state;
    var newHeld = state.heldNotes.filter(function(n) { return n !== action.midi; });

    if (state.phase === 'FREE_CHORD') {
      var heldPCS = new Set(newHeld.map(function(n) { return n % 12; }));
      var identified = heldPCS.size >= 3 ? identifyChord(heldPCS) : null;
      if (identified) {
        var rootSemi = SE.NAME_TO_SEMI[identified.root];
        identified.inversion = detectInversion(newHeld, rootSemi, identified.quality);
        identified.displayName = identified.root + (QUALITY_SUFFIXES[identified.quality] || '');
      }
      return { ...state, heldNotes: newHeld, identifiedChord: identified };
    }

    return { ...state, heldNotes: newHeld };
  }

  function handleAdvance(state) {
    if (state.phase !== 'CHORD_COMPLETE') return state;
    return {
      ...state,
      phase: 'PLAYING',
      currentIndex: state.currentIndex + 1,
      heldNotes: [],
      lastMatch: null,
    };
  }

  function handleInversionNoteOn(state, action) {
    var drill = state.inversionDrill;
    var newHeld = state.heldNotes.concat([action.midi]);
    var heldPCS = new Set(newHeld.map(function(n) { return n % 12; }));

    // Check if held notes match the chord PCS
    if (!setsEqual(heldPCS, drill.pcs)) {
      return { ...state, heldNotes: newHeld };
    }

    // PCS matches — check if bass note is correct for current inversion
    var step = drill.steps[drill.currentStep];
    var lowest = Math.min.apply(null, newHeld);
    var lowestPC = lowest % 12;

    if (lowestPC === step.bassPC) {
      // Correct inversion!
      var nextStep = drill.currentStep + 1;
      var allDone = nextStep >= drill.steps.length;
      var newJournal = state.journal;
      if (allDone) {
        newJournal = [].concat(state.journal, [{
          id: state.journal.length + 1,
          type: 'inversion',
          chordName: drill.chordName,
        }]);
      }
      return {
        ...state,
        phase: allDone ? 'INVERSION_COMPLETE' : 'INVERSION_DRILL',
        heldNotes: [],
        journal: newJournal,
        inversionDrill: {
          ...drill,
          currentStep: nextStep,
          wrongInversion: false,
        },
      };
    }

    // Right chord but wrong inversion
    return {
      ...state,
      heldNotes: newHeld,
      inversionDrill: { ...drill, wrongInversion: true },
    };
  }

  function handleStartInversionDrill(state, action) {
    var key = action.key;
    var spec = action.chordSpec;
    var pcs = resolveChordPCS(key, spec);
    var name = chordDisplayName(key, spec);
    var scaleNotes = SE.getScaleNotes(key);
    var rootName = scaleNotes[spec.degree - 1];
    var rootSemi = SE.NAME_TO_SEMI[rootName];
    var template = CHORD_TEMPLATES[spec.quality];

    var steps = [
      { inversion: 'root', bassPC: rootSemi, label: 'Root position' },
      { inversion: '1st', bassPC: (rootSemi + template[1]) % 12, label: '1st inversion' },
      { inversion: '2nd', bassPC: (rootSemi + template[2]) % 12, label: '2nd inversion' },
    ];

    return {
      ...state,
      phase: 'INVERSION_DRILL',
      heldNotes: [],
      inversionDrill: {
        chordName: name,
        pcs: pcs,
        steps: steps,
        currentStep: 0,
        wrongInversion: false,
      },
    };
  }

  function handleStop(state) {
    if (state.phase === 'IDLE') return state;
    return {
      ...state,
      phase: 'IDLE',
      config: null,
      progression: null,
      heldNotes: [],
      identifiedChord: null,
      lastMatch: null,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────

  function setsEqual(a, b) {
    if (a.size !== b.size) return false;
    var iter = a.values();
    var val = iter.next();
    while (!val.done) {
      if (!b.has(val.value)) return false;
      val = iter.next();
    }
    return true;
  }

  return {
    CHORD_TEMPLATES: CHORD_TEMPLATES,
    DIATONIC_TRIADS: DIATONIC_TRIADS,
    PROGRESSIONS: PROGRESSIONS,
    resolveChordPCS: resolveChordPCS,
    chordDisplayName: chordDisplayName,
    identifyChord: identifyChord,
    detectInversion: detectInversion,
    getProgression: getProgression,
    createChordSession: createChordSession,
    transition: transition,
    actions: actions,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChordEngine;
}
