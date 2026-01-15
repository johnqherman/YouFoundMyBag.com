import type { StepIndicatorProps } from '../types/index.js';

export default function StepIndicator({
  currentStep,
  totalSteps,
  stepNames,
}: StepIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="relative">
        <div className="absolute top-1.5 left-1.5 right-1.5 h-0.5 bg-regal-navy-200" />

        <div
          className="absolute top-1.5 left-1.5 h-0.5 bg-regal-navy-600 transition-all duration-300 ease-in-out progress-bar"
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
              <div key={index} className="group relative" title={name}>
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-200 border-2 ${
                    isCompleted
                      ? 'bg-regal-navy-600 border-regal-navy-600'
                      : isActive
                        ? 'bg-white border-regal-navy-600'
                        : 'bg-white border-regal-navy-300'
                  }`}
                />

                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2.5 py-1 bg-regal-navy-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-soft-md">
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
