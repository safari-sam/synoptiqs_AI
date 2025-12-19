const fs = require('fs');
const path = require('path');

const tagLabels = {
  '8000': 'BDT Version',
  '9206': 'Software ID',
  '8316': 'Record Type',
  '8100': 'Patient ID',
  '3100': 'Last Name',
  '3101': 'First Name',
  '3110': 'Date of Birth',
  '3111': 'Gender',
  '3102': 'Address',
  '3112': 'Phone',
  '3116': 'Email',
  '3105': 'Insurance',
  '3628': 'Patient Number',
  '3629': 'Blood Type',
  '3630': 'Emergency Contact',
  '3626': 'Weight',
  '3627': 'Height',
  '8401': 'Allergy Header',
  '8402': 'Allergy Substance',
  '8403': 'Allergy Severity',
  '8404': 'Allergy Reaction',
  '6200': 'Diagnosis Header',
  '6201': 'Diagnosis Code',
  '6202': 'Diagnosis Text',
  '6203': 'Diagnosis Status',
  '6220': 'Medication Header',
  '6221': 'Medication Name',
  '6222': 'Medication Dosage',
  '6223': 'Medication Start Date',
  '6225': 'Medication Status',
  '6226': 'Medication Instructions',
  '8410': 'Lab Header',
  '8411': 'Lab Test Name',
  '8412': 'Lab Result Summary',
  '8413': 'Lab Detailed Results',
  '8418': 'Lab Ordered Date',
  '8419': 'Lab Result Date',
  '8420': 'Lab Status',
  '8421': 'Lab Priority',
  '8422': 'Lab Notes',
  '8423': 'Lab Verification Date',
  '8424': 'Lab Verified By',
  '6330': 'Procedure Header',
  '6331': 'Procedure Date',
  '6333': 'Procedure Name',
  '6334': 'Procedure Result/Notes',
  '6300': 'Clinical Note Header',
  '6301': 'Visit Date',
  '6302': 'Visit Time',
  '3622': 'Systolic BP',
  '3623': 'Diastolic BP',
  '3624': 'Heart Rate',
  '3625': 'Temperature',
  '3624': 'Heart Rate',
  '3626': 'Weight',
  '3627': 'Height',
  '6313': 'Vitals Summary',
  '6306': 'Chief Complaint',
  '6305': 'History of Present Illness',
  '6304': 'Review of Systems',
  '6307': 'Physical Exam',
  '6308': 'Diagnosis',
  '6309': 'Treatment Plan',
  '6310': 'Visit Summary',
  '6315': 'Patient Summary Header',
  '6316': 'Patient Summary Entry'
};

function printUsage() {
  console.log('Usage: node scripts/inspect_bdt.js <path-to-bdt-file>');
  console.log('Example: node scripts/inspect_bdt.js exports/bdt/patient_1_2024-05-01T12-00-00.bdt');
}

function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    printUsage();
    process.exit(1);
  }

  const resolvedPath = path.resolve(fileArg);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(resolvedPath, 'latin1');
  const lines = raw.split(/\r?\n/).filter(Boolean);

  console.log(`Inspecting ${resolvedPath}`);
  console.log(`Total lines: ${lines.length}`);
  console.log('------------------------------------------------------------------');

  lines.forEach((line, index) => {
    if (line.length < 7) {
      console.log(`${String(index + 1).padStart(3, '0')} | MALFORMED | ${line}`);
      return;
    }

    const lengthField = line.slice(0, 3);
    const tag = line.slice(3, 7);
    const value = line.slice(7);
    const declaredLength = Number(lengthField);
    const actualLength = line.length;
    const label = tagLabels[tag] ? `${tagLabels[tag]}` : 'Unknown';
    const lengthNote = Number.isNaN(declaredLength) || declaredLength === actualLength
      ? ''
      : ` (length ${declaredLength} but actual ${actualLength})`;

    console.log(`${String(index + 1).padStart(3, '0')} | ${tag} | ${label} | ${value}${lengthNote}`);
  });
}

main();
