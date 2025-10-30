# Database Backup Script for OptiTrack (Windows)
# Usage: .\backup.ps1

# Load environment variables
Get-Content ..\.env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1]
        $value = $matches[2]
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
}

# Get database URL
$DB_URL = $env:DATABASE_URL

# Create backup directory if it doesn't exist
$BACKUP_DIR = ".\backups"
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

# Generate backup filename with timestamp
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "$BACKUP_DIR\optitrack_backup_$TIMESTAMP.sql"

# Perform backup
Write-Host "Starting database backup..." -ForegroundColor Yellow
pg_dump $DB_URL | Out-File -FilePath $BACKUP_FILE -Encoding UTF8

# Check if backup was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup completed successfully: $BACKUP_FILE" -ForegroundColor Green
    
    # Compress the backup
    Compress-Archive -Path $BACKUP_FILE -DestinationPath "$BACKUP_FILE.zip" -Force
    Remove-Item $BACKUP_FILE
    Write-Host "✅ Backup compressed: $BACKUP_FILE.zip" -ForegroundColor Green
    
    # Keep only last 7 days of backups
    Get-ChildItem $BACKUP_DIR -Filter "*.zip" | 
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | 
        Remove-Item
    Write-Host "✅ Old backups cleaned up (kept last 7 days)" -ForegroundColor Green
} else {
    Write-Host "❌ Backup failed!" -ForegroundColor Red
    exit 1
}
