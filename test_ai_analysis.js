// Test the AI functionality with specific patient visit reasons
// This script will add visit reasons for Hans and Maria and test the AI analysis

async function testAIWithPatientReasons() {
  const visitReasons = [
    // Hans Müller (Patient ID: 17) - Diabetic follow-up
    {
      patient_id: 17,
      primary_reason: 'follow-up',
      visit_type: 'scheduled',
      priority_level: 'normal',
      detailed_reason: 'Routine diabetic follow-up appointment. Patient has Type 2 Diabetes Mellitus and requires regular monitoring of blood glucose levels, HbA1c, and assessment of diabetic complications. Review of current medication regimen and lifestyle modifications.',
      referring_doctor: 'Dr. Weber',
      insurance_auth: 'no',
      timestamp: new Date().toISOString()
    },
    // Maria Schmidt (Patient ID: 18) - Epilepsy follow-up  
    {
      patient_id: 18,
      primary_reason: 'follow-up',
      visit_type: 'scheduled',
      priority_level: 'normal',
      detailed_reason: 'Epilepsy follow-up appointment. Patient has Type 1 Diabetes and Epilepsy. Monitoring seizure control, medication compliance, and potential drug interactions between antiepileptic drugs and diabetes medications. Assessment of neurological status.',
      referring_doctor: 'Dr. Neurologist Schmidt',
      insurance_auth: 'no',
      timestamp: new Date().toISOString()
    }
  ];

  for (const reason of visitReasons) {
    try {
      console.log(`🔄 Testing AI analysis for Patient ${reason.patient_id}...`);
      
      const response = await fetch(`http://127.0.0.1:8001/api/patient/${reason.patient_id}/visit_reason`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reason)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Patient ${reason.patient_id}: ${result.message}`);
        
        // Wait a bit for AI processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try to fetch the AI summary
        try {
          const summaryResponse = await fetch(`http://127.0.0.1:8001/api/patient/${reason.patient_id}/summary`);
          if (summaryResponse.ok) {
            const summary = await summaryResponse.json();
            console.log(`🧠 AI Analysis for Patient ${reason.patient_id}:`, summary);
            console.log(`📊 Current Trajectory: ${summary.current_trajectory}`);
          }
        } catch (summaryError) {
          console.log(`⚠️ Could not fetch AI summary: ${summaryError.message}`);
        }
        
      } else {
        console.log(`❌ Failed to process Patient ${reason.patient_id}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Error testing Patient ${reason.patient_id}:`, error);
    }
  }

  console.log('🎯 AI testing complete! Check the console above for results.');
}

// Run the test
testAIWithPatientReasons();