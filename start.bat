@echo off
setlocal
cd /d "%~dp0"
set "HOST=127.0.0.1"
set "PORT=8077"
set "PY=.venv\Scripts\python.exe"

echo [1/5] stop previous server
call "%~dp0stop.bat" quiet
if errorlevel 1 (
  echo [FAIL] could not stop previous server
  exit /b 1
)

echo [2/5] check venv and folders
if not exist "%PY%" (
  py -3 -m venv .venv
  "%PY%" -m pip install --upgrade pip --quiet
  "%PY%" -m pip install -r requirements.txt --quiet
)
if not exist ".env" copy /y ".env.example" ".env" >nul
if not exist "state" mkdir "state"
if not exist "data" mkdir "data"
if not exist "web\vendor" mkdir "web\vendor"
if not exist "%PY%" (
  echo [FAIL] Python environment was not created
  exit /b 1
)

echo [3/5] check chart library
if not exist "web\vendor\lwc.standalone.js" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$u='https://unpkg.com/lightweight-charts@5.2.0/dist/lightweight-charts.standalone.production.js'; try{ Invoke-WebRequest $u -OutFile 'web\vendor\lwc.standalone.js' -UseBasicParsing -TimeoutSec 25 }catch{ Write-Output '[WARN] library download failed' }"
)

echo [4/5] start server window
set "PYTHONUTF8=1"
start "kiwoom-auto server" /D "%~dp0" "%~dp0%PY%" -m uvicorn app.main:app --host %HOST% --port %PORT% --reload --reload-dir app

echo [5/5] wait for health
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok=$false; for($i=0;$i -lt 60;$i++){ try{ if((Invoke-WebRequest -Uri 'http://%HOST%:%PORT%/api/health' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200){ $ok=$true; break } }catch{}; Start-Sleep -Milliseconds 500 }; if($ok){ exit 0 } else { exit 1 }"
if errorlevel 1 (
  echo [FAIL] no response - read traceback in the server window
) else (
  echo [OK] http://%HOST%:%PORT%
  start "" "http://%HOST%:%PORT%"
)
if "%1"=="quiet" goto done
pause
:done
endlocal
