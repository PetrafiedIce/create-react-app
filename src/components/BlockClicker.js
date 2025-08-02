import React, { useState } from 'react';
import './BlockClicker.css';

const BlockClicker = () => {
  const [score, setScore] = useState(0);

  const handleClick = () => {
    setScore((s) => s + 1);
  };

  return (
    <section className="block-clicker">
      <h2>Block Clicker</h2>
      <p>Click the block as fast as you can!</p>
      <div
        className="block"
        onClick={handleClick}
        role="button"
        tabIndex={0}
      />
      <p>Score: {score}</p>
    </section>
  );
};

export default BlockClicker;
