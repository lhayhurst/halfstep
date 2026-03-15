# halfstep — Feature Roadmap

## Current
- [x] All 12 major scales with correct enharmonic spellings
- [x] On-screen 2-octave piano (C3–C5) with click/touch input
- [x] Web MIDI input with device selector dropdown
- [x] Guided mode: scale notes highlighted on keyboard
- [x] Shadow mode: only root note marked, no highlights
- [x] Blind mode: keyboard hidden, text-only feedback
- [x] Pitch-class matching (any octave accepted)
- [x] Real piano samples (mp3)
- [x] Scale picker (pin a key or random)
- [x] Scale order: circle of fifths or chromatic
- [x] Direction picker: ascending, descending, up & down
- [x] Per-round accuracy % and streak counter
- [x] Streak celebrations at 3, 5, 10
- [x] Theory tips per key
- [x] Scale playback on round completion
- [x] MIDI monitor (collapsible)
- [x] Free play between rounds (chords work!)
- [x] Settings panel (difficulty, theme, scale order)
- [x] Help overlay (? button)
- [x] Three themes: Clean, Dark, Warm
- [x] Progressive mastery tracking (silver → gold → master per scale)
- [x] Explicit state machine: Free Play / Training / Round Complete
- [x] Start/Stop button for training sessions
- [x] Session journal with per-round results table
- [x] Melody Mode: Guitar Hero-style driving perspective with 3D lane
- [x] 6 starter melodies (Ode to Joy, Twinkle Twinkle, Mary Had a Little Lamb, etc.)
- [x] Scoring with accuracy, streak multiplier, and S/A/B/C/D rating
- [x] Speed selector (Slow/Medium/Normal/Fast)
- [x] 3D gem notes with scrolling fret lines
- [x] Melody results in session journal
- [x] Play in any key (melodies encoded as scale degrees)
- [x] PWA with offline support

## Scale Trainer Enhancements
- [ ] Free mode: extended free play with heatmap of scale degrees played
- [ ] Minor scales (natural, harmonic, melodic)

## Chord Mode
- [ ] Chord progression trainer
- [ ] Classic progressions: I-IV-V-I, I-V-vi-IV, ii-V-I, 12-bar blues
- [ ] Display chord name + notes, user plays the chord
- [ ] Accept any voicing/inversion (match by pitch class set)
- [ ] Progression library: pop, jazz, classical, blues
- [ ] Free chord play: show chord name for whatever the user plays

## Circle of Fifths Mode
- [x] Visual SVG circle of fifths diagram with animated current position
- [x] Walk the circle: play each key's scale in order (C→G→D→...→Db)
- [x] Clean completion advances, dirty retries the same key
- [x] Progress persists to localStorage (resume after reload)
- [x] Walk completion celebration with retry stats
- [ ] Show relative minors
- [ ] Drill: random jumps around the circle

## Nice to Have
- [ ] Larger keyboard option (3–4 octaves) for MIDI users
- [ ] Note velocity visualization on key press
- [ ] Practice session history (localStorage)
- [ ] Daily streak / practice log
- [ ] Metronome overlay for tempo practice
- [ ] Sound options: piano, electric piano, organ
