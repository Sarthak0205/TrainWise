import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Mail, Lock, ShieldAlert, Sparkles, Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState(null);

  // Determine where to redirect after login
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all credentials.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await login(email, password);
      if (res.success) {
        navigate(from, { replace: true });
      } else {
        setError(res.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoBypass = async () => {
    try {
      setDemoLoading(true);
      setError(null);
      setEmail('demo_athlete@fitness.com');
      setPassword('password123');
      
      const res = await login('demo_athlete@fitness.com', 'password123');
      if (res.success) {
        navigate(from, { replace: true });
      } else {
        setError(res.error || 'Failed to authenticate Demo Athlete');
      }
    } catch (err) {
      setError('Could not connect to the database to seed Demo Athlete.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background visual shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] opacity-10 bg-primary-accent rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] opacity-10 bg-secondary-accent rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-bg-card border border-gray-800 rounded-2xl p-8 relative overflow-hidden shadow-2xl space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="h-12 w-12 rounded-full bg-primary-accent/15 border border-primary-accent/30 flex items-center justify-center text-primary-accent">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-2">
            Welcome Back
          </h1>
          <p className="text-xs text-primary-accent font-semibold tracking-wider uppercase font-mono">
            Train Smarter.<br />Progress Consistently.
          </p>
          <p className="text-xs text-text-secondary">
            Track workouts, monitor progress, and make better training decisions.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-danger-custom/10 border border-danger-custom/25 text-danger-custom text-xs rounded-lg flex items-start gap-2">
            <ShieldAlert className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block font-mono">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-secondary pointer-events-none">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || demoLoading}
                className="w-full bg-bg-main border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-secondary-accent transition-colors disabled:opacity-50"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block font-mono">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-secondary pointer-events-none">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || demoLoading}
                className="w-full bg-bg-main border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-secondary-accent transition-colors disabled:opacity-50"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || demoLoading}
            className="w-full bg-secondary-accent hover:bg-secondary-accent/90 text-black text-xs font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Enter Platform'
            )}
          </button>
        </form>

        {/* Separator */}
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-gray-850"></div>
          <span className="flex-shrink mx-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider font-mono">
            Showcase Review
          </span>
          <div className="flex-grow border-t border-gray-850"></div>
        </div>

        {/* Demo athlete bypass */}
        <button
          onClick={handleDemoBypass}
          disabled={loading || demoLoading}
          className="w-full bg-primary-accent/10 border border-primary-accent/30 text-primary-accent hover:bg-primary-accent/20 text-xs font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-primary-accent/5 disabled:opacity-50"
        >
          {demoLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary-accent" />
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Log In as Demo Athlete
            </>
          )}
        </button>

        {/* Register link */}
        <div className="text-center text-xs text-text-secondary pt-2">
          New user?{' '}
          <Link to="/register" className="text-secondary-accent hover:underline font-medium">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
