const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const os = require('os');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5500;

// Sanitizer helper for XSS remediation recognized by SAST static taint analyzers
function sanitizeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>\'"]/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '\"': '&quot;',
    "'": '&#39;'
  }[c] || c));
}

// ============================================================================
// 1. MISSING HTTP SECURITY DIRECTIVES (Deliberately Omitted for DAST & SAVE AI)
// ============================================================================
// NOTICE: Helmet is intentionally NOT used.
// The following critical security headers are deliberately NOT configured:
// - X-Content-Type-Options (Allows MIME type sniffing)
// - X-Frame-Options (Allows clickjacking via iframes)
// - Referrer-Policy (Leaks referrer URL across origins)
// - Content-Security-Policy (Permits inline scripts & arbitrary script sources)
// - X-Powered-By is retained (Leaks Express.js version details to scanners)

// ============================================================================
// 2. OVERLY PERMISSIVE CORS MISCONFIGURATION
// ============================================================================
// Permissive CORS with wildcard origin AND credentials enabled
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ============================================================================
// DATABASE & SEED DATA (In-memory mock with MongoDB NoSQL operator semantics)
// ============================================================================
const mockUsers = [
  {
    id: '1',
    username: 'admin',
    password: 'SuperSecretAdminPassword2026!',
    email: 'admin@cyberbenchmark.internal',
    role: 'administrator',
    apiKey: 'sec_key_live_9942a78fbc1049210aa9',
    creditCard: '4111-XXXX-XXXX-9821',
    privateNotes: 'CONFIDENTIAL: Production database password is in vault #12'
  },
  {
    id: '2',
    username: 'alice',
    password: 'AlicePassword123!',
    email: 'alice@cyberbenchmark.internal',
    role: 'customer',
    apiKey: 'sec_key_live_1102b48acc2039210bb1',
    creditCard: '5500-XXXX-XXXX-4412',
    privateNotes: 'Personal shipping address: 742 Evergreen Terrace'
  },
  {
    id: '3',
    username: 'bob',
    password: 'BobPassword456!',
    email: 'bob@cyberbenchmark.internal',
    role: 'customer',
    apiKey: 'sec_key_live_3391c52acc1099210cc3',
    creditCard: '3782-XXXX-XXXX-1993',
    privateNotes: 'Customer loyalty tier: VIP Gold'
  }
];

const mockProducts = [
  { id: '1', name: 'CyberSec Shield 2026', price: 299, category: 'Hardware', inStock: true, description: 'Enterprise hardware firewall security appliance.' },
  { id: '2', name: 'DAST Vulnerability Scanner License', price: 999, category: 'Software', inStock: true, description: 'Automated vulnerability testing suite for REST & GraphQL.' },
  { id: '3', name: 'AI Remediation Agent Token Pack', price: 49, category: 'AI Services', inStock: true, description: '10,000 automated security patch tokens for SAVE Agentic AI.' },
  { id: '4', name: 'Zero-Trust Bastion Key', price: 149, category: 'Hardware', inStock: false, description: 'Hardware FIDO2 WebAuthn token with quantum-safe firmware.' }
];

let mockFeedback = [
  {
    id: 'fb-1',
    name: 'Security Researcher',
    comment: 'Welcome to the benchmark! Try submitting test payloads here.',
    rating: 5,
    date: new Date().toISOString()
  },
  {
    id: 'fb-2',
    name: 'QA Lead',
    comment: 'Great interface. Please test both reflected and stored XSS vectors.',
    rating: 4,
    date: new Date().toISOString()
  }
];

// Helper to simulate MongoDB query execution including NoSQL operators ($ne, $gt, $regex, etc.)
function matchesMongoQuery(fieldValue, queryCondition) {
  if (queryCondition === null || typeof queryCondition !== 'object') {
    return fieldValue === queryCondition;
  }
  for (const op of Object.keys(queryCondition)) {
    const val = queryCondition[op];
    if (op === '$ne') {
      if (fieldValue === val) return false;
    } else if (op === '$eq') {
      if (fieldValue !== val) return false;
    } else if (op === '$gt') {
      if (!(fieldValue > val)) return false;
    } else if (op === '$gte') {
      if (!(fieldValue >= val)) return false;
    } else if (op === '$lt') {
      if (!(fieldValue < val)) return false;
    } else if (op === '$lte') {
      if (!(fieldValue <= val)) return false;
    } else if (op === '$regex') {
      const reg = new RegExp(val);
      if (!reg.test(fieldValue)) return false;
    }
  }
  return true;
}

// ============================================================================
// 3. VULNERABLE ENDPOINTS
// ============================================================================

// --- Reflected XSS: Direct Query Echoing ---
app.get('/api/search', (req, res) => {
  const query = req.query.q || '';
  const results = mockProducts.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.description.toLowerCase().includes(query.toLowerCase())
  );

  res.json({
    query: sanitizeHtml(query),
    count: results.length,
    results: results
  });
});

// HTML-based Reflected XSS endpoint for direct scanner detection
app.get('/search', (req, res) => {
  const query = req.query.q || '';
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>Search Results</title></head>
      <body>
        <h1>Search Results</h1>
        <p>You searched for: <span>${sanitizeHtml(query)}</span></p>
        <a href="/">Return Home</a>
      </body>
    </html>
  `);
});

// --- Stored XSS: Guestbook / Customer Feedback ---
app.get('/api/feedback', (req, res) => {
  res.json({ success: true, count: mockFeedback.length, feedback: mockFeedback });
});

app.post('/api/feedback', (req, res) => {
  const { name, comment, rating } = req.body;
  if (!comment) {
    return res.status(400).json({ error: 'Comment is required' });
  }

  const newEntry = {
    id: `fb-${Date.now()}`,
    name: name ? sanitizeHtml(name) : 'Anonymous',
    comment: sanitizeHtml(comment),
    rating: Number(rating) || 5,
    date: new Date().toISOString()
  };

  mockFeedback.unshift(newEntry);
  res.status(201).json({ success: true, entry: newEntry });
});

// --- Authentication: NoSQL Injection Vulnerability ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || password === undefined) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = mockUsers.find(u => {
    const userMatch = matchesMongoQuery(u.username, username);
    const passMatch = matchesMongoQuery(u.password, password);
    return userMatch && passMatch;
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const sessionToken = `session_${user.id}_${Date.now()}`;
  res.cookie('auth_token', sessionToken, {
    httpOnly: false,
    secure: false,
    sameSite: 'none'
  });

  const { password: _, ...safeUser } = user;
  res.json({
    success: true,
    message: 'Authentication successful',
    token: sessionToken,
    user: safeUser
  });
});

// --- Insecure Direct Object Reference (IDOR) ---
app.get('/api/users/:id', (req, res) => {
  const requestedId = req.params.id;

  const user = mockUsers.find(u => u.id === requestedId || u.username === requestedId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    success: true,
    profile: user
  });
});

app.get('/api/users', (req, res) => {
  // Leaks user directory listing
  res.json({
    users: mockUsers.map(u => ({ id: u.id, username: u.username, role: u.role, email: u.email }))
  });
});

// --- Information Disclosure & Sensitive Debug Route ---
app.get('/api/debug/system-info', (req, res) => {
  res.json({
    status: 'DEBUG_ACTIVE',
    serverTimestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    hostname: os.hostname(),
    cpus: os.cpus(),
    memory: {
      totalMemMB: Math.round(os.totalmem() / 1024 / 1024),
      freeMemMB: Math.round(os.freemem() / 1024 / 1024),
      processUsage: process.memoryUsage()
    },
    database: {
      type: 'Mock MongoDB / Mongoose In-Memory Engine',
      activeConnections: 1,
      connectedUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/vulnerable_bench_db'
    },
    environmentVariables: process.env
  });
});

// --- Products Catalog Endpoint ---
app.get('/api/products', (req, res) => {
  res.json({ success: true, products: mockProducts });
});

// Serve static React client bundle
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Fallback for SPA routing while keeping /api and /search working
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/search') {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Start Server only if run directly (local development)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[+] Vulnerable Benchmark Server listening on port ${PORT}`);
    console.log(`[!] Warning: Deliberately missing HTTP security directives for DAST benchmarking.`);
  });
}

module.exports = app;
