import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, usersAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const response = await usersAPI.getProfile();
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await authAPI.login(email, password);
    const { key } = response.data;
    localStorage.setItem('token', key);
    await loadUser();
    return response;
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    return response;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Ignore error
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  const isAdmin = user?.is_admin || false;
  const isTeacher = user?.is_teacher || false;

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    loadUser,
    isAuthenticated: !!user,
    isAdmin,
    isTeacher,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
