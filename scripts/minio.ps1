param(
    [ValidateSet('install', 'start', 'stop', 'status')][string]$Action = 'status',
    [string]$DataDirectory
)
$ErrorActionPreference = 'Stop'
$projectDir = Split-Path $PSScriptRoot -Parent
$runtimeDir = Join-Path $projectDir '.minio'
$binary = Join-Path $runtimeDir 'bin\minio.exe'
$credentialsFile = Join-Path $runtimeDir 'credentials.json'
$pidFile = Join-Path $runtimeDir 'server.pid'
$storageFile = Join-Path $runtimeDir 'storage.json'

function Get-MinIOProcess {
    if (Test-Path -LiteralPath $pidFile) {
        $serverId = [int](Get-Content -LiteralPath $pidFile)
        $process = Get-Process -Id $serverId -ErrorAction SilentlyContinue
        if ($process -and $process.Path -eq $binary) { return $process }
    }
    return $null
}

if ($Action -eq 'install') {
    New-Item -ItemType Directory -Force -Path $runtimeDir, (Join-Path $runtimeDir 'bin') | Out-Null
    $goVersion = 'go1.27.2'
    $goHash = '1314008898bd40df77af4b014f777f08873dbdfbcd3d92308728ee03304fe04f'
    $revision = '7aac2a2c5b7c882e68c1ce017d8256be2feea27f'
    $goBinary = Join-Path $runtimeDir 'go\bin\go.exe'
    $goReady = Join-Path $runtimeDir 'go-ready'
    $installedGo = Get-Command go.exe -ErrorAction SilentlyContinue
    if ($installedGo) {
        $versionText = & $installedGo.Source version
        if ($versionText -match 'go(\d+\.\d+(?:\.\d+)?)' -and [version]$Matches[1] -ge [version]'1.24') {
            $goBinary = $installedGo.Source
        }
    }
    if (!(Test-Path -LiteralPath $binary) -and $goBinary -eq (Join-Path $runtimeDir 'go\bin\go.exe') -and !(Test-Path -LiteralPath $goReady)) {
        $archive = Join-Path $runtimeDir 'go.zip'
        Write-Host 'Downloading and verifying the portable Go compiler...'
        if (!(Test-Path -LiteralPath $archive) -or (Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash.ToLowerInvariant() -ne $goHash) {
            & curl.exe --fail --location --silent --show-error --max-time 300 "https://go.dev/dl/$goVersion.windows-amd64.zip" --output $archive
            if ($LASTEXITCODE -ne 0) { throw 'Go download failed.' }
        }
        if ((Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash.ToLowerInvariant() -ne $goHash) { throw 'Go archive checksum mismatch.' }
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zip = [System.IO.Compression.ZipFile]::OpenRead($archive)
        try {
            foreach ($entry in $zip.Entries) {
                $target = [IO.Path]::GetFullPath((Join-Path $runtimeDir $entry.FullName))
                if (!$target.StartsWith($runtimeDir + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid archive path.' }
                if ($entry.Name) {
                    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null
                    [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $true)
                } else { [IO.Directory]::CreateDirectory($target) | Out-Null }
            }
        } finally { $zip.Dispose() }
        $goVersion | Set-Content -LiteralPath $goReady
    }
    if (!(Test-Path -LiteralPath $binary)) {
        Write-Host "Building MinIO from official source revision $revision..."
        $buildRoot = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) ('shop-minio-build-' + [guid]::NewGuid().ToString('N'))))
        New-Item -ItemType Directory -Path $buildRoot | Out-Null
        $previousEnv = @{}
        foreach ($key in @('GOBIN', 'GOPATH', 'GOCACHE', 'CGO_ENABLED', 'GOTOOLCHAIN', 'GOMAXPROCS')) {
            $previousEnv[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
        }
        try {
            $env:GOBIN = Join-Path $runtimeDir 'bin'
            $env:GOPATH = Join-Path $buildRoot 'modules'
            $env:GOCACHE = Join-Path $buildRoot 'cache'
            $env:CGO_ENABLED = '0'
            $env:GOTOOLCHAIN = 'local'
            $env:GOMAXPROCS = '4'
            & $goBinary install "github.com/minio/minio@$revision"
            if ($LASTEXITCODE -ne 0) { throw 'MinIO build failed.' }
        } finally {
            foreach ($key in $previousEnv.Keys) {
                [Environment]::SetEnvironmentVariable($key, $previousEnv[$key], 'Process')
            }
            $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
            if (!$buildRoot.StartsWith($tempRoot + '\', [StringComparison]::OrdinalIgnoreCase) -or
                [IO.Path]::GetFileName($buildRoot) -notmatch '^shop-minio-build-[a-f0-9]{32}$') {
                throw 'Invalid build cleanup path.'
            }
            if (Test-Path -LiteralPath $buildRoot) {
                try { Remove-Item -LiteralPath ('\\?\' + $buildRoot) -Recurse -Force }
                catch { Write-Warning "Temporary build files need cleanup: $buildRoot" }
            }
        }
    }
    if (!(Test-Path -LiteralPath $credentialsFile)) {
        $randomBytes = New-Object byte[] 32
        $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        $random.GetBytes($randomBytes)
        $random.Dispose()
        @{ MINIO_ROOT_USER = 'shopadmin'; MINIO_ROOT_PASSWORD = [Convert]::ToBase64String($randomBytes) } | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath $credentialsFile
    }
    & $binary --version
    Write-Host "Installed. Local credentials: $credentialsFile"
    exit
}

if ($Action -eq 'stop') {
    $process = Get-MinIOProcess
    if ($process) { Stop-Process -Id $process.Id; Write-Host 'MinIO stopped. Data preserved.' }
    else { Write-Host 'MinIO is not running.' }
    exit
}

if ($Action -eq 'start') {
    if (Get-MinIOProcess) { Write-Host 'MinIO is already running.'; exit }
    if (!(Test-Path -LiteralPath $binary) -or !(Test-Path -LiteralPath $credentialsFile)) { throw 'Run npm.cmd run minio:install first.' }
    if (!$DataDirectory -and (Test-Path -LiteralPath $storageFile)) {
        $DataDirectory = (Get-Content -Raw -LiteralPath $storageFile | ConvertFrom-Json).dataDirectory
    }
    if (!$DataDirectory) { $DataDirectory = Join-Path $runtimeDir 'data' }
    $DataDirectory = [IO.Path]::GetFullPath($DataDirectory)
    New-Item -ItemType Directory -Force -Path $DataDirectory | Out-Null
    foreach ($port in @(9000, 9001)) {
        if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) { throw "Port $port is already in use." }
    }
    $credentials = Get-Content -Raw -LiteralPath $credentialsFile | ConvertFrom-Json
    $env:MINIO_ROOT_USER = $credentials.MINIO_ROOT_USER
    $env:MINIO_ROOT_PASSWORD = $credentials.MINIO_ROOT_PASSWORD
    $env:MINIO_BROWSER_REDIRECT_URL = 'http://localhost:9001'
    try {
        $process = Start-Process -FilePath $binary -ArgumentList @('server', ('"' + $DataDirectory + '"'), '--address', '127.0.0.1:9000', '--console-address', '127.0.0.1:9001') -WorkingDirectory $projectDir -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeDir 'stdout.log') -RedirectStandardError (Join-Path $runtimeDir 'stderr.log')
        $process.Id | Set-Content -LiteralPath $pidFile
    } finally {
        Remove-Item Env:\MINIO_ROOT_USER, Env:\MINIO_ROOT_PASSWORD -ErrorAction SilentlyContinue
    }
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        try {
            $health = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:9000/minio/health/ready' -TimeoutSec 2
            if ($health.StatusCode -eq 200) {
                @{ dataDirectory = $DataDirectory } | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath $storageFile
                Write-Host 'MinIO ready. API: http://localhost:9000 | Console: http://localhost:9001'
                Write-Host "Image data: $DataDirectory"
                exit
            }
        } catch { Start-Sleep -Seconds 1 }
        if (!(Get-MinIOProcess)) { throw 'MinIO exited. Check .minio/stderr.log.' }
    }
    throw 'MinIO did not become ready. Check .minio/stderr.log.'
}

if (Get-MinIOProcess) {
    $health = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:9000/minio/health/ready' -TimeoutSec 3
    Write-Host "MinIO running. Health: $($health.StatusCode). Console: http://localhost:9001"
} else { Write-Host 'MinIO is not running.' }
