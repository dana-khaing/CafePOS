$ErrorActionPreference = 'Stop'

$serviceDirectory = Split-Path -Parent $PSScriptRoot
$wrapper = Join-Path $serviceDirectory 'cafepos-hub.exe'
if (-not (Test-Path $wrapper)) {
  throw 'WinSW wrapper not found at apps\hub\cafepos-hub.exe.'
}

& $wrapper stop
& $wrapper uninstall
