import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import AppErrorBoundary from './components/AppErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Workouts from './pages/Workouts';
import Recommendations from './pages/Recommendations';
import Analytics from './pages/Analytics';
import Sessions from './pages/Sessions';
import ExerciseDetails from './pages/ExerciseDetails';
import Records from './pages/Records';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';

export default function App() {
  return (
    <BrowserRouter>
      <AppErrorBoundary>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Application Routes wrapped with DashboardLayout and ProtectedRoute */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/workouts" element={<Workouts />} />
                    <Route path="/recommendations" element={<Recommendations />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/sessions" element={<Sessions />} />
                    <Route path="/exercise/:exercise" element={<ExerciseDetails />} />
                    <Route path="/records" element={<Records />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AppErrorBoundary>
    </BrowserRouter>
  );
}

