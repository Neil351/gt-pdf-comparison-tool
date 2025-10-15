"""
FastAPI server for PDF Comparison Tool
Serves the static web application on port 80 for Windows deployment
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="PDF Comparison Tool",
    description="Web-based tool for comparing PDF documents and highlighting differences",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Get the directory where this script is located
BASE_DIR = Path(__file__).resolve().parent

# Verify required files exist
REQUIRED_FILES = ["index.html", "css/styles.css", "js/main.js"]
for file_path in REQUIRED_FILES:
    full_path = BASE_DIR / file_path
    if not full_path.exists():
        logger.warning(f"Required file not found: {file_path}")


@app.get("/", response_class=HTMLResponse)
async def read_root():
    """
    Serve the main index.html page
    """
    index_file = BASE_DIR / "index.html"
    if not index_file.exists():
        logger.error("index.html not found")
        raise HTTPException(status_code=404, detail="index.html not found")

    return FileResponse(index_file)


@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring
    """
    return {
        "status": "healthy",
        "service": "PDF Comparison Tool",
        "version": "1.0.0"
    }


@app.get("/api/info")
async def app_info():
    """
    Get application information
    """
    return {
        "name": "PDF Comparison Tool",
        "version": "1.0.0",
        "description": "Compare PDF documents and highlight differences",
        "features": [
            "PDF text extraction",
            "Side-by-side comparison",
            "Difference highlighting",
            "Search functionality",
            "Synchronized scrolling"
        ]
    }


# Mount static file directories
# Serve CSS files
css_dir = BASE_DIR / "css"
if css_dir.exists():
    app.mount("/css", StaticFiles(directory=str(css_dir)), name="css")
    logger.info(f"Mounted /css directory: {css_dir}")
else:
    logger.warning(f"CSS directory not found: {css_dir}")

# Serve JavaScript files
js_dir = BASE_DIR / "js"
if js_dir.exists():
    app.mount("/js", StaticFiles(directory=str(js_dir)), name="js")
    logger.info(f"Mounted /js directory: {js_dir}")
else:
    logger.warning(f"JS directory not found: {js_dir}")


@app.on_event("startup")
async def startup_event():
    """
    Log startup information
    """
    logger.info("=" * 60)
    logger.info("PDF Comparison Tool Server Starting")
    logger.info("=" * 60)
    logger.info(f"Base directory: {BASE_DIR}")
    logger.info(f"API documentation available at: http://localhost/api/docs")
    logger.info("Server ready to accept connections")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Log shutdown information
    """
    logger.info("PDF Comparison Tool Server Shutting Down")


if __name__ == "__main__":
    import uvicorn

    # Run the server on port 80
    # Note: Running on port 80 requires administrator privileges on Windows
    logger.info("Starting server on port 80...")
    logger.info("Note: Port 80 requires administrator privileges on Windows")

    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=80,
        log_level="info",
        access_log=True
    )
