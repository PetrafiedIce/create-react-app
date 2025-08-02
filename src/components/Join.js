import React from 'react';
import './Join.css';

const Join = () => (
  <section id="join" className="join">
    <h2>Join the Server</h2>
    <p>Server IP: kingdomcraft.net</p>
    <p className="discord-note">
      You can always find the IP pinned in our
      {' '}<a href="https://discord.kingdomcraft.net" target="_blank" rel="noopener noreferrer">Discord</a>.
    </p>
    <div className="join-buttons">
      <a
        href="https://discord.kingdomcraft.net"
        className="btn"
        target="_blank"
        rel="noopener noreferrer"
      >
        Join Discord
      </a>
      <a
        href="https://store.kingdomcraft.net"
        className="btn"
        target="_blank"
        rel="noopener noreferrer"
      >
        Visit Store
      </a>
    </div>
  </section>
);

export default Join;
