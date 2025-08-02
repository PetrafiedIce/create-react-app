import React from 'react';
import './Features.css';

const features = [
  { icon: '🌍', title: 'Custom Worlds', desc: 'Explore unique landscapes and challenges.' },
  { icon: '🤝', title: 'Friendly Community', desc: 'Meet players and build together.' },
  { icon: '🎮', title: 'Minigames', desc: 'Compete in fun mini-games.' },
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
