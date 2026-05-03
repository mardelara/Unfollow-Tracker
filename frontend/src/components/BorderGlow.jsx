import { useEffect, useRef } from 'react';
import './BorderGlow.css';

/**
 * BorderGlow — wraps children in a container whose border glows
 * near the cursor, using CSS custom properties driven by mousemove.
 *
 * Props:
 *   children      — content to wrap
 *   className     — extra Tailwind / CSS classes for the wrapper
 *   glowColor     — CSS color string for the glow (default: soft violet)
 *   borderWidth   — glow border thickness in px (default: 1.5)
 *   borderRadius  — corner radius in px (default: 16)
 *   proximity     — distance in px from edge that triggers full glow (default: 80)
 */
export default function BorderGlow({
  children,
  className = '',
  glowColor = 'rgba(167, 139, 250, 0.75)',
  borderWidth = 1.5,
  borderRadius = 16,
  proximity = 80,
  style = {},
  ...props
}) {
  const cardRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const onMouseMove = (e) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const closest = Math.min(x, y, rect.width - x, rect.height - y);
        const edgeProximity = 1 - Math.min(closest / proximity, 1);

        const angle =
          Math.atan2(y - rect.height / 2, x - rect.width / 2) *
          (180 / Math.PI);

        card.style.setProperty('--edge-proximity', edgeProximity);
        card.style.setProperty('--cursor-angle', `${angle}deg`);
      });
    };

    const onMouseLeave = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        card.style.setProperty('--edge-proximity', 0);
      });
    };

    card.addEventListener('mousemove', onMouseMove);
    card.addEventListener('mouseleave', onMouseLeave);

    return () => {
      card.removeEventListener('mousemove', onMouseMove);
      card.removeEventListener('mouseleave', onMouseLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [proximity]);

  return (
    <div
      ref={cardRef}
      className={`border-glow-card ${className}`}
      style={{
        '--glow-color': glowColor,
        '--border-width': `${borderWidth}px`,
        '--border-radius': `${borderRadius}px`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
