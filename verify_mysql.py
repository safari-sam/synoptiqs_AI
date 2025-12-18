#!/usr/bin/env python3
"""
Verify MySQL database export
"""

import mysql.connector
import pandas as pd

def verify_mysql_export():
    """Verify the MySQL export was successful"""
    
    config = {
        'host': 'localhost',
        'user': 'root',
        'password': '',
        'database': 'medatixx',
        'charset': 'utf8mb4'
    }
    
    print("🔍 Verifying MySQL Export")
    print("=" * 40)
    
    try:
        connection = mysql.connector.connect(**config)
        cursor = connection.cursor()
        
        # Test queries
        queries = [
            ("Total records", "SELECT COUNT(*) FROM feldbeschreibungen"),
            ("Categories", "SELECT Kategorie, COUNT(*) as count FROM feldbeschreibungen GROUP BY Kategorie ORDER BY count DESC LIMIT 10"),
            ("Sample records", "SELECT Nummer, Suchwort, Kategorie, KategorieLangtext FROM feldbeschreibungen ORDER BY Nummer LIMIT 5")
        ]
        
        for query_name, query in queries:
            print(f"\n📊 {query_name}:")
            cursor.execute(query)
            results = cursor.fetchall()
            
            if query_name == "Total records":
                print(f"   Total: {results[0][0]} records")
            elif query_name == "Categories":
                print("   Category | Count")
                print("   " + "-" * 20)
                for row in results:
                    print(f"   {row[0]:<8} | {row[1]}")
            else:  # Sample records
                print("   Nummer | Suchwort     | Kategorie | KategorieLangtext")
                print("   " + "-" * 60)
                for row in results:
                    print(f"   {row[0]:<6} | {str(row[1])[:12]:<12} | {str(row[2])[:9]:<9} | {str(row[3])[:20]}")
        
        # Check table structure
        print(f"\n🏗️  Table Structure:")
        cursor.execute("DESCRIBE feldbeschreibungen")
        columns = cursor.fetchall()
        print("   Column               | Type             | Null | Key")
        print("   " + "-" * 60)
        for col in columns[:10]:  # Show first 10 columns
            print(f"   {col[0]:<20} | {col[1]:<16} | {col[2]:<4} | {col[3]}")
        if len(columns) > 10:
            print(f"   ... and {len(columns) - 10} more columns")
        
        cursor.close()
        connection.close()
        
        print(f"\n✅ Database verification completed successfully!")
        print(f"🌐 Access via phpMyAdmin: http://localhost/phpmyadmin")
        print(f"📋 Database: medatixx")
        print(f"📊 Table: feldbeschreibungen")
        
    except mysql.connector.Error as error:
        print(f"❌ MySQL Error: {error}")
    except Exception as error:
        print(f"❌ Error: {error}")

if __name__ == "__main__":
    verify_mysql_export()