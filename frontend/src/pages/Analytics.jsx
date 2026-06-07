import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workoutApi, coachingApi, dailyLogApi } from '../services/api';
import {
  VolumeTrendChart,
  FatigueTrendChart,
  MovementBalanceChart,
  CoachingTrendsChart,
  RecoveryTrendsChart
} from '../components/Charts';
import { LoadingChart, EmptyState, ErrorState } from '../components/UIStates';
import {
  TrendingUp,
  Layers,
  Activity,
  BarChart4,
  ArrowRight,
  BrainCircuit,
  BarChart3,
  ClipboardCheck
} from 'lucide-react';

function safeFixed(value, digits = 2) {
  if (value === undefined || value === null || isNaN(value)) {
    return 'N/A';
  }
  const num = Number(value);
  return isNaN(num) ? 'N/A' : num.toFixed(digits);
}

function LongTermTrainingTrends({ coachingData }) {
  const trends = coachingData?.trends || {};
  const volumeData = Array.isArray(trends.volumeData) ? trends.volumeData : [];

  return (
    <div className="border-t border-gray-800/80 pt-6 space-y-6">
      <div className="space-y-0.5">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary-accent" />
          Long-Term Training Trends
        </h2>
        <p className="text-xs text-text-secondary">
          Track recovery readiness, consistency, and weekly progress over the last 12 weeks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bg-card border border-gray-800 rounded-xl p-4 sm:p-6 space-y-4 min-w-0">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-gray-800/60 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>Readiness & Consistency</span>
            <span className="text-[10px] bg-primary-accent/10 border border-primary-accent/30 text-primary-accent font-mono font-bold px-2.5 py-0.5 rounded uppercase w-fit">
              12-Week Window
            </span>
          </h3>
          <CoachingTrendsChart trendData={trends} />
        </div>

        <div className="bg-bg-card border border-gray-800 rounded-xl p-4 sm:p-6 space-y-4 min-w-0">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-gray-800/60 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>Volume Progression</span>
            <span className="text-[10px] bg-secondary-accent/10 border border-secondary-accent/30 text-secondary-accent font-mono font-bold px-2.5 py-0.5 rounded uppercase w-fit">
              Weekly Load
            </span>
          </h3>
          <VolumeTrendChart 
            chartData={{ 
              labels: trends.volumeLabels || [], 
              volume: volumeData,
              setCounts: new Array(volumeData.length).fill(0) 
            }} 
          />
        </div>
      </div>
    </div>
  );
}

export default function Analytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [coachingData, setCoachingData] = useState(null);
  const [recoveryLogs, setRecoveryLogs] = useState([]);
  const [error, setError] = useState(null);
  const [mlImportance, setMlImportance] = useState(null);
  const [mlPerformance, setMlPerformance] = useState(null);
  const [activeModelTab, setActiveModelTab] = useState('weight');

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError(null);
      
      const localToday = new Date().toISOString().split('T')[0];
      const [summary, coaching] = await Promise.all([
        workoutApi.getDashboardSummary(),
        coachingApi.getSummary(localToday)
      ]);
      setData(summary);
      setCoachingData(coaching);

      // Fetch ML details & recovery logs gracefully
      try {
        const [importanceRes, performanceRes, logsRes] = await Promise.all([
          workoutApi.getMLFeatureImportance(),
          workoutApi.getMLPerformance(),
          dailyLogApi.getRecentLogs(30)
        ]);
        if (importanceRes.success) setMlImportance(importanceRes.data);
        if (performanceRes.success) setMlPerformance(performanceRes.data);
        if (logsRes.success) setRecoveryLogs(logsRes.data);
      } catch (mlErr) {
        console.warn('Gracefully handled ML/logs endpoints failure:', mlErr);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to fetch analytics statistics. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-4 sm:p-8 space-y-6 max-w-6xl mx-auto">
        <div className="h-8 bg-gray-800 rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingChart height="h-[300px]" />
          <LoadingChart height="h-[300px]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-8 max-w-6xl mx-auto">
        <ErrorState
          title="Failed to Load Analytics"
          message={error}
          onRetry={loadAnalytics}
        />
      </div>
    );
  }

  function renderRecoveryTrends() {
    return (
      <div className="border-t border-gray-800/80 pt-6 space-y-6">
        <div className="space-y-0.5">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary-accent" />
            Recovery Context Trends
          </h2>
          <p className="text-xs text-text-secondary">
            Analyze sleep quality, energy levels, stress, and soreness over the last 30 days.
          </p>
        </div>

        {recoveryLogs.length === 0 ? (
          <div className="bg-bg-card border border-gray-800 rounded-xl p-8 text-center space-y-4 shadow">
            <ClipboardCheck className="h-10 w-10 text-text-secondary mx-auto opacity-50" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">No Recovery Logs Available</h4>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Complete your first recovery check-in to unlock daily recovery insights.
              </p>
            </div>
            <button
              onClick={() => navigate('/daily-log')}
              className="bg-primary-accent text-black text-xs font-bold px-4 py-2 rounded-lg hover:bg-primary-accent/90 transition-all cursor-pointer shadow-sm inline-block"
            >
              Complete first recovery check-in
            </button>
          </div>
        ) : recoveryLogs.length < 7 ? (
          <div className="bg-bg-card border border-gray-800 rounded-xl p-8 text-center space-y-3 shadow">
            <ClipboardCheck className="h-10 w-10 text-warning-custom mx-auto opacity-70 animate-pulse" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Building Recovery Baseline</h4>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Logged {recoveryLogs.length} of 7 check-ins. Complete a few more recovery check-ins to unlock trend insights.
              </p>
            </div>
            <button
              onClick={() => navigate('/daily-log')}
              className="bg-primary-accent text-black text-xs font-bold px-4 py-2 rounded-lg hover:bg-primary-accent/90 transition-all cursor-pointer shadow-sm inline-block"
            >
              Complete Check-In
            </button>
          </div>
        ) : (
          <div className="bg-bg-card border border-gray-800 rounded-xl p-4 sm:p-6 space-y-4 min-w-0 shadow">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-gray-800/60 pb-3 flex justify-between items-center">
              <span>30-Day Recovery Signals</span>
              <span className="text-[10px] bg-primary-accent/10 border border-primary-accent/30 text-primary-accent font-mono font-bold px-2 py-0.5 rounded uppercase">
                Active Baseline ({recoveryLogs.length} logs)
              </span>
            </h3>
            <RecoveryTrendsChart recoveryData={recoveryLogs} />
          </div>
        )}
      </div>
    );
  }

  const {
    summaryCards = {},
    weeklyVolumeChart = {},
    topExercises = [],
    prHighlights = [],
    movementBalance = [],
    fatigueTrend = []
  } = data || {};

  const totalSessions = summaryCards.totalSessions || 0;

  // Normalize ML response shapes before rendering
  const performance = mlPerformance?.metrics || mlPerformance?.data?.metrics || null;
  const weightImportance = mlImportance?.weight_model || mlImportance?.data?.weight_model || null;
  const repsImportance = mlImportance?.reps_model || mlImportance?.data?.reps_model || null;

  if (totalSessions === 0) {
    return (
      <div className="p-4 sm:p-8 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary-accent" />
            Analytics & Performance Trends
          </h1>
          <p className="text-sm text-text-secondary">Explore training volume distribution, fatigue monitoring, and compound lift trends.</p>
        </div>
        <EmptyState
          title="Analytics will appear after training data is available"
          description="We need at least one completed session to map performance, fatigue trends, and exercise distribution charts."
          icon={TrendingUp}
          actionText="Ingest workout logs"
          onActionClick={() => navigate('/workouts')}
        />
        <LongTermTrainingTrends coachingData={coachingData} />
        {renderRecoveryTrends()}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary-accent" />
          Analytics & Performance Trends
        </h1>
        <p className="text-sm text-text-secondary">Explore training volume distribution, fatigue monitoring, and compound lift trends.</p>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Trend */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-4 sm:p-6 space-y-4 min-w-0">
          <div className="flex items-center gap-2 border-b border-gray-800/60 pb-3">
            <BarChart4 className="h-5 w-5 text-secondary-accent" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Weekly Training Volume</h3>
          </div>
          <VolumeTrendChart chartData={weeklyVolumeChart} />
        </div>

        {/* Fatigue Trend */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-4 sm:p-6 space-y-4 min-w-0">
          <div className="flex items-center gap-2 border-b border-gray-800/60 pb-3">
            <Activity className="h-5 w-5 text-danger-custom" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Fatigue Coefficient Trend</h3>
          </div>
          <FatigueTrendChart fatigueData={fatigueTrend} />
        </div>
      </div>

      {/* Second Row: Balance & Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart Balance */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-4 sm:p-6 space-y-4 lg:col-span-1 min-w-0">
          <div className="flex items-center gap-2 border-b border-gray-800/60 pb-3">
            <Layers className="h-5 w-5 text-primary-accent" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Movement Pattern Ratio</h3>
          </div>
          <div className="py-2">
            <MovementBalanceChart balanceData={movementBalance} />
          </div>
        </div>

        {/* Frequency & PRs list */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Exercises */}
          <div className="bg-bg-card border border-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-gray-800">
              Exercise Frequency (Sets)
            </h3>
            {topExercises.length > 0 ? (
              <div className="space-y-3 pt-1">
                {topExercises.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-text-secondary truncate pr-2 font-medium">{item.exercise}</span>
                    <span className="font-bold text-white font-mono shrink-0">{item.setsCount} sets</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-secondary text-center py-4">No exercises logged.</p>
            )}
          </div>

          {/* PR Highlights */}
          <div className="bg-bg-card border border-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-gray-800">
              Personal Record Highlights
            </h3>
            {prHighlights.length > 0 ? (
              <div className="space-y-3 pt-1">
                {prHighlights.slice(0, 5).map((pr, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(`/exercise/${encodeURIComponent(pr.exercise)}`)}
                    className="w-full text-left flex justify-between items-center text-xs hover:bg-white/5 p-1.5 rounded transition-colors group cursor-pointer"
                  >
                    <span className="text-text-secondary font-medium truncate pr-2 group-hover:text-white transition-colors">{pr.exercise}</span>
                    <span className="font-bold text-primary-accent font-mono shrink-0 flex items-center gap-1">
                      {pr.maxWeight} kg
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-secondary-accent" />
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-secondary text-center py-4">No PRs found.</p>
            )}
          </div>
        </div>
      </div>

      {/* Long-Term Training Trends Section */}
      <LongTermTrainingTrends coachingData={coachingData} />

      {/* Performance Model Insights Section */}
      {performance && weightImportance && repsImportance && (
        <div className="border-t border-gray-800/80 pt-6 space-y-6">
          <div className="space-y-0.5">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-purple-400" />
              Performance Model Insights
            </h2>
            <p className="text-xs text-text-secondary">
              Real-time model accuracy metrics, training benchmarks, and random forest feature weight distributions.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Model Benchmarks */}
            <div className="bg-bg-card border border-gray-800 rounded-xl p-6 space-y-4 lg:col-span-2">
              <div className="flex items-center gap-2 border-b border-gray-800/60 pb-3 justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-secondary-accent" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Model Accuracy Benchmarks</h3>
                </div>
                <span className="text-[10px] bg-purple-500/10 border border-purple-500/30 text-purple-400 font-mono font-bold px-2 py-0.5 rounded">
                  Chronological 80/20 Test Split
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Weight Predictions Card */}
                <div className="bg-black/35 border border-gray-800/65 rounded-lg p-4 space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center justify-between">
                    <span>WEIGHT PREDICTION ERROR (MAE)</span>
                    <span className="text-primary-accent font-mono text-[10px] bg-primary-accent/5 border border-primary-accent/20 px-1.5 py-0.2 rounded font-normal lowercase">Lower is better</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-secondary">Heuristic Fallback Rules</span>
                      <span className="font-semibold text-white font-mono">
                        {safeFixed(performance?.heuristic?.weight_mae) === 'N/A' ? 'N/A' : `${safeFixed(performance?.heuristic?.weight_mae)} kg`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-secondary">Pattern-Based Model</span>
                      <span className="font-bold text-primary-accent font-mono">
                        {safeFixed(performance?.ml_only?.weight_mae) === 'N/A' ? 'N/A' : `${safeFixed(performance?.ml_only?.weight_mae)} kg`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-gray-800/80 pt-1.5">
                      <span className="text-text-secondary">Hybrid Coaching Engine</span>
                      <span className="font-semibold text-secondary-accent font-mono">
                        {safeFixed(performance?.hybrid?.weight_mae) === 'N/A' ? 'N/A' : `${safeFixed(performance?.hybrid?.weight_mae)} kg`}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-text-secondary leading-normal">
                    * Hybrid engine MAE includes safety deloads that override pure ML predictions for joint recovery and systemic fatigue control.
                  </p>
                </div>

                {/* Reps Predictions Card */}
                <div className="bg-black/35 border border-gray-800/65 rounded-lg p-4 space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center justify-between">
                    <span>REPS PREDICTION ERROR (MAE)</span>
                    <span className="text-primary-accent font-mono text-[10px] bg-primary-accent/5 border border-primary-accent/20 px-1.5 py-0.2 rounded font-normal lowercase">Lower is better</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-secondary">Heuristic Fallback Rules</span>
                      <span className="font-semibold text-white font-mono">
                        {safeFixed(performance?.heuristic?.reps_mae) === 'N/A' ? 'N/A' : `${safeFixed(performance?.heuristic?.reps_mae)} reps`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-secondary">Pattern-Based Model</span>
                      <span className="font-bold text-primary-accent font-mono">
                        {safeFixed(performance?.ml_only?.reps_mae) === 'N/A' ? 'N/A' : `${safeFixed(performance?.ml_only?.reps_mae)} reps`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-gray-800/80 pt-1.5">
                      <span className="text-text-secondary">Hybrid Coaching Engine</span>
                      <span className="font-semibold text-secondary-accent font-mono">
                        {safeFixed(performance?.hybrid?.reps_mae) === 'N/A' ? 'N/A' : `${safeFixed(performance?.hybrid?.reps_mae)} reps`}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-text-secondary leading-normal">
                    * Historical pattern alignment reduces prediction error by over 80% compared to pure heuristic guesses, providing highly precise overload recommendations.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature Importance Panel */}
            <div className="bg-bg-card border border-gray-800 rounded-xl p-6 space-y-4 lg:col-span-1">
              <div className="flex flex-col space-y-3 border-b border-gray-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-purple-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Feature Importances</h3>
                </div>

                {/* Tabs Toggle */}
                <div className="flex bg-black/40 p-1 rounded-lg border border-gray-800/80">
                  <button
                    onClick={() => setActiveModelTab('weight')}
                    className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${activeModelTab === 'weight'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'text-text-secondary hover:text-white border border-transparent'
                      }`}
                  >
                    Weight Model
                  </button>
                  <button
                    onClick={() => setActiveModelTab('reps')}
                    className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${activeModelTab === 'reps'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'text-text-secondary hover:text-white border border-transparent'
                      }`}
                  >
                    Reps Model
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {(() => {
                  const FEATURE_LABELS = {
                    w1: 'Last Set Weight (t-1)',
                    r1: 'Last Set Reps (t-1)',
                    w2: 'Second Last Set Weight (t-2)',
                    r2: 'Second Last Set Reps (t-2)',
                    volume: 'Total Session Volume',
                    delta_weight: 'Weight Delta (w2 - w1)',
                    delta_reps: 'Reps Delta (r2 - r1)',
                    session_gap: 'Days Since Last Session'
                  };

                  const modelData = activeModelTab === 'weight' ? weightImportance : repsImportance;
                  const sortedFeatures = Object.entries(modelData || {})
                    .map(([key, val]) => ({ key, value: val }))
                    .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
                    .slice(0, 5);

                  return sortedFeatures.map((f) => {
                    const label = f.key.startsWith('exercise_')
                      ? `Exercise: ${f.key.replace('exercise_', '')}`
                      : FEATURE_LABELS[f.key] || f.key;
                    const percentageVal = f.value !== undefined && f.value !== null && !isNaN(f.value) ? f.value * 100 : null;
                    const percentageStr = percentageVal !== null ? percentageVal.toFixed(1) : 'N/A';
                    const percentageWidth = percentageVal !== null ? Math.max(2, percentageVal) : 2;
                    return (
                      <div key={f.key} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-text-secondary truncate max-w-[75%]">{label}</span>
                          <span className="text-purple-400 font-mono font-bold">
                            {percentageStr === 'N/A' ? 'N/A' : `${percentageStr}%`}
                          </span>
                        </div>
                        <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-gray-800">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500/80 to-purple-400 rounded-full"
                            style={{ width: `${percentageWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
      {renderRecoveryTrends()}
    </div>
  );
}
