import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import EducatorDashboard from './components/EducatorDashboard';
import StudentPortal from './components/StudentPortal';

function App() {
  const [user, setUser] = useState(null);

  // Check for existing session on load
  useEffect(() => {
    const savedUser = localStorage.getItem('edutube_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('edutube_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('edutube_user');
  };

  return (
    <Router>
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        {user && (
          <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #ccc' }}>
            <h2>EduTube - {user.role === 'educator' ? 'Educator Mode' : 'Student Mode'}</h2>
            <div>
              <span>Logged in as: <strong>{user.userId}</strong></span>
              <button onClick={handleLogout} style={{ marginLeft: '15px' }}>Logout</button>
            </div>
          </header>
        )}

        <Routes>
          <Route path="/" element={
            !user ? <Login onLogin={handleLogin} /> : 
            user.role === 'educator' ? <Navigate to="/educator" /> : 
            <Navigate to="/student" />
          } />
          <Route path="/educator" element={
            user?.role === 'educator' ? <EducatorDashboard user={user} /> : <Navigate to="/" />
          } />
          <Route path="/student" element={
            user?.role === 'student' ? <StudentPortal user={user} /> : <Navigate to="/" />
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;