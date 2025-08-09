import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import Player from './components/Player';

const Home = () => {
  const defaultSrc = process.env.REACT_APP_HLS_URL || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  return (
    <div className="container">
      <header className="hero">
        <h1>Live Stream</h1>
        <p>Stream from OBS via RTMP and watch via HLS. Simple, fast, embeddable.</p>
      </header>
      <div className="player-card">
        <Player src={defaultSrc} autoplay={true} muted={true} controls={true} />
      </div>
      <section className="instructions">
        <h2>How to stream from OBS</h2>
        <ol>
          <li>
            Choose a streaming backend:
            <ul>
              <li>Cloud: Mux Live, Livepeer, Cloudflare Stream, AWS IVS</li>
              <li>Self-hosted: Nginx RTMP (+HLS), OvenMediaEngine, SRS</li>
            </ul>
          </li>
          <li>
            In OBS: Settings → Stream → Service: Custom..., Server: <code>rtmp://YOUR_INGEST/live</code>, Stream key: <code>YOUR_KEY</code>
          </li>
          <li>
            Get your playback URL (HLS .m3u8). Create <code>.env</code> with <code>REACT_APP_HLS_URL=https://.../index.m3u8</code> and restart.
          </li>
        </ol>
        <h3>Embed this player anywhere</h3>
        <p>Copy this snippet and replace <code>YOUR_ENCODED_HLS_URL</code> with <code>encodeURIComponent('https://...m3u8')</code>:</p>
        <code>&lt;iframe src="{window.location.origin}/#/embed?src=YOUR_ENCODED_HLS_URL&amp;autoplay=1&amp;muted=1" width="100%" height="100%" style="border:0; aspect-ratio:16/9;" allow="autoplay; fullscreen; picture-in-picture"&gt;&lt;/iframe&gt;</code>
      </section>
    </div>
  );
};

const Embed = () => {
  const search = new URLSearchParams(window.location.search);
  const src = search.get('src') || process.env.REACT_APP_HLS_URL || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  const autoplay = search.get('autoplay') === '1' || search.get('autoplay') === 'true';
  const muted = !(search.get('muted') === '0' || search.get('muted') === 'false');
  const controls = !(search.get('controls') === '0' || search.get('controls') === 'false');
  const poster = search.get('poster') || undefined;
  const pip = !(search.get('pip') === '0' || search.get('pip') === 'false');

  return (
    <div className="embed-root">
      <Player src={src} autoplay={autoplay || muted} muted={muted} controls={controls} poster={poster} pip={pip} fill />
    </div>
  );
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/embed" element={<Embed />} />
    </Routes>
  );
}

export default App;
