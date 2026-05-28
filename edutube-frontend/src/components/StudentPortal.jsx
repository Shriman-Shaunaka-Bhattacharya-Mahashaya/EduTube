import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function StudentPortal({ user, token }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('tag');
  const [results, setResults] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [error, setError] = useState('');

  // Fetch subscriptions on load
  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/users/subscriptions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubscriptions(res.data);
      } catch (err) {
        console.error('Failed to fetch subscriptions', err);
      }
    };
    if (token) fetchSubscriptions();
  }, [token]);

  // Refactored to accept parameters so it can be called programmatically
  const executeSearch = async (type, query) => {
    if (!query.trim()) return setError('Please enter a search term.');
    setError('');
    setSearchType(type); // Update UI state
    setSearchQuery(query); // Update UI state

    try {
      const endpoint = type === 'tag' 
        ? `http://localhost:5000/api/media/search?tag=${query.trim()}`
        : `http://localhost:5000/api/media/search?author=${query.trim()}`;

      const res = await axios.get(endpoint);
      setResults(res.data);
      if (res.data.length === 0) setError(`No media found for that ${type}.`);
    } catch (err) {
      setError('Search failed.');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    executeSearch(searchType, searchQuery);
  };

  const toggleSubscription = async (educatorId) => {
    try {
      const res = await axios.put('http://localhost:5000/api/users/subscribe', 
        { educatorId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubscriptions(res.data);
    } catch (err) {
      console.error('Subscription failed', err);
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
      {/* Subscriptions Bar */}
      {subscriptions.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '5px', border: '1px solid #ddd' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>My Subscriptions</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {subscriptions.map(subId => (
              <button 
                key={subId}
                onClick={() => executeSearch('educator', subId)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer'
                }}
              >
                {subId}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Standard Search Form */}
      <form onSubmit={handleSearchSubmit} style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
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

      {/* Search Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {results.map((media, index) => {
          const hasUpvoted = media.upvotedBy?.includes(user.userId);
          const isSubscribed = subscriptions.includes(media.authorId);

          return (
            <div key={media._id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4>{media.name}</h4>
                  <p style={{ fontSize: '0.9em', color: '#555' }}>
                    By: <strong>{media.authorName}</strong> ({media.authorId}) | Uploaded: {new Date(media.timestamp).toLocaleDateString()}
                  </p>
                </div>
                {/* Subscribe Toggle Button inside the card */}
                <button 
                  onClick={() => toggleSubscription(media.authorId)}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: isSubscribed ? '#fff' : '#ff0000',
                    color: isSubscribed ? '#ff0000' : '#fff',
                    border: '1px solid #ff0000',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                </button>
              </div>

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