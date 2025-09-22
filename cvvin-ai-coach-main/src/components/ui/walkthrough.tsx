import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for target element
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void;
}

interface WalkthroughProps {
  steps: WalkthroughStep[];
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const Walkthrough: React.FC<WalkthroughProps> = ({
  steps,
  isOpen,
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (currentStepData?.action) {
      currentStepData.action();
    }

    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  useEffect(() => {
    if (!isOpen || !steps[currentStep]?.target) return;

    const element = document.querySelector(steps[currentStep].target!) as HTMLElement;
    setTargetElement(element);

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStep, isOpen, steps]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onSkip();
          break;
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (!isFirstStep) handlePrevious();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, isFirstStep, onSkip, handleNext, handlePrevious]);

  if (!isOpen) return null;

  const getTooltipPosition = () => {
    if (!targetElement) return { 
      top: '50%', 
      left: '50%', 
      transform: 'translate(-50%, -50%)',
      position: 'fixed' as const
    };

    const rect = targetElement.getBoundingClientRect();
    const position = currentStepData.position || 'bottom';
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = 320;
    const tooltipHeight = 250;
    const margin = 16;

    let top: number | string;
    let left: number | string;
    let transform = '';

    // Always try to position tooltip in visible area
    switch (position) {
      case 'center':
        top = '50%';
        left = '50%';
        transform = 'translate(-50%, -50%)';
        break;
        
      case 'top':
        if (rect.top - tooltipHeight - margin > 0) {
          top = rect.top - margin;
          transform = 'translate(-50%, -100%)';
        } else {
          top = rect.bottom + margin;
          transform = 'translate(-50%, 0)';
        }
        left = Math.max(tooltipWidth / 2 + margin, Math.min(rect.left + rect.width / 2, viewportWidth - tooltipWidth / 2 - margin));
        break;
        
      case 'bottom':
        if (rect.bottom + tooltipHeight + margin < viewportHeight) {
          top = rect.bottom + margin;
          transform = 'translate(-50%, 0)';
        } else {
          top = rect.top - margin;
          transform = 'translate(-50%, -100%)';
        }
        left = Math.max(tooltipWidth / 2 + margin, Math.min(rect.left + rect.width / 2, viewportWidth - tooltipWidth / 2 - margin));
        break;
        
      case 'left':
        if (rect.left - tooltipWidth - margin > 0) {
          left = rect.left - margin;
          transform = 'translate(-100%, -50%)';
        } else {
          left = rect.right + margin;
          transform = 'translate(0, -50%)';
        }
        top = Math.max(tooltipHeight / 2 + margin, Math.min(rect.top + rect.height / 2, viewportHeight - tooltipHeight / 2 - margin));
        break;
        
      case 'right':
        if (rect.right + tooltipWidth + margin < viewportWidth) {
          left = rect.right + margin;
          transform = 'translate(0, -50%)';
        } else {
          left = rect.left - margin;
          transform = 'translate(-100%, -50%)';
        }
        top = Math.max(tooltipHeight / 2 + margin, Math.min(rect.top + rect.height / 2, viewportHeight - tooltipHeight / 2 - margin));
        break;
        
      default:
        // Fallback to center if positioning fails
        top = '50%';
        left = '50%';
        transform = 'translate(-50%, -50%)';
    }

    return { top, left, transform, position: 'fixed' as const };
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-20 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Highlight target element */}
      {targetElement && (
        <>
          {/* Subtle highlight */}
          <div
            className="absolute border-2 border-primary/60 rounded-xl shadow-lg pointer-events-none animate-pulse"
            style={{
              top: targetElement.getBoundingClientRect().top - 4,
              left: targetElement.getBoundingClientRect().left - 4,
              width: targetElement.getBoundingClientRect().width + 8,
              height: targetElement.getBoundingClientRect().height + 8,
              zIndex: 52,
              boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)'
            }}
          />
        </>
      )}

      {/* Tooltip */}
      <Card 
        className="absolute w-80 max-w-sm shadow-2xl border border-border bg-background/98 backdrop-blur-md z-53 animate-in slide-in-from-bottom-2 duration-200"
        style={getTooltipPosition()}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold shadow-md">
                {currentStep + 1}
              </div>
              <CardTitle className="text-xl font-semibold">{currentStepData.title}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="h-8 w-8 p-0 hover:bg-muted rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {currentStepData.description}
          </p>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-1 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                  index <= currentStep 
                    ? 'bg-gradient-to-r from-primary to-primary/80' 
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step counter */}
          <div className="text-center mb-4">
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {currentStep + 1} / {steps.length}
            </span>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-3">
            {!isFirstStep ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            ) : (
              <div className="flex-1" />
            )}
            
            <Button
              size="sm"
              onClick={handleNext}
              className="flex-1 gradient-primary font-medium shadow-md hover:shadow-lg transition-shadow"
            >
              {isLastStep ? '🚀 Get Started' : 'Next'}
              {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Walkthrough;
