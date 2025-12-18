#!/usr/bin/env python3
"""
Simple MySQL Export Tool for Medatixx Database
"""
import pandas as pd
import mysql.connector
import sys
from getpass import getpass

def main():
    print("🚀 Starting simple MySQL export...")
    
    # Database connection parameters
    host = 'localhost'
    port = 3306
    user = 'root'
    password = 'MamboLeo@123'
    database_name = 'medatixx'
    
    print(f"📊 Loading CSV data...")
    
    # Load the CSV file
    try:
        df = pd.read_csv('feldbeschreibungen.csv', encoding='utf-8', delimiter=';')
        print(f"✅ Loaded {len(df)} records from CSV")
    except UnicodeDecodeError:
        try:
            df = pd.read_csv('feldbeschreibungen.csv', encoding='latin-1', delimiter=';')
            print(f"✅ Loaded {len(df)} records from CSV (latin-1 encoding)")
        except Exception as e:
            print(f"❌ Failed to load CSV: {e}")
            return
    except Exception as e:
        print(f"❌ Failed to load CSV: {e}")
        return
    
    # Connect to MySQL
    print(f"🔗 Connecting to MySQL at {host}:{port}...")
    try:
        # First connect without database to create it
        conn = mysql.connector.connect(
            host=host,
            port=port,
            user=user,
            password=password
        )
        cursor = conn.cursor()
        
        # Create database
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {database_name}")
        cursor.execute(f"USE {database_name}")
        
        print(f"✅ Connected to MySQL and using database '{database_name}'")
        
        # Drop table if exists and create new one
        cursor.execute("DROP TABLE IF EXISTS feldbeschreibungen")
        
        # Create table based on CSV columns
        columns = df.columns.tolist()
        create_sql = """
        CREATE TABLE feldbeschreibungen (
            id INT AUTO_INCREMENT PRIMARY KEY,
            Feldnummer VARCHAR(50),
            Feldname VARCHAR(255),
            Feldtyp VARCHAR(100),
            Beschreibung TEXT,
            Beispiel TEXT,
            Verwendung VARCHAR(255),
            Kategorien VARCHAR(255),
            INDEX idx_feldnummer (Feldnummer),
            INDEX idx_feldname (Feldname),
            INDEX idx_kategorien (Kategorien)
        )
        """
        
        cursor.execute(create_sql)
        print("✅ Created table 'feldbeschreibungen'")
        
        # Insert data
        print("📥 Inserting data...")
        insert_sql = """
        INSERT INTO feldbeschreibungen 
        (Feldnummer, Feldname, Feldtyp, Beschreibung, Beispiel, Verwendung, Kategorien) 
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        
        # Prepare data for insertion
        data_to_insert = []
        for _, row in df.iterrows():
            data_to_insert.append((
                str(row.get('Feldnummer', '')),
                str(row.get('Feldname', '')),
                str(row.get('Feldtyp', '')),
                str(row.get('Beschreibung', '')),
                str(row.get('Beispiel', '')),
                str(row.get('Verwendung', '')),
                str(row.get('Kategorien', ''))
            ))
        
        # Insert in batches
        batch_size = 100
        for i in range(0, len(data_to_insert), batch_size):
            batch = data_to_insert[i:i + batch_size]
            cursor.executemany(insert_sql, batch)
            conn.commit()
            print(f"✅ Inserted batch {i//batch_size + 1} ({len(batch)} records)")
        
        # Verify insertion
        cursor.execute("SELECT COUNT(*) FROM feldbeschreibungen")
        count = cursor.fetchone()[0]
        print(f"✅ Successfully imported {count} records to MySQL database '{database_name}'")
        
        # Show sample data
        cursor.execute("SELECT * FROM feldbeschreibungen LIMIT 3")
        sample_data = cursor.fetchall()
        print("\n📋 Sample data:")
        for i, row in enumerate(sample_data, 1):
            print(f"  Record {i}: {row[1]} - {row[2]}")
        
        cursor.close()
        conn.close()
        
        print(f"\n🎉 Export completed successfully!")
        print(f"Database: {database_name}")
        print(f"Table: feldbeschreibungen")
        print(f"Records: {count}")
        
    except mysql.connector.Error as e:
        print(f"❌ MySQL Error: {e}")
        return
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return

if __name__ == "__main__":
    main()