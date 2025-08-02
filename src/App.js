import './App.css';
import BlurText from './BlurText';
import DarkVeil from './DarkVeil';

export default function App() {
  return (
    <div className="landing">
      <div
        style={{
          width: '100%',
          height: '600px',
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <DarkVeil />
        <header className="hero">
          <BlurText text="KingdomCraft" as="h1" />
          <BlurText
            text="A new era of Minecraft SMP adventures."
            as="p"
            className="tagline"
          />
          <div className="ip-box">
            <BlurText text="kingdomcraft.net" as="span" />
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
    </div>
  );
}
