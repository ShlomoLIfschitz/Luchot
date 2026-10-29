#!/usr/bin/env node
// Stop: if this session changed files in the project, check that the work log
// was updated and (unless requireCommit is false) the changed files are
// committed. Sessions that changed no files are never flagged.
// Stop fires at the end of every turn, so the default stopMode "remind" only
// shows the user what is missing; stopMode "block" makes Claude keep going.
// Also suggests a new session when the transcript gets long (never blocks).
//
// Config (optional): .claude/workflow.json
//   { "workLog": "WORK_LOG.md", "requireCommit": true, "stopMode": "remind", "longSessionBytes": 3145728 }

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { readStdin, projectDir, workflowConfig, readChanged, isInside, samePath, logEvent } = require('./lib');

function uncommitted(dir, files) {
  const r = spawnSync('git', ['status', '--porcelain', '--', ...files], { cwd: dir, encoding: 'utf8', timeout: 15000 });
  if (r.status !== 0) return null; // not a git repo, or git missing
  return r.stdout.split(/\r?\n/).filter(Boolean).map(l => l.slice(3));
}

function longSessionNote(input, cfg) {
  try {
    if (input.transcript_path && fs.statSync(input.transcript_path).size > cfg.longSessionBytes) {
      return 'Long session. If a heavy task just finished, start the next one in a new session (see "Session boundaries" in CLAUDE.md).';
    }
  } catch { /* no transcript */ }
  return null;
}

readStdin().then(input => {
  // Already continuing because of this hook: let it stop, or it loops forever.
  if (input.stop_hook_active) process.exit(0);

  const dir = projectDir(input);
  const cfg = workflowConfig(dir);
  const changed = readChanged(input.session_id).filter(f => isInside(f, dir));
  const note = longSessionNote(input, cfg);

  const problems = [];
  const missing = []; // for the event log
  let left = [];
  if (changed.length) {
    const workLog = path.resolve(dir, cfg.workLog);
    if (!changed.some(f => samePath(f, workLog))) {
      problems.push(`${cfg.workLog} was not updated this session.`);
      missing.push('work-log');
    }
    if (cfg.requireCommit) {
      left = uncommitted(dir, changed.map(f => path.relative(dir, f))) || [];
      if (left.length) {
        problems.push(`Uncommitted changes: ${left.join(', ')}.`);
        missing.push('commit');
      }
    }
  }
  if (problems.length) {
    logEvent(input, 'stop-check', { mode: cfg.stopMode === 'block' ? 'block' : 'remind', missing, workLog: cfg.workLog, uncommitted: left });
  }

  if (problems.length && cfg.stopMode !== 'block') {
    const msg = `Reminder: ${problems.join(' ')}`;
    process.stdout.write(JSON.stringify({ systemMessage: note ? `${msg}\n${note}` : msg }));
  } else if (problems.length) {
    process.stdout.write(JSON.stringify({
      decision: 'block',
      reason: `Not done yet. ${problems.join(' ')} Update the work log with what changed and the verification output, then commit (or ask Shlomo if committing should wait).`,
      ...(note ? { systemMessage: note } : {}),
    }));
  } else if (note) {
    process.stdout.write(JSON.stringify({ systemMessage: note }));
  }
  process.exit(0);
});
