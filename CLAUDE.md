# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A web-based PDF comparison tool that extracts text from two PDF files, compares them using the diff_match_patch algorithm, and displays the differences side-by-side with color-coded highlights. The application is built with vanilla JavaScript and runs entirely client-side in modern web browsers.

## How to Run

### Client-Side (Direct Browser)
Simply open `index.html` in a modern web browser (Chrome, Firefox, Safari, or Edge). No build process, compilation, or server setup is required. The application loads dependencies from CDN:
- PDF.js 3.11.174 for PDF text extraction
- diff_match_patch for text comparison algorithms

### Server-Side (FastAPI on Windows)
For deployment on a Windows server on port 80:

1. **Quick Start**: Right-click `start_server.bat` and select "Run as administrator"
2. **Manual**:
   ```cmd
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   python server.py
   ```
3. Access at http://localhost or http://[server-ip]

See `README_SERVER.md` for detailed server setup, Windows service configuration, and troubleshooting.

**Server files**:
- `server.py` - FastAPI application that serves static files
- `requirements.txt` - Python dependencies (FastAPI, uvicorn)
- `start_server.bat` - Windows startup script with admin privilege checking
- `install_and_run.bat` - Quick installation script

## Architecture

### Module Structure

The application follows a modular class-based architecture with clear separation of concerns:

1. **PDFComparisonApp** (`js/main.js`) - Main application controller that orchestrates all modules
   - Manages application lifecycle and coordinates between modules
   - Handles file storage and comparison workflow
   - Wires up event handlers between UI and business logic

2. **PDFExtractor** (`js/pdf-extractor.js`) - PDF processing engine
   - Extracts text from PDF files using PDF.js library
   - Preserves document formatting by analyzing text item positioning (x, y coordinates)
   - Groups text items into lines based on Y-position with configurable threshold
   - Normalizes Unicode characters (spaces, quotes, hyphens) to reduce false positives
   - Implements timeout protection (2 min default) and resource cleanup

3. **ComparisonEngine** (`js/comparison-engine.js`) - Core diff algorithm implementation
   - Uses diff_match_patch library for text comparison
   - Supports two comparison modes:
     - `compareLineByLine()`: Preserves formatting, maintains document structure
     - `standardComparison()`: Flexible word/character-level comparison
   - Groups related changes for better visualization using Levenshtein distance similarity matching
   - Generates sanitized HTML output with `data-group` attributes for change grouping

4. **UIController** (`js/ui-controller.js`) - UI state and interaction management
   - Manages all DOM elements and user interactions
   - Implements synchronized scrolling between document panes using scroll percentage
   - Handles drag-and-drop file upload with validation
   - Displays grouped changes with show/hide functionality
   - Uses CSS.escape() to prevent selector injection when toggling groups

5. **SearchHandler** (`js/search-handler.js`) - Document search functionality
   - Performs case-sensitive/insensitive search across both documents
   - Uses TreeWalker API to highlight matches in text nodes without breaking HTML structure
   - Implements iteration limits (100k max) to prevent infinite loops
   - Provides navigation between search results with wrapping

6. **Config** (`js/config.js`) - Centralized configuration constants (frozen objects)

7. **Utils** (`js/utils.js`) - Shared utilities (HTML escaping for XSS prevention)

### Key Architectural Patterns

- **Event-driven communication**: UI events are passed to main controller via callback registration using `UIController.on(event, callback)`
- **Async/await**: Used throughout for PDF processing and file operations
- **Resource cleanup**: PDF.js documents and pages are explicitly destroyed in finally blocks
- **XSS prevention**: All user-controlled text uses `Utils.escapeHtml()` before DOM insertion
- **Performance optimization**:
  - Uses arrays for string building instead of concatenation (O(n) vs O(n²))
  - Batches DOM updates with DocumentFragment
  - Hides elements during bulk updates to prevent reflow thrashing
  - Uses requestAnimationFrame for smooth UI updates

### Data Flow

1. User uploads two PDF files via UIController
2. PDFComparisonApp receives files and passes to PDFExtractor
3. PDFExtractor extracts and normalizes text from both PDFs
4. ComparisonEngine compares texts and generates grouped changes with HTML output
5. UIController displays results with synchronized scrolling
6. SearchHandler allows searching within comparison results

### Change Grouping Algorithm

The comparison engine groups related changes by:
1. Separating additions and deletions
2. Computing Levenshtein similarity between all removal/addition pairs
3. Pairing changes with similarity > 0.5 threshold (Config.comparison.SIMILARITY_THRESHOLD)
4. Grouping by case-insensitive key (`removed→added`)
5. Tracking case variations and occurrence counts

Each change gets a `data-group` attribute used for bulk show/hide operations.

## Configuration

All configuration constants are in `js/config.js`:
- PDF extraction timeouts and thresholds for text positioning
- Search iteration limits
- Comparison similarity thresholds
- UI animation/scroll behavior settings

## Testing

There are test PDFs (`test_original.pdf`, `test_modified.pdf`) and a Python generator (`test_pdf_generator.py`) for creating test cases. The `test.html` and `test_script_runner.js` files appear to be for manual testing.

## Security Considerations

The codebase implements several security measures:
- Content Security Policy in index.html restricts script/style sources
- All user text is escaped with `Utils.escapeHtml()` before DOM insertion
- CSS.escape() used for dynamic selectors
- PDF file validation checks MIME type and magic number (%PDF-)
- File size limits (50MB) to prevent DoS
- DOM methods preferred over innerHTML where possible
- Regex iteration limits to prevent ReDoS attacks

## Important Implementation Details

- **Synchronized scrolling**: Based on scroll percentage, not absolute position, to handle documents of different lengths
- **Page separators**: PDFExtractor adds decorative separators between pages (80-char line of dashes)
- **Formatting preservation**: Text positioning uses configurable thresholds (5px for line grouping, 30px for vertical gaps, 5px for horizontal gaps)
- **Character normalization**: Multiple Unicode space types, hyphens, quotes, and zero-width characters are normalized to reduce false differences
- **No framework dependencies**: Pure vanilla JavaScript, making the codebase simple to understand and modify
