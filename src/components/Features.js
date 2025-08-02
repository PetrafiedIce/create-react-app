import React from 'react';
import './Features.css';

const features = [
  { icon: '⛏️', title: 'Survival SMP', desc: 'Build, mine, and thrive in a persistent world.' },
  { icon: '🎉', title: 'Event Nights', desc: 'Jump into weekly challenges and competitions.' },
  { icon: '🎮', title: 'Just Games', desc: 'Visit our partner server for mini-games galore.' },
];

const Features = () => (
  <section id="features" className="features">
    {features.map((f) => (
      <div key={f.title} className="feature">
        <span className="icon" aria-hidden="true">{f.icon}</span>
        <h3>{f.title}</h3>
        <p>{f.desc}</p>
      </div>
    ))}
  </section>
);

export default Features;
