import React from 'react';
import { Loader2, AlertCircle, Inbox, RefreshCw } from 'lucide-react';

export function LoadingCard({ height = 'h-32', className = '' }) {
  return (
    <div className={`bg-bg-card border border-gray-800 rounded-xl p-6 space-y-4 animate-pulse ${height} ${className}`}>
      <div className="h-4 bg-gray-800 rounded w-1/3"></div>
      <div className="h-8 bg-gray-800 rounded w-1/2"></div>
      <div className="h-3 bg-gray-800 rounded w-full"></div>
    </div>
  );
}

export function LoadingChart({ height = 'h-[300px]', className = '' }) {
  return (
    <div className={`bg-bg-card border border-gray-800 rounded-xl p-6 animate-pulse space-y-4 ${height} ${className}`}>
      <div className="h-6 bg-gray-800 rounded w-1/4"></div>
      <div className="flex-1 flex items-end justify-between p-4 gap-3 bg-gray-900/50 rounded-lg h-[80%]">
        <div className="h-[20%] bg-gray-800 rounded w-full"></div>
        <div className="h-[50%] bg-gray-800 rounded w-full"></div>
        <div className="h-[35%] bg-gray-800 rounded w-full"></div>
        <div className="h-[75%] bg-gray-800 rounded w-full"></div>
        <div className="h-[60%] bg-gray-800 rounded w-full"></div>
        <div className="h-[90%] bg-gray-800 rounded w-full"></div>
        <div className="h-[45%] bg-gray-800 rounded w-full"></div>
      </div>
    </div>
  );
}

export function LoadingTable({ rows = 5, cols = 4, className = '' }) {
  return (
    <div className={`bg-bg-card border border-gray-800 rounded-xl overflow-hidden animate-pulse ${className}`}>
      <div className="px-6 py-4 border-b border-gray-800 flex justify-between">
        <div className="h-5 bg-gray-800 rounded w-1/4"></div>
        <div className="h-5 bg-gray-800 rounded w-1/6"></div>
      </div>
      <div className="p-6 space-y-4">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex items-center justify-between py-2 border-b border-gray-800/40 last:border-b-0">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div
                key={cIdx}
                className={`h-4 bg-gray-800 rounded`}
                style={{ width: `${Math.max(15, Math.floor(Math.random() * 30) + 15)}%` }}
              ></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  title = 'No data available',
  description = 'There is currently no data to display here.',
  icon: Icon = Inbox,
  actionText,
  onActionClick,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 bg-bg-card border border-gray-800 rounded-xl text-center ${className}`}>
      <div className="h-12 w-12 rounded-full bg-gray-800/60 flex items-center justify-center text-text-secondary mb-4">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-text-secondary max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && onActionClick && (
        <button
          onClick={onActionClick}
          className="px-5 py-2.5 bg-primary-accent text-black font-semibold rounded-lg text-sm transition-all hover:bg-primary-accent/80 cursor-pointer shadow-lg shadow-primary-accent/15 flex items-center gap-2"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We encountered an error while loading this content.',
  onRetry,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 bg-bg-card border border-danger-custom/20 rounded-xl text-center ${className}`}>
      <div className="h-12 w-12 rounded-full bg-danger-custom/10 border border-danger-custom/25 flex items-center justify-center text-danger-custom mb-4">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-text-secondary max-w-md mb-6 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 cursor-pointer border border-gray-700"
        >
          <RefreshCw className="h-4 w-4" />
          Retry Request
        </button>
      )}
    </div>
  );
}
