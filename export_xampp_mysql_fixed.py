#!/usr/bin/env python3
"""
Export CSV to MySQL database using XAMPP configuration - Fixed column names
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
        'port': 5000,    # Your MySQL port
        'charset': 'utf8mb4',
        'collation': 'utf8mb4_unicode_ci'
    }
    
    print("🚀 Exporting to MySQL (XAMPP) - Fixed Version")
    print("=" * 50)
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
        
        # Clean column names (handle special characters)
        original_columns = df.columns.tolist()
        print(f"\n🔧 Original columns: {original_columns}")
        
        # Create column mapping
        column_mapping = {}
        cleaned_columns = []
        
        for col in original_columns:
            # Replace problematic characters
            cleaned_col = (col.replace('\x9f', 'ue')
                             .replace('\x8a', 'ae') 
                             .replace('\x80', 'ae')
                             .replace('\x9c', 'oe'))
            column_mapping[col] = cleaned_col
            cleaned_columns.append(cleaned_col)
        
        # Rename columns in dataframe
        df.rename(columns=column_mapping, inplace=True)
        print(f"🔧 Cleaned columns: {cleaned_columns}")
        
        # Create dynamic table structure based on actual columns
        print("\n🔧 Creating dynamic table structure...")
        
        # Build CREATE TABLE statement dynamically
        column_definitions = ["id INT AUTO_INCREMENT PRIMARY KEY"]
        
        for col in cleaned_columns:
            if 'Datum' in col:
                column_definitions.append(f"`{col}` DATETIME")
            elif col in ['Nummer', 'SymbolNummer', 'FixedFont', 'Passwortschutz', 'Position', 
                        'Geschuetzt', 'MeineAuswahl', 'MandantAnlage', 'UserAnlage', 'MandantGeaendert',
                        'UserGeaendert', 'Farbe', 'KBTextFarbig', 'DateiAenderbar', 'Gruppe',
                        'FreigabeStatus', 'GruppeEmpfang', 'Basisdokumentation', 'FreigabeListeVerwenden',
                        'HintergrundFarbe', 'FreigabeListeStatus', 'ScheinBezug', 'ScheinBezugAenderbar']:
                column_definitions.append(f"`{col}` INT")
            elif col in ['Satzart', 'ZielSatzart']:
                column_definitions.append(f"`{col}` VARCHAR(20)")
            elif col in ['Kategorie']:
                column_definitions.append(f"`{col}` VARCHAR(10)")
            elif col in ['Suchwort', 'ProgrammName', 'ZielTabelle', 'CodeSatzart']:
                column_definitions.append(f"`{col}` VARCHAR(100)")
            elif col in ['KategorieLangtext']:
                column_definitions.append(f"`{col}` VARCHAR(200)")
            elif col in ['Befehl']:
                column_definitions.append(f"`{col}` VARCHAR(255)")
            elif col in ['Format', 'Maske']:
                column_definitions.append(f"`{col}` TEXT")
            else:
                column_definitions.append(f"`{col}` VARCHAR(255)")
        
        # Add timestamps
        column_definitions.extend([
            "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
            "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ])
        
        create_table_sql = f"""
        CREATE TABLE feldbeschreibungen (
            {', '.join(column_definitions)}
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
        
        cursor.execute(create_table_sql)
        print("✅ Table 'feldbeschreibungen' created with dynamic structure")
        
        # Insert data
        print("\n💾 Importing data...")
        
        # Prepare insert statement
        columns = cleaned_columns
        placeholders = ', '.join(['%s'] * len(columns))
        column_names = ', '.join([f"`{col}`" for col in columns])
        insert_sql = f"INSERT INTO feldbeschreibungen ({column_names}) VALUES ({placeholders})"
        
        success_count = 0
        error_count = 0
        
        for index, row in df.iterrows():
            try:
                # Convert row to tuple, handling NaN values
                values = []
                for value in row:
                    if pd.isna(value):
                        values.append(None)
                    elif isinstance(value, str):
                        # Clean string values
                        values.append(value.encode('utf-8', errors='ignore').decode('utf-8'))
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
            f"CREATE INDEX idx_nummer ON feldbeschreibungen(`Nummer`)",
            f"CREATE INDEX idx_suchwort ON feldbeschreibungen(`Suchwort`)",
            f"CREATE INDEX idx_kategorie ON feldbeschreibungen(`Kategorie`)",
            f"CREATE INDEX idx_satzart ON feldbeschreibungen(`Satzart`)"
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
        cursor.execute(f"SELECT `Nummer`, `Suchwort`, `Kategorie`, `KategorieLangtext` FROM feldbeschreibungen LIMIT 5")
        print("\n📋 Sample records:")
        print("Nummer | Suchwort | Kategorie | KategorieLangtext")
        print("-" * 70)
        for row in cursor.fetchall():
            print(f"{row[0]:<6} | {str(row[1])[:12]:<12} | {str(row[2])[:9]:<9} | {str(row[3])[:30]}")
        
        cursor.close()
        connection.close()
        
        print("\n" + "=" * 50)
        print("🎉 Export completed successfully!")
        print(f"📋 Database: medatixx")
        print(f"📊 Table: feldbeschreibungen")
        print(f"🌐 Host: localhost (XAMPP)")
        print(f"🔗 Access via: http://localhost/phpmyadmin")
        print(f"📈 Records imported: {success_count}")
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
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    export_to_mysql_xampp()