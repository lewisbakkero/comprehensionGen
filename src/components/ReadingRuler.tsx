// ReadingRuler — visual overlay that highlights the active line and dims the rest
// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5

import { useEffect, useCallback } from 'react';

export interface ReadingRulerProps {
  enabled: boolean;
  activeLineIndex: number;
  onLineChange: (lineIndex: number) => void;
}

/** Height of the clear reading strip in pixels. */
const LINE_HEIGHT = 48;

/** Shared dim-overlay colour. */
const DIM_COLOR = 'rgba(0, 0, 0, 0.45)';

export default function ReadingRuler({
  enabled,
  activeLineIndex,
  onLineChange,
}: ReadingRulerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        onLineChange(activeLineIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onLineChange(Math.max(0, activeLineIndex - 1));
      }
    },
    [activeLineIndex, onLineChange],
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  if (!enabled) return null;

  const topHeight = activeLineIndex * LINE_HEIGHT;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const newLine = Math.max(0, Math.floor(clickY / LINE_HEIGHT));
    onLineChange(newLine);
  };

  return (
    <div
      data-testid="reading-ruler"
      role="region"
      aria-label="Reading ruler"
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1000,
        pointerEvents: 'auto',
        cursor: 'pointer',
      }}
    >
      {/* Top dim section */}
      {topHeight > 0 && (
        <div
          data-testid="reading-ruler-top"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${topHeight}px`,
            backgroundColor: DIM_COLOR,
            pointerEvents: 'auto',
          }}
        />
      )}

      {/* Clear strip — the active reading line */}
      <div
        data-testid="reading-ruler-strip"
        style={{
          position: 'absolute',
          top: `${topHeight}px`,
          left: 0,
          width: '100%',
          height: `${LINE_HEIGHT}px`,
          pointerEvents: 'none',
        }}
      />

      {/* Bottom dim section */}
      <div
        data-testid="reading-ruler-bottom"
        style={{
          position: 'absolute',
          top: `${topHeight + LINE_HEIGHT}px`,
          left: 0,
          width: '100%',
          height: `calc(100% - ${topHeight + LINE_HEIGHT}px)`,
          backgroundColor: DIM_COLOR,
          pointerEvents: 'auto',
        }}
      />
    </div>
  );
}
