import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dailyLogApi, coachingApi } from '../services/api';
import { 
  ClipboardCheck, 
  BrainCircuit, 
  Activity, 
  Calendar, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Trash2,
  Undo2,
  Scale,
  Smile,
  Zap,
  Moon,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { LoadingCard } from '../components/UIStates';

export default function DailyLog() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recentLogs, setRecentLogs] = useState([]);
  const [todaysLog, setTodaysLog] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [sleep, setSleep] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [soreness, setSoreness] = useState(3);
  const [stress, setStress] = useState(3);
  const [mood, setMood] = useState(3);
  const [bodyweight, setBodyweight] = useState('');
  const [trainingDay, setTrainingDay] = useState(true);
  const [notes, setNotes] = useState('');

  // Is today skipped?
  const [isSkipped, setIsSkipped] = useState(false);

  const getLocalDateString = () => {
    return new Date().toISOString().split('T')[0];
  };

  const loadDailyLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const localToday = getLocalDateString();
      
      // Check skipped state
      const skipped = localStorage.getItem(`skipped_checkin_${localToday}`);
      setIsSkipped(!!skipped);

      const [todayRes, recentRes] = await Promise.all([
        dailyLogApi.getTodaysLog(localToday),
        dailyLogApi.getRecentLogs()
      ]);

      if (todayRes.success && todayRes.data) {
        setTodaysLog(todayRes.data);
        // Load today's values as defaults
        loadLogIntoForm(todayRes.data);
      } else {
        setTodaysLog(null);
        resetFormToDefault();
      }

      if (recentRes.success) {
        setRecentLogs(recentRes.data);
      }
    } catch (err) {
      console.error('Error loading logs:', err);
      setError('Failed to retrieve recovery data. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDailyLogs();
  }, []);

  const resetFormToDefault = () => {
    setDate(getLocalDateString());
    setSleep(3);
    setEnergy(3);
    setSoreness(3);
    setStress(3);
    setMood(3);
    setBodyweight('');
    setTrainingDay(true);
    setNotes('');
  };

  const loadLogIntoForm = (log) => {
    setDate(new Date(log.date).toISOString().split('T')[0]);
    setSleep(log.sleep);
    setEnergy(log.energy);
    setSoreness(log.soreness);
    setStress(log.stress);
    setMood(log.mood);
    setBodyweight(log.bodyweight || '');
    setTrainingDay(log.trainingDay);
    setNotes(log.notes || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    const logPayload = {
      date,
      sleep,
      energy,
      soreness,
      stress,
      mood,
      bodyweight: bodyweight ? Number(bodyweight) : undefined,
      trainingDay,
      notes
    };

    try {
      const res = await dailyLogApi.createOrUpdateLog(logPayload);
      if (res.success) {
        setMessage({ type: 'success', text: 'Daily Check-In saved successfully!' });
        
        // Remove skip tag if they decided to log today
        const localToday = getLocalDateString();
        if (date === localToday) {
          localStorage.removeItem(`skipped_checkin_${localToday}`);
          setIsSkipped(false);
        }

        // Reload lists
        await loadDailyLogs();
      } else {
        setError(res.message || 'Failed to submit log entry.');
      }
    } catch (err) {
      console.error('Submission error:', err);
      setError('An error occurred during submission. Please try again.');
    } finally {
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSkipToday = () => {
    const localToday = getLocalDateString();
    localStorage.setItem(`skipped_checkin_${localToday}`, 'true');
    setIsSkipped(true);
    setMessage({ type: 'info', text: "Today's check-in has been skipped. The dashboard will display standard coaching guidance." });
  };

  const handleUndoSkip = () => {
    const localToday = getLocalDateString();
    localStorage.removeItem(`skipped_checkin_${localToday}`);
    setIsSkipped(false);
    setMessage(null);
  };

  const getLogPreviewLabel = (score) => {
    if (score >= 85) return { text: 'Strong Signals', color: 'text-primary-accent border-primary-accent/30 bg-primary-accent/5' };
    if (score >= 65) return { text: 'Positive Signals', color: 'text-secondary-accent border-secondary-accent/30 bg-secondary-accent/5' };
    if (score >= 45) return { text: 'Neutral Signals', color: 'text-warning-custom border-warning-custom/30 bg-warning-custom/5' };
    if (score >= 25) return { text: 'Attention Recommended', color: 'text-danger-custom border-danger-custom/30 bg-danger-custom/5' };
    return { text: 'Attention High', color: 'text-red-400 border-red-500/30 bg-red-500/5' };
  };

  const getOptionColor = (val, isNegativeMetric = false) => {
    if (isNegativeMetric) {
      if (val <= 2) return 'bg-primary-accent text-black font-bold';
      if (val === 3) return 'bg-warning-custom text-black font-bold';
      return 'bg-danger-custom text-white font-bold';
    } else {
      if (val <= 2) return 'bg-danger-custom text-white font-bold';
      if (val === 3) return 'bg-warning-custom text-black font-bold';
      return 'bg-primary-accent text-black font-bold';
    }
  };

  // 1-5 Descriptive scales
  const scales = {
    sleep: ['Poor', 'Restless', 'Average', 'Good', 'Excellent'],
    energy: ['Fatigued', 'Low', 'Moderate', 'High', 'Unstoppable'],
    soreness: ['None', 'Mild', 'Moderate', 'Sore', 'Stiff/Very Sore'],
    stress: ['Very Low', 'Relaxed', 'Moderate', 'Elevated', 'High/Overwhelmed'],
    mood: ['Apathetic', 'Low', 'Balanced', 'Happy', 'Excellent']
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-8 space-y-6 max-w-4xl mx-auto">
        <LoadingCard />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ClipboardCheck className="h-6 w-6 text-primary-accent" />
            Daily Recovery Check-In
          </h1>
          <p className="text-sm text-text-secondary">
            Provide daily recovery signals in under 60 seconds to personalize coaching recommendations.
          </p>
        </div>
      </div>

      {/* Alert Notifications */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm ${
          message.type === 'success' ? 'bg-primary-accent/10 border-primary-accent/30 text-primary-accent' : 'bg-secondary-accent/10 border-secondary-accent/30 text-secondary-accent'
        }`}>
          <div className="flex items-center gap-2.5">
            {message.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <InfoIcon className="h-5 w-5 shrink-0" />}
            <span>{message.text}</span>
          </div>
          {isSkipped && (
            <button 
              onClick={handleUndoSkip}
              className="flex items-center gap-1 text-xs underline font-bold text-white hover:text-secondary-accent cursor-pointer"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo Skip
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="bg-danger-custom/10 border border-danger-custom/30 text-danger-custom p-4 rounded-xl text-xs sm:text-sm flex items-center gap-2.5">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Check-In Form & Context Display */}
        <div className="lg:col-span-2 space-y-6">
          
          {isSkipped ? (
            <div className="bg-bg-card border border-gray-800 rounded-2xl p-8 text-center space-y-4 shadow-xl">
              <Calendar className="h-12 w-12 text-text-secondary mx-auto opacity-50" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Today's Check-In Skipped</h3>
                <p className="text-sm text-text-secondary max-w-sm mx-auto">
                  You skipped logging recovery metrics today. You can still complete it anytime to personalize your readiness score.
                </p>
              </div>
              <button
                onClick={handleUndoSkip}
                className="bg-primary-accent text-black text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-primary-accent/90 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow"
              >
                Complete Daily Log
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-bg-card border border-gray-800 rounded-2xl p-6 space-y-6 shadow-xl relative">
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5 bg-primary-accent rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-primary-accent" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    {date === getLocalDateString() ? "Today's Recovery Log" : `Edit Log: ${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  </h2>
                </div>
                {date === getLocalDateString() && (
                  <button
                    type="button"
                    onClick={handleSkipToday}
                    className="text-xs text-text-secondary hover:text-danger-custom transition-colors cursor-pointer select-none font-medium"
                  >
                    Skip Today
                  </button>
                )}
              </div>

              {/* Sliders Grid */}
              <div className="space-y-6">
                
                {/* 1. Sleep */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-white flex items-center gap-2">
                      <Moon className="h-4 w-4 text-secondary-accent" />
                      Sleep Quality
                    </label>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${getOptionColor(sleep)}`}>
                      {sleep} - {scales.sleep[sleep - 1]}
                    </span>
                  </div>
                  <input 
                    type="range" min="1" max="5" step="1" 
                    value={sleep} onChange={(e) => setSleep(Number(e.target.value))}
                    className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-primary-accent"
                  />
                  <div className="flex justify-between text-[10px] text-text-secondary px-0.5 font-mono">
                    <span>1: Poor</span>
                    <span>3: Average</span>
                    <span>5: Excellent</span>
                  </div>
                </div>

                {/* 2. Energy */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-white flex items-center gap-2">
                      <Zap className="h-4 w-4 text-warning-custom animate-pulse" />
                      Energy Level
                    </label>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${getOptionColor(energy)}`}>
                      {energy} - {scales.energy[energy - 1]}
                    </span>
                  </div>
                  <input 
                    type="range" min="1" max="5" step="1" 
                    value={energy} onChange={(e) => setEnergy(Number(e.target.value))}
                    className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-primary-accent"
                  />
                  <div className="flex justify-between text-[10px] text-text-secondary px-0.5 font-mono">
                    <span>1: Fatigued</span>
                    <span>3: Moderate</span>
                    <span>5: High</span>
                  </div>
                </div>

                {/* 3. Soreness */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-white flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-danger-custom" />
                      Muscle Soreness
                    </label>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${getOptionColor(soreness, true)}`}>
                      {soreness} - {scales.soreness[soreness - 1]}
                    </span>
                  </div>
                  <input 
                    type="range" min="1" max="5" step="1" 
                    value={soreness} onChange={(e) => setSoreness(Number(e.target.value))}
                    className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-primary-accent"
                  />
                  <div className="flex justify-between text-[10px] text-text-secondary px-0.5 font-mono">
                    <span>1: None</span>
                    <span>3: Moderate</span>
                    <span>5: Very Sore</span>
                  </div>
                </div>

                {/* 4. Stress */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-white flex items-center gap-2">
                      <Activity className="h-4 w-4 text-purple-400" />
                      Stress Level
                    </label>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${getOptionColor(stress, true)}`}>
                      {stress} - {scales.stress[stress - 1]}
                    </span>
                  </div>
                  <input 
                    type="range" min="1" max="5" step="1" 
                    value={stress} onChange={(e) => setStress(Number(e.target.value))}
                    className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-primary-accent"
                  />
                  <div className="flex justify-between text-[10px] text-text-secondary px-0.5 font-mono">
                    <span>1: Very Low</span>
                    <span>3: Moderate</span>
                    <span>5: Very High</span>
                  </div>
                </div>

                {/* 5. Mood */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-white flex items-center gap-2">
                      <Smile className="h-4 w-4 text-emerald-400" />
                      General Mood
                    </label>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${getOptionColor(mood)}`}>
                      {mood} - {scales.mood[mood - 1]}
                    </span>
                  </div>
                  <input 
                    type="range" min="1" max="5" step="1" 
                    value={mood} onChange={(e) => setMood(Number(e.target.value))}
                    className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-primary-accent"
                  />
                  <div className="flex justify-between text-[10px] text-text-secondary px-0.5 font-mono">
                    <span>1: Low</span>
                    <span>3: Balanced</span>
                    <span>5: Excellent</span>
                  </div>
                </div>

              </div>

              {/* Extra info section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Scale className="h-4 w-4 text-text-secondary" />
                    Bodyweight (Optional)
                  </label>
                  <div className="relative">
                    <input 
                      type="number" step="0.1" placeholder="e.g. 78.5"
                      value={bodyweight} onChange={(e) => setBodyweight(e.target.value)}
                      className="bg-black/20 border border-gray-800 rounded-lg px-3 py-2 text-xs w-full text-white focus:outline-none focus:border-primary-accent font-mono"
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] text-text-secondary font-mono">KG</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white block">
                    Are you training today?
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTrainingDay(true)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        trainingDay 
                          ? 'bg-primary-accent/15 border-primary-accent text-primary-accent' 
                          : 'bg-black/20 border-gray-800 text-text-secondary hover:text-white'
                      }`}
                    >
                      Yes, Training Day
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrainingDay(false)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        !trainingDay 
                          ? 'bg-danger-custom/10 border-danger-custom text-danger-custom' 
                          : 'bg-black/20 border-gray-800 text-text-secondary hover:text-white'
                      }`}
                    >
                      No, Rest Day
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-text-secondary" />
                  Notes / Context
                </label>
                <textarea
                  rows="2"
                  placeholder="How is your body feeling? (e.g. slight knee soreness, slept cold, ready to crush deadlifts)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-black/20 border border-gray-800 rounded-lg px-3 py-2 text-xs w-full text-white focus:outline-none focus:border-primary-accent leading-normal"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2">
                {date !== getLocalDateString() && (
                  <button
                    type="button"
                    onClick={resetFormToDefault}
                    className="border border-gray-800 text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-white/5 text-text-secondary hover:text-white cursor-pointer select-none"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary-accent text-black text-xs font-bold px-6 py-2.5 rounded-lg hover:bg-primary-accent/90 transition-all cursor-pointer inline-flex items-center gap-1 shadow disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : date === getLocalDateString() ? 'Save Check-In' : 'Update Check-In'}
                </button>
              </div>
            </form>
          )}

          {/* Today's Recovery Context Result Card */}
          {todaysLog && !isSkipped && (
            <div className="bg-gradient-to-r from-bg-card to-black/30 border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5 pb-2 border-b border-gray-800/80">
                <BrainCircuit className="h-4.5 w-4.5 text-primary-accent animate-pulse" />
                Today's Recovery Context
              </h3>

              <div className="flex items-center gap-3">
                <span className={`text-xs font-extrabold px-3 py-1.5 rounded-full border ${getLogPreviewLabel(todaysLog.recoveryScore).color}`}>
                  {todaysLog.recoveryContext}
                </span>
                <span className="text-xs font-mono text-text-secondary">
                  Score: {todaysLog.recoveryScore}/100
                </span>
              </div>

              <div className="bg-black/40 border border-gray-850 rounded-xl p-4 space-y-2 text-xs text-text-secondary leading-relaxed">
                <h4 className="font-bold text-white flex items-center gap-1.5 uppercase tracking-wider font-mono text-[10px]">
                  Coach Recovery Review
                </h4>
                <div className="text-white/95 text-xs whitespace-pre-line leading-relaxed">
                  {todaysLog.recoveryContext === 'Strong Recovery Signals' && (
                    <div>
                      You reported optimal sleep quality and high energy levels today.
                      <br />Your recovery indicators support normal training intensity.
                    </div>
                  )}
                  {todaysLog.recoveryContext === 'Positive Recovery Signals' && (
                    <div>
                      You reported favorable recovery indicators with good sleep/energy and manageable soreness. Ready for solid training.
                    </div>
                  )}
                  {todaysLog.recoveryContext === 'Neutral Recovery Signals' && (
                    <div>
                      Your recovery indicators are moderate. Standard training guidance applies.
                    </div>
                  )}
                  {todaysLog.recoveryContext === 'Recovery Attention Recommended' && (
                    <div>
                      You reported elevated soreness or increased stress today.
                      <br />These indicators may affect recovery quality.
                    </div>
                  )}
                  {todaysLog.recoveryContext === 'Recovery Attention High' && (
                    <div>
                      You reported low sleep/energy and high soreness today.
                      <br />Prioritizing rest and joint recovery is highly recommended.
                    </div>
                  )}
                  {todaysLog.notes && (
                    <div className="mt-3 pt-2 border-t border-gray-800/50 italic text-[11px] text-text-secondary">
                      Note logged: "{todaysLog.notes}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right column: Recent Check-Ins list */}
        <div className="space-y-6">
          <div className="bg-bg-card border border-gray-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono pb-2 border-b border-gray-800">
              Recent Check-Ins (Editable)
            </h3>

            {recentLogs.length > 0 ? (
              <div className="space-y-3">
                {recentLogs.map((log) => {
                  const preview = getLogPreviewLabel(log.recoveryScore);
                  const logDateStr = new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
                  const isCurrentlyEditing = date === new Date(log.date).toISOString().split('T')[0];

                  return (
                    <div
                      key={log._id}
                      onClick={() => {
                        loadLogIntoForm(log);
                        setIsSkipped(false);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:border-gray-600 text-left space-y-2 group relative ${
                        isCurrentlyEditing ? 'border-primary-accent bg-primary-accent/5' : 'border-gray-850 bg-black/10'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white">{logDateStr}</span>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase ${preview.color}`}>
                          {preview.text}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] text-text-secondary">
                        <div className="flex gap-2">
                          <span>Sleep: {log.sleep}/5</span>
                          <span>•</span>
                          <span>Energy: {log.energy}/5</span>
                        </div>
                        <span className="text-[10px] text-primary-accent opacity-0 group-hover:opacity-100 transition-opacity font-bold flex items-center gap-0.5">
                          Edit
                          <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-text-secondary italic">
                No logs recorded yet. Complete your check-in above.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

// Simple placeholder icons
function InfoIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}
