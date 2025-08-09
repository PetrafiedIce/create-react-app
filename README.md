# Minimal Stream Player

Pure HTML/CSS/JS pages for showing a live video stream. Designed to work inside Minecraft WebDisplays and on desktop and mobile browsers.

## Features

- `index.html?src=...` fullscreen player for YouTube or `.m3u8` HLS streams.
- `?loop=true` to loop VODs.
- `?controls=1` to show YouTube controls.
- `admin.html` stores a default source in `localStorage` and builds links.

## YouTube method (easiest)

1. Start an unlisted YouTube Live and copy the video URL.
2. Open `admin.html` and paste the link.
3. Click **Save**, then **Open Player** or copy the generated link to launch `index.html?src=<your-url>`.

## Self-hosted HLS

Example Nginx + RTMP configuration that outputs an HLS playlist:

```
rtmp {
    server {
        listen 1935;
        application live {
            live on;
            record off;
            hls on;
            hls_path /tmp/hls;
            hls_fragment 3;
            hls_playlist_length 10;
        }
    }
}
http {
    server {
        listen 8080;
        location /live {
            add_header 'Cache-Control' 'no-cache';
            types {};
            root /tmp/hls;
        }
    }
}
```

Push a stream to `rtmp://yourserver/live/stream` and use `http://yourserver:8080/live/stream.m3u8` as the `src`.

## Minecraft WebDisplays

Use your domain URL pointing to `index.html?src=...`. Set the screen resolution high enough and keep the page lightweight for best performance.
