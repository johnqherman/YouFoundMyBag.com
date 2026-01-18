import type { StepIndicatorProps } from '../types/index.js';

export default function StepIndicator({
  currentStep,
  totalSteps,
  stepNames,
}: StepIndicatorProps) {
  return (
    <div className="mb-6 sm:mb-8">
      {/* Mobile: Show current step name */}
      <div className="sm:hidden text-center mb-3">
        <span className="text-sm font-medium text-regal-navy-600">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-regal-navy-500">
          {' '}
          — {stepNames[currentStep - 1]}
        </span>
      </div>

      <div className="relative">
        {/* Progress bar background - adjusted for larger dots */}
        <div className="absolute top-2 sm:top-1.5 left-2 sm:left-1.5 right-2 sm:right-1.5 h-0.5 bg-regal-navy-200" />

        {/* Filled progress bar */}
        <div
          className="absolute top-2 sm:top-1.5 left-2 sm:left-1.5 h-0.5 bg-regal-navy-600 transition-all duration-300 ease-in-out progress-bar"
          style={{
            ['--progress-width' as string]: `${Math.max(0, ((currentStep - 1) / (totalSteps - 1)) * 100)}%`,
          }}
        />

        <div className="flex items-center justify-between relative z-10">
          {stepNames.map((name, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === currentStep;
            const isCompleted = stepNumber < currentStep;

            return (
              <div
                key={index}
                className="group relative flex flex-col items-center"
                title={name}
              >
                {/* Step dot - larger on mobile for touch targets */}
                <div
                  className={`w-4 h-4 sm:w-3 sm:h-3 rounded-full transition-all duration-200 border-2 ${
                    isCompleted
                      ? 'bg-regal-navy-600 border-regal-navy-600'
                      : isActive
                        ? 'bg-white border-regal-navy-600 ring-4 ring-regal-navy-100'
                        : 'bg-white border-regal-navy-300'
                  }`}
                />

                {/* Desktop: Hover tooltip */}
                <div className="hidden sm:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2.5 py-1 bg-regal-navy-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-soft-md">
                  {name}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
