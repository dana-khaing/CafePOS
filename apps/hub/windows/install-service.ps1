$ErrorActionPreference = 'Stop'

$serviceDirectory = Split-Path -Parent $PSScriptRoot
$wrapper = Join-Path $serviceDirectory 'cafepos-hub.exe'
$wrapperConfig = Join-Path $serviceDirectory 'cafepos-hub.xml'
$sourceConfig = Join-Path $PSScriptRoot 'cafepos-hub.xml'
$environmentFile = Join-Path $serviceDirectory '.env'
$entryPoint = Join-Path $serviceDirectory 'dist\index.js'

$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($currentIdentity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Run this script from an elevated PowerShell session.'
}

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
  throw 'Node.js 22 or newer must be installed and available on PATH.'
}
if (-not (Test-Path $entryPoint)) {
  throw 'Hub build not found. Run pnpm --filter @cafepos/hub build first.'
}
if (-not (Test-Path $environmentFile)) {
  throw 'Create apps\hub\.env from .env.example before installing the service.'
}
if (-not (Test-Path $wrapper)) {
  throw 'Place the WinSW executable at apps\hub\cafepos-hub.exe before installing.'
}

$escapedNodePath = [Security.SecurityElement]::Escape($nodeCommand.Source)
$configContent = (Get-Content $sourceConfig -Raw).Replace('__NODE_EXE__', $escapedNodePath)
Set-Content -Path $wrapperConfig -Value $configContent -Encoding UTF8
& $wrapper install
& $wrapper start
& $wrapper status
