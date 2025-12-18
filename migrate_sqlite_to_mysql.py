"""
SQLite to MySQL Migration Script
Migrates data from ehr.db (SQLite) to ehr_app (MySQL)
"""
import sqlite3
import mysql.connector
from mysql.connector import Error
import json
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('AI_patient_summary/.env')

# Configuration
SQLITE_DB_PATH = 'ehr-backend/server/data/ehr.db'
MYSQL_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'ehr_app')
}

def connect_sqlite():
    """Connect to SQLite database"""
    try:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        print(f"✅ Connected to SQLite: {SQLITE_DB_PATH}")
        return conn
    except sqlite3.Error as e:
        print(f"❌ SQLite connection error: {e}")
        return None

def connect_mysql():
    """Connect to MySQL database"""
    try:
        conn = mysql.connector.connect(**MYSQL_CONFIG)
        print(f"✅ Connected to MySQL: {MYSQL_CONFIG['database']}")
        return conn
    except Error as e:
        print(f"❌ MySQL connection error: {e}")
        return None

def get_sqlite_tables(sqlite_conn):
    """Get list of tables from SQLite database"""
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [row[0] for row in cursor.fetchall()]
    return tables

def migrate_table(table_name, sqlite_conn, mysql_conn):
    """Migrate a single table from SQLite to MySQL"""
    try:
        sqlite_cursor = sqlite_conn.cursor()
        mysql_cursor = mysql_conn.cursor()
        
        # Get all data from SQLite
        sqlite_cursor.execute(f"SELECT * FROM {table_name}")
        rows = sqlite_cursor.fetchall()
        
        if not rows:
            print(f"  ⚠️  No data in {table_name}")
            return 0
        
        # Get column names
        columns = [description[0] for description in sqlite_cursor.description]
        
        # Check if table exists in MySQL
        mysql_cursor.execute(f"SHOW TABLES LIKE '{table_name}'")
        if not mysql_cursor.fetchone():
            print(f"  ⚠️  Table {table_name} doesn't exist in MySQL, skipping...")
            return 0
        
        # Prepare INSERT statement
        placeholders = ', '.join(['%s'] * len(columns))
        column_names = ', '.join([f"`{col}`" for col in columns])
        insert_query = f"INSERT INTO {table_name} ({column_names}) VALUES ({placeholders})"
        
        # Insert data
        inserted_count = 0
        skipped_count = 0
        
        for row in rows:
            try:
                # Convert Row object to list
                row_data = list(row)
                
                # Handle JSON fields - they might be stored as strings in SQLite
                for i, value in enumerate(row_data):
                    if isinstance(value, str) and (value.startswith('[') or value.startswith('{')):
                        try:
                            # Validate JSON
                            json.loads(value)
                        except:
                            pass
                
                mysql_cursor.execute(insert_query, row_data)
                inserted_count += 1
            except Error as e:
                if e.errno == 1062:  # Duplicate entry
                    skipped_count += 1
                else:
                    print(f"    ⚠️  Error inserting row: {e}")
                    skipped_count += 1
        
        mysql_conn.commit()
        print(f"  ✅ {table_name}: {inserted_count} rows inserted, {skipped_count} skipped")
        return inserted_count
        
    except Exception as e:
        print(f"  ❌ Error migrating {table_name}: {e}")
        return 0

def main():
    print("=" * 60)
    print("🔄 SQLite to MySQL Migration")
    print("=" * 60)
    print()
    
    # Connect to databases
    sqlite_conn = connect_sqlite()
    if not sqlite_conn:
        return
    
    mysql_conn = connect_mysql()
    if not mysql_conn:
        sqlite_conn.close()
        return
    
    print()
    print("📊 Starting migration...")
    print()
    
    # Get tables from SQLite
    tables = get_sqlite_tables(sqlite_conn)
    print(f"Found {len(tables)} tables in SQLite: {', '.join(tables)}")
    print()
    
    # Migration order (respecting foreign key constraints)
    migration_order = [
        'doctors',
        'lab_users',
        'patients',
        'visits',
        'pharmacy_items',
        'lab_tests',
        'radiology_tests',
        'prescriptions',
        'lab_orders',
        'radiology_orders'
    ]
    
    total_migrated = 0
    
    for table in migration_order:
        if table in tables:
            print(f"Migrating {table}...")
            count = migrate_table(table, sqlite_conn, mysql_conn)
            total_migrated += count
        else:
            print(f"⚠️  Table {table} not found in SQLite")
    
    print()
    print("=" * 60)
    print(f"✅ Migration complete! Total rows migrated: {total_migrated}")
    print("=" * 60)
    
    # Close connections
    sqlite_conn.close()
    mysql_conn.close()

if __name__ == "__main__":
    main()
