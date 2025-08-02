import './App.css';

export default function App() {
  return (
    <div className="landing">
      <header className="hero">
        <h1>KingdomCraft</h1>
        <p className="tagline">A new era of Minecraft SMP adventures.</p>
        <div className="ip-box">
          <span>kingdomcraft.net</span>
        </div>
        <div className="links">
          <a
            href="https://discord.kingdomcraft.net"
            target="_blank"
            rel="noopener noreferrer"
          >
            Join our Discord
          </a>
          <a
            href="https://store.kingdomcraft.net"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit the Store
          </a>
        </div>
      </header>
    </div>
  );
}

