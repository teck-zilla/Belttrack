/**
 * BeltTrack Martial Arts Management - Interactive State Controller
 * 
 * Drives multi-tenant role switching, school registration modal,
 * student join code validation, and dynamic grading readiness updates.
 * ZERO hardcoded colors: all styles route through design system tokens.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------
  const state = {
    activeRole: 'owner',
    school: {
      name: 'Kaizen BJJ Academy',
      code: 'KAIZEN-2026',
      discipline: 'brazilian_jiu_jitsu',
      city: 'London',
      timezone: 'Europe/London'
    },
    student: {
      name: 'Lucas Silva',
      rank: 'White Belt (3 Stripes)',
      classesAttended: 42,
      classesRequired: 50,
      techniquesVerified: 8,
      techniquesRequired: 10,
      daysInRank: 142
    }
  };

  // --------------------------------------------------------------------------
  // DOM REFERENCES
  // --------------------------------------------------------------------------
  const displayTenantName = document.getElementById('display-tenant-name');
  const displayTenantCode = document.getElementById('display-tenant-code');
  const personaLabel = document.getElementById('persona-label');
  const rolePills = document.querySelectorAll('.role-pill');
  const roleSelector = document.querySelector('.role-selector');
  const entryPointsSection = document.querySelector('.entry-points-section');

  // Modals
  const modalRegister = document.getElementById('modal-register');
  const modalJoin = document.getElementById('modal-join');
  const modalDirectory = document.getElementById('modal-directory');

  const btnOpenRegister = document.getElementById('btn-open-register');
  const btnCloseRegister = document.getElementById('btn-close-register');
  const btnCancelRegister = document.getElementById('btn-cancel-register');
  const formRegister = document.getElementById('form-register-school');
  const feedbackRegister = document.getElementById('feedback-register');
  const btnSubmitRegister = document.getElementById('btn-submit-register');
  const checkboxRegTerms = document.getElementById('checkbox-reg-terms');

  const btnOpenJoin = document.getElementById('btn-open-join');
  const btnCloseJoin = document.getElementById('btn-close-join');
  const btnCancelJoin = document.getElementById('btn-cancel-join');
  const formJoin = document.getElementById('form-join-school');
  const feedbackJoin = document.getElementById('feedback-join');
  const btnSubmitJoin = document.getElementById('btn-submit-join');
  const checkboxJoinTerms = document.getElementById('checkbox-join-terms');

  const btnOpenDirectory = document.getElementById('btn-open-directory');
  const btnCloseDirectory = document.getElementById('btn-close-directory');
  const brandHomeLink = document.getElementById('brand-home-link');

  const modalTerms = document.getElementById('modal-terms');
  const modalLogin = document.getElementById('modal-login');
  const btnOpenLogin = document.getElementById('btn-open-login');
  const btnCloseLogin = document.getElementById('btn-close-login');
  const btnCancelLogin = document.getElementById('btn-cancel-login');
  const formLogin = document.getElementById('form-login');
  const feedbackLogin = document.getElementById('feedback-login');
  const inputLoginEmail = document.getElementById('input-login-email');
  const inputLoginPassword = document.getElementById('input-login-password');
  const errorLoginEmail = document.getElementById('error-login-email');
  const errorLoginPassword = document.getElementById('error-login-password');
  const btnOpenTerms = document.getElementById('btn-open-terms');
  const btnCloseTerms = document.getElementById('btn-close-terms');
  const btnAcknowledgeTerms = document.getElementById('btn-acknowledge-terms');

  // Dynamic Grading Demo
  const btnSimulateCheckin = document.getElementById('btn-simulate-checkin');
  const textAttendanceProgress = document.getElementById('text-attendance-progress');
  const fillAttendance = document.getElementById('fill-attendance');
  const badgeGradingStatus = document.getElementById('badge-grading-status');

  // Dynamic Role View Elements
  const cardRankTitle = document.getElementById('card-rank-title');
  const cardRankDesc = document.getElementById('card-rank-desc');
  const cardAttendanceMeta = document.getElementById('card-attendance-meta');
  const badgeAttendanceStatus = document.getElementById('badge-attendance-status');
  const cardAttendanceTitle = document.getElementById('card-attendance-title');
  const attendanceAlertBox = document.getElementById('attendance-alert-box');
  const attendanceScheduleList = document.getElementById('attendance-schedule-list');
  const attendanceStatFooter = document.getElementById('attendance-stat-footer');
  const cardLedgerMeta = document.getElementById('card-ledger-meta');
  const badgeLedgerStatus = document.getElementById('badge-ledger-status');
  const cardLedgerTitle = document.getElementById('card-ledger-title');
  const cardLedgerDesc = document.getElementById('card-ledger-desc');
  const ledgerEntriesList = document.getElementById('ledger-entries-list');
  const ledgerPolicyBox = document.getElementById('ledger-policy-box');
  const ledgerStatFooter = document.getElementById('ledger-stat-footer');

  function updateRoleView(role) {
    state.activeRole = role;
    const isOwnerGroup = role === 'owner' || role === 'coach';

    // 1. Persona Indicator Label
    if (personaLabel) {
      personaLabel.textContent = isOwnerGroup
        ? 'Owner / Head Coach'
        : 'Student / Guardian';
    }

    // 2. Card 1: Rank & Curriculum View
    if (cardRankTitle) {
      cardRankTitle.textContent = 'Brazilian Jiu-Jitsu (Gi Track)';
    }
    if (cardRankDesc) {
      cardRankDesc.textContent = isOwnerGroup
        ? 'Student: Lucas Silva • Current: White Belt (3 Stripes)'
        : 'Self: Lucas Silva (Adult 18+) • Linked Minor: Leo Silva (Age 11)';
    }
    if (btnSimulateCheckin) {
      btnSimulateCheckin.disabled = false;
      btnSimulateCheckin.style.opacity = '';
      btnSimulateCheckin.style.cursor = '';
      btnSimulateCheckin.textContent = isOwnerGroup
        ? '+ Simulate Check-in & Sign-off'
        : '+ Simulate Check-in (Adult)';
    }

    // 3. Card 2: Attendance & Schedule View
    if (cardAttendanceMeta) {
      cardAttendanceMeta.textContent = isOwnerGroup
        ? 'Attendance & Retention'
        : 'Personal & Dependent Attendance';
    }

    if (badgeAttendanceStatus) {
      if (isOwnerGroup) {
        badgeAttendanceStatus.textContent = 'RETENTION WATCH';
        badgeAttendanceStatus.className = 'status-badge warning';
      } else {
        badgeAttendanceStatus.textContent = 'ACTIVE ENROLLMENT';
        badgeAttendanceStatus.className = 'status-badge';
      }
    }

    if (cardAttendanceTitle) {
      cardAttendanceTitle.textContent = isOwnerGroup
        ? 'Active Mat Roll-Call & Retention Watch'
        : 'My Schedule & Minor Supervision';
    }

    if (attendanceAlertBox) {
      if (isOwnerGroup) {
        attendanceAlertBox.innerHTML = `
          <span class="alert-dot" aria-hidden="true"></span>
          <div class="alert-content">
            <strong class="alert-title">Dropout Risk Flagged: Elena Rostova</strong>
            <span class="alert-text">Absent for 13 consecutive days. Automated coach retention check triggered.</span>
          </div>
        `;
      } else {
        attendanceAlertBox.innerHTML = `
          <span class="alert-dot" aria-hidden="true"></span>
          <div class="alert-content">
            <strong class="alert-title">Guardian Supervision & Attendance Status</strong>
            <span class="alert-text">Lucas Silva is in good standing (42/50 classes). Minor dependent Leo Silva is supervised strictly under guardian read-only controls.</span>
          </div>
        `;
      }
    }

    if (attendanceScheduleList) {
      if (isOwnerGroup) {
        attendanceScheduleList.innerHTML = `
          <div class="schedule-item">
            <div>
              <strong class="schedule-name">BJJ Fundamentals (Gi)</strong>
              <span class="schedule-time">Coach Marcus • 18:00 - 19:15</span>
            </div>
            <span class="schedule-count highlight">18 Checked In</span>
          </div>
          <div class="schedule-item">
            <div>
              <strong class="schedule-name">Competition Sparring</strong>
              <span class="schedule-time">Coach Elena • 19:30 - 20:45</span>
            </div>
            <span class="schedule-count">12 Confirmed</span>
          </div>
        `;
      } else {
        attendanceScheduleList.innerHTML = `
          <div class="schedule-item">
            <div>
              <strong class="schedule-name">BJJ Fundamentals (Gi)</strong>
              <span class="schedule-time">Today • 18:00 - 19:15</span>
            </div>
            <span class="schedule-count highlight">Lucas Silva (Enrolled)</span>
          </div>
          <div class="schedule-item">
            <div>
              <strong class="schedule-name">Kids BJJ Fundamentals</strong>
              <span class="schedule-time">Saturday • 10:00 - 11:00</span>
            </div>
            <span class="schedule-count highlight">Leo Silva (Guardian Read-Only)</span>
          </div>
        `;
      }
    }

    if (attendanceStatFooter) {
      if (isOwnerGroup) {
        attendanceStatFooter.innerHTML = '<span>Overall Dojo Mat Attendance:</span><span class="metric-val">94.2% Retention</span>';
      } else {
        attendanceStatFooter.innerHTML = '<span>Mat Attendance Status:</span><span class="metric-val">Current &amp; Verified</span>';
      }
    }

    // 4. Card 3: Ledger & Bookkeeping View
    if (cardLedgerMeta) {
      cardLedgerMeta.textContent = isOwnerGroup
        ? 'Internal Bookkeeping & Matrix'
        : 'Personal & Guardian Receipts';
    }

    if (badgeLedgerStatus) {
      if (isOwnerGroup) {
        badgeLedgerStatus.textContent = '0% FEES';
        badgeLedgerStatus.className = 'status-badge neutral';
      } else {
        badgeLedgerStatus.textContent = 'SETTLED';
        badgeLedgerStatus.className = 'status-badge neutral';
      }
    }

    if (cardLedgerTitle) {
      cardLedgerTitle.textContent = isOwnerGroup
        ? 'Internal Ledger & Technique Log'
        : 'My Tuition & Dependent Receipts';
    }

    if (cardLedgerDesc) {
      cardLedgerDesc.textContent = isOwnerGroup
        ? 'Admin ledger entries with real-time coach verification records.'
        : 'Private dojo receipts for adult student and linked minor dependent.';
    }

    if (ledgerEntriesList) {
      if (isOwnerGroup) {
        ledgerEntriesList.innerHTML = `
          <div class="ledger-item">
            <div class="ledger-top">
              <span class="ledger-title">Monthly Tuition (Cash Settlement)</span>
              <span class="ledger-amount">$120.00</span>
            </div>
            <div class="ledger-bottom">
              <span>Student: Mateo Diaz</span>
              <span class="ledger-receipt">REC-2026-BJJ-084</span>
            </div>
          </div>
          <div class="ledger-item">
            <div class="ledger-top">
              <span class="ledger-title">Armbar from Guard (Coach Verified)</span>
              <span class="ledger-amount">Verified</span>
            </div>
            <div class="ledger-bottom">
              <span>Lucas Silva • Mat Sign-off</span>
              <span class="ledger-receipt">TECH-BJJ-01</span>
            </div>
          </div>
        `;
      } else {
        ledgerEntriesList.innerHTML = `
          <div class="ledger-item">
            <div class="ledger-top">
              <span class="ledger-title">Monthly Tuition (Gi Track)</span>
              <span class="ledger-amount">$120.00</span>
            </div>
            <div class="ledger-bottom">
              <span>Lucas Silva (Self)</span>
              <span class="ledger-receipt">REC-2026-BJJ-084</span>
            </div>
          </div>
          <div class="ledger-item">
            <div class="ledger-top">
              <span class="ledger-title">Junior Monthly Tuition (Kids)</span>
              <span class="ledger-amount">$95.00</span>
            </div>
            <div class="ledger-bottom">
              <span>Leo Silva (Minor) • Guardian Settled</span>
              <span class="ledger-receipt">REC-2026-BJJ-092</span>
            </div>
          </div>
        `;
      }
    }

    if (ledgerPolicyBox) {
      if (isOwnerGroup) {
        ledgerPolicyBox.innerHTML = `
          <strong class="zero-fee-title">Closed Single Source of Truth</strong>
          <p class="zero-fee-text">No third-party payment gateways, no subscription cuts. Coach mat verifications & cash settlements recorded offline.</p>
        `;
      } else {
        ledgerPolicyBox.innerHTML = `
          <strong class="zero-fee-title">Direct Dojo Settlement Only</strong>
          <p class="zero-fee-text">Zero online payment fees. Minor dependent records are strictly managed through the guardian persona.</p>
        `;
      }
    }

    if (ledgerStatFooter) {
      if (isOwnerGroup) {
        ledgerStatFooter.innerHTML = '<span>Settled This Month:</span><span class="metric-val">$4,860.00 (Offline)</span>';
      } else {
        ledgerStatFooter.innerHTML = '<span>Receipt Status:</span><span class="metric-val">All Dues Settled (Offline)</span>';
      }
    }
  }

  // --------------------------------------------------------------------------
  // ROLE SWITCHER
  // --------------------------------------------------------------------------
  rolePills.forEach((pill) => {
    pill.addEventListener('click', () => {
      rolePills.forEach((p) => {
        p.classList.remove('active');
        p.setAttribute('aria-pressed', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-pressed', 'true');

      const role = pill.getAttribute('data-role');
      updateRoleView(role);
    });
  });

  // Initialize initial role view
  updateRoleView(state.activeRole);

  // --------------------------------------------------------------------------
  // MODAL CONTROLS & DYNAMIC TITLE MANAGEMENT
  // --------------------------------------------------------------------------
  function updateDynamicTitle(title) {
    if (typeof document !== 'undefined') {
      document.title = title; // strictly dynamic, zero static string
    }
  }


  function checkRegisterFormValidity() {
    if (!btnSubmitRegister || !formRegister) return;
    const inputName = document.getElementById('input-reg-school-name') || document.getElementById('input-reg-name');
    const selectDiscipline = document.getElementById('select-reg-discipline');
    const inputCode = document.getElementById('input-reg-code');
    const inputCity = document.getElementById('input-reg-city');
    const inputCountry = document.getElementById('input-reg-country');
    const selectTimezone = document.getElementById('select-reg-timezone');
    const inputOwner = document.getElementById('input-reg-owner');
    const inputEmail = document.getElementById('input-reg-email');

    const isTerms = checkboxRegTerms ? checkboxRegTerms.checked : false;
    const isNameValid = Boolean(inputName && inputName.value.trim().length > 3 && !validateField(inputName.id, inputName.value));
    const isDisciplineValid = Boolean(selectDiscipline && selectDiscipline.value);
    const isCodeValid = Boolean(inputCode && isValidSchoolJoinCode(inputCode.value));
    const isCityValid = !inputCity || Boolean(inputCity.value.trim().length >= 2);
    const isCountryValid = Boolean(inputCountry && inputCountry.value.trim().length >= 2);
    const isTimezoneValid = Boolean(selectTimezone && selectTimezone.value);
    const isOwnerValid = Boolean(inputOwner && inputOwner.value.trim().length >= 3 && inputOwner.value.trim().split(/\s+/).filter(Boolean).length >= 2);
    const isEmailValid = Boolean(inputEmail && isValidEmail(inputEmail.value));

    const hasAnyError = formRegister.querySelectorAll('.input-error').length > 0;

    const isValid = isTerms && isNameValid && isDisciplineValid && isCodeValid && isCityValid && isCountryValid && isTimezoneValid && isOwnerValid && isEmailValid && !hasAnyError;
    btnSubmitRegister.disabled = !isValid;
  }

  function checkJoinFormValidity() {
    if (!btnSubmitJoin || !formJoin) return;
    const inputCode = document.getElementById('input-join-code');
    const inputStudent = document.getElementById('input-join-student-name');
    const inputEmail = document.getElementById('input-join-email');
    const inputPassword = document.getElementById('input-join-password');
    const inputGuardianName = document.getElementById('input-join-guardian-name');
    const inputGuardianEmail = document.getElementById('input-join-guardian-email');

    const isTerms = checkboxJoinTerms ? checkboxJoinTerms.checked : false;
    const isCodeValid = Boolean(inputCode && isValidSchoolJoinCode(inputCode.value));
    const isStudentValid = Boolean(inputStudent && inputStudent.value.trim().length >= 3 && inputStudent.value.trim().split(/\s+/).filter(Boolean).length >= 2);
    const isEmailValid = Boolean(inputEmail && isValidEmail(inputEmail.value));
    const isPasswordValid = Boolean(inputPassword && isValidPassword(inputPassword.value));

    const isMinor = checkboxIsMinor ? checkboxIsMinor.checked : false;
    let isGuardianValid = true;
    if (isMinor) {
      isGuardianValid = Boolean(inputGuardianName && inputGuardianName.value.trim().length >= 3 && inputGuardianName.value.trim().split(/\s+/).filter(Boolean).length >= 2);
      if (inputGuardianEmail && inputGuardianEmail.value.trim()) {
        isGuardianValid = isGuardianValid && isValidEmail(inputGuardianEmail.value);
      }
    }

    const hasAnyError = formJoin.querySelectorAll('.input-error').length > 0;

    const isValid = isTerms && isCodeValid && isStudentValid && isEmailValid && isPasswordValid && isGuardianValid && !hasAnyError;
    btnSubmitJoin.disabled = !isValid;
  }

  function openModal(modal) {
    if (modal) {
      modal.classList.add('active');
      if (modal === modalRegister) {
        updateDynamicTitle('Register School');
        checkRegisterFormValidity();
      } else if (modal === modalJoin) {
        updateDynamicTitle('Join Dojo');
        checkJoinFormValidity();
      }
      else if (modal === modalDirectory) updateDynamicTitle('Public School Directory');
      else if (modal === modalTerms) updateDynamicTitle('Terms & Conditions');
      else if (modal === modalLogin) updateDynamicTitle('Sign In');
    }
  }

  function closeModal(modal) {
    if (modal) {
      modal.classList.remove('active');
      updateDynamicTitle('Dashboard');
      modal.querySelectorAll('.input-error').forEach((el) => el.classList.remove('input-error'));
      modal.querySelectorAll('.form-field-error').forEach((el) => el.classList.remove('active'));
      if (modal === modalJoin) {
        resetJoinPassword();
        if (checkboxJoinTerms) checkboxJoinTerms.checked = false;
        checkJoinFormValidity();
      }
      if (modal === modalRegister) {
        if (checkboxRegTerms) checkboxRegTerms.checked = false;
        checkRegisterFormValidity();
      }
    }
  }


  function resetJoinPassword() {
    const inputJoinPassword = document.getElementById('input-join-password');
    const btnToggle = document.getElementById('btn-toggle-join-password');
    const hintEl = document.getElementById('hint-join-password');
    if (inputJoinPassword) {
      inputJoinPassword.setAttribute('type', 'password');
    }
    if (hintEl) {
      hintEl.classList.remove('active');
    }
    if (btnToggle) {
      btnToggle.setAttribute('aria-label', 'Show password');
      btnToggle.setAttribute('title', 'Show password');
      btnToggle.innerHTML = `<svg class="password-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="16" height="16">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>`;
    }
  }

  const btnToggleJoinPassword = document.getElementById('btn-toggle-join-password');
  if (btnToggleJoinPassword) {
    btnToggleJoinPassword.addEventListener('click', () => {
      const inputJoinPassword = document.getElementById('input-join-password');
      if (!inputJoinPassword) return;
      const isPassword = inputJoinPassword.getAttribute('type') === 'password';
      inputJoinPassword.setAttribute('type', isPassword ? 'text' : 'password');
      btnToggleJoinPassword.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      btnToggleJoinPassword.setAttribute('title', isPassword ? 'Hide password' : 'Show password');
      btnToggleJoinPassword.innerHTML = isPassword
        ? `<svg class="password-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="16" height="16">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
            <line x1="2" y1="2" x2="22" y2="22"></line>
          </svg>`
        : `<svg class="password-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="16" height="16">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>`;
    });
  }


  // Register Modal
  if (btnOpenRegister) btnOpenRegister.addEventListener('click', () => openModal(modalRegister));
  if (btnCloseRegister) btnCloseRegister.addEventListener('click', () => closeModal(modalRegister));
  if (btnCancelRegister) btnCancelRegister.addEventListener('click', () => closeModal(modalRegister));

  // Join Modal
  if (btnOpenJoin) btnOpenJoin.addEventListener('click', () => openModal(modalJoin));
  if (btnCloseJoin) btnCloseJoin.addEventListener('click', () => closeModal(modalJoin));
  if (btnCancelJoin) btnCancelJoin.addEventListener('click', () => closeModal(modalJoin));

  // Directory Modal
  if (btnOpenDirectory) btnOpenDirectory.addEventListener('click', () => openModal(modalDirectory));
  if (btnCloseDirectory) btnCloseDirectory.addEventListener('click', () => closeModal(modalDirectory));

  // Login Modal
  if (btnOpenLogin) btnOpenLogin.addEventListener('click', () => openModal(modalLogin));
  if (btnCloseLogin) btnCloseLogin.addEventListener('click', () => closeModal(modalLogin));
  if (btnCancelLogin) btnCancelLogin.addEventListener('click', () => closeModal(modalLogin));


  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!inputLoginEmail || !inputLoginPassword) return;

      const email = inputLoginEmail.value.trim();
      const password = inputLoginPassword.value;

      if (!email || !password) {
        if (feedbackLogin) {
          feedbackLogin.textContent = "Complete the form and accept the terms before you can sign up";
          feedbackLogin.classList.add("active");
        }
        if (!email && inputLoginEmail) inputLoginEmail.focus();
        else if (!password && inputLoginPassword) inputLoginPassword.focus();
        return;
      }

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          if (feedbackLogin) {
            feedbackLogin.textContent = data.error || 'Invalid credentials';
            feedbackLogin.classList.add('active');
          }
        } else {
          if (feedbackLogin) {
            feedbackLogin.textContent = 'Successfully authenticated!';
            feedbackLogin.classList.add('active');
          }
          if (data.school) {
            state.school.name = data.school.name;
            state.school.code = data.school.registration_code || data.school.join_code;
            if (displayTenantName) displayTenantName.textContent = data.school.name;
            if (displayTenantCode) displayTenantCode.textContent = data.school.registration_code || data.school.join_code;
          }
          if (roleSelector) roleSelector.style.display = 'none';
          if (entryPointsSection) entryPointsSection.style.display = 'none';
          setTimeout(() => {
            closeModal(modalLogin);
            if (feedbackLogin) feedbackLogin.classList.remove('active');
            window.location.reload();
          }, 800);
        }
      } catch (err) {
        if (feedbackLogin) {
          feedbackLogin.textContent = 'Connection error. Please check server.';
          feedbackLogin.classList.add('active');
        }
      }
    });
  }

  // Terms Modal
  if (btnOpenTerms) btnOpenTerms.addEventListener('click', () => openModal(modalTerms));
  if (btnCloseTerms) btnCloseTerms.addEventListener('click', () => closeModal(modalTerms));
  if (btnAcknowledgeTerms) btnAcknowledgeTerms.addEventListener('click', () => closeModal(modalTerms));

  // Close on backdrop click
  [modalRegister, modalJoin, modalDirectory, modalTerms].forEach((modal) => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // Brand Logo Link (Always return to Home)
  if (brandHomeLink) {
    brandHomeLink.addEventListener('click', (e) => {
      closeModal(modalRegister);
      closeModal(modalJoin);
      closeModal(modalDirectory);
      closeModal(modalTerms);
      closeModal(modalLogin);
      if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        history.pushState(null, '', '/');
      }
    });
  }

  // --------------------------------------------------------------------------
  // FIELD VALIDATION RULES ("empty field error", "structure error", "enter a valid email address")
  // --------------------------------------------------------------------------
  function isValidSchoolJoinCode(code) {
    return /^[A-Za-z]{1,6}-[A-Za-z]{1,4}-[0-9]{1,4}$/.test((code || '').trim());
  }

  function isValidPassword(pw) {
    return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,11}$/.test((pw || '').trim());
  }

  function isValidEmail(email) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test((email || '').trim());
  }

  function validateField(fieldId, value) {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      return 'empty field error';
    }

    // Email fields: real-time valid email check
    if (['input-reg-email', 'input-join-email', 'input-join-guardian-email'].includes(fieldId)) {
      if (!isValidEmail(trimmed)) {
        return 'enter a valid email address';
      }
    }

    // School / Academy Name field: length should be above 3 characters
    if (fieldId === 'input-reg-school-name') {
      if (trimmed.length <= 3) {
        return 'structure error';
      }
    }

    // City & Country fields: length should not fall below 2 characters
    if (['input-reg-city', 'input-reg-country'].includes(fieldId)) {
      if (trimmed.length < 2) {
        return 'structure error';
      }
    }

    // School Join Code field: format must always be string-string-number with max lengths 6-4-4
    if (['input-reg-code', 'input-join-code'].includes(fieldId)) {
      if (!isValidSchoolJoinCode(trimmed)) {
        return 'wrong details';
      }
    }

    // Password field: 6-11 chars, letters, numbers, and at least 1 special character
    if (fieldId === 'input-join-password') {
      if (!isValidPassword(trimmed)) {
        return 'wrong details';
      }
    }

    // Name field: length should be at least 3 characters and must have 2 words or names separated by an empty string
    if (['input-reg-owner', 'input-join-student-name', 'input-join-guardian-name'].includes(fieldId)) {
      const words = trimmed.split(/\s+/).filter(Boolean);
      if (trimmed.length < 3 || words.length < 2) {
        return 'structure error';
      }
    }

    return null;
  }

  // --------------------------------------------------------------------------
  // INLINE FORM VALIDATION (Real-time email validation & field structure rules)
  // --------------------------------------------------------------------------
  const allModalForms = [formRegister, formJoin];
  allModalForms.forEach((form) => {
    if (!form) return;
    const fields = form.querySelectorAll(
      'input:not([type="checkbox"]):not([type="submit"]):not([type="button"]), select, textarea'
    );

    fields.forEach((field) => {
      let errorEl = field.parentElement ? field.parentElement.querySelector('.form-field-error') : null;
      if (!errorEl && field.parentElement) {
        errorEl = document.createElement('span');
        errorEl.className = 'form-field-error';
        errorEl.textContent = 'empty field error';
        field.insertAdjacentElement('afterend', errorEl);
      }

      const isEmailField = ['input-reg-email', 'input-join-email', 'input-join-guardian-email'].includes(field.id) || field.type === 'email';
      const isCodeField = ['input-reg-code', 'input-join-code'].includes(field.id);
      const isPasswordField = field.id === 'input-join-password';

      field.addEventListener('blur', () => {
        if (field.closest('#guardian-fields-container') && (!checkboxIsMinor || !checkboxIsMinor.checked)) {
          return;
        }

        if (isPasswordField) {
          if (!field.value.trim()) {
            field.classList.add('input-error');
            if (errorEl) {
              errorEl.textContent = 'empty field error';
              errorEl.classList.add('active');
            }
          } else if (!isValidPassword(field.value)) {
            field.classList.add('input-error');
            if (errorEl) {
              errorEl.textContent = 'wrong details';
              errorEl.classList.add('active');
            }
          } else {
            field.classList.remove('input-error');
            if (errorEl) errorEl.classList.remove('active');
          }
          return;
        }

        if (isCodeField) {
          if (!field.value.trim()) {
            field.classList.add('input-error');
            if (errorEl) {
              errorEl.textContent = 'empty field error';
              errorEl.classList.add('active');
            }
          } else if (!isValidSchoolJoinCode(field.value)) {
            field.classList.add('input-error');
            if (errorEl) {
              errorEl.textContent = 'wrong details';
              errorEl.classList.add('active');
            }
          } else {
            field.classList.remove('input-error');
            if (errorEl) errorEl.classList.remove('active');
          }
          return;
        }

        if (isEmailField) {
          if (!field.value.trim()) {
            const msg = (errorEl && errorEl.textContent === 'enter a valid email address' && errorEl.classList.contains('active'))
              ? 'enter a valid email address'
              : 'empty field error';
            field.classList.add('input-error');
            if (errorEl) {
              errorEl.textContent = msg;
              errorEl.classList.add('active');
            }
          } else if (!isValidEmail(field.value)) {
            field.classList.add('input-error');
            if (errorEl) {
              errorEl.textContent = 'enter a valid email address';
              errorEl.classList.add('active');
            }
          } else {
            field.classList.remove('input-error');
            if (errorEl) errorEl.classList.remove('active');
          }
          return;
        }

        const err = validateField(field.id, field.value);
        if (err) {
          field.classList.add('input-error');
          if (errorEl) {
            errorEl.textContent = err;
            errorEl.classList.add('active');
          }
        } else {
          field.classList.remove('input-error');
          if (errorEl) errorEl.classList.remove('active');
        }
      });

      field.addEventListener('input', () => {
        if (errorEl && errorEl.classList.contains('active')) {
          let isFixed = false;
          if (isPasswordField) {
            isFixed = isValidPassword(field.value);
          } else if (isCodeField) {
            isFixed = isValidSchoolJoinCode(field.value);
          } else if (isEmailField) {
            if (field.id === 'input-join-guardian-email' && (!checkboxIsMinor || !checkboxIsMinor.checked) && !field.value.trim()) {
              isFixed = true;
            } else {
              isFixed = isValidEmail(field.value);
            }
          } else {
            isFixed = !validateField(field.id, field.value);
          }

          if (isFixed) {
            field.classList.remove('input-error');
            errorEl.classList.remove('active');
          }
        }
      });

      field.addEventListener('change', () => {
        if (isEmailField) {
          if (!isValidEmail(field.value)) {
            field.classList.add('input-error');
            if (errorEl) {
              errorEl.textContent = 'enter a valid email address';
              errorEl.classList.add('active');
            }
          } else {
            field.classList.remove('input-error');
            if (errorEl) errorEl.classList.remove('active');
          }
          return;
        }

        const err = validateField(field.id, field.value);
        if (!err) {
          field.classList.remove('input-error');
          if (errorEl) errorEl.classList.remove('active');
        }
      });
    });
  });

  // --------------------------------------------------------------------------
  // FORM SUBMISSIONS
  // --------------------------------------------------------------------------
  if (formRegister) {
    formRegister.addEventListener('input', checkRegisterFormValidity);
    formRegister.addEventListener('change', checkRegisterFormValidity);
    formRegister.addEventListener('submit', (e) => {
      e.preventDefault();
      let hasError = false;
      const requiredInputs = formRegister.querySelectorAll('input[required], select[required]');
      requiredInputs.forEach((input) => {
        const err = validateField(input.id, input.value);
        if (err) {
          input.classList.add('input-error');
          const errEl = input.closest('.form-group') ? input.closest('.form-group').querySelector('.form-field-error') : (input.parentElement ? input.parentElement.querySelector('.form-field-error') : null);
          if (errEl) {
            errEl.textContent = err;
            errEl.classList.add('active');
          }
          hasError = true;
        }
      });
      if (hasError) return;

      const schoolNameInput = document.getElementById('input-reg-school-name');
      const codeInput = document.getElementById('input-reg-code');
      const cityInput = document.getElementById('input-reg-city');

      const newName = schoolNameInput.value.trim() || 'Vance BJJ';
      const newCode = codeInput.value.trim().toUpperCase() || 'VANCE-BJJ-2026';
      const newCity = cityInput ? cityInput.value.trim() || 'London' : 'London';

      state.school.name = newName;
      state.school.code = newCode;
      state.school.city = newCity;

      if (displayTenantName) displayTenantName.textContent = newName;
      if (displayTenantCode) displayTenantCode.textContent = newCode;

      if (feedbackRegister) {
        feedbackRegister.textContent = `New dojo tenant "${newName}" initialized with isolated code: ${newCode}`;
        feedbackRegister.classList.add('active');
      }

      if (roleSelector) roleSelector.style.display = 'none';
      if (entryPointsSection) entryPointsSection.style.display = 'none';

      setTimeout(() => {
        closeModal(modalRegister);
        if (feedbackRegister) feedbackRegister.classList.remove('active');
      }, 1200);
    });
  }

  const checkboxIsMinor = document.getElementById('checkbox-join-is-minor');
  const guardianContainer = document.getElementById('guardian-fields-container');
  const inputJoinGuardianName = document.getElementById('input-join-guardian-name');
  const inputJoinGuardianEmail = document.getElementById('input-join-guardian-email');

  if (checkboxIsMinor && guardianContainer) {
    checkboxIsMinor.addEventListener('change', () => {
      if (checkboxIsMinor.checked) {
        guardianContainer.classList.add('active');
        if (inputJoinGuardianName) inputJoinGuardianName.required = true;
      } else {
        guardianContainer.classList.remove('active');
        if (inputJoinGuardianName) {
          inputJoinGuardianName.required = false;
          inputJoinGuardianName.value = '';
          inputJoinGuardianName.classList.remove('input-error');
        }
        if (inputJoinGuardianEmail) {
          inputJoinGuardianEmail.value = '';
          inputJoinGuardianEmail.classList.remove('input-error');
        }
        guardianContainer.querySelectorAll('.form-field-error').forEach((el) => el.classList.remove('active'));
      }
    });
  }

  if (formJoin) {
    formJoin.addEventListener('input', checkJoinFormValidity);
    formJoin.addEventListener('change', checkJoinFormValidity);
    formJoin.addEventListener('submit', (e) => {
      e.preventDefault();
      const inputJoinCode = document.getElementById('input-join-code');
      const inputJoinStudent = document.getElementById('input-join-student-name');
      const inputJoinEmail = document.getElementById('input-join-email');
      const inputJoinPassword = document.getElementById('input-join-password');

      const isMinor = checkboxIsMinor ? checkboxIsMinor.checked : false;
      const guardianNameVal = inputJoinGuardianName ? inputJoinGuardianName.value.trim() : '';

      let hasError = false;
      const joinInputs = [inputJoinCode, inputJoinStudent, inputJoinEmail, inputJoinPassword];
      if (isMinor) {
        joinInputs.push(inputJoinGuardianName);
      }
      joinInputs.forEach((input) => {
        if (input) {
          const err = validateField(input.id, input.value);
          if (err) {
            input.classList.add('input-error');
            const errEl = input.parentElement ? input.parentElement.querySelector('.form-field-error') : null;
            if (errEl) {
              errEl.textContent = err;
              errEl.classList.add('active');
            }
            hasError = true;
          }
        }
      });
      if (hasError) return;

      const codeVal = inputJoinCode ? inputJoinCode.value.trim().toUpperCase() : '';
      const studentVal = inputJoinStudent ? inputJoinStudent.value.trim() : '';
      const emailVal = inputJoinEmail ? inputJoinEmail.value.trim() : '';

      if (isMinor && !guardianNameVal) {
        if (feedbackJoin) {
          feedbackJoin.textContent = 'Guardian full name is required for minor students.';
          feedbackJoin.classList.add('active');
        }
        return;
      }

      const activeCode = (state.school.code || '').toUpperCase();
      if (activeCode && codeVal !== activeCode) {
        if (feedbackJoin) {
          feedbackJoin.textContent = `Join code mismatch: Code "${codeVal}" does not belong to active tenant "${state.school.name}".`;
          feedbackJoin.classList.add('active');
        }
        return;
      }

      if (feedbackJoin) {
        feedbackJoin.textContent = `Access code ${codeVal} verified! Enrolled under tenant "${state.school.name}". Status: PENDING_APPROVAL. Roster and techniques unlock upon coach verification.`;
        feedbackJoin.classList.add('active');
      }

      if (roleSelector) roleSelector.style.display = 'none';
      if (entryPointsSection) entryPointsSection.style.display = 'none';

      setTimeout(() => {
        closeModal(modalJoin);
        if (feedbackJoin) feedbackJoin.classList.remove('active');
        if (checkboxIsMinor) {
          checkboxIsMinor.checked = false;
          if (guardianContainer) guardianContainer.classList.remove('active');
        }
      }, 2000);
    });
  }

  // --------------------------------------------------------------------------
  // DYNAMIC GRADING READINESS SIMULATION
  // --------------------------------------------------------------------------
  if (btnSimulateCheckin) {
    btnSimulateCheckin.addEventListener('click', () => {
      if (state.student.classesAttended < 50) {
        state.student.classesAttended += 1;
      } else {
        state.student.classesAttended = 42; // Reset demo loop
      }

      const count = state.student.classesAttended;
      const total = state.student.classesRequired;
      const percent = Math.min(100, Math.round((count / total) * 100));

      if (textAttendanceProgress) {
        textAttendanceProgress.textContent = `${count} / ${total} classes`;
      }

      if (fillAttendance) {
        fillAttendance.style.width = `${percent}%`;
      }

      btnSimulateCheckin.textContent = '+ Simulate Check-in';

      if (count >= total) {
        if (badgeGradingStatus) {
          badgeGradingStatus.textContent = 'GRADING ELIGIBLE';
          badgeGradingStatus.classList.add('eligible');
        }
      } else {
        if (badgeGradingStatus) {
          badgeGradingStatus.textContent = 'IN PROGRESS';
          badgeGradingStatus.classList.remove('eligible');
        }
      }
    });
  }
});
