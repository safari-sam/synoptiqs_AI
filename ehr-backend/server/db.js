const mysql = require('mysql2/promise');

const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'ehr_app',
  DB_SSL = '',
  DB_CONNECTION_LIMIT = '10'
} = process.env;

let pool;

async function ensureDatabaseExists(baseConfig) {
  const { database, ...configWithoutDb } = baseConfig;
  const connection = await mysql.createConnection(configWithoutDb);
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally {
    await connection.end();
  }
}

function getPoolConfig() {
  const config = {
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(DB_CONNECTION_LIMIT) || 10,
    charset: 'utf8mb4_unicode_ci'
  };

  if (DB_SSL && DB_SSL.toLowerCase() !== 'false') {
    config.ssl = DB_SSL.toLowerCase() === 'true' ? { rejectUnauthorized: false } : DB_SSL;
  }

  return config;
}

async function initializeDatabase() {
  if (!pool) {
    const baseConfig = getPoolConfig();
    await ensureDatabaseExists(baseConfig);
    pool = mysql.createPool(baseConfig);
  }

  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        license_number VARCHAR(100),
        specialty VARCHAR(150),
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS lab_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(120) NOT NULL,
        last_name VARCHAR(120) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        doctor_id INT NOT NULL,
        first_name VARCHAR(120) NOT NULL,
        last_name VARCHAR(120) NOT NULL,
        date_of_birth DATE NOT NULL,
        gender VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        blood_type VARCHAR(10),
        height_cm DECIMAL(7,2),
        weight_kg DECIMAL(7,2),
        emergency_contact VARCHAR(255),
        insurance VARCHAR(255),
        allergies JSON,
        chronic_conditions JSON,
        medications JSON,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_patients_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS visits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        doctor_id INT NOT NULL,
        patient_id INT NOT NULL,
        visit_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        vitals_json JSON,
        chief_complaint TEXT,
        hpi TEXT,
        ros_json JSON,
        physical_exam_json JSON,
        diagnosis TEXT,
        treatment_plan TEXT,
        doctor_summary TEXT,
        status VARCHAR(50) DEFAULT 'in-progress',
        next_appointment_date DATETIME,
        next_appointment_reason VARCHAR(255),
        next_appointment_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_visits_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
        CONSTRAINT fk_visits_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    try {
      await connection.query(`
        ALTER TABLE visits
        ADD COLUMN doctor_summary TEXT AFTER treatment_plan
      `);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        throw err;
      }
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS pharmacy_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        category VARCHAR(120),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS lab_tests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        category VARCHAR(120),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS radiology_tests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        category VARCHAR(120),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        visit_id INT,
        patient_id INT NOT NULL,
        doctor_id INT NOT NULL,
        item_id INT,
        medication_name VARCHAR(255) NOT NULL,
        dosage VARCHAR(120),
        frequency VARCHAR(120),
        duration VARCHAR(120),
        instructions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_prescriptions_visit FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL,
        CONSTRAINT fk_prescriptions_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        CONSTRAINT fk_prescriptions_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
        CONSTRAINT fk_prescriptions_item FOREIGN KEY (item_id) REFERENCES pharmacy_items(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS lab_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        doctor_id INT NOT NULL,
        visit_id INT,
        test_id INT,
        test_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'ordered',
        priority VARCHAR(50),
        notes TEXT,
        ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        result TEXT,
        result_json JSON,
        result_date DATETIME,
        verified_by INT,
        verified_at DATETIME,
        CONSTRAINT fk_lab_orders_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        CONSTRAINT fk_lab_orders_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
        CONSTRAINT fk_lab_orders_visit FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL,
        CONSTRAINT fk_lab_orders_test FOREIGN KEY (test_id) REFERENCES lab_tests(id) ON DELETE SET NULL,
        CONSTRAINT fk_lab_orders_lab_user FOREIGN KEY (verified_by) REFERENCES lab_users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    try {
      await connection.query(`
        ALTER TABLE lab_orders
        ADD COLUMN result_json JSON AFTER result
      `);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        throw err;
      }
    }

    try {
      await connection.query(`
        ALTER TABLE lab_orders
        ADD COLUMN verified_by INT AFTER result_date,
        ADD COLUMN verified_at DATETIME AFTER verified_by,
        ADD CONSTRAINT fk_lab_orders_lab_user FOREIGN KEY (verified_by) REFERENCES lab_users(id) ON DELETE SET NULL
      `);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_DUP_KEYNAME') {
        throw err;
      }
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS radiology_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        doctor_id INT NOT NULL,
        visit_id INT,
        test_id INT,
        test_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'ordered',
        priority VARCHAR(50),
        notes TEXT,
        ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        result TEXT,
        result_date DATETIME,
        CONSTRAINT fk_radiology_orders_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        CONSTRAINT fk_radiology_orders_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
        CONSTRAINT fk_radiology_orders_visit FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL,
        CONSTRAINT fk_radiology_orders_test FOREIGN KEY (test_id) REFERENCES radiology_tests(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        doctor_id INT NOT NULL,
        visit_id INT,
        scheduled_at DATETIME NOT NULL,
        reason VARCHAR(255),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
        CONSTRAINT fk_appointments_visit FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } finally {
    connection.release();
  }

  await seedReferenceData();
}

function getPool() {
  if (!pool) {
    throw new Error('Database has not been initialised. Call initializeDatabase() first.');
  }
  return pool;
}

async function run(sql, params = []) {
  const [result] = await getPool().execute(sql, params);
  return { lastID: result.insertId || null, changes: result.affectedRows || 0 };
}

async function get(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows && rows.length ? rows[0] : null;
}

async function all(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

async function seedReferenceData() {
  const meds = await get('SELECT COUNT(*) AS count FROM pharmacy_items');
  if (!meds || meds.count === 0) {
    const medicationSeeds = [
      { name: 'Amoxicillin 500mg Capsule', category: 'Antibiotic' },
      { name: 'Azithromycin 250mg Tablet', category: 'Antibiotic' },
      { name: 'Metformin 1000mg Tablet', category: 'Endocrinology' },
      { name: 'Atorvastatin 20mg Tablet', category: 'Cardiology' },
      { name: 'Lisinopril 10mg Tablet', category: 'Cardiology' },
      { name: 'Amlodipine 5mg Tablet', category: 'Cardiology' },
      { name: 'Albuterol Inhaler', category: 'Pulmonology' },
      { name: 'Omeprazole 20mg Capsule', category: 'Gastroenterology' },
      { name: 'Ibuprofen 400mg Tablet', category: 'Analgesic' },
      { name: 'Insulin Glargine 100u/mL', category: 'Endocrinology' }
    ];
    for (const item of medicationSeeds) {
      await run(
        'INSERT INTO pharmacy_items (name, category) VALUES (?, ?) ON DUPLICATE KEY UPDATE category = VALUES(category)',
        [item.name, item.category]
      );
    }
  }

  const labSeedCount = await get('SELECT COUNT(*) AS count FROM lab_tests');
  if (!labSeedCount || labSeedCount.count === 0) {
    const labSeeds = [
      { name: 'Complete Blood Count (CBC)', category: 'Hematology' },
      { name: 'Erythrocyte Sedimentation Rate (ESR)', category: 'Hematology' },
      { name: 'Coagulation Profile', category: 'Hematology' },
      { name: 'Basic Metabolic Panel (BMP)', category: 'Chemistry' },
      { name: 'Comprehensive Metabolic Panel (CMP)', category: 'Chemistry' },
      { name: 'Lipid Panel', category: 'Chemistry' },
      { name: 'HbA1c', category: 'Endocrinology' },
      { name: 'Liver Function Tests (LFT)', category: 'Chemistry' },
      { name: 'Renal Function Tests (RFT)', category: 'Chemistry' },
      { name: 'Urinalysis', category: 'Urinalysis' },
      { name: 'Thyroid Stimulating Hormone (TSH)', category: 'Endocrinology' },
      { name: 'Blood Culture', category: 'Microbiology' },
      { name: 'Urine Culture', category: 'Microbiology' }
    ];
    for (const item of labSeeds) {
      await run(
        'INSERT INTO lab_tests (name, category) VALUES (?, ?) ON DUPLICATE KEY UPDATE category = VALUES(category)',
        [item.name, item.category]
      );
    }
  }

  const radiologySeedCount = await get('SELECT COUNT(*) AS count FROM radiology_tests');
  if (!radiologySeedCount || radiologySeedCount.count === 0) {
    const radiologySeeds = [
      { name: 'Chest X-Ray', category: 'X-Ray' },
      { name: 'CT Scan - Head', category: 'CT' },
      { name: 'MRI - Brain', category: 'MRI' },
      { name: 'Abdominal Ultrasound', category: 'Ultrasound' },
      { name: 'Echocardiogram', category: 'Cardiology' },
      { name: 'Mammogram', category: 'Mammography' },
      { name: 'Bone Densitometry', category: 'Bone' },
      { name: 'Electrocardiogram (ECG)', category: 'Cardiology' }
    ];
    for (const item of radiologySeeds) {
      await run(
        'INSERT INTO radiology_tests (name, category) VALUES (?, ?) ON DUPLICATE KEY UPDATE category = VALUES(category)',
        [item.name, item.category]
      );
    }
  }
}

module.exports = {
  initializeDatabase,
  run,
  get,
  all
};