# =====================================================================
# Training Video Generator - Local Browser Mode
#
# Opens YOUR Chrome/Edge with a debug port and tunnels it to the VPS so
# the wizard's "Launch & Record" drives this real local browser instead
# of the remote one. Keep this window open while recording.
#
# Requirements: SSH key access to the VPS (root@45.132.240.8)
# =====================================================================

$ErrorActionPreference = "Stop"
$VpsHost = "45.132.240.8"
$VpsUser = "root"
$TunnelBind = "172.28.0.1"   # docker network gateway on the VPS (pinned in docker-compose.yml)
$DebugPort = 9222
$AppUrl = "https://tvg.333ai.tech"

Write-Host ""
Write-Host "=== Training Video Generator - Local Browser Mode ===" -ForegroundColor Cyan

# --- 1. Find a Chromium-based browser ---
$browserCandidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)
$browser = $browserCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) {
    Write-Host "ERROR: Could not find Chrome or Edge." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Browser: $browser"

# --- 2. Launch it with a dedicated recording profile + debug port ---
$profileDir = Join-Path $env:LOCALAPPDATA "tvg-recorder-profile"
Start-Process -FilePath $browser -ArgumentList @(
    "--remote-debugging-port=$DebugPort",
    "--user-data-dir=`"$profileDir`"",
    "--no-first-run",
    "--no-default-browser-check",
    "--new-window",
    $AppUrl
)

# --- 3. Wait for the debug port ---
Write-Host "Waiting for browser debug port..."
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        Invoke-RestMethod -Uri "http://127.0.0.1:$DebugPort/json/version" -TimeoutSec 2 | Out-Null
        $ready = $true; break
    } catch { Start-Sleep -Milliseconds 500 }
}
if (-not $ready) {
    Write-Host "ERROR: Browser debug port never came up." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Browser ready."

# --- 4. Reverse tunnel: VPS docker gateway -> this PC's debug port ---
Write-Host ""
Write-Host "LOCAL BROWSER MODE ACTIVE" -ForegroundColor Green
Write-Host "  - Use the app at $AppUrl (opened in the new window)"
Write-Host "  - 'Launch & Record' will now use THIS browser"
Write-Host "  - Keep this window open; close it (or Ctrl+C) when done"
Write-Host ""

# Blocks until interrupted; ExitOnForwardFailure aborts if the bind is taken
ssh -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -N `
    -R "${TunnelBind}:${DebugPort}:127.0.0.1:${DebugPort}" "$VpsUser@$VpsHost"

Write-Host "Tunnel closed - local browser mode OFF (server falls back to remote browser)."
