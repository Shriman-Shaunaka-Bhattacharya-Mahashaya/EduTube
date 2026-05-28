import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import EducatorDashboard from './components/EducatorDashboard';
import StudentPortal from './components/StudentPortal';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // Check for existing session and token on load
  useEffect(() => {
    const savedUser = localStorage.getItem('edutube_user');
    const savedToken = localStorage.getItem('edutube_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('edutube_user', JSON.stringify(userData));
    localStorage.setItem('edutube_token', authToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('edutube_user');
    localStorage.removeItem('edutube_token');
  };

  return (
    <Router>
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        {user && (
          <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
            <h2>EduTube - {user.role === 'educator' ? 'Educator Mode' : 'Student Mode'}</h2>
            <div>
              <span>Logged in as: <strong>{user.userId}</strong></span>
              <button onClick={handleLogout} style={{ marginLeft: '15px', cursor: 'pointer' }}>Logout</button>
            </div>
          </header>
        )}

        <Routes>
          <Route path="/" element={
            !user ? <Login onLogin={handleLogin} /> : 
            user.role === 'educator' ? <Navigate to="/educator" /> : 
            <Navigate to="/student" />
          } />
          {/* We must pass the token down as a prop so the components can use it in API calls */}
          <Route path="/educator" element={
            user?.role === 'educator' ? <EducatorDashboard user={user} token={token} /> : <Navigate to="/" />
          } />
          <Route path="/student" element={
            user?.role === 'student' ? <StudentPortal user={user} token={token} /> : <Navigate to="/" />
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;