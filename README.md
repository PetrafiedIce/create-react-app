# OBS Stream Viewer

This repository hosts a single HTML page that plays an HLS video stream.

## Usage

1. Configure OBS to stream to a server that provides an HLS feed (for example, an Nginx server with the RTMP module).
2. Ensure the stream is accessible via a `.m3u8` URL.
3. Open `index.html` in a browser with the stream URL as a query parameter:
   ```
   file:///path/to/index.html?src=https://example.com/live/stream.m3u8
   ```
4. The page will load the stream and display it in the video player.

The default stream URL is `stream.m3u8` if no `src` query parameter is supplied.
