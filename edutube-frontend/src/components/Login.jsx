import React, { useState } from 'react';
import axios from 'axios';

export default function Login({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    try {
      if (isRegistering) {
        // Registration Flow
        await axios.post('http://localhost:5000/api/users/register', { userId, password, role });
        setMessage('Registration successful! You can now log in.');
        setIsRegistering(false); // Switch back to login view
        setPassword('');
      } else {
        // Login Flow
        const res = await axios.post('http://localhost:5000/api/users/login', { userId, password });
        // Pass both user data and token up to App.jsx
        onLogin(res.data.user, res.data.token);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    }
  };

  return (
    <div style={{ maxWidth: '300px', margin: '50px auto', textAlign: 'center' }}>
      <h1>{isRegistering ? 'Create Account' : 'EduTube Login'}</h1>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input 
          type="text" 
          placeholder="User ID" 
          value={userId} 
          onChange={e => setUserId(e.target.value)} 
          required 
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          required 
        />
        
        {/* Only show role selection during registration */}
        {isRegistering && (
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="student">Student</option>
            <option value="educator">Educator</option>
          </select>
        )}
        
        <button type="submit" style={{ padding: '8px', cursor: 'pointer' }}>
          {isRegistering ? 'Register' : 'Login'}
        </button>
      </form>

      {error && <p style={{ color: 'red', fontSize: '0.9em' }}>{error}</p>}
      {message && <p style={{ color: 'green', fontSize: '0.9em' }}>{message}</p>}

      <button 
        onClick={() => { setIsRegistering(!isRegistering); setError(''); setMessage(''); }} 
        style={{ marginTop: '20px', background: 'none', border: 'none', color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}
      >
        {isRegistering ? 'Already have an account? Log in' : 'Need an account? Register'}
      </button>
    </div>
  );
}