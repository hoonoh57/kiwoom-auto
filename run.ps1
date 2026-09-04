$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new()
$OutputEncoding = [Text.UTF8Encoding]::new()
$env:PYTHONUTF8 = '1'

Set-Location -LiteralPath $PSScriptRoot

if (-not (Test-Path '.venv')) {
    py -3 -m venv .venv
    .\.venv\Scripts\python.exe -m pip install --upgrade pip --quiet
    .\.venv\Scripts\python.exe -m pip install -r requirements.txt --quiet
}
if (-not (Test-Path '.env')) { Copy-Item '.env.example' '.env' }
New-Item -ItemType Directory -Force -Path 'state','data' | Out-Null

$lwc = 'web\vendor\lwc.standalone.js'
if (-not (Test-Path $lwc) -or (Get-Item $lwc).Length -lt 100000) {
    New-Item -ItemType Directory -Force -Path 'web\vendor' | Out-Null
    foreach ($u in @(
        'https://unpkg.com/lightweight-charts@5.2.0/dist/lightweight-charts.standalone.production.js',
        'https://cdn.jsdelivr.net/npm/lightweight-charts@5.2.0/dist/lightweight-charts.standalone.production.js')) {
        try { Invoke-WebRequest -Uri $u -OutFile $lwc -UseBasicParsing -TimeoutSec 20; break } catch { }
    }
}
if (-not (Test-Path $lwc)) { Write-Output '[WARN] lwc ?????- ??? ????? }

Write-Output '[RUN] http://127.0.0.1:8777'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8777
