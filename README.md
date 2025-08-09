# OBS Player

## Local dev

```
npm install
npm start
```

Visit http://localhost:3000/ and /admin

## Deploy to Vercel

Framework preset: Create React App (or “Other”)

Build command: npm run build

Output directory: build

SPA routing: the provided vercel.json handles /admin refreshes

## OBS → HLS (your own VPS)

Minimal nginx.conf example:

```
worker_processes  auto;
events { worker_connections 1024; }
rtmp {
  server {
    listen 1935;
    chunk_size 4096;
    application live {
      live on;
      record off;
      hls on;
      hls_path /var/www/live;
      hls_fragment 2s;
      hls_playlist_length 6s;
    }
  }
}
http {
  include       mime.types;
  default_type  application/octet-stream;
  sendfile on;
  tcp_nopush on;
  server {
    listen 80;
    server_name your-domain.tld;
    root /var/www;
    location /live/ {
      add_header Access-Control-Allow-Origin *;
      add_header Cache-Control no-cache;
      types {
        application/vnd.apple.mpegurl m3u8;
        video/mp2t ts;
      }
    }
  }
}
```

OBS settings:

Server: rtmp://your-domain.tld/live

Stream key: stream

Your HLS URL becomes: https://your-domain.tld/live/stream.m3u8

## OBS → WebRTC (WHIP) with OvenMediaEngine

Install OME; enable WHIP input (docs).

In OBS, set Stream Service: WHIP, URL like https://your-domain.tld/app/whip?key=STREAM_KEY.

Playback URL (for src): OME’s WebRTC play endpoint (often wss://your-domain.tld/app/stream or similar per OME config).

## CORS note

If the HLS .m3u8/.ts live on a different origin than this CRA site, ensure the HLS server sends Access-Control-Allow-Origin: *. Vercel cannot add CORS headers to another origin.

## Minecraft WebDisplays tip

Open https://your-domain.tld/?src=...&type=... inside the in-game screen.

Keep page minimal and bump the in-game screen resolution for readability.

## Acceptance tests:

/?src=https://example.com/live/stream.m3u8&type=hls plays via HLS on Chrome/Firefox (hls.js) and Safari (native).

/?src=wss://your-domain.tld/app/stream&type=webrtc plays via WebRTC using OvenPlayer with low latency.

/admin saves defaults (localStorage), generates link, and “Open Player” navigates correctly.

No scrollbars at any viewport; black background; video covers screen.

TypeScript compiles cleanly with strict: true.
