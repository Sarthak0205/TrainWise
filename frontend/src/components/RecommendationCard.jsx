import { useState } from 'react';
import { 
  ArrowUp, 
  RefreshCw, 
  ShieldAlert, 
  Cpu, 
  BrainCircuit, 
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp,
  Activity
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

export default function RecommendationCard({ recommendation }) {
  const [showDetails, setShowDetails] = useState(false);
  const {
    exercise,
    action = 'maintain weight',
    nextWeight = 0,
    targetReps = '',
    priority = 'medium',
    source = 'heuristic',
    reason = '',
    explanation = '',
    confidence,
    fatigueScore
  } = recommendation;

  // Determine styling based on action types
  const getActionConfig = (act) => {
    const actionLower = act.toLowerCase();
    if (actionLower.includes('increase')) {
      return {
        label: 'OVERLOAD PROGRESSION',
        colorClass: 'text-primary-accent border-primary-accent/30 bg-primary-accent/5',
        icon: ArrowUp,
        glowClass: 'shadow-[0_0_15px_-3px_rgba(0,229,168,0.25)]'
      };
    }
    if (actionLower.includes('reduce') || actionLower.includes('safety') || actionLower.includes('deload')) {
      return {
        label: 'SAFETY DE-LOAD',
        colorClass: 'text-danger-custom border-danger-custom/30 bg-danger-custom/5',
        icon: ShieldAlert,
        glowClass: 'shadow-[0_0_15px_-3px_rgba(255,90,90,0.25)]'
      };
    }
    if (actionLower.includes('reps')) {
      return {
        label: 'REP PROGRESSION',
        colorClass: 'text-secondary-accent border-secondary-accent/30 bg-secondary-accent/5',
        icon: TrendingUp,
        glowClass: 'shadow-[0_0_15px_-3px_rgba(0,184,255,0.25)]'
      };
    }
    return {
      label: 'MAINTENANCE PACE',
      colorClass: 'text-text-secondary border-gray-800 bg-white/5',
      icon: RefreshCw,
      glowClass: ''
    };
  };

  const config = getActionConfig(action);
  const ActionIcon = config.icon;

  const isHighFatigue = fatigueScore > 5.0 || action.toLowerCase().includes('reduce') || action.toLowerCase().includes('deload');

  return (
    <div className={`bg-bg-card border border-gray-800 rounded-xl p-5 relative overflow-hidden transition-all hover:border-gray-700 ${config.glowClass}`}>
      {/* Background Glow Detail */}
      <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-3xl pointer-events-none ${
        action.toLowerCase().includes('increase') 
          ? 'bg-primary-accent' 
          : action.toLowerCase().includes('reduce') 
            ? 'bg-danger-custom' 
            : 'bg-secondary-accent'
      }`} />

      {/* Top Meta Info Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded border tracking-wider uppercase font-mono ${config.colorClass}`}>
          {config.label}
        </span>
        
        <div className="flex items-center gap-2">
          {/* Source badge */}
          {source.toLowerCase() === 'ml' ? (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-400 font-mono uppercase">
              <Zap className="h-3 w-3" />
              ML
            </span>
          ) : source.toLowerCase() === 'hybrid' ? (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-primary-accent/10 border border-primary-accent/30 text-primary-accent font-mono uppercase">
              <BrainCircuit className="h-3 w-3" />
              Hybrid
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 border border-gray-700 text-text-secondary font-mono uppercase">
              <Cpu className="h-3 w-3" />
              Heuristic
            </span>
          )}

          {/* Priority badge */}
          <span className={`capitalize font-semibold text-[11px] ${
            priority === 'high' ? 'text-danger-custom' : priority === 'medium' ? 'text-warning-custom' : 'text-text-secondary'
          }`}>
            {priority} Priority
          </span>
        </div>
      </div>

      {/* Exercise Name & Action Text */}
      <div className="space-y-1 mb-4">
        <h3 className="text-lg font-bold text-white tracking-tight">{exercise}</h3>
        <p className="text-sm font-semibold text-text-secondary capitalize flex items-center gap-1.5">
          <ActionIcon className="h-4 w-4 shrink-0 text-text-secondary" />
          {action}
        </p>
      </div>

      {/* Recommended Parameters Box */}
      <div className="grid grid-cols-2 gap-3 bg-black/30 border border-gray-800/80 rounded-lg p-3.5 mb-4">
        <div>
          <span className="text-[10px] text-text-secondary uppercase block mb-0.5">Target Weight</span>
          <span className="text-xl font-bold text-white font-mono">
            {nextWeight > 0 ? `${nextWeight} kg` : 'Bodyweight'}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-text-secondary uppercase block mb-0.5">Target Reps</span>
          <span className="text-xl font-bold text-white font-mono">{targetReps || 'Max Reps'}</span>
        </div>
      </div>

      {/* Confidence Display (Conditioned strictly on backend presence) */}
      {(confidence !== undefined && confidence !== null) ? (
        <div className="flex justify-between items-center text-xs border border-gray-800/80 bg-gray-900/30 rounded-lg px-3 py-1.5 mb-4 font-mono">
          <span className="text-text-secondary">Target Confidence</span>
          <span className="text-secondary-accent font-bold">{getConfidenceLabel(confidence)}</span>
        </div>
      ) : (
        <div className="flex justify-between items-center text-xs border border-gray-800/80 bg-gray-900/30 rounded-lg px-3 py-1.5 mb-4 font-mono">
          <span className="text-text-secondary">Recommendation Basis</span>
          <span className="text-text-secondary font-semibold capitalize">{source} Rules</span>
        </div>
      )}

      {/* Fatigue Warning Banner */}
      {isHighFatigue && (
        <div className="mb-4 px-3 py-2 bg-danger-custom/10 border border-danger-custom/20 rounded-lg flex items-start gap-2 text-danger-custom text-xs">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Elevated Fatigue Warning</span>
            {fatigueScore ? (
              <span className="text-[11px] leading-relaxed">
                Fatigue metric is critical ({fatigueScore.toFixed(1)}/10). Overload postponed for biomechanical safety.
              </span>
            ) : (
              <span className="text-[11px] leading-relaxed">
                Workload analysis indicates high systemic fatigue. Safety limits enforced.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Explanatory AI Coach Text - Collapsible */}
      <div className="mt-4 border-t border-gray-800/80 pt-4 space-y-4">
        <div className="bg-black/35 border border-gray-850 rounded-xl p-4 text-xs text-text-secondary leading-relaxed">
          <h4 className="font-bold text-white flex items-center gap-1.5 uppercase tracking-wider font-mono text-[10px] mb-2">
            <BrainCircuit className="h-4 w-4 text-primary-accent" />
            Coach Summary
          </h4>
          <p className="text-white/95 text-xs leading-normal font-sans">
            {getCoachSummary(recommendation)}
          </p>
        </div>

        <div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 text-xs text-secondary-accent hover:text-secondary-accent/80 hover:underline transition-colors font-semibold cursor-pointer select-none font-sans"
          >
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showDetails ? 'Hide detailed technical reasoning' : 'Show detailed technical reasoning'}
          </button>

          {showDetails && (
            <div className="mt-3 bg-black/40 border border-gray-855 rounded-xl p-4 space-y-2.5 text-xs text-text-secondary leading-relaxed font-sans">
              <h4 className="font-bold text-white flex items-center gap-1.5 uppercase tracking-wider font-mono text-[10px]">
                <Activity className="h-4 w-4 text-secondary-accent" />
                Biomechanical Data Points:
              </h4>
              <ul className="list-disc pl-4 space-y-1 mt-1 text-[11px] text-text-secondary/80">
                <li>Recommended targeting: <span className="font-bold text-white font-mono">{nextWeight > 0 ? `${nextWeight}kg` : 'bodyweight'} × {targetReps || 'max'} reps</span></li>
                {confidence && (
                  <li>Decision has a confidence ranking of <span className="font-semibold text-white font-mono">{confidence}%</span></li>
                )}
                <li>Derived from dynamic <span className="font-semibold text-white capitalize">{source}</span> constraints</li>
              </ul>
              <p className="italic border-t border-gray-855 pt-2.5 mt-2.5 text-text-secondary leading-normal whitespace-pre-line">
                {explanation || reason}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
