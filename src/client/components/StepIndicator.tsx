interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepNames: string[];
}

export default function StepIndicator({
  currentStep,
  totalSteps,
  stepNames,
}: StepIndicatorProps) {
  return (
    <div className="mb-4">
      <div className="relative">
        <div className="absolute top-1.5 left-1.5 right-1.5 h-px bg-neutral-700" />

        <div
          className="absolute top-1.5 left-1.5 h-px bg-neutral-400 transition-all duration-300 ease-in-out"
          style={{
            width: `${Math.max(0, ((currentStep - 1) / (totalSteps - 1)) * 100)}%`,
            maxWidth: 'calc(100% - 0.75rem)',
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
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${
                    isCompleted
                      ? 'bg-neutral-300'
                      : isActive
                        ? 'bg-white'
                        : 'bg-neutral-600'
                  }`}
                />

                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
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
