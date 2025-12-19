// Script to add visit reasons for Hans, Maria, and Naomi
// This will be executed in the browser console or added as a function

function addPatientVisitReasons() {
  const visitReasons = JSON.parse(localStorage.getItem('visitReasons') || '{}');
  
  // Hans Müller (Patient ID: 17) - Diabetic follow-up
  const hansReasons = [
    {
      primaryReason: 'follow-up',
      visitType: 'scheduled',
      priorityLevel: 'normal',
      detailedReason: 'Routine diabetic follow-up appointment. Patient has Type 2 Diabetes Mellitus and requires regular monitoring of blood glucose levels, HbA1c, and assessment of diabetic complications. Review of current medication regimen and lifestyle modifications.',
      referringDoctor: 'Dr. Weber',
      insuranceAuth: 'no',
      timestamp: new Date().toISOString(),
      patientId: 17
    }
  ];
  
  // Maria Schmidt (Patient ID: 18) - Epilepsy follow-up
  const mariaReasons = [
    {
      primaryReason: 'follow-up',
      visitType: 'scheduled', 
      priorityLevel: 'normal',
      detailedReason: 'Epilepsy follow-up appointment. Patient has Type 1 Diabetes and Epilepsy. Monitoring seizure control, medication compliance, and potential drug interactions between antiepileptic drugs and diabetes medications. Assessment of neurological status.',
      referringDoctor: 'Dr. Neurologist Schmidt',
      insuranceAuth: 'no',
      timestamp: new Date().toISOString(),
      patientId: 18
    }
  ];
  
  // Naomi (assuming patient exists) - Renal failure analysis for dialysis
  const naomiReasons = [
    {
      primaryReason: 'chronic-condition',
      visitType: 'scheduled',
      priorityLevel: 'high',
      detailedReason: 'Renal failure analysis and assessment for scheduled dialysis. Patient requires comprehensive evaluation of kidney function, electrolyte balance, fluid status, and dialysis adequacy. Review of dialysis schedule, access site evaluation, and management of renal complications.',
      referringDoctor: 'Dr. Nephrologist Johnson',
      insuranceAuth: 'yes',
      timestamp: new Date().toISOString(),
      patientId: 'naomi' // Will need to find actual patient ID
    }
  ];
  
  // Store Hans's reasons
  if (!visitReasons[17]) visitReasons[17] = [];
  visitReasons[17].push(...hansReasons);
  
  // Store Maria's reasons  
  if (!visitReasons[18]) visitReasons[18] = [];
  visitReasons[18].push(...mariaReasons);
  
  // Store Naomi's reasons (commented out until we find her patient ID)
  // if (!visitReasons['naomi']) visitReasons['naomi'] = [];
  // visitReasons['naomi'].push(...naomiReasons);
  
  localStorage.setItem('visitReasons', JSON.stringify(visitReasons));
  
  console.log('✅ Visit reasons added for Hans and Maria');
  console.log('Hans (ID: 17):', hansReasons);
  console.log('Maria (ID: 18):', mariaReasons);
  
  return {
    hans: hansReasons,
    maria: mariaReasons,
    naomi: naomiReasons
  };
}

// Execute the function
if (typeof window !== 'undefined') {
  // Running in browser
  window.addPatientVisitReasons = addPatientVisitReasons;
  console.log('Function addPatientVisitReasons() available. Call it to add visit reasons.');
} else {
  // Running in Node.js
  module.exports = { addPatientVisitReasons };
}