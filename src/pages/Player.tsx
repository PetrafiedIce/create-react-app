import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { parseQuery, serializeQuery, PlayerParams } from '../lib/query';
import { detectType } from '../lib/detect';

const STORAGE_KEY = 'defaultStreamConfig';

function SourceForm() {
  const navigate = useNavigate();
  const [formSrc, setFormSrc] = useState('');
  const [formType, setFormType] = useState<'hls' | 'webrtc'>('hls');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/' + serializeQuery({ src: formSrc, type: formType }));
  };
  return (
    <form className="form" onSubmit={submit}>
      <input
        placeholder="Stream URL"
        value={formSrc}
        onChange={e => setFormSrc(e.target.value)}
      />
      <select value={formType} onChange={e => setFormType(e.target.value as any)}>
        <option value="hls">HLS</option>
        <option value="webrtc">WebRTC</option>
      </select>
      <button type="submit">Play</button>
    </form>
  );
}

export default function Player() {
  const location = useLocation();

  const initial = useMemo(() => {
    let params = parseQuery(location.search);
    if (!params.src) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try { params = JSON.parse(saved); } catch {}
      }
    }
    if (params.src && !params.type) params.type = detectType(params.src);
    if (params.muted === undefined) params.muted = true;
    if (params.controls === undefined) params.controls = false;
    if (params.loop === undefined) params.loop = false;
    return params;
  }, [location.search]);

  const config: PlayerParams = initial;
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>();
  const playerRef = useRef<any>();
  const [overlay, setOverlay] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f') toggleFullscreen();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const attemptPlay = () => {
    if (config.type === 'hls') {
      const video = videoRef.current;
      if (video) {
        const p = video.play();
        if (p && p.catch) p.catch(() => setOverlay(true));
      }
    } else if (config.type === 'webrtc') {
      const p = playerRef.current?.play?.();
      if (p && p.catch) p.catch(() => setOverlay(true));
    }
  };

  useEffect(() => {
    const { src, type } = config;
    if (!src || type !== 'hls') return;
    const video = videoRef.current!;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      attemptPlay();
      return;
    }
    import('hls.js').then(({ default: Hls }) => {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, attemptPlay);
      }
    });
    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [config.src, config.type]);

  useEffect(() => {
    const { src, type } = config;
    if (!src || type !== 'webrtc') return;
    const id = 'webrtc-player';
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/ovenplayer/dist/ovenplayer.js';
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      playerRef.current = OvenPlayer.create(id, {
        autoStart: true,
        mute: config.muted,
        sources: [{ type: 'webrtc', file: src }]
      });
      attemptPlay();
    };
    document.body.appendChild(script);
    return () => {
      playerRef.current?.remove?.();
      playerRef.current = null;
      document.body.removeChild(script);
    };
  }, [config.src, config.type]);

  const handleOverlay = () => {
    if (config.type === 'hls') {
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.play();
      }
    } else if (config.type === 'webrtc') {
      if (playerRef.current) {
        playerRef.current.setMute(false);
        playerRef.current.play();
      }
    }
    setOverlay(false);
  };

  if (!config.src) return <SourceForm />;

  return (
    <div className="stage" onDoubleClick={toggleFullscreen}>
      {config.type === 'hls' && (
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted={config.muted}
          loop={config.loop}
          controls={!!config.controls}
          preload="auto"
        />
      )}
      {config.type === 'webrtc' && (
        <div id="webrtc-player" style={{ width: '100%', height: '100%' }} />
      )}
      {overlay && (
        <button className="overlay" onClick={handleOverlay}>
          Click to Play/Unmute
        </button>
      )}
    </div>
  );
}
