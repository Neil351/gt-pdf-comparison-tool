# FastAPI Server Setup for Windows

This guide explains how to run the PDF Comparison Tool on a Windows server using FastAPI.

## Prerequisites

- Python 3.8 or higher
- Administrator privileges (required for port 80)

## Installation

### Option 1: Quick Start (Recommended)

1. Right-click `start_server.bat` and select **"Run as administrator"**
2. The script will:
   - Check for Python installation
   - Create a virtual environment (if needed)
   - Install all dependencies
   - Start the server on port 80

### Option 2: Manual Installation

1. Open Command Prompt as Administrator
2. Navigate to the project directory:
   ```cmd
   cd C:\path\to\pdf_compare
   ```

3. Create a virtual environment:
   ```cmd
   python -m venv venv
   ```

4. Activate the virtual environment:
   ```cmd
   venv\Scripts\activate
   ```

5. Install dependencies:
   ```cmd
   pip install -r requirements.txt
   ```

6. Run the server:
   ```cmd
   python server.py
   ```

## Accessing the Application

Once the server is running, access the application at:
- **Local machine**: http://localhost
- **Network**: http://[server-ip-address]
- **API Documentation**: http://localhost/api/docs

## Server Endpoints

- `GET /` - Main application page
- `GET /health` - Health check endpoint
- `GET /api/info` - Application information
- `GET /api/docs` - Interactive API documentation (Swagger UI)
- `GET /api/redoc` - Alternative API documentation (ReDoc)

## Port Configuration

The server is configured to run on **port 80** by default. To change the port:

1. Open `server.py`
2. Find the line: `port=80`
3. Change to your desired port (e.g., `port=8080`)
4. Save the file

**Note**: Ports below 1024 (including port 80) require administrator privileges on Windows.

## Running as a Windows Service

To run the server as a Windows service that starts automatically:

### Using NSSM (Non-Sucking Service Manager)

1. Download NSSM from https://nssm.cc/download
2. Extract to a folder (e.g., `C:\nssm`)
3. Open Command Prompt as Administrator
4. Install the service:
   ```cmd
   C:\nssm\nssm.exe install PDFComparisonTool
   ```
5. In the NSSM GUI:
   - **Path**: `C:\path\to\pdf_compare\venv\Scripts\python.exe`
   - **Startup directory**: `C:\path\to\pdf_compare`
   - **Arguments**: `server.py`
6. Click "Install service"
7. Start the service:
   ```cmd
   net start PDFComparisonTool
   ```

## Troubleshooting

### "Access Denied" or "Permission Denied"
- Make sure you're running as Administrator
- Port 80 requires elevated privileges on Windows

### "Python is not recognized"
- Ensure Python is installed and added to PATH
- Download from: https://www.python.org/downloads/
- During installation, check "Add Python to PATH"

### "Module not found" errors
- Make sure you activated the virtual environment
- Run: `pip install -r requirements.txt`

### Port already in use
- Another service (like IIS or Apache) might be using port 80
- Stop the other service or change the port in `server.py`
- Check what's using port 80:
  ```cmd
  netstat -ano | findstr :80
  ```

### Firewall Issues
- Windows Firewall may block port 80
- Allow Python through firewall:
  1. Open Windows Defender Firewall
  2. Click "Allow an app through firewall"
  3. Add Python executable

## Production Deployment

For production environments, consider:

1. **Use a reverse proxy** (like IIS with URL Rewrite or nginx for Windows)
2. **Enable HTTPS** for secure connections
3. **Set up monitoring** using the `/health` endpoint
4. **Configure logging** to file instead of console
5. **Use a process manager** like NSSM or Windows Service

## Stopping the Server

- **Interactive mode**: Press `CTRL+C` in the command prompt
- **Windows Service**: `net stop PDFComparisonTool`

## Security Considerations

- The application runs entirely client-side (JavaScript in browser)
- No file uploads are processed by the server
- All PDF processing happens in the user's browser
- Server only serves static files
- Consider enabling HTTPS in production
- Keep dependencies updated: `pip install --upgrade -r requirements.txt`

## Performance

The server is lightweight and can handle many concurrent connections since:
- All PDF processing is client-side
- Server only serves static files
- No database or backend processing required

## Support

For issues or questions:
- Check the main README.md for application usage
- Review server logs for error messages
- Ensure all required files are present (index.html, css/, js/ directories)
