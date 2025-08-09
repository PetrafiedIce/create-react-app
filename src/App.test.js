import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('@react-three/fiber', () => {
  const React = require('react');
  return {
    Canvas: ({ children }) => <div>{children}</div>,
    useFrame: () => {},
  };
});

jest.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  Text: ({ children }) => <div>{children}</div>,
}));

test('renders text input control', () => {
  render(<App />);
  const input = screen.getByLabelText(/text:/i);
  expect(input).toBeInTheDocument();
});
