# Dedicated Browser Profiles Guide (Workflow B)

## Overview & Architecture

BeltTrack is a multi-tenant martial arts school management platform that enforces strict role-based and school-scoped access control across Dojo Owners, Coaches, Students, and Guardians.

During local development and QA testing, developers and testers frequently need to operate two or more distinct personas simultaneously—such as a **Dojo Owner** managing curriculum or approving accounts, alongside a **Student** submitting attendance or redeeming join codes.

### The Browser Cookie Collision Problem
Under [RFC 6265](https://datatracker.ietf.org/doc/html/rfc6265), web browsers enforce a single cookie jar per origin (`http://localhost:3000`). When multiple tabs are opened within the same browser profile:
1. Logging into Account B in Tab 2 overwrites the HTTP-only session cookies (`sb-*-auth-token`) set by Account A in Tab 1.
2. The Supabase browser client uses cross-tab synchronization (`BroadcastChannel` / `storage` events), immediately forcing Tab 1 to adopt Account B's identity.
3. Incognito / Private browsing windows share cookie state across all incognito windows in the same browser, preventing simultaneous multi-role testing in incognito mode.

### The Solution: Dedicated Browser Profiles (Workflow B)
Launching Chromium-based browsers (Google Chrome or Microsoft Edge) with separate `--user-data-dir` directories partitions browser storage, cookies, session storage, and IndexedDB at the OS process level. 

Each role operates in its own sandboxed browser instance with complete, persistent isolation.

---

## Quickstart

Start the local BeltTrack development server:
```bash
npm run dev
```

In a second terminal, launch the isolated browser instances:

### Launch Both Owner & Student Windows Side-by-Side
```bash
npm run profile:both
```
*This command launches two separate Chrome/Edge windows: one for the Dojo Owner persona and one for the Student persona.*

### Launch an Individual Persona Window
```bash
# Launch Dojo Owner profile
npm run profile:owner

# Launch Student profile
npm run profile:student
```

### Custom Role or URL
The automated launcher script accepts custom parameters:
```bash
# Custom role name (creates .browser-profiles/coach)
node scripts/launch-browser-profiles.mjs --role=coach

# Custom target URL or port
node scripts/launch-browser-profiles.mjs --role=owner --url=http://localhost:3001

# Specify browser binary explicitly
node scripts/launch-browser-profiles.mjs --role=both --browser="C:\Program Files\Google\Chrome\Application\chrome.exe"
```

---

## How It Works

The automated launcher script located at [`scripts/launch-browser-profiles.mjs`](file:///c:/Users/teckm/OneDrive/Desktop/BELTTRACK%20APP/scripts/launch-browser-profiles.mjs) executes the following sequence:

1. **Browser Auto-Detection**: Searches standard installation directories across Windows, macOS, and Linux for Google Chrome or Microsoft Edge.
2. **Directory Partitioning**: Creates dedicated profile directories within the project root:
   - `.browser-profiles/owner`
   - `.browser-profiles/student`
3. **Detached Process Spawning**: Launches the browser with the isolated storage flag:
   ```bash
   chrome.exe --user-data-dir="<project-root>/.browser-profiles/owner" --no-first-run --no-default-browser-check http://localhost:3000
   ```
4. **Git Protection**: The `.browser-profiles/` directory is registered in [`.gitignore`](file:///c:/Users/teckm/OneDrive/Desktop/BELTTRACK%20APP/.gitignore) to ensure local browser caches, history, and test session cookies are never committed.

---

## Step-by-Step QA & Multi-Tenant Testing Workflow

Follow this procedure to verify multi-tenant isolation and role segregation:

### Step 1: Open Both Windows
Run `npm run profile:both`. Two browser windows will appear. Arrange them side-by-side on your monitor.

### Step 2: Authenticate Persona 1 (Dojo Owner)
1. In Window 1 (`.browser-profiles/owner`), navigate to the login modal.
2. Sign in with the Dojo Owner / Head Coach account (or use the role preview switcher to select **Dojo Owner / Head Coach**).
3. Confirm that the top navigation indicates the Dojo Owner role and displays administrative controls (e.g. school registration, join code generation).

### Step 3: Authenticate Persona 2 (Student)
1. In Window 2 (`.browser-profiles/student`), navigate to the login modal.
2. Sign in with the Student account (or select **Student (Adult 18+)** in the role switcher).
3. Enter a join code or review rank preview cards.

### Step 4: Verify Session Independence
1. **Refresh Window 1**: Observe that Window 1 remains authenticated as Dojo Owner.
2. **Refresh Window 2**: Observe that Window 2 remains authenticated as Student.
3. **Trigger Logout in Window 2**: Click "Sign Out" in Window 2.
4. **Check Window 1**: Window 1 remains active and authenticated as Dojo Owner with zero cookie collision or session interruption.

---

## Alternative: Manual Browser Profile Creation via UI

If you prefer to configure profiles manually directly inside Google Chrome or Microsoft Edge without CLI scripts:

1. Click your **Profile Avatar** in the upper-right corner of Google Chrome or Microsoft Edge.
2. Select **Add Profile** (or **Set up a new profile**).
3. Choose **Continue without an account**.
4. Name the profile `BeltTrack - Owner` and choose a distinct color theme (e.g., Blue).
5. Repeat the process to create `BeltTrack - Student` with a contrasting color theme (e.g., Red).
6. Right-click the newly created desktop shortcuts and pin them to your taskbar for quick access.

---

## Resetting Test Data & Browser Caches

To wipe all stored cookies, localStorage, and credentials saved across your test browser profiles:

```bash
# PowerShell
Remove-Item -Recurse -Force .browser-profiles

# Bash / Git Bash
rm -rf .browser-profiles
```

The next run of `npm run profile:both` will automatically recreate clean profile directories.

