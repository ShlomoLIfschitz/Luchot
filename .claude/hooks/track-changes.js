#!/usr/bin/env node
// PostToolUse (Edit|Write|MultiEdit|NotebookEdit): record the changed file for
// this session, so stop-check.js knows whether the session changed anything.
// Never blocks.

const { readStdin, addChanged } = require('./lib');

readStdin().then(input => {
  const ti = input.tool_input || {};
  const file = ti.file_path || ti.notebook_path;
  if (file) {
    try { addChanged(input.session_id, file); } catch { /* tracking is best effort */ }
  }
  process.exit(0);
});
