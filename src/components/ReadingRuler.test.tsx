// Unit tests for ReadingRuler component
// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReadingRuler from './ReadingRuler';

describe('ReadingRuler', () => {
  it('renders nothing when not enabled (Req 7.4)', () => {
    const { container } = render(
      <ReadingRuler enabled={false} activeLineIndex={0} onLineChange={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the overlay when enabled (Req 7.1)', () => {
    render(
      <ReadingRuler enabled={true} activeLineIndex={0} onLineChange={vi.fn()} />,
    );
    expect(screen.getByTestId('reading-ruler')).toBeInTheDocument();
  });

  it('renders a clear strip and dim sections (Req 7.1, 7.2)', () => {
    render(
      <ReadingRuler enabled={true} activeLineIndex={2} onLineChange={vi.fn()} />,
    );
    expect(screen.getByTestId('reading-ruler-top')).toBeInTheDocument();
    expect(screen.getByTestId('reading-ruler-strip')).toBeInTheDocument();
    expect(screen.getByTestId('reading-ruler-bottom')).toBeInTheDocument();
  });

  it('does not render top dim section when activeLineIndex is 0', () => {
    render(
      <ReadingRuler enabled={true} activeLineIndex={0} onLineChange={vi.fn()} />,
    );
    expect(screen.queryByTestId('reading-ruler-top')).not.toBeInTheDocument();
    expect(screen.getByTestId('reading-ruler-strip')).toBeInTheDocument();
    expect(screen.getByTestId('reading-ruler-bottom')).toBeInTheDocument();
  });

  it('positions the clear strip based on activeLineIndex', () => {
    render(
      <ReadingRuler enabled={true} activeLineIndex={3} onLineChange={vi.fn()} />,
    );
    const strip = screen.getByTestId('reading-ruler-strip');
    // LINE_HEIGHT = 48, so top = 3 * 48 = 144
    expect(strip.style.top).toBe('144px');
  });

  it('dims above and below the active line (Req 7.2)', () => {
    render(
      <ReadingRuler enabled={true} activeLineIndex={2} onLineChange={vi.fn()} />,
    );
    const top = screen.getByTestId('reading-ruler-top');
    const bottom = screen.getByTestId('reading-ruler-bottom');

    // Top dim height = 2 * 48 = 96px
    expect(top.style.height).toBe('96px');
    expect(top.style.backgroundColor).toBe('rgba(0, 0, 0, 0.45)');
    expect(bottom.style.backgroundColor).toBe('rgba(0, 0, 0, 0.45)');
  });

  it('clear strip has pointer-events: none so text is interactive', () => {
    render(
      <ReadingRuler enabled={true} activeLineIndex={1} onLineChange={vi.fn()} />,
    );
    const strip = screen.getByTestId('reading-ruler-strip');
    expect(strip.style.pointerEvents).toBe('none');
  });

  it('moves ruler on click/tap (Req 7.3)', () => {
    const onLineChange = vi.fn();
    render(
      <ReadingRuler enabled={true} activeLineIndex={0} onLineChange={onLineChange} />,
    );
    const overlay = screen.getByTestId('reading-ruler');

    // Simulate a click at y=150 relative to the overlay
    // getBoundingClientRect returns {top: 0} by default in jsdom
    fireEvent.click(overlay, { clientY: 150 });

    // 150 / 48 = 3.125 → floor → line 3
    expect(onLineChange).toHaveBeenCalledWith(3);
  });

  it('moves ruler down on ArrowDown key (Req 7.3)', () => {
    const onLineChange = vi.fn();
    render(
      <ReadingRuler enabled={true} activeLineIndex={2} onLineChange={onLineChange} />,
    );

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(onLineChange).toHaveBeenCalledWith(3);
  });

  it('moves ruler up on ArrowUp key (Req 7.3)', () => {
    const onLineChange = vi.fn();
    render(
      <ReadingRuler enabled={true} activeLineIndex={2} onLineChange={onLineChange} />,
    );

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(onLineChange).toHaveBeenCalledWith(1);
  });

  it('does not go below line 0 on ArrowUp', () => {
    const onLineChange = vi.fn();
    render(
      <ReadingRuler enabled={true} activeLineIndex={0} onLineChange={onLineChange} />,
    );

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(onLineChange).toHaveBeenCalledWith(0);
  });

  it('does not listen to keyboard events when disabled', () => {
    const onLineChange = vi.fn();
    render(
      <ReadingRuler enabled={false} activeLineIndex={0} onLineChange={onLineChange} />,
    );

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(onLineChange).not.toHaveBeenCalled();
  });

  it('has accessible role and label', () => {
    render(
      <ReadingRuler enabled={true} activeLineIndex={0} onLineChange={vi.fn()} />,
    );
    expect(screen.getByRole('region', { name: /reading ruler/i })).toBeInTheDocument();
  });
});
