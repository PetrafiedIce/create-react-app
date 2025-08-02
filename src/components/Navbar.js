import React from 'react';
import './Navbar.css';

const Navbar = () => (
  <nav className="navbar">
    <h1 className="logo">KingdomCraft</h1>
    <ul className="nav-links">
      <li><a href="#features">Features</a></li>
      <li><a href="#join">Join</a></li>
    </ul>
  </nav>
);

export default Navbar;
