class SearchHandler {
    constructor(doc1Element, doc2Element) {
        if (!doc1Element || !doc2Element) {
            throw new Error('Both document elements are required for SearchHandler');
        }
        this.doc1 = doc1Element;
        this.doc2 = doc2Element;
        this.searchResults = { doc1: [], doc2: [] };
        this.currentIndex = { doc: 'doc1', index: 0 };
        this.isSearching = false; // Lock to prevent concurrent searches
    }

    // Fixed escapeRegExp function
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    performSearch(searchTerm, caseSensitive = false) {
        // Prevent concurrent searches to avoid race conditions
        if (this.isSearching) {
            console.warn('Search already in progress, ignoring new search request');
            return {
                doc1Count: this.searchResults.doc1.length,
                doc2Count: this.searchResults.doc2.length,
                totalCount: this.searchResults.doc1.length + this.searchResults.doc2.length
            };
        }

        if (!searchTerm.trim()) {
            return {
                doc1Count: 0,
                doc2Count: 0,
                totalCount: 0
            };
        }

        this.isSearching = true;

        try {
            // Clear previous highlights
            this.clearHighlights();

            // Search in both documents
            this.searchResults.doc1 = this.searchInDocument(this.doc1, searchTerm, caseSensitive);
            this.searchResults.doc2 = this.searchInDocument(this.doc2, searchTerm, caseSensitive);

            // Navigate to first result if found
            const totalResults = this.searchResults.doc1.length + this.searchResults.doc2.length;
            if (totalResults > 0) {
                this.currentIndex = this.searchResults.doc1.length > 0
                    ? { doc: 'doc1', index: 0 }
                    : { doc: 'doc2', index: 0 };
                this.highlightCurrentResult();
            }

            return {
                doc1Count: this.searchResults.doc1.length,
                doc2Count: this.searchResults.doc2.length,
                totalCount: totalResults
            };
        } finally {
            // Always release the lock
            this.isSearching = false;
        }
    }

    searchInDocument(element, searchTerm, caseSensitive) {
        const text = element.textContent;
        const matches = [];
        const flags = caseSensitive ? 'g' : 'gi';
        const searchRegex = new RegExp(this.escapeRegExp(searchTerm), flags);

        let match;
        let iterationCount = 0;
        const MAX_ITERATIONS = 100000; // Safety limit to prevent infinite loops

        while ((match = searchRegex.exec(text)) !== null) {
            // Prevent infinite loop on empty matches
            if (match[0].length === 0) {
                searchRegex.lastIndex++;
                continue;
            }

            matches.push({
                index: match.index,
                length: searchTerm.length,
                text: match[0]
            });

            // Safety check for too many iterations
            iterationCount++;
            if (iterationCount > MAX_ITERATIONS) {
                console.error('Search iteration limit exceeded. Stopping search.');
                break;
            }
        }
        // Highlight all matches
        if (matches.length > 0) {
            this.highlightMatches(element, matches);
        }

        return matches;
    }

    highlightMatches(element, matches) {
        // Use DOM-based approach to avoid HTML entity issues
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        let currentPos = 0;
        const nodesToProcess = [];

        // Map matches to text nodes
        textNodes.forEach(textNode => {
            const nodeLength = textNode.textContent.length;
            const nodeStart = currentPos;
            const nodeEnd = currentPos + nodeLength;

            matches.forEach((match, matchIndex) => {
                const matchStart = match.index;
                const matchEnd = match.index + match.length;

                // Check if match intersects with this node
                if (matchStart < nodeEnd && matchEnd > nodeStart) {
                    const relativeStart = Math.max(0, matchStart - nodeStart);
                    const relativeEnd = Math.min(nodeLength, matchEnd - nodeStart);

                    nodesToProcess.push({
                        node: textNode,
                        start: relativeStart,
                        end: relativeEnd,
                        matchIndex: matchIndex,
                        absoluteStart: matchStart
                    });
                }
            });

            currentPos = nodeEnd;
        });

        // Sort by absolute position (reverse) to maintain positions
        nodesToProcess.sort((a, b) => b.absoluteStart - a.absoluteStart);

        // Process each match
        nodesToProcess.forEach(({node, start, end, matchIndex}) => {
            if (!node.parentNode) return; // Node may have been processed already

            const text = node.textContent;
            const beforeText = text.substring(0, start);
            const matchText = text.substring(start, end);
            const afterText = text.substring(end);

            // Create highlight span
            const highlight = document.createElement('span');
            highlight.className = 'highlight';
            highlight.setAttribute('data-match-index', matchIndex);
            highlight.textContent = matchText;

            const parent = node.parentNode;

            // Replace the text node with new structure
            if (beforeText) {
                parent.insertBefore(document.createTextNode(beforeText), node);
            }
            parent.insertBefore(highlight, node);
            if (afterText) {
                parent.insertBefore(document.createTextNode(afterText), node);
            }
            parent.removeChild(node);
        });
    }

    navigateResults(direction) {
        const totalDoc1 = this.searchResults.doc1.length;
        const totalDoc2 = this.searchResults.doc2.length;
        const total = totalDoc1 + totalDoc2;
        
        if (total === 0) return;

        // Calculate global position
        let globalPos = this.currentIndex.doc === 'doc1'
            ? this.currentIndex.index
            : totalDoc1 + this.currentIndex.index;
        
        // Navigate
        globalPos += direction;
        
        // Wrap around
        if (globalPos < 0) globalPos = total - 1;
        if (globalPos >= total) globalPos = 0;
        
        // Convert back to doc and index
        if (globalPos < totalDoc1) {
            this.currentIndex = { doc: 'doc1', index: globalPos };
        } else {
            this.currentIndex = { doc: 'doc2', index: globalPos - totalDoc1 };
        }
        
        this.highlightCurrentResult();
        
        return {
            currentPosition: globalPos + 1,
            totalResults: total
        };
    }

    highlightCurrentResult() {
        // Remove current highlight
        document.querySelectorAll('.highlight.current').forEach(el => {
            el.classList.remove('current');
        });
        // Add current highlight
        const element = this.currentIndex.doc === 'doc1' ? this.doc1 : this.doc2;
        const highlights = element.querySelectorAll('.highlight');
        
        if (highlights[this.currentIndex.index]) {
            highlights[this.currentIndex.index].classList.add('current');
            highlights[this.currentIndex.index].scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    }

    clearHighlights() {
        [this.doc1, this.doc2].forEach(element => {
            const highlights = element.querySelectorAll('.highlight');
            highlights.forEach(el => {
                const parent = el.parentNode;
                parent.replaceChild(document.createTextNode(el.textContent), el);
            });
            // Normalize once after all replacements to avoid multiple reflows
            element.normalize();
        });
    }

    clearSearch() {
        this.clearHighlights();
        this.searchResults = { doc1: [], doc2: [] };
        this.currentIndex = { doc: 'doc1', index: 0 };
    }
}