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

  // Dynamic Grading Demo
  const btnSimulateCheckin = document.getElementById('btn-simulate-checkin');
  const textAttendanceProgress = document.getElementById('text-attendance-progress');
  const fillAttendance = document.getElementById('fill-attendance');
  const badgeGradingStatus = document.getElementById('badge-grading-status');

  // --------------------------------------------------------------------------
  // ROLE SWITCHER
  // --------------------------------------------------------------------------
  rolePills.forEach((pill) => {
    pill.addEventListener('click', () => {
      rolePills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');

      const role = pill.getAttribute('data-role');
      state.activeRole = role;

      if (personaLabel) {
        personaLabel.textContent = role === 'owner' ? 'Owner / Admin' : role === 'coach' ? 'Coach' : 'Student / Parent';
      }
    });
  });

  // --------------------------------------------------------------------------
  // MODAL CONTROLS
  // --------------------------------------------------------------------------
  function openModal(modal) {
    if (modal) modal.classList.add('active');
  }

  function closeModal(modal) {
    if (modal) modal.classList.remove('active');
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

  if (formJoin) {
    formJoin.addEventListener('submit', (e) => {
      e.preventDefault();
      const inputJoinCode = document.getElementById('input-join-code');
      const inputJoinStudent = document.getElementById('input-join-student-name');

      const codeVal = inputJoinCode.value.trim().toUpperCase();
      const studentVal = inputJoinStudent.value.trim();

      if (feedbackJoin) {
        feedbackJoin.textContent = `Access code ${codeVal} verified! Account status: PENDING_APPROVAL. Roster and techniques unlock upon coach verification.`;
        feedbackJoin.classList.add('active');
      }

      setTimeout(() => {
        closeModal(modalJoin);
        if (feedbackJoin) feedbackJoin.classList.remove('active');
      }, 1800);
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

      btnSimulateCheckin.textContent = `+ Simulate Roll-Call Check-in (${count} classes)`;

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
