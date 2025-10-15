@echo off
REM Quick installation and startup script
REM Right-click and select "Run as administrator"

echo Installing Python dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

echo.
echo Starting server on port 80...
echo Access the application at: http://localhost
echo.

python server.py

pause
