// Enhanced PDF Extractor with better normalization to reduce false formatting differences
class PDFExtractor {
    constructor() {
        this.setupPDFjs();
        this.DEFAULT_TIMEOUT = Config.pdf.DEFAULT_TIMEOUT;
    }

    setupPDFjs() {
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js library not loaded. Please check your internet connection and ensure the CDN is accessible.');
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    async extractTextFromPDF(file, timeout = this.DEFAULT_TIMEOUT) {
        const abortController = { cancelled: false };

        // Create timeout promise with cancellation
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                abortController.cancelled = true;
                reject(new Error(`PDF extraction timeout after ${timeout}ms. The file may be too large or complex.`));
            }, timeout);
        });

        // Race between actual extraction and timeout
        try {
            return await Promise.race([
                this._doExtractTextFromPDF(file, abortController),
                timeoutPromise
            ]);
        } catch (error) {
            // Ensure cancellation is set on any error
            abortController.cancelled = true;
            throw error;
        }
    }

    async _doExtractTextFromPDF(file, abortController = { cancelled: false }) {
        let pdf = null;
        const pages = []; // Track loaded pages for cleanup

        try {
            // Validate file input
            if (!file || !(file instanceof Blob)) {
                throw new TypeError('Invalid file: expected a File or Blob object');
            }

            // Check file size
            if (file.size > Config.pdf.MAX_RECOMMENDED_SIZE) {
                console.warn(`Large PDF file detected (${(file.size / 1024 / 1024).toFixed(1)}MB). This may take a while to process.`);
            }

            const arrayBuffer = await file.arrayBuffer();

            // Validate arrayBuffer
            if (!arrayBuffer || arrayBuffer.byteLength === 0) {
                throw new Error('Failed to read file: file appears to be empty or corrupted');
            }

            // Check for cancellation before expensive operations
            if (abortController.cancelled) {
                throw new Error('PDF extraction cancelled');
            }

            // Load PDF document with error handling
            try {
                pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
            } catch (pdfError) {
                throw new Error(`Invalid or corrupted PDF file: ${pdfError.message}`);
            }

            // Validate PDF document
            if (!pdf || !pdf.numPages || pdf.numPages === 0) {
                throw new Error('PDF file contains no pages');
            }

            let fullText = '';

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                // Check for cancellation before processing each page
                if (abortController.cancelled) {
                    throw new Error('PDF extraction cancelled');
                }

                try {
                    const page = await pdf.getPage(pageNum);
                    pages.push(page); // Track page for cleanup

                    const textContent = await page.getTextContent();
                    const viewport = page.getViewport({ scale: 1.0 });

                    // Add page separator
                    if (pageNum > 1) {
                        fullText += '\n\n' + '─'.repeat(Config.pdf.PAGE_SEPARATOR_LENGTH) + '\n' + `Page ${pageNum}` + '\n' + '─'.repeat(Config.pdf.PAGE_SEPARATOR_LENGTH) + '\n\n';
                    }

                    // Process text with improved formatting preservation
                    const pageText = this.preserveFormatting(textContent, viewport);
                    fullText += pageText;
                } catch (pageError) {
                    console.error(`Error processing page ${pageNum}:`, pageError);
                    throw new Error(`Failed to extract text from page ${pageNum}: ${pageError.message}`);
                }
            }

            return fullText;
        } catch (error) {
            // Provide context-specific error messages
            if (error.message === 'PDF extraction cancelled') {
                throw error;
            }

            if (error instanceof TypeError) {
                throw error; // Re-throw TypeError with original message
            }

            // Wrap other errors with context
            throw new Error(`PDF extraction failed: ${error.message || 'Unknown error'}`);
        } finally {
            // Always clean up resources, even if cancelled
            // Clean up page resources first
            pages.forEach(page => {
                try {
                    if (page && typeof page.cleanup === 'function') {
                        page.cleanup();
                    }
                } catch (e) {
                    // Ignore cleanup errors but log them
                    console.warn('Page cleanup warning:', e.message);
                }
            });

            // Then clean up PDF.js document resources
            if (pdf && typeof pdf.destroy === 'function') {
                try {
                    pdf.destroy();
                } catch (e) {
                    // Ignore cleanup errors but log them
                    console.warn('PDF cleanup warning:', e.message);
                }
            }
        }
    }

    preserveFormatting(textContent, viewport) {
        // Group text by Y position (lines) with improved tolerance
        const textByLine = {};
        const threshold = Config.pdf.LINE_GROUPING_THRESHOLD;
        
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
            if (previousY && (previousY - y) > Config.pdf.VERTICAL_GAP_THRESHOLD) {
                pageText += '\n';
            }
            
            // Sort items within line by X position
            const lineItems = textByLine[y].sort((a, b) => a.x - b.x);
            
            let lineText = '';
            let previousX = 0;
            
            lineItems.forEach(item => {
                // Improved space calculation
                const gap = item.x - previousX;
                if (previousX > 0 && gap > Config.pdf.HORIZONTAL_GAP_THRESHOLD) {
                    // More consistent space calculation
                    const avgCharWidth = item.width / (item.text.length || 1);
                    const spaces = Math.round(gap / avgCharWidth);
                    lineText += ' '.repeat(Math.max(1, Math.min(spaces, Config.pdf.MAX_SPACES_BETWEEN_WORDS)));
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