// Test script runner for test.html - checks if all libraries and modules are loaded
(function() {
    const results = document.getElementById('results');

    function addStatus(message, isSuccess) {
        const div = document.createElement('div');
        div.className = `status ${isSuccess ? 'success' : 'error'}`;
        div.textContent = message;
        results.appendChild(div);
    }

    // Check for external libraries when DOM is ready
    // Use a more robust detection than arbitrary timeout
    function checkLibraries() {
        // Check PDF.js
        if (typeof pdfjsLib !== 'undefined') {
            addStatus('✓ PDF.js library loaded successfully', true);
        } else {
            addStatus('✗ PDF.js library failed to load', false);
        }

        // Check diff_match_patch
        if (typeof diff_match_patch !== 'undefined') {
            addStatus('✓ diff_match_patch library loaded successfully', true);
        } else {
            addStatus('✗ diff_match_patch library failed to load', false);
        }

        // Check custom classes
        if (typeof PDFExtractor !== 'undefined') {
            addStatus('✓ PDFExtractor class loaded', true);
        } else {
            addStatus('✗ PDFExtractor class not found', false);
        }

        if (typeof ComparisonEngine !== 'undefined') {
            addStatus('✓ ComparisonEngine class loaded', true);
        } else {
            addStatus('✗ ComparisonEngine class not found', false);
        }

        if (typeof SearchHandler !== 'undefined') {
            addStatus('✓ SearchHandler class loaded', true);
        } else {
            addStatus('✗ SearchHandler class not found', false);
        }

        if (typeof UIController !== 'undefined') {
            addStatus('✓ UIController class loaded', true);
        } else {
            addStatus('✗ UIController class not found', false);
        }

        if (typeof PDFComparisonApp !== 'undefined') {
            addStatus('✓ PDFComparisonApp class loaded', true);
            addStatus('✓ All components loaded successfully! You can use the main application.', true);
        } else {
            addStatus('✗ PDFComparisonApp class not found', false);
        }
    }

    // Wait for all scripts to load (small delay to ensure async loading)
    // This is better than magic number but still uses timeout as fallback
    if (document.readyState === 'complete') {
        checkLibraries();
    } else {
        window.addEventListener('load', () => {
            // Small delay to ensure all scripts have initialized
            setTimeout(checkLibraries, 100);
        });
    }
})();
