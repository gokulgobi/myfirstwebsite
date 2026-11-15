# 🏥 SMART QUEUE AI — Intelligent Healthcare Ecosystem

An autonomous, AI-powered smart queue management and clinical scheduling system built with modern web technologies, glassmorphism design, and real-time voice navigation.

---

## 🌟 Key Features Across the 3 Portals

### 1. 🏥 Hospital Portal
- **Authentication**:
  - **Sign Up**: Asks for `Hospital Name`, `Password`, `UPI ID` (for direct patient consultation payments), and `Address`.
  - **Login**: Asks for `Hospital Name` and `Password`.
  - **Pre-filled Demo Login**: One-click login with demo credentials (`Apollo Care Multi-Speciality Hospital`).
- **Live Standard Time Clock**:
  - Header digital clock formatted in 12-hour Standard Time with seconds and Indian Standard Time (`IST`) indicator.
- **Doctor Roster Management**:
  - Add Doctor with:
    - **Doctor Name**
    - **Department** (Cardiology, Neurology, Pediatrics, Orthopedics, Dermatology, etc.)
    - **Set Patient Visiting Time** (09:00 AM to 05:00 PM Standard Time with AM/PM preview & presets)
    - **Set Time as Lunch** (Standard Lunch Break: `01:00 PM - 02:00 PM`, blocked from patient booking)
    - **Set Amount to Pay** (consultation fee in ₹)
    - OPD Cabin / Room Number
- **Live Hospital Queue Console**:
  - Real-time list of today's patients with token IDs, standard appointment times, patient locations (distance & ETA), uploaded prescription badges, and a **"Call Patient"** alert trigger with voice chime.

---

### 2. 🩺 Patient Portal
- **Authentication**:
  - **Sign Up**: Asks for `Patient Name`, `Gender`, `Date of Birth`, `Email`, `Blood Group`, `Address`, and `Password`.
  - **Login**: Flexible login by `Email` (or `Patient Name`) and `Password`.
  - **Pre-filled Demo Login**: One-click login with demo patient `Alex Morgan` (`alex@care.com`).
- **3-Step Smart Appointment & Queue Booking Flow**:
  1. **Search Hospital Name**: Instant real-time search and filter with hospital cards showing addresses, UPI IDs, and available doctors.
  2. **Select Doctor**: View physician details, consultation fees, scheduled leave dates, **Patient Visiting Time (09:00 AM – 05:00 PM)**, and **Lunch Break (01:00 PM – 02:00 PM)**.
  3. **Schedule & Smart Verification**:
     - **Set Date & Time**: Interactive **Standard Time Slots** (`09:00 AM`, `09:30 AM`, `10:00 AM`, `10:30 AM`, `11:00 AM`, `11:30 AM`, `12:00 PM`, `12:30 PM`, `02:00 PM`, `02:30 PM`, `03:00 PM`, `03:30 PM`, `04:00 PM`, `04:30 PM`, `05:00 PM`).
     - **Intelligent Schedule Validation**: Automatically blocks and disables slots falling in doctor lunch break (`01:00 PM – 02:00 PM`) or outside visiting hours (`09:00 AM – 05:00 PM`) with standard conflict warnings!
     - **Share Location**: Browser GPS / Geolocation API calculates estimated distance and travel time to the clinic.
     - **Upload Prescription**: Drag-and-drop or file upload (Images/PDF) with instant visual thumbnail preview.
     - **Option to Pay**: Opens the UPI Payment Gateway modal with the hospital's registered UPI ID, consultation fee, dynamic HTML5 Canvas QR code, and 1-click test pay.
  - **Live Smart Queue Token Pass**:
    - Generates confirmed token (e.g. `#TQ-104`) with verified **Appointment Time in Standard Time (IST)**.
    - Dynamic queue position counter ("2 patients ahead") and real-time waiting time estimation ("~12 mins").
    - Boarding-pass style printable token card.

---

### 3. 🎙️ Voice Assistant Portal ("Auto-Open AI")
- **Microphone Voice Assistant**:
  - Uses the **Web Speech Recognition API** (`webkitSpeechRecognition` / `SpeechRecognition`) with pulsing microphone orb and audio waveform visualizer.
  - **Text-to-Speech (TTS)** voice feedback using `window.speechSynthesis`.
- **Automatically Opens What You Ask**:
  - Spoken commands instantly navigate and trigger corresponding workflows across the entire application:
    - *"Open hospital portal"* ➔ Switches to Hospital Portal.
    - *"Hospital sign up"* ➔ Opens Hospital Registration.
    - *"Add new doctor"* ➔ Focuses Doctor Roster form.
    - *"Open patient portal"* ➔ Switches to Patient Portal.
    - *"Search hospital Apollo"* ➔ Filters hospital search list for "Apollo".
    - *"Book doctor"* ➔ Moves to doctor selection & schedule.
    - *"Share my location"* ➔ Acquires GPS coordinates & distance.
    - *"Upload prescription"* ➔ Opens file uploader.
    - *"Option to pay"* ➔ Opens UPI Payment Gateway modal.
    - *"Check my queue token"* ➔ Announces live token number and wait time.
- **Visual Fallback**:
  - Includes interactive quick-action chips and a text execution command bar for browsers where mic permission is restricted.

---

## 🚀 How to Run

### Option 1: VS Code Live Preview (Easiest)
1. Open the project folder in **VS Code**.
2. Install the **Live Preview** extension by Microsoft (if not already installed).
3. Right-click `index.html` → **"Open with Live Preview"**.

### Option 2: npm start (Recommended for full Firebase functionality)
```bash
npm start
```
This opens the app at `http://localhost:8080` with live-reload.

### Option 3: npx live-server (No install needed)
```bash
npx live-server --port=8080
```

### Option 4: VS Code Go Live button
1. Install the **Live Server** extension in VS Code.
2. Click the **"Go Live"** button in the bottom status bar.

> ⚠️ **Note**: Double-clicking `index.html` directly (`file://`) will work for basic features, but Firebase cloud sync and voice recognition require serving over HTTP (`http://localhost`). Use one of the options above for the full experience.

---

## 🛠️ Technology Stack
- **HTML5**: Semantic markup, accessible IDs, and structured layout.
- **Vanilla CSS3**: Custom glassmorphism, responsive CSS Grid/Flexbox, neon gradients, and keyframe animations.
- **Vanilla JavaScript (ES6+)**: LocalStorage persistence, Geolocation API, Web Speech Recognition, Canvas QR rendering, and dynamic queue calculations.
- **Lucide Icons & Canvas Confetti**: High-res icons and celebration animations.
