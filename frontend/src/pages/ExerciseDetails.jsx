import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workoutApi } from '../services/api';
import { LoadingCard, LoadingChart, EmptyState, ErrorState } from '../components/UIStates';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  LineChart, 
  Line, 
  Legend 
} from 'recharts';
import { 
  ArrowLeft, 
  Trophy, 
  Award, 
  Target, 
  History, 
  Table, 
  Sparkles
} from 'lucide-react';

export default function ExerciseDetails() {
  const { exercise } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);

  async function loadExerciseAnalytics() {
    try {
      setLoading(true);
      setError(null);
      const data = await workoutApi.getExerciseAnalytics(exercise);
      setAnalytics(data);
    } catch (err) {
      console.error('Error loading exercise analytics:', err);
      setError(`No workout records found for exercise: "${exercise}". Please ensure training data exists.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExerciseAnalytics();
  }, [exercise]);

  if (loading) {
    return (
      <div className="p-8 space-y-8 max-w-6xl mx-auto">
        <div className="flex flex-col gap-2">
          <div className="h-4 bg-gray-800 rounded w-24 animate-pulse"></div>
          <div className="h-8 bg-gray-800 rounded w-64 animate-pulse mt-1"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingChart height="h-[300px]" />
          <LoadingChart height="h-[300px]" />
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <ErrorState
          title="No records found"
          message={error || 'No exercise analytics statistics available.'}
          onRetry={loadExerciseAnalytics}
        />
        <button 
          onClick={() => navigate(-1)}
          className="mt-6 text-xs text-secondary-accent hover:underline flex items-center gap-1 mx-auto cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>
      </div>
    );
  }

  const {
    personalRecords = {},
    chartData = {},
    history = [],
    recentSets = []
  } = analytics;

  // Formatting chart data for recharts
  const chartPoints = (chartData.labels || []).map((label, idx) => ({
    name: label,
    'Estimated 1RM': chartData.estimated1RM[idx] || 0,
    'Max Weight': history[idx]?.maxWeight || 0,
    'Avg Weight': history[idx]?.avgWeight || 0
  }));

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header and Back Button */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => navigate(-1)}
          className="text-xs text-text-secondary hover:text-white flex items-center gap-1 w-max transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to workouts
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-white">{analytics?.exercise || exercise}</h1>
      </div>

      {/* Personal Records Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Max Weight */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-5 flex items-center justify-between transition-all hover:border-gray-700">
          <div>
            <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-semibold">Max Weight Lifted</span>
            <span className="text-2xl font-bold text-white font-mono mt-1 block">{personalRecords.maxWeight} kg</span>
          </div>
          <div className="p-3 bg-secondary-accent/10 border border-secondary-accent/20 rounded-lg text-secondary-accent">
            <Trophy className="h-6 w-6" />
          </div>
        </div>

        {/* Max Reps */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-5 flex items-center justify-between transition-all hover:border-gray-700">
          <div>
            <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-semibold">Max Reps (Single Set)</span>
            <span className="text-2xl font-bold text-white font-mono mt-1 block">{personalRecords.maxReps} reps</span>
          </div>
          <div className="p-3 bg-warning-custom/10 border border-warning-custom/20 rounded-lg text-warning-custom">
            <Award className="h-6 w-6" />
          </div>
        </div>

        {/* Max Est 1RM */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-5 flex items-center justify-between transition-all hover:border-gray-700">
          <div>
            <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-semibold">Max Estimated 1RM</span>
            <span className="text-2xl font-bold text-primary-accent font-mono mt-1 block">{personalRecords.maxEst1RM} kg</span>
          </div>
          <div className="p-3 bg-primary-accent/10 border border-primary-accent/20 rounded-lg text-primary-accent">
            <Target className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Progress Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1RM Trend */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-800">
            <Sparkles className="h-4 w-4 text-primary-accent" />
            Estimated 1RM Progression (Epley)
          </h3>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="est1rmGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e5a8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00e5a8" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#222" vertical={false} />
                <XAxis dataKey="name" stroke="#555" tick={{ fill: '#B8C0CC', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#555" tick={{ fill: '#B8C0CC', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1A1D24', border: '1px solid #333', fontSize: 11 }} />
                <Area type="monotone" dataKey="Estimated 1RM" stroke="#00e5a8" strokeWidth={2.5} fillOpacity={1} fill="url(#est1rmGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weight Load Trend */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-800">
            <Sparkles className="h-4 w-4 text-secondary-accent" />
            Max & Average Weight Trends
          </h3>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#222" vertical={false} />
                <XAxis dataKey="name" stroke="#555" tick={{ fill: '#B8C0CC', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#555" tick={{ fill: '#B8C0CC', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1A1D24', border: '1px solid #333', fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                <Line type="monotone" dataKey="Max Weight" stroke="#00b8ff" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Avg Weight" stroke="#a855f7" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* History and Recent Sets Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Historical Sessions Table */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-5 space-y-4 lg:col-span-2">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-800">
            <History className="h-4 w-4 text-text-secondary" />
            Session History Log
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-text-secondary font-mono">
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Sets</th>
                  <th className="py-2.5">Avg Weight</th>
                  <th className="py-2.5">Max Weight</th>
                  <th className="py-2.5">Avg Reps</th>
                  <th className="py-2.5 text-primary-accent">Max 1RM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40">
                {history.slice(0, 10).reverse().map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 font-medium text-white">
                      {new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 font-mono">{row.totalSets}</td>
                    <td className="py-3 font-mono">{row.avgWeight} kg</td>
                    <td className="py-3 font-mono">{row.maxWeight} kg</td>
                    <td className="py-3 font-mono">{row.avgReps}</td>
                    <td className="py-3 font-mono font-bold text-primary-accent">{row.maxEst1RM} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Sets List */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-800">
            <Table className="h-4 w-4 text-text-secondary" />
            Recent Sets (Last 15)
          </h3>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {recentSets.map((s, idx) => (
              <div 
                key={idx} 
                className="bg-black/25 border border-gray-800 rounded-lg p-3 flex justify-between items-center text-xs"
              >
                <div>
                  <span className="text-[10px] text-text-secondary block font-mono">
                    {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="font-bold text-white font-mono mt-0.5 block">
                    Set {s.setIndex + 1}
                  </span>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold text-white block">{s.weight} kg</span>
                  <span className="text-[10px] text-text-secondary block">{s.reps} reps</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
