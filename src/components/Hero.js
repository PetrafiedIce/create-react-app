import React from 'react';
import './Hero.css';

const Hero = () => {
  const handleJoinClick = (e) => {
    e.preventDefault();
    const target = document.getElementById('join');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="hero">
      <h2>Welcome to KingdomCraft</h2>
      <p>Your next adventure awaits.</p>
      <a href="#join" className="cta" onClick={handleJoinClick}>
        Join Now
      </a>
    </section>
  );
};

export default Hero;
