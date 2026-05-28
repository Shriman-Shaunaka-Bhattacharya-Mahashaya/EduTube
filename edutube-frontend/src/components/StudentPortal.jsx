import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function StudentPortal({ user, token }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('tag');
  const [results, setResults] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [interests, setInterests] = useState([]); 
  const [savedMedia, setSavedMedia] = useState([]); 
  const [error, setError] = useState('');
  const [aiInterpretation, setAiInterpretation] = useState(''); // NEW STATE

  // --- NEW AI CHAT STATE ---
  const [activeAiMediaId, setActiveAiMediaId] = useState(null);
  const [chatHistories, setChatHistories] = useState({});
  const [chatInput, setChatInput] = useState('');
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistories, activeAiMediaId]);

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
    setAiInterpretation(''); // Reset interpretation on new search
    setSearchType(type === 'id' ? 'tag' : type); 
    setSearchQuery(type === 'id' ? '' : query); 

    try {
      if (type === 'ai') {
        // --- NEW AI AGENT ROUTING ---
        const res = await axios.post(`http://localhost:5000/api/ai/agent-search`, 
          { query: query.trim() }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setResults(res.data.results);
        setAiInterpretation(`🧠 AI understood your search as a ${res.data.interpretedAs.type}: "${res.data.interpretedAs.value}"`);
        if (res.data.results.length === 0) setError(`No media found.`);
      } else {
        // --- STANDARD ROUTING ---
        let endpoint = `http://localhost:5000/api/media/search?`;
        if (type === 'tag') endpoint += `tag=${query.trim()}`;
        if (type === 'educator') endpoint += `author=${query.trim()}`;
        if (type === 'id') endpoint += `id=${query.trim()}`;

        const res = await axios.get(endpoint);
        setResults(res.data);
        if (res.data.length === 0) setError(`No media found.`);
      }
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

  // --- NEW AI CHAT LOGIC ---
  const toggleAiChat = async (media) => {
    if (activeAiMediaId === media._id) {
      setActiveAiMediaId(null); // Close chat if already open
      return;
    }
    
    setActiveAiMediaId(media._id);

    // If we haven't loaded this chat history yet, we must initialize the RAG pipeline
    if (!chatHistories[media._id]) {
      setIsProcessingPdf(true);
      try {
        await axios.post(`http://localhost:5000/api/ai/process/${media._id}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setChatHistories(prev => ({
          ...prev,
          [media._id]: [{ role: 'ai', text: 'I have read this document! What would you like to know about it?' }]
        }));
      } catch (err) {
        setChatHistories(prev => ({
          ...prev,
          [media._id]: [{ role: 'ai', text: 'Sorry, I failed to process this document.' }]
        }));
      } finally {
        setIsProcessingPdf(false);
      }
    }
  };

  const handleSendAiMessage = async (e, mediaId) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const question = chatInput.trim();
    setChatInput('');

    // Optimistically update the UI with the user's question
    const updatedHistory = [...(chatHistories[mediaId] || []), { role: 'user', text: question }];
    setChatHistories(prev => ({ ...prev, [mediaId]: updatedHistory }));
    setIsAsking(true);

    try {
      // 1. Grab the existing history BEFORE we added the new question to state
      const existingHistory = chatHistories[mediaId] || [];

      // 2. Send both the new question and the conversational context
      const res = await axios.post(`http://localhost:5000/api/ai/ask/${mediaId}`, 
        { 
          question: question,
          history: existingHistory 
        }, 
        { 
          headers: { Authorization: `Bearer ${token}` } 
        }
      );
      
      // 3. Append the AI's response to the updated UI history
      setChatHistories(prev => ({
        ...prev,
        [mediaId]: [...updatedHistory, { role: 'ai', text: res.data.answer }]
      }));
    } catch (err) {
      setChatHistories(prev => ({
        ...prev,
        [mediaId]: [...updatedHistory, { role: 'ai', text: 'An error occurred while fetching the answer. Please try again.' }]
      }));
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="app-container">
      {/* Dynamic Dashboards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        
        {subscriptions.length > 0 && (
          <div className="dashboard-bar dashboard-blue">
            <h4 style={{ color: '#1e3a8a' }}>Educators I Follow</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              {subscriptions.map(subId => (
                <button key={subId} onClick={() => executeSearch('educator', subId)} className="btn btn-primary" style={{ borderRadius: 'var(--radius-full)' }}>
                  {subId}
                </button>
              ))}
            </div>
          </div>
        )}

        {interests.length > 0 && (
          <div className="dashboard-bar dashboard-yellow">
            <h4 style={{ color: '#854d0e' }}>My Saved Topics</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              {interests.map(topic => (
                <button key={topic} onClick={() => executeSearch('tag', topic)} className="btn" style={{ backgroundColor: '#eab308', color: 'white', borderRadius: 'var(--radius-full)' }}>
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}

        {savedMedia.length > 0 && (
          <div className="dashboard-bar dashboard-green">
            <h4 style={{ color: '#166534' }}>My Bookmarked Media</h4>
            <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', marginTop: '10px' }}>
              {savedMedia.map(item => (
                <button key={item.mediaId} onClick={() => executeSearch('id', item.mediaId)} className="btn btn-secondary" style={{ textAlign: 'left', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.name}>
                  ▶ {item.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search Form */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={searchType} onChange={e => setSearchType(e.target.value)} className="select-field" style={{ width: 'auto', minWidth: '150px' }}>
            <option value="tag">Search by Tag</option>
            <option value="educator">Search by Educator</option>
            <option value="ai">Ask AI (Natural Language)</option>
          </select>
          <input 
            type="text" 
            placeholder={
              searchType === 'ai' ? "e.g., I want to learn about java arrays..." :
              searchType === 'tag' ? "e.g., react" : "e.g., prof_roy"
            } 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="input-field"
            style={{ flexGrow: 1 }}
          />
          <button type="submit" className={`btn ${searchType === 'ai' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.75rem 1.5rem', whiteSpace: 'nowrap' }}>
            {searchType === 'ai' ? '✨ AI Search' : 'Search'}
          </button>
        </form>

        {aiInterpretation && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f5f3ff', color: '#6d28d9', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #7c3aed', fontSize: '0.9rem', fontWeight: '500' }}>
            {aiInterpretation}
          </div>
        )}
        {error && <p style={{ color: 'var(--danger)', marginTop: '1rem', fontWeight: '500' }}>{error}</p>}
      </div>

      {/* Search Results */}
      <div className="media-grid">
        {results.map((media, index) => {
          const hasUpvoted = media.upvotedBy?.includes(user.userId);
          const isSubscribed = subscriptions.includes(media.authorId);
          const isSavedMedia = savedMedia.some(m => m.mediaId === media._id);
          const isPdf = media.mimetype.includes('pdf');
          const isChatActive = activeAiMediaId === media._id;

          return (
            <div key={media._id} className="card" style={{ position: 'relative', borderColor: isChatActive ? 'var(--primary)' : 'var(--border-color)' }}>
              
              <button onClick={() => toggleSavedMedia(media._id, media.name)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5em', color: isSavedMedia ? 'var(--secondary)' : '#cbd5e1' }} title={isSavedMedia ? "Remove Bookmark" : "Bookmark this Media"}>
                {isSavedMedia ? '🔖' : '📑'}
              </button>

              <div style={{ paddingRight: '2.5rem' }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', lineHeight: '1.3' }}>{media.name}</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  By: <strong style={{ color: 'var(--text-main)' }}>{media.authorName}</strong> | {new Date(media.timestamp).toLocaleDateString()}
                </p>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {media.tags && media.tags.length > 0 ? media.tags.map(tag => {
                  const isSaved = interests.includes(tag);
                  return (
                    <span key={tag} className="tag-badge">
                      {tag}
                      <button onClick={() => toggleInterest(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '4px', color: isSaved ? '#eab308' : '#94a3b8', fontSize: '1.1em', padding: '0' }}>
                        {isSaved ? '★' : '☆'}
                      </button>
                    </span>
                  );
                }) : <span className="tag-badge">No tags</span>}
              </div>

              <div style={{ margin: '1.5rem 0', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: '#000', display: 'flex', justifyContent: 'center' }}>
                {media?.mimetype?.includes('video') ? (
                  <video src={media.fileUrl} controls style={{ width: '100%', maxHeight: '250px', objectFit: 'contain' }} />
                ) : media?.mimetype?.includes('image') ? (
                  <img src={media.fileUrl} alt={media?.name} style={{ width: '100%', maxHeight: '250px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ backgroundColor: 'var(--bg-input)', width: '100%', padding: '2rem', textAlign: 'center' }}>
                    <a href={media.fileUrl} download={media?.name} target="_blank" rel="noreferrer" className="btn btn-primary">
                      View Document (PDF)
                    </a>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleUpvote(media._id, index)} className={`btn ${hasUpvoted ? 'btn-secondary' : 'btn-outline'}`}>
                    ▲ {media.upvotes}
                  </button>
                  <button onClick={() => toggleSubscription(media.authorId)} className={`btn ${isSubscribed ? 'btn-outline' : 'btn-danger'}`} style={{ borderColor: isSubscribed ? 'var(--danger)' : '', color: isSubscribed ? 'var(--danger)' : '' }}>
                    {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                  </button>
                </div>
                
                {isPdf && (
                  <button onClick={() => toggleAiChat(media)} className="btn btn-primary" style={{ background: isChatActive ? 'var(--danger)' : 'linear-gradient(135deg, var(--primary), #8b5cf6)' }}>
                    {isChatActive ? 'Close AI Tutor' : 'Ask AI Tutor ✨'}
                  </button>
                )}
              </div>

              {/* Embedded AI Chat UI */}
              {isChatActive && (
                <div className="ai-chat-container">
                  <div className="ai-chat-header">AI Tutor - {media.name}</div>
                  <div className="ai-chat-messages">
                    {isProcessingPdf ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', margin: 'auto' }}>
                        🧠 Reading document and mapping vectors...
                      </div>
                    ) : (
                      <>
                        {chatHistories[media._id]?.map((msg, i) => (
                          <div key={i} className={`chat-bubble ${msg.role === 'user' ? 'chat-user' : 'chat-ai'}`}>
                            <strong style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {msg.role === 'user' ? 'You' : 'AI Tutor'}
                            </strong>
                            <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
                          </div>
                        ))}
                        {isAsking && <div className="chat-bubble chat-ai" style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Thinking...</div>}
                        <div ref={chatEndRef} />
                      </>
                    )}
                  </div>
                  {!isProcessingPdf && (
                    <form onSubmit={(e) => handleSendAiMessage(e, media._id)} style={{ display: 'flex', borderTop: '1px solid var(--border-color)', background: 'white', padding: '0.5rem' }}>
                      <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask a question..." disabled={isAsking} className="input-field" style={{ border: 'none', boxShadow: 'none', background: 'transparent' }} />
                      <button type="submit" disabled={isAsking || !chatInput.trim()} className="btn btn-secondary" style={{ marginLeft: '0.5rem' }}>Send</button>
                    </form>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}