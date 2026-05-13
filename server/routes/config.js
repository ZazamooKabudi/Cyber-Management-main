const { Router } = require('express');
const fs = require('fs');
const { getConfig, setConfig } = require('../config');

const router = Router();

// GET /api/config — return current app config
router.get('/', (_req, res) => {
  res.json(getConfig());
});

// PUT /api/config/db-path — update database path
router.put('/db-path', (req, res) => {
  const { db_path } = req.body;
  if (!db_path || typeof db_path !== 'string' || !db_path.trim()) {
    return res.status(400).json({ error: 'נתיב לא תקין' });
  }
  const trimmed = db_path.trim();
  try {
    const dir = require('path').dirname(trimmed);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    setConfig({ db_path: trimmed });
    res.json({ ok: true, db_path: trimmed, restartRequired: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/config/db-path/copy — copy existing DB to new path then update config
router.post('/db-path/copy', (req, res) => {
  const { db_path } = req.body;
  if (!db_path || typeof db_path !== 'string' || !db_path.trim()) {
    return res.status(400).json({ error: 'נתיב לא תקין' });
  }
  const trimmed = db_path.trim();
  const current = getConfig().db_path;

  try {
    const dir = require('path').dirname(trimmed);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(current)) {
      fs.copyFileSync(current, trimmed);
    }
    setConfig({ db_path: trimmed });
    res.json({ ok: true, db_path: trimmed, copied: fs.existsSync(current), restartRequired: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
