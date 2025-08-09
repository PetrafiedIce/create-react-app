import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

function Player({ src, autoplay = false, muted = false, controls = true, poster, pip = true, fill = false }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls;
    const isHlsSource = /\.m3u8($|\?)/i.test(src);

    if (isHlsSource && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
          }
        }
      });
      hlsRef.current = hls;
    } else if (isHlsSource && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    } else {
      video.src = src;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (autoplay) {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    }
  }, [autoplay, src]);

  return (
    <div className={fill ? 'video-wrapper fill' : 'video-wrapper'}>
      <video
        ref={videoRef}
        className="video"
        controls={controls}
        muted={muted}
        playsInline
        poster={poster}
        preload="auto"
        autoPlay={autoplay}
        disablePictureInPicture={!pip}
        controlsList="nodownload noplaybackrate"
      />
    </div>
  );
}

export default Player;