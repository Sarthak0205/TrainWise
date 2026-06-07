import React, { useEffect, useRef, useState } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

function ChartFrame({ height = 260, children }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const updateWidth = () => {
      const nextWidth = Math.floor(node.getBoundingClientRect().width);
      setWidth(nextWidth > 0 ? nextWidth : 0);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full min-w-0 overflow-hidden" style={{ height, minHeight: height }}>
      {width > 0 ? children({ width, height }) : (
        <div className="flex h-full items-center justify-center text-xs text-text-secondary">
          Preparing chart...
        </div>
      )}
    </div>
  );
}

// Custom dark SaaS theme tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-card border border-gray-700 p-3 rounded-lg shadow-xl text-xs">
        <p className="font-semibold text-white mb-1">{label}</p>
        {payload.map((p, idx) => (
          <p key={idx} style={{ color: p.color || p.fill }} className="font-mono">
            {p.name}: {p.value === null || p.value === undefined ? 'N/A' : Number(p.value).toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// 1. Weekly Volume Trend Chart
export function VolumeTrendChart({ chartData }) {
  const { labels = [], volume = [], setCounts = [] } = chartData || {};

  const data = labels.map((label, index) => ({
    name: label,
    Volume: volume[index] || 0,
    Sets: setCounts[index] || 0
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[260px] w-full text-xs text-text-secondary">
        No recent session history found.
      </div>
    );
  }

  return (
    <ChartFrame height={260}>
      {({ width, height }) => (
        <AreaChart width={width} height={height} data={data} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
          <defs>
            <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00b8ff" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#00b8ff" stopOpacity={0.0}/>
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#222" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#555" 
            tick={{ fill: '#B8C0CC', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis 
            stroke="#555" 
            tick={{ fill: '#B8C0CC', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={54}
            tickFormatter={(value) => Number(value) >= 1000 ? `${Math.round(Number(value) / 1000)}k` : value}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="Volume" 
            name="Weekly Volume"
            stroke="#00b8ff" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#volumeGrad)" 
          />
        </AreaChart>
      )}
    </ChartFrame>
  );
}

// 2. Fatigue Trend Chart
export function FatigueTrendChart({ fatigueData }) {
  const data = (fatigueData || []).map(f => ({
    name: new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Fatigue: f.score || 0
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[260px] w-full text-xs text-text-secondary">
        Load more workouts to track fatigue trends.
      </div>
    );
  }

  return (
    <ChartFrame height={260}>
      {({ width, height }) => (
        <LineChart width={width} height={height} data={data} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="#222" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#555" 
            tick={{ fill: '#B8C0CC', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis 
            stroke="#555" 
            tick={{ fill: '#B8C0CC', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            width={42}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="Fatigue" 
            name="Fatigue Score"
            stroke="#ff5a5a" 
            strokeWidth={2.5}
            activeDot={{ r: 6 }}
            dot={{ r: 3, fill: '#ff5a5a' }}
          />
        </LineChart>
      )}
    </ChartFrame>
  );
}

// 3. Movement Balance Donut Chart
export function MovementBalanceChart({ balanceData }) {
  const COLORS = ['#00E5A8', '#00B8FF', '#FFC857', '#FF5A5A', '#A855F7', '#6B7280'];

  const data = (balanceData || []).map((b, idx) => ({
    name: b.pattern.replace('_', ' ').toUpperCase(),
    value: b.setsCount,
    percentage: b.percentage
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px] w-full text-xs text-text-secondary">
        Perform more exercises to map balance.
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 h-[200px] w-full">
      <div className="w-[140px] h-[140px]">
        <PieChart width={140} height={140}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={60}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </div>

      <div className="space-y-1.5 flex-1 min-w-0">
        {data.map((entry, index) => (
          <div key={entry.name} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 truncate">
              <span 
                className="w-2.5 h-2.5 rounded-full shrink-0" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }} 
              />
              <span className="text-text-secondary truncate">{entry.name}</span>
            </span>
            <span className="font-semibold text-white font-mono shrink-0">
              {entry.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. Coaching Readiness & Consistency Trends Chart
export function CoachingTrendsChart({ trendData }) {
  const { labels = [], readiness = [], consistency = [] } = trendData || {};
  const hasReadinessTrend = readiness.some((value) => typeof value === 'number');

  const data = labels.map((label, index) => ({
    name: label,
    Readiness: readiness[index] ?? null,
    Consistency: consistency[index] || 0
  })).filter((point) => point.Readiness !== null || point.Consistency !== null);

  if (!hasReadinessTrend || data.length === 0) {
    return (
      <div className="flex h-[260px] min-h-[260px] w-full flex-col items-center justify-center text-center text-xs text-text-secondary px-4">
        <span className="text-sm font-bold text-white">Building Your Training Baseline</span>
        <span className="mt-1">Complete more workouts to unlock long-term trend analysis.</span>
      </div>
    );
  }

  return (
    <ChartFrame height={260}>
      {({ width, height }) => (
        <LineChart width={width} height={height} data={data} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="#222" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#555" 
            tick={{ fill: '#B8C0CC', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis 
            stroke="#555" 
            tick={{ fill: '#B8C0CC', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            width={42}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="Readiness" 
            name="Recovery Readiness"
            stroke="#00E5A8" 
            strokeWidth={2.5}
            activeDot={{ r: 6 }}
            dot={{ r: 3, fill: '#00E5A8' }}
          />
          <Line 
            type="monotone" 
            dataKey="Consistency" 
            name="Consistency Score"
            stroke="#00b8ff" 
            strokeWidth={2.5}
            activeDot={{ r: 6 }}
            dot={{ r: 3, fill: '#00b8ff' }}
          />
        </LineChart>
      )}
    </ChartFrame>
  );
}

// 5. Recovery Trends Chart
export function RecoveryTrendsChart({ recoveryData }) {
  // Sort chronologically (oldest to newest)
  const data = [...recoveryData]
    .reverse()
    .map(log => ({
      name: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Sleep: log.sleep,
      Energy: log.energy,
      Soreness: log.soreness,
      Stress: log.stress
    }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[260px] w-full text-xs text-text-secondary">
        No recovery history found.
      </div>
    );
  }

  return (
    <ChartFrame height={280}>
      {({ width, height }) => (
        <LineChart width={width} height={height} data={data} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="#222" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#555" 
            tick={{ fill: '#B8C0CC', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis 
            stroke="#555" 
            tick={{ fill: '#B8C0CC', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            width={30}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
          <Line 
            type="monotone" 
            dataKey="Sleep" 
            name="Sleep Quality"
            stroke="#00B8FF" 
            strokeWidth={2}
            activeDot={{ r: 5 }}
            dot={{ r: 2 }}
          />
          <Line 
            type="monotone" 
            dataKey="Energy" 
            name="Energy Level"
            stroke="#FFC857" 
            strokeWidth={2}
            activeDot={{ r: 5 }}
            dot={{ r: 2 }}
          />
          <Line 
            type="monotone" 
            dataKey="Soreness" 
            name="Muscle Soreness"
            stroke="#FF5A5A" 
            strokeWidth={2}
            activeDot={{ r: 5 }}
            dot={{ r: 2 }}
          />
          <Line 
            type="monotone" 
            dataKey="Stress" 
            name="Stress Level"
            stroke="#A855F7" 
            strokeWidth={2}
            activeDot={{ r: 5 }}
            dot={{ r: 2 }}
          />
        </LineChart>
      )}
    </ChartFrame>
  );
}
