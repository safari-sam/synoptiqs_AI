#!/usr/bin/env python3
"""
Simple SQL Query Tool for medatixx database
Allows you to run SQL queries against the exported data
"""

import sqlite3
import pandas as pd
import sys
import os

def connect_to_db():
    """Connect to the medatixx SQLite database"""
    db_path = "medatixx.sqlite"
    
    if not os.path.exists(db_path):
        print("❌ Database file 'medatixx.sqlite' not found!")
        print("Please run the export script first: python flexible_export_medatixx.py")
        return None
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row  # This allows column access by name
        return conn
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        return None

def show_table_info(conn):
    """Show information about the table structure"""
    cursor = conn.cursor()
    
    # Get table info
    cursor.execute("PRAGMA table_info(feldbeschreibungen)")
    columns = cursor.fetchall()
    
    print("📊 Table Structure: feldbeschreibungen")
    print("=" * 60)
    print(f"{'Column':<25} {'Type':<15} {'Null':<8}")
    print("-" * 60)
    
    for col in columns:
        print(f"{col[1]:<25} {col[2]:<15} {'YES' if col[3] == 0 else 'NO':<8}")
    
    # Get record count
    cursor.execute("SELECT COUNT(*) FROM feldbeschreibungen")
    count = cursor.fetchone()[0]
    print(f"\n📈 Total Records: {count}")
    
    # Show categories
    cursor.execute("SELECT Kategorie, COUNT(*) as count FROM feldbeschreibungen GROUP BY Kategorie ORDER BY count DESC LIMIT 10")
    categories = cursor.fetchall()
    
    print("\n📋 Top Categories:")
    print("-" * 30)
    for cat in categories:
        print(f"{cat[0]:<15} {cat[1]:>5}")

def run_predefined_queries(conn):
    """Run some predefined useful queries"""
    queries = {
        "1": {
            "name": "All records",
            "sql": "SELECT Nummer, Suchwort, Kategorie, KategorieLangtext FROM feldbeschreibungen ORDER BY Nummer LIMIT 20"
        },
        "2": {
            "name": "Records by Category",
            "sql": "SELECT Kategorie, COUNT(*) as count FROM feldbeschreibungen GROUP BY Kategorie ORDER BY count DESC"
        },
        "3": {
            "name": "Prescription-related entries",
            "sql": "SELECT * FROM feldbeschreibungen WHERE Suchwort LIKE '%rezept%' OR KategorieLangtext LIKE '%rezept%'"
        },
        "4": {
            "name": "Medical forms",
            "sql": "SELECT Nummer, Suchwort, KategorieLangtext FROM feldbeschreibungen WHERE KategorieLangtext LIKE '%formular%'"
        },
        "5": {
            "name": "Medication-related entries",
            "sql": "SELECT * FROM feldbeschreibungen WHERE Suchwort LIKE '%medikament%' OR KategorieLangtext LIKE '%medikament%'"
        },
        "6": {
            "name": "Lab/Test related entries",
            "sql": "SELECT * FROM feldbeschreibungen WHERE Suchwort LIKE '%labor%' OR KategorieLangtext LIKE '%labor%' OR Suchwort LIKE '%befund%'"
        }
    }
    
    print("\n🔍 Predefined Queries:")
    print("=" * 50)
    
    for key, query in queries.items():
        print(f"{key}. {query['name']}")
    
    print("0. Custom query")
    print("q. Quit")
    
    while True:
        choice = input("\nEnter your choice: ").strip().lower()
        
        if choice == 'q':
            break
        elif choice == '0':
            custom_sql = input("Enter your SQL query: ")
            run_query(conn, custom_sql)
        elif choice in queries:
            query = queries[choice]
            print(f"\n📋 {query['name']}:")
            print(f"🔍 SQL: {query['sql']}")
            print("-" * 60)
            run_query(conn, query['sql'])
        else:
            print("❌ Invalid choice. Please try again.")

def run_query(conn, sql):
    """Run a SQL query and display results"""
    try:
        df = pd.read_sql_query(sql, conn)
        
        if len(df) == 0:
            print("📭 No results found.")
        else:
            print(f"📊 Found {len(df)} results:")
            
            # Display results in a nice format
            pd.set_option('display.max_columns', None)
            pd.set_option('display.width', None)
            pd.set_option('display.max_colwidth', 50)
            
            print(df.to_string(index=False))
            
            if len(df) > 20:
                print(f"\n... showing first 20 of {len(df)} results")
    
    except Exception as e:
        print(f"❌ Error running query: {e}")

def export_query_results(conn):
    """Export query results to CSV or Excel"""
    sql = input("Enter SQL query to export: ")
    
    try:
        df = pd.read_sql_query(sql, conn)
        
        if len(df) == 0:
            print("📭 No results to export.")
            return
        
        format_choice = input("Export format (csv/excel) [csv]: ").strip().lower() or "csv"
        
        if format_choice == "csv":
            filename = f"query_results_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.csv"
            df.to_csv(filename, index=False)
            print(f"✅ Results exported to: {filename}")
        
        elif format_choice == "excel":
            filename = f"query_results_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            df.to_excel(filename, index=False)
            print(f"✅ Results exported to: {filename}")
        
        else:
            print("❌ Invalid format. Use 'csv' or 'excel'.")
    
    except Exception as e:
        print(f"❌ Error exporting results: {e}")

def main():
    print("🔍 Medatixx Database Query Tool")
    print("=" * 50)
    
    # Connect to database
    conn = connect_to_db()
    if not conn:
        return False
    
    print("✅ Connected to medatixx.sqlite")
    
    # Show table info
    show_table_info(conn)
    
    while True:
        print("\n🛠️ What would you like to do?")
        print("1. Run predefined queries")
        print("2. Run custom query")
        print("3. Export query results")
        print("4. Show table structure")
        print("5. Quit")
        
        choice = input("\nEnter your choice: ").strip()
        
        if choice == '1':
            run_predefined_queries(conn)
        elif choice == '2':
            sql = input("Enter your SQL query: ")
            run_query(conn, sql)
        elif choice == '3':
            export_query_results(conn)
        elif choice == '4':
            show_table_info(conn)
        elif choice == '5':
            break
        else:
            print("❌ Invalid choice. Please try again.")
    
    conn.close()
    print("👋 Thank you for using the Medatixx Query Tool!")
    return True

if __name__ == "__main__":
    main()