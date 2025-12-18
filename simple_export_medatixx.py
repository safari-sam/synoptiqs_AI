#!/usr/bin/env python3
"""
Simple CSV to MySQL exporter for feldbeschreibungen.csv
Handles German characters and encoding issues properly
"""

import mysql.connector
import pandas as pd
import sys
from datetime import datetime
import os

# Database configuration - UPDATE THE PASSWORD!
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'yourpassword',  # ⚠️ UPDATE THIS!
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_unicode_ci'
}

def setup_database():
    """Create database and table"""
    try:
        # Connect to MySQL server
        connection = mysql.connector.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'], 
            password=DB_CONFIG['password'],
            charset=DB_CONFIG['charset']
        )
        cursor = connection.cursor()
        
        # Create database
        cursor.execute("DROP DATABASE IF EXISTS medatixx")
        cursor.execute("CREATE DATABASE medatixx CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        cursor.execute("USE medatixx")
        
        # Create table
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
        print("✅ Database 'medatixx' and table 'feldbeschreibungen' created successfully")
        
        cursor.close()
        connection.close()
        return True
        
    except mysql.connector.Error as error:
        print(f"❌ Error setting up database: {error}")
        return False

def import_data():
    """Import CSV data using pandas for better encoding handling"""
    try:
        # Read CSV with proper encoding handling
        print("📖 Reading CSV file...")
        
        # Try different encodings
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
        
        # Connect to database
        config = DB_CONFIG.copy()
        config['database'] = 'medatixx'
        connection = mysql.connector.connect(**config)
        cursor = connection.cursor()
        
        # Insert data
        print("💾 Importing data...")
        
        insert_sql = """
        INSERT INTO feldbeschreibungen (
            Nummer, Suchwort, Satzart, Kategorie, SymbolNummer, KategorieLangtext,
            ProgrammName, FixedFont, Format, Maske, ZielTabelle, ZielSatzart,
            Passwortschutz, Position, Geschuetzt, MeineAuswahl, MandantAnlage,
            UserAnlage, DatumAnlage, MandantGeaendert, UserGeaendert, DatumAenderung,
            Farbe, KBTextFarbig, Befehl, DateiAenderbar, Gruppe, FreigabeStatus,
            GruppeEmpfang, Basisdokumentation, CodeSatzart, FreigabeListeVerwenden,
            HintergrundFarbe, FreigabeListeStatus, ScheinBezug, ScheinBezugAenderbar
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """
        
        success_count = 0
        error_count = 0
        
        for index, row in df.iterrows():
            try:
                # Prepare data tuple
                data = tuple([
                    None if pd.isna(row[col]) or row[col] == '' else row[col] 
                    for col in df.columns
                ])
                
                cursor.execute(insert_sql, data)
                success_count += 1
                
                if success_count % 50 == 0:
                    print(f"   Imported {success_count} records...")
                    
            except Exception as e:
                error_count += 1
                print(f"⚠️  Error importing row {index}: {e}")
        
        connection.commit()
        print(f"✅ Import completed: {success_count} successful, {error_count} errors")
        
        # Create some useful indexes
        print("🔍 Creating indexes...")
        indexes = [
            "CREATE INDEX idx_nummer ON feldbeschreibungen(Nummer)",
            "CREATE INDEX idx_suchwort ON feldbeschreibungen(Suchwort)", 
            "CREATE INDEX idx_kategorie ON feldbeschreibungen(Kategorie)"
        ]
        
        for idx_sql in indexes:
            try:
                cursor.execute(idx_sql)
            except mysql.connector.Error:
                pass  # Index might already exist
        
        cursor.close()
        connection.close()
        return True
        
    except Exception as error:
        print(f"❌ Error importing data: {error}")
        return False

def verify_import():
    """Verify the import was successful"""
    try:
        config = DB_CONFIG.copy()
        config['database'] = 'medatixx'
        connection = mysql.connector.connect(**config)
        cursor = connection.cursor()
        
        # Check record count
        cursor.execute("SELECT COUNT(*) FROM feldbeschreibungen")
        count = cursor.fetchone()[0]
        print(f"📊 Database contains {count} records")
        
        # Show sample data
        cursor.execute("SELECT Nummer, Suchwort, Kategorie, KategorieLangtext FROM feldbeschreibungen LIMIT 5")
        print("\n📋 Sample records:")
        print("Nummer | Suchwort | Kategorie | KategorieLangtext")
        print("-" * 60)
        for row in cursor.fetchall():
            print(f"{row[0]} | {row[1]} | {row[2]} | {row[3]}")
        
        cursor.close()
        connection.close()
        return True
        
    except mysql.connector.Error as error:
        print(f"❌ Error verifying import: {error}")
        return False

def main():
    print("🚀 Medatixx Database Export Tool")
    print("=" * 50)
    
    # Check if pandas is installed
    try:
        import pandas
        print("✅ pandas library available")
    except ImportError:
        print("❌ pandas library not found. Installing...")
        os.system("pip install pandas")
    
    # Check CSV file
    if not os.path.exists('feldbeschreibungen.csv'):
        print("❌ feldbeschreibungen.csv not found in current directory")
        return False
    
    print("✅ CSV file found")
    
    # Setup database
    if not setup_database():
        return False
    
    # Import data
    if not import_data():
        return False
    
    # Verify import
    if not verify_import():
        return False
    
    print("\n" + "=" * 50)
    print("🎉 Export completed successfully!")
    print("\nDatabase Details:")
    print("- Database Name: medatixx")
    print("- Table Name: feldbeschreibungen")
    print("- Character Set: utf8mb4")
    print("- Collation: utf8mb4_unicode_ci")
    print("\nConnection Details:")
    print(f"- Host: {DB_CONFIG['host']}")
    print(f"- User: {DB_CONFIG['user']}")
    print("\nSample Queries:")
    print("SELECT * FROM medatixx.feldbeschreibungen LIMIT 10;")
    print("SELECT Kategorie, COUNT(*) FROM medatixx.feldbeschreibungen GROUP BY Kategorie;")
    
    return True

if __name__ == "__main__":
    if DB_CONFIG['password'] == 'yourpassword':
        print("⚠️  WARNING: Please update the database password in DB_CONFIG!")
        password = input("Enter MySQL root password: ")
        if password:
            DB_CONFIG['password'] = password
        else:
            print("❌ Password required. Exiting.")
            sys.exit(1)
    
    success = main()
    if not success:
        sys.exit(1)