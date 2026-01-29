# Quick Start Guide

## Step 1: Install Dependencies

Open **Command Prompt** or **PowerShell** in this directory and run:

```bash
npm install
```

**Alternative if that fails:**
```bash
npm install --legacy-peer-deps
```

## Step 2: Verify Installation

Check that packages were installed:
```bash
npm list --depth=0
```

You should see:
```
webar-floor-placement@1.0.0
├── aframe@1.5.0
├── @vitejs/plugin-basic-ssl@1.1.0
└── vite@5.4.11
```

## Step 3: Add Your Models

1. Convert your FBX files to GLB format
2. Place GLB files in `public/models/` folder:
   - `house1.glb`
   - `house2.glb`
   - `house3.glb`

## Step 4: Update Configuration

Edit `src/config/config.js` and verify model paths are correct.

## Step 5: Start Development Server

Run:
```bash
npm run dev
```

Or double-click: `run-dev.bat`

The server will start at: `https://localhost:3000`

## Step 6: Test on Mobile

1. Find your computer's IP address:
   ```bash
   ipconfig
   ```
   Look for "IPv4 Address" (e.g., 192.168.1.100)

2. On your Samsung S25:
   - Open Chrome
   - Go to `https://[your-ip]:3000`
   - Accept certificate warning
   - Allow camera permissions
   - Point at floor and tap to place model

## Troubleshooting

**"Cannot find module"**
- Run `npm install` again
- Check that `node_modules` folder exists

**"Port 3000 already in use"**
- Close other dev servers
- Or change port in `vite.config.js`

**"WebXR not supported"**
- Ensure you're using HTTPS
- Test on supported browser (Chrome Android)
- Check camera permissions

**Models not loading**
- Verify GLB files are in `public/models/`
- Check browser console for errors
- Ensure file paths match config

## Need Help?

See `INSTALLATION.md` for detailed installation instructions.
See `README.md` for full project documentation.
