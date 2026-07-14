@echo off
setlocal
cd /d "%~dp0"
title Gym Manager - Load Demo Data

echo Loading fresh demo data into the "demo" gym...
echo (This resets the demo gym's members, sessions, bookings and payments.)
echo.

pushd backend
call npm run db:demo
popd

echo.
echo Done. Go to the app and press F5 (refresh) to see the data.
pause
