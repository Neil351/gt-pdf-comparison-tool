class ComparisonEngine {
    constructor(options = {}) {
        this.options = {
            ignoreCase: false,
            ignoreWhitespace: false,
            wordLevel: true,
            preserveFormat: true,
            ...options
        };
        this.dmp = new diff_match_patch();
    }

    compareTexts(text1, text2) {
        // Validate inputs
        if (typeof text1 !== 'string' || typeof text2 !== 'string') {
            throw new TypeError('Both inputs must be strings');
        }

        // Handle empty inputs
        if (!text1 && !text2) {
            return {
                doc1HTML: '',
                doc2HTML: '',
                stats: { addedCount: 0, removedCount: 0, unchangedCount: 0 }
            };
        }

        // Apply minimal formatting normalization to reduce false positives
        text1 = this.preprocessForFormatting(text1);
        text2 = this.preprocessForFormatting(text2);
        
        if (this.options.preserveFormat && !this.options.ignoreWhitespace) {
            return this.compareLineByLine(text1, text2);
        } else {
            return this.standardComparison(text1, text2);
        }
    }
    
    // New method to handle common PDF formatting issues
    preprocessForFormatting(text) {
        return text
            // Normalize Unicode spaces
            .replace(/[\u00A0]/g, ' ')           // Non-breaking space
            .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width characters
            .replace(/[\u2000-\u200A\u202F\u205F]/g, ' ') // Various spaces
            // Normalize line endings
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            // Clean up lines
            .split('\n')
            .map(line => {
                line = line.trimEnd(); // Remove trailing spaces
                line = line.replace(/ {3,}/g, '  '); // Normalize 3+ spaces
                return line;
            })
            .join('\n')
            // Remove excessive blank lines
            .replace(/\n{3,}/g, '\n\n');
    }

    compareLineByLine(text1, text2) {
        const lines1 = text1.split('\n');
        const lines2 = text2.split('\n');

        let doc1HTML = '';
        let doc2HTML = '';
        let stats = {
            addedCount: 0,
            removedCount: 0,
            unchangedCount: 0
        };
        const changes = []; // Track individual changes for grouping

        // Use diff_match_patch on the line arrays
        const linesDiff = this.dmp.diff_main(lines1.join('\n'), lines2.join('\n'));
        this.dmp.diff_cleanupSemantic(linesDiff);
        
        linesDiff.forEach(([operation, text]) => {
            const lines = text.split('\n');

            if (operation === 0) { // No change
                lines.forEach(line => {
                    if (line.includes('─'.repeat(10))) {
                        // Page separator
                        doc1HTML += `<div class="page-separator">${Utils.escapeHtml(line)}</div>`;
                        doc2HTML += `<div class="page-separator">${Utils.escapeHtml(line)}</div>`;
                    } else {
                        doc1HTML += Utils.escapeHtml(line) + '\n';
                        doc2HTML += Utils.escapeHtml(line) + '\n';
                        stats.unchangedCount += line.length;
                    }
                });
            } else if (operation === -1) { // Deletion
                lines.forEach(line => {
                    if (line.trim()) {
                        doc1HTML += `<span class="removed">${Utils.escapeHtml(line)}</span>\n`;
                        stats.removedCount += line.split(/\s+/).filter(w => w).length;
                        // Track removed text for grouping
                        changes.push({ type: 'removed', text: line.trim() });
                    }
                });
            } else if (operation === 1) { // Addition
                lines.forEach(line => {
                    if (line.trim()) {
                        doc2HTML += `<span class="added">${Utils.escapeHtml(line)}</span>\n`;
                        stats.addedCount += line.split(/\s+/).filter(w => w).length;
                        // Track added text for grouping
                        changes.push({ type: 'added', text: line.trim() });
                    }
                });
            }
        });

        // Group changes
        const groupedChanges = this.groupChanges(changes);

        return {
            doc1HTML,
            doc2HTML,
            stats,
            groupedChanges
        };
    }

    standardComparison(text1, text2) {
        // Process text based on options
        let processedText1 = text1;
        let processedText2 = text2;
        
        if (this.options.ignoreCase) {
            processedText1 = processedText1.toLowerCase();
            processedText2 = processedText2.toLowerCase();
        }
        
        if (this.options.ignoreWhitespace) {
            processedText1 = processedText1.replace(/\s+/g, ' ').trim();
            processedText2 = processedText2.replace(/\s+/g, ' ').trim();
        }        
        // Perform comparison
        let diffs;
        
        if (this.options.wordLevel) {
            // Word-level comparison
            const words1 = processedText1.split(/\s+/);
            const words2 = processedText2.split(/\s+/);
            diffs = this.dmp.diff_main(words1.join(' '), words2.join(' '));
        } else {
            // Character-level comparison
            diffs = this.dmp.diff_main(processedText1, processedText2);
        }
        
        this.dmp.diff_cleanupSemantic(diffs);
        
        return this.formatDiffsToHTML(diffs);
    }

    formatDiffsToHTML(diffs) {
        let doc1HTML = '';
        let doc2HTML = '';
        let stats = {
            addedCount: 0,
            removedCount: 0,
            unchangedCount: 0
        };
        const changes = []; // Track individual changes for grouping

        diffs.forEach(([operation, text]) => {
            if (operation === 0) {
                // No change
                doc1HTML += Utils.escapeHtml(text);
                doc2HTML += Utils.escapeHtml(text);
                stats.unchangedCount += text.length;
            } else if (operation === -1) { // Deletion
                doc1HTML += `<span class="removed">${Utils.escapeHtml(text)}</span>`;
                stats.removedCount += text.split(/\s+/).filter(w => w).length;
                // Track removed text for grouping
                if (text.trim()) {
                    changes.push({ type: 'removed', text: text.trim() });
                }
            } else if (operation === 1) { // Addition
                doc2HTML += `<span class="added">${Utils.escapeHtml(text)}</span>`;
                stats.addedCount += text.split(/\s+/).filter(w => w).length;
                // Track added text for grouping
                if (text.trim()) {
                    changes.push({ type: 'added', text: text.trim() });
                }
            }
        });

        // Group changes
        const groupedChanges = this.groupChanges(changes);

        return {
            doc1HTML,
            doc2HTML,
            stats,
            groupedChanges
        };
    }


    groupChanges(changes) {
        // Pair up removed/added changes and group them
        const pairs = [];
        let i = 0;

        while (i < changes.length) {
            const current = changes[i];

            if (current.type === 'removed' && i + 1 < changes.length && changes[i + 1].type === 'added') {
                // Found a removed -> added pair
                pairs.push({
                    removed: current.text,
                    added: changes[i + 1].text
                });
                i += 2;
            } else if (current.type === 'removed') {
                // Standalone removal (no corresponding addition)
                pairs.push({
                    removed: current.text,
                    added: ''
                });
                i++;
            } else if (current.type === 'added') {
                // Standalone addition (no corresponding removal)
                pairs.push({
                    removed: '',
                    added: current.text
                });
                i++;
            } else {
                i++;
            }
        }

        // Group pairs by normalized (case-insensitive) key
        const grouped = new Map();

        pairs.forEach(pair => {
            // Create a case-insensitive key
            const key = `${pair.removed.toLowerCase()}→${pair.added.toLowerCase()}`;

            if (grouped.has(key)) {
                const existing = grouped.get(key);
                existing.count++;
            } else {
                grouped.set(key, {
                    removed: pair.removed,
                    added: pair.added,
                    count: 1,
                    key: key
                });
            }
        });

        // Convert to array and sort by count (descending)
        return Array.from(grouped.values()).sort((a, b) => b.count - a.count);
    }

    calculateSimilarity(stats) {
        const totalChanges = stats.addedCount + stats.removedCount;
        const totalLength = stats.unchangedCount + totalChanges;
        return totalLength > 0 ? ((stats.unchangedCount / totalLength) * 100).toFixed(1) : 0;
    }
}