// Shared helpers for the workflow hooks.

const fs = require('fs');
const os = require('os');
const path = require('path');

function readStdin() {
  return new Promise(resolve => {
    let raw = '';
    process.stdin.on('data', d => (raw += d));
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(raw.replace(/^﻿/, ''))); } catch { resolve({}); } // PowerShell 5.1 pipes a BOM
    });
  });
}

function projectDir(input) {
  return path.resolve(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
}

// Per-project settings in .claude/workflow.json. All keys optional.
function workflowConfig(dir) {
  // stopMode "remind" (default) tells the user what is missing; "block" makes
  // Claude keep going. Stop fires at the end of every turn, not only at the end
  // of a session, so "block" forces a commit before every reply.
  const defaults = { workLog: 'WORK_LOG.md', workLogDir: null, requireCommit: true, stopMode: 'remind', longSessionBytes: 3 * 1024 * 1024 };
  try {
    return { ...defaults, ...JSON.parse(fs.readFileSync(path.join(dir, '.claude', 'workflow.json'), 'utf8')) };
  } catch {
    return defaults;
  }
}

// Files changed by Edit/Write in this session, recorded by track-changes.js.
function stateFile(sessionId) {
  const dir = path.join(os.tmpdir(), 'claude-workflow');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${String(sessionId || 'unknown').replace(/[^\w-]/g, '_')}.json`);
}

function readChanged(sessionId) {
  try { return JSON.parse(fs.readFileSync(stateFile(sessionId), 'utf8')); } catch { return []; }
}

// Windows paths compare case-insensitively (c: vs C:).
const key = p => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p));

function samePath(a, b) {
  return key(a) === key(b);
}

function addChanged(sessionId, file) {
  const list = readChanged(sessionId);
  const abs = path.resolve(file);
  if (!list.some(f => samePath(f, abs))) {
    list.push(abs);
    fs.writeFileSync(stateFile(sessionId), JSON.stringify(list));
  }
}

function isInside(file, dir) {
  const rel = path.relative(key(dir), key(file));
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

// workLogDir (e.g. "docs/worklog"): one file per entry, "YYYY-MM-DD-<topic>.md", so two
// branches never edit the same log file. Returns the entry files oldest first: by
// name (the date prefix), then by mtime for the same name prefix. Skips _TEMPLATE.md
// and README.md. Empty when workLogDir is unset or missing.
function workLogEntryFiles(dir, cfg) {
  if (!cfg.workLogDir) return [];
  const folder = path.resolve(dir, cfg.workLogDir);
  let names = [];
  try { names = fs.readdirSync(folder); } catch { return []; }
  return names
    .filter(n => /\.md$/i.test(n) && !/^(_TEMPLATE|README)\.md$/i.test(n))
    .map(n => {
      const file = path.join(folder, n);
      let st = null;
      try { st = fs.statSync(file); } catch { /* vanished */ }
      return st && st.isFile() ? { file, name: n, date: (n.match(/^(\d{4}-\d{2}-\d{2})/) || [])[1] || null, mtime: st.mtimeMs } : null;
    })
    .filter(Boolean)
    .sort((a, b) => ((a.date || '') === (b.date || '') ? a.mtime - b.mtime : (a.date || '') < (b.date || '') ? -1 : 1));
}

// ---------- event log ----------
// One JSON line per hook event in ~/.claude/workflow-events.jsonl, read by /retro.
// CLAUDE_WORKFLOW_EVENTS overrides the path (tests). Best effort: a logging
// failure is swallowed and never changes a hook's exit code.

const MAX_LOG_BYTES = 5 * 1024 * 1024; // then rotate to workflow-events.1.jsonl
const MAX_FIELD = 300;

function eventsFile() {
  return process.env.CLAUDE_WORKFLOW_EVENTS || path.join(os.homedir(), '.claude', 'workflow-events.jsonl');
}

// Strip credentials from a command or message before it is logged.
function redact(text) {
  return String(text)
    .replace(/(\b[a-z][\w+.-]*:\/\/)[^\s"'/@]+@/gi, '$1***@')                                  // user:pass@host
    .replace(/\b(bearer|basic|token)\s+[^\s"']+/gi, '$1 ***')                                 // Authorization headers
    .replace(/((?:--?)(?:password|passwd|pass|token|secret|api-?key|auth)[=\s]+)[^\s"']+/gi, '$1***')
    .replace(/\b([\w-]*(?:password|passwd|secret|token|api_?key|apikey|auth)[\w-]*\s*[=:]\s*)("[^"]*"|'[^']*'|[^\s"';&|]+)/gi, '$1***')
    .replace(/(^|\s)(-p)(?!\s)\S+/g, '$1$2***')                                                // mysql -pSECRET
    .replace(/\b(?:sk|pk|rk|ghp|gho|ghs|github_pat|xox[abprs]|glpat|AKIA)[-_A-Za-z0-9]{12,}/g, '***')
    .replace(/\beyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]*/g, '***')                                   // JWTs
    .replace(/\b(?=[\w+-]*\d)(?=[\w+-]*[A-Za-z])[\w+-]{32,}={0,2}/g, '***');                 // long opaque keys (not paths)
}

const clip = s => (s.length > MAX_FIELD ? `${s.slice(0, MAX_FIELD)}…` : s);

function cleanDetails(details) {
  const out = {};
  for (const [k, v] of Object.entries(details || {})) {
    if (typeof v === 'string') out[k] = clip(redact(v));
    else if (Array.isArray(v)) out[k] = v.slice(0, 20).map(x => (typeof x === 'string' ? clip(redact(x)) : x));
    else out[k] = v;
  }
  return out;
}

function logEvent(input, hook, details) {
  try {
    const file = eventsFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    try {
      if (fs.statSync(file).size > MAX_LOG_BYTES) fs.renameSync(file, file.replace(/(\.jsonl)?$/, '.1.jsonl'));
    } catch { /* no log yet */ }
    const line = {
      ts: new Date().toISOString(),
      session_id: (input && input.session_id) || null,
      project: projectDir(input || {}),
      hook,
      details: cleanDetails(details),
    };
    fs.appendFileSync(file, `${JSON.stringify(line)}\n`);
  } catch { /* logging is best effort */ }
}

module.exports = { readStdin, projectDir, workflowConfig, readChanged, addChanged, isInside, samePath, workLogEntryFiles, logEvent, redact };
