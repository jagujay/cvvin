import { useState, useEffect } from 'react';

export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void;
}

export const useWalkthrough = (steps: WalkthroughStep[], storageKey: string = 'walkthrough-completed') => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    // Check if walkthrough was already completed
    const completed = localStorage.getItem(storageKey) === 'true';
    setIsCompleted(completed);
    
    // Auto-start walkthrough ONLY for new users (when steps are provided and not completed)
    if (!completed && steps.length > 0) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 2000); // Longer delay to let the page fully load
      
      return () => clearTimeout(timer);
    }
  }, [steps.length, storageKey]);

  const startWalkthrough = () => {
    setIsOpen(true);
  };

  const completeWalkthrough = () => {
    setIsOpen(false);
    setIsCompleted(true);
    localStorage.setItem(storageKey, 'true');
  };

  const skipWalkthrough = () => {
    setIsOpen(false);
    setIsCompleted(true);
    localStorage.setItem(storageKey, 'true');
  };

  const resetWalkthrough = () => {
    localStorage.removeItem(storageKey);
    setIsCompleted(false);
  };

  return {
    isOpen,
    isCompleted,
    startWalkthrough,
    completeWalkthrough,
    skipWalkthrough,
    resetWalkthrough
  };
};
