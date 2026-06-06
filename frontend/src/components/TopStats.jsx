import React from 'react';
import { 
  Calendar, 
  Dumbbell, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap 
} from 'lucide-react';

export default function TopStats({ stats }) {
  const {
    totalSessions = 0,
    totalVolumeLifted = 0,
    weeklyVolumeChange = 0,
    trendDirection = 'flat',
    activeDaysLastMonth = 0
  } = stats || {};

  // Formatter for large volume values (e.g. 3.2M kg)
  const formatVolume = (vol) => {
    if (vol >= 1000000) {
      return `${(vol / 1000000).toFixed(2)}M`;
    }
    if (vol >= 1000) {
      return `${(vol / 1000).toFixed(1)}k`;
    }
    return vol.toLocaleString();
  };

  const statCards = [
    {
      title: 'Total Sessions',
      value: totalSessions,
      desc: 'Completed workouts',
      icon: Calendar,
      color: 'text-primary-accent',
      bgColor: 'bg-primary-accent/10 border-primary-accent/20'
    },
    {
      title: 'Total Volume',
      value: formatVolume(totalVolumeLifted),
      desc: 'Aggregate kg/lbs moved',
      icon: Dumbbell,
      color: 'text-secondary-accent',
      bgColor: 'bg-secondary-accent/10 border-secondary-accent/20'
    },
    {
      title: 'Weekly Change',
      value: `${weeklyVolumeChange > 0 ? '+' : ''}${weeklyVolumeChange}%`,
      desc: trendDirection === 'up' ? 'Increase over last week' : trendDirection === 'down' ? 'Decrease over last week' : 'No change',
      icon: trendDirection === 'up' ? TrendingUp : trendDirection === 'down' ? TrendingDown : Activity,
      color: trendDirection === 'up' ? 'text-success-custom' : trendDirection === 'down' ? 'text-danger-custom' : 'text-text-secondary',
      bgColor: trendDirection === 'up' ? 'bg-success-custom/10 border-success-custom/20' : trendDirection === 'down' ? 'bg-danger-custom/10 border-danger-custom/20' : 'bg-white/5 border-white/10'
    },
    {
      title: 'Active Days (Month)',
      value: activeDaysLastMonth,
      desc: 'Days trained in last 30d',
      icon: Zap,
      color: 'text-warning-custom',
      bgColor: 'bg-warning-custom/10 border-warning-custom/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card) => {
        const Icon = card.icon;
        return (
          <div 
            key={card.title} 
            className="bg-bg-card border border-gray-800 rounded-xl p-5 flex items-center justify-between transition-all hover:border-gray-700"
          >
            <div className="space-y-1">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                {card.title}
              </span>
              <span className="text-3xl font-bold text-white tracking-tight block">
                {card.value}
              </span>
              <span className="text-xs text-text-secondary block">
                {card.desc}
              </span>
            </div>
            <div className={`p-3 rounded-lg border ${card.bgColor}`}>
              <Icon className={`h-6 w-6 ${card.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
