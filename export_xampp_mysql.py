#!/usr/bin/env python3
"""
Export CSV to MySQL database using XAMPP configuration
"""

import mysql.connector
import pandas as pd
import sys
import os

def export_to_mysql_xampp():
    """Export to MySQL using XAMPP default settings"""
    
    # XAMPP default settings
    config = {
        'host': 'localhost',
        'user': 'root',
        'password': '',  # XAMPP default is empty password
        'port': 3306,
        'charset': 'utf8mb4',
        'collation': 'utf8mb4_unicode_ci'
    }
    
    print("🚀 Exporting to MySQL (XAMPP)")
    print("=" * 40)
    print("Using XAMPP default settings:")
    print(f"Host: {config['host']}")
    print(f"User: {config['user']}")
    print(f"Password: {'(empty)' if not config['password'] else '***'}")
    
    try:
        # Test connection first
        print("\n🔗 Testing MySQL connection...")
        connection = mysql.connector.connect(**config)
        cursor = connection.cursor()
        
        # Create database
        print("📋 Creating database 'medatixx'...")
        cursor.execute("DROP DATABASE IF EXISTS medatixx")
        cursor.execute("CREATE DATABASE medatixx CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        cursor.execute("USE medatixx")
        print("✅ Database created successfully")
        
        # Read CSV file
        print("\n📖 Reading CSV file...")
        csv_file = "feldbeschreibungen.csv"
        
        if not os.path.exists(csv_file):
            print(f"❌ CSV file not found: {csv_file}")
            return False
        
        # Try different encodings
        df = None
        encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
        
        for encoding in encodings:
            try:
                df = pd.read_csv(csv_file, delimiter=';', encoding=encoding)
                print(f"✅ CSV read successfully with {encoding} encoding")
                print(f"📊 Found {len(df)} records with {len(df.columns)} columns")
                break
            except UnicodeDecodeError:
                continue
        
        if df is None:
            print("❌ Could not read CSV file with any encoding")
            return False
        
        # Create table
        print("\n🔧 Creating table structure...")
        
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
        
        cursor.execute(create_table_sql)
        print("✅ Table 'feldbeschreibungen' created")
        
        # Insert data
        print("\n💾 Importing data...")
        
        # Prepare insert statement
        columns = df.columns.tolist()
        placeholders = ', '.join(['%s'] * len(columns))
        insert_sql = f"INSERT INTO feldbeschreibungen ({', '.join(columns)}) VALUES ({placeholders})"
        
        success_count = 0
        error_count = 0
        
        for index, row in df.iterrows():
            try:
                # Convert row to tuple, handling NaN values
                values = []
                for value in row:
                    if pd.isna(value):
                        values.append(None)
                    else:
                        values.append(value)
                
                cursor.execute(insert_sql, tuple(values))
                success_count += 1
                
                if success_count % 50 == 0:
                    print(f"   📝 Imported {success_count} records...")
                    
            except Exception as e:
                error_count += 1
                if error_count <= 5:  # Only show first 5 errors
                    print(f"⚠️  Error on row {index}: {e}")
        
        connection.commit()
        print(f"✅ Data import completed: {success_count} successful, {error_count} errors")
        
        # Create indexes
        print("\n🔍 Creating indexes...")
        indexes = [
            "CREATE INDEX idx_nummer ON feldbeschreibungen(Nummer)",
            "CREATE INDEX idx_suchwort ON feldbeschreibungen(Suchwort)",
            "CREATE INDEX idx_kategorie ON feldbeschreibungen(Kategorie)",
            "CREATE INDEX idx_satzart ON feldbeschreibungen(Satzart)"
        ]
        
        for index_sql in indexes:
            try:
                cursor.execute(index_sql)
                print(f"   ✅ Index created")
            except mysql.connector.Error as e:
                print(f"   ⚠️  Index creation warning: {e}")
        
        # Verify import
        cursor.execute("SELECT COUNT(*) FROM feldbeschreibungen")
        final_count = cursor.fetchone()[0]
        print(f"\n📊 Verification: {final_count} records in database")
        
        # Show sample data
        cursor.execute("SELECT Nummer, Suchwort, Kategorie, KategorieLangtext FROM feldbeschreibungen LIMIT 5")
        print("\n📋 Sample records:")
        print("Nummer | Suchwort | Kategorie | KategorieLangtext")
        print("-" * 70)
        for row in cursor.fetchall():
            print(f"{row[0]:<6} | {row[1]:<12} | {row[2]:<9} | {row[3]}")
        
        cursor.close()
        connection.close()
        
        print("\n" + "=" * 50)
        print("🎉 Export completed successfully!")
        print("Database: medatixx")
        print("Table: feldbeschreibungen")
        print("Host: localhost (XAMPP)")
        print("Access via: http://localhost/phpmyadmin")
        print("\nExample queries:")
        print("SELECT * FROM medatixx.feldbeschreibungen LIMIT 10;")
        print("SELECT Kategorie, COUNT(*) FROM medatixx.feldbeschreibungen GROUP BY Kategorie;")
        
        return True
        
    except mysql.connector.Error as error:
        print(f"❌ MySQL Error: {error}")
        print("\n💡 Troubleshooting:")
        print("1. Make sure XAMPP is started")
        print("2. Start MySQL service in XAMPP Control Panel")
        print("3. Check if port 3306 is available")
        return False
    
    except Exception as error:
        print(f"❌ Error: {error}")
        return False

if __name__ == "__main__":
    export_to_mysql_xampp()