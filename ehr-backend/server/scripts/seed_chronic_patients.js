const bcrypt = require('bcryptjs');
const { initializeDatabase, get, run } = require('../db');

const doctorProfile = {
  firstName: 'Samuel',
  lastName: 'Onyango',
  email: 'samuel.onyango@ehr.local',
  licenseNumber: 'KEN-456789',
  specialty: 'Internal Medicine'
};

const patients = [
  {
    firstName: 'Alice',
    lastName: 'Mwangi',
    gender: 'female',
    dateOfBirth: '1975-03-14',
    email: 'alice.mwangi@example.com',
    phone: '+254700111001',
    address: '9 Riverside Drive, Nairobi',
    bloodType: 'A+',
    heightCm: 165,
    weightKg: 72,
    emergencyContact: 'Peter Mwangi (+254700111002)',
    insurance: 'NHIF Platinum',
    allergies: ['Penicillin'],
    chronicConditions: ['Type 2 Diabetes Mellitus', 'Hypertension'],
    medications: ['Metformin 1000mg Tablet', 'Amlodipine 5mg Tablet', 'Atorvastatin 20mg Tablet'],
    visits: [
      {
        visitDate: '2024-11-12 09:30:00',
        chiefComplaint: 'Routine diabetes and blood pressure review',
        hpi: 'Reports good adherence to medication, occasional nocturia, no hypoglycemic episodes.',
        reviewOfSystems: {
          General: 'No weight loss, appetite preserved',
          Cardiovascular: 'No chest pain or palpitations',
          Endocrine: 'Polyuria improved since last visit'
        },
        physicalExam: {
          Vitals: 'BP 128/82 mmHg, HR 72 bpm',
          Cardiovascular: 'Normal S1 S2, no murmurs',
          Extremities: 'No pedal edema'
        },
        diagnosis: 'Type 2 Diabetes Mellitus with Hypertension',
        treatmentPlan: 'Continue metformin and amlodipine. Reinforce low-sodium diet and daily walks.',
        vitals: { bloodPressure: '128/82', pulse: '72', temperature: '36.7', respiratory: '15', oxygenSaturation: '98%', weight: '72 kg' },
        status: 'completed',
        nextAppointment: {
          date: '2025-02-12 09:00:00',
          reason: 'Quarterly diabetes follow-up',
          notes: 'Repeat HbA1c prior to visit.'
        }
      },
      {
        visitDate: '2022-06-15 10:15:00',
        chiefComplaint: 'Poor fasting glucose readings',
        hpi: 'Fasting glucose averaging 160 mg/dL. Diet compliance moderate.',
        reviewOfSystems: {
          Eyes: 'No blurred vision',
          Neurologic: 'No neuropathic symptoms',
          Cardiovascular: 'Occasional headaches when stressed'
        },
        physicalExam: {
          General: 'Overweight, no acute distress',
          Cardiovascular: 'BP 142/88 mmHg, Grade 1 hypertensive changes',
          Feet: 'Sensation intact, no ulcers'
        },
        diagnosis: 'Type 2 Diabetes Mellitus - uncontrolled',
        treatmentPlan: 'Add evening insulin glargine 10u; schedule diabetes education.',
        vitals: { bloodPressure: '142/88', pulse: '78', temperature: '36.6', respiratory: '16', oxygenSaturation: '97%', weight: '75 kg' },
        status: 'completed'
      },
      {
        visitDate: '2020-01-20 08:45:00',
        chiefComplaint: 'New patient establishing care for diabetes',
        hpi: 'Diagnosed 2 years ago, currently on metformin only.',
        reviewOfSystems: {
          General: 'Mild fatigue',
          Endocrine: 'Polyuria and polydipsia present',
          Cardiovascular: 'No dyspnea on exertion'
        },
        physicalExam: {
          General: 'BMI 27',
          Cardiovascular: 'BP 150/95 mmHg',
          Abdomen: 'Soft, non-tender'
        },
        diagnosis: 'Type 2 Diabetes Mellitus, Hypertension',
        treatmentPlan: 'Initiate amlodipine, refer to nutritionist, begin exercise program.',
        vitals: { bloodPressure: '150/95', pulse: '84', temperature: '36.8', respiratory: '18', oxygenSaturation: '98%', weight: '78 kg' },
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Metformin 1000mg Tablet',
        dosage: '1000 mg',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Take with breakfast and dinner.',
        visitIndex: 0
      },
      {
        medicationName: 'Amlodipine 5mg Tablet',
        dosage: '5 mg',
        frequency: 'Once daily',
        duration: 'Continuous',
        instructions: 'Take every morning.',
        visitIndex: 0
      }
    ],
    labOrders: [
      {
        testName: 'HbA1c',
        priority: 'Routine',
        notes: 'Quarterly monitoring',
        orderedAt: '2024-11-12 10:00:00',
        result: '6.8 %',
        resultDate: '2024-11-14 08:00:00',
        status: 'completed',
        visitIndex: 0
      }
    ],
    appointments: [
      {
        scheduledAt: '2025-02-12 09:00:00',
        reason: 'Quarterly diabetes follow-up',
        notes: 'Repeat HbA1c before visit.',
        status: 'scheduled',
        visitIndex: 0
      }
    ]
  },
  {
    firstName: 'Brian',
    lastName: 'Ochieng',
    gender: 'male',
    dateOfBirth: '1968-07-22',
    email: 'brian.ochieng@example.com',
    phone: '+254700222112',
    address: '47 Mombasa Road, Nairobi',
    bloodType: 'B+',
    heightCm: 178,
    weightKg: 85,
    emergencyContact: 'Lucy Ochieng (+254700222113)',
    insurance: 'Britam Comprehensive',
    allergies: ['Sulfa drugs'],
    chronicConditions: ['Chronic Systolic Heart Failure', 'Hypertension'],
    medications: ['Lisinopril 10mg Tablet', 'Carvedilol 12.5mg Tablet', 'Furosemide 40mg Tablet'],
    visits: [
      {
        visitDate: '2025-01-08 11:00:00',
        chiefComplaint: 'Follow-up for heart failure symptom control',
        hpi: 'Improved exercise tolerance, minimal orthopnea, compliant with fluid restriction.',
        reviewOfSystems: {
          Respiratory: 'Occasional exertional dyspnea only',
          Cardiovascular: 'No chest pain, no palpitations',
          Renal: 'No decreased urine output'
        },
        physicalExam: {
          General: 'Comfortable at rest',
          Cardiovascular: 'BP 118/75 mmHg, regular rhythm',
          Extremities: '1+ ankle edema'
        },
        diagnosis: 'Chronic Systolic Heart Failure - stable',
        treatmentPlan: 'Continue current regimen; increase carvedilol if BP tolerates in 3 months.',
        vitals: { bloodPressure: '118/75', pulse: '68', temperature: '36.5', respiratory: '18', oxygenSaturation: '96%', weight: '84 kg' },
        status: 'completed',
        nextAppointment: {
          date: '2025-04-08 10:30:00',
          reason: 'Heart failure clinic review',
          notes: 'Check NT-proBNP and renal profile prior.'
        }
      },
      {
        visitDate: '2022-09-10 14:20:00',
        chiefComplaint: 'Worsening ankle swelling and exertional dyspnea',
        hpi: 'Missed diuretic doses due to travel; shortness of breath on climbing stairs.',
        reviewOfSystems: {
          Respiratory: 'Paroxysmal nocturnal dyspnea x2 episodes',
          GI: 'Reduced appetite',
          Neuro: 'No syncope'
        },
        physicalExam: {
          General: 'Mild respiratory distress',
          Cardiovascular: 'BP 140/88 mmHg, S3 present',
          Lungs: 'Bibasal crackles',
          Extremities: '2+ pitting edema to mid-shin'
        },
        diagnosis: 'Acute decompensated heart failure',
        treatmentPlan: 'Increase furosemide to 80mg, counsel on adherence, schedule echo.',
        vitals: { bloodPressure: '140/88', pulse: '88', temperature: '37.0', respiratory: '22', oxygenSaturation: '94%', weight: '90 kg' },
        status: 'completed'
      },
      {
        visitDate: '2019-04-03 09:10:00',
        chiefComplaint: 'Initial evaluation for shortness of breath',
        hpi: 'Progressive dyspnea over 6 months, decreased exercise tolerance.',
        reviewOfSystems: {
          Cardiac: 'Orthopnea requiring two pillows',
          Respiratory: 'Chronic cough with frothy sputum',
          General: 'Unintentional 4 kg weight gain'
        },
        physicalExam: {
          Cardiovascular: 'BP 160/95 mmHg, displaced apex beat',
          Respiratory: 'Fine crackles at lung bases',
          Extremities: '3+ bilateral edema'
        },
        diagnosis: 'Chronic systolic heart failure due to hypertensive heart disease',
        treatmentPlan: 'Initiate ACE inhibitor, beta blocker, loop diuretic; refer for cardiology workup.',
        vitals: { bloodPressure: '160/95', pulse: '96', temperature: '36.9', respiratory: '24', oxygenSaturation: '93%', weight: '92 kg' },
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Carvedilol 12.5mg Tablet',
        dosage: '12.5 mg',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Take with meals; monitor pulse.',
        visitIndex: 0
      },
      {
        medicationName: 'Furosemide 40mg Tablet',
        dosage: '40 mg',
        frequency: 'Every morning',
        duration: 'Continuous',
        instructions: 'Adjust based on edema; maintain fluid restriction.',
        visitIndex: 0
      }
    ],
    labOrders: [
      {
        testName: 'NT-proBNP',
        priority: 'Routine',
        notes: 'Monitor heart failure status',
        orderedAt: '2025-01-08 11:30:00',
        result: '950 pg/mL',
        resultDate: '2025-01-09 09:00:00',
        status: 'completed',
        visitIndex: 0
      }
    ],
    radiologyOrders: [
      {
        testName: 'Echocardiogram',
        priority: 'Routine',
        notes: 'Annual LV function assessment',
        orderedAt: '2025-01-08 11:40:00',
        status: 'ordered',
        visitIndex: 0
      }
    ],
    appointments: [
      {
        scheduledAt: '2025-04-08 10:30:00',
        reason: 'Heart failure clinic review',
        notes: 'Check NT-proBNP before visit.',
        status: 'scheduled',
        visitIndex: 0
      }
    ]
  },
  {
    firstName: 'Catherine',
    lastName: 'Njeri',
    gender: 'female',
    dateOfBirth: '1982-11-05',
    email: 'catherine.njeri@example.com',
    phone: '+254700333221',
    address: '12 Upper Hill, Nairobi',
    bloodType: 'O+',
    heightCm: 160,
    weightKg: 60,
    emergencyContact: 'James Njeri (+254700333222)',
    insurance: 'Jubilee Enhanced',
    allergies: ['Diclofenac'],
    chronicConditions: ['Rheumatoid Arthritis'],
    medications: ['Methotrexate 20mg weekly', 'Folic Acid 5mg Tablet', 'Prednisone 5mg Tablet as needed'],
    visits: [
      {
        visitDate: '2024-08-19 08:50:00',
        chiefComplaint: 'Morning stiffness lasting 45 minutes',
        hpi: 'On methotrexate with good control; occasional flares during cold season.',
        reviewOfSystems: {
          Musculoskeletal: 'Mild pain in wrists and knees',
          General: 'No fevers or weight loss',
          GI: 'No nausea from medications'
        },
        physicalExam: {
          Musculoskeletal: 'Minimal synovitis in MCP joints',
          Skin: 'No nodules',
          Vitals: 'BP 115/70 mmHg, HR 68 bpm'
        },
        diagnosis: 'Rheumatoid arthritis in low disease activity',
        treatmentPlan: 'Continue methotrexate; add physiotherapy; monitor labs quarterly.',
        vitals: { bloodPressure: '115/70', pulse: '68', temperature: '36.4', respiratory: '14', oxygenSaturation: '99%', weight: '60 kg' },
        status: 'completed',
        nextAppointment: {
          date: '2024-11-19 09:00:00',
          reason: 'Rheumatology follow-up',
          notes: 'Check ESR/CRP before visit.'
        }
      },
      {
        visitDate: '2021-03-11 09:40:00',
        chiefComplaint: 'Increased joint pain during rainy season',
        hpi: 'Reports stiffness lasting 2 hours, difficulty gripping objects.',
        reviewOfSystems: {
          Musculoskeletal: 'Swollen wrists and MCP joints',
          Respiratory: 'No dyspnea',
          General: 'Low-grade fevers in evenings'
        },
        physicalExam: {
          Musculoskeletal: 'Synovitis in wrists, MCP 2-4 bilaterally',
          Vitals: 'BP 120/76 mmHg, HR 76 bpm'
        },
        diagnosis: 'Rheumatoid arthritis flare',
        treatmentPlan: 'Short prednisone taper, increase methotrexate to 20mg weekly.',
        vitals: { bloodPressure: '120/76', pulse: '76', temperature: '37.1', respiratory: '16', oxygenSaturation: '98%', weight: '61 kg' },
        status: 'completed'
      },
      {
        visitDate: '2019-02-15 10:10:00',
        chiefComplaint: 'New onset joint pain and swelling',
        hpi: 'Progressive bilateral wrist pain for 6 months, stiffness >1 hour.',
        reviewOfSystems: {
          Musculoskeletal: 'Symmetric joint pain',
          General: 'Fatigue and malaise',
          Skin: 'No rash'
        },
        physicalExam: {
          Musculoskeletal: 'Swelling in wrists, MCPs, PIPs',
          Vitals: 'BP 118/74 mmHg, HR 72 bpm'
        },
        diagnosis: 'Rheumatoid arthritis - newly diagnosed',
        treatmentPlan: 'Initiate methotrexate and folic acid; schedule baseline labs.',
        vitals: { bloodPressure: '118/74', pulse: '72', temperature: '36.8', respiratory: '16', oxygenSaturation: '99%', weight: '63 kg' },
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Methotrexate 20mg weekly',
        dosage: '20 mg',
        frequency: 'Once weekly',
        duration: 'Continuous',
        instructions: 'Take on Mondays; supplement with folic acid next day.',
        visitIndex: 0
      },
      {
        medicationName: 'Folic Acid 5mg Tablet',
        dosage: '5 mg',
        frequency: 'Once daily',
        duration: 'Continuous',
        instructions: 'Take daily while on methotrexate.',
        visitIndex: 0
      }
    ],
    labOrders: [
      {
        testName: 'Erythrocyte Sedimentation Rate (ESR)',
        priority: 'Routine',
        notes: 'Monitor disease activity',
        orderedAt: '2024-08-19 09:10:00',
        result: '22 mm/hr',
        resultDate: '2024-08-20 07:45:00',
        status: 'completed',
        visitIndex: 0
      }
    ],
    appointments: [
      {
        scheduledAt: '2024-11-19 09:00:00',
        reason: 'Rheumatology follow-up',
        notes: 'Review inflammatory markers.',
        status: 'scheduled',
        visitIndex: 0
      }
    ]
  },
  {
    firstName: 'David',
    lastName: 'Kiptoo',
    gender: 'male',
    dateOfBirth: '1958-04-30',
    email: 'david.kiptoo@example.com',
    phone: '+254700444332',
    address: 'Eldoret, Uasin Gishu',
    bloodType: 'AB+',
    heightCm: 170,
    weightKg: 74,
    emergencyContact: 'Mary Kiptoo (+254700444333)',
    insurance: 'NHIF Civil Service',
    allergies: ['None'],
    chronicConditions: ['Chronic Kidney Disease Stage 3', 'Hypertension'],
    medications: ['Losartan 50mg Tablet', 'Dapagliflozin 10mg Tablet', 'Cholecalciferol 2000IU'],
    visits: [
      {
        visitDate: '2024-07-03 11:20:00',
        chiefComplaint: 'CKD follow-up and lab review',
        hpi: 'Stable creatinine, adherent to renal diet, no edema.',
        reviewOfSystems: {
          Renal: 'No flank pain, good urine output',
          Cardiovascular: 'No dizziness',
          General: 'Energy levels good'
        },
        physicalExam: {
          Vitals: 'BP 126/78 mmHg, HR 70 bpm',
          Abdomen: 'No tenderness',
          Extremities: 'Trace edema'
        },
        diagnosis: 'CKD Stage 3b - stable',
        treatmentPlan: 'Continue ARB and SGLT2 inhibitor; schedule renal ultrasound annually.',
        vitals: { bloodPressure: '126/78', pulse: '70', temperature: '36.6', respiratory: '16', oxygenSaturation: '97%', weight: '73 kg' },
        status: 'completed',
        nextAppointment: {
          date: '2024-12-03 10:00:00',
          reason: 'Renal clinic follow-up',
          notes: 'Repeat renal panel and microalbumin.'
        }
      },
      {
        visitDate: '2021-05-18 10:05:00',
        chiefComplaint: 'Rising creatinine and fatigue',
        hpi: 'Creatinine increased to 2.1 mg/dL; mild fatigue and pruritus.',
        reviewOfSystems: {
          Skin: 'Mild itchiness',
          Renal: 'No hematuria',
          GI: 'Occasional nausea'
        },
        physicalExam: {
          Cardiovascular: 'BP 140/90 mmHg',
          Skin: 'Dry skin',
          Extremities: 'No edema'
        },
        diagnosis: 'CKD Stage 3 progression',
        treatmentPlan: 'Adjust antihypertensive regimen, start dapagliflozin, counsel on phosphorus restriction.',
        vitals: { bloodPressure: '140/90', pulse: '76', temperature: '36.7', respiratory: '18', oxygenSaturation: '96%', weight: '76 kg' },
        status: 'completed'
      },
      {
        visitDate: '2018-02-22 09:30:00',
        chiefComplaint: 'Longstanding hypertension with declining renal function',
        hpi: 'History of poorly controlled hypertension for 10 years, creatinine 1.8 mg/dL.',
        reviewOfSystems: {
          Cardiovascular: 'Occasional headaches',
          Renal: 'Foamy urine present',
          General: 'No fevers'
        },
        physicalExam: {
          Vitals: 'BP 155/95 mmHg',
          Cardiovascular: 'S4 gallop',
          Extremities: '1+ edema'
        },
        diagnosis: 'Chronic kidney disease stage 3 due to hypertensive nephrosclerosis',
        treatmentPlan: 'Initiate losartan, advise salt restriction, schedule renal ultrasound.',
        vitals: { bloodPressure: '155/95', pulse: '82', temperature: '36.9', respiratory: '18', oxygenSaturation: '95%', weight: '78 kg' },
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Losartan 50mg Tablet',
        dosage: '50 mg',
        frequency: 'Once daily',
        duration: 'Continuous',
        instructions: 'Take every morning with water.',
        visitIndex: 0
      },
      {
        medicationName: 'Dapagliflozin 10mg Tablet',
        dosage: '10 mg',
        frequency: 'Once daily',
        duration: 'Continuous',
        instructions: 'Take in the morning; monitor renal function.',
        visitIndex: 0
      }
    ],
    labOrders: [
      {
        testName: 'Renal Function Tests (RFT)',
        priority: 'Routine',
        notes: 'Monitor creatinine and electrolytes',
        orderedAt: '2024-07-03 11:40:00',
        result: 'Creatinine 1.9 mg/dL, eGFR 42 mL/min',
        resultDate: '2024-07-04 09:00:00',
        status: 'completed',
        visitIndex: 0
      }
    ],
    appointments: [
      {
        scheduledAt: '2024-12-03 10:00:00',
        reason: 'Renal clinic follow-up',
        notes: 'Repeat renal panel and microalbumin.',
        status: 'scheduled',
        visitIndex: 0
      }
    ]
  },
  {
    firstName: 'Esther',
    lastName: 'Atieno',
    gender: 'female',
    dateOfBirth: '1970-01-17',
    email: 'esther.atieno@example.com',
    phone: '+254700555443',
    address: 'Kisumu, Milimani Estate',
    bloodType: 'B-',
    heightCm: 158,
    weightKg: 68,
    emergencyContact: 'Paul Atieno (+254700555444)',
    insurance: 'CIC Health',
    allergies: ['Aspirin'],
    chronicConditions: ['Chronic Obstructive Pulmonary Disease', 'Asthma overlap'],
    medications: ['Tiotropium Inhaler', 'Budesonide/Formoterol Inhaler', 'Salbutamol Inhaler as needed'],
    visits: [
      {
        visitDate: '2024-09-27 15:00:00',
        chiefComplaint: 'COPD review prior to rainy season',
        hpi: 'Stable symptoms, uses rescue inhaler twice weekly, attends pulmonary rehab.',
        reviewOfSystems: {
          Respiratory: 'Mild exertional dyspnea',
          General: 'No fever',
          Cardiovascular: 'No chest tightness'
        },
        physicalExam: {
          Respiratory: 'Prolonged expiration, scattered wheeze',
          Vitals: 'BP 118/72 mmHg, HR 74 bpm'
        },
        diagnosis: 'COPD GOLD Stage II - stable',
        treatmentPlan: 'Continue inhalers, administer influenza vaccine, schedule spirometry.',
        vitals: { bloodPressure: '118/72', pulse: '74', temperature: '36.5', respiratory: '20', oxygenSaturation: '95%', weight: '68 kg' },
        status: 'completed',
        nextAppointment: {
          date: '2025-01-27 14:00:00',
          reason: 'Pulmonary clinic review',
          notes: 'Repeat spirometry and 6-minute walk test.'
        }
      },
      {
        visitDate: '2021-08-04 13:20:00',
        chiefComplaint: 'COPD exacerbation with productive cough',
        hpi: 'Three-week history of cough with sputum, increased wheeze, requiring rescue inhaler daily.',
        reviewOfSystems: {
          Respiratory: 'Green sputum, dyspnea on exertion',
          General: 'Low grade fevers',
          ENT: 'Post-nasal drip'
        },
        physicalExam: {
          Respiratory: 'Diffuse wheeze, mild crackles',
          Vitals: 'BP 126/80 mmHg, HR 88 bpm'
        },
        diagnosis: 'COPD exacerbation likely infectious',
        treatmentPlan: 'Prescribe azithromycin, prednisone taper, intensify bronchodilator regimen.',
        vitals: { bloodPressure: '126/80', pulse: '88', temperature: '37.3', respiratory: '24', oxygenSaturation: '92%', weight: '70 kg' },
        status: 'completed'
      },
      {
        visitDate: '2018-05-09 10:50:00',
        chiefComplaint: 'Chronic cough and wheeze',
        hpi: 'Long-term smoker, daily cough and exertional dyspnea.',
        reviewOfSystems: {
          Respiratory: 'Chronic sputum production',
          General: 'Night sweats absent',
          ENT: 'Frequent throat clearing'
        },
        physicalExam: {
          Respiratory: 'Wheeze throughout lung fields',
          Vitals: 'BP 130/85 mmHg, HR 82 bpm'
        },
        diagnosis: 'COPD with asthma overlap',
        treatmentPlan: 'Start tiotropium and budesonide/formoterol inhalers; initiate smoking cessation program.',
        vitals: { bloodPressure: '130/85', pulse: '82', temperature: '36.9', respiratory: '22', oxygenSaturation: '93%', weight: '72 kg' },
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Tiotropium Inhaler',
        dosage: '18 mcg',
        frequency: 'Once daily',
        duration: 'Continuous',
        instructions: 'Inhale each morning after brushing teeth.',
        visitIndex: 0
      },
      {
        medicationName: 'Budesonide/Formoterol Inhaler',
        dosage: '160/4.5 mcg',
        frequency: 'Two puffs twice daily',
        duration: 'Continuous',
        instructions: 'Rinse mouth after use.',
        visitIndex: 0
      }
    ],
    labOrders: [
      {
        testName: 'Complete Blood Count (CBC)',
        priority: 'Routine',
        notes: 'Monitor for polycythemia',
        orderedAt: '2024-09-27 15:20:00',
        result: 'Hct 46%',
        resultDate: '2024-09-28 08:30:00',
        status: 'completed',
        visitIndex: 0
      }
    ],
    radiologyOrders: [
      {
        testName: 'Chest X-Ray',
        priority: 'Routine',
        notes: 'Annual COPD imaging',
        orderedAt: '2024-09-27 15:30:00',
        status: 'ordered',
        visitIndex: 0
      }
    ],
    appointments: [
      {
        scheduledAt: '2025-01-27 14:00:00',
        reason: 'Pulmonary clinic review',
        notes: 'Repeat spirometry and 6MWT.',
        status: 'scheduled',
        visitIndex: 0
      }
    ]
  },
  {
    firstName: 'Francis',
    lastName: 'Mutiso',
    gender: 'male',
    dateOfBirth: '1985-09-09',
    email: 'francis.mutiso@example.com',
    phone: '+254700666554',
    address: 'Thika, Kiambu County',
    bloodType: 'O-',
    heightCm: 175,
    weightKg: 70,
    emergencyContact: 'Janet Mutiso (+254700666555)',
    insurance: 'Madison Health',
    allergies: ['Amoxicillin'],
    chronicConditions: ['HIV infection (ART controlled)'],
    medications: ['Tenofovir/Emtricitabine 300/200mg', 'Dolutegravir 50mg Tablet', 'Atorvastatin 20mg Tablet'],
    visits: [
      {
        visitDate: '2024-10-10 09:15:00',
        chiefComplaint: 'Routine HIV clinic follow-up',
        hpi: 'Excellent adherence, no opportunistic infections, stable weight.',
        reviewOfSystems: {
          General: 'No fevers or night sweats',
          GI: 'No nausea from medication',
          Neuro: 'No headaches'
        },
        physicalExam: {
          General: 'Healthy appearance, BMI 22.9',
          Vitals: 'BP 118/74 mmHg, HR 70 bpm'
        },
        diagnosis: 'HIV infection - virologically suppressed',
        treatmentPlan: 'Continue ART regimen; screen lipids; reinforce adherence counseling.',
        vitals: { bloodPressure: '118/74', pulse: '70', temperature: '36.6', respiratory: '16', oxygenSaturation: '99%', weight: '70 kg' },
        status: 'completed',
        nextAppointment: {
          date: '2025-04-10 09:00:00',
          reason: 'HIV clinic review',
          notes: 'Repeat viral load and CD4 count.'
        }
      },
      {
        visitDate: '2020-12-03 10:00:00',
        chiefComplaint: 'Medication review after switch to dolutegravir',
        hpi: 'Mild insomnia for first week, now resolved, adherent to meds.',
        reviewOfSystems: {
          General: 'No weight change',
          GI: 'Occasional bloating',
          Neuro: 'No headaches'
        },
        physicalExam: {
          Vitals: 'BP 120/76 mmHg, HR 74 bpm',
          Abdomen: 'Soft, non-tender'
        },
        diagnosis: 'HIV infection with ART optimization',
        treatmentPlan: 'Continue current regimen; schedule viral load in 3 months.',
        vitals: { bloodPressure: '120/76', pulse: '74', temperature: '36.7', respiratory: '16', oxygenSaturation: '98%', weight: '69 kg' },
        status: 'completed'
      },
      {
        visitDate: '2018-07-18 13:45:00',
        chiefComplaint: 'Initiation of HIV care',
        hpi: 'Diagnosed three months ago; baseline viral load 120,000 copies/mL.',
        reviewOfSystems: {
          General: 'Mild fatigue',
          GI: 'No diarrhea',
          Neuro: 'No headaches'
        },
        physicalExam: {
          General: 'BMI 21.5',
          Vitals: 'BP 122/78 mmHg, HR 80 bpm'
        },
        diagnosis: 'HIV infection (newly diagnosed)',
        treatmentPlan: 'Start TDF/FTC + DTG regimen; provide adherence counseling.',
        vitals: { bloodPressure: '122/78', pulse: '80', temperature: '36.8', respiratory: '18', oxygenSaturation: '99%', weight: '68 kg' },
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Tenofovir/Emtricitabine 300/200mg',
        dosage: '1 tablet',
        frequency: 'Once daily',
        duration: 'Continuous',
        instructions: 'Take at bedtime with water.',
        visitIndex: 0
      },
      {
        medicationName: 'Dolutegravir 50mg Tablet',
        dosage: '50 mg',
        frequency: 'Once daily',
        duration: 'Continuous',
        instructions: 'Take at bedtime with main regimen.',
        visitIndex: 0
      }
    ],
    labOrders: [
      {
        testName: 'HIV Viral Load',
        priority: 'Routine',
        notes: 'Ensure continued suppression',
        orderedAt: '2024-10-10 09:30:00',
        result: '<20 copies/mL',
        resultDate: '2024-10-17 10:00:00',
        status: 'completed',
        visitIndex: 0
      }
    ],
    appointments: [
      {
        scheduledAt: '2025-04-10 09:00:00',
        reason: 'HIV clinic review',
        notes: 'Repeat viral load/CD4.',
        status: 'scheduled',
        visitIndex: 0
      }
    ]
  },
  {
    firstName: 'Grace',
    lastName: 'Achieng',
    gender: 'female',
    dateOfBirth: '1990-02-27',
    email: 'grace.achieng@example.com',
    phone: '+254700777665',
    address: 'Kakamega, Mumias Road',
    bloodType: 'A-',
    heightCm: 162,
    weightKg: 64,
    emergencyContact: 'Hannah Achieng (+254700777666)',
    insurance: 'NHIF Comprehensive',
    allergies: ['NSAIDs'],
    chronicConditions: ['Sickle Cell Disease (HbSS)'],
    medications: ['Hydroxyurea 500mg Capsule', 'Folic Acid 5mg Tablet', 'Penicillin V 250mg Tablet'],
    visits: [
      {
        visitDate: '2024-12-02 10:40:00',
        chiefComplaint: 'Annual sickle cell review',
        hpi: 'No crises in past year, adherent to hydroxyurea, improved energy levels.',
        reviewOfSystems: {
          General: 'No recent fevers',
          Musculoskeletal: 'Mild joint aches after strenuous activity',
          Hematologic: 'No priapism episodes'
        },
        physicalExam: {
          General: 'Well appearing',
          Vitals: 'BP 110/70 mmHg, HR 72 bpm',
          Spleen: 'Not palpable'
        },
        diagnosis: 'Sickle cell disease - stable on hydroxyurea',
        treatmentPlan: 'Continue hydroxyurea, folic acid; schedule ophthalmology screening.',
        vitals: { bloodPressure: '110/70', pulse: '72', temperature: '36.6', respiratory: '16', oxygenSaturation: '98%', weight: '64 kg' },
        status: 'completed',
        nextAppointment: {
          date: '2025-06-02 10:00:00',
          reason: 'Comprehensive sickle cell review',
          notes: 'Repeat CBC and reticulocyte count.'
        }
      },
      {
        visitDate: '2020-04-14 12:15:00',
        chiefComplaint: 'Pain crisis triggered by cold weather',
        hpi: 'Severe bone pain in legs for 2 days, requiring NSAID avoidance due to allergy.',
        reviewOfSystems: {
          Musculoskeletal: 'Severe pain hips and knees',
          Respiratory: 'No chest pain',
          General: 'Low-grade fever 37.8°C'
        },
        physicalExam: {
          Musculoskeletal: 'Tenderness over femurs',
          Vitals: 'BP 118/72 mmHg, HR 88 bpm'
        },
        diagnosis: 'Sickle cell pain crisis',
        treatmentPlan: 'Admit for IV hydration and opioids, adjust hydroxyurea dose.',
        vitals: { bloodPressure: '118/72', pulse: '88', temperature: '37.8', respiratory: '20', oxygenSaturation: '96%', weight: '63 kg' },
        status: 'completed'
      },
      {
        visitDate: '2017-09-09 09:30:00',
        chiefComplaint: 'Enrollment into adult sickle cell program',
        hpi: 'History of frequent pain crises during adolescence.',
        reviewOfSystems: {
          General: 'Fatigue noted',
          Musculoskeletal: 'Chronic joint pain',
          Hematologic: 'History of transfusions'
        },
        physicalExam: {
          General: 'Mild scleral icterus',
          Vitals: 'BP 112/68 mmHg, HR 82 bpm'
        },
        diagnosis: 'Sickle cell anemia (HbSS)',
        treatmentPlan: 'Start hydroxyurea, folic acid, prophylactic penicillin; educate on crisis prevention.',
        vitals: { bloodPressure: '112/68', pulse: '82', temperature: '36.9', respiratory: '18', oxygenSaturation: '97%', weight: '62 kg' },
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Hydroxyurea 500mg Capsule',
        dosage: '500 mg',
        frequency: 'Once daily',
        duration: 'Continuous',
        instructions: 'Take in the evening with water.',
        visitIndex: 0
      },
      {
        medicationName: 'Folic Acid 5mg Tablet',
        dosage: '5 mg',
        frequency: 'Once daily',
        duration: 'Continuous',
        instructions: 'Take in the morning.',
        visitIndex: 0
      }
    ],
    labOrders: [
      {
        testName: 'Complete Blood Count (CBC)',
        priority: 'Routine',
        notes: 'Monitor Hb and reticulocytes',
        orderedAt: '2024-12-02 11:00:00',
        result: 'Hb 10.5 g/dL, Retic 5%',
        resultDate: '2024-12-02 15:00:00',
        status: 'completed',
        visitIndex: 0
      }
    ],
    appointments: [
      {
        scheduledAt: '2025-06-02 10:00:00',
        reason: 'Comprehensive sickle cell review',
        notes: 'Repeat CBC and retic count.',
        status: 'scheduled',
        visitIndex: 0
      }
    ]
  },
  {
    firstName: 'Henry',
    lastName: 'Waweru',
    gender: 'male',
    dateOfBirth: '1955-12-12',
    email: 'henry.waweru@example.com',
    phone: '+254700888776',
    address: 'Nakuru, Section 58',
    bloodType: 'B+',
    heightCm: 180,
    weightKg: 80,
    emergencyContact: 'Margaret Waweru (+254700888777)',
    insurance: 'APA Health',
    allergies: ['None'],
    chronicConditions: ['Parkinson\'s Disease'],
    medications: ['Carbidopa/Levodopa 25/100mg Tablet', 'Selegiline 5mg Tablet', 'Vitamin D3 2000IU'],
    visits: [
      {
        visitDate: '2024-05-21 10:30:00',
        chiefComplaint: 'Parkinson\'s follow-up and medication adjustment',
        hpi: 'Mild increase in tremor afternoon, improved gait after physiotherapy.',
        reviewOfSystems: {
          Neurologic: 'Rest tremor left hand, no falls',
          Psychiatric: 'Mood stable',
          Sleep: 'Occasional vivid dreams'
        },
        physicalExam: {
          Neurologic: 'Resting tremor left upper limb, mild bradykinesia',
          Gait: 'Slight shuffling, good balance',
          Vitals: 'BP 122/78 mmHg, HR 68 bpm'
        },
        diagnosis: 'Parkinson\'s disease Hoehn & Yahr stage II',
        treatmentPlan: 'Increase afternoon levodopa dose; continue physiotherapy twice weekly.',
        vitals: { bloodPressure: '122/78', pulse: '68', temperature: '36.5', respiratory: '15', oxygenSaturation: '98%', weight: '80 kg' },
        status: 'completed',
        nextAppointment: {
          date: '2024-11-21 10:00:00',
          reason: 'Neurology review',
          notes: 'Assess response to dose adjustment.'
        }
      },
      {
        visitDate: '2020-03-19 11:10:00',
        chiefComplaint: 'Worsening tremor and rigidity',
        hpi: 'Increased slowness, difficulty buttoning shirts.',
        reviewOfSystems: {
          Neurologic: 'Bradykinesia, micrographia',
          Sleep: 'REM behavior disorder symptoms',
          GI: 'Constipation'
        },
        physicalExam: {
          Neurologic: 'Rigidity in upper limbs, resting tremor bilaterally',
          Gait: 'Reduced arm swing',
          Vitals: 'BP 130/82 mmHg, HR 72 bpm'
        },
        diagnosis: 'Parkinson\'s disease progression',
        treatmentPlan: 'Increase levodopa frequency to QID, start selegiline.',
        vitals: { bloodPressure: '130/82', pulse: '72', temperature: '36.7', respiratory: '16', oxygenSaturation: '97%', weight: '82 kg' },
        status: 'completed'
      },
      {
        visitDate: '2016-06-06 09:00:00',
        chiefComplaint: 'Initial neurology evaluation for tremor',
        hpi: 'Resting tremor right hand for 6 months, mild slowness.',
        reviewOfSystems: {
          Neurologic: 'No falls, mild stiffness',
          Psychiatric: 'No depression',
          Sleep: 'Occasional insomnia'
        },
        physicalExam: {
          Neurologic: 'Resting tremor right upper limb, cogwheel rigidity',
          Gait: 'Slightly reduced arm swing',
          Vitals: 'BP 128/80 mmHg, HR 70 bpm'
        },
        diagnosis: 'Early Parkinson\'s disease',
        treatmentPlan: 'Initiate carbidopa/levodopa 25/100mg TID, refer to physiotherapy.',
        vitals: { bloodPressure: '128/80', pulse: '70', temperature: '36.6', respiratory: '16', oxygenSaturation: '98%', weight: '83 kg' },
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Carbidopa/Levodopa 25/100mg Tablet',
        dosage: '25/100 mg',
        frequency: 'Four times daily',
        duration: 'Continuous',
        instructions: 'Take at 6am, 11am, 4pm, 9pm with light meals.',
        visitIndex: 0
      },
      {
        medicationName: 'Selegiline 5mg Tablet',
        dosage: '5 mg',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Take at 7am and 2pm, avoid late evening doses.',
        visitIndex: 0
      }
    ],
    labOrders: [
      {
        testName: 'Comprehensive Metabolic Panel (CMP)',
        priority: 'Routine',
        notes: 'Monitor medication effects',
        orderedAt: '2024-05-21 10:50:00',
        result: 'Within normal limits',
        resultDate: '2024-05-21 16:00:00',
        status: 'completed',
        visitIndex: 0
      }
    ],
    appointments: [
      {
        scheduledAt: '2024-11-21 10:00:00',
        reason: 'Neurology review',
        notes: 'Assess response to increased levodopa.',
        status: 'scheduled',
        visitIndex: 0
      }
    ]
  },
  {
    firstName: 'Irene',
    lastName: 'Kendi',
    gender: 'female',
    dateOfBirth: '1978-06-18',
    email: 'irene.kendi@example.com',
    phone: '+254700999887',
    address: 'Meru Town, Eastern Bypass',
    bloodType: 'AB-',
    heightCm: 168,
    weightKg: 70,
    emergencyContact: 'Anthony Kendi (+254700999888)',
    insurance: 'Britam Elite',
    allergies: ['Sulfasalazine'],
    chronicConditions: ['Systemic Lupus Erythematosus', 'Hypertension'],
    medications: ['Hydroxychloroquine 200mg Tablet', 'Prednisone 5mg Tablet', 'Lisinopril 10mg Tablet'],
    visits: [
      {
        visitDate: '2024-06-14 09:20:00',
        chiefComplaint: 'SLE maintenance follow-up',
        hpi: 'No recent flares, mild photosensitivity, compliant with medications.',
        reviewOfSystems: {
          Skin: 'Mild malar erythema',
          Musculoskeletal: 'Occasional arthralgia wrists',
          Renal: 'No proteinuria on last test'
        },
        physicalExam: {
          Skin: 'Faint malar rash',
          Musculoskeletal: 'No active synovitis',
          Vitals: 'BP 118/76 mmHg, HR 72 bpm'
        },
        diagnosis: 'Systemic lupus erythematosus in low disease activity',
        treatmentPlan: 'Continue hydroxychloroquine, low-dose prednisone, lisinopril for renal protection.',
        vitals: { bloodPressure: '118/76', pulse: '72', temperature: '36.4', respiratory: '15', oxygenSaturation: '99%', weight: '70 kg' },
        status: 'completed',
        nextAppointment: {
          date: '2024-12-14 09:00:00',
          reason: 'Lupus follow-up',
          notes: 'Repeat ANA profile and renal panel.'
        }
      },
      {
        visitDate: '2020-02-26 11:30:00',
        chiefComplaint: 'Polyarthralgia and rash flare',
        hpi: 'Two-week flare with joint swelling and fatigue.',
        reviewOfSystems: {
          Musculoskeletal: 'Painful swollen wrists',
          Skin: 'Malar rash prominent',
          Renal: 'Mild proteinuria previously'
        },
        physicalExam: {
          Skin: 'Pronounced malar rash',
          Musculoskeletal: 'Synovitis in wrists and knees',
          Vitals: 'BP 126/82 mmHg, HR 78 bpm'
        },
        diagnosis: 'Systemic lupus erythematosus flare',
        treatmentPlan: 'Increase prednisone to 20mg taper, continue hydroxychloroquine, start lisinopril for renal protection.',
        vitals: { bloodPressure: '126/82', pulse: '78', temperature: '37.1', respiratory: '17', oxygenSaturation: '98%', weight: '71 kg' },
        status: 'completed'
      },
      {
        visitDate: '2016-10-04 10:45:00',
        chiefComplaint: 'Initial diagnosis of lupus',
        hpi: '6-month history of fatigue, joint pain, photosensitive rash.',
        reviewOfSystems: {
          Skin: 'Photosensitive rash on cheeks',
          Musculoskeletal: 'Symmetric joint pain',
          Renal: 'No hematuria'
        },
        physicalExam: {
          Skin: 'Classic malar rash',
          Musculoskeletal: 'Mild swelling wrists',
          Vitals: 'BP 122/80 mmHg, HR 76 bpm'
        },
        diagnosis: 'Systemic lupus erythematosus',
        treatmentPlan: 'Start hydroxychloroquine 200mg BD, low-dose prednisone; schedule renal monitoring.',
        vitals: { bloodPressure: '122/80', pulse: '76', temperature: '36.8', respiratory: '16', oxygenSaturation: '99%', weight: '72 kg' },
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Hydroxychloroquine 200mg Tablet',
        dosage: '200 mg',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Take after meals; schedule annual eye exams.',
        visitIndex: 0
      },
      {
        medicationName: 'Lisinopril 10mg Tablet',
        dosage: '10 mg',
        frequency: 'Once daily',
        duration: 'Continuous',
        instructions: 'Take in the morning.',
        visitIndex: 0
      }
    ],
    labOrders: [
      {
        testName: 'Renal Function Tests (RFT)',
        priority: 'Routine',
        notes: 'Monitor lupus nephritis',
        orderedAt: '2024-06-14 09:40:00',
        result: 'Creatinine 0.9 mg/dL, UPCR 0.2',
        resultDate: '2024-06-15 08:00:00',
        status: 'completed',
        visitIndex: 0
      }
    ],
    appointments: [
      {
        scheduledAt: '2024-12-14 09:00:00',
        reason: 'Lupus follow-up',
        notes: 'Repeat ANA profile and renal panel.',
        status: 'scheduled',
        visitIndex: 0
      }
    ]
  },
  {
    firstName: 'John',
    lastName: 'Okoth',
    gender: 'male',
    dateOfBirth: '1965-03-02',
    email: 'john.okoth@example.com',
    phone: '+254701111990',
    address: 'Mombasa, Nyali Estate',
    bloodType: 'A+',
    heightCm: 176,
    weightKg: 82,
    emergencyContact: 'Millicent Okoth (+254701111991)',
    insurance: 'Resolution Health',
    allergies: ['Ibuprofen'],
    chronicConditions: ['Chronic Hepatitis B with Compensated Cirrhosis', 'Type 2 Diabetes Mellitus'],
    medications: ['Tenofovir 300mg Tablet', 'Metformin 1000mg Tablet', 'Propranolol 40mg Tablet'],
    visits: [
      {
        visitDate: '2024-03-29 15:45:00',
        chiefComplaint: 'Hepatitis B surveillance visit',
        hpi: 'Adherent to tenofovir, no ascites, occasional fatigue.',
        reviewOfSystems: {
          GI: 'No abdominal pain or jaundice',
          General: 'Mild fatigue',
          Endocrine: 'Blood sugars averaging 120-140 mg/dL'
        },
        physicalExam: {
          Abdomen: 'No hepatosplenomegaly, no ascites',
          Skin: 'No jaundice',
          Vitals: 'BP 118/70 mmHg, HR 66 bpm'
        },
        diagnosis: 'Chronic hepatitis B with compensated cirrhosis',
        treatmentPlan: 'Continue tenofovir, schedule abdominal ultrasound and AFP.',
        vitals: { bloodPressure: '118/70', pulse: '66', temperature: '36.6', respiratory: '16', oxygenSaturation: '99%', weight: '82 kg' },
        status: 'completed',
        nextAppointment: {
          date: '2024-09-29 15:00:00',
          reason: 'Hepatitis B surveillance',
          notes: 'Ultrasound + AFP before visit.'
        }
      },
      {
        visitDate: '2020-05-07 14:10:00',
        chiefComplaint: 'Post-treatment review for variceal banding',
        hpi: 'Underwent banding 3 months ago, on propranolol, no bleeding episodes.',
        reviewOfSystems: {
          GI: 'No melena or hematemesis',
          General: 'Weight stable',
          Endocrine: 'Diabetes well controlled'
        },
        physicalExam: {
          Abdomen: 'Liver edge palpable 2 cm below costal margin',
          Skin: 'No spider angiomas',
          Vitals: 'BP 124/72 mmHg, HR 64 bpm'
        },
        diagnosis: 'Chronic hepatitis B with portal hypertension',
        treatmentPlan: 'Continue tenofovir, propranolol; schedule surveillance endoscopy in 1 year.',
        vitals: { bloodPressure: '124/72', pulse: '64', temperature: '36.7', respiratory: '18', oxygenSaturation: '98%', weight: '83 kg' },
        status: 'completed'
      },
      {
        visitDate: '2017-01-19 13:30:00',
        chiefComplaint: 'New diagnosis of chronic hepatitis B',
        hpi: 'Incidentally discovered elevated LFTs, hepatitis B surface antigen positive.',
        reviewOfSystems: {
          GI: 'No jaundice',
          General: 'Occasional fatigue',
          Endocrine: 'Known diabetes for 5 years'
        },
        physicalExam: {
          Abdomen: 'Liver edge smooth, non tender',
          Vitals: 'BP 130/78 mmHg, HR 70 bpm'
        },
        diagnosis: 'Chronic hepatitis B infection with early fibrosis',
        treatmentPlan: 'Initiate tenofovir therapy, counsel on lifestyle modifications.',
        vitals: { bloodPressure: '130/78', pulse: '70', temperature: '36.8', respiratory: '17', oxygenSaturation: '98%', weight: '84 kg' },
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Tenofovir 300mg Tablet',
        dosage: '300 mg',
        frequency: 'Once daily',
        duration: 'Continuous',
        instructions: 'Take at bedtime with water.',
        visitIndex: 0
      },
      {
        medicationName: 'Propranolol 40mg Tablet',
        dosage: '40 mg',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Take morning and evening; monitor pulse.',
        visitIndex: 0
      }
    ],
    labOrders: [
      {
        testName: 'Liver Function Tests (LFT)',
        priority: 'Routine',
        notes: 'Biannual surveillance',
        orderedAt: '2024-03-29 16:00:00',
        result: 'ALT 32 U/L, AST 28 U/L',
        resultDate: '2024-03-30 09:30:00',
        status: 'completed',
        visitIndex: 0
      }
    ],
    radiologyOrders: [
      {
        testName: 'Abdominal Ultrasound',
        priority: 'Routine',
        notes: 'Surveillance for HCC',
        orderedAt: '2024-03-29 16:10:00',
        status: 'ordered',
        visitIndex: 0
      }
    ],
    appointments: [
      {
        scheduledAt: '2024-09-29 15:00:00',
        reason: 'Hepatitis B surveillance',
        notes: 'Ultrasound + AFP before visit.',
        status: 'scheduled',
        visitIndex: 0
      }
    ]
  }
];

async function ensureDoctor() {
  const existing = await get('SELECT id FROM doctors WHERE email = ?', [doctorProfile.email]);
  if (existing) {
    return existing.id;
  }

  const passwordHash = await bcrypt.hash('StrongPass#2024', 10);
  const result = await run(
    `INSERT INTO doctors (first_name, last_name, email, license_number, specialty, password_hash)
     VALUES (?, ?, ?, ?, ?, ?)` ,
    [doctorProfile.firstName, doctorProfile.lastName, doctorProfile.email, doctorProfile.licenseNumber, doctorProfile.specialty, passwordHash]
  );
  console.log(`Created doctor Samuel Onyango with id ${result.lastID}`);
  return result.lastID;
}

function createVisitSummaryText(visit) {
  if (visit.summary) {
    return visit.summary;
  }

  const diagnosis = visit.diagnosis || 'Diagnosis pending documentation';
  const plan = visit.treatmentPlan || 'Plan pending documentation';
  const progressParts = [];

  if (visit.chiefComplaint) {
    progressParts.push(`Chief complaint addressed: ${visit.chiefComplaint}.`);
  }

  if (visit.hpi) {
    progressParts.push(visit.hpi);
  }

  if (visit.status) {
    progressParts.push(`Visit status: ${visit.status}.`);
  }

  if (visit.vitals) {
    const vitalsSummary = [];
    if (visit.vitals.bloodPressure) vitalsSummary.push(`BP ${visit.vitals.bloodPressure}`);
    if (visit.vitals.pulse) vitalsSummary.push(`HR ${visit.vitals.pulse}`);
    if (visit.vitals.weight) vitalsSummary.push(`Weight ${visit.vitals.weight}`);
    if (vitalsSummary.length) {
      progressParts.push(`Key vitals: ${vitalsSummary.join(', ')}.`);
    }
  }

  if (visit.nextAppointment && visit.nextAppointment.date) {
    const reason = visit.nextAppointment.reason ? ` (${visit.nextAppointment.reason})` : '';
    progressParts.push(`Follow-up scheduled for ${visit.nextAppointment.date}${reason}.`);
  }

  if (!progressParts.length) {
    progressParts.push('Visit documented with plan initiated.');
  }

  return `Diagnosis: ${diagnosis}\nPlan: ${plan}\nProgress: ${progressParts.join(' ')}`;
}

function extractVisitDbValues(visit, summaryText) {
  return {
    vitalsJson: visit.vitals ? JSON.stringify(visit.vitals) : null,
    chiefComplaint: visit.chiefComplaint || null,
    hpi: visit.hpi || null,
    rosJson: visit.reviewOfSystems ? JSON.stringify(visit.reviewOfSystems) : null,
    examJson: visit.physicalExam ? JSON.stringify(visit.physicalExam) : null,
    diagnosis: visit.diagnosis || null,
    treatmentPlan: visit.treatmentPlan || null,
    doctorSummary: summaryText,
    status: visit.status || 'completed',
    nextDate: visit.nextAppointment ? visit.nextAppointment.date : null,
    nextReason: visit.nextAppointment ? visit.nextAppointment.reason : null,
    nextNotes: visit.nextAppointment ? visit.nextAppointment.notes : null
  };
}

async function upsertVisit(doctorId, patientId, visit) {
  const summaryText = createVisitSummaryText(visit);
  const values = extractVisitDbValues(visit, summaryText);

  const existing = await get(
    'SELECT id FROM visits WHERE doctor_id = ? AND patient_id = ? AND visit_date = ? LIMIT 1',
    [doctorId, patientId, visit.visitDate]
  );

  if (existing) {
    await run(
      `UPDATE visits SET
        vitals_json = ?,
        chief_complaint = ?,
        hpi = ?,
        ros_json = ?,
        physical_exam_json = ?,
        diagnosis = ?,
        treatment_plan = ?,
        doctor_summary = ?,
        status = ?,
        next_appointment_date = ?,
        next_appointment_reason = ?,
        next_appointment_notes = ?
       WHERE id = ?` ,
      [
        values.vitalsJson,
        values.chiefComplaint,
        values.hpi,
        values.rosJson,
        values.examJson,
        values.diagnosis,
        values.treatmentPlan,
        values.doctorSummary,
        values.status,
        values.nextDate,
        values.nextReason,
        values.nextNotes,
        existing.id
      ]
    );
    return existing.id;
  }

  const result = await run(
    `INSERT INTO visits (
      doctor_id, patient_id, visit_date, vitals_json, chief_complaint, hpi, ros_json, physical_exam_json,
      diagnosis, treatment_plan, doctor_summary, status, next_appointment_date, next_appointment_reason, next_appointment_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      doctorId,
      patientId,
      visit.visitDate,
      values.vitalsJson,
      values.chiefComplaint,
      values.hpi,
      values.rosJson,
      values.examJson,
      values.diagnosis,
      values.treatmentPlan,
      values.doctorSummary,
      values.status,
      values.nextDate,
      values.nextReason,
      values.nextNotes
    ]
  );
  return result.lastID;
}

async function insertPrescription(doctorId, patientId, visitId, prescription) {
  await run(
    `INSERT INTO prescriptions (
      visit_id, patient_id, doctor_id, item_id, medication_name, dosage, frequency, duration, instructions
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      visitId,
      patientId,
      doctorId,
      null,
      prescription.medicationName,
      prescription.dosage || null,
      prescription.frequency || null,
      prescription.duration || null,
      prescription.instructions || null
    ]
  );
}

async function insertLabOrder(doctorId, patientId, visitId, order) {
  await run(
    `INSERT INTO lab_orders (
      patient_id, doctor_id, visit_id, test_id, test_name, status, priority, notes, ordered_at, result, result_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      patientId,
      doctorId,
      visitId,
      null,
      order.testName,
      order.status || 'ordered',
      order.priority || null,
      order.notes || null,
      order.orderedAt || null,
      order.result || null,
      order.resultDate || null
    ]
  );
}

async function insertRadiologyOrder(doctorId, patientId, visitId, order) {
  await run(
    `INSERT INTO radiology_orders (
      patient_id, doctor_id, visit_id, test_id, test_name, status, priority, notes, ordered_at, result, result_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      patientId,
      doctorId,
      visitId,
      null,
      order.testName,
      order.status || 'ordered',
      order.priority || null,
      order.notes || null,
      order.orderedAt || null,
      order.result || null,
      order.resultDate || null
    ]
  );
}

async function insertAppointment(doctorId, patientId, visitId, appointment) {
  await run(
    `INSERT INTO appointments (
      patient_id, doctor_id, visit_id, scheduled_at, reason, notes, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)` ,
    [
      patientId,
      doctorId,
      visitId,
      appointment.scheduledAt,
      appointment.reason || null,
      appointment.notes || null,
      appointment.status || 'scheduled'
    ]
  );
}

async function seedPatients() {
  await initializeDatabase();
  const doctorId = await ensureDoctor();

  for (const patient of patients) {
    const existing = await get('SELECT id FROM patients WHERE email = ? AND doctor_id = ?', [patient.email, doctorId]);
    if (existing) {
      console.log(`Skipping existing patient ${patient.firstName} ${patient.lastName}`);
      continue;
    }

    const result = await run(
      `INSERT INTO patients (
        doctor_id, first_name, last_name, date_of_birth, gender, email, phone, address, blood_type,
        height_cm, weight_kg, emergency_contact, insurance, allergies, chronic_conditions, medications, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        doctorId,
        patient.firstName,
        patient.lastName,
        patient.dateOfBirth,
        patient.gender,
        patient.email,
        patient.phone,
        patient.address,
        patient.bloodType || null,
        patient.heightCm || null,
        patient.weightKg || null,
        patient.emergencyContact || null,
        patient.insurance || null,
        patient.allergies ? JSON.stringify(patient.allergies) : null,
        patient.chronicConditions ? JSON.stringify(patient.chronicConditions) : null,
        patient.medications ? JSON.stringify(patient.medications) : null,
        'active'
      ]
    );

    const patientId = result.lastID;
    console.log(`Created patient ${patient.firstName} ${patient.lastName} (ID: ${patientId})`);

    const visitIdMap = [];
    for (const visit of patient.visits || []) {
      const visitId = await upsertVisit(doctorId, patientId, visit);
      visitIdMap.push(visitId);
    }

    for (const prescription of patient.prescriptions || []) {
      const visitIndex = prescription.visitIndex ?? 0;
      const visitId = visitIdMap[visitIndex] || visitIdMap[0];
      if (visitId) {
        await insertPrescription(doctorId, patientId, visitId, prescription);
      }
    }

    for (const order of patient.labOrders || []) {
      const visitIndex = order.visitIndex ?? 0;
      const visitId = visitIdMap[visitIndex] || visitIdMap[0];
      if (visitId) {
        await insertLabOrder(doctorId, patientId, visitId, order);
      }
    }

    for (const order of patient.radiologyOrders || []) {
      const visitIndex = order.visitIndex ?? 0;
      const visitId = visitIdMap[visitIndex] || visitIdMap[0];
      if (visitId) {
        await insertRadiologyOrder(doctorId, patientId, visitId, order);
      }
    }

    for (const appointment of patient.appointments || []) {
      const visitIndex = appointment.visitIndex ?? 0;
      const visitId = visitIdMap[visitIndex] || visitIdMap[0];
      if (visitId) {
        await insertAppointment(doctorId, patientId, visitId, appointment);
      }
    }
  }

  console.log('Seeding complete.');
}

seedPatients()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to seed chronic patients', err);
    process.exit(1);
  });
