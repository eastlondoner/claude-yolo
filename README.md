# Claude YOLO

A wrapper for the Claude CLI that can run in YOLO mode (bypassing all safety checks) OR Safe mode (standard Claude CLI behavior).

⚠️ **SECURITY WARNING**: YOLO mode bypasses important safety checks! This completely bypasses the "human in the loop" checks, this could delete your data, leak your secrets and even brick your computer. Use at your own risk.

## What's New in This Fork 🎉

This fork adds **SAFE MODE** support and more! You can now:
- Switch between YOLO and SAFE modes
- Use the handy `cl` bash wrapper for quick mode switching
- Mode preference is saved between sessions
- **NEW**: Auto-start Claude after mode switch
- **NEW**: YOLO mode works even as root user

## Installation

```bash
# Install from this fork
npm install -g github:maxparez/claude-yolo

# Or install the original
npm install -g claude-yolo
```

The first time you run `claude-yolo`, you will be presented with a consent prompt explaining the security implications. You must explicitly agree to continue.

<img width="750" alt="image" src="https://github.com/user-attachments/assets/f8e07cf0-6c43-4663-b9e2-f61b1afb4e99" />

Your consent choice is remembered for future runs.

## New Safe Mode Feature 🛡️

### Using command-line flags

```bash
# Run in SAFE mode (normal Claude CLI behavior)
claude-yolo --safe
claude-yolo --no-yolo

# Run in YOLO mode (default)
claude-yolo
```

### Using mode commands

```bash
# Switch to YOLO mode
claude-yolo mode yolo

# Switch to SAFE mode
claude-yolo mode safe

# Check current mode
claude-yolo mode
```

### Using the cl wrapper script (Recommended!)

For even easier mode management, use the included `cl` bash wrapper:

```bash
# Install globally during npm install
npm install -g github:maxparez/claude-yolo

# Or copy manually to your PATH
cp node_modules/claude-yolo/bin/cl /usr/local/bin/cl
chmod +x /usr/local/bin/cl

# Now you can use:
cl /YON      # Switch to YOLO mode AND start Claude
cl /YOFF     # Switch to SAFE mode AND start Claude
cl /STATUS   # Show current mode (without starting Claude)
cl /HELP     # Show help

# Run Claude in current mode
cl "write a hello world function"

# Switch mode and run with command
cl /YON "create a web server"
```

Mode preference is saved in `~/.claude_yolo_state` and persists between sessions.

## Visual Mode Indicators

The tool now shows clear visual indicators of which mode you're in:

- **YOLO Mode**: `[YOLO]` prefix in yellow 🔥
- **SAFE Mode**: `[SAFE]` prefix in cyan 🛡️

## Root User Support

Unlike the standard Claude CLI, this fork allows YOLO mode to run even as root user:

- Standard Claude CLI blocks `--dangerously-skip-permissions` when running as root
- This fork bypasses that check in YOLO mode
- You'll see a warning when running as root, but it will work
- SAFE mode respects all original Claude CLI security features

## Usage

```bash
claude-yolo [options]
```

All arguments and options are passed directly to the Claude CLI.

This wrapper in YOLO mode:
1. Checks for and automatically installs updates to the Claude package
2. Displays "🔥 YOLO MODE ACTIVATED 🔥" warning in yellow text
3. Creates a modified copy of the Claude CLI code to bypass permission checks
   - Replaces all `getIsDocker()` calls with `true`
   - Replaces all `hasInternetAccess()` calls with `false`
   - Bypasses root user checks (process.getuid() === 0)
   - Adds colorful YOLO-themed loading messages
4. Leaves the original Claude CLI file untouched (won't affect your normal `claude` command)
5. Adds the `--dangerously-skip-permissions` flag to command line arguments
6. Imports the modified copy of the CLI

In SAFE mode, it simply runs the original Claude CLI without modifications.

## New in Version 1.8.0 (This Fork)

- **Auto-start on Mode Switch**: `cl /YON` and `cl /YOFF` now automatically start Claude after switching
- **Root User Bypass**: YOLO mode now works even when running as root/sudo
- **Improved cl Wrapper**: More intuitive behavior with auto-start feature
- **Better Error Handling**: Clearer messages when running as root

## New in Version 1.7.0 (This Fork)

- **SAFE Mode Support**: Run Claude with normal safety checks using `--safe` or `--no-yolo`
- **Mode Persistence**: Your mode choice is saved in `~/.claude_yolo_state`
- **Mode Commands**: Use `claude-yolo mode [yolo|safe]` to switch modes
- **Bash Wrapper**: Included `cl` script for easy mode switching
- **Visual Mode Indicators**: Clear `[YOLO]` or `[SAFE]` prefixes

## Features

- **Auto-update**: Automatically checks for and installs updates to the Claude package at runtime
- **Non-destructive approach**: Creates a separate modified copy of the CLI file instead of modifying the original
- **Safe for global installations**: Your regular `claude` command will work normally even after installing claude-yolo
- **Debug mode**: Set the `DEBUG=1` environment variable to see detailed logs about the modifications

## Why?

Sometimes you just want to YOLO and skip those pesky permission checks. But sometimes you want the safety checks back! This fork gives you the best of both worlds.

## Environment Variables for CI / Container Use

When running `claude-yolo` in non-interactive environments (Docker containers, CI pipelines, automated scripts), you can use environment variables to control startup behavior:

| Variable | CLI flag | Effect |
|----------|----------|--------|
| `CLAUDE_YOLO_SILENT=1` | `--silent` | Suppress all startup banners (`[YOLO]`, `YOLO MODE ACTIVATED`, root bypass warning), mode indicators (`[SAFE]`), and npm update output (version checks, `npm install` progress) |
| `CLAUDE_YOLO_SKIP_CONSENT=1` | `--no-consent` | Skip the interactive consent prompt and auto-accept. Also creates the consent flag file so subsequent runs won't prompt either |
| `DEBUG=1` | — | Show debug output |

All flags and environment variables can be freely combined. Here are common scenarios:

```bash
# Silent only — no banners, but still prompts for consent on first run
claude-yolo --silent

# Skip consent only — shows banners, but auto-accepts consent
claude-yolo --no-consent

# Both — fully non-interactive, no output noise
claude-yolo --silent --no-consent

# Same with env vars (better for Dockerfiles and CI)
CLAUDE_YOLO_SILENT=1 CLAUDE_YOLO_SKIP_CONSENT=1 claude-yolo

# Mix and match — env var for one, flag for the other
CLAUDE_YOLO_SILENT=1 claude-yolo --no-consent
```

### Dockerfile example

```dockerfile
ENV CLAUDE_YOLO_SILENT=1
ENV CLAUDE_YOLO_SKIP_CONSENT=1
RUN npm install -g claude-yolo
```

## Debugging

If you encounter any issues, you can run with debug output:

```bash
DEBUG=1 claude-yolo
```

This will show additional information about:
- Claude package update checks
- Current and latest available versions
- When updates are being installed
- Modifications being made to the CLI file
- Root bypass operations

## Auto-Update Feature

Claude YOLO automatically checks for updates to the Claude package each time it runs:

1. When you run `claude-yolo`, it checks for the latest version of `@anthropic-ai/claude-code` on npm
2. If your installed version is outdated, it will:
   - Update your package.json with the latest version
   - Run npm install to get the newest version
   - Notify you that an update was applied
3. This ensures you're always using the latest Claude CLI features

## Important Security Disclaimer

This is an unofficial tool and not supported by Anthropic. Use at your own risk.

**SECURITY WARNING**:
- YOLO mode bypasses safety mechanisms intentionally built into the Claude CLI
- The `--dangerously-skip-permissions` flag was designed for use in container environments
- This fork additionally bypasses root user restrictions in YOLO mode
- By using this tool in YOLO mode, you acknowledge that:
  - Important safety checks are being bypassed
  - Claude may access files it normally would not have permission to access
  - Running as root with bypassed permissions is extremely dangerous
  - You accept full responsibility for any security implications
  
Anthropic designed these safety checks for good reason. Only use YOLO mode if you fully understand and accept these risks. Use SAFE mode when you want the standard Claude CLI protections.