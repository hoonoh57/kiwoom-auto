@echo off
setlocal
cd /d "%~dp0"
set "PORT=8777"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$k=0; $ps = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^python' -and $_.CommandLine -like '*uvicorn*app.main:app*' }; foreach($p in $ps){ try{ Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop; $k++ }catch{} }; $c = Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue; foreach($id in ($c | Select-Object -ExpandProperty OwningProcess -Unique)){ try{ Stop-Process -Id $id -Force -ErrorAction Stop; $k++ }catch{} }; $left=$null; for($i=0;$i -lt 20;$i++){ $left=Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue; if(-not $left){ break }; Start-Sleep -Milliseconds 250 }; if($left){ Write-Output '[FAIL] port still in use'; exit 1 } else { Write-Output ('[OK] stopped=' + $k); exit 0 }"
if "%1"=="quiet" goto done
pause
:done
endlocal
