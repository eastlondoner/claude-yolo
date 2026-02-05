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
const stateFile = path.join(os.homedir(), '.claude_yolo_state');

// Function to get current mode from state file
function getMode() {
  try {
    return fs.readFileSync(stateFile, 'utf8').trim();
  } catch {
    return 'YOLO'; // Default mode
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

// Silent mode: suppress startup banners and YOLO output
const isSilent = process.env.CLAUDE_YOLO_SILENT === '1' ||
                 process.env.CLAUDE_YOLO_SILENT === 'true' ||
                 process.argv.includes('--silent');

// Skip consent: bypass interactive consent prompt
const skipConsent = process.env.CLAUDE_YOLO_SKIP_CONSENT === '1' ||
                    process.env.CLAUDE_YOLO_SKIP_CONSENT === 'true' ||
                    process.argv.includes('--no-consent');

// Function to ask for user consent
function askForConsent() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log(`\n${BOLD}${YELLOW}🔥 CLAUDE-YOLO CONSENT REQUIRED 🔥${RESET}\n`);
    console.log(`${CYAN}----------------------------------------${RESET}`);
    console.log(`${BOLD}What is claude-yolo?${RESET}`);
    console.log(`This package creates a wrapper around the official Claude CLI tool that:`);
    console.log(`  1. ${RED}BYPASSES safety checks${RESET} by automatically adding the --dangerously-skip-permissions flag`);
    console.log(`  2. Automatically updates to the latest Claude CLI version`);
    console.log(`  3. Adds colorful YOLO-themed loading messages`);
    console.log(`  4. ${GREEN}NOW SUPPORTS SAFE MODE${RESET} with --safe flag\n`);

    console.log(`${BOLD}${RED}⚠️ IMPORTANT SECURITY WARNING ⚠️${RESET}`);
    console.log(`The ${BOLD}--dangerously-skip-permissions${RESET} flag was designed for use in containers`);
    console.log(`and bypasses important safety checks. This includes ignoring file access`);
    console.log(`permissions that protect your system and privacy.\n`);

    console.log(`${BOLD}By using claude-yolo in YOLO mode:${RESET}`);
    console.log(`  • You acknowledge these safety checks are being bypassed`);
    console.log(`  • You understand this may allow Claude CLI to access sensitive files`);
    console.log(`  • You accept full responsibility for any security implications\n`);

    console.log(`${CYAN}----------------------------------------${RESET}\n`);

    rl.question(`${YELLOW}Do you consent to using claude-yolo with these modifications? (yes/no): ${RESET}`, (answer) => {
      rl.close();
      const lowerAnswer = answer.toLowerCase().trim();
      if (lowerAnswer === 'yes' || lowerAnswer === 'y') {
        console.log(`\n${YELLOW}🔥 YOLO MODE APPROVED 🔥${RESET}`);
        resolve(true);
      } else {
        console.log(`\n${CYAN}Aborted. YOLO mode not activated.${RESET}`);
        console.log(`If you want the official Claude CLI with normal safety features, run:`);
        console.log(`claude`);
        resolve(false);
      }
    });
  });
}

// Get the directory of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

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
      if (!isSilent) console.log(`Updating Claude package from ${currentVersion || 'unknown'} to ${latestVersion}...`);

      // Update package.json
      packageJson.dependencies['@anthropic-ai/claude-code'] = latestVersion;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

      // Run npm install
      if (!isSilent) console.log("Running npm install to update dependencies...");
      execSync("npm install", { stdio: isSilent ? 'pipe' : 'inherit', cwd: nodeModulesDir });
      if (!isSilent) console.log("Update complete!");
    } else if (currentVersion === "latest") {
      // If using "latest", just make sure we have the latest version installed
      debug("Using 'latest' tag in package.json, running npm install to ensure we have the newest version");
      execSync("npm install", { stdio: isSilent ? 'pipe' : 'inherit', cwd: nodeModulesDir });
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
const localClaudeDir = path.join(nodeModulesDir, 'node_modules', '@anthropic-ai', 'claude-code');

// For AGENTS mode, always use LOCAL installation to ensure patches work correctly
// Global installation may have different minified variable names
const claudeDir = localClaudeDir;
debug(`Using Claude installation from: ${claudeDir}`);
debug(`Using ${claudeDir === globalClaudeDir ? 'GLOBAL' : 'LOCAL'} Claude installation`);

// Check for both .js and .mjs versions of the CLI
let mjs = path.join(claudeDir, 'cli.mjs');
let js = path.join(claudeDir, 'cli.js');
let originalCliPath;
let yoloCliPath;

if (fs.existsSync(js)) {
  originalCliPath = js;
  yoloCliPath = path.join(claudeDir, 'cli-yolo.js');
  debug(`Found Claude CLI at ${originalCliPath} (js version)`);
} else if (fs.existsSync(mjs)) {
  originalCliPath = mjs;
  yoloCliPath = path.join(claudeDir, 'cli-yolo.mjs');
  debug(`Found Claude CLI at ${originalCliPath} (mjs version)`);
} else {
  console.error(`Error: Claude CLI not found in ${claudeDir}. Make sure @anthropic-ai/claude-code is installed.`);
  process.exit(1);
}
const consentFlagPath = path.join(claudeDir, '.claude-yolo-consent');

// Main function to run the application
async function run() {
  // Handle mode commands first
  const args = process.argv.slice(2);
  if (args[0] === 'mode') {
    if (args[1] === 'yolo') {
      console.log(`${YELLOW}🔥 Switching to YOLO mode...${RESET}`);
      console.log(`${RED}⚠️  WARNING: All safety checks will be DISABLED!${RESET}`);
      setMode('YOLO');
      console.log(`${YELLOW}✓ YOLO mode activated${RESET}`);
      return;
    } else if (args[1] === 'safe') {
      console.log(`${CYAN}🛡️  Switching to SAFE mode...${RESET}`);
      console.log(`${GREEN}✓ Safety checks will be enabled${RESET}`);
      setMode('SAFE');
      console.log(`${CYAN}✓ SAFE mode activated${RESET}`);
      return;
    } else {
      const currentMode = getMode();
      console.log(`Current mode: ${currentMode === 'YOLO' ? YELLOW : CYAN}${currentMode}${RESET}`);
      return;
    }
  }

  // Check for --safe or --no-yolo flags
  const safeMode = process.argv.includes('--safe') ||
                   process.argv.includes('--no-yolo') ||
                   getMode() === 'SAFE';

  if (safeMode) {
    // Remove our flags before passing to original CLI
    process.argv = process.argv.filter(arg =>
      arg !== '--safe' && arg !== '--no-yolo' && arg !== '--no-consent' && arg !== '--silent'
    );
    
    if (!isSilent) console.log(`${CYAN}[SAFE] Running Claude in SAFE mode${RESET}`);
    
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

  // YOLO MODE continues below
  if (!isSilent) console.log(`${YELLOW}[YOLO] Running Claude in YOLO mode${RESET}`);

  // Enable bypass permissions mode for YOLO mode (allows auto-accept of plans)
  if (!process.argv.includes('--dangerously-skip-permissions')) {
    process.argv.push('--dangerously-skip-permissions');
    debug("Added --dangerously-skip-permissions flag for YOLO mode");
  }

  // Temporarily fake non-root for YOLO mode
  if (process.getuid && process.getuid() === 0) {
    if (!isSilent) console.log(`${YELLOW}⚠️  Running as root - applying YOLO bypass...${RESET}`);
    // Store original getuid
    const originalGetuid = process.getuid;
    // Override getuid to return non-root
    process.getuid = () => 1000; // Fake regular user ID
    // Restore after a delay to allow CLI to start
    setTimeout(() => {
      process.getuid = originalGetuid;
    }, 100);
  }

  // Check and update Claude package first
  await checkForUpdates();

  if (!fs.existsSync(originalCliPath)) {
    console.error(`Error: ${originalCliPath} not found. Make sure @anthropic-ai/claude-code is installed.`);
    process.exit(1);
  }

  // Check if consent is needed
  const consentNeeded = !fs.existsSync(yoloCliPath) || !fs.existsSync(consentFlagPath);

  // If consent is needed and not already given, ask for it (unless skipped)
  if (consentNeeded) {
    if (skipConsent) {
      // Auto-consent: create the flag file silently
      debug("Consent skipped via CLAUDE_YOLO_SKIP_CONSENT or --no-consent");
      try {
        fs.writeFileSync(consentFlagPath, 'consent-given');
        debug("Created consent flag file (auto-consented)");
      } catch (err) {
        debug(`Error creating consent flag file: ${err.message}`);
      }
    } else {
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
  }

  // Remove our flags from argv before passing to Claude CLI
  process.argv = process.argv.filter(arg => arg !== '--no-consent' && arg !== '--silent');

  // Read the original CLI file content
  let cliContent = fs.readFileSync(originalCliPath, 'utf8');

  if (claudeDir === localClaudeDir) {
    cliContent = cliContent.replace(/"punycode"/g, '"punycode/"');
    debug('Replaced all instances of "punycode" with "punycode/"');
  }

  // Replace getIsDocker() calls with true
  cliContent = cliContent.replace(/[a-zA-Z0-9_]*\.getIsDocker\(\)/g, 'true');
  debug("Replaced all instances of *.getIsDocker() with true");

  // Replace hasInternetAccess() calls with false
  cliContent = cliContent.replace(/[a-zA-Z0-9_]*\.hasInternetAccess\(\)/g, 'false');
  debug("Replaced all instances of *.hasInternetAccess() with false");

  // Replace root check patterns
  // Pattern 1: process.getuid() === 0
  cliContent = cliContent.replace(/process\.getuid\(\)\s*===\s*0/g, 'false');
  debug("Replaced process.getuid() === 0 checks with false");

  // Pattern 2: process.getuid?.() === 0
  cliContent = cliContent.replace(/process\.getuid\?\.\(\)\s*===\s*0/g, 'false');
  debug("Replaced process.getuid?.() === 0 checks with false");

  // Pattern 3: getuid() === 0 (with any variable)
  cliContent = cliContent.replace(/(\w+)\.getuid\(\)\s*===\s*0/g, 'false');
  debug("Replaced all getuid() === 0 checks with false");

  // Pattern 4: Replace any EUID checks
  cliContent = cliContent.replace(/process\.geteuid\(\)\s*===\s*0/g, 'false');
  cliContent = cliContent.replace(/process\.geteuid\?\.\(\)\s*===\s*0/g, 'false');
  debug("Replaced geteuid() checks with false");

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
  if (!isSilent) console.log(`${YELLOW}🔥 YOLO MODE ACTIVATED 🔥${RESET}`);

  // Replace the loading messages array with YOLO versions
  const originalArray = '["Accomplishing","Actioning","Actualizing","Baking","Brewing","Calculating","Cerebrating","Churning","Clauding","Coalescing","Cogitating","Computing","Conjuring","Considering","Cooking","Crafting","Creating","Crunching","Deliberating","Determining","Doing","Effecting","Finagling","Forging","Forming","Generating","Hatching","Herding","Honking","Hustling","Ideating","Inferring","Manifesting","Marinating","Moseying","Mulling","Mustering","Musing","Noodling","Percolating","Pondering","Processing","Puttering","Reticulating","Ruminating","Schlepping","Shucking","Simmering","Smooshing","Spinning","Stewing","Synthesizing","Thinking","Transmuting","Vibing","Working"]';
  const yoloSuffixes = [
    ` ${RED}(safety's off, hold on tight)${RESET}`,
    ` ${YELLOW}(all gas, no brakes, lfg)${RESET}`,
    ` ${BOLD}\x1b[35m(yolo mode engaged)${RESET}`,
    ` ${CYAN}(dangerous mode! I guess you can just do things)${RESET}`
  ];

  // Function to add a random YOLO suffix to each word in the array
  const addYoloSuffixes = (arrayStr) => {
    try {
      const array = JSON.parse(arrayStr);
      const yoloArray = array.map(word => {
        const randomSuffix = yoloSuffixes[Math.floor(Math.random() * yoloSuffixes.length)];
        return word + randomSuffix;
      });
      return JSON.stringify(yoloArray);
    } catch (e) {
      debug(`Error modifying loading messages array: ${e.message}`);
      return arrayStr;
    }
  };

  cliContent = cliContent.replace(originalArray, addYoloSuffixes(originalArray));
  debug("Replaced loading messages with YOLO versions");

  // Write the modified content to a new file, leaving the original untouched
  fs.writeFileSync(yoloCliPath, cliContent);
  debug(`Created modified CLI at ${yoloCliPath}`);
  debug("Modifications complete. The --dangerously-skip-permissions flag should now work everywhere.");

  // Add the --dangerously-skip-permissions flag to the command line arguments
  // This will ensure it's passed to the CLI even if the user didn't specify it
  process.argv.splice(2, 0, '--dangerously-skip-permissions');
  debug("Added --dangerously-skip-permissions flag to command line arguments");

  // Now import the modified CLI
  await import(yoloCliPath);
}

// Run the main function
run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});