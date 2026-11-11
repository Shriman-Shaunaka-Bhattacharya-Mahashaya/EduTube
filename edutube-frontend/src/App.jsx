import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './components/Login';
import EducatorDashboard from './components/EducatorDashboard';
import StudentPortal from './components/StudentPortal';
import ThemeToggle from './components/ThemeToggle';

function readSession() {
  try {
    const user = JSON.parse(localStorage.getItem('edutube_user'));
    const token = localStorage.getItem('edutube_token');
    return user && token && ['student', 'educator'].includes(user.role) ? { user, token } : null;
  } catch { return null; }
}
export default function App() {
  const [session, setSession] = useState(readSession);
  const user = session?.user;
  const handleLogin = (user, token) => {
    setSession({ user, token });
    try {
      localStorage.setItem('edutube_user', JSON.stringify(user));
      localStorage.setItem('edutube_token', token);
    } catch { /* Keep the in-memory session usable. */ }
  };
  const handleLogout = () => {
    setSession(null);
    try {
      localStorage.removeItem('edutube_user');
      localStorage.removeItem('edutube_token');
    } catch { /* Storage may be blocked. */ }
  };
  return <Router>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header">
      <Link to="/" className="brand" aria-label="EduTube home"><span className="brand-mark"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 6 9 6-9 6V6Z" fill="currentColor" /></svg></span>EduTube<span className="brand-dot">.</span></Link>
      <div className="header-actions">
        {user && <span className="user-label">{user.userId}<span className="role-label">{user.role === 'educator' ? 'Educator studio' : 'Student workspace'}</span></span>}
        <ThemeToggle />
        {user && <button className="btn btn-outline" onClick={handleLogout}>Log out</button>}
      </div>
    </header>
    <main id="main-content">
      <Routes>
        <Route path="/" element={!user ? <Login onLogin={handleLogin} /> : <Navigate replace to={`/${user.role}`} />} />
        <Route path="/educator" element={user?.role === 'educator' ? <EducatorDashboard user={user} token={session.token} /> : <Navigate replace to="/" />} />
        <Route path="/student" element={user?.role === 'student' ? <StudentPortal user={user} token={session.token} /> : <Navigate replace to="/" />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </main>
    <footer className="site-footer"><span>EduTube</span><span>A little curiosity. A world of possibility.</span></footer>
  </Router>;
}
