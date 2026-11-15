# Cree .env avec des secrets aleatoires (ne l ecrase jamais s il existe deja).
$ErrorActionPreference = "Stop"
if (Test-Path .env) { Write-Host ".env existe deja : rien a faire."; exit 0 }
function Rnd { $b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); -join ($b | ForEach-Object { $_.ToString("x2") }) }
$lines = @("POSTGRES_ADMIN_PASSWORD=$(Rnd)", "ASTRO_LOGIN_PASSWORD=$(Rnd)", "JWT_SECRET=$(Rnd)$(Rnd)", "DEMO_PASSCODE=APOLLO2026")
[IO.File]::WriteAllText("$PWD\.env", ($lines -join "`n") + "`n", (New-Object Text.UTF8Encoding $false))
Write-Host ".env cree. Lance maintenant : docker compose up --build"
