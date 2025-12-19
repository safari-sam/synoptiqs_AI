/**
 * FHIR R4 Generator
 * Maps internal EHR database structure to standard FHIR JSON resources.
 */

class FHIRGenerator {
    constructor() {
        this.baseUrl = 'http://localhost:5000/api/fhir'; // Update for production
    }

    /**
     * Generate a FHIR Bundle containing all patient data
     */
    generateBundle(data) {
        const patient = this.mapPatient(data.patient);
        const resources = [patient];

        // Map Visits to Encounters
        if (data.visits) {
            data.visits.forEach(visit => {
                resources.push(this.mapEncounter(visit, data.patient.id));
                
                // Extract Observations (Vitals) from visits
                if (visit.vitals) {
                    const vitals = typeof visit.vitals === 'string' ? JSON.parse(visit.vitals) : visit.vitals;
                    resources.push(...this.mapVitalsToObservations(vitals, data.patient.id, visit.id, visit.visitDate));
                }
            });
        }

        // Map Prescriptions to MedicationRequests
        if (data.prescriptions) {
            data.prescriptions.forEach(rx => {
                resources.push(this.mapMedicationRequest(rx));
            });
        }

        // Map Chronic Conditions to Conditions
        if (data.patient.chronicConditions) {
            const conditions = Array.isArray(data.patient.chronicConditions) 
                ? data.patient.chronicConditions 
                : [data.patient.chronicConditions];
            
            conditions.forEach(cond => {
                resources.push(this.mapCondition(cond, data.patient.id));
            });
        }

        return {
            resourceType: "Bundle",
            type: "collection",
            timestamp: new Date().toISOString(),
            entry: resources.map(res => ({
                resource: res
            }))
        };
    }

    mapPatient(p) {
        return {
            resourceType: "Patient",
            id: String(p.id),
            identifier: [
                { system: "urn:oid:internal-id", value: String(p.id) },
                { system: "urn:oid:insurance", value: p.insurance || "unknown" }
            ],
            name: [{
                use: "official",
                family: p.lastName,
                given: [p.firstName]
            }],
            telecom: [
                { system: "phone", value: p.phone, use: "mobile" },
                { system: "email", value: p.email }
            ],
            gender: this.mapGender(p.gender),
            birthDate: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split('T')[0] : null,
            address: [{ text: p.address }]
        };
    }

    mapEncounter(visit, patientId) {
        return {
            resourceType: "Encounter",
            id: String(visit.id),
            status: visit.status === 'completed' ? 'finished' : 'in-progress',
            class: {
                system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                code: "AMB",
                display: "ambulatory"
            },
            subject: { reference: `Patient/${patientId}` },
            period: {
                start: visit.visitDate
            },
            reasonCode: [{
                text: visit.chiefComplaint
            }]
        };
    }

    mapVitalsToObservations(vitals, patientId, encounterId, date) {
        const observations = [];
        
        // Helper to create observation
        const createObs = (code, display, value, unit, codeSystem = "http://loinc.org") => ({
            resourceType: "Observation",
            status: "final",
            category: [{
                coding: [{
                    system: "http://terminology.hl7.org/CodeSystem/observation-category",
                    code: "vital-signs",
                    display: "Vital Signs"
                }]
            }],
            code: {
                coding: [{ system: codeSystem, code: code, display: display }]
            },
            subject: { reference: `Patient/${patientId}` },
            encounter: { reference: `Encounter/${encounterId}` },
            effectiveDateTime: date,
            valueQuantity: {
                value: Number(value),
                unit: unit,
                system: "http://unitsofmeasure.org",
                code: unit
            }
        });

        if (vitals.bloodPressure) {
            // BP is usually split into Systolic/Diastolic in FHIR, keeping string for simplicity here
            observations.push({
                resourceType: "Observation",
                status: "final",
                code: { text: "Blood Pressure" },
                subject: { reference: `Patient/${patientId}` },
                encounter: { reference: `Encounter/${encounterId}` },
                effectiveDateTime: date,
                valueString: vitals.bloodPressure
            });
        }
        if (vitals.pulse || vitals.heartRate) {
            observations.push(createObs("8867-4", "Heart rate", vitals.pulse || vitals.heartRate, "/min"));
        }
        if (vitals.temperature) {
            observations.push(createObs("8310-5", "Body temperature", vitals.temperature, "Cel"));
        }
        if (vitals.weight || vitals.weightKg) {
            observations.push(createObs("29463-7", "Body Weight", vitals.weight || vitals.weightKg, "kg"));
        }

        return observations;
    }

    mapMedicationRequest(rx) {
        return {
            resourceType: "MedicationRequest",
            id: String(rx.id),
            status: "active",
            intent: "order",
            medicationCodeableConcept: {
                text: rx.medicationName
            },
            subject: { reference: `Patient/${rx.patientId}` },
            authoredOn: rx.createdAt,
            dosageInstruction: [{
                text: `${rx.dosage} - ${rx.frequency} - ${rx.duration}`,
                patientInstruction: rx.instructions
            }]
        };
    }

    mapCondition(conditionText, patientId) {
        // Since your DB stores simple strings for conditions, we wrap them
        return {
            resourceType: "Condition",
            clinicalStatus: {
                coding: [{
                    system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
                    code: "active"
                }]
            },
            code: {
                text: conditionText
            },
            subject: { reference: `Patient/${patientId}` }
        };
    }

    mapGender(g) {
        const lower = (g || '').toLowerCase();
        if (lower.startsWith('m')) return 'male';
        if (lower.startsWith('f')) return 'female';
        return 'other';
    }
}

module.exports = FHIRGenerator;
