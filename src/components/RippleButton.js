import React, { useState } from 'react';
import './RippleButton.css';

function RippleButton({ children, ...props }) {
  const [ripples, setRipples] = useState([]);

  const createRipple = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    const newRipple = { x, y, size, key: Date.now() };
    setRipples((prev) => [...prev, newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.key !== newRipple.key));
    }, 600);
  };

  return (
    <button className="ripple-button" onClick={createRipple} {...props}>
      {ripples.map((ripple) => (
        <span
          key={ripple.key}
          className="ripple"
          style={{ width: ripple.size, height: ripple.size, top: ripple.y, left: ripple.x }}
        />
      ))}
      {children}
    </button>
  );
}

export default RippleButton;
