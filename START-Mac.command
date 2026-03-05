#!/bin/bash
# TherAssist - One-Click Local Launcher (Mac)
# Double-click this file to start all services.

# Ensure this script is executable (fixes permission if sent from Windows)
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
    echo "    $1"
    echo "  ================================================"
    echo ""
    echo "$2"
    echo ""
    echo "  Error code: $3"
    echo "  $3" >> "$ERROR_LOG"
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
echo "  [1/6] Checking prerequisites..."
echo ""

NEED_RESTART=0

# --- Check/install Homebrew ---
if ! command -v brew &>/dev/null; then
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
    echo "        Homebrew...               OK!"
    echo ""
fi

# --- Check Python ---
echo "        Checking Python..."
if command -v python3 &>/dev/null; then
    echo "        Python...                 OK!"
else
    echo "        Python not found. Installing..."
    brew install python@3.12 2>>"$ERROR_LOG"
    if [ $? -ne 0 ]; then
        show_error "COULD NOT INSTALL PYTHON" \
"  What to do:
    1. Open your web browser
    2. Go to: https://www.python.org/downloads/
    3. Click the yellow \"Download Python\" button
    4. Open the downloaded .pkg file and follow the installer
    5. After it finishes, double-click START-Mac.command again" \
        "INSTALL-PYTHON-FAILED"
    fi
    echo "        Python...                 installed!"
    NEED_RESTART=1
fi

# --- Check Node.js ---
echo "        Checking Node.js..."
if command -v node &>/dev/null; then
    echo "        Node.js...                OK!"
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
# STEP 2: AUTHENTICATE
# ============================================================
echo "  [2/6] Signing in to SUNY Google Cloud..."
echo ""
echo "        A private browser window will open for sign-in."
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

echo "        A sign-in link will appear below."
echo "        Copy it and open it in any browser."
echo ""
gcloud auth application-default login --no-launch-browser --login-config="$LOGIN_CONFIG"
GCLOUD_EXIT=$?
if [ $GCLOUD_EXIT -ne 0 ]; then
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

gcloud config set project brk-prj-salvador-dura-bern-sbx >/dev/null 2>&1

echo "        OK - Signed in successfully!"
echo ""

# Set environment variables
export GOOGLE_CLOUD_PROJECT="brk-prj-salvador-dura-bern-sbx"
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/.config/gcloud/application_default_credentials.json"

# ============================================================
# STEP 3: FIRST-TIME SETUP
# ============================================================
echo "  [3/6] Setting up services..."
echo "        (First time takes 5-10 min. After that, instant.)"
echo ""

# --- therapy-analysis ---
if [ -d "${SCRIPT_DIR}/backend/therapy-analysis-function/venv" ]; then
    echo "        therapy-analysis...       already set up"
else
    echo "        therapy-analysis...       setting up..."
    python3 -m venv "${SCRIPT_DIR}/backend/therapy-analysis-function/venv" 2>>"$ERROR_LOG"
    if [ $? -ne 0 ]; then
        show_error "SETUP FAILED: therapy-analysis" \
"  Could not create the therapy-analysis environment.

  What to do:
    1. Delete the folder: backend/therapy-analysis-function/venv
    2. Double-click START-Mac.command again" \
        "VENV-ANALYSIS-FAILED"
    fi
    source "${SCRIPT_DIR}/backend/therapy-analysis-function/venv/bin/activate"
    pip install -q -r "${SCRIPT_DIR}/backend/therapy-analysis-function/requirements.txt" 2>>"$ERROR_LOG"
    if [ $? -ne 0 ]; then
        deactivate 2>/dev/null
        show_error "SETUP FAILED: therapy-analysis packages" \
"  Could not install packages. Check internet connection.

  What to do:
    1. Delete the folder: backend/therapy-analysis-function/venv
    2. Double-click START-Mac.command again" \
        "PIP-ANALYSIS-FAILED"
    fi
    deactivate
    echo "        therapy-analysis...       OK!"
fi

# --- storage-access ---
if [ -d "${SCRIPT_DIR}/backend/storage-access-function/venv" ]; then
    echo "        storage-access...         already set up"
else
    echo "        storage-access...         setting up..."
    python3 -m venv "${SCRIPT_DIR}/backend/storage-access-function/venv" 2>>"$ERROR_LOG"
    if [ $? -ne 0 ]; then
        show_error "SETUP FAILED: storage-access" \
"  What to do:
    1. Delete the folder: backend/storage-access-function/venv
    2. Double-click START-Mac.command again" \
        "VENV-STORAGE-FAILED"
    fi
    source "${SCRIPT_DIR}/backend/storage-access-function/venv/bin/activate"
    pip install -q -r "${SCRIPT_DIR}/backend/storage-access-function/requirements.txt" 2>>"$ERROR_LOG"
    if [ $? -ne 0 ]; then
        deactivate 2>/dev/null
        show_error "SETUP FAILED: storage-access packages" \
"  Check internet connection.
  Delete: backend/storage-access-function/venv and try again" \
        "PIP-STORAGE-FAILED"
    fi
    deactivate
    echo "        storage-access...         OK!"
fi

# --- streaming-transcription ---
if [ -d "${SCRIPT_DIR}/backend/streaming-transcription-service/venv" ]; then
    echo "        streaming-transcription...already set up"
else
    echo "        streaming-transcription...setting up..."
    python3 -m venv "${SCRIPT_DIR}/backend/streaming-transcription-service/venv" 2>>"$ERROR_LOG"
    if [ $? -ne 0 ]; then
        show_error "SETUP FAILED: streaming-transcription" \
"  What to do:
    1. Delete: backend/streaming-transcription-service/venv
    2. Double-click START-Mac.command again" \
        "VENV-STREAMING-FAILED"
    fi
    source "${SCRIPT_DIR}/backend/streaming-transcription-service/venv/bin/activate"
    pip install -q -r "${SCRIPT_DIR}/backend/streaming-transcription-service/requirements.txt" 2>>"$ERROR_LOG"
    if [ $? -ne 0 ]; then
        deactivate 2>/dev/null
        show_error "SETUP FAILED: streaming packages" \
"  Check internet connection.
  Delete: backend/streaming-transcription-service/venv and try again" \
        "PIP-STREAMING-FAILED"
    fi
    deactivate
    echo "        streaming-transcription...OK!"
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
"  Check internet connection.
  Delete: frontend/node_modules and try again" \
        "NPM-INSTALL-FAILED"
    fi
    cd "${SCRIPT_DIR}"
    echo "        frontend...               OK!"
fi

echo ""

# ============================================================
# STEP 4: START BACKEND SERVICES
# ============================================================
echo "  [4/6] Starting backend services..."
echo ""

cd "${SCRIPT_DIR}/backend/therapy-analysis-function"
GOOGLE_APPLICATION_CREDENTIALS="$HOME/.config/gcloud/application_default_credentials.json" \
GOOGLE_CLOUD_PROJECT="brk-prj-salvador-dura-bern-sbx" \
venv/bin/python -m functions_framework --target=therapy_analysis --port=8090 --debug &>/dev/null &
PIDS+=($!)
echo "        therapy-analysis (8090)...started"

cd "${SCRIPT_DIR}/backend/storage-access-function"
GOOGLE_APPLICATION_CREDENTIALS="$HOME/.config/gcloud/application_default_credentials.json" \
GOOGLE_CLOUD_PROJECT="brk-prj-salvador-dura-bern-sbx" \
venv/bin/python -m functions_framework --target=storage_access --port=8081 &>/dev/null &
PIDS+=($!)
echo "        storage-access (8081)...  started"

cd "${SCRIPT_DIR}/backend/streaming-transcription-service"
GOOGLE_APPLICATION_CREDENTIALS="$HOME/.config/gcloud/application_default_credentials.json" \
GOOGLE_CLOUD_PROJECT="brk-prj-salvador-dura-bern-sbx" \
GOOGLE_CLOUD_LOCATION="us-central1" \
PORT=8082 \
venv/bin/python main.py &>/dev/null &
PIDS+=($!)
echo "        streaming-transcription...started"

cd "${SCRIPT_DIR}"
echo ""

# ============================================================
# STEP 5: START FRONTEND
# ============================================================
echo "  [5/6] Starting frontend..."
echo ""

cd "${SCRIPT_DIR}/frontend"
npx vite --port 3000 &>/dev/null &
PIDS+=($!)
echo "        frontend (3000)...        started"

cd "${SCRIPT_DIR}"
echo ""

# ============================================================
# STEP 6: WAIT AND OPEN BROWSER
# ============================================================
echo "  [6/6] Opening browser..."
echo ""
echo "        Waiting for app to be ready..."

WAIT=0
while [ $WAIT -lt 90 ]; do
    sleep 2
    WAIT=$((WAIT + 2))
    if curl -s -o /dev/null http://localhost:3000 2>/dev/null; then
        break
    fi
    echo "        Still loading... (${WAIT} seconds)"
done

if [ $WAIT -ge 90 ]; then
    echo ""
    echo "  App is taking longer than expected to start."
    echo "  This can happen on the first launch."
    echo "  The browser will open - if the page is blank,"
    echo "  wait 30 seconds and press Cmd+R to refresh."
    echo ""
    echo "  SLOW-START at $(date)" >> "$ERROR_LOG"
fi

echo "        READY!"
echo ""

open -a Safari http://localhost:3000

echo "  ============================================"
echo "    TherAssist is running!"
echo "  ============================================"
echo ""
echo "  Your browser should have opened to TherAssist."
echo "  If not, open Safari and go to:"
echo "    http://localhost:3000"
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
