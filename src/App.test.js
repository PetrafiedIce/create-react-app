import { render, screen } from '@testing-library/react';
import App from './App';

test('renders server name in navbar', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { level: 1, name: /KingdomCraft/i });
  expect(heading).toBeInTheDocument();
});
