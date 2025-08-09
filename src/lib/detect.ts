export function detectType(src: string): 'hls' | 'webrtc' {
  if (src.endsWith('.m3u8')) return 'hls';
  if (/^wss?:/.test(src) || src.includes('webrtc')) return 'webrtc';
  return 'hls';
}
