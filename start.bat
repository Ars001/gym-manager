@echo off
setlocal
cd /d "%~dp0"
title Gym Manager - Launcher

echo ============================================
echo   Gym Manager - starting up
echo ============================================
echo.

REM --- 1) Node installed? ---------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
  echo [X] Node.js is not installed.
  echo     Install the LTS version from https://nodejs.org then run this again.
  echo.
  pause
  exit /b 1
)

REM --- 2) backend\.env present? ---------------------------------------------
if not exist "backend\.env" (
  echo [!] backend\.env not found - creating it from the example.
  copy "backend\.env.example" "backend\.env" >nul
  echo.
  echo     Please set DATABASE_URL (your Neon connection string) in the file
  echo     that just opened, SAVE it, then run start.bat again.
  echo.
  notepad "backend\.env"
  pause
  exit /b 1
)

REM --- 3) First run: install packages + set up the database ------------------
if not exist "backend\node_modules" (
  echo [*] First run detected - installing backend packages...
  pushd backend
  call npm install
  echo [*] Creating database tables...
  call npm run db:setup
  echo [*] Adding demo data...
  call npm run db:seed
  popd
)
if not exist "frontend\node_modules" (
  echo [*] First run detected - installing frontend packages...
  pushd frontend
  call npm install
  popd
)

REM --- 4) Free ports 4000 / 5173 (stop any old servers) ---------------------
echo [*] Clearing old servers on ports 4000 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000" ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

REM --- 5) Launch both servers, each in its own window -----------------------
echo [*] Starting backend and frontend...
start "Gym Backend"  cmd /k "cd /d "%~dp0backend"  && npm run dev"
start "Gym Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

REM --- 6) Wait for them to boot, then open the browser ----------------------
echo [*] Waiting for servers to start...
timeout /t 8 /nobreak >nul
start "" http://localhost:5173

echo.
echo ============================================
echo   Gym Manager is running.
echo   App:  http://localhost:5173
echo   Login: demo / admin@demo.test / password123
echo.
echo   Keep the two server windows open while using
echo   the app. Close them to stop.
echo ============================================
echo.
echo This launcher window can be closed now.
timeout /t 6 /nobreak >nul
