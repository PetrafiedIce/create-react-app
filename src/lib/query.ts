export type PlayerParams = {
  src?: string;
  type?: 'hls' | 'webrtc';
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
};

const trueValues = new Set(['1', 'true']);

export function parseQuery(search: string): PlayerParams {
  const sp = new URLSearchParams(search);
  const getBool = (key: string) => {
    const val = sp.get(key);
    return val ? trueValues.has(val) : undefined;
  };
  return {
    src: sp.get('src') || undefined,
    type: (sp.get('type') as PlayerParams['type']) || undefined,
    loop: getBool('loop'),
    muted: getBool('muted'),
    controls: getBool('controls'),
  };
}

export function serializeQuery(params: PlayerParams): string {
  const sp = new URLSearchParams();
  if (params.src) sp.set('src', params.src);
  if (params.type) sp.set('type', params.type);
  if (params.loop) sp.set('loop', 'true');
  if (params.muted) sp.set('muted', 'true');
  if (params.controls) sp.set('controls', 'true');
  const s = sp.toString();
  return s ? `?${s}` : '';
}
