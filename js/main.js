class PDFComparisonApp {
    constructor() {
        this.pdfExtractor = new PDFExtractor();
        this.uiController = new UIController();
        this.searchHandler = null;
        this.comparisonEngine = null;
        this.files = { file1: null, file2: null };
        
        this.initialize();
    }

    initialize() {
        // Set up event handlers
        this.uiController.on('compare', this.handleComparison.bind(this));
        this.uiController.on('clear', this.handleClear.bind(this));
        this.uiController.on('search', this.handleSearch.bind(this));
        this.uiController.on('navigateSearch', this.handleNavigateSearch.bind(this));
        this.uiController.on('clearSearch', this.handleClearSearch.bind(this));
    }

    async handleComparison(file1, file2, options) {
        try {
            // Store files for potential re-use
            this.files.file1 = file1;
            this.files.file2 = file2;
            
            // Show loading state
            this.uiController.showLoading();
            
            // Extract text from both PDFs
            const [result1, result2] = await Promise.allSettled([
                this.pdfExtractor.extractTextFromPDF(file1),
                this.pdfExtractor.extractTextFromPDF(file2)
            ]);

            if (result1.status === 'rejected') {
                throw new Error(`Failed to extract first PDF: ${result1.reason.message || 'Unknown error'}`);
            }
            if (result2.status === 'rejected') {
                throw new Error(`Failed to extract second PDF: ${result2.reason.message || 'Unknown error'}`);
            }

            const text1 = result1.value;
            const text2 = result2.value;
            
            // Initialize comparison engine with options
            this.comparisonEngine = new ComparisonEngine(options);
            
            // Perform comparison
            const results = this.comparisonEngine.compareTexts(text1, text2);
            
            // Display results
            this.uiController.displayResults(results);
            
            // Initialize search handler with content elements
            this.searchHandler = new SearchHandler(
                document.getElementById('doc1Content'),
                document.getElementById('doc2Content')
            );
            
        } catch (error) {
            console.error('Comparison error:', error);
            const userMessage = error.message || 'An unexpected error occurred during comparison';
            this.uiController.showError(userMessage);
        }
    }

    handleClear() {
        this.files = { file1: null, file2: null };
        this.searchHandler = null;
        this.comparisonEngine = null;
    }
    handleSearch(searchTerm, caseSensitive) {
        if (!this.searchHandler) {
            console.warn('Search attempted before comparison');
            return;
        }
        
        const results = this.searchHandler.performSearch(searchTerm, caseSensitive);
        this.uiController.updateSearchResults(results);
    }

    handleNavigateSearch(direction) {
        if (!this.searchHandler) return;
        
        const position = this.searchHandler.navigateResults(direction);
        if (position) {
            this.uiController.updateSearchPosition(position.currentPosition, position.totalResults);
        }
    }

    handleClearSearch() {
        if (!this.searchHandler) return;
        
        this.searchHandler.clearSearch();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check for required libraries with user-friendly error handling
    const missingLibraries = [];

    if (typeof pdfjsLib === 'undefined') {
        console.error('PDF.js library not loaded');
        missingLibraries.push('PDF.js');
    }

    if (typeof diff_match_patch === 'undefined') {
        console.error('diff_match_patch library not loaded');
        missingLibraries.push('diff_match_patch');
    }

    // Show user-friendly error if libraries failed to load
    if (missingLibraries.length > 0) {
        showLibraryError(missingLibraries);
        return;
    }

    // Initialize the application
    try {
        window.pdfComparisonApp = new PDFComparisonApp();
    } catch (error) {
        console.error('Failed to initialize PDF Comparison App:', error);
        showInitializationError(error.message);
    }
});

// Display user-friendly error when libraries fail to load
function showLibraryError(missingLibraries) {
    const errorContainer = document.createElement('div');
    errorContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #f8d7da;
        color: #721c24;
        padding: 30px;
        border-radius: 8px;
        border: 2px solid #f5c6cb;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
    `;

    errorContainer.innerHTML = `
        <h2 style="margin-top: 0; color: #721c24;">⚠️ Failed to Load Required Libraries</h2>
        <p style="margin: 15px 0;">The following libraries could not be loaded:</p>
        <ul style="list-style: none; padding: 0; margin: 15px 0;">
            ${missingLibraries.map(lib => `<li style="margin: 5px 0;"><strong>${lib}</strong></li>`).join('')}
        </ul>
        <p style="margin: 15px 0;">This may be due to:</p>
        <ul style="text-align: left; margin: 10px 20px;">
            <li>Network connectivity issues</li>
            <li>CDN unavailability</li>
            <li>Firewall or ad-blocker restrictions</li>
            <li>Content Security Policy violations</li>
        </ul>
        <p style="margin: 15px 0; font-weight: bold;">Please check your internet connection and reload the page.</p>
        <button onclick="location.reload()" style="
            background: #dc3545;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 10px;
        ">Reload Page</button>
    `;

    document.body.appendChild(errorContainer);
}

// Display user-friendly error when app initialization fails
function showInitializationError(message) {
    // Safely escape HTML even if Utils is not available
    const escapedMessage = typeof Utils !== 'undefined' && Utils.escapeHtml
        ? Utils.escapeHtml(message)
        : String(message).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

    const errorContainer = document.createElement('div');
    errorContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #f8d7da;
        color: #721c24;
        padding: 30px;
        border-radius: 8px;
        border: 2px solid #f5c6cb;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
    `;

    errorContainer.innerHTML = `
        <h2 style="margin-top: 0; color: #721c24;">⚠️ Initialization Failed</h2>
        <p style="margin: 15px 0;">The PDF Comparison Tool failed to initialize:</p>
        <p style="margin: 15px 0; padding: 10px; background: #fff; border-radius: 4px; font-family: monospace; font-size: 14px;">
            ${escapedMessage}
        </p>
        <button onclick="location.reload()" style="
            background: #dc3545;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 10px;
        ">Reload Page</button>
    `;

    document.body.appendChild(errorContainer);
}