import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workoutApi, coachingApi, dailyLogApi, templateApi } from '../services/api';
import TopStats from '../components/TopStats';
import { 
  VolumeTrendChart, 
  MovementBalanceChart 
} from '../components/Charts';
import { LoadingCard, ErrorState } from '../components/UIStates';
import { 
  BrainCircuit, 
  ShieldAlert, 
  Award, 
  ArrowRight,
  Activity,
  Dumbbell,
  Sparkles,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  ClipboardCheck,
  Copy,
  Play
} from 'lucide-react';

function getConfidenceLabel(confidence) {
  if (confidence === undefined || confidence === null) return '';
  const val = Number(confidence);
  if (isNaN(val)) return '';
  if (val >= 80) return 'High Confidence';
  if (val >= 65) return 'Moderate Confidence';
  return 'Low Confidence';
}

function getCoachSummary(rec) {
  if (!rec) return '';
  const actionLower = (rec.action || '').toLowerCase();
  const fatigue = rec.fatigueScore;
  
  if (actionLower.includes('increase')) {
    return 'You consistently completed your target reps and recovered well. The system believes you are ready for a weight increase next session.';
  }
  if (actionLower.includes('reduce') || actionLower.includes('deload')) {
    if (fatigue && fatigue > 5.0) {
      return 'Biomechanics warning: Elevated fatigue coefficient detected. The coach recommends a safety deload next session to protect joints.';
    }
    return 'Performance indicators suggest a temporary reduction in workload next session to facilitate better recovery.';
  }
  if (actionLower.includes('maintain')) {
    return 'You are currently in your optimal target rep zone. Maintain this workload next session to build solid adaptation.';
  }
  if (actionLower.includes('reps')) {
    return 'Your baseline strength is developing. The coach recommends pushing for a higher volume target next session.';
  }
  return rec.reason || 'Maintain steady progress and focus on clean execution next session.';
}

function getRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  
  const d1 = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const d2 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((d2 - d1) / (1000 * 3600 * 24));
  
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }
  const months = Math.floor(diffDays / 30);
  return `${months} ${months === 1 ? 'month' : 'months'} ago`;
}

function getReadinessTone(status) {
  if (status?.includes('Exceptional') || status?.includes('Push')) {
    return {
      color: 'text-primary-accent',
      bgColor: 'bg-primary-accent/10 border-primary-accent/20',
      dot: '🟢',
      level: 'High readiness'
    };
  }
  if (status?.includes('Moderate')) {
    return {
      color: 'text-warning-custom',
      bgColor: 'bg-warning-custom/10 border-warning-custom/20',
      dot: '🟡',
      level: 'Moderate readiness'
    };
  }
  if (status?.includes('Baseline')) {
    return {
      color: 'text-text-secondary',
      bgColor: 'bg-bg-card border-gray-800',
      dot: '•',
      level: 'Baseline building'
    };
  }
  return {
    color: 'text-danger-custom',
    bgColor: 'bg-danger-custom/10 border-danger-custom/20',
    dot: '🔴',
    level: 'Low readiness'
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [recs, setRecs] = useState([]);
  const [coachingData, setCoachingData] = useState(null);
  const [todaysLog, setTodaysLog] = useState(null);
  const [templates, setTemplates] = useState({ systemTemplates: [], userTemplates: [] });
  const [isSkipped, setIsSkipped] = useState(false);
  const [error, setError] = useState(null);
  const [mlServiceAvailable, setMlServiceAvailable] = useState(true);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showRecoveryDetails, setShowRecoveryDetails] = useState(false);
  const [showMovementBalance, setShowMovementBalance] = useState(false);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);
      const localToday = new Date().toISOString().split('T')[0];
      const skipped = localStorage.getItem(`skipped_checkin_${localToday}`);
      setIsSkipped(!!skipped);

      const [summary, recommendations, coaching, logRes, templatesRes] = await Promise.all([
        workoutApi.getDashboardSummary(),
        workoutApi.getWorkoutRecommendations(),
        coachingApi.getSummary(localToday),
        dailyLogApi.getTodaysLog(localToday),
        templateApi.getTemplates()
      ]);
      setData(summary);
      setCoachingData(coaching);
      if (logRes.success && logRes.data) {
        setTodaysLog(logRes.data);
      } else {
        setTodaysLog(null);
      }
      if (templatesRes.success && templatesRes.data) {
        setTemplates(templatesRes.data);
      }
      if (recommendations.success) {
        setRecs(recommendations.data);
        if (recommendations.mlServiceAvailable !== undefined) {
          setMlServiceAvailable(recommendations.mlServiceAvailable);
        } else if (recommendations.data.length > 0) {
          setMlServiceAvailable(recommendations.data[0].mlServiceAvailable);
        }
      } else {
        setRecs([]);
        if (recommendations.mlServiceAvailable !== undefined) {
          setMlServiceAvailable(recommendations.mlServiceAvailable);
        }
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Backend server is unreachable. Please verify that the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboard();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="p-4 sm:p-8 space-y-6 max-w-4xl mx-auto">
        <div className="h-8 bg-gray-800 rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-8 max-w-4xl mx-auto">
        <ErrorState
          title="Backend Connection Failed"
          message={error}
          onRetry={loadDashboard}
        />
      </div>
    );
  }

  const {
    summaryCards = {},
    latestSession = null,
    weeklyVolumeChart = {},
    prHighlights = [],
    movementBalance = [],
    fatigueTrend = []
  } = data || {};

  const totalSessions = summaryCards.totalSessions || 0;

  // 1. First-time Onboarding/Empty State (0 sessions logged)
  if (totalSessions === 0) {
    const readiness = coachingData?.readiness || {};
    return (
      <div className="p-4 sm:p-8 space-y-6 max-w-4xl mx-auto">
        <div className="bg-bg-card border border-gray-800 rounded-xl p-8 relative overflow-hidden text-center space-y-6">
          <div className="absolute top-0 right-0 w-64 h-64 opacity-10 bg-primary-accent rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
              <Dumbbell className="h-8 w-8 text-primary-accent animate-bounce" />
              Welcome to <span className="text-primary-accent">TrainWise</span>
            </h1>
            <p className="text-sm text-text-secondary max-w-lg mx-auto">
              Track progress, monitor recovery, and make smarter training decisions.
            </p>
          </div>

          <div className="max-w-md mx-auto bg-black/40 border border-gray-800 rounded-xl p-6 text-left space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Unlock Your Training Core:</h3>
            <ul className="space-y-3.5 text-sm text-text-secondary">
              <li className="flex items-start gap-2.5">
                <span className="text-primary-accent font-bold">✓</span>
                <div>
                  <strong className="text-white">Intelligent Training Guidance</strong>
                  <p className="text-xs text-text-secondary mt-0.5">Calculates target weights and reps to help you progress consistently.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-primary-accent font-bold">✓</span>
                <div>
                  <strong className="text-white">Recovery & Fatigue Monitoring</strong>
                  <p className="text-xs text-text-secondary mt-0.5">Tracks training stress and flags when safety deloads are needed.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-primary-accent font-bold">✓</span>
                <div>
                  <strong className="text-white">Workout Progress Analytics</strong>
                  <p className="text-xs text-text-secondary mt-0.5">Visualizes training volume trends, personal record milestones, and pattern balance.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/log-workout')}
                className="bg-primary-accent text-black font-bold text-sm px-6 py-3 rounded-lg hover:bg-primary-accent/90 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-lg shadow-primary-accent/15"
              >
                <Dumbbell className="h-4 w-4" />
                Log Your First Workout
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate('/templates')}
                className="bg-bg-card border border-gray-800 text-white font-bold text-sm px-6 py-3 rounded-lg hover:bg-white/5 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md"
              >
                <Copy className="h-4 w-4 text-primary-accent" />
                Start From Template
              </button>
              <button
                onClick={() => navigate('/workouts')}
                className="bg-bg-card border border-gray-800 text-white font-bold text-sm px-6 py-3 rounded-lg hover:bg-white/5 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md"
              >
                Import Workout History (CSV)
              </button>
            </div>
            <p className="text-[10px] text-text-secondary/70 block">
              Log manual session or import CSV to power Coaching, Analytics, Personal Records, and Recommendations.
            </p>
          </div>
        </div>

        <div className="bg-bg-card border border-gray-800 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5 pb-2 border-b border-gray-800/80">
            <BrainCircuit className="h-4.5 w-4.5 text-primary-accent" />
            Coaching Intelligence
          </h3>
          <div className="bg-black/20 border border-gray-855 rounded-xl p-4">
            <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold block font-mono">
              Recovery Readiness
            </span>
            <span className="text-lg font-bold text-text-secondary mt-1 block">
              {readiness.status || 'Building Baseline'}
            </span>
            <p className="whitespace-pre-line text-[11px] text-text-secondary leading-normal border-t border-gray-855 pt-2 mt-2">
              {readiness.explanation || 'Complete more workouts to unlock coaching intelligence.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  function handleSkipCheckIn() {
    const localToday = new Date().toISOString().split('T')[0];
    localStorage.setItem(`skipped_checkin_${localToday}`, 'true');
    setIsSkipped(true);
  }

  function renderRecoveryCheckInCard() {
    if (todaysLog) {
      return (
        <div className="bg-bg-card border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4 shadow">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-5 w-5 text-primary-accent shrink-0" />
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-widest font-mono font-bold block">
                Today's Recovery Context
              </span>
              <span className="text-sm font-bold text-white block">
                {todaysLog.recoveryContext}
              </span>
              <span className="text-[11px] text-text-secondary">
                Sleep: {todaysLog.sleep}/5 • Energy: {todaysLog.energy}/5
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate('/daily-log')}
            className="text-xs text-secondary-accent hover:underline font-bold shrink-0 cursor-pointer"
          >
            View Check-In
          </button>
        </div>
      );
    }

    if (!isSkipped) {
      return (
        <div className="bg-bg-card border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4 shadow">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-5 w-5 text-warning-custom shrink-0 animate-pulse" />
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-widest font-mono font-bold block">
                Today's Recovery Check-In
              </span>
              <span className="text-xs text-white">
                How are you feeling today?
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleSkipCheckIn}
              className="text-xs text-text-secondary hover:text-white transition-colors cursor-pointer font-bold"
            >
              Skip Today
            </button>
            <button
              onClick={() => navigate('/daily-log')}
              className="bg-primary-accent text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-primary-accent/90 transition-all cursor-pointer shadow-sm"
            >
              Complete Check-In
            </button>
          </div>
        </div>
      );
    }

    return null;
  }

  const latestFatigue = fatigueTrend.length > 0 ? fatigueTrend[fatigueTrend.length - 1].score : 0;
  const readiness = coachingData?.readiness || {};
  const readinessTone = getReadinessTone(readiness.status);
  const readinessScoreVisible = typeof readiness.score === 'number';
  const primaryRec = recs.length > 0 ? recs[0] : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      
      {/* Header and Smart CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-sm text-text-secondary">Track workouts, monitor recovery, and analyze progress.</p>
        </div>
        {totalSessions < 5 ? (
          <button 
            onClick={() => navigate('/workouts')}
            className="flex items-center gap-1.5 bg-primary-accent text-black text-xs font-bold px-4 py-2.5 rounded-lg shadow-lg hover:bg-primary-accent/90 transition-all cursor-pointer"
          >
            Upload History
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button 
            onClick={() => navigate('/recommendations')}
            className="flex items-center gap-1.5 bg-primary-accent text-black text-xs font-bold px-4 py-2.5 rounded-lg shadow-lg hover:bg-primary-accent/90 transition-all cursor-pointer"
          >
            View Recommendations
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Offline Banner warning if present */}
      {!mlServiceAvailable && (
        <div className="bg-warning-custom/10 border border-warning-custom/30 text-warning-custom p-3.5 rounded-xl text-xs flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <div>
            <span className="font-bold">Training Service Offline</span> — Using Heuristic Recommendations. The system is operating normally in fallback mode.
          </div>
        </div>
      )}

      {/* Recovery Check-in Card (Refinement 4) */}
      {renderRecoveryCheckInCard()}

      {/* 2. Onboarding Steps Checklist for low-history users (1-4 sessions) */}
      {totalSessions > 0 && totalSessions < 5 && (
        <div className="bg-gradient-to-r from-bg-card to-black/30 border border-gray-800 rounded-xl p-5 space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 opacity-5 bg-primary-accent rounded-full blur-2xl pointer-events-none" />
          <div className="flex justify-between items-center pb-2 border-b border-gray-850">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Sparkles className="h-4 w-4 text-warning-custom animate-pulse" />
              Getting Started Checklist ({totalSessions}/5 sessions)
            </h4>
            <span className="text-[10px] text-text-secondary font-mono">Progress: {totalSessions * 20}%</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="flex gap-2.5 p-2 rounded bg-black/20 border border-gray-850">
              <span className="text-primary-accent font-bold text-sm shrink-0">✓</span>
              <div>
                <span className="font-semibold text-white block">Step 1: Ingest Data</span>
                <span className="text-[10px] text-text-secondary mt-0.5 block">Log workouts or upload history CSV files.</span>
              </div>
            </div>
            <div className={`flex gap-2.5 p-2 rounded ${totalSessions >= 2 ? 'bg-black/20 border border-gray-850' : 'bg-black/10 opacity-60 border border-transparent'}`}>
              <span className={totalSessions >= 2 ? 'text-primary-accent font-bold text-sm shrink-0' : 'text-text-secondary text-sm shrink-0 font-bold font-mono'}>
                {totalSessions >= 2 ? '✓' : '2'}
              </span>
              <div>
                <span className="font-semibold text-white block">Step 2: Coach Review</span>
                <span className="text-[10px] text-text-secondary mt-0.5 block">Evaluate overload and fatigue targets.</span>
              </div>
            </div>
            <div className={`flex gap-2.5 p-2 rounded ${totalSessions >= 3 ? 'bg-black/20 border border-gray-850' : 'bg-black/10 opacity-60 border border-transparent'}`}>
              <span className={totalSessions >= 3 ? 'text-primary-accent font-bold text-sm shrink-0' : 'text-text-secondary text-sm shrink-0 font-bold font-mono'}>
                {totalSessions >= 3 ? '✓' : '3'}
              </span>
              <div>
                <span className="font-semibold text-white block">Step 3: Track Progress</span>
                <span className="text-[10px] text-text-secondary mt-0.5 block">Monitor weekly volume stability & balance.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Hero Recommendation Section */}
      {primaryRec ? (
        <div className="bg-gradient-to-r from-bg-card via-bg-card to-black/35 border border-gray-800 rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-black/30">
          <div className="absolute top-0 right-0 w-80 h-80 opacity-10 bg-primary-accent rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-gray-800/80">
            <div className="space-y-1.5">
              <span className="text-[10px] text-text-secondary uppercase tracking-widest font-mono font-bold block">
                YOUR NEXT TRAINING TARGET
              </span>
              <h2 className="text-2xl font-extrabold text-white tracking-tight break-words">
                {primaryRec.exercise}
              </h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {primaryRec.confidence !== undefined && primaryRec.confidence !== null ? (
                <span className="text-[10px] bg-secondary-accent/15 border border-secondary-accent/40 text-secondary-accent font-mono font-bold px-2.5 py-1 rounded-full uppercase">
                  ★ {getConfidenceLabel(primaryRec.confidence)}
                </span>
              ) : (
                <span className="text-[10px] bg-gray-800 border border-gray-700 text-text-secondary font-mono font-bold px-2.5 py-1 rounded-full uppercase">
                  Heuristic Target
                </span>
              )}
              
              <span className="text-[10px] bg-purple-500/10 border border-purple-500/30 text-purple-400 font-mono font-bold px-2.5 py-1 rounded-full uppercase">
                {primaryRec.source === 'ml' ? 'ML Model' : primaryRec.source === 'hybrid' ? 'Hybrid Coach' : 'Heuristic'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
            <div className="bg-black/30 border border-gray-850 rounded-xl p-4.5">
              <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-semibold">Recommended Action</span>
              <span className={`text-lg font-extrabold capitalize mt-1 block tracking-tight ${
                primaryRec.action.toLowerCase().includes('increase') 
                  ? 'text-primary-accent' 
                  : primaryRec.action.toLowerCase().includes('reduce') || primaryRec.action.toLowerCase().includes('safety') || primaryRec.action.toLowerCase().includes('deload')
                    ? 'text-danger-custom' 
                    : 'text-secondary-accent'
              }`}>
                {primaryRec.action}
              </span>
            </div>

            <div className="bg-black/30 border border-gray-850 rounded-xl p-4.5">
              <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-semibold">Target Load</span>
              <span className="text-xl font-bold text-white font-mono mt-1 block">
                {primaryRec.nextWeight > 0 ? `${primaryRec.nextWeight} kg` : 'Bodyweight'}
              </span>
            </div>

            <div className="bg-black/30 border border-gray-850 rounded-xl p-4.5">
              <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-semibold">Target Reps</span>
              <span className="text-xl font-bold text-white font-mono mt-1 block">
                {primaryRec.targetReps || 'Max Reps'} reps
              </span>
            </div>
          </div>

          <div className="mt-5 border-t border-gray-850 pt-4 space-y-4">
            <div className="bg-black/35 border border-gray-855 rounded-xl p-4 text-xs text-text-secondary leading-relaxed">
              <h4 className="font-bold text-white flex items-center gap-1.5 uppercase tracking-wider font-mono text-[10px] mb-2">
                <BrainCircuit className="h-4 w-4 text-primary-accent" />
                Coach Summary
              </h4>
              <p className="text-white/95 text-xs leading-normal">
                {getCoachSummary(primaryRec)}
              </p>
            </div>

            <div>
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="flex items-center gap-1.5 text-xs text-secondary-accent hover:text-secondary-accent/80 hover:underline transition-colors font-semibold cursor-pointer select-none"
              >
                {showReasoning ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showReasoning ? 'Hide detailed technical reasoning' : 'Show detailed technical reasoning'}
              </button>

              {showReasoning && (
                <div className="mt-3 bg-black/40 border border-gray-855 rounded-xl p-4 space-y-2.5 text-xs text-text-secondary leading-relaxed">
                  <h4 className="font-bold text-white flex items-center gap-1.5 uppercase tracking-wider font-mono text-[10px]">
                    <Activity className="h-4 w-4 text-secondary-accent" />
                    Biomechanical Data Points:
                  </h4>
                  <ul className="list-disc pl-4 space-y-1 mt-1 text-[11px] text-text-secondary/80">
                    <li>Recommended targeting: <span className="font-bold text-white font-mono">{primaryRec.nextWeight > 0 ? `${primaryRec.nextWeight}kg` : 'bodyweight'} × {primaryRec.targetReps || 'max'} reps</span></li>
                    {primaryRec.confidence && (
                      <li>Decision has a confidence ranking of <span className="font-semibold text-white">{primaryRec.confidence}%</span></li>
                    )}
                    <li>Derived from dynamic <span className="font-semibold text-white capitalize">{primaryRec.source}</span> insights</li>
                  </ul>
                  <p className="italic border-t border-gray-855 pt-2.5 mt-2.5 text-text-secondary leading-normal whitespace-pre-line">
                    {primaryRec.explanation || primaryRec.reason}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-bg-card border border-gray-800 rounded-2xl p-6 text-center text-xs text-text-secondary italic">
          No overload coach insights calculated for today. Log workout history to generate targets.
        </div>
      )}

      {/* 2. Recovery Status Section */}
      <div className={`border rounded-xl p-5 space-y-3 shadow-md ${readinessTone.bgColor}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl shrink-0 leading-none">{readinessTone.dot}</span>
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-widest font-mono font-bold block">
                RECOVERY STATUS
              </span>
              <span className={`text-base font-extrabold tracking-tight block ${readinessTone.color}`}>
                {readiness.status || 'Building Baseline'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 text-xs">
            <div className="text-left font-mono">
              <span className="text-[10px] text-text-secondary block">READINESS SCORE</span>
              <span className="font-bold text-white">{readinessScoreVisible ? `${readiness.score}/100` : 'Baseline'}</span>
            </div>
            
            <button
              onClick={() => setShowRecoveryDetails(!showRecoveryDetails)}
              className="text-[11px] text-secondary-accent hover:underline cursor-pointer select-none font-semibold"
            >
              {showRecoveryDetails ? 'Hide details' : 'View details'}
            </button>
          </div>
        </div>

        {showRecoveryDetails && (
          <div className="pt-3 border-t border-gray-800/50 space-y-3 text-xs text-text-secondary leading-relaxed bg-black/10 p-3 rounded-lg mt-2.5">
            <p className="font-semibold text-white">Coach Recovery Analysis:</p>
            <p className="whitespace-pre-line">{readiness.explanation || 'Recovery guidance will activate as your training baseline matures.'}</p>
            <div className="grid grid-cols-2 gap-4 pt-2 font-mono">
              <div>
                <span className="text-[10px] text-text-secondary block">READINESS TREND</span>
                <span className="font-bold text-white text-sm">{readiness.trend || 'Baseline'}</span>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary block">LATEST FATIGUE</span>
                <span className="font-bold text-white text-sm">{latestFatigue}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Coaching Intelligence Grid */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5 pb-2 border-b border-gray-800/80">
          <BrainCircuit className="h-4.5 w-4.5 text-primary-accent" />
          Coaching Intelligence
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Recovery Readiness */}
          <div className="bg-black/20 border border-gray-850 rounded-xl p-4 flex flex-col justify-between space-y-2">
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold block font-mono">
                Recovery Readiness
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                {readinessScoreVisible ? (
                  <>
                    <span className="text-2xl font-bold text-white font-mono">
                      {readiness.score}
                    </span>
                    <span className="text-xs text-text-secondary font-mono">/ 100</span>
                  </>
                ) : (
                  <span className="text-lg font-bold text-text-secondary">
                    Building Baseline
                  </span>
                )}
              </div>
              <span className={`text-xs font-bold mt-1.5 flex items-center gap-1.5 ${readinessTone.color}`}>
                {readiness.status || 'Building Baseline'}
                {readiness.trend && (
                  <span className="text-[10px] font-normal text-text-secondary">
                    ({readiness.trend})
                  </span>
                )}
              </span>
            </div>
            <p className="whitespace-pre-line text-[11px] text-text-secondary leading-normal border-t border-gray-855 pt-2 mt-2">
              {readiness.explanation}
            </p>
          </div>

          {/* 2. Consistency */}
          <div className="bg-black/20 border border-gray-855 rounded-xl p-4 flex flex-col justify-between space-y-2">
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold block font-mono">
                Training Consistency
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-white font-mono">
                  {coachingData?.consistency?.score || 0}%
                </span>
              </div>
              <span className="text-xs font-bold mt-1.5 block text-secondary-accent">
                {coachingData?.consistency?.tier || 'Developing'}
              </span>
              <div className="flex gap-2 text-[10px] text-text-secondary mt-1 font-mono">
                <span>{coachingData?.consistency?.monthlySessions || 0} sessions/mo</span>
                <span>•</span>
                <span>Streak: {coachingData?.consistency?.currentStreak || 0} {coachingData?.consistency?.streakUnit || 'weeks'}</span>
              </div>
            </div>
            <p className="text-[11px] text-text-secondary leading-normal border-t border-gray-855 pt-2 mt-2">
              {coachingData?.consistency?.explanation}
            </p>
          </div>

          {/* 3. Progress Status */}
          <div className="bg-black/20 border border-gray-855 rounded-xl p-4 flex flex-col justify-between space-y-2">
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold block font-mono">
                Progress Status
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-lg font-bold ${
                  totalSessions < 5 
                    ? 'text-text-secondary' 
                    : coachingData?.plateaus?.[0]?.status === 'Progressing'
                      ? 'text-primary-accent'
                      : coachingData?.plateaus?.[0]?.status === 'Stable'
                        ? 'text-warning-custom'
                        : 'text-warning-custom'
                }`}>
                  {totalSessions < 5 ? 'Building Baseline' : (coachingData?.plateaus?.[0]?.status || 'Stable')}
                </span>
              </div>
              <span className="text-xs font-bold mt-1.5 block text-text-secondary">
                {totalSessions < 5 ? 'Baseline building...' : coachingData?.plateaus?.[0]?.dashboardStatus || 'Stable 🟡'}
              </span>
            </div>
            <p className="text-[11px] text-text-secondary leading-normal border-t border-gray-855 pt-2 mt-2">
              {totalSessions < 5 
                ? 'Baseline training history is building up. Keep logging sessions.' 
                : coachingData?.plateaus?.[0]?.explanation}
            </p>
          </div>

          {/* 4. Recovery Recommendation */}
          <div className="bg-black/20 border border-gray-855 rounded-xl p-4 flex flex-col justify-between space-y-2">
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold block font-mono">
                Recovery Recommendation
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-sm font-bold ${
                  totalSessions < 5 
                    ? 'text-text-secondary'
                    : coachingData?.recoveryRecommendation?.status?.includes('On Track')
                      ? 'text-primary-accent'
                      : coachingData?.recoveryRecommendation?.status?.includes('Monitor')
                        ? 'text-warning-custom'
                        : 'text-warning-custom'
                }`}>
                  {totalSessions < 5 ? 'Building Baseline' : (coachingData?.recoveryRecommendation?.status || 'Recovery On Track 🟢')}
                </span>
              </div>
              <span className="text-xs font-bold mt-1.5 block text-text-secondary">
                {totalSessions < 5 ? 'Training frequency' : 'Recommendation'}
              </span>
            </div>
            <p className="text-[11px] text-text-secondary leading-normal border-t border-gray-855 pt-2 mt-2">
              {totalSessions < 5 
                ? 'Recovery suggestions will activate as you log more workouts.' 
                : coachingData?.recoveryRecommendation?.explanation}
            </p>
          </div>

        </div>
      </div>

      {/* Quick Start Workout Widget (Refinement 4) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
          <Copy className="h-4.5 w-4.5 text-primary-accent" />
          Quick Start Workout
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {((templates.userTemplates && templates.userTemplates.length > 0)
            ? templates.userTemplates.slice(0, 3)
            : templates.systemTemplates.slice(0, 3)
          ).map((t) => (
            <div
              key={t._id}
              className="bg-bg-card border border-gray-800 rounded-xl p-4.5 flex flex-col justify-between space-y-3 hover:border-gray-700 transition-all relative overflow-hidden group shadow-md"
            >
              {/* Background glow overlay */}
              <div className="absolute top-0 right-0 w-20 h-20 opacity-5 bg-primary-accent rounded-full blur-xl pointer-events-none" />

              <div className="space-y-1.5">
                <h4 className="text-xs font-extrabold text-white truncate flex items-center justify-between gap-1.5">
                  {t.name}
                  {t.isSystem && (
                    <span className="text-[8px] bg-secondary-accent/15 border border-secondary-accent/20 text-secondary-accent px-1.5 py-0.5 rounded-full uppercase shrink-0 font-mono">
                      System
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed min-h-[2.5rem]">
                  {t.description || "No description provided."}
                </p>
                <span className="text-[10px] text-text-secondary/70 font-mono block">
                  {t.exercises?.length || 0} Exercises • {t.exercises?.reduce((sum, ex) => sum + (ex.targetSets || 3), 0) || 0} Sets
                </span>
              </div>
              <button
                onClick={() => navigate(`/log-workout?templateId=${t._id}`)}
                className="w-full bg-primary-accent hover:bg-primary-accent/90 text-black text-[11px] font-extrabold py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Play className="h-3 w-3 fill-black text-black" />
                Start Workout
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Weekly Progress Section */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-5 space-y-6">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5 pb-2 border-b border-gray-800/80">
          <TrendingUp className="h-4.5 w-4.5 text-primary-accent" />
          Weekly Progress Trends
        </h3>
        
        <TopStats stats={summaryCards} />
        
        <div className="pt-2">
          <VolumeTrendChart chartData={weeklyVolumeChart} />
        </div>
      </div>

      {/* 4. Recent PR Highlights Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
          <Award className="h-4.5 w-4.5 text-warning-custom animate-pulse" />
          Latest Achievements 🏆
        </h3>
        {prHighlights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {prHighlights.slice(0, 3).map((pr, idx) => {
              const displayLabel = (pr.exercise || '').split(' (')[0] || 'Unknown Exercise';
              return (
                <div 
                  key={idx} 
                  onClick={() => navigate(`/exercise/${encodeURIComponent(pr.exercise)}`)}
                  className="bg-bg-card border border-gray-800 rounded-xl p-5 flex flex-col justify-between transition-all hover:border-gray-700 cursor-pointer group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 opacity-5 bg-warning-custom rounded-full blur-xl pointer-events-none" />
                  
                  <div className="space-y-1">
                    <span className="text-[10px] text-text-secondary uppercase block font-semibold truncate group-hover:text-white transition-colors" title={pr.exercise}>
                      {displayLabel}
                    </span>
                    <span className="text-sm font-extrabold text-white mt-1 block">
                      {pr.maxWeight} kg
                    </span>
                    <span className="text-[10px] text-primary-accent font-semibold block font-mono">
                      New 1RM PR: {pr.maxEst1RM} kg
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-850 pt-2.5 mt-3 text-[10px] text-text-secondary font-mono">
                    <span>
                      {new Date(pr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-warning-custom font-semibold">
                      {getRelativeTime(pr.date)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-text-secondary italic">No PR achievements logged yet.</p>
        )}
      </div>

      {/* 5. Latest Session Timeline Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
          <Activity className="h-4.5 w-4.5 text-secondary-accent" />
          Last Workout Timeline
        </h3>
        {latestSession ? (
          <div className="bg-bg-card border border-gray-800 rounded-xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-855 pb-3 mb-4">
              <div className="space-y-0.5">
                <span className="text-[10px] text-text-secondary uppercase block font-semibold">
                  {latestSession.name}
                </span>
                <span className="text-xs text-white font-semibold">
                  {new Date(latestSession.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="text-right text-xs font-mono">
                <span className="text-text-secondary block">VOLUME</span>
                <span className="font-bold text-primary-accent">{latestSession.totalVolume.toLocaleString()} kg</span>
              </div>
            </div>

            <div className="relative pl-6 border-l border-gray-800 space-y-4">
              {latestSession.exercises.map((item, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[30px] top-1.5 w-2.5 h-2.5 rounded-full bg-secondary-accent border-2 border-bg-card" />
                  
                  <div className="flex justify-between items-start gap-4">
                    <button
                      onClick={() => {
                        if (!item.exercise) return;
                        navigate(`/exercise/${encodeURIComponent(item.exercise)}`);
                      }}
                      className="font-bold text-white text-xs hover:text-primary-accent transition-colors truncate block text-left cursor-pointer"
                    >
                      {(item.exercise || '').split(' (')[0] || 'Unknown Exercise'}
                    </button>
                    <span className="font-mono text-xs text-text-secondary shrink-0">
                      {item.sets} sets × {Math.round(item.avgReps)} reps @ {item.avgWeight} kg
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-bg-card border border-gray-850 rounded-xl p-6 text-center text-xs text-text-secondary italic">
            No recent workout sessions logged.
          </div>
        )}
      </div>

      {/* 6. Movement Balance (Collapsible) */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Movement Pattern Ratio</h3>
            <p className="text-[10px] text-text-secondary leading-normal">Distribution over the last 30 days.</p>
          </div>
          
          <button
            onClick={() => setShowMovementBalance(!showMovementBalance)}
            className="text-xs text-secondary-accent hover:underline cursor-pointer font-semibold select-none"
          >
            {showMovementBalance ? 'Hide Breakdown' : 'View Breakdown'}
          </button>
        </div>

        {showMovementBalance ? (
          <div className="pt-2 animate-fadeIn">
            <MovementBalanceChart balanceData={movementBalance} />
          </div>
        ) : (
          <div className="bg-black/20 rounded-lg p-3 text-xs flex items-center justify-between text-text-secondary">
            <span>Primary focus patterns:</span>
            <span className="font-bold text-white uppercase font-mono">
              {movementBalance.slice(0, 2).map(b => b.pattern).join(' / ') || 'None logged'}
            </span>
          </div>
        )}
      </div>

    </div>
  );
}
