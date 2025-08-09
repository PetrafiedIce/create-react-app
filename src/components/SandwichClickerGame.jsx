import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'sandwich_clicker_save_v1';

function formatNumber(value) {
  if (value < 1000) return value.toFixed(0);
  const units = ['K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','De'];
  let unitIndex = -1;
  let num = value;
  while (num >= 1000 && unitIndex < units.length - 1) {
    num /= 1000;
    unitIndex += 1;
  }
  return `${num.toFixed(num < 10 ? 2 : num < 100 ? 1 : 0)}${units[unitIndex] ?? ''}`;
}

function loadSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveGame(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function useInterval(callback, delayMs) {
  const savedRef = useRef(callback);
  useEffect(() => { savedRef.current = callback; }, [callback]);
  useEffect(() => {
    if (delayMs == null) return undefined;
    const id = setInterval(() => savedRef.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}

const BASE_GENERATORS = [
  { id: 'apprentice', name: 'Apprentice', baseCost: 15, baseSps: 0.1 },
  { id: 'toaster', name: 'Toaster', baseCost: 100, baseSps: 1 },
  { id: 'sous', name: 'Sous Chef', baseCost: 1100, baseSps: 8 },
  { id: 'truck', name: 'Food Truck', baseCost: 12000, baseSps: 47 },
  { id: 'deli', name: 'Deli', baseCost: 130000, baseSps: 260 },
  { id: 'factory', name: 'Factory', baseCost: 1400000, baseSps: 1400 },
];

const BASE_UPGRADES = [
  { id: 'toasty-bread', name: 'Toasty Bread', desc: '+100% click power', cost: 100, type: 'click-mult', value: 2, requires: null },
  { id: 'sharp-knife', name: 'Sharp Knife', desc: '+50% generator output', cost: 1000, type: 'sps-mult', value: 1.5, requires: 'toasty-bread' },
  { id: 'golden-mayo', name: 'Golden Mayo', desc: '+2 base click', cost: 5000, type: 'click-base', value: 2, requires: 'sharp-knife' },
  { id: 'speedy-prep', name: 'Speedy Prep', desc: 'Generators +100% faster', cost: 20000, type: 'sps-mult', value: 2, requires: null },
  { id: 'double-stack', name: 'Double Stack', desc: 'Clicking gains +5% of SPS', cost: 75000, type: 'click-sps-share', value: 0.05, requires: null },
];

const ACHIEVEMENTS = [
  { id: 'first-sandwich', name: 'First Bite', check: (state) => state.totalSandwiches >= 1 },
  { id: 'hundred', name: 'Century Club', check: (state) => state.totalSandwiches >= 100 },
  { id: 'thousand', name: 'Kilowich', check: (state) => state.totalSandwiches >= 1000 },
  { id: 'ten-k', name: 'Deli Dreams', check: (state) => state.totalSandwiches >= 10000 },
  { id: 'first-helper', name: 'You’re Hired', check: (state) => state.generators.some(g => g.owned >= 1) },
  { id: 'five-toasters', name: 'Toast Master', check: (state) => state.generators.find(g => g.id === 'toaster')?.owned >= 5 },
  { id: 'upgrade', name: 'Shiny Upgrade', check: (state) => state.upgradesPurchased.length >= 1 },
];

function computeNextCost(baseCost, owned, multiplier = 1.15, amount = 1) {
  // Geometric series for buying multiple; here we default to cost of next single
  let total = 0;
  let cost = baseCost * Math.pow(multiplier, owned);
  for (let i = 0; i < amount; i += 1) {
    total += cost;
    cost *= multiplier;
  }
  return total;
}

export default function SandwichClickerGame() {
  const [sandwiches, setSandwiches] = useState(0);
  const [totalSandwiches, setTotalSandwiches] = useState(0);
  const [clickBase, setClickBase] = useState(1);
  const [clickMult, setClickMult] = useState(1);
  const [clickSpsShare, setClickSpsShare] = useState(0);
  const [generators, setGenerators] = useState(() => BASE_GENERATORS.map(g => ({ ...g, owned: 0 })));
  const [upgradesPurchased, setUpgradesPurchased] = useState([]);
  const [lastSaveTs, setLastSaveTs] = useState(() => Date.now());
  const [floaters, setFloaters] = useState([]);

  // Load save
  useEffect(() => {
    const saved = loadSave();
    if (!saved) return;
    setSandwiches(saved.sandwiches ?? 0);
    setTotalSandwiches(saved.totalSandwiches ?? 0);
    setClickBase(saved.clickBase ?? 1);
    setClickMult(saved.clickMult ?? 1);
    setClickSpsShare(saved.clickSpsShare ?? 0);
    setGenerators(saved.generators ?? BASE_GENERATORS.map(g => ({ ...g, owned: 0 })));
    setUpgradesPurchased(saved.upgradesPurchased ?? []);
    const now = Date.now();
    const deltaSec = Math.max(0, Math.floor((now - (saved.lastSaveTs ?? now)) / 1000));
    setLastSaveTs(now);
    // offline progress
    const sps = computeSps(saved.generators ?? [], saved.upgradesPurchased ?? []);
    if (deltaSec > 0 && sps > 0) {
      const gain = sps * deltaSec;
      setSandwiches(prev => prev + gain);
      setTotalSandwiches(prev => prev + gain);
    }
  }, []);

  // Derived stats
  const spsMult = useMemo(() => {
    return upgradesPurchased.reduce((m, id) => {
      const u = BASE_UPGRADES.find(x => x.id === id);
      if (u?.type === 'sps-mult') return m * u.value;
      return m;
    }, 1);
  }, [upgradesPurchased]);

  const clickPower = useMemo(() => {
    let base = clickBase;
    let mult = clickMult;
    upgradesPurchased.forEach(id => {
      const u = BASE_UPGRADES.find(x => x.id === id);
      if (u?.type === 'click-mult') mult *= u.value;
      if (u?.type === 'click-base') base += u.value;
      if (u?.type === 'click-sps-share') {/* handled on click */}
    });
    return base * mult;
  }, [clickBase, clickMult, upgradesPurchased]);

  const sps = useMemo(() => computeSps(generators, upgradesPurchased, spsMult), [generators, upgradesPurchased, spsMult]);

  function computeSps(gens, purchased, multOverride) {
    const mult = multOverride ?? purchased.reduce((m, id) => {
      const u = BASE_UPGRADES.find(x => x.id === id);
      if (u?.type === 'sps-mult') return m * u.value;
      return m;
    }, 1);
    return gens.reduce((sum, g) => sum + g.owned * g.baseSps * mult, 0);
  }

  const addFloater = useCallback((text) => {
    const id = Math.random().toString(36).slice(2);
    setFloaters(f => [...f, { id, text }]);
    setTimeout(() => setFloaters(f => f.filter(x => x.id !== id)), 650);
  }, []);

  const handleClick = useCallback(() => {
    const gainFromClick = clickPower + (sps * clickSpsShare);
    setSandwiches(prev => prev + gainFromClick);
    setTotalSandwiches(prev => prev + gainFromClick);
    addFloater(`+${formatNumber(gainFromClick)}`);
  }, [clickPower, sps, clickSpsShare, addFloater]);

  // Keyboard click support (moved below handleClick)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.repeat) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleClick();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleClick]);

  // Passive income per second
  useInterval(() => {
    if (sps <= 0) return;
    setSandwiches(prev => prev + sps / 10);
    setTotalSandwiches(prev => prev + sps / 10);
  }, 100);

  // Autosave
  useInterval(() => {
    const snapshot = {
      sandwiches,
      totalSandwiches,
      clickBase,
      clickMult,
      clickSpsShare,
      generators,
      upgradesPurchased,
      lastSaveTs: Date.now(),
    };
    saveGame(snapshot);
    setLastSaveTs(Date.now());
  }, 3000);

  const canAfford = (cost) => sandwiches >= cost - 1e-9;

  const buyGenerator = (id, amount = 1) => {
    setGenerators(prev => prev.map(g => {
      if (g.id !== id) return g;
      const totalCost = computeNextCost(g.baseCost, g.owned, 1.15, amount);
      if (!canAfford(totalCost)) return g;
      setSandwiches(s => s - totalCost);
      return { ...g, owned: g.owned + amount };
    }));
  };

  const buyUpgrade = (u) => {
    if (upgradesPurchased.includes(u.id)) return;
    if (!canAfford(u.cost)) return;
    // Requirements
    if (u.requires && !upgradesPurchased.includes(u.requires)) return;
    setSandwiches(s => s - u.cost);
    setUpgradesPurchased(prev => [...prev, u.id]);
    if (u.type === 'click-mult') setClickMult(m => m * u.value);
    if (u.type === 'click-base') setClickBase(b => b + u.value);
    if (u.type === 'click-sps-share') setClickSpsShare(v => v + u.value);
  };

  const resetGame = () => {
    if (!window.confirm('Reset game? This will wipe your progress.')) return;
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  // UI helpers
  const nextCosts = useMemo(() => Object.fromEntries(generators.map(g => [g.id, computeNextCost(g.baseCost, g.owned)])), [generators]);

  const availableUpgrades = useMemo(() => {
    return BASE_UPGRADES.filter(u => !upgradesPurchased.includes(u.id))
      .sort((a, b) => a.cost - b.cost);
  }, [upgradesPurchased]);

  const unlockedAchievements = useMemo(() => {
    const state = { totalSandwiches, generators, upgradesPurchased };
    return ACHIEVEMENTS.filter(a => a.check(state));
  }, [totalSandwiches, generators, upgradesPurchased]);

  return (
    <div className="app-shell" style={{ animation: 'crtFlicker 6s infinite' }}>
      <div className="header">
        <div className="title">🥪 Sandwich Clicker</div>
        <div className="stats">
          <div>SANDWICHES: {formatNumber(sandwiches)}</div>
          <div>SPC: {formatNumber(clickPower)}</div>
          <div>SPS: {formatNumber(sps)}</div>
        </div>
      </div>

      <div className="main">
        <div className="sidebar pixel">
          <div className="section-title">Ingredients & Stats</div>
          <div className="panel">
            <div className="row"><span>Total made</span><span>{formatNumber(totalSandwiches)}</span></div>
            <div className="row"><span>Click power</span><span>{formatNumber(clickPower)}</span></div>
            <div className="row"><span>Passive SPS</span><span>{formatNumber(sps)}</span></div>
            <div className="row"><span>Last save</span><span>{new Date(lastSaveTs).toLocaleTimeString()}</span></div>
          </div>

          <div className="section-title">Achievements ({unlockedAchievements.length}/{ACHIEVEMENTS.length})</div>
          <div className="list">
            {unlockedAchievements.map(a => (
              <div key={a.id} className="card pixel"><div className="name">🏆 {a.name}</div></div>
            ))}
            {unlockedAchievements.length === 0 && <div className="card pixel"><div>Make your first sandwich to start unlocking!</div></div>}
          </div>

          <div className="section-title">Settings</div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={() => saveGame({ sandwiches, totalSandwiches, clickBase, clickMult, clickSpsShare, generators, upgradesPurchased, lastSaveTs: Date.now() })}>Save</button>
            <button className="btn danger" onClick={resetGame}>Reset</button>
          </div>
        </div>

        <div className="panel pixel" style={{ padding: 18 }}>
          <div className="section-title">Make Sandwiches</div>
          <div className="floaters">
            <div role="button" aria-label="Make sandwich" className="big-button pixel" onClick={handleClick}>
              <div className="big-sandwich" aria-hidden>🥪</div>
            </div>
            {floaters.map(f => (
              <div key={f.id} className="floater">{f.text}</div>
            ))}
          </div>
          <div className="resource">You have {formatNumber(sandwiches)} sandwiches</div>
        </div>

        <div className="shop pixel">
          <div className="section-title">Hire & Build</div>
          <div className="list">
            {generators.map(g => {
              const next = nextCosts[g.id];
              const affordable = canAfford(next);
              return (
                <div key={g.id} className="card pixel">
                  <div>
                    <div className="name">{g.name}</div>
                    <div className="desc">+{formatNumber(g.baseSps)} SPS each</div>
                    <div className="cost">Cost: {formatNumber(next)}</div>
                    <div className="owned">Owned: {g.owned}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button className="btn" onClick={() => buyGenerator(g.id, 1)} disabled={!affordable}>Buy 1</button>
                    <button className="btn secondary" onClick={() => buyGenerator(g.id, 10)} disabled={!canAfford(computeNextCost(g.baseCost, g.owned, 1.15, 10))}>Buy 10</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="section-title" style={{ marginTop: 14 }}>Upgrades</div>
          <div className="list">
            {availableUpgrades.map(u => (
              <div key={u.id} className="card pixel">
                <div>
                  <div className="name">{u.name}</div>
                  <div className="desc">{u.desc}</div>
                  <div className="cost">Cost: {formatNumber(u.cost)}</div>
                </div>
                <button className="btn" disabled={!canAfford(u.cost) || (u.requires && !upgradesPurchased.includes(u.requires))} onClick={() => buyUpgrade(u)}>Buy</button>
              </div>
            ))}
            {availableUpgrades.length === 0 && (
              <div className="card pixel"><div>No upgrades available. Keep making sandwiches!</div></div>
            )}
          </div>
        </div>
      </div>

      <div className="footer">Made with love in retro style. Tip: buying more helpers increases SPS, upgrades boost click power and efficiency.</div>
    </div>
  );
}