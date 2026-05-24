import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function EducatorDashboard({ user }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState('');
  const [myMedia, setMyMedia] = useState([]); 

  const fetchMyMedia = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/media/educator/${user.userId}`);
      setMyMedia(res.data);
    } catch (err) {
      console.error('Failed to fetch media', err);
    }
  };

  useEffect(() => {
    if (user?.userId) {
      fetchMyMedia();
    }
  }, [user.userId]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return setStatus('Please select a file.');

    setStatus('Uploading...');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('authorName', user.userId); 
    formData.append('authorId', user.userId);
    formData.append('tags', tags);

    try {
      await axios.post('http://localhost:5000/api/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
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

  return (
    <div>
      <div style={{ paddingBottom: '30px', borderBottom: '2px solid #eee', marginBottom: '30px' }}>
        <h3>Upload New Media</h3>
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
          <input type="file" onChange={e => setFile(e.target.files[0])} required />
          <input type="text" placeholder="Media Name" value={name} onChange={e => setName(e.target.value)} required />
          <input type="text" placeholder="Tags (comma separated)" value={tags} onChange={e => setTags(e.target.value)} required />
          <button type="submit">Upload</button>
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
              <div key={media._id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px', backgroundColor: '#fafafa' }}>
                <h4 style={{ margin: '0 0 10px 0' }}>{media.name}</h4>
                
                <div style={{ fontSize: '0.9em', color: '#555', display: 'flex', gap: '20px' }}>
                  <span><strong>Type:</strong> {media.mimetype.split('/')[0]}</span>
                  <span><strong>Upvotes:</strong> {media.upvotes}</span>
                  <span><strong>Uploaded:</strong> {new Date(media.timestamp).toLocaleDateString()}</span>
                </div>
                
                <p style={{ margin: '10px 0', fontSize: '0.9em' }}>
                    <strong>Tags:</strong> {media?.tags?.join(', ') || 'No tags'}
                </p>

                {/* --- MEDIA RENDERING BLOCK --- */}
                <div style={{ margin: '15px 0' }}>
                    {media?.mimetype?.includes('video') ? (
                        <video src={`http://localhost:5000/api/media/stream/${media._id}`} controls style={{ maxWidth: '100%', maxHeight: '400px' }} />
                    ) : media?.mimetype?.includes('image') ? (
                        <img src={`http://localhost:5000/uploads/${media.filename}`} alt={media?.name} style={{ maxWidth: '100%', maxHeight: '400px' }} />
                    ) : (
                        <a 
                        href={`http://localhost:5000/uploads/${media?.filename}`} 
                        download={media?.filename} 
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

                {/* ----------------------------- */}

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}