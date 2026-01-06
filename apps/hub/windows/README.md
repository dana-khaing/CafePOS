# Windows service installation

1. Install Node.js 22 and build the hub with `pnpm --filter @cafepos/hub build`.
2. Copy `.env.example` to `.env` and configure the branch identity and allowed
   web origins. Keep loopback binding unless LAN access is explicitly required.
3. Download a trusted, checksummed WinSW release and rename the executable to
   `apps\hub\cafepos-hub.exe`.
4. Run `windows\install-service.ps1` from an elevated PowerShell session.

The service starts automatically after Windows boots, restarts after failures,
and rolls logs under `apps\hub\logs`. Use `uninstall-service.ps1` to stop and
remove it. Do not store cloud service-role credentials in the hub `.env` file.
