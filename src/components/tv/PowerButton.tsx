/**
 * PowerButton — TV Power Toggle
 *
 * A round push-button positioned over the small button
 * on the TV frame. Toggles power state with LED indicator.
 */

interface PowerButtonProps {
  isOn: boolean;
  onToggle: () => void;
  size?: number;
}

export function PowerButton({ isOn, onToggle, size = 32 }: PowerButtonProps) {
  return (
    <button
      className="power-button"
      style={{ width: size, height: size }}
      onClick={onToggle}
      title={isOn ? 'Power Off' : 'Power On'}
      aria-label={isOn ? 'Power Off' : 'Power On'}
    >
      <div className="power-button-inner">
        {/* Simple dot or power icon */}
        <div
          style={{
            width: size * 0.25,
            height: size * 0.25,
            borderRadius: '50%',
            background: isOn
              ? 'radial-gradient(circle, #ff6644 0%, #cc3322 100%)'
              : '#555',
            boxShadow: isOn
              ? '0 0 4px rgba(255, 102, 68, 0.6)'
              : 'none',
            transition: 'all 0.3s',
          }}
        />
      </div>

      {/* LED indicator below the button */}
      <div className={`power-led ${isOn ? 'on' : ''}`} />
    </button>
  );
}
