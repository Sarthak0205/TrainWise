import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Dumbbell, 
  ChevronDown, 
  ChevronUp, 
  Activity,
  Layers
} from 'lucide-react';

export default function SessionCard({ session }) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    name = 'Workout Session',
    date,
    totalSets = 0,
    totalVolume = 0,
    exercises = []
  } = session;

  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  const formattedTime = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="bg-bg-card border border-gray-800 rounded-xl overflow-hidden transition-all hover:border-gray-700">
      {/* Header (Always Visible) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none bg-black/10"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary-accent/10 border border-primary-accent/20 rounded-lg text-primary-accent shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="font-bold text-white tracking-tight">{name}</h4>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formattedDate}
              </span>
              <span>•</span>
              <span>{formattedTime}</span>
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="flex items-center gap-6 text-sm">
          <div className="space-y-0.5 text-right">
            <span className="text-[10px] text-text-secondary uppercase tracking-wider block">Sets</span>
            <span className="font-bold text-white font-mono">{totalSets} sets</span>
          </div>
          <div className="space-y-0.5 text-right">
            <span className="text-[10px] text-text-secondary uppercase tracking-wider block">Volume</span>
            <span className="font-bold text-white font-mono">{totalVolume.toLocaleString()} kg</span>
          </div>
          <button className="text-text-secondary hover:text-white transition-colors">
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Expandable Details Area */}
      {isExpanded && (
        <div className="p-5 border-t border-gray-800 bg-black/30 space-y-4">
          <div className="flex items-center gap-1.5 text-xs text-text-secondary font-semibold uppercase tracking-wider">
            <Layers className="h-4 w-4 text-secondary-accent" />
            Exercises Performed
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {exercises.map((item, idx) => {
              const isDetailed = typeof item === 'object' && item !== null;
              const exName = isDetailed ? item.exercise : item;

              return (
                <div 
                  key={idx} 
                  className="bg-bg-main border border-gray-800/80 rounded-lg p-3 flex items-center justify-between text-sm hover:border-gray-700 transition-colors"
                >
                  <div className="min-w-0 pr-2 flex-1">
                    <button
                      onClick={() => navigate(`/exercise/${encodeURIComponent(exName)}`)}
                      className="font-semibold text-white hover:text-primary-accent transition-colors truncate block text-left w-full cursor-pointer"
                    >
                      {exName}
                    </button>
                    {isDetailed && (
                      <span className="text-xs text-text-secondary">
                        Avg: {item.avgWeight} kg × {item.avgReps} reps
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {isDetailed ? (
                      <>
                        <span className="font-bold text-primary-accent font-mono block">{item.sets} sets</span>
                        <span className="text-[10px] text-text-secondary font-mono">Vol: {item.totalVol.toLocaleString()}</span>
                      </>
                    ) : (
                      <span className="bg-white/5 border border-gray-800 rounded px-2 py-0.5 text-xs text-text-secondary font-medium font-mono">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
