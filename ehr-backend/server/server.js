require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const { initializeDatabase, run, get, all } = require('./db');
const BDTGenerator = require('./bdt-generator');
const FHIRGenerator = require('./fhir-generator');

const bdtGenerator = new BDTGenerator();
const fhirGenerator = new FHIRGenerator();

const ROOT_DIR = path.resolve(__dirname, '..', '..');

// CRITICAL: Match the Python backend watcher path exactly
const DEFAULT_EXCHANGE_DIR = 'C:\\ehr_exchange';

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

process.on('exit', (code) => {
  console.log(`Process exiting with code ${code}`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

function resolveExchangeDir() {
  if (!fs.existsSync(DEFAULT_EXCHANGE_DIR)) {
    fs.mkdirSync(DEFAULT_EXCHANGE_DIR, { recursive: true });
  }
  return DEFAULT_EXCHANGE_DIR;
}

initializeDatabase()
  .then(() => {
    console.log('SQLite database ready.');
  })
  .catch((err) => {
    console.error('Failed to initialise database', err);
    process.exit(1);
  });

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
}

function authenticateToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const [, token] = header.split(' ');
  if (!token) {
    return res.status(401).json({ message: 'Bearer token missing' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload.doctorId) {
      return res.status(403).json({ message: 'Doctor access required.' });
    }
    req.doctorId = payload.doctorId;
    req.authRole = payload.role || 'doctor';
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function authenticateLabToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const [, token] = header.split(' ');
  if (!token) {
    return res.status(401).json({ message: 'Bearer token missing' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload.labId) {
      return res.status(403).json({ message: 'Lab access required.' });
    }
    req.labId = payload.labId;
    req.authRole = payload.role || 'lab';
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function parseListField(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function serializeListField(value) {
  const list = parseListField(value);
  return list.length ? JSON.stringify(list) : null;
}

function parseJsonColumn(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'string') {
    if (!value.length) {
      return fallback;
    }
    try {
      return JSON.parse(value);
    } catch (err) {
      return fallback;
    }
  }
  if (Buffer.isBuffer && Buffer.isBuffer(value)) {
    try {
      return JSON.parse(value.toString('utf8'));
    } catch (err) {
      return fallback;
    }
  }
  if (typeof value === 'object') {
    return value;
  }
  return fallback;
}

function parseJsonArrayColumn(value) {
  const result = parseJsonColumn(value, []);
  return Array.isArray(result) ? result : [];
}

function parseJsonObjectColumn(value) {
  const result = parseJsonColumn(value, {});
  return result && typeof result === 'object' && !Array.isArray(result) ? result : {};
}

function parsePatientRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    doctorId: row.doctor_id,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    email: row.email,
    phone: row.phone,
    address: row.address,
    bloodType: row.blood_type,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    emergencyContact: row.emergency_contact,
    insurance: row.insurance,
    allergies: parseJsonArrayColumn(row.allergies),
    chronicConditions: parseJsonArrayColumn(row.chronic_conditions),
    medications: parseJsonArrayColumn(row.medications),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastVisitDate: row.last_visit_date || null
  };
}

function parseVisitRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    doctorId: row.doctor_id,
    patientId: row.patient_id,
    visitDate: row.visit_date,
    vitals: parseJsonObjectColumn(row.vitals_json),
    chiefComplaint: row.chief_complaint || '',
    hpi: row.hpi || '',
    reviewOfSystems: parseJsonObjectColumn(row.ros_json),
    physicalExam: parseJsonObjectColumn(row.physical_exam_json),
    diagnosis: row.diagnosis || '',
    treatmentPlan: row.treatment_plan || '',
    doctorSummary: row.doctor_summary || '',
    status: row.status,
    nextAppointmentDate: row.next_appointment_date || null,
    nextAppointmentReason: row.next_appointment_reason || null,
    nextAppointmentNotes: row.next_appointment_notes || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function parsePrescriptionRow(row) {
  return {
    id: row.id,
    visitId: row.visit_id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    itemId: row.item_id,
    medicationName: row.medication_name,
    dosage: row.dosage,
    frequency: row.frequency,
    duration: row.duration,
    instructions: row.instructions,
    createdAt: row.created_at,
    item: row.item_name
  };
}

function parseOrderRow(row) {
  return {
    id: row.id,
    visitId: row.visit_id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    testId: row.test_id,
    testName: row.test_name,
    status: row.status,
    priority: row.priority,
    notes: row.notes,
    orderedAt: row.ordered_at,
    result: row.result,
    resultDetails: parseJsonArrayColumn(row.result_json),
    resultDate: row.result_date,
    verifiedBy: row.verified_by,
    verifiedAt: row.verified_at,
    verifiedByName: row.lab_verified_name || null
  };
}

function mapLabOrderRow(row) {
  const base = parseOrderRow(row);
  const verifiedName = row.lab_verified_name || (row.lab_first_name && row.lab_last_name
    ? `${row.lab_first_name} ${row.lab_last_name}`.trim()
    : row.lab_first_name || row.lab_last_name || null);
  return {
    ...base,
    verifiedByName: verifiedName || base.verifiedByName || null,
    patient: {
      id: base.patientId,
      firstName: row.patient_first_name,
      lastName: row.patient_last_name,
      dateOfBirth: row.patient_dob
    },
    doctor: {
      id: base.doctorId,
      firstName: row.doctor_first_name,
      lastName: row.doctor_last_name
    },
    verifiedByUser: row.lab_first_name
      ? {
          id: base.verifiedBy,
          firstName: row.lab_first_name,
          lastName: row.lab_last_name
        }
      : null
  };
}

function parseAppointmentRow(row) {
  return {
    id: row.id,
    visitId: row.visit_id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    scheduledAt: row.scheduled_at,
    reason: row.reason,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at
  };
}

async function getComprehensivePatientData(patientId, doctorId) {
  const patient = await get(
    'SELECT * FROM patients WHERE id = ?',
    [patientId]
  );

  if (!patient) {
    return null;
  }

  const visits = await all(
    'SELECT * FROM visits WHERE patient_id = ? ORDER BY visit_date DESC',
    [patientId]
  );

  const prescriptions = await all(
    `SELECT p.*, pi.name as item_name
     FROM prescriptions p
     LEFT JOIN pharmacy_items pi ON p.item_id = pi.id
     WHERE p.patient_id = ?
     ORDER BY p.created_at DESC`,
    [patientId]
  );

  const labOrders = await all(
    `SELECT lo.*, CONCAT_WS(' ', lu.first_name, lu.last_name) AS lab_verified_name
       FROM lab_orders lo
       LEFT JOIN lab_users lu ON lu.id = lo.verified_by
      WHERE lo.patient_id = ?
      ORDER BY lo.ordered_at DESC`,
    [patientId]
  );

  const radiologyOrders = await all(
    'SELECT * FROM radiology_orders WHERE patient_id = ? ORDER BY ordered_at DESC',
    [patientId]
  );

  return {
    patient: parsePatientRow(patient),
    visits: visits.map(parseVisitRow),
    prescriptions: prescriptions.map(parsePrescriptionRow),
    labOrders: labOrders.map(parseOrderRow),
    radiologyOrders: radiologyOrders.map(parseOrderRow)
  };
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      licenseNumber,
      specialty,
      password
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'First name, last name, email, and password are required.' });
    }

    const existing = await get('SELECT id FROM doctors WHERE email = ?', [email.toLowerCase()]);
    if (existing) {
      return res.status(409).json({ message: 'A doctor with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const insert = await run(
      `INSERT INTO doctors (first_name, last_name, email, license_number, specialty, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)` ,
      [firstName.trim(), lastName.trim(), email.toLowerCase().trim(), licenseNumber || null, specialty || null, passwordHash]
    );

    const doctor = await get('SELECT id, first_name, last_name, email, specialty FROM doctors WHERE id = ?', [insert.lastID]);

    return res.status(201).json({
      message: 'Registration successful.',
      doctor: {
        id: doctor.id,
        firstName: doctor.first_name,
        lastName: doctor.last_name,
        email: doctor.email,
        specialty: doctor.specialty
      }
    });
  } catch (err) {
    console.error('Registration error', err);
    return res.status(500).json({ message: 'Unable to register doctor.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const doctor = await get('SELECT * FROM doctors WHERE email = ?', [email.toLowerCase().trim()]);
    if (!doctor) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, doctor.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = createToken({ doctorId: doctor.id, role: 'doctor' });
    return res.json({
      token,
      doctor: {
        id: doctor.id,
        firstName: doctor.first_name,
        lastName: doctor.last_name,
        email: doctor.email,
        specialty: doctor.specialty
      }
    });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ message: 'Unable to login.' });
  }
});

app.post('/api/lab/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const existing = await get('SELECT id FROM lab_users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(409).json({ message: 'A lab user with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const insert = await run(
      `INSERT INTO lab_users (first_name, last_name, email, password_hash)
       VALUES (?, ?, ?, ?)` ,
      [firstName.trim(), lastName.trim(), email.toLowerCase().trim(), passwordHash]
    );

    const labUser = await get('SELECT id, first_name, last_name, email FROM lab_users WHERE id = ?', [insert.lastID]);

    return res.status(201).json({
      message: 'Lab user registered successfully.',
      labUser: {
        id: labUser.id,
        firstName: labUser.first_name,
        lastName: labUser.last_name,
        email: labUser.email
      }
    });
  } catch (err) {
    console.error('Lab registration error', err);
    return res.status(500).json({ message: 'Unable to register lab user.' });
  }
});

app.post('/api/lab/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const labUser = await get('SELECT * FROM lab_users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!labUser) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, labUser.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = createToken({ labId: labUser.id, role: 'lab' });
    return res.json({
      token,
      labUser: {
        id: labUser.id,
        firstName: labUser.first_name,
        lastName: labUser.last_name,
        email: labUser.email
      }
    });
  } catch (err) {
    console.error('Lab login error', err);
    return res.status(500).json({ message: 'Unable to login as lab user.' });
  }
});

app.get('/api/lab/profile', authenticateLabToken, async (req, res) => {
  try {
    const labUser = await get('SELECT id, first_name, last_name, email FROM lab_users WHERE id = ?', [req.labId]);
    if (!labUser) {
      return res.status(404).json({ message: 'Lab user not found.' });
    }
    return res.json({
      id: labUser.id,
      firstName: labUser.first_name,
      lastName: labUser.last_name,
      email: labUser.email
    });
  } catch (err) {
    console.error('Lab profile error', err);
    return res.status(500).json({ message: 'Unable to load lab profile.' });
  }
});

app.get('/api/lab/orders', authenticateLabToken, async (req, res) => {
  try {
    const statusFilter = (req.query.status || 'active').toString().toLowerCase();
    let whereClause = '1=1';
    switch (statusFilter) {
      case 'active':
        whereClause = "lo.status IN ('ordered', 'pending', 'in-progress')";
        break;
      case 'completed':
        whereClause = "lo.status = 'completed'";
        break;
      case 'all':
      default:
        whereClause = '1=1';
        break;
    }

    const orders = await all(
      `SELECT lo.*, 
              p.first_name AS patient_first_name,
              p.last_name AS patient_last_name,
              p.date_of_birth AS patient_dob,
              d.first_name AS doctor_first_name,
              d.last_name AS doctor_last_name,
              lu.first_name AS lab_first_name,
              lu.last_name AS lab_last_name,
              CONCAT_WS(' ', lu.first_name, lu.last_name) AS lab_verified_name
         FROM lab_orders lo
         JOIN patients p ON p.id = lo.patient_id
         JOIN doctors d ON d.id = lo.doctor_id
         LEFT JOIN lab_users lu ON lu.id = lo.verified_by
         WHERE ${whereClause}
         ORDER BY
           CASE WHEN lo.status IN ('ordered', 'pending', 'in-progress') THEN 0 ELSE 1 END,
           lo.ordered_at ASC`
    );

    return res.json(orders.map(mapLabOrderRow));
  } catch (err) {
    console.error('Lab orders list error', err);
    return res.status(500).json({ message: 'Unable to load lab orders.' });
  }
});

app.get('/api/lab/orders/:id', authenticateLabToken, async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const order = await get(
      `SELECT lo.*, 
              p.first_name AS patient_first_name,
              p.last_name AS patient_last_name,
              p.date_of_birth AS patient_dob,
              d.first_name AS doctor_first_name,
              d.last_name AS doctor_last_name,
              lu.first_name AS lab_first_name,
              lu.last_name AS lab_last_name,
              CONCAT_WS(' ', lu.first_name, lu.last_name) AS lab_verified_name
         FROM lab_orders lo
         JOIN patients p ON p.id = lo.patient_id
         JOIN doctors d ON d.id = lo.doctor_id
         LEFT JOIN lab_users lu ON lu.id = lo.verified_by
         WHERE lo.id = ?`,
      [orderId]
    );

    if (!order) {
      return res.status(404).json({ message: 'Lab order not found.' });
    }

    return res.json(mapLabOrderRow(order));
  } catch (err) {
    console.error('Lab order detail error', err);
    return res.status(500).json({ message: 'Unable to load lab order.' });
  }
});

app.put('/api/lab/orders/:id/result', authenticateLabToken, async (req, res) => {
  try {
    const labId = req.labId;
    const orderId = Number(req.params.id);
    const { resultSummary, resultDetails } = req.body;

    const order = await get('SELECT * FROM lab_orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ message: 'Lab order not found.' });
    }

    if (!Array.isArray(resultDetails) || resultDetails.length === 0) {
      return res.status(400).json({ message: 'Result details are required.' });
    }

    const serializedDetails = JSON.stringify(resultDetails);
    const now = new Date();

    await run(
      `UPDATE lab_orders
         SET result = ?,
             result_json = ?,
             result_date = ?,
             status = 'completed',
             verified_by = ?,
             verified_at = ?
       WHERE id = ?`,
      [resultSummary || null, serializedDetails, now, labId, now, orderId]
    );

    const updated = await get(
      `SELECT lo.*, 
              p.first_name AS patient_first_name,
              p.last_name AS patient_last_name,
              p.date_of_birth AS patient_dob,
              d.first_name AS doctor_first_name,
              d.last_name AS doctor_last_name,
              lu.first_name AS lab_first_name,
              lu.last_name AS lab_last_name,
              CONCAT_WS(' ', lu.first_name, lu.last_name) AS lab_verified_name
         FROM lab_orders lo
         JOIN patients p ON p.id = lo.patient_id
         JOIN doctors d ON d.id = lo.doctor_id
         LEFT JOIN lab_users lu ON lu.id = lo.verified_by
         WHERE lo.id = ?`,
      [orderId]
    );

    return res.json(mapLabOrderRow(updated));
  } catch (err) {
    console.error('Lab result update error', err);
    return res.status(500).json({ message: 'Unable to save lab results.' });
  }
});

app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const doctor = await get('SELECT id, first_name, last_name, email, specialty FROM doctors WHERE id = ?', [req.doctorId]);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }
    return res.json({
      id: doctor.id,
      firstName: doctor.first_name,
      lastName: doctor.last_name,
      email: doctor.email,
      specialty: doctor.specialty
    });
  } catch (err) {
    console.error('Profile error', err);
    return res.status(500).json({ message: 'Unable to load profile.' });
  }
});

app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const [patientCount, activeVisits, pendingLabs, pendingRads, queueCount] = await Promise.all([
      get('SELECT COUNT(*) AS count FROM patients WHERE doctor_id = ?', [doctorId]),
      get("SELECT COUNT(*) AS count FROM visits WHERE doctor_id = ? AND status IN ('in-progress', 'pending')", [doctorId]),
      get("SELECT COUNT(*) AS count FROM lab_orders WHERE doctor_id = ? AND status IN ('ordered', 'pending')", [doctorId]),
      get("SELECT COUNT(*) AS count FROM radiology_orders WHERE doctor_id = ? AND status IN ('ordered', 'pending')", [doctorId]),
      get("SELECT COUNT(*) AS count FROM appointments WHERE doctor_id = ? AND status = 'scheduled' AND scheduled_at >= NOW()", [doctorId])
    ]);

    const recentPatients = await all(
      `SELECT p.*, (
          SELECT visit_date FROM visits v
          WHERE v.patient_id = p.id
          ORDER BY v.visit_date DESC
          LIMIT 1
        ) AS last_visit_date
       FROM patients p
       WHERE p.doctor_id = ?
       ORDER BY p.created_at DESC
       LIMIT 6`,
      [doctorId]
    );

    return res.json({
      totals: {
        patients: patientCount ? patientCount.count : 0,
        activeCases: activeVisits ? activeVisits.count : 0,
        pendingReviews: (pendingLabs ? pendingLabs.count : 0) + (pendingRads ? pendingRads.count : 0),
        queue: queueCount ? queueCount.count : 0
      },
      recentPatients: recentPatients.map(parsePatientRow)
    });
  } catch (err) {
    console.error('Dashboard error', err);
    return res.status(500).json({ message: 'Unable to load dashboard data.' });
  }
});

app.get('/api/patients', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const search = (req.query.search || '').trim().toLowerCase();
    let patients;
    if (search) {
      const criteria = `%${search}%`;
      patients = await all(
        `SELECT p.*, (
            SELECT visit_date FROM visits v
            WHERE v.patient_id = p.id
            ORDER BY v.visit_date DESC
            LIMIT 1
          ) AS last_visit_date
         FROM patients p
         WHERE p.doctor_id = ?
           AND (LOWER(p.first_name) LIKE ? OR LOWER(p.last_name) LIKE ? OR LOWER(p.email) LIKE ?)
         ORDER BY p.last_name, p.first_name`,
        [doctorId, criteria, criteria, criteria]
      );
    } else {
      patients = await all(
        `SELECT p.*, (
            SELECT visit_date FROM visits v
            WHERE v.patient_id = p.id
            ORDER BY v.visit_date DESC
            LIMIT 1
          ) AS last_visit_date
         FROM patients p
         WHERE p.doctor_id = ?
         ORDER BY p.last_name, p.first_name`,
        [doctorId]
      );
    }

    return res.json(patients.map(parsePatientRow));
  } catch (err) {
    console.error('List patients error', err);
    return res.status(500).json({ message: 'Unable to load patients.' });
  }
});

app.post('/api/patients', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      address,
      bloodType,
      heightCm,
      weightKg,
      emergencyContact,
      insurance,
      allergies,
      chronicConditions,
      medications
    } = req.body;

    if (!firstName || !lastName || !dateOfBirth || !gender) {
      return res.status(400).json({ message: 'First name, last name, date of birth, and gender are required.' });
    }

    const insert = await run(
      `INSERT INTO patients (
        doctor_id, first_name, last_name, date_of_birth, gender, email, phone, address, blood_type,
        height_cm, weight_kg, emergency_contact, insurance, allergies, chronic_conditions, medications
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        doctorId,
        firstName.trim(),
        lastName.trim(),
        dateOfBirth,
        gender,
        email ? email.trim() : null,
        phone ? phone.trim() : null,
        address || null,
        bloodType || null,
        heightCm || null,
        weightKg || null,
        emergencyContact || null,
        insurance || null,
        serializeListField(allergies),
        serializeListField(chronicConditions),
        serializeListField(medications)
      ]
    );

    const patient = await get(
      `SELECT p.*, (
          SELECT visit_date FROM visits v
          WHERE v.patient_id = p.id
          ORDER BY v.visit_date DESC
          LIMIT 1
        ) AS last_visit_date
       FROM patients p
       WHERE p.id = ? AND p.doctor_id = ?`,
      [insert.lastID, doctorId]
    );

    return res.status(201).json(parsePatientRow(patient));
  } catch (err) {
    console.error('Create patient error', err);
    return res.status(500).json({ message: 'Unable to create patient.' });
  }
});

app.get('/api/patients/:id', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const patientId = Number(req.params.id);
    const patientRow = await get(
      `SELECT p.*, (
          SELECT visit_date FROM visits v
          WHERE v.patient_id = p.id
          ORDER BY v.visit_date DESC
          LIMIT 1
        ) AS last_visit_date
       FROM patients p
       WHERE p.id = ? AND p.doctor_id = ?`,
      [patientId, doctorId]
    );

    if (!patientRow) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const [visits, prescriptions, labOrders, radiologyOrders, appointments] = await Promise.all([
      all('SELECT * FROM visits WHERE patient_id = ? AND doctor_id = ? ORDER BY visit_date DESC', [patientId, doctorId]),
      all(`SELECT pr.*, pi.name AS item_name FROM prescriptions pr
           LEFT JOIN pharmacy_items pi ON pr.item_id = pi.id
           WHERE pr.patient_id = ? AND pr.doctor_id = ?
           ORDER BY pr.created_at DESC`, [patientId, doctorId]),
           all(`SELECT lo.*, CONCAT_WS(' ', lu.first_name, lu.last_name) AS lab_verified_name
              FROM lab_orders lo
              LEFT JOIN lab_users lu ON lu.id = lo.verified_by
             WHERE lo.patient_id = ? AND lo.doctor_id = ?
             ORDER BY lo.ordered_at DESC`, [patientId, doctorId]),
         all('SELECT * FROM radiology_orders WHERE patient_id = ? AND doctor_id = ? ORDER BY ordered_at DESC', [patientId, doctorId]),
         all('SELECT * FROM appointments WHERE patient_id = ? AND doctor_id = ? ORDER BY scheduled_at DESC', [patientId, doctorId])
    ]);

    return res.json({
      patient: parsePatientRow(patientRow),
      visits: visits.map(parseVisitRow),
      prescriptions: prescriptions.map(parsePrescriptionRow),
      labOrders: labOrders.map(parseOrderRow),
      radiologyOrders: radiologyOrders.map(parseOrderRow),
      appointments: appointments.map(parseAppointmentRow)
    });
  } catch (err) {
    console.error('Get patient error', err);
    return res.status(500).json({ message: 'Unable to load patient.' });
  }
});

app.put('/api/patients/:id', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const patientId = Number(req.params.id);
    const existing = await get('SELECT id FROM patients WHERE id = ? AND doctor_id = ?', [patientId, doctorId]);
    if (!existing) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      address,
      bloodType,
      heightCm,
      weightKg,
      emergencyContact,
      insurance,
      allergies,
      chronicConditions,
      medications,
      status
    } = req.body;

    await run(
      `UPDATE patients SET
        first_name = ?,
        last_name = ?,
        date_of_birth = ?,
        gender = ?,
        email = ?,
        phone = ?,
        address = ?,
        blood_type = ?,
        height_cm = ?,
        weight_kg = ?,
        emergency_contact = ?,
        insurance = ?,
        allergies = ?,
        chronic_conditions = ?,
        medications = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND doctor_id = ?`,
      [
        firstName,
        lastName,
        dateOfBirth,
        gender,
        email || null,
        phone || null,
        address || null,
        bloodType || null,
        heightCm || null,
        weightKg || null,
        emergencyContact || null,
        insurance || null,
        serializeListField(allergies),
        serializeListField(chronicConditions),
        serializeListField(medications),
        status || 'active',
        patientId,
        doctorId
      ]
    );

    const updated = await get(
      `SELECT p.*, (
          SELECT visit_date FROM visits v
          WHERE v.patient_id = p.id
          ORDER BY v.visit_date DESC
          LIMIT 1
        ) AS last_visit_date
       FROM patients p
       WHERE p.id = ? AND p.doctor_id = ?`,
      [patientId, doctorId]
    );

    return res.json(parsePatientRow(updated));
  } catch (err) {
    console.error('Update patient error', err);
    return res.status(500).json({ message: 'Unable to update patient.' });
  }
});

app.delete('/api/patients/:id', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const patientId = Number(req.params.id);
    const result = await run('DELETE FROM patients WHERE id = ? AND doctor_id = ?', [patientId, doctorId]);
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Patient not found.' });
    }
    return res.json({ message: 'Patient deleted.' });
  } catch (err) {
    console.error('Delete patient error', err);
    return res.status(500).json({ message: 'Unable to delete patient.' });
  }
});

app.get('/api/patients/:id/visits', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const patientId = Number(req.params.id);
    const visits = await all('SELECT * FROM visits WHERE patient_id = ? AND doctor_id = ? ORDER BY visit_date DESC', [patientId, doctorId]);
    return res.json(visits.map(parseVisitRow));
  } catch (err) {
    console.error('List visits error', err);
    return res.status(500).json({ message: 'Unable to load visits.' });
  }
});

app.post('/api/patients/:id/visits', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const patientId = Number(req.params.id);
    const patient = await get('SELECT id FROM patients WHERE id = ? AND doctor_id = ?', [patientId, doctorId]);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const {
      visitDate,
      vitals,
      chiefComplaint,
      hpi,
      reviewOfSystems,
      physicalExam,
      diagnosis,
      treatmentPlan,
      doctorSummary,
      status,
      nextAppointmentDate,
      nextAppointmentReason,
      nextAppointmentNotes
    } = req.body;

    const result = await run(
      `INSERT INTO visits (
        doctor_id, patient_id, visit_date, vitals_json, chief_complaint, hpi, ros_json, physical_exam_json,
        diagnosis, treatment_plan, doctor_summary, status, next_appointment_date, next_appointment_reason, next_appointment_notes
      ) VALUES (?, ?, COALESCE(?, NOW()), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        doctorId,
        patientId,
        visitDate || null,
        vitals ? JSON.stringify(vitals) : null,
        chiefComplaint || null,
        hpi || null,
        reviewOfSystems ? JSON.stringify(reviewOfSystems) : null,
        physicalExam ? JSON.stringify(physicalExam) : null,
        diagnosis || null,
        treatmentPlan || null,
        doctorSummary || null,
        status || 'in-progress',
        nextAppointmentDate || null,
        nextAppointmentReason || null,
        nextAppointmentNotes || null
      ]
    );

    const visit = await get('SELECT * FROM visits WHERE id = ?', [result.lastID]);
    return res.status(201).json(parseVisitRow(visit));
  } catch (err) {
    console.error('Create visit error', err);
    return res.status(500).json({ message: 'Unable to save visit.' });
  }
});

app.put('/api/visits/:id', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const visitId = Number(req.params.id);
    const visit = await get('SELECT * FROM visits WHERE id = ? AND doctor_id = ?', [visitId, doctorId]);
    if (!visit) {
      return res.status(404).json({ message: 'Visit not found.' });
    }

    const {
      vitals,
      chiefComplaint,
      hpi,
      reviewOfSystems,
      physicalExam,
      diagnosis,
      treatmentPlan,
      doctorSummary,
      status,
      nextAppointmentDate,
      nextAppointmentReason,
      nextAppointmentNotes
    } = req.body;

    await run(
      `UPDATE visits SET
        vitals_json = COALESCE(?, vitals_json),
        chief_complaint = COALESCE(?, chief_complaint),
        hpi = COALESCE(?, hpi),
        ros_json = COALESCE(?, ros_json),
        physical_exam_json = COALESCE(?, physical_exam_json),
        diagnosis = COALESCE(?, diagnosis),
        treatment_plan = COALESCE(?, treatment_plan),
        doctor_summary = COALESCE(?, doctor_summary),
        status = COALESCE(?, status),
        next_appointment_date = COALESCE(?, next_appointment_date),
        next_appointment_reason = COALESCE(?, next_appointment_reason),
        next_appointment_notes = COALESCE(?, next_appointment_notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND doctor_id = ?`,
      [
        vitals ? JSON.stringify(vitals) : null,
        chiefComplaint || null,
        hpi || null,
        reviewOfSystems ? JSON.stringify(reviewOfSystems) : null,
        physicalExam ? JSON.stringify(physicalExam) : null,
        diagnosis || null,
        treatmentPlan || null,
        doctorSummary !== undefined ? doctorSummary : null,
        status || null,
        nextAppointmentDate || null,
        nextAppointmentReason || null,
        nextAppointmentNotes || null,
        visitId,
        doctorId
      ]
    );

    const updated = await get('SELECT * FROM visits WHERE id = ?', [visitId]);
    return res.json(parseVisitRow(updated));
  } catch (err) {
    console.error('Update visit error', err);
    return res.status(500).json({ message: 'Unable to update visit.' });
  }
});

app.post('/api/visits/:id/complete', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const visitId = Number(req.params.id);
    const visit = await get('SELECT id FROM visits WHERE id = ? AND doctor_id = ?', [visitId, doctorId]);
    if (!visit) {
      return res.status(404).json({ message: 'Visit not found.' });
    }

    await run("UPDATE visits SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [visitId]);
    const updated = await get('SELECT * FROM visits WHERE id = ?', [visitId]);
    return res.json(parseVisitRow(updated));
  } catch (err) {
    console.error('Complete visit error', err);
    return res.status(500).json({ message: 'Unable to complete visit.' });
  }
});

app.get('/api/visits/:id', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const visitId = Number(req.params.id);
    const visit = await get('SELECT * FROM visits WHERE id = ? AND doctor_id = ?', [visitId, doctorId]);
    if (!visit) {
      return res.status(404).json({ message: 'Visit not found.' });
    }
    return res.json(parseVisitRow(visit));
  } catch (err) {
    console.error('Get visit error', err);
    return res.status(500).json({ message: 'Unable to load visit.' });
  }
});

app.get('/api/pharmacy/items', authenticateToken, async (req, res) => {
  try {
    const items = await all('SELECT id, name, category FROM pharmacy_items ORDER BY name ASC');
    return res.json(items);
  } catch (err) {
    console.error('List pharmacy items error', err);
    return res.status(500).json({ message: 'Unable to load medications.' });
  }
});

app.post('/api/patients/:id/prescriptions', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const patientId = Number(req.params.id);
    const patient = await get('SELECT id FROM patients WHERE id = ? AND doctor_id = ?', [patientId, doctorId]);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const {
      visitId,
      itemId,
      medicationName,
      dosage,
      frequency,
      duration,
      instructions
    } = req.body;

    if (!medicationName && !itemId) {
      return res.status(400).json({ message: 'Medication selection is required.' });
    }

    let finalName = medicationName;
    if (!finalName && itemId) {
      const item = await get('SELECT name FROM pharmacy_items WHERE id = ?', [itemId]);
      finalName = item ? item.name : null;
    }

    if (!finalName) {
      return res.status(400).json({ message: 'Medication name could not be determined.' });
    }

    const insert = await run(
      `INSERT INTO prescriptions (visit_id, patient_id, doctor_id, item_id, medication_name, dosage, frequency, duration, instructions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        visitId || null,
        patientId,
        doctorId,
        itemId || null,
        finalName,
        dosage || null,
        frequency || null,
        duration || null,
        instructions || null
      ]
    );

    const record = await get(
      `SELECT pr.*, pi.name AS item_name FROM prescriptions pr
       LEFT JOIN pharmacy_items pi ON pr.item_id = pi.id
       WHERE pr.id = ?`,
      [insert.lastID]
    );

    return res.status(201).json(parsePrescriptionRow(record));
  } catch (err) {
    console.error('Create prescription error', err);
    return res.status(500).json({ message: 'Unable to save prescription.' });
  }
});

app.get('/api/patients/:id/prescriptions', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const patientId = Number(req.params.id);
    const rows = await all(
      `SELECT pr.*, pi.name AS item_name FROM prescriptions pr
       LEFT JOIN pharmacy_items pi ON pr.item_id = pi.id
       WHERE pr.patient_id = ? AND pr.doctor_id = ?
       ORDER BY pr.created_at DESC`,
      [patientId, doctorId]
    );
    return res.json(rows.map(parsePrescriptionRow));
  } catch (err) {
    console.error('List prescriptions error', err);
    return res.status(500).json({ message: 'Unable to load prescriptions.' });
  }
});

app.delete('/api/prescriptions/:id', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const prescriptionId = Number(req.params.id);
    const result = await run('DELETE FROM prescriptions WHERE id = ? AND doctor_id = ?', [prescriptionId, doctorId]);
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Prescription not found.' });
    }
    return res.json({ message: 'Prescription removed.' });
  } catch (err) {
    console.error('Delete prescription error', err);
    return res.status(500).json({ message: 'Unable to delete prescription.' });
  }
});

app.get('/api/labs/tests', authenticateToken, async (req, res) => {
  try {
    const rows = await all('SELECT id, name, category FROM lab_tests ORDER BY category, name');
    return res.json(rows);
  } catch (err) {
    console.error('List lab tests error', err);
    return res.status(500).json({ message: 'Unable to load lab tests.' });
  }
});

app.post('/api/patients/:id/lab-orders', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const patientId = Number(req.params.id);
    const patient = await get('SELECT id FROM patients WHERE id = ? AND doctor_id = ?', [patientId, doctorId]);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const { visitId, tests, priority, notes } = req.body;
    if (!Array.isArray(tests) || tests.length === 0) {
      return res.status(400).json({ message: 'At least one test must be selected.' });
    }

    const created = [];
    for (const test of tests) {
      const testId = test.testId || null;
      let testName = test.testName || null;
      if (testId && !testName) {
        const ref = await get('SELECT name FROM lab_tests WHERE id = ?', [testId]);
        testName = ref ? ref.name : null;
      }
      if (!testName) {
        continue;
      }
      const insert = await run(
        `INSERT INTO lab_orders (patient_id, doctor_id, visit_id, test_id, test_name, priority, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)` ,
        [patientId, doctorId, visitId || null, testId, testName, priority || null, notes || null]
      );
      const order = await get('SELECT * FROM lab_orders WHERE id = ?', [insert.lastID]);
      created.push(parseOrderRow(order));
    }

    return res.status(201).json(created);
  } catch (err) {
    console.error('Create lab order error', err);
    return res.status(500).json({ message: 'Unable to create lab orders.' });
  }
});

app.get('/api/patients/:id/lab-orders', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const patientId = Number(req.params.id);
    const orders = await all(
      `SELECT lo.*, CONCAT_WS(' ', lu.first_name, lu.last_name) AS lab_verified_name
         FROM lab_orders lo
         LEFT JOIN lab_users lu ON lu.id = lo.verified_by
        WHERE lo.patient_id = ? AND lo.doctor_id = ?
        ORDER BY lo.ordered_at DESC`,
      [patientId, doctorId]
    );
    return res.json(orders.map(parseOrderRow));
  } catch (err) {
    console.error('List lab orders error', err);
    return res.status(500).json({ message: 'Unable to load lab orders.' });
  }
});

app.put('/api/lab-orders/:id', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const orderId = Number(req.params.id);
    const order = await get('SELECT * FROM lab_orders WHERE id = ? AND doctor_id = ?', [orderId, doctorId]);
    if (!order) {
      return res.status(404).json({ message: 'Lab order not found.' });
    }

    const { status, result, resultDate, notes } = req.body;
    await run(
      `UPDATE lab_orders SET
        status = COALESCE(?, status),
        result = COALESCE(?, result),
        result_date = COALESCE(?, result_date),
        notes = COALESCE(?, notes)
       WHERE id = ? AND doctor_id = ?`,
      [status || null, result || null, resultDate || null, notes || null, orderId, doctorId]
    );

    const updated = await get(
      `SELECT lo.*, CONCAT_WS(' ', lu.first_name, lu.last_name) AS lab_verified_name
         FROM lab_orders lo
         LEFT JOIN lab_users lu ON lu.id = lo.verified_by
        WHERE lo.id = ?`,
      [orderId]
    );
    return res.json(parseOrderRow(updated));
  } catch (err) {
    console.error('Update lab order error', err);
    return res.status(500).json({ message: 'Unable to update lab order.' });
  }
});

app.get('/api/radiology/tests', authenticateToken, async (req, res) => {
  try {
    const rows = await all('SELECT id, name, category FROM radiology_tests ORDER BY category, name');
    return res.json(rows);
  } catch (err) {
    console.error('List radiology tests error', err);
    return res.status(500).json({ message: 'Unable to load radiology tests.' });
  }
});

app.post('/api/patients/:id/radiology-orders', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const patientId = Number(req.params.id);
    const patient = await get('SELECT id FROM patients WHERE id = ? AND doctor_id = ?', [patientId, doctorId]);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const { visitId, tests, priority, notes } = req.body;
    if (!Array.isArray(tests) || tests.length === 0) {
      return res.status(400).json({ message: 'At least one test must be selected.' });
    }

    const created = [];
    for (const test of tests) {
      const testId = test.testId || null;
      let testName = test.testName || null;
      if (testId && !testName) {
        const ref = await get('SELECT name FROM radiology_tests WHERE id = ?', [testId]);
        testName = ref ? ref.name : null;
      }
      if (!testName) {
        continue;
      }
      const insert = await run(
        `INSERT INTO radiology_orders (patient_id, doctor_id, visit_id, test_id, test_name, priority, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)` ,
        [patientId, doctorId, visitId || null, testId, testName, priority || null, notes || null]
      );
      const order = await get('SELECT * FROM radiology_orders WHERE id = ?', [insert.lastID]);
      created.push(parseOrderRow(order));
    }

    return res.status(201).json(created);
  } catch (err) {
    console.error('Create radiology order error', err);
    return res.status(500).json({ message: 'Unable to create radiology orders.' });
  }
});

app.get('/api/patients/:id/radiology-orders', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const patientId = Number(req.params.id);
    const orders = await all('SELECT * FROM radiology_orders WHERE patient_id = ? AND doctor_id = ? ORDER BY ordered_at DESC', [patientId, doctorId]);
    return res.json(orders.map(parseOrderRow));
  } catch (err) {
    console.error('List radiology orders error', err);
    return res.status(500).json({ message: 'Unable to load radiology orders.' });
  }
});

app.put('/api/radiology-orders/:id', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const orderId = Number(req.params.id);
    const order = await get('SELECT * FROM radiology_orders WHERE id = ? AND doctor_id = ?', [orderId, doctorId]);
    if (!order) {
      return res.status(404).json({ message: 'Radiology order not found.' });
    }

    const { status, result, resultDate, notes } = req.body;
    await run(
      `UPDATE radiology_orders SET
        status = COALESCE(?, status),
        result = COALESCE(?, result),
        result_date = COALESCE(?, result_date),
        notes = COALESCE(?, notes)
       WHERE id = ? AND doctor_id = ?`,
      [status || null, result || null, resultDate || null, notes || null, orderId, doctorId]
    );

    const updated = await get('SELECT * FROM radiology_orders WHERE id = ?', [orderId]);
    return res.json(parseOrderRow(updated));
  } catch (err) {
    console.error('Update radiology order error', err);
    return res.status(500).json({ message: 'Unable to update radiology order.' });
  }
});

app.post('/api/patients/:id/appointments', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const patientId = Number(req.params.id);
    const patient = await get('SELECT id FROM patients WHERE id = ? AND doctor_id = ?', [patientId, doctorId]);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const { visitId, scheduledAt, reason, notes, status } = req.body;
    if (!scheduledAt) {
      return res.status(400).json({ message: 'Appointment date/time is required.' });
    }

    const insert = await run(
      `INSERT INTO appointments (patient_id, doctor_id, visit_id, scheduled_at, reason, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)` ,
      [patientId, doctorId, visitId || null, scheduledAt, reason || null, notes || null, status || 'scheduled']
    );

    const appointment = await get('SELECT * FROM appointments WHERE id = ?', [insert.lastID]);
    return res.status(201).json(parseAppointmentRow(appointment));
  } catch (err) {
    console.error('Create appointment error', err);
    return res.status(500).json({ message: 'Unable to create appointment.' });
  }
});

app.get('/api/patients/:id/appointments', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const patientId = Number(req.params.id);
    const appointments = await all('SELECT * FROM appointments WHERE patient_id = ? AND doctor_id = ? ORDER BY scheduled_at DESC', [patientId, doctorId]);
    return res.json(appointments.map(parseAppointmentRow));
  } catch (err) {
    console.error('List appointments error', err);
    return res.status(500).json({ message: 'Unable to load appointments.' });
  }
});

app.put('/api/appointments/:id', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const appointmentId = Number(req.params.id);
    const appointment = await get('SELECT * FROM appointments WHERE id = ? AND doctor_id = ?', [appointmentId, doctorId]);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    const { scheduledAt, reason, notes, status } = req.body;
    await run(
      `UPDATE appointments SET
        scheduled_at = COALESCE(?, scheduled_at),
        reason = COALESCE(?, reason),
        notes = COALESCE(?, notes),
        status = COALESCE(?, status)
       WHERE id = ? AND doctor_id = ?`,
      [scheduledAt || null, reason || null, notes || null, status || null, appointmentId, doctorId]
    );

    const updated = await get('SELECT * FROM appointments WHERE id = ?', [appointmentId]);
    return res.json(parseAppointmentRow(updated));
  } catch (err) {
    console.error('Update appointment error', err);
    return res.status(500).json({ message: 'Unable to update appointment.' });
  }
});

app.get('/api/queue', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const queue = await all(
      `SELECT a.*, p.first_name, p.last_name, p.date_of_birth
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       WHERE a.doctor_id = ?
         AND a.status = 'scheduled'
         AND a.scheduled_at >= NOW()
       ORDER BY a.scheduled_at ASC
       LIMIT 10`,
      [doctorId]
    );

    const mapped = queue.map((row) => ({
      id: row.id,
      patientId: row.patient_id,
      patientName: `${row.first_name} ${row.last_name}`.trim(),
      scheduledAt: row.scheduled_at,
      reason: row.reason,
      notes: row.notes,
      status: row.status
    }));

    return res.json(mapped);
  } catch (err) {
    console.error('Queue error', err);
    return res.status(500).json({ message: 'Unable to load queue.' });
  }
});

app.delete('/api/appointments/:id', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const appointmentId = Number(req.params.id);
    const result = await run('DELETE FROM appointments WHERE id = ? AND doctor_id = ?', [appointmentId, doctorId]);
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }
    return res.json({ message: 'Appointment removed.' });
  } catch (err) {
    console.error('Delete appointment error', err);
    return res.status(500).json({ message: 'Unable to delete appointment.' });
  }
});

app.get('/api/patients/:id/export-bdt', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const patientId = Number(req.params.id);

    const comprehensiveData = await getComprehensivePatientData(patientId, doctorId);

    if (!comprehensiveData) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `patient_${patientId}_${timestamp}.bdt`;

    const outputDir = path.join(__dirname, 'exports', 'bdt');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, filename);

    await bdtGenerator.generateBDTFile(comprehensiveData, outputPath);

    return res.json({
      success: true,
      message: 'BDT file generated successfully',
      filename,
      filepath: outputPath,
      patient: {
        id: comprehensiveData.patient.id,
        name: `${comprehensiveData.patient.firstName} ${comprehensiveData.patient.lastName}`.trim()
      },
      stats: {
        visits: comprehensiveData.visits.length,
        prescriptions: comprehensiveData.prescriptions.length,
        labOrders: comprehensiveData.labOrders.length,
        radiologyOrders: comprehensiveData.radiologyOrders.length
      }
    });
  } catch (err) {
    console.error('BDT export error:', err);
    return res.status(500).json({
      message: 'Unable to generate BDT file.',
      error: err.message
    });
  }
});

// --- FHIR ENDPOINT ---
app.get('/api/fhir/Patient/:id/$everything', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const patientId = Number(req.params.id);

    // Reuse your existing data fetcher!
    const comprehensiveData = await getComprehensivePatientData(patientId, doctorId);

    if (!comprehensiveData) {
      return res.status(404).json({
        resourceType: "OperationOutcome",
        issue: [{ severity: "error", code: "not-found", diagnostics: "Patient not found" }]
      });
    }

    // Generate the FHIR Bundle
    const fhirBundle = fhirGenerator.generateBundle(comprehensiveData);

    return res.json(fhirBundle);

  } catch (err) {
    console.error('FHIR export error:', err);
    return res.status(500).json({
      resourceType: "OperationOutcome",
      issue: [{ severity: "error", code: "exception", diagnostics: err.message }]
    });
  }
});

app.post('/api/patients/:id/ai-summary', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const patientId = Number(req.params.id);

    const comprehensiveData = await getComprehensivePatientData(patientId, doctorId);

    if (!comprehensiveData) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `patient_${patientId}_${timestamp}.bdt`;

    const exchangeDir = resolveExchangeDir();
    if (!fs.existsSync(exchangeDir)) {
      fs.mkdirSync(exchangeDir, { recursive: true });
    }

    const bdtPath = path.join(exchangeDir, filename);

    await bdtGenerator.generateBDTFile(comprehensiveData, bdtPath);

    const canonicalBdtPath = path.join(exchangeDir, 'patient_export.bdt');
    try {
      fs.copyFileSync(bdtPath, canonicalBdtPath);
    } catch (copyErr) {
      console.warn('⚠️  Unable to mirror BDT file to patient_export.bdt:', copyErr.message);
    }

    const triggerPath = path.join(exchangeDir, 'patient_export.gdt');
    const gdtLines = [
      bdtGenerator.formatField('8000', '6302'),
      bdtGenerator.formatField('3000', patientId.toString()),
      bdtGenerator.formatField('3101', comprehensiveData.patient.lastName),
      bdtGenerator.formatField('3102', comprehensiveData.patient.firstName),
      bdtGenerator.formatField('3103', bdtGenerator.formatDate(comprehensiveData.patient.dateOfBirth)),
      bdtGenerator.formatField('6500', 'BDT_FILE:patient_export.bdt')
    ];

    const appendGdtValue = (label) => {
      if (!label) {
        return;
      }
      const text = label.toString().trim();
      if (!text) {
        return;
      }
      const record = `${String(text.length + 7).padStart(3, '0')}6200${text}`;
      gdtLines.push(record);
    };

    const diagnoses = new Set();
    comprehensiveData.visits.forEach((visit) => {
      if (visit && visit.diagnosis) {
        diagnoses.add(`DX: ${visit.diagnosis}`);
      }
    });
    const chronicConditions = Array.isArray(comprehensiveData.patient?.chronicConditions)
      ? comprehensiveData.patient.chronicConditions
      : [];
    chronicConditions.forEach((condition) => {
      const text = typeof condition === 'string'
        ? condition
        : (condition?.name || condition?.diagnosis || JSON.stringify(condition));
      if (text) {
        diagnoses.add(`DX: ${text}`);
      }
    });

    Array.from(diagnoses).slice(0, 15).forEach(appendGdtValue);

    const prescriptions = Array.isArray(comprehensiveData.prescriptions)
      ? comprehensiveData.prescriptions
      : [];
    prescriptions.slice(0, 15).forEach((rx) => {
      if (!rx) {
        return;
      }
      const pieces = [rx.medicationName || rx.medication_name || rx.item || rx.item_name];
      if (rx.dosage) {
        pieces.push(`Dosage: ${rx.dosage}`);
      }
      if (rx.frequency) {
        pieces.push(`Frequency: ${rx.frequency}`);
      }
      if (rx.duration) {
        pieces.push(`Duration: ${rx.duration}`);
      }
      const summary = pieces.filter(Boolean).join(' | ');
      if (summary) {
        appendGdtValue(`RX: ${summary}`);
      }
    });

    const labOrders = Array.isArray(comprehensiveData.labOrders)
      ? comprehensiveData.labOrders
      : [];
    labOrders.slice(0, 15).forEach((lab) => {
      if (!lab) {
        return;
      }
      const status = lab.status ? lab.status.toUpperCase() : null;
      const result = lab.result || null;
      const ordered = lab.orderedAt || lab.ordered_at || null;
      const orderedDate = ordered ? new Date(ordered).toISOString().split('T')[0] : null;
      const summaryParts = [
        lab.testName || lab.test_name,
        status ? `Status: ${status}` : null,
        result ? `Result: ${result}` : null,
        orderedDate ? `Date: ${orderedDate}` : null
      ].filter(Boolean);
      if (summaryParts.length) {
        appendGdtValue(`LAB: ${summaryParts.join(' | ')}`);
      }
    });

    fs.writeFileSync(triggerPath, gdtLines.join('\r\n') + '\r\n', { encoding: 'latin1' });

    console.log(`✅ BDT file generated: ${bdtPath}`);
    console.log(`✅ BDT mirror written: ${canonicalBdtPath}`);
    console.log(`✅ Trigger file written: ${triggerPath}`);

    return res.json({
      success: true,
      message: 'BDT file generated and AI analysis triggered',
      bdtFile: filename,
      bdtPath,
      patient: {
        id: comprehensiveData.patient.id,
        name: `${comprehensiveData.patient.firstName} ${comprehensiveData.patient.lastName}`.trim()
      }
    });
  } catch (err) {
    console.error('AI summary trigger error:', err);
    return res.status(500).json({
      message: 'Unable to trigger AI summary.',
      error: err.message
    });
  }
});

// ==========================================
// 🏥 MEDICAL FORMS ENDPOINTS (Migrated from medatixx)
// ==========================================

// Serve frontend assets
app.use(express.static(path.join(__dirname, '..')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`EHR server listening on port ${PORT}`);
});