import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Dumbbell, 
  BrainCircuit, 
  TrendingUp, 
  Calendar, 
  Trophy, 
  User,
  Activity,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ClipboardCheck,
  ClipboardList,
  Copy
} from 'lucide-react';

export default function DashboardLayout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDemo = user?.email === 'demo_athlete@fitness.com';

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Workouts', path: '/workouts', icon: Dumbbell },
    { name: 'Log Workout', path: '/log-workout', icon: ClipboardList },
    { name: 'Templates', path: '/templates', icon: Copy },
    { name: 'Training Guidance', path: '/recommendations', icon: BrainCircuit },
    { name: 'Daily Log', path: '/daily-log', icon: ClipboardCheck },
    { name: 'Analytics', path: '/analytics', icon: TrendingUp },
    { name: 'Personal Records', path: '/records', icon: Trophy },
    { name: 'Profile', path: '/profile', icon: User }
  ];

  const navigation = (
    <>
      {isDemo && (
        <div className="mx-4 mt-4 px-3 py-2 bg-primary-accent/5 border border-primary-accent/20 rounded-lg flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-accent"></span>
          </span>
          <span className="text-[11px] font-bold text-primary-accent tracking-wider uppercase">
            Demo Mode Active
          </span>
        </div>
      )}

      <nav className="p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-primary-accent/10 text-primary-accent border-l-2 border-primary-accent' 
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-primary-accent' : 'text-text-secondary'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </>
  );

  const userProfile = (
    <div className="p-4 border-t border-gray-800 bg-black/20">
      <div className="flex items-center gap-2">
        {isDemo ? (
          <div className="h-8 w-8 rounded-full bg-primary-accent/15 border border-primary-accent/30 flex items-center justify-center text-primary-accent shadow-sm shadow-primary-accent/10 shrink-0">
            <ShieldCheck className="h-4 w-4" />
          </div>
        ) : (
          <div className="h-8 w-8 rounded-full bg-secondary-accent/15 border border-secondary-accent/30 flex items-center justify-center font-bold text-sm text-secondary-accent shrink-0">
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-semibold text-white truncate">
            {user?.name || 'User'}
          </span>
          <span className="text-[10px] text-text-secondary truncate">
            {user?.email}
          </span>
        </div>
        
        <button
          onClick={logout}
          title="Log Out"
          className="p-1.5 text-text-secondary hover:text-danger-custom rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-main text-text-primary lg:flex">
      <header className="lg:hidden sticky top-0 z-40 h-16 bg-bg-sidebar/95 backdrop-blur border-b border-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="h-5 w-5 text-primary-accent shrink-0" />
          <span className="font-bold text-lg tracking-wider bg-gradient-to-r from-primary-accent to-secondary-accent bg-clip-text text-transparent">
            TrainWise
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 text-text-secondary hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setMobileMenuOpen(false)}>
          <aside
            className="w-[min(82vw,20rem)] h-full bg-bg-sidebar border-r border-gray-800 flex flex-col justify-between shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="h-16 flex items-center justify-between px-5 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary-accent" />
                  <span className="font-bold text-lg tracking-wider bg-gradient-to-r from-primary-accent to-secondary-accent bg-clip-text text-transparent">
                    TrainWise
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-text-secondary hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {navigation}
            </div>
            {userProfile}
          </aside>
        </div>
      )}

      {/* 1. Left Sidebar */}
      <aside className="hidden lg:flex w-64 bg-bg-sidebar border-r border-gray-800 flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="h-20 flex flex-col justify-center px-6 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary-accent" />
              <span className="font-bold text-lg tracking-wider bg-gradient-to-r from-primary-accent to-secondary-accent bg-clip-text text-transparent">
                TrainWise
              </span>
            </div>
            <span className="text-[10px] text-text-secondary mt-1 font-medium">
              Train Smarter. Progress Consistently.
            </span>
          </div>
          {navigation}
        </div>

        {/* User Profile Card & Log Out */}
        {userProfile}
      </aside>

      {/* 2. Central Content Area */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
