import { useRef, useCallback } from 'react';

/**
 * Custom hook for managing progress intervals with automatic cleanup
 * @param updateProgress - Function to update progress state
 * @param interval - Interval in milliseconds (default: 300)
 * @param increment - Progress increment per interval (default: 15)
 * @param maxProgress - Maximum progress value (default: 90)
 */
export function useProgressInterval(
  updateProgress: (updater: (prev: number) => number) => void,
  interval: number = 300,
  increment: number = 15,
  maxProgress: number = 90
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startProgress = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      updateProgress(prev => Math.min(prev + increment, maxProgress));
    }, interval);
  }, [updateProgress, interval, increment, maxProgress]);

  const stopProgress = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const completeProgress = useCallback(() => {
    stopProgress();
    updateProgress(() => 100);
  }, [stopProgress, updateProgress]);

  return { startProgress, stopProgress, completeProgress };
}