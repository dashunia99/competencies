[CmdletBinding()]
param(
    [string]$OutputDirectory = "backups"
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

$postgresId = docker compose ps -q postgres
Assert-LastExitCode "Checking the PostgreSQL container"
$minioId = docker compose ps -q minio
Assert-LastExitCode "Checking the MinIO container"

if (-not $postgresId -or -not $minioId) {
    throw "PostgreSQL and MinIO must be running before a backup can be created."
}

$outputRoot = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputDirectory))
[System.IO.Directory]::CreateDirectory($outputRoot) | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$stagingPath = Join-Path $outputRoot "backup-$timestamp"
$archivePath = Join-Path $outputRoot "competencies-backup-$timestamp.zip"
$objectsPath = Join-Path $stagingPath "objects"

[System.IO.Directory]::CreateDirectory($objectsPath) | Out-Null

$apiWasRunning = -not [string]::IsNullOrWhiteSpace((docker compose ps -q api))
Assert-LastExitCode "Checking the API container"

try {
    if ($apiWasRunning) {
        docker compose stop api
        Assert-LastExitCode "Stopping the API container"
    }

    docker compose exec -T postgres sh -c 'rm -f /tmp/competencies.dump && pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --format=custom --no-owner --no-privileges --file=/tmp/competencies.dump'
    Assert-LastExitCode "Creating the PostgreSQL dump"

    docker compose cp postgres:/tmp/competencies.dump (Join-Path $stagingPath "database.dump")
    Assert-LastExitCode "Copying the PostgreSQL dump"

    docker compose run --rm --no-deps --volume "${objectsPath}:/backup" --entrypoint /bin/sh minio-init -c 'mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" && mc mirror --overwrite "local/$S3_BUCKET_NAME" /backup'
    Assert-LastExitCode "Exporting MinIO objects"

    $manifest = [ordered]@{
        format_version = 1
        created_at_utc = (Get-Date).ToUniversalTime().ToString("o")
        database_file = "database.dump"
        objects_directory = "objects"
    }
    $manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $stagingPath "backup-info.json") -Encoding UTF8

    Compress-Archive -Path (Join-Path $stagingPath "*") -DestinationPath $archivePath -CompressionLevel Optimal
    Write-Host "Backup created: $archivePath"
}
finally {
    if ($apiWasRunning) {
        docker compose start api | Out-Null
    }

    $resolvedStaging = [System.IO.Path]::GetFullPath($stagingPath)
    if ($resolvedStaging.StartsWith($outputRoot + [System.IO.Path]::DirectorySeparatorChar)) {
        Remove-Item -LiteralPath $resolvedStaging -Recurse -Force -ErrorAction SilentlyContinue
    }
}
