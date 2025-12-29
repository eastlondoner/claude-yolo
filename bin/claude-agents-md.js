#!/usr/bin/env node


import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import readline from 'readline';

// ANSI color codes
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

// Path to persistent state file
const stateFile = path.join(os.homedir(), '.claude_agents_state');

// Function to get current mode from state file
function getMode() {
  try {
    return fs.readFileSync(stateFile, 'utf8').trim();
  } catch {
    return 'AGENTS'; // Default mode
  }
}

// Function to set mode in state file
function setMode(mode) {
  fs.writeFileSync(stateFile, mode);
}

// Debug logging function that only logs if DEBUG env var is set
const debug = (message) => {
  if (process.env.DEBUG) {
    console.log(message);
  }
};

// Function to ask for user consent
function askForConsent() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log(`\n${BOLD}${YELLOW}🔥 claude-agents-md CONSENT REQUIRED 🔥${RESET}\n`);
    console.log(`${CYAN}----------------------------------------${RESET}`);
    console.log(`${BOLD}What is claude-agents-md?${RESET}`);
    console.log(`This package creates a wrapper around the official Claude CLI tool that:`);
    console.log(`  1. ${RED}Ignores CLAUDE.md${RESET} and uses AGENTS.md instead`);
    console.log(`  2. Automatically updates to the latest Claude CLI version`);
    console.log(`  4. ${GREEN}NOW SUPPORTS CLAUDE.md MODE${RESET} with --claude flag\n`);

    console.log(`${BOLD}By using claude-agents-md in AGENTS mode:${RESET}`);
    console.log(`  • You acknowledge that CLAUDE.md is being ignored and claude will follow instructions from AGENTS.md`);
    console.log(`  • You accept full responsibility for any rule following implications\n`);

    console.log(`${CYAN}----------------------------------------${RESET}\n`);

    rl.question(`${YELLOW}Do you consent to using claude-agents-md with these modifications? (yes/no): ${RESET}`, (answer) => {
      rl.close();
      const lowerAnswer = answer.toLowerCase().trim();
      if (lowerAnswer === 'yes' || lowerAnswer === 'y') {
        console.log(`\n${YELLOW}🔥 AGENTS MODE APPROVED 🔥${RESET}`);
        resolve(true);
      } else {
        console.log(`\n${CYAN}Aborted. AGENTS mode not activated.${RESET}`);
        console.log(`If you want the official Claude CLI with normal behaviour, run:`);
        console.log(`claude`);
        resolve(false);
      }
    });
  });
}

// Get the directory of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Find node_modules directory by walking up from current file
let nodeModulesDir = path.resolve(__dirname, '..');
while (!fs.existsSync(path.join(nodeModulesDir, 'node_modules')) && nodeModulesDir !== '/') {
  nodeModulesDir = path.resolve(nodeModulesDir, '..');
}

// Path to check package info
const packageJsonPath = path.join(nodeModulesDir, 'package.json');

// Check for updates to Claude package
async function checkForUpdates() {
  try {
    debug("Checking for Claude package updates...");
    
    // Get the latest version available on npm
    const latestVersionCmd = "npm view @anthropic-ai/claude-code version";
    const latestVersion = execSync(latestVersionCmd).toString().trim();
    debug(`Latest Claude version on npm: ${latestVersion}`);
    
    // Get our current installed version
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = packageJson.dependencies || {};
    const currentVersion = dependencies['@anthropic-ai/claude-code'];
    
    debug(`Claude version from package.json: ${currentVersion}`);
    
    // Get the global Claude version if available
    let globalVersion;
    if (globalClaudeDir) {
      try {
        const globalPackageJsonPath = path.join(globalClaudeDir, 'package.json');
        if (fs.existsSync(globalPackageJsonPath)) {
          const globalPackageJson = JSON.parse(fs.readFileSync(globalPackageJsonPath, 'utf8'));
          globalVersion = globalPackageJson.version;
          debug(`Global Claude version: ${globalVersion}`);
          
          // If global version is latest, inform user
          if (globalVersion === latestVersion) {
            debug(`Global Claude installation is already the latest version`);
          } else if (globalVersion && latestVersion) {
            debug(`Global Claude installation (${globalVersion}) differs from latest (${latestVersion})`);
          }
        }
      } catch (err) {
        debug(`Error getting global Claude version: ${err.message}`);
      }
    }
    
    // If using a specific version (not "latest"), and it's out of date, update
    if (currentVersion !== "latest" && currentVersion !== latestVersion) {
      console.log(`Updating Claude package from ${currentVersion || 'unknown'} to ${latestVersion}...`);
      
      // Update package.json
      packageJson.dependencies['@anthropic-ai/claude-code'] = latestVersion;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      
      // Run npm install
      console.log("Running npm install to update dependencies...");
      execSync("npm install", { stdio: 'inherit', cwd: nodeModulesDir });
      console.log("Update complete!");
    } else if (currentVersion === "latest") {
      // If using "latest", just make sure we have the latest version installed
      debug("Using 'latest' tag in package.json, running npm install to ensure we have the newest version");
      execSync("npm install", { stdio: 'inherit', cwd: nodeModulesDir });
    }
  } catch (error) {
    console.error("Error checking for updates:", error.message);
    debug(error.stack);
  }
}

// Try to find global installation of Claude CLI first
let globalClaudeDir;
try {
  const globalNodeModules = execSync('npm -g root').toString().trim();
  debug(`Global node_modules: ${globalNodeModules}`);
  const potentialGlobalDir = path.join(globalNodeModules, '@anthropic-ai', 'claude-code');
  
  if (fs.existsSync(potentialGlobalDir)) {
    globalClaudeDir = potentialGlobalDir;
    debug(`Found global Claude installation at: ${globalClaudeDir}`);
  }
} catch (error) {
  debug(`Error finding global Claude installation: ${error.message}`);
}

// Path to the local Claude CLI installation
let localClaudeDir = path.join(nodeModulesDir, 'node_modules', '@anthropic-ai', 'claude-code');
if(!fs.existsSync(localClaudeDir)) {
  // Path to claude cli in this package
  localClaudeDir = path.join(nodeModulesDir, 'claude-agents-md', 'node_modules', '@anthropic-ai', 'claude-code');
}

// For AGENTS mode, always use LOCAL installation to ensure patches work correctly
// Global installation may have different minified variable names
const claudeDir = localClaudeDir;
debug(`Using Claude installation from: ${claudeDir}`);
debug(`Using ${claudeDir === globalClaudeDir ? 'GLOBAL' : 'LOCAL'} Claude installation`);

// Check for both .js and .mjs versions of the CLI
let mjs = path.join(claudeDir, 'cli.mjs');
let js = path.join(claudeDir, 'cli.js');
let originalCliPath;
let agentsCliPath;

if (fs.existsSync(js)) {
  originalCliPath = js;
  agentsCliPath = path.join(claudeDir, 'cli-agents.js');
  debug(`Found Claude CLI at ${originalCliPath} (js version)`);
} else if (fs.existsSync(mjs)) {
  originalCliPath = mjs;
  agentsCliPath = path.join(claudeDir, 'cli-agents.mjs');
  debug(`Found Claude CLI at ${originalCliPath} (mjs version)`);
} else {
  console.error(`Error: Claude CLI not found in ${claudeDir}. Make sure @anthropic-ai/claude-code is installed.`);
  process.exit(1);
}
const consentFlagPath = path.join(claudeDir, '.claude-agents-md-consent');

// Main function to run the application
async function run() {
  // Handle mode commands first
  const args = process.argv.slice(2);
  if (args[0] === 'mode') {
    if (args[1] === 'agents') {
      console.log(`${YELLOW}🔥 Switching to AGENTS mode...${RESET}`);
      console.log(`${RED}⚠️  WARNING: CLAUDE.md will be igored!${RESET}`);
      setMode('AGENTS');
      console.log(`${YELLOW}✓ AGENTS mode activated${RESET}`);
      return;
    } else if (args[1] === 'claude') {
      console.log(`${CYAN}🛡️  Switching to CLAUDE.md mode...${RESET}`);
      console.log(`${GREEN}✓ CLAUDE.md will be enabled${RESET}`);
      setMode('CLAUDE');
      console.log(`${CYAN}✓ CLAUDE.md mode activated${RESET}`);
      return;
    } else {
      const currentMode = getMode();
      console.log(`Current mode: ${currentMode === 'AGENTS' ? YELLOW : CYAN}${currentMode}${RESET}`);
      return;
    }
  }

  // Check for --claude or --no-agents flags
  const claudeMode = process.argv.includes('--claude') || 
                   process.argv.includes('--no-agents') ||
                   getMode() === 'CLAUDE';
  
  if (claudeMode) {
    // Remove our flags before passing to original CLI
    process.argv = process.argv.filter(arg => 
      arg !== '--claude' && arg !== '--no-agents'
    );
    
    console.log(`${CYAN}[CLAUDE] Running Claude in CLAUDE.md mode${RESET}`);
    
    // Update if needed
    await checkForUpdates();
    
    // Ensure original CLI exists
    if (!fs.existsSync(originalCliPath)) {
      console.error(`Error: ${originalCliPath} not found. Make sure @anthropic-ai/claude-code is installed.`);
      process.exit(1);
    }
    
    // Run original CLI without modifications
    await import(originalCliPath);
    return; // Exit early
  }

  // AGENTS MODE continues below
  console.log(`${YELLOW}[AGENTS] Running Claude in AGENTS mode${RESET}`);

  // Enable bypass permissions mode for AGENTS mode (allows auto-accept of plans)
  if (!process.argv.includes('--dangerously-skip-permissions')) {
    process.argv.push('--dangerously-skip-permissions');
    debug("Added --dangerously-skip-permissions flag for AGENTS mode");
  }

  // Check and update Claude package first
  await checkForUpdates();

  if (!fs.existsSync(originalCliPath)) {
    console.error(`Error: ${originalCliPath} not found. Make sure @anthropic-ai/claude-code is installed.`);
    process.exit(1);
  }

  // Check if consent is needed
  const consentNeeded = !fs.existsSync(agentsCliPath) || !fs.existsSync(consentFlagPath);
  
  // If consent is needed and not already given, ask for it
  if (consentNeeded) {
    const consent = await askForConsent();
    if (!consent) {
      // User didn't consent, exit
      process.exit(1);
    }
    
    // Create a flag file to remember that consent was given
    try {
      fs.writeFileSync(consentFlagPath, 'consent-given');
      debug("Created consent flag file");
    } catch (err) {
      debug(`Error creating consent flag file: ${err.message}`);
      // Continue anyway
    }
  }

  // Read the original CLI file content
  let cliContent = fs.readFileSync(originalCliPath, 'utf8');

  if (claudeDir === localClaudeDir) {
    cliContent = cliContent.replace(/"punycode"/g, '"punycode/"');
    debug('Replaced all instances of "punycode" with "punycode/"');
  }

  // Replace CLAUDE.md with AGENTS.md
  cliContent = cliContent.replace(/([^,])CLAUDE\.md/g, '$1AGENTS.md');
  debug("Replaced all instances of CLAUDE.md with AGENTS.md");

  // Auto-accept plan mode confirmation
  // Inject a useEffect that automatically triggers "yes-bypass-permissions" when:
  // - bypass permissions mode is available (G.toolPermissionContext.isBypassPermissionsModeAvailable)
  // - there's a valid plan (!F means plan is not empty)
  const planAutoAcceptPatch = `k5.useEffect(()=>{if(G.toolPermissionContext.isBypassPermissionsModeAvailable&&!F){N("yes-bypass-permissions")}},[]);`;
  const targetString = 'let M=Md(),R=M?oH(M):null';
  if (cliContent.includes(targetString)) {
    cliContent = cliContent.replace(targetString, targetString + ';' + planAutoAcceptPatch);
    debug("Patched plan mode to auto-accept when bypass permissions is available");
  } else {
    debug("WARNING: Could not find target string for plan auto-accept patch");
  }

  // Add warning message
  console.log(`${YELLOW}🔥 AGENTS MODE ACTIVATED 🔥${RESET}`);

  // Write the modified content to a new file, leaving the original untouched
  fs.writeFileSync(agentsCliPath, cliContent);
  debug(`Created modified CLI at ${agentsCliPath}`);
  debug("Modifications complete. The AGENTS.md file should now be used instead of CLAUDE.md.");

  // Now import the modified CLI
  await import(agentsCliPath);
}

// Run the main function
run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});