// src/pages/RecommendationsPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom'; // For components using router features
import RecommendationsPage from './RecommendationsPage';

// Mock the BestSellersList component. This helps test RecommendationsPage
// in isolation and verify what props are passed to BestSellersList.
vi.mock('../components/recommendations/BestSellersList', () => ({
  default: ({ limit, timeWindowDays, title }: {
    limit: number;
    timeWindowDays: number;
    title: string
  }) => (
    // The mock renders a simple div with the props, making it easy to check them.
    <div data-testid="mock-best-sellers">
      <h2 data-testid="section-title">{title}</h2>
      <p data-testid="limit-info">Limit: {limit}</p>
      <p data-testid="time-window-info">Time Window: {timeWindowDays} days</p>
    </div>

  ),
}));

// Start of the test suite for RecommendationsPage
describe('RecommendationsPage', () => {
  // This runs before each test, rendering the page.
  // It ensures each test starts with a fresh render.
  beforeEach(() => {
    render(
      <BrowserRouter> 
        <RecommendationsPage />
      </BrowserRouter>
    );
  });

  // Test if the main page heading and description are displayed.
  test('renders page with correct main header and description', () => {
    const mainHeader = screen.getByRole('heading', { level: 1 });
    expect(mainHeader).toHaveTextContent('Discover Products You Might Like');

    expect(screen.getByText('Based on current trends and popular items.')).toBeInTheDocument();
  });

  // Test if both recommendation sections (which use the mocked BestSellersList) are rendered,
  // and if they have the basic structure we expect from the mock.
  test('renders two recommendation sections with correct structure', () => {
    const sections = screen.getAllByTestId('mock-best-sellers');
    expect(sections).toHaveLength(2); // We expect two BestSellersList components

    // Get all the elements from the mocked components
    const sectionTitles = screen.getAllByTestId('section-title');
    const limitInfos = screen.getAllByTestId('limit-info');
    const timeWindows = screen.getAllByTestId('time-window-info');

    // Check that each section contains the title, limit, and time window elements.
    sections.forEach((section, index) => {
      expect(section).toContainElement(sectionTitles[index]);
      expect(section).toContainElement(limitInfos[index]);
      expect(section).toContainElement(timeWindows[index]);
    });
  });

  // Test the props for the first recommendation section (monthly best sellers).
  test('first section displays monthly best sellers with correct props', () => {
    const sectionTitles = screen.getAllByTestId('section-title');
    expect(sectionTitles[0]).toHaveTextContent('Top Selling Products This Month');

    const limitInfos = screen.getAllByTestId('limit-info');
    expect(limitInfos[0]).toHaveTextContent('Limit: 12');

    const timeWindows = screen.getAllByTestId('time-window-info');
    expect(timeWindows[0]).toHaveTextContent('Time Window: 30 days');
  });

  // Test the props for the second recommendation section (weekly trending).
  test('second section displays weekly trending with correct props', () => {
    const sectionTitles = screen.getAllByTestId('section-title');
    expect(sectionTitles[1]).toHaveTextContent('Trending This Week');

    const limitInfos = screen.getAllByTestId('limit-info');
    expect(limitInfos[1]).toHaveTextContent('Limit: 8');

    const timeWindows = screen.getAllByTestId('time-window-info');
    expect(timeWindows[1]).toHaveTextContent('Time Window: 7 days');
  });

  // Test if the correct spacing (margin-top) is applied to the second section.
  // This checks an inline style, assuming the component structure.
  test('applies correct spacing between sections', () => {
    const sections = screen.getAllByTestId('mock-best-sellers');
    const secondSection = sections[1];

    // The mock is a div, so its parent is the <section> tag in RecommendationsPage.tsx
    expect(secondSection.parentElement).toHaveStyle('margin-top: 40px');
  });


  // Snapshot test to ensure the UI doesn't change unexpectedly.
  // If intentional UI changes are made, the snapshot will need to be updated.
  test('matches snapshot', () => {
    // Re-render for snapshot to ensure it's clean, as beforeEach might have side effects
    // or other tests could theoretically interfere if not careful (though unlikely with this setup).
    const { asFragment } = render(
      <BrowserRouter>
        <RecommendationsPage />
      </BrowserRouter>
    );
    expect(asFragment()).toMatchSnapshot();
  });
});