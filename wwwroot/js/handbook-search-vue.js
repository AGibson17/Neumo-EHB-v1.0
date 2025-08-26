/**
 * Vue.js Handbook Search Component
 * Provides real-time search across handbook content with reactive UI
 */

const { createApp, ref, computed, watch, onMounted, nextTick } = Vue;

const HandbookSearchApp = {
    setup() {
        // Reactive state
        const searchQuery = ref('');
        const searchResults = ref([]);
        const isSearching = ref(false);
        const showResults = ref(false);
        const activeIndex = ref(-1);
        const searchTimeout = ref(null);
        const searchData = ref([]);
        const searchHistory = ref([]);
        const showHistory = ref(false);
        const searchStatus = ref('idle'); // 'idle', 'searching', 'success', 'error', 'no-results'
        const lastSearchTime = ref(0);

        // Computed properties
        const activeDescendant = computed(() => {
            return activeIndex.value >= 0 ? `result-${activeIndex.value}` : '';
        });

        const hasResults = computed(() => {
            return searchResults.value.length > 0;
        });

        const showLoadingState = computed(() => {
            return isSearching.value && searchQuery.value.length >= 2;
        });

        const showEmptyState = computed(() => {
            return searchQuery.value.length === 0 && !showHistory.value && searchHistory.value.length === 0;
        });

        const showNoResultsState = computed(() => {
            return searchStatus.value === 'no-results' && searchQuery.value.length >= 2;
        });

        const searchPerformanceText = computed(() => {
            if (lastSearchTime.value > 0 && hasResults.value) {
                return `Found ${searchResults.value.length} results in ${lastSearchTime.value}ms`;
            }
            return '';
        });

        // Methods
        const initializeSearchData = () => {
            // Initialize with existing category cards from the page
            const categoryCards = document.querySelectorAll('.category-card');
            const data = [];
            
            categoryCards.forEach(card => {
                const title = card.querySelector('.category-card__title')?.textContent?.trim();
                const description = card.querySelector('.category-card__description')?.textContent?.trim();
                const link = card.getAttribute('href') || card.querySelector('a')?.getAttribute('href');
                const state = card.querySelector('.category-card__badge')?.textContent?.trim();
                
                if (title) {
                    data.push({
                        title,
                        description: description || '',
                        category: 'Policy Category',
                        url: link || '#',
                        state: state || '',
                        type: 'category'
                    });
                }
            });
            
            // Add some example policy items
            const examplePolicies = [
                {
                    title: 'Remote Work Policy',
                    description: 'Guidelines for working from home and flexible work arrangements',
                    category: 'Work Policies',
                    url: '#remote-work',
                    state: 'Active',
                    type: 'policy',
                    id: 'remote-work'
                },
                {
                    title: 'Code of Conduct',
                    description: 'Professional behavior expectations and ethical standards',
                    category: 'Company Standards',
                    url: '#code-of-conduct',
                    state: 'Active',
                    type: 'policy',
                    id: 'code-of-conduct'
                },
                {
                    title: 'Time Off Policy',
                    description: 'Vacation, sick leave, and personal time off procedures',
                    category: 'Benefits',
                    url: '#time-off',
                    state: 'Active',
                    type: 'policy',
                    id: 'time-off'
                }
            ];
            
            searchData.value = [...data, ...examplePolicies];
        };

        // Search History Management
        const loadSearchHistory = () => {
            try {
                const stored = localStorage.getItem('handbook-search-history');
                if (stored) {
                    searchHistory.value = JSON.parse(stored);
                }
            } catch (error) {
                console.warn('Failed to load search history:', error);
                searchHistory.value = [];
            }
        };

        const saveSearchHistory = () => {
            try {
                localStorage.setItem('handbook-search-history', JSON.stringify(searchHistory.value));
            } catch (error) {
                console.warn('Failed to save search history:', error);
            }
        };

        const addToSearchHistory = (query) => {
            if (!query || query.length < 2) return;
            
            // Remove duplicates and add to front
            searchHistory.value = [
                query,
                ...searchHistory.value.filter(item => item.toLowerCase() !== query.toLowerCase())
            ].slice(0, 8); // Keep only last 8 searches
            
            saveSearchHistory();
        };

        const clearSearchHistory = () => {
            searchHistory.value = [];
            saveSearchHistory();
        };

        const selectHistoryItem = (query) => {
            searchQuery.value = query;
            showHistory.value = false;
            debouncedSearch(query);
        };

        const performSearch = async (query) => {
            if (!query || query.length < 2) {
                searchResults.value = [];
                searchStatus.value = 'idle';
                showHistory.value = searchQuery.value.length === 0 && searchHistory.value.length > 0;
                return;
            }

            const searchStartTime = Date.now();
            isSearching.value = true;
            searchStatus.value = 'searching';
            showHistory.value = false;
            
            try {
                const response = await fetch(`/api/HandbookSearch/Search?q=${encodeURIComponent(query)}`);
                if (!response.ok) throw new Error('Search API error');
                const data = await response.json();
                
                // Simulate minimum search time for better UX (prevents flashing)
                const searchDuration = Date.now() - searchStartTime;
                const minSearchTime = 300;
                if (searchDuration < minSearchTime) {
                    await new Promise(resolve => setTimeout(resolve, minSearchTime - searchDuration));
                }
                
                if (Array.isArray(data) && data.length) {
                    searchResults.value = data;
                    searchStatus.value = 'success';
                    // Add to history only if we got results
                    addToSearchHistory(query);
                } else {
                    searchResults.value = [];
                    searchStatus.value = 'no-results';
                }
            } catch (error) {
                console.warn('API search failed, using fallback:', error.message);
                searchStatus.value = 'searching'; // Keep searching status for fallback
                
                // Fallback to client-side search
                const results = searchData.value.filter(item => {
                    const searchableText = `${item.title} ${item.description} ${item.category}`.toLowerCase();
                    return searchableText.includes(query.toLowerCase());
                });
                
                // Small delay for fallback to show proper feedback
                await new Promise(resolve => setTimeout(resolve, 200));
                
                searchResults.value = results;
                if (results.length > 0) {
                    searchStatus.value = 'success';
                    addToSearchHistory(query);
                } else {
                    searchStatus.value = 'no-results';
                }
            } finally {
                isSearching.value = false;
                lastSearchTime.value = Date.now() - searchStartTime;
            }
        };

        const debouncedSearch = (query) => {
            if (searchTimeout.value) {
                clearTimeout(searchTimeout.value);
            }
            
            searchTimeout.value = setTimeout(() => {
                performSearch(query);
            }, 300);
        };

        const highlightQuery = (text, query) => {
            if (!query || query.length < 2 || !text) return text;
            
            const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
            return text.replace(regex, '<mark class="search-highlight">$1</mark>');
        };

        const createSearchSnippet = (text, query, maxLength = 150) => {
            if (!text || !query || query.length < 2) return text;
            
            const lowerText = text.toLowerCase();
            const lowerQuery = query.toLowerCase();
            const queryIndex = lowerText.indexOf(lowerQuery);
            
            if (queryIndex === -1) return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
            
            // Calculate snippet bounds
            const contextLength = Math.floor((maxLength - query.length) / 2);
            const start = Math.max(0, queryIndex - contextLength);
            const end = Math.min(text.length, queryIndex + query.length + contextLength);
            
            // Extract snippet and add ellipsis if needed
            let snippet = text.substring(start, end);
            if (start > 0) snippet = '...' + snippet;
            if (end < text.length) snippet = snippet + '...';
            
            // Highlight the query in the snippet
            return highlightQuery(snippet, query);
        };

        const escapeRegex = (string) => {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };

        const buildDestinationUrl = ({ url, type, id, categoryUrl }) => {
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
        };

        const selectResult = (result) => {
            const dest = buildDestinationUrl({
                url: result.url,
                type: result.type,
                id: result.id,
                categoryUrl: result.categoryUrl
            });
            
            if (dest && dest !== '#') {
                window.location.href = dest;
            }
        };

        const handleFocus = () => {
            showResults.value = true;
            // Show history if search is empty and we have history
            if (searchQuery.value.length === 0 && searchHistory.value.length > 0) {
                showHistory.value = true;
            }
        };

        const handleKeydown = (event) => {
            const items = searchResults.value;
            if (!items.length) return;
            
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                activeIndex.value = (activeIndex.value + 1) % items.length;
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                activeIndex.value = (activeIndex.value - 1 + items.length) % items.length;
            } else if (event.key === 'Enter') {
                if (activeIndex.value >= 0 && activeIndex.value < items.length) {
                    selectResult(items[activeIndex.value]);
                }
            } else if (event.key === 'Escape') {
                showResults.value = false;
                activeIndex.value = -1;
            }
        };

        const clearSearch = () => {
            searchQuery.value = '';
            searchResults.value = [];
            activeIndex.value = -1;
            showResults.value = true;
            // Show history when clearing search
            if (searchHistory.value.length > 0) {
                showHistory.value = true;
            }
        };

        const handleClickOutside = (event) => {
            if (!event.target.closest('#handbookSearchApp')) {
                showResults.value = false;
                showHistory.value = false;
                activeIndex.value = -1;
            }
        };

        // Watchers
        watch(searchQuery, (newQuery) => {
            activeIndex.value = -1;
            
            if (newQuery.length === 0) {
                searchResults.value = [];
                showResults.value = true;
                return;
            }
            
            if (newQuery.length < 2) {
                searchResults.value = [];
                showResults.value = true;
                return;
            }
            
            debouncedSearch(newQuery);
        });

        watch(showResults, async (show) => {
            if (show) {
                await nextTick();
                // Recreate icons after DOM updates
                if (window.lucide && typeof window.lucide.createIcons === 'function') {
                    window.lucide.createIcons();
                }
            }
        });

        watch(searchResults, async () => {
            await nextTick();
            // Recreate icons after DOM updates
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons();
            }
        });

        // Lifecycle
        onMounted(() => {
            initializeSearchData();
            loadSearchHistory();
            document.addEventListener('click', handleClickOutside);
            
            // Initial icon creation
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons();
            }
        });

        // Return reactive state and methods for template
        return {
            searchQuery,
            searchResults,
            isSearching,
            showResults,
            activeIndex,
            activeDescendant,
            searchHistory,
            showHistory,
            searchStatus,
            hasResults,
            showLoadingState,
            showEmptyState,
            showNoResultsState,
            searchPerformanceText,
            handleFocus,
            handleKeydown,
            clearSearch,
            clearSearchHistory,
            selectResult,
            selectHistoryItem,
            highlightQuery,
            createSearchSnippet
        };
    }
};

// Global app instance storage
let handbookSearchAppInstance = null;

// Initialize Vue app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeHandbookSearch();
});

// Re-initialize when tab changes (for SPA-like behavior)
document.addEventListener('tabChanged', function(event) {
    if (event.detail.tabId === 'handbook') {
        setTimeout(() => {
            initializeHandbookSearch();
        }, 100);
    }
});

function initializeHandbookSearch() {
    const searchElement = document.getElementById('handbookSearchApp');
    
    // Only initialize if element exists and no app is already mounted
    if (searchElement && !handbookSearchAppInstance) {
        try {
            handbookSearchAppInstance = createApp(HandbookSearchApp);
            handbookSearchAppInstance.mount('#handbookSearchApp');
            console.log('Vue Handbook Search initialized');
        } catch (error) {
            console.error('Failed to initialize Vue Handbook Search:', error);
        }
    }
}

// Cleanup function for unmounting
function unmountHandbookSearch() {
    if (handbookSearchAppInstance) {
        handbookSearchAppInstance.unmount();
        handbookSearchAppInstance = null;
        console.log('Vue Handbook Search unmounted');
    }
}
