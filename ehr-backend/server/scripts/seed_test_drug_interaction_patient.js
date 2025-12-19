const bcrypt = require('bcryptjs');
const { initializeDatabase, get, run } = require('../db');

const DOCTOR_EMAIL = 'samuel.onyango@ehr.local';

// Test patient for drug interaction detection
const patientProfile = {
  firstName: 'Michael',
  lastName: 'Omondi',
  gender: 'male',
  dateOfBirth: '1985-06-15',
  email: 'michael.omondi@example.com',
  phone: '+254722334455',
  address: '23 Kimathi Street, Nairobi',
  bloodType: 'B+',
  heightCm: 175,
  weightKg: 78,
  emergencyContact: 'Sarah Omondi (+254722334456)',
  insurance: 'NHIF Standard',
  allergies: ['Sulfa drugs'],
  chronicConditions: [],
  medications: []
};

const visits = [
  // Visit 1 - Flu (9 months ago)
  {
    visitDate: '2024-03-05 10:15:00',
    chiefComplaint: 'Flu-like symptoms with fever and body aches',
    hpi: 'Patient presents with 2-day history of fever (38.5°C), generalized body aches, headache, and mild sore throat. No cough or shortness of breath. Reports adequate fluid intake.',
    reviewOfSystems: {
      General: 'Fever, malaise, body aches',
      HEENT: 'Mild sore throat, no nasal congestion',
      Respiratory: 'No cough, normal breathing',
      Cardiovascular: 'No chest pain or palpitations'
    },
    physicalExam: {
      General: 'Appears mildly ill, alert and oriented',
      Vitals: 'BP 118/76 mmHg, HR 88 bpm, Temp 38.5°C, RR 16/min',
      HEENT: 'Mild pharyngeal erythema, no tonsillar enlargement',
      Lungs: 'Clear to auscultation bilaterally'
    },
    diagnosis: 'Acute viral upper respiratory tract infection (Common flu)',
    treatmentPlan: 'Rest, adequate hydration, symptomatic treatment. Advised to return if symptoms worsen or persist beyond 7 days.',
    vitals: { bloodPressure: '118/76', pulse: '88', temperature: '38.5', respiratory: '16', oxygenSaturation: '98%', weight: '78 kg' },
    status: 'completed',
    prescriptions: [
      { name: 'Paracetamol 500mg Tablet', dosage: '500mg', frequency: 'Every 6 hours as needed', duration: '5 days', instructions: 'Take for fever and pain relief' }
    ]
  },

  // Visit 2 - Migraine (8 months ago)
  {
    visitDate: '2024-04-10 14:30:00',
    chiefComplaint: 'Severe headache with sensitivity to light',
    hpi: 'Patient reports severe unilateral headache (right side) that started this morning. Associated with photophobia and mild nausea. No visual disturbances. Has had similar episodes in the past, approximately once every 2-3 months.',
    reviewOfSystems: {
      Neurological: 'Severe right-sided headache, photophobia, no visual aura',
      GI: 'Mild nausea, no vomiting',
      General: 'No fever'
    },
    physicalExam: {
      General: 'Alert, appears uncomfortable due to headache',
      Vitals: 'BP 125/80 mmHg, HR 76 bpm, Temp 36.8°C',
      Neurological: 'Cranial nerves II-XII intact, no focal deficits, pupils equal and reactive'
    },
    diagnosis: 'Migraine without aura',
    treatmentPlan: 'Prescribed analgesic for acute episode. Advised to keep headache diary and identify triggers. Dark room and rest recommended.',
    vitals: { bloodPressure: '125/80', pulse: '76', temperature: '36.8', respiratory: '14', oxygenSaturation: '99%', weight: '78 kg' },
    status: 'completed',
    prescriptions: [
      { name: 'Ibuprofen 400mg Tablet', dosage: '400mg', frequency: 'Every 8 hours as needed', duration: '3 days', instructions: 'Take with food for headache' }
    ]
  },

  // Visit 3 - Food Poisoning (7 months ago)
  {
    visitDate: '2024-05-18 16:45:00',
    chiefComplaint: 'Vomiting and diarrhea after eating at a restaurant',
    hpi: 'Patient presents with acute onset vomiting and watery diarrhea starting 6 hours after eating seafood at a restaurant yesterday evening. Reports 5 episodes of vomiting and multiple loose stools. Mild abdominal cramping. No blood in stool.',
    reviewOfSystems: {
      GI: 'Vomiting, diarrhea, abdominal cramps',
      General: 'Mild weakness, no fever',
      Urinary: 'Decreased urine output due to fluid loss'
    },
    physicalExam: {
      General: 'Appears dehydrated but alert',
      Vitals: 'BP 110/70 mmHg, HR 92 bpm, Temp 37.2°C',
      Abdomen: 'Soft, mild diffuse tenderness, active bowel sounds, no rebound or guarding'
    },
    diagnosis: 'Acute gastroenteritis, likely food-borne illness',
    treatmentPlan: 'Oral rehydration therapy, bland diet when tolerated. Monitor for signs of severe dehydration. Return if symptoms persist beyond 48 hours or worsen.',
    vitals: { bloodPressure: '110/70', pulse: '92', temperature: '37.2', respiratory: '16', oxygenSaturation: '98%', weight: '76 kg' },
    status: 'completed',
    prescriptions: [
      { name: 'Oral Rehydration Salts', dosage: '1 sachet in 1L water', frequency: 'Sip frequently', duration: '3 days', instructions: 'For rehydration' },
      { name: 'Metoclopramide 10mg Tablet', dosage: '10mg', frequency: 'Three times daily', duration: '2 days', instructions: 'For nausea and vomiting' }
    ]
  },

  // Visit 4 - Back Pain (6 months ago)
  {
    visitDate: '2024-06-22 09:20:00',
    chiefComplaint: 'Lower back pain after lifting heavy objects',
    hpi: 'Patient reports acute onset lower back pain that started yesterday while lifting boxes at home. Pain is localized to lumbar region, worse with movement and bending. Rates pain as 6/10. No radiation to legs, no numbness or weakness.',
    reviewOfSystems: {
      Musculoskeletal: 'Lower back pain, muscle stiffness',
      Neurological: 'No radiculopathy, no bowel or bladder dysfunction'
    },
    physicalExam: {
      General: 'Alert, moves cautiously due to pain',
      Vitals: 'BP 122/78 mmHg, HR 74 bpm, Temp 36.9°C',
      Musculoskeletal: 'Tenderness over lumbar paraspinal muscles, no spinal deformity, straight leg raise negative bilaterally',
      Neurological: 'Normal lower extremity strength and sensation'
    },
    diagnosis: 'Acute lumbar muscle strain',
    treatmentPlan: 'Rest for 2-3 days, avoid heavy lifting. Heat application. Gentle stretching when pain improves. NSAIDs for pain relief.',
    vitals: { bloodPressure: '122/78', pulse: '74', temperature: '36.9', respiratory: '14', oxygenSaturation: '99%', weight: '78 kg' },
    status: 'completed',
    prescriptions: [
      { name: 'Diclofenac 50mg Tablet', dosage: '50mg', frequency: 'Twice daily after meals', duration: '5 days', instructions: 'For pain and inflammation' }
    ]
  },

  // Visit 5 - Fatigue (5 months ago)
  {
    visitDate: '2024-07-15 11:00:00',
    chiefComplaint: 'Persistent fatigue and lack of energy',
    hpi: 'Patient complains of persistent tiredness for the past 2 weeks. Reports adequate sleep (7-8 hours per night) but wakes up feeling unrefreshed. Denies any specific illness. Work stress and poor diet mentioned.',
    reviewOfSystems: {
      General: 'Fatigue, no weight loss',
      Cardiovascular: 'No chest pain or dyspnea',
      Psychiatric: 'Mild stress, no depression'
    },
    physicalExam: {
      General: 'Well-appearing, no acute distress',
      Vitals: 'BP 120/76 mmHg, HR 72 bpm, Temp 36.7°C',
      'General Exam': 'No pallor, no lymphadenopathy, thyroid normal'
    },
    diagnosis: 'Fatigue syndrome, likely related to stress and poor nutrition',
    treatmentPlan: 'Lifestyle modifications: regular exercise, balanced diet, stress management. Multivitamin supplementation. Follow-up if symptoms persist.',
    vitals: { bloodPressure: '120/76', pulse: '72', temperature: '36.7', respiratory: '14', oxygenSaturation: '99%', weight: '77 kg' },
    status: 'completed',
    prescriptions: [
      { name: 'Multivitamin Tablet', dosage: '1 tablet', frequency: 'Once daily', duration: '30 days', instructions: 'Take with breakfast' }
    ]
  },

  // Visit 6 - Allergic Rhinitis (4 months ago)
  {
    visitDate: '2024-08-08 15:15:00',
    chiefComplaint: 'Sneezing, runny nose, and itchy eyes',
    hpi: 'Patient presents with 3-day history of frequent sneezing, clear nasal discharge, and itchy, watery eyes. Symptoms worse in the morning. No fever. Similar episodes in the past during dusty seasons.',
    reviewOfSystems: {
      HEENT: 'Rhinorrhea, sneezing, itchy eyes',
      Respiratory: 'No cough or wheezing',
      General: 'No fever'
    },
    physicalExam: {
      General: 'Alert, frequent sneezing during exam',
      Vitals: 'BP 118/74 mmHg, HR 70 bpm, Temp 36.6°C',
      HEENT: 'Bilateral conjunctival injection, clear nasal discharge, pale nasal mucosa'
    },
    diagnosis: 'Allergic rhinitis',
    treatmentPlan: 'Antihistamine for symptom relief. Advised to avoid dust exposure, use of air purifiers if possible. Saline nasal spray for comfort.',
    vitals: { bloodPressure: '118/74', pulse: '70', temperature: '36.6', respiratory: '14', oxygenSaturation: '99%', weight: '77 kg' },
    status: 'completed',
    prescriptions: [
      { name: 'Cetirizine 10mg Tablet', dosage: '10mg', frequency: 'Once daily', duration: '7 days', instructions: 'Take in the evening for allergies' }
    ]
  },

  // Visit 7 - Gastritis (3 months ago)
  {
    visitDate: '2024-09-12 10:30:00',
    chiefComplaint: 'Upper abdominal pain and heartburn',
    hpi: 'Patient reports epigastric pain and burning sensation for the past week. Pain worse on empty stomach and after spicy foods. Denies vomiting or blood in stool. Has been taking NSAIDs occasionally for headaches.',
    reviewOfSystems: {
      GI: 'Epigastric pain, heartburn, no vomiting',
      General: 'No weight loss'
    },
    physicalExam: {
      General: 'Comfortable, no acute distress',
      Vitals: 'BP 124/78 mmHg, HR 76 bpm, Temp 36.8°C',
      Abdomen: 'Soft, mild epigastric tenderness, no hepatosplenomegaly'
    },
    diagnosis: 'Gastritis, likely NSAID-induced',
    treatmentPlan: 'Avoid NSAIDs, spicy foods, and caffeine. Proton pump inhibitor for 4 weeks. Small frequent meals. Return if symptoms persist or worsen.',
    vitals: { bloodPressure: '124/78', pulse: '76', temperature: '36.8', respiratory: '14', oxygenSaturation: '99%', weight: '78 kg' },
    status: 'completed',
    prescriptions: [
      { name: 'Omeprazole 20mg Capsule', dosage: '20mg', frequency: 'Once daily before breakfast', duration: '28 days', instructions: 'For gastric protection' }
    ]
  },

  // Visit 8 - Minor Injury (2 months ago)
  {
    visitDate: '2024-10-05 14:00:00',
    chiefComplaint: 'Right ankle sprain after twisting while playing football',
    hpi: 'Patient twisted right ankle while playing football yesterday. Immediate pain and swelling. Able to bear weight with discomfort. No audible pop. Applied ice at home.',
    reviewOfSystems: {
      Musculoskeletal: 'Right ankle pain and swelling'
    },
    physicalExam: {
      General: 'Alert, limping slightly',
      Vitals: 'BP 120/78 mmHg, HR 74 bpm, Temp 36.7°C',
      Musculoskeletal: 'Right ankle: mild swelling over lateral malleolus, tenderness over ATFL, negative drawer test, able to bear weight'
    },
    diagnosis: 'Grade I lateral ankle sprain (ATFL)',
    treatmentPlan: 'RICE protocol (Rest, Ice, Compression, Elevation). Ankle support bandage. Gradual weight bearing as tolerated. Avoid sports for 2 weeks.',
    vitals: { bloodPressure: '120/78', pulse: '74', temperature: '36.7', respiratory: '14', oxygenSaturation: '99%', weight: '78 kg' },
    status: 'completed',
    prescriptions: [
      { name: 'Ibuprofen 400mg Tablet', dosage: '400mg', frequency: 'Three times daily after meals', duration: '5 days', instructions: 'For pain and inflammation' }
    ]
  },

  // Visit 9 - SECOND LAST VISIT - Drug causing abnormal lab value (1 month ago)
  {
    visitDate: '2024-11-01 09:45:00',
    chiefComplaint: 'Follow-up for persistent headaches',
    hpi: 'Patient returns with complaints of frequent headaches over the past 3 weeks. Headaches are tension-type, bilateral, pressing quality. Occurring 4-5 times per week. Related to work stress. No visual disturbances or nausea.',
    reviewOfSystems: {
      Neurological: 'Bilateral headaches, no aura',
      Psychiatric: 'Increased work stress',
      General: 'No fever'
    },
    physicalExam: {
      General: 'Alert and oriented, appears stressed',
      Vitals: 'BP 128/82 mmHg, HR 78 bpm, Temp 36.8°C',
      Neurological: 'Normal cranial nerves, no focal deficits',
      Musculoskeletal: 'Neck muscle tension bilaterally'
    },
    diagnosis: 'Chronic tension-type headache',
    treatmentPlan: 'Started on prophylactic medication for frequent headaches. Stress management counseling. Regular exercise recommended. Order baseline liver function tests before starting medication.',
    vitals: { bloodPressure: '128/82', pulse: '78', temperature: '36.8', respiratory: '14', oxygenSaturation: '99%', weight: '78 kg' },
    status: 'completed',
    prescriptions: [
      { name: 'Amitriptyline 25mg Tablet', dosage: '25mg', frequency: 'Once daily at bedtime', duration: '30 days', instructions: 'For headache prevention. May cause drowsiness.' }
    ],
    labOrders: [
      {
        testName: 'ALT (Alanine Aminotransferase)',
        status: 'completed',
        priority: 'routine',
        result: '78 U/L',
        notes: 'Elevated - monitor for drug-induced hepatotoxicity',
        resultDate: '2024-11-02 10:00:00'
      },
      {
        testName: 'AST (Aspartate Aminotransferase)',
        status: 'completed',
        priority: 'routine',
        result: '82 U/L',
        notes: 'Elevated',
        resultDate: '2024-11-02 10:00:00'
      }
    ]
  },

  // Visit 10 - LAST VISIT - Serious Drug-Drug Interaction (Recent)
  {
    visitDate: '2024-11-25 11:30:00',
    chiefComplaint: 'Cough and suspected chest infection',
    hpi: 'Patient presents with 4-day history of productive cough with yellowish sputum. Mild fever yesterday (37.8°C). Some chest discomfort with coughing. No shortness of breath at rest. Still taking amitriptyline for headaches.',
    reviewOfSystems: {
      Respiratory: 'Productive cough, mild chest discomfort',
      General: 'Low-grade fever, mild fatigue',
      Cardiovascular: 'No palpitations'
    },
    physicalExam: {
      General: 'Alert, mild respiratory distress with coughing',
      Vitals: 'BP 126/80 mmHg, HR 84 bpm, Temp 37.6°C, RR 18/min, SpO2 97%',
      Respiratory: 'Bilateral air entry, coarse crackles in right lower lobe, no wheeze',
      Cardiovascular: 'Normal S1 S2, regular rhythm'
    },
    diagnosis: 'Acute bronchitis with suspected bacterial superinfection',
    treatmentPlan: 'Antibiotic therapy for suspected bacterial infection. Continue symptomatic treatment. Adequate hydration. Review in 5 days if no improvement.',
    vitals: { bloodPressure: '126/80', pulse: '84', temperature: '37.6', respiratory: '18', oxygenSaturation: '97%', weight: '78 kg' },
    status: 'completed',
    prescriptions: [
      { name: 'Azithromycin 500mg Tablet', dosage: '500mg', frequency: 'Once daily', duration: '3 days', instructions: 'Take on empty stomach for infection' },
      { name: 'Amitriptyline 25mg Tablet', dosage: '25mg', frequency: 'Once daily at bedtime', duration: '30 days', instructions: 'Continue for headache prevention' }
    ]
  }
];

async function seedPatient() {
  console.log('Starting drug interaction test patient seeding...\n');
  
  await initializeDatabase();
  
  // Get doctor
  const doctor = await get('SELECT id FROM doctors WHERE email = ?', [DOCTOR_EMAIL]);
  
  if (!doctor) {
    console.error('❌ Doctor not found. Please run seed_chronic_patients.js first.');
    return;
  }
  
  const doctorId = doctor.id;
  console.log(`✅ Found doctor (ID: ${doctorId})\n`);
  
  // Create patient
  const patientResult = await run(`
    INSERT INTO patients (
      doctor_id, first_name, last_name, date_of_birth, gender, email, phone,
      address, blood_type, height_cm, weight_kg, emergency_contact, insurance,
      allergies, chronic_conditions, medications, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())
  `, [
    doctorId,
    patientProfile.firstName,
    patientProfile.lastName,
    patientProfile.dateOfBirth,
    patientProfile.gender,
    patientProfile.email,
    patientProfile.phone,
    patientProfile.address,
    patientProfile.bloodType,
    patientProfile.heightCm,
    patientProfile.weightKg,
    patientProfile.emergencyContact,
    patientProfile.insurance,
    JSON.stringify(patientProfile.allergies),
    JSON.stringify(patientProfile.chronicConditions),
    JSON.stringify(patientProfile.medications)
  ]);
  
  const patientId = patientResult.lastID;
  console.log(`✅ Created patient: ${patientProfile.firstName} ${patientProfile.lastName} (ID: ${patientId})\n`);
  
  // Create visits with prescriptions and lab orders
  for (const visit of visits) {
    const visitResult = await run(`
      INSERT INTO visits (
        doctor_id, patient_id, visit_date, vitals_json, chief_complaint, hpi,
        ros_json, physical_exam_json, diagnosis, treatment_plan, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      doctorId,
      patientId,
      visit.visitDate,
      JSON.stringify(visit.vitals),
      visit.chiefComplaint,
      visit.hpi,
      JSON.stringify(visit.reviewOfSystems),
      JSON.stringify(visit.physicalExam),
      visit.diagnosis,
      visit.treatmentPlan,
      visit.status
    ]);
    
    const visitId = visitResult.lastID;
    console.log(`  📋 Visit: ${visit.visitDate} - ${visit.diagnosis}`);
    
    // Add prescriptions
    if (visit.prescriptions) {
      for (const rx of visit.prescriptions) {
        await run(`
          INSERT INTO prescriptions (
            visit_id, patient_id, doctor_id, medication_name, dosage, frequency, duration, instructions, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [visitId, patientId, doctorId, rx.name, rx.dosage, rx.frequency, rx.duration, rx.instructions]);
        
        console.log(`     💊 ${rx.name}`);
      }
    }
    
    // Add lab orders (for visit 9)
    if (visit.labOrders) {
      for (const lab of visit.labOrders) {
        await run(`
          INSERT INTO lab_orders (
            patient_id, doctor_id, visit_id, test_name, status, priority, notes, result, result_date, ordered_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [patientId, doctorId, visitId, lab.testName, lab.status, lab.priority, lab.notes, lab.result, lab.resultDate]);
        
        console.log(`     🧪 ${lab.testName}: ${lab.result} (${lab.status})`);
      }
    }
    
    console.log('');
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Test patient seeding complete!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Patient: ${patientProfile.firstName} ${patientProfile.lastName}`);
  console.log(`Total Visits: ${visits.length}`);
  console.log(`\n🔍 KEY TEST SCENARIOS:`);
  console.log(`  1. Visit 9: Amitriptyline causing elevated liver enzymes (ALT/AST)`);
  console.log(`  2. Visit 10: Amitriptyline + Azithromycin = QT prolongation risk (SERIOUS DDI)`);
  console.log(`\n⚠️  Expected AI Alerts:`);
  console.log(`  - Drug-Drug Interaction: Amitriptyline + Azithromycin (HIGH RISK)`);
  console.log(`  - Drug-Induced Lab Effect: Amitriptyline → Elevated liver enzymes`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

seedPatient()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
