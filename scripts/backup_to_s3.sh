#!/bin/bash

# Configuration
# Usage: ./backup_to_s3.sh <S3_BUCKET_NAME>
BUCKET_NAME=$1
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
DB_FILE="./data/rss.db"
BACKUP_FILE="$BACKUP_DIR/rss_backup_$TIMESTAMP.db"

if [ -z "$BUCKET_NAME" ]; then
    echo "Usage: $0 <S3_BUCKET_NAME>"
    exit 1
fi

# Create backup directory
mkdir -p $BACKUP_DIR

# SQLITE BACKUP
# Use sqlite3 .backup command for safe hot backup
echo "Creating backup of $DB_FILE..."
sqlite3 $DB_FILE ".backup '$BACKUP_FILE'"

# Compress
echo "Compressing..."
gzip $BACKUP_FILE
ZIPPED_FILE="$BACKUP_FILE.gz"

# Upload to S3
echo "Uploading to s3://$BUCKET_NAME/..."
aws s3 cp $ZIPPED_FILE s3://$BUCKET_NAME/backups/

# Cleanup local backup
rm $ZIPPED_FILE
echo "Backup complete: $ZIPPED_FILE uploaded."
