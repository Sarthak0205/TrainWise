import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { workoutApi, templateApi } from '../services/api';
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
  Activity,
  Copy,
  FolderOpen,
  Info,
  X
} from 'lucide-react';

export default function WorkoutLogger() {
  const navigate = useNavigate();
  const location = useLocation();

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
  const [saveResult, setSaveResult] = useState(null); 
  const [draftRestored, setDraftRestored] = useState(false);

  // Template preloading & Picker Modal states
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [templatesList, setTemplatesList] = useState({ systemTemplates: [], userTemplates: [] });
  const [selectedTemplateForPreview, setSelectedTemplateForPreview] = useState(null);
  
  // Draft protection modal
  const [isDraftProtectionOpen, setIsDraftProtectionOpen] = useState(false);
  const [pendingTemplateToLoad, setPendingTemplateToLoad] = useState(null);

  // Save As Template modal states
  const [isSaveAsTemplateOpen, setIsSaveAsTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplateNotes, setNewTemplateNotes] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Toast alert
  const [toastMessage, setToastMessage] = useState(null);

  // Dropdown ref for closing on click outside
  const dropdownRef = useRef({});

  // Trigger Toast helper
  function triggerToast(message) {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }

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

  // 2. Fetch templates list for picker modal
  async function fetchTemplates() {
    try {
      const res = await templateApi.getTemplates();
      if (res.success && res.data) {
        setTemplatesList(res.data);
      }
    } catch (err) {
      console.error('Error fetching templates list:', err);
    }
  }

  useEffect(() => {
    fetchTemplates();
  }, []);

  // 3. Draft persistence: restore draft on mount (ONLY if no templateId query param is present)
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const templateId = queryParams.get('templateId');

    if (templateId) {
      // Preload template from URL parameters
      handlePreloadTemplateFromId(templateId);
    } else {
      // Restore standard draft
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
    }
  }, [location.search]);

  // 4. Draft persistence: save draft on changes
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

  // Template Loading Implementation (Refinement 7 & 8)
  async function handlePreloadTemplateFromId(templateId) {
    try {
      const res = await templateApi.getTemplateById(templateId);
      if (res.success && res.data) {
        loadTemplateData(res.data);
        // Record template use
        await templateApi.recordTemplateUse(templateId);
      }
    } catch (err) {
      console.error('Error preloading template from ID:', err);
    }
  }

  function handleLoadTemplateClicked(template) {
    // If logger is not empty, trigger Draft Protection modal
    const hasUnsavedChanges = exercises.some(ex => ex.exercise.trim() !== '');
    if (hasUnsavedChanges) {
      setPendingTemplateToLoad(template);
      setIsDraftProtectionOpen(true);
    } else {
      loadTemplateData(template);
      recordUsageStatistics(template._id);
    }
    setIsTemplatePickerOpen(false);
  }

  async function recordUsageStatistics(id) {
    try {
      await templateApi.recordTemplateUse(id);
    } catch (err) {
      console.error('Failed to log template usage statistics:', err);
    }
  }

  function loadTemplateData(template, append = false) {
    const templateExercises = template.exercises.map((ex, idx) => {
      // Create empty sets based on targetSets count
      const sets = Array.from({ length: ex.targetSets }, () => ({ weight: '', reps: '' }));
      return {
        id: Date.now() + idx + Math.random(),
        exercise: ex.exercise,
        sets
      };
    });

    if (append) {
      setExercises(prev => [...prev.filter(ex => ex.exercise.trim() !== ''), ...templateExercises]);
      triggerToast(`Appended ${template.name} template!`);
    } else {
      setExercises(templateExercises);
      if (template.notes) {
        setNotes(prev => prev ? `${prev}\nNotes from template: ${template.notes}` : `Notes from template: ${template.notes}`);
      }
      triggerToast(`Loaded ${template.name} template!`);
    }

    // Trigger reference data fetching for preloaded movements
    template.exercises.forEach(ex => {
      triggerFetchReference(ex.exercise);
    });
  }

  // Draft Protection choices
  function handleReplaceDraft() {
    if (pendingTemplateToLoad) {
      loadTemplateData(pendingTemplateToLoad, false);
      recordUsageStatistics(pendingTemplateToLoad._id);
    }
    setIsDraftProtectionOpen(false);
    setPendingTemplateToLoad(null);
  }

  function handleAppendTemplate() {
    if (pendingTemplateToLoad) {
      loadTemplateData(pendingTemplateToLoad, true);
      recordUsageStatistics(pendingTemplateToLoad._id);
    }
    setIsDraftProtectionOpen(false);
    setPendingTemplateToLoad(null);
  }

  function handleCancelDraftProtection() {
    setIsDraftProtectionOpen(false);
    setPendingTemplateToLoad(null);
  }

  // Save As Template logic (Refinement 2)
  async function handleSaveAsTemplateSubmit(e) {
    e.preventDefault();
    if (!newTemplateName.trim()) {
      alert("Template Name is required.");
      return;
    }

    const templateExercises = exercises
      .filter(ex => ex.exercise.trim() !== '')
      .map((ex, idx) => ({
        exercise: ex.exercise.trim(),
        targetSets: ex.sets.length,
        targetRepRange: "8-12", // Default target rep range
        category: detectCategory(ex.exercise),
        order: idx + 1
      }));

    if (templateExercises.length === 0) {
      alert("At least one exercise is required to save a template.");
      return;
    }

    try {
      setSavingTemplate(true);
      const payload = {
        name: newTemplateName.trim(),
        description: newTemplateDesc.trim(),
        notes: newTemplateNotes.trim(),
        exercises: templateExercises
      };
      
      const res = await templateApi.createTemplate(payload);
      if (res.success) {
        triggerToast(`Template "${payload.name}" saved successfully!`);
        setIsSaveAsTemplateOpen(false);
        setNewTemplateName('');
        setNewTemplateDesc('');
        setNewTemplateNotes('');
        // Re-fetch templates to keep list updated
        fetchTemplates();
      }
    } catch (err) {
      console.error('Failed to save workout as template:', err);
      alert(err.response?.data?.message || 'Error saving template.');
    } finally {
      setSavingTemplate(false);
    }
  }

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

    // Client-Side Validations
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

    // Submit payload
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

  const hasExercisesToSaveAsTemplate = exercises.some(ex => ex.exercise.trim() !== '');

  // --- RENDERING CONFIRMATION SCREEN ---
  if (saveResult) {
    return (
      <div className="p-4 sm:p-8 max-w-lg mx-auto mt-12 animate-fadeIn">
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto relative">
      
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4.5 py-3 bg-success-custom/10 border border-success-custom/30 text-success-custom rounded-xl shadow-2xl flex items-center gap-2 max-w-sm animate-fadeIn">
          <Sparkles className="h-4 w-4 shrink-0 animate-pulse" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary-accent" />
            Daily Workout Logger
          </h1>
          <p className="text-sm text-text-secondary">Perform fast manual entries or load blueprints from saved templates.</p>
        </div>

        {/* Load Template Trigger Button */}
        <button
          type="button"
          onClick={() => {
            fetchTemplates();
            setIsTemplatePickerOpen(true);
          }}
          className="bg-primary-accent/10 border border-primary-accent/30 text-primary-accent font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-primary-accent/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-primary-accent/5 self-start sm:self-center"
        >
          <Copy className="h-4 w-4" />
          Load Template
        </button>
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
                className="w-full bg-black/40 border border-gray-800 rounded-lg p-2.5 text-sm font-medium text-white focus:outline-none focus:border-primary-accent/70 transition-all font-mono font-bold"
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
                    <span className="h-6 w-6 rounded-full bg-black/30 border border-gray-855 flex items-center justify-center text-xs font-bold text-text-secondary font-mono">
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
                        setTimeout(() => triggerFetchReference(ex.exercise), 200);
                      }}
                      placeholder="Type exercise (e.g. Bench Press)"
                      className="w-full bg-black/40 border border-gray-850 rounded-lg p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-primary-accent/70 transition-all"
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
            className="flex-1 bg-black/35 border border-gray-850 hover:border-gray-750 hover:bg-white/5 rounded-xl py-3 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 text-primary-accent" />
            Add Exercise Card
          </button>

          {/* Save As Template Button (Refinement 2) */}
          {hasExercisesToSaveAsTemplate && (
            <button
              type="button"
              onClick={() => setIsSaveAsTemplateOpen(true)}
              className="flex-1 bg-bg-card border border-gray-800 hover:border-gray-750 hover:bg-white/5 rounded-xl py-3.5 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Copy className="h-4 w-4 text-primary-accent" />
              Save As Template
            </button>
          )}

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

      {/* --- TEMPLATE PICKER MODAL (Refinement 7) --- */}
      {isTemplatePickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div 
            className="w-full max-w-xl bg-bg-card border border-gray-800 rounded-2xl p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-4 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                <FolderOpen className="h-5 w-5 text-primary-accent" />
                Preload Workout Blueprint
              </h2>
              <button
                onClick={() => {
                  setIsTemplatePickerOpen(false);
                  setSelectedTemplateForPreview(null);
                }}
                className="p-1.5 text-text-secondary hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Preview Panel is Open */}
            {selectedTemplateForPreview ? (
              <div className="space-y-5 animate-fadeIn">
                <div className="bg-black/30 border border-gray-850 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-855/50">
                    <div>
                      <h3 className="text-base font-bold text-white font-mono">{selectedTemplateForPreview.name}</h3>
                      <p className="text-xs text-text-secondary mt-0.5">{selectedTemplateForPreview.description || "No description provided."}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTemplateForPreview(null)}
                      className="text-xs text-secondary-accent hover:underline font-bold"
                    >
                      Back to list
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider font-mono block">
                      Routine Checklist ({selectedTemplateForPreview.exercises.length} Exercises)
                    </span>
                    <ul className="space-y-2 text-xs leading-normal">
                      {selectedTemplateForPreview.exercises.map((ex, idx) => (
                        <li key={idx} className="flex justify-between items-baseline gap-2 bg-black/20 p-2 rounded border border-gray-855/40 text-text-secondary font-mono">
                          <span className="font-bold text-white">{ex.exercise}</span>
                          <span className="text-[10px] text-text-secondary/80 shrink-0">
                            {ex.targetSets} sets × {ex.targetRepRange} reps
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedTemplateForPreview.notes && (
                    <div className="text-[10px] text-text-secondary/70 leading-relaxed font-mono flex items-start gap-1 p-2 bg-black/10 rounded-lg">
                      <Info className="h-4 w-4 text-text-secondary/50 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block">Template Notes:</span>
                        <span>{selectedTemplateForPreview.notes}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateForPreview(null)}
                    className="flex-1 bg-bg-card border border-gray-800 text-white font-bold text-xs py-2.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadTemplateClicked(selectedTemplateForPreview)}
                    className="flex-1 bg-primary-accent text-black font-extrabold text-xs py-2.5 rounded-lg hover:bg-primary-accent/90 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="h-4 w-4 text-black" />
                    Use Template
                  </button>
                </div>
              </div>
            ) : (
              // Templates Lists Selection
              <div className="space-y-6">
                
                {/* User Templates */}
                <div className="space-y-2.5">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider font-mono block border-b border-gray-850 pb-1">
                    My Blueprints ({templatesList.userTemplates.length})
                  </span>
                  {templatesList.userTemplates.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {templatesList.userTemplates.map((t) => (
                        <div 
                          key={t._id} 
                          onClick={() => setSelectedTemplateForPreview(t)}
                          className="bg-black/35 border border-gray-850 hover:border-gray-700 p-4 rounded-xl cursor-pointer transition-all hover:bg-white/5 text-left space-y-1.5"
                        >
                          <h4 className="text-xs font-bold text-white truncate">{t.name}</h4>
                          <span className="text-[9px] text-text-secondary font-mono block">
                            {t.exercises.length} Exercises • {t.exercises.reduce((s, ex) => s + ex.targetSets, 0)} Sets
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-secondary italic pl-1">No custom templates saved yet.</p>
                  )}
                </div>

                {/* System Templates */}
                <div className="space-y-2.5">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider font-mono block border-b border-gray-850 pb-1">
                    Built-in Routines ({templatesList.systemTemplates.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {templatesList.systemTemplates.map((t) => (
                      <div 
                        key={t._id} 
                        onClick={() => setSelectedTemplateForPreview(t)}
                        className="bg-black/35 border border-gray-850 hover:border-gray-700 p-4 rounded-xl cursor-pointer transition-all hover:bg-white/5 text-left space-y-1.5"
                      >
                        <h4 className="text-xs font-bold text-white truncate flex items-center justify-between gap-2">
                          {t.name}
                          <span className="text-[8px] bg-secondary-accent/15 border border-secondary-accent/20 text-secondary-accent px-1.5 py-0.5 rounded-full uppercase scale-90">System</span>
                        </h4>
                        <span className="text-[9px] text-text-secondary font-mono block">
                          {t.exercises.length} Exercises • {t.exercises.reduce((s, ex) => s + ex.targetSets, 0)} Sets
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* --- DRAFT PROTECTION PROMPT DIALOG (Refinement 8) --- */}
      {isDraftProtectionOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div 
            className="w-full max-w-md bg-bg-card border border-danger-custom/30 rounded-2xl p-6 space-y-6 shadow-2xl relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-12 w-12 rounded-full bg-danger-custom/10 border border-danger-custom/25 flex items-center justify-center text-danger-custom mx-auto mb-3">
              <AlertCircle className="h-6 w-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-white">Replace Current Draft?</h3>
              <p className="text-xs text-text-secondary leading-relaxed max-w-sm mx-auto">
                Your current workout logger sheet contains unsaved changes. Choose how you want to handle these exercises:
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleReplaceDraft}
                className="w-full bg-danger-custom text-white font-bold text-xs py-2.5 rounded-lg hover:bg-danger-custom/90 transition-colors cursor-pointer shadow-md"
              >
                Replace Current Draft (Discard)
              </button>
              <button
                type="button"
                onClick={handleAppendTemplate}
                className="w-full bg-secondary-accent hover:bg-secondary-accent/90 text-black font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Append Template to Bottom
              </button>
              <button
                type="button"
                onClick={handleCancelDraftProtection}
                className="w-full bg-black/40 border border-gray-800 text-white font-semibold text-xs py-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel / Keep Current Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SAVE AS TEMPLATE DIALOG MODAL (Refinement 2) --- */}
      {isSaveAsTemplateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div 
            className="w-full max-w-md bg-bg-card border border-gray-800 rounded-2xl p-6 space-y-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-4 border-b border-gray-800">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Copy className="h-4.5 w-4.5 text-primary-accent" />
                Save Workout Blueprint
              </h2>
              <button
                onClick={() => setIsSaveAsTemplateOpen(false)}
                className="p-1 text-text-secondary hover:text-white rounded hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAsTemplateSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary block">Template Name</label>
                <input
                  type="text"
                  placeholder="e.g. My Heavy Chest Day"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full bg-black/40 border border-gray-800 rounded-lg p-2.5 text-xs font-semibold text-white focus:outline-none focus:border-primary-accent"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary block">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Flat and incline benches with lateral raises"
                  value={newTemplateDesc}
                  onChange={(e) => setNewTemplateDesc(e.target.value)}
                  className="w-full bg-black/40 border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-primary-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary block">Coaching Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Leave 1-2 reps in reserve. Focus on eccentric contraction."
                  value={newTemplateNotes}
                  onChange={(e) => setNewTemplateNotes(e.target.value)}
                  className="w-full bg-black/40 border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-primary-accent leading-normal"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsSaveAsTemplateOpen(false)}
                  className="flex-1 bg-bg-card border border-gray-800 text-white font-semibold text-xs py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTemplate}
                  className="flex-1 bg-primary-accent text-black font-extrabold text-xs py-2 rounded-lg hover:bg-primary-accent/90 transition-all cursor-pointer flex items-center justify-center"
                >
                  {savingTemplate ? 'Saving Blueprint...' : 'Save Blueprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
