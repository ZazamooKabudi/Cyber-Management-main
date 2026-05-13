const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/users',     require('./routes/users'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/tasks',     require('./routes/tasks'));
app.use('/api/systems',   require('./routes/systems'));
app.use('/api/cves',      require('./routes/cves'));
app.use('/api/settings',  require('./routes/settings'));
app.use('/api/config',    require('./routes/config'));
app.use('/api/analysts',  require('./routes/analysts'));
app.use('/api/handover',  require('./routes/handover'));
app.use('/api/events',    require('./routes/events'));
app.use('/api/playbooks', require('./routes/playbooks'));
app.use('/api/inventory', require('./routes/inventory'));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── Serve built frontend (production) ────────────────────────────────────────
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));

// ── Start ─────────────────────────────────────────────────────────────────────
try {
  initDb();
  app.listen(PORT, () => {
    console.log(`[SOC API] Server running on http://localhost:${PORT}`);
    console.log(`[SOC API] Health: http://localhost:${PORT}/api/health`);
  });
} catch (err) {
  console.error('[SOC API] Failed to start:', err);
  process.exit(1);
}
