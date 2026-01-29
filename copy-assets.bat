@echo off
echo Copying assets to project directories...

REM Copy models
echo Copying GLB models...
copy "models\*.glb" "public\models\" /Y

REM Copy logo
echo Copying logo...
copy "images\LOGO.svg" "public\assets\" /Y

echo.
echo Asset copy complete!
pause
