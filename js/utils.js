// Shared utility functions
const Utils = {
    /**
     * Escapes HTML special characters to prevent XSS
     * @param {string} text - The text to escape
     * @returns {string} The escaped HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
