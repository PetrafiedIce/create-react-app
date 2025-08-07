import { render, screen } from '@testing-library/react';
import App from './App';

test('renders sandwich counter', () => {
  render(<App />);
  const counter = screen.getByText(/Sandwiches Served:/i);
  expect(counter).toBeInTheDocument();
});
