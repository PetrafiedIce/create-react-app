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
      <h2>KingdomCraft SMP & Events</h2>
      <p>Survive, compete, and hang out with Just Games.</p>
      <a href="#join" className="cta" onClick={handleJoinClick}>
        Join Now
      </a>
    </section>
  );
};

export default Hero;
