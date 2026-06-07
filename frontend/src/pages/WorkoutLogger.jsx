import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { workoutApi } from '../services/api';
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  Calendar, 
  ArrowRight, 
  RefreshCw, 
  TrendingUp, 
  Sparkles,
  Search,
  BookOpen,
  Trophy,
  Activity
} from 'lucide-react';

export default function WorkoutLogger() {
  const navigate = useNavigate();

  // Core state
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState('append'); // 'append' or 'replace'
  const [exercises, setExercises] = useState([
    {
      id: 1,
      exercise: '',
      sets: [{ weight: '', reps: '' }]
    }
  ]);

  // Autocomplete and reference caching states
  const [availableExercises, setAvailableExercises] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null); // { exerciseId }
  const [refDataCache, setRefDataCache] = useState({}); // { [exerciseName]: { lastSession, previousBest } }
  
  // UI states
  const [loadingAutocomplete, setLoadingAutocomplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [saveResult, setSaveResult] = useState(null); // { exercisesCount, setsCount, volume }
  const [draftRestored, setDraftRestored] = useState(false);

  // Dropdown ref for closing on click outside
  const dropdownRef = useRef({});

  // 1. Fetch autocomplete exercise list on mount
  useEffect(() => {
    async function fetchAutocomplete() {
      try {
        setLoadingAutocomplete(true);
        const res = await workoutApi.getExercises();
        if (res.success && res.data) {
          setAvailableExercises(res.data);
        }
      } catch (err) {
        console.error('Error fetching autocomplete list:', err);
      } finally {
        setLoadingAutocomplete(false);
      }
    }
    fetchAutocomplete();
  }, []);

  // 2. Draft persistence: restore draft on mount
  useEffect(() => {
    const draftStr = localStorage.getItem('workoutDraft');
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        if (draft.date) setDate(draft.date);
        if (draft.notes) setNotes(draft.notes);
        if (draft.mode) setMode(draft.mode);
        if (draft.exercises && Array.isArray(draft.exercises) && draft.exercises.length > 0) {
          setExercises(draft.exercises);
        }
        setDraftRestored(true);
        // Automatically fetch reference data for loaded exercises
        draft.exercises.forEach(ex => {
          if (ex.exercise) {
            triggerFetchReference(ex.exercise);
          }
        });

        // Hide alert after 5 seconds
        const timer = setTimeout(() => {
          setDraftRestored(false);
        }, 5000);
        return () => clearTimeout(timer);
      } catch (err) {
        console.error('Failed to parse autosave draft:', err);
      }
    }
  }, []);

  // 3. Draft persistence: save draft on changes
  useEffect(() => {
    if (!saveResult) {
      const sessionData = { date, notes, mode, exercises };
      localStorage.setItem('workoutDraft', JSON.stringify(sessionData));
    }
  }, [date, notes, mode, exercises, saveResult]);

  // Click outside autocomplete dropdown handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (activeDropdown !== null) {
        const currentRef = dropdownRef.current[activeDropdown];
        if (currentRef && !currentRef.contains(event.target)) {
          setActiveDropdown(null);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  // Client-side category detector (Refinement 6)
  function detectCategory(name) {
    if (!name) return 'Uncategorized';
    const n = name.trim().toLowerCase();
    
    if (n.includes('row') || n.includes('pull') && !n.includes('pulldown') && !n.includes('pull up') && !n.includes('push')) {
      return 'Horizontal Pull';
    }
    if (n.includes('pulldown') || n.includes('pull up') || n.includes('chin up')) {
      return 'Vertical Pull';
    }
    if (n.includes('bench') || n.includes('press') || n.includes('push') || n.includes('dip')) {
      return 'Push';
    }
    if (n.includes('squat') || n.includes('leg press') || n.includes('deadlift') || n.includes('lunge') || n.includes('calf') || n.includes('hamstring') || n.includes('quad')) {
      return 'Legs';
    }
    if (n.includes('shoulder') || n.includes('lateral raise') || n.includes('shrug')) {
      return 'Shoulders';
    }
    if (n.includes('curl')) {
      return 'Pull (Isolation)';
    }
    if (n.includes('extension') || n.includes('fly')) {
      return 'Push (Isolation)';
    }
    return 'Strength';
  }

  // Fetch reference data for exercise
  async function triggerFetchReference(exerciseName) {
    if (!exerciseName) return;
    const trimmed = exerciseName.trim();
    if (refDataCache[trimmed]) return; // already cached

    try {
      const res = await workoutApi.getExerciseReference(trimmed);
      if (res.success && res.data) {
        setRefDataCache(prev => ({
          ...prev,
          [trimmed]: res.data
        }));
      }
    } catch (err) {
      console.error(`Error fetching reference data for "${trimmed}":`, err);
    }
  }

  // Live Summary metrics
  const summary = (() => {
    let exercisesCount = exercises.length;
    let setsCount = 0;
    let volume = 0;

    exercises.forEach(ex => {
      if (ex.sets && Array.isArray(ex.sets)) {
        setsCount += ex.sets.length;
        ex.sets.forEach(set => {
          const w = Number(set.weight) || 0;
          const r = Number(set.reps) || 0;
          volume += w * r;
        });
      }
    });

    return { exercisesCount, setsCount, volume };
  })();

  // Exercise card event handlers
  function handleAddExercise() {
    setExercises(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        exercise: '',
        sets: [{ weight: '', reps: '' }]
      }
    ]);
  }

  function handleRemoveExercise(id) {
    if (exercises.length === 1) {
      // Keep at least one exercise structure
      setExercises([
        {
          id: Date.now(),
          exercise: '',
          sets: [{ weight: '', reps: '' }]
        }
      ]);
    } else {
      setExercises(prev => prev.filter(ex => ex.id !== id));
    }
  }

  function handleExerciseNameChange(id, value) {
    setExercises(prev => prev.map(ex => {
      if (ex.id === id) {
        return { ...ex, exercise: value };
      }
      return ex;
    }));
    setActiveDropdown(id);
  }

  function handleExerciseSelect(id, name) {
    setExercises(prev => prev.map(ex => {
      if (ex.id === id) {
        return { ...ex, exercise: name };
      }
      return ex;
    }));
    setActiveDropdown(null);
    triggerFetchReference(name);
  }

  function handleAddSet(exerciseId) {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        // Helpful default: duplicate weight/reps of the last set if available
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet = lastSet 
          ? { weight: lastSet.weight, reps: lastSet.reps }
          : { weight: '', reps: '' };
        return {
          ...ex,
          sets: [...ex.sets, newSet]
        };
      }
      return ex;
    }));
  }

  function handleRemoveSet(exerciseId, setIdx) {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        const updatedSets = [...ex.sets];
        updatedSets.splice(setIdx, 1);
        return {
          ...ex,
          sets: updatedSets.length > 0 ? updatedSets : [{ weight: '', reps: '' }]
        };
      }
      return ex;
    }));
  }

  function handleSetChange(exerciseId, setIdx, field, value) {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        const updatedSets = ex.sets.map((set, idx) => {
          if (idx === setIdx) {
            return { ...set, [field]: value };
          }
          return set;
        });
        return { ...ex, sets: updatedSets };
      }
      return ex;
    }));
  }

  // Form Submission
  async function handleSaveWorkout(e) {
    e.preventDefault();
    setValidationErrors([]);

    // 1. Client-Side Validations
    const errors = [];
    if (!date) {
      errors.push("Workout date is required.");
    }

    const filteredExercises = [];
    exercises.forEach((ex, idx) => {
      const name = ex.exercise ? ex.exercise.trim() : '';
      if (!name) {
        errors.push(`Exercise ${idx + 1}: Name is required.`);
        return;
      }

      const validSets = [];
      ex.sets.forEach((set, sIdx) => {
        const w = Number(set.weight);
        const r = Number(set.reps);

        if (set.weight === '' || set.weight === null || isNaN(w) || w < 0) {
          errors.push(`Exercise "${name}": Set ${sIdx + 1} weight must be a valid number >= 0.`);
        }
        if (set.reps === '' || set.reps === null || isNaN(r) || r < 1) {
          errors.push(`Exercise "${name}": Set ${sIdx + 1} reps must be at least 1.`);
        }

        validSets.push({ weight: w, reps: r });
      });

      filteredExercises.push({
        exercise: name,
        sets: validSets
      });
    });

    if (filteredExercises.length === 0) {
      errors.push("You must log at least one valid exercise.");
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 2. Submit payload
    try {
      setSaving(true);
      const payload = {
        date,
        notes,
        exercises: filteredExercises
      };
      const res = await workoutApi.saveWorkoutSession(payload, mode);

      if (res.success) {
        // Clear local storage draft
        localStorage.removeItem('workoutDraft');
        setSaveResult({
          exercisesCount: res.summary.exercisesCount,
          setsCount: res.summary.setsCount,
          volume: res.summary.volume
        });
      } else {
        setValidationErrors([res.message || "An error occurred while saving."]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error("Save workout error:", err);
      const errMsg = err.response?.data?.errors 
        ? err.response.data.errors.join(", ") 
        : err.response?.data?.message || "Failed to connect to the backend server. Verify the server is running.";
      setValidationErrors([errMsg]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  // Reset to log another workout
  function handleLogAnother() {
    setExercises([
      {
        id: Date.now(),
        exercise: '',
        sets: [{ weight: '', reps: '' }]
      }
    ]);
    setNotes('');
    setMode('append');
    setSaveResult(null);
    setValidationErrors([]);
  }

  // --- RENDERING CONFIRMATION SCREEN ---
  if (saveResult) {
    return (
      <div className="p-4 sm:p-8 max-w-lg mx-auto mt-12">
        <div className="bg-bg-card border border-primary-accent/30 rounded-2xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 opacity-15 bg-primary-accent rounded-full blur-2xl pointer-events-none" />
          
          <div className="h-16 w-16 bg-primary-accent/15 border border-primary-accent/30 rounded-full flex items-center justify-center mx-auto text-primary-accent shadow-lg shadow-primary-accent/10">
            <Check className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Workout Saved ✅</h1>
            <p className="text-sm text-text-secondary">Your training metrics have been fed to the intelligence layer.</p>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-black/40 border border-gray-850 p-4.5 rounded-xl text-center">
            <div>
              <span className="text-[9px] text-text-secondary uppercase font-mono tracking-wider font-semibold block">Exercises</span>
              <span className="text-lg font-bold text-white mt-1 block">{saveResult.exercisesCount}</span>
            </div>
            <div>
              <span className="text-[9px] text-text-secondary uppercase font-mono tracking-wider font-semibold block">Total Sets</span>
              <span className="text-lg font-bold text-white mt-1 block">{saveResult.setsCount}</span>
            </div>
            <div>
              <span className="text-[9px] text-text-secondary uppercase font-mono tracking-wider font-semibold block">Volume</span>
              <span className="text-sm font-bold text-primary-accent font-mono mt-1.5 block">{saveResult.volume.toLocaleString()} kg</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto bg-primary-accent text-black font-bold text-sm px-6 py-3 rounded-xl hover:bg-primary-accent/90 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-primary-accent/15"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={handleLogAnother}
              className="w-full sm:w-auto bg-bg-card border border-gray-800 text-white font-bold text-sm px-5 py-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="h-4 w-4" />
              Log Another Workout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN LOGGER LAYOUT ---
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary-accent" />
          Daily Workout Logger
        </h1>
        <p className="text-sm text-text-secondary">Perform fast manual entries. Overload suggestions, readiness calculations, and personal records update instantly.</p>
      </div>

      {/* Draft Restored Banner */}
      {draftRestored && (
        <div className="bg-success-custom/10 border border-success-custom/30 text-success-custom p-3.5 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <Sparkles className="h-4.5 w-4.5 text-success-custom animate-pulse" />
          <div>
            <span className="font-bold">Draft Restored</span> — Your session draft has been loaded from your local device.
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-danger-custom/10 border border-danger-custom/25 text-danger-custom p-4 rounded-xl space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span>Please correct the following errors before saving:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Live Summary Panel (Sticks to top/card style) */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-4.5 flex flex-wrap gap-4 items-center justify-between shadow-md">
        <div>
          <span className="text-[10px] text-text-secondary uppercase tracking-widest font-mono font-bold block">Live Session Preview</span>
          <span className="text-xs text-text-secondary mt-0.5 block">Review aggregate workload totals.</span>
        </div>
        <div className="flex gap-6 items-center">
          <div className="text-right">
            <span className="text-[10px] text-text-secondary block font-mono">EXERCISES</span>
            <span className="font-bold text-white text-sm">{summary.exercisesCount}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-text-secondary block font-mono">TOTAL SETS</span>
            <span className="font-bold text-white text-sm">{summary.setsCount}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-text-secondary block font-mono">EST. VOLUME</span>
            <span className="font-bold text-primary-accent text-sm font-mono">{summary.volume.toLocaleString()} kg</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveWorkout} className="space-y-6">
        
        {/* Section 1 – Session Builder Details Card */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-5.5 space-y-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 opacity-5 bg-primary-accent rounded-full blur-3xl pointer-events-none" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5 pb-2 border-b border-gray-800/80">
            Today's Workout
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Workout Date */}
            <div className="space-y-1.5">
              <label htmlFor="workout-date" className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-text-secondary" />
                Workout Date
              </label>
              <input
                id="workout-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-black/40 border border-gray-800 rounded-lg p-2.5 text-sm font-medium text-white focus:outline-none focus:border-primary-accent/70 transition-all font-mono"
                required
              />
            </div>

            {/* Save Mode Strategy */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-text-secondary block">
                Session Strategy
              </span>
              <div className="flex bg-black/40 border border-gray-800 p-1.5 rounded-lg gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setMode('append')}
                  className={`flex-1 py-1.5 px-3 rounded font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'append'
                      ? 'bg-primary-accent text-black shadow-sm'
                      : 'text-text-secondary hover:text-white'
                  }`}
                >
                  Append Sets (Default)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('replace')}
                  className={`flex-1 py-1.5 px-3 rounded font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'replace'
                      ? 'bg-danger-custom text-white shadow-sm'
                      : 'text-text-secondary hover:text-white'
                  }`}
                >
                  Replace Session
                </button>
              </div>
              <p className="text-[10px] text-text-secondary/70 leading-normal pl-1">
                {mode === 'append' 
                  ? 'If a session exists, new sets are appended safely. Preserves your existing workouts.' 
                  : 'Overwrites existing logged workouts on this date for a fresh save.'
                }
              </p>
            </div>
          </div>

          {/* Session Notes */}
          <div className="space-y-1.5">
            <label htmlFor="workout-notes" className="text-xs font-semibold text-text-secondary block">
              Session Notes / Reflections (Optional)
            </label>
            <textarea
              id="workout-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did training go? Soreness, energy, fatigue observations..."
              className="w-full bg-black/40 border border-gray-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-primary-accent/70 transition-all leading-normal"
            />
          </div>
        </div>

        {/* Exercises Area */}
        <div className="space-y-6">
          {exercises.map((ex, exIdx) => {
            const category = detectCategory(ex.exercise);
            const refData = refDataCache[ex.exercise.trim()];

            return (
              <div 
                key={ex.id} 
                className="bg-bg-card border border-gray-800 rounded-xl p-5.5 space-y-4 relative overflow-hidden"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-gray-850">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="h-6 w-6 rounded-full bg-black/30 border border-gray-850 flex items-center justify-center text-xs font-bold text-text-secondary font-mono">
                      {exIdx + 1}
                    </span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Exercise Block
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(ex.id)}
                    className="text-xs text-text-secondary hover:text-danger-custom font-bold flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5 transition-colors cursor-pointer self-end sm:self-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove Exercise
                  </button>
                </div>

                {/* Form Row: Autocomplete Search Input */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                  
                  {/* Name search field */}
                  <div className="md:col-span-2 space-y-1.5 relative" ref={el => dropdownRef.current[ex.id] = el}>
                    <label htmlFor={`ex-name-${ex.id}`} className="text-xs font-semibold text-text-secondary flex items-center gap-1">
                      <Search className="h-3.5 w-3.5" />
                      Exercise Name
                    </label>
                    <input
                      id={`ex-name-${ex.id}`}
                      type="text"
                      value={ex.exercise}
                      onChange={(e) => handleExerciseNameChange(ex.id, e.target.value)}
                      onFocus={() => {
                        setActiveDropdown(ex.id);
                        if (ex.exercise) triggerFetchReference(ex.exercise);
                      }}
                      onBlur={() => {
                        // Delay reference fetch slightly to allow name value updates
                        setTimeout(() => triggerFetchReference(ex.exercise), 200);
                      }}
                      placeholder="Type exercise (e.g. Bench Press)"
                      className="w-full bg-black/40 border border-gray-800 rounded-lg p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-primary-accent/70 transition-all"
                      required
                    />

                    {/* Autocomplete Dropdown */}
                    {activeDropdown === ex.id && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-bg-sidebar border border-gray-800 rounded-lg shadow-2xl text-xs">
                        {loadingAutocomplete ? (
                          <div className="p-3 text-text-secondary italic">Loading exercises autocomplete...</div>
                        ) : (
                          (() => {
                            const filtered = availableExercises.filter(name => 
                              name.toLowerCase().includes(ex.exercise.toLowerCase())
                            );
                            if (filtered.length === 0) {
                              return (
                                <div className="p-3 text-text-secondary italic">
                                  No matches. Press Tab/Enter to use custom exercise.
                                </div>
                              );
                            }
                            return filtered.map((name, idx) => (
                              <button
                                type="button"
                                key={idx}
                                onClick={() => handleExerciseSelect(ex.id, name)}
                                className="w-full text-left px-3.5 py-2.5 hover:bg-white/5 hover:text-white transition-colors border-b border-gray-850/50 last:border-b-0 text-text-secondary font-medium"
                              >
                                {name}
                              </button>
                            ));
                          })()
                        )}
                      </div>
                    )}
                  </div>

                  {/* Auto-detected Category Indicator */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-text-secondary block">
                      Category (Auto-Detected)
                    </span>
                    <div className="bg-black/20 border border-gray-850 rounded-lg p-2.5 text-sm font-bold text-secondary-accent text-center tracking-wide font-mono">
                      {category}
                    </div>
                  </div>

                </div>

                {/* References Block (Refinement 3) */}
                {ex.exercise.trim() !== '' && (
                  <div className="bg-black/30 border border-gray-855 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Last Session Reference */}
                    <div className="space-y-1 border-r border-gray-855/50 pr-2">
                      <span className="text-[9px] text-text-secondary font-semibold uppercase tracking-wider font-mono flex items-center gap-1">
                        <BookOpen className="h-3 w-3 text-text-secondary" />
                        Last Session Performance
                      </span>
                      {refData?.lastSession ? (
                        <div className="space-y-1 pt-1 font-mono">
                          <div className="text-[10px] text-text-secondary">
                            Date: {new Date(refData.lastSession.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="flex flex-wrap gap-x-2.5 gap-y-1 font-semibold text-white/95 text-xs">
                            {refData.lastSession.sets.map((set, sIdx) => (
                              <span key={sIdx} className="bg-black/30 px-1.5 py-0.5 rounded border border-gray-850/40">
                                {set.weight}kg × {set.reps}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-text-secondary italic pt-1 text-[11px]">No previous sessions logged.</div>
                      )}
                    </div>

                    {/* Previous Best (PR) Reference */}
                    <div className="space-y-1">
                      <span className="text-[9px] text-warning-custom font-semibold uppercase tracking-wider font-mono flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-warning-custom" />
                        All-Time Best Set (Est 1RM)
                      </span>
                      {refData?.previousBest ? (
                        <div className="pt-1 flex justify-between items-baseline font-mono">
                          <span className="font-bold text-white text-xs">
                            {refData.previousBest.weight}kg × {refData.previousBest.reps}
                          </span>
                          <span className="text-[10px] text-primary-accent font-semibold">
                            Est 1RM: {refData.previousBest.est1RM}kg
                          </span>
                        </div>
                      ) : (
                        <div className="text-text-secondary italic pt-1 text-[11px]">No records achieved yet.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sets List Table / Rows */}
                <div className="space-y-2.5">
                  <span className="text-xs font-semibold text-text-secondary block pl-0.5">
                    Exercise Set Rows
                  </span>
                  
                  <div className="space-y-2">
                    {ex.sets.map((set, setIdx) => (
                      <div 
                        key={setIdx} 
                        className="flex gap-2.5 items-center bg-black/15 p-2 rounded-lg border border-gray-850/60"
                      >
                        {/* Set Index */}
                        <span className="text-xs font-bold text-text-secondary w-12 text-center font-mono bg-black/40 py-1 rounded">
                          Set {setIdx + 1}
                        </span>

                        {/* Weight input */}
                        <div className="flex-1 flex items-center gap-1.5">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Weight"
                            value={set.weight}
                            onChange={(e) => handleSetChange(ex.id, setIdx, 'weight', e.target.value)}
                            className="w-full bg-black/30 border border-gray-800 rounded p-1.5 text-xs text-center font-semibold text-white focus:outline-none focus:border-primary-accent font-mono"
                            required
                          />
                          <span className="text-[10px] text-text-secondary font-mono shrink-0">kg</span>
                        </div>

                        {/* Reps input */}
                        <div className="flex-1 flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            placeholder="Reps"
                            value={set.reps}
                            onChange={(e) => handleSetChange(ex.id, setIdx, 'reps', e.target.value)}
                            className="w-full bg-black/30 border border-gray-800 rounded p-1.5 text-xs text-center font-semibold text-white focus:outline-none focus:border-primary-accent font-mono"
                            required
                          />
                          <span className="text-[10px] text-text-secondary font-mono shrink-0">reps</span>
                        </div>

                        {/* Remove set button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveSet(ex.id, setIdx)}
                          className="p-1.5 text-text-secondary hover:text-danger-custom rounded hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                          title="Remove Set"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddSet(ex.id)}
                    className="w-full border border-dashed border-gray-800/80 hover:border-gray-700/80 rounded-lg py-2.5 text-xs font-semibold text-text-secondary hover:text-white hover:bg-white/5 flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Set row
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Controls */}
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          {/* Add Exercise Button */}
          <button
            type="button"
            onClick={handleAddExercise}
            className="flex-1 bg-black/35 border border-gray-800 hover:border-gray-700 hover:bg-white/5 rounded-xl py-3 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 text-primary-accent" />
            Add Exercise Card
          </button>

          {/* Primary CTA Save Workout */}
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-primary-accent text-black font-extrabold text-xs py-3.5 rounded-xl hover:bg-primary-accent/90 disabled:bg-gray-800 disabled:text-text-secondary disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-primary-accent/15"
          >
            {saving ? (
              <>
                <Activity className="h-4 w-4 animate-spin text-black" />
                Saving Workout Session...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 text-black" />
                Save Workout
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
