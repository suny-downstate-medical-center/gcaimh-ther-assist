#!/bin/bash
# TherAssist - Refresh Google Cloud Login (Mac)
# Double-click this if TherAssist shows a "Connection Issue" banner.
# It will open a browser — just sign in with your @downstate.edu email.
# After signing in, go back to TherAssist and click "Start Session" again.

# Ensure executable
if [ ! -x "$0" ]; then
    chmod +x "$0"
fi

clear
echo ""
echo "  ============================================"
echo "    TherAssist - Refresh Login"
echo "  ============================================"
echo ""
echo "  A browser window will open."
echo "  Sign in with your @downstate.edu email."
echo "  After signing in, come back here."
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOGIN_CONFIG="${SCRIPT_DIR}/gcloud-login-config.json"

# Ensure gcloud is available
if [ -f /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -f /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
fi

if [ -f "$(brew --prefix 2>/dev/null)/share/google-cloud-sdk/path.bash.inc" ]; then
    source "$(brew --prefix)/share/google-cloud-sdk/path.bash.inc"
fi

if ! command -v gcloud &>/dev/null; then
    echo "  ERROR: Google Cloud SDK not found."
    echo "  Please run START-Mac.command first (it installs everything)."
    echo ""
    echo "  Press Enter to close..."
    read -r
    exit 1
fi

if [ ! -f "$LOGIN_CONFIG" ]; then
    echo "  ERROR: Login config file not found."
    echo "  Make sure 'gcloud-login-config.json' is in the"
    echo "  same folder as this script."
    echo ""
    echo "  Press Enter to close..."
    read -r
    exit 1
fi

# Set project
gcloud config set project brk-prj-salvador-dura-bern-sbx >/dev/null 2>&1
gcloud config set billing/quota_project brk-prj-salvador-dura-bern-sbx >/dev/null 2>&1

# Refresh ADC credentials
gcloud auth application-default login --login-config="$LOGIN_CONFIG"

# Check success
ADC_FILE="$HOME/.config/gcloud/application_default_credentials.json"
if [ -f "$ADC_FILE" ]; then
    echo ""
    echo "  ============================================"
    echo "    Login refreshed successfully!"
    echo ""
    echo "    Go back to TherAssist in your browser"
    echo "    and click 'Start Session' to continue."
    echo "  ============================================"
else
    echo ""
    echo "  ============================================"
    echo "    Login may not have completed."
    echo "    Try again or contact Mohsin for help."
    echo "  ============================================"
fi

echo ""
echo "  Press Enter to close..."
read -r
