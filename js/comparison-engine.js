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

        let stats = {
            addedCount: 0,
            removedCount: 0,
            unchangedCount: 0
        };
        const changes = []; // Track individual changes for grouping

        // Use diff_match_patch on the line arrays
        const linesDiff = this.dmp.diff_main(lines1.join('\n'), lines2.join('\n'));
        this.dmp.diff_cleanupSemantic(linesDiff);

        // First pass: collect changes
        linesDiff.forEach(([operation, text]) => {
            const lines = text.split('\n');

            if (operation === 0) { // No change
                lines.forEach(line => {
                    stats.unchangedCount += line.length;
                });
            } else if (operation === -1) { // Deletion
                lines.forEach(line => {
                    if (line.trim()) {
                        stats.removedCount += line.split(/\s+/).filter(w => w).length;
                        changes.push({ type: 'removed', text: line.trim() });
                    }
                });
            } else if (operation === 1) { // Addition
                lines.forEach(line => {
                    if (line.trim()) {
                        stats.addedCount += line.split(/\s+/).filter(w => w).length;
                        changes.push({ type: 'added', text: line.trim() });
                    }
                });
            }
        });

        // Group changes and create lookup map
        const groupedChanges = this.groupChanges(changes);
        const textToGroupKey = new Map();

        groupedChanges.forEach(group => {
            // Map both removed and added text to this group key
            if (group.removed) {
                textToGroupKey.set(`removed:${group.removed.toLowerCase()}`, group.key);
            }
            if (group.added) {
                textToGroupKey.set(`added:${group.added.toLowerCase()}`, group.key);
            }
        });

        // Second pass: generate HTML with group keys
        // Use arrays for O(n) performance instead of O(n²) string concatenation
        const doc1Parts = [];
        const doc2Parts = [];

        linesDiff.forEach(([operation, text]) => {
            const lines = text.split('\n');

            if (operation === 0) { // No change
                lines.forEach(line => {
                    if (line.includes('─'.repeat(10))) {
                        // Page separator
                        doc1Parts.push(`<div class="page-separator">${Utils.escapeHtml(line)}</div>`);
                        doc2Parts.push(`<div class="page-separator">${Utils.escapeHtml(line)}</div>`);
                    } else {
                        doc1Parts.push(Utils.escapeHtml(line), '\n');
                        doc2Parts.push(Utils.escapeHtml(line), '\n');
                    }
                });
            } else if (operation === -1) { // Deletion
                lines.forEach(line => {
                    if (line.trim()) {
                        const groupKey = textToGroupKey.get(`removed:${line.trim().toLowerCase()}`) || '';
                        doc1Parts.push(`<span class="removed" data-group="${groupKey}">${Utils.escapeHtml(line)}</span>\n`);
                    }
                });
            } else if (operation === 1) { // Addition
                lines.forEach(line => {
                    if (line.trim()) {
                        const groupKey = textToGroupKey.get(`added:${line.trim().toLowerCase()}`) || '';
                        doc2Parts.push(`<span class="added" data-group="${groupKey}">${Utils.escapeHtml(line)}</span>\n`);
                    }
                });
            }
        });

        return {
            doc1HTML: doc1Parts.join(''),
            doc2HTML: doc2Parts.join(''),
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
        let stats = {
            addedCount: 0,
            removedCount: 0,
            unchangedCount: 0
        };
        const changes = []; // Track individual changes for grouping

        // First pass: collect changes
        diffs.forEach(([operation, text]) => {
            if (operation === 0) {
                stats.unchangedCount += text.length;
            } else if (operation === -1) { // Deletion
                stats.removedCount += text.split(/\s+/).filter(w => w).length;
                if (text.trim()) {
                    changes.push({ type: 'removed', text: text.trim() });
                }
            } else if (operation === 1) { // Addition
                stats.addedCount += text.split(/\s+/).filter(w => w).length;
                if (text.trim()) {
                    changes.push({ type: 'added', text: text.trim() });
                }
            }
        });

        // Group changes and create lookup map
        const groupedChanges = this.groupChanges(changes);
        const textToGroupKey = new Map();

        groupedChanges.forEach(group => {
            if (group.removed) {
                textToGroupKey.set(`removed:${group.removed.toLowerCase()}`, group.key);
            }
            if (group.added) {
                textToGroupKey.set(`added:${group.added.toLowerCase()}`, group.key);
            }
        });

        // Second pass: generate HTML with group keys
        // Use arrays for O(n) performance instead of O(n²) string concatenation
        const doc1Parts = [];
        const doc2Parts = [];

        diffs.forEach(([operation, text]) => {
            if (operation === 0) {
                // No change
                doc1Parts.push(Utils.escapeHtml(text));
                doc2Parts.push(Utils.escapeHtml(text));
            } else if (operation === -1) { // Deletion
                const groupKey = textToGroupKey.get(`removed:${text.trim().toLowerCase()}`) || '';
                doc1Parts.push(`<span class="removed" data-group="${groupKey}">${Utils.escapeHtml(text)}</span>`);
            } else if (operation === 1) { // Addition
                const groupKey = textToGroupKey.get(`added:${text.trim().toLowerCase()}`) || '';
                doc2Parts.push(`<span class="added" data-group="${groupKey}">${Utils.escapeHtml(text)}</span>`);
            }
        });

        return {
            doc1HTML: doc1Parts.join(''),
            doc2HTML: doc2Parts.join(''),
            stats,
            groupedChanges
        };
    }


    // Calculate similarity between two strings using Levenshtein distance
    calculateStringSimilarity(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;

        if (len1 === 0) return len2;
        if (len2 === 0) return len1;

        // Create distance matrix
        const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

        for (let i = 0; i <= len1; i++) matrix[i][0] = i;
        for (let j = 0; j <= len2; j++) matrix[0][j] = j;

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1].toLowerCase() === str2[j - 1].toLowerCase() ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,      // deletion
                    matrix[i][j - 1] + 1,      // insertion
                    matrix[i - 1][j - 1] + cost // substitution
                );
            }
        }

        const distance = matrix[len1][len2];
        const maxLen = Math.max(len1, len2);
        return maxLen === 0 ? 1 : 1 - (distance / maxLen); // Normalized similarity (0-1)
    }

    groupChanges(changes) {
        // Separate removals and additions
        const removals = changes.filter(c => c.type === 'removed');
        const additions = changes.filter(c => c.type === 'added');

        const pairs = [];
        const usedRemovals = new Set();
        const usedAdditions = new Set();

        // Find best matches using similarity scoring
        // For each removal, find the most similar addition
        removals.forEach((removal, removalIndex) => {
            if (usedRemovals.has(removalIndex)) return;

            let bestMatch = null;
            let bestSimilarity = Config.comparison.SIMILARITY_THRESHOLD;
            let bestAdditionIndex = -1;

            additions.forEach((addition, additionIndex) => {
                if (usedAdditions.has(additionIndex)) return;

                const similarity = this.calculateStringSimilarity(removal.text, addition.text);

                if (similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                    bestMatch = addition;
                    bestAdditionIndex = additionIndex;
                }
            });

            if (bestMatch) {
                // Found a good match
                pairs.push({
                    removed: removal.text,
                    added: bestMatch.text
                });
                usedRemovals.add(removalIndex);
                usedAdditions.add(bestAdditionIndex);
            }
        });

        // Add standalone removals (no good match found)
        removals.forEach((removal, index) => {
            if (!usedRemovals.has(index)) {
                pairs.push({
                    removed: removal.text,
                    added: ''
                });
            }
        });

        // Add standalone additions (no good match found)
        additions.forEach((addition, index) => {
            if (!usedAdditions.has(index)) {
                pairs.push({
                    removed: '',
                    added: addition.text
                });
            }
        });

        // Group pairs by normalized (case-insensitive) key
        const grouped = new Map();

        pairs.forEach(pair => {
            // Create a case-insensitive key
            const key = `${pair.removed.toLowerCase()}→${pair.added.toLowerCase()}`;

            if (grouped.has(key)) {
                const existing = grouped.get(key);
                existing.count++;

                // Track case variations
                if (pair.removed !== existing.removed || pair.added !== existing.added) {
                    existing.hasCaseVariations = true;
                }
            } else {
                grouped.set(key, {
                    removed: pair.removed,
                    added: pair.added,
                    count: 1,
                    key: key,
                    hasCaseVariations: false
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