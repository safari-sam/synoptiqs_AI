#!/usr/bin/env python3
"""
MySQL Export Script for medatixx database
Direct MySQL export with interactive password input
"""

import mysql.connector
import pandas as pd
import sys
import os
from datetime import datetime

def export_to_mysql():
    """Export CSV data to MySQL database"""
    print("🐬 Medatixx MySQL Export Tool")
    print("=" * 50)
    
    # Get connection details
    host = input("MySQL Host [localhost]: ").strip() or "localhost"
    port = input("MySQL Port [3306]: ").strip() or "3306"
    user = input("MySQL User [root]: ").strip() or "root"
    password = input("MySQL Password: ")
    
    if not password:
        print("❌ Password is required for MySQL")
        return False
    
    try:
        port = int(port)
    except ValueError:
        print("❌ Invalid port number")
        return False
    
    try:
        # Test connection
        print("🔗 Testing MySQL connection...")
        connection = mysql.connector.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            charset='utf8mb4',
            autocommit=True
        )
        
        cursor = connection.cursor()
        print("✅ Connected successfully!")
        
        # Create database
        print("🗄️ Creating database 'medatixx'...")
        cursor.execute("DROP DATABASE IF EXISTS medatixx")
        cursor.execute("CREATE DATABASE medatixx CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        cursor.execute("USE medatixx")
        print("✅ Database 'medatixx' created")
        
        # Read CSV
        print("📖 Reading CSV file...")
        if not os.path.exists('feldbeschreibungen.csv'):
            print("❌ feldbeschreibungen.csv not found!")
            return False
            
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
        print("🏗️ Creating table structure...")
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
            Geschuetz TINYINT,
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
        print("✅ Table 'feldbeschreibungen' created")
        
        # Prepare data for insertion
        print("💾 Importing data...")
        
        # Create column list (excluding auto-increment id)
        columns = list(df.columns)
        placeholders = ', '.join(['%s'] * len(columns))
        column_names = ', '.join([f'`{col}`' for col in columns])
        
        insert_sql = f"INSERT INTO feldbeschreibungen ({column_names}) VALUES ({placeholders})"
        
        success_count = 0
        error_count = 0
        
        # Process data in batches for better performance
        batch_size = 100
        total_rows = len(df)
        
        for start_idx in range(0, total_rows, batch_size):
            end_idx = min(start_idx + batch_size, total_rows)
            batch = df.iloc[start_idx:end_idx]
            
            batch_data = []
            for _, row in batch.iterrows():
                # Convert data types and handle None values
                row_data = []
                for col in columns:
                    value = row[col]
                    if pd.isna(value) or value == '':
                        row_data.append(None)
                    elif col in ['DatumAnlage', 'DatumAenderung']:
                        # Handle datetime fields
                        if str(value).strip() and str(value) != '1899-12-30 00:00:00.000':
                            try:
                                # Remove milliseconds if present
                                date_str = str(value).split('.')[0]
                                parsed_date = pd.to_datetime(date_str)
                                row_data.append(parsed_date)
                            except:
                                row_data.append(None)
                        else:
                            row_data.append(None)
                    else:
                        row_data.append(value)
                
                batch_data.append(tuple(row_data))
            
            try:
                cursor.executemany(insert_sql, batch_data)
                success_count += len(batch_data)
                print(f"   Imported {success_count}/{total_rows} records...")
            except Exception as e:
                error_count += len(batch_data)
                print(f"⚠️  Error importing batch starting at row {start_idx}: {e}")
        
        # Create indexes
        print("🔍 Creating indexes...")
        indexes = [
            "CREATE INDEX idx_nummer ON feldbeschreibungen(Nummer)",
            "CREATE INDEX idx_suchwort ON feldbeschreibungen(Suchwort)",
            "CREATE INDEX idx_kategorie ON feldbeschreibungen(Kategorie)",
            "CREATE INDEX idx_satzart ON feldbeschreibungen(Satzart)"
        ]
        
        for idx_sql in indexes:
            try:
                cursor.execute(idx_sql)
                print(f"✅ Created index: {idx_sql.split()[2]}")
            except mysql.connector.Error as e:
                if "Duplicate key name" not in str(e):
                    print(f"⚠️  Warning creating index: {e}")
        
        # Verify import
        cursor.execute("SELECT COUNT(*) FROM feldbeschreibungen")
        final_count = cursor.fetchone()[0]
        
        print(f"\\n📊 Import Summary:")
        print(f"✅ Successfully imported: {success_count} records")
        print(f"❌ Failed imports: {error_count} records")
        print(f"📈 Final database count: {final_count} records")
        
        # Show sample data
        cursor.execute("SELECT Nummer, Suchwort, Kategorie, KategorieLangtext FROM feldbeschreibungen LIMIT 5")
        results = cursor.fetchall()
        
        print("\\n📋 Sample records:")
        print("Nummer | Suchwort | Kategorie | KategorieLangtext")
        print("-" * 60)
        for row in results:
            print(f"{row[0]} | {row[1]} | {row[2]} | {row[3]}")
        
        connection.close()
        
        print("\\n" + "=" * 50)
        print("🎉 MySQL Export completed successfully!")
        print("\\nDatabase Details:")
        print(f"- Host: {host}:{port}")
        print(f"- Database: medatixx")
        print(f"- Table: feldbeschreibungen")
        print(f"- Records: {final_count}")
        print("\\nConnection String:")
        print(f"mysql://{user}:***@{host}:{port}/medatixx")
        print("\\nSample Queries:")
        print("USE medatixx;")
        print("SELECT * FROM feldbeschreibungen LIMIT 10;")
        print("SELECT Kategorie, COUNT(*) FROM feldbeschreibungen GROUP BY Kategorie;")
        
        return True
        
    except mysql.connector.Error as error:
        if "Access denied" in str(error):
            print("❌ Access denied - Please check your username and password")
        elif "Can't connect" in str(error):
            print("❌ Cannot connect to MySQL server - Please check if MySQL is running")
        else:
            print(f"❌ MySQL Error: {error}")
        return False
    except Exception as error:
        print(f"❌ Unexpected error: {error}")
        return False

def main():
    print("🚀 Starting MySQL export...")
    
    try:
        import mysql.connector
        print("✅ mysql-connector-python available")
    except ImportError:
        print("❌ mysql-connector-python not found")
        print("Installing...")
        os.system("pip install mysql-connector-python")
        import mysql.connector
    
    try:
        import pandas
        print("✅ pandas available")
    except ImportError:
        print("❌ pandas not found")
        print("Installing...")
        os.system("pip install pandas")
        import pandas
    
    success = export_to_mysql()
    
    if success:
        print("\\n🎉 All done! Your data is now in MySQL.")
    else:
        print("\\n❌ Export failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()