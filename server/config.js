const path = require('path');
const fs = require('fs');

const CONFIG_PATH = path.join(__dirname, 'app-config.json');

const DEFAULTS = {
  db_path: 'C:\\SQL_DB\\Cyber-Management-main\\soc.db',
};

function getConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return { ...DEFAULTS };
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) };
  } catch {
    return { ...DEFAULTS };
  }
}

function setConfig(updates) {
  const current = getConfig();
  const updated = { ...current, ...updates };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

module.exports = { getConfig, setConfig, CONFIG_PATH };
