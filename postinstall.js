#!/usr/bin/env node

import readline from 'readline';

// ANSI color codes
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

// Skip consent prompt when env var is set (for CI/container use)
if (process.env.CLAUDE_YOLO_SKIP_CONSENT === '1' || process.env.CLAUDE_YOLO_SKIP_CONSENT === 'true') {
  process.exit(0);
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`\n${BOLD}${YELLOW}🔥 CLAUDE-YOLO INSTALLATION CONSENT REQUIRED 🔥${RESET}\n`);
console.log(`${CYAN}----------------------------------------${RESET}`);
console.log(`${BOLD}What is claude-yolo?${RESET}`);
console.log(`This package creates a wrapper around the official Claude CLI tool that:`);
console.log(`  1. ${RED}BYPASSES safety checks${RESET} by automatically adding the --dangerously-skip-permissions flag`);
console.log(`  2. Automatically updates to the latest Claude CLI version`);
console.log(`  3. Adds colorful YOLO-themed loading messages\n`);

console.log(`${BOLD}${RED}⚠️ IMPORTANT SECURITY WARNING ⚠️${RESET}`);
console.log(`The ${BOLD}--dangerously-skip-permissions${RESET} flag was designed for use in containers`);
console.log(`and bypasses important safety checks. This includes ignoring file access`);
console.log(`permissions that protect your system and privacy.\n`);

console.log(`${BOLD}By using claude-yolo:${RESET}`);
console.log(`  • You acknowledge these safety checks are being bypassed`);
console.log(`  • You understand this may allow Claude CLI to access sensitive files`);
console.log(`  • You accept full responsibility for any security implications\n`);

console.log(`${CYAN}----------------------------------------${RESET}\n`);

// Ask for explicit consent
rl.question(`${YELLOW}Do you consent to installing claude-yolo with these modifications? (yes/no): ${RESET}`, (answer) => {
  const lowerAnswer = answer.toLowerCase().trim();
  
  if (lowerAnswer === 'yes' || lowerAnswer === 'y') {
    console.log(`\n${YELLOW}🔥 YOLO MODE INSTALLATION APPROVED 🔥${RESET}`);
    console.log(`Installation will continue. Use 'claude-yolo' instead of 'claude' to run in YOLO mode.`);
    process.exit(0); // Success exit code
  } else {
    console.log(`\n${CYAN}Installation cancelled by user.${RESET}`);
    console.log(`If you want the official Claude CLI with normal safety features, run:`);
    console.log(`npm install -g @anthropic-ai/claude-code`);
    process.exit(1); // Error exit code to abort installation
  }
});