const bcrypt = require('bcryptjs');
const { initializeDatabase, get, run } = require('../db');

const doctorProfile = {
  firstName: 'Dr. med. Klaus',
  lastName: 'Weber',
  email: 'dr.weber@praxis-weber.de',
  licenseNumber: 'DE-NRW-123456',
  specialty: 'Innere Medizin und Diabetologie'
};

// German patients following Patientenkurzakte standard
const germanPatients = [
  {
    // Patient 1: Diabetes mellitus Typ 2 + Arterielle Hypertonie
    firstName: 'Hans',
    lastName: 'Müller', 
    gender: 'male',
    dateOfBirth: '1965-08-15', // 59 Jahre alt
    email: 'hans.mueller@gmail.de',
    phone: '+49 221 555 0001',
    address: 'Habsburgerring 15, 50674 Köln',
    bloodType: 'A+',
    heightCm: 180,
    weightKg: 95,
    emergencyContact: 'Gisela Müller (Ehefrau) +49 221 555 0002',
    insurance: 'AOK Rheinland/Hamburg - Versichertennr: M123456789',
    allergies: ['Penicillin V (Hautausschlag)', 'Metamizol (anaphylaktische Reaktion)'],
    chronicConditions: ['Diabetes mellitus Typ 2 (E11.9)', 'Arterielle Hypertonie (I10)', 'Hyperlipidämie (E78.5)', 'Adipositas Grad I (E66.0)'],
    medications: [
      'Metformin 1000mg 1-0-1',
      'Linagliptin 5mg 1-0-0', 
      'Ramipril 10mg 1-0-0',
      'Hydrochlorothiazid 25mg 1-0-0',
      'Atorvastatin 40mg 0-0-1',
      'ASS 100mg 1-0-0'
    ],
    visits: [
      // 2024 Visits
      {
        visitDate: '2024-11-15 10:00:00',
        chiefComplaint: 'Quartalskontrolle Diabetes mellitus, arterielle Hypertonie',
        hpi: 'Patient berichtet über stabile Blutzuckerwerte (nüchtern 110-130 mg/dl). Gelegentlich Kopfschmerzen bei Wetterwechsel. Medikamenteneinnahme regelmäßig. Gewichtsstabilisierung bei 95kg. Fußinspektion o.B.',
        reviewOfSystems: {
          Allgemein: 'Keine B-Symptomatik, Gewicht stabil',
          Kardiovaskulär: 'Keine pektanginösen Beschwerden, keine Dyspnoe',
          Endokrin: 'Keine Hypoglykämien, seltene Nykturie',
          Neurologisch: 'Keine Sensibilitätsstörungen'
        },
        physicalExam: {
          Allgemeinzustand: 'Adipöser Patient in gutem AZ und EZ',
          Vitalzeichen: 'RR 135/80 mmHg, HF 68/min, afebril',
          Kardiovaskulär: 'Herzaktion rhythmisch, reine Herztöne, keine Geräusche',
          Abdomen: 'Weich, kein Druckschmerz, Darmgeräusche normal',
          Extremitäten: 'Fußpulse tastbar, keine Ödeme, Sensibilität intakt',
          Haut: 'Keine Hautveränderungen, Injektionsstellen o.B.'
        },
        diagnosis: 'Diabetes mellitus Typ 2, gut eingestellt (HbA1c 6.8%). Arterielle Hypertonie, gut kontrolliert. Hyperlipidämie unter Therapie.',
        treatmentPlan: 'Aktuelle Medikation beibehalten. HbA1c-Kontrolle in 3 Monaten. Empfehlung: Gewichtsreduktion um 5-10kg, mediterrane Diät, tägliche Bewegung 30min. Nächster Termin: Februar 2025.',
        vitals: { 
          bloodPressure: '135/80', 
          pulse: '68', 
          temperature: '36.6', 
          respiratory: '16', 
          oxygenSaturation: '98%', 
          weight: '95 kg',
          bmi: '29.3'
        },
        status: 'completed',
        nextAppointment: {
          date: '2025-02-15 10:00:00',
          reason: 'Quartalskontrolle DM Typ 2 + Hypertonie',
          notes: 'HbA1c, Kreatinin, Lipidstatus vorher bestimmen'
        }
      },
      {
        visitDate: '2024-08-12 09:30:00',
        chiefComplaint: 'Quartalskontrolle, Bewertung der Diabeteseinstellung',
        hpi: 'Patient berichtet über gute Compliance. BZ-Selbstmessung zeigt nüchtern 120-140 mg/dl. Neuerdings leichte Gewichtszunahme (+2kg). Keine hypoglykämischen Episoden.',
        reviewOfSystems: {
          Endokrin: 'Polyurie und Polydipsie nicht mehr vorhanden',
          Kardiovaskulär: 'Belastungsdyspnoe bei schwerer körperlicher Anstrengung',
          Augen: 'Keine Visusveränderungen',
          Nieren: 'Keine Nykturie'
        },
        physicalExam: {
          Vitalzeichen: 'RR 140/85 mmHg, HF 72/min',
          Gewicht: '95kg (Zunahme um 2kg)',
          Füße: 'Sensibilität intakt, keine Läsionen'
        },
        diagnosis: 'Diabetes mellitus Typ 2 - Verschlechterung der Einstellung. Arterielle Hypertonie.',
        treatmentPlan: 'Linagliptin hinzufügen zur bestehenden Metformin-Therapie. Ernährungsberatung vereinbart. Gewichtsreduktion angestrebt.',
        vitals: { bloodPressure: '140/85', pulse: '72', weight: '95 kg' },
        status: 'completed'
      },
      {
        visitDate: '2024-05-10 11:00:00',
        chiefComplaint: 'Kontrolle nach Medikamentenumstellung',
        hpi: 'Patient toleriert neue Medikation gut. Ramipril-Dosis wurde erhöht, keine Nebenwirkungen. BZ-Werte verbessert.',
        physicalExam: {
          Vitalzeichen: 'RR 130/78 mmHg, HF 65/min'
        },
        diagnosis: 'DM Typ 2 und art. Hypertonie - verbesserte Kontrolle',
        treatmentPlan: 'Aktuelle Medikation fortführen',
        vitals: { bloodPressure: '130/78', pulse: '65', weight: '93 kg' },
        status: 'completed'
      },
      {
        visitDate: '2024-02-08 10:15:00',
        chiefComplaint: 'Jahresuntersuchung Diabetes mellitus',
        hpi: 'Jahresroutine. Patient fühlt sich gut, regelmäßige BZ-Kontrollen. Augenärztliche Kontrolle erfolgt.',
        physicalExam: {
          Füße: 'Vollständige Fußinspektion - keine Läsionen, Sensibilität erhalten'
        },
        diagnosis: 'DM Typ 2 - stabile Einstellung',
        treatmentPlan: 'Weiterführung der Therapie, ophthalmologische Kontrolle jährlich',
        vitals: { bloodPressure: '132/80', pulse: '70', weight: '93 kg' },
        status: 'completed'
      },

      // 2023 Visits  
      {
        visitDate: '2023-11-20 14:30:00',
        chiefComplaint: 'Verschlechterung der Blutzuckerkontrolle',
        hpi: 'Patient berichtet über ansteigende BZ-Werte trotz guter Compliance. Stress bei der Arbeit. Gewichtszunahme um 3kg.',
        physicalExam: {
          Vitalzeichen: 'RR 145/88 mmHg, HF 75/min',
          Gewicht: '93kg'
        },
        diagnosis: 'DM Typ 2 - verschlechterte Kontrolle',
        treatmentPlan: 'Metformin-Dosis erhöht, Lifestyle-Beratung',
        vitals: { bloodPressure: '145/88', pulse: '75', weight: '93 kg' },
        status: 'completed'
      },
      {
        visitDate: '2023-08-15 09:00:00',
        chiefComplaint: 'Routinekontrolle',
        hpi: 'Gute Blutzuckerkontrolle, Patient motiviert',
        diagnosis: 'DM Typ 2 - gute Kontrolle',
        vitals: { bloodPressure: '138/82', pulse: '68', weight: '90 kg' },
        status: 'completed'
      },
      {
        visitDate: '2023-05-12 10:30:00',
        chiefComplaint: 'Quartalskontrolle',
        diagnosis: 'DM Typ 2 + Hypertonie - stabil',
        vitals: { bloodPressure: '135/80', pulse: '72', weight: '91 kg' },
        status: 'completed'
      },
      {
        visitDate: '2023-02-18 11:15:00',
        chiefComplaint: 'Nachsorge nach stationärer Einstellung',
        hpi: 'Patient nach 5-tägiger stationärer Diabeteseinstellung entlassen',
        diagnosis: 'DM Typ 2 - nach stationärer Einstellung',
        vitals: { bloodPressure: '140/85', pulse: '70', weight: '92 kg' },
        status: 'completed'
      },

      // 2022 Visits
      {
        visitDate: '2022-12-20 08:45:00',
        chiefComplaint: 'Entgleisung der Diabeteseinstellung',
        hpi: 'HbA1c auf 9.2% angestiegen. Patient berichtet über beruflichen Stress und unregelmäßige Mahlzeiten.',
        physicalExam: {
          Vitalzeichen: 'RR 152/92 mmHg, HF 80/min'
        },
        diagnosis: 'DM Typ 2 - entgleist, Hypertonie',
        treatmentPlan: 'Stationäre Einstellung empfohlen',
        vitals: { bloodPressure: '152/92', pulse: '80', weight: '92 kg' },
        status: 'completed'
      },
      {
        visitDate: '2022-09-10 10:00:00',
        chiefComplaint: 'Quartalskontrolle',
        diagnosis: 'DM Typ 2, Hypertonie - mäßige Kontrolle',
        vitals: { bloodPressure: '148/85', pulse: '78', weight: '90 kg' },
        status: 'completed'
      },
      {
        visitDate: '2022-06-15 14:00:00',
        chiefComplaint: 'Kontrolle nach Ramipril-Beginn',
        diagnosis: 'Hypertonie neu diagnostiziert, DM Typ 2',
        vitals: { bloodPressure: '142/88', pulse: '75', weight: '89 kg' },
        status: 'completed'
      },
      {
        visitDate: '2022-03-20 09:30:00',
        chiefComplaint: 'Erstdiagnose arterielle Hypertonie',
        hpi: 'Bei Routinekontrolle erhöhte RR-Werte festgestellt',
        diagnosis: 'Art. Hypertonie neu, DM Typ 2',
        treatmentPlan: 'ACE-Hemmer-Therapie beginnen',
        vitals: { bloodPressure: '155/95', pulse: '82', weight: '88 kg' },
        status: 'completed'
      },

      // 2021 Visits
      {
        visitDate: '2021-11-25 11:00:00',
        chiefComplaint: 'Diabeteskontrolle',
        diagnosis: 'DM Typ 2 - befriedigende Kontrolle',
        vitals: { bloodPressure: '135/80', pulse: '70', weight: '87 kg' },
        status: 'completed'
      },
      {
        visitDate: '2021-08-30 10:15:00',
        chiefComplaint: 'Quartalskontrolle',
        diagnosis: 'DM Typ 2 - gute Einstellung',
        vitals: { bloodPressure: '130/78', pulse: '68', weight: '86 kg' },
        status: 'completed'
      },
      {
        visitDate: '2021-05-20 09:45:00',
        chiefComplaint: 'Kontrolle Diabeteseinstellung',
        diagnosis: 'DM Typ 2 - stabil',
        vitals: { bloodPressure: '128/75', pulse: '72', weight: '85 kg' },
        status: 'completed'
      },

      // 2020 Visits  
      {
        visitDate: '2020-10-12 14:20:00',
        chiefComplaint: 'Kontrolle nach Metformin-Beginn',
        hpi: 'Patient verträgt Metformin gut, BZ-Werte rückläufig',
        diagnosis: 'DM Typ 2 - Verbesserung unter Therapie',
        vitals: { bloodPressure: '125/75', pulse: '70', weight: '84 kg' },
        status: 'completed'
      },
      {
        visitDate: '2020-07-08 08:30:00',
        chiefComplaint: 'Follow-up Diabetesberatung',
        diagnosis: 'DM Typ 2 - Therapieadhärenz verbessert',
        vitals: { bloodPressure: '122/72', pulse: '68', weight: '83 kg' },
        status: 'completed'
      },
      {
        visitDate: '2020-04-15 10:00:00',
        chiefComplaint: 'Diabetesschulung abgeschlossen',
        diagnosis: 'DM Typ 2 - nach Schulung',
        vitals: { bloodPressure: '120/75', pulse: '70', weight: '82 kg' },
        status: 'completed'
      },

      // 2019-2015: Diabetes onset and early management
      {
        visitDate: '2019-12-10 11:30:00',
        chiefComplaint: 'Diabetesschulung begonnen',
        diagnosis: 'DM Typ 2 - Schulung läuft',
        vitals: { bloodPressure: '118/70', pulse: '72', weight: '81 kg' },
        status: 'completed'
      },
      {
        visitDate: '2015-03-22 09:00:00',
        chiefComplaint: 'Erstdiagnose Diabetes mellitus Typ 2',
        hpi: 'Patient mit Polyurie, Polydipsie und Gewichtsverlust. Nüchtern-BZ 180 mg/dl, HbA1c 9.8%.',
        physicalExam: {
          Allgemeinzustand: 'Reduzierter AZ, normalgewichtig',
          Vitalzeichen: 'RR 115/70 mmHg, HF 75/min'
        },
        diagnosis: 'Diabetes mellitus Typ 2 - Erstdiagnose',
        treatmentPlan: 'Diabetesschulung, Diätberatung, Metformin-Therapie beginnen',
        vitals: { bloodPressure: '115/70', pulse: '75', weight: '80 kg' },
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Metformin 1000mg Tabletten',
        dosage: '1000 mg',
        frequency: '2x täglich',
        duration: 'Langzeit',
        instructions: 'Zu den Mahlzeiten, bei GI-Unverträglichkeit zum Essen',
        visitIndex: 0
      },
      {
        medicationName: 'Linagliptin 5mg Tabletten',
        dosage: '5 mg',
        frequency: '1x täglich',
        duration: 'Langzeit',
        instructions: 'Unabhängig von Mahlzeiten',
        visitIndex: 0
      },
      {
        medicationName: 'Ramipril 10mg Tabletten',
        dosage: '10 mg',
        frequency: '1x täglich morgens',
        duration: 'Langzeit',
        instructions: 'Vor dem Frühstück, RR-Kontrolle',
        visitIndex: 0
      },
      {
        medicationName: 'Hydrochlorothiazid 25mg Tabletten',
        dosage: '25 mg',
        frequency: '1x täglich morgens',
        duration: 'Langzeit',
        instructions: 'Zusammen mit ACE-Hemmer',
        visitIndex: 0
      },
      {
        medicationName: 'Atorvastatin 40mg Tabletten',
        dosage: '40 mg',
        frequency: '1x täglich abends',
        duration: 'Langzeit',
        instructions: 'Zum Abendessen, Muskelschmerzen beachten',
        visitIndex: 0
      },
      {
        medicationName: 'ASS 100mg Tabletten',
        dosage: '100 mg',
        frequency: '1x täglich',
        duration: 'Langzeit',
        instructions: 'Magenschutz bei Bedarf',
        visitIndex: 0
      }
    ],
    labOrders: [
      {
        testName: 'HbA1c',
        priority: 'Routine',
        notes: 'Quartalskontrolle Diabetes',
        orderedAt: '2024-11-15 10:30:00',
        result: '6.8 %',
        resultDate: '2024-11-16 08:00:00',
        status: 'completed',
        visitIndex: 0
      },
      {
        testName: 'Kreatinin/eGFR',
        priority: 'Routine',
        notes: 'ACE-Hemmer-Kontrolle',
        orderedAt: '2024-11-15 10:30:00',
        result: '1.1 mg/dl / 72 ml/min',
        resultDate: '2024-11-16 08:00:00',
        status: 'completed',
        visitIndex: 0
      },
      {
        testName: 'Lipidprofil',
        priority: 'Routine',
        notes: 'Statin-Kontrolle',
        orderedAt: '2024-11-15 10:30:00',
        result: 'Chol. 180 mg/dl, LDL 105 mg/dl, HDL 45 mg/dl, TG 150 mg/dl',
        resultDate: '2024-11-16 08:00:00',
        status: 'completed',
        visitIndex: 0
      },
      {
        testName: 'Mikroalbuminurie',
        priority: 'Routine', 
        notes: 'Diabetische Nephropathie-Screening',
        orderedAt: '2024-11-15 10:30:00',
        result: '15 μg/mg Kreatinin (Normbereich)',
        resultDate: '2024-11-16 08:00:00',
        status: 'completed',
        visitIndex: 0
      }
    ],
    appointments: [
      {
        scheduledAt: '2025-02-15 10:00:00',
        reason: 'Quartalskontrolle Diabetes mellitus + Hypertonie',
        notes: 'Labor: HbA1c, Kreatinin, Lipidstatus. Fußinspektion.',
        status: 'scheduled',
        visitIndex: 0
      }
    ]
  },

  {
    // Patient 2: Diabetes mellitus Typ 1 + Epilepsie  
    firstName: 'Maria',
    lastName: 'Schmidt',
    gender: 'female',
    dateOfBirth: '1985-04-03', // 39 Jahre alt
    email: 'maria.schmidt@web.de',
    phone: '+49 030 555 0003',
    address: 'Prenzlauer Allee 42, 10405 Berlin',
    bloodType: 'B+',
    heightCm: 168,
    weightKg: 62,
    emergencyContact: 'Thomas Schmidt (Ehemann) +49 030 555 0004',
    insurance: 'TK - Versichertennr: S987654321',
    allergies: ['Carbamazepin (Stevens-Johnson-Syndrom)', 'Jod (Kontrastmittelallergie)'],
    chronicConditions: ['Diabetes mellitus Typ 1 (E10.9)', 'Epilepsie - fokale Anfälle (G40.1)', 'Autoimmune Thyreoiditis Hashimoto (E06.3)', 'Zöliakie (K90.0)'],
    medications: [
      'Insulin glargin 28 IE abends',
      'Insulin lispro 8-10-6 IE zu den Mahlzeiten',
      'Levetiracetam 1000mg 1-0-1',
      'Levothyroxin 75μg 1-0-0',
      'Folsäure 5mg 1x täglich'
    ],
    visits: [
      // 2024 Visits
      {
        visitDate: '2024-11-20 08:30:00',
        chiefComplaint: 'Diabeteskontrolle + Epilepsie-Nachsorge',
        hpi: 'Patientin berichtet über stabile BZ-Werte mit FreeStyle Libre CGM. Letzter epileptischer Anfall vor 8 Monaten. Gute Therapieadhärenz. Glutenfreie Diät wird eingehalten.',
        reviewOfSystems: {
          Neurologisch: 'Keine Aura-Symptomatik, keine kognitiven Einschränkungen',
          Endokrin: 'Keine schweren Hypoglykämien, TSH-Kontrolle ausstehend',
          Gastrointestinal: 'Glutenfreie Diät, keine abdominellen Beschwerden',
          Gynäkologisch: 'Regelmäßiger Zyklus, Kinderwunsch besteht'
        },
        physicalExam: {
          Allgemeinzustand: 'Schlanke Patientin in gutem AZ und EZ',
          Vitalzeichen: 'RR 115/70 mmHg, HF 65/min, afebril',
          Neurologisch: 'Orientiert, keine fokalneurologischen Defizite',
          Schilddrüse: 'Nicht vergrößert tastbar',
          Injektionsstellen: 'Rotationsstellen korrekt, keine Lipodystrophien',
          CGM: 'FreeStyle Libre korrekt appliziert'
        },
        diagnosis: 'Diabetes mellitus Typ 1 - sehr gute Einstellung (TIR 78%). Epilepsie - anfallsfrei seit 8 Monaten. Hashimoto-Thyreoiditis euthyreot.',
        treatmentPlan: 'Aktuelle Insulintherapie beibehalten. Levetiracetam weiter. TSH-Kontrolle. Genetische Beratung bei Kinderwunsch. Nächster Termin: Februar 2025.',
        vitals: { 
          bloodPressure: '115/70', 
          pulse: '65', 
          temperature: '36.4', 
          respiratory: '14', 
          oxygenSaturation: '99%', 
          weight: '62 kg',
          bmi: '22.0'
        },
        status: 'completed',
        nextAppointment: {
          date: '2025-02-20 08:30:00',
          reason: 'Diabetes + Epilepsie Kontrolle',
          notes: 'HbA1c, TSH, Levetiracetam-Spiegel bestimmen'
        }
      },
      {
        visitDate: '2024-08-15 09:00:00',
        chiefComplaint: 'Quartalskontrolle + Medikamentenspiegel',
        hpi: 'Patientin hatte vor 4 Wochen fokalen Anfall mit sekundärer Generalisierung. Möglicherweise durch Schlafmangel getriggert.',
        reviewOfSystems: {
          Neurologisch: 'Postiktale Konfusion für 20 Minuten',
          Endokrin: 'BZ-Verlauf um den Anfall stabil'
        },
        physicalExam: {
          Neurologisch: 'Vollständig orientiert, normale Reflexe',
          Vitalzeichen: 'RR 110/68 mmHg, HF 68/min'
        },
        diagnosis: 'Epilepsie - fokaler Anfall mit sec. Generalisierung',
        treatmentPlan: 'Levetiracetam-Spiegel kontrollieren, ggf. Dosiserhöhung',
        vitals: { bloodPressure: '110/68', pulse: '68', weight: '61 kg' },
        status: 'completed'
      },
      {
        visitDate: '2024-05-22 14:15:00',
        chiefComplaint: 'Diabetes-Technologie-Update',
        hpi: 'Umstellung auf FreeStyle Libre 3. Patientin gut geschult.',
        diagnosis: 'DM Typ 1 - CGM-Update erfolgreich',
        vitals: { bloodPressure: '112/70', pulse: '66', weight: '62 kg' },
        status: 'completed'
      },
      {
        visitDate: '2024-02-10 10:45:00',
        chiefComplaint: 'Jahresuntersuchung Diabetes',
        hpi: 'Umfassende Diabeteskontrolle mit Komplikationsscreening',
        diagnosis: 'DM Typ 1 - keine Spätkomplikationen',
        vitals: { bloodPressure: '110/65', pulse: '64', weight: '61 kg' },
        status: 'completed'
      },

      // 2023 Visits
      {
        visitDate: '2023-11-28 08:45:00',
        chiefComplaint: 'Therapieoptimierung nach CGM-Auswertung',
        hpi: 'CGM zeigt nächtliche Hypoglykämien. Basalinsulin-Reduktion erforderlich.',
        diagnosis: 'DM Typ 1 - nächtliche Hypoglykämien',
        treatmentPlan: 'Insulin glargin von 30 auf 28 IE reduzieren',
        vitals: { bloodPressure: '108/65', pulse: '62', weight: '60 kg' },
        status: 'completed'
      },
      {
        visitDate: '2023-08-20 11:00:00',
        chiefComplaint: 'Epilepsie-Kontrolle nach EEG',
        hpi: 'EEG zeigt weiterhin fokale Aktivität im Temporallappen',
        diagnosis: 'Epilepsie - EEG-kontrolliert',
        vitals: { bloodPressure: '115/70', pulse: '68', weight: '60 kg' },
        status: 'completed'
      },
      {
        visitDate: '2023-05-15 09:30:00',
        chiefCompliant: 'Quartalskontrolle',
        diagnosis: 'DM Typ 1 + Epilepsie - stabil',
        vitals: { bloodPressure: '112/68', pulse: '65', weight: '59 kg' },
        status: 'completed'
      },
      {
        visitDate: '2023-02-22 14:00:00',
        chiefComplaint: 'Schilddrüsenkontrolle',
        hpi: 'TSH-Wert erhöht, Levothyroxin-Dosis anpassen',
        diagnosis: 'Hashimoto-Thyreoiditis - Dosisanpassung',
        treatmentPlan: 'Levothyroxin auf 75μg erhöhen',
        vitals: { bloodPressure: '110/65', pulse: '70', weight: '58 kg' },
        status: 'completed'
      },

      // 2022 Visits
      {
        visitDate: '2022-12-08 10:15:00',
        chiefComplaint: 'Status nach schwerem Hypoglykämie-Ereignis',
        hpi: 'Patientin hatte schwere nächtliche Hypoglykämie mit Bewusstlosigkeit. Notarzt gerufen.',
        diagnosis: 'Schwere Hypoglykämie - Therapieadjustierung',
        treatmentPlan: 'CGM dringend empfohlen, Basalinsulin reduzieren',
        vitals: { bloodPressure: '105/60', pulse: '72', weight: '58 kg' },
        status: 'completed'
      },
      {
        visitDate: '2022-09-12 08:30:00',
        chiefComplaint: 'Epilepsie-Einstellung nach Anfallshäufung',
        hpi: 'Drei fokale Anfälle in den letzten 4 Wochen',
        diagnosis: 'Epilepsie - unzureichende Kontrolle',
        treatmentPlan: 'Levetiracetam auf 2000mg/Tag erhöhen',
        vitals: { bloodPressure: '112/70', pulse: '68', weight: '57 kg' },
        status: 'completed'
      },
      {
        visitDate: '2022-06-25 11:30:00',
        chiefComplaint: 'Gastrointestinale Beschwerden',
        hpi: 'Verdacht auf Zöliakie bei anhaltenden Bauchschmerzen',
        diagnosis: 'V.a. Zöliakie - Diagnostik eingeleitet',
        treatmentPlan: 'Antikörper-Bestimmung, ggf. Dünndarmbiopsie',
        vitals: { bloodPressure: '108/65', pulse: '70', weight: '56 kg' },
        status: 'completed'
      },
      {
        visitDate: '2022-03-18 09:45:00',
        chiefComplaint: 'Diabeteskontrolle',
        diagnosis: 'DM Typ 1 - befriedigende Einstellung',
        vitals: { bloodPressure: '110/68', pulse: '66', weight: '58 kg' },
        status: 'completed'
      },

      // 2021 Visits
      {
        visitDate: '2021-11-10 14:20:00',
        chiefComplaint: 'Erstdiagnose Epilepsie nach Grand-mal-Anfall',
        hpi: 'Patientin erlitt erstmals generalisierten tonisch-klonischen Anfall. MRT und EEG durchgeführt.',
        physicalExam: {
          Neurologisch: 'Postiktale Phase überwunden, vollständig orientiert'
        },
        diagnosis: 'Epilepsie - Erstdiagnose nach generalisiertem Anfall',
        treatmentPlan: 'Levetiracetam 500mg 1-0-1 beginnen, weitere Diagnostik',
        vitals: { bloodPressure: '120/75', pulse: '75', weight: '58 kg' },
        status: 'completed'
      },
      {
        visitDate: '2021-08-30 10:00:00',
        chiefComplaint: 'Verdacht auf Autoimmunthyreoiditis',
        hpi: 'Müdigkeit, Gewichtszunahme, TSH erhöht',
        diagnosis: 'Hashimoto-Thyreoiditis neu diagnostiziert',
        treatmentPlan: 'Levothyroxin 50μg beginnen',
        vitals: { bloodPressure: '108/65', pulse: '58', weight: '59 kg' },
        status: 'completed'
      },
      {
        visitDate: '2021-05-25 09:15:00',
        chiefComplaint: 'Diabeteskontrolle',
        diagnosis: 'DM Typ 1 - gute Kontrolle',
        vitals: { bloodPressure: '105/62', pulse: '64', weight: '57 kg' },
        status: 'completed'
      },
      {
        visitDate: '2021-02-15 11:45:00',
        chiefComplaint: 'Quartalskontrolle',
        diagnosis: 'DM Typ 1 - stabile Einstellung',
        vitals: { bloodPressure: '110/65', pulse: '68', weight: '56 kg' },
        status: 'completed'
      },

      // 2020 Visits
      {
        visitDate: '2020-10-22 08:30:00',
        chiefComplaint: 'Diabetestechnologie-Schulung',
        hpi: 'Umstellung auf Insulinpen-System, Schulung abgeschlossen',
        diagnosis: 'DM Typ 1 - Technologie-Update',
        vitals: { bloodPressure: '108/60', pulse: '65', weight: '55 kg' },
        status: 'completed'
      },
      {
        visitDate: '2020-07-14 14:00:00',
        chiefComplaint: 'Schwangerschaftsplanung',
        hpi: 'Patientin plant Schwangerschaft, Therapieoptimierung erforderlich',
        diagnosis: 'DM Typ 1 - Präkonzeptionsberatung',
        treatmentPlan: 'HbA1c <6.5% anstreben, Folsäure beginnen',
        vitals: { bloodPressure: '105/60', pulse: '62', weight: '54 kg' },
        status: 'completed'
      },
      {
        visitDate: '2020-04-08 10:30:00',
        chiefComplaint: 'Kontrolle nach Hospitalisierung',
        hpi: 'Patientin nach diabetischer Ketoazidose stationär behandelt',
        diagnosis: 'Z.n. diabetischer Ketoazidose',
        vitals: { bloodPressure: '110/70', pulse: '70', weight: '52 kg' },
        status: 'completed'
      },
      {
        visitDate: '2020-01-20 09:00:00',
        chiefComplaint: 'Therapieintensivierung',
        hpi: 'HbA1c verschlechtert, intensivierte Insulintherapie nötig',
        diagnosis: 'DM Typ 1 - Therapieintensivierung',
        vitals: { bloodPressure: '112/68', pulse: '68', weight: '53 kg' },
        status: 'completed'
      },

      // 2019-2015: Early diabetes management  
      {
        visitDate: '2019-06-12 11:00:00',
        chiefComplaint: 'Diabetesschulung Fortsetzung',
        diagnosis: 'DM Typ 1 - Schulung Phase 2',
        vitals: { bloodPressure: '105/60', pulse: '65', weight: '54 kg' },
        status: 'completed'
      },
      {
        visitDate: '2018-11-28 09:45:00',
        chiefCompliant: 'Erste ambulante Kontrolle',
        hpi: 'Patientin nach stationärer Ersteinstellung entlassen',
        diagnosis: 'DM Typ 1 - nach Ersteinstellung',
        vitals: { bloodPressure: '100/60', pulse: '70', weight: '50 kg' },
        status: 'completed'
      },
      {
        visitDate: '2018-08-03 14:30:00',
        chiefComplaint: 'Erstdiagnose Diabetes mellitus Typ 1',
        hpi: 'Patientin mit Polyurie, Polydipsie, Gewichtsverlust 8kg in 6 Wochen. BZ >400 mg/dl, Ketone positiv.',
        physicalExam: {
          Allgemeinzustand: 'Deutlich reduzierter AZ, dehydriert',
          Vitalzeichen: 'RR 95/55 mmHg, HF 110/min, Acetongeruch'
        },
        diagnosis: 'Diabetes mellitus Typ 1 - Erstdiagnose mit Ketoazidose',
        treatmentPlan: 'Sofortige stationäre Einweisung zur Ketoazidose-Behandlung',
        vitals: { bloodPressure: '95/55', pulse: '110', weight: '48 kg' },
        status: 'completed'
      }
    ],
    prescriptions: [
      {
        medicationName: 'Insulin glargin (Lantus) 100 IE/ml',
        dosage: '28 IE',
        frequency: '1x täglich abends',
        duration: 'Langzeit',
        instructions: 'Immer zur gleichen Zeit, Injektionsstellen rotieren',
        visitIndex: 0
      },
      {
        medicationName: 'Insulin lispro (Humalog) 100 IE/ml',
        dosage: '8-10-6 IE',
        frequency: 'Zu den Mahlzeiten',
        duration: 'Langzeit',
        instructions: 'BE-angepasst, 15min vor dem Essen',
        visitIndex: 0
      },
      {
        medicationName: 'Levetiracetam (Keppra) 1000mg',
        dosage: '1000 mg',
        frequency: '2x täglich',
        duration: 'Langzeit',
        instructions: 'Immer zur gleichen Zeit, nicht abrupt absetzen',
        visitIndex: 0
      },
      {
        medicationName: 'Levothyroxin (L-Thyroxin) 75μg',
        dosage: '75 μg',
        frequency: '1x täglich morgens',
        duration: 'Langzeit',
        instructions: '30min vor dem Frühstück, TSH-Kontrollen',
        visitIndex: 0
      },
      {
        medicationName: 'Folsäure 5mg',
        dosage: '5 mg',
        frequency: '1x täglich',
        duration: 'Langzeit',
        instructions: 'Bei Kinderwunsch und Epilepsie-Therapie',
        visitIndex: 0
      }
    ],
    labOrders: [
      {
        testName: 'HbA1c',
        priority: 'Routine',
        notes: 'Quartalskontrolle Diabetes Typ 1',
        orderedAt: '2024-11-20 09:00:00',
        result: '6.9 % (TIR 78%)',
        resultDate: '2024-11-21 08:00:00',
        status: 'completed',
        visitIndex: 0
      },
      {
        testName: 'TSH, fT3, fT4',
        priority: 'Routine',
        notes: 'Hashimoto-Kontrolle',
        orderedAt: '2024-11-20 09:00:00',
        result: 'TSH 2.1 mU/l, fT4 14.2 pmol/l',
        resultDate: '2024-11-21 08:00:00',
        status: 'completed',
        visitIndex: 0
      },
      {
        testName: 'Levetiracetam-Serumspiegel',
        priority: 'Routine',
        notes: 'Therapie-Monitoring Epilepsie',
        orderedAt: '2024-11-20 09:00:00',
        result: '22.5 mg/l (Zielbereich 12-46 mg/l)',
        resultDate: '2024-11-21 08:00:00',
        status: 'completed',
        visitIndex: 0
      },
      {
        testName: 'Mikroalbuminurie',
        priority: 'Routine',
        notes: 'Diabetische Nephropathie-Screening',
        orderedAt: '2024-11-20 09:00:00',
        result: '8 μg/mg Kreatinin (Normbereich)',
        resultDate: '2024-11-21 08:00:00',
        status: 'completed',
        visitIndex: 0
      },
      {
        testName: 'Antikörper (GAD, IA2, ZnT8)',
        priority: 'Routine',
        notes: 'Diabetes-Typ-Bestätigung',
        orderedAt: '2024-02-10 11:00:00',
        result: 'GAD-AK 145 IU/ml (erhöht), IA2-AK positiv',
        resultDate: '2024-02-12 08:00:00',
        status: 'completed',
        visitIndex: 3
      }
    ],
    radiologyOrders: [
      {
        testName: 'EEG',
        priority: 'Routine',
        notes: 'Epilepsie-Kontrolle',
        orderedAt: '2024-08-15 09:30:00',
        result: 'Fokale sharp waves Temporallappen links',
        resultDate: '2024-08-20 14:00:00',
        status: 'completed',
        visitIndex: 1
      }
    ],
    appointments: [
      {
        scheduledAt: '2025-02-20 08:30:00',
        reason: 'Quartalskontrolle DM Typ 1 + Epilepsie',
        notes: 'Labor: HbA1c, TSH, Levetiracetam-Spiegel. CGM-Auswertung.',
        status: 'scheduled',
        visitIndex: 0
      }
    ]
  }
];

// Database functions (reused from chronic patients script)
async function ensureDoctor() {
  let doctor = await get('SELECT id FROM doctors WHERE email = ?', [doctorProfile.email]);
  
  if (!doctor) {
    const hashedPassword = await bcrypt.hash('secure_password_123!', 10);
    const result = await run(
      `INSERT INTO doctors (first_name, last_name, email, password_hash, license_number, specialty) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [doctorProfile.firstName, doctorProfile.lastName, doctorProfile.email, hashedPassword, 
       doctorProfile.licenseNumber, doctorProfile.specialty]
    );
    doctor = { id: result.lastID };
    console.log(`Created doctor ${doctorProfile.firstName} ${doctorProfile.lastName} (ID: ${doctor.id})`);
  }
  
  return doctor.id;
}

async function upsertVisit(doctorId, patientId, visit) {
  const existing = await get(
    'SELECT id FROM visits WHERE patient_id = ? AND visit_date = ?',
    [patientId, visit.visitDate]
  );

  if (existing) {
    console.log(`Visit already exists for ${visit.visitDate}`);
    return existing.id;
  }

  const result = await run(
    `INSERT INTO visits (
      patient_id, doctor_id, visit_date, chief_complaint, hpi, ros_json, 
      physical_exam_json, diagnosis, treatment_plan, vitals_json, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      patientId,
      doctorId,
      visit.visitDate,
      visit.chiefComplaint || null,
      visit.hpi || null,
      visit.reviewOfSystems ? JSON.stringify(visit.reviewOfSystems) : null,
      visit.physicalExam ? JSON.stringify(visit.physicalExam) : null,
      visit.diagnosis || null,
      visit.treatmentPlan || null,
      visit.vitals ? JSON.stringify(visit.vitals) : null,
      visit.status || 'completed'
    ]
  );

  return result.lastID;
}

async function insertPrescription(doctorId, patientId, visitId, prescription) {
  await run(
    `INSERT INTO prescriptions (
      patient_id, doctor_id, visit_id, medication_name, dosage, frequency, duration, instructions
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      patientId,
      doctorId,
      visitId,
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
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

async function seedGermanPatients() {
  await initializeDatabase();
  const doctorId = await ensureDoctor();

  for (const patient of germanPatients) {
    const existing = await get('SELECT id FROM patients WHERE email = ? AND doctor_id = ?', [patient.email, doctorId]);
    if (existing) {
      console.log(`Skipping existing patient ${patient.firstName} ${patient.lastName}`);
      continue;
    }

    const result = await run(
      `INSERT INTO patients (
        doctor_id, first_name, last_name, date_of_birth, gender, email, phone, address, blood_type,
        height_cm, weight_kg, emergency_contact, insurance, allergies, chronic_conditions, medications, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    console.log(`Created German patient ${patient.firstName} ${patient.lastName} (ID: ${patientId})`);

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

  console.log('German patient seeding complete.');
}

seedGermanPatients()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to seed German patients', err);
    process.exit(1);
  });