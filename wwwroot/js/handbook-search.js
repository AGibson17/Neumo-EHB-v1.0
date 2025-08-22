/**
 * Modern Handbook Search Functionality
 * Provides real-time search across handbook content
 */

class HandbookSearch {
    constructor() {
        this.searchInput = document.getElementById('handbookSearch');
        this.clearButton = document.querySelector('.handbook-search__clear');
        this.resultsContainer = document.getElementById('searchResults');
        this.searchData = this.initializeSearchData();
        this.isSearching = false;
        this.searchTimeout = null;
    this.wrapper = this.searchInput ? this.searchInput.closest('.handbook-search__input-wrapper') : null;
    this.activeIndex = -1;
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        if (!this.searchInput) return;
        
        // Input event for real-time search
        this.searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            this.handleSearch(query);
        });
        
        // Focus events for UI states
        this.searchInput.addEventListener('focus', () => {
            this.showResults();
        });

        // Keyboard navigation
        this.searchInput.addEventListener('keydown', (e) => {
            const items = Array.from(this.resultsContainer.querySelectorAll('.handbook-search__result-item'));
            if (!items.length) return;
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.activeIndex = (this.activeIndex + 1) % items.length;
                this.updateActiveItem(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.activeIndex = (this.activeIndex - 1 + items.length) % items.length;
                this.updateActiveItem(items);
            } else if (e.key === 'Enter') {
                if (this.activeIndex >= 0 && this.activeIndex < items.length) {
                    const itemEl = items[this.activeIndex];
                    const url = itemEl.dataset.url;
                    const type = itemEl.dataset.type;
                    const id = itemEl.dataset.id;
                    const categoryUrl = itemEl.dataset.categoryUrl;
                    const dest = this.buildDestinationUrl({ url, type, id, categoryUrl });
                    if (dest && dest !== '#') window.location.href = dest;
                }
            } else if (e.key === 'Escape') {
                this.hideResults();
            }
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
        
        // Add some example policy items (in a real implementation, this would come from your CMS)
        const examplePolicies = [
            {
                title: 'Remote Work Policy',
                description: 'Guidelines for working from home and flexible work arrangements',
                category: 'Work Policies',
                url: '#remote-work',
                state: 'Active',
                type: 'policy'
            },
            {
                title: 'Code of Conduct',
                description: 'Professional behavior expectations and ethical standards',
                category: 'Company Standards',
                url: '#code-of-conduct',
                state: 'Active',
                type: 'policy'
            },
            {
                title: 'Time Off Policy',
                description: 'Vacation, sick leave, and personal time off procedures',
                category: 'Benefits',
                url: '#time-off',
                state: 'Active',
                type: 'policy'
            }
        ];
        
    return [...searchData, ...examplePolicies];
    }
    
    handleSearch(query) {
        // Clear existing timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Update clear button visibility
        this.updateClearButton(query);
        
    if (query.length === 0) {
            this.showEmptyState();
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
            this.displayResults(results, query);
        } finally {
            this.isSearching = false;
        }
    }
    
    displayResults(results, query) {
        if (results.length === 0) {
            this.showNoResults(query);
            return;
        }
        
        this.activeIndex = -1;
        const resultsHtml = results.map((item, idx) => `
            <div class="handbook-search__result-item" id="result-${idx}" role="option" aria-selected="false" data-url="${item.url || ''}" data-type="${item.type || ''}" data-id="${item.id || ''}" data-category-url="${item.categoryUrl || ''}">
                <div class="handbook-search__result-item__title">
                    ${this.highlightQuery(item.title, query)}
                </div>
                <div class="handbook-search__result-item__excerpt">
                    ${this.highlightQuery(item.description, query)}
                </div>
                <span class="handbook-search__result-item__category">
                    ${item.category}
                </span>
            </div>
        `).join('');
        
    this.resultsContainer.innerHTML = resultsHtml;
    this.showResults();
        
        // Add click handlers to result items
        this.resultsContainer.querySelectorAll('.handbook-search__result-item').forEach(item => {
            item.addEventListener('click', () => {
                const dest = this.buildDestinationUrl({
                    url: item.dataset.url,
                    type: item.dataset.type,
                    id: item.dataset.id,
                    categoryUrl: item.dataset.categoryUrl
                });
                if (dest && dest !== '#') {
                    window.location.href = dest;
                }
            });
        });
    }

    buildDestinationUrl({ url, type, id, categoryUrl }) {
        // For policy results, navigate to the parent category with a policy hash
        if (type === 'policy') {
            if (!id) return url || '#';
            const base = categoryUrl || url || '';
            if (!base) return '#';
            const clean = base.split('#')[0];
            return `${clean}#policy-${id}`;
        }
        // For categories and other items, use the provided url
        return url || '#';
    }

    updateActiveItem(items) {
        items.forEach((el, i) => {
            const isActive = i === this.activeIndex;
            el.classList.toggle('handbook-search__result-item--active', isActive);
            el.setAttribute('aria-selected', isActive ? 'true' : 'false');
            if (isActive) {
                el.scrollIntoView({ block: 'nearest' });
                this.searchInput.setAttribute('aria-activedescendant', el.id);
            }
        });
    }
    
    highlightQuery(text, query) {
        if (!query || query.length < 2) return text;
        
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    showEmptyState() {
    this.resultsContainer.innerHTML = `
            <div class="handbook-search__empty-state">
                <i data-lucide="search"></i>
                <h3>Start Typing to Search</h3>
                <p>Enter keywords to find relevant policies and information</p>
            </div>
        `;
    this.showResults();
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
                <p>No policies or content found for "${query}". Try different keywords.</p>
            </div>
        `;
        this.showResults();
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
        this.showEmptyState();
        this.searchInput.focus();
    }
}

// Initialize search when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize on pages with the search component
    if (document.getElementById('handbookSearch')) {
        new HandbookSearch();
    }
});

// Re-initialize search when tab changes (for SPA-like behavior)
document.addEventListener('tabChanged', function(event) {
    if (event.detail.tabId === 'handbook') {
        // Small delay to ensure the DOM is updated
        setTimeout(() => {
            if (document.getElementById('handbookSearch') && !window.handbookSearchInitialized) {
                new HandbookSearch();
                window.handbookSearchInitialized = true;
            }
        }, 100);
    }
});
