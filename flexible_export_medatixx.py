#!/usr/bin/env python3
"""
Flexible CSV to SQL exporter with multiple database options
Supports SQLite (no setup required) and MySQL
"""

import pandas as pd
import sqlite3
import sys
import os
from datetime import datetime

def export_to_sqlite():
    """Export to SQLite database (no server setup required)"""
    print("📱 Using SQLite database (no server setup required)")
    
    try:
        # Create SQLite database
        db_path = "medatixx.sqlite"
        if os.path.exists(db_path):
            backup_path = f"medatixx_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sqlite"
            os.rename(db_path, backup_path)
            print(f"💾 Existing database backed up as: {backup_path}")
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Read CSV
        print("📖 Reading CSV file...")
        encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
        df = None
        
        for encoding in encodings:
            try:
                df = pd.read_csv('feldbeschreibungen.csv', 
                               delimiter=';', 
                               encoding=encoding,
                               na_values=['', 'NULL'],
                               keep_default_na=False)
                print(f"✅ Successfully read CSV with {encoding} encoding")
                break
            except UnicodeDecodeError:
                continue
        
        if df is None:
            print("❌ Could not read CSV with any encoding")
            return False
        
        print(f"📊 Found {len(df)} records in CSV")
        
        # Clean column names (remove special characters)
        df.columns = [col.replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('ß', 'ss') for col in df.columns]
        
        # Export to SQLite
        print("💾 Exporting to SQLite...")
        df.to_sql('feldbeschreibungen', conn, if_exists='replace', index=False, index_label='id')
        
        # Add indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_nummer ON feldbeschreibungen(Nummer)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_suchwort ON feldbeschreibungen(Suchwort)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_kategorie ON feldbeschreibungen(Kategorie)")
        
        conn.commit()
        
        # Verify
        cursor.execute("SELECT COUNT(*) FROM feldbeschreibungen")
        count = cursor.fetchone()[0]
        print(f"✅ Successfully exported {count} records")
        
        # Show sample
        cursor.execute("SELECT Nummer, Suchwort, Kategorie, KategorieLangtext FROM feldbeschreibungen LIMIT 5")
        print("\n📋 Sample records:")
        print("Nummer | Suchwort | Kategorie | KategorieLangtext")
        print("-" * 60)
        for row in cursor.fetchall():
            print(f"{row[0]} | {row[1]} | {row[2]} | {row[3]}")
        
        conn.close()
        
        print(f"\n🎉 Export completed successfully!")
        print(f"📄 Database file: {os.path.abspath(db_path)}")
        print("\nTo access the data:")
        print(f"sqlite3 {db_path}")
        print("SELECT * FROM feldbeschreibungen LIMIT 10;")
        
        return True
        
    except Exception as error:
        print(f"❌ Error: {error}")
        return False

def export_to_mysql():
    """Export to MySQL database"""
    try:
        import mysql.connector
        
        print("🐬 Using MySQL database")
        
        # Get connection details
        host = input("MySQL Host [localhost]: ").strip() or "localhost"
        user = input("MySQL User [root]: ").strip() or "root"
        password = input("MySQL Password: ")
        
        if not password:
            print("❌ Password is required for MySQL")
            return False
        
        # Test connection
        print("🔗 Testing MySQL connection...")
        connection = mysql.connector.connect(
            host=host,
            user=user,
            password=password,
            charset='utf8mb4'
        )
        
        cursor = connection.cursor()
        
        # Create database
        cursor.execute("DROP DATABASE IF EXISTS medatixx")
        cursor.execute("CREATE DATABASE medatixx CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        cursor.execute("USE medatixx")
        
        print("✅ Database 'medatixx' created")
        
        # Read CSV
        print("📖 Reading CSV file...")
        encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
        df = None
        
        for encoding in encodings:
            try:
                df = pd.read_csv('feldbeschreibungen.csv', 
                               delimiter=';', 
                               encoding=encoding,
                               na_values=['', 'NULL'],
                               keep_default_na=False)
                print(f"✅ Successfully read CSV with {encoding} encoding")
                break
            except UnicodeDecodeError:
                continue
        
        if df is None:
            print("❌ Could not read CSV with any encoding")
            return False
        
        print(f"📊 Found {len(df)} records in CSV")
        
        # Create table structure
        create_table_sql = """
        CREATE TABLE feldbeschreibungen (
            id INT AUTO_INCREMENT PRIMARY KEY,
            Nummer INT,
            Suchwort VARCHAR(100),
            Satzart VARCHAR(20),
            Kategorie VARCHAR(20),
            SymbolNummer INT,
            KategorieLangtext VARCHAR(200),
            ProgrammName VARCHAR(100),
            FixedFont TINYINT,
            Format TEXT,
            Maske TEXT,
            ZielTabelle VARCHAR(100),
            ZielSatzart VARCHAR(20),
            Passwortschutz TINYINT,
            Position INT,
            Geschuetzt TINYINT,
            MeineAuswahl TINYINT,
            MandantAnlage INT,
            UserAnlage INT,
            DatumAnlage DATETIME,
            MandantGeaendert INT,
            UserGeaendert INT,
            DatumAenderung DATETIME,
            Farbe BIGINT,
            KBTextFarbig TINYINT,
            Befehl VARCHAR(255),
            DateiAenderbar TINYINT,
            Gruppe INT,
            FreigabeStatus INT,
            GruppeEmpfang INT,
            Basisdokumentation INT,
            CodeSatzart VARCHAR(20),
            FreigabeListeVerwenden TINYINT,
            HintergrundFarbe BIGINT,
            FreigabeListeStatus INT,
            ScheinBezug INT,
            ScheinBezugAenderbar TINYINT,
            imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
        
        cursor.execute(create_table_sql)
        print("✅ Table created")
        
        # Insert data
        print("💾 Importing data...")
        placeholders = ', '.join(['%s'] * len(df.columns))
        insert_sql = f"INSERT INTO feldbeschreibungen ({', '.join(df.columns)}) VALUES ({placeholders})"
        
        success_count = 0
        for index, row in df.iterrows():
            try:
                cursor.execute(insert_sql, tuple(row))
                success_count += 1
                if success_count % 50 == 0:
                    print(f"   Imported {success_count} records...")
            except Exception as e:
                print(f"⚠️  Error importing row {index}: {e}")
        
        connection.commit()
        
        # Create indexes
        indexes = [
            "CREATE INDEX idx_nummer ON feldbeschreibungen(Nummer)",
            "CREATE INDEX idx_suchwort ON feldbeschreibungen(Suchwort)",
            "CREATE INDEX idx_kategorie ON feldbeschreibungen(Kategorie)"
        ]
        
        for idx_sql in indexes:
            try:
                cursor.execute(idx_sql)
            except mysql.connector.Error:
                pass
        
        print(f"✅ Successfully imported {success_count} records")
        
        # Verify
        cursor.execute("SELECT COUNT(*) FROM feldbeschreibungen")
        count = cursor.fetchone()[0]
        print(f"📊 Database contains {count} records")
        
        connection.close()
        
        print("\n🎉 Export completed successfully!")
        print("Database: medatixx (MySQL)")
        print("Table: feldbeschreibungen")
        print("\nConnection details:")
        print(f"Host: {host}")
        print(f"User: {user}")
        
        return True
        
    except ImportError:
        print("❌ mysql-connector-python not installed")
        print("Run: pip install mysql-connector-python")
        return False
    except Exception as error:
        print(f"❌ Error: {error}")
        return False

def main():
    print("🚀 Medatixx Database Export Tool")
    print("=" * 50)
    
    # Check CSV file
    if not os.path.exists('feldbeschreibungen.csv'):
        print("❌ feldbeschreibungen.csv not found in current directory")
        return False
    
    print("✅ CSV file found")
    
    # Choose database type
    print("\nChoose database type:")
    print("1. SQLite (No setup required, file-based)")
    print("2. MySQL (Requires MySQL server)")
    
    choice = input("Enter your choice (1 or 2) [1]: ").strip() or "1"
    
    if choice == "1":
        return export_to_sqlite()
    elif choice == "2":
        return export_to_mysql()
    else:
        print("❌ Invalid choice")
        return False

if __name__ == "__main__":
    try:
        import pandas
        print("✅ pandas library available")
    except ImportError:
        print("❌ pandas library not found. Installing...")
        os.system("pip install pandas")
        import pandas
    
    success = main()
    if success:
        print("\n🎉 Database export completed successfully!")
    else:
        print("\n❌ Database export failed")
        sys.exit(1)