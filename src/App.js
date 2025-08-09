import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import React, { useMemo, useRef, useState } from 'react';
import './App.css';

function RotatingText({ text, color, speed }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += speed * delta;
    }
  });
  return (
    <Text ref={ref} color={color} fontSize={1} anchorX="center" anchorY="middle">
      {text}
    </Text>
  );
}

function Particles({ count }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return arr;
  }, [count]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#ffffff" />
    </points>
  );
}

function App() {
  const [text, setText] = useState('Hello 3D');
  const [color, setColor] = useState('#ff00ff');
  const [particleCount, setParticleCount] = useState(200);
  const [speed, setSpeed] = useState(0.5);

  return (
    <div className="App">
      <div className="controls">
        <label>
          Text:
          <input value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <label>
          Color:
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <label>
          Particles:
          <input
            type="range"
            min="0"
            max="1000"
            value={particleCount}
            onChange={(e) => setParticleCount(parseInt(e.target.value, 10))}
          />
        </label>
        <label>
          Speed:
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
          />
        </label>
      </div>
      <Canvas className="canvas">
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <RotatingText text={text} color={color} speed={speed} />
        <Particles count={particleCount} />
        <OrbitControls />
      </Canvas>
    </div>
  );
}

export default App;
