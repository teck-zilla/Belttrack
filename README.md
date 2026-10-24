# BeltTrack Design System & Simple Onboarding

A modern, high-precision industrial conveyor digital twin telemetry onboarding experience built with **100% adherence** to the project design tokens in [`tokens-complete.json`](file:///c:/Users/teckm/OneDrive/Desktop/BELTTRACK%20APP/tokens-complete.json).

---

## 🌟 Overview & Architecture

The application guides plant operations engineers through configuring a digital twin for an industrial conveyor line while streaming live 20 Hz edge sensor telemetry in real-time.

```
BELTTRACK APP/
├── tokens-complete.json      # Single source of truth: 171+ Figma design tokens
├── build-tokens.js           # Compiler generating CSS custom properties
├── variables.css             # Colors, elevations/shadows, & atomic typo variables
├── typography.css            # Modular typography utility classes (MD3 scale)
├── index.css                 # 100% token-powered UI styles, layout, & responsive grid
├── index.html                # Semantic HTML5 onboarding application
├── app.js                    # Step wizard controller & animated canvas simulator
├── server.js                 # Built-in lightweight HTTP server
├── audit.js                  # Automated zero-hardcoded-color compliance test
└── package.json              # NPM scripts for building, auditing, and running
```

---

## 🎨 Design System Token Mapping

All visual properties are bound strictly to tokens exported in [`tokens-complete.json`](file:///c:/Users/teckm/OneDrive/Desktop/BELTTRACK%20APP/tokens-complete.json):

| Design Token Category | Figma Token Source | CSS Custom Property |
| :--- | :--- | :--- |
| **Primary Brand Navy** | `primitives 2.keycolours_2.primarykeycolour_2` | `var(--color-primary)` (`#1b2a4a`) |
| **Accent Electric Blue** | `primitives 2.keycolours_2.tertiarykeycolour_2` | `var(--color-tertiary)` (`#2563eb`) |
| **Secondary Slate** | `primitives 2.keycolours_2.secondarykeycolour_2` | `var(--color-secondary)` (`#2d3748`) |
| **Surface Background** | `colour roles.surface` | `var(--color-surface)` (`#f4f3fb`) |
| **Surface Container** | `colour roles.surface container lowest` | `var(--color-surface-container-lowest)` (`#ffffff`) |
| **Inverse Dark Surface** | `colour roles.inverse surface` | `var(--color-inverse-surface)` (`#202227`) |
| **Soft Drop Shadow 2** | `effect.soft shadow 2` | `var(--shadow-soft-shadow-2)` |
| **Medium Elevation 2** | `effect.medium shadow 2` | `var(--shadow-medium-shadow-2)` |
| **Hard Elevation 2** | `effect.hard shadow 2` | `var(--shadow-hard-shadow-2)` |
| **Display Font** | `typography.display large` | `var(--font-family-barlow-semi-condensed)` |
| **Headline & Title Font** | `typography.headline large` / `title large` | `var(--font-family-outfit)` |
| **Body Font** | `typography.body large` | `var(--font-family-inter)` |
| **Telemetry & Code Font** | `typography.label large` | `var(--font-family-jetbrains-mono)` |

---

## ⚡ Key Features

1. **Split-Screen Interactive Workspace**:
   - **Left**: 4-Step setup wizard (Facility Hub $\to$ Conveyor Digital Twin $\to$ Sensor Telemetry $\to$ Activation Verification).
   - **Right**: Real-time canvas conveyor simulator running dynamic physics, synchronized drive pulleys, continuous rubber loop, moving cargo packages, and live HUD readouts.
2. **Dynamic Physics & Telemetry Engine**:
   - Surface velocity slider (0.5 to 6.0 m/s) dynamically updates bearing temperature ($^\circ\text{C}$), belt slip %, drive motor load %, and kW consumption in real-time.
   - Live 20 Hz telemetry console streaming packet payloads with millisecond timestamps.
3. **1-Click Auto-Fill Demo**:
   - Pre-populates realistic industrial distribution center parameters for instant end-to-end testing.
4. **Zero Hardcoded Colors**:
   - Verified via [`audit.js`](file:///c:/Users/teckm/OneDrive/Desktop/BELTTRACK%20APP/audit.js). Even canvas rendering extracts CSS variables dynamically at runtime.

---

## 🚀 Running Locally

```bash
# Compile tokens to variables.css and typography.css
node build-tokens.js

# Verify token compliance (0 hardcoded colors)
node audit.js

# Start local server (running on port 3000)
node server.js
```
Open **`http://localhost:3000/`** in your browser.
