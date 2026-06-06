import { useNavigate } from 'react-router-dom';
import { Calendar, Sparkles, ChevronRight } from 'lucide-react';

export default function PRCard({ pr, index }) {
  const navigate = useNavigate();
  const {
    exercise = 'Exercise Name',
    maxWeight = 0,
    maxReps = 0,
    maxEst1RM = 0,
    date
  } = pr;

  const rankColors = [
    'from-yellow-400 to-amber-600 text-yellow-950 border-yellow-300/40 bg-yellow-400/10', // 1st
    'from-slate-300 to-slate-500 text-slate-950 border-slate-300/40 bg-slate-300/10',   // 2nd
    'from-amber-600 to-amber-800 text-amber-950 border-amber-600/40 bg-amber-800/10',   // 3rd
  ];

  const defaultRankColor = 'from-gray-700 to-gray-800 text-gray-400 border-gray-700 bg-gray-800/20';

  const isRanked = index < 3;
  const rankColor = isRanked ? rankColors[index] : defaultRankColor;

  return (
    <div className="bg-bg-card border border-gray-800 rounded-xl p-5 relative overflow-hidden transition-all hover:border-gray-700 flex flex-col justify-between h-full">
      <div>
        {/* Top Banner Rank Badge */}
        <div className="flex items-center justify-between mb-4">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border tracking-wider bg-gradient-to-r ${rankColor}`}>
            RANK {index + 1}
          </span>
          {isRanked && (
            <Sparkles className="h-4 w-4 text-warning-custom animate-pulse" />
          )}
        </div>

        {/* Exercise Name */}
        <h4 className="text-base font-bold text-white mb-3 truncate" title={exercise}>
          {exercise}
        </h4>

        {/* PR Grid Stats */}
        <div className="grid grid-cols-3 gap-2 bg-black/20 border border-gray-850 rounded-lg p-3 text-center mb-3">
          <div>
            <span className="text-[9px] text-text-secondary uppercase block mb-0.5">Weight</span>
            <span className="text-sm font-bold text-white font-mono">{maxWeight} kg</span>
          </div>
          <div>
            <span className="text-[9px] text-text-secondary uppercase block mb-0.5">Reps</span>
            <span className="text-sm font-bold text-white font-mono">{maxReps} reps</span>
          </div>
          <div>
            <span className="text-[9px] text-text-secondary uppercase block mb-0.5">Est. 1RM</span>
            <span className="text-sm font-bold text-primary-accent font-mono">{maxEst1RM} kg</span>
          </div>
        </div>
      </div>

      {/* Footer Metainfo & Link */}
      <div className="flex justify-between items-center border-t border-gray-850 pt-3 mt-3 text-xs">
        {date && (
          <div className="flex items-center gap-1.5 text-[10px] text-text-secondary font-mono">
            <Calendar className="h-3 w-3" />
            {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        )}
        <button
          onClick={() => navigate(`/exercise/${encodeURIComponent(exercise)}`)}
          className="text-[10px] text-secondary-accent hover:underline flex items-center gap-0.5 cursor-pointer ml-auto font-semibold"
        >
          History
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
