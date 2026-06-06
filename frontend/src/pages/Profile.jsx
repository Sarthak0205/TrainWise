import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Settings, 
  HelpCircle, 
  Save, 
  CheckCircle2,
  Sparkles,
  Info,
  Layers,
  Cpu,
  AlertTriangle
} from 'lucide-react';
import { workoutApi } from '../services/api';

export default function Profile() {
  const { user, updateProfileContext } = useAuth();
  
  const [goalType, setGoalType] = useState('hypertrophy');
  const [experienceLevel, setExperienceLevel] = useState('intermediate');
  const [preferredUnits, setPreferredUnits] = useState('kg');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Set form state from user context
  useEffect(() => {
    if (user) {
      setGoalType(user.goalType || 'hypertrophy');
      setExperienceLevel(user.experienceLevel || 'intermediate');
      setPreferredUnits(user.preferredUnits || 'kg');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    try {
      const res = await workoutApi.updateProfile({ goalType, experienceLevel, preferredUnits });
      if (res.success) {
        // Sync context
        updateProfileContext({ goalType, experienceLevel, preferredUnits });
        setSuccess(true);
        
        // Automatically dismiss success banner and reload to sync calculations
        setTimeout(() => {
          setSuccess(false);
          window.location.reload();
        }, 1500);
      } else {
        setError(res.message || 'Failed to update profile settings.');
      }
    } catch (err) {
      console.error('Error saving profile settings:', err);
      setError(err.response?.data?.message || 'A network error occurred while updating profile.');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <User className="h-6 w-6 text-primary-accent" />
          Profile Personalization Settings
        </h1>
        <p className="text-sm text-text-secondary">Configure your athletic profile to customize progressive overload calculations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Form */}
        <div className="md:col-span-2 bg-bg-card border border-gray-800 rounded-xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-800">
            <Settings className="h-4 w-4 text-secondary-accent" />
            Personalization Parameters
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* User Identity Details */}
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5 font-mono">
                Active User Identity
              </label>
              <div className="bg-black/30 border border-gray-850 rounded-lg px-4 py-3 text-sm font-mono text-white select-all">
                {user?.email || 'Loading identity...'}
              </div>
            </div>

            {/* Goal Type Selector */}
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5 font-mono">
                Goal Type
              </label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
                className="w-full bg-bg-main border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-secondary-accent"
              >
                <option value="hypertrophy">Hypertrophy (8–12 reps)</option>
                <option value="strength">Absolute Strength (3–6 reps)</option>
                <option value="endurance">Muscular Endurance (15–20 reps)</option>
              </select>
            </div>

            {/* Experience Level Selector */}
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5 font-mono">
                Experience Level
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full bg-bg-main border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-secondary-accent"
              >
                <option value="beginner">Beginner (+7.5% overload increments)</option>
                <option value="intermediate">Intermediate (+5.0% overload increments)</option>
                <option value="advanced">Advanced (+2.5% overload increments)</option>
              </select>
            </div>

            {/* Preferred Units Selector */}
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5 font-mono">
                Preferred Units
              </label>
              <select
                value={preferredUnits}
                onChange={(e) => setPreferredUnits(e.target.value)}
                className="w-full bg-bg-main border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-secondary-accent"
              >
                <option value="kg">Kilograms (kg) - 2.5 kg increments</option>
                <option value="lbs">Pounds (lbs) - 5.0 lbs increments</option>
              </select>
            </div>

            {success && (
              <div className="p-3 bg-success-custom/10 border border-success-custom/25 text-success-custom text-xs rounded-lg flex items-center gap-2 animate-pulse">
                <CheckCircle2 className="h-4 w-4" />
                <span>Profile variables updated. Re-computing models...</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-danger-custom/10 border border-danger-custom/25 text-danger-custom text-xs rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-primary-accent text-black text-xs font-bold py-3 rounded-lg hover:bg-primary-accent/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </button>
          </form>
        </div>

        {/* Right Side: Educational Helper Info */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 space-y-4 h-max">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-800">
            <Info className="h-4 w-4 text-warning-custom" />
            AI Calibration
          </h3>

          <div className="space-y-4 text-xs text-text-secondary leading-relaxed">
            <div className="space-y-1">
              <h4 className="font-semibold text-white flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-secondary-accent" />
                Rep Target Adaptations
              </h4>
              <p>
                Changing your <strong>Goal Type</strong> modifies heuristic targets. Strength coaches advise lower reps (3–6) to develop central nervous system recruitment, while hypertrophy focuses on muscular hypertrophy ranges (8–12).
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-semibold text-white flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-primary-accent" />
                Increment Adaptation
              </h4>
              <p>
                Advanced lifters experience slower adaptations. The system scales overload load multipliers based on experience (Advanced = 2.5%, Intermediate = 5.0%, Beginner = 7.5%) to prevent injury.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-warning-custom" />
                Gym Plate Rounding
              </h4>
              <p>
                Adjusts calculations to match standard commercial gym equipment availability (kg weights rounded to nearest 2.5 kg, lbs rounded to nearest 5 lbs).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
