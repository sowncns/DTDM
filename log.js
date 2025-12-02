const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(process.cwd(), 'activity.log');

function formatLine(action, status, details) {
  // Primary format required: "date - act - status"
  const ts = new Date().toISOString();
  const base = `${ts} - ${action} - ${status}`;
  if (details) return `${base} - ${details}`; // keep details optional
  return base;
}

function appendLine(line) {
  try {
    fs.appendFileSync(LOG_PATH, line + '\n', { encoding: 'utf8' });
  } catch (err) {
    // Best effort: log to console if file append fails
    console.error('activity.log write error:', err);
  }
}


function writeActivity(action, status, details) {
  const line = formatLine(action, status, details);
  appendLine(line);
}

module.exports = { writeActivity, LOG_PATH };
