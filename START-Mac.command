#!/bin/bash
# TherAssist - One-Click Local Launcher (Mac)
# Double-click this file to start all services.
# Built for non-technical clinical team — all errors are auto-diagnosed.

# Ensure executable
if [ ! -x "$0" ]; then
    chmod +x "$0"
fi

clear
echo ""
echo "  ============================================"
echo "    TherAssist - Therapy Session Assistant"
echo "    Local Launcher (Mac)"
echo "  ============================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Error log
ERROR_LOG="${SCRIPT_DIR}/error-log.txt"
echo "TherAssist Error Log - $(date)" > "$ERROR_LOG"
echo "" >> "$ERROR_LOG"

# Track background PIDs for cleanup
PIDS=()

cleanup() {
    echo ""
    echo "  Stopping all services..."
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null
        wait "$pid" 2>/dev/null
    done
    for port in 8090 8081 8082 3000; do
        lsof -ti ":$port" 2>/dev/null | xargs kill -9 2>/dev/null
    done
    echo "  All services stopped."
    echo ""
    echo "  Thank you for using TherAssist!"
    echo ""
    exit 0
}
trap cleanup INT TERM EXIT

show_error() {
    echo ""
    echo "  ================================================"
    echo "    ERROR: $1"
    echo "  ================================================"
    echo ""
    echo "$2"
    echo ""
    echo "  Error code: $3"
    echo "  [$3] $1" >> "$ERROR_LOG"
    echo "$2" >> "$ERROR_LOG"
    echo "" >> "$ERROR_LOG"
    echo ""
    echo "  If this keeps happening, send the file"
    echo "  \"error-log.txt\" (in this folder) to Mohsin."
    echo ""
    echo "  Press Enter to close..."
    read -r
    exit 1
}

# ============================================================
# STEP 1: CHECK AND INSTALL PREREQUISITES
# ============================================================
echo "  [1/7] Checking prerequisites..."
echo ""

NEED_RESTART=0

# --- Check/install Homebrew ---
if ! command -v brew &>/dev/null; then
    # Check if homebrew is installed but not in PATH (Apple Silicon)
    if [ -f /opt/homebrew/bin/brew ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -f /usr/local/bin/brew ]; then
        eval "$(/usr/local/bin/brew shellenv)"
    else
        echo "        Homebrew not found. Installing..."
        echo "        (You may be asked for your Mac password)"
        echo ""
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" 2>>"$ERROR_LOG"
        if [ $? -ne 0 ]; then
            show_error "COULD NOT INSTALL HOMEBREW" \
"  Homebrew is needed to install other tools.

  What to do:
    1. Open Terminal (search for it in Spotlight)
    2. Paste this and press Enter:
       /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"
    3. Follow the instructions on screen
    4. After it finishes, double-click START-Mac.command again" \
            "INSTALL-BREW-FAILED"
        fi
        if [ -f /opt/homebrew/bin/brew ]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
        NEED_RESTART=1
    fi
fi
echo "        Homebrew...               OK!"

# --- Check Python version (need >= 3.10) ---
echo "        Checking Python..."
PYTHON_CMD=""

# Find the best Python available
for candidate in python3.12 python3.11 python3.10 python3; do
    if command -v "$candidate" &>/dev/null; then
        PY_VER=$("$candidate" --version 2>&1 | awk '{print $2}')
        PY_MAJOR=$(echo "$PY_VER" | cut -d. -f1)
        PY_MINOR=$(echo "$PY_VER" | cut -d. -f2)
        if [ "$PY_MAJOR" -ge 3 ] && [ "$PY_MINOR" -ge 10 ]; then
            PYTHON_CMD="$candidate"
            break
        fi
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    # Check what we have
    CURRENT_VER=$(python3 --version 2>&1 | awk '{print $2}' 2>/dev/null || echo "none")
    echo "        Current Python: $CURRENT_VER (too old, need 3.10+)"
    echo "        Installing Python 3.12..."
    brew install python@3.12 2>>"$ERROR_LOG"
    if [ $? -ne 0 ]; then
        show_error "COULD NOT INSTALL PYTHON 3.12" \
"  Your Mac has Python $CURRENT_VER but TherAssist needs 3.10+.

  What to do:
    1. Open your web browser
    2. Go to: https://www.python.org/downloads/
    3. Click the yellow \"Download Python 3.12\" button
    4. Open the downloaded .pkg file and follow the installer
    5. After it finishes, double-click START-Mac.command again" \
        "INSTALL-PYTHON-FAILED"
    fi

    # Find the newly installed Python
    if command -v "$(brew --prefix python@3.12)/bin/python3.12" &>/dev/null; then
        PYTHON_CMD="$(brew --prefix python@3.12)/bin/python3.12"
    elif command -v python3.12 &>/dev/null; then
        PYTHON_CMD="python3.12"
    else
        PYTHON_CMD="python3"
    fi
    NEED_RESTART=1
    echo "        Python 3.12...            installed!"
else
    PY_VER=$("$PYTHON_CMD" --version 2>&1 | awk '{print $2}')
    echo "        Python $PY_VER...          OK!"
fi

# --- Check Node.js ---
echo "        Checking Node.js..."
if command -v node &>/dev/null; then
    NODE_VER=$(node --version 2>&1)
    echo "        Node.js $NODE_VER...       OK!"
else
    echo "        Node.js not found. Installing..."
    brew install node 2>>"$ERROR_LOG"
    if [ $? -ne 0 ]; then
        show_error "COULD NOT INSTALL NODE.JS" \
"  What to do:
    1. Open your web browser
    2. Go to: https://nodejs.org/
    3. Click the green \"Download\" button (LTS version)
    4. Open the downloaded .pkg file and follow the installer
    5. After it finishes, double-click START-Mac.command again" \
        "INSTALL-NODEJS-FAILED"
    fi
    echo "        Node.js...                installed!"
    NEED_RESTART=1
fi

# --- Check gcloud ---
echo "        Checking Google Cloud SDK..."
if command -v gcloud &>/dev/null; then
    echo "        Google Cloud SDK...       OK!"
else
    # Check if installed via brew but not in PATH
    if [ -f "$(brew --prefix 2>/dev/null)/share/google-cloud-sdk/path.bash.inc" ]; then
        source "$(brew --prefix)/share/google-cloud-sdk/path.bash.inc"
        echo "        Google Cloud SDK...       OK! (found via Homebrew)"
    else
        echo "        Google Cloud SDK not found. Installing..."
        brew install --cask google-cloud-sdk 2>>"$ERROR_LOG"
        if [ $? -ne 0 ]; then
            show_error "COULD NOT INSTALL GOOGLE CLOUD SDK" \
"  What to do:
    1. Open your web browser
    2. Go to: https://cloud.google.com/sdk/docs/install
    3. Click \"macOS\" and download the installer
    4. Follow the installation instructions
    5. After it finishes, double-click START-Mac.command again" \
            "INSTALL-GCLOUD-FAILED"
        fi
        if [ -f "$(brew --prefix)/share/google-cloud-sdk/path.bash.inc" ]; then
            source "$(brew --prefix)/share/google-cloud-sdk/path.bash.inc"
        fi
        echo "        Google Cloud SDK...       installed!"
        NEED_RESTART=1
    fi
fi

if [ "$NEED_RESTART" -eq 1 ]; then
    echo ""
    echo "  ============================================"
    echo "    Software was installed successfully!"
    echo ""
    echo "    Please CLOSE this window and double-click"
    echo "    START-Mac.command again to continue."
    echo "    (One-time step so your computer finds it)"
    echo "  ============================================"
    echo ""
    echo "  Press Enter to close..."
    read -r
    exit 0
fi

echo ""
echo "        All prerequisites found!"
echo ""

# ============================================================
# STEP 2: AUTO-FIX KNOWN ISSUES
# ============================================================
echo "  [2/7] Checking for known issues..."

NEEDS_VENV_REBUILD=0

# Fix requirements.txt typo (google-genai>=1.60.0 → >=1.0.0)
REQ_FILE="${SCRIPT_DIR}/backend/therapy-analysis-function/requirements.txt"
if grep -q "google-genai>=1.60.0" "$REQ_FILE" 2>/dev/null; then
    sed -i '' 's/google-genai>=1.60.0/google-genai>=1.0.0/' "$REQ_FILE"
    echo "        Fixed requirements.txt typo"
    NEEDS_VENV_REBUILD=1
fi

# Check if existing venvs were built with wrong Python version
for SERVICE_DIR in \
    "${SCRIPT_DIR}/backend/therapy-analysis-function" \
    "${SCRIPT_DIR}/backend/storage-access-function" \
    "${SCRIPT_DIR}/backend/streaming-transcription-service"; do

    VENV_DIR="${SERVICE_DIR}/venv"
    if [ -d "$VENV_DIR" ]; then
        # Check the Python version inside the venv
        VENV_PY="${VENV_DIR}/bin/python3"
        if [ -f "$VENV_PY" ]; then
            VENV_VER=$("$VENV_PY" --version 2>&1 | awk '{print $2}' 2>/dev/null || echo "0.0.0")
            VENV_MAJOR=$(echo "$VENV_VER" | cut -d. -f1)
            VENV_MINOR=$(echo "$VENV_VER" | cut -d. -f2)
            if [ "$VENV_MAJOR" -lt 3 ] || [ "$VENV_MINOR" -lt 10 ]; then
                SERVICE_NAME=$(basename "$SERVICE_DIR")
                echo "        $SERVICE_NAME: venv has Python $VENV_VER (too old)"
                echo "        Removing old venv — will rebuild with $($PYTHON_CMD --version 2>&1)"
                rm -rf "$VENV_DIR"
                NEEDS_VENV_REBUILD=1
            fi
        else
            # Broken venv (no python binary)
            SERVICE_NAME=$(basename "$SERVICE_DIR")
            echo "        $SERVICE_NAME: venv is broken, removing"
            rm -rf "$VENV_DIR"
            NEEDS_VENV_REBUILD=1
        fi
    fi
done

if [ "$NEEDS_VENV_REBUILD" -eq 0 ]; then
    echo "        No issues found!"
fi
echo ""

# ============================================================
# STEP 3: AUTHENTICATE
# ============================================================
echo "  [3/7] Signing in to SUNY Google Cloud..."
echo ""
echo "        A sign-in link will appear below."
echo "        Copy it and open it in any browser."
echo "        Sign in with your @downstate.edu email."
echo "        After signing in, come back to this window."
echo ""

LOGIN_CONFIG="${SCRIPT_DIR}/gcloud-login-config.json"

if [ ! -f "$LOGIN_CONFIG" ]; then
    show_error "LOGIN CONFIG FILE IS MISSING" \
"  The file \"gcloud-login-config.json\" is missing.
  This file should have come with the TherAssist folder.
  Please ask Mohsin to resend the complete folder." \
    "MISSING-LOGIN-CONFIG"
fi

# Set project before auth to prevent post-login validation errors
gcloud config set project brk-prj-salvador-dura-bern-sbx >/dev/null 2>&1
gcloud config set billing/quota_project brk-prj-salvador-dura-bern-sbx >/dev/null 2>&1

gcloud auth application-default login --no-launch-browser --login-config="$LOGIN_CONFIG"

# Check if ADC file exists (gcloud may return non-zero even on success)
ADC_FILE="$HOME/.config/gcloud/application_default_credentials.json"
if [ ! -f "$ADC_FILE" ]; then
    show_error "SIGN-IN FAILED" \
"  The Google Cloud sign-in did not complete.

  Common reasons:
    - You closed the browser before finishing sign-in
    - You signed in with a non-SUNY account
    - Your internet connection dropped

  What to do:
    1. Make sure you are connected to the internet
    2. Close this window
    3. Double-click START-Mac.command again
    4. Sign in with your @downstate.edu email" \
    "AUTH-FAILED"
fi

echo ""
echo "        OK - Signed in successfully!"
echo ""

# Set environment variables
export GOOGLE_CLOUD_PROJECT="brk-prj-salvador-dura-bern-sbx"
export GOOGLE_CLOUD_LOCATION="us-central1"
export GOOGLE_APPLICATION_CREDENTIALS="$ADC_FILE"

# ============================================================
# STEP 4: FIRST-TIME SETUP
# ============================================================
echo "  [4/7] Setting up services..."
echo "        (First time takes 5-10 min. After that, instant.)"
echo ""

setup_backend_service() {
    local SERVICE_NAME=$1
    local SERVICE_DIR=$2

    if [ -d "${SERVICE_DIR}/venv" ]; then
        echo "        ${SERVICE_NAME}... already set up"
        return 0
    fi

    echo "        ${SERVICE_NAME}... setting up..."

    # Create venv with the correct Python
    "$PYTHON_CMD" -m venv "${SERVICE_DIR}/venv" 2>>"$ERROR_LOG"
    if [ $? -ne 0 ]; then
        echo "  [AUTO-FIX] venv creation failed, trying with ensurepip..." >> "$ERROR_LOG"
        "$PYTHON_CMD" -m venv --without-pip "${SERVICE_DIR}/venv" 2>>"$ERROR_LOG"
        if [ $? -ne 0 ]; then
            show_error "SETUP FAILED: ${SERVICE_NAME}" \
"  Could not create the ${SERVICE_NAME} environment.

  What to do:
    1. Double-click FIX-Mac.command (in this same folder)
    2. After it finishes, double-click START-Mac.command again

  If that doesn't work, delete the folder:
    $(basename "$SERVICE_DIR")/venv
  and try again." \
            "VENV-${SERVICE_NAME}-FAILED"
        fi
        # Bootstrap pip manually
        "${SERVICE_DIR}/venv/bin/python3" -m ensurepip --default-pip 2>>"$ERROR_LOG"
    fi

    # Upgrade pip first (avoids old pip issues)
    "${SERVICE_DIR}/venv/bin/python3" -m pip install --upgrade pip -q 2>>"$ERROR_LOG"

    # Install requirements
    "${SERVICE_DIR}/venv/bin/pip" install -q -r "${SERVICE_DIR}/requirements.txt" 2>>"$ERROR_LOG"
    if [ $? -ne 0 ]; then
        echo "" >> "$ERROR_LOG"
        echo "=== pip install output for ${SERVICE_NAME} ===" >> "$ERROR_LOG"
        "${SERVICE_DIR}/venv/bin/pip" install -r "${SERVICE_DIR}/requirements.txt" 2>&1 | tail -30 >> "$ERROR_LOG"
        rm -rf "${SERVICE_DIR}/venv"
        show_error "SETUP FAILED: ${SERVICE_NAME} packages" \
"  Could not install packages for ${SERVICE_NAME}.

  Common reasons:
    - No internet connection
    - Package version conflict

  What to do:
    1. Check your internet connection
    2. Double-click FIX-Mac.command (in this same folder)
    3. After it finishes, double-click START-Mac.command again" \
        "PIP-${SERVICE_NAME}-FAILED"
    fi
    echo "        ${SERVICE_NAME}... OK!"
}

setup_backend_service "therapy-analysis" "${SCRIPT_DIR}/backend/therapy-analysis-function"
setup_backend_service "storage-access" "${SCRIPT_DIR}/backend/storage-access-function"
setup_backend_service "streaming-stt" "${SCRIPT_DIR}/backend/streaming-transcription-service"

# --- frontend env ---
if [ ! -f "${SCRIPT_DIR}/frontend/.env.development" ]; then
    echo "        Creating frontend config..."
    cat > "${SCRIPT_DIR}/frontend/.env.development" << 'ENVEOF'
# Google Cloud settings
VITE_GOOGLE_CLOUD_PROJECT=brk-prj-salvador-dura-bern-sbx

# Backend API endpoints (LOCAL DEVELOPMENT)
VITE_ANALYSIS_API=http://localhost:8090
VITE_STORAGE_ACCESS_URL=http://localhost:8081/storage_access
VITE_STREAMING_API=ws://localhost:8082

# Authorization Configuration
VITE_AUTH_ALLOWED_DOMAINS=downstate.edu
VITE_AUTH_ALLOWED_EMAILS=mohsin.sardar@downstate.edu
ENVEOF
    echo "        frontend config...        OK!"
fi

# --- frontend ---
if [ -d "${SCRIPT_DIR}/frontend/node_modules" ]; then
    echo "        frontend...               already set up"
else
    echo "        frontend...               setting up (may take a minute)..."
    cd "${SCRIPT_DIR}/frontend"
    npm install --silent 2>>"$ERROR_LOG"
    if [ $? -ne 0 ]; then
        cd "${SCRIPT_DIR}"
        show_error "SETUP FAILED: frontend" \
"  Could not install frontend packages.

  What to do:
    1. Check internet connection
    2. Delete: frontend/node_modules
    3. Double-click START-Mac.command again" \
        "NPM-INSTALL-FAILED"
    fi
    cd "${SCRIPT_DIR}"
    echo "        frontend...               OK!"
fi

echo ""

# ============================================================
# STEP 5: KILL ANY LEFTOVER PROCESSES
# ============================================================
echo "  [5/7] Cleaning up old processes..."
for port in 8090 8081 8082 3000; do
    lsof -ti ":$port" 2>/dev/null | xargs kill -9 2>/dev/null
done
echo "        Done!"
echo ""

# ============================================================
# STEP 6: START ALL SERVICES
# ============================================================
echo "  [6/7] Starting services..."
echo ""

# Start therapy-analysis backend
cd "${SCRIPT_DIR}/backend/therapy-analysis-function"
GOOGLE_APPLICATION_CREDENTIALS="$ADC_FILE" \
GOOGLE_CLOUD_PROJECT="brk-prj-salvador-dura-bern-sbx" \
GOOGLE_CLOUD_LOCATION="us-central1" \
venv/bin/python -m functions_framework --target=therapy_analysis --port=8090 --debug \
    >>"$ERROR_LOG" 2>&1 &
PIDS+=($!)
echo "        therapy-analysis (8090)...started"

# Start storage-access backend
cd "${SCRIPT_DIR}/backend/storage-access-function"
GOOGLE_APPLICATION_CREDENTIALS="$ADC_FILE" \
GOOGLE_CLOUD_PROJECT="brk-prj-salvador-dura-bern-sbx" \
venv/bin/python -m functions_framework --target=storage_access --port=8081 \
    >>"$ERROR_LOG" 2>&1 &
PIDS+=($!)
echo "        storage-access (8081)...  started"

# Start streaming-transcription service
cd "${SCRIPT_DIR}/backend/streaming-transcription-service"
GOOGLE_APPLICATION_CREDENTIALS="$ADC_FILE" \
GOOGLE_CLOUD_PROJECT="brk-prj-salvador-dura-bern-sbx" \
GOOGLE_CLOUD_LOCATION="us-central1" \
PORT=8082 \
venv/bin/python main.py \
    >>"$ERROR_LOG" 2>&1 &
PIDS+=($!)
echo "        streaming-stt (8082)...   started"

# Start frontend
cd "${SCRIPT_DIR}/frontend"
npx vite --port 3000 >>"$ERROR_LOG" 2>&1 &
PIDS+=($!)
echo "        frontend (3000)...        started"

cd "${SCRIPT_DIR}"
echo ""

# ============================================================
# STEP 7: HEALTH CHECK AND OPEN BROWSER
# ============================================================
echo "  [7/7] Waiting for services to be ready..."
echo ""

# Wait for frontend
WAIT=0
while [ $WAIT -lt 120 ]; do
    sleep 3
    WAIT=$((WAIT + 3))
    if curl -s -o /dev/null http://localhost:3000 2>/dev/null; then
        break
    fi
    echo "        Still loading... (${WAIT}s)"
done

# Health check each service
echo ""
echo "        Service health check:"

# Frontend
if curl -s -o /dev/null http://localhost:3000 2>/dev/null; then
    echo "          Frontend (3000).......... OK"
else
    echo "          Frontend (3000).......... FAILED"
    echo "  [HEALTH] Frontend not responding on port 3000" >> "$ERROR_LOG"
fi

# Analysis
if curl -s -o /dev/null http://localhost:8090 2>/dev/null; then
    echo "          Analysis (8090).......... OK"
else
    echo "          Analysis (8090).......... STARTING (may take 15s)"
fi

# Storage
if curl -s -o /dev/null http://localhost:8081 2>/dev/null; then
    echo "          Storage  (8081).......... OK"
else
    echo "          Storage  (8081).......... STARTING"
fi

# Streaming (WebSocket - can't curl, just check if port is open)
if lsof -i :8082 >/dev/null 2>&1; then
    echo "          Streaming (8082)......... OK"
else
    echo "          Streaming (8082)......... STARTING"
fi

echo ""

# Open Chrome (preferred for mic support), fall back to default browser
if [ -d "/Applications/Google Chrome.app" ]; then
    open -a "Google Chrome" http://localhost:3000
elif [ -d "$HOME/Applications/Google Chrome.app" ]; then
    open -a "Google Chrome" http://localhost:3000
else
    # Fall back to default browser
    open http://localhost:3000
    echo "  NOTE: For best microphone support, use Google Chrome."
    echo "        Safari may have issues with audio recording."
    echo ""
fi

echo "  ============================================"
echo "    TherAssist is running!"
echo "  ============================================"
echo ""
echo "  Your browser should have opened to TherAssist."
echo "  If not, open Chrome and go to:"
echo "    http://localhost:3000"
echo ""
echo "  Password: TherAssist2026"
echo ""
echo "  IMPORTANT: Use Google Chrome for best results."
echo "  Safari may not record audio properly."
echo ""
echo "  Services running:"
echo "    Frontend:      http://localhost:3000"
echo "    Analysis:      http://localhost:8090"
echo "    Storage:       http://localhost:8081"
echo "    Transcription: ws://localhost:8082"
echo ""
echo "  ============================================"
echo "    DO NOT CLOSE THIS WINDOW while using"
echo "    TherAssist. It keeps the app running."
echo ""
echo "    When you are done, press Enter here"
echo "    to stop all services."
echo "  ============================================"
echo ""
read -r
