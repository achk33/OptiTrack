#!/bin/bash

# Database Backup Script for OptiTrack
# Usage: ./backup.sh

# Load environment variables
source ../.env

# Extract database connection details
DB_URL=$DATABASE_URL

# Create backup directory if it doesn't exist
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/optitrack_backup_$TIMESTAMP.sql"

# Perform backup
echo "Starting database backup..."
pg_dump $DB_URL > $BACKUP_FILE

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "✅ Backup completed successfully: $BACKUP_FILE"
    
    # Compress the backup
    gzip $BACKUP_FILE
    echo "✅ Backup compressed: $BACKUP_FILE.gz"
    
    # Keep only last 7 days of backups
    find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
    echo "✅ Old backups cleaned up (kept last 7 days)"
else
    echo "❌ Backup failed!"
    exit 1
fi
