import { useState } from 'react';
import axios from 'axios';

export default function Login({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMessage(''); setPending(true);
    try {
      if (isRegistering) {
        await axios.post('http://localhost:5000/api/users/register', { userId, password, role });
        setMessage('Account created. Log in to get started.');
        setIsRegistering(false); setPassword('');
      } else {
        const res = await axios.post('http://localhost:5000/api/users/login', { userId, password });
        onLogin(res.data.user, res.data.token);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to connect. Please try again.');
    } finally { setPending(false); }
  };
  return <div className="login-layout">
    <section className="login-story">
      <h1>Follow your<br />curiosity<span className="accent">.</span></h1>
      <p className="story-description">Great ideas start with a question. Explore lessons, learn from educators, and make sense of it all with your AI tutor.</p>
      <div className="learning-preview" aria-hidden="true">
        <div className="preview-heading"><span className="play-symbol">▷</span><span>Your next discovery</span><span className="preview-type">LEARN</span></div>
        <div className="preview-content"><span className="book-spine" /><span className="book-spine" /><span className="book-spine" /><div><strong>One place.<br />So much to explore.</strong><p>Videos · Resources · Ideas</p></div></div>
        <div className="preview-footer"><span className="status-dot" /> A space for curious minds</div>
      </div>
      <div className="story-note"><span>Learn at your pace</span><span>Share what you know</span></div>
    </section>
    <section className="login-panel" aria-labelledby="login-title">
      <div className="login-form-wrap">
        <h2 id="login-title">{isRegistering ? 'Start your next chapter' : 'Welcome back'}</h2>
        <p className="muted">{isRegistering ? 'Create an account and make room for learning.' : 'Your next discovery is waiting for you.'}</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="user-id">User ID</label>
          <input id="user-id" className="input-field" autoComplete="username" placeholder="Enter your user ID" value={userId} onChange={e => setUserId(e.target.value)} required disabled={pending} />
          <label htmlFor="password">Password</label>
          <input id="password" className="input-field" type="password" autoComplete={isRegistering ? 'new-password' : 'current-password'} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required disabled={pending} />
          {isRegistering && <><label htmlFor="role">I’m here to</label><select id="role" className="select-field" value={role} onChange={e => setRole(e.target.value)} disabled={pending}><option value="student">Learn as a student</option><option value="educator">Share as an educator</option></select></>}
          {error && <p className="notice error" role="alert">{error}</p>}
          {message && <p className="notice success" role="status">{message}</p>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={pending}>{pending ? 'Please wait…' : isRegistering ? 'Create account' : 'Log in'}<span aria-hidden="true">→</span></button>
        </form>
        <p className="auth-switch">{isRegistering ? 'Already part of EduTube?' : 'New to EduTube?'} <button className="text-button" disabled={pending} onClick={() => { setIsRegistering(!isRegistering); setError(''); setMessage(''); }}>{isRegistering ? 'Log in' : 'Create an account'}</button></p>
        <div className="login-footnote">For students who ask.<br />For educators who inspire.</div>
      </div>
    </section>
  </div>;
}
