/**
 * VolumeDial — Rotary Volume Knob
 *
 * A CSS-based rotating dial positioned over the UHF channel knob
 * on the TV frame. Controls audio volume via drag rotation.
 */

import { useRef, useCallback, useState } from 'react';

interface VolumeDialProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  /** CSS size in px */
  size?: number;
}

export function VolumeDial({
  volume,
  isMuted,
  onVolumeChange,
  onMuteToggle,
  size = 60,
}: VolumeDialProps) {
  const dialRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastAngle = useRef(0);
  const [showOsd, setShowOsd] = useState(false);

  // Volume maps to rotation: 0% = -135deg, 100% = +135deg (270deg sweep)
  const effectiveVolume = isMuted ? 0 : volume;
  const rotation = effectiveVolume * 270 - 135;

  const getAngleFromEvent = useCallback((clientX: number, clientY: number) => {
    const dial = dialRef.current;
    if (!dial) return 0;
    const rect = dial.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    isDragging.current = true;
    lastAngle.current = getAngleFromEvent(e.clientX, e.clientY);
    setShowOsd(true);

    const dialEl = dialRef.current;
    if (dialEl) {
      dialEl.setPointerCapture(e.pointerId);
    }
  }, [getAngleFromEvent]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;

    const currentAngle = getAngleFromEvent(e.clientX, e.clientY);
    let delta = currentAngle - lastAngle.current;

    // Handle wrapping around ±180
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    lastAngle.current = currentAngle;

    // Map delta to volume change (full 360deg drag = full volume range)
    const volumeDelta = delta / 270;
    const newVolume = Math.min(1, Math.max(0, volume + volumeDelta));
    onVolumeChange(newVolume);
  }, [getAngleFromEvent, volume, onVolumeChange]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    setTimeout(() => setShowOsd(false), 1000);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY / 1000;
    const newVolume = Math.min(1, Math.max(0, volume + delta));
    onVolumeChange(newVolume);
    setShowOsd(true);
    setTimeout(() => setShowOsd(false), 1000);
  }, [volume, onVolumeChange]);

  const handleDoubleClick = useCallback(() => {
    onMuteToggle();
  }, [onMuteToggle]);

  return (
    <div
      ref={dialRef}
      className="volume-dial"
      style={{ width: size, height: size }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      title="Volume — Drag to adjust, double-click to mute"
    >
      {/* The rotating knob */}
      <div
        className="volume-dial-knob"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: isDragging.current ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        {/* Indicator notch */}
        <div className="volume-dial-indicator" />
      </div>

      {/* Volume OSD tooltip */}
      <div
        className="volume-osd"
        style={{ opacity: showOsd ? 1 : undefined }}
      >
        {isMuted ? 'MUTED' : `VOL ${Math.round(effectiveVolume * 100)}%`}
      </div>
    </div>
  );
}
