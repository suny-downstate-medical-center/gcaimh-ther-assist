@echo off
setlocal EnableDelayedExpansion
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
echo. >> "%ERROR_LOG%"

:: ============================================================
:: STEP 1: CHECK PREREQUISITES
:: ============================================================
echo  [1/7] Checking prerequisites...
echo.

:: --- Check Python (need 3.10+) ---
echo        Checking Python...
set "PYTHON_CMD="
set "PY_OK=0"

:: Try py launcher first
py -3 --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=2" %%v in ('py -3 --version 2^>^&1') do set "PY_VER=%%v"
    for /f "tokens=2 delims=." %%m in ("!PY_VER!") do set "PY_MINOR=%%m"
    if !PY_MINOR! geq 10 (
        set "PYTHON_CMD=py -3"
        set "PY_OK=1"
        echo        Python !PY_VER!...          OK!
    ) else (
        echo        Python !PY_VER! is too old (need 3.10+^)
    )
)

:: Try python if py didn't work
if "!PY_OK!"=="0" (
    where python >nul 2>&1
    if !errorlevel! equ 0 (
        for /f "tokens=2" %%v in ('python --version 2^>^&1') do set "PY_VER=%%v"
        for /f "tokens=2 delims=." %%m in ("!PY_VER!") do set "PY_MINOR=%%m"
        if !PY_MINOR! geq 10 (
            set "PYTHON_CMD=python"
            set "PY_OK=1"
            echo        Python !PY_VER!...          OK!
        )
    )
)

if "!PY_OK!"=="0" (
    echo        Python 3.10+ not found. Installing...
    where winget >nul 2>&1
    if !errorlevel! neq 0 goto :python_manual
    winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements --silent 2>>"%ERROR_LOG%"
    if !errorlevel! equ 0 (
        echo        Python 3.12 installed!
        echo.
        echo  ============================================
        echo    Python was just installed.
        echo    Please CLOSE this window and double-click
        echo    START-Windows.bat again.
        echo    (One-time step so your computer finds it^)
        echo  ============================================
        echo.
        pause
        exit /b 0
    )
    goto :python_manual
)
goto :python_done

:python_manual
color 0C
echo.
echo  ================================================
echo    Python 3.10+ is required but not found.
echo  ================================================
echo.
echo  What to do:
echo    1. Open your web browser
echo    2. Go to: https://www.python.org/downloads/
echo    3. Click the big yellow "Download Python" button
echo    4. Run the installer
echo    5. IMPORTANT: Check "Add Python to PATH" at the bottom!
echo    6. Click "Install Now"
echo    7. Close this window and double-click START-Windows.bat again
echo.
echo  MISSING-PYTHON >> "%ERROR_LOG%"
pause
exit /b 1

:python_done

:: --- Check Node.js ---
echo        Checking Node.js...
where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=1" %%v in ('node --version 2^>^&1') do echo        Node.js %%v...        OK!
    goto :node_ok
)

echo        Node.js not found. Installing...
where winget >nul 2>&1
if %errorlevel% neq 0 goto :node_manual
winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent 2>>"%ERROR_LOG%"
if %errorlevel% equ 0 (
    echo        Node.js installed! Please CLOSE and reopen START-Windows.bat.
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
echo  Go to https://nodejs.org/ and install the LTS version.
echo  Then close this window and double-click START-Windows.bat again.
echo.
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

echo        Google Cloud SDK not found. Installing...
where winget >nul 2>&1
if %errorlevel% neq 0 goto :gcloud_manual
winget install Google.CloudSDK --accept-package-agreements --accept-source-agreements --silent 2>>"%ERROR_LOG%"
if %errorlevel% equ 0 (
    echo        Google Cloud SDK installed! Please CLOSE and reopen START-Windows.bat.
    pause
    exit /b 0
)

:gcloud_manual
color 0C
echo.
echo  Go to https://cloud.google.com/sdk/docs/install and install for Windows.
echo  Then close this window and double-click START-Windows.bat again.
echo.
echo  MISSING-GCLOUD >> "%ERROR_LOG%"
pause
exit /b 1

:gcloud_ok

echo.
echo        All prerequisites found!
echo.

:: ============================================================
:: STEP 2: AUTO-FIX KNOWN ISSUES
:: ============================================================
echo  [2/7] Checking for known issues...

:: Fix requirements.txt typo
findstr /c:"google-genai>=1.60.0" "%SCRIPT_DIR%backend\therapy-analysis-function\requirements.txt" >nul 2>&1
if %errorlevel% equ 0 (
    echo        Fixing requirements.txt typo...
    powershell -Command "(Get-Content '%SCRIPT_DIR%backend\therapy-analysis-function\requirements.txt') -replace 'google-genai>=1.60.0','google-genai>=1.0.0' | Set-Content '%SCRIPT_DIR%backend\therapy-analysis-function\requirements.txt'"
    echo        Fixed!
    if exist "%SCRIPT_DIR%backend\therapy-analysis-function\venv" (
        echo        Removing old venv (will rebuild^)...
        rmdir /s /q "%SCRIPT_DIR%backend\therapy-analysis-function\venv"
    )
) else (
    echo        No issues found!
)
echo.

:: ============================================================
:: STEP 3: AUTHENTICATE
:: ============================================================
echo  [3/7] Signing in to SUNY Google Cloud...
echo.
echo        A sign-in link will appear below.
echo        Copy it and open it in any browser.
echo        Sign in with your @downstate.edu email.
echo.

set "LOGIN_CONFIG=%SCRIPT_DIR%gcloud-login-config.json"

if not exist "%LOGIN_CONFIG%" (
    color 0C
    echo  The file "gcloud-login-config.json" is missing.
    echo  Please ask Mohsin to resend the complete folder.
    echo  MISSING-LOGIN-CONFIG >> "%ERROR_LOG%"
    pause
    exit /b 1
)

call gcloud config set project brk-prj-salvador-dura-bern-sbx >nul 2>&1
call gcloud config set billing/quota_project brk-prj-salvador-dura-bern-sbx >nul 2>&1

call gcloud auth application-default login --no-launch-browser --login-config="%LOGIN_CONFIG%"

set "ADC_FILE=%APPDATA%\gcloud\application_default_credentials.json"
if not exist "%ADC_FILE%" (
    color 0C
    echo.
    echo  Sign-in did not complete. Make sure you:
    echo    - Are connected to the internet
    echo    - Used your @downstate.edu email
    echo  Close this window and try again.
    echo  AUTH-FAILED >> "%ERROR_LOG%"
    pause
    exit /b 1
)

echo        OK - Signed in successfully!
echo.

set "GOOGLE_CLOUD_PROJECT=brk-prj-salvador-dura-bern-sbx"
set "GOOGLE_CLOUD_LOCATION=us-central1"
set "GOOGLE_APPLICATION_CREDENTIALS=%ADC_FILE%"

:: ============================================================
:: STEP 4: FIRST-TIME SETUP
:: ============================================================
echo  [4/7] Setting up services...
echo        (First time takes 5-10 min. After that, instant.^)
echo.

:: --- therapy-analysis ---
if exist "%SCRIPT_DIR%backend\therapy-analysis-function\venv" (
    echo        therapy-analysis...       already set up
    goto :setup_storage
)
echo        therapy-analysis...       setting up...
%PYTHON_CMD% -m venv "%SCRIPT_DIR%backend\therapy-analysis-function\venv" 2>>"%ERROR_LOG%"
if %errorlevel% neq 0 (
    echo        FAILED to create venv. Delete backend\therapy-analysis-function\venv and retry.
    echo  VENV-ANALYSIS-FAILED >> "%ERROR_LOG%"
    pause
    exit /b 1
)
"%SCRIPT_DIR%backend\therapy-analysis-function\venv\Scripts\python.exe" -m pip install --upgrade pip -q 2>>"%ERROR_LOG%"
"%SCRIPT_DIR%backend\therapy-analysis-function\venv\Scripts\pip.exe" install -q -r "%SCRIPT_DIR%backend\therapy-analysis-function\requirements.txt" 2>>"%ERROR_LOG%"
if %errorlevel% neq 0 (
    echo        FAILED to install packages. Check internet. Delete venv and retry.
    echo  PIP-ANALYSIS-FAILED >> "%ERROR_LOG%"
    pause
    exit /b 1
)
echo        therapy-analysis...       OK!

:setup_storage
if exist "%SCRIPT_DIR%backend\storage-access-function\venv" (
    echo        storage-access...         already set up
    goto :setup_streaming
)
echo        storage-access...         setting up...
%PYTHON_CMD% -m venv "%SCRIPT_DIR%backend\storage-access-function\venv" 2>>"%ERROR_LOG%"
if %errorlevel% neq 0 (
    echo  VENV-STORAGE-FAILED >> "%ERROR_LOG%"
    pause
    exit /b 1
)
"%SCRIPT_DIR%backend\storage-access-function\venv\Scripts\python.exe" -m pip install --upgrade pip -q 2>>"%ERROR_LOG%"
"%SCRIPT_DIR%backend\storage-access-function\venv\Scripts\pip.exe" install -q -r "%SCRIPT_DIR%backend\storage-access-function\requirements.txt" 2>>"%ERROR_LOG%"
if %errorlevel% neq 0 (
    echo  PIP-STORAGE-FAILED >> "%ERROR_LOG%"
    pause
    exit /b 1
)
echo        storage-access...         OK!

:setup_streaming
if exist "%SCRIPT_DIR%backend\streaming-transcription-service\venv" (
    echo        streaming-transcription...already set up
    goto :setup_frontend
)
echo        streaming-transcription...setting up...
%PYTHON_CMD% -m venv "%SCRIPT_DIR%backend\streaming-transcription-service\venv" 2>>"%ERROR_LOG%"
if %errorlevel% neq 0 (
    echo  VENV-STREAMING-FAILED >> "%ERROR_LOG%"
    pause
    exit /b 1
)
"%SCRIPT_DIR%backend\streaming-transcription-service\venv\Scripts\python.exe" -m pip install --upgrade pip -q 2>>"%ERROR_LOG%"
"%SCRIPT_DIR%backend\streaming-transcription-service\venv\Scripts\pip.exe" install -q -r "%SCRIPT_DIR%backend\streaming-transcription-service\requirements.txt" 2>>"%ERROR_LOG%"
if %errorlevel% neq 0 (
    echo  PIP-STREAMING-FAILED >> "%ERROR_LOG%"
    pause
    exit /b 1
)
echo        streaming-transcription...OK!

:setup_frontend
:: --- frontend env ---
if not exist "%SCRIPT_DIR%frontend\.env.development" (
    echo        Creating frontend config...
    (
        echo # Google Cloud settings
        echo VITE_GOOGLE_CLOUD_PROJECT=brk-prj-salvador-dura-bern-sbx
        echo.
        echo # Backend API endpoints ^(LOCAL DEVELOPMENT^)
        echo VITE_ANALYSIS_API=http://localhost:8090
        echo VITE_STORAGE_ACCESS_URL=http://localhost:8081/storage_access
        echo VITE_STREAMING_API=ws://localhost:8082
        echo.
        echo # Authorization Configuration
        echo VITE_AUTH_ALLOWED_DOMAINS=downstate.edu
        echo VITE_AUTH_ALLOWED_EMAILS=mohsin.sardar@downstate.edu
    ) > "%SCRIPT_DIR%frontend\.env.development"
    echo        frontend config...        OK!
)

if exist "%SCRIPT_DIR%frontend\node_modules" (
    echo        frontend...               already set up
    goto :setup_done
)
echo        frontend...               setting up...
cd /d "%SCRIPT_DIR%frontend"
call npm install --silent 2>>"%ERROR_LOG%"
if %errorlevel% neq 0 (
    cd /d "%SCRIPT_DIR%"
    echo        frontend FAILED. Check internet. Delete frontend\node_modules and retry.
    echo  NPM-INSTALL-FAILED >> "%ERROR_LOG%"
    pause
    exit /b 1
)
cd /d "%SCRIPT_DIR%"
echo        frontend...               OK!

:setup_done
echo.

:: ============================================================
:: STEP 5: KILL LEFTOVER PROCESSES
:: ============================================================
echo  [5/7] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8090 :8081 :8082 :3000" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo        Done!
echo.

:: ============================================================
:: STEP 6: START ALL SERVICES
:: ============================================================
echo  [6/7] Starting services...
echo.

start "TherAssist-Analysis" /B cmd /c "cd /d "%SCRIPT_DIR%backend\therapy-analysis-function" && set GOOGLE_APPLICATION_CREDENTIALS=%ADC_FILE% && set GOOGLE_CLOUD_PROJECT=brk-prj-salvador-dura-bern-sbx && set GOOGLE_CLOUD_LOCATION=us-central1 && venv\Scripts\python.exe -m functions_framework --target=therapy_analysis --port=8090 --debug >>"%ERROR_LOG%" 2>&1"
echo        therapy-analysis (8090)...started

start "TherAssist-Storage" /B cmd /c "cd /d "%SCRIPT_DIR%backend\storage-access-function" && set GOOGLE_APPLICATION_CREDENTIALS=%ADC_FILE% && set GOOGLE_CLOUD_PROJECT=brk-prj-salvador-dura-bern-sbx && venv\Scripts\python.exe -m functions_framework --target=storage_access --port=8081 >>"%ERROR_LOG%" 2>&1"
echo        storage-access (8081)...  started

start "TherAssist-Streaming" /B cmd /c "cd /d "%SCRIPT_DIR%backend\streaming-transcription-service" && set GOOGLE_APPLICATION_CREDENTIALS=%ADC_FILE% && set GOOGLE_CLOUD_PROJECT=brk-prj-salvador-dura-bern-sbx && set GOOGLE_CLOUD_LOCATION=us-central1 && set PORT=8082 && venv\Scripts\python.exe main.py >>"%ERROR_LOG%" 2>&1"
echo        streaming-stt (8082)...   started

start "TherAssist-Frontend" /B cmd /c "cd /d "%SCRIPT_DIR%frontend" && npx vite --port 3000 >>"%ERROR_LOG%" 2>&1"
echo        frontend (3000)...        started

echo.

:: ============================================================
:: STEP 7: HEALTH CHECK AND OPEN BROWSER
:: ============================================================
echo  [7/7] Waiting for services to be ready...
echo.

set /a "WAIT=0"
:waitloop
timeout /t 3 /nobreak >nul
set /a "WAIT+=3"
curl -s -o nul http://localhost:3000 2>nul
if %errorlevel% equ 0 goto :ready
if %WAIT% geq 120 goto :timeout
echo        Still loading... (%WAIT%s^)
goto :waitloop

:timeout
color 0E
echo  App is taking longer than expected. If the page is blank, wait and press F5.
echo  SLOW-START >> "%ERROR_LOG%"

:ready
echo.
echo        Service health check:

curl -s -o nul http://localhost:3000 2>nul
if %errorlevel% equ 0 (echo          Frontend  (3000)......... OK) else (echo          Frontend  (3000)......... FAILED)

curl -s -o nul http://localhost:8090 2>nul
if %errorlevel% equ 0 (echo          Analysis  (8090)......... OK) else (echo          Analysis  (8090)......... STARTING)

curl -s -o nul http://localhost:8081 2>nul
if %errorlevel% equ 0 (echo          Storage   (8081)......... OK) else (echo          Storage   (8081)......... STARTING)

netstat -an 2>nul | findstr ":8082.*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (echo          Streaming (8082)......... OK) else (echo          Streaming (8082)......... STARTING)

echo.

:: Open Chrome (preferred), fall back to Edge
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" http://localhost:3000
    goto :browser_opened
)
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" http://localhost:3000
    goto :browser_opened
)
start msedge http://localhost:3000
echo  NOTE: For best mic support, install Google Chrome.

:browser_opened

color 0A
echo.
echo  ============================================
echo    TherAssist is running!
echo  ============================================
echo.
echo  Open Chrome and go to: http://localhost:3000
echo  Password: TherAssist2026
echo.
echo  IMPORTANT: Use Google Chrome for best results.
echo.
echo  Services:
echo    Frontend:      http://localhost:3000
echo    Analysis:      http://localhost:8090
echo    Storage:       http://localhost:8081
echo    Transcription: ws://localhost:8082
echo.
echo  ============================================
echo    DO NOT CLOSE THIS WINDOW while using
echo    TherAssist. Press any key to stop.
echo  ============================================
echo.
pause >nul

:: CLEANUP
echo.
echo  Stopping all services...
taskkill /FI "WINDOWTITLE eq TherAssist-*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8090 :8081 :8082 :3000" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo  All services stopped. Thank you for using TherAssist!
echo.
pause
