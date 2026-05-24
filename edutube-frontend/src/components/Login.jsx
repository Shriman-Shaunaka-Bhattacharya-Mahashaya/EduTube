import React, { useState } from 'react';
import axios from 'axios';

export default function Login({ onLogin }) {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await axios.post('http://localhost:5000/api/users/login', { userId, role });
      onLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div style={{ maxWidth: '300px', margin: '50px auto', textAlign: 'center' }}>
      <h1>EduTube Login</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input 
          type="text" 
          placeholder="Enter User ID" 
          value={userId} 
          onChange={e => setUserId(e.target.value)} 
          required 
        />
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="student">Student</option>
          <option value="educator">Educator</option>
        </select>
        <button type="submit">Login / Register</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}