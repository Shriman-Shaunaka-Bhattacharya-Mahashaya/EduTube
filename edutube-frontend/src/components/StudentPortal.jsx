import React, { useState } from 'react';
import axios from 'axios';

export default function StudentPortal({ user, token }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('tag'); // 'tag' or 'educator'
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!searchQuery.trim()) {
        return setError('Please enter a search term.');
    }

    try {
      // Dynamically build the endpoint based on the selected dropdown value
      const endpoint = searchType === 'tag' 
        ? `http://localhost:5000/api/media/search?tag=${searchQuery.trim()}`
        : `http://localhost:5000/api/media/search?author=${searchQuery.trim()}`;

      const res = await axios.get(endpoint);
      setResults(res.data);
      if (res.data.length === 0) setError(`No media found for that ${searchType}.`);
    } catch (err) {
      setError('Search failed.');
    }
  };

  const handleUpvote = async (id, index) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/media/upvote/${id}`, 
        { userId: user.userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const newResults = [...results];
      newResults[index].upvotes = res.data.upvotes;
      newResults[index].upvotedBy = res.data.upvotedBy;
      setResults(newResults);
    } catch (err) {
      console.error('Upvote failed', err);
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <select 
          value={searchType} 
          onChange={e => setSearchType(e.target.value)}
          style={{ padding: '8px' }}
        >
          <option value="tag">Search by Tag</option>
          <option value="educator">Search by Educator</option>
        </select>
        
        <input 
          type="text" 
          placeholder={searchType === 'tag' ? "e.g., react" : "e.g., prof_roy"} 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
          style={{ padding: '8px', flexGrow: 1, maxWidth: '300px' }}
        />
        
        <button type="submit" style={{ padding: '8px 15px', cursor: 'pointer' }}>Search</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {results.map((media, index) => {
          const hasUpvoted = media.upvotedBy?.includes(user.userId);

          return (
            <div key={media._id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
              <h4>{media.name}</h4>
              <p style={{ fontSize: '0.9em', color: '#555' }}>
                By: <strong>{media.authorName}</strong> ({media.authorId}) | Uploaded: {new Date(media.timestamp).toLocaleDateString()}
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