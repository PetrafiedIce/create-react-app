import React from 'react';
import './Footer.css';

const Footer = () => (
  <footer className="footer">
    <p>© {new Date().getFullYear()} KingdomCraft. Not affiliated with Mojang.</p>
  </footer>
);

export default Footer;
