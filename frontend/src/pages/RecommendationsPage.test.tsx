// src/pages/RecommendationsPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import RecommendationsPage from './RecommendationsPage';

// Mock the BestSellersList component with TypeScript support
vi.mock('../components/recommendations/BestSellersList', () => ({
  default: ({ limit, timeWindowDays, title }: { 
    limit: number; 
    timeWindowDays: number; 
    title: string 
  }) => (
    <div data-testid="mock-best-sellers">
      <h2 data-testid="section-title">{title}</h2>
      <p data-testid="limit-info">Limit: {limit}</p>
      <p data-testid="time-window-info">Time Window: {timeWindowDays} days</p>
    </div>
        
  ),
}));

describe('RecommendationsPage', () => {
  beforeEach(() => {
    render(
      <BrowserRouter>
        <RecommendationsPage />
      </BrowserRouter>
    );
  });

  test('renders page with correct main header and description', () => {
    // Check main page header
    const mainHeader = screen.getByRole('heading', { level: 1 });
    expect(mainHeader).toHaveTextContent('Discover Products You Might Like');
    
    // Check description text
    expect(screen.getByText('Based on current trends and popular items.')).toBeInTheDocument();
  });

  test('renders two recommendation sections with correct structure', () => {
  const sections = screen.getAllByTestId('mock-best-sellers');
  expect(sections).toHaveLength(2);
  
  // Get all elements with the test IDs
  const sectionTitles = screen.getAllByTestId('section-title');
  const limitInfos = screen.getAllByTestId('limit-info');
  const timeWindows = screen.getAllByTestId('time-window-info');
  
  // Check each section has the expected elements
  sections.forEach((section, index) => {
    expect(section).toContainElement(sectionTitles[index]);
    expect(section).toContainElement(limitInfos[index]);
    expect(section).toContainElement(timeWindows[index]);
  });
});

  test('first section displays monthly best sellers with correct props', () => {
    const sectionTitles = screen.getAllByTestId('section-title');
    expect(sectionTitles[0]).toHaveTextContent('Top Selling Products This Month');
    
    const limitInfos = screen.getAllByTestId('limit-info');
    expect(limitInfos[0]).toHaveTextContent('Limit: 12');
    
    const timeWindows = screen.getAllByTestId('time-window-info');
    expect(timeWindows[0]).toHaveTextContent('Time Window: 30 days');
  });

  test('second section displays weekly trending with correct props', () => {
    const sectionTitles = screen.getAllByTestId('section-title');
    expect(sectionTitles[1]).toHaveTextContent('Trending This Week');
    
    const limitInfos = screen.getAllByTestId('limit-info');
    expect(limitInfos[1]).toHaveTextContent('Limit: 8');
    
    const timeWindows = screen.getAllByTestId('time-window-info');
    expect(timeWindows[1]).toHaveTextContent('Time Window: 7 days');
  });

  test('applies correct spacing between sections', () => {
    const sections = screen.getAllByTestId('mock-best-sellers');
    const secondSection = sections[1];
    
    // Check if the second section has additional margin top
    // Note: This might need adjustment based on your actual styling implementation
    expect(secondSection.parentElement).toHaveStyle('margin-top: 40px');
  });
    

  test('matches snapshot', () => {
    const { asFragment } = render(
      <BrowserRouter>
        <RecommendationsPage />
      </BrowserRouter>
    );
    expect(asFragment()).toMatchSnapshot();
  });
});