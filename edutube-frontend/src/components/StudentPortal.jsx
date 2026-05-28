import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function StudentPortal({ user, token }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('tag');
  const [results, setResults] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [interests, setInterests] = useState([]); 
  const [savedMedia, setSavedMedia] = useState([]); // NEW STATE
  const [error, setError] = useState('');

  // Fetch all user data concurrently
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const [subRes, intRes, savedRes] = await Promise.all([
          axios.get('http://localhost:5000/api/users/subscriptions', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:5000/api/users/interests', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:5000/api/users/saved-media', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setSubscriptions(subRes.data);
        setInterests(intRes.data);
        setSavedMedia(savedRes.data);
      } catch (err) {
        console.error('Failed to fetch user data', err);
      }
    };
    if (token) fetchUserData();
  }, [token]);

  const executeSearch = async (type, query) => {
    if (!query.trim()) return setError('Please enter a search term.');
    setError('');
    setSearchType(type === 'id' ? 'tag' : type); // Reset UI visually if it's a direct ID search
    setSearchQuery(type === 'id' ? '' : query); 

    try {
      let endpoint = `http://localhost:5000/api/media/search?`;
      if (type === 'tag') endpoint += `tag=${query.trim()}`;
      if (type === 'educator') endpoint += `author=${query.trim()}`;
      if (type === 'id') endpoint += `id=${query.trim()}`;

      const res = await axios.get(endpoint);
      setResults(res.data);
      if (res.data.length === 0) setError(`No media found.`);
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
        { educatorId }, { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubscriptions(res.data);
    } catch (err) { console.error('Subscription failed', err); }
  };

  const toggleInterest = async (topic) => {
    try {
      const res = await axios.put('http://localhost:5000/api/users/interest', 
        { topic }, { headers: { Authorization: `Bearer ${token}` } }
      );
      setInterests(res.data);
    } catch (err) { console.error('Interest toggle failed', err); }
  };

  const toggleSavedMedia = async (mediaId, name) => {
    try {
      const res = await axios.put('http://localhost:5000/api/users/saved-media', 
        { mediaId, name }, { headers: { Authorization: `Bearer ${token}` } }
      );
      setSavedMedia(res.data);
    } catch (err) { console.error('Save media failed', err); }
  };

  const handleUpvote = async (id, index) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/media/upvote/${id}`, 
        { userId: user.userId }, { headers: { Authorization: `Bearer ${token}` } }
      );
      const newResults = [...results];
      newResults[index].upvotes = res.data.upvotes;
      newResults[index].upvotedBy = res.data.upvotedBy;
      setResults(newResults);
    } catch (err) { console.error('Upvote failed', err); }
  };

  return (
    <div>
      {/* Dynamic Dashboards */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
        
        {subscriptions.length > 0 && (
          <div style={{ flex: '1 1 30%', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '5px', border: '1px solid #ddd' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Educators I Follow</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {subscriptions.map(subId => (
                <button key={subId} onClick={() => executeSearch('educator', subId)} style={{ padding: '6px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '15px', cursor: 'pointer', fontSize: '0.85em' }}>
                  {subId}
                </button>
              ))}
            </div>
          </div>
        )}

        {interests.length > 0 && (
          <div style={{ flex: '1 1 30%', padding: '15px', backgroundColor: '#fdf9e3', borderRadius: '5px', border: '1px solid #f1c40f' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>My Saved Topics</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {interests.map(topic => (
                <button key={topic} onClick={() => executeSearch('tag', topic)} style={{ padding: '6px 10px', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '15px', cursor: 'pointer', fontSize: '0.85em' }}>
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* NEW: Saved Media Bar */}
        {savedMedia.length > 0 && (
          <div style={{ flex: '1 1 30%', padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '5px', border: '1px solid #4caf50' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>My Bookmarked Media</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flexDirection: 'column' }}>
              {savedMedia.map(item => (
                <button 
                  key={item.mediaId} 
                  onClick={() => executeSearch('id', item.mediaId)} 
                  style={{ padding: '6px 10px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85em', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={item.name}
                >
                  ▶ {item.name}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Standard Search Form */}
      <form onSubmit={handleSearchSubmit} style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <select value={searchType} onChange={e => setSearchType(e.target.value)} style={{ padding: '8px' }}>
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
          // Check if this media is in the savedMedia array
          const isSavedMedia = savedMedia.some(m => m.mediaId === media._id);

          return (
            <div key={media._id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px', position: 'relative' }}>
              
              {/* Bookmark Media Button in top right */}
              <button 
                onClick={() => toggleSavedMedia(media._id, media.name)}
                style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5em', color: isSavedMedia ? '#4caf50' : '#ccc' }}
                title={isSavedMedia ? "Remove Bookmark" : "Bookmark this Media"}
              >
                {isSavedMedia ? '🔖' : '📑'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: '40px' }}>
                <div>
                  <h4 style={{ margin: '0 0 5px 0' }}>{media.name}</h4>
                  <p style={{ margin: 0, fontSize: '0.9em', color: '#555' }}>
                    By: <strong>{media.authorName}</strong> ({media.authorId}) | Uploaded: {new Date(media.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <button 
                  onClick={() => toggleSubscription(media.authorId)}
                  style={{ padding: '5px 10px', backgroundColor: isSubscribed ? '#fff' : '#ff0000', color: isSubscribed ? '#ff0000' : '#fff', border: '1px solid #ff0000', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                </button>
              </div>

              <div style={{ margin: '10px 0', fontSize: '0.9em', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <strong>Tags:</strong>
                {media.tags && media.tags.length > 0 ? media.tags.map(tag => {
                  const isSaved = interests.includes(tag);
                  return (
                    <span key={tag} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#eee', padding: '3px 8px', borderRadius: '12px' }}>
                      {tag}
                      <button 
                        onClick={() => toggleInterest(tag)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '5px', color: isSaved ? '#f39c12' : '#999', fontSize: '1.2em' }}
                        title={isSaved ? "Remove from Saved Topics" : "Save Topic"}
                      >
                        {isSaved ? '★' : '☆'}
                      </button>
                    </span>
                  );
                }) : 'No tags'}
              </div>

              <div style={{ margin: '15px 0' }}>
                {media?.mimetype?.includes('video') ? (
                  <video src={media.fileUrl} controls style={{ maxWidth: '100%', maxHeight: '400px' }} />
                ) : media?.mimetype?.includes('image') ? (
                  <img src={media.fileUrl} alt={media?.name} style={{ maxWidth: '100%', maxHeight: '400px' }} />
                ) : (
                  <a href={media.fileUrl} download={media?.name} target="_blank" rel="noreferrer"
                     style={{ display: 'inline-block', padding: '8px 12px', backgroundColor: '#e0e0e0', color: '#000', border: '1px solid #ccc', borderRadius: '3px', textDecoration: 'none', cursor: 'pointer', fontSize: '13px' }}>
                    Download / View File
                  </a>
                )}
              </div>

              <button 
                onClick={() => handleUpvote(media._id, index)}
                style={{ backgroundColor: hasUpvoted ? '#4CAF50' : '#f0f0f0', color: hasUpvoted ? 'white' : 'black', border: '1px solid #ccc', padding: '5px 10px', cursor: 'pointer' }}
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