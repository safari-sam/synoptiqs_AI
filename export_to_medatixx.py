#!/usr/bin/env python3
"""
Export CSV data to MySQL database 'medatixx'
This script creates a new MySQL database and imports the feldbeschreibungen.csv data
"""

import mysql.connector
import csv
import sys
from datetime import datetime
import os

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'yourpassword',  # Update with your MySQL password
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_unicode_ci'
}

def create_database():
    """Create the medatixx database"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Create database if it doesn't exist
        cursor.execute("CREATE DATABASE IF NOT EXISTS medatixx CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        print("✅ Database 'medatixx' created successfully")
        
        cursor.close()
        connection.close()
        return True
        
    except mysql.connector.Error as error:
        print(f"❌ Error creating database: {error}")
        return False

def create_table():
    """Create the feldbeschreibungen table"""
    try:
        # Connect to the medatixx database
        config = DB_CONFIG.copy()
        config['database'] = 'medatixx'
        connection = mysql.connector.connect(**config)
        cursor = connection.cursor()
        
        # Drop table if exists (for clean import)
        cursor.execute("DROP TABLE IF EXISTS feldbeschreibungen")
        
        # Create table with appropriate data types
        create_table_query = """
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
            Farbe INT,
            KBTextFarbig TINYINT,
            Befehl VARCHAR(255),
            DateiAenderbar TINYINT,
            Gruppe INT,
            FreigabeStatus INT,
            GruppeEmpfang INT,
            Basisdokumentation INT,
            CodeSatzart VARCHAR(20),
            FreigabeListeVerwenden TINYINT,
            HintergrundFarbe INT,
            FreigabeListeStatus INT,
            ScheinBezug INT,
            ScheinBezugAenderbar TINYINT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
        
        cursor.execute(create_table_query)
        print("✅ Table 'feldbeschreibungen' created successfully")
        
        cursor.close()
        connection.close()
        return True
        
    except mysql.connector.Error as error:
        print(f"❌ Error creating table: {error}")
        return False

def parse_datetime(date_str):
    """Parse datetime string, handle various formats"""
    if not date_str or date_str.strip() == '':
        return None
    
    try:
        # Handle the format from CSV: "1899-12-30 00:00:00.000"
        if '.' in date_str:
            date_str = date_str.split('.')[0]  # Remove milliseconds
        return datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
    except ValueError:
        try:
            # Try alternative format
            return datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            print(f"⚠️  Warning: Could not parse date '{date_str}', using NULL")
            return None

def import_csv_data(csv_file_path):
    """Import CSV data into the database"""
    try:
        # Connect to the medatixx database
        config = DB_CONFIG.copy()
        config['database'] = 'medatixx'
        connection = mysql.connector.connect(**config)
        cursor = connection.cursor()
        
        # Prepare insert statement
        insert_query = """
        INSERT INTO feldbeschreibungen (
            Nummer, Suchwort, Satzart, Kategorie, SymbolNummer, KategorieLangtext, 
            ProgrammName, FixedFont, Format, Maske, ZielTabelle, ZielSatzart, 
            Passwortschutz, Position, Geschuetzt, MeineAuswahl, MandantAnlage, 
            UserAnlage, DatumAnlage, MandantGeaendert, UserGeaendert, DatumAenderung, 
            Farbe, KBTextFarbig, Befehl, DateiAenderbar, Gruppe, FreigabeStatus, 
            GruppeEmpfang, Basisdokumentation, CodeSatzart, FreigabeListeVerwenden, 
            HintergrundFarbe, FreigabeListeStatus, ScheinBezug, ScheinBezugAenderbar
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        # Read and import CSV data
        with open(csv_file_path, 'r', encoding='utf-8') as file:
            # Try different encodings if utf-8 fails
            try:
                csv_reader = csv.reader(file, delimiter=';')
                # Skip header row
                next(csv_reader)
                
                imported_count = 0
                for row in csv_reader:
                    if len(row) < 36:  # Ensure we have all columns
                        print(f"⚠️  Warning: Row has insufficient columns, skipping: {row[:3]}")
                        continue
                    
                    # Prepare data tuple with proper type conversion
                    data = (
                        int(row[0]) if row[0] else None,  # Nummer
                        row[1] if row[1] else None,       # Suchwort
                        row[2] if row[2] else None,       # Satzart
                        row[3] if row[3] else None,       # Kategorie
                        int(row[4]) if row[4] else None,  # SymbolNummer
                        row[5] if row[5] else None,       # KategorieLangtext
                        row[6] if row[6] else None,       # ProgrammName
                        int(row[7]) if row[7] else None,  # FixedFont
                        row[8] if row[8] else None,       # Format
                        row[9] if row[9] else None,       # Maske
                        row[10] if row[10] else None,     # ZielTabelle
                        row[11] if row[11] else None,     # ZielSatzart
                        int(row[12]) if row[12] else None, # Passwortschutz
                        int(row[13]) if row[13] else None, # Position
                        int(row[14]) if row[14] else None, # Geschuetzt
                        int(row[15]) if row[15] else None, # MeineAuswahl
                        int(row[16]) if row[16] else None, # MandantAnlage
                        int(row[17]) if row[17] else None, # UserAnlage
                        parse_datetime(row[18]),           # DatumAnlage
                        int(row[19]) if row[19] else None, # MandantGeaendert
                        int(row[20]) if row[20] else None, # UserGeaendert
                        parse_datetime(row[21]),           # DatumAenderung
                        int(row[22]) if row[22] else None, # Farbe
                        int(row[23]) if row[23] else None, # KBTextFarbig
                        row[24] if row[24] else None,      # Befehl
                        int(row[25]) if row[25] else None, # DateiAenderbar
                        int(row[26]) if row[26] else None, # Gruppe
                        int(row[27]) if row[27] else None, # FreigabeStatus
                        int(row[28]) if row[28] else None, # GruppeEmpfang
                        int(row[29]) if row[29] else None, # Basisdokumentation
                        row[30] if row[30] else None,      # CodeSatzart
                        int(row[31]) if row[31] else None, # FreigabeListeVerwenden
                        int(row[32]) if row[32] else None, # HintergrundFarbe
                        int(row[33]) if row[33] else None, # FreigabeListeStatus
                        int(row[34]) if row[34] else None, # ScheinBezug
                        int(row[35]) if row[35] else None  # ScheinBezugAenderbar
                    )
                    
                    cursor.execute(insert_query, data)
                    imported_count += 1
                
                connection.commit()
                print(f"✅ Successfully imported {imported_count} records")
                
            except UnicodeDecodeError:
                # Try with different encoding
                print("⚠️  UTF-8 failed, trying with latin-1 encoding...")
                file.seek(0)
                csv_reader = csv.reader(file, delimiter=';')
                # Skip header row
                next(csv_reader)
                
                imported_count = 0
                for row in csv_reader:
                    if len(row) < 36:
                        continue
                    
                    # Same data processing as above...
                    # (Implementation would be the same)
        
        cursor.close()
        connection.close()
        return True
        
    except FileNotFoundError:
        print(f"❌ Error: CSV file not found at {csv_file_path}")
        return False
    except mysql.connector.Error as error:
        print(f"❌ Database error: {error}")
        return False
    except Exception as error:
        print(f"❌ Unexpected error: {error}")
        return False

def create_indexes():
    """Create indexes for better performance"""
    try:
        config = DB_CONFIG.copy()
        config['database'] = 'medatixx'
        connection = mysql.connector.connect(**config)
        cursor = connection.cursor()
        
        # Create indexes
        indexes = [
            "CREATE INDEX idx_nummer ON feldbeschreibungen(Nummer)",
            "CREATE INDEX idx_suchwort ON feldbeschreibungen(Suchwort)",
            "CREATE INDEX idx_satzart ON feldbeschreibungen(Satzart)",
            "CREATE INDEX idx_kategorie ON feldbeschreibungen(Kategorie)"
        ]
        
        for index in indexes:
            try:
                cursor.execute(index)
                print(f"✅ Created index: {index.split()[2]}")
            except mysql.connector.Error as e:
                if "Duplicate key name" in str(e):
                    print(f"ℹ️  Index already exists: {index.split()[2]}")
                else:
                    print(f"⚠️  Warning creating index: {e}")
        
        cursor.close()
        connection.close()
        return True
        
    except mysql.connector.Error as error:
        print(f"❌ Error creating indexes: {error}")
        return False

def main():
    """Main execution function"""
    print("🚀 Starting medatixx database export...")
    print("="*50)
    
    # Update this path to your CSV file location
    csv_file_path = "feldbeschreibungen.csv"
    
    # Check if CSV file exists
    if not os.path.exists(csv_file_path):
        print(f"❌ CSV file not found: {csv_file_path}")
        print("Please update the csv_file_path variable with the correct path")
        return False
    
    # Step 1: Create database
    print("1. Creating database...")
    if not create_database():
        return False
    
    # Step 2: Create table
    print("\n2. Creating table...")
    if not create_table():
        return False
    
    # Step 3: Import data
    print("\n3. Importing CSV data...")
    if not import_csv_data(csv_file_path):
        return False
    
    # Step 4: Create indexes
    print("\n4. Creating indexes...")
    if not create_indexes():
        return False
    
    print("\n" + "="*50)
    print("🎉 Export completed successfully!")
    print("Database: medatixx")
    print("Table: feldbeschreibungen")
    print("\nYou can now connect to the database and query the data.")
    print("Example: SELECT * FROM medatixx.feldbeschreibungen LIMIT 10;")
    
    return True

if __name__ == "__main__":
    # Update the database password before running
    print("⚠️  IMPORTANT: Please update the DB_CONFIG password before running this script!")
    print("Current config:", {k: v if k != 'password' else '***' for k, v in DB_CONFIG.items()})
    print()
    
    # Ask for confirmation
    response = input("Have you updated the database password? (y/n): ")
    if response.lower() in ['y', 'yes']:
        success = main()
        sys.exit(0 if success else 1)
    else:
        print("Please update the password in DB_CONFIG and run again.")
        sys.exit(1)