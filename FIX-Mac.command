#!/bin/bash
# TherAssist - One-Click Fix Script for Mac
# Double-click this file to fix setup issues, then run START-Mac.command again.
# This script diagnoses and repairs: Python version, broken venvs, bad packages.

# Ensure executable
if [ ! -x "$0" ]; then
    chmod +x "$0"
fi

clear
echo ""
echo "  ============================================"
echo "    TherAssist - Automatic Fix Script"
echo "    This will diagnose and repair everything."
echo "  ============================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

ERROR_LOG="${SCRIPT_DIR}/error-log.txt"
echo "TherAssist Fix Log - $(date)" > "$ERROR_LOG"
echo "" >> "$ERROR_LOG"

FIXES_APPLIED=0

# --- Make sure Homebrew is available ---
if [ -f /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -f /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
fi

# ============================================================
# STEP 1: CHECK AND FIX PYTHON VERSION
# ============================================================
echo "  [1/5] Checking Python version..."
echo ""

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
    CURRENT_VER=$(python3 --version 2>&1 | awk '{print $2}' 2>/dev/null || echo "not found")
    echo "        Current Python: $CURRENT_VER (need 3.10+)"
    echo "        Installing Python 3.12 via Homebrew..."
    echo "        (This may take a few minutes)"
    echo ""

    if ! command -v brew &>/dev/null; then
        echo "        Homebrew not found either. Installing Homebrew first..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" 2>>"$ERROR_LOG"
        if [ -f /opt/homebrew/bin/brew ]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
    fi

    brew install python@3.12 2>&1 | tee -a "$ERROR_LOG"
    if [ $? -ne 0 ]; then
        echo ""
        echo "  ERROR: Could not install Python 3.12."
        echo "  Try manually:"
        echo "    1. Open: https://www.python.org/downloads/"
        echo "    2. Download and install Python 3.12"
        echo "    3. Then run this script again"
        echo ""
        echo "  Press Enter to close..."
        read -r
        exit 1
    fi

    # Find the newly installed Python
    if command -v "$(brew --prefix python@3.12)/bin/python3.12" &>/dev/null; then
        PYTHON_CMD="$(brew --prefix python@3.12)/bin/python3.12"
    elif command -v python3.12 &>/dev/null; then
        PYTHON_CMD="python3.12"
    elif command -v python3 &>/dev/null; then
        PYTHON_CMD="python3"
    fi

    echo "        Python 3.12 installed!"
    FIXES_APPLIED=$((FIXES_APPLIED + 1))
else
    PY_VER=$("$PYTHON_CMD" --version 2>&1 | awk '{print $2}')
    echo "        Python $PY_VER — OK!"
fi
echo ""

# ============================================================
# STEP 2: FIX REQUIREMENTS.TXT
# ============================================================
echo "  [2/5] Checking requirements.txt files..."

# Fix the known typo: google-genai>=1.60.0 → >=1.0.0
REQ_FILE="${SCRIPT_DIR}/backend/therapy-analysis-function/requirements.txt"
if grep -q "google-genai>=1.60.0" "$REQ_FILE" 2>/dev/null; then
    sed -i '' 's/google-genai>=1.60.0/google-genai>=1.0.0/' "$REQ_FILE"
    echo "        FIXED: therapy-analysis/requirements.txt"
    echo "          (changed google-genai>=1.60.0 to >=1.0.0)"
    FIXES_APPLIED=$((FIXES_APPLIED + 1))
else
    echo "        requirements.txt — OK!"
fi
echo ""

# ============================================================
# STEP 3: REMOVE ALL OLD VENVS
# ============================================================
echo "  [3/5] Removing old environments..."
echo "        (They will be rebuilt with the correct Python)"
echo ""

for SERVICE_DIR in \
    "${SCRIPT_DIR}/backend/therapy-analysis-function" \
    "${SCRIPT_DIR}/backend/storage-access-function" \
    "${SCRIPT_DIR}/backend/streaming-transcription-service"; do

    SERVICE_NAME=$(basename "$SERVICE_DIR")
    VENV_DIR="${SERVICE_DIR}/venv"

    if [ -d "$VENV_DIR" ]; then
        # Show what version it had
        OLD_VER=$("${VENV_DIR}/bin/python3" --version 2>&1 | awk '{print $2}' 2>/dev/null || echo "unknown")
        rm -rf "$VENV_DIR"
        echo "        Removed: ${SERVICE_NAME}/venv (was Python $OLD_VER)"
        FIXES_APPLIED=$((FIXES_APPLIED + 1))
    else
        echo "        ${SERVICE_NAME}/venv — not present (will be created)"
    fi
done

# Also remove .venv directories if they exist
for SERVICE_DIR in \
    "${SCRIPT_DIR}/backend/therapy-analysis-function" \
    "${SCRIPT_DIR}/backend/storage-access-function" \
    "${SCRIPT_DIR}/backend/streaming-transcription-service"; do
    if [ -d "${SERVICE_DIR}/.venv" ]; then
        rm -rf "${SERVICE_DIR}/.venv"
        echo "        Removed: $(basename $SERVICE_DIR)/.venv"
    fi
done
echo ""

# ============================================================
# STEP 4: REBUILD ALL VENVS WITH CORRECT PYTHON
# ============================================================
echo "  [4/5] Rebuilding environments with $($PYTHON_CMD --version 2>&1)..."
echo ""

rebuild_service() {
    local SERVICE_NAME=$1
    local SERVICE_DIR=$2

    echo "        Setting up ${SERVICE_NAME}..."

    "$PYTHON_CMD" -m venv "${SERVICE_DIR}/venv" 2>>"$ERROR_LOG"
    if [ $? -ne 0 ]; then
        # Try without pip, then bootstrap
        "$PYTHON_CMD" -m venv --without-pip "${SERVICE_DIR}/venv" 2>>"$ERROR_LOG"
        if [ $? -ne 0 ]; then
            echo "        ERROR: Could not create venv for ${SERVICE_NAME}"
            echo "        See error-log.txt for details"
            return 1
        fi
        "${SERVICE_DIR}/venv/bin/python3" -m ensurepip --default-pip 2>>"$ERROR_LOG"
    fi

    # Upgrade pip
    "${SERVICE_DIR}/venv/bin/python3" -m pip install --upgrade pip -q 2>>"$ERROR_LOG"

    # Install packages
    echo "        Installing packages for ${SERVICE_NAME}..."
    "${SERVICE_DIR}/venv/bin/pip" install -r "${SERVICE_DIR}/requirements.txt" 2>&1 | tee -a "$ERROR_LOG" | grep -E "(ERROR|error|Successfully)" | head -5
    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        echo "        ERROR installing ${SERVICE_NAME} packages!"
        echo "        Check error-log.txt for details."
        return 1
    fi

    echo "        ${SERVICE_NAME}... OK!"
    echo ""
    return 0
}

ALL_OK=1
rebuild_service "therapy-analysis" "${SCRIPT_DIR}/backend/therapy-analysis-function" || ALL_OK=0
rebuild_service "storage-access" "${SCRIPT_DIR}/backend/storage-access-function" || ALL_OK=0
rebuild_service "streaming-transcription" "${SCRIPT_DIR}/backend/streaming-transcription-service" || ALL_OK=0

# ============================================================
# STEP 5: REBUILD FRONTEND (if node_modules is missing/broken)
# ============================================================
echo "  [5/5] Checking frontend..."

if [ -d "${SCRIPT_DIR}/frontend/node_modules" ]; then
    # Quick check: does vite exist?
    if [ -f "${SCRIPT_DIR}/frontend/node_modules/.bin/vite" ]; then
        echo "        Frontend node_modules — OK!"
    else
        echo "        Frontend node_modules looks broken, reinstalling..."
        rm -rf "${SCRIPT_DIR}/frontend/node_modules"
        cd "${SCRIPT_DIR}/frontend"
        npm install 2>>"$ERROR_LOG"
        cd "${SCRIPT_DIR}"
        echo "        Frontend — reinstalled!"
        FIXES_APPLIED=$((FIXES_APPLIED + 1))
    fi
else
    echo "        Frontend not set up yet — will be set up by START-Mac.command"
fi
echo ""

# ============================================================
# SUMMARY
# ============================================================
echo ""
if [ "$ALL_OK" -eq 1 ]; then
    echo "  ============================================"
    echo "    Fix complete! ($FIXES_APPLIED issues fixed)"
    echo ""
    echo "    Now double-click START-Mac.command"
    echo "    to launch TherAssist."
    echo ""
    echo "    IMPORTANT: Use Google Chrome, not Safari."
    echo "    Safari may not record audio properly."
    echo "  ============================================"
else
    echo "  ============================================"
    echo "    Some fixes completed, but there were errors."
    echo "    Check error-log.txt for details and"
    echo "    send it to Mohsin if you need help."
    echo "  ============================================"
fi
echo ""
echo "  Press Enter to close..."
read -r
