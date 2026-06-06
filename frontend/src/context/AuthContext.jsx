import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Hydrate user session on app mount
  useEffect(() => {
    async function hydrateSession() {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          // Verify token against /api/users/me
          const response = await axios.get('/api/users/me', {
            headers: {
              Authorization: `Bearer ${storedToken}`
            }
          });
          if (response.data.success) {
            setUser(response.data.user);
            setToken(storedToken);
            // Synchronize profile preferences to localStorage as fallbacks
            localStorage.setItem('goalType', response.data.user.goalType);
            localStorage.setItem('experienceLevel', response.data.user.experienceLevel);
            localStorage.setItem('preferredUnits', response.data.user.preferredUnits);
          } else {
            handleLogout();
          }
        } catch (err) {
          console.error("Session hydration failed:", err);
          handleLogout();
        }
      } else {
        handleLogout();
      }
      setLoading(false);
    }
    hydrateSession();
  }, []);

  const handleLogin = async (email, password) => {
    try {
      const response = await axios.post('/api/users/login', { email, password });
      if (response.data.success) {
        const { token: userToken, user: userData } = response.data;
        
        // Save to localStorage
        localStorage.setItem('token', userToken);
        localStorage.setItem('userId', userData.email);
        localStorage.setItem('goalType', userData.goalType);
        localStorage.setItem('experienceLevel', userData.experienceLevel);
        localStorage.setItem('preferredUnits', userData.preferredUnits);

        setToken(userToken);
        setUser(userData);
        return { success: true };
      }
      return { success: false, error: response.data.message || 'Login failed' };
    } catch (err) {
      console.error("Login error:", err);
      return { 
        success: false, 
        error: err.response?.data?.message || 'Invalid email or password.' 
      };
    }
  };

  const handleRegister = async (name, email, password) => {
    try {
      const response = await axios.post('/api/users/register', { name, email, password });
      if (response.data.success) {
        return { success: true, message: response.data.message };
      }
      return { success: false, error: response.data.message || 'Registration failed' };
    } catch (err) {
      console.error("Registration error:", err);
      return { 
        success: false, 
        error: err.response?.data?.message || 'Registration failed. Try again.' 
      };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('goalType');
    localStorage.removeItem('experienceLevel');
    localStorage.removeItem('preferredUnits');
    // We can preserve the active dev user-id key or clear it, but let's clear to reset safely
    localStorage.removeItem('userId');
    
    setToken(null);
    setUser(null);
  };

  const updateProfileContext = (profileData) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...profileData };
      localStorage.setItem('goalType', updated.goalType);
      localStorage.setItem('experienceLevel', updated.experienceLevel);
      localStorage.setItem('preferredUnits', updated.preferredUnits);
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
      updateProfileContext
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
