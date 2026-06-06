import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workoutApi } from '../services/api';
import SessionCard from '../components/SessionCard';
import { LoadingCard, EmptyState, ErrorState } from '../components/UIStates';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw 
} from 'lucide-react';

export default function Sessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadSessions(page = 1) {
    try {
      setLoading(true);
      setError(null);
      const res = await workoutApi.getSessionHistory(10, page);
      setSessions(res.sessions || []);
      setPagination(res.pagination || { total: 0, limit: 10, page: 1, totalPages: 1 });
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Failed to fetch session history list. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions(1);
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadSessions(newPage);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary-accent" />
            Session History Logs
          </h1>
          <p className="text-sm text-text-secondary">Explore all previously completed date-grouped training sessions.</p>
        </div>
        <button
          onClick={() => loadSessions(pagination.page)}
          className="text-xs bg-bg-card hover:bg-white/5 border border-gray-800 text-white rounded-lg p-2.5 transition-colors cursor-pointer flex items-center justify-center"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <LoadingCard height="h-28" />
          <LoadingCard height="h-28" />
          <LoadingCard height="h-28" />
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to Load Sessions"
          message={error}
          onRetry={() => loadSessions(pagination.page)}
        />
      ) : sessions.length > 0 ? (
        <div className="space-y-4">
          <div className="space-y-3">
            {sessions.map((session, idx) => (
              <SessionCard key={idx} session={session} />
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-800/60 pt-4 text-sm text-text-secondary">
              <span>
                Showing page <strong className="text-white font-mono">{pagination.page}</strong> of <strong className="text-white font-mono">{pagination.totalPages}</strong> ({pagination.total} sessions)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="bg-bg-card border border-gray-800 hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-bg-card text-white rounded p-2 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="bg-bg-card border border-gray-800 hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-bg-card text-white rounded p-2 transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          title="No workout sessions found"
          description="Log workouts or upload your fitness logs to view your organized training history timeline."
          icon={Calendar}
          actionText="Upload Workout History"
          onActionClick={() => navigate('/workouts')}
        />
      )}
    </div>
  );
}
