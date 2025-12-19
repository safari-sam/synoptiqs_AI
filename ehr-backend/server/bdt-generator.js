/**
 * BDT (Behandlungsdatentransfer) Generator
 * 
 * This module generates BDT v3.1.0 formatted files from your EHR database.
 * BDT is the German standard for complete patient record transfer.
 */

const fs = require('fs').promises;
const path = require('path');

class BDTGenerator {
    constructor() {
        // BDT uses Windows-1252 (CP1252) encoding for German characters
        this.encoding = 'latin1'; // Node.js equivalent of CP1252
        this.bdtVersion = '3.1.0';
    }

    resolveArray(...candidates) {
        for (const candidate of candidates) {
            if (candidate === undefined || candidate === null) {
                continue;
            }
            if (Array.isArray(candidate)) {
                return candidate;
            }
            if (typeof candidate === 'string') {
                const parsed = this.safeJsonParse(candidate, null);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
                continue;
            }
            if (typeof candidate === 'object') {
                if (Array.isArray(candidate.records)) {
                    return candidate.records;
                }
                if (Array.isArray(candidate.items)) {
                    return candidate.items;
                }
                if (Array.isArray(candidate.data)) {
                    return candidate.data;
                }
                if (Array.isArray(candidate.results)) {
                    return candidate.results;
                }
            }
        }
        return [];
    }

    safeJsonParse(value, fallback = null) {
        if (typeof value !== 'string') {
            return value ?? fallback;
        }
        try {
            const parsed = JSON.parse(value);
            return parsed ?? fallback;
        } catch (err) {
            return fallback;
        }
    }

    parseNumeric(value) {
        if (value === null || value === undefined) {
            return null;
        }
        if (typeof value === 'number' && !Number.isNaN(value)) {
            return value;
        }
        const match = value.toString().match(/-?\d+(\.\d+)?/);
        return match ? Number(match[0]) : null;
    }

    humanizeLabel(key) {
        if (!key) {
            return '';
        }
        return key
            .toString()
            .replace(/_/g, ' ')
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/^./, (c) => c.toUpperCase());
    }

    normalizeVitals(rawVitals) {
        const normalized = {
            systolic: null,
            diastolic: null,
            heartRate: null,
            temperature: null,
            weight: null,
            height: null,
            respiratory: null,
            oxygen: null,
            summaryParts: []
        };

        if (!rawVitals) {
            return normalized;
        }

        let vitals = rawVitals;
        if (typeof vitals === 'string') {
            const parsed = this.safeJsonParse(vitals, null);
            if (parsed) {
                vitals = parsed;
            } else {
                const text = vitals.trim();
                if (text) normalized.summaryParts.push(text);
                return normalized;
            }
        }

        if (Array.isArray(vitals)) {
            vitals = vitals.reduce((acc, entry) => {
                if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
                    return { ...acc, ...entry };
                }
                return acc;
            }, {});
        }

        if (!vitals || typeof vitals !== 'object') {
            const text = vitals != null ? String(vitals).trim() : '';
            if (text) normalized.summaryParts.push(text);
            return normalized;
        }

        const handledKeys = new Set();

        const bpRaw = vitals.bloodPressure ?? vitals.blood_pressure ?? vitals.bp;
        if (bpRaw) {
            handledKeys.add('bloodPressure');
            handledKeys.add('blood_pressure');
            handledKeys.add('bp');
            let systolic = null;
            let diastolic = null;
            let bpText = '';

            if (typeof bpRaw === 'object') {
                systolic = this.parseNumeric(bpRaw.systolic);
                diastolic = this.parseNumeric(bpRaw.diastolic);
                const sysDisplay = bpRaw.systolic ?? systolic;
                const diaDisplay = bpRaw.diastolic ?? diastolic;
                if (sysDisplay && diaDisplay) {
                    bpText = `${sysDisplay}/${diaDisplay}`;
                }
            } else {
                const match = bpRaw.toString().match(/(\d{2,3})\s*[\/|\-]\s*(\d{2,3})/);
                if (match) {
                    systolic = Number(match[1]);
                    diastolic = Number(match[2]);
                    bpText = `${match[1]}/${match[2]}`;
                } else {
                    systolic = this.parseNumeric(bpRaw);
                    bpText = bpRaw.toString();
                }
            }

            if (systolic !== null) {
                normalized.systolic = systolic;
            }
            if (diastolic !== null) {
                normalized.diastolic = diastolic;
            }
            if (!bpText && normalized.systolic !== null && normalized.diastolic !== null) {
                bpText = `${normalized.systolic}/${normalized.diastolic}`;
            }
            if (bpText) {
                normalized.summaryParts.push(`BP ${bpText} mmHg`);
            }
        }

        const heartRaw = vitals.heartRate ?? vitals.heart_rate ?? vitals.pulse;
        if (heartRaw !== undefined && heartRaw !== null && heartRaw !== '') {
            handledKeys.add('heartRate');
            handledKeys.add('heart_rate');
            handledKeys.add('pulse');
            const heartRate = this.parseNumeric(heartRaw);
            if (heartRate !== null) {
                normalized.heartRate = heartRate;
                normalized.summaryParts.push(`Heart Rate ${heartRate} bpm`);
            } else {
                normalized.summaryParts.push(`Heart Rate ${heartRaw}`);
            }
        }

        const tempRaw = vitals.temperature ?? vitals.temp;
        if (tempRaw !== undefined && tempRaw !== null && tempRaw !== '') {
            handledKeys.add('temperature');
            handledKeys.add('temp');
            const temperature = this.parseNumeric(tempRaw);
            if (temperature !== null) {
                normalized.temperature = temperature;
                normalized.summaryParts.push(`Temperature ${temperature} °C`);
            } else {
                normalized.summaryParts.push(`Temperature ${tempRaw}`);
            }
        }

        const respiratoryRaw = vitals.respiratory ?? vitals.respiratoryRate ?? vitals.respiration;
        if (respiratoryRaw !== undefined && respiratoryRaw !== null && respiratoryRaw !== '') {
            handledKeys.add('respiratory');
            handledKeys.add('respiratoryRate');
            handledKeys.add('respiration');
            const respiratoryRate = this.parseNumeric(respiratoryRaw);
            if (respiratoryRate !== null) {
                normalized.respiratory = respiratoryRate;
                normalized.summaryParts.push(`Resp Rate ${respiratoryRate} breaths/min`);
            } else {
                normalized.summaryParts.push(`Resp Rate ${respiratoryRaw}`);
            }
        }

        const oxygenRaw = vitals.oxygenSaturation ?? vitals.oxygen ?? vitals.spo2;
        if (oxygenRaw !== undefined && oxygenRaw !== null && oxygenRaw !== '') {
            handledKeys.add('oxygenSaturation');
            handledKeys.add('oxygen');
            handledKeys.add('spo2');
            const oxygen = this.parseNumeric(oxygenRaw);
            if (oxygen !== null) {
                normalized.oxygen = oxygen;
                normalized.summaryParts.push(`SpO2 ${oxygen}%`);
            } else {
                normalized.summaryParts.push(`SpO2 ${oxygenRaw}`);
            }
        }

        const weightRaw = vitals.weight ?? vitals.weightKg ?? vitals.weight_kg;
        if (weightRaw !== undefined && weightRaw !== null && weightRaw !== '') {
            handledKeys.add('weight');
            handledKeys.add('weightKg');
            handledKeys.add('weight_kg');
            const weight = this.parseNumeric(weightRaw);
            if (weight !== null) {
                normalized.weight = weight;
            }
            const display = typeof weightRaw === 'string' && weightRaw.trim()
                ? weightRaw.trim()
                : weight !== null
                    ? `${weight} kg`
                    : '';
            if (display) {
                normalized.summaryParts.push(`Weight ${display}`);
            }
        }

        const heightRaw = vitals.height ?? vitals.heightCm ?? vitals.height_cm;
        if (heightRaw !== undefined && heightRaw !== null && heightRaw !== '') {
            handledKeys.add('height');
            handledKeys.add('heightCm');
            handledKeys.add('height_cm');
            const height = this.parseNumeric(heightRaw);
            if (height !== null) {
                normalized.height = height;
            }
            const display = typeof heightRaw === 'string' && heightRaw.trim()
                ? heightRaw.trim()
                : height !== null
                    ? `${height} cm`
                    : '';
            if (display) {
                normalized.summaryParts.push(`Height ${display}`);
            }
        }

        Object.entries(vitals).forEach(([key, value]) => {
            if (handledKeys.has(key)) {
                return;
            }
            if (value === null || value === undefined || value === '') {
                return;
            }
            const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
            if (text.trim()) {
                normalized.summaryParts.push(`${this.humanizeLabel(key)}: ${text.trim()}`);
            }
        });

        normalized.summaryParts = Array.from(new Set(normalized.summaryParts));
        return normalized;
    }

    formatKeyValuePairs(data) {
        const condense = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
        if (!data) {
            return '';
        }
        if (typeof data === 'string') {
            return condense(data);
        }
        if (Array.isArray(data)) {
            return data
                .map((value) => (value && typeof value === 'object' ? JSON.stringify(value) : String(value || '')))
                .map((text) => condense(text))
                .filter((text) => text.length)
                .join('; ');
        }
        if (typeof data === 'object') {
            return Object.entries(data)
                .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
                .map(([key, value]) => {
                    const label = this.humanizeLabel(key);
                    const text = value && typeof value === 'object' && !Array.isArray(value)
                        ? JSON.stringify(value)
                        : String(value);
                    return `${label}: ${condense(text)}`;
                })
                .join('; ');
        }
        return condense(data);
    }

    /**
     * Format a single BDT field according to Tag-Length-Value format
     * 
     * @param {string} fieldId - 4-digit field identifier
     * @param {string} content - The data content
     * @returns {string} Formatted BDT line
     */
    formatField(fieldId, content) {
        // Convert to string and trim
        const contentStr = String(content ?? '').trim();
        
        // Calculate total length: 3 (length) + 4 (field_id) + content length
        const totalLength = 7 + contentStr.length;
        
        // Format: 3-digit length + 4-digit field ID + content
        return `${totalLength.toString().padStart(3, '0')}${fieldId}${contentStr}`;
    }

    /**
     * Convert JavaScript Date to DDMMYYYY format
     */
    formatDate(dateValue) {
        if (!dateValue) return '';
        
        let date;
        if (typeof dateValue === 'string') {
            date = new Date(dateValue);
        } else if (dateValue instanceof Date) {
            date = dateValue;
        } else {
            return '';
        }
        
        if (isNaN(date.getTime())) return '';
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}${month}${year}`;
    }

    /**
     * Convert JavaScript Date to HHMMSS format
     */
    formatTime(dateValue) {
        if (!dateValue) return '';
        
        let date;
        if (typeof dateValue === 'string') {
            date = new Date(dateValue);
        } else if (dateValue instanceof Date) {
            date = dateValue;
        } else {
            return '';
        }
        
        if (isNaN(date.getTime())) return '';
        
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${hours}${minutes}${seconds}`;
    }

    /**
     * Generate BDT file header
     */
    generateHeader(patientData) {
        const lines = [];
        
        // BDT Version
        lines.push(this.formatField('8000', this.bdtVersion));
        
        // Software ID
        lines.push(this.formatField('9206', 'YourEHRSystem'));
        
        // Record type
        lines.push(this.formatField('8316', 'Patient'));
        
        // Patient ID
        lines.push(this.formatField('8100', patientData.id.toString()));
        
        return lines;
    }

    /**
     * Generate patient demographics section
     */
    generateDemographics(patientData) {
        const lines = [];
        
        // Name
        if (patientData.lastName) {
            lines.push(this.formatField('3100', patientData.lastName));
        }
        if (patientData.firstName) {
            lines.push(this.formatField('3101', patientData.firstName));
        }
        
        // Date of Birth
        if (patientData.dateOfBirth) {
            lines.push(this.formatField('3110', this.formatDate(patientData.dateOfBirth)));
        }
        
        // Gender
        if (patientData.gender) {
            // Map your gender values to BDT standard (M/F/D)
            let genderCode = patientData.gender.toUpperCase().charAt(0);
            if (!['M', 'F', 'D'].includes(genderCode)) {
                genderCode = 'U'; // Unknown
            }
            lines.push(this.formatField('3111', genderCode));
        }
        
        // Address
        if (patientData.address) {
            lines.push(this.formatField('3102', patientData.address));
        }
        
        // Contact Info
        if (patientData.phone) {
            lines.push(this.formatField('3112', patientData.phone));
        }
        if (patientData.email) {
            lines.push(this.formatField('3116', patientData.email));
        }
        
        // Insurance
        if (patientData.insurance) {
            lines.push(this.formatField('3105', patientData.insurance));
        }
        
        // Patient Number
        lines.push(this.formatField('3628', patientData.id.toString()));
        
        // Blood Type
        if (patientData.bloodType) {
            lines.push(this.formatField('3629', patientData.bloodType));
        }
        
        // Emergency Contact
        if (patientData.emergencyContact) {
            lines.push(this.formatField('3630', patientData.emergencyContact));
        }

        if (patientData.weightKg) {
            const weightValue = this.parseNumeric(patientData.weightKg);
            const weightContent = weightValue !== null ? `${weightValue}` : String(patientData.weightKg).trim();
            if (weightContent) {
                lines.push(this.formatField('3626', weightContent));
            }
        }

        if (patientData.heightCm) {
            const heightValue = this.parseNumeric(patientData.heightCm);
            const heightContent = heightValue !== null ? `${heightValue}` : String(patientData.heightCm).trim();
            if (heightContent) {
                lines.push(this.formatField('3627', heightContent));
            }
        }
        
        return lines;
    }

    /**
     * Generate allergies section
     */
    generateAllergies(patientData) {
        const lines = [];
        
        if (!patientData.allergies || patientData.allergies.length === 0) {
            return lines;
        }
        
        // Parse allergies (stored as JSON array in your database)
        let allergies = patientData.allergies;
        if (typeof allergies === 'string') {
            try {
                allergies = JSON.parse(allergies);
            } catch (e) {
                allergies = [];
            }
        }
        
        for (const allergy of allergies) {
            // Allergy header
            lines.push(this.formatField('8401', 'Allergy'));
            
            // Allergy substance (if it's an object with name property, otherwise use as string)
            const allergyName = typeof allergy === 'object' ? (allergy.name || allergy) : allergy;
            lines.push(this.formatField('8402', allergyName));
            
            // Severity (if available)
            if (typeof allergy === 'object' && allergy.severity) {
                lines.push(this.formatField('8403', allergy.severity));
            }
            
            // Reaction (if available)
            if (typeof allergy === 'object' && allergy.reaction) {
                lines.push(this.formatField('8404', allergy.reaction));
            }
        }
        
        return lines;
    }

    /**
     * Generate chronic conditions as diagnoses
     */
    generateChronicConditions(patientData) {
        const lines = [];
        
        if (!patientData.chronicConditions || patientData.chronicConditions.length === 0) {
            return lines;
        }
        
        // Parse chronic conditions
        let conditions = patientData.chronicConditions;
        if (typeof conditions === 'string') {
            try {
                conditions = JSON.parse(conditions);
            } catch (e) {
                conditions = [];
            }
        }
        
        for (const condition of conditions) {
            // Diagnosis header
            lines.push(this.formatField('6200', 'Diagnosis'));
            
            // If it's an object with icd_code and name
            if (typeof condition === 'object') {
                if (condition.icd_code) {
                    lines.push(this.formatField('6201', condition.icd_code));
                }
                if (condition.name) {
                    lines.push(this.formatField('6202', condition.name));
                }
            } else {
                // Just a string diagnosis
                lines.push(this.formatField('6202', condition));
            }
            
            // Status: G = confirmed, chronic condition
            lines.push(this.formatField('6203', 'G'));
        }
        
        return lines;
    }

    /**
     * Generate medications section
     */
    generateMedications(prescriptions) {
        const lines = [];

        if (!prescriptions || prescriptions.length === 0) {
            return [this.formatField('6313', 'Medications: No medication history recorded')];
        }

        for (const med of prescriptions) {
            const medName = (
                med.medicationName ||
                med.medication_name ||
                med.drugName ||
                med.drug_name ||
                med.item ||
                med.item_name ||
                ''
            ).toString().trim();

            if (!medName) {
                continue;
            }

            lines.push(this.formatField('6220', 'Medication'));
            lines.push(this.formatField('6221', medName));

            const dosageInfo = [
                med.dosage,
                med.frequency,
                med.duration
            ].filter(Boolean).join(' - ');

            if (dosageInfo) {
                lines.push(this.formatField('6222', dosageInfo));
            }

            if (med.createdAt || med.created_at) {
                lines.push(this.formatField('6223', this.formatDate(med.createdAt || med.created_at)));
            }

            lines.push(this.formatField('6225', 'A'));

            if (med.instructions) {
                lines.push(this.formatField('6226', med.instructions));
            }
        }

        if (!lines.length) {
            return [this.formatField('6313', 'Medications: No medication history recorded')];
        }

        return lines;
    }

    /**
     * Generate lab orders section
     */
    generateLabOrders(labOrders) {
        const lines = [];
        
        if (!labOrders || labOrders.length === 0) {
            return [this.formatField('6313', 'Laboratory: No lab history recorded')];
        }

        for (const lab of labOrders) {
            // Lab result header
            lines.push(this.formatField('8410', 'Laboratory'));
            
            // Test name
            const labName = (
                lab.testName ||
                lab.test_name ||
                lab.analyte ||
                lab.name ||
                lab.test ||
                ''
            ).toString().trim();
            if (labName) {
                lines.push(this.formatField('8411', labName));
            }
            
            // Result value (if available)
            if (lab.result) {
                lines.push(this.formatField('8412', lab.result));
            }
            
            // Structured result details
            const rawDetails = lab.resultDetails || lab.result_details || lab.result_json;
            if (rawDetails) {
                let detailsArray = rawDetails;
                if (typeof rawDetails === 'string') {
                    try {
                        detailsArray = JSON.parse(rawDetails);
                    } catch (err) {
                        detailsArray = [];
                    }
                }
                if (Array.isArray(detailsArray) && detailsArray.length > 0) {
                    const detailLines = detailsArray.map((entry) => {
                        if (!entry) return null;
                        const label = entry.label || entry.name || entry.key || 'Result';
                        const value = entry.value !== undefined && entry.value !== null ? entry.value : '';
                        const unit = entry.unit ? ` ${entry.unit}` : '';
                        const flag = entry.flag ? ` [${entry.flag}]` : '';
                        const referenceSource = entry.referenceRange ?? entry.reference ?? entry.reference_range;
                        const reference = referenceSource ? ` (Ref: ${referenceSource})` : '';
                        return `${label}: ${value}${unit}${reference}${flag}`.trim();
                    }).filter(Boolean);
                    if (detailLines.length) {
                        lines.push(this.formatField('8413', detailLines.join('; ')));
                    }
                }
            }

            // Test date
            if (lab.orderedAt || lab.ordered_at) {
                lines.push(this.formatField('8418', this.formatDate(lab.orderedAt || lab.ordered_at)));
            }
            
            // Result date (if available)
            if (lab.resultDate || lab.result_date) {
                lines.push(this.formatField('8419', this.formatDate(lab.resultDate || lab.result_date)));
            }
            
            // Status
            if (lab.status) {
                const statusMap = {
                    'ordered': 'O',
                    'pending': 'P',
                    'completed': 'C',
                    'cancelled': 'X'
                };
                lines.push(this.formatField('8420', statusMap[lab.status] || 'O'));
            }
            
            // Priority
            if (lab.priority) {
                lines.push(this.formatField('8421', lab.priority));
            }
            
            // Notes
            if (lab.notes) {
                lines.push(this.formatField('8422', lab.notes));
            }

            if (lab.verifiedAt || lab.verified_at) {
                lines.push(this.formatField('8423', `Verified ${this.formatDate(lab.verifiedAt || lab.verified_at)}`));
            }

            if (lab.verifiedByName) {
                lines.push(this.formatField('8424', `Verified by ${lab.verifiedByName}`));
            }
        }

        if (!lines.length) {
            return [this.formatField('6313', 'Laboratory: No lab history recorded')];
        }

        return lines;
    }

    /**
     * Generate radiology orders section
     */
    generateRadiologyOrders(radiologyOrders) {
        const lines = [];
        
        if (!radiologyOrders || radiologyOrders.length === 0) {
            return lines;
        }
        
        for (const rad of radiologyOrders) {
            // Procedure header
            lines.push(this.formatField('6330', 'Procedure'));
            
            // Procedure name (radiology test)
            lines.push(this.formatField('6333', rad.testName || rad.test_name || ''));
            
            // Procedure date
            if (rad.orderedAt || rad.ordered_at) {
                lines.push(this.formatField('6331', this.formatDate(rad.orderedAt || rad.ordered_at)));
            }
            
            // Result
            if (rad.result) {
                lines.push(this.formatField('6334', rad.result));
            }
            
            // Notes
            if (rad.notes) {
                lines.push(this.formatField('6334', rad.notes));
            }
        }
        
        return lines;
    }

    generatePatientSummary(visits) {
        if (!Array.isArray(visits) || visits.length === 0) {
            return [];
        }

        const summaries = visits
            .filter((visit) => visit && visit.doctorSummary && visit.doctorSummary.trim())
            .map((visit) => ({
                text: visit.doctorSummary.trim(),
                visitDate: visit.visitDate || visit.visit_date || visit.updatedAt || visit.updated_at || null
            }));

        if (!summaries.length) {
            return [];
        }

        summaries.sort((a, b) => {
            const dateA = a.visitDate ? new Date(a.visitDate) : new Date(0);
            const dateB = b.visitDate ? new Date(b.visitDate) : new Date(0);
            return dateB - dateA;
        });

        const lines = [this.formatField('6315', 'PatientSummary')];
        summaries.forEach((entry) => {
            const dateLabel = entry.visitDate ? this.formatDate(entry.visitDate) : 'Unknown';
            const condensedText = entry.text.replace(/\s+/g, ' ').trim();
            lines.push(this.formatField('6316', `[${dateLabel}] ${condensedText}`));
        });

        return lines;
    }

    /**
     * Generate visits/clinical notes section
     */
    generateVisits(visits) {
        const lines = [];
        
        if (!visits || visits.length === 0) {
            return lines;
        }
        
        for (const visit of visits) {
            // Clinical note header
            lines.push(this.formatField('6300', 'ClinicalNote'));
            
            // Visit date
            if (visit.visitDate || visit.visit_date) {
                const visitDate = visit.visitDate || visit.visit_date;
                lines.push(this.formatField('6301', this.formatDate(visitDate)));
                lines.push(this.formatField('6302', this.formatTime(visitDate)));
            }
            
            // Vitals (if available)
            const vitalsNormalized = this.normalizeVitals(visit.vitals || visit.vitals_json);
            if (vitalsNormalized.systolic !== null) {
                lines.push(this.formatField('3622', String(vitalsNormalized.systolic)));
            }
            if (vitalsNormalized.diastolic !== null) {
                lines.push(this.formatField('3623', String(vitalsNormalized.diastolic)));
            }
            if (vitalsNormalized.heartRate !== null) {
                lines.push(this.formatField('3624', String(vitalsNormalized.heartRate)));
            }
            if (vitalsNormalized.temperature !== null) {
                lines.push(this.formatField('3625', String(vitalsNormalized.temperature)));
            }
            if (vitalsNormalized.weight !== null) {
                lines.push(this.formatField('3626', String(vitalsNormalized.weight)));
            }
            if (vitalsNormalized.height !== null) {
                lines.push(this.formatField('3627', String(vitalsNormalized.height)));
            }
            if (vitalsNormalized.summaryParts.length) {
                lines.push(this.formatField('6313', `Vitals: ${vitalsNormalized.summaryParts.join(', ')}`));
            }

            // Chief complaint
            const chiefComplaint = (visit.chiefComplaint || visit.chief_complaint || '').trim();
            if (chiefComplaint) {
                lines.push(this.formatField('6306', chiefComplaint.replace(/\s+/g, ' ')));
            }

            // Reason for visit
            const reasonForVisit = (visit.reasonForVisit || visit.reason_for_visit || visit.visitReason || visit.visit_reason || '').trim();
            if (reasonForVisit) {
                lines.push(this.formatField('6304', reasonForVisit.replace(/\s+/g, ' ')));
            }

            // HPI (History of Present Illness)
            const hpiText = (visit.hpi || '').trim();
            if (hpiText) {
                lines.push(this.formatField('6305', hpiText.replace(/\s+/g, ' ')));
            }

            // Review of systems
            const reviewText = this.formatKeyValuePairs(visit.reviewOfSystems || visit.review_of_systems || visit.ros_json);
            if (reviewText) {
                lines.push(this.formatField('6304', reviewText));
            }

            // Physical exam
            const examText = this.formatKeyValuePairs(visit.physicalExam || visit.physical_exam_json);
            if (examText) {
                lines.push(this.formatField('6307', examText));
            }

            // Diagnosis from visit
            const diagnosisText = (visit.diagnosis || '').trim();
            if (diagnosisText) {
                lines.push(this.formatField('6308', diagnosisText.replace(/\s+/g, ' ')));
            }

            // Treatment plan
            const planText = (visit.treatmentPlan || visit.treatment_plan || '').trim();
            if (planText) {
                lines.push(this.formatField('6309', planText.replace(/\s+/g, ' ')));
            }

            // Doctor summary
            const summaryText = (visit.doctorSummary || visit.doctor_summary || '').trim();
            if (summaryText) {
                lines.push(this.formatField('6310', summaryText.replace(/\s+/g, ' ')));
            }
        }
        
        return lines;
    }

    /**
     * Main function to generate complete BDT file
     * 
     * @param {Object} comprehensiveData - Complete patient data from database
     * @param {string} outputPath - Path where to save the BDT file
     * @returns {Promise<string>} Path to the generated file
     */
    async generateBDTFile(comprehensiveData, outputPath) {
        const lines = [];
        
        // 1. Header
        lines.push(...this.generateHeader(comprehensiveData.patient));
        
        // 2. Demographics
        lines.push(...this.generateDemographics(comprehensiveData.patient));
        
        // 3. Allergies
        lines.push(...this.generateAllergies(comprehensiveData.patient));
        
        // 4. Chronic conditions as diagnoses
        lines.push(...this.generateChronicConditions(comprehensiveData.patient));
        
        // Resolve data arrays whether they are provided at root level or nested under patient
        const prescriptionRaw = this.resolveArray(
            comprehensiveData.prescriptions,
            comprehensiveData.patient?.prescriptions,
            comprehensiveData.patient?.medications
        );
        const prescriptions = prescriptionRaw.map((entry) => {
            if (typeof entry === 'string') {
                return { medicationName: entry };
            }
            if (entry && typeof entry === 'object') {
                return entry;
            }
            return { medicationName: String(entry ?? '').trim() };
        }).filter((entry) => entry && Object.keys(entry).length);

        const labOrders = this.resolveArray(
            comprehensiveData.labOrders,
            comprehensiveData.patient?.labOrders
        );

        const radiologyOrders = this.resolveArray(
            comprehensiveData.radiologyOrders,
            comprehensiveData.patient?.radiologyOrders
        );

        const visits = this.resolveArray(
            comprehensiveData.visits,
            comprehensiveData.patient?.visits
        );

        // 5. Medications
        lines.push(...this.generateMedications(prescriptions));
        
        // 6. Lab orders
        lines.push(...this.generateLabOrders(labOrders));
        
        // 7. Radiology orders
        lines.push(...this.generateRadiologyOrders(radiologyOrders));
        
        // 8. Visits (clinical notes)
        lines.push(...this.generateVisits(visits));

        // 9. Consolidated patient summary entries
        lines.push(...this.generatePatientSummary(visits));
        
        // Join with Windows line endings (CRLF)
        const content = lines.join('\r\n') + '\r\n';
        
        // Write file with correct encoding
        await fs.writeFile(outputPath, content, { encoding: this.encoding });
        
        console.log(`✅ BDT file generated: ${outputPath}`);
        console.log(`   Total lines: ${lines.length}`);
        console.log({
          meds: comprehensiveData.prescriptions?.length,
          labs: comprehensiveData.labOrders?.length,
          visits: comprehensiveData.visits?.length,
        });
        
        return outputPath;
    }
}

module.exports = BDTGenerator;
