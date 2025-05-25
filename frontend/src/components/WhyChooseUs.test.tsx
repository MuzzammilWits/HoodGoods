import { render, screen} from '@testing-library/react';
import WhyChooseUs from './WhyChooseUs';
import { describe, it, expect, vi } from 'vitest';

describe('WhyChooseUs Component', () => {
  // 1. Core Content Tests
  it('renders all main sections', () => {
    render(<WhyChooseUs />);
    
    expect(screen.getByText('About Us')).toBeInTheDocument();
    expect(screen.getByText('Our Impact')).toBeInTheDocument();
    expect(screen.getByText('Why Choose Us?')).toBeInTheDocument();
  });
it('applies correct section classes', () => {
  const { container } = render(<WhyChooseUs />);
  
  expect(container.querySelector('.about-us-section')).toHaveClass('about-us-section');
  expect(container.querySelector('.trust-icons-section')).toHaveClass('trust-icons-section');
  expect(container.querySelector('.why-choose-us-section')).toHaveClass('why-choose-us-section');
});
it('has sufficient about us content', () => {
  render(<WhyChooseUs />);
  const aboutText = screen.getByText(/HoodsGoods is a vibrant marketplace/i);
  expect(aboutText.textContent?.length).toBeGreaterThan(100);
});
  // 2. About Us Section Tests
  describe('About Us Section', () => {
    it('contains the company description with proper styling', () => {
      render(<WhyChooseUs />);
      const aboutText = screen.getByText(/HoodsGoods is a vibrant marketplace/i);
      expect(aboutText).toBeInTheDocument();
      expect(aboutText).toHaveClass('about-us-text');
    });
  });

  // 3. Trust Icons Section Tests
  describe('Trust Icons Section', () => {
    it('displays all three trust metrics with icons', () => {
      const { container } = render(<WhyChooseUs />);
      
      const metrics = [
        '1000+ certified sellers',
        '20k+ listed products',
        '10k+ successfully shipped orders'
      ];
      
      metrics.forEach(metric => {
        expect(screen.getByText(metric)).toBeInTheDocument();
      });

      const icons = container.querySelectorAll('.trust-icon svg');
      expect(icons.length).toBe(3);
    });

    it('has properly structured trust icon items', () => {
      const { container } = render(<WhyChooseUs />);
      const trustItems = container.querySelectorAll('.trust-icon-item');
      
      expect(trustItems.length).toBe(3);
      trustItems.forEach(item => {
        expect(item).toContainElement(item.querySelector('.trust-icon'));
        expect(item).toContainElement(item.querySelector('p'));
      });
    });
  });

  // 4. Feature Cards Tests
  describe('Feature Cards', () => {
    const features = [
      {
        title: 'Secure & Trusted Shopping',
        description: /Shop with confidence/,
        iconTestId: 'secure-icon'
      },
      {
        title: 'Truly Handmade Treasures',
        description: /Discover one-of-a-kind items/,
        iconTestId: 'handmade-icon'
      },
      {
        title: 'Careful & Reliable Delivery',
        description: /Your handmade items are packed with care/,
        iconTestId: 'delivery-icon'
      },
      {
        title: 'Easy to Shop',
        description: /Browse, discover, and buy with ease/,
        iconTestId: 'easy-icon'
      }
    ];

    it('renders all feature cards with content and icons', () => {
      render(<WhyChooseUs />);
      
      features.forEach(feature => {
        expect(screen.getByText(feature.title)).toBeInTheDocument();
        expect(screen.getByText(feature.description)).toBeInTheDocument();
      });
    });

    it('has proper card structure with icons and text', () => {
      const { container } = render(<WhyChooseUs />);
      const cards = container.querySelectorAll('.selling-point-item');
      
      expect(cards.length).toBe(4);
      cards.forEach(card => {
        expect(card).toContainElement(card.querySelector('.selling-point-icon'));
        expect(card).toContainElement(card.querySelector('h3'));
        expect(card).toContainElement(card.querySelector('p'));
      });
    });
  });

  // 5. Structural Tests
  describe('Component Structure', () => {
    it('has correct container structure', () => {
      const { container } = render(<WhyChooseUs />);
      
      expect(container.querySelector('#about-us')).toBeInTheDocument();
      expect(container.querySelector('.why-choose-us-container')).toBeInTheDocument();
      expect(container.querySelector('.container')).toBeInTheDocument();
    });

    it('has proper semantic HTML structure', () => {
      const { container } = render(<WhyChooseUs />);
      
      expect(container.querySelector('main')).toBeInTheDocument();
      expect(container.querySelectorAll('section').length).toBeGreaterThan(3);
      expect(container.querySelector('h2')).toBeInTheDocument();
    });
  });

  // 6. Accessibility Tests
  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<WhyChooseUs />);
      
      const headings = screen.getAllByRole('heading');
      expect(headings[0]).toHaveTextContent('About Us');
      expect(headings[1]).toHaveTextContent('Our Impact');
      expect(headings[2]).toHaveTextContent('Why Choose Us?');
      
      expect(headings[0].tagName).toBe('H2');
      expect(headings[1].tagName).toBe('H2');
      expect(headings[2].tagName).toBe('H2');
    });

  });

  // 7. Snapshot Test
  it('matches snapshot', () => {
    const { asFragment } = render(<WhyChooseUs />);
    expect(asFragment()).toMatchSnapshot();
  });

  // 8. Responsive Behavior (if applicable)
  describe('Responsive Behavior', () => {
    beforeAll(() => {
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(max-width: 768px)',
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }));
    });

    it('adapts layout for mobile view', () => {
      window.innerWidth = 375;
      const { container } = render(<WhyChooseUs />);
      
      const grid = container.querySelector('.selling-points-grid');
      const styles = window.getComputedStyle(grid!);
      
      // This assumes you have responsive styles - adjust as needed
      expect(styles.gridTemplateColumns).not.toContain('repeat(2, 1fr)');
    });
  });
});