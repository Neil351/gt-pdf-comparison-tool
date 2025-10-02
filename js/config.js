// Configuration constants for PDF Comparison App

const Config = {
    // Search configuration
    search: {
        MAX_ITERATIONS: 100000,         // Maximum regex iterations before stopping
        DEFAULT_CASE_SENSITIVE: false   // Default case sensitivity for search
    },

    // PDF extraction configuration
    pdf: {
        DEFAULT_TIMEOUT: 120000,                    // 2 minutes timeout for PDF extraction
        MAX_RECOMMENDED_SIZE: 50 * 1024 * 1024,     // 50MB - warn for larger files
        LINE_GROUPING_THRESHOLD: 5,                 // Y-position threshold for grouping text into lines
        VERTICAL_GAP_THRESHOLD: 30,                 // Vertical gap to add extra line break
        HORIZONTAL_GAP_THRESHOLD: 5,                // Horizontal gap to add space between text
        MAX_SPACES_BETWEEN_WORDS: 3,                // Maximum spaces to insert between words
        PAGE_SEPARATOR_LENGTH: 80                   // Length of page separator line
    },

    // Comparison configuration
    comparison: {
        SIMILARITY_THRESHOLD: 0.5,      // Minimum similarity (0-1) for pairing changes
        MIN_WORD_LENGTH: 1              // Minimum word length for change tracking
    },

    // UI configuration
    ui: {
        NOTIFICATION_DURATION: 3000,    // Duration to show notifications (ms)
        SCROLL_BEHAVIOR: 'smooth'       // Scroll behavior for navigation
    }
};

// Freeze config to prevent modifications
Object.freeze(Config);
Object.freeze(Config.search);
Object.freeze(Config.pdf);
Object.freeze(Config.comparison);
Object.freeze(Config.ui);
