import { render, screen } from '@testing-library/react';
import App from './App';

test('renders site title', () => {
  render(<App />);
  const titleElement = screen.getByText(/super modern site/i);
  expect(titleElement).toBeInTheDocument();
});
