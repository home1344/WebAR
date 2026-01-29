@echo off
echo ========================================
echo WebAR Project - Dependency Installation
echo ========================================
echo.
echo Checking Node.js installation...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)
echo.
echo Checking npm installation...
npm --version
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed!
    pause
    exit /b 1
)
echo.
echo Installing dependencies...
echo This may take a few minutes...
echo.
npm install
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Installation failed!
    echo Try running: npm install --legacy-peer-deps
    pause
    exit /b 1
)
echo.
echo ========================================
echo Installation complete!
echo ========================================
echo.
echo Next steps:
echo 1. Place your GLB models in public/models/
echo 2. Run run-dev.bat to start the server
echo 3. Test on your mobile device
echo.
pause
