'use client';

import { useRef, useEffect } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface KaTeXProps {
  tex: string;
  block?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders a LaTeX expression using KaTeX.
 * - `block` = true → display mode (centered, larger)
 * - `block` = false → inline mode
 */
export default function KaTeX({ tex, block = false, className = '', style }: KaTeXProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(tex, ref.current, {
          throwOnError: false,
          displayMode: block,
          strict: false,
        });
      } catch {
        if (ref.current) ref.current.textContent = tex;
      }
    }
  }, [tex, block]);

  return <span ref={ref} className={className} style={style} />;
}

/**
 * Renders a block-level (display mode) equation inside a styled container.
 */
export function MathBlock({
  tex,
  className = '',
  style,
  label,
}: KaTeXProps & { label?: string }) {
  return (
    <div
      className={`math-block-container ${className}`}
      style={{
        padding: '12px 16px',
        borderRadius: 6,
        backgroundColor: 'var(--bg-app)',
        border: '1px solid var(--border-color)',
        overflowX: 'auto',
        ...style,
      }}
    >
      {label && (
        <p
          className="text-[9px] uppercase tracking-widest font-semibold mb-1.5"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </p>
      )}
      <KaTeX tex={tex} block />
    </div>
  );
}
