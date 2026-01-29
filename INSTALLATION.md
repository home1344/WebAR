# Installation Guide

## Prerequisites

- **Node.js 18+** (LTS recommended)
- **npm** (comes with Node.js)
- Windows, macOS, or Linux

## Installation Methods

### Method 1: Using Batch Script (Windows)

Double-click `install.bat` or run in Command Prompt:
```cmd
install.bat
```

### Method 2: Using PowerShell (Windows - Recommended)

Right-click `install.ps1` and select "Run with PowerShell", or run:
```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

### Method 3: Manual Installation

Open terminal/command prompt in the project directory and run:
```bash
npm install
```

### Method 4: Legacy Installation (If standard install fails)

If you encounter peer dependency issues:
```bash
npm install --legacy-peer-deps
```

Or use the script:
```cmd
install-legacy.bat
```

## Troubleshooting

### "Node.js is not installed"
Download and install from: https://nodejs.org/
Recommended: LTS version (v18 or v20)

### "npm is not installed"
npm comes with Node.js. Reinstall Node.js if missing.

### Peer Dependency Conflicts
Run with legacy flag:
```bash
npm install --legacy-peer-deps
```

### Permission Errors (Linux/Mac)
Try with sudo:
```bash
sudo npm install
```

Or fix npm permissions:
```bash
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### Slow Installation
This is normal. A-Frame and dependencies can take 2-5 minutes to install.

## Verify Installation

After installation completes, verify with:
```bash
npm list
```

You should see:
- aframe@1.5.0
- vite@5.4.11
- @vitejs/plugin-basic-ssl@1.1.0

## Next Steps

1. **Add Models**: Place GLB files in `public/models/`
2. **Configure**: Edit `src/config/config.js` with your model paths
3. **Start Dev Server**: Run `run-dev.bat` or `npm run dev`
4. **Test**: Open on mobile device at `https://[your-ip]:3000`

## Package Details

### Dependencies
- **aframe**: ^1.5.0 - WebXR framework

### Dev Dependencies
- **vite**: ^5.4.11 - Build tool with HTTPS support
- **@vitejs/plugin-basic-ssl**: ^1.1.0 - SSL certificates for local HTTPS

Total install size: ~150-200 MB
