import requests
import json

# Test the drug risk assessment for Michael Omondi (Patient ID 16)
BASE_URL = "http://127.0.0.1:8000"

print("=" * 60)
print("Testing Drug Risk Assessment for Michael Omondi")
print("=" * 60)

# Get patient data
print("\n1. Fetching patient data...")
response = requests.get(f"{BASE_URL}/api/patient/16")
if response.status_code == 200:
    patient_data = response.json()
    print(f"✅ Patient: {patient_data.get('firstName')} {patient_data.get('lastName')}")
    
    # Check medications
    meds = patient_data.get('medications', [])
    if isinstance(meds, str):
        meds = json.loads(meds) if meds else []
    
    print(f"\n2. Medications from patient record: {len(meds)}")
    for med in meds:
        print(f"   - {med}")
    
    # Check prescriptions
    prescriptions = patient_data.get('prescriptions', [])
    print(f"\n3. Recent prescriptions: {len(prescriptions)}")
    for rx in prescriptions[:5]:
        print(f"   - {rx.get('medicationName')} {rx.get('dosage')}")
    
    # Check lab orders
    labs = patient_data.get('labOrders', [])
    print(f"\n4. Lab results: {len(labs)}")
    for lab in labs[:5]:
        if lab.get('result'):
            print(f"   - {lab.get('testName')}: {lab.get('result')}")
else:
    print(f"❌ Failed to get patient: {response.status_code}")
    exit(1)

# Get drug risk assessment
print("\n5. Requesting drug risk assessment...")
print("-" * 60)
response = requests.get(f"{BASE_URL}/api/patient/16/drug_risk_assessment")

if response.status_code == 200:
    data = response.json()
    assessment = data.get('assessment', {})
    
    print(f"\n✅ Risk Assessment Generated")
    print("=" * 60)
    
    # Drug-Drug Interactions
    interactions = assessment.get('drug_interactions', [])
    if interactions:
        print(f"\n⚠️  DRUG-DRUG INTERACTIONS: {len(interactions)}")
        print("=" * 60)
        for idx, interaction in enumerate(interactions, 1):
            print(f"\n{idx}. {' + '.join(interaction.get('drugs', []))}")
            print(f"   Risk Level: {interaction.get('risk_level')}")
            print(f"   Interaction: {interaction.get('interaction')}")
            print(f"   Clinical Effect: {interaction.get('clinical_effect')}")
            print(f"   Recommendation: {interaction.get('recommendation')}")
            print(f"   Source: {interaction.get('source')}")
    else:
        print("\n✅ No drug-drug interactions detected")
    
    # Drug-Induced Lab Effects
    lab_effects = assessment.get('drug_lab_effects', [])
    if lab_effects:
        print(f"\n\n🧪 DRUG-INDUCED LAB ABNORMALITIES: {len(lab_effects)}")
        print("=" * 60)
        for idx, effect in enumerate(lab_effects, 1):
            print(f"\n{idx}. {effect.get('medication')} → {effect.get('lab_parameter')}")
            print(f"   Current Value: {effect.get('current_value')}")
            print(f"   Risk Level: {effect.get('risk_level')}")
            print(f"   Mechanism: {effect.get('mechanism')}")
            print(f"   Clinical Significance: {effect.get('clinical_significance')}")
            print(f"   Recommendation: {effect.get('recommendation')}")
            print(f"   Source: {effect.get('source')}")
    else:
        print("\n✅ No drug-induced lab abnormalities detected")
    
    # Contraindications
    contras = assessment.get('contraindications', [])
    if contras:
        print(f"\n\n🚫 CONTRAINDICATIONS: {len(contras)}")
        print("=" * 60)
        for idx, contra in enumerate(contras, 1):
            print(f"\n{idx}. {contra.get('medication')}")
            print(f"   Issue: {contra.get('issue')}")
            print(f"   Risk Level: {contra.get('risk_level')}")
            print(f"   Reason: {contra.get('reason')}")
            print(f"   Recommendation: {contra.get('recommendation')}")
            print(f"   Source: {contra.get('source')}")
    else:
        print("\n✅ No contraindications detected")
    
    print("\n" + "=" * 60)
    
else:
    print(f"❌ Failed to get risk assessment: {response.status_code}")
    print(response.text)
