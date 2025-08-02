import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => (
  <nav className="navbar">
    <h1 className="logo"><Link to="/">KingdomCraft</Link></h1>
    <ul className="nav-links">
      <li><a href="/#features">Features</a></li>
      <li><a href="/#join">Join</a></li>
      <li><Link to="/game">Game</Link></li>
    </ul>
  </nav>
);

export default Navbar;
