/**
 * BootSequence — CRT Boot-up Intro Animation
 *
 * Plays a 2.5-second "booting IDKstream" typed text intro
 * when the TV is powered on. VT323 font with green phosphor glow
 * and chromatic aberration.
 */

import { useState, useEffect, useRef } from 'react';

interface BootSequenceProps {
  onComplete: () => void;
}

const BOOT_LINES = [
  '> initializing signal...',
  '> booting IDKstream...',
  '> ',
];

// Full progress bar (16 blocks)
const PROGRESS_BAR = '████████████████';
const PROGRESS_LABEL = ' READY';

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [phase, setPhase] = useState<'warmup' | 'typing' | 'progress' | 'done'>('warmup');
  const [progressCount, setProgressCount] = useState(0);
  const completedRef = useRef(false);

  // Phase 1: Warm-up flicker (0–0.6s)
  useEffect(() => {
    const warmupTimer = setTimeout(() => {
      setPhase('typing');
    }, 600);
    return () => clearTimeout(warmupTimer);
  }, []);

  // Phase 2: Type out boot lines character by character
  useEffect(() => {
    if (phase !== 'typing') return;

    const fullText = BOOT_LINES.join('\n');
    let charIndex = 0;

    const typeInterval = setInterval(() => {
      charIndex++;
      setDisplayedText(fullText.slice(0, charIndex));

      if (charIndex >= fullText.length) {
        clearInterval(typeInterval);
        setPhase('progress');
      }
    }, 35); // 35ms per character for snappy typing

    return () => clearInterval(typeInterval);
  }, [phase]);

  // Phase 3: Animate progress bar
  useEffect(() => {
    if (phase !== 'progress') return;

    let count = 0;
    const progressInterval = setInterval(() => {
      count++;
      setProgressCount(count);

      if (count >= PROGRESS_BAR.length) {
        clearInterval(progressInterval);
        setPhase('done');
      }
    }, 30); // Fast progress bar fill

    return () => clearInterval(progressInterval);
  }, [phase]);

  // Phase 4: Complete — fade out and notify parent
  useEffect(() => {
    if (phase !== 'done') return;
    if (completedRef.current) return;
    completedRef.current = true;

    const doneTimer = setTimeout(() => {
      onComplete();
    }, 400); // Brief pause after READY, then transition

    return () => clearTimeout(doneTimer);
  }, [phase, onComplete]);

  // Cursor blink
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <div className={`boot-screen ${phase === 'warmup' ? 'crt-flicker' : ''}`}>
      {/* Static noise during warmup */}
      {phase === 'warmup' && (
        <div
          className="crt-static-overlay"
          style={{ opacity: 0.4 }}
        />
      )}

      {/* Typed text */}
      {phase !== 'warmup' && (
        <div className="boot-text">
          {displayedText}
          {phase === 'progress' && (
            <>
              {PROGRESS_BAR.slice(0, progressCount)}
              {progressCount >= PROGRESS_BAR.length ? PROGRESS_LABEL : ''}
            </>
          )}
          {phase === 'done' && (
            <>
              {PROGRESS_BAR}{PROGRESS_LABEL}
            </>
          )}
          {phase !== 'done' && (
            <span className="boot-cursor" style={{ opacity: showCursor ? 1 : 0 }}>
              ■
            </span>
          )}
        </div>
      )}
    </div>
  );
}
