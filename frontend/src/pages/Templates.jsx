import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { templateApi, workoutApi } from '../services/api';
import { LoadingCard, ErrorState } from '../components/UIStates';
import { 
  Copy, 
  Plus, 
  Trash2, 
  Edit, 
  Play, 
  FolderHeart,
  ChevronRight,
  Info,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Layers,
  FileText,
  Search,
  BookOpen,
  ArrowRight,
  X
} from 'lucide-react';

export default function Templates() {
  const navigate = useNavigate();

  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [systemTemplates, setSystemTemplates] = useState([]);
  const [userTemplates, setUserTemplates] = useState([]);
  const [autocompleteList, setAutocompleteList] = useState([]);

  // Active Tab: 'user' or 'system'
  const [activeTab, setActiveTab] = useState('user');

  // Builder state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null); // null means creating
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateNotes, setTemplateNotes] = useState('');
  const [builderExercises, setBuilderExercises] = useState([
    { id: 1, exercise: '', targetSets: 3, targetRepRange: '8-12' }
  ]);

  // Autocomplete state
  const [activeDropdownIdx, setActiveDropdownIdx] = useState(null);
  const dropdownRefs = useRef([]);

  // Toast alert
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success'); // 'success' or 'error'

  // Fetch templates & autocomplete exercises list
  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      
      const [templatesRes, exercisesRes] = await Promise.all([
        templateApi.getTemplates(),
        workoutApi.getExercises()
      ]);

      if (templatesRes.success && templatesRes.data) {
        setSystemTemplates(templatesRes.data.systemTemplates || []);
        setUserTemplates(templatesRes.data.userTemplates || []);
        // Default to system tab if user has no templates yet
        if (templatesRes.data.userTemplates && templatesRes.data.userTemplates.length === 0) {
          setActiveTab('system');
        } else {
          setActiveTab('user');
        }
      }

      if (exercisesRes.success && exercisesRes.data) {
        setAutocompleteList(exercisesRes.data);
      }
    } catch (err) {
      console.error('Failed to load templates metadata:', err);
      setError('Failed to reach backend server. Please verify that the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Show auto-expiring toast alert helper
  function triggerToast(message, type = 'success') {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }

  // Click outside autocomplete dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (activeDropdownIdx !== null) {
        const ref = dropdownRefs.current[activeDropdownIdx];
        if (ref && !ref.contains(event.target)) {
          setActiveDropdownIdx(null);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdownIdx]);

  // Client-side category detector for templates (Refinement 6)
  function detectCategory(name) {
    if (!name) return 'Strength';
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
    if (n.includes('squat') || n.includes('leg press') || n.includes('deadlift') || n.includes('lunge') || n.includes('calf') || n.includes('leg extension') || n.includes('leg curl')) {
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

  // Handle Quick Start (Start Workout) (Refinement 3 Usage Tracking)
  async function handleStartWorkout(templateId) {
    try {
      // Record usage statistics trigger
      await templateApi.recordTemplateUse(templateId);
    } catch (err) {
      console.error('Error tracking template usage:', err);
    }
    navigate(`/log-workout?templateId=${templateId}`);
  }

  // Handle Customize Template Flow (Refinement 1)
  function handleCustomizeTemplate(template) {
    setEditingTemplateId(null); // Save as new
    setTemplateName(`Custom ${template.name}`);
    setTemplateDesc(`Customized version of ${template.name}: ${template.description}`);
    setTemplateNotes(template.notes || '');
    
    const exercisesToLoad = template.exercises.map((ex, idx) => ({
      id: Date.now() + idx + Math.random(),
      exercise: ex.exercise,
      targetSets: ex.targetSets,
      targetRepRange: ex.targetRepRange
    }));

    setBuilderExercises(exercisesToLoad);
    setIsBuilderOpen(true);
    setActiveTab('user');
  }

  // Builder Open/Close helpers
  function handleOpenCreate() {
    setEditingTemplateId(null);
    setTemplateName('');
    setTemplateDesc('');
    setTemplateNotes('');
    setBuilderExercises([
      { id: Date.now(), exercise: '', targetSets: 3, targetRepRange: '8-12' }
    ]);
    setIsBuilderOpen(true);
  }

  function handleOpenEdit(template) {
    setEditingTemplateId(template._id);
    setTemplateName(template.name);
    setTemplateDesc(template.description || '');
    setTemplateNotes(template.notes || '');

    const exercisesToLoad = template.exercises.map((ex, idx) => ({
      id: Date.now() + idx + Math.random(),
      exercise: ex.exercise,
      targetSets: ex.targetSets,
      targetRepRange: ex.targetRepRange
    }));

    setBuilderExercises(exercisesToLoad);
    setIsBuilderOpen(true);
  }

  async function handleDeleteTemplate(id, e) {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this custom template?")) return;

    try {
      const res = await templateApi.deleteTemplate(id);
      if (res.success) {
        triggerToast("Template deleted successfully");
        setUserTemplates(prev => prev.filter(t => t._id !== id));
      }
    } catch (err) {
      console.error("Error deleting template:", err);
      triggerToast(err.response?.data?.message || "Failed to delete template.", "error");
    }
  }

  // Builder Form interactions
  function handleAddExercise() {
    setBuilderExercises(prev => [
      ...prev,
      { id: Date.now() + Math.random(), exercise: '', targetSets: 3, targetRepRange: '8-12' }
    ]);
  }

  function handleRemoveExercise(id) {
    if (builderExercises.length === 1) {
      setBuilderExercises([{ id: Date.now(), exercise: '', targetSets: 3, targetRepRange: '8-12' }]);
    } else {
      setBuilderExercises(prev => prev.filter(ex => ex.id !== id));
    }
  }

  function handleExerciseFieldChange(id, field, value) {
    setBuilderExercises(prev => prev.map(ex => {
      if (ex.id === id) {
        return { ...ex, [field]: value };
      }
      return ex;
    }));
  }

  async function handleSaveTemplate(e) {
    e.preventDefault();

    // Validations
    if (!templateName.trim()) {
      triggerToast("Template Name is required.", "error");
      return;
    }

    const filteredExercises = [];
    let hasInvalid = false;

    builderExercises.forEach((ex, idx) => {
      const exName = ex.exercise ? ex.exercise.trim() : '';
      if (!exName) {
        hasInvalid = true;
        return;
      }
      filteredExercises.push({
        exercise: exName,
        targetSets: Number(ex.targetSets) || 3,
        targetRepRange: ex.targetRepRange ? ex.targetRepRange.trim() : '8-12',
        category: detectCategory(exName),
        order: idx + 1
      });
    });

    if (hasInvalid || filteredExercises.length === 0) {
      triggerToast("All exercises must have a valid name.", "error");
      return;
    }

    const payload = {
      name: templateName.trim(),
      description: templateDesc.trim(),
      notes: templateNotes.trim(),
      exercises: filteredExercises
    };

    try {
      if (editingTemplateId) {
        // Update
        const res = await templateApi.updateTemplate(editingTemplateId, payload);
        if (res.success) {
          triggerToast("Template updated successfully");
          setUserTemplates(prev => prev.map(t => t._id === editingTemplateId ? res.data : t));
          setIsBuilderOpen(false);
        }
      } else {
        // Create new
        const res = await templateApi.createTemplate(payload);
        if (res.success) {
          triggerToast("Template created successfully");
          setUserTemplates(prev => [res.data, ...prev]);
          setIsBuilderOpen(false);
        }
      }
    } catch (err) {
      console.error("Error saving template:", err);
      triggerToast(err.response?.data?.message || "Error saving template.", "error");
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-5xl mx-auto animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-1/4"></div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-800 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <LoadingCard height="h-44" />
            <LoadingCard height="h-44" />
            <LoadingCard height="h-44" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <ErrorState
          title="Failed to Load Templates"
          message={error}
          onRetry={loadData}
        />
      </div>
    );
  }

  const activeTemplatesList = activeTab === 'user' ? userTemplates : systemTemplates;

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-5xl mx-auto relative">
      
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-4.5 py-3.5 rounded-xl border shadow-2xl flex items-center gap-2 max-w-sm animate-fadeIn ${
          toastType === 'success' 
            ? 'bg-success-custom/10 border-success-custom/30 text-success-custom' 
            : 'bg-danger-custom/10 border-danger-custom/25 text-danger-custom'
        }`}>
          {toastType === 'success' ? <CheckCircle className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Copy className="h-6 w-6 text-primary-accent" />
            Workout Templates & Saved Routines
          </h1>
          <p className="text-sm text-text-secondary">Save routine blueprints and skip manual setup when logging workouts.</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="bg-primary-accent text-black font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-primary-accent/90 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-primary-accent/15 self-start sm:self-center"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </div>

      {/* Navigation Tabs (User vs System) */}
      <div className="flex border-b border-gray-800 gap-6 text-sm">
        <button
          onClick={() => setActiveTab('user')}
          className={`pb-3.5 font-bold transition-all relative cursor-pointer ${
            activeTab === 'user' ? 'text-primary-accent' : 'text-text-secondary hover:text-white'
          }`}
        >
          My Custom Templates ({userTemplates.length})
          {activeTab === 'user' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-accent rounded-full animate-fadeIn" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`pb-3.5 font-bold transition-all relative cursor-pointer ${
            activeTab === 'system' ? 'text-primary-accent' : 'text-text-secondary hover:text-white'
          }`}
        >
          System Templates ({systemTemplates.length})
          {activeTab === 'system' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-accent rounded-full animate-fadeIn" />
          )}
        </button>
      </div>

      {/* Templates List Grid */}
      {activeTemplatesList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTemplatesList.map((template) => {
            const isSystem = !!template.isSystem;
            return (
              <div 
                key={template._id}
                className="bg-bg-card border border-gray-800 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-gray-700 transition-all relative overflow-hidden group shadow-lg shadow-black/20"
              >
                {/* Background glow overlay */}
                <div className="absolute top-0 right-0 w-24 h-24 opacity-5 bg-primary-accent rounded-full blur-xl pointer-events-none" />

                {/* Card Title & Header */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-extrabold text-white truncate max-w-[70%]" title={template.name}>
                      {template.name}
                    </h3>
                    
                    {isSystem ? (
                      <span className="text-[9px] bg-secondary-accent/15 border border-secondary-accent/30 text-secondary-accent font-mono font-bold px-2 py-0.5 rounded-full uppercase shrink-0">
                        System
                      </span>
                    ) : (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(template)}
                          className="p-1 text-text-secondary hover:text-white hover:bg-white/5 rounded transition-colors"
                          title="Edit Template"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteTemplate(template._id, e)}
                          className="p-1 text-text-secondary hover:text-danger-custom hover:bg-white/5 rounded transition-colors"
                          title="Delete Template"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed" title={template.description}>
                    {template.description || "No description provided."}
                  </p>
                </div>

                {/* Exercise Preview List */}
                <div className="bg-black/35 border border-gray-855 rounded-xl p-3.5 space-y-2.5 flex-grow">
                  <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider font-mono block">
                    Routine Exercises ({template.exercises.length})
                  </span>
                  <ul className="space-y-1 text-xs leading-normal">
                    {template.exercises.slice(0, 4).map((ex, idx) => (
                      <li key={idx} className="flex justify-between items-baseline gap-2 truncate text-text-secondary font-mono">
                        <span className="truncate font-semibold text-white/90">
                          {ex.exercise}
                        </span>
                        <span className="text-[10px] text-text-secondary/70 shrink-0">
                          {ex.targetSets} sets • {ex.targetRepRange} reps
                        </span>
                      </li>
                    ))}
                    {template.exercises.length > 4 && (
                      <li className="text-[10px] text-primary-accent font-bold pt-1 flex items-center gap-0.5 font-mono">
                        + {template.exercises.length - 4} more exercises
                        <ChevronRight className="h-3 w-3" />
                      </li>
                    )}
                  </ul>
                </div>

                {/* Notes reference if present */}
                {template.notes && (
                  <div className="text-[10px] text-text-secondary/70 leading-relaxed font-mono flex items-start gap-1 p-2 bg-black/10 rounded-lg">
                    <FileText className="h-3.5 w-3.5 text-text-secondary/50 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{template.notes}</span>
                  </div>
                )}

                {/* Card Usage details if user template */}
                {!isSystem && template.useCount > 0 && (
                  <div className="flex justify-between text-[10px] text-text-secondary/60 font-mono pl-0.5 border-t border-gray-850 pt-2.5">
                    <span>Used {template.useCount} times</span>
                    {template.lastUsedAt && (
                      <span>Last: {new Date(template.lastUsedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    )}
                  </div>
                )}

                {/* Card Actions */}
                <div className="flex gap-2.5 pt-2.5 border-t border-gray-850/80">
                  <button
                    onClick={() => handleStartWorkout(template._id)}
                    className="flex-1 bg-primary-accent text-black font-extrabold text-xs py-2 rounded-lg hover:bg-primary-accent/90 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-primary-accent/5"
                  >
                    <Play className="h-3 w-3 fill-black text-black" />
                    Start Workout
                  </button>
                  {isSystem && (
                    <button
                      onClick={() => handleCustomizeTemplate(template)}
                      className="flex-1 bg-bg-card border border-gray-800 text-white font-bold text-xs py-2 rounded-lg hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-primary-accent" />
                      Customize
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-bg-card border border-gray-800 rounded-2xl p-12 text-center text-xs text-text-secondary italic max-w-lg mx-auto space-y-4">
          <FolderHeart className="h-8 w-8 mx-auto text-text-secondary/40 animate-pulse" />
          <p>You haven't created any custom templates yet. Make your own templates to quickly preload your workouts, or head to the "System Templates" tab to copy or start from standard routines!</p>
        </div>
      )}

      {/* --- TEMPLATE BUILDER OVERLAY MODAL --- */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div 
            className="w-full max-w-xl bg-bg-card border border-gray-800 rounded-2xl p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <FolderHeart className="h-5 w-5 text-primary-accent" />
                {editingTemplateId ? "Edit Routine Template" : "Create Routine Template"}
              </h2>
              <button
                onClick={() => setIsBuilderOpen(false)}
                className="p-1.5 text-text-secondary hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-5">
              
              {/* Name & Desc inputs */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="template-name" className="text-xs font-semibold text-text-secondary">
                    Template Name
                  </label>
                  <input
                    id="template-name"
                    type="text"
                    placeholder="e.g. Upper Body Focus"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full bg-black/40 border border-gray-800 rounded-lg p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-primary-accent/70 transition-all"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="template-desc" className="text-xs font-semibold text-text-secondary">
                    Description (Optional)
                  </label>
                  <input
                    id="template-desc"
                    type="text"
                    placeholder="e.g. Targeting heavy rows and incline bench press variations"
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    className="w-full bg-black/40 border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary-accent/70 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="template-notes" className="text-xs font-semibold text-text-secondary">
                    Coaching Advice / Notes (Optional)
                  </label>
                  <textarea
                    id="template-notes"
                    rows={2}
                    placeholder="e.g. Leave 1-2 reps in reserve. Focus on chest contraction at lockouts."
                    value={templateNotes}
                    onChange={(e) => setTemplateNotes(e.target.value)}
                    className="w-full bg-black/40 border border-gray-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-primary-accent/70 transition-all leading-normal"
                  />
                </div>
              </div>

              {/* Exercises list builder */}
              <div className="space-y-3.5">
                <div className="flex justify-between items-center pb-2 border-b border-gray-850">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Exercises List
                  </span>
                </div>

                <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                  {builderExercises.map((ex, idx) => {
                    const category = detectCategory(ex.exercise);
                    return (
                      <div 
                        key={ex.id} 
                        className="bg-black/35 border border-gray-850 p-4 rounded-xl space-y-3 relative overflow-hidden"
                      >
                        <div className="flex justify-between items-center pb-2 border-b border-gray-855/50">
                          <span className="text-[10px] text-text-secondary font-bold font-mono">
                            Exercise {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveExercise(ex.id)}
                            className="p-1 text-text-secondary hover:text-danger-custom hover:bg-white/5 rounded transition-colors"
                            title="Remove Exercise"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                          
                          {/* Autocomplete Name */}
                          <div className="sm:col-span-2 space-y-1 relative" ref={el => dropdownRefs.current[idx] = el}>
                            <label className="text-[10px] text-text-secondary uppercase font-semibold">Exercise Name</label>
                            <input
                              type="text"
                              placeholder="Search / Type exercise..."
                              value={ex.exercise}
                              onChange={(e) => handleExerciseFieldChange(ex.id, 'exercise', e.target.value)}
                              onFocus={() => setActiveDropdownIdx(idx)}
                              className="w-full bg-black/40 border border-gray-800 rounded p-1.5 text-xs text-white focus:outline-none focus:border-primary-accent"
                              required
                            />
                            {/* Dropdown list */}
                            {activeDropdownIdx === idx && (
                              <div className="absolute z-50 left-0 right-0 mt-1 max-h-36 overflow-y-auto bg-bg-sidebar border border-gray-800 rounded shadow-xl text-[10px]">
                                {autocompleteList
                                  .filter(n => n.toLowerCase().includes(ex.exercise.toLowerCase()))
                                  .slice(0, 10)
                                  .map((name, nameIdx) => (
                                    <button
                                      type="button"
                                      key={nameIdx}
                                      onClick={() => {
                                        handleExerciseFieldChange(ex.id, 'exercise', name);
                                        setActiveDropdownIdx(null);
                                      }}
                                      className="w-full text-left px-2.5 py-2 hover:bg-white/5 hover:text-white transition-colors border-b border-gray-850/50 last:border-b-0 text-text-secondary font-medium"
                                    >
                                      {name}
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>

                          {/* Category detection */}
                          <div className="space-y-1 text-center">
                            <span className="text-[10px] text-text-secondary uppercase font-semibold block">Category</span>
                            <div className="bg-black/40 border border-gray-850 p-1.5 rounded text-[10px] font-bold text-secondary-accent tracking-wide font-mono">
                              {category}
                            </div>
                          </div>

                        </div>

                        {/* Sets & Rep Range Inputs */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1">
                            <label className="text-[10px] text-text-secondary uppercase font-semibold">Target Sets</label>
                            <input
                              type="number"
                              min="1"
                              value={ex.targetSets}
                              onChange={(e) => handleExerciseFieldChange(ex.id, 'targetSets', e.target.value)}
                              className="w-full bg-black/40 border border-gray-800 rounded p-1.5 text-xs text-center font-mono text-white focus:outline-none focus:border-primary-accent"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-text-secondary uppercase font-semibold">Rep Range Target</label>
                            <input
                              type="text"
                              value={ex.targetRepRange}
                              onChange={(e) => handleExerciseFieldChange(ex.id, 'targetRepRange', e.target.value)}
                              className="w-full bg-black/40 border border-gray-800 rounded p-1.5 text-xs text-center font-mono text-white focus:outline-none focus:border-primary-accent"
                              placeholder="e.g. 8-12"
                              required
                            />
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleAddExercise}
                  className="w-full border border-dashed border-gray-800/80 hover:border-gray-700/80 rounded-lg py-2 text-xs font-semibold text-text-secondary hover:text-white hover:bg-white/5 flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4 text-primary-accent" />
                  Add Exercise
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsBuilderOpen(false)}
                  className="flex-1 bg-bg-card border border-gray-800 text-white font-bold text-xs py-2.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary-accent text-black font-extrabold text-xs py-2.5 rounded-lg hover:bg-primary-accent/90 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  Save Template
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
