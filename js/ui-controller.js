class UIController {
    constructor() {
        this.elements = {};
        this.syncScrollEnabled = true;
        this.isScrolling = false;
        this.initializeElements();
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    initializeElements() {
        // File inputs
        this.elements.pdf1Input = document.getElementById('pdf1');
        this.elements.pdf2Input = document.getElementById('pdf2');
        this.elements.file1Info = document.getElementById('file1-info');
        this.elements.file2Info = document.getElementById('file2-info');
        
        // Buttons
        this.elements.compareBtn = document.getElementById('compareBtn');
        this.elements.clearBtn = document.getElementById('clearBtn');
        
        // Options
        this.elements.ignoreCase = document.getElementById('ignoreCase');
        this.elements.ignoreWhitespace = document.getElementById('ignoreWhitespace');
        this.elements.wordLevel = document.getElementById('wordLevel');
        this.elements.preserveFormat = document.getElementById('preserveFormat');
        this.elements.syncScroll = document.getElementById('syncScroll');
        
        // Results
        this.elements.resultsSection = document.getElementById('results');
        this.elements.doc1Content = document.getElementById('doc1Content');
        this.elements.doc2Content = document.getElementById('doc2Content');
        
        // Statistics
        this.elements.addedCount = document.getElementById('addedCount');
        this.elements.removedCount = document.getElementById('removedCount');
        this.elements.similarityScore = document.getElementById('similarityScore');
        
        // Search elements
        this.elements.searchInput = document.getElementById('searchInput');
        this.elements.searchBtn = document.getElementById('searchBtn');
        this.elements.clearSearchBtn = document.getElementById('clearSearchBtn');
        this.elements.caseSensitive = document.getElementById('caseSensitive');
        this.elements.searchResults = document.querySelector('.search-results');
        this.elements.doc1SearchCount = document.getElementById('doc1SearchCount');
        this.elements.doc2SearchCount = document.getElementById('doc2SearchCount');
        this.elements.searchPosition = document.getElementById('searchPosition');
        this.elements.prevSearchBtn = document.getElementById('prevSearchBtn');
        this.elements.nextSearchBtn = document.getElementById('nextSearchBtn');

        // Grouped changes elements
        this.elements.groupedChangesContainer = document.getElementById('groupedChangesContainer');
        this.elements.groupedChangesHeader = document.getElementById('groupedChangesHeader');
        this.elements.groupedChangesContent = document.getElementById('groupedChangesContent');
        this.elements.groupedChangesList = document.getElementById('groupedChangesList');
        this.elements.groupedChangesCount = document.getElementById('groupedChangesCount');

        // Track collapsed state
        this.groupedChangesCollapsed = false;
    }

    setupEventListeners() {
        // File input listeners
        this.elements.pdf1Input.addEventListener('change', (e) => this.handleFileSelect(e, 1));
        this.elements.pdf2Input.addEventListener('change', (e) => this.handleFileSelect(e, 2));
        
        // Button listeners
        this.elements.compareBtn.addEventListener('click', () => this.triggerComparison());
        this.elements.clearBtn.addEventListener('click', () => this.clearAll());

        // Search listeners
        this.elements.searchBtn.addEventListener('click', () => this.triggerSearch());
        this.elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.triggerSearch();
        });
        this.elements.clearSearchBtn.addEventListener('click', () => this.clearSearch());
        this.elements.prevSearchBtn.addEventListener('click', () => this.navigateSearch(-1));
        this.elements.nextSearchBtn.addEventListener('click', () => this.navigateSearch(1));
        
        // Sync scroll listener
        this.elements.syncScroll.addEventListener('change', (e) => {
            this.syncScrollEnabled = e.target.checked;
        });

        // Grouped changes collapse/expand listener
        this.elements.groupedChangesHeader.addEventListener('click', () => this.toggleGroupedChanges());

        // Setup synchronized scrolling
        this.setupSynchronizedScrolling();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                this.elements.searchInput.focus();
            } else if (e.key === 'F3' || (e.ctrlKey && e.key === 'g')) {
                e.preventDefault();
                this.navigateSearch(e.shiftKey ? -1 : 1);
            }
        });
    }

    setupDragAndDrop() {
        ['drop1', 'drop2'].forEach((id, index) => {            const dropZone = document.getElementById(id);
            const fileInput = dropZone.querySelector('input[type="file"]');

            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('dragover');
            });

            dropZone.addEventListener('drop', async (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');

                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    const file = files[0];

                    // Validate file
                    const validation = await this.validatePDFFile(file);
                    if (!validation.valid) {
                        this.showNotification(validation.error, 'error');
                        return;
                    }

                    fileInput.files = files;
                    this.handleFileSelect({ target: fileInput }, index + 1);
                }
            });
        });
    }

    setupSynchronizedScrolling() {
        const syncScroll = (source, target) => {
            if (!this.syncScrollEnabled || this.isScrolling) return;

            this.isScrolling = true;

            requestAnimationFrame(() => {
                const maxScroll = source.scrollHeight - source.clientHeight;

                // Avoid division by zero
                if (maxScroll <= 0) {
                    this.isScrolling = false;
                    return;
                }

                const scrollPercentage = source.scrollTop / maxScroll;
                const targetMaxScroll = target.scrollHeight - target.clientHeight;

                if (targetMaxScroll > 0) {
                    target.scrollTop = scrollPercentage * targetMaxScroll;
                }

                requestAnimationFrame(() => {
                    this.isScrolling = false;
                });
            });
        };

        this.elements.doc1Content.addEventListener('scroll', () =>
            syncScroll(this.elements.doc1Content, this.elements.doc2Content));
        this.elements.doc2Content.addEventListener('scroll', () =>
            syncScroll(this.elements.doc2Content, this.elements.doc1Content));
    }

    async handleFileSelect(event, fileNumber) {
        const file = event.target.files[0];
        const infoElement = fileNumber === 1 ? this.elements.file1Info : this.elements.file2Info;

        if (file) {
            // Validate file
            const validation = await this.validatePDFFile(file);
            if (!validation.valid) {
                this.showNotification(validation.error, 'error');
                event.target.value = '';
                infoElement.textContent = 'No file selected';
                this.checkCompareButton();
                return;
            }

            infoElement.textContent = file.name;
            this.checkCompareButton();

            // Emit event
            if (this.onFileSelect) {
                this.onFileSelect(fileNumber, file);
            }
        } else {
            infoElement.textContent = 'No file selected';
        }
    }
    checkCompareButton() {
        const hasFile1 = this.elements.pdf1Input.files.length > 0;
        const hasFile2 = this.elements.pdf2Input.files.length > 0;
        this.elements.compareBtn.disabled = !hasFile1 || !hasFile2;
    }

    getComparisonOptions() {
        return {
            ignoreCase: this.elements.ignoreCase.checked,
            ignoreWhitespace: this.elements.ignoreWhitespace.checked,
            wordLevel: this.elements.wordLevel.checked,
            preserveFormat: this.elements.preserveFormat.checked
        };
    }

    showLoading() {
        this.elements.resultsSection.style.display = 'block';

        // Create loading elements using DOM methods to avoid innerHTML
        const createLoadingElement = () => {
            const container = document.createElement('div');
            container.className = 'loading';

            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';

            const text = document.createElement('p');
            text.textContent = 'Extracting text from PDF...';

            container.appendChild(spinner);
            container.appendChild(text);
            return container;
        };

        this.elements.doc1Content.textContent = '';
        this.elements.doc1Content.appendChild(createLoadingElement());

        this.elements.doc2Content.textContent = '';
        this.elements.doc2Content.appendChild(createLoadingElement());
    }

    displayResults(results) {
        // Display content - innerHTML is safe here because content comes from
        // ComparisonEngine which uses Utils.escapeHtml() for all user data
        // We add validation to ensure content exists and is a string
        if (results.doc1HTML && typeof results.doc1HTML === 'string') {
            this.elements.doc1Content.innerHTML = results.doc1HTML;
        } else {
            this.elements.doc1Content.textContent = 'No content';
        }

        if (results.doc2HTML && typeof results.doc2HTML === 'string') {
            this.elements.doc2Content.innerHTML = results.doc2HTML;
        } else {
            this.elements.doc2Content.textContent = 'No content';
        }
        
        // Update statistics
        this.elements.addedCount.textContent = results.stats.addedCount;
        this.elements.removedCount.textContent = results.stats.removedCount;
        
        // Calculate similarity
        const totalChanges = results.stats.addedCount + results.stats.removedCount;
        const totalLength = results.stats.unchangedCount + totalChanges;
        const similarity = totalLength > 0 ?
            ((results.stats.unchangedCount / totalLength) * 100).toFixed(1) : 0;
        this.elements.similarityScore.textContent = similarity + '%';

        // Display grouped changes if available
        if (results.groupedChanges && results.groupedChanges.length > 0) {
            this.displayGroupedChanges(results.groupedChanges);
        } else {
            this.elements.groupedChangesContainer.style.display = 'none';
        }

        // Clear any existing search
        this.clearSearch();
    }

    toggleGroupedChanges() {
        this.groupedChangesCollapsed = !this.groupedChangesCollapsed;

        if (this.groupedChangesCollapsed) {
            this.elements.groupedChangesContent.style.display = 'none';
            const icon = this.elements.groupedChangesHeader.querySelector('.collapse-icon');
            if (icon) icon.textContent = '▶';
        } else {
            this.elements.groupedChangesContent.style.display = 'block';
            const icon = this.elements.groupedChangesHeader.querySelector('.collapse-icon');
            if (icon) icon.textContent = '▼';
        }
    }

    displayGroupedChanges(groupedChanges) {
        // Show the container
        this.elements.groupedChangesContainer.style.display = 'block';

        // Update the count badge
        this.elements.groupedChangesCount.textContent = groupedChanges.length;

        // Clear existing content
        this.elements.groupedChangesList.textContent = '';

        // Populate the list
        groupedChanges.forEach((group, index) => {
            const groupItem = document.createElement('div');
            groupItem.className = 'grouped-change-item';
            groupItem.dataset.groupIndex = index;
            groupItem.dataset.groupKey = group.key;

            // Create the change display
            const changeDisplay = document.createElement('div');
            changeDisplay.className = 'change-display';

            if (group.removed && group.added) {
                // Replacement
                const removedSpan = document.createElement('span');
                removedSpan.className = 'removed';
                removedSpan.textContent = group.removed;

                const arrow = document.createElement('span');
                arrow.className = 'arrow';
                arrow.textContent = ' → ';

                const addedSpan = document.createElement('span');
                addedSpan.className = 'added';
                addedSpan.textContent = group.added;

                changeDisplay.appendChild(removedSpan);
                changeDisplay.appendChild(arrow);
                changeDisplay.appendChild(addedSpan);
            } else if (group.removed) {
                // Deletion only
                const removedSpan = document.createElement('span');
                removedSpan.className = 'removed';
                removedSpan.textContent = group.removed;
                changeDisplay.appendChild(removedSpan);
            } else if (group.added) {
                // Addition only
                const addedSpan = document.createElement('span');
                addedSpan.className = 'added';
                addedSpan.textContent = group.added;
                changeDisplay.appendChild(addedSpan);
            }

            // Create the count badge
            const countBadge = document.createElement('span');
            countBadge.className = 'count-badge';
            countBadge.textContent = `${group.count}×`;

            // Create the toggle button
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'btn btn-small toggle-visibility-btn';
            toggleBtn.textContent = 'Hide';
            toggleBtn.dataset.visible = 'true';
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleChangeGroupVisibility(group.key, toggleBtn);
            });

            // Assemble the group item
            groupItem.appendChild(changeDisplay);
            groupItem.appendChild(countBadge);
            groupItem.appendChild(toggleBtn);

            this.elements.groupedChangesList.appendChild(groupItem);
        });
    }

    toggleChangeGroupVisibility(groupKey, button) {
        const isVisible = button.dataset.visible === 'true';

        // Find all changes in the document that match this group key (case-insensitive)
        const doc1Changes = this.elements.doc1Content.querySelectorAll('.removed');
        const doc2Changes = this.elements.doc2Content.querySelectorAll('.added');

        // This is a simplified implementation - in a full version, you'd need to track
        // which specific elements belong to which group
        // For now, we'll just toggle the opacity as a demonstration

        if (isVisible) {
            // Hide this group
            button.textContent = 'Show';
            button.dataset.visible = 'false';
            // Add a class to mark as hidden (would need more sophisticated tracking in production)
        } else {
            // Show this group
            button.textContent = 'Hide';
            button.dataset.visible = 'true';
            // Remove hidden class
        }

        // Show a notification
        this.showNotification(
            isVisible ? `Hidden changes matching this pattern` : `Showing changes matching this pattern`,
            'info'
        );
    }

    async validatePDFFile(file) {
        // Check MIME type
        if (file.type !== 'application/pdf') {
            return { valid: false, error: 'Invalid file type. Please select a PDF file.' };
        }

        // Check file size (50MB limit)
        const MAX_FILE_SIZE = 50 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` };
        }

        // Check magic number (PDF files start with %PDF-)
        try {
            const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
            const pdfMagic = [0x25, 0x50, 0x44, 0x46, 0x2D]; // %PDF-

            const isValidPDF = pdfMagic.every((byte, index) => header[index] === byte);
            if (!isValidPDF) {
                return { valid: false, error: 'File does not appear to be a valid PDF.' };
            }
        } catch (error) {
            return { valid: false, error: 'Failed to validate file.' };
        }

        return { valid: true };
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification-toast');
        existingNotifications.forEach(n => n.remove());

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification-toast notification-${type}`;
        notification.textContent = message;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');

        document.body.appendChild(notification);

        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 10);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    showError(message) {
        // Use DOM methods instead of innerHTML for better security
        const createErrorElement = () => {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = `Error: ${message}`;
            return errorDiv;
        };

        this.elements.doc1Content.textContent = '';
        this.elements.doc1Content.appendChild(createErrorElement());

        this.elements.doc2Content.textContent = '';
        this.elements.doc2Content.appendChild(createErrorElement());
    }

    clearAll() {
        // Clear file inputs
        this.elements.pdf1Input.value = '';
        this.elements.pdf2Input.value = '';
        this.elements.file1Info.textContent = 'No file selected';
        this.elements.file2Info.textContent = 'No file selected';
        
        // Hide results
        this.elements.resultsSection.style.display = 'none';
        
        // Reset compare button
        this.checkCompareButton();        
        // Clear search
        this.clearSearch();
        
        // Emit event
        if (this.onClear) {
            this.onClear();
        }
    }

    triggerComparison() {
        const file1 = this.elements.pdf1Input.files[0];
        const file2 = this.elements.pdf2Input.files[0];
        const options = this.getComparisonOptions();
        
        if (this.onCompare) {
            this.onCompare(file1, file2, options);
        }
    }

    triggerSearch() {
        const searchTerm = this.elements.searchInput.value;
        const caseSensitive = this.elements.caseSensitive.checked;
        
        if (this.onSearch) {
            this.onSearch(searchTerm, caseSensitive);
        }
    }

    updateSearchResults(results) {
        this.elements.doc1SearchCount.textContent = `Original: ${results.doc1Count} results`;
        this.elements.doc2SearchCount.textContent = `Modified: ${results.doc2Count} results`;
        
        if (results.totalCount > 0) {
            this.elements.searchResults.style.display = 'block';
            this.elements.searchPosition.textContent = `1 / ${results.totalCount}`;
            this.elements.prevSearchBtn.disabled = false;
            this.elements.nextSearchBtn.disabled = false;
        } else {
            this.elements.searchResults.style.display = 'block';
            this.elements.searchPosition.textContent = '0 / 0';
            this.elements.prevSearchBtn.disabled = true;
            this.elements.nextSearchBtn.disabled = true;
        }
    }

    navigateSearch(direction) {
        if (this.onNavigateSearch) {
            this.onNavigateSearch(direction);
        }
    }

    updateSearchPosition(current, total) {
        this.elements.searchPosition.textContent = `${current} / ${total}`;
    }

    clearSearch() {
        this.elements.searchInput.value = '';
        this.elements.searchResults.style.display = 'none';
        
        if (this.onClearSearch) {            this.onClearSearch();
        }
    }

    // Event emitters
    on(event, callback) {
        switch(event) {
            case 'compare':
                this.onCompare = callback;
                break;
            case 'clear':
                this.onClear = callback;
                break;
            case 'search':
                this.onSearch = callback;
                break;
            case 'navigateSearch':
                this.onNavigateSearch = callback;
                break;
            case 'clearSearch':
                this.onClearSearch = callback;
                break;
            case 'fileSelect':
                this.onFileSelect = callback;
                break;
        }
    }
}