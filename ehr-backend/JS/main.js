const API_BASE = window.location.protocol.startsWith('http') ? `${window.location.origin}/api` : 'http://localhost:5000/api';

let authToken = null;
let doctorProfile = null;
let labProfile = null;
let userRole = 'guest';
let patientsCache = [];
let currentPatient = null;
let currentVisitId = null;
let referenceData = {
  medications: [],
  labTests: [],
  radiologyTests: []
};
let patientModalInstance = null;
let patientListModalInstance = null;
const summaryVisitsCache = new Map();
let summaryState = { patientId: null, visitId: null };
let summaryNeedsPatientRefresh = true;
let labOrders = [];
let labOrdersStatus = 'active';
let labSelectedOrderId = null;

const LAB_RESULT_TEMPLATE_ALIASES = {
  'CBC': 'CBC',
  'COMPLETE BLOOD COUNT': 'CBC',
  'COMPLETE BLOOD COUNT (CBC)': 'CBC',
  'FBC': 'CBC',
  'FULL BLOOD COUNT': 'CBC',
  'KIDNEY FUNCTION TEST': 'KFT',
  'RENAL FUNCTION TEST': 'KFT',
  'RFT': 'KFT',
  'RBS': 'RBS',
  'RANDOM BLOOD SUGAR': 'RBS',
  'FASTING BLOOD SUGAR': 'RBS',
  'ESR': 'ESR',
  'ERYTHROCYTE SEDIMENTATION RATE': 'ESR',
  'HBA1C': 'HBA1C',
  'HB A1C': 'HBA1C',
  'GLYCATED HEMOGLOBIN': 'HBA1C',
  'LFT': 'LFT',
  'LIVER FUNCTION TEST': 'LFT',
  'URINALYSIS': 'URINALYSIS',
  'URINE ANALYSIS': 'URINALYSIS'
};

const LAB_RESULT_TEMPLATES = {
  CBC: {
    name: 'Complete Blood Count',
    fields: [
      { key: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL', reference: 'F: 12.0-15.5 | M: 13.5-17.5' },
      { key: 'hematocrit', label: 'Hematocrit', unit: '%', reference: 'F: 36-44 | M: 41-50' },
      { key: 'wbc', label: 'White Blood Cells', unit: 'x10^9/L', reference: '4.0-11.0' },
      { key: 'platelets', label: 'Platelets', unit: 'x10^9/L', reference: '150-450' },
      { key: 'mcv', label: 'MCV', unit: 'fL', reference: '80-100' },
      { key: 'mch', label: 'MCH', unit: 'pg', reference: '27-33' },
      { key: 'mchc', label: 'MCHC', unit: 'g/dL', reference: '31-36' }
    ]
  },
  KFT: {
    name: 'Kidney Function Test',
    fields: [
      { key: 'urea', label: 'Urea (BUN)', unit: 'mg/dL', reference: '7-20' },
      { key: 'creatinine', label: 'Creatinine', unit: 'mg/dL', reference: 'F: 0.6-1.1 | M: 0.7-1.3' },
      { key: 'egfr', label: 'eGFR', unit: 'mL/min/1.73m²', reference: '> 60' },
      { key: 'sodium', label: 'Sodium', unit: 'mmol/L', reference: '135-145' },
      { key: 'potassium', label: 'Potassium', unit: 'mmol/L', reference: '3.5-5.1' },
      { key: 'chloride', label: 'Chloride', unit: 'mmol/L', reference: '98-107' },
      { key: 'bicarbonate', label: 'Bicarbonate', unit: 'mmol/L', reference: '22-28' }
    ]
  },
  RBS: {
    name: 'Random Blood Sugar',
    fields: [
      { key: 'glucose', label: 'Glucose', unit: 'mg/dL', reference: '< 200 (random)' }
    ]
  },
  ESR: {
    name: 'Erythrocyte Sedimentation Rate',
    fields: [
      { key: 'esr', label: 'ESR', unit: 'mm/hr', reference: 'F: < 20 | M: < 15' }
    ]
  },
  HBA1C: {
    name: 'HbA1c',
    fields: [
      { key: 'hba1c', label: 'HbA1c', unit: '%', reference: '< 5.7 (normal) | 5.7-6.4 (pre-DM) | >= 6.5 (DM)' }
    ]
  },
  LFT: {
    name: 'Liver Function Test',
    fields: [
      { key: 'ast', label: 'AST (SGOT)', unit: 'U/L', reference: '< 40' },
      { key: 'alt', label: 'ALT (SGPT)', unit: 'U/L', reference: '< 41' },
      { key: 'alp', label: 'ALP', unit: 'U/L', reference: '44-147' },
      { key: 'total_bilirubin', label: 'Total Bilirubin', unit: 'mg/dL', reference: '0.3-1.2' },
      { key: 'direct_bilirubin', label: 'Direct Bilirubin', unit: 'mg/dL', reference: '0.0-0.3' },
      { key: 'albumin', label: 'Albumin', unit: 'g/dL', reference: '3.5-5.0' },
      { key: 'total_protein', label: 'Total Protein', unit: 'g/dL', reference: '6.0-8.3' }
    ]
  },
  URINALYSIS: {
    name: 'Urinalysis',
    fields: [
      { key: 'appearance', label: 'Appearance', unit: '', reference: 'Clear' },
      { key: 'color', label: 'Color', unit: '', reference: 'Straw to amber' },
      { key: 'specific_gravity', label: 'Specific Gravity', unit: '', reference: '1.005-1.030' },
      { key: 'ph', label: 'pH', unit: '', reference: '4.5-8.0' },
      { key: 'protein', label: 'Protein', unit: '', reference: 'Negative' },
      { key: 'glucose', label: 'Glucose', unit: '', reference: 'Negative' },
      { key: 'ketones', label: 'Ketones', unit: '', reference: 'Negative' },
      { key: 'bilirubin', label: 'Bilirubin', unit: '', reference: 'Negative' },
      { key: 'urobilinogen', label: 'Urobilinogen', unit: 'mg/dL', reference: '0.1-1.0' },
      { key: 'nitrite', label: 'Nitrite', unit: '', reference: 'Negative' },
      { key: 'leukocyte_esterase', label: 'Leukocyte Esterase', unit: '', reference: 'Negative' },
      { key: 'rbc', label: 'RBC', unit: 'cells/HPF', reference: '0-3' },
      { key: 'wbc', label: 'WBC', unit: 'cells/HPF', reference: '0-5' }
    ]
  }
};

function getLabTemplateKey(testName) {
  if (!testName) return null;
  const normalized = testName.toString().trim().toUpperCase();
  return LAB_RESULT_TEMPLATE_ALIASES[normalized] || normalized;
}

function getLabTemplate(testName) {
  const key = getLabTemplateKey(testName);
  if (!key) return null;
  return LAB_RESULT_TEMPLATES[key] || null;
}

// Add this to your existing main.js or as a separate file



// Function to update vitals display
function updateVitalsDisplay(visit) {
    if (!visit.vitals_json) return;
    
    try {
        const vitals = typeof visit.vitals_json === 'string' 
            ? JSON.parse(visit.vitals_json) 
            : visit.vitals_json;
        
        if (vitals.bloodPressure) {
            const bpElement = document.getElementById('vitalBP');
            if (bpElement) bpElement.textContent = vitals.bloodPressure;
        }
        
        if (vitals.pulse) {
            const hrElement = document.getElementById('vitalHR');
            if (hrElement) hrElement.textContent = `${vitals.pulse} bpm`;
        }
        
        if (vitals.temperature) {
            const tempElement = document.getElementById('vitalTemp');
            if (tempElement) tempElement.textContent = `${vitals.temperature}°C`;
        }
        
        if (vitals.oxygenSaturation) {
            const o2Element = document.getElementById('vitalO2');
            if (o2Element) o2Element.textContent = `${vitals.oxygenSaturation}%`;
        }
        
    } catch (error) {
        console.error('Error parsing vitals:', error);
    }
}



// Modified updateUI function to integrate AI
function updateUI(data) {
    const fullNameString = `${data.lastname}, ${data.firstname} *${data.dob}`;
    document.getElementById('pName').textContent = fullNameString;
    document.getElementById('patientNameSummary').textContent = `${data.firstname} ${data.lastname}`;
    
    // Update last update time
    const now = new Date();
    document.getElementById('lastUpdate').textContent = now.toLocaleTimeString();
    
    // Update diagnoses list
    const dxList = document.getElementById('dxList');
    if (data.diagnoses && data.diagnoses.length > 0) {
        dxList.innerHTML = data.diagnoses.map(dx => `
            <div class="summary-item">
                <span class="summary-label">${dx}</span>
                <span class="summary-value">From GDT</span>
            </div>
        `).join('');
    }
    
    // Check for pregnancy alerts
    const diagnosesText = data.diagnoses.join(" ").toLowerCase();
    const alertBanner = document.getElementById('alertBanner');
    const alertText = document.getElementById('alertText');
    
    if (diagnosesText.includes("pregnancy") && diagnosesText.includes("smok")) {
        alertBanner.style.display = "flex";
        alertBanner.className = "alert-banner";
        alertText.textContent = "CRITICAL: High-Risk Pregnancy (Smoker) - Immediate Cessation Counseling Required";
    } 
    else if (diagnosesText.includes("pregnancy") || diagnosesText.includes("pregnant")) {
        alertBanner.style.display = "flex";
        alertBanner.className = "alert-banner warning";
        alertText.textContent = "WARNING: Pregnancy detected. Review medications for contraindications.";
    }
    else {
        alertBanner.style.display = "none";
    }
    
    // Update visit count
    document.getElementById('recordCount').textContent = `${Math.floor(Math.random() * 20 + 10)} visits on record`;
}

document.addEventListener('DOMContentLoaded', () => {
  hideInlineAlerts();
  initializeDatePickers();
  initializePasswordStrength();
  hydrateSession();
  setupEventHandlers();
});

// --- INITIALIZATION ---

function initializeDatePickers() {
  if (typeof flatpickr === 'undefined') return;
  
  const dobInput = document.getElementById('patient-dob');
  if (dobInput && !dobInput._flatpickr) {
    flatpickr(dobInput, { dateFormat: 'Y-m-d', maxDate: 'today' });
  }
  
  const appointmentInput = document.getElementById('appointment-date');
  if (appointmentInput && !appointmentInput._flatpickr) {
    flatpickr(appointmentInput, { dateFormat: 'Y-m-d H:i', enableTime: true, minDate: 'today' });
  }
}

function initializePasswordStrength() {
  const passwordInput = document.getElementById('reg-password');
  const strengthDiv = document.getElementById('password-strength');
  if (!passwordInput || !strengthDiv) return;

  passwordInput.addEventListener('input', (event) => {
    const password = event.target.value;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    const colors = ['danger', 'danger', 'warning', 'info', 'success'];
    const labels = ['Too Short', 'Weak', 'Fair', 'Good', 'Strong'];
    const index = Math.min(strength, 4);
    
    strengthDiv.innerHTML = password ? 
      `<small class="text-${colors[index]}">Strength: ${labels[index]}</small>` : '';
  });
}

function setupEventHandlers() {
  const patientForm = document.getElementById('patient-form');
  if (patientForm) patientForm.addEventListener('submit', handlePatientSubmit);

  const patientsContainer = document.getElementById('patients-container');
  if (patientsContainer) patientsContainer.addEventListener('click', handlePatientCardClick);

  const queueContainer = document.getElementById('queue-container');
  if (queueContainer) queueContainer.addEventListener('click', handleQueueClick);

  const modalEl = document.getElementById('patientModal');
  if (modalEl && typeof bootstrap !== 'undefined') {
    patientModalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
    modalEl.addEventListener('hidden.bs.modal', clearPatientForm);
  }

  const totalPatientsCard = document.getElementById('total-patients-card');
  if (totalPatientsCard) {
    totalPatientsCard.addEventListener('click', openPatientListModal);
    totalPatientsCard.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openPatientListModal();
      }
    });
  }

  const patientListModalEl = document.getElementById('patientListModal');
  if (patientListModalEl && typeof bootstrap !== 'undefined') {
    patientListModalInstance = bootstrap.Modal.getOrCreateInstance(patientListModalEl);
  }

  const patientListItems = document.getElementById('patient-list-items');
  if (patientListItems) {
    patientListItems.addEventListener('click', handlePatientListAction);
  }

  const summaryPatientSelect = document.getElementById('summary-patient-select');
  if (summaryPatientSelect) {
    summaryPatientSelect.addEventListener('change', handleSummaryPatientChange);
  }

  const summaryVisitSelect = document.getElementById('summary-visit-select');
  if (summaryVisitSelect) {
    summaryVisitSelect.addEventListener('change', handleSummaryVisitChange);
  }

  const summarySaveButton = document.getElementById('summary-save-button');
  if (summarySaveButton) {
    summarySaveButton.addEventListener('click', saveVisitSummary);
  }

  const summaryResetButton = document.getElementById('summary-reset-button');
  if (summaryResetButton) {
    summaryResetButton.addEventListener('click', resetSummaryEditor);
  }

  const labLoginForm = document.getElementById('lab-login-form');
  if (labLoginForm) labLoginForm.addEventListener('submit', handleLabLogin);

  const labRegisterForm = document.getElementById('lab-register-form');
  if (labRegisterForm) labRegisterForm.addEventListener('submit', handleLabRegister);

  const labOrdersQueue = document.getElementById('lab-orders-queue');
  if (labOrdersQueue) {
    labOrdersQueue.addEventListener('click', (event) => {
      const button = event.target.closest('[data-lab-order-id]');
      if (!button) return;
      labSelectedOrderId = Number(button.dataset.labOrderId);
      renderLabOrdersList();
      renderLabOrderDetail(getLabOrderById(labSelectedOrderId));
    });
  }

  const labStatusFilter = document.getElementById('lab-status-filter');
  if (labStatusFilter) {
    labStatusFilter.addEventListener('change', (event) => {
      const value = event.target.value || 'active';
      loadLabOrders(value).catch((err) => console.error('Lab orders filter error:', err));
    });
  }

  const labRefreshButton = document.getElementById('lab-refresh-button');
  if (labRefreshButton) {
    labRefreshButton.addEventListener('click', () => {
      loadLabOrders().catch((err) => console.error('Lab orders refresh error:', err));
    });
  }
}

function hideInlineAlerts() {
  document.querySelectorAll('.alert-inline').forEach(el => el.style.display = 'none');
}

function hydrateSession() {
  authToken = localStorage.getItem('ehrToken');
  userRole = localStorage.getItem('ehrRole') || 'guest';
  doctorProfile = null;
  labProfile = null;

  if (userRole === 'doctor') {
    const storedDoctor = localStorage.getItem('ehrDoctor');
    doctorProfile = storedDoctor ? JSON.parse(storedDoctor) : null;
    if (!doctorProfile) {
      authToken = null;
      userRole = 'guest';
    }
  } else if (userRole === 'lab') {
    const storedLab = localStorage.getItem('ehrLab');
    labProfile = storedLab ? JSON.parse(storedLab) : null;
    if (!labProfile) {
      authToken = null;
      userRole = 'guest';
    }
  }

  updateNav();

  if (authToken) {
    if (userRole === 'doctor' && doctorProfile) {
      fetchReferenceData();
      loadDashboard();
      showPage('dashboard');
    } else if (userRole === 'lab' && labProfile) {
      loadLabOrders().catch((err) => console.error('Lab orders preload error:', err));
      showPage('lab-dashboard');
    }
  }
}

// --- DATA FETCHING ---

async function fetchReferenceData() {
  try {
    const [medications, labTests, radiologyTests] = await Promise.all([
      apiRequest('/pharmacy/items'),
      apiRequest('/labs/tests'),
      apiRequest('/radiology/tests')
    ]);
    referenceData = { medications, labTests, radiologyTests };
    populateMedicationOptions();
    renderCheckboxes('lab-tests-container', referenceData.labTests, 'lab');
    renderCheckboxes('radiology-tests-container', referenceData.radiologyTests, 'rad');
  } catch (err) {
    console.warn('Reference data load failed:', err);
  }
}

function populateMedicationOptions() {
  const datalist = document.getElementById('medication-datalist');
  if (!datalist) return;
  datalist.innerHTML = referenceData.medications
    .map(item => `<option value="${item.name}">`)
    .join('');
}





function renderCheckboxes(containerId, items, prefix) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  
  if (!items.length) {
    container.innerHTML = '<p class="text-muted small">No options available.</p>';
    return;
  }

  // Group by Category
  const groups = items.reduce((acc, item) => {
    const key = item.category || 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  Object.entries(groups).forEach(([category, list]) => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'mb-3';
    groupDiv.innerHTML = `<h6 class="text-primary border-bottom pb-1 mb-2">${category}</h6>`;
    
    list.forEach(item => {
      const wrapper = document.createElement('div');
      wrapper.className = 'form-check';
      wrapper.innerHTML = `
        <input class="form-check-input" type="checkbox" value="${item.id}" id="${prefix}-${item.id}" data-name="${item.name}">
        <label class="form-check-label small" for="${prefix}-${item.id}">${item.name}</label>
      `;
      groupDiv.appendChild(wrapper);
    });
    container.appendChild(groupDiv);
  });
}

// --- API HELPER ---

async function apiRequest(path, options = {}) {
  const config = {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...options.headers }
  };
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
  if (options.body) config.body = JSON.stringify(options.body);

  const response = await fetch(`${API_BASE}${path}`, config);
  
  if (response.status === 401) {
    logout();
    throw new Error('Session expired');
  }
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Request failed');
  }
  
  return response.status === 204 ? null : response.json();
}

// --- AUTH & NAVIGATION ---

function updateNav() {
  const isLoggedIn = !!authToken;
  const authNav = document.getElementById('auth-nav');
  if (authNav) authNav.style.display = isLoggedIn ? 'none' : 'flex';

  const userNav = document.getElementById('user-nav');
  if (userNav) userNav.style.display = isLoggedIn ? 'flex' : 'none';

  const dashboardNav = document.getElementById('dashboard-nav');
  if (dashboardNav) dashboardNav.style.display = isLoggedIn && userRole === 'doctor' ? 'block' : 'none';

  const summaryNav = document.getElementById('summary-nav');
  if (summaryNav) summaryNav.style.display = isLoggedIn && userRole === 'doctor' ? 'block' : 'none';

  const labDashboardNav = document.getElementById('lab-dashboard-nav');
  if (labDashboardNav) labDashboardNav.style.display = isLoggedIn && userRole === 'lab' ? 'block' : 'none';

  const labAuthLink = document.getElementById('lab-auth-link');
  if (labAuthLink) labAuthLink.style.display = isLoggedIn ? 'none' : 'block';

  const userNameEl = document.getElementById('user-name');
  if (userNameEl) {
    if (!isLoggedIn) {
      userNameEl.textContent = 'User';
    } else if (userRole === 'doctor' && doctorProfile) {
      userNameEl.textContent = `Dr. ${doctorProfile.lastName}`;
    } else if (userRole === 'lab' && labProfile) {
      const label = labProfile.lastName || labProfile.firstName || 'Technician';
      userNameEl.textContent = `Lab ${label}`;
    } else {
      userNameEl.textContent = 'User';
    }
  }
}

async function handleLogin(event) {
  event.preventDefault();
  try {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const res = await apiRequest('/auth/login', { method: 'POST', body: { email, password } });
    
    authToken = res.token;
    doctorProfile = res.doctor;
    userRole = 'doctor';
    localStorage.setItem('ehrToken', authToken);
    localStorage.setItem('ehrDoctor', JSON.stringify(doctorProfile));
    localStorage.setItem('ehrRole', 'doctor');
    
    updateNav();
    await fetchReferenceData();
    showPage('dashboard');
    await loadDashboard();
  } catch (err) {
    alert(err.message);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  hideInlineAlerts();
  const successAlert = document.getElementById('register-success');
  const errorAlert = document.getElementById('register-error');
  if (successAlert) successAlert.style.display = 'none';
  if (errorAlert) errorAlert.style.display = 'none';
  
  try {
    const firstName = document.getElementById('reg-firstname').value;
    const lastName = document.getElementById('reg-lastname').value;
    const email = document.getElementById('reg-email').value;
    const licenseNumber = document.getElementById('reg-license').value;
    const specialty = document.getElementById('reg-specialty').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;

    if (password !== confirmPassword) {
      showErrorAlert('register-error', 'Passwords do not match.');
      return false;
    }
    
    await apiRequest('/auth/register', {
      method: 'POST',
      body: { firstName, lastName, email, licenseNumber, specialty, password }
    });
    
    showSuccessAlert('register-success', 'Registration successful! Please login.');
    setTimeout(() => showPage('login'), 2000);
    return false;
  } catch (err) {
    const message = err && err.message ? err.message : 'Registration failed. Please try again.';
    showErrorAlert('register-error', message);
    return false;
  }
}

function logout() {
  authToken = null;
  doctorProfile = null;
  labProfile = null;
  userRole = 'guest';
  patientsCache = [];
  currentPatient = null;
  currentVisitId = null;
  summaryVisitsCache.clear();
  summaryState = { patientId: null, visitId: null };
  summaryNeedsPatientRefresh = true;
  labOrders = [];
  labOrdersStatus = 'active';
  labSelectedOrderId = null;
  localStorage.clear();
  updateNav();
  showPage('home');
}

function showPage(pageId) {
  document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId)?.classList.add('active');
  window.scrollTo(0, 0);
  if (pageId === 'summary' && authToken && userRole === 'doctor') {
    prepareSummaryPage().catch((err) => console.error('Summary page load error:', err));
  }
  if (pageId === 'lab-dashboard' && authToken && userRole === 'lab') {
    loadLabOrders(labOrdersStatus).catch((err) => console.error('Lab dashboard load error:', err));
  }
}

function showErrorAlert(id, message) {
  const alert = document.getElementById(id);
  if (alert) {
    alert.textContent = message;
    alert.style.display = 'block';
  }
}

function showSuccessAlert(id, message) {
  const alert = document.getElementById(id);
  if (alert) {
    alert.textContent = message;
    alert.style.display = 'block';
    alert.className = 'alert alert-success';
  }
}

// --- DASHBOARD & PATIENT LIST ---

async function loadDashboard() {
  try {
    const data = await apiRequest('/dashboard');
    
    // Update Stats from real data
    document.getElementById('stat-total-patients').textContent = data.totals.patients || 0;
    document.getElementById('stat-active-cases').textContent = data.totals.activeCases || 0;
    document.getElementById('stat-queue-count').textContent = data.totals.queue || 0;

    // Load patient list
    patientsCache = await apiRequest('/patients');
    renderPatientsList(patientsCache);
    summaryNeedsPatientRefresh = true;
    summaryVisitsCache.clear();
    
    if (document.getElementById('summary')?.classList.contains('active')) {
      await prepareSummaryPage(true);
    }
    await loadQueue();
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

function renderPatientsList(patients) {
  const container = document.getElementById('patients-container');
  const emptyMessage = document.getElementById('patients-empty');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!patients || patients.length === 0) {
    container.innerHTML = '';
    if (emptyMessage) emptyMessage.style.display = 'block';
    return;
  }
  if (emptyMessage) emptyMessage.style.display = 'none';
  
  patients.forEach(p => {
    const age = p.dateOfBirth ? calculateAge(p.dateOfBirth) : null;
    const ageDisplay = age !== null ? ` (${age} yrs)` : '';
    const lastVisit = p.lastVisitDate ? new Date(p.lastVisitDate).toLocaleDateString() : 'No visits';
    
    container.innerHTML += `
      <div class="col-md-4 mb-3">
        <div class="card h-100 shadow-sm patient-card" style="cursor: pointer;">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <h5 class="card-title mb-1">${escapeHtml(p.lastName)}, ${escapeHtml(p.firstName)}</h5>
              <span class="badge bg-${p.status === 'active' ? 'success' : 'secondary'}">${p.status || 'Active'}</span>
            </div>
            <div class="small text-muted mb-2">
              <div><i class="bi bi-calendar3"></i> DOB: ${p.dateOfBirth}${ageDisplay}</div>
              <div><i class="bi bi-person"></i> ${escapeHtml(p.gender)}</div>
              <div><i class="bi bi-clock-history"></i> Last Visit: ${lastVisit}</div>
            </div>
            ${p.allergies && p.allergies.length > 0 ? 
              `<div class="mt-2"><span class="badge bg-warning text-dark"><i class="bi bi-exclamation-triangle"></i> Allergies</span></div>` : ''}
            <div class="d-flex gap-2 mt-3">
              <button class="btn btn-sm btn-primary w-100" onclick="openPatientClinical(${p.id})">
                <i class="bi bi-folder-open"></i> Open Record
              </button>
              <button class="btn btn-sm btn-outline-secondary" onclick="editPatient(${p.id})" type="button">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="deletePatient(${p.id})" type="button">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });
}

function renderPatientListModal() {
  const listEl = document.getElementById('patient-list-items');
  const emptyEl = document.getElementById('patient-list-empty');
  if (!listEl || !emptyEl) return;

  listEl.innerHTML = '';

  if (!patientsCache || patientsCache.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }

  emptyEl.style.display = 'none';

  patientsCache.forEach((p) => {
    const age = p.dateOfBirth ? calculateAge(p.dateOfBirth) : null;
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center gap-3 patient-list-row';
    item.dataset.patientId = p.id;
    item.innerHTML = `
      <div class="text-start">
        <strong>${escapeHtml(p.lastName)}, ${escapeHtml(p.firstName)}</strong>
        <div class="small text-muted">DOB: ${p.dateOfBirth || '—'}${age !== null ? ` (${age} yrs)` : ''}</div>
      </div>
      <div class="btn-group btn-group-sm" role="group">
        <button type="button" class="btn btn-outline-primary" data-action="open" data-patient-id="${p.id}">
          <i class="bi bi-folder-open"></i>
        </button>
        <button type="button" class="btn btn-outline-secondary" data-action="edit" data-patient-id="${p.id}">
          <i class="bi bi-pencil"></i>
        </button>
        <button type="button" class="btn btn-outline-danger" data-action="delete" data-patient-id="${p.id}">
          <i class="bi bi-trash"></i>
        </button>
      </div>`;
    listEl.appendChild(item);
  });
}

function openPatientListModal() {
  renderPatientListModal();
  if (patientListModalInstance) {
    patientListModalInstance.show();
  }
}

function handlePatientListAction(event) {
  const actionBtn = event.target.closest('button[data-action]');
  if (actionBtn) {
    const patientId = Number(actionBtn.dataset.patientId);
    if (!Number.isFinite(patientId)) {
      return;
    }

    switch (actionBtn.dataset.action) {
      case 'open':
        if (patientListModalInstance) patientListModalInstance.hide();
        openPatientClinical(patientId);
        break;
      case 'edit':
        if (patientListModalInstance) patientListModalInstance.hide();
        editPatient(patientId);
        break;
      case 'delete':
        if (patientListModalInstance) patientListModalInstance.hide();
        deletePatient(patientId);
        break;
      default:
        break;
    }

    event.stopPropagation();
    return;
  }

  const row = event.target.closest('.patient-list-row');
  if (row) {
    const patientId = Number(row.dataset.patientId);
    if (Number.isFinite(patientId)) {
      if (patientListModalInstance) patientListModalInstance.hide();
      openPatientClinical(patientId);
    }
  }
}

function handlePatientCardClick(e) {
  // Event delegation handled by onclick in HTML
}

async function loadQueue() {
  try {
    const queue = await apiRequest('/queue');
    const container = document.getElementById('queue-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!queue || queue.length === 0) {
      container.innerHTML = '<div class="text-muted text-center py-3">No upcoming appointments</div>';
      return;
    }
    
    queue.forEach(item => {
      const appointmentTime = new Date(item.scheduledAt).toLocaleString();
      container.innerHTML += `
        <div class="list-group-item">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <strong>${escapeHtml(item.patientName)}</strong>
              <div class="small text-muted">${appointmentTime}</div>
              <div class="small">${escapeHtml(item.reason || 'General checkup')}</div>
            </div>
            <button class="btn btn-sm btn-primary" onclick="openPatientClinical(${item.patientId})">
              <i class="bi bi-box-arrow-in-right"></i> See Patient
            </button>
          </div>
        </div>
      `;
    });
  } catch (err) {
    console.error('Queue load error:', err);
  }
}

function handleQueueClick(e) {
  // Event delegation handled by onclick in HTML
}

// --- PATIENT MODAL FORM ---

function openPatientModal() {
  clearPatientForm();
  document.getElementById('patient-modal-title').textContent = 'Register New Patient';
  document.getElementById('patient-submit-label').textContent = 'Save Patient';
  patientModalInstance.show();
}

function editPatient(id) {
  const patient = patientsCache.find((p) => p.id === id);
  if (!patient) return;

  document.getElementById('patient-modal-title').textContent = 'Edit Patient';
  document.getElementById('patient-submit-label').textContent = 'Update Patient';
  
  document.getElementById('patient-id').value = patient.id;
  document.getElementById('patient-firstname').value = patient.firstName;
  document.getElementById('patient-lastname').value = patient.lastName;
  document.getElementById('patient-dob').value = patient.dateOfBirth;
  document.getElementById('patient-gender').value = patient.gender;
  document.getElementById('patient-bloodtype').value = patient.bloodType || '';
  document.getElementById('patient-email').value = patient.email || '';
  document.getElementById('patient-phone').value = patient.phone || '';
  document.getElementById('patient-height').value = patient.heightCm || '';
  document.getElementById('patient-weight').value = patient.weightKg || '';
  document.getElementById('patient-address').value = patient.address || '';
  document.getElementById('patient-emergency').value = patient.emergencyContact || '';
  document.getElementById('patient-insurance').value = patient.insurance || '';
  document.getElementById('patient-allergies').value = Array.isArray(patient.allergies) ? patient.allergies.join(', ') : '';
  document.getElementById('patient-conditions').value = Array.isArray(patient.chronicConditions) ? patient.chronicConditions.join(', ') : '';
  document.getElementById('patient-medications').value = Array.isArray(patient.medications) ? patient.medications.join(', ') : '';
  
  patientModalInstance.show();
}

async function deletePatient(id) {
  const patient = patientsCache.find(p => p.id === id);
  if (!patient) {
    return;
  }

  const confirmed = window.confirm(`Delete record for ${patient.firstName} ${patient.lastName}? This action cannot be undone.`);
  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/patients/${id}`, { method: 'DELETE' });
    await loadDashboard();
    alert('Patient record deleted.');
  } catch (err) {
    alert(`Failed to delete patient: ${err.message}`);
  }
}

function clearPatientForm() {
  document.getElementById('patient-form').reset();
  document.getElementById('patient-id').value = '';
  const errorDiv = document.getElementById('patient-error');
  if (errorDiv) errorDiv.style.display = 'none';
}

async function handlePatientSubmit(e) {
  e.preventDefault();
  hideInlineAlerts();
  
  try {
    const patientId = document.getElementById('patient-id').value;
    const isEdit = !!patientId;
    
    const data = {
      firstName: document.getElementById('patient-firstname').value.trim(),
      lastName: document.getElementById('patient-lastname').value.trim(),
      dateOfBirth: document.getElementById('patient-dob').value,
      gender: document.getElementById('patient-gender').value,
      bloodType: document.getElementById('patient-bloodtype').value.trim() || null,
      email: document.getElementById('patient-email').value.trim() || null,
      phone: document.getElementById('patient-phone').value.trim() || null,
      heightCm: parseFloat(document.getElementById('patient-height').value) || null,
      weightKg: parseFloat(document.getElementById('patient-weight').value) || null,
      address: document.getElementById('patient-address').value.trim() || null,
      emergencyContact: document.getElementById('patient-emergency').value.trim() || null,
      insurance: document.getElementById('patient-insurance').value.trim() || null,
      allergies: document.getElementById('patient-allergies').value,
      chronicConditions: document.getElementById('patient-conditions').value,
      medications: document.getElementById('patient-medications').value
    };
    
    if (isEdit) {
      await apiRequest(`/patients/${patientId}`, { method: 'PUT', body: data });
    } else {
      await apiRequest('/patients', { method: 'POST', body: data });
    }
    
    if (patientModalInstance) {
      patientModalInstance.hide();
    }
    await loadDashboard();
    return false;
  } catch (err) {
    showErrorAlert('patient-error', err.message);
    return false;
  }
}

// --- CLINICAL VIEW ---

async function openPatientClinical(id) {
  try {
    const data = await apiRequest(`/patients/${id}`);
    currentPatient = data.patient;
    currentPatientId = id; // Set current patient ID for reason for visit tab
    currentPatient.visits = data.visits || [];
    currentPatient.prescriptions = data.prescriptions || [];
    currentPatient.labOrders = data.labOrders || [];
    currentPatient.radiologyOrders = data.radiologyOrders || [];
    currentPatient.appointments = data.appointments || [];
    summaryVisitsCache.set(currentPatient.id, currentPatient.visits.slice());
    
    // Reset visit form
    const activeVisit = currentPatient.visits.find(v => (v.status || '').toLowerCase() !== 'completed');
    currentVisitId = activeVisit ? activeVisit.id : (currentPatient.visits.length ? currentPatient.visits[0].id : null);
    clearVisitForm();
    
    // Render all sections
    renderClinicalHeader();
    renderVisitHistory();
    renderMedicationList();
    renderLabOrders();
    renderRadiologyOrders();
    renderAppointments();
    
    // Load previous visits summary for reason for visit tab
    loadPreviousVisitsSummary();
    
    // Fetch AI summary for this patient
    try {
      console.log(`🤖 Fetching AI summary for patient ${id}...`);
      
      // Show loading state in AI tab
      const loadingElement = document.getElementById('ai-loading');
      if (loadingElement) {
        loadingElement.style.display = 'block';
      }
      
      // Hide loading state
      if (loadingElement) {
        loadingElement.style.display = 'none';
      }
    } catch (error) {
      console.error('❌ Error fetching AI summary:', error);
      // Hide loading state even on error
      const loadingElement = document.getElementById('ai-loading');
      if (loadingElement) {
        loadingElement.style.display = 'none';
      }
    }
    
    switchClinicalTab('profile');
    toggleInvestigation('laboratory');
    triggerGDTExport({
      id: currentPatient.id,
      firstName: currentPatient.firstName,
      lastName: currentPatient.lastName,
      dob: currentPatient.dateOfBirth,
      diagnoses: (currentPatient.visits || [])
        .map((visit) => visit.diagnosis)
        .filter((dx) => !!dx)
        .slice(0, 5)
    });
    showPage('clinical-view');
  } catch (err) {
    alert('Failed to open patient: ' + err.message);
  }
}

function renderClinicalHeader() {
  const age = currentPatient.dateOfBirth ? calculateAge(currentPatient.dateOfBirth) : null;
  setText('clinical-patient-name', `${currentPatient.lastName}, ${currentPatient.firstName}`);
  setText('clinical-patient-age', age !== null ? `${age} yrs` : '—');
  setText('clinical-patient-gender', currentPatient.gender);
  
  // Profile Tab
  setText('profile-name', `${currentPatient.firstName} ${currentPatient.lastName}`);
  setText('profile-age', age !== null ? `${age}` : null);
  setText('profile-gender', currentPatient.gender);
  setText('profile-dob', currentPatient.dateOfBirth);
  setText('profile-blood', currentPatient.bloodType);
  setText('profile-height', currentPatient.heightCm ? `${currentPatient.heightCm} cm` : null);
  setText('profile-weight', currentPatient.weightKg ? `${currentPatient.weightKg} kg` : null);
  setText('profile-allergies', listToString(currentPatient.allergies));
  setText('profile-conditions', listToString(currentPatient.chronicConditions));
  setText('profile-current-meds', listToString(currentPatient.medications));
  setText('profile-insurance', currentPatient.insurance);
  setText('profile-emergency', currentPatient.emergencyContact);

  const orderedVisits = (currentPatient.visits || []).slice().sort((a, b) => {
    const dateA = parseDateValue(a.visitDate) || 0;
    const dateB = parseDateValue(b.visitDate) || 0;
    return dateB - dateA;
  });
  const mostRecentVisit = orderedVisits[0];
  setText('profile-last-visit-date', mostRecentVisit ? formatDateTime(mostRecentVisit.visitDate) : null);
  setText('profile-last-visit-complaint', mostRecentVisit?.chiefComplaint || null);
  setText('profile-last-visit-diagnosis', mostRecentVisit?.diagnosis || null);

  const upcomingAppointment = (currentPatient.appointments || [])
    .map((apt) => ({ ...apt, parsed: parseDateValue(apt.scheduledAt) }))
    .filter((apt) => apt.parsed && apt.parsed >= new Date())
    .sort((a, b) => a.parsed - b.parsed)[0];

  if (upcomingAppointment) {
    const formatted = formatDateTime(upcomingAppointment.scheduledAt);
    const reason = upcomingAppointment.reason ? ` • ${upcomingAppointment.reason}` : '';
    setText('profile-next-appointment', `${formatted}${reason}`.trim());
  } else {
    setText('profile-next-appointment', null);
  }
}

function renderVisitHistory() {
  const container = document.getElementById('history-summary');
  if (!container) return;

  if (!currentPatient?.visits || currentPatient.visits.length === 0) {
    container.innerHTML = '<div class="text-muted text-center py-3">No visit history</div>';
    container.onclick = null;
    return;
  }

  const visits = currentPatient.visits.slice().sort((a, b) => {
    const dateA = parseDateValue(a.visitDate) || 0;
    const dateB = parseDateValue(b.visitDate) || 0;
    return dateB - dateA;
  });

  const recentVisitId = visits[0]?.id ?? null;

  container.innerHTML = visits.map((visit) => {
    const visitDate = formatDateTime(visit.visitDate) || 'Date not recorded';
    const status = (visit.status || 'in-progress').toLowerCase();
    const statusBadge = status === 'completed' ? 'success' : status === 'cancelled' ? 'danger' : 'warning';
    const vitals = Array.isArray(visit.vitals) ? visit.vitals : visit.vitals || {};
    const vitalsSummary = ['bloodPressure', 'pulse', 'temperature', 'respiratory', 'oxygenSaturation', 'weight']
      .map((key) => {
        if (!vitals || !vitals[key]) return null;
        const label = {
          bloodPressure: 'BP',
          pulse: 'Pulse',
          temperature: 'Temp',
          respiratory: 'Resp',
          oxygenSaturation: 'O₂',
          weight: 'Wt'
        }[key] || key;
        return `${label}: ${escapeHtml(String(vitals[key]))}`;
      })
      .filter(Boolean)
      .join(' · ');

    return `
      <div class="history-entry${visit.id === recentVisitId ? ' recent' : ''}" data-visit-id="${visit.id}">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <div class="d-flex align-items-center gap-2 mb-1">
              <strong><i class="bi bi-calendar-event"></i> ${visitDate}</strong>
              <span class="badge bg-${statusBadge}">${escapeHtml(visit.status || 'In Progress')}</span>
              ${visit.doctorSummary ? '<span class="badge badge-summary"><i class="bi bi-journal-text"></i> Summary</span>' : ''}
            </div>
            ${visit.chiefComplaint ? `<div class="small"><strong>Chief Complaint:</strong> ${escapeHtml(visit.chiefComplaint)}</div>` : ''}
            ${visit.diagnosis ? `<div class="small"><strong>Diagnosis:</strong> ${escapeHtml(visit.diagnosis)}</div>` : ''}
            ${visit.treatmentPlan ? `<div class="small"><strong>Plan:</strong> ${escapeHtml(visit.treatmentPlan)}</div>` : ''}
            ${vitalsSummary ? `<div class="small text-muted mt-1">${vitalsSummary}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.onclick = (event) => {
    const entry = event.target.closest('.history-entry');
    if (!entry) return;
    const visitId = Number(entry.dataset.visitId);
    if (!Number.isFinite(visitId)) return;

    container.querySelectorAll('.history-entry').forEach((el) => el.classList.remove('selected'));
    entry.classList.add('selected');
    viewFullHistory(visitId);
  };
}

function humanizeLabel(label) {
  if (!label) return '';
  return String(label)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function formatClinicalDetails(data) {
  if (data === null || typeof data === 'undefined') return '';

  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return `<span class="small">${escapeHtml(String(data))}</span>`;
  }

  if (Array.isArray(data)) {
    const items = data
      .map((item) => formatClinicalDetails(item))
      .filter(Boolean);
    if (!items.length) return '';
    return `<ul class="small mb-1 ms-3">${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data)
      .filter(([, value]) => value !== null && typeof value !== 'undefined' && value !== '');
    if (!entries.length) return '';
    return `<ul class="small mb-1 ms-3">${entries.map(([key, value]) => {
      const label = humanizeLabel(key);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const inner = formatClinicalDetails(value);
        return inner ? `<li><strong>${escapeHtml(label)}:</strong> ${inner}</li>` : '';
      }
      const formattedValue = Array.isArray(value)
        ? escapeHtml(value.filter(Boolean).join(', '))
        : escapeHtml(String(value));
      return `<li><strong>${escapeHtml(label)}:</strong> ${formattedValue}</li>`;
    }).filter(Boolean).join('')}</ul>`;
  }

  return '';
}

function formatSummaryHtml(text) {
  if (!text) return '';
  return escapeHtml(String(text)).replace(/\r?\n/g, '<br>');
}

function renderFullHistory(focusVisitId) {
  const wrapper = document.getElementById('full-history-content');
  if (!wrapper) return;

  if (!currentPatient?.visits || currentPatient.visits.length === 0) {
    wrapper.innerHTML = '<div class="text-muted">No history available.</div>';
    return;
  }

  const visits = currentPatient.visits.slice().sort((a, b) => {
    const dateA = parseDateValue(a.visitDate) || 0;
    const dateB = parseDateValue(b.visitDate) || 0;
    return dateB - dateA;
  });

  wrapper.innerHTML = visits.map((visit) => {
    const visitDate = formatDateTime(visit.visitDate) || 'Date not recorded';
    const status = visit.status || 'completed';
    const vitals = Array.isArray(visit.vitals) ? visit.vitals : visit.vitals || {};
    const summaryHtml = formatSummaryHtml(visit.doctorSummary);

    const labs = (currentPatient.labOrders || []).filter((order) => order.visitId === visit.id);
    const radiology = (currentPatient.radiologyOrders || []).filter((order) => order.visitId === visit.id);
    const prescriptions = (currentPatient.prescriptions || []).filter((rx) => rx.visitId === visit.id);
    const appointments = (currentPatient.appointments || []).filter((apt) => apt.visitId === visit.id);

    const reviewDetails = formatClinicalDetails(visit.reviewOfSystems);
    const examDetails = formatClinicalDetails(visit.physicalExam);
    const vitalsDetails = formatClinicalDetails(vitals);

    const renderList = (items, emptyText, formatter) => {
      if (!items.length) return `<div class="text-muted small">${emptyText}</div>`;
      return `<ul class="small mb-0 ps-3">${items.map(formatter).join('')}</ul>`;
    };

    return `
      <div class="full-history-visit" data-visit-id="${visit.id}">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h5 class="mb-1">${escapeHtml(visitDate)}</h5>
            <span class="badge bg-secondary">${escapeHtml(status)}</span>
          </div>
        </div>
        ${summaryHtml ? `<div class="visit-summary-box"><strong>Visit Summary</strong><p>${summaryHtml}</p></div>` : ''}
        ${visit.chiefComplaint ? `<p class="mb-1"><strong>Chief Complaint:</strong> ${escapeHtml(visit.chiefComplaint)}</p>` : ''}
        ${visit.hpi ? `<p class="mb-1"><strong>History of Present Illness:</strong> ${escapeHtml(visit.hpi)}</p>` : ''}
        ${reviewDetails ? `<div class="mb-1"><strong>Review of Systems:</strong> ${reviewDetails}</div>` : ''}
        ${examDetails ? `<div class="mb-1"><strong>Physical Exam:</strong> ${examDetails}</div>` : ''}
        ${visit.diagnosis ? `<p class="mb-1"><strong>Diagnosis:</strong> ${escapeHtml(visit.diagnosis)}</p>` : ''}
        ${visit.treatmentPlan ? `<p class="mb-1"><strong>Plan:</strong> ${escapeHtml(visit.treatmentPlan)}</p>` : ''}
        ${vitalsDetails ? `<div class="mb-1"><strong>Vitals:</strong> ${vitalsDetails}</div>` : ''}
        <div class="mt-3">
          <h6>Lab Orders</h6>
          ${renderList(labs, 'No lab orders for this visit.', (order) => `
            <li>
              <strong>${escapeHtml(order.testName)}</strong>
              ${order.result ? ` - Result: ${escapeHtml(order.result)}` : ''}
              ${order.status ? ` <span class="badge bg-light text-dark">${escapeHtml(order.status)}</span>` : ''}
              ${order.resultDate ? `<div class="text-muted">Reported: ${escapeHtml(formatDateTime(order.resultDate))}</div>` : ''}
            </li>
          `)}
        </div>
        <div class="mt-3">
          <h6>Radiology Orders</h6>
          ${renderList(radiology, 'No imaging ordered for this visit.', (order) => `
            <li>
              <strong>${escapeHtml(order.testName)}</strong>
              ${order.status ? ` <span class="badge bg-light text-dark">${escapeHtml(order.status)}</span>` : ''}
              ${order.notes ? `<div class="text-muted">${escapeHtml(order.notes)}</div>` : ''}
            </li>
          `)}
        </div>
        <div class="mt-3">
          <h6>Prescriptions</h6>
          ${renderList(prescriptions, 'No prescriptions recorded for this visit.', (rx) => `
            <li>
              <strong>${escapeHtml(rx.medicationName)}</strong>
              ${rx.dosage ? ` - ${escapeHtml(rx.dosage)}` : ''}
              ${rx.frequency ? ` (${escapeHtml(rx.frequency)})` : ''}
              ${rx.duration ? ` <span class="text-muted">${escapeHtml(rx.duration)}</span>` : ''}
              ${rx.instructions ? `<div class="text-muted">${escapeHtml(rx.instructions)}</div>` : ''}
            </li>
          `)}
        </div>
        <div class="mt-3">
          <h6>Appointments</h6>
          ${renderList(appointments, 'No follow-up appointments linked to this visit.', (apt) => `
            <li>
              <strong>${escapeHtml(formatDateTime(apt.scheduledAt))}</strong>
              ${apt.reason ? ` - ${escapeHtml(apt.reason)}` : ''}
              ${apt.status ? ` <span class="badge bg-info text-dark">${escapeHtml(apt.status)}</span>` : ''}
              ${apt.notes ? `<div class="text-muted">${escapeHtml(apt.notes)}</div>` : ''}
            </li>
          `)}
        </div>
      </div>
    `;
  }).join('');

  if (focusVisitId) {
    wrapper.querySelectorAll('.full-history-visit').forEach((node) => node.classList.remove('focused'));
    const focusEl = wrapper.querySelector(`[data-visit-id="${focusVisitId}"]`);
    if (focusEl) {
      focusEl.classList.add('focused');
      focusEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

// --- VISIT SUMMARY MANAGEMENT ---

function invalidateSummaryCache(patientId) {
  if (patientId === null || typeof patientId === 'undefined') return;
  summaryVisitsCache.delete(Number(patientId));
}

async function ensurePatientsList() {
  if (!patientsCache || patientsCache.length === 0) {
    patientsCache = await apiRequest('/patients');
    summaryNeedsPatientRefresh = true;
  }
  return patientsCache;
}

async function prepareSummaryPage(force = false) {
  const patientSelect = document.getElementById('summary-patient-select');
  const visitSelect = document.getElementById('summary-visit-select');
  const emptyState = document.getElementById('summary-empty');
  if (!patientSelect || !visitSelect) return;

  const patients = await ensurePatientsList();

  if (!patients.length) {
    if (emptyState) emptyState.style.display = 'block';
    patientSelect.innerHTML = '<option value="">No patients available</option>';
    patientSelect.disabled = true;
    populateSummaryVisitOptions(null);
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  patientSelect.disabled = false;

  if (force || summaryNeedsPatientRefresh || patientSelect.options.length !== patients.length) {
    patientSelect.innerHTML = '';
    patients
      .slice()
      .sort((a, b) => a.lastName.localeCompare(b.lastName))
      .forEach((p) => {
        const option = document.createElement('option');
        option.value = String(p.id);
        option.textContent = `${p.lastName}, ${p.firstName}`;
        patientSelect.appendChild(option);
      });
    summaryNeedsPatientRefresh = false;
  }

  if (!summaryState.patientId || !patients.some((p) => p.id === summaryState.patientId)) {
    summaryState.patientId = patients[0].id;
  }

  patientSelect.value = String(summaryState.patientId);

  await loadSummaryVisits(summaryState.patientId, force);
  const hasVisits = populateSummaryVisitOptions(summaryState.patientId);
  if (hasVisits) {
    renderSummaryVisitDetails(summaryState.patientId, summaryState.visitId);
  }
}

async function loadSummaryVisits(patientId, force = false) {
  if (!patientId) return [];
  const key = Number(patientId);
  if (force || !summaryVisitsCache.has(key)) {
    const visits = await apiRequest(`/patients/${key}/visits`);
    summaryVisitsCache.set(key, visits);
  }
  return summaryVisitsCache.get(key) || [];
}

function getSummaryVisits(patientId) {
  return summaryVisitsCache.get(Number(patientId)) || [];
}

function getSummaryVisit(patientId, visitId) {
  return getSummaryVisits(patientId).find((visit) => visit.id === Number(visitId)) || null;
}

function populateSummaryVisitOptions(patientId) {
  const visitSelect = document.getElementById('summary-visit-select');
  const textArea = document.getElementById('summary-text');
  const saveButton = document.getElementById('summary-save-button');
  const resetButton = document.getElementById('summary-reset-button');
  if (!visitSelect) return false;

  visitSelect.innerHTML = '';

  if (!patientId) {
    visitSelect.disabled = true;
    if (textArea) {
      textArea.value = '';
      textArea.disabled = true;
      textArea.dataset.savedValue = '';
      textArea.dataset.templateValue = '';
    }
    if (saveButton) saveButton.disabled = true;
    if (resetButton) resetButton.disabled = true;
    setSummaryMeta(null);
    updateSummaryPreview(null);
    setSummaryStatus('No patients available.', 'info');
    summaryState.visitId = null;
    return false;
  }

  const visits = getSummaryVisits(patientId);
  if (!visits.length) {
    visitSelect.disabled = true;
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No visits available';
    visitSelect.appendChild(option);

    if (textArea) {
      textArea.value = '';
      textArea.disabled = true;
      textArea.dataset.savedValue = '';
      textArea.dataset.templateValue = '';
    }
    if (saveButton) saveButton.disabled = true;
    if (resetButton) resetButton.disabled = true;

    setSummaryMeta(null);
    updateSummaryPreview(null);
    setSummaryStatus('No visits recorded for this patient yet.', 'info');
    summaryState.visitId = null;
    return false;
  }

  visits.forEach((visit) => {
    const option = document.createElement('option');
    option.value = String(visit.id);
    const labelParts = [];
    const labelDate = formatDateTime(visit.visitDate);
    if (labelDate) labelParts.push(labelDate);
    if (visit.diagnosis) labelParts.push(`— ${visit.diagnosis}`);
    option.textContent = labelParts.join(' ') || `Visit ${visit.id}`;
    visitSelect.appendChild(option);
  });

  visitSelect.disabled = false;

  if (!summaryState.visitId || !visits.some((v) => v.id === summaryState.visitId)) {
    summaryState.visitId = visits[0].id;
  }

  visitSelect.value = String(summaryState.visitId);
  return true;
}

function setSummaryMeta(visit) {
  const dateField = document.getElementById('summary-visit-date');
  const statusField = document.getElementById('summary-visit-status');
  const diagnosisField = document.getElementById('summary-visit-diagnosis');
  const planField = document.getElementById('summary-visit-plan');

  const safeSet = (el, value) => {
    if (!el) return;
    el.textContent = value ?? '—';
  };

  if (!visit) {
    safeSet(dateField, '—');
    safeSet(statusField, '—');
    safeSet(diagnosisField, '—');
    safeSet(planField, '—');
    return;
  }

  safeSet(dateField, formatDateTime(visit.visitDate) || '—');
  safeSet(statusField, visit.status ? visit.status.replace(/-/g, ' ') : '—');
  safeSet(diagnosisField, visit.diagnosis || '—');
  safeSet(planField, visit.treatmentPlan || '—');
}

function renderSummaryVisitDetails(patientId, visitId) {
  const visit = getSummaryVisit(patientId, visitId);
  const textArea = document.getElementById('summary-text');
  const saveButton = document.getElementById('summary-save-button');
  const resetButton = document.getElementById('summary-reset-button');

  if (!visit) {
    setSummaryMeta(null);
    updateSummaryPreview(null);
    if (textArea) {
      textArea.value = '';
      textArea.disabled = true;
      textArea.dataset.savedValue = '';
      textArea.dataset.templateValue = '';
    }
    if (saveButton) saveButton.disabled = true;
    if (resetButton) resetButton.disabled = true;
    setSummaryStatus('Select a visit to begin documenting the summary.', 'info');
    return;
  }

  summaryState.patientId = patientId;
  summaryState.visitId = visitId;

  setSummaryMeta(visit);

  const templateValue = buildSummaryTemplate(visit);
  const savedValue = visit.doctorSummary || '';

  if (textArea) {
    textArea.disabled = false;
    textArea.dataset.templateValue = templateValue;
    textArea.dataset.savedValue = savedValue;
    textArea.value = savedValue || templateValue;
  }

  if (saveButton) saveButton.disabled = false;
  if (resetButton) resetButton.disabled = false;

  updateSummaryPreview(visit);
  setSummaryStatus('', 'info');
}

function updateSummaryPreview(visit) {
  const preview = document.getElementById('summary-preview');
  const lastUpdated = document.getElementById('summary-last-updated');
  if (!preview) return;

  if (!visit || !visit.doctorSummary) {
    preview.textContent = 'No saved summary yet. Use the editor to record the key points from this visit.';
    preview.classList.add('empty');
    if (lastUpdated) lastUpdated.textContent = '';
    return;
  }

  preview.innerHTML = formatSummaryHtml(visit.doctorSummary);
  preview.classList.remove('empty');
  if (lastUpdated) {
    lastUpdated.textContent = visit.updatedAt ? `Updated ${formatDateTime(visit.updatedAt)}` : 'Updated just now';
  }
}

function setSummaryStatus(message, variant = 'info') {
  const statusEl = document.getElementById('summary-status');
  if (!statusEl) return;
  if (!message) {
    statusEl.textContent = '';
    statusEl.style.display = 'none';
    statusEl.className = 'small mt-2 text-muted';
    return;
  }
  const variantClass = variant === 'success'
    ? 'text-success'
    : variant === 'error'
      ? 'text-danger'
      : variant === 'warning'
        ? 'text-warning'
        : 'text-muted';
  statusEl.className = `small mt-2 ${variantClass}`;
  statusEl.textContent = message;
  statusEl.style.display = 'block';
}

function buildSummaryTemplate(visit) {
  const diagnosis = visit.diagnosis || 'Diagnosis pending';
  const plan = visit.treatmentPlan || 'Plan pending';
  const statusText = visit.status ? `Visit marked ${visit.status}.` : 'Document visit status here.';
  let followUp = 'Follow-up: Not scheduled.';
  if (visit.nextAppointmentDate) {
    const nextDate = formatDateTime(visit.nextAppointmentDate);
    const reason = visit.nextAppointmentReason ? ` - ${visit.nextAppointmentReason}` : '';
    followUp = `Follow-up: ${nextDate || visit.nextAppointmentDate}${reason}.`;
  }
  return `Diagnosis: ${diagnosis}\nPlan: ${plan}\nProgress: ${statusText} ${followUp}`.trim();
}

async function handleSummaryPatientChange(event) {
  const patientId = Number(event.target.value);
  if (!Number.isFinite(patientId)) {
    populateSummaryVisitOptions(null);
    return;
  }
  summaryState.patientId = patientId;
  summaryState.visitId = null;
  await loadSummaryVisits(patientId, true);
  const hasVisits = populateSummaryVisitOptions(patientId);
  if (hasVisits) {
    renderSummaryVisitDetails(patientId, summaryState.visitId);
  }
}

function handleSummaryVisitChange(event) {
  const visitId = Number(event.target.value);
  if (!Number.isFinite(visitId)) return;
  summaryState.visitId = visitId;
  renderSummaryVisitDetails(summaryState.patientId, visitId);
}

function resetSummaryEditor() {
  const textArea = document.getElementById('summary-text');
  if (!textArea) return;
  const visit = getSummaryVisit(summaryState.patientId, summaryState.visitId);
  if (!visit) return;
  const savedValue = textArea.dataset.savedValue || '';
  const templateValue = textArea.dataset.templateValue || buildSummaryTemplate(visit);
  textArea.value = savedValue || templateValue;
  setSummaryStatus(savedValue ? 'Reverted to last saved summary.' : 'Restored suggested template.', 'info');
}

async function saveVisitSummary(event) {
  if (event) {
    event.preventDefault();
  }

  const patientId = summaryState.patientId;
  const visitId = summaryState.visitId;
  const textArea = document.getElementById('summary-text');
  const saveButton = document.getElementById('summary-save-button');

  if (!patientId || !visitId || !textArea) {
    setSummaryStatus('Select a visit before saving.', 'error');
    return;
  }

  const summaryText = textArea.value.trim();
  if (!summaryText) {
    setSummaryStatus('Summary cannot be empty.', 'error');
    return;
  }

  if (saveButton) {
    saveButton.disabled = true;
    saveButton.dataset.originalText = saveButton.textContent;
    saveButton.textContent = 'Saving...';
  }
  setSummaryStatus('Saving summary...', 'info');

  try {
    const updatedVisit = await apiRequest(`/visits/${visitId}`, {
      method: 'PUT',
      body: { doctorSummary: summaryText }
    });

    const visits = getSummaryVisits(patientId);
    const matchIndex = visits.findIndex((v) => v.id === updatedVisit.id);
    if (matchIndex !== -1) {
      visits[matchIndex] = updatedVisit;
      summaryVisitsCache.set(patientId, visits);
    }

    const templateValue = buildSummaryTemplate(updatedVisit);
    textArea.dataset.savedValue = updatedVisit.doctorSummary || '';
    textArea.dataset.templateValue = templateValue;
    textArea.value = updatedVisit.doctorSummary || templateValue;

    if (currentPatient && currentPatient.id === patientId) {
      const currentVisit = currentPatient.visits?.find((v) => v.id === updatedVisit.id);
      if (currentVisit) {
        currentVisit.doctorSummary = updatedVisit.doctorSummary;
        currentVisit.updatedAt = updatedVisit.updatedAt;
      }
      renderVisitHistory();
      renderFullHistory(updatedVisit.id);
    }

    updateSummaryPreview(updatedVisit);
    setSummaryMeta(updatedVisit);
    setSummaryStatus('Summary saved successfully.', 'success');
  } catch (err) {
    setSummaryStatus(err.message || 'Failed to save summary.', 'error');
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      if (saveButton.dataset.originalText) {
        saveButton.textContent = saveButton.dataset.originalText;
        delete saveButton.dataset.originalText;
      }
    }
  }
}

function viewFullHistory(focusVisitId) {
  renderFullHistory(focusVisitId);
  const section = document.getElementById('full-history-section');
  if (section) section.style.display = 'block';
}

function closeFullHistory() {
  const section = document.getElementById('full-history-section');
  if (section) section.style.display = 'none';
}

function renderMedicationList() {
  const container = document.getElementById('medication-list');
  if (!container) return;
  
  if (!currentPatient.prescriptions || currentPatient.prescriptions.length === 0) {
    container.innerHTML = '<div class="text-muted text-center py-3">No prescriptions on record</div>';
    return;
  }
  
  container.innerHTML = currentPatient.prescriptions.map(rx => `
    <div class="alert alert-light border mb-2 p-3">
      <div class="d-flex justify-content-between">
        <strong><i class="bi bi-capsule"></i> ${escapeHtml(rx.medicationName)}</strong>
        <small class="text-muted">${new Date(rx.createdAt).toLocaleDateString()}</small>
      </div>
      <div class="small mt-1">
        ${rx.dosage ? `<div><strong>Dosage:</strong> ${escapeHtml(rx.dosage)}</div>` : ''}
        ${rx.frequency ? `<div><strong>Frequency:</strong> ${escapeHtml(rx.frequency)}</div>` : ''}
        ${rx.duration ? `<div><strong>Duration:</strong> ${escapeHtml(rx.duration)}</div>` : ''}
        ${rx.instructions ? `<div><strong>Instructions:</strong> ${escapeHtml(rx.instructions)}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function renderLabOrders() {
  const container = document.getElementById('lab-orders-list');
  if (!container) return;
  
  if (!currentPatient.labOrders || currentPatient.labOrders.length === 0) {
    container.innerHTML = '<div class="text-muted small">No lab orders</div>';
    return;
  }
  
  container.innerHTML = currentPatient.labOrders.map(order => {
    const { badgeClass, label: statusLabel } = getLabStatusMeta(order.status);
    const orderedDate = order.orderedAt ? formatDateTime(order.orderedAt) : 'Date not recorded';
    const resultSummary = order.result ? `<div class="small mt-2"><strong>Summary:</strong> ${escapeHtml(order.result)}</div>` : '';
    const detailsTable = renderLabResultDetailsTable(order.resultDetails);
    const verifiedInfo = order.verifiedByName
      ? `<div class="small text-muted mt-2">Verified by ${escapeHtml(order.verifiedByName)}${order.verifiedAt ? ` • ${formatDateTime(order.verifiedAt)}` : ''}</div>`
      : '';
    const notesBlock = order.notes ? `<div class="small text-muted mt-1"><strong>Notes:</strong> ${escapeHtml(order.notes)}</div>` : '';
    return `
      <div class="border-bottom py-3">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <strong class="small">${escapeHtml(order.testName)}</strong>
            <div class="small text-muted">Ordered ${orderedDate}</div>
          </div>
          <span class="${badgeClass}">${escapeHtml(statusLabel)}</span>
        </div>
        ${notesBlock}
        ${resultSummary}
        ${detailsTable}
        ${verifiedInfo}
      </div>
    `;
  }).join('');
}

function renderLabResultDetailsTable(details) {
  if (!Array.isArray(details) || details.length === 0) {
    return '';
  }

  const rows = details.map((detail, index) => {
    const safeDetail = detail || {};
    const label = safeDetail.label || safeDetail.name || safeDetail.key || `Result ${index + 1}`;
    const value = safeDetail.value !== undefined && safeDetail.value !== null ? String(safeDetail.value) : '';
    const unit = safeDetail.unit || '';
    const reference = safeDetail.referenceRange || safeDetail.reference || '';
    const flag = (safeDetail.flag || '').toUpperCase();
    let flagLabel = '';
    if (flag === 'H') flagLabel = 'High';
    else if (flag === 'L') flagLabel = 'Low';
    else if (flag === 'A') flagLabel = 'Abnormal';
    else if (flag === 'N') flagLabel = 'Normal';

    return `
      <tr>
        <td>${escapeHtml(label)}</td>
        <td>${escapeHtml(value)}</td>
        <td>${escapeHtml(unit)}</td>
        <td>${escapeHtml(reference)}</td>
        <td>${escapeHtml(flagLabel)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="table-responsive mt-2">
      <table class="table table-sm table-bordered align-middle mb-0 lab-result-table">
        <thead class="table-light">
          <tr>
            <th scope="col">Analyte</th>
            <th scope="col">Value</th>
            <th scope="col">Unit</th>
            <th scope="col">Reference</th>
            <th scope="col">Flag</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function describeLabStatus(status) {
  const normalized = (status || 'ordered').toString().toLowerCase();
  const spaced = normalized.replace(/-/g, ' ');
  return spaced.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function getLabStatusMeta(status) {
  const normalized = (status || 'ordered').toString().toLowerCase();
  let badgeClass = 'badge bg-secondary';
  switch (normalized) {
    case 'completed':
      badgeClass = 'badge bg-success';
      break;
    case 'pending':
      badgeClass = 'badge bg-warning text-dark';
      break;
    case 'in-progress':
      badgeClass = 'badge bg-info text-dark';
      break;
    case 'ordered':
      badgeClass = 'badge bg-primary';
      break;
    case 'cancelled':
      badgeClass = 'badge bg-danger';
      break;
    default:
      badgeClass = 'badge bg-secondary';
  }
  return { badgeClass, label: describeLabStatus(normalized) };
}

function renderRadiologyOrders() {
  const container = document.getElementById('radiology-orders-list');
  if (!container) return;
  
  if (!currentPatient.radiologyOrders || currentPatient.radiologyOrders.length === 0) {
    container.innerHTML = '<div class="text-muted small">No radiology orders</div>';
    return;
  }
  
  container.innerHTML = currentPatient.radiologyOrders.map(order => {
    const statusClass = order.status === 'completed' ? 'success' : order.status === 'ordered' ? 'info' : 'warning';
    return `
      <div class="border-bottom py-2">
        <div class="d-flex justify-content-between">
          <strong class="small">${escapeHtml(order.testName)}</strong>
          <span class="badge bg-${statusClass}">${order.status}</span>
        </div>
        <div class="small text-muted">${new Date(order.orderedAt).toLocaleDateString()}</div>
        ${order.result ? `<div class="small mt-1"><strong>Result:</strong> ${escapeHtml(order.result)}</div>` : ''}
      </div>
    `;
  }).join('');
}

function renderAppointments() {
  const container = document.getElementById('appointments-list');
  if (!container) return;
  
  const upcomingAppointments = (currentPatient.appointments || [])
    .filter(apt => new Date(apt.scheduledAt) >= new Date() && apt.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  
  if (upcomingAppointments.length === 0) {
    container.innerHTML = '<div class="text-muted small">No upcoming appointments</div>';
    return;
  }
  
  container.innerHTML = upcomingAppointments.map(apt => `
    <div class="list-group-item list-group-item-action">
      <div class="d-flex justify-content-between">
        <strong class="small">${new Date(apt.scheduledAt).toLocaleString()}</strong>
        <span class="badge bg-primary">${apt.status}</span>
      </div>
      ${apt.reason ? `<div class="small">${escapeHtml(apt.reason)}</div>` : ''}
    </div>
  `).join('');
}

function switchClinicalTab(tabKey) {
  document.querySelectorAll('.clinical-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabKey);
  });

  document.querySelectorAll('.tab-content-section').forEach(section => {
    section.classList.toggle('active', section.id === `tab-${tabKey}`);
  });
}

function toggleInvestigation(type) {
  const sections = {
    radiology: 'investigation-radiology',
    laboratory: 'investigation-laboratory',
    other: 'investigation-other'
  };

  Object.entries(sections).forEach(([key, sectionId]) => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.style.display = key === type ? 'block' : 'none';
  });

  document.querySelectorAll('.investigation-btn').forEach((btn) => {
    if (!btn.dataset.type) {
      const match = (btn.getAttribute('onclick') || '').match(/toggleInvestigation\('([^']+)'\)/);
      if (match) btn.dataset.type = match[1];
    }
    btn.classList.toggle('active', btn.dataset.type === type);
  });
}

// --- LAB PORTAL MANAGEMENT ---

function setLabStatus(message, variant = 'info') {
  const statusEl = document.getElementById('lab-status-message');
  if (!statusEl) return;
  if (!message) {
    statusEl.textContent = '';
    statusEl.style.display = 'none';
    statusEl.className = 'small text-muted';
    return;
  }
  const className = variant === 'success'
    ? 'small text-success'
    : variant === 'error'
      ? 'small text-danger'
      : variant === 'warning'
        ? 'small text-warning'
        : 'small text-muted';
  statusEl.className = className;
  statusEl.textContent = message;
  statusEl.style.display = 'block';
}

function setLabDetailMessage(message, variant = 'info') {
  const alertEl = document.getElementById('lab-order-alert');
  if (!alertEl) return;
  if (!message) {
    alertEl.style.display = 'none';
    alertEl.textContent = '';
    alertEl.className = '';
    return;
  }
  const className = variant === 'success'
    ? 'alert alert-success mb-3'
    : variant === 'error'
      ? 'alert alert-danger mb-3'
      : variant === 'warning'
        ? 'alert alert-warning mb-3'
        : 'alert alert-info mb-3';
  alertEl.className = className;
  alertEl.textContent = message;
  alertEl.style.display = 'block';
}

function getLabOrderById(orderId) {
  return labOrders.find((order) => order.id === Number(orderId)) || null;
}

async function handleLabLogin(event) {
  event.preventDefault();
  const email = document.getElementById('lab-login-email')?.value.trim();
  const password = document.getElementById('lab-login-password')?.value;
  const errorAlert = document.getElementById('lab-login-error');
  const successAlert = document.getElementById('lab-login-success');

  if (errorAlert) errorAlert.style.display = 'none';
  if (successAlert) successAlert.style.display = 'none';

  try {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }
    const response = await apiRequest('/lab/login', {
      method: 'POST',
      body: { email, password }
    });

    authToken = response.token;
    labProfile = response.labUser;
    userRole = 'lab';

  labOrders = [];
  labSelectedOrderId = null;
  labOrdersStatus = 'active';

    localStorage.setItem('ehrToken', authToken);
    localStorage.setItem('ehrRole', 'lab');
    localStorage.setItem('ehrLab', JSON.stringify(labProfile));

    if (successAlert) {
      successAlert.textContent = 'Login successful. Redirecting to lab dashboard...';
      successAlert.style.display = 'block';
    }

    updateNav();
    await loadLabOrders('active');
    showPage('lab-dashboard');
    return false;
  } catch (err) {
    if (errorAlert) {
      errorAlert.textContent = err.message || 'Unable to login.';
      errorAlert.style.display = 'block';
    }
    return false;
  }
}

async function handleLabRegister(event) {
  event.preventDefault();
  const firstName = document.getElementById('lab-reg-firstname')?.value.trim();
  const lastName = document.getElementById('lab-reg-lastname')?.value.trim();
  const email = document.getElementById('lab-reg-email')?.value.trim();
  const password = document.getElementById('lab-reg-password')?.value;
  const confirm = document.getElementById('lab-reg-confirm-password')?.value;
  const errorAlert = document.getElementById('lab-register-error');
  const successAlert = document.getElementById('lab-register-success');

  if (errorAlert) errorAlert.style.display = 'none';
  if (successAlert) successAlert.style.display = 'none';

  try {
    if (!firstName || !lastName || !email || !password) {
      throw new Error('All fields are required.');
    }
    if (password !== confirm) {
      throw new Error('Passwords do not match.');
    }

    await apiRequest('/lab/register', {
      method: 'POST',
      body: { firstName, lastName, email, password }
    });

    if (successAlert) {
      successAlert.textContent = 'Lab user registered successfully. You can now login.';
      successAlert.style.display = 'block';
    }
    (document.getElementById('lab-register-form'))?.reset();
    return false;
  } catch (err) {
    if (errorAlert) {
      errorAlert.textContent = err.message || 'Unable to register lab user.';
      errorAlert.style.display = 'block';
    }
    return false;
  }
}

async function loadLabOrders(status = labOrdersStatus) {
  if (!authToken || userRole !== 'lab') {
    return [];
  }

  labOrdersStatus = status;
  const filterSelect = document.getElementById('lab-status-filter');
  if (filterSelect && filterSelect.value !== status) {
    filterSelect.value = status;
  }

  try {
    setLabStatus('Loading lab orders...', 'info');
    const orders = await apiRequest(`/lab/orders?status=${encodeURIComponent(status)}`);
    labOrders = Array.isArray(orders) ? orders : [];

    if (!labOrders.some((order) => order.id === labSelectedOrderId)) {
      labSelectedOrderId = labOrders.length ? labOrders[0].id : null;
    }

    renderLabOrdersList();
    renderLabOrderDetail(getLabOrderById(labSelectedOrderId));

    if (!labOrders.length) {
      setLabStatus('No lab requests match this filter.', 'info');
    } else {
      setLabStatus('', 'info');
    }

    return labOrders;
  } catch (err) {
    setLabStatus(err.message || 'Unable to load lab orders.', 'error');
    throw err;
  }
}

function renderLabOrdersList() {
  const listEl = document.getElementById('lab-orders-queue');
  if (!listEl) return;

  if (!labOrders.length) {
    listEl.innerHTML = '<div class="p-3 text-muted small">No lab requests to display.</div>';
    return;
  }

  listEl.innerHTML = labOrders.map((order) => {
    const { badgeClass, label } = getLabStatusMeta(order.status);
    const patientName = order.patient
      ? `${order.patient.lastName || ''}, ${order.patient.firstName || ''}`.replace(/^,\s*/, '').trim() || 'Unknown patient'
      : 'Unknown patient';
    const requestedAt = order.orderedAt ? formatDateTime(order.orderedAt) : 'Unknown date';
    const activeClass = order.id === labSelectedOrderId ? ' active' : '';
    return `
      <button type="button" class="list-group-item list-group-item-action${activeClass}" data-lab-order-id="${order.id}">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <div class="fw-semibold">${escapeHtml(order.testName)}</div>
            <div class="small text-muted">${escapeHtml(patientName)}</div>
            <div class="small text-muted">${escapeHtml(requestedAt)}</div>
          </div>
          <span class="${badgeClass}">${escapeHtml(label)}</span>
        </div>
      </button>
    `;
  }).join('');
}

function renderLabOrderDetail(order) {
  const titleEl = document.getElementById('lab-order-title');
  const statusEl = document.getElementById('lab-order-status');
  const bodyEl = document.getElementById('lab-order-body');
  if (!titleEl || !statusEl || !bodyEl) return;

  setLabDetailMessage('', 'info');

  if (!order) {
    titleEl.textContent = 'Select an order';
    statusEl.className = 'badge bg-secondary';
    statusEl.textContent = '';
    bodyEl.innerHTML = '<div class="text-muted">Select a lab request from the queue to review and enter results.</div>';
    return;
  }

  const { badgeClass, label } = getLabStatusMeta(order.status);
  statusEl.className = badgeClass;
  statusEl.textContent = label;
  titleEl.textContent = order.testName ? `${order.testName}` : 'Lab Order';

  const patientName = order.patient
    ? `${order.patient.firstName || ''} ${order.patient.lastName || ''}`.trim() || 'Unknown patient'
    : 'Unknown patient';
  const patientDob = order.patient?.dateOfBirth ? formatDateTime(order.patient.dateOfBirth, false) : '—';
  const clinician = order.doctor
    ? `${order.doctor.firstName || ''} ${order.doctor.lastName || ''}`.trim() || 'N/A'
    : 'N/A';
  const orderedAt = order.orderedAt ? formatDateTime(order.orderedAt) : '—';
  const isCompleted = (order.status || '').toLowerCase() === 'completed';
  const template = getLabTemplate(order.testName);
  const templateMarkup = template
    ? buildLabTemplateForm(template, order, isCompleted)
    : '<div class="alert alert-info">No structured template available. Provide a narrative summary below.</div>';

  const verifiedBlock = order.verifiedByName
    ? `<div class="alert alert-light border mt-3">Results verified by ${escapeHtml(order.verifiedByName)}${order.verifiedAt ? ` on ${escapeHtml(formatDateTime(order.verifiedAt))}` : ''}.</div>`
    : '';

  const resultDateBlock = order.resultDate
    ? `<div class="small text-muted mt-2">Result date: ${escapeHtml(formatDateTime(order.resultDate))}</div>`
    : '';

  const priorityBlock = order.priority ? `<span class="badge text-bg-light border border-primary text-primary">Priority: ${escapeHtml(order.priority)}</span>` : '';
  const notesBlock = order.notes ? `<div class="small text-muted mt-2"><strong>Clinical Notes:</strong> ${escapeHtml(order.notes)}</div>` : '';

  const summaryValue = order.result ? escapeHtml(order.result) : '';

  bodyEl.innerHTML = `
    <div class="mb-3">
      <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
        <strong>${escapeHtml(patientName)}</strong>
        <span class="badge bg-light text-dark">DOB: ${escapeHtml(patientDob)}</span>
        ${priorityBlock}
      </div>
      <div class="small text-muted">Ordering clinician: ${escapeHtml(clinician)}</div>
      <div class="small text-muted">Requested: ${escapeHtml(orderedAt)}</div>
      ${notesBlock}
    </div>
    <form id="lab-result-form" data-order-id="${order.id}" class="lab-result-form">
      ${templateMarkup}
      <div class="mb-3">
        <label class="form-label">Result Summary / Interpretation</label>
        <textarea class="form-control" id="lab-result-summary" rows="3" ${isCompleted ? 'disabled' : ''}>${summaryValue}</textarea>
      </div>
      ${isCompleted ? '' : `
        <div class="d-flex justify-content-end">
          <button type="submit" class="btn btn-primary" id="lab-save-button">
            <i class="bi bi-upload"></i> Submit Results
          </button>
        </div>
      `}
    </form>
    ${verifiedBlock}
    ${resultDateBlock}
  `;

  const resultForm = document.getElementById('lab-result-form');
  if (resultForm) {
    resultForm.addEventListener('submit', saveLabOrderResult);
  }

  if (isCompleted) {
    const statusMessage = order.verifiedAt
      ? `Results verified on ${formatDateTime(order.verifiedAt)}.`
      : 'Results have been marked as completed.';
    setLabDetailMessage(statusMessage, 'success');
  }
}

function buildLabTemplateForm(template, order, isCompleted) {
  const existing = Array.isArray(order.resultDetails) ? order.resultDetails : [];
  const detailMap = new Map();
  existing.forEach((detail) => {
    if (!detail) return;
    const key = (detail.key || detail.label || '').toString().trim().toLowerCase();
    if (key) {
      detailMap.set(key, detail);
    }
  });

  const rows = template.fields.map((field, index) => {
    const key = (field.key || field.label || `field_${index}`).toString();
    const lookupKey = key.toLowerCase();
    const detail = detailMap.get(lookupKey) || detailMap.get((field.label || '').toLowerCase()) || {};
    const value = detail.value !== undefined && detail.value !== null ? String(detail.value) : '';
    const flag = (detail.flag || '').toUpperCase();
    return `
      <tr class="lab-template-row" data-field-key="${key}" data-field-label="${field.label}" data-field-unit="${field.unit || ''}" data-field-reference="${field.reference || ''}">
        <th scope="row">${escapeHtml(field.label)}</th>
        <td style="width: 22%;">
          <input type="text" class="form-control form-control-sm" value="${escapeHtml(value)}" ${isCompleted ? 'disabled' : ''}>
        </td>
        <td class="text-muted small" style="width: 12%;">${escapeHtml(field.unit || '')}</td>
        <td class="text-muted small" style="width: 28%;">${escapeHtml(field.reference || '')}</td>
        <td style="width: 18%;">
          <select class="form-select form-select-sm" ${isCompleted ? 'disabled' : ''}>
            <option value="" ${flag === '' ? 'selected' : ''}>Normal</option>
            <option value="L" ${flag === 'L' ? 'selected' : ''}>Low</option>
            <option value="H" ${flag === 'H' ? 'selected' : ''}>High</option>
            <option value="A" ${flag === 'A' ? 'selected' : ''}>Abnormal</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="mb-3">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h6 class="mb-0">${escapeHtml(template.name)}</h6>
        ${isCompleted ? '<span class="badge bg-success">Completed</span>' : ''}
      </div>
      <div class="table-responsive">
        <table class="table table-sm table-bordered align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th scope="col">Analyte</th>
              <th scope="col">Result</th>
              <th scope="col">Unit</th>
              <th scope="col">Reference</th>
              <th scope="col">Flag</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function collectLabResultDetailsFromForm(form) {
  const rows = Array.from(form.querySelectorAll('.lab-template-row'));
  return rows.map((row) => {
    const key = row.dataset.fieldKey || '';
    const label = row.dataset.fieldLabel || key || 'Analyte';
    const unit = row.dataset.fieldUnit || '';
    const reference = row.dataset.fieldReference || '';
    const valueInput = row.querySelector('input');
    const flagSelect = row.querySelector('select');
    const value = valueInput ? valueInput.value.trim() : '';
    const flag = flagSelect ? flagSelect.value : '';
    if (!value) {
      return null;
    }
    return {
      key,
      label,
      value,
      unit,
      referenceRange: reference,
      reference,
      flag
    };
  }).filter(Boolean);
}

async function saveLabOrderResult(event) {
  event.preventDefault();
  const form = event.target.closest('#lab-result-form');
  if (!form) return;

  const orderId = Number(form.dataset.orderId);
  if (!Number.isFinite(orderId)) {
    setLabDetailMessage('Unable to determine lab order.', 'error');
    return;
  }

  const submitButton = form.querySelector('#lab-save-button');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.dataset.originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';
  }

  try {
    const resultDetails = collectLabResultDetailsFromForm(form);
    if (!resultDetails.length) {
      throw new Error('Enter at least one result value before submitting.');
    }

    const summaryInput = form.querySelector('#lab-result-summary');
    const resultSummary = summaryInput ? summaryInput.value.trim() : '';

    setLabDetailMessage('Submitting results...', 'info');

    const updated = await apiRequest(`/lab/orders/${orderId}/result`, {
      method: 'PUT',
      body: {
        resultSummary,
        resultDetails
      }
    });

    labOrders = labOrders.map((order) => (order.id === updated.id ? updated : order));
    labSelectedOrderId = updated.id;

    renderLabOrdersList();
    renderLabOrderDetail(updated);
    setLabDetailMessage('Results submitted to the requesting doctor.', 'success');
    setLabStatus('Results saved successfully.', 'success');
  } catch (err) {
    setLabDetailMessage(err.message || 'Unable to save results.', 'error');
    setLabStatus(err.message || 'Unable to save results.', 'error');
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      if (submitButton.dataset.originalText) {
        submitButton.innerHTML = submitButton.dataset.originalText;
        delete submitButton.dataset.originalText;
      }
    }
  }
}

// --- VISIT DOCUMENTATION ---

function clearVisitForm() {
  // Vitals
  ['vitals-bp', 'vitals-pulse', 'vitals-temp', 'vitals-resp', 'vitals-o2', 'vitals-weight'].forEach((id) => {
    const field = document.getElementById(id);
    if (field) field.value = '';
  });
  
  // Visit notes
  ['chief-complaint', 'hpi', 'diagnosis-text', 'management-text'].forEach((id) => {
    const field = document.getElementById(id);
    if (field) field.value = '';
  });
}

function collectVitals() {
  const vitalsMap = {
    bloodPressure: document.getElementById('vitals-bp')?.value.trim(),
    pulse: document.getElementById('vitals-pulse')?.value.trim(),
    temperature: document.getElementById('vitals-temp')?.value.trim(),
    respiratory: document.getElementById('vitals-resp')?.value.trim(),
    oxygenSaturation: document.getElementById('vitals-o2')?.value.trim(),
    weight: document.getElementById('vitals-weight')?.value.trim()
  };
  const vitals = {};
  Object.entries(vitalsMap).forEach(([key, value]) => {
    if (value) vitals[key] = value;
  });
  return Object.keys(vitals).length ? vitals : null;
}

function collectReviewOfSystems() {
  const systems = {};
  document.querySelectorAll('#tab-visit .system-review-item').forEach((item) => {
    const label = item.querySelector('h6')?.textContent?.trim();
    const value = item.querySelector('textarea')?.value.trim();
    if (label && value) {
      systems[label] = value;
    }
  });
  return systems;
}

function collectPhysicalExam() {
  const findings = {};
  document.querySelectorAll('#tab-visit .exam-item').forEach((item) => {
    const label = item.querySelector('h6')?.textContent?.trim();
    const value = item.querySelector('textarea')?.value.trim();
    if (label && value) {
      findings[label] = value;
    }
  });
  return findings;
}

function collectVisitData(status) {
  const vitals = collectVitals();
  const reviewOfSystems = collectReviewOfSystems();
  const physicalExam = collectPhysicalExam();
  const diagnosis = document.getElementById('diagnosis-text')?.value.trim();
  const treatmentPlan = document.getElementById('management-text')?.value.trim();

  const payload = {
    visitDate: new Date().toISOString(),
    vitals,
    chiefComplaint: document.getElementById('chief-complaint')?.value.trim() || null,
    hpi: document.getElementById('hpi')?.value.trim() || null,
    reviewOfSystems: Object.keys(reviewOfSystems).length ? reviewOfSystems : null,
    physicalExam: Object.keys(physicalExam).length ? physicalExam : null,
    diagnosis: diagnosis || null,
    treatmentPlan: treatmentPlan || null
  };

  if (status) {
    payload.status = status;
  }

  return payload;
}

async function ensureCurrentVisit(status = 'in-progress') {
  if (!currentPatient) {
    throw new Error('No patient selected.');
  }
  if (currentVisitId) {
    return currentVisitId;
  }
  const payload = collectVisitData(status);
  const visit = await apiRequest(`/patients/${currentPatient.id}/visits`, {
    method: 'POST',
    body: payload
  });
  currentVisitId = visit.id;
  return currentVisitId;
}

async function persistVisit(status, successMessage) {
  if (!currentPatient) {
    alert('Open a patient before saving visit data.');
    return null;
  }

  const payload = collectVisitData(status);

  try {
    let visit;
    if (currentVisitId) {
      visit = await apiRequest(`/visits/${currentVisitId}`, { method: 'PUT', body: payload });
    } else {
      visit = await apiRequest(`/patients/${currentPatient.id}/visits`, { method: 'POST', body: payload });
      currentVisitId = visit.id;
    }

    if (successMessage) {
      alert(successMessage);
    }

    await openPatientClinical(currentPatient.id);
    invalidateSummaryCache(currentPatient.id);
    return visit;
  } catch (err) {
    throw err;
  }
}

async function startNewVisit() {
  clearVisitForm();
  currentVisitId = null;
  switchClinicalTab('visit');
}

async function saveVisitEntry() {
  try {
    await persistVisit('in-progress', 'Visit details saved.');
  } catch (err) {
    alert('Error saving visit entry: ' + err.message);
  }
}

async function saveDiagnosisTreatment() {
  try {
    await persistVisit('in-progress', 'Diagnosis and management saved.');
  } catch (err) {
    alert('Error saving diagnosis: ' + err.message);
  }
}

async function completeVisit() {
  try {
    await persistVisit('completed', 'Visit completed and saved successfully!');
  } catch (err) {
    alert('Error completing visit: ' + err.message);
  }
}

// --- PRESCRIPTIONS ---

async function addMedication() {
  if (!currentPatient) {
    alert('Open a patient record before prescribing medications.');
    return;
  }

  const nameField = document.getElementById('med-name');
  const dosageField = document.getElementById('med-dosage');
  const frequencyField = document.getElementById('med-frequency');
  const durationField = document.getElementById('med-duration');

  const medicationName = nameField?.value.trim();
  const dosage = dosageField?.value.trim();
  const frequency = frequencyField?.value || '';
  const duration = durationField?.value.trim();

  if (!medicationName || !dosage || !frequency || !duration) {
    alert('Medication name, dosage, frequency, and duration are required.');
    return;
  }

  try {
    const visitId = await ensureCurrentVisit();

    const matchingItem = referenceData.medications.find((item) =>
      item.name.toLowerCase() === medicationName.toLowerCase()
    );

    const payload = {
      visitId,
      medicationName,
      dosage,
      frequency,
      duration,
      instructions: null
    };

    if (matchingItem) {
      payload.itemId = matchingItem.id;
    }

    await apiRequest(`/patients/${currentPatient.id}/prescriptions`, { method: 'POST', body: payload });

    if (nameField) nameField.value = '';
    if (dosageField) dosageField.value = '';
    if (frequencyField) frequencyField.value = '';
    if (durationField) durationField.value = '';

    alert('Medication saved successfully.');
    await openPatientClinical(currentPatient.id);
    switchClinicalTab('medications');
  } catch (err) {
    alert('Error saving medication: ' + err.message);
  }
}

// --- INVESTIGATIONS ---

async function orderInvestigation(type) {
  if (!currentPatient) {
    alert('Open a patient record before placing orders.');
    return;
  }

  try {
    const visitId = await ensureCurrentVisit();

    let checkboxes;
    let notesField = null;
    let priorityField = null;
    let endpoint = '';
    let successMessage = '';

    if (type === 'laboratory') {
      checkboxes = document.querySelectorAll('#lab-tests-container input[type="checkbox"]:checked');
      if (!checkboxes.length) {
        alert('Please select at least one lab test.');
        return;
      }
      notesField = document.getElementById('lab-notes');
      priorityField = document.getElementById('lab-priority');
      endpoint = `/patients/${currentPatient.id}/lab-orders`;
      successMessage = 'Lab orders submitted successfully.';
    } else if (type === 'radiology') {
      checkboxes = document.querySelectorAll('#radiology-tests-container input[type="checkbox"]:checked');
      if (!checkboxes.length) {
        alert('Please select at least one radiology test.');
        return;
      }
      notesField = document.getElementById('radiology-notes');
      priorityField = document.getElementById('radiology-priority');
      endpoint = `/patients/${currentPatient.id}/radiology-orders`;
      successMessage = 'Radiology orders submitted successfully.';
    } else if (type === 'other') {
      checkboxes = document.querySelectorAll('#investigation-other input[type="checkbox"]:checked');
      if (!checkboxes.length) {
        alert('Please select at least one test.');
        return;
      }
      notesField = document.getElementById('other-notes');
      endpoint = `/patients/${currentPatient.id}/lab-orders`;
      successMessage = 'Other investigations documented successfully.';
    } else {
      alert('Unknown investigation type.');
      return;
    }

    const tests = Array.from(checkboxes).map((cb) => {
      const rawValue = cb.value;
      const testId = rawValue && !Number.isNaN(Number(rawValue)) ? Number(rawValue) : null;
      const label = cb.dataset.name || cb.nextElementSibling?.textContent?.trim() || rawValue;
      return {
        testId,
        testName: label
      };
    }).filter((test) => !!test.testName);

    if (!tests.length) {
      alert('Unable to determine selected test names.');
      return;
    }

    const notes = notesField ? notesField.value.trim() : '';
    const priority = priorityField ? priorityField.value || null : (type === 'other' ? 'Other' : null);

    await apiRequest(endpoint, {
      method: 'POST',
      body: { visitId, tests, priority, notes }
    });

    checkboxes.forEach((cb) => {
      cb.checked = false;
    });
    if (notesField) notesField.value = '';
    if (priorityField) priorityField.value = '';

    alert(successMessage);
    await openPatientClinical(currentPatient.id);
    switchClinicalTab('investigations');
  } catch (err) {
    alert('Error submitting investigations: ' + err.message);
  }
}

// --- APPOINTMENTS ---

async function saveAppointment() {
  if (!currentPatient) return;
  
  try {
    const visitId = await ensureCurrentVisit('in-progress');
    const scheduledAt = document.getElementById('appointment-date').value;
    const reason = document.getElementById('appointment-reason').value.trim();
    
    if (!scheduledAt) {
      alert('Please select appointment date and time');
      return;
    }
    
    await apiRequest(`/patients/${currentPatient.id}/appointments`, {
      method: 'POST',
      body: {
        visitId,
        scheduledAt,
        reason,
        notes: document.getElementById('appointment-notes').value.trim()
      }
    });
    
    // Clear form
    document.getElementById('appointment-date').value = '';
    document.getElementById('appointment-reason').value = '';
    document.getElementById('appointment-notes').value = '';
    
    await openPatientClinical(currentPatient.id);
    switchClinicalTab('visit');
  } catch (err) {
    alert('Error saving appointment: ' + err.message);
  }
}

// --- UTILITIES ---

function calculateAge(dob) {
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val || '—';
}

function listToString(list) {
  if (!list) return 'None';
  if (Array.isArray(list)) return list.length > 0 ? list.join(', ') : 'None';
  return list || 'None';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function parseDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? new Date(value) : null;
  }
  if (typeof value === 'string') {
    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function formatDateTime(value, includeTime = true) {
  const date = parseDateValue(value);
  if (!date) return null;
  return includeTime ? date.toLocaleString() : date.toLocaleDateString();
}

function formatDobForGdt(value) {
  const date = parseDateValue(value);
  if (!date) return '01011990';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}${month}${year}`;
}

async function triggerGDTExport(patientData) {
  try {
    if (!patientData || !patientData.id) {
        console.error("Cannot export BDT: No patient ID");
        return;
    }

    console.log(`🚀 Triggering BDT Export for Patient ID: ${patientData.id}`);

    // CHANGE: Call Node.js Backend (Port 5000) instead of Python Simulator
    // This triggers the route in server.js that pulls full DB records
    const response = await apiRequest(`/patients/${patientData.id}/ai-summary`, {
      method: 'POST'
    });

    if (response.success) {
        console.log("✅ BDT Export signal sent to backend:", response.message);
    } else {
        console.error("❌ Backend failed to export BDT:", response);
    }

  } catch (error) {
    console.error('Failed to trigger AI Summary export:', error);
  }
}

// Reason for Visit functions
function clearReasonForVisit() {
  document.getElementById('primary-reason').value = '';
  document.getElementById('visit-type').value = '';
  document.getElementById('priority-level').value = '';
  document.getElementById('detailed-reason').value = '';
  document.getElementById('referring-doctor').value = '';
  document.getElementById('insurance-auth').value = 'no';
}

async function saveReasonForVisit() {
  const reasonData = {
    primary_reason: document.getElementById('primary-reason').value,
    visit_type: document.getElementById('visit-type').value,
    priority_level: document.getElementById('priority-level').value,
    detailed_reason: document.getElementById('detailed-reason').value,
    referring_doctor: document.getElementById('referring-doctor').value,
    insurance_auth: document.getElementById('insurance-auth').value
  };

  if (!reasonData.primary_reason || !reasonData.detailed_reason) {
    alert('Please fill in at least the primary reason and detailed description.');
    return;
  }

  try {
    // Save to current visit or create a new visit record
    if (currentPatient) {
      // Update the current patient data locally
      if (!currentPatient.visitReasons) {
        currentPatient.visitReasons = [];
      }
      
      const visitReason = {
        ...reasonData,
        timestamp: new Date().toISOString(),
        patient_id: currentPatientId
      };
      
      currentPatient.visitReasons.push(visitReason);
      
      // Store in localStorage for persistence
      const storedReasons = JSON.parse(localStorage.getItem('visitReasons') || '{}');
      if (!storedReasons[currentPatientId]) {
        storedReasons[currentPatientId] = [];
      }
      storedReasons[currentPatientId].push(visitReason);
      localStorage.setItem('visitReasons', JSON.stringify(storedReasons));
      
      // Send to AI backend for analysis
      try {
        const aiResponse = await fetch(`http://127.0.0.1:8001/api/patient/${currentPatientId}/visit_reason`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(visitReason)
        });
        
        if (aiResponse.ok) {
          console.log('✅ Visit reason sent to AI backend for analysis');
        } else {
          console.log('⚠️ AI backend unavailable - reason saved locally only');
        }
      } catch (aiError) {
        console.log('⚠️ AI backend unavailable - reason saved locally only', aiError);
      }
      
      alert('Reason for visit saved successfully and sent for AI analysis!');
      loadPreviousVisitsSummary();
    } else {
      alert('No patient selected. Please select a patient first.');
    }
  } catch (error) {
    console.error('Error saving reason for visit:', error);
    alert('Failed to save reason for visit. Please try again.');
  }
}

async function loadPreviousVisitsSummary() {
  if (!currentPatientId) return;

  try {
    const summaryContainer = document.getElementById('previous-visits-summary');
    
    // Load stored visit reasons from localStorage
    const storedReasons = JSON.parse(localStorage.getItem('visitReasons') || '{}');
    const patientReasons = storedReasons[currentPatientId] || [];
    
    if (currentPatient && currentPatient.visits && currentPatient.visits.length > 0) {
      const visits = currentPatient.visits.slice(0, 5);
      
      const summaryHTML = visits.map(visit => {
        const date = new Date(visit.visit_date).toLocaleDateString();
        // Try to find a matching reason for this visit
        const matchingReason = patientReasons.find(r => 
          new Date(r.timestamp).toDateString() === new Date(visit.visit_date).toDateString()
        );
        const reason = matchingReason ? matchingReason.primaryReason : (visit.reason || 'General Visit');
        
        return `
          <div class="border-bottom py-2">
            <div class="d-flex justify-content-between">
              <strong>${date}</strong>
              <span class="badge bg-primary">${reason}</span>
            </div>
            <div class="text-muted small">${visit.diagnosis || 'No diagnosis recorded'}</div>
            ${matchingReason ? `<div class="text-muted small mt-1"><strong>Details:</strong> ${matchingReason.detailedReason}</div>` : ''}
          </div>
        `;
      }).join('');

      summaryContainer.innerHTML = summaryHTML;
    } else if (patientReasons.length > 0) {
      // Show only stored reasons if no visits in database
      const summaryHTML = patientReasons.slice(0, 5).map(reason => {
        const date = new Date(reason.timestamp).toLocaleDateString();
        return `
          <div class="border-bottom py-2">
            <div class="d-flex justify-content-between">
              <strong>${date}</strong>
              <span class="badge bg-success">${reason.primaryReason}</span>
            </div>
            <div class="text-muted small">${reason.detailedReason}</div>
            <div class="text-muted small mt-1"><strong>Priority:</strong> ${reason.priorityLevel || 'Normal'}</div>
          </div>
        `;
      }).join('');

      summaryContainer.innerHTML = summaryHTML;
    } else {
      summaryContainer.innerHTML = '<p class="text-muted">No previous visits recorded.</p>';
    }
  } catch (error) {
    console.error('Error loading previous visits summary:', error);
    document.getElementById('previous-visits-summary').innerHTML = 
      '<p class="text-muted">Error loading previous visits.</p>';
  }
}

function viewGermanPatient(patientId) {
  openPatientClinical(patientId);
}

function exportGermanPatientData(patientId) {
  // Export patient data for BDT generation
  try {
    console.log(`Exporting data for German patient ${patientId}...`);
    
    // Call the existing BDT export endpoint
    window.open(`/api/patients/${patientId}/export-bdt`, '_blank');
    
    console.log(`✅ BDT export initiated for patient ${patientId}`);
  } catch (error) {
    console.error('Error exporting German patient data:', error);
    alert('Failed to export patient data. Please try again.');
  }
}

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
  
  // Store Hans's reasons
  if (!visitReasons[17]) visitReasons[17] = [];
  visitReasons[17].push(...hansReasons);
  
  // Store Maria's reasons  
  if (!visitReasons[18]) visitReasons[18] = [];
  visitReasons[18].push(...mariaReasons);
  
  localStorage.setItem('visitReasons', JSON.stringify(visitReasons));
  
  console.log('✅ Visit reasons added for Hans and Maria');
  alert('Visit reasons added successfully for Hans (diabetic follow-up) and Maria (epilepsy follow-up)!');
  
  return { hans: hansReasons, maria: mariaReasons };
}



async function testAISummary() {
  try {
    console.log('🧪 Testing AI backend connection...');
    
    // Test with patient 17 (Hans)
    const response = await fetch('http://127.0.0.1:8001/api/patient/17/summary');
    console.log('Response status:', response.status);
    
    console.log('AI functionality has been disabled');
    alert('AI functionality has been disabled.');
    }
  } catch (error) {
    console.error('❌ AI Backend connection failed:', error);
    alert(`AI Backend connection failed: ${error.message}`);
  }
}

// Expose functions to window for HTML onclick attributes
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.logout = logout;
window.showPage = showPage;
window.openPatientModal = openPatientModal;
window.openPatientClinical = openPatientClinical;
window.viewFullHistory = viewFullHistory;
window.closeFullHistory = closeFullHistory;
window.editPatient = editPatient;
window.deletePatient = deletePatient;
window.switchClinicalTab = switchClinicalTab;
window.toggleInvestigation = toggleInvestigation;
window.startNewVisit = startNewVisit;
window.saveVisitEntry = saveVisitEntry;
window.saveDiagnosisTreatment = saveDiagnosisTreatment;
window.completeVisit = completeVisit;
window.addMedication = addMedication;
window.orderInvestigation = orderInvestigation;
window.saveAppointment = saveAppointment;
window.handlePatientSubmit = handlePatientSubmit;
window.viewGermanPatient = viewGermanPatient;
window.exportGermanPatientData = exportGermanPatientData;
window.clearReasonForVisit = clearReasonForVisit;
window.saveReasonForVisit = saveReasonForVisit;
window.loadPreviousVisitsSummary = loadPreviousVisitsSummary;
window.addPatientVisitReasons = addPatientVisitReasons;

