import React, { useState, useEffect } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  // --- Search & Products State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // --- Feedback State ---
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackAuthor, setFeedbackAuthor] = useState('');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackRating, setFeedbackRating] = useState('5');
  const [feedbackStatus, setFeedbackStatus] = useState('');

  // --- Auth & Profile State ---
  const [usernameInput, setUsernameInput] = useState('admin');
  const [passwordInput, setPasswordInput] = useState('');
  const [isNoSQLPayload, setIsNoSQLPayload] = useState(false);
  const [loginResult, setLoginResult] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [idorUserId, setIdorUserId] = useState('1');
  const [inspectedProfile, setInspectedProfile] = useState(null);
  const [idorError, setIdorError] = useState('');

  // --- System Info State ---
  const [debugInfo, setDebugInfo] = useState(null);
  const [debugLoading, setDebugLoading] = useState(false);

  // Fetch initial products and feedback
  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (data.products) setProducts(data.products);
      })
      .catch(err => console.error('Failed to fetch products:', err));

    loadFeedbacks();
  }, []);

  const loadFeedbacks = () => {
    fetch('/api/feedback')
      .then(res => res.json())
      .then(data => {
        if (data.feedback) setFeedbacks(data.feedback);
      })
      .catch(err => console.error('Failed to load feedback:', err));
  };

  // --- Reflected XSS Search Handler ---
  const handleSearch = (e, overrideQuery) => {
    if (e) e.preventDefault();
    const queryToSearch = overrideQuery !== undefined ? overrideQuery : searchQuery;
    setSubmittedQuery(queryToSearch);
    setSearchLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(queryToSearch)}`)
      .then(res => res.json())
      .then(data => {
        setSearchResults(data.results || []);
        setSearchLoading(false);
      })
      .catch(err => {
        console.error('Search error:', err);
        setSearchLoading(false);
      });
  };

  // --- Stored XSS Feedback Submission ---
  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    if (!feedbackComment.trim()) return;

    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: feedbackAuthor || 'Anonymous Visitor',
        comment: feedbackComment, // Unsanitized input
        rating: feedbackRating
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFeedbackStatus('Feedback submitted successfully!');
          setFeedbackComment('');
          loadFeedbacks();
          setTimeout(() => setFeedbackStatus(''), 3000);
        }
      })
      .catch(err => setFeedbackStatus('Error submitting feedback'));
  };

  // --- NoSQL Injection Login Handler ---
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginResult(null);

    // If NoSQL payload is selected, send an object condition for password
    const payload = isNoSQLPayload
      ? { username: usernameInput, password: { "$ne": null } }
      : { username: usernameInput, password: passwordInput };

    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        setLoginResult({ status, data, sentPayload: payload });
        if (data.success && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(err => {
        setLoginResult({ status: 500, data: { error: err.message } });
      });
  };

  // --- IDOR Profile Viewer Handler ---
  const handleFetchProfile = () => {
    setIdorError('');
    setInspectedProfile(null);
    fetch(`/api/users/${idorUserId}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: User not found`);
        return res.json();
      })
      .then(data => {
        setInspectedProfile(data.profile);
      })
      .catch(err => {
        setIdorError(err.message);
      });
  };

  // --- Fetch System Debug Info ---
  const handleFetchDebug = () => {
    setDebugLoading(true);
    fetch('/api/debug/system-info')
      .then(res => res.json())
      .then(data => {
        setDebugInfo(data);
        setDebugLoading(false);
      })
      .catch(err => {
        console.error('Debug fetch error:', err);
        setDebugLoading(false);
      });
  };

  return (
    <div>
      {/* Navigation Bar */}
      <header>
        <div className="nav-container">
          <a href="#" className="brand" onClick={() => setActiveTab('home')}>
            <span>CyberCorp Benchmark</span>
            <span className="brand-badge">VULNERABLE</span>
          </a>

          <nav>
            <button
              className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab('home')}
            >
              Shop & Search (Reflected XSS)
            </button>
            <button
              className={`nav-btn ${activeTab === 'feedback' ? 'active' : ''}`}
              onClick={() => setActiveTab('feedback')}
            >
              Guestbook (Stored XSS)
            </button>
            <button
              className={`nav-btn ${activeTab === 'auth' ? 'active' : ''}`}
              onClick={() => setActiveTab('auth')}
            >
              Auth & IDOR
            </button>
            <button
              className={`nav-btn ${activeTab === 'debug' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('debug');
                handleFetchDebug();
              }}
            >
              DAST Diagnostics & System Info
            </button>
          </nav>
        </div>
      </header>

      <div className="container">
        {/* Banner highlighting deliberate vulnerabilities */}
        <div className="vuln-banner">
          <div>
            <strong>Educational Security Benchmark:</strong> This application contains intentional vulnerabilities for DAST scanners and SAVE Agentic AI remediation verification.
          </div>
          <span className="vuln-badge">DAST TARGET</span>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: SHOPPING & REFLECTED XSS */}
        {/* ========================================================================= */}
        {activeTab === 'home' && (
          <div>
            <div className="hero">
              <h1>CyberCorp Security Solutions</h1>
              <p>
                Enterprise hardware and automated security tools. Test our search bar below to verify Reflected XSS handling.
              </p>

              <form className="search-form" onSubmit={(e) => handleSearch(e)}>
                <input
                  type="text"
                  placeholder="Search catalog (e.g. Shield, Scanner, or XSS payload)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="btn-primary">
                  Search
                </button>
              </form>

              <div style={{ marginTop: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Quick Test XSS Payloads: </span>
                <div className="quick-payloads" style={{ justifyContent: 'center' }}>
                  <button
                    className="quick-payload-btn"
                    onClick={() => {
                      const p = `<img src=x onerror="alert('Reflected XSS Vulnerability Triggered!')">`;
                      setSearchQuery(p);
                      handleSearch(null, p);
                    }}
                  >
                    &lt;img onerror=alert(...)&gt;
                  </button>
                  <button
                    className="quick-payload-btn"
                    onClick={() => {
                      const p = `<h2 style="color:#ef4444;background:#fee2e2;padding:10px;">🚨 Injected HTML Banner</h2>`;
                      setSearchQuery(p);
                      handleSearch(null, p);
                    }}
                  >
                    HTML Heading Injection
                  </button>
                  <button
                    className="quick-payload-btn"
                    onClick={() => {
                      setSearchQuery('');
                      handleSearch(null, '');
                    }}
                  >
                    Reset Search
                  </button>
                </div>
              </div>
            </div>

            {/* Reflected Search Output */}
            {submittedQuery && (
              <div className="card" style={{ borderColor: '#ef4444' }}>
                <div className="card-title" style={{ color: '#ef4444' }}>
                  <span>⚠️ Search Results Reflection (Reflected XSS Vulnerability)</span>
                </div>
                <p className="card-subtitle">
                  The query string below is echoed into the page unescaped via React's <code>dangerouslySetInnerHTML</code>:
                </p>

                {/* VULNERABILITY: Reflected XSS render */}
                <div
                  className="danger-output-box"
                  dangerouslySetInnerHTML={{ __html: `Search query: <strong>${submittedQuery}</strong>` }}
                />

                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Found {searchResults ? searchResults.length : 0} matching items. Raw API query: <code>/api/search?q={encodeURIComponent(submittedQuery)}</code>
                </div>
              </div>
            )}

            {/* Product Catalog */}
            <div className="card">
              <div className="card-title">Featured Products Catalog</div>
              <div className="product-grid">
                {(searchResults || products).map(product => (
                  <div key={product.id} className="product-card">
                    <div>
                      <span className="product-category">{product.category}</span>
                      <h3 style={{ margin: '0.5rem 0', fontSize: '1.05rem' }}>{product.name}</h3>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{product.description}</p>
                    </div>
                    <div>
                      <div className="product-price">${product.price}</div>
                      <button
                        className="btn-secondary"
                        style={{ width: '100%', marginTop: '0.75rem' }}
                        onClick={() => alert(`Purchased ${product.name} (Simulated)`)}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: STORED XSS (FEEDBACK / GUESTBOOK) */}
        {/* ========================================================================= */}
        {activeTab === 'feedback' && (
          <div>
            <div className="card">
              <div className="card-title">Customer Feedback & Guestbook</div>
              <p className="card-subtitle">
                Post comments and reviews. Notice: Comments are stored in the database without sanitization and rendered via <code>dangerouslySetInnerHTML</code>, triggering Stored XSS.
              </p>

              <form onSubmit={handleFeedbackSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Your Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Alice or Penetration Tester"
                      value={feedbackAuthor}
                      onChange={(e) => setFeedbackAuthor(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Rating</label>
                    <select value={feedbackRating} onChange={(e) => setFeedbackRating(e.target.value)}>
                      <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                      <option value="4">⭐⭐⭐⭐ (4/5)</option>
                      <option value="3">⭐⭐⭐ (3/5)</option>
                      <option value="2">⭐⭐ (2/5)</option>
                      <option value="1">⭐ (1/5)</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Feedback / Comment</label>
                  <textarea
                    rows={3}
                    placeholder="Enter comment or XSS payload..."
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn-primary">
                    Submit Feedback
                  </button>

                  <button
                    type="button"
                    className="quick-payload-btn"
                    onClick={() => {
                      setFeedbackAuthor('DAST Stored XSS Tester');
                      setFeedbackComment(`<img src="invalid_image" onerror="alert('Stored XSS Executed from Database!')" />`);
                    }}
                  >
                    Insert Stored XSS Payload
                  </button>

                  {feedbackStatus && (
                    <span style={{ color: '#10b981', fontSize: '0.9rem' }}>{feedbackStatus}</span>
                  )}
                </div>
              </form>
            </div>

            {/* Rendered Feedback List */}
            <div className="card">
              <div className="card-title">Recent Feedback ({feedbacks.length})</div>
              {feedbacks.map(item => (
                <div key={item.id} className="feedback-item">
                  <div className="feedback-header">
                    <span className="feedback-name">{item.name}</span>
                    <span>{new Date(item.date).toLocaleTimeString()} ({'★'.repeat(item.rating)})</span>
                  </div>
                  {/* VULNERABILITY: Stored XSS render */}
                  <div
                    style={{ color: '#cbd5e1' }}
                    dangerouslySetInnerHTML={{ __html: item.comment }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: AUTHENTICATION & ACCESS CONTROL (NoSQL Injection & IDOR) */}
        {/* ========================================================================= */}
        {activeTab === 'auth' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {/* Login with NoSQL Injection */}
              <div className="card">
                <div className="card-title">
                  <span>🔐 Authentication Portal</span>
                </div>
                <p className="card-subtitle">
                  Vulnerable to NoSQL Injection (accepts MongoDB query operators in JSON body).
                </p>

                <form onSubmit={handleLogin}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Username</label>
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                    />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Password</label>
                    <input
                      type="text"
                      placeholder={isNoSQLPayload ? 'Bypassed with {"$ne": null}' : 'Enter password'}
                      disabled={isNoSQLPayload}
                      value={isNoSQLPayload ? '{"$ne": null}' : passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                    />
                  </div>

                  <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      id="nosql-toggle"
                      style={{ width: 'auto' }}
                      checked={isNoSQLPayload}
                      onChange={(e) => setIsNoSQLPayload(e.target.checked)}
                    />
                    <label htmlFor="nosql-toggle" style={{ fontSize: '0.85rem', color: '#f87171', cursor: 'pointer' }}>
                      ⚡ Enable NoSQL Injection Payload: <code>password: &#123; "$ne": null &#125;</code>
                    </label>
                  </div>

                  <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                    {isNoSQLPayload ? 'Execute NoSQL Bypass Login' : 'Sign In'}
                  </button>
                </form>

                {loginResult && (
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', marginBottom: '0.25rem', color: '#94a3b8' }}>
                      Server Response (HTTP {loginResult.status}):
                    </div>
                    <pre>{JSON.stringify(loginResult, null, 2)}</pre>
                  </div>
                )}
              </div>

              {/* IDOR Profile Viewer */}
              <div className="card">
                <div className="card-title">
                  <span>👤 IDOR Profile Viewer</span>
                </div>
                <p className="card-subtitle">
                  Insecure Direct Object Reference on <code>/api/users/:id</code>. Any user ID can be retrieved without authentication or authorization.
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    placeholder="User ID (e.g. 1, 2, 3)"
                    value={idorUserId}
                    onChange={(e) => setIdorUserId(e.target.value)}
                  />
                  <button className="btn-secondary" onClick={handleFetchProfile}>
                    Inspect ID
                  </button>
                </div>

                <div className="quick-payloads">
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Target Accounts:</span>
                  <button className="quick-payload-btn" onClick={() => { setIdorUserId('1'); handleFetchProfile(); }}>
                    User ID 1 (Admin)
                  </button>
                  <button className="quick-payload-btn" onClick={() => { setIdorUserId('2'); handleFetchProfile(); }}>
                    User ID 2 (Alice)
                  </button>
                  <button className="quick-payload-btn" onClick={() => { setIdorUserId('3'); handleFetchProfile(); }}>
                    User ID 3 (Bob)
                  </button>
                </div>

                {idorError && (
                  <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem' }}>{idorError}</div>
                )}

                {inspectedProfile && (
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', marginBottom: '0.25rem', color: '#ef4444' }}>
                      🚨 Leaked Profile Data for ID: {inspectedProfile.id}
                    </div>
                    <pre>{JSON.stringify(inspectedProfile, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SYSTEM INFO & DAST DIAGNOSTICS */}
        {/* ========================================================================= */}
        {activeTab === 'debug' && (
          <div>
            <div className="card">
              <div className="card-title">Security Posture & Missing Directives Matrix</div>
              <p className="card-subtitle">
                Overview of missing HTTP security directives for automated remediation benchmarks (e.g. SAVE Agentic AI).
              </p>

              <table>
                <thead>
                  <tr>
                    <th>Security Header</th>
                    <th>Current State</th>
                    <th>Vulnerability Risk</th>
                    <th>SAVE AI Target Fix</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>X-Content-Type-Options</code></td>
                    <td><span className="vuln-badge">MISSING</span></td>
                    <td>MIME-type sniffing allows executable code interpretation of non-executable types.</td>
                    <td><code>nosniff</code></td>
                  </tr>
                  <tr>
                    <td><code>X-Frame-Options</code></td>
                    <td><span className="vuln-badge">MISSING</span></td>
                    <td>Clickjacking; application can be embedded in malicious iframes.</td>
                    <td><code>DENY</code> or <code>SAMEORIGIN</code></td>
                  </tr>
                  <tr>
                    <td><code>Referrer-Policy</code></td>
                    <td><span className="vuln-badge">MISSING</span></td>
                    <td>Leaks sensitive URLs, tokens, and query params to third-party referrers.</td>
                    <td><code>strict-origin-when-cross-origin</code></td>
                  </tr>
                  <tr>
                    <td><code>Content-Security-Policy</code></td>
                    <td><span className="vuln-badge">MISSING</span></td>
                    <td>Permits inline scripts, unauthorized data transmission, and XSS exploitation.</td>
                    <td>Restrictive <code>default-src 'self'</code> policy</td>
                  </tr>
                  <tr>
                    <td><code>Access-Control-Allow-Origin</code></td>
                    <td><span className="vuln-badge">MISCONFIGURED</span></td>
                    <td>Wildcard <code>*</code> paired with <code>credentials: true</code>.</td>
                    <td>Strict whitelist with authenticated origin validation</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Information Disclosure Endpoint Dump */}
            <div className="card">
              <div className="card-title">
                <span>🔍 Sensitive System Info Dump (<code>/api/debug/system-info</code>)</span>
              </div>
              <p className="card-subtitle">
                Exposes complete server environment variables, Node.js runtime, OS architecture, and internal paths.
              </p>

              <button className="btn-secondary" onClick={handleFetchDebug} disabled={debugLoading}>
                {debugLoading ? 'Refreshing System Info...' : 'Re-fetch /api/debug/system-info'}
              </button>

              {debugInfo && (
                <div style={{ marginTop: '1rem' }}>
                  <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
