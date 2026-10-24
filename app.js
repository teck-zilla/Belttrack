/**
 * BeltTrack Design System - Simple Onboarding Controller & Digital Twin Simulator
 * 
 * 100% Token Compliant: Canvas colors and dynamic styles are extracted directly
 * from CSS custom properties in variables.css.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================
  const state = {
    currentStep: 1,
    totalSteps: 4,
    facilityName: 'Apex Terminal Alpha',
    sector: 'E-Commerce Logistics',
    timezone: 'UTC+1',
    units: 'metric',
    beltName: 'Line 04 - Primary Incline',
    velocity: 3.8,
    beltLength: 145,
    beltWidth: 1200,
    motorKw: 90,
    sensors: {
      tachometer: true,
      thermal: true,
      vibration: true,
      drift: false
    },
    alertEmail: 'ops-alerts@apexterminal.com'
  };

  // ========================================================================
  // DOM ELEMENT REFERENCES
  // ========================================================================
  const stepCards = [
    document.getElementById('step-card-1'),
    document.getElementById('step-card-2'),
    document.getElementById('step-card-3'),
    document.getElementById('step-card-4')
  ];

  const stepPills = [
    document.getElementById('pill-step-1'),
    document.getElementById('pill-step-2'),
    document.getElementById('pill-step-3'),
    document.getElementById('pill-step-4')
  ];

  const btnBack = document.getElementById('btn-back');
  const btnNext = document.getElementById('btn-next');
  const nextLabel = document.getElementById('next-label');
  const btnQuickFill = document.getElementById('btn-quick-fill');

  // Step 1 inputs
  const inputFacilityName = document.getElementById('input-facility-name');
  const chipOptions = document.querySelectorAll('.chip-option');
  const selectTimezone = document.getElementById('select-timezone');
  const selectUnits = document.getElementById('select-units');

  // Step 2 inputs
  const inputBeltName = document.getElementById('input-belt-name');
  const inputBeltSpeed = document.getElementById('input-belt-speed');
  const readoutSpeed = document.getElementById('readout-speed');
  const inputBeltLength = document.getElementById('input-belt-length');
  const inputBeltWidth = document.getElementById('input-belt-width');
  const segmentBtns = document.querySelectorAll('.segment-btn');

  // Step 3 inputs
  const sensorCards = document.querySelectorAll('.sensor-toggle-card');
  const inputAlertEmail = document.getElementById('input-alert-email');

  // Step 4 summary elements
  const sumFacility = document.getElementById('sum-facility');
  const sumSector = document.getElementById('sum-sector');
  const sumBeltName = document.getElementById('sum-belt-name');
  const sumSpeed = document.getElementById('sum-speed');
  const sumDims = document.getElementById('sum-dims');
  const sumMotor = document.getElementById('sum-motor');
  const sumSensors = document.getElementById('sum-sensors');
  const liveLatency = document.getElementById('live-latency');

  // Preview panel elements
  const previewTagName = document.getElementById('preview-tag-name');
  const hudVelocity = document.getElementById('hud-velocity');
  const hudTemp = document.getElementById('hud-temp');
  const hudSlip = document.getElementById('hud-slip');
  const loadReadout = document.getElementById('load-readout');
  const loadBar = document.getElementById('load-bar');
  const powerReadout = document.getElementById('power-readout');
  const streamContainer = document.getElementById('stream-container');

  // Modal elements
  const launchModal = document.getElementById('launch-modal');
  const modalLineName = document.getElementById('modal-line-name');
  const btnRestartOnboarding = document.getElementById('btn-restart-onboarding');
  const btnCloseModal = document.getElementById('btn-close-modal');

  // ========================================================================
  // STEP NAVIGATION LOGIC
  // ========================================================================
  function goToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > state.totalSteps) return;

    state.currentStep = stepNumber;

    // Update step cards visibility
    stepCards.forEach((card, idx) => {
      if (idx + 1 === state.currentStep) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    // Update top progress pills
    stepPills.forEach((pill, idx) => {
      const stepIdx = idx + 1;
      pill.classList.remove('active', 'completed');
      if (stepIdx === state.currentStep) {
        pill.classList.add('active');
      } else if (stepIdx < state.currentStep) {
        pill.classList.add('completed');
      }
    });

    // Update button states
    btnBack.disabled = state.currentStep === 1;

    if (state.currentStep === state.totalSteps) {
      nextLabel.textContent = 'Activate Digital Twin';
      updateSummaryCard();
    } else if (state.currentStep === 1) {
      nextLabel.textContent = 'Continue to Digital Twin';
    } else if (state.currentStep === 2) {
      nextLabel.textContent = 'Continue to Sensors';
    } else if (state.currentStep === 3) {
      nextLabel.textContent = 'Review & Verify';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  btnBack.addEventListener('click', () => {
    if (state.currentStep > 1) {
      goToStep(state.currentStep - 1);
    }
  });

  btnNext.addEventListener('click', () => {
    if (state.currentStep < state.totalSteps) {
      goToStep(state.currentStep + 1);
    } else {
      // Launch celebration modal
      modalLineName.textContent = state.beltName || 'Line 04';
      launchModal.classList.add('active');
    }
  });

  stepPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const targetStep = parseInt(pill.getAttribute('data-step'), 10);
      goToStep(targetStep);
    });
  });

  // Modal actions
  btnRestartOnboarding.addEventListener('click', () => {
    launchModal.classList.remove('active');
    goToStep(1);
  });

  btnCloseModal.addEventListener('click', () => {
    launchModal.classList.remove('active');
  });

  // ========================================================================
  // FORM BINDINGS & INPUT SYNC
  // ========================================================================
  inputFacilityName.addEventListener('input', (e) => {
    state.facilityName = e.target.value.trim() || 'Facility Hub';
  });

  chipOptions.forEach((chip) => {
    chip.addEventListener('click', () => {
      chipOptions.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      state.sector = chip.getAttribute('data-sector');
    });
  });

  selectTimezone.addEventListener('change', (e) => {
    state.timezone = e.target.value;
  });

  selectUnits.addEventListener('change', (e) => {
    state.units = e.target.value;
  });

  inputBeltName.addEventListener('input', (e) => {
    state.beltName = e.target.value.trim() || 'Conveyor Line';
    previewTagName.textContent = state.beltName;
  });

  inputBeltSpeed.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    state.velocity = val;
    readoutSpeed.textContent = `${val.toFixed(2)} m/s`;
    hudVelocity.textContent = `${val.toFixed(2)} m/s`;
    updateSimulationMetrics();
  });

  inputBeltLength.addEventListener('input', (e) => {
    state.beltLength = parseInt(e.target.value, 10) || 100;
  });

  inputBeltWidth.addEventListener('input', (e) => {
    state.beltWidth = parseInt(e.target.value, 10) || 1000;
  });

  segmentBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      segmentBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const radio = btn.querySelector('input');
      radio.checked = true;
      state.motorKw = parseInt(radio.value, 10);
      updateSimulationMetrics();
    });
  });

  sensorCards.forEach((card) => {
    card.addEventListener('click', () => {
      const sensorKey = card.getAttribute('data-sensor');
      card.classList.toggle('enabled');
      state.sensors[sensorKey] = card.classList.contains('enabled');
    });
  });

  inputAlertEmail.addEventListener('input', (e) => {
    state.alertEmail = e.target.value.trim();
  });

  // Auto-Fill Demo Button
  btnQuickFill.addEventListener('click', () => {
    state.facilityName = 'Apex Global Distribution Alpha';
    inputFacilityName.value = state.facilityName;

    state.beltName = 'Line 07 - Main High-Speed Sortation';
    inputBeltName.value = state.beltName;
    previewTagName.textContent = state.beltName;

    state.velocity = 4.2;
    inputBeltSpeed.value = state.velocity;
    readoutSpeed.textContent = '4.20 m/s';
    hudVelocity.textContent = '4.20 m/s';

    state.beltLength = 220;
    inputBeltLength.value = state.beltLength;

    state.beltWidth = 1400;
    inputBeltWidth.value = state.beltWidth;

    state.motorKw = 132;
    segmentBtns.forEach((btn) => {
      const radio = btn.querySelector('input');
      if (radio.value === '132') {
        btn.classList.add('active');
        radio.checked = true;
      } else {
        btn.classList.remove('active');
      }
    });

    state.alertEmail = 'telemetry-ops@apexglobal.com';
    inputAlertEmail.value = state.alertEmail;

    updateSimulationMetrics();
    goToStep(4);
  });

  // ========================================================================
  // METRICS & SUMMARY RECALCULATION
  // ========================================================================
  function updateSimulationMetrics() {
    // Dynamic physics calculation based on speed & motor kW
    const baseTemp = 36.0;
    const speedFactor = state.velocity * 2.1;
    const motorFactor = (state.motorKw / 90) * 1.5;
    const calcTemp = (baseTemp + speedFactor + motorFactor).toFixed(1);
    hudTemp.textContent = `${calcTemp} °C`;

    const slipVal = (0.2 + state.velocity * 0.05).toFixed(2);
    hudSlip.textContent = `${slipVal} %`;

    const loadPercent = Math.min(95, Math.round(35 + (state.velocity / 6.0) * 45));
    loadReadout.textContent = `${loadPercent}%`;
    loadBar.style.width = `${loadPercent}%`;

    const currentKw = ((state.motorKw * loadPercent) / 100).toFixed(1);
    powerReadout.textContent = `${currentKw} kW / ${state.motorKw} kW`;
  }

  function updateSummaryCard() {
    sumFacility.textContent = state.facilityName;
    sumSector.textContent = state.sector;
    sumBeltName.textContent = state.beltName;
    sumSpeed.textContent = `${state.velocity.toFixed(2)} m/s`;
    sumDims.textContent = `${state.beltLength}m length × ${state.beltWidth}mm width`;
    sumMotor.textContent = `${state.motorKw} kW Industrial Drive`;

    const activeSensorsCount = Object.values(state.sensors).filter(Boolean).length;
    sumSensors.textContent = `${activeSensorsCount} Channels Online`;

    // Simulated latency jitter
    const latency = (5.8 + Math.random() * 2.2).toFixed(1);
    liveLatency.textContent = `${latency} ms latency`;
  }

  // ========================================================================
  // 20 HZ LIVE TELEMETRY STREAM
  // ========================================================================
  let packetSeq = 9410;
  setInterval(() => {
    packetSeq++;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    const jitterSpeed = (state.velocity + (Math.random() * 0.04 - 0.02)).toFixed(2);
    const jitterTemp = (parseFloat(hudTemp.textContent) + (Math.random() * 0.2 - 0.1)).toFixed(1);
    const slip = (0.2 + state.velocity * 0.05).toFixed(2);

    const line = document.createElement('div');
    line.className = 'ticker-line';
    line.innerHTML = `<span class="t-stamp">[${timeStr}]</span> PKT_${packetSeq}: V=${jitterSpeed}m/s T_BEAR=${jitterTemp}°C SLIP=${slip}% STATUS=NOMINAL`;

    streamContainer.appendChild(line);
    if (streamContainer.children.length > 5) {
      streamContainer.removeChild(streamContainer.children[0]);
    }
  }, 120);

  // ========================================================================
  // ANIMATED CONVEYOR BELT CANVAS SIMULATOR (DESIGN TOKEN POWERED)
  // ========================================================================
  const canvas = document.getElementById('conveyor-canvas');
  const ctx = canvas.getContext('2d');

  // Read design tokens from CSS computed styles
  const computedStyle = getComputedStyle(document.documentElement);
  const colorPrimary = computedStyle.getPropertyValue('--color-primary').trim() || computedStyle.getPropertyValue('--key-color-primary').trim();
  const colorTertiary = computedStyle.getPropertyValue('--color-tertiary').trim() || computedStyle.getPropertyValue('--key-color-tertiary').trim();
  const colorOutline = computedStyle.getPropertyValue('--color-outline').trim();
  const colorOutlineVariant = computedStyle.getPropertyValue('--color-outline-variant').trim();
  const colorNeutral10 = computedStyle.getPropertyValue('--color-palette-neutral-10').trim();
  const colorNeutral20 = computedStyle.getPropertyValue('--color-palette-neutral-20').trim();
  const colorNeutral30 = computedStyle.getPropertyValue('--color-palette-neutral-30').trim();
  const colorCargo = computedStyle.getPropertyValue('--color-tertiary-container').trim();

  let beltOffset = 0;
  let pulleyAngle = 0;

  // Material cargo items traveling on belt
  const cargoItems = [
    { x: 70, width: 36, height: 20 },
    { x: 190, width: 44, height: 22 },
    { x: 320, width: 32, height: 18 },
    { x: 440, width: 40, height: 20 }
  ];

  function renderSimulation() {
    const w = canvas.width;
    const h = canvas.height;

    // Clear viewport
    ctx.fillStyle = colorNeutral10;
    ctx.fillRect(0, 0, w, h);

    // Frame parameters
    const beltTopY = 54;
    const beltBottomY = 114;
    const beltThickness = 6;
    const headPulleyX = 50;
    const tailPulleyX = w - 50;
    const pulleyRadius = (beltBottomY - beltTopY) / 2;
    const pulleyCenterY = beltTopY + pulleyRadius;

    // Increment belt travel according to velocity slider
    const speedFactor = state.velocity * 0.9;
    beltOffset = (beltOffset + speedFactor) % 24;
    pulleyAngle += speedFactor * 0.05;

    // 1. Draw Support Truss Framework
    ctx.strokeStyle = colorNeutral30;
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Longitudinal stringer
    ctx.moveTo(30, beltBottomY + 14);
    ctx.lineTo(w - 30, beltBottomY + 14);
    // Vertical legs
    for (let lx = 60; lx < w - 40; lx += 90) {
      ctx.moveTo(lx, beltBottomY + 14);
      ctx.lineTo(lx - 12, beltBottomY + 36);
      ctx.lineTo(lx + 12, beltBottomY + 36);
    }
    ctx.stroke();

    // 2. Draw Troughing Idler Rollers
    for (let ix = 120; ix < w - 80; ix += 75) {
      // Top carrying idler
      ctx.fillStyle = colorOutline;
      ctx.beginPath();
      ctx.arc(ix, beltTopY + beltThickness + 4, 6, 0, Math.PI * 2);
      ctx.fill();

      // Return idler
      ctx.beginPath();
      ctx.arc(ix, beltBottomY - 4, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Draw Drive and Tail Pulleys
    function drawPulley(px, py, radius, angle, isDrive) {
      ctx.save();
      ctx.translate(px, py);

      // Pulley Outer Rim
      ctx.fillStyle = isDrive ? colorPrimary : colorNeutral20;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isDrive ? colorTertiary : colorOutline;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Pulley Spokes (Rotate with speed)
      ctx.rotate(angle);
      ctx.strokeStyle = colorOutlineVariant;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-radius + 4, 0);
        ctx.lineTo(radius - 4, 0);
        ctx.stroke();
        ctx.rotate(Math.PI / 4);
      }

      // Center Axle Hub
      ctx.fillStyle = colorTertiary;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    drawPulley(headPulleyX, pulleyCenterY, pulleyRadius, pulleyAngle, true);
    drawPulley(tailPulleyX, pulleyCenterY, pulleyRadius, pulleyAngle, false);

    // 4. Draw Rubber Conveyor Belt Loop
    ctx.fillStyle = colorNeutral20;
    // Top carrying strand
    ctx.fillRect(headPulleyX, beltTopY, tailPulleyX - headPulleyX, beltThickness);
    // Bottom return strand
    ctx.fillRect(headPulleyX, beltBottomY, tailPulleyX - headPulleyX, beltThickness);

    // Belt seam markings moving along top surface
    ctx.strokeStyle = colorOutline;
    ctx.lineWidth = 2;
    for (let bx = headPulleyX + beltOffset; bx < tailPulleyX; bx += 24) {
      ctx.beginPath();
      ctx.moveTo(bx, beltTopY);
      ctx.lineTo(bx - 3, beltTopY + beltThickness);
      ctx.stroke();
    }

    // 5. Draw Cargo Packages Moving on Belt
    cargoItems.forEach((cargo) => {
      cargo.x += speedFactor;
      if (cargo.x > tailPulleyX - 40) {
        cargo.x = headPulleyX + 10;
      }

      const itemY = beltTopY - cargo.height;

      // Package Body
      ctx.fillStyle = colorCargo;
      ctx.fillRect(cargo.x, itemY, cargo.width, cargo.height);

      // Package Accent Band
      ctx.strokeStyle = colorTertiary;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cargo.x, itemY, cargo.width, cargo.height);

      // Center tracking barcode stripe
      ctx.fillStyle = colorPrimary;
      ctx.fillRect(cargo.x + cargo.width / 2 - 2, itemY + 3, 4, cargo.height - 6);
    });

    // 6. Draw Telemetry Edge Sensor Nodes & Pulse Beacons
    if (state.sensors.tachometer) {
      // Optical Tachometer Sensor on Head Pulley
      ctx.fillStyle = colorTertiary;
      ctx.beginPath();
      ctx.arc(headPulleyX, beltTopY - 14, 5, 0, Math.PI * 2);
      ctx.fill();

      // Optical beam to belt
      ctx.strokeStyle = colorTertiary;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(headPulleyX, beltTopY - 14);
      ctx.lineTo(headPulleyX, beltTopY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (state.sensors.thermal) {
      // Thermal RTD Sensor on Drive Bearing
      ctx.fillStyle = colorTertiary;
      ctx.beginPath();
      ctx.arc(headPulleyX - 18, pulleyCenterY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (state.sensors.vibration) {
      // Accelerometer on Midline Idler
      const midIdlerX = Math.round(w / 2);
      ctx.fillStyle = colorTertiary;
      ctx.fillRect(midIdlerX - 4, beltBottomY + 10, 8, 8);
    }

    requestAnimationFrame(renderSimulation);
  }

  // Initialize Simulation and Metrics
  updateSimulationMetrics();
  requestAnimationFrame(renderSimulation);
});
