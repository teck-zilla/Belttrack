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

  // Modals
  const modalRegister = document.getElementById('modal-register');
  const modalJoin = document.getElementById('modal-join');
  const modalDirectory = document.getElementById('modal-directory');

  const btnOpenRegister = document.getElementById('btn-open-register');
  const btnCloseRegister = document.getElementById('btn-close-register');
  const btnCancelRegister = document.getElementById('btn-cancel-register');
  const formRegister = document.getElementById('form-register-school');
  const feedbackRegister = document.getElementById('feedback-register');

  const btnOpenJoin = document.getElementById('btn-open-join');
  const btnCloseJoin = document.getElementById('btn-close-join');
  const btnCancelJoin = document.getElementById('btn-cancel-join');
  const formJoin = document.getElementById('form-join-school');
  const feedbackJoin = document.getElementById('feedback-join');

  const btnOpenDirectory = document.getElementById('btn-open-directory');
  const btnCloseDirectory = document.getElementById('btn-close-directory');
  const btnCloseDirectoryAction = document.getElementById('btn-close-directory-action');
  const brandHomeLink = document.getElementById('brand-home-link');

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

  function openModal(modal) {
    if (modal) {
      modal.classList.add('active');
      if (modal === modalRegister) updateDynamicTitle('Register School');
      else if (modal === modalJoin) updateDynamicTitle('Join Dojo');
      else if (modal === modalDirectory) updateDynamicTitle('Public School Directory');
    }
  }

  function closeModal(modal) {
    if (modal) {
      modal.classList.remove('active');
      updateDynamicTitle('Dashboard');
    }
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
  if (btnCloseDirectoryAction) btnCloseDirectoryAction.addEventListener('click', () => closeModal(modalDirectory));

  // Close on backdrop click
  [modalRegister, modalJoin, modalDirectory].forEach((modal) => {
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
      if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        history.pushState(null, '', '/');
      }
    });
  }

  // --------------------------------------------------------------------------
  // FORM SUBMISSIONS
  // --------------------------------------------------------------------------
  if (formRegister) {
    formRegister.addEventListener('submit', (e) => {
      e.preventDefault();
      const schoolNameInput = document.getElementById('input-reg-school-name');
      const codeInput = document.getElementById('input-reg-code');

      const newName = schoolNameInput.value.trim() || 'Vance BJJ';
      const newCode = codeInput.value.trim().toUpperCase() || 'VANCE-2026';

      state.school.name = newName;
      state.school.code = newCode;

      if (displayTenantName) displayTenantName.textContent = newName;
      if (displayTenantCode) displayTenantCode.textContent = newCode;

      if (feedbackRegister) {
        feedbackRegister.textContent = `New dojo tenant "${newName}" initialized with isolated code: ${newCode}`;
        feedbackRegister.classList.add('active');
      }

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
        }
        if (inputJoinGuardianEmail) inputJoinGuardianEmail.value = '';
      }
    });
  }

  if (formJoin) {
    formJoin.addEventListener('submit', (e) => {
      e.preventDefault();
      const inputJoinCode = document.getElementById('input-join-code');
      const inputJoinStudent = document.getElementById('input-join-student-name');
      const inputJoinEmail = document.getElementById('input-join-email');

      const codeVal = inputJoinCode ? inputJoinCode.value.trim().toUpperCase() : '';
      const studentVal = inputJoinStudent ? inputJoinStudent.value.trim() : '';
      const emailVal = inputJoinEmail ? inputJoinEmail.value.trim() : '';
      const isMinor = checkboxIsMinor ? checkboxIsMinor.checked : false;
      const guardianNameVal = inputJoinGuardianName ? inputJoinGuardianName.value.trim() : '';

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
