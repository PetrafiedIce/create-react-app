import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

test('renders server name in navbar', () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  const heading = screen.getByRole('heading', { level: 1, name: /KingdomCraft/i });
  expect(heading).toBeInTheDocument();
});
