import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error details
    console.error("💥 AppErrorBoundary caught an error:", error, errorInfo);
  }

  handleReloadDashboard = () => {
    // Reset state and redirect to dashboard
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center bg-bg-main">
          <div className="h-16 w-16 rounded-full bg-danger-custom/10 border border-danger-custom/30 flex items-center justify-center text-danger-custom mb-6 animate-bounce">
            <AlertTriangle className="h-8 w-8" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-3">Something went wrong</h1>
          
          <p className="text-text-secondary text-sm max-w-md mb-8 leading-relaxed">
            An unexpected error occurred while rendering this page or loading its components. Please reload the dashboard or try again.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={this.handleReloadDashboard}
              className="px-5 py-2.5 bg-primary-accent text-black font-semibold rounded-lg text-sm transition-all hover:bg-primary-accent/80 cursor-pointer shadow-lg shadow-primary-accent/15 flex items-center justify-center gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              Reload Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg text-sm transition-all border border-gray-700 cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Current Page
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="mt-8 p-4 bg-gray-900 border border-gray-800 rounded-lg max-w-2xl text-left font-mono text-xs text-red-400 overflow-auto">
              <p className="font-bold border-b border-gray-800 pb-2 mb-2">Development Stack Trace:</p>
              <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
