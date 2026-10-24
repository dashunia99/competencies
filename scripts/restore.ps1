[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupPath
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Assert-LastExitCode {
    param([string]$Operation)

    if ($LASTEXITCODE -ne 0) {
        throw "$Operation failed with exit code $LASTEXITCODE."
    }
}

if (-not (Test-Path -LiteralPath ".env")) {
    throw "Missing .env. Copy .env.example to .env and configure it first."
}

$resolvedBackup = (Resolve-Path -LiteralPath $BackupPath).Path
if ([System.IO.Path]::GetExtension($resolvedBackup) -ne ".zip") {
    throw "Backup must be a ZIP archive created by scripts/backup.ps1."
}

$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("competencies-restore-" + [guid]::NewGuid().ToString("N"))
[System.IO.Directory]::CreateDirectory($temporaryRoot) | Out-Null

try {
    Expand-Archive -LiteralPath $resolvedBackup -DestinationPath $temporaryRoot

    $databaseDump = Join-Path $temporaryRoot "database.dump"
    $objectsPath = Join-Path $temporaryRoot "objects"
    $manifestPath = Join-Path $temporaryRoot "backup-info.json"

    if (-not (Test-Path -LiteralPath $databaseDump -PathType Leaf)) {
        throw "The archive does not contain database.dump."
    }
    if (-not (Test-Path -LiteralPath $objectsPath -PathType Container)) {
        throw "The archive does not contain the objects directory."
    }
    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        throw "The archive does not contain backup-info.json."
    }

    docker compose up -d postgres minio
    Assert-LastExitCode "Starting PostgreSQL and MinIO"

    $databaseReady = $false
    for ($attempt = 1; $attempt -le 60; $attempt++) {
        docker compose exec -T postgres sh -c 'pg_isready --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' *> $null
        if ($LASTEXITCODE -eq 0) {
            $databaseReady = $true
            break
        }
        Start-Sleep -Seconds 2
    }
    if (-not $databaseReady) {
        throw "PostgreSQL did not become ready in time."
    }

    docker compose run --rm minio-init
    Assert-LastExitCode "Creating the MinIO bucket"

    docker compose stop api 2>$null | Out-Null

    docker compose cp $databaseDump postgres:/tmp/competencies.dump
    Assert-LastExitCode "Copying the PostgreSQL dump"

    docker compose exec -T postgres sh -c 'pg_restore --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges --exit-on-error /tmp/competencies.dump'
    Assert-LastExitCode "Restoring PostgreSQL"

    docker compose run --rm --no-deps --volume "${objectsPath}:/backup:ro" --entrypoint /bin/sh minio-init -c 'mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" && mc mirror --overwrite /backup "local/$S3_BUCKET_NAME"'
    Assert-LastExitCode "Restoring MinIO objects"

    docker compose up -d --build api
    Assert-LastExitCode "Starting the API container"

    Write-Host "Backup restored successfully."
    Write-Host "API: http://localhost:8000"
}
finally {
    $resolvedTemporaryRoot = [System.IO.Path]::GetFullPath($temporaryRoot)
    $systemTemporaryRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if ($resolvedTemporaryRoot.StartsWith($systemTemporaryRoot)) {
        Remove-Item -LiteralPath $resolvedTemporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
