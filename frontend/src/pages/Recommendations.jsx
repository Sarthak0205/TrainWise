import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workoutApi } from '../services/api';
import RecommendationCard from '../components/RecommendationCard';
import { LoadingCard, EmptyState, ErrorState } from '../components/UIStates';
import { 
  BrainCircuit, 
  RotateCcw,
  ShieldAlert,
  Dumbbell
} from 'lucide-react';

export default function Recommendations() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState(null);
  const [mlServiceAvailable, setMlServiceAvailable] = useState(true);

  async function loadRecommendations() {
    try {
      setLoading(true);
      setError(null);
      const res = await workoutApi.getWorkoutRecommendations();
      if (res.mlServiceAvailable !== undefined) {
        setMlServiceAvailable(res.mlServiceAvailable);
      } else if (res.data && res.data.length > 0) {
        setMlServiceAvailable(res.data[0].mlServiceAvailable);
      }

      if (res.success) {
        setRecommendations(res.data || []);
      } else if (res.message === "No workout data found" || (res.data && res.data.length === 0)) {
        setRecommendations([]);
      } else {
        setError(res.message || 'No recommendations generated.');
      }
    } catch (err) {
      console.error('Error loading recommendations:', err);
      setError('Failed to fetch training targets. Make sure the backend is active.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecommendations();
  }, []);

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-primary-accent" />
            Training Guidance
          </h1>
          <p className="text-sm text-text-secondary">
            Personalized targets and coaching guidance to support consistent progress.
          </p>
        </div>
        <button
          onClick={loadRecommendations}
          className="text-xs bg-bg-card hover:bg-white/5 border border-gray-800 text-white rounded-lg px-4 py-2.5 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Re-evaluate
        </button>
      </div>

      {/* ML Offline Banner warning if present */}
      {!loading && !error && !mlServiceAvailable && (
        <div className="bg-warning-custom/10 border border-warning-custom/30 text-warning-custom p-3.5 rounded-xl text-xs flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <div>
            <span className="font-bold">Training Service Offline</span> — Using Heuristic Recommendations. The system is operating normally in fallback mode.
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LoadingCard height="h-64" />
          <LoadingCard height="h-64" />
          <LoadingCard height="h-64" />
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to Load Recommendations"
          message={error}
          onRetry={loadRecommendations}
        />
      ) : recommendations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((rec, idx) => (
            <RecommendationCard key={idx} recommendation={rec} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No recommendations available"
          description="Log workouts or upload your training history to automatically calculate progressive overload recommendations."
          icon={Dumbbell}
          actionText="Upload Workout History"
          onActionClick={() => navigate('/workouts')}
        />
      )}
    </div>
  );
}
