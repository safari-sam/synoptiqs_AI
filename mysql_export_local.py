#!/usr/bin/env python3
"""
Export CSV data to local MySQL database 'medatixx'
"""

import mysql.connector
import pandas as pd
import sys
from datetime import datetime

def export_to_mysql():
    """Export CSV to MySQL database"""
    print("🐬 Exporting to MySQL database 'medatixx'")
    
    try:
        # Get MySQL credentials - simplified
        print("Enter MySQL connection details:")
        host = "localhost"  # Default to localhost
        user = "root"       # Default to root
        password = input("Enter MySQL root password: ")
        
        if not password:
            print("❌ Password is required")
            return False
        
        print(f"🔗 Connecting to MySQL at {host} as {user}...")
        
        # Connect to MySQL
        connection = mysql.connector.connect(
            host=host,
            user=user,
            password=password,
            charset='utf8mb4'
        )
        cursor = connection.cursor()
        
        print("✅ Connected to MySQL")
        
        # Create database
        print("📊 Creating database 'medatixx'...")
        cursor.execute("DROP DATABASE IF EXISTS medatixx")
        cursor.execute("CREATE DATABASE medatixx CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        cursor.execute("USE medatixx")
        
        # Read CSV file
        print("📖 Reading CSV file...")
        try:
            # Try different encodings
            for encoding in ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']:
                try:
                    df = pd.read_csv('feldbeschreibungen.csv', 
                                   delimiter=';', 
                                   encoding=encoding)
                    print(f"✅ CSV read successfully with {encoding} encoding")
                    break
                except UnicodeDecodeError:
                    continue
            else:
                print("❌ Could not read CSV file")
                return False
        except FileNotFoundError:
            print("❌ feldbeschreibungen.csv not found")
            return False
        
        print(f"📊 Found {len(df)} records with {len(df.columns)} columns")
        
        # Create table
        print("🏗️ Creating table...")
        create_table_sql = """
        CREATE TABLE feldbeschreibungen (
            id INT AUTO_INCREMENT PRIMARY KEY,
            Nummer INT,
            Suchwort VARCHAR(200),
            Satzart VARCHAR(50),
            Kategorie VARCHAR(50),
            SymbolNummer INT,
            KategorieLangtext VARCHAR(500),
            ProgrammName VARCHAR(200),
            FixedFont TINYINT,
            Format TEXT,
            Maske TEXT,
            ZielTabelle VARCHAR(200),
            ZielSatzart VARCHAR(50),
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
            Befehl TEXT,
            DateiAenderbar TINYINT,
            Gruppe INT,
            FreigabeStatus INT,
            GruppeEmpfang INT,
            Basisdokumentation INT,
            CodeSatzart VARCHAR(50),
            FreigabeListeVerwenden TINYINT,
            HintergrundFarbe BIGINT,
            FreigabeListeStatus INT,
            ScheinBezug INT,
            ScheinBezugAenderbar TINYINT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
        
        cursor.execute(create_table_sql)
        print("✅ Table 'feldbeschreibungen' created")
        
        # Insert data
        print("💾 Inserting data...")
        
        # Prepare column list (excluding auto-increment id)
        columns = list(df.columns)
        placeholders = ', '.join(['%s'] * len(columns))
        column_names = ', '.join(columns)
        
        insert_sql = f"INSERT INTO feldbeschreibungen ({column_names}) VALUES ({placeholders})"
        
        # Convert data and insert
        success_count = 0
        error_count = 0
        
        for index, row in df.iterrows():
            try:
                # Convert row to list and handle None values
                values = []
                for value in row:
                    if pd.isna(value) or value == '':
                        values.append(None)
                    elif isinstance(value, str) and value.strip() == '':
                        values.append(None)
                    else:
                        values.append(value)
                
                cursor.execute(insert_sql, values)
                success_count += 1
                
                if success_count % 50 == 0:
                    print(f"   Inserted {success_count} records...")
                
            except Exception as e:
                error_count += 1
                print(f"⚠️ Error inserting row {index + 1}: {e}")
        
        # Commit the transaction
        connection.commit()
        print(f"✅ Data insertion completed: {success_count} successful, {error_count} errors")
        
        # Create indexes
        print("🔍 Creating indexes...")
        indexes = [
            "CREATE INDEX idx_nummer ON feldbeschreibungen(Nummer)",
            "CREATE INDEX idx_suchwort ON feldbeschreibungen(Suchwort)",
            "CREATE INDEX idx_kategorie ON feldbeschreibungen(Kategorie)",
            "CREATE INDEX idx_satzart ON feldbeschreibungen(Satzart)"
        ]
        
        for index_sql in indexes:
            try:
                cursor.execute(index_sql)
                print(f"   Created index: {index_sql.split()[2]}")
            except Exception as e:
                print(f"⚠️ Error creating index: {e}")
        
        # Verify the import
        cursor.execute("SELECT COUNT(*) FROM feldbeschreibungen")
        count = cursor.fetchone()[0]
        print(f"📊 Verification: {count} records in database")
        
        # Show sample data
        cursor.execute("SELECT Nummer, Suchwort, Kategorie, KategorieLangtext FROM feldbeschreibungen LIMIT 5")
        print("\n📋 Sample records:")
        print("Nummer | Suchwort | Kategorie | KategorieLangtext")
        print("-" * 80)
        for row in cursor.fetchall():
            print(f"{row[0]} | {row[1]} | {row[2]} | {row[3][:30]}...")
        
        cursor.close()
        connection.close()
        
        print(f"\n🎉 Export completed successfully!")
        print(f"Database: medatixx")
        print(f"Host: {host}")
        print(f"User: {user}")
        print(f"Table: feldbeschreibungen")
        print(f"Records: {count}")
        
        return True
        
    except mysql.connector.Error as error:
        print(f"❌ MySQL Error: {error}")
        return False
    except Exception as error:
        print(f"❌ Error: {error}")
        return False

def main():
    print("🚀 MySQL Export Tool for Medatixx Database")
    print("=" * 60)
    
    # Check if CSV file exists
    import os
    if not os.path.exists('feldbeschreibungen.csv'):
        print("❌ feldbeschreibungen.csv not found in current directory")
        return False
    
    print("✅ CSV file found")
    
    # Check pandas
    try:
        import pandas
        print("✅ pandas library available")
    except ImportError:
        print("❌ pandas library not found. Installing...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pandas"])
        import pandas
    
    # Run export
    success = export_to_mysql()
    
    if success:
        print("\n🎉 Your data is now available in MySQL!")
        print("You can connect using:")
        print("mysql -u root -p")
        print("USE medatixx;")
        print("SELECT * FROM feldbeschreibungen LIMIT 10;")
    
    return success

if __name__ == "__main__":
    main()