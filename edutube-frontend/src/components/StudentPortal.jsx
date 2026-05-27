import React, { useState } from 'react';
import axios from 'axios';

// Receive the user prop here
export default function StudentPortal({ user }) {
  const [searchTag, setSearchTag] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.get(`http://localhost:5000/api/media/search?tag=${searchTag.trim()}`);
      setResults(res.data);
      if (res.data.length === 0) setError('No media found for that tag.');
    } catch (err) {
      setError('Search failed.');
    }
  };

  const handleUpvote = async (id, index) => {
    try {
      // Pass the userId in the body
      const res = await axios.put(`http://localhost:5000/api/media/upvote/${id}`, {
        userId: user.userId
      });
      
      const newResults = [...results];
      // Update both the count and the array from the backend response
      newResults[index].upvotes = res.data.upvotes;
      newResults[index].upvotedBy = res.data.upvotedBy;
      setResults(newResults);
    } catch (err) {
      console.error('Upvote failed');
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="Search by exact tag (e.g. react)" 
          value={searchTag} 
          onChange={e => setSearchTag(e.target.value)} 
          required 
        />
        <button type="submit">Search</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {results.map((media, index) => {
          // Check if this specific user is in the upvotedBy array
          const hasUpvoted = media.upvotedBy?.includes(user.userId);

          return (
            <div key={media._id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
              <h4>{media.name}</h4>
              <p style={{ fontSize: '0.9em', color: '#555' }}>
                By: {media.authorName} | Uploaded: {new Date(media.timestamp).toLocaleDateString()}
              </p>
              <p style={{ margin: '10px 0', fontSize: '0.9em' }}>
                <strong>Tags:</strong> {media?.tags?.join(', ') || 'No tags'}
              </p>

                <div style={{ margin: '15px 0' }}>
                  {media?.mimetype?.includes('video') ? (
                    <video src={media.fileUrl} controls style={{ maxWidth: '100%', maxHeight: '400px' }} />
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
              {/* Dynamic styling and text based on toggle state */}
              <button 
                onClick={() => handleUpvote(media._id, index)}
                style={{ 
                  backgroundColor: hasUpvoted ? '#4CAF50' : '#f0f0f0',
                  color: hasUpvoted ? 'white' : 'black',
                  border: '1px solid #ccc',
                  padding: '5px 10px',
                  cursor: 'pointer'
                }}
              >
                {hasUpvoted ? 'Upvoted' : 'Upvote'} ({media.upvotes})
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}