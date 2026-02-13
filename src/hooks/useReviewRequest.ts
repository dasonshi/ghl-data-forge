import { useState, useCallback, useEffect } from 'react';

// Custom event name for triggering review check from child components
export const REVIEW_REQUEST_EVENT = 'review-request-trigger';

// Utility function for components to trigger a review check
// This dispatches a custom event that Index.tsx listens for
export function triggerReviewRequestEvent() {
  window.dispatchEvent(new CustomEvent(REVIEW_REQUEST_EVENT));
}

// Configuration
const DEV_LOCATION_ID = 'gdzneuvA9mUJoRroCv4O';
const ALLOWED_LOCATIONS = [DEV_LOCATION_ID]; // Expand later to include active users
const COOLDOWN_DAYS = 14;
const MIN_ACTIONS_AFTER_LATER = 3; // Require at least 3 actions after clicking "Later"

// App store URL components
const APP_INTEGRATION_ID = '68ae6ca8bb70273ca2ca7e24';
const APP_VERSION_ID = '69820f6ad4d79609d982ea86'; // Update when app version changes

// localStorage keys
const STORAGE_KEYS = {
  status: 'reviewRequest_status',
  lastShown: 'reviewRequest_lastShown',
  actionsSinceShown: 'reviewRequest_actionsSinceShown',
};

type ReviewStatus = 'never' | 'reviewed' | 'later' | null;

interface UseReviewRequestReturn {
  showReviewRequest: boolean;
  setShowReviewRequest: (show: boolean) => void;
  triggerReviewCheck: () => void;
  incrementActionCount: () => void;
  handleReview: () => void;
  handleLater: () => void;
  handleNever: () => void;
  getReviewUrl: (locationId: string) => string;
}

export function useReviewRequest(locationId: string | null): UseReviewRequestReturn {
  const [showReviewRequest, setShowReviewRequest] = useState(false);

  // Get review URL for the GHL marketplace
  const getReviewUrl = useCallback((locId: string) => {
    return `https://app.gohighlevel.com/v2/location/${locId}/integration/${APP_INTEGRATION_ID}/versions/${APP_VERSION_ID}?app_from=marketplace&view=agency`;
  }, []);

  // Check if enough time has passed since "Later"
  const hasCooldownPassed = useCallback((): boolean => {
    const lastShown = localStorage.getItem(STORAGE_KEYS.lastShown);
    if (!lastShown) return true;

    const lastShownDate = new Date(lastShown);
    const now = new Date();
    const daysSinceShown = (now.getTime() - lastShownDate.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceShown >= COOLDOWN_DAYS;
  }, []);

  // Check if user has done enough actions since clicking "Later"
  const hasEnoughActions = useCallback((): boolean => {
    const actions = parseInt(localStorage.getItem(STORAGE_KEYS.actionsSinceShown) || '0', 10);
    return actions >= MIN_ACTIONS_AFTER_LATER;
  }, []);

  // Check if we should show the review request
  const shouldShow = useCallback((): boolean => {
    // Must have a valid locationId
    if (!locationId) return false;

    // Must be in allowed locations list
    if (!ALLOWED_LOCATIONS.includes(locationId)) return false;

    // Check status
    const status = localStorage.getItem(STORAGE_KEYS.status) as ReviewStatus;

    // Never show if user said "never" or already reviewed
    if (status === 'never' || status === 'reviewed') return false;

    // If they clicked "Later", check cooldown AND actions
    if (status === 'later') {
      return hasCooldownPassed() && hasEnoughActions();
    }

    // First time - show it
    return true;
  }, [locationId, hasCooldownPassed, hasEnoughActions]);

  // Increment action count (call after successful operations)
  const incrementActionCount = useCallback(() => {
    const current = parseInt(localStorage.getItem(STORAGE_KEYS.actionsSinceShown) || '0', 10);
    localStorage.setItem(STORAGE_KEYS.actionsSinceShown, String(current + 1));
  }, []);

  // Trigger check (call after successful actions)
  const triggerReviewCheck = useCallback(() => {
    incrementActionCount();

    if (shouldShow()) {
      setShowReviewRequest(true);
      localStorage.setItem(STORAGE_KEYS.lastShown, new Date().toISOString());
    }
  }, [shouldShow, incrementActionCount]);

  // Handle "Leave a Review" click
  const handleReview = useCallback(() => {
    if (locationId) {
      window.open(getReviewUrl(locationId), '_blank');
    }
    localStorage.setItem(STORAGE_KEYS.status, 'reviewed');
    setShowReviewRequest(false);
  }, [locationId, getReviewUrl]);

  // Handle "Maybe Later" click
  const handleLater = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.status, 'later');
    localStorage.setItem(STORAGE_KEYS.lastShown, new Date().toISOString());
    localStorage.setItem(STORAGE_KEYS.actionsSinceShown, '0'); // Reset action count
    setShowReviewRequest(false);
  }, []);

  // Handle "No thanks, never" click
  const handleNever = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.status, 'never');
    setShowReviewRequest(false);
  }, []);

  return {
    showReviewRequest,
    setShowReviewRequest,
    triggerReviewCheck,
    incrementActionCount,
    handleReview,
    handleLater,
    handleNever,
    getReviewUrl,
  };
}
