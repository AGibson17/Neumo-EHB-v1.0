/**
 * Policy Click Tracking
 * Lightweight click tracking for policy cards to enable future "Sort by Popularity" features
 * Non-intrusive and doesn't affect existing functionality
 */

(function() {
    'use strict';

    // Configuration
    const TRACKING_CONFIG = {
        endpoint: '/api/PolicyClickTracking/RecordClick',
        timeout: 5000, // 5 second timeout
        retryAttempts: 2,
        debounceMs: 500 // Prevent rapid double-clicks
    };

    // Tracking state
    let lastClickTime = 0;
    let isTracking = false;

    /**
     * Initialize policy click tracking
     */
    function initializePolicyClickTracking() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupClickTracking);
        } else {
            setupClickTracking();
        }
    }

    /**
     * Set up click event listeners for policy cards
     */
    function setupClickTracking() {
        const policyCards = document.querySelectorAll('.policy-accordion');
        
        policyCards.forEach(card => {
            const summaryElement = card.querySelector('.policy-accordion__summary');
            if (summaryElement) {
                // Use capture phase to track before native details/summary behavior
                summaryElement.addEventListener('click', handlePolicyClick, { capture: true });
            }
        });

        console.log(`Policy click tracking initialized for ${policyCards.length} policy cards`);
    }

    /**
     * Handle policy card click
     * @param {Event} event - Click event
     */
    function handlePolicyClick(event) {
        const currentTime = Date.now();
        
        // Debounce rapid clicks
        if (currentTime - lastClickTime < TRACKING_CONFIG.debounceMs) {
            return;
        }
        lastClickTime = currentTime;

        // Don't interfere with existing functionality
        const policyCard = event.target.closest('.policy-accordion');
        if (!policyCard) return;

        const policyId = policyCard.getAttribute('data-policy-id');
        const policyTitle = policyCard.getAttribute('data-policy-title');

        // Validate required data
        if (!policyId || isNaN(parseInt(policyId))) {
            console.warn('Policy click tracking: Invalid or missing policy ID');
            return;
        }

        // Track the click asynchronously (don't block user interaction)
        trackPolicyClick(parseInt(policyId), policyTitle);
    }

    /**
     * Send click data to tracking endpoint
     * @param {number} policyId - Umbraco policy content ID
     * @param {string} policyTitle - Policy title for logging
     */
    async function trackPolicyClick(policyId, policyTitle) {
        if (isTracking) return; // Prevent multiple simultaneous requests
        
        isTracking = true;

        try {
            const requestData = {
                policyId: policyId,
                policyTitle: policyTitle || 'Unknown Policy'
            };

            const response = await fetch(TRACKING_CONFIG.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestData),
                signal: AbortSignal.timeout(TRACKING_CONFIG.timeout)
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.debug(`Policy click tracked: ${policyTitle} (ID: ${policyId})`);
                } else {
                    console.warn(`Policy click tracking failed: ${result.message}`);
                }
            } else {
                console.warn(`Policy click tracking HTTP error: ${response.status}`);
            }
        } catch (error) {
            // Fail silently - tracking shouldn't interrupt user experience
            if (error.name === 'AbortError') {
                console.warn('Policy click tracking: Request timeout');
            } else {
                console.warn('Policy click tracking error:', error.message);
            }
        } finally {
            isTracking = false;
        }
    }

    /**
     * Utility to get click counts (for future sorting feature)
     * @returns {Promise<Array>} Array of policy click counts
     */
    window.getPolicyClickCounts = async function() {
        try {
            const response = await fetch('/api/PolicyClickTracking/GetClickCounts');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn('Error fetching policy click counts:', error);
        }
        return [];
    };

    // Initialize when script loads
    initializePolicyClickTracking();
})();
