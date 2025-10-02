// Enhanced PDF Extractor with better normalization to reduce false formatting differences
class PDFExtractor {
    constructor() {
        this.setupPDFjs();
        this.DEFAULT_TIMEOUT = 120000; // 2 minutes default timeout
    }

    setupPDFjs() {
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js library not loaded. Please check your internet connection and ensure the CDN is accessible.');
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    async extractTextFromPDF(file, timeout = this.DEFAULT_TIMEOUT) {
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`PDF extraction timeout after ${timeout}ms. The file may be too large or complex.`));
            }, timeout);
        });

        // Race between actual extraction and timeout
        return Promise.race([
            this._doExtractTextFromPDF(file),
            timeoutPromise
        ]);
    }

    async _doExtractTextFromPDF(file) {
        let pdf = null;
        const pages = []; // Track loaded pages for cleanup
        try {
            const arrayBuffer = await file.arrayBuffer();
            pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
            let fullText = '';

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                pages.push(page); // Track page for cleanup

                const textContent = await page.getTextContent();
                const viewport = page.getViewport({ scale: 1.0 });

                // Add page separator
                if (pageNum > 1) {
                    fullText += '\n\n' + '─'.repeat(80) + '\n' + `Page ${pageNum}` + '\n' + '─'.repeat(80) + '\n\n';
                }

                // Process text with improved formatting preservation
                const pageText = this.preserveFormatting(textContent, viewport);
                fullText += pageText;
            }

            return fullText;
        } catch (error) {
            throw new Error(`PDF extraction failed: ${error.message}`);
        } finally {
            // Clean up page resources first
            pages.forEach(page => {
                try {
                    if (page && page.cleanup) {
                        page.cleanup();
                    }
                } catch (e) {
                    // Ignore cleanup errors
                    console.warn('Page cleanup warning:', e.message);
                }
            });

            // Then clean up PDF.js document resources
            if (pdf) {
                try {
                    pdf.destroy();
                } catch (e) {
                    // Ignore cleanup errors
                    console.warn('PDF cleanup warning:', e.message);
                }
            }
        }
    }

    preserveFormatting(textContent, viewport) {
        // Group text by Y position (lines) with improved tolerance
        const textByLine = {};
        const threshold = 5; // Increased from 3 to handle more PDF variations
        
        textContent.items.forEach(item => {
            // Skip empty text items
            if (!item.str || !item.str.trim()) return;
            
            const y = Math.round(item.transform[5]);
            let lineY = null;
            
            // Find existing line within threshold
            for (let existingY in textByLine) {
                if (Math.abs(existingY - y) < threshold) {
                    lineY = existingY;
                    break;
                }
            }
            
            if (!lineY) {
                lineY = y;
                textByLine[lineY] = [];
            }
            
            // Normalize the text before storing
            const normalizedText = this.normalizeText(item.str);
            
            textByLine[lineY].push({
                x: item.transform[4],
                text: normalizedText,
                width: item.width,
                height: item.height
            });
        });
        
        // Sort and process lines
        const sortedLines = Object.keys(textByLine)
            .sort((a, b) => parseFloat(b) - parseFloat(a));
        
        let pageText = '';
        let previousY = null;
        
        sortedLines.forEach(y => {
            // Add extra line break for significant vertical gaps
            if (previousY && (previousY - y) > 30) { // Increased from 20
                pageText += '\n';
            }
            
            // Sort items within line by X position
            const lineItems = textByLine[y].sort((a, b) => a.x - b.x);
            
            let lineText = '';
            let previousX = 0;
            
            lineItems.forEach(item => {
                // Improved space calculation
                const gap = item.x - previousX;
                if (previousX > 0 && gap > 5) { // Reduced from 10
                    // More consistent space calculation
                    const avgCharWidth = item.width / (item.text.length || 1);
                    const spaces = Math.round(gap / avgCharWidth);
                    lineText += ' '.repeat(Math.max(1, Math.min(spaces, 3))); // Cap at 3 spaces
                }
                
                lineText += item.text;
                previousX = item.x + (item.width || 0);
            });
            
            // Trim trailing spaces but preserve internal spacing
            lineText = lineText.trimEnd();
            
            if (lineText) {
                pageText += lineText + '\n';
            }
            
            previousY = y;
        });
        
        return pageText;
    }
    
    normalizeText(text) {
        return text
            // Normalize Unicode spaces to regular spaces
            .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
            // Remove zero-width characters
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            // Normalize different types of hyphens/dashes
            .replace(/[\u2010-\u2015\u2212]/g, '-')
            // Normalize quotes
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            // Normalize ellipsis
            .replace(/\u2026/g, '...')
            // Remove soft hyphens
            .replace(/\u00AD/g, '')
            // Normalize multiple spaces to single space
            .replace(/ {2,}/g, ' ')
            // Remove leading/trailing spaces
            .trim();
    }
}