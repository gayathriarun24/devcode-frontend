import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Add loading state

  // useEffect(() => {
  //   const storedUser = localStorage.getItem('user');
  //   if (storedUser) {
  //     setUser(JSON.parse(storedUser));
  //   }
  //   setLoading(false); // Done checking localStorage
  // }, []);

  useEffect(() => {
  const storedUser = localStorage.getItem('user');
  const token = localStorage.getItem('token');

  if (storedUser && token) {
    try {
      setUser(JSON.parse(storedUser));
    } catch (e) {
      setUser(null);
    }
  } else {
    setUser(null); // Ensure user is null if no valid token/user exists
  }
  setLoading(false);
}, []);

  const loginUser = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logoutUser = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loginUser, logoutUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}