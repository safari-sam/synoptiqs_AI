#!/usr/bin/env python3
"""
Migrate medatixx database to EHR database
This will add the medical forms as a new table in the EHR database
"""

import mysql.connector
from mysql.connector import Error
import sys

def migrate_medatixx_to_ehr():
    """Migrate medatixx forms table to main EHR database"""
    
    print("🔄 Starting medatixx to EHR database migration...")
    print("=" * 60)
    
    # Source database (medatixx)
    source_config = {
        'host': 'localhost',
        'port': 3306,
        'user': 'root',
        'password': '',
        'database': 'medatixx',
        'charset': 'utf8mb4'
    }
    
    # Target database (ehr_app)
    target_config = {
        'host': 'localhost',
        'port': 3306,
        'user': 'root',
        'password': '',
        'database': 'ehr_app',
        'charset': 'utf8mb4'
    }
    
    try:
        # Connect to source database
        print("📖 Connecting to medatixx database...")
        source_conn = mysql.connector.connect(**source_config)
        source_cursor = source_conn.cursor(dictionary=True)
        
        # Connect to target database
        print("📊 Connecting to EHR database...")
        target_conn = mysql.connector.connect(**target_config)
        target_cursor = target_conn.cursor()
        
        # Create medical_forms table in EHR database
        print("🔧 Creating medical_forms table in EHR database...")
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS medical_forms (
            id INT AUTO_INCREMENT PRIMARY KEY,
            form_number INT NOT NULL,
            search_term VARCHAR(100),
            record_type VARCHAR(20),
            category VARCHAR(20),
            symbol_number INT,
            category_description VARCHAR(200),
            program_name VARCHAR(100),
            fixed_font TINYINT DEFAULT 0,
            format_template TEXT,
            field_mask TEXT,
            target_table VARCHAR(100),
            target_record_type VARCHAR(20),
            password_protected TINYINT DEFAULT 0,
            position_order INT,
            protected_field TINYINT DEFAULT 0,
            user_selection TINYINT DEFAULT 0,
            client_created INT,
            user_created INT,
            date_created DATETIME,
            client_modified INT,
            user_modified INT,
            date_modified DATETIME,
            color_code BIGINT,
            colored_text TINYINT DEFAULT 0,
            command_text VARCHAR(255),
            file_editable TINYINT DEFAULT 0,
            form_group INT,
            approval_status INT,
            receiving_group INT,
            base_documentation INT,
            code_record_type VARCHAR(20),
            use_approval_list TINYINT DEFAULT 0,
            background_color BIGINT,
            approval_list_status INT,
            billing_reference INT,
            billing_reference_editable TINYINT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            INDEX idx_form_number (form_number),
            INDEX idx_search_term (search_term),
            INDEX idx_category (category),
            INDEX idx_record_type (record_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
        
        target_cursor.execute(create_table_sql)
        target_conn.commit()
        print("✅ medical_forms table created successfully")
        
        # Get all data from medatixx
        print("📋 Reading data from medatixx database...")
        source_cursor.execute("SELECT * FROM feldbeschreibungen")
        medatixx_data = source_cursor.fetchall()
        
        print(f"📊 Found {len(medatixx_data)} records to migrate")
        
        # Clear existing data
        target_cursor.execute("DELETE FROM medical_forms")
        
        # Insert data into EHR database
        print("💾 Migrating data to EHR database...")
        
        insert_sql = """
        INSERT INTO medical_forms (
            form_number, search_term, record_type, category, symbol_number,
            category_description, program_name, fixed_font, format_template,
            field_mask, target_table, target_record_type, password_protected,
            position_order, protected_field, user_selection, client_created,
            user_created, date_created, client_modified, user_modified,
            date_modified, color_code, colored_text, command_text,
            file_editable, form_group, approval_status, receiving_group,
            base_documentation, code_record_type, use_approval_list,
            background_color, approval_list_status, billing_reference,
            billing_reference_editable
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s
        )
        """
        
        success_count = 0
        error_count = 0
        
        for record in medatixx_data:
            try:
                # Map the fields from German names to English
                values = (
                    record.get('Nummer'),
                    record.get('Suchwort'),
                    record.get('Satzart'),
                    record.get('Kategorie'),
                    record.get('SymbolNummer'),
                    record.get('KategorieLangtext'),
                    record.get('ProgrammName'),
                    record.get('FixedFont', 0),
                    record.get('Format'),
                    record.get('Maske'),
                    record.get('ZielTabelle'),
                    record.get('ZielSatzart'),
                    record.get('Passwortschutz', 0),
                    record.get('Position'),
                    record.get('Geschuetzt', 0),
                    record.get('MeineAuswahl', 0),
                    record.get('MandantAnlage'),
                    record.get('UserAnlage'),
                    record.get('DatumAnlage'),
                    record.get('MandantGeaendert'),
                    record.get('UserGeaendert'),
                    record.get('Datumaenderung'),
                    record.get('Farbe'),
                    record.get('KBTextFarbig', 0),
                    record.get('Befehl'),
                    record.get('Dateiaenderbar', 0),
                    record.get('Gruppe'),
                    record.get('FreigabeStatus'),
                    record.get('GruppeEmpfang'),
                    record.get('Basisdokumentation'),
                    record.get('CodeSatzart'),
                    record.get('FreigabeListeVerwenden', 0),
                    record.get('HintergrundFarbe'),
                    record.get('FreigabeListeStatus'),
                    record.get('ScheinBezug'),
                    record.get('ScheinBezugAenderbar', 0)
                )
                
                target_cursor.execute(insert_sql, values)
                success_count += 1
                
                if success_count % 50 == 0:
                    print(f"   ✅ Migrated {success_count} records...")
                    
            except Exception as e:
                error_count += 1
                if error_count <= 5:  # Only show first 5 errors
                    print(f"   ⚠️ Error on record {record.get('Nummer', 'unknown')}: {e}")
        
        target_conn.commit()
        
        # Verify migration
        target_cursor.execute("SELECT COUNT(*) FROM medical_forms")
        final_count = target_cursor.fetchone()[0]
        
        print(f"\n📊 Migration Results:")
        print(f"   ✅ Successfully migrated: {success_count} records")
        print(f"   ❌ Errors: {error_count} records")
        print(f"   📋 Total in EHR database: {final_count} medical forms")
        
        # Show sample data
        target_cursor.execute("""
            SELECT form_number, search_term, category, category_description 
            FROM medical_forms 
            ORDER BY form_number 
            LIMIT 5
        """)
        sample_data = target_cursor.fetchall()
        
        print(f"\n📋 Sample migrated data:")
        print("Form# | Search Term  | Category | Description")
        print("-" * 60)
        for row in sample_data:
            form_num = str(row[0]) if row[0] else 'N/A'
            search_term = str(row[1])[:12] if row[1] else 'N/A'
            category = str(row[2])[:8] if row[2] else 'N/A'
            description = str(row[3])[:25] if row[3] else 'N/A'
            print(f"{form_num:<5} | {search_term:<12} | {category:<8} | {description}")
        
        # Close connections
        source_cursor.close()
        source_conn.close()
        target_cursor.close()
        target_conn.close()
        
        print(f"\n" + "=" * 60)
        print("🎉 Migration completed successfully!")
        print("📋 Medical forms are now available in your EHR database")
        print("🔄 Next: Update EHR server to display medical forms")
        
        return True
        
    except mysql.connector.Error as error:
        print(f"❌ Database Error: {error}")
        return False
    
    except Exception as error:
        print(f"❌ Migration Error: {error}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    migrate_medatixx_to_ehr()