// src/pages/RecommendationsPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom'; 
import RecommendationsPage from './RecommendationsPage';

// Mock the BestSellersList component to isolate testing to the RecommendationsPage and verify props passed to it.
vi.mock('../components/recommendations/BestSellersList', () => ({
  default: ({ limit, timeWindowDays, title }: {
    limit: number;
    timeWindowDays: number;
    title: string
  }) => (
    // This mock renders a simplified version, displaying the props it received.
    <div data-testid="mock-best-sellers">
      <h2 data-testid="section-title">{title}</h2>
      <p data-testid="limit-info">Limit: {limit}</p>
      <p data-testid="time-window-info">Time Window: {timeWindowDays} days</p>
    </div>

  ),
}));

// Test suite for the RecommendationsPage
describe('RecommendationsPage', () => {
  // Render the component within a BrowserRouter before each test
  beforeEach(() => {
    render(
      <BrowserRouter>
        <RecommendationsPage />
      </BrowserRouter>
    );
  });

  // Test if the main page title and subtitle are rendered correctly
  test('renders page with correct main header and description', () => {
    const mainHeader = screen.getByRole('heading', { level: 1 });
    expect(mainHeader).toHaveTextContent('Discover Products You Might Like');
    expect(screen.getByText('Based on current trends and popular items.')).toBeInTheDocument();
  });

  // Test if two recommendation sections are rendered, each with the expected internal structure (title, limit, time window)
  test('renders two recommendation sections with correct structure', () => {
    const sections = screen.getAllByTestId('mock-best-sellers');
    expect(sections).toHaveLength(2); // Expecting two <BestSellersList> instances

    const sectionTitles = screen.getAllByTestId('section-title');
    const limitInfos = screen.getAllByTestId('limit-info');
    const timeWindows = screen.getAllByTestId('time-window-info');

    // Check each mocked section to ensure it contains its expected parts
    sections.forEach((section, index) => {
      expect(section).toContainElement(sectionTitles[index]);
      expect(section).toContainElement(limitInfos[index]);
      expect(section).toContainElement(timeWindows[index]);
    });
  });

  // Test the props passed to the first (monthly) BestSellersList instance
  test('first section displays monthly best sellers with correct props', () => {
    const sectionTitles = screen.getAllByTestId('section-title');
    expect(sectionTitles[0]).toHaveTextContent('Top Selling Products This Month');

    const limitInfos = screen.getAllByTestId('limit-info');
    expect(limitInfos[0]).toHaveTextContent('Limit: 12');

    const timeWindows = screen.getAllByTestId('time-window-info');
    expect(timeWindows[0]).toHaveTextContent('Time Window: 30 days');
  });

  // Test the props passed to the second (weekly) BestSellersList instance
  test('second section displays weekly trending with correct props', () => {
    const sectionTitles = screen.getAllByTestId('section-title');
    expect(sectionTitles[1]).toHaveTextContent('Trending This Week');

    const limitInfos = screen.getAllByTestId('limit-info');
    expect(limitInfos[1]).toHaveTextContent('Limit: 8');

    const timeWindows = screen.getAllByTestId('time-window-info');
    expect(timeWindows[1]).toHaveTextContent('Time Window: 7 days');
  });

  // Test for specific styling, like margin, applied between sections
  test('applies correct spacing between sections', () => {
    const sections = screen.getAllByTestId('mock-best-sellers');
    const secondSection = sections[1];

    // Checks if the parent of the second mock section has the expected top margin.
    expect(secondSection.parentElement).toHaveStyle('margin-top: 40px');
  });


  // Snapshot test to catch any unintended changes to the page structure
  test('matches snapshot', () => {
    // Rerender for snapshot as beforeEach render might be cleared or state modified
    const { asFragment } = render(
      <BrowserRouter>
        <RecommendationsPage />
      </BrowserRouter>
    );
    expect(asFragment()).toMatchSnapshot();
  });
});