@echo off
setlocal
cd /d "%~dp0"
set "HOST=127.0.0.1"
set "PORT=8077"

powershell -NoProfile -ExecutionPolicy Bypass -Command "try{ if((Invoke-WebRequest -Uri 'http://%HOST%:%PORT%/api/health' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200){ exit 0 } }catch{}; exit 1"
if errorlevel 1 (
  echo [INFO] server not running - calling start.bat
  call "%~dp0start.bat" quiet
  goto done
)

echo [1/2] trigger in-place reload
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Path 'app' -Filter *.py | ForEach-Object { $_.LastWriteTime = Get-Date }"

echo [2/2] wait for health
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Milliseconds 1200; $ok=$false; for($i=0;$i -lt 40;$i++){ try{ if((Invoke-WebRequest -Uri 'http://%HOST%:%PORT%/api/health' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200){ $ok=$true; break } }catch{}; Start-Sleep -Milliseconds 500 }; if($ok){ exit 0 } else { exit 1 }"
if errorlevel 1 (
  echo [FAIL] reload failed - read traceback in the server window, then run start.bat
) else (
  echo [OK] reloaded - press Ctrl+Shift+R in the browser
)
pause
:done
endlocal
