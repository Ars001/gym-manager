@echo off
setlocal
cd /d "%~dp0"

REM Creates a "Gym Manager" shortcut on your Desktop that runs start.bat.
REM Double-click that shortcut any time to launch the whole app.

set "TARGET=%~dp0start.bat"
set "SHORTCUT=%USERPROFILE%\Desktop\Gym Manager.lnk"

powershell -NoProfile -Command ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%SHORTCUT%');" ^
  "$s.TargetPath='%TARGET%';" ^
  "$s.WorkingDirectory='%~dp0';" ^
  "$s.IconLocation='%SystemRoot%\System32\shell32.dll,220';" ^
  "$s.Description='Launch Gym Manager';" ^
  "$s.Save()"

echo Desktop shortcut "Gym Manager" created.
echo Double-click it any time to start the app.
pause
