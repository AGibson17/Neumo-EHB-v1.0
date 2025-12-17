/**
 * Enhanced Handbook Search Functionality
 * Features: Real-time search, search history, trending searches
 */

class HandbookSearch {
    constructor() {
        this.searchInput = document.getElementById('handbookSearch');
        this.clearButton = document.querySelector('.handbook-search__clear');
        this.resultsContainer = document.getElementById('searchResults');
        this.wrapper = this.searchInput ? this.searchInput.closest('.handbook-search__input-wrapper') : null;
        
        this.searchData = this.initializeSearchData();
        this.isSearching = false;
        this.searchTimeout = null;
        this.activeIndex = -1;
        
        // Search history config
        this.historyKey = 'neumo_handbook_search_history';
        this.maxHistoryItems = 5;
        
        // Trending searches (can be updated from API/click tracking)
        this.trendingSearches = [
            { term: 'PTO', icon: 'clock' },
            { term: 'Remote Work', icon: 'home' },
            { term: 'Benefits', icon: 'heart' },
            { term: 'Holidays', icon: 'calendar' },
            { term: 'FMLA', icon: 'shield' }
        ];
        
        this.initializeEventListeners();
        this.loadTrendingFromAPI();
    }
    
    initializeEventListeners() {
        if (!this.searchInput) return;
        
        // Input event for real-time search
        this.searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            this.handleSearch(query);
        });
        
        // Focus event - show history/trending when empty
        this.searchInput.addEventListener('focus', () => {
            const query = this.searchInput.value.trim();
            if (query.length === 0) {
                this.showHistoryAndTrending();
            } else {
                this.showResults();
            }
        });

        // Keyboard navigation
        this.searchInput.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });
        
        // Click outside to hide results
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.handbook-search')) {
                this.hideResults();
            }
        });
        
        // Clear button functionality
        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => {
                this.clearSearch();
            });
        }
    }
    
    handleKeyboardNavigation(e) {
        const items = Array.from(this.resultsContainer.querySelectorAll('.handbook-search__result-item, .handbook-search__suggestion-item'));
        if (!items.length && !['Escape'].includes(e.key)) return;
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.activeIndex = (this.activeIndex + 1) % items.length;
                this.updateActiveItem(items);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.activeIndex = (this.activeIndex - 1 + items.length) % items.length;
                this.updateActiveItem(items);
                break;
            case 'Enter':
                if (this.activeIndex >= 0 && this.activeIndex < items.length) {
                    const itemEl = items[this.activeIndex];
                    // Check if it's a suggestion item (history/trending)
                    if (itemEl.classList.contains('handbook-search__suggestion-item')) {
                        const term = itemEl.dataset.term;
                        this.searchInput.value = term;
                        this.handleSearch(term);
                    } else {
                        // Regular result item
                        const url = itemEl.dataset.url;
                        const type = itemEl.dataset.type;
                        const id = itemEl.dataset.id;
                        const categoryUrl = itemEl.dataset.categoryUrl;
                        const title = itemEl.querySelector('.handbook-search__result-item__title')?.textContent?.trim();
                        
                        // Save to history before navigating
                        if (this.searchInput.value.trim()) {
                            this.addToHistory(this.searchInput.value.trim());
                        }
                        
                        const dest = this.buildDestinationUrl({ url, type, id, categoryUrl });
                        if (dest && dest !== '#') window.location.href = dest;
                    }
                }
                break;
            case 'Escape':
                this.hideResults();
                this.searchInput.blur();
                break;
        }
    }
    
    // ==================== Search History ====================
    
    getSearchHistory() {
        try {
            const history = localStorage.getItem(this.historyKey);
            return history ? JSON.parse(history) : [];
        } catch (e) {
            return [];
        }
    }
    
    addToHistory(term) {
        if (!term || term.length < 2) return;
        
        let history = this.getSearchHistory();
        
        // Remove if already exists (we'll add it to the front)
        history = history.filter(item => item.toLowerCase() !== term.toLowerCase());
        
        // Add to front
        history.unshift(term);
        
        // Keep only max items
        history = history.slice(0, this.maxHistoryItems);
        
        try {
            localStorage.setItem(this.historyKey, JSON.stringify(history));
        } catch (e) {
            // localStorage might be full or disabled
        }
    }
    
    removeFromHistory(term) {
        let history = this.getSearchHistory();
        history = history.filter(item => item.toLowerCase() !== term.toLowerCase());
        
        try {
            localStorage.setItem(this.historyKey, JSON.stringify(history));
        } catch (e) {
            // Ignore errors
        }
        
        // Refresh the display
        this.showHistoryAndTrending();
    }
    
    clearAllHistory() {
        try {
            localStorage.removeItem(this.historyKey);
        } catch (e) {
            // Ignore errors
        }
        this.showHistoryAndTrending();
    }
    
    // ==================== Trending Searches ====================
    
    async loadTrendingFromAPI() {
        // Try to fetch trending searches from the click tracking API
        try {
            const resp = await fetch('/api/PolicyClickTracking/Trending?count=5');
            if (resp.ok) {
                const data = await resp.json();
                if (Array.isArray(data) && data.length > 0) {
                    this.trendingSearches = data.map(item => ({
                        term: item.title || item.name,
                        icon: 'trending-up'
                    }));
                }
            }
        } catch (e) {
            // Keep default trending searches
        }
    }
    
    // ==================== Display Methods ====================
    
    showHistoryAndTrending() {
        const history = this.getSearchHistory();
        let html = '';
        
        // Recent Searches Section
        if (history.length > 0) {
            html += `
                <div class="handbook-search__section">
                    <div class="handbook-search__section-header">
                        <span class="handbook-search__section-title">
                            <i data-lucide="history"></i>
                            Recent Searches
                        </span>
                        <button class="handbook-search__clear-history" type="button">Clear All</button>
                    </div>
                    <div class="handbook-search__suggestions">
                        ${history.map(term => `
                            <div class="handbook-search__suggestion-item handbook-search__suggestion-item--history" data-term="${this.escapeHtml(term)}">
                                <i data-lucide="clock"></i>
                                <span>${this.escapeHtml(term)}</span>
                                <button class="handbook-search__remove-history" data-term="${this.escapeHtml(term)}" type="button" aria-label="Remove from history">
                                    <i data-lucide="x"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Trending Searches Section
        if (this.trendingSearches.length > 0) {
            html += `
                <div class="handbook-search__section">
                    <div class="handbook-search__section-header">
                        <span class="handbook-search__section-title">
                            <i data-lucide="trending-up"></i>
                            Trending Searches
                        </span>
                    </div>
                    <div class="handbook-search__suggestions">
                        ${this.trendingSearches.map(item => `
                            <div class="handbook-search__suggestion-item handbook-search__suggestion-item--trending" data-term="${this.escapeHtml(item.term)}">
                                <i data-lucide="${item.icon || 'search'}"></i>
                                <span>${this.escapeHtml(item.term)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Fallback if nothing to show
        if (!html) {
            html = `
                <div class="handbook-search__empty-state">
                    <i data-lucide="search"></i>
                    <h3>Search the Handbook</h3>
                    <p>Find policies, procedures, and important information</p>
                </div>
            `;
        }
        
        this.resultsContainer.innerHTML = html;
        this.showResults();
        this.activeIndex = -1;
        
        // Add event listeners for suggestion items
        this.resultsContainer.querySelectorAll('.handbook-search__suggestion-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking the remove button
                if (e.target.closest('.handbook-search__remove-history')) return;
                
                const term = item.dataset.term;
                this.searchInput.value = term;
                this.handleSearch(term);
            });
        });
        
        // Add event listeners for remove buttons
        this.resultsContainer.querySelectorAll('.handbook-search__remove-history').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const term = btn.dataset.term;
                this.removeFromHistory(term);
            });
        });
        
        // Add event listener for clear all button
        const clearAllBtn = this.resultsContainer.querySelector('.handbook-search__clear-history');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                this.clearAllHistory();
            });
        }
    }
    
    initializeSearchData() {
        // Initialize with existing category cards from the page
        const categoryCards = document.querySelectorAll('.category-card');
        const searchData = [];
        
        categoryCards.forEach(card => {
            const title = card.querySelector('.category-card__title')?.textContent?.trim();
            const description = card.querySelector('.category-card__description')?.textContent?.trim();
            const link = card.getAttribute('href') || card.querySelector('a')?.getAttribute('href');
            const state = card.querySelector('.category-card__badge')?.textContent?.trim();
            
            if (title) {
                searchData.push({
                    title,
                    description: description || '',
                    category: 'Policy Category',
                    url: link || '#',
                    state: state || '',
                    type: 'category'
                });
            }
        });
        
        return searchData;
    }
    
    handleSearch(query) {
        // Clear existing timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Update clear button visibility
        this.updateClearButton(query);
        
        if (query.length === 0) {
            this.showHistoryAndTrending();
            return;
        }
        
        if (query.length < 2) {
            this.showMinimumCharacterMessage();
            return;
        }
        
        // Debounce search to avoid excessive API calls
        this.searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, 300);
    }
    
    async performSearch(query) {
        this.isSearching = true;
        this.showLoadingState();
        
        try {
            const resp = await fetch(`/api/HandbookSearch/Search?q=${encodeURIComponent(query)}`);
            if (!resp.ok) throw new Error('Search API error');
            const data = await resp.json();
            if (Array.isArray(data) && data.length) {
                this.displayResults(data, query);
            } else {
                this.showNoResults(query);
            }
        } catch (e) {
            // Fallback to client-side search dataset
            const results = this.searchData.filter(item => {
                const searchableText = `${item.title} ${item.description} ${item.category}`.toLowerCase();
                return searchableText.includes(query.toLowerCase());
            });
            
            if (results.length > 0) {
                this.displayResults(results, query);
            } else {
                this.showNoResults(query);
            }
        } finally {
            this.isSearching = false;
        }
    }
    
    showLoadingState() {
        this.resultsContainer.innerHTML = `
            <div class="handbook-search__loading">
                <div class="handbook-search__loading-spinner"></div>
                <span>Searching...</span>
            </div>
        `;
        this.showResults();
    }
    
    displayResults(results, query) {
        if (results.length === 0) {
            this.showNoResults(query);
            return;
        }
        
        this.activeIndex = -1;
        
        const resultsHtml = `
            <div class="handbook-search__section">
                <div class="handbook-search__section-header">
                    <span class="handbook-search__section-title">
                        <i data-lucide="file-text"></i>
                        Results
                    </span>
                    <span class="handbook-search__result-count">${results.length} found</span>
                </div>
                ${results.map((item, idx) => `
                    <div class="handbook-search__result-item" 
                         id="result-${idx}" 
                         role="option" 
                         aria-selected="false" 
                         data-url="${item.url || ''}" 
                         data-type="${item.type || ''}" 
                         data-id="${item.id || ''}" 
                         data-category-url="${item.categoryUrl || ''}">
                        <div class="handbook-search__result-item__icon">
                            <i data-lucide="${item.type === 'category' ? 'folder' : 'file-text'}"></i>
                        </div>
                        <div class="handbook-search__result-item__content">
                            <div class="handbook-search__result-item__title">
                                ${this.highlightQuery(item.title, query)}
                            </div>
                            <div class="handbook-search__result-item__excerpt">
                                ${this.highlightQuery(item.description || '', query)}
                            </div>
                            <span class="handbook-search__result-item__category">
                                ${item.category}
                            </span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        this.resultsContainer.innerHTML = resultsHtml;
        this.showResults();
        
        // Add click handlers to result items
        this.resultsContainer.querySelectorAll('.handbook-search__result-item').forEach(item => {
            item.addEventListener('click', () => {
                // Save search to history
                this.addToHistory(query);
                
                // Debug: log what we're working with
                console.log('Search result clicked:', {
                    url: item.dataset.url,
                    type: item.dataset.type,
                    id: item.dataset.id,
                    categoryUrl: item.dataset.categoryUrl
                });
                
                const dest = this.buildDestinationUrl({
                    url: item.dataset.url,
                    type: item.dataset.type,
                    id: item.dataset.id,
                    categoryUrl: item.dataset.categoryUrl
                });
                
                console.log('Navigating to:', dest);
                
                if (dest && dest !== '#') {
                    window.location.href = dest;
                }
            });
        });
    }

    buildDestinationUrl({ url, type, id, categoryUrl }) {
        // For policy results, navigate to the parent category with a policy hash
        if (type === 'policy' && id) {
            // The API returns the parent category URL in both `url` and `categoryUrl`
            const base = url || categoryUrl || '';
            if (!base || base === '#') return '#';
            // Ensure we have a clean base URL without existing hash
            const clean = base.split('#')[0];
            // Remove trailing slash if present for consistency
            const normalizedBase = clean.endsWith('/') ? clean.slice(0, -1) : clean;
            return `${normalizedBase}#policy-${id}`;
        }
        // For categories and other items, use the provided url directly
        return url || '#';
    }

    updateActiveItem(items) {
        items.forEach((el, i) => {
            const isActive = i === this.activeIndex;
            el.classList.toggle('handbook-search__result-item--active', isActive);
            el.classList.toggle('handbook-search__suggestion-item--active', isActive);
            el.setAttribute('aria-selected', isActive ? 'true' : 'false');
            if (isActive) {
                el.scrollIntoView({ block: 'nearest' });
                this.searchInput.setAttribute('aria-activedescendant', el.id || '');
            }
        });
    }
    
    highlightQuery(text, query) {
        if (!text || !query || query.length < 2) return text || '';
        
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showMinimumCharacterMessage() {
        this.resultsContainer.innerHTML = `
            <div class="handbook-search__empty-state">
                <i data-lucide="type"></i>
                <h3>Keep Typing...</h3>
                <p>Enter at least 2 characters to search</p>
            </div>
        `;
        this.showResults();
    }
    
    showNoResults(query) {
        this.resultsContainer.innerHTML = `
            <div class="handbook-search__empty-state">
                <i data-lucide="search-x"></i>
                <h3>No Results Found</h3>
                <p>No policies or content found for "${this.escapeHtml(query)}"</p>
                <div class="handbook-search__no-results-suggestions">
                    <span>Try searching for:</span>
                    <div class="handbook-search__suggestions handbook-search__suggestions--inline">
                        ${this.trendingSearches.slice(0, 3).map(item => `
                            <button class="handbook-search__suggestion-chip" data-term="${this.escapeHtml(item.term)}" type="button">
                                ${this.escapeHtml(item.term)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        this.showResults();
        
        // Add click handlers for suggestion chips
        this.resultsContainer.querySelectorAll('.handbook-search__suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const term = chip.dataset.term;
                this.searchInput.value = term;
                this.handleSearch(term);
            });
        });
    }
    
    showResults() {
        this.resultsContainer.classList.add('handbook-search__results--visible');
        if (this.wrapper) this.wrapper.setAttribute('aria-expanded', 'true');
        // Recreate icons after DOM updates
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }
    
    hideResults() {
        this.resultsContainer.classList.remove('handbook-search__results--visible');
        if (this.wrapper) this.wrapper.setAttribute('aria-expanded', 'false');
    }
    
    updateClearButton(query) {
        if (query.length > 0) {
            this.clearButton?.classList.add('visible');
        } else {
            this.clearButton?.classList.remove('visible');
        }
    }
    
    clearSearch() {
        this.searchInput.value = '';
        this.clearButton?.classList.remove('visible');
        this.showHistoryAndTrending();
        this.searchInput.focus();
    }
}

// Initialize search when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize on pages with the search component
    if (document.getElementById('handbookSearch')) {
        window.handbookSearch = new HandbookSearch();
    }
});

// Re-initialize search when tab changes (for SPA-like behavior)
document.addEventListener('tabChanged', function(event) {
    if (event.detail.tabId === 'handbook') {
        // Small delay to ensure the DOM is updated
        setTimeout(() => {
            if (document.getElementById('handbookSearch') && !window.handbookSearch) {
                window.handbookSearch = new HandbookSearch();
            }
        }, 100);
    }
});
