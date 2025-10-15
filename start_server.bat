@echo off
REM PDF Comparison Tool Server Startup Script for Windows
REM This script starts the FastAPI server on port 80

REM Change to the script's directory
cd /d "%~dp0"

echo ====================================
echo PDF Comparison Tool Server
echo ====================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo Python found:
python --version
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo Virtual environment not found. Creating one...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
    echo Virtual environment created successfully
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)

REM Install/update requirements
echo.
echo Checking dependencies...
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo Dependencies installed successfully
echo.

REM Check administrator privileges
net session >nul 2>&1
if errorlevel 1 (
    echo ====================================
    echo WARNING: Not running as Administrator
    echo ====================================
    echo Port 80 requires administrator privileges.
    echo Please right-click this script and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo Running with administrator privileges
echo.

REM Start the server
echo ====================================
echo Starting PDF Comparison Tool Server
echo ====================================
echo Server will be available at:
echo   - http://localhost
echo   - http://127.0.0.1
echo   - http://[your-server-ip]
echo.
echo API documentation:
echo   - http://localhost/api/docs
echo.
echo Press CTRL+C to stop the server
echo ====================================
echo.

python server.py

REM If server stops, keep window open
if errorlevel 1 (
    echo.
    echo ====================================
    echo ERROR: Server stopped with error
    echo ====================================
    pause
)
