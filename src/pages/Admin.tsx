import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayerParams, serializeQuery } from '../lib/query';

const STORAGE_KEY = 'defaultStreamConfig';

export default function Admin() {
  const navigate = useNavigate();
  const [form, setForm] = useState<PlayerParams>({
    src: '',
    type: 'hls',
    muted: true,
    controls: false,
    loop: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setForm(JSON.parse(saved)); } catch {}
    }
  }, []);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  };

  const link = '/' + serializeQuery(form);

  return (
    <div className="stage" style={{ color: '#fff', padding: '1rem' }}>
      <h1>Admin</h1>
      <label>
        Stream Source
        <input
          value={form.src || ''}
          onChange={e => setForm({ ...form, src: e.target.value })}
          style={{ width: '100%' }}
        />
      </label>
      <label>
        Type
        <select
          value={form.type}
          onChange={e => setForm({ ...form, type: e.target.value as any })}
        >
          <option value="hls">HLS</option>
          <option value="webrtc">WebRTC</option>
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={!!form.muted}
          onChange={e => setForm({ ...form, muted: e.target.checked })}
        />
        muted
      </label>
      <label>
        <input
          type="checkbox"
          checked={!!form.controls}
          onChange={e => setForm({ ...form, controls: e.target.checked })}
        />
        controls
      </label>
      <label>
        <input
          type="checkbox"
          checked={!!form.loop}
          onChange={e => setForm({ ...form, loop: e.target.checked })}
        />
        loop
      </label>
      <div style={{ marginTop: '1rem' }}>
        <button onClick={save}>Save</button>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <input
          readOnly
          value={window.location.origin + link}
          style={{ width: '100%' }}
        />
      </div>
      <div style={{ marginTop: '0.5rem' }}>
        <button onClick={() => navigate(link)}>Open Player</button>
      </div>
    </div>
  );
}
