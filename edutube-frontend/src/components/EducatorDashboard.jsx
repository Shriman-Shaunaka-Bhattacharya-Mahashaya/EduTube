import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function EducatorDashboard({ user, token }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState('');
  const [myMedia, setMyMedia] = useState([]); 
  const [profile, setProfile] = useState(null); // State for educator's profile stats

  const fetchMyMedia = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/media/educator/${user.userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyMedia(res.data);
    } catch (err) {
      console.error('Failed to fetch media', err);
      if (err.response?.status === 401) setStatus('Session expired. Please log in again.');
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data);
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  };

  useEffect(() => {
    if (user?.userId && token) {
      fetchMyMedia();
      fetchProfile();
    }
  }, [user.userId, token]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return setStatus('Please select a file.');

    setStatus('Uploading to Cloudinary... this may take a moment.');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('authorName', user.userId); 
    formData.append('authorId', user.userId);
    formData.append('tags', tags);

    try {
      await axios.post('http://localhost:5000/api/media/upload', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      setStatus('Upload successful!');
      
      setFile(null);
      setName('');
      setTags('');
      
      fetchMyMedia(); 
    } catch (err) {
      setStatus('Upload failed.');
      console.error(err);
    }
  };

  const handleDelete = async (mediaId) => {
    const isConfirmed = window.confirm("Are you sure you want to permanently delete this media? This will also wipe the AI knowledge base for this file.");
    if (!isConfirmed) return;

    try {
      await axios.delete(`http://localhost:5000/api/media/${mediaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state to remove the deleted item instantly without refreshing the page
      setMyMedia(prevMedia => prevMedia.filter(media => media._id !== mediaId));
      setStatus('Media successfully deleted.');
      
      // Clear status message after 3 seconds
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      console.error(err);
      setStatus('Failed to delete media.');
    }
  };

  return (
    <div className="app-container">
      
      {/* Educator Stats Dashboard */}
      <div className="card" style={{ backgroundColor: 'var(--dark)', color: 'var(--text-light)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: '0 0 5px 0', color: 'var(--text-light)' }}>Welcome, {user.userId}</h2>
          <p style={{ margin: 0, color: '#94a3b8' }}>Educator Dashboard</p>
        </div>
        <div style={{ textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '1rem 2rem', borderRadius: 'var(--radius-md)' }}>
          <h1 style={{ margin: '0', fontSize: '2.5em', color: '#60a5fa' }}>{profile?.subscriberCount || 0}</h1>
          <p style={{ margin: '5px 0 0 0', textTransform: 'uppercase', fontSize: '0.8em', letterSpacing: '1px', color: 'var(--text-light)' }}>Subscribers</p>
        </div>
      </div>

      {/* Upload New Media */}
      <div className="card" style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--dark)' }}>Upload New Media</h3>
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '500px' }}>
          <input 
            type="file" 
            className="input-field"
            onChange={e => setFile(e.target.files[0])} 
            style={{ padding: '0.5rem', background: 'var(--bg-input)' }}
            required 
          />
          <input 
            type="text" 
            className="input-field"
            placeholder="Media Name" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
          />
          <input 
            type="text" 
            className="input-field"
            placeholder="Tags (comma separated)" 
            value={tags} 
            onChange={e => setTags(e.target.value)} 
            required 
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem', fontSize: '1rem', marginTop: '0.5rem' }}>
            Upload Content
          </button>
        </form>
        {status && (
          <p style={{ marginTop: '1rem', fontWeight: '500', color: status.toLowerCase().includes('failed') ? 'var(--danger)' : 'var(--secondary)' }}>
            {status}
          </p>
        )}
      </div>

      {/* My Uploaded Media */}
      <div>
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--dark)' }}>My Uploaded Media</h3>
        {myMedia.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1.1rem' }}>You haven't uploaded anything yet.</p>
          </div>
        ) : (
          <div className="media-grid">
            {myMedia.map(media => (
              <div key={media._id} className="card" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                
                {/* Destructive Delete Button */}
                <button 
                  onClick={() => handleDelete(media._id)}
                  className="btn btn-danger"
                  style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  title="Permanently delete this media and its AI knowledge base"
                >
                  Delete Media
                </button>

                <div style={{ paddingRight: '7rem' }}>
                  <h4 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', lineHeight: '1.4' }}>{media.name}</h4>
                  
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                    <span style={{ backgroundColor: 'var(--bg-input)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      <strong>Type:</strong> {media.mimetype.split('/')[0]}
                    </span>
                    <span style={{ backgroundColor: 'var(--bg-input)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      <strong>Upvotes:</strong> {media.upvotes}
                    </span>
                    <span style={{ backgroundColor: 'var(--bg-input)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      <strong>Uploaded:</strong> {new Date(media.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {media.tags && media.tags.length > 0 ? media.tags.map(tag => (
                    <span key={tag} className="tag-badge">{tag}</span>
                  )) : <span className="tag-badge">No tags</span>}
                </div>

                <div style={{ marginTop: 'auto', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {media?.mimetype?.includes('video') ? (
                    <video src={`${media.fileUrl}?t=${new Date(media.timestamp).getTime()}`} controls style={{ width: '100%', maxHeight: '200px', objectFit: 'contain' }} />
                  ) : media?.mimetype?.includes('image') ? (
                    <img src={media.fileUrl} alt={media?.name} style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ backgroundColor: 'var(--bg-input)', width: '100%', padding: '2rem', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <a href={media.fileUrl} download={media?.name} target="_blank" rel="noreferrer" className="btn btn-secondary">
                        Download / View File
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}