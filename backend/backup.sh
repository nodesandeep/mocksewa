#!/bin/bash
# ============================================================
# MockSewa Automated Database Backup Script
# Run daily via cron: 0 2 * * * /app/backup.sh
# ============================================================

BACKUP_DIR="/app/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_PATH="/app/mocksewa.db"
POSTGRES_URL="${DATABASE_URL:-}"
KEEP_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[$TIMESTAMP] Starting MockSewa backup..."

# ─── SQLite Backup ──────────────────────────────────────────
if [ -f "$DB_PATH" ]; then
    SQLITE_BACKUP="$BACKUP_DIR/mocksewa_sqlite_${TIMESTAMP}.db"
    cp "$DB_PATH" "$SQLITE_BACKUP"
    gzip "$SQLITE_BACKUP"
    echo "  ✅ SQLite backed up → ${SQLITE_BACKUP}.gz"
fi

# ─── PostgreSQL Backup ──────────────────────────────────────
if [ -n "$POSTGRES_URL" ]; then
    PG_BACKUP="$BACKUP_DIR/mocksewa_pg_${TIMESTAMP}.sql"
    pg_dump "$POSTGRES_URL" > "$PG_BACKUP"
    gzip "$PG_BACKUP"
    echo "  ✅ PostgreSQL backed up → ${PG_BACKUP}.gz"
fi

# ─── Prune old backups ──────────────────────────────────────
find "$BACKUP_DIR" -name "*.gz" -mtime +$KEEP_DAYS -delete
echo "  🗑️  Pruned backups older than $KEEP_DAYS days"

echo "[$TIMESTAMP] Backup complete."
