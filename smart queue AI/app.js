/**
 * SMART QUEUE AI — Core Application Logic
 * Portals: Hospital Portal | Patient Portal | Autonomous Voice AI Portal
 * Data: Firebase Firestore (online, cross-device) with localStorage fallback
 */

// =============================================================================
// 1. FIREBASE INITIALIZATION & FIRESTORE DATA LAYER
// =============================================================================

// ── Firebase Setup ────────────────────────────────────────────────────────────
let db = null;
let firebaseReady = false;
const OFFLINE_MODE_KEY = 'sq_ai_offline_mode';

function initFirebase() {
  try {
    if (!FIREBASE_CONFIG || FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') {
      console.warn('Firebase not configured. Using localStorage fallback. Fill in firebase-config.js to enable cloud sync.');
      setDbStatus('offline', 'Offline Mode (Configure Firebase)');
      return;
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }

    // Initialize Analytics (optional — tracks page usage)
    if (firebase.analytics) {
      firebase.analytics();
    }

    db = firebase.firestore();

    // Enable offline persistence (Firestore caches locally when offline)
    db.enablePersistence({ synchronizeTabs: true })
      .then(() => console.log('Firestore offline persistence enabled.'))
      .catch(err => {
        if (err.code === 'failed-precondition') {
          console.warn('Multiple tabs open — persistence available in one tab only.');
        } else if (err.code === 'unimplemented') {
          console.warn('Browser does not support Firestore offline persistence.');
        }
      });

    // Test connectivity
    db.collection('_ping').doc('check').set({ ts: Date.now() })
      .then(() => {
        firebaseReady = true;
        setDbStatus('online', 'Cloud DB Connected ✓');
        console.log('Firebase Firestore connected successfully.');
      })
      .catch(err => {
        console.warn('Firestore write test failed:', err);
        setDbStatus('error', 'DB Error — Offline Fallback');
      });

  } catch (err) {
    console.error('Firebase init failed:', err);
    setDbStatus('offline', 'Offline Mode (Configure Firebase)');
  }
}

function setDbStatus(state, text) {
  const chip = document.getElementById('db-status-chip');
  const label = document.getElementById('db-status-text');
  if (!chip || !label) return;
  chip.className = `db-status-chip db-${state}`;
  label.textContent = text;
  if (window.lucide) window.lucide.createIcons();
}

// ── Firestore Collection Names ────────────────────────────────────────────────
const COLLECTIONS = {
  HOSPITALS:    'hospitals',
  DOCTORS:      'doctors',
  PATIENTS:     'patients',
  APPOINTMENTS: 'appointments'
};

// ── localStorage keys (used as offline fallback / session store) ──────────────
const STORAGE_KEYS = {
  HOSPITALS:       'sq_ai_hospitals_v1',
  DOCTORS:         'sq_ai_doctors_v1',
  PATIENTS:        'sq_ai_patients_v1',
  APPOINTMENTS:    'sq_ai_appointments_v1',
  ACTIVE_HOSPITAL: 'sq_ai_active_hosp_v1',
  ACTIVE_PATIENT:  'sq_ai_active_patient_v1'
};

// ── In-Memory Cache (for fast UI rendering) ───────────────────────────────────
const _cache = {
  hospitals:    null,
  doctors:      null,
  patients:     null,
  appointments: null
};

// ── Generic Firestore helpers ─────────────────────────────────────────────────

// Read all documents from a collection → returns array of objects with `id`
async function fsGetAll(collectionName) {
  if (!db) return null; // triggers localStorage fallback in callers
  try {
    const snap = await Promise.race([
      db.collection(collectionName).get(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 3000))
    ]);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn(`Firestore read from "${collectionName}" failed (using local fallback):`, err.message || err);
    return null;
  }
}

// Save a document (upsert by id field) — safely writes without blocking app if cloud sync fails
async function fsSave(collectionName, docObj) {
  if (!db) return;
  try {
    const { id, ...data } = docObj;
    await Promise.race([
      db.collection(collectionName).doc(id).set(data),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore write timeout')), 3000))
    ]);
  } catch (err) {
    console.warn(`Firestore save to "${collectionName}" failed (safely stored locally):`, err.message || err);
  }
}

// Save an array of documents (batch write)
async function fsSaveAll(collectionName, items) {
  if (!db || !items || items.length === 0) return;
  try {
    const batch = db.batch();
    items.forEach(item => {
      const { id, ...data } = item;
      const ref = db.collection(collectionName).doc(id);
      batch.set(ref, data);
    });
    await Promise.race([
      batch.commit(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore batch timeout')), 4000))
    ]);
  } catch (err) {
    console.warn(`Firestore batch save to "${collectionName}" failed (safely stored locally):`, err.message || err);
  }
}

// Delete a document by id
async function fsDelete(collectionName, docId) {
  if (!db) return;
  try {
    await Promise.race([
      db.collection(collectionName).doc(docId).delete(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore delete timeout')), 3000))
    ]);
  } catch (err) {
    console.warn(`Firestore delete from "${collectionName}" failed (safely removed locally):`, err.message || err);
  }
}

// ── Data Access Helpers (sync — read from in-memory cache / localStorage) ─────
// These are used throughout the UI for fast synchronous reads.
// The async `loadAll*` functions populate the cache after Firestore fetch.

function getHospitals() {
  if (_cache.hospitals !== null) return _cache.hospitals;
  const ls = localStorage.getItem(STORAGE_KEYS.HOSPITALS);
  try {
    return ls ? JSON.parse(ls) : [];
  } catch (e) {
    return [];
  }
}

function getDoctors() {
  const normalize = doc => ({
    visitingStart: '09:00',
    visitingEnd: '17:00',
    lunchStart: '13:00',
    lunchEnd: '14:00',
    ...doc
  });

  if (_cache.doctors !== null) {
    return _cache.doctors.map(normalize);
  }
  const ls = localStorage.getItem(STORAGE_KEYS.DOCTORS);
  try {
    const list = ls ? JSON.parse(ls) : [];
    return list.map(normalize);
  } catch (e) {
    return [];
  }
}

function getPatients() {
  if (_cache.patients !== null) return _cache.patients;
  const ls = localStorage.getItem(STORAGE_KEYS.PATIENTS);
  try {
    return ls ? JSON.parse(ls) : [];
  } catch (e) {
    return [];
  }
}

function getAppointments() {
  if (_cache.appointments !== null) return _cache.appointments;
  const ls = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
  try {
    return ls ? JSON.parse(ls) : [];
  } catch (e) {
    return [];
  }
}

function getActiveHospital() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVE_HOSPITAL) || 'null');
  } catch (e) {
    return null;
  }
}

function getActivePatient() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVE_PATIENT) || 'null');
  } catch (e) {
    return null;
  }
}

// ── Sync helpers: write to both Firestore and localStorage cache ──────────────

function _updateCache(key, items) {
  _cache[key] = items;
  const storageKey = STORAGE_KEYS[key.toUpperCase()];
  if (storageKey) localStorage.setItem(storageKey, JSON.stringify(items));
}

async function saveHospitals(hospitals) {
  _updateCache('hospitals', hospitals);
  if (db) await fsSaveAll(COLLECTIONS.HOSPITALS, hospitals);
}

async function saveHospital(hospital) {
  const hospitals = getHospitals();
  const idx = hospitals.findIndex(h => h.id === hospital.id);
  if (idx !== -1) hospitals[idx] = hospital; else hospitals.push(hospital);
  _updateCache('hospitals', hospitals);
  // Non-blocking background sync so user experience is instant (0ms)
  if (db) fsSave(COLLECTIONS.HOSPITALS, hospital).catch(() => {});
}

async function saveDoctors(doctors) {
  _updateCache('doctors', doctors);
  if (db) fsSaveAll(COLLECTIONS.DOCTORS, doctors).catch(() => {});
}

async function saveDoctor(doctor) {
  const doctors = getDoctors();
  const idx = doctors.findIndex(d => d.id === doctor.id);
  if (idx !== -1) doctors[idx] = doctor; else doctors.push(doctor);
  _updateCache('doctors', doctors);
  if (db) fsSave(COLLECTIONS.DOCTORS, doctor).catch(() => {});
}

async function deleteDoctor_fs(docId) {
  let doctors = getDoctors().filter(d => d.id !== docId);
  _updateCache('doctors', doctors);
  if (db) fsDelete(COLLECTIONS.DOCTORS, docId).catch(() => {});
}

async function savePatients(patients) {
  _updateCache('patients', patients);
  if (db) fsSaveAll(COLLECTIONS.PATIENTS, patients).catch(() => {});
}

async function savePatient(patient) {
  const patients = getPatients();
  const idx = patients.findIndex(p => p.id === patient.id);
  if (idx !== -1) patients[idx] = patient; else patients.push(patient);
  _updateCache('patients', patients);
  // Non-blocking background sync so user experience is instant (0ms)
  if (db) fsSave(COLLECTIONS.PATIENTS, patient).catch(() => {});
}

async function saveAppointments(appointments) {
  _updateCache('appointments', appointments);
  if (db) fsSaveAll(COLLECTIONS.APPOINTMENTS, appointments).catch(() => {});
}

async function saveAppointment(appointment) {
  const appointments = getAppointments();
  const idx = appointments.findIndex(a => a.id === appointment.id);
  if (idx !== -1) appointments[idx] = appointment; else appointments.push(appointment);
  _updateCache('appointments', appointments);
  if (db) fsSave(COLLECTIONS.APPOINTMENTS, appointment).catch(() => {});
}

async function deleteAppointment_fs(aptId) {
  let appointments = getAppointments().filter(a => a.id !== aptId);
  _updateCache('appointments', appointments);
  if (db) fsDelete(COLLECTIONS.APPOINTMENTS, aptId).catch(() => {});
}

// ── Load all data from Firestore into cache (called on app start) ─────────────
async function loadAllDataFromFirestore() {
  if (!db) {
    console.info('Firestore not available — using localStorage data.');
    return;
  }
  try {
    const [hospitals, doctors, patients, appointments] = await Promise.all([
      fsGetAll(COLLECTIONS.HOSPITALS),
      fsGetAll(COLLECTIONS.DOCTORS),
      fsGetAll(COLLECTIONS.PATIENTS),
      fsGetAll(COLLECTIONS.APPOINTMENTS)
    ]);

    if (hospitals && hospitals.length > 0) {
      _updateCache('hospitals', hospitals);
      console.log(`Loaded ${hospitals.length} hospitals from Firestore.`);
    }
    if (doctors && doctors.length > 0) {
      _updateCache('doctors', doctors);
      console.log(`Loaded ${doctors.length} doctors from Firestore.`);
    }
    if (patients && patients.length > 0) {
      _updateCache('patients', patients);
      console.log(`Loaded ${patients.length} patients from Firestore.`);
    }
    if (appointments && appointments.length > 0) {
      _updateCache('appointments', appointments);
      console.log(`Loaded ${appointments.length} appointments from Firestore.`);
    }

    // Re-render current portal with fresh data
    const activeHosp = getActiveHospital();
    const activePat = getActivePatient();
    if (activeHosp) { checkHospitalSession(); }
    if (activePat) { checkPatientSession(); }

    setDbStatus('online', 'Cloud DB Connected ✓');
  } catch (err) {
    console.error('Error loading data from Firestore:', err);
    setDbStatus('error', 'Using Offline Cache');
  }
}



// Seed initial realistic medical directory
async function seedSampleData(force = false) {
  const existingHospitals = getHospitals();
  if (existingHospitals.length === 0 || force) {
    const defaultHospitals = [
      {
        id: 'hosp-1',
        name: 'Apollo Care Multi-Speciality Hospital',
        password: 'password123',
        upiId: 'apollo@icici',
        address: '45 Healthcare Blvd, Central Metro, Bangalore',
        createdAt: new Date().toISOString()
      },
      {
        id: 'hosp-2',
        name: 'Metro Super Speciality Hospital',
        password: 'password123',
        upiId: 'metrohospital@okaxis',
        address: '12 Green Park Avenue, South District, Mumbai',
        createdAt: new Date().toISOString()
      },
      {
        id: 'hosp-3',
        name: 'City Life Health Institute',
        password: 'password123',
        upiId: 'citylife@hdfcbank',
        address: '88 Cyber Gateway, High-Tech City, Hyderabad',
        createdAt: new Date().toISOString()
      }
    ];
    await saveHospitals(defaultHospitals);
  }

  const existingDoctors = getDoctors();
  if (existingDoctors.length === 0 || force) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 5);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const defaultDoctors = [
      { id: 'doc-1', hospitalId: 'hosp-1', name: 'Dr. Sarah Mitchell, MD', department: 'Cardiology', leavesDate: tomorrowStr, visitingStart: '09:00', visitingEnd: '17:00', lunchStart: '13:00', lunchEnd: '14:00', fee: 650, room: 'OPD Suite #104' },
      { id: 'doc-2', hospitalId: 'hosp-1', name: 'Dr. Rajesh Sharma, MS', department: 'Neurology', leavesDate: nextWeekStr, visitingStart: '09:00', visitingEnd: '17:00', lunchStart: '13:00', lunchEnd: '14:00', fee: 800, room: 'Neurology Lab #202' },
      { id: 'doc-3', hospitalId: 'hosp-1', name: 'Dr. Elena Rostova, MD', department: 'Pediatrics', leavesDate: '2026-11-15', visitingStart: '09:00', visitingEnd: '17:00', lunchStart: '13:00', lunchEnd: '14:00', fee: 500, room: 'Pediatric Wing #12' },
      { id: 'doc-4', hospitalId: 'hosp-2', name: 'Dr. Vikramaditya Rao, MS', department: 'Orthopedics', leavesDate: tomorrowStr, visitingStart: '09:00', visitingEnd: '17:00', lunchStart: '13:00', lunchEnd: '14:00', fee: 700, room: 'OPD Room #301' },
      { id: 'doc-5', hospitalId: 'hosp-2', name: 'Dr. Ananya Sen, MD', department: 'Dermatology', leavesDate: '2026-12-01', visitingStart: '09:00', visitingEnd: '17:00', lunchStart: '13:00', lunchEnd: '14:00', fee: 550, room: 'Skin Care Cabin A' },
      { id: 'doc-6', hospitalId: 'hosp-3', name: 'Dr. David Chen, MBBS', department: 'General Medicine', leavesDate: '2026-11-20', visitingStart: '09:00', visitingEnd: '17:00', lunchStart: '13:00', lunchEnd: '14:00', fee: 400, room: 'General OPD #05' }
    ];
    await saveDoctors(defaultDoctors);
  }

  const existingPatients = getPatients();
  if (existingPatients.length === 0 || force) {
    const defaultPatients = [
      { id: 'pat-1', name: 'Alex Morgan', gender: 'Male', dob: '1995-04-12', email: 'alex@care.com', bloodGroup: 'O+', address: 'Indira Nagar, Bangalore, Karnataka', password: 'password123' }
    ];
    await savePatients(defaultPatients);
  }

  const existingApts = getAppointments();
  if (existingApts.length === 0 || force) {
    const today = new Date().toISOString().split('T')[0];
    const defaultAppointments = [
      { id: 'apt-1', tokenNumber: '#TQ-101', patientId: 'pat-mock-1', patientName: 'Kavita Reddy', patientEmail: 'kavita@domain.com', hospitalId: 'hosp-1', hospitalName: 'Apollo Care Multi-Speciality Hospital', doctorId: 'doc-1', doctorName: 'Dr. Sarah Mitchell, MD', appointmentDate: today, appointmentTime: '10:00 AM (Standard Time)', amountPaid: 650, upiId: 'apollo@icici', locationShared: true, locationCoords: { lat: 12.9716, lng: 77.5946, distanceKm: 1.2, estMinutes: 6 }, prescriptionData: null, prescriptionName: 'prior_ecg_report.pdf', status: 'In Consultation', queuePosition: 1, estWaitMinutes: 0 },
      { id: 'apt-2', tokenNumber: '#TQ-102', patientId: 'pat-mock-2', patientName: 'Rohan Mehra', patientEmail: 'rohan@domain.com', hospitalId: 'hosp-1', hospitalName: 'Apollo Care Multi-Speciality Hospital', doctorId: 'doc-1', doctorName: 'Dr. Sarah Mitchell, MD', appointmentDate: today, appointmentTime: '10:30 AM (Standard Time)', amountPaid: 650, upiId: 'apollo@icici', locationShared: true, locationCoords: { lat: 12.9352, lng: 77.6245, distanceKm: 3.4, estMinutes: 14 }, prescriptionData: null, prescriptionName: 'blood_report.jpg', status: 'Waiting in Lobby', queuePosition: 2, estWaitMinutes: 12 }
    ];
    await saveAppointments(defaultAppointments);
  }

  showToast('Demo Hospital, Doctor Roster & Patient data loaded successfully!', 'info');
}

// Data getters are defined in the Firestore data layer above (section 1).

// =============================================================================
// 2. PORTAL SWITCHING & APP NAVIGATION
// =============================================================================
let currentActivePortal = 'portal-voice';

function switchPortal(portalId) {
  currentActivePortal = portalId;

  // Update tabs
  document.querySelectorAll('.portal-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.portal-view').forEach(view => view.style.display = 'none');

  const targetView = document.getElementById(portalId);
  if (targetView) {
    targetView.style.display = 'block';
  }

  if (portalId === 'portal-hospital') {
    document.getElementById('nav-btn-hospital').classList.add('active');
    checkHospitalSession();
  } else if (portalId === 'portal-patient') {
    document.getElementById('nav-btn-patient').classList.add('active');
    checkPatientSession();
  } else if (portalId === 'portal-voice') {
    document.getElementById('nav-btn-voice').classList.add('active');
    initWaveformAnimation();
  }

  updateHeaderSessionDisplay();
  
  // Re-render Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function updateHeaderSessionDisplay() {
  const activeHosp = getActiveHospital();
  const activePat = getActivePatient();
  const nameDisplay = document.getElementById('user-name-display');
  const logoutBtn = document.getElementById('btn-logout');
  const avatarMini = document.getElementById('user-avatar-mini');

  if (activeHosp) {
    nameDisplay.textContent = activeHosp.name;
    nameDisplay.title = 'Logged in as Hospital';
    logoutBtn.style.display = 'flex';
    avatarMini.innerHTML = '<i data-lucide="hospital"></i>';
  } else if (activePat) {
    nameDisplay.textContent = activePat.name;
    nameDisplay.title = 'Logged in as Patient';
    logoutBtn.style.display = 'flex';
    avatarMini.innerHTML = '<i data-lucide="user"></i>';
  } else {
    nameDisplay.textContent = 'Guest Mode';
    nameDisplay.title = 'Not logged in';
    logoutBtn.style.display = 'none';
    avatarMini.innerHTML = '<i data-lucide="shield-check"></i>';
  }

  if (window.lucide) window.lucide.createIcons();
}

function logoutCurrentSession() {
  if (getActiveHospital()) {
    logoutHospital();
  } else if (getActivePatient()) {
    logoutPatient();
  }
}

// Convert 24-hr time string "HH:MM" to Standard 12-Hour Time with AM/PM
function formatToStandardTime(timeStr, includeTimezone = false) {
  if (!timeStr) return '--:--';
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    return timeStr;
  }
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hour = parseInt(parts[0], 10);
  const min = parts[1].padStart(2, '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  const hourFormatted = String(hour).padStart(2, '0');
  const standard = `${hourFormatted}:${min} ${ampm}`;
  return includeTimezone ? `${standard} (IST Standard Time)` : standard;
}

// Live Digital Clock formatted in Standard Time (IST)
function updateClock() {
  const now = new Date();
  const clockEl = document.getElementById('live-clock');
  if (clockEl) {
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    clockEl.innerHTML = `<i data-lucide="clock" style="width:13px;height:13px;display:inline-block;vertical-align:middle;margin-right:4px;"></i>${timeStr} IST`;
  }
}
setInterval(updateClock, 1000);

// Password visibility toggle
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
}

// Global Toast System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle-2';
  if (type === 'error') iconName = 'alert-circle';

  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}


// =============================================================================
// 3. PORTAL 1: HOSPITAL AUTH & ROSTER MANAGEMENT
// =============================================================================

function toggleHospitalAuthTab(tab) {
  const loginBtn = document.getElementById('tab-btn-hosp-login');
  const signupBtn = document.getElementById('tab-btn-hosp-signup');
  const loginForm = document.getElementById('hospital-login-form');
  const signupForm = document.getElementById('hospital-signup-form');

  if (tab === 'login') {
    loginBtn.classList.add('active');
    signupBtn.classList.remove('active');
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
  } else {
    loginBtn.classList.remove('active');
    signupBtn.classList.add('active');
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
  }
  if (window.lucide) window.lucide.createIcons();
}

async function handleHospitalSignup(event) {
  event.preventDefault();
  const submitBtn = event.target ? event.target.querySelector('button[type="submit"]') : null;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i data-lucide="loader-2" class="spin-icon"></i> Registering Hospital...';
    if (window.lucide) window.lucide.createIcons();
  }

  try {
    const name = document.getElementById('hosp-signup-name').value.trim();
    const password = document.getElementById('hosp-signup-password').value;
    const upiId = document.getElementById('hosp-signup-upi').value.trim();
    const address = document.getElementById('hosp-signup-address').value.trim();

    if (!name || !password || !upiId || !address) {
      showToast('Please fill all required hospital registration fields.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="check-circle-2"></i> Register Hospital & Open Portal';
        if (window.lucide) window.lucide.createIcons();
      }
      return;
    }

    if (password.length < 4) {
      showToast('Password must be at least 4 characters long.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="check-circle-2"></i> Register Hospital & Open Portal';
        if (window.lucide) window.lucide.createIcons();
      }
      return;
    }

    const hospitals = getHospitals();
    const existing = hospitals.find(h => (h.name || '').trim().toLowerCase() === name.toLowerCase());
    if (existing) {
      if (existing.password === password) {
        // Already registered with this password - log in immediately on single click!
        localStorage.setItem(STORAGE_KEYS.ACTIVE_HOSPITAL, JSON.stringify(existing));
        showToast(`Welcome back, ${existing.name}! Logged in successfully.`, 'success');
        checkHospitalSession();
        updateHeaderSessionDisplay();
        return;
      } else {
        showToast('A hospital with this name is already registered. Please check password or login.', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i data-lucide="check-circle-2"></i> Register Hospital & Open Portal';
          if (window.lucide) window.lucide.createIcons();
        }
        return;
      }
    }

    const newHospital = {
      id: 'hosp-' + Date.now(),
      name,
      password,
      upiId,
      address,
      createdAt: new Date().toISOString()
    };

    // 1. Immediately store to active hospital session & local cache (instant response on single click)
    saveHospital(newHospital);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_HOSPITAL, JSON.stringify(newHospital));

    // 2. Clear form
    const form = document.getElementById('hospital-signup-form');
    if (form) form.reset();

    // 3. Instant UI transition to hospital dashboard immediately
    showToast(`Hospital "${name}" registered successfully! Welcome to your portal.`, 'success');
    checkHospitalSession();
    updateHeaderSessionDisplay();
  } catch (err) {
    console.error('Hospital registration error:', err);
    showToast('Failed to register hospital: ' + (err.message || 'Unknown error'), 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i data-lucide="check-circle-2"></i> Register Hospital & Open Portal';
      if (window.lucide) window.lucide.createIcons();
    }
  }
}

function handleHospitalLogin(event) {
  event.preventDefault();
  const name = document.getElementById('hosp-login-name').value.trim();
  const password = document.getElementById('hosp-login-password').value;

  const hospitals = getHospitals();
  const matched = hospitals.find(
    h => h.name.toLowerCase() === name.toLowerCase() && h.password === password
  );

  if (!matched) {
    showToast('Invalid Hospital Name or Password. Please check credentials.', 'error');
    return;
  }

  localStorage.setItem(STORAGE_KEYS.ACTIVE_HOSPITAL, JSON.stringify(matched));
  showToast(`Welcome back, ${matched.name}!`, 'success');
  checkHospitalSession();
  updateHeaderSessionDisplay();
}

function fillDemoHospital() {
  document.getElementById('hosp-login-name').value = 'Apollo Care Multi-Speciality Hospital';
  document.getElementById('hosp-login-password').value = 'password123';
}

function checkHospitalSession() {
  const activeHosp = getActiveHospital();
  const authContainer = document.getElementById('hospital-auth-container');
  const dashboard = document.getElementById('hospital-dashboard');
  const quickActions = document.getElementById('hospital-quick-actions');

  if (activeHosp) {
    authContainer.style.display = 'none';
    dashboard.style.display = 'block';
    if (quickActions) quickActions.style.display = 'flex';

    document.getElementById('active-hosp-title').textContent = activeHosp.name;
    document.getElementById('active-hosp-upi').textContent = activeHosp.upiId;
    document.getElementById('active-hosp-address').textContent = activeHosp.address;

    renderHospitalDoctors(activeHosp.id);
    renderHospitalLiveQueue(activeHosp.id);
  } else {
    authContainer.style.display = 'block';
    dashboard.style.display = 'none';
    if (quickActions) quickActions.style.display = 'none';
  }

  if (window.lucide) window.lucide.createIcons();
}

function logoutHospital() {
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_HOSPITAL);
  showToast('Hospital session logged out.', 'info');
  checkHospitalSession();
  updateHeaderSessionDisplay();
}

async function handleAddDoctor(event) {
  event.preventDefault();
  const activeHosp = getActiveHospital();
  if (!activeHosp) {
    showToast('You must be logged in as a hospital to add doctors.', 'error');
    return;
  }

  const name = document.getElementById('doc-name').value.trim();
  const department = document.getElementById('doc-dept').value;
  const leavesDate = document.getElementById('doc-leaves').value;
  const visitingStart = document.getElementById('doc-visiting-start') ? document.getElementById('doc-visiting-start').value : '09:00';
  const visitingEnd = document.getElementById('doc-visiting-end') ? document.getElementById('doc-visiting-end').value : '17:00';
  const lunchStart = document.getElementById('doc-lunch-start').value || '13:00';
  const lunchEnd = document.getElementById('doc-lunch-end').value || '14:00';
  const fee = parseFloat(document.getElementById('doc-fee').value);
  const room = document.getElementById('doc-room').value.trim() || 'OPD Room #101';

  if (!name || !department || !leavesDate || !visitingStart || !visitingEnd || !lunchStart || !lunchEnd || isNaN(fee)) {
    showToast('Please fill all doctor schedule and fee details.', 'error');
    return;
  }

  const newDoctor = {
    id: 'doc-' + Date.now(),
    hospitalId: activeHosp.id,
    name,
    department,
    leavesDate,
    visitingStart,
    visitingEnd,
    lunchStart,
    lunchEnd,
    fee,
    room
  };

  await saveDoctor(newDoctor);

  // Reset form
  document.getElementById('add-doctor-form').reset();
  updateVisitingStandardTimeDisplay();
  updateLunchStandardTimeDisplay();
  showToast(`Dr. ${name} added! Visiting: ${formatToStandardTime(visitingStart)} - ${formatToStandardTime(visitingEnd)} • Lunch: ${formatToStandardTime(lunchStart)} - ${formatToStandardTime(lunchEnd)}`, 'success');

  renderHospitalDoctors(activeHosp.id);
}

// Standard Time Visiting helper functions (09:00 AM to 05:00 PM)
function updateVisitingStandardTimeDisplay() {
  const startEl = document.getElementById('doc-visiting-start');
  const endEl = document.getElementById('doc-visiting-end');
  const display = document.getElementById('visiting-standard-time-display');
  if (display && startEl && endEl) {
    const startVal = startEl.value || '09:00';
    const endVal = endEl.value || '17:00';
    display.innerHTML = `<i data-lucide="clock"></i> Standard Time: <strong>${formatToStandardTime(startVal)} – ${formatToStandardTime(endVal)} (Patient Visiting Time)</strong>`;
    if (window.lucide) window.lucide.createIcons();
  }
}

function setVisitingPreset(startVal, endVal, btnElement) {
  const startInput = document.getElementById('doc-visiting-start');
  const endInput = document.getElementById('doc-visiting-end');
  if (startInput && endInput) {
    startInput.value = startVal;
    endInput.value = endVal;
  }
  
  document.querySelectorAll('.btn-visiting-preset').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');

  updateVisitingStandardTimeDisplay();
  showToast(`Doctor visiting time set to Standard Time: ${formatToStandardTime(startVal)} - ${formatToStandardTime(endVal)}`, 'info');
}

// Standard Time Lunch helper functions (01:00 PM to 02:00 PM)
function updateLunchStandardTimeDisplay() {
  const startEl = document.getElementById('doc-lunch-start');
  const endEl = document.getElementById('doc-lunch-end');
  const display = document.getElementById('lunch-standard-time-display');
  if (display && startEl && endEl) {
    const startVal = startEl.value || '13:00';
    const endVal = endEl.value || '14:00';
    display.innerHTML = `<i data-lucide="coffee"></i> Standard Time: <strong>${formatToStandardTime(startVal)} – ${formatToStandardTime(endVal)} (Doctor Lunch Break)</strong>`;
    if (window.lucide) window.lucide.createIcons();
  }
}

function setLunchPreset(startVal, endVal, btnElement) {
  const startInput = document.getElementById('doc-lunch-start');
  const endInput = document.getElementById('doc-lunch-end');
  if (startInput && endInput) {
    startInput.value = startVal;
    endInput.value = endVal;
  }
  
  document.querySelectorAll('.btn-lunch-preset, .btn-time-preset').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');

  updateLunchStandardTimeDisplay();
  showToast(`Lunch break set to Standard Time: ${formatToStandardTime(startVal)} - ${formatToStandardTime(endVal)}`, 'info');
}

// Render Doctors for Active Hospital
function renderHospitalDoctors(hospitalId) {
  const doctors = getDoctors().filter(d => d.hospitalId === hospitalId);
  const container = document.getElementById('hospital-doctors-list');
  const countBadge = document.getElementById('doctor-roster-count');
  const statDoctors = document.getElementById('hosp-stat-doctors');

  if (countBadge) countBadge.textContent = `${doctors.length} Doctors`;
  if (statDoctors) statDoctors.textContent = doctors.length;

  if (!container) return;

  if (doctors.length === 0) {
    container.innerHTML = `
      <div class="empty-state-notice">
        <i data-lucide="stethoscope"></i>
        <p>No doctors added to this hospital yet. Use the form on the left to add doctors.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = doctors.map(doc => {
    const vStart = doc.visitingStart || '09:00';
    const vEnd = doc.visitingEnd || '17:00';
    const lStart = doc.lunchStart || '13:00';
    const lEnd = doc.lunchEnd || '14:00';

    return `
      <div class="doctor-item-card">
        <div class="doc-main-info">
          <div class="doc-avatar-round">${doc.name.replace('Dr. ', '').charAt(0)}</div>
          <div>
            <h4 class="doc-name-h4">${doc.name}</h4>
            <span class="doc-dept-tag">${doc.department}</span>
            <div class="doc-schedules-wrap">
              <span class="schedule-pill visiting" title="Patient Visiting Time">
                <i data-lucide="clock"></i> Visiting: ${formatToStandardTime(vStart)} – ${formatToStandardTime(vEnd)} Standard Time
              </span>
              <span class="schedule-pill lunch" title="Doctor Standard Lunch Break">
                <i data-lucide="coffee"></i> Lunch: ${formatToStandardTime(lStart)} – ${formatToStandardTime(lEnd)} Standard Time
              </span>
              <span class="schedule-pill leave" title="Doctor Leave Date">
                <i data-lucide="calendar-x"></i> Leave: ${doc.leavesDate}
              </span>
              <span class="schedule-pill fee" title="Consultation Fee">
                ₹${doc.fee}
              </span>
            </div>
          </div>
        </div>
        <div class="doc-actions-col">
          <button class="btn-icon-delete" onclick="deleteDoctor('${doc.id}')" title="Remove Doctor">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

async function deleteDoctor(docId) {
  if (!confirm('Are you sure you want to remove this doctor from the roster?')) return;
  await deleteDoctor_fs(docId);
  
  const activeHosp = getActiveHospital();
  if (activeHosp) renderHospitalDoctors(activeHosp.id);
  showToast('Doctor removed from hospital roster.', 'info');
}

// Render Today's Live Queue for Hospital Admin
function renderHospitalLiveQueue(hospitalId) {
  const appointments = getAppointments().filter(a => a.hospitalId === hospitalId);
  const queueContainer = document.getElementById('hospital-live-queue-list');
  const statQueue = document.getElementById('hosp-stat-queue');

  if (statQueue) statQueue.textContent = appointments.length;
  if (!queueContainer) return;

  if (appointments.length === 0) {
    queueContainer.innerHTML = `
      <div class="empty-state-notice">
        <i data-lucide="users"></i>
        <p>No active patients currently in queue today.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  queueContainer.innerHTML = appointments.map((apt, index) => {
    const locInfo = apt.locationCoords 
      ? `📍 ${apt.locationCoords.distanceKm} km away (~${apt.locationCoords.estMinutes} mins)`
      : `📍 Location not shared`;

    return `
      <div class="queue-admin-row">
        <div class="d-flex align-center gap-10">
          <span class="q-token-badge">${apt.tokenNumber}</span>
          <div class="q-patient-meta">
            <h5>${apt.patientName} <span class="badge-dept">${apt.doctorName}</span></h5>
            <p>${apt.appointmentDate} at ${apt.appointmentTime} • ${locInfo}</p>
          </div>
        </div>
        <div class="q-actions-group">
          ${apt.prescriptionName ? `<span class="badge-active-live" title="${apt.prescriptionName}"><i data-lucide="file-check"></i> Rx Attached</span>` : ''}
          <button class="btn-call-next" onclick="callNextPatient('${apt.id}')">
            <i data-lucide="bell"></i> Call Patient
          </button>
          <button class="btn-icon-delete" onclick="completePatientAppointment('${apt.id}')" title="Mark Done">
            <i data-lucide="check"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

function refreshHospitalQueueView() {
  const activeHosp = getActiveHospital();
  if (activeHosp) {
    renderHospitalLiveQueue(activeHosp.id);
    showToast('Queue data refreshed.', 'info');
  }
}

function callNextPatient(appointmentId) {
  const apts = getAppointments();
  const target = apts.find(a => a.id === appointmentId);
  if (target) {
    playNotificationChime();
    speakAiText(`Calling Token ${target.tokenNumber}, ${target.patientName}, please proceed to ${target.doctorName}'s consultation room.`);
    showToast(`Called Token ${target.tokenNumber} (${target.patientName})`, 'success');
  }
}

async function completePatientAppointment(appointmentId) {
  await deleteAppointment_fs(appointmentId);
  
  const activeHosp = getActiveHospital();
  if (activeHosp) renderHospitalLiveQueue(activeHosp.id);
  showToast('Patient consultation marked completed.', 'info');
}


// =============================================================================
// 4. PORTAL 2: PATIENT AUTH, SEARCH, BOOKING & QUEUE TOKEN
// =============================================================================

function togglePatientAuthTab(tab) {
  const loginBtn = document.getElementById('tab-btn-patient-login');
  const signupBtn = document.getElementById('tab-btn-patient-signup');
  const loginForm = document.getElementById('patient-login-form');
  const signupForm = document.getElementById('patient-signup-form');

  if (tab === 'login') {
    loginBtn.classList.add('active');
    signupBtn.classList.remove('active');
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
  } else {
    loginBtn.classList.remove('active');
    signupBtn.classList.add('active');
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
  }
  if (window.lucide) window.lucide.createIcons();
}

async function handlePatientSignup(event) {
  event.preventDefault();
  const submitBtn = event.target ? event.target.querySelector('button[type="submit"]') : null;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i data-lucide="loader-2" class="spin-icon"></i> Creating Profile...';
    if (window.lucide) window.lucide.createIcons();
  }

  try {
    const name = document.getElementById('patient-signup-name').value.trim();
    const gender = document.getElementById('patient-signup-gender').value;
    const dob = document.getElementById('patient-signup-dob').value;
    const bloodGroup = document.getElementById('patient-signup-blood').value;
    const email = document.getElementById('patient-signup-email').value.trim().toLowerCase();
    const address = document.getElementById('patient-signup-address').value.trim();
    const password = document.getElementById('patient-signup-password').value;

    if (!name || !gender || !dob || !bloodGroup || !email || !address || !password) {
      showToast('Please fill all patient registration fields.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="user-check"></i> Complete Sign Up & Enter Portal';
        if (window.lucide) window.lucide.createIcons();
      }
      return;
    }

    if (password.length < 4) {
      showToast('Password must be at least 4 characters long.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="user-check"></i> Complete Sign Up & Enter Portal';
        if (window.lucide) window.lucide.createIcons();
      }
      return;
    }

    const patients = getPatients();
    const existing = patients.find(p => (p.email || '').toLowerCase() === email);
    if (existing) {
      if (existing.password === password) {
        // User already created this account with this password — immediately log them in on this click!
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PATIENT, JSON.stringify(existing));
        showToast(`Welcome back, ${existing.name}! Logged in successfully.`, 'success');
        checkPatientSession();
        updateHeaderSessionDisplay();
        return;
      } else {
        showToast('An account with this email already exists. Please check password or login.', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i data-lucide="user-check"></i> Complete Sign Up & Enter Portal';
          if (window.lucide) window.lucide.createIcons();
        }
        return;
      }
    }

    const newPatient = {
      id: 'pat-' + Date.now(),
      name,
      gender,
      dob,
      bloodGroup,
      email,
      address,
      password,
      createdAt: new Date().toISOString()
    };

    // 1. Immediately store to active patient session & local cache (instant response on single click)
    savePatient(newPatient);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PATIENT, JSON.stringify(newPatient));

    // 2. Clear form
    const form = document.getElementById('patient-signup-form');
    if (form) form.reset();

    // 3. Instant UI transition to patient portal on the very first click!
    showToast(`Welcome, ${name}! Your health profile is ready.`, 'success');
    checkPatientSession();
    updateHeaderSessionDisplay();
  } catch (err) {
    console.error('Patient signup error:', err);
    showToast('Failed to complete registration: ' + (err.message || 'Unknown error'), 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i data-lucide="user-check"></i> Complete Sign Up & Enter Portal';
      if (window.lucide) window.lucide.createIcons();
    }
  }
}

function handlePatientLogin(event) {
  event.preventDefault();
  const nameInput = document.getElementById('patient-login-name');
  const name = nameInput ? nameInput.value.trim().toLowerCase() : '';
  const emailInput = document.getElementById('patient-login-email');
  const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
  const password = document.getElementById('patient-login-password').value;

  if (!password || (!email && !name)) {
    showToast('Please enter your email or name and password.', 'error');
    return;
  }

  const patients = getPatients();
  const matched = patients.find(p => {
    const pEmail = (p.email || '').toLowerCase();
    const pName = (p.name || '').toLowerCase();
    const emailMatch = email && pEmail === email;
    const nameMatch = name && pName === name;
    const identityMatch = (email && name) ? (emailMatch || nameMatch) : (emailMatch || nameMatch);
    return identityMatch && p.password === password;
  });

  if (!matched) {
    showToast('Invalid credentials. Please verify your email/name and password.', 'error');
    return;
  }

  localStorage.setItem(STORAGE_KEYS.ACTIVE_PATIENT, JSON.stringify(matched));
  showToast(`Welcome back, ${matched.name}!`, 'success');
  checkPatientSession();
  updateHeaderSessionDisplay();
}

function fillDemoPatient() {
  document.getElementById('patient-login-name').value = 'Alex Morgan';
  document.getElementById('patient-login-email').value = 'alex@care.com';
  document.getElementById('patient-login-password').value = 'password123';
}

function checkPatientSession() {
  const activePat = getActivePatient();
  const authContainer = document.getElementById('patient-auth-container');
  const dashboard = document.getElementById('patient-dashboard');

  if (activePat) {
    authContainer.style.display = 'none';
    dashboard.style.display = 'block';

    document.getElementById('patient-active-name').textContent = activePat.name;
    document.getElementById('patient-active-email').textContent = activePat.email;
    document.getElementById('patient-active-blood').textContent = activePat.bloodGroup || 'O+';
    document.getElementById('patient-active-address').textContent = activePat.address || 'Address on file';

    renderHospitalsList();
    checkPatientActiveToken();
  } else {
    authContainer.style.display = 'block';
    dashboard.style.display = 'none';
  }

  if (window.lucide) window.lucide.createIcons();
}

function logoutPatient() {
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_PATIENT);
  showToast('Patient session logged out.', 'info');
  checkPatientSession();
  updateHeaderSessionDisplay();
}

// Check if current patient has an active appointment/token
function checkPatientActiveToken() {
  const activePat = getActivePatient();
  if (!activePat) return;

  const banner = document.getElementById('active-token-banner');
  const apts = getAppointments();
  // Match patient by id or email or name
  const patientApt = apts.find(
    a => a.patientId === activePat.id || a.patientEmail === activePat.email || a.patientName === activePat.name
  );

  if (patientApt) {
    banner.style.display = 'block';
    document.getElementById('banner-token-number').textContent = patientApt.tokenNumber;
    document.getElementById('banner-token-doctor').textContent = patientApt.doctorName;
    document.getElementById('banner-token-hospital').textContent = patientApt.hospitalName;
    document.getElementById('banner-token-wait').textContent = `~${patientApt.estWaitMinutes || 12} Mins`;
    document.getElementById('banner-token-pos').textContent = `${patientApt.queuePosition || 1} Ahead`;

    const locBadge = document.getElementById('banner-token-location-status');
    if (patientApt.locationShared && patientApt.locationCoords) {
      locBadge.innerHTML = `<i data-lucide="navigation"></i> Location Shared: ~${patientApt.locationCoords.estMinutes} mins away`;
    } else {
      locBadge.innerHTML = `<i data-lucide="map-pin"></i> Location not shared`;
    }
  } else {
    banner.style.display = 'none';
  }

  if (window.lucide) window.lucide.createIcons();
}

async function cancelActiveAppointment() {
  const activePat = getActivePatient();
  if (!activePat) return;

  if (!confirm('Are you sure you want to cancel your active queue token?')) return;

  const apts = getAppointments();
  const toCancel = apts.find(
    a => a.patientId === activePat.id || a.patientEmail === activePat.email || a.patientName === activePat.name
  );
  if (toCancel) {
    await deleteAppointment_fs(toCancel.id);
  }
  
  showToast('Appointment and token cancelled.', 'info');
  checkPatientActiveToken();
}

// =============================================================================
// PATIENT BOOKING STATE & WORKFLOW
// =============================================================================
let selectedHospitalObj = null;
let selectedDoctorObj = null;
let sharedPatientLocation = null;
let uploadedPrescriptionMeta = null;

// Step 1: Render and search hospitals
function renderHospitalsList(query = '') {
  const container = document.getElementById('hospitals-search-results');
  if (!container) return;

  let hospitals = getHospitals();
  if (query.trim()) {
    const q = query.toLowerCase().trim();
    hospitals = hospitals.filter(
      h => h.name.toLowerCase().includes(q) || h.address.toLowerCase().includes(q)
    );
  }

  const doctors = getDoctors();

  if (hospitals.length === 0) {
    container.innerHTML = `
      <div class="empty-state-notice">
        <i data-lucide="search-x"></i>
        <p>No hospitals found matching "${query}". Try another hospital name.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = hospitals.map(hosp => {
    const docCount = doctors.filter(d => d.hospitalId === hosp.id).length;
    const isSelected = selectedHospitalObj && selectedHospitalObj.id === hosp.id;

    return `
      <div class="hospital-card-item ${isSelected ? 'selected' : ''}" onclick="selectHospital('${hosp.id}')">
        <div>
          <div class="hosp-head">
            <div class="hosp-icon-thumb"><i data-lucide="hospital"></i></div>
            <h4 class="hosp-name-title">${hosp.name}</h4>
          </div>
          <div class="hosp-card-body">
            <div class="hosp-info-row">
              <i data-lucide="map-pin"></i>
              <span>${hosp.address}</span>
            </div>
            <div class="hosp-info-row">
              <i data-lucide="credit-card"></i>
              <span>UPI: <code>${hosp.upiId}</code></span>
            </div>
          </div>
        </div>
        <div class="hosp-card-footer">
          <span class="doc-count-tag"><i data-lucide="stethoscope"></i> ${docCount} Doctors Available</span>
          <button class="btn-select-hosp" type="button">
            ${isSelected ? 'Selected' : 'Select Hospital'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

function handleHospitalSearch(query) {
  renderHospitalsList(query);
}

function clearHospitalSearch() {
  document.getElementById('patient-search-hospital-input').value = '';
  renderHospitalsList('');
}

// Select Hospital -> Advance to Step 2
function selectHospital(hospitalId) {
  const hospitals = getHospitals();
  selectedHospitalObj = hospitals.find(h => h.id === hospitalId);
  if (!selectedHospitalObj) return;

  // Update selected hospital summary
  const summary = document.getElementById('selected-hospital-summary');
  summary.style.display = 'flex';
  document.getElementById('selected-hosp-name-text').textContent = selectedHospitalObj.name;
  document.getElementById('selected-hosp-upi-text').textContent = `UPI: ${selectedHospitalObj.upiId} • ${selectedHospitalObj.address}`;

  // Update Step 1 active card
  renderHospitalsList(document.getElementById('patient-search-hospital-input').value);

  // Render doctors of this hospital in Step 2
  renderDoctorsSelection(selectedHospitalObj.id);

  // Scroll to Step 2
  document.getElementById('step-select-doctor').scrollIntoView({ behavior: 'smooth' });
}

function resetHospitalSelection() {
  selectedHospitalObj = null;
  selectedDoctorObj = null;
  document.getElementById('selected-hospital-summary').style.display = 'none';
  document.getElementById('doctors-selection-grid').innerHTML = `
    <div class="empty-state-notice">
      <i data-lucide="building"></i>
      <p>Please search and select a hospital in Step 1 to view available doctors.</p>
    </div>
  `;
  document.getElementById('selected-doctor-banner').style.display = 'none';
  document.getElementById('checkout-total-price').textContent = '₹0';
  document.getElementById('checkout-upi-id').textContent = 'Payable to: --';

  renderHospitalsList();
}

// Step 2: Render doctors of selected hospital
function renderDoctorsSelection(hospitalId) {
  const container = document.getElementById('doctors-selection-grid');
  const doctors = getDoctors().filter(d => d.hospitalId === hospitalId);

  if (doctors.length === 0) {
    container.innerHTML = `
      <div class="empty-state-notice">
        <i data-lucide="user-x"></i>
        <p>No doctors currently registered at this hospital. Please select another hospital or add doctors via Hospital Portal.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const formatTime = (timeStr) => {
    const [h, m] = timeStr.split(':');
    let hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${m} ${ampm}`;
  };

  container.innerHTML = doctors.map(doc => {
    const isSelected = selectedDoctorObj && selectedDoctorObj.id === doc.id;
    return `
      <div class="doctor-select-card ${isSelected ? 'selected' : ''}" onclick="selectDoctor('${doc.id}')">
        <div class="doc-sel-head">
          <div class="doc-sel-avatar">${doc.name.replace('Dr. ', '').charAt(0)}</div>
          <div>
            <h4 class="doc-sel-name">${doc.name}</h4>
            <span class="badge-dept">${doc.department}</span>
          </div>
        </div>

        <div class="doc-sel-specs">
          <div class="doc-spec-item">
            <span class="badge-visiting"><i data-lucide="clock"></i> Visiting: ${formatToStandardTime(doc.visitingStart || '09:00')} – ${formatToStandardTime(doc.visitingEnd || '17:00')} Standard Time</span>
          </div>
          <div class="doc-spec-item">
            <span class="badge-lunch"><i data-lucide="coffee"></i> Lunch: ${formatToStandardTime(doc.lunchStart || '13:00')} – ${formatToStandardTime(doc.lunchEnd || '14:00')} Standard Time</span>
          </div>
          <div class="doc-spec-item">
            <span class="badge-leaves"><i data-lucide="calendar-x"></i> Leave Date: ${doc.leavesDate}</span>
          </div>
          <div class="doc-spec-item">
            <span class="badge-fee">Consultation Fee: ₹${doc.fee}</span>
          </div>
          <div class="doc-spec-item">
            <i data-lucide="door-closed"></i> ${doc.room}
          </div>
        </div>

        <button class="btn-primary-gradient w-100" style="padding: 8px 12px; font-size: 0.85rem;" type="button">
          ${isSelected ? 'Selected' : 'Select Doctor & Schedule'}
        </button>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

// Standard Time Appointment Slots Definition (09:00 AM to 05:00 PM Standard Time)
const STANDARD_TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00'
];

function renderStandardTimeSlots() {
  const container = document.getElementById('standard-time-slots-grid');
  if (!container) return;

  const currentVal = document.getElementById('book-time').value;

  const toMinutes = (t) => {
    if (!t) return -1;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const visitingStart = selectedDoctorObj ? (selectedDoctorObj.visitingStart || '09:00') : '09:00';
  const visitingEnd = selectedDoctorObj ? (selectedDoctorObj.visitingEnd || '17:00') : '17:00';
  const lunchStart = selectedDoctorObj ? (selectedDoctorObj.lunchStart || '13:00') : '13:00';
  const lunchEnd = selectedDoctorObj ? (selectedDoctorObj.lunchEnd || '14:00') : '14:00';

  const vStartMin = toMinutes(visitingStart);
  const vEndMin = toMinutes(visitingEnd);
  const lunchStartMin = toMinutes(lunchStart);
  const lunchEndMin = toMinutes(lunchEnd);

  container.innerHTML = STANDARD_TIME_SLOTS.map(slot => {
    const slotMin = toMinutes(slot);
    const isLunch = lunchStartMin !== -1 && (slotMin >= lunchStartMin && slotMin < lunchEndMin);
    const isOutsideVisiting = slotMin < vStartMin || slotMin > vEndMin;
    const isDisabled = isLunch || isOutsideVisiting;
    const isSelected = currentVal === slot;
    const stdLabel = formatToStandardTime(slot);

    let badge = '';
    let title = '';
    if (isLunch) {
      badge = '<span class="slot-status-tag" style="color:var(--accent-amber);">Lunch Break</span>';
      title = `Doctor Lunch Break: ${formatToStandardTime(lunchStart)} to ${formatToStandardTime(lunchEnd)} Standard Time`;
    } else if (isOutsideVisiting) {
      badge = '<span class="slot-status-tag" style="color:var(--accent-rose);">Closed</span>';
      title = `Outside Visiting Hours: ${formatToStandardTime(visitingStart)} to ${formatToStandardTime(visitingEnd)}`;
    }

    return `
      <button type="button" 
        class="time-slot-btn ${isSelected ? 'active' : ''} ${isDisabled ? 'disabled-lunch' : ''}" 
        ${isDisabled ? `title="${title}" disabled` : `onclick="selectStandardTimeSlot('${slot}')"`}>
        <span>${stdLabel}</span>
        ${badge}
      </button>
    `;
  }).join('');
}

function selectStandardTimeSlot(slotValue) {
  const input = document.getElementById('book-time');
  if (input) {
    input.value = slotValue;
    onAppointmentTimeInputChange(slotValue);
  }
}

function onAppointmentTimeInputChange(timeVal) {
  const displayText = document.getElementById('book-standard-text');
  if (displayText) {
    displayText.textContent = `${formatToStandardTime(timeVal)} (IST Standard Time)`;
  }
  renderStandardTimeSlots();
  validateAppointmentTime(timeVal);
}

// Select Doctor -> Advance to Step 3
function selectDoctor(doctorId) {
  const doctors = getDoctors();
  selectedDoctorObj = doctors.find(d => d.id === doctorId);
  if (!selectedDoctorObj) return;

  // Highlight in grid
  renderDoctorsSelection(selectedHospitalObj.id);

  const vStart = selectedDoctorObj.visitingStart || '09:00';
  const vEnd = selectedDoctorObj.visitingEnd || '17:00';
  const lStart = selectedDoctorObj.lunchStart || '13:00';
  const lEnd = selectedDoctorObj.lunchEnd || '14:00';

  // Update Step 3 Selected Doctor Banner
  const banner = document.getElementById('selected-doctor-banner');
  banner.style.display = 'flex';
  document.getElementById('sel-doc-name').textContent = selectedDoctorObj.name;
  document.getElementById('sel-doc-dept').textContent = selectedDoctorObj.department;
  document.getElementById('sel-doc-fee').textContent = `Fee: ₹${selectedDoctorObj.fee}`;
  
  const visitingBadge = document.getElementById('sel-doc-visiting');
  if (visitingBadge) {
    visitingBadge.innerHTML = `<i data-lucide="clock"></i> Visiting: ${formatToStandardTime(vStart)} – ${formatToStandardTime(vEnd)} (Standard Time)`;
  }
  document.getElementById('sel-doc-lunch').innerHTML = `<i data-lucide="coffee"></i> Lunch: ${formatToStandardTime(lStart)} – ${formatToStandardTime(lEnd)} (Standard Time)`;
  document.getElementById('sel-doc-leaves').innerHTML = `<i data-lucide="calendar-x"></i> Leave Date: ${selectedDoctorObj.leavesDate}`;

  // Update Notice Banner
  const noticeVisiting = document.getElementById('notice-visiting-time');
  if (noticeVisiting) noticeVisiting.textContent = `${formatToStandardTime(vStart)} – ${formatToStandardTime(vEnd)} (Standard Time)`;
  const noticeLunch = document.getElementById('notice-lunch-time');
  if (noticeLunch) noticeLunch.textContent = `${formatToStandardTime(lStart)} – ${formatToStandardTime(lEnd)} (Standard Time)`;

  // Update Checkout Price
  document.getElementById('checkout-total-price').textContent = `₹${selectedDoctorObj.fee}`;
  document.getElementById('checkout-upi-id').textContent = `Payable to: ${selectedHospitalObj.upiId}`;

  // Pre-fill date with today or tomorrow if doctor is not on leave
  const dateInput = document.getElementById('book-date');
  const todayStr = new Date().toISOString().split('T')[0];
  if (!dateInput.value) {
    dateInput.value = todayStr;
  }
  validateAppointmentDate(dateInput.value);

  // Pre-fill time with standard slot (10:00 AM)
  const timeInput = document.getElementById('book-time');
  if (!timeInput.value || timeInput.value === '13:00' || timeInput.value === '13:30') {
    timeInput.value = '10:00';
  }
  onAppointmentTimeInputChange(timeInput.value);
  renderStandardTimeSlots();

  // Scroll to Step 3
  document.getElementById('step-booking-actions').scrollIntoView({ behavior: 'smooth' });
  if (window.lucide) window.lucide.createIcons();
}

// Validate Appointment Date against Doctor's Leave Dates
function validateAppointmentDate(dateValue) {
  const alertBox = document.getElementById('date-validation-alert');
  if (!selectedDoctorObj) {
    alertBox.style.display = 'none';
    return true;
  }

  // Check if date is in past
  const todayStr = new Date().toISOString().split('T')[0];
  if (dateValue < todayStr) {
    alertBox.className = 'validation-msg error';
    alertBox.style.display = 'block';
    alertBox.innerHTML = '<i data-lucide="alert-circle"></i> Appointment date cannot be in the past!';
    if (window.lucide) window.lucide.createIcons();
    return false;
  }

  // Check against doctor leaves
  if (dateValue === selectedDoctorObj.leavesDate) {
    alertBox.className = 'validation-msg error';
    alertBox.style.display = 'block';
    alertBox.innerHTML = `<strong>Doctor on Leave!</strong> ${selectedDoctorObj.name} is on scheduled leave on ${dateValue}. Please select another date.`;
    return false;
  } else {
    alertBox.className = 'validation-msg success';
    alertBox.style.display = 'block';
    alertBox.innerHTML = `<i data-lucide="check-circle-2"></i> Doctor is available on ${dateValue}.`;
    if (window.lucide) window.lucide.createIcons();
    return true;
  }
}

// Validate Appointment Time against Doctor's Visiting Hours & Lunch Break
function validateAppointmentTime(timeValue) {
  const alertBox = document.getElementById('time-validation-alert');
  if (!selectedDoctorObj) {
    alertBox.style.display = 'none';
    return true;
  }

  const visitingStart = selectedDoctorObj.visitingStart || '09:00';
  const visitingEnd = selectedDoctorObj.visitingEnd || '17:00';
  const lunchStart = selectedDoctorObj.lunchStart || '13:00';
  const lunchEnd = selectedDoctorObj.lunchEnd || '14:00';

  const toMinutes = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const selMin = toMinutes(timeValue);
  const vStartMin = toMinutes(visitingStart);
  const vEndMin = toMinutes(visitingEnd);
  const startMin = toMinutes(lunchStart);
  const endMin = toMinutes(lunchEnd);

  // Check if within Doctor Visiting Hours (09:00 AM to 05:00 PM)
  if (selMin < vStartMin || selMin > vEndMin) {
    alertBox.className = 'validation-msg error';
    alertBox.style.display = 'block';
    alertBox.innerHTML = `<strong>Outside Visiting Hours!</strong> Doctor visiting time for ${selectedDoctorObj.name} is from ${formatToStandardTime(visitingStart)} to ${formatToStandardTime(visitingEnd)} (Standard Time). Please select a time within visiting hours.`;
    if (window.lucide) window.lucide.createIcons();
    return false;
  }

  // Check if during Doctor Lunch Break (01:00 PM to 02:00 PM)
  if (selMin >= startMin && selMin < endMin) {
    alertBox.className = 'validation-msg error';
    alertBox.style.display = 'block';
    alertBox.innerHTML = `<strong>Doctor Lunch Break!</strong> ${selectedDoctorObj.name} is on lunch break from ${formatToStandardTime(lunchStart)} to ${formatToStandardTime(lunchEnd)} (Standard Time). Please select another slot.`;
    if (window.lucide) window.lucide.createIcons();
    return false;
  }

  alertBox.className = 'validation-msg success';
  alertBox.style.display = 'block';
  alertBox.innerHTML = `<i data-lucide="check-circle-2"></i> ${formatToStandardTime(timeValue)} is within regular standard visiting hours (${formatToStandardTime(visitingStart)} – ${formatToStandardTime(visitingEnd)}).`;
  if (window.lucide) window.lucide.createIcons();
  return true;
}

// Location Sharing API
function handleShareLocation() {
  const btn = document.getElementById('btn-share-location');
  const btnText = document.getElementById('location-btn-text');
  const displayBox = document.getElementById('location-coords-display');
  const coordsText = document.getElementById('coords-text');

  btnText.textContent = 'Acquiring GPS Signal...';

  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4);
        const lng = pos.coords.longitude.toFixed(4);

        // Calculate simulated distance & travel time
        const distanceKm = (Math.random() * 4 + 0.8).toFixed(1);
        const estMinutes = Math.round(distanceKm * 3.5);

        sharedPatientLocation = {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          distanceKm: parseFloat(distanceKm),
          estMinutes
        };

        btnText.textContent = 'Location Shared Successfully';
        btn.classList.add('btn-success');
        displayBox.style.display = 'inline-flex';
        coordsText.textContent = `Lat: ${lat}° N, Lng: ${lng}° E (${distanceKm} km to clinic, ~${estMinutes} mins arrival time)`;

        showToast(`Location shared: ~${distanceKm} km from hospital.`, 'success');
      },
      (err) => {
        // Fallback simulation if browser permission denied
        console.warn('Geolocation denied or unavailable, using simulated GPS coordinates:', err);
        const lat = 12.9716;
        const lng = 77.5946;
        const distanceKm = 2.1;
        const estMinutes = 10;

        sharedPatientLocation = { lat, lng, distanceKm, estMinutes };

        btnText.textContent = 'Location Shared (Simulated GPS)';
        displayBox.style.display = 'inline-flex';
        coordsText.textContent = `Lat: ${lat}° N, Lng: ${lng}° E (${distanceKm} km to clinic, ~${estMinutes} mins arrival time)`;

        showToast('Live location shared with hospital queue system.', 'info');
      },
      { timeout: 8000 }
    );
  } else {
    showToast('Geolocation not supported by this browser.', 'error');
  }
}

// Prescription Upload & Preview
function handlePrescriptionFile(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];

  const reader = new FileReader();
  reader.onload = function(e) {
    uploadedPrescriptionMeta = {
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      type: file.type,
      dataUrl: e.target.result
    };

    // Show preview card
    document.getElementById('prescription-dropzone').style.display = 'none';
    const previewCard = document.getElementById('prescription-preview-card');
    previewCard.style.display = 'flex';
    document.getElementById('preview-filename').textContent = file.name;
    document.getElementById('preview-filesize').textContent = `${uploadedPrescriptionMeta.size} • AI Health Scan Ready`;

    const mediaContainer = document.getElementById('preview-media-container');
    if (file.type.startsWith('image/')) {
      mediaContainer.innerHTML = `<img src="${e.target.result}" alt="Prescription Thumbnail">`;
    } else {
      mediaContainer.innerHTML = `<i data-lucide="file-text" style="color: var(--accent-cyan); width: 28px; height: 28px;"></i>`;
    }

    if (window.lucide) window.lucide.createIcons();
    showToast(`Prescription "${file.name}" uploaded & attached!`, 'success');
  };
  reader.readAsDataURL(file);
}

function removePrescriptionFile() {
  uploadedPrescriptionMeta = null;
  document.getElementById('prescription-file-input').value = '';
  document.getElementById('prescription-dropzone').style.display = 'block';
  document.getElementById('prescription-preview-card').style.display = 'none';
  showToast('Prescription removed.', 'info');
}

// Initiate Booking -> Open Payment Modal
function handleInitiateBooking(event) {
  event.preventDefault();

  if (!selectedHospitalObj) {
    showToast('Please search and select a hospital in Step 1.', 'error');
    document.getElementById('step-search-hospital').scrollIntoView({ behavior: 'smooth' });
    return;
  }

  if (!selectedDoctorObj) {
    showToast('Please select a doctor in Step 2.', 'error');
    document.getElementById('step-select-doctor').scrollIntoView({ behavior: 'smooth' });
    return;
  }

  const dateVal = document.getElementById('book-date').value;
  const timeVal = document.getElementById('book-time').value;

  if (!validateAppointmentDate(dateVal)) {
    showToast('Selected date is invalid or doctor is on leave!', 'error');
    return;
  }

  if (!validateAppointmentTime(timeVal)) {
    showToast('Selected time falls during doctor lunch break!', 'error');
    return;
  }

  // Open Payment Gateway Modal
  openPaymentModal();
}


// =============================================================================
// 5. UPI PAYMENT MODAL & QR CODE GENERATION
// =============================================================================
function openPaymentModal() {
  if (!selectedHospitalObj || !selectedDoctorObj) return;

  const modal = document.getElementById('payment-modal');
  modal.style.display = 'flex';

  document.getElementById('modal-pay-hosp-name').textContent = selectedHospitalObj.name;
  document.getElementById('modal-pay-doc-name').textContent = selectedDoctorObj.name;
  document.getElementById('modal-pay-dept').textContent = selectedDoctorObj.department;
  document.getElementById('modal-pay-upi-id').textContent = selectedHospitalObj.upiId;
  document.getElementById('modal-pay-amount').textContent = `₹${selectedDoctorObj.fee}`;

  // Generate UPI QR Code on Canvas
  drawUpiQrCodeCanvas(selectedHospitalObj.upiId, selectedDoctorObj.fee, selectedHospitalObj.name);

  if (window.lucide) window.lucide.createIcons();
}

function closePaymentModal() {
  document.getElementById('payment-modal').style.display = 'none';
}

// Draw high-fidelity QR Code simulation on HTML5 Canvas
function drawUpiQrCodeCanvas(upiId, amount, hospitalName) {
  const canvas = document.getElementById('upi-qr-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 200;
  canvas.width = size;
  canvas.height = size;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // Generate pseudo-deterministic QR matrix pattern
  ctx.fillStyle = '#070B14';
  const gridSize = 25;
  const cellSize = size / gridSize;

  // Draw 3 Corner Position Detection Patterns
  function drawFinderPattern(startX, startY) {
    ctx.fillStyle = '#070B14';
    ctx.fillRect(startX * cellSize, startY * cellSize, 7 * cellSize, 7 * cellSize);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect((startX + 1) * cellSize, (startY + 1) * cellSize, 5 * cellSize, 5 * cellSize);
    ctx.fillStyle = '#070B14';
    ctx.fillRect((startX + 2) * cellSize, (startY + 2) * cellSize, 3 * cellSize, 3 * cellSize);
  }

  drawFinderPattern(0, 0);                 // Top-Left
  drawFinderPattern(gridSize - 7, 0);      // Top-Right
  drawFinderPattern(0, gridSize - 7);      // Bottom-Left

  // Draw pseudo-random QR data cells based on UPI ID and Amount
  const seedString = `${upiId}:${amount}:${hospitalName}`;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }

  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      // Don't overwrite corner finder patterns or center
      const inTopLeft = x < 8 && y < 8;
      const inTopRight = x > gridSize - 9 && y < 8;
      const inBottomLeft = x < 8 && y > gridSize - 9;
      const inCenter = x >= 10 && x <= 14 && y >= 10 && y <= 14;

      if (!inTopLeft && !inTopRight && !inBottomLeft && !inCenter) {
        const val = Math.sin(x * 12.9898 + y * 78.233 + hash) * 43758.5453;
        if ((val - Math.floor(val)) > 0.48) {
          ctx.fillStyle = '#070B14';
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  // Draw Center Icon Circle
  ctx.fillStyle = '#00F2FE';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#070B14';
  ctx.font = 'bold 12px Inter';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('UPI', size / 2, size / 2);
}

async function confirmPaymentAndGenerateToken() {
  const activePat = getActivePatient();
  if (!activePat) {
    showToast('Please login as a patient to confirm appointment.', 'error');
    return;
  }

  const dateVal = document.getElementById('book-date').value;
  const timeVal = document.getElementById('book-time').value;

  // Generate Unique Token (e.g. #TQ-104)
  const existingApts = getAppointments();
  const tokenNumber = `#TQ-${100 + existingApts.length + 1}`;

  // Calculate dynamic queue position & wait time
  const doctorCurrentQueue = existingApts.filter(a => a.doctorId === selectedDoctorObj.id);
  const queuePos = doctorCurrentQueue.length + 1;
  const estWait = queuePos * 12; // 12 mins per patient average

  const newAppointment = {
    id: 'apt-' + Date.now(),
    tokenNumber,
    patientId: activePat.id,
    patientName: activePat.name,
    patientEmail: activePat.email,
    hospitalId: selectedHospitalObj.id,
    hospitalName: selectedHospitalObj.name,
    doctorId: selectedDoctorObj.id,
    doctorName: selectedDoctorObj.name,
    appointmentDate: dateVal,
    appointmentTime: `${formatToStandardTime(timeVal)} (Standard Time)`,
    appointmentTimeRaw: timeVal,
    amountPaid: selectedDoctorObj.fee,
    upiId: selectedHospitalObj.upiId,
    locationShared: !!sharedPatientLocation,
    locationCoords: sharedPatientLocation,
    prescriptionData: uploadedPrescriptionMeta ? uploadedPrescriptionMeta.dataUrl : null,
    prescriptionName: uploadedPrescriptionMeta ? uploadedPrescriptionMeta.name : null,
    status: 'Confirmed in Queue',
    queuePosition: queuePos,
    estWaitMinutes: estWait,
    createdAt: new Date().toISOString()
  };

  await saveAppointment(newAppointment);

  // Close Payment Modal
  closePaymentModal();

  // Trigger celebration sound & confetti!
  playNotificationChime();
  if (window.confetti) {
    window.confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  }

  // Open Token Success Modal Pass
  openTokenSuccessModal(newAppointment);
  checkPatientActiveToken();
}

function openTokenSuccessModal(appointment) {
  const modal = document.getElementById('token-success-modal');
  modal.style.display = 'flex';

  document.getElementById('modal-token-number').textContent = appointment.tokenNumber;
  document.getElementById('pass-patient-name').textContent = appointment.patientName;
  document.getElementById('pass-doctor-name').textContent = appointment.doctorName;
  document.getElementById('pass-hospital-name').textContent = appointment.hospitalName;
  document.getElementById('pass-appointment-time').textContent = `${appointment.appointmentDate} at ${appointment.appointmentTime}`;
  document.getElementById('pass-wait-time').textContent = `~${appointment.estWaitMinutes} Minutes`;
  document.getElementById('pass-generated-date').textContent = new Date().toLocaleDateString();

  speakAiText(`Congratulations ${appointment.patientName}! Your appointment is confirmed with token number ${appointment.tokenNumber}. Estimated waiting time is ${appointment.estWaitMinutes} minutes.`);

  if (window.lucide) window.lucide.createIcons();
}

function closeTokenModalAndTrack() {
  document.getElementById('token-success-modal').style.display = 'none';
  checkPatientActiveToken();
  const banner = document.getElementById('active-token-banner');
  if (banner) {
    banner.scrollIntoView({ behavior: 'smooth' });
  }
}


// =============================================================================
// 6. PORTAL 3: VOICE ASSISTANT AI (MIC + SPEECH RECOGNITION + INTENTS)
// =============================================================================
let isListening = false;
let speechRecognizer = null;
let speechEnabled = true;

// Speech Synthesis (TTS)
function speakAiText(text) {
  if (!speechEnabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel(); // Stop current speech

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.05;

  // Try to use a pleasant English voice
  const voices = window.speechSynthesis.getVoices();
  const femaleVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
  if (femaleVoice) {
    utterance.voice = femaleVoice;
  }

  window.speechSynthesis.speak(utterance);
}

function toggleSpeechSynthesis() {
  speechEnabled = !speechEnabled;
  const label = document.getElementById('tts-label');
  const icon = document.getElementById('voice-tts-icon');
  if (speechEnabled) {
    label.textContent = 'Voice On';
    icon.setAttribute('data-lucide', 'volume-2');
    showToast('Voice feedback enabled.', 'info');
  } else {
    label.textContent = 'Voice Off';
    icon.setAttribute('data-lucide', 'volume-x');
    window.speechSynthesis.cancel();
    showToast('Voice feedback muted.', 'info');
  }
  if (window.lucide) window.lucide.createIcons();
}

// Audio notification chime
function playNotificationChime() {
  try {
    const audio = document.getElementById('audio-chime');
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  } catch (e) {
    // Audio autoplay restrictions
  }
}

// Setup Speech Recognition
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('SpeechRecognition API not supported in this browser.');
    return null;
  }

  const recognizer = new SpeechRecognition();
  recognizer.continuous = false;
  recognizer.interimResults = true;
  recognizer.lang = 'en-US';

  recognizer.onstart = function() {
    isListening = true;
    updateMicVisualState(true);
    document.getElementById('ai-voice-status').innerHTML = '<i data-lucide="radio" class="pulse-icon text-accent"></i> Listening to your voice...';
    if (window.lucide) window.lucide.createIcons();
  };

  recognizer.onresult = function(event) {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      transcript += event.results[i][0].transcript;
    }

    document.getElementById('user-transcript-text').textContent = `"${transcript}"`;

    if (event.results[0].isFinal) {
      processVoiceCommand(transcript);
    }
  };

  recognizer.onerror = function(event) {
    console.error('Speech recognition error:', event.error);
    isListening = false;
    updateMicVisualState(false);
    document.getElementById('ai-voice-status').innerHTML = '<i data-lucide="bot"></i> Voice Assistant Ready';
    if (event.error === 'not-allowed') {
      showToast('Microphone access denied. You can still type commands in the text box below!', 'error');
    }
    if (window.lucide) window.lucide.createIcons();
  };

  recognizer.onend = function() {
    isListening = false;
    updateMicVisualState(false);
    document.getElementById('ai-voice-status').innerHTML = '<i data-lucide="bot"></i> Voice Assistant Ready';
    if (window.lucide) window.lucide.createIcons();
  };

  return recognizer;
}

function updateMicVisualState(listening) {
  const micBtn = document.getElementById('btn-master-mic');
  const bubble = document.getElementById('mic-status-bubble');
  if (listening) {
    micBtn.classList.add('listening');
    bubble.textContent = 'Listening... Speak Now';
  } else {
    micBtn.classList.remove('listening');
    bubble.textContent = 'Tap to Speak';
  }
}

function toggleVoiceListening() {
  if (!speechRecognizer) {
    speechRecognizer = initSpeechRecognition();
  }

  if (!speechRecognizer) {
    showToast('Speech Recognition not supported in this browser. Please use the command bar below!', 'info');
    return;
  }

  if (isListening) {
    speechRecognizer.stop();
  } else {
    try {
      speechRecognizer.start();
    } catch (e) {
      console.warn('Recognition already started or error:', e);
    }
  }
}

// Execute Voice Command via Text Input (for browsers without mic or denied permission)
function executeVoiceCommandText(text) {
  if (!text || !text.trim()) return;
  document.getElementById('voice-fallback-input').value = '';
  document.getElementById('user-transcript-text').textContent = `"${text}"`;
  processVoiceCommand(text);
}

function simulateVoiceCommand(cmdText) {
  document.getElementById('user-transcript-text').textContent = `"${cmdText}"`;
  processVoiceCommand(cmdText);
}

// Core Voice Intent Processor & Auto-Navigation Engine
function processVoiceCommand(rawText) {
  const cmd = rawText.toLowerCase().trim();
  const aiResponseBox = document.getElementById('ai-response-text');
  let responseText = '';

  playNotificationChime();

  // 1. HOSPITAL PORTAL INTENTS
  if (cmd.includes('hospital portal') || cmd.includes('hospital page') || cmd.includes('hospital administration') || cmd.includes('doctor portal')) {
    responseText = 'Opening the Hospital Portal for you right now.';
    aiResponseBox.innerHTML = `Understood: <strong>"Hospital Portal"</strong>. Navigating to Hospital Operations and Doctor Roster...`;
    speakAiText(responseText);
    setTimeout(() => switchPortal('portal-hospital'), 600);
    return;
  }

  if (cmd.includes('sign up as hospital') || cmd.includes('hospital sign up') || cmd.includes('register hospital')) {
    responseText = 'Opening the Hospital Sign Up registration form.';
    aiResponseBox.innerHTML = `Opening: <strong>"Hospital Sign Up"</strong>. Enter hospital name, password, UPI ID, and address.`;
    speakAiText(responseText);
    switchPortal('portal-hospital');
    toggleHospitalAuthTab('signup');
    return;
  }

  if (cmd.includes('hospital login') || cmd.includes('login to hospital') || cmd.includes('doctor login')) {
    responseText = 'Opening the Hospital Login screen.';
    aiResponseBox.innerHTML = `Opening: <strong>"Hospital Login"</strong>. Please enter your hospital credentials.`;
    speakAiText(responseText);
    switchPortal('portal-hospital');
    toggleHospitalAuthTab('login');
    return;
  }

  if (cmd.includes('add doctor') || cmd.includes('new doctor') || cmd.includes('add new doctor') || cmd.includes('roster')) {
    responseText = 'Navigating to Add Doctor section in the Hospital Portal.';
    aiResponseBox.innerHTML = `Opening: <strong>"Add Doctor Form"</strong>. You can configure department, leaves date, lunch hours, and consultation fee.`;
    speakAiText(responseText);
    switchPortal('portal-hospital');
    setTimeout(() => {
      const docForm = document.getElementById('add-doctor-form');
      if (docForm) docForm.scrollIntoView({ behavior: 'smooth' });
    }, 500);
    return;
  }

  // 2. PATIENT PORTAL INTENTS
  if (cmd.includes('patient portal') || cmd.includes('book doctor') || cmd.includes('make appointment') || cmd.includes('patient care')) {
    responseText = 'Opening Patient Portal to search hospitals and book your appointment.';
    aiResponseBox.innerHTML = `Understood: <strong>"Patient Portal"</strong>. Opening hospital search, doctor selection, and smart queue token pass.`;
    speakAiText(responseText);
    setTimeout(() => switchPortal('portal-patient'), 600);
    return;
  }

  if (cmd.includes('sign up patient') || cmd.includes('sign up as patient') || cmd.includes('patient sign up') || cmd.includes('register patient')) {
    responseText = 'Opening the Patient Registration form.';
    aiResponseBox.innerHTML = `Opening: <strong>"Patient Sign Up"</strong>. Please enter your personal details, blood group, address, and password.`;
    speakAiText(responseText);
    switchPortal('portal-patient');
    togglePatientAuthTab('signup');
    return;
  }

  if (cmd.includes('patient login') || cmd.includes('login patient') || cmd.includes('login as patient')) {
    responseText = 'Opening Patient Login form.';
    aiResponseBox.innerHTML = `Opening: <strong>"Patient Login"</strong>. Enter your name, registered email, and password.`;
    speakAiText(responseText);
    switchPortal('portal-patient');
    togglePatientAuthTab('login');
    return;
  }

  // Search hospital by voice (e.g. "Search hospital Apollo", "Find hospital Metro")
  if (cmd.includes('search hospital') || cmd.includes('find hospital')) {
    const searchPart = cmd.replace('search hospital', '').replace('find hospital', '').trim();
    responseText = searchPart 
      ? `Searching for hospitals matching "${searchPart}".`
      : 'Opening hospital search in Patient Portal.';
    aiResponseBox.innerHTML = `Searching: <strong>"${searchPart || 'All Hospitals'}"</strong>. Directing you to matching results.`;
    speakAiText(responseText);
    switchPortal('portal-patient');
    setTimeout(() => {
      const searchInput = document.getElementById('patient-search-hospital-input');
      if (searchInput) {
        searchInput.value = searchPart;
        handleHospitalSearch(searchPart);
        searchInput.focus();
      }
    }, 500);
    return;
  }

  // 3. SMART FEATURES INTENTS
  if (cmd.includes('share location') || cmd.includes('my location') || cmd.includes('share my location') || cmd.includes('gps')) {
    responseText = 'Sharing your live location with the clinic queue system.';
    aiResponseBox.innerHTML = `Executing: <strong>"Share Location"</strong>. Calculating distance and estimated travel time to the hospital.`;
    speakAiText(responseText);
    switchPortal('portal-patient');
    setTimeout(() => {
      handleShareLocation();
      const locBtn = document.getElementById('btn-share-location');
      if (locBtn) locBtn.scrollIntoView({ behavior: 'smooth' });
    }, 600);
    return;
  }

  if (cmd.includes('upload prescription') || cmd.includes('upload my prescription') || cmd.includes('prescription')) {
    responseText = 'Opening prescription file uploader for your appointment.';
    aiResponseBox.innerHTML = `Opening: <strong>"Prescription Uploader"</strong>. You can attach medical documents or prior prescriptions.`;
    speakAiText(responseText);
    switchPortal('portal-patient');
    setTimeout(() => {
      const dropzone = document.getElementById('prescription-dropzone');
      if (dropzone) {
        dropzone.scrollIntoView({ behavior: 'smooth' });
        document.getElementById('prescription-file-input').click();
      }
    }, 600);
    return;
  }

  if (cmd.includes('option to pay') || cmd.includes('pay fee') || cmd.includes('payment') || cmd.includes('pay consultation')) {
    responseText = 'Opening the UPI Payment Gateway for your consultation.';
    aiResponseBox.innerHTML = `Opening: <strong>"UPI Payment Gateway"</strong>. Scan the dynamic QR code with any UPI app to pay and generate your token.`;
    speakAiText(responseText);
    switchPortal('portal-patient');
    setTimeout(() => {
      if (!selectedHospitalObj || !selectedDoctorObj) {
        // Auto-select first hospital & doctor if not selected
        const hospitals = getHospitals();
        const doctors = getDoctors();
        if (hospitals.length && doctors.length) {
          selectHospital(hospitals[0].id);
          selectDoctor(doctors[0].id);
        }
      }
      openPaymentModal();
    }, 700);
    return;
  }

  if (cmd.includes('check queue') || cmd.includes('my token') || cmd.includes('queue status') || cmd.includes('waiting time')) {
    const activePat = getActivePatient();
    const apts = getAppointments();
    const patientApt = activePat ? apts.find(a => a.patientId === activePat.id || a.patientEmail === activePat.email) : null;

    if (patientApt) {
      responseText = `Your queue token is ${patientApt.tokenNumber}. You have ${patientApt.queuePosition || 1} patients ahead. Estimated waiting time is ${patientApt.estWaitMinutes || 12} minutes.`;
      aiResponseBox.innerHTML = `Queue Status: Token <strong>${patientApt.tokenNumber}</strong>. Position: <strong>${patientApt.queuePosition || 1} ahead</strong>. Est. Wait: <strong>~${patientApt.estWaitMinutes || 12} mins</strong>.`;
    } else {
      responseText = 'Opening Patient Portal to check your live queue token.';
      aiResponseBox.innerHTML = `Checking: <strong>"Live Queue Token"</strong>. Directing to patient queue tracker.`;
    }

    speakAiText(responseText);
    switchPortal('portal-patient');
    setTimeout(() => {
      const banner = document.getElementById('active-token-banner');
      if (banner && banner.style.display !== 'none') {
        banner.scrollIntoView({ behavior: 'smooth' });
      }
    }, 600);
    return;
  }

  if (cmd.includes('visiting time') || cmd.includes('visiting hours') || cmd.includes('doctor time') || cmd.includes('lunch time') || cmd.includes('doctor hours') || cmd.includes('timing')) {
    responseText = 'Doctor visiting hours are 09:00 AM to 05:00 PM Standard Time, with lunch break from 01:00 PM to 02:00 PM.';
    aiResponseBox.innerHTML = `Schedule: Patient Visiting Time is <strong>09:00 AM – 05:00 PM Standard Time</strong>. Lunch break is <strong>01:00 PM – 02:00 PM</strong>.`;
    speakAiText(responseText);
    switchPortal('portal-patient');
    return;
  }

  // Fallback for general voice queries
  responseText = `I heard: "${rawText}". You can ask me to open Hospital Portal, sign up, book a doctor, search hospitals, share location, pay fee, or check queue status!`;
  aiResponseBox.innerHTML = `I heard: <em>"${rawText}"</em>. Here are commands I can execute for you: <strong>"Open Hospital Portal"</strong>, <strong>"Book Doctor"</strong>, <strong>"Share Location"</strong>, <strong>"Pay Fee"</strong>, or <strong>"Check Queue Token"</strong>.`;
  speakAiText(responseText);
}

// Dynamic Audio Waveform Canvas Animation
function initWaveformAnimation() {
  const canvas = document.getElementById('audio-waveform-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let animationFrameId;
  let phase = 0;

  function renderWave() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Wave parameters change if listening
    const amplitude = isListening ? 28 : 10;
    const frequency = isListening ? 0.04 : 0.02;
    const speed = isListening ? 0.09 : 0.03;

    // Draw Cyan Sine Wave
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#00F2FE';
    for (let x = 0; x < canvas.width; x++) {
      const y = canvas.height / 2 + Math.sin(x * frequency + phase) * amplitude * Math.sin(x / canvas.width * Math.PI);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Indigo Secondary Wave
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.7)';
    for (let x = 0; x < canvas.width; x++) {
      const y = canvas.height / 2 + Math.cos(x * (frequency * 0.8) - phase) * (amplitude * 0.7) * Math.sin(x / canvas.width * Math.PI);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    phase += speed;
    animationFrameId = requestAnimationFrame(renderWave);
  }

  renderWave();
}


// =============================================================================
// 7. APP BOOTSTRAP ON LOAD
// =============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Firebase & Firestore connection
  initFirebase();

  // Set default view to Voice Assistant Portal (Portal 3) as requested
  switchPortal('portal-voice');

  // Initialize Speech Recognition if supported
  speechRecognizer = initSpeechRecognition();

  // Populate clock
  updateClock();

  // Initialize Standard Time Visiting and Lunch previews
  updateVisitingStandardTimeDisplay();
  updateLunchStandardTimeDisplay();

  // Pre-load Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Load data from Firestore cloud (async — populates cache then re-renders)
  // After Firestore loads, seedSampleData will skip if data already exists in cloud
  try {
    await loadAllDataFromFirestore();
  } catch (e) {
    console.warn('Firestore load failed, using localStorage fallback:', e);
  }

  // Seed default demo data only if cloud (and local) have no data yet
  try {
    await seedSampleData(false);
  } catch (e) {
    console.warn('Sample data seed warning:', e);
  }

  console.log('Smart Queue AI ecosystem loaded successfully with 3 portals + Firebase cloud sync.');
});

