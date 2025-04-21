import { render, screen } from '@testing-library/react';
import MyStore from './MyStore';

describe('MyStore component', () => {
  it('renders the store dashboard', () => {
    render(<MyStore />);
    expect(screen.getByText(/Welcome to Your Store!/i)).toBeInTheDocument();
    expect(screen.getByText(/This is your seller dashboard/i)).toBeInTheDocument();
  });
});
