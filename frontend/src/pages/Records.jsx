import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workoutApi } from '../services/api';
import PRCard from '../components/PRCard';
import { LoadingCard, EmptyState, ErrorState } from '../components/UIStates';
import { 
  Trophy, 
  Award, 
  ChevronRight
} from 'lucide-react';

export default function Records() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  async function loadRecords() {
    try {
      setLoading(true);
      setError(null);
      const summary = await workoutApi.getDashboardSummary();
      setData(summary);
    } catch (err) {
      console.error('Error loading PRs:', err);
      setError('Failed to fetch personal records data. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRecords();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-5xl mx-auto animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-1/4"></div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-800 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <LoadingCard height="h-40" />
            <LoadingCard height="h-40" />
            <LoadingCard height="h-40" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <ErrorState
          title="Failed to Load PRs"
          message={error}
          onRetry={loadRecords}
        />
      </div>
    );
  }

  const { prHighlights = [], summaryCards = {} } = data || {};
  const totalSessions = summaryCards.totalSessions || 0;

  if (totalSessions === 0) {
    return (
      <div className="p-8 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Trophy className="h-6 w-6 text-warning-custom" />
            Personal Records & Bests
          </h1>
          <p className="text-sm text-text-secondary">Track all-time maximum load capacity and estimated 1RM achievements.</p>
        </div>
        <EmptyState
          title="No personal records recorded yet"
          description="Log workouts or upload CSV files to rank your compound lift achievements and estimated 1RM metrics."
          icon={Trophy}
          actionText="Upload Workout History"
          onActionClick={() => navigate('/workouts')}
        />
      </div>
    );
  }

  // Extract compounds from PR Highlights or dynamically search
  const findCompoundPR = (keyword) => {
    return prHighlights.find(pr => pr.exercise.toLowerCase().includes(keyword.toLowerCase()));
  };

  const benchPR = findCompoundPR('bench'); // Strict search to avoid press matching Leg Press
  const squatPR = findCompoundPR('squat'); // Strict search to avoid Hack Squat matching Leg Press
  const deadliftPR = findCompoundPR('deadlift'); // Strict search to avoid pull matching Lat Pulldown

  const compounds = [
    { name: 'Bench Press', pr: benchPR, key: 'bench' },
    { name: 'Squat', pr: squatPR, key: 'squat' },
    { name: 'Deadlift', pr: deadliftPR, key: 'deadlift' }
  ];

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Trophy className="h-6 w-6 text-warning-custom" />
          Personal Records & Bests
        </h1>
        <p className="text-sm text-text-secondary">Track all-time maximum load capacity and estimated 1RM achievements.</p>
      </div>

      {/* Main Compounds Big Cards */}
      <div className="space-y-3.5">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider px-1">
          Compound Lifts Hall of Fame
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {compounds.map((comp) => (
            <div 
              key={comp.name} 
              className="bg-bg-card border border-gray-800 rounded-xl p-5 relative overflow-hidden transition-all hover:border-gray-700"
            >
              <div className="absolute top-0 right-0 w-24 h-24 opacity-5 bg-warning-custom rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex justify-between items-center mb-3 border-b border-gray-850 pb-2">
                <span className="text-xs font-bold text-text-secondary uppercase font-mono">
                  {comp.name}
                </span>
                <Award className="h-5 w-5 text-warning-custom" />
              </div>

              {comp.pr ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-bold text-white block mb-2.5 truncate" title={comp.pr.exercise}>
                      {comp.pr.exercise}
                    </span>
                    <span className="text-[10px] text-text-secondary uppercase block font-semibold">Max Load</span>
                    <span className="text-2xl font-bold text-white font-mono mt-0.5 block">
                      {comp.pr.maxWeight} kg
                    </span>
                    <span className="text-[10px] text-text-secondary block mt-0.5 font-mono">
                      at {comp.pr.maxReps} reps
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-800/85 pt-3 text-xs">
                    <div>
                      <span className="text-[10px] text-text-secondary uppercase block font-mono">Est 1RM</span>
                      <span className="font-bold text-primary-accent font-mono mt-0.5 block">
                        {comp.pr.maxEst1RM} kg
                      </span>
                    </div>
                    <button 
                      onClick={() => navigate(`/exercise/${encodeURIComponent(comp.pr.exercise)}`)}
                      className="text-[10px] text-secondary-accent hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      History
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-text-secondary py-6 text-center italic">
                  No {comp.name} record logged.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Top 5 PRs Rankings List */}
      <div className="space-y-4 pt-2">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider px-1">
          Top 5 Lift Rankings (Est. 1RM)
        </h3>

        {prHighlights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...prHighlights]
              .sort((a, b) => b.maxEst1RM - a.maxEst1RM)
              .slice(0, 5)
              .map((pr, idx) => (
                <PRCard key={idx} pr={pr} index={idx} />
              ))}
          </div>
        ) : (
          <div className="bg-bg-card border border-gray-800 rounded-xl p-8 text-center text-sm text-text-secondary">
            No PRs recorded yet. Upload your CSV logs to start ranking your achievements.
          </div>
        )}
      </div>
    </div>
  );
}
