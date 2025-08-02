import { useEffect, useRef } from 'react';
import './App.css';

export default function App() {
  const buttonsRef = useRef([]);

  useEffect(() => {
    const handleMove = (e) => {
      buttonsRef.current.forEach((btn) => {
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        const dist = Math.hypot(dx, dy);
        const maxDist = 150;
        const force = Math.max(0, (maxDist - dist) / maxDist);
        btn.style.transform = `translate(${dx * 0.3 * force}px, ${dy * 0.3 * force}px)`;
      });
    };

    const reset = () => {
      buttonsRef.current.forEach((btn) => {
        if (btn) btn.style.transform = 'translate(0, 0)';
      });
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseout', reset);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseout', reset);
    };
  }, []);

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
            ref={(el) => (buttonsRef.current[0] = el)}
            href="https://discord.kingdomcraft.net"
            target="_blank"
            rel="noopener noreferrer"
          >
            Join our Discord
          </a>
          <a
            ref={(el) => (buttonsRef.current[1] = el)}
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

