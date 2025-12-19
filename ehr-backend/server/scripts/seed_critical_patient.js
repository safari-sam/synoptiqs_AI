const { initializeDatabase, get, run } = require('../db');

const DOCTOR_EMAIL = 'samuel.onyango@ehr.local';

const patientProfile = {
  firstName: 'Naomi',
  lastName: 'Adera',
  gender: 'female',
  dateOfBirth: '1967-09-25',
  email: 'naomi.adera.critical@example.com',
  phone: '+254701555777',
  address: 'High Dependency Ward Follow-up Clinic, Kenyatta National Hospital, Nairobi',
  bloodType: 'O+',
  heightCm: 168,
  weightKg: 102,
  emergencyContact: 'Daniel Adera (+254701555778)',
  insurance: 'NHIF Critical Care',
  allergies: ['Iodinated contrast dye', 'NSAIDs (renal risk)'],
  chronicConditions: [
    'Type 2 diabetes mellitus with insulin dependence',
    'Ischemic cardiomyopathy with reduced ejection fraction',
    'Chronic kidney disease stage 4 (cardiorenal syndrome)',
    'Congestive hepatopathy with chronic passive liver congestion',
    'Chronic obstructive pulmonary disease with chronic bronchitis phenotype'
  ],
  baselineMedications: [
    'Insulin glargine 100u/mL',
    'Insulin lispro rapid acting',
    'Lisinopril 20mg Tablet',
    'Carvedilol 25mg Tablet',
    'Torsemide 40mg Tablet'
  ]
};

const visits = [
  {
    visitDate: '2016-04-18 09:20:00',
    chiefComplaint: 'Initial evaluation for uncontrolled diabetes, progressive fatigue, and exertional dyspnea.',
    hpi: '55-year-old female with longstanding hypertension and active tobacco use presenting with severe hyperglycemia, 8 kg weight gain, nocturnal polyuria, and exertional dyspnea. Reports poor dietary adherence and inconsistent medication use.',
    reviewOfSystems: {
      General: 'Fatigue, night sweats, 8 kg weight gain over 6 months.',
      Cardiovascular: 'Exertional dyspnea, orthopnea requiring two pillows, intermittent palpitations.',
      Respiratory: 'Chronic cough with scant sputum, no pleuritic pain.',
      Endocrine: 'Polyuria, polydipsia, blurred vision.',
      Neurologic: 'Intermittent numbness and burning in toes.'
    },
    physicalExam: {
      General: 'Obese, tired appearing, mild peripheral cyanosis.',
      Cardiovascular: 'BP 162/98 mmHg, S4 gallop, displaced PMI.',
      Respiratory: 'Scattered end-expiratory wheeze, diminished breath sounds at bases.',
      Abdomen: 'Hepatomegaly 2 cm below costal margin, nontender.',
      Extremities: 'Trace ankle edema, calloused heels, decreased 10 g monofilament sensation.'
    },
    diagnosis: 'Uncontrolled type 2 diabetes mellitus with early neuropathy; hypertensive heart disease; obesity; suspected early cardiorenal syndrome.',
    treatmentPlan: 'Initiated basal-bolus insulin (glargine plus lispro), uptitrated lisinopril to 20 mg daily, started high-intensity atorvastatin 40 mg nightly, scheduled baseline echocardiogram, prescribed incentive spirometry and pulmonary rehab breathing exercises, and delivered 45-minute counseling on carbohydrate counting, sodium restriction (<2 g/day), smoking cessation resources, daily blood glucose and weight logs, and nightly foot inspections.',
    vitals: {
      bloodPressure: '162/98',
      pulse: '96',
      temperature: '36.8',
      respiratory: '20',
      oxygenSaturation: '95%',
      weight: '102 kg'
    },
    admitted: false,
    summary: 'Established critical cardiometabolic baseline with HbA1c 11.2% and signs of hypertensive heart disease. Lifestyle plan emphasised sodium restriction, fluid limit 1.5 L/day, structured walking, pulmonary hygiene, and smoking cessation with nicotine replacement. Coordinated dietitian referral and cardiac rehab enrollment within 4 weeks.',
    labs: [
      {
        testName: 'HbA1c',
        priority: 'Routine',
        notes: 'Baseline glycemic control',
        orderedAt: '2016-04-18 09:45:00',
        resultSummary: 'HbA1c 11.2 %',
        resultDate: '2016-04-19 07:30:00',
        status: 'completed',
        resultDetails: [
          { key: 'hba1c', label: 'Hemoglobin A1c', value: '11.2', unit: '%', referenceRange: '4.0-6.0', flag: 'H' },
          { key: 'estimated_average_glucose', label: 'Estimated Average Glucose', value: '275', unit: 'mg/dL', referenceRange: '70-126', flag: 'H' }
        ]
      },
      {
        testName: 'Basic Metabolic Panel (BMP)',
        priority: 'Routine',
        notes: 'Assess renal function and electrolytes',
        orderedAt: '2016-04-18 10:00:00',
        resultSummary: 'Creatinine 1.3 mg/dL, eGFR 58 mL/min/1.73m².',
        resultDate: '2016-04-18 16:15:00',
        status: 'completed',
        resultDetails: [
          { key: 'glucose', label: 'Glucose', value: '186', unit: 'mg/dL', referenceRange: '70-99', flag: 'H' },
          { key: 'creatinine', label: 'Creatinine', value: '1.3', unit: 'mg/dL', referenceRange: '0.6-1.1', flag: 'H' },
          { key: 'egfr', label: 'eGFR', value: '58', unit: 'mL/min/1.73m²', referenceRange: '>90', flag: 'L' },
          { key: 'potassium', label: 'Potassium', value: '4.8', unit: 'mmol/L', referenceRange: '3.5-5.1', flag: '' }
        ]
      },
      {
        testName: 'Lipid Panel',
        priority: 'Routine',
        notes: 'Baseline cardiovascular risk',
        orderedAt: '2016-04-18 10:05:00',
        resultSummary: 'LDL 158 mg/dL, HDL 32 mg/dL, Triglycerides 260 mg/dL.',
        resultDate: '2016-04-19 08:10:00',
        status: 'completed',
        resultDetails: [
          { key: 'ldl', label: 'LDL Cholesterol', value: '158', unit: 'mg/dL', referenceRange: '<100', flag: 'H' },
          { key: 'hdl', label: 'HDL Cholesterol', value: '32', unit: 'mg/dL', referenceRange: '>50', flag: 'L' },
          { key: 'triglycerides', label: 'Triglycerides', value: '260', unit: 'mg/dL', referenceRange: '<150', flag: 'H' }
        ]
      }
    ],
    radiology: [
      {
        testName: 'Baseline Echocardiogram',
        priority: 'Routine',
        notes: 'Assess suspected cardiomyopathy',
        orderedAt: '2016-04-18 11:20:00',
        result: 'LVEF 40%, concentric LVH, mild diastolic dysfunction.',
        resultDate: '2016-04-18 15:30:00',
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Insulin glargine 100u/mL',
        dosage: '26 units',
        frequency: 'Once nightly',
        duration: 'Continuous',
        instructions: 'Administer at 22:00 and record fasting glucose daily.'
      },
      {
        medicationName: 'Insulin lispro',
        dosage: '6 units',
        frequency: 'Before each meal',
        duration: 'Continuous',
        instructions: 'Adjust per sliding scale; reinforce carb counting.'
      },
      {
        medicationName: 'Lisinopril 20mg Tablet',
        dosage: '20 mg',
        frequency: 'Once daily',
        duration: 'Continuous',
        instructions: 'Take each morning; monitor potassium and creatinine.'
      },
      {
        medicationName: 'Atorvastatin 40mg Tablet',
        dosage: '40 mg',
        frequency: 'Once nightly',
        duration: 'Continuous',
        instructions: 'Take at bedtime; monitor liver enzymes in 3 months.'
      },
      {
        medicationName: 'Torsemide 40mg Tablet',
        dosage: '40 mg',
        frequency: 'Once daily',
        duration: 'Continuous',
        instructions: 'Take in the morning; maintain fluid diary.'
      }
    ]
  },
  {
    visitDate: '2017-01-10 10:05:00',
    chiefComplaint: 'Follow-up for persistent edema, foamy urine, and blood pressure variability.',
    hpi: 'Reports improved glucose logging but ongoing orthopnea, rising home blood pressures, new onset foamy urine, nocturnal leg cramps, and reduced exercise tolerance despite medication compliance.',
    reviewOfSystems: {
      Cardiovascular: 'Paroxysmal nocturnal dyspnea twice monthly, palpitations controlled with beta blocker.',
      Renal: 'Persistent foamy urine, mild flank discomfort, nocturia x3.',
      Respiratory: 'Morning cough with white sputum, mild exertional wheeze.',
      Endocrine: 'Fasting glucose now 120-160 mg/dL range.',
      GI: 'Early satiety, no abdominal pain.'
    },
    physicalExam: {
      General: 'Less fatigued, still obese.',
      Cardiovascular: 'BP 148/92 mmHg, S3 gallop, elevated JVP 10 cm.',
      Respiratory: 'Basilar crackles, mild wheeze on forced expiration.',
      Abdomen: 'Mild hepatomegaly, no ascites.',
      Extremities: '1+ pitting edema mid-shin, healing callouses.'
    },
    diagnosis: 'Type 2 diabetes mellitus with microalbuminuria; CKD stage 3a; hypertensive heart disease with fluid overload; congestive hepatopathy.',
    treatmentPlan: 'Added empagliflozin 10 mg daily for renal protection, initiated spironolactone 12.5 mg nightly, intensified torsemide to 40 mg twice daily with potassium monitoring, reinforced renal diet (protein 0.8 g/kg, sodium 1.5 g/day), prescribed daily seated pedal exercises, and provided written plan for weight trending and sick-day rules.',
    vitals: {
      bloodPressure: '148/92',
      pulse: '88',
      temperature: '36.7',
      respiratory: '18',
      oxygenSaturation: '94%',
      weight: '100 kg'
    },
    admitted: false,
    summary: 'Progressive cardiorenal syndrome identified with albuminuria 280 mg/g and eGFR 52 mL/min. Reinforced nephroprotective regimen, fluid restriction 1.5 L/day, and daily home blood pressure/weight logs. Coordinated pulmonary rehab intake for COPD overlap and scheduled nephrology consult within 6 weeks.',
    labs: [
      {
        testName: 'Urine Albumin-to-Creatinine Ratio',
        priority: 'Routine',
        notes: 'Assess diabetic nephropathy progression',
        orderedAt: '2017-01-10 10:20:00',
        resultSummary: 'Albumin-to-creatinine ratio 280 mg/g.',
        resultDate: '2017-01-11 09:00:00',
        status: 'completed',
        resultDetails: [
          { key: 'uacr', label: 'Albumin-to-Creatinine Ratio', value: '280', unit: 'mg/g', referenceRange: '<30', flag: 'H' }
        ]
      },
      {
        testName: 'Comprehensive Metabolic Panel (CMP)',
        priority: 'Routine',
        notes: 'Trend renal and hepatic markers',
        orderedAt: '2017-01-10 10:25:00',
        resultSummary: 'Creatinine 1.6 mg/dL, eGFR 52 mL/min/1.73m², ALT 48 U/L.',
        resultDate: '2017-01-10 17:20:00',
        status: 'completed',
        resultDetails: [
          { key: 'creatinine', label: 'Creatinine', value: '1.6', unit: 'mg/dL', referenceRange: '0.6-1.1', flag: 'H' },
          { key: 'egfr', label: 'eGFR', value: '52', unit: 'mL/min/1.73m²', referenceRange: '>90', flag: 'L' },
          { key: 'alt', label: 'ALT', value: '48', unit: 'U/L', referenceRange: '7-35', flag: 'H' },
          { key: 'potassium', label: 'Potassium', value: '4.6', unit: 'mmol/L', referenceRange: '3.5-5.1', flag: '' }
        ]
      }
    ],
    radiology: [
      {
        testName: 'Follow-up Echocardiogram',
        priority: 'Routine',
        notes: 'Assess LV function post medical optimization',
        orderedAt: '2017-01-10 11:10:00',
        result: 'LVEF 38%, moderate LV dilation, mild pulmonary hypertension.',
        resultDate: '2017-01-10 15:45:00',
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Empagliflozin 10mg Tablet',
        dosage: '10 mg',
        frequency: 'Once daily',
        duration: 'Continuous',
        instructions: 'Take every morning; hold during dehydration or illness.'
      },
      {
        medicationName: 'Torsemide 20mg Tablet',
        dosage: '40 mg',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Take 08:00 and 14:00; record urine output and weights.'
      },
      {
        medicationName: 'Spironolactone 25mg Tablet',
        dosage: '12.5 mg',
        frequency: 'Once nightly',
        duration: 'Continuous',
        instructions: 'Take with evening meal; monitor potassium monthly.'
      },
      {
        medicationName: 'Carvedilol 25mg Tablet',
        dosage: '12.5 mg',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Take with breakfast and dinner; hold if HR <55 bpm.'
      },
      {
        medicationName: 'Insulin lispro',
        dosage: '6-10 units',
        frequency: 'Before meals per sliding scale',
        duration: 'Continuous',
        instructions: 'Adjust dose based on carbohydrate intake and glucose log.'
      }
    ]
  },
  {
    visitDate: '2018-08-03 03:15:00',
    chiefComplaint: 'Emergency admission for crushing chest pain, hypotension, and hypoxia.',
    hpi: 'Presented via ambulance with 45 minutes of substernal chest pain radiating to left arm, diaphoresis, and dyspnea. Arrival BP 88/60 mmHg, SpO₂ 86% on room air. Required emergent coronary angiography with LAD stent placement, intubation, vasopressor support, and renal protective strategy in ICU.',
    reviewOfSystems: {
      Cardiovascular: 'Acute chest pain, presyncope, profound fatigue.',
      Respiratory: 'Acute respiratory distress, productive cough with pink froth.',
      Renal: 'Marked decline in urine output over preceding 24 hours.',
      Hepatic: 'Right upper quadrant fullness, anorexia.',
      Neurologic: 'Transient confusion during hypotensive episode.'
    },
    physicalExam: {
      General: 'Intubated, critically ill, diaphoretic.',
      Cardiovascular: 'BP 94/60 mmHg on norepinephrine, tachycardic 108 bpm, cool extremities.',
      Respiratory: 'Ventilated breath sounds, bibasilar crackles, frothy secretions.',
      Abdomen: 'Hepatomegaly with mild tenderness.',
      Extremities: '2+ pitting edema to knees, mottled skin.'
    },
    diagnosis: 'NSTEMI complicated by cardiogenic shock; acute decompensated systolic heart failure; acute kidney injury on CKD; ischemic hepatitis; COPD exacerbation requiring mechanical ventilation.',
    treatmentPlan: 'Performed emergent PCI to proximal LAD with drug-eluting stent, initiated dual antiplatelet therapy, continuous IV furosemide with ultrafiltration goal 1 L/day, milrinone infusion for inotropy, strict fluid limit 1.2 L/day, prophylactic anticoagulation, ventilator lung-protective strategy with daily spontaneous breathing trials, and aggressive glycemic control via insulin infusion. Family counselling emphasised smoking cessation, cardiac rehab, renal diet, and pulmonary hygiene post extubation.',
    vitals: {
      bloodPressure: '94/60',
      pulse: '108',
      temperature: '37.2',
      respiratory: '18 (mechanical)',
      oxygenSaturation: '92% (on ventilator)',
      weight: '98 kg'
    },
    admitted: true,
    summary: 'Critical ICU admission for cardiogenic shock with multi-organ involvement (cardiac, renal, hepatic, respiratory). Successful LAD stenting, stabilized on milrinone and high-dose diuretics, dialysis avoided with aggressive fluid removal. Initiated nicotine replacement and reinforced low-sodium plant-forward diet plan. Planned inpatient cardiac rehab and nephrology co-management.',
    labs: [
      {
        testName: 'Troponin I',
        priority: 'Stat',
        notes: 'NSTEMI confirmation',
        orderedAt: '2018-08-03 03:20:00',
        resultSummary: 'Troponin I 2.3 ng/mL.',
        resultDate: '2018-08-03 03:50:00',
        status: 'completed',
        resultDetails: [
          { key: 'troponin_i', label: 'Troponin I', value: '2.3', unit: 'ng/mL', referenceRange: '<0.04', flag: 'H' }
        ]
      },
      {
        testName: 'NT-proBNP',
        priority: 'Stat',
        notes: 'Assess heart failure severity',
        orderedAt: '2018-08-03 03:25:00',
        resultSummary: 'NT-proBNP 2800 pg/mL.',
        resultDate: '2018-08-03 04:10:00',
        status: 'completed',
        resultDetails: [
          { key: 'ntprobnp', label: 'NT-proBNP', value: '2800', unit: 'pg/mL', referenceRange: '<125', flag: 'H' }
        ]
      },
      {
        testName: 'Arterial Blood Gas',
        priority: 'Stat',
        notes: 'Evaluate oxygenation and perfusion',
        orderedAt: '2018-08-03 03:30:00',
        resultSummary: 'pH 7.29, PaO₂ 58 mmHg on FiO₂ 0.6.',
        resultDate: '2018-08-03 03:35:00',
        status: 'completed',
        resultDetails: [
          { key: 'ph', label: 'pH', value: '7.29', unit: '', referenceRange: '7.35-7.45', flag: 'L' },
          { key: 'pao2', label: 'PaO₂', value: '58', unit: 'mmHg', referenceRange: '80-100', flag: 'L' },
          { key: 'paco2', label: 'PaCO₂', value: '48', unit: 'mmHg', referenceRange: '35-45', flag: 'H' }
        ]
      }
    ],
    radiology: [
      {
        testName: 'Coronary Angiography',
        priority: 'Stat',
        notes: 'Evaluate culprit lesion',
        orderedAt: '2018-08-03 03:40:00',
        result: '100% proximal LAD occlusion treated with DES; diffuse multivessel disease.',
        resultDate: '2018-08-03 04:30:00',
        status: 'completed'
      },
      {
        testName: 'Portable Chest X-Ray',
        priority: 'Stat',
        notes: 'Assess pulmonary edema and line placement',
        orderedAt: '2018-08-03 05:00:00',
        result: 'Diffuse bilateral alveolar edema, appropriate ETT and Swan-Ganz catheter positions.',
        resultDate: '2018-08-03 05:20:00',
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Aspirin 81mg Tablet',
        dosage: '81 mg',
        frequency: 'Once daily',
        duration: 'Continuous',
        instructions: 'Start post-PCI; lifelong secondary prevention.'
      },
      {
        medicationName: 'Ticagrelor 90mg Tablet',
        dosage: '90 mg',
        frequency: 'Twice daily',
        duration: '12 months',
        instructions: 'Take every 12 hours; monitor for dyspnea and bleeding.'
      },
      {
        medicationName: 'Milrinone Infusion',
        dosage: '0.25 mcg/kg/min',
        frequency: 'Continuous infusion',
        duration: 'During admission',
        instructions: 'Titrate by ICU protocol for cardiogenic shock.'
      },
      {
        medicationName: 'Intravenous Furosemide',
        dosage: '10 mg/hr',
        frequency: 'Continuous infusion',
        duration: 'During admission',
        instructions: 'Adjust to achieve net negative 1 L/day.'
      },
      {
        medicationName: 'Insulin infusion',
        dosage: 'Protocol based',
        frequency: 'Continuous',
        duration: 'During ICU stay',
        instructions: 'Maintain glucose 140-180 mg/dL.'
      }
    ]
  },
  {
    visitDate: '2019-05-22 09:45:00',
    chiefComplaint: 'Advanced heart failure follow-up post NSTEMI and rehab discharge.',
    hpi: 'Completed inpatient cardiac rehab but still notes exertional dyspnea climbing one flight of stairs, orthopnea requiring three pillows, and abdominal bloating. Reports strict medication adherence and smoking cessation for eight months.',
    reviewOfSystems: {
      Cardiovascular: 'NYHA class III symptoms, no recurrent chest pain.',
      Respiratory: 'Improved cough, still uses inhaler twice daily.',
      Renal: 'Urine output 1.2 L/day, no dysuria.',
      Hepatic: 'Mild right upper quadrant discomfort, appetite reduced.',
      Endocrine: 'Glucose logs 120-170 mg/dL fasting despite insulin adjustments.'
    },
    physicalExam: {
      General: 'Chronically ill but alert.',
      Cardiovascular: 'BP 128/84 mmHg, HR 82 bpm, elevated JVP 11 cm, holosystolic murmur apex.',
      Respiratory: 'Bibasilar crackles, expiratory wheeze resolved with nebulizer.',
      Abdomen: 'Distended, shifting dullness, mild hepatomegaly.',
      Extremities: '2+ pitting edema mid-calf, healed foot ulcer with protective footwear.'
    },
    diagnosis: 'Chronic systolic heart failure with reduced EF 30%; cardiorenal syndrome progressing; controlled diabetes with insulin; chronic liver congestion.',
    treatmentPlan: 'Optimized GDMT by adding sacubitril/valsartan 24/26 mg BID, continued carvedilol uptitration, converted loop diuretic to bumetanide 2 mg BID for better absorption, initiated home nocturnal oxygen 1 L/min for Cheyne-Stokes respirations, reinforced strict sodium 1.5 g/day, fluid limit 1.5 L/day, daily seated resistance training, and scheduled hepatology consult for congestive hepatopathy.',
    vitals: {
      bloodPressure: '128/84',
      pulse: '82',
      temperature: '36.6',
      respiratory: '19',
      oxygenSaturation: '93% (room air)',
      weight: '96 kg'
    },
    admitted: false,
    summary: 'Stable post-rehab but persistent NYHA III symptoms with proBNP 1650 pg/mL and creatinine 1.9 mg/dL. Added sacubitril/valsartan and adjusted diuretics. Emphasised low-sodium diet, fluid tracking, resistance band training, and nightly oxygen adherence. Referred to combined heart failure-kidney clinic for coordinated management.',
    labs: [
      {
        testName: 'NT-proBNP',
        priority: 'Routine',
        notes: 'Trend heart failure severity',
        orderedAt: '2019-05-22 10:00:00',
        resultSummary: 'NT-proBNP 1650 pg/mL.',
        resultDate: '2019-05-22 12:45:00',
        status: 'completed',
        resultDetails: [
          { key: 'ntprobnp', label: 'NT-proBNP', value: '1650', unit: 'pg/mL', referenceRange: '<125', flag: 'H' }
        ]
      },
      {
        testName: 'Comprehensive Metabolic Panel (CMP)',
        priority: 'Routine',
        notes: 'Assess renal and hepatic trend',
        orderedAt: '2019-05-22 10:05:00',
        resultSummary: 'Creatinine 1.9 mg/dL, eGFR 45 mL/min/1.73m², Bilirubin 1.4 mg/dL.',
        resultDate: '2019-05-22 14:10:00',
        status: 'completed',
        resultDetails: [
          { key: 'creatinine', label: 'Creatinine', value: '1.9', unit: 'mg/dL', referenceRange: '0.6-1.1', flag: 'H' },
          { key: 'egfr', label: 'eGFR', value: '45', unit: 'mL/min/1.73m²', referenceRange: '>90', flag: 'L' },
          { key: 'bilirubin', label: 'Total Bilirubin', value: '1.4', unit: 'mg/dL', referenceRange: '0.3-1.2', flag: 'H' }
        ]
      }
    ],
    radiology: [
      {
        testName: 'Cardiac MRI',
        priority: 'Routine',
        notes: 'Viability assessment post MI',
        orderedAt: '2019-05-22 11:30:00',
        result: 'Scar in anterior wall with residual viability; EF 30%; moderate functional MR.',
        resultDate: '2019-05-24 09:00:00',
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Sacubitril/Valsartan 24/26mg Tablet',
        dosage: 'One tablet',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Start after 36-hour ACE inhibitor washout; monitor blood pressure and renal function.'
      },
      {
        medicationName: 'Bumetanide 2mg Tablet',
        dosage: '2 mg',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Take at 08:00 and 14:00 with potassium check weekly.'
      },
      {
        medicationName: 'Carvedilol 25mg Tablet',
        dosage: '25 mg',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Take with meals; titrate as tolerated to HR 60-70 bpm.'
      },
      {
        medicationName: 'Insulin glargine 100u/mL',
        dosage: '30 units',
        frequency: 'Once nightly',
        duration: 'Continuous',
        instructions: 'Adjust dose every 3 days based on fasting glucose.'
      },
      {
        medicationName: 'Tiotropium Inhaler 18mcg',
        dosage: '18 mcg',
        frequency: 'Once daily',
        duration: 'Continuous',
        instructions: 'Inhale each morning; continue pulmonary rehab exercises.'
      }
    ]
  },
  {
    visitDate: '2020-10-14 07:50:00',
    chiefComplaint: 'Hospital admission for infected diabetic foot ulcer, fever, and worsening renal function.',
    hpi: 'Developed right plantar ulcer after minor trauma, now with foul drainage, fevers to 38.5°C, chills, progressive leg swelling, and difficulty ambulating. Blood sugars 220-280 mg/dL despite insulin. Presented hypotensive 96/60 mmHg, tachycardic 110 bpm.',
    reviewOfSystems: {
      General: 'Fever, chills, night sweats.',
      Cardiovascular: 'Worsening edema, orthopnea.',
      Respiratory: 'Baseline COPD cough, no new sputum.',
      Renal: 'Urine output down to 600 mL/day.',
      Musculoskeletal: 'Severe foot pain with erythema up to ankle.'
    },
    physicalExam: {
      General: 'Ill-appearing, febrile.',
      Cardiovascular: 'BP 98/64 mmHg post fluids, HR 105 bpm, distant heart sounds.',
      Respiratory: 'Crackles halfway up lung fields.',
      Abdomen: 'Mild ascites.',
      Extremities: 'Right plantar ulcer 3x4 cm with purulence, malodor, surrounding cellulitis; 2+ edema.'
    },
    diagnosis: 'Diabetic foot sepsis with suspected osteomyelitis; acute on chronic kidney injury; decompensated heart failure; COPD stable; anemia of chronic disease.',
    treatmentPlan: 'Admitted to high-dependency unit, started broad-spectrum IV antibiotics (piperacillin-tazobactam + vancomycin), initiated insulin drip transitioning to basal-bolus when stable, performed surgical debridement with podiatry, applied negative pressure wound therapy, intensified diuresis with IV bumetanide + chlorothiazide, consulted vascular surgery, enforced non-weight-bearing with protective boot, and reinforced high-protein renal-adjusted diet with vitamin supplementation and smoking cessation reinforcement.',
    vitals: {
      bloodPressure: '98/64',
      pulse: '105',
      temperature: '38.3',
      respiratory: '22',
      oxygenSaturation: '92% on 2 L O₂',
      weight: '101 kg'
    },
    admitted: true,
    summary: 'Sepsis from diabetic foot with WBC 18 x10⁹/L, CRP 185 mg/L, creatinine 2.8 mg/dL. Underwent urgent surgical debridement, started VAC therapy and broad-spectrum antibiotics, resumed insulin protocol, and coordinated wound care with weekly podiatry review. Emphasised strict off-loading, plant-based renal diet, and home caregiver education for wound dressing.',
    labs: [
      {
        testName: 'Complete Blood Count (CBC)',
        priority: 'Stat',
        notes: 'Evaluate for infection and anemia',
        orderedAt: '2020-10-14 08:00:00',
        resultSummary: 'WBC 18.2 x10⁹/L, Hemoglobin 9.8 g/dL.',
        resultDate: '2020-10-14 08:30:00',
        status: 'completed',
        resultDetails: [
          { key: 'wbc', label: 'WBC', value: '18.2', unit: 'x10⁹/L', referenceRange: '4.0-10.5', flag: 'H' },
          { key: 'hemoglobin', label: 'Hemoglobin', value: '9.8', unit: 'g/dL', referenceRange: '12.0-16.0', flag: 'L' },
          { key: 'platelets', label: 'Platelets', value: '420', unit: 'x10⁹/L', referenceRange: '150-400', flag: 'H' }
        ]
      },
      {
        testName: 'Inflammatory Markers',
        priority: 'Stat',
        notes: 'Monitor severity of infection',
        orderedAt: '2020-10-14 08:05:00',
        resultSummary: 'CRP 185 mg/L, ESR 78 mm/hr.',
        resultDate: '2020-10-14 09:15:00',
        status: 'completed',
        resultDetails: [
          { key: 'crp', label: 'C-Reactive Protein', value: '185', unit: 'mg/L', referenceRange: '<5', flag: 'H' },
          { key: 'esr', label: 'ESR', value: '78', unit: 'mm/hr', referenceRange: '<20', flag: 'H' }
        ]
      },
      {
        testName: 'Renal Function Tests (RFT)',
        priority: 'Stat',
        notes: 'Assess AKI severity',
        orderedAt: '2020-10-14 08:10:00',
        resultSummary: 'Creatinine 2.8 mg/dL, eGFR 28 mL/min/1.73m², Potassium 5.4 mmol/L.',
        resultDate: '2020-10-14 08:55:00',
        status: 'completed',
        resultDetails: [
          { key: 'creatinine', label: 'Creatinine', value: '2.8', unit: 'mg/dL', referenceRange: '0.6-1.1', flag: 'H' },
          { key: 'egfr', label: 'eGFR', value: '28', unit: 'mL/min/1.73m²', referenceRange: '>90', flag: 'L' },
          { key: 'bun', label: 'BUN', value: '58', unit: 'mg/dL', referenceRange: '7-20', flag: 'H' },
          { key: 'potassium', label: 'Potassium', value: '5.4', unit: 'mmol/L', referenceRange: '3.5-5.1', flag: 'H' }
        ]
      }
    ],
    radiology: [
      {
        testName: 'Right Foot MRI',
        priority: 'Stat',
        notes: 'Assess for osteomyelitis',
        orderedAt: '2020-10-14 11:30:00',
        result: 'Osteomyelitis involving fourth metatarsal head with surrounding cellulitis.',
        resultDate: '2020-10-14 14:20:00',
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Piperacillin-Tazobactam 4.5g IV',
        dosage: '4.5 g',
        frequency: 'Every 8 hours',
        duration: '14 days',
        instructions: 'Adjust dose per renal function; monitor cultures.'
      },
      {
        medicationName: 'Vancomycin IV',
        dosage: '15 mg/kg',
        frequency: 'Every 24 hours',
        duration: '14 days',
        instructions: 'Trough goal 15-20 mcg/mL; adjust per levels.'
      },
      {
        medicationName: 'Insulin glargine 100u/mL',
        dosage: '28 units',
        frequency: 'Once nightly',
        duration: 'Continuous',
        instructions: 'Resume after insulin infusion; adjust per endocrinology.'
      },
      {
        medicationName: 'Insulin lispro',
        dosage: '8-12 units',
        frequency: 'Before meals',
        duration: 'Continuous',
        instructions: 'High-dose sliding scale while infection resolves.'
      },
      {
        medicationName: 'Bumetanide 2mg IV',
        dosage: '2 mg',
        frequency: 'Every 12 hours',
        duration: 'During admission',
        instructions: 'Combine with chlorothiazide IV 500 mg for synergy.'
      }
    ]
  },
  {
    visitDate: '2021-07-19 11:10:00',
    chiefComplaint: 'Post-sepsis multidisciplinary review for progressive cardiorenal failure.',
    hpi: 'Recovered from foot sepsis with wound healing. Reports profound fatigue, exertional dyspnea at 20 meters, poor appetite, and symptomatic orthostatic hypotension. Adherent to renal and cardiac diet. Describes restless legs and insomnia.',
    reviewOfSystems: {
      Cardiovascular: 'Persistent orthopnea, no chest pain, resting tachycardia controlled with beta blocker.',
      Renal: 'Urine output 900 mL/day, pruritus, metallic taste.',
      Respiratory: 'Uses nocturnal oxygen 1 L/min, minimal wheeze.',
      GI: 'Nausea with early satiety, mild ascites.',
      Hematologic: 'Easy bruising, pallor.'
    },
    physicalExam: {
      General: 'Chronically ill, pale, mildly cachectic.',
      Cardiovascular: 'BP 104/68 mmHg, HR 78 bpm, JVP 12 cm.',
      Respiratory: 'Bibasilar crackles, mild wheeze.',
      Abdomen: 'Positive fluid wave, hepatomegaly 3 cm.',
      Extremities: '1+ edema, healed plantar wound with VAC discontinued.'
    },
    diagnosis: 'Combined cardiorenal-hepatic syndrome with CKD stage 4, anemia of chronic disease, controlled diabetes, COPD stable, insomnia due to restless legs.',
    treatmentPlan: 'Initiated sodium bicarbonate 650 mg TID for metabolic acidosis, started darbepoetin alfa 60 mcg q4weeks, adjusted bumetanide to 2 mg TID with PRN metolazone for weight gain, added gabapentin 100 mg nightly for restless legs, reinforced renal-friendly, high-calorie, low-sodium diet, and scheduled evaluation for home hemodialysis candidacy. Encouraged seated pedal ergometer and daily diaphragmatic breathing exercises.',
    vitals: {
      bloodPressure: '104/68',
      pulse: '78',
      temperature: '36.4',
      respiratory: '18',
      oxygenSaturation: '94% on 1 L O₂',
      weight: '94 kg'
    },
    admitted: false,
    summary: 'Advanced multi-organ involvement with eGFR 22 mL/min, hemoglobin 9.2 g/dL, ferritin 820 ng/mL, bicarbonate 18 mmol/L. Commenced darbepoetin, sodium bicarbonate, and intensified diuretic regimen. Reinforced lifestyle changes: sodium <1.5 g/day, fluid limit 1.5 L/day, plant-based renal diet, twice-daily spirometry, and caregiver-supported medication reconciliation.',
    labs: [
      {
        testName: 'Renal Function Tests (RFT)',
        priority: 'Routine',
        notes: 'Trend CKD progression',
        orderedAt: '2021-07-19 11:25:00',
        resultSummary: 'Creatinine 2.6 mg/dL, eGFR 22 mL/min/1.73m², Bicarbonate 18 mmol/L.',
        resultDate: '2021-07-19 14:00:00',
        status: 'completed',
        resultDetails: [
          { key: 'creatinine', label: 'Creatinine', value: '2.6', unit: 'mg/dL', referenceRange: '0.6-1.1', flag: 'H' },
          { key: 'egfr', label: 'eGFR', value: '22', unit: 'mL/min/1.73m²', referenceRange: '>90', flag: 'L' },
          { key: 'bicarbonate', label: 'Bicarbonate', value: '18', unit: 'mmol/L', referenceRange: '22-28', flag: 'L' },
          { key: 'potassium', label: 'Potassium', value: '4.9', unit: 'mmol/L', referenceRange: '3.5-5.1', flag: '' }
        ]
      },
      {
        testName: 'Complete Blood Count (CBC)',
        priority: 'Routine',
        notes: 'Assess anemia and inflammation',
        orderedAt: '2021-07-19 11:28:00',
        resultSummary: 'Hemoglobin 9.2 g/dL, Ferritin 820 ng/mL, TSAT 18%.',
        resultDate: '2021-07-19 13:40:00',
        status: 'completed',
        resultDetails: [
          { key: 'hemoglobin', label: 'Hemoglobin', value: '9.2', unit: 'g/dL', referenceRange: '12.0-16.0', flag: 'L' },
          { key: 'ferritin', label: 'Ferritin', value: '820', unit: 'ng/mL', referenceRange: '15-150', flag: 'H' },
          { key: 'transferrin_saturation', label: 'Transferrin Saturation', value: '18', unit: '%', referenceRange: '>20', flag: 'L' }
        ]
      }
    ],
    radiology: [
      {
        testName: 'Abdominal Ultrasound',
        priority: 'Routine',
        notes: 'Monitor congestive hepatopathy and ascites',
        orderedAt: '2021-07-19 12:15:00',
        result: 'Mild ascites, congested hepatic veins, no focal lesions.',
        resultDate: '2021-07-19 16:10:00',
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Sodium Bicarbonate 650mg Tablet',
        dosage: '650 mg',
        frequency: 'Three times daily',
        duration: 'Continuous',
        instructions: 'Take after meals to correct metabolic acidosis.'
      },
      {
        medicationName: 'Darbepoetin alfa 60mcg Injection',
        dosage: '60 mcg',
        frequency: 'Every 4 weeks',
        duration: 'Continuous',
        instructions: 'Administer subcutaneously in clinic; monitor hemoglobin monthly.'
      },
      {
        medicationName: 'Bumetanide 2mg Tablet',
        dosage: '2 mg',
        frequency: 'Three times daily',
        duration: 'Continuous',
        instructions: 'Take 06:00, 12:00, 18:00; log urine output.'
      },
      {
        medicationName: 'Metolazone 2.5mg Tablet',
        dosage: '2.5 mg',
        frequency: 'PRN weight gain >1 kg',
        duration: 'As needed',
        instructions: 'Take with morning bumetanide when weight increases; recheck electrolytes next day.'
      },
      {
        medicationName: 'Gabapentin 100mg Capsule',
        dosage: '100 mg',
        frequency: 'Nightly',
        duration: 'Continuous',
        instructions: 'Take 2 hours before bedtime for restless legs.'
      }
    ]
  },
  {
    visitDate: '2022-03-28 06:40:00',
    chiefComplaint: 'ICU admission for worsening cardiogenic shock, oliguria, and hepatic congestion.',
    hpi: 'Three-day history of escalating dyspnea at rest, hypotension at home (SBP 80s), abdominal distention, confusion, and oliguria <300 mL/day. Presented to ED hypotensive 82/54 mmHg, lactate 4.1 mmol/L, requiring immediate ICU transfer.',
    reviewOfSystems: {
      Cardiovascular: 'Severe fatigue, syncope episode morning of admission.',
      Respiratory: 'Orthopnea, paroxysmal nocturnal dyspnea, productive cough with froth.',
      Renal: 'Oliguria, pruritus, metallic taste.',
      Hepatic: 'Jaundice, abdominal fullness.',
      Neurologic: 'Confusion, slowed mentation.'
    },
    physicalExam: {
      General: 'Somnolent but arousable, jaundiced, cool extremities.',
      Cardiovascular: 'BP 86/52 mmHg on norepinephrine, HR 112 bpm irregular, JVP 15 cm.',
      Respiratory: 'Diffuse crackles, accessory muscle use.',
      Abdomen: 'Large tense ascites, tender hepatomegaly.',
      Extremities: '3+ edema, mottled skin, weak pulses.'
    },
    diagnosis: 'Cardiogenic shock on chronic systolic heart failure (Stage D); acute kidney injury on CKD stage 4; ischemic hepatitis; COPD exacerbation; mixed metabolic-respiratory acidosis; multi-organ failure.',
    treatmentPlan: 'Placed tunneled dialysis catheter and initiated continuous renal replacement therapy (CRRT) with net ultrafiltration 150 mL/hr, started dobutamine and norepinephrine infusions, administered high-dose IV bumetanide + chlorothiazide, initiated BiPAP transitioning to mechanical ventilation overnight, administered IV methylprednisolone for COPD flare, started lactulose for hepatic encephalopathy prophylaxis, strict fluid limit 1.0 L/day, daily nutrition consult for high-calorie renal diet, and advanced directives discussion with family. Lifestyle counselling focused on sodium <1.2 g/day, daily chest physiotherapy, mindfulness breathing post-extubation, and caregiver-supported medication reconciliation.',
    vitals: {
      bloodPressure: '86/52',
      pulse: '112',
      temperature: '37.4',
      respiratory: '24 (BiPAP)',
      oxygenSaturation: '90% on BiPAP',
      weight: '97 kg'
    },
    admitted: true,
    summary: 'Third major admission with overt multi-organ failure. Initiated CRRT, dual inotrope support, and advanced lung support. Labs notable for creatinine 3.6 mg/dL, lactate 4.1 mmol/L, AST 82 U/L, bilirubin 2.2 mg/dL, ABG pH 7.28. Planned transition to intermittent hemodialysis once hemodynamics stabilize and referral to transplant evaluation pathway.',
    labs: [
      {
        testName: 'Critical Care Panel',
        priority: 'Stat',
        notes: 'Assess metabolic status in shock',
        orderedAt: '2022-03-28 06:50:00',
        resultSummary: 'Lactate 4.1 mmol/L, Creatinine 3.6 mg/dL, BUN 72 mg/dL, Potassium 5.8 mmol/L.',
        resultDate: '2022-03-28 07:15:00',
        status: 'completed',
        resultDetails: [
          { key: 'lactate', label: 'Lactate', value: '4.1', unit: 'mmol/L', referenceRange: '0.5-2.0', flag: 'H' },
          { key: 'creatinine', label: 'Creatinine', value: '3.6', unit: 'mg/dL', referenceRange: '0.6-1.1', flag: 'H' },
          { key: 'bun', label: 'BUN', value: '72', unit: 'mg/dL', referenceRange: '7-20', flag: 'H' },
          { key: 'potassium', label: 'Potassium', value: '5.8', unit: 'mmol/L', referenceRange: '3.5-5.1', flag: 'H' }
        ]
      },
      {
        testName: 'Hepatic Panel',
        priority: 'Stat',
        notes: 'Assess congestive hepatopathy',
        orderedAt: '2022-03-28 07:00:00',
        resultSummary: 'AST 82 U/L, ALT 76 U/L, Total Bilirubin 2.2 mg/dL.',
        resultDate: '2022-03-28 07:40:00',
        status: 'completed',
        resultDetails: [
          { key: 'ast', label: 'AST', value: '82', unit: 'U/L', referenceRange: '5-34', flag: 'H' },
          { key: 'alt', label: 'ALT', value: '76', unit: 'U/L', referenceRange: '7-35', flag: 'H' },
          { key: 'bilirubin', label: 'Total Bilirubin', value: '2.2', unit: 'mg/dL', referenceRange: '0.3-1.2', flag: 'H' }
        ]
      },
      {
        testName: 'Arterial Blood Gas',
        priority: 'Stat',
        notes: 'Assess ventilation and acid-base status',
        orderedAt: '2022-03-28 07:05:00',
        resultSummary: 'pH 7.28, PaCO₂ 50 mmHg, PaO₂ 62 mmHg on BiPAP FiO₂ 0.6.',
        resultDate: '2022-03-28 07:08:00',
        status: 'completed',
        resultDetails: [
          { key: 'ph', label: 'pH', value: '7.28', unit: '', referenceRange: '7.35-7.45', flag: 'L' },
          { key: 'paco2', label: 'PaCO₂', value: '50', unit: 'mmHg', referenceRange: '35-45', flag: 'H' },
          { key: 'pao2', label: 'PaO₂', value: '62', unit: 'mmHg', referenceRange: '80-100', flag: 'L' }
        ]
      }
    ],
    radiology: [
      {
        testName: 'Bedside Echocardiogram',
        priority: 'Stat',
        notes: 'Evaluate hemodynamics in shock',
        orderedAt: '2022-03-28 07:20:00',
        result: 'LVEF 22%, severe global hypokinesis, moderate functional MR, RV dysfunction.',
        resultDate: '2022-03-28 07:45:00',
        status: 'completed'
      },
      {
        testName: 'Ultrasound-Guided Dialysis Catheter Placement',
        priority: 'Stat',
        notes: 'Establish CRRT access',
        orderedAt: '2022-03-28 08:15:00',
        result: 'Right internal jugular tunneled catheter placed successfully, tip at cavoatrial junction.',
        resultDate: '2022-03-28 08:40:00',
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Dobutamine Infusion',
        dosage: '5 mcg/kg/min',
        frequency: 'Continuous',
        duration: 'During ICU stay',
        instructions: 'Titrate based on cardiac index and MAP.'
      },
      {
        medicationName: 'Norepinephrine Infusion',
        dosage: '0.08 mcg/kg/min',
        frequency: 'Continuous',
        duration: 'During ICU stay',
        instructions: 'Maintain MAP >65 mmHg.'
      },
      {
        medicationName: 'CRRT Replacement Fluid (HCO₃-based)',
        dosage: 'Effluent 2.5 L/hr',
        frequency: 'Continuous',
        duration: 'During ICU stay',
        instructions: 'Net ultrafiltration 150 mL/hr unless hypotensive.'
      },
      {
        medicationName: 'Methylprednisolone 40mg IV',
        dosage: '40 mg',
        frequency: 'Every 12 hours',
        duration: '5 days',
        instructions: 'For COPD flare; taper when stable.'
      },
      {
        medicationName: 'Lactulose 30mL Solution',
        dosage: '30 mL',
        frequency: 'Three times daily',
        duration: 'Continuous',
        instructions: 'Target 2-3 soft stools daily to prevent encephalopathy.'
      }
    ]
  },
  {
    visitDate: '2022-11-05 09:00:00',
    chiefComplaint: 'Post-ICU follow-up focusing on pulmonary rehabilitation and dialysis transition.',
    hpi: 'Now on thrice-weekly intermittent hemodialysis, reports improved alertness but ongoing exertional dyspnea, nocturnal cough, muscle wasting, and anxiety about prognosis. Maintaining sodium restriction and daily weights. No recurrent hospitalizations since March.',
    reviewOfSystems: {
      Cardiovascular: 'NYHA class III symptoms, home BP 110-120 systolic.',
      Respiratory: 'Uses nocturnal oxygen 1 L/min, occasional wheeze relieved with inhaler.',
      Renal: 'Dialysis via tunneled catheter, minimal urine output.',
      Hepatic: 'Occasional abdominal fullness, mild pruritus.',
      Psych: 'Anxiety managed with counseling, sleep improved with sleep hygiene.'
    },
    physicalExam: {
      General: 'Thin, fatigued but interactive.',
      Cardiovascular: 'BP 116/72 mmHg, HR 76 bpm, faint systolic murmur.',
      Respiratory: 'Scattered wheeze, improved aeration, no crackles.',
      Abdomen: 'Mild ascites, hepatomegaly 2 cm.',
      Extremities: 'Trace edema, well-healed catheter site.'
    },
    diagnosis: 'Stage D heart failure on dialysis with improving pulmonary status; COPD stable; chronic liver congestion; severe protein-calorie malnutrition risk.',
    treatmentPlan: 'Continued sacubitril/valsartan, carvedilol, bumetanide on non-dialysis days, and mid-week metolazone. Added inhaled budesonide/formoterol for COPD control, prescribed high-calorie renal supplements, scheduled pulmonary rehab twice weekly and cardiac rehab maintenance sessions, emphasised inspiratory muscle training, and provided cognitive behavioral strategies for anxiety and adherence reinforcement.',
    vitals: {
      bloodPressure: '116/72',
      pulse: '76',
      temperature: '36.5',
      respiratory: '18',
      oxygenSaturation: '94% on 1 L O₂',
      weight: '88 kg'
    },
    admitted: false,
    summary: 'Stabilised post-ICU with NT-proBNP 1250 pg/mL, HbA1c 7.9%, dialysis adequacy Kt/V 1.3. Enhanced COPD regimen and nutrition support. Reinforced sodium <1.5 g/day, fluid limit 1.2 L/day, supervised pulmonary rehab, and mindfulness breathing exercises. Preparing for evaluation for LVAD contraindicated due to multi-organ involvement; focus on transplant listing.',
    labs: [
      {
        testName: 'NT-proBNP',
        priority: 'Routine',
        notes: 'Trend post-shock recovery',
        orderedAt: '2022-11-05 09:15:00',
        resultSummary: 'NT-proBNP 1250 pg/mL.',
        resultDate: '2022-11-05 12:10:00',
        status: 'completed',
        resultDetails: [
          { key: 'ntprobnp', label: 'NT-proBNP', value: '1250', unit: 'pg/mL', referenceRange: '<125', flag: 'H' }
        ]
      },
      {
        testName: 'Dialysis Adequacy Panel',
        priority: 'Routine',
        notes: 'Assess hemodialysis effectiveness',
        orderedAt: '2022-11-05 09:20:00',
        resultSummary: 'Kt/V 1.3, urea reduction ratio 68%.',
        resultDate: '2022-11-05 12:45:00',
        status: 'completed',
        resultDetails: [
          { key: 'ktv', label: 'Kt/V', value: '1.3', unit: '', referenceRange: '≥1.2', flag: '' },
          { key: 'uru', label: 'Urea Reduction Ratio', value: '68', unit: '%', referenceRange: '65-80', flag: '' }
        ]
      },
      {
        testName: 'HbA1c',
        priority: 'Routine',
        notes: 'Assess glycemic trend on dialysis',
        orderedAt: '2022-11-05 09:25:00',
        resultSummary: 'HbA1c 7.9 %.',
        resultDate: '2022-11-06 08:20:00',
        status: 'completed',
        resultDetails: [
          { key: 'hba1c', label: 'Hemoglobin A1c', value: '7.9', unit: '%', referenceRange: '4.0-6.0', flag: 'H' }
        ]
      }
    ],
    radiology: [
      {
        testName: 'Pulmonary Function Tests',
        priority: 'Routine',
        notes: 'Reassess COPD control',
        orderedAt: '2022-11-05 10:30:00',
        result: 'FEV₁ 58% predicted, FEV₁/FVC 0.58, DLCO 48% predicted.',
        resultDate: '2022-11-06 14:00:00',
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Budesonide/Formoterol Inhaler 160/4.5mcg',
        dosage: 'Two puffs',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Rinse mouth after use; perform breathing exercises afterwards.'
      },
      {
        medicationName: 'Sacubitril/Valsartan 49/51mg Tablet',
        dosage: 'One tablet',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Up-titrated dose; monitor blood pressure and potassium each dialysis session.'
      },
      {
        medicationName: 'Bumetanide 1mg Tablet',
        dosage: '1 mg',
        frequency: 'Twice daily on non-dialysis days',
        duration: 'Continuous',
        instructions: 'Take morning and afternoon on non-dialysis days; skip on dialysis days unless edema worsens.'
      },
      {
        medicationName: 'Midodrine 5mg Tablet',
        dosage: '5 mg',
        frequency: 'Twice daily PRN hypotension',
        duration: 'As needed',
        instructions: 'Take before dialysis if pre-dialysis SBP <100 mmHg.'
      },
      {
        medicationName: 'Renal-specific nutritional supplement',
        dosage: 'One bottle',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Take between meals to maintain weight; dairy-free formula.'
      }
    ]
  },
  {
    visitDate: '2023-07-17 10:30:00',
    chiefComplaint: 'Comprehensive multidisciplinary review while on home-assisted hemodialysis.',
    hpi: 'Dialyzing four times weekly, experiencing improved dyspnea but ongoing fatigue, mild hepatic encephalopathy episodes, and difficulty adhering to fluid restrictions during hot weather. Caregiver assisting with medication management. Desires transplant evaluation progress.',
    reviewOfSystems: {
      Cardiovascular: 'No angina, occasional palpitations controlled with beta blocker.',
      Respiratory: 'Stable on nocturnal oxygen, uses inhaler once daily.',
      Renal: 'Dry weight 86 kg, interdialytic weight gain 1.8 kg average.',
      Hepatic: 'Intermittent pruritus, mild confusion evenings.',
      Neuro: 'Improved restless legs on gabapentin, mood stable.'
    },
    physicalExam: {
      General: 'Alert, cooperative, mild cachexia.',
      Cardiovascular: 'BP 112/70 mmHg, HR 72 bpm, JVP 10 cm.',
      Respiratory: 'Clear to auscultation with faint wheeze.',
      Abdomen: 'Mild ascites, liver edge 2 cm, no tenderness.',
      Extremities: 'Trace edema, healed surgical sites.'
    },
    diagnosis: 'End-stage cardiorenal-hepatic syndrome on dialysis with partial functional improvement; COPD stable; hepatic encephalopathy grade I.',
    treatmentPlan: 'Initiated rifaximin 550 mg BID for hepatic encephalopathy prophylaxis, adjusted dialysis dry weight to 85.5 kg, emphasized fluid limit 1.2 L/day with cooling strategies, enrolled in transplant readiness education, reinforced plant-based, low-phosphate diet with weekly phosphorus lab checks, recommended tai chi seated exercises, and maintained caregiver-supported medication list with weekly review.',
    vitals: {
      bloodPressure: '112/70',
      pulse: '72',
      temperature: '36.6',
      respiratory: '18',
      oxygenSaturation: '95% on 1 L O₂',
      weight: '86.5 kg'
    },
    admitted: false,
    summary: 'Dialysis stabilised but labs show albumin 3.0 g/dL, INR 1.4, creatinine pre-dialysis 3.2 mg/dL, phosphorus 5.6 mg/dL. Added rifaximin, refined fluid strategies, and advanced transplant listing requirements including vaccination updates, dental clearance, and continued lifestyle adherence. Documented patient understanding and caregiver engagement.',
    labs: [
      {
        testName: 'Comprehensive Metabolic Panel (CMP)',
        priority: 'Routine',
        notes: 'Monitor renal and hepatic trend',
        orderedAt: '2023-07-17 10:45:00',
        resultSummary: 'Creatinine 3.2 mg/dL (pre-HD), Albumin 3.0 g/dL, Potassium 4.6 mmol/L.',
        resultDate: '2023-07-17 13:30:00',
        status: 'completed',
        resultDetails: [
          { key: 'creatinine', label: 'Creatinine (pre-dialysis)', value: '3.2', unit: 'mg/dL', referenceRange: '0.6-1.1', flag: 'H' },
          { key: 'albumin', label: 'Albumin', value: '3.0', unit: 'g/dL', referenceRange: '3.5-5.0', flag: 'L' },
          { key: 'potassium', label: 'Potassium', value: '4.6', unit: 'mmol/L', referenceRange: '3.5-5.1', flag: '' }
        ]
      },
      {
        testName: 'Coagulation Panel',
        priority: 'Routine',
        notes: 'Assess hepatic synthetic function',
        orderedAt: '2023-07-17 10:50:00',
        resultSummary: 'INR 1.4, Platelets 190 x10⁹/L.',
        resultDate: '2023-07-17 12:20:00',
        status: 'completed',
        resultDetails: [
          { key: 'inr', label: 'INR', value: '1.4', unit: '', referenceRange: '0.9-1.2', flag: 'H' },
          { key: 'platelets', label: 'Platelets', value: '190', unit: 'x10⁹/L', referenceRange: '150-400', flag: '' }
        ]
      },
      {
        testName: 'Phosphorus and PTH',
        priority: 'Routine',
        notes: 'Monitor mineral bone disease',
        orderedAt: '2023-07-17 10:55:00',
        resultSummary: 'Phosphorus 5.6 mg/dL, PTH 420 pg/mL.',
        resultDate: '2023-07-17 14:10:00',
        status: 'completed',
        resultDetails: [
          { key: 'phosphorus', label: 'Phosphorus', value: '5.6', unit: 'mg/dL', referenceRange: '2.5-4.5', flag: 'H' },
          { key: 'pth', label: 'Parathyroid Hormone', value: '420', unit: 'pg/mL', referenceRange: '15-65', flag: 'H' }
        ]
      }
    ],
    radiology: [
      {
        testName: 'Doppler Ultrasound - Dialysis Access',
        priority: 'Routine',
        notes: 'Assess tunnelled catheter flow',
        orderedAt: '2023-07-17 12:30:00',
        result: 'Adequate flow with no thrombus; planning for AV graft deferred due to low cardiac output.',
        resultDate: '2023-07-17 13:10:00',
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Rifaximin 550mg Tablet',
        dosage: '550 mg',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Take at 08:00 and 20:00 for encephalopathy prophylaxis.'
      },
      {
        medicationName: 'Sevelamer Carbonate 800mg Tablet',
        dosage: '1600 mg',
        frequency: 'Three times daily with meals',
        duration: 'Continuous',
        instructions: 'Swallow with meals to bind phosphorus; avoid taking with other meds within 1 hour.'
      },
      {
        medicationName: 'Sacubitril/Valsartan 97/103mg Tablet',
        dosage: 'One tablet',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Highest tolerated dose; monitor blood pressure pre-dialysis.'
      },
      {
        medicationName: 'Carvedilol 25mg Tablet',
        dosage: '25 mg',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Take with meals; hold if SBP <100 mmHg before dialysis.'
      },
      {
        medicationName: 'Gabapentin 100mg Capsule',
        dosage: '100 mg',
        frequency: 'Two capsules nightly',
        duration: 'Continuous',
        instructions: 'Take at bedtime for restless legs; adjust for dialysis days.'
      }
    ]
  },
  {
    visitDate: '2024-01-23 08:20:00',
    chiefComplaint: 'Transition visit for tunneled catheter exchange and transplant work-up initiation.',
    hpi: 'Complains of catheter site discomfort, mild fevers 37.8°C, and increased fatigue. Dialysis adequacy maintained. No chest pain. Following plant-forward, low-sodium diet and fluid restriction diligently. Motivated for transplant listing.',
    reviewOfSystems: {
      Cardiovascular: 'Stable NYHA class III symptoms.',
      Respiratory: 'No change in baseline breathlessness.',
      Renal: 'Minimal urine output, dry weight 85 kg.',
      Hepatic: 'Mild pruritus controlled with cholestyramine.',
      Infectious: 'Low-grade fevers, no chills.'
    },
    physicalExam: {
      General: 'Chronically ill but stable.',
      Cardiovascular: 'BP 108/68 mmHg, HR 74 bpm.',
      Respiratory: 'Clear with scattered wheeze.',
      Abdomen: 'Soft, mild ascites.',
      Extremities: 'Trace edema; catheter exit site erythematous with tenderness.'
    },
    diagnosis: 'Suspected tunneled dialysis catheter infection; advanced multi-organ failure on dialysis; preparation for combined heart-kidney transplant evaluation.',
    treatmentPlan: 'Exchanged tunneled catheter under fluoroscopy, initiated empiric IV cefazolin pending cultures, scheduled AV graft mapping, ordered transplant evaluation labs and imaging, reinforced catheter care hygiene with caregiver training, recommended chair yoga and incentive spirometry twice daily, and updated vaccination schedule. Lifestyle plan emphasised fluid limit 1 L/day, sodium 1.2 g/day, carbohydrate-controlled meals, and daily mindfulness journaling for coping.',
    vitals: {
      bloodPressure: '108/68',
      pulse: '74',
      temperature: '37.8',
      respiratory: '18',
      oxygenSaturation: '95% on 1 L O₂',
      weight: '85.2 kg'
    },
    admitted: false,
    summary: 'Catheter infection suspected; blood cultures drawn and catheter exchanged. Labs show BUN 92 mg/dL, phosphorus 6.1 mg/dL, CRP 45 mg/L. Initiated cefazolin, planned AV graft evaluation, and advanced transplant work-up timeline. Reinforced fluid limit, sodium restriction, and structured chair-based exercise with daily breathing therapy.',
    labs: [
      {
        testName: 'Dialysis Adequacy and Chemistry',
        priority: 'Routine',
        notes: 'Pre-transplant baseline',
        orderedAt: '2024-01-23 08:35:00',
        resultSummary: 'BUN 92 mg/dL, Creatinine 3.4 mg/dL, Phosphorus 6.1 mg/dL.',
        resultDate: '2024-01-23 12:10:00',
        status: 'completed',
        resultDetails: [
          { key: 'bun', label: 'BUN', value: '92', unit: 'mg/dL', referenceRange: '7-20', flag: 'H' },
          { key: 'creatinine', label: 'Creatinine', value: '3.4', unit: 'mg/dL', referenceRange: '0.6-1.1', flag: 'H' },
          { key: 'phosphorus', label: 'Phosphorus', value: '6.1', unit: 'mg/dL', referenceRange: '2.5-4.5', flag: 'H' }
        ]
      },
      {
        testName: 'Inflammatory Markers',
        priority: 'Routine',
        notes: 'Assess catheter infection',
        orderedAt: '2024-01-23 08:40:00',
        resultSummary: 'CRP 45 mg/L, ESR 62 mm/hr.',
        resultDate: '2024-01-23 13:05:00',
        status: 'completed',
        resultDetails: [
          { key: 'crp', label: 'C-Reactive Protein', value: '45', unit: 'mg/L', referenceRange: '<5', flag: 'H' },
          { key: 'esr', label: 'ESR', value: '62', unit: 'mm/hr', referenceRange: '<20', flag: 'H' }
        ]
      }
    ],
    radiology: [
      {
        testName: 'Fluoroscopic Tunneled Catheter Exchange',
        priority: 'Urgent',
        notes: 'Replace suspected infected catheter',
        orderedAt: '2024-01-23 10:15:00',
        result: 'Old catheter removed; new right IJ tunneled catheter placed with good flow.',
        resultDate: '2024-01-23 10:45:00',
        status: 'completed'
      },
      {
        testName: 'Vascular Ultrasound Mapping',
        priority: 'Routine',
        notes: 'Assess for AV graft placement',
        orderedAt: '2024-01-23 11:20:00',
        result: 'Right upper arm basilic vein suitable for graft; arterial flow adequate.',
        resultDate: '2024-01-23 12:30:00',
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Cefazolin 2g IV',
        dosage: '2 g',
        frequency: 'After each dialysis',
        duration: '14 days',
        instructions: 'Administer post-dialysis pending culture results.'
      },
      {
        medicationName: 'Sevelamer Carbonate 800mg Tablet',
        dosage: '1600 mg',
        frequency: 'Three times daily',
        duration: 'Continuous',
        instructions: 'Take with meals to control phosphorus.'
      },
      {
        medicationName: 'Sacubitril/Valsartan 97/103mg Tablet',
        dosage: 'One tablet',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Maintain maximum dose; monitor blood pressure before dialysis.'
      },
      {
        medicationName: 'Carvedilol 25mg Tablet',
        dosage: '25 mg',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Take with breakfast and dinner; hold if SBP <100 mmHg.'
      },
      {
        medicationName: 'Insulin glargine 100u/mL',
        dosage: '24 units',
        frequency: 'Once nightly',
        duration: 'Continuous',
        instructions: 'Adjust with endocrinologist based on CGM data.'
      }
    ]
  },
  {
    visitDate: '2024-09-09 14:10:00',
    chiefComplaint: 'Quarterly advanced heart failure/dialysis coordination visit.',
    hpi: 'Reports improved stamina with tailored dialysis schedule, occasional hypotension during sessions, no admissions since January. Continues pulmonary exercises, plant-based diet, and fluid restriction. Concerned about muscle wasting.',
    reviewOfSystems: {
      Cardiovascular: 'Mild exertional dyspnea, no syncope.',
      Respiratory: 'Stable cough, inhaler required once daily.',
      Renal: 'Dry weight 84 kg, interdialytic gain <1.5 kg.',
      Hepatic: 'Pruritus controlled, no confusion.',
      Musculoskeletal: 'Muscle mass declining; performing resistance band exercises thrice weekly.'
    },
    physicalExam: {
      General: 'Engaged, thin, mild sarcopenia.',
      Cardiovascular: 'BP 110/68 mmHg, HR 70 bpm, no gallops.',
      Respiratory: 'Clear with faint wheeze.',
      Abdomen: 'Soft, minimal ascites.',
      Extremities: 'No edema, dialysis catheter site clean.'
    },
    diagnosis: 'Advanced heart failure with improving symptom burden on dialysis; COPD controlled; protein-calorie malnutrition risk; transplant evaluation ongoing.',
    treatmentPlan: 'Added oral nutrition supplement (renal/high-protein), initiated low-dose ivabradine 5 mg BID for heart rate control during exertion, continued rifaximin and lactulose, recommended resistance band progression, coordinated transplant team imaging, reinforced daily fluid tracking (<1.2 L) and sodium 1.5 g/day, and scheduled pulmonary function re-evaluation.',
    vitals: {
      bloodPressure: '110/68',
      pulse: '70',
      temperature: '36.5',
      respiratory: '17',
      oxygenSaturation: '95% on room air',
      weight: '84.3 kg'
    },
    admitted: false,
    summary: 'Functional improvement noted with NT-proBNP 980 pg/mL, HbA1c 7.2%, hemoglobin 10.8 g/dL, ferritin 560 ng/mL. Added ivabradine for HR modulation, enhanced nutritional plan with renal-approved protein supplements, and advanced transplant dossier. Reinforced lifestyle targets: plant-forward low-sodium diet, fluid limit, daily weights, pulmonary exercises, and caregiver-supported medication adherence.',
    labs: [
      {
        testName: 'NT-proBNP',
        priority: 'Routine',
        notes: 'Assess heart failure trend',
        orderedAt: '2024-09-09 14:25:00',
        resultSummary: 'NT-proBNP 980 pg/mL.',
        resultDate: '2024-09-09 17:10:00',
        status: 'completed',
        resultDetails: [
          { key: 'ntprobnp', label: 'NT-proBNP', value: '980', unit: 'pg/mL', referenceRange: '<125', flag: 'H' }
        ]
      },
      {
        testName: 'Complete Blood Count (CBC)',
        priority: 'Routine',
        notes: 'Monitor anemia management',
        orderedAt: '2024-09-09 14:30:00',
        resultSummary: 'Hemoglobin 10.8 g/dL, Ferritin 560 ng/mL, TSAT 24%.',
        resultDate: '2024-09-09 16:40:00',
        status: 'completed',
        resultDetails: [
          { key: 'hemoglobin', label: 'Hemoglobin', value: '10.8', unit: 'g/dL', referenceRange: '12.0-16.0', flag: 'L' },
          { key: 'ferritin', label: 'Ferritin', value: '560', unit: 'ng/mL', referenceRange: '15-150', flag: 'H' },
          { key: 'transferrin_saturation', label: 'Transferrin Saturation', value: '24', unit: '%', referenceRange: '20-50', flag: '' }
        ]
      },
      {
        testName: 'HbA1c',
        priority: 'Routine',
        notes: 'Monitor glycemic control',
        orderedAt: '2024-09-09 14:35:00',
        resultSummary: 'HbA1c 7.2 %.',
        resultDate: '2024-09-10 08:10:00',
        status: 'completed',
        resultDetails: [
          { key: 'hba1c', label: 'Hemoglobin A1c', value: '7.2', unit: '%', referenceRange: '4.0-6.0', flag: 'H' }
        ]
      }
    ],
    radiology: [
      {
        testName: 'Cardiopulmonary Exercise Testing',
        priority: 'Routine',
        notes: 'Transplant evaluation',
        orderedAt: '2024-09-09 15:30:00',
        result: 'Peak VO₂ 11 mL/kg/min, VE/VCO₂ slope 36 indicating advanced heart failure.',
        resultDate: '2024-09-10 11:20:00',
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Ivabradine 5mg Tablet',
        dosage: '5 mg',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Take with meals; hold if HR <60 bpm.'
      },
      {
        medicationName: 'Oral Renal Nutrition Shake',
        dosage: 'One bottle',
        frequency: 'Three times daily',
        duration: 'Continuous',
        instructions: 'Consume between meals to preserve lean mass.'
      },
      {
        medicationName: 'Rifaximin 550mg Tablet',
        dosage: '550 mg',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Continue for hepatic encephalopathy prophylaxis.'
      },
      {
        medicationName: 'Lactulose 30mL Solution',
        dosage: '30 mL',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Adjust to maintain 2-3 soft stools daily.'
      },
      {
        medicationName: 'Budesonide/Formoterol Inhaler 160/4.5mcg',
        dosage: 'Two puffs',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Continue inhaled therapy with spacer; rinse mouth afterwards.'
      }
    ]
  },
  {
    visitDate: '2025-05-02 09:50:00',
    chiefComplaint: 'Pre-transplant multidisciplinary case conference and comprehensive review.',
    hpi: 'Awaiting combined heart-kidney transplant listing decision. Reports improved energy with structured rehab but persistent dyspnea climbing stairs, fluid gains controlled, pruritus manageable, occasional mild hepatic encephalopathy episodes. Adherent to medication, diet, and dialysis schedule.',
    reviewOfSystems: {
      Cardiovascular: 'NYHA class III symptoms, no angina.',
      Respiratory: 'Breathing comfortable at rest, uses inhaler twice weekly.',
      Renal: 'Dialysis four times weekly, interdialytic gain 1.3 kg.',
      Hepatic: 'Mild pruritus, no ascites flare.',
      Neurologic: 'No new deficits, mood stable with counseling.'
    },
    physicalExam: {
      General: 'Alert, cooperative, mildly cachectic.',
      Cardiovascular: 'BP 108/66 mmHg, HR 68 bpm, soft systolic murmur.',
      Respiratory: 'Clear with minimal wheeze.',
      Abdomen: 'Soft, minimal ascites, hepatomegaly 1 cm.',
      Extremities: 'No edema, AV graft maturing with good thrill.'
    },
    diagnosis: 'End-stage multi-organ failure (cardiac, renal, hepatic, pulmonary) optimized on dialysis and GDMT; transplant candidate pending final clearance.',
    treatmentPlan: 'Maintained current heart failure regimen, continued dialysis schedule, added cholestyramine 4 g BID for pruritus, reinforced daily resistance training with physiotherapist, updated vaccinations (pneumococcal booster), finalised psychosocial evaluation, arranged hepatology clearance, and documented detailed emergency escalation plan. Lifestyle emphasis on sodium <1.5 g/day, fluid 1.2 L/day, Mediterranean renal-friendly diet, guided imagery for stress, and caregiver medication double-check nightly.',
    vitals: {
      bloodPressure: '108/66',
      pulse: '68',
      temperature: '36.4',
      respiratory: '17',
      oxygenSaturation: '95% on room air',
      weight: '83.5 kg'
    },
    admitted: false,
    summary: 'Comprehensive pre-transplant evaluation completed. Labs: creatinine 3.4 mg/dL (pre-HD), bilirubin 1.8 mg/dL, INR 1.3, CRP 9 mg/L, BNP 910 pg/mL. Continued strict lifestyle measures, dialysis, and medication adherence. Final transplant board submission prepared with multidisciplinary consensus.',
    labs: [
      {
        testName: 'Comprehensive Metabolic Panel (CMP)',
        priority: 'Routine',
        notes: 'Pre-transplant baseline',
        orderedAt: '2025-05-02 10:05:00',
        resultSummary: 'Creatinine 3.4 mg/dL (pre-HD), Bilirubin 1.8 mg/dL, ALT 45 U/L.',
        resultDate: '2025-05-02 13:00:00',
        status: 'completed',
        resultDetails: [
          { key: 'creatinine', label: 'Creatinine (pre-dialysis)', value: '3.4', unit: 'mg/dL', referenceRange: '0.6-1.1', flag: 'H' },
          { key: 'bilirubin', label: 'Total Bilirubin', value: '1.8', unit: 'mg/dL', referenceRange: '0.3-1.2', flag: 'H' },
          { key: 'alt', label: 'ALT', value: '45', unit: 'U/L', referenceRange: '7-35', flag: 'H' }
        ]
      },
      {
        testName: 'Coagulation and Inflammation Panel',
        priority: 'Routine',
        notes: 'Assess transplant readiness',
        orderedAt: '2025-05-02 10:10:00',
        resultSummary: 'INR 1.3, CRP 9 mg/L, Fibrinogen 380 mg/dL.',
        resultDate: '2025-05-02 12:20:00',
        status: 'completed',
        resultDetails: [
          { key: 'inr', label: 'INR', value: '1.3', unit: '', referenceRange: '0.9-1.2', flag: 'H' },
          { key: 'crp', label: 'C-Reactive Protein', value: '9', unit: 'mg/L', referenceRange: '<5', flag: 'H' },
          { key: 'fibrinogen', label: 'Fibrinogen', value: '380', unit: 'mg/dL', referenceRange: '200-400', flag: '' }
        ]
      },
      {
        testName: 'NT-proBNP',
        priority: 'Routine',
        notes: 'Cardiac status for transplant board',
        orderedAt: '2025-05-02 10:15:00',
        resultSummary: 'NT-proBNP 910 pg/mL.',
        resultDate: '2025-05-02 14:10:00',
        status: 'completed',
        resultDetails: [
          { key: 'ntprobnp', label: 'NT-proBNP', value: '910', unit: 'pg/mL', referenceRange: '<125', flag: 'H' }
        ]
      }
    ],
    radiology: [
      {
        testName: 'Cardiac CT for Transplant Evaluation',
        priority: 'Routine',
        notes: 'Assess graft anatomy and calcification',
        orderedAt: '2025-05-02 11:20:00',
        result: 'Patent stents, heavy coronary calcification, no aortic aneurysm.',
        resultDate: '2025-05-02 15:20:00',
        status: 'completed'
      },
      {
        testName: 'Liver MRI',
        priority: 'Routine',
        notes: 'Rule out hepatic lesions prior to transplant',
        orderedAt: '2025-05-02 11:40:00',
        result: 'No focal hepatic lesions; diffuse congestion consistent with cardiac hepatopathy.',
        resultDate: '2025-05-02 16:30:00',
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Cholestyramine 4g Sachet',
        dosage: '4 g',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Mix with water; take 4 hours apart from other medications.'
      },
      {
        medicationName: 'Ivabradine 5mg Tablet',
        dosage: '5 mg',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Continue for HR control; monitor for bradycardia.'
      },
      {
        medicationName: 'Sacubitril/Valsartan 97/103mg Tablet',
        dosage: 'One tablet',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Maintain maximum tolerated dose; check labs monthly.'
      },
      {
        medicationName: 'Carvedilol 25mg Tablet',
        dosage: '25 mg',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Continue titrated regimen with blood pressure monitoring.'
      },
      {
        medicationName: 'Sevelamer Carbonate 800mg Tablet',
        dosage: '1600 mg',
        frequency: 'Three times daily with meals',
        duration: 'Continuous',
        instructions: 'Continue phosphorus control regimen.'
      }
    ]
  }
];

async function getDoctorId() {
  const existing = await get('SELECT id FROM doctors WHERE email = ?', [DOCTOR_EMAIL]);
  if (!existing) {
    throw new Error(`Doctor with email ${DOCTOR_EMAIL} not found. Seed Dr. Onyango before running this script.`);
  }
  return existing.id;
}

function toJsonString(value) {
  if (!value) return null;
  return JSON.stringify(value);
}

async function insertVisit(doctorId, patientId, visit) {
  const status = visit.admitted ? 'inpatient' : (visit.status || 'completed');
  const result = await run(
    `INSERT INTO visits (
      doctor_id, patient_id, visit_date, vitals_json, chief_complaint, hpi, ros_json, physical_exam_json,
      diagnosis, treatment_plan, doctor_summary, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      doctorId,
      patientId,
      visit.visitDate,
      toJsonString(visit.vitals),
      visit.chiefComplaint || null,
      visit.hpi || null,
      toJsonString(visit.reviewOfSystems),
      toJsonString(visit.physicalExam),
      visit.diagnosis || null,
      visit.treatmentPlan || null,
      visit.summary || null,
      status
    ]
  );
  return result.lastID;
}

async function insertLabOrder(doctorId, patientId, visitId, visitDate, lab) {
  await run(
    `INSERT INTO lab_orders (
      patient_id, doctor_id, visit_id, test_id, test_name, status, priority, notes, ordered_at, result, result_json, result_date, verified_by, verified_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      patientId,
      doctorId,
      visitId,
      null,
      lab.testName,
      lab.status || 'completed',
      lab.priority || null,
      lab.notes || null,
      lab.orderedAt || visitDate,
      lab.resultSummary || null,
      lab.resultDetails ? JSON.stringify(lab.resultDetails) : null,
      lab.resultDate || null,
      null,
      lab.resultDate || null
    ]
  );
}

async function insertRadiologyOrder(doctorId, patientId, visitId, visitDate, order) {
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
      order.status || 'completed',
      order.priority || null,
      order.notes || null,
      order.orderedAt || visitDate,
      order.result || null,
      order.resultDate || null
    ]
  );
}

async function insertPrescription(doctorId, patientId, visitId, visitDate, prescription) {
  await run(
    `INSERT INTO prescriptions (
      visit_id, patient_id, doctor_id, item_id, medication_name, dosage, frequency, duration, instructions, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      visitId,
      patientId,
      doctorId,
      null,
      prescription.medicationName,
      prescription.dosage || null,
      prescription.frequency || null,
      prescription.duration || null,
      prescription.instructions || null,
      prescription.createdAt || visitDate
    ]
  );
}

async function seedCriticalPatient() {
  await initializeDatabase();
  const doctorId = await getDoctorId();

  const existing = await get('SELECT id FROM patients WHERE email = ? AND doctor_id = ?', [patientProfile.email, doctorId]);
  if (existing) {
    console.log(`Critical patient ${patientProfile.firstName} ${patientProfile.lastName} already exists with id ${existing.id}`);
    return;
  }

  const result = await run(
    `INSERT INTO patients (
      doctor_id, first_name, last_name, date_of_birth, gender, email, phone, address, blood_type,
      height_cm, weight_kg, emergency_contact, insurance, allergies, chronic_conditions, medications, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      doctorId,
      patientProfile.firstName,
      patientProfile.lastName,
      patientProfile.dateOfBirth,
      patientProfile.gender,
      patientProfile.email,
      patientProfile.phone,
      patientProfile.address,
      patientProfile.bloodType || null,
      patientProfile.heightCm || null,
      patientProfile.weightKg || null,
      patientProfile.emergencyContact || null,
      patientProfile.insurance || null,
      JSON.stringify(patientProfile.allergies),
      JSON.stringify(patientProfile.chronicConditions),
      JSON.stringify(patientProfile.baselineMedications),
      'active'
    ]
  );

  const patientId = result.lastID;
  console.log(`Created critically ill patient ${patientProfile.firstName} ${patientProfile.lastName} (ID: ${patientId})`);

  for (const visit of visits) {
    const visitId = await insertVisit(doctorId, patientId, visit);

    for (const lab of visit.labs || []) {
      await insertLabOrder(doctorId, patientId, visitId, visit.visitDate, lab);
    }

    for (const order of visit.radiology || []) {
      await insertRadiologyOrder(doctorId, patientId, visitId, visit.visitDate, order);
    }

    for (const prescription of visit.prescriptions || []) {
      await insertPrescription(doctorId, patientId, visitId, visit.visitDate, prescription);
    }
  }

  console.log('Critical multi-organ failure patient seeded successfully.');
}

seedCriticalPatient()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to seed critical patient', err);
    process.exit(1);
  });
