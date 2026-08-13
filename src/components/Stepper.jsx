export default function Stepper({ steps, currentIndex, onStepClick }) {
  return (
    <div className="stepper">
      {steps.map((step, idx) => (
        <div key={step} className="stepper-item">
          <button
            type="button"
            className={`stepper-dot${idx < currentIndex ? ' done' : idx === currentIndex ? ' active' : ''}`}
            onClick={() => onStepClick && onStepClick(step, idx)}
            title={step}
          >
            {idx < currentIndex
              ? <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"/></svg>
              : idx + 1}
          </button>
          {idx < steps.length - 1 && <div className={`stepper-line${idx < currentIndex ? ' done' : ''}`} />}
        </div>
      ))}
    </div>
  );
}
