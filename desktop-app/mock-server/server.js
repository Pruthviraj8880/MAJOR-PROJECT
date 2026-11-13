// ============================================================
// mock-server/server.js
// Fake REST API so we can build the frontend without waiting
// for the real backend. Same endpoints, same response shapes.
// Run with: npm run mock
// ============================================================

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3001;
const SECRET = 'mock-secret-key';

app.use(cors());
app.use(express.json());

// ── Fake data ────────────────────────────────────────────────

const users = [
  { id: 1, name: 'Dr. Admin',    email: 'admin@inst.edu',   password: 'admin123',   role: 'admin' },
  { id: 2, name: 'Prof. Sharma', email: 'faculty@inst.edu', password: 'faculty123', role: 'faculty' },
  { id: 3, name: 'Riya Patel',   email: 'student@inst.edu', password: 'student123', role: 'student' }
];

let nextIndicatorId = 6;
let indicators = [
  { id: 1, name: 'Research Papers',   category: 'Research', unit: 'count',  department: 'Computer Science', isActive: true,  description: 'Published journal/conference papers' },
  { id: 2, name: 'Patents Filed',     category: 'IP',       unit: 'count',  department: 'Electronics',      isActive: true,  description: 'Patents applied for or granted' },
  { id: 3, name: 'Grants Received',   category: 'Funding',  unit: 'amount', department: 'Civil Engg',       isActive: true,  description: 'Funding from external agencies' },
  { id: 4, name: 'Startups Incubated', category: 'Startup',  unit: 'count',  department: 'Innovation Cell',  isActive: true,  description: 'Student or faculty-led startups' },
  { id: 5, name: 'National Awards',   category: 'Award',    unit: 'count',  department: 'Institute Level',  isActive: false, description: 'Awards and recognitions received' }
];

let nextEntryId = 5;
let entries = [
  { id: 1, title: 'ML in Healthcare Paper',    description: 'Published in IEEE Access',       indicatorId: 1, indicatorName: 'Research Papers',   submittedBy: 2, submittedByName: 'Prof. Sharma', status: 'approved', createdAt: '2026-10-01' },
  { id: 2, title: 'IoT Patent Application',    description: 'Smart campus sensor network',    indicatorId: 2, indicatorName: 'Patents Filed',     submittedBy: 2, submittedByName: 'Prof. Sharma', status: 'pending',  createdAt: '2026-10-15' },
  { id: 3, title: 'DST Grant ₹5L',             description: 'Under SERB young scientist',     indicatorId: 3, indicatorName: 'Grants Received',   submittedBy: 2, submittedByName: 'Prof. Sharma', status: 'pending',  createdAt: '2026-11-01' },
  { id: 4, title: 'EduTech Startup',            description: 'AI tutoring platform by students', indicatorId: 4, indicatorName: 'Startups Incubated', submittedBy: 3, submittedByName: 'Riya Patel',   status: 'rejected', createdAt: '2026-11-05' }
];

let nextCommentId = 3;
let comments = [
  { id: 1, entryId: 1, text: 'Great work, approved!',               userId: 1, authorName: 'Dr. Admin', createdAt: '2026-10-02' },
  { id: 2, entryId: 4, text: 'Please add the incorporation certificate.', userId: 1, authorName: 'Dr. Admin', createdAt: '2026-11-06' }
];

// ── Auth middleware ──────────────────────────────────────────

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'No token provided' });

  try {
    req.user = jwt.verify(header.replace('Bearer ', ''), SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

// ── AUTH ─────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) return res.status(401).json({ message: 'Wrong email or password' });

  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

// ── INDICATORS ──────────────────────────────────────────────

app.get('/api/indicators', authMiddleware, (req, res) => {
  res.json(indicators);
});

app.post('/api/indicators', authMiddleware, (req, res) => {
  const ind = { id: nextIndicatorId++, ...req.body };
  indicators.push(ind);
  res.status(201).json(ind);
});

app.put('/api/indicators/:id', authMiddleware, (req, res) => {
  const ind = indicators.find(i => i.id === Number(req.params.id));
  if (!ind) return res.status(404).json({ message: 'Indicator not found' });

  Object.assign(ind, req.body);
  res.json(ind);
});

app.delete('/api/indicators/:id', authMiddleware, (req, res) => {
  indicators = indicators.filter(i => i.id !== Number(req.params.id));
  res.json({ message: 'Deleted' });
});

// ── ENTRIES ─────────────────────────────────────────────────

app.get('/api/entries', authMiddleware, (req, res) => {
  res.json(entries);
});

app.get('/api/entries/:id', authMiddleware, (req, res) => {
  const entry = entries.find(e => e.id === Number(req.params.id));
  if (!entry) return res.status(404).json({ message: 'Entry not found' });
  res.json(entry);
});

app.post('/api/entries', authMiddleware, (req, res) => {
  const ind = indicators.find(i => i.id === Number(req.body.indicatorId));
  const entry = {
    id: nextEntryId++,
    ...req.body,
    indicatorName: ind ? ind.name : 'Unknown',
    submittedBy: req.user.id,
    submittedByName: req.user.name,
    status: 'pending',
    createdAt: new Date().toISOString().slice(0, 10)
  };
  entries.push(entry);
  res.status(201).json(entry);
});

app.put('/api/entries/:id', authMiddleware, (req, res) => {
  const entry = entries.find(e => e.id === Number(req.params.id));
  if (!entry) return res.status(404).json({ message: 'Entry not found' });

  Object.assign(entry, req.body);
  res.json(entry);
});

app.put('/api/entries/:id/status', authMiddleware, (req, res) => {
  const entry = entries.find(e => e.id === Number(req.params.id));
  if (!entry) return res.status(404).json({ message: 'Entry not found' });

  entry.status = req.body.status; // 'approved' or 'rejected'

  // Also save the review comment if provided
  if (req.body.comment) {
    comments.push({
      id: nextCommentId++,
      entryId: entry.id,
      text: req.body.comment,
      userId: req.user.id,
      authorName: req.user.name,
      createdAt: new Date().toISOString().slice(0, 10)
    });
  }

  res.json(entry);
});

// ── COMMENTS ────────────────────────────────────────────────

app.get('/api/entries/:id/comments', authMiddleware, (req, res) => {
  const entryComments = comments.filter(c => c.entryId === Number(req.params.id));
  res.json(entryComments);
});

app.post('/api/entries/:id/comments', authMiddleware, (req, res) => {
  const comment = {
    id: nextCommentId++,
    entryId: Number(req.params.id),
    text: req.body.text,
    userId: req.user.id,
    authorName: req.user.name,
    createdAt: new Date().toISOString().slice(0, 10)
  };
  comments.push(comment);
  res.status(201).json(comment);
});

// ── Start ───────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log('Mock API running → http://localhost:' + PORT);
  console.log('Test accounts:');
  users.forEach(u => console.log('  ' + u.email + ' / ' + u.password + '  (' + u.role + ')'));
});

