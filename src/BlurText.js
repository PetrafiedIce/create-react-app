import { useEffect, useRef } from 'react';
import './BlurText.css';

export default function BlurText({ text, as: Tag = 'span', className = '', delay = 0 }) {
  const spans = useRef([]);

  useEffect(() => {
    spans.current.forEach((span, i) => {
      if (span) {
        span.style.animationDelay = `${i * 0.1 + delay}s`;
      }
    });
  }, [delay]);

  return (
    <Tag className={`blur-text ${className}`}>
      {text.split('').map((char, i) => (
        <span key={i} ref={(el) => (spans.current[i] = el)}>
          {char}
        </span>
      ))}
    </Tag>
  );
}
