import React from 'react';
import './Features.css';

const features = [
  { title: 'Custom Worlds', desc: 'Explore unique landscapes and challenges.' },
  { title: 'Friendly Community', desc: 'Meet players and build together.' },
  { title: 'Minigames', desc: 'Compete in fun mini-games.' },
];

const Features = () => (
  <section id="features" className="features">
    {features.map((f) => (
      <div key={f.title} className="feature">
        <h3>{f.title}</h3>
        <p>{f.desc}</p>
      </div>
    ))}
  </section>
);

export default Features;
