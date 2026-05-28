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
    <div>
      {/* Educator Stats Dashboard */}
      <div style={{ backgroundColor: '#2c3e50', color: 'white', padding: '20px', borderRadius: '8px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 5px 0' }}>Welcome, {user.userId}</h2>
          <p style={{ margin: 0, color: '#bdc3c7' }}>Educator Dashboard</p>
        </div>
        <div style={{ textAlign: 'center', backgroundColor: '#34495e', padding: '15px 30px', borderRadius: '5px' }}>
          <h1 style={{ margin: '0', fontSize: '2.5em', color: '#3498db' }}>{profile?.subscriberCount || 0}</h1>
          <p style={{ margin: '5px 0 0 0', textTransform: 'uppercase', fontSize: '0.8em', letterSpacing: '1px' }}>Subscribers</p>
        </div>
      </div>

      <div style={{ paddingBottom: '30px', borderBottom: '2px solid #eee', marginBottom: '30px' }}>
        <h3>Upload New Media</h3>
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
          <input type="file" onChange={e => setFile(e.target.files[0])} required />
          <input type="text" placeholder="Media Name" value={name} onChange={e => setName(e.target.value)} required />
          <input type="text" placeholder="Tags (comma separated)" value={tags} onChange={e => setTags(e.target.value)} required />
          <button type="submit" style={{ padding: '10px', cursor: 'pointer', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px' }}>Upload Content</button>
        </form>
        {status && <p style={{ marginTop: '10px', fontWeight: 'bold' }}>{status}</p>}
      </div>

      <div>
        <h3>My Uploaded Media</h3>
        {myMedia.length === 0 ? (
          <p style={{ color: '#777' }}>You haven't uploaded anything yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {myMedia.map(media => (
              <div key={media._id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px', backgroundColor: '#fafafa', position: 'relative' }}>
                
                {/* Destructive Delete Button */}
                <button 
                  onClick={() => handleDelete(media._id)}
                  style={{
                    position: 'absolute',
                    top: '15px',
                    right: '15px',
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.85em'
                  }}
                >
                  Delete Media
                </button>

                <h4 style={{ margin: '0 0 10px 0', paddingRight: '100px' }}>{media.name}</h4>
                
                <div style={{ fontSize: '0.9em', color: '#555', display: 'flex', gap: '20px' }}>
                  <span><strong>Type:</strong> {media.mimetype.split('/')[0]}</span>
                  <span><strong>Upvotes:</strong> {media.upvotes}</span>
                  <span><strong>Uploaded:</strong> {new Date(media.timestamp).toLocaleDateString()}</span>
                </div>
                
                <p style={{ margin: '10px 0', fontSize: '0.9em' }}><strong>Tags:</strong> {media.tags.join(', ')}</p>

                <div style={{ margin: '15px 0' }}>
                  {media?.mimetype?.includes('video') ? (
                    <video src={`${media.fileUrl}?t=${Date.now()}`} controls style={{ maxWidth: '100%', maxHeight: '400px' }} />
                  ) : media?.mimetype?.includes('image') ? (
                    <img src={media.fileUrl} alt={media?.name} style={{ maxWidth: '100%', maxHeight: '400px' }} />
                  ) : (
                    <a 
                      href={media.fileUrl} 
                      download={media?.name} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ 
                        display: 'inline-block',
                        padding: '8px 12px', 
                        backgroundColor: '#e0e0e0',
                        color: '#000',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        textDecoration: 'none',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Download / View File
                    </a>
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