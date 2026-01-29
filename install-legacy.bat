@echo off
echo ========================================
echo WebAR Project - Legacy Installation
echo (Use this if standard install fails)
echo ========================================
echo.
echo Installing with legacy peer deps...
npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Installation failed!
    pause
    exit /b 1
)
echo.
echo Installation complete!
pause
