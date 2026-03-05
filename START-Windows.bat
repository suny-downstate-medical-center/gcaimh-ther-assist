@echo off
title TherAssist - Local Launcher
color 0B

echo.
echo  ============================================
echo    TherAssist - Therapy Session Assistant
echo    Local Launcher (Windows)
echo  ============================================
echo.

:: Get script directory
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: Create error log
set "ERROR_LOG=%SCRIPT_DIR%error-log.txt"
echo TherAssist Error Log - %date% %time% > "%ERROR_LOG%"

:: ============================================================
:: STEP 1: CHECK PREREQUISITES
:: ============================================================
echo  [1/6] Checking prerequisites...
echo.

:: --- Check Python ---
echo        Checking Python...
py --version >nul 2>&1
if %errorlevel% equ 0 (
    echo        Python...                 OK!
    goto :python_ok
)
where python >nul 2>&1
if %errorlevel% equ 0 (
    echo        Python...                 OK!
    goto :python_ok
)

:: Python not found - try to install
echo        Python not found. Installing...
where winget >nul 2>&1
if %errorlevel% neq 0 goto :python_manual
winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements --silent 2>>"%ERROR_LOG%"
if %errorlevel% equ 0 (
    echo        Python installed!
    echo.
    echo  ============================================
    echo    Python was just installed.
    echo    Please CLOSE this window and double-click
    echo    START-Windows.bat again.
    echo    (One-time step so your computer finds it)
    echo  ============================================
    echo.
    pause
    exit /b 0
)

:python_manual
color 0C
echo.
echo  ================================================
echo    Python is not installed on this computer.
echo  ================================================
echo.
echo  What to do:
echo    1. Open your web browser (Edge)
echo    2. Go to: https://www.python.org/downloads/
echo    3. Click the big yellow "Download Python" button
echo    4. Run the installer
echo    5. IMPORTANT: Check the box that says
echo       "Add Python to PATH" at the bottom!
echo    6. Click "Install Now"
echo    7. After it finishes, close this window
echo       and double-click START-Windows.bat again
echo.
echo  Error code: MISSING-PYTHON
echo  MISSING-PYTHON >> "%ERROR_LOG%"
pause
exit /b 1

:python_ok

:: --- Check Node.js ---
echo        Checking Node.js...
where node >nul 2>&1
if %errorlevel% equ 0 (
    echo        Node.js...                OK!
    goto :node_ok
)

:: Node not found - try to install
echo        Node.js not found. Installing...
where winget >nul 2>&1
if %errorlevel% neq 0 goto :node_manual
winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent 2>>"%ERROR_LOG%"
if %errorlevel% equ 0 (
    echo        Node.js installed!
    echo.
    echo  ============================================
    echo    Node.js was just installed.
    echo    Please CLOSE this window and double-click
    echo    START-Windows.bat again.
    echo    (One-time step so your computer finds it)
    echo  ============================================
    echo.
    pause
    exit /b 0
)

:node_manual
color 0C
echo.
echo  ================================================
echo    Node.js is not installed on this computer.
echo  ================================================
echo.
echo  What to do:
echo    1. Open your web browser (Edge)
echo    2. Go to: https://nodejs.org/
echo    3. Click the green "Download" button (LTS)
echo    4. Run the installer, click Next through all steps
echo    5. After it finishes, close this window
echo       and double-click START-Windows.bat again
echo.
echo  Error code: MISSING-NODEJS
echo  MISSING-NODEJS >> "%ERROR_LOG%"
pause
exit /b 1

:node_ok

:: --- Check gcloud ---
echo        Checking Google Cloud SDK...
where gcloud >nul 2>&1
if %errorlevel% equ 0 (
    echo        Google Cloud SDK...       OK!
    goto :gcloud_ok
)

:: gcloud not found - try to install
echo        Google Cloud SDK not found. Installing...
where winget >nul 2>&1
if %errorlevel% neq 0 goto :gcloud_manual
winget install Google.CloudSDK --accept-package-agreements --accept-source-agreements --silent 2>>"%ERROR_LOG%"
if %errorlevel% equ 0 (
    echo        Google Cloud SDK installed!
    echo.
    echo  ============================================
    echo    Google Cloud SDK was just installed.
    echo    Please CLOSE this window and double-click
    echo    START-Windows.bat again.
    echo    (One-time step so your computer finds it)
    echo  ============================================
    echo.
    pause
    exit /b 0
)

:gcloud_manual
color 0C
echo.
echo  ================================================
echo    Google Cloud SDK is not installed.
echo  ================================================
echo.
echo  What to do:
echo    1. Open your web browser (Edge)
echo    2. Go to: https://cloud.google.com/sdk/docs/install
echo    3. Click "Windows" and download the installer
echo    4. Run the installer, click Next through all steps
echo    5. After it finishes, close this window
echo       and double-click START-Windows.bat again
echo.
echo  Error code: MISSING-GCLOUD
echo  MISSING-GCLOUD >> "%ERROR_LOG%"
pause
exit /b 1

:gcloud_ok

echo.
echo        All prerequisites found!
echo.

:: ============================================================
:: STEP 2: AUTHENTICATE
:: ============================================================
echo  [2/6] Signing in to SUNY Google Cloud...
echo.
echo        A private browser window will open for sign-in.
echo        Sign in with your @downstate.edu email.
echo        After signing in, come back to this window.
echo.

set "LOGIN_CONFIG=%SCRIPT_DIR%gcloud-login-config.json"

if not exist "%LOGIN_CONFIG%" (
    color 0C
    echo  ================================================
    echo    Login config file is missing!
    echo  ================================================
    echo.
    echo  The file "gcloud-login-config.json" is missing.
    echo  This file should have come with the TherAssist folder.
    echo  Please ask Mohsin to resend the complete folder.
    echo.
    echo  Error code: MISSING-LOGIN-CONFIG
    echo  MISSING-LOGIN-CONFIG >> "%ERROR_LOG%"
    pause
    exit /b 1
)

echo        A sign-in link will appear below.
echo        Copy it and open it in any browser.
echo.
call gcloud auth application-default login --no-launch-browser --login-config="%LOGIN_CONFIG%"
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  ================================================
    echo    Sign-in did not complete.
    echo  ================================================
    echo.
    echo  Common reasons:
    echo    - You closed the browser before finishing sign-in
    echo    - You signed in with a non-SUNY account
    echo    - Your internet connection dropped
    echo.
    echo  What to do:
    echo    1. Make sure you are connected to the internet
    echo    2. Close this window
    echo    3. Double-click START-Windows.bat again
    echo    4. Sign in with your @downstate.edu email
    echo.
    echo  Error code: AUTH-FAILED
    echo  AUTH-FAILED >> "%ERROR_LOG%"
    pause
    exit /b 1
)

call gcloud config set project brk-prj-salvador-dura-bern-sbx >nul 2>&1

echo        OK - Signed in successfully!
echo.

:: Set environment variables
set "GOOGLE_CLOUD_PROJECT=brk-prj-salvador-dura-bern-sbx"
set "GOOGLE_APPLICATION_CREDENTIALS=%APPDATA%\gcloud\application_default_credentials.json"

:: ============================================================
:: STEP 3: FIRST-TIME SETUP
:: ============================================================
echo  [3/6] Setting up services...
echo        (First time takes 5-10 min. After that, instant.)
echo.

:: --- therapy-analysis ---
if exist "%SCRIPT_DIR%backend\therapy-analysis-function\venv" (
    echo        therapy-analysis...       already set up
    goto :setup_storage
)
echo        therapy-analysis...       setting up...
py -m venv "%SCRIPT_DIR%backend\therapy-analysis-function\venv" 2>>"%ERROR_LOG%"
if %errorlevel% neq 0 (
    python -m venv "%SCRIPT_DIR%backend\therapy-analysis-function\venv" 2>>"%ERROR_LOG%"
)
if %errorlevel% neq 0 (
    echo        therapy-analysis...       FAILED
    echo.
    echo  Could not create therapy-analysis environment.
    echo  Try deleting: backend\therapy-analysis-function\venv
    echo  Then double-click START-Windows.bat again.
    echo  Error code: VENV-ANALYSIS-FAILED
    echo  VENV-ANALYSIS-FAILED >> "%ERROR_LOG%"
    pause
    exit /b 1
)
call "%SCRIPT_DIR%backend\therapy-analysis-function\venv\Scripts\activate.bat"
pip install -q -r "%SCRIPT_DIR%backend\therapy-analysis-function\requirements.txt" 2>>"%ERROR_LOG%"
if %errorlevel% neq 0 (
    call deactivate 2>nul
    echo        therapy-analysis...       FAILED (packages)
    echo.
    echo  Could not install packages. Check internet connection.
    echo  Try deleting: backend\therapy-analysis-function\venv
    echo  Then double-click START-Windows.bat again.
    echo  Error code: PIP-ANALYSIS-FAILED
    echo  PIP-ANALYSIS-FAILED >> "%ERROR_LOG%"
    pause
    exit /b 1
)
call deactivate 2>nul
echo        therapy-analysis...       OK!

:setup_storage
:: --- storage-access ---
if exist "%SCRIPT_DIR%backend\storage-access-function\venv" (
    echo        storage-access...         already set up
    goto :setup_streaming
)
echo        storage-access...         setting up...
py -m venv "%SCRIPT_DIR%backend\storage-access-function\venv" 2>>"%ERROR_LOG%"
if %errorlevel% neq 0 (
    python -m venv "%SCRIPT_DIR%backend\storage-access-function\venv" 2>>"%ERROR_LOG%"
)
if %errorlevel% neq 0 (
    echo        storage-access...         FAILED
    echo  Error code: VENV-STORAGE-FAILED
    echo  VENV-STORAGE-FAILED >> "%ERROR_LOG%"
    pause
    exit /b 1
)
call "%SCRIPT_DIR%backend\storage-access-function\venv\Scripts\activate.bat"
pip install -q -r "%SCRIPT_DIR%backend\storage-access-function\requirements.txt" 2>>"%ERROR_LOG%"
if %errorlevel% neq 0 (
    call deactivate 2>nul
    echo        storage-access...         FAILED (packages)
    echo  Error code: PIP-STORAGE-FAILED
    echo  PIP-STORAGE-FAILED >> "%ERROR_LOG%"
    pause
    exit /b 1
)
call deactivate 2>nul
echo        storage-access...         OK!

:setup_streaming
:: --- streaming-transcription ---
if exist "%SCRIPT_DIR%backend\streaming-transcription-service\venv" (
    echo        streaming-transcription...already set up
    goto :setup_frontend
)
echo        streaming-transcription...setting up...
py -m venv "%SCRIPT_DIR%backend\streaming-transcription-service\venv" 2>>"%ERROR_LOG%"
if %errorlevel% neq 0 (
    python -m venv "%SCRIPT_DIR%backend\streaming-transcription-service\venv" 2>>"%ERROR_LOG%"
)
if %errorlevel% neq 0 (
    echo        streaming-transcription...FAILED
    echo  Error code: VENV-STREAMING-FAILED
    echo  VENV-STREAMING-FAILED >> "%ERROR_LOG%"
    pause
    exit /b 1
)
call "%SCRIPT_DIR%backend\streaming-transcription-service\venv\Scripts\activate.bat"
pip install -q -r "%SCRIPT_DIR%backend\streaming-transcription-service\requirements.txt" 2>>"%ERROR_LOG%"
if %errorlevel% neq 0 (
    call deactivate 2>nul
    echo        streaming-transcription...FAILED (packages)
    echo  Error code: PIP-STREAMING-FAILED
    echo  PIP-STREAMING-FAILED >> "%ERROR_LOG%"
    pause
    exit /b 1
)
call deactivate 2>nul
echo        streaming-transcription...OK!

:setup_frontend
:: --- frontend ---
if exist "%SCRIPT_DIR%frontend\node_modules" (
    echo        frontend...               already set up
    goto :setup_done
)
echo        frontend...               setting up (may take a minute)...
cd /d "%SCRIPT_DIR%frontend"
call npm install --silent 2>>"%ERROR_LOG%"
if %errorlevel% neq 0 (
    cd /d "%SCRIPT_DIR%"
    echo        frontend...               FAILED
    echo  Error code: NPM-INSTALL-FAILED
    echo  NPM-INSTALL-FAILED >> "%ERROR_LOG%"
    pause
    exit /b 1
)
cd /d "%SCRIPT_DIR%"
echo        frontend...               OK!

:setup_done
echo.

:: ============================================================
:: STEP 4: START BACKEND SERVICES
:: ============================================================
echo  [4/6] Starting backend services...
echo.

start "TherAssist-Analysis" /D "%SCRIPT_DIR%backend\therapy-analysis-function" /B cmd /c "set GOOGLE_APPLICATION_CREDENTIALS=%APPDATA%\gcloud\application_default_credentials.json && set GOOGLE_CLOUD_PROJECT=brk-prj-salvador-dura-bern-sbx && venv\Scripts\python.exe -m functions_framework --target=therapy_analysis --port=8090 --debug >nul 2>&1"
echo        therapy-analysis (8090)...started

start "TherAssist-Storage" /D "%SCRIPT_DIR%backend\storage-access-function" /B cmd /c "set GOOGLE_APPLICATION_CREDENTIALS=%APPDATA%\gcloud\application_default_credentials.json && set GOOGLE_CLOUD_PROJECT=brk-prj-salvador-dura-bern-sbx && venv\Scripts\python.exe -m functions_framework --target=storage_access --port=8081 >nul 2>&1"
echo        storage-access (8081)...  started

start "TherAssist-Streaming" /D "%SCRIPT_DIR%backend\streaming-transcription-service" /B cmd /c "set GOOGLE_APPLICATION_CREDENTIALS=%APPDATA%\gcloud\application_default_credentials.json && set GOOGLE_CLOUD_PROJECT=brk-prj-salvador-dura-bern-sbx && set GOOGLE_CLOUD_LOCATION=us-central1 && set PORT=8082 && venv\Scripts\python.exe main.py >nul 2>&1"
echo        streaming-transcription...started

echo.

:: ============================================================
:: STEP 5: START FRONTEND
:: ============================================================
echo  [5/6] Starting frontend...
echo.

start "TherAssist-Frontend" /D "%SCRIPT_DIR%frontend" /B cmd /c "npx vite --port 3000 >nul 2>&1"
echo        frontend (3000)...        started

echo.

:: ============================================================
:: STEP 6: WAIT AND OPEN BROWSER
:: ============================================================
echo  [6/6] Opening browser...
echo.
echo        Waiting for app to be ready...

set /a "WAIT=0"
:waitloop
timeout /t 2 /nobreak >nul
set /a "WAIT+=2"
curl -s -o nul http://localhost:3000 2>nul
if %errorlevel% equ 0 goto :ready
if %WAIT% geq 90 goto :timeout
echo        Still loading... (%WAIT% seconds)
goto :waitloop

:timeout
color 0E
echo.
echo  App is taking longer than expected to start.
echo  This can happen on the first launch.
echo  The browser will open - if the page is blank,
echo  wait 30 seconds and press F5 to refresh.
echo.
echo  SLOW-START at %time% >> "%ERROR_LOG%"

:ready
echo        READY!
echo.

start msedge http://localhost:3000

color 0A
echo  ============================================
echo    TherAssist is running!
echo  ============================================
echo.
echo  Your browser should have opened to TherAssist.
echo  If not, open Edge and go to:
echo    http://localhost:3000
echo.
echo  Services running:
echo    Frontend:      http://localhost:3000
echo    Analysis:      http://localhost:8090
echo    Storage:       http://localhost:8081
echo    Transcription: ws://localhost:8082
echo.
echo  ============================================
echo    DO NOT CLOSE THIS WINDOW while using
echo    TherAssist. It keeps the app running.
echo.
echo    When you are done, press any key here
echo    to stop all services.
echo  ============================================
echo.
pause >nul

:: ============================================================
:: CLEANUP
:: ============================================================
echo.
echo  Stopping all services...
taskkill /FI "WINDOWTITLE eq TherAssist-*" /F >nul 2>&1
taskkill /FI "IMAGENAME eq python.exe" /FI "WINDOWTITLE eq TherAssist*" /F >nul 2>&1

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8090 :8081 :8082 :3000" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo  All services stopped.
echo.
echo  Thank you for using TherAssist!
echo.
pause
