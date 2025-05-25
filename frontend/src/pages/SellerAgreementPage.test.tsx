import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SellerAgreementPage from './SellerAgreementPage';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock IntersectionObserver
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();
const mockDisconnect = vi.fn();

// beforeEach will ensure this mock is fresh for each test
beforeEach(() => {
  global.IntersectionObserver = vi.fn((callback, options) => {
    // Store the callback and options if needed for more complex simulation
    (global.IntersectionObserver as any)._callback = callback;
    (global.IntersectionObserver as any)._options = options;
    return {
      observe: mockObserve,
      unobserve: mockUnobserve,
      disconnect: mockDisconnect,
      root: null,
      rootMargin: '',
      thresholds: [],
    };
  }) as any;
  mockNavigate.mockClear();
  mockObserve.mockClear();
  mockUnobserve.mockClear();
  mockDisconnect.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Helper to simulate intersection (scrolling to bottom)
const simulateIntersection = (isIntersecting: boolean) => {
  const callback = (global.IntersectionObserver as any)._callback;
  if (callback) {
    act(() => { // Wrap state updates in act
      callback([{ isIntersecting: isIntersecting, target: {} }], {});
    });
  }
};

// Helper function to render the component within MemoryRouter
const renderComponent = () => {
  return render(
    <MemoryRouter>
      <SellerAgreementPage />
    </MemoryRouter>
  );
};

describe('SellerAgreementPage', () => {
  it('should render the main heading', () => {
    renderComponent();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Become a Seller: Important Information & Agreement/i,
      })
    ).toBeInTheDocument();
  });

  it('should render key agreement sections', () => {
    renderComponent();
    expect(screen.getByText(/How Our Platform Works/i)).toBeInTheDocument();
    expect(screen.getByText(/Store & Product Content: Approval and Guidelines/i)).toBeInTheDocument();
    expect(screen.getByText(/Comprehensive Content Guidelines:/i)).toBeInTheDocument();
  });

  it('should initially have the "Continue" button disabled and checkbox unchecked', () => {
    renderComponent();
    const continueButton = screen.getByRole('button', { name: /Continue/i });
    const agreeCheckbox = screen.getByRole('checkbox', {
      name: /I have read, understood, and agree/i,
    });

    expect(continueButton).toBeDisabled();
    expect(agreeCheckbox).not.toBeChecked();
  });

  it('should show the scroll message initially', () => {
    renderComponent();
    expect(
      screen.getByText(
        /Please scroll to the bottom of the agreement to enable the 'Continue' button./i
      )
    ).toBeInTheDocument();
  });

  it('should enable the checkbox when clicked', () => {
    renderComponent();
    const agreeCheckbox = screen.getByRole('checkbox', {
      name: /I have read, understood, and agree/i,
    });

    fireEvent.click(agreeCheckbox);
    expect(agreeCheckbox).toBeChecked();
  });

  it('should hide the scroll message and enable the "Continue" button only after scrolling to bottom and checking the box', () => {
    renderComponent();
    const continueButton = screen.getByRole('button', { name: /Continue/i });
    const agreeCheckbox = screen.getByRole('checkbox', {
      name: /I have read, understood, and agree/i,
    });
    const scrollMessage = () => screen.queryByText(
        /Please scroll to the bottom of the agreement to enable the 'Continue' button./i
      );

    // Initial state
    expect(continueButton).toBeDisabled();
    expect(scrollMessage()).toBeInTheDocument();

    // 1. Check the box (but not scrolled)
    fireEvent.click(agreeCheckbox);
    expect(agreeCheckbox).toBeChecked();
    expect(continueButton).toBeDisabled(); // Still disabled
    expect(scrollMessage()).toBeInTheDocument();

    // 2. Scroll to bottom (but box not checked initially)
    fireEvent.click(agreeCheckbox); // Uncheck it first
    expect(agreeCheckbox).not.toBeChecked();
    simulateIntersection(true); // Simulate scroll to bottom
    expect(scrollMessage()).not.toBeInTheDocument(); // Message disappears
    expect(continueButton).toBeDisabled(); // Still disabled because box isn't checked

    // 3. Scroll to bottom AND check the box
    fireEvent.click(agreeCheckbox); // Check it
    expect(agreeCheckbox).toBeChecked();
    // If scroll happened before check, message should already be gone
    // If scroll happens now, the IntersectionObserver should trigger setHasScrolledToBottom
    // The order might affect the scroll message visibility test slightly,
    // but the button state is key.
    expect(scrollMessage()).not.toBeInTheDocument();
    expect(continueButton).not.toBeDisabled(); // Now enabled
  });
  
  it('should enable the "Continue" button if already scrolled and then checkbox is ticked', () => {
    renderComponent();
    const continueButton = screen.getByRole('button', { name: /Continue/i });
    const agreeCheckbox = screen.getByRole('checkbox', {
      name: /I have read, understood, and agree/i,
    });
    
    // 1. Simulate scroll to bottom first
    simulateIntersection(true);
    expect(screen.queryByText(/Please scroll to the bottom/i)).not.toBeInTheDocument();
    expect(continueButton).toBeDisabled(); // Checkbox not ticked yet

    // 2. Then tick the checkbox
    fireEvent.click(agreeCheckbox);
    expect(agreeCheckbox).toBeChecked();
    expect(continueButton).not.toBeDisabled();
  });


  it('should navigate to /create-store when "Continue" is clicked and conditions are met', () => {
    renderComponent();
    const continueButton = screen.getByRole('button', { name: /Continue/i });
    const agreeCheckbox = screen.getByRole('checkbox', {
      name: /I have read, understood, and agree/i,
    });

    // Meet conditions
    simulateIntersection(true);
    fireEvent.click(agreeCheckbox);

    expect(continueButton).not.toBeDisabled();
    fireEvent.click(continueButton);
    expect(mockNavigate).toHaveBeenCalledWith('/create-store');
  });

  it('should have a "Cancel and return to Home" link that points to "/"', () => {
    renderComponent();
    const cancelLink = screen.getByRole('link', {
      name: /Cancel and return to Home/i,
    });
    expect(cancelLink).toBeInTheDocument();
    expect(cancelLink).toHaveAttribute('href', '/');
  });
  
  it('IntersectionObserver should be correctly set up and cleaned up', () => {
    const { unmount } = renderComponent();
    expect(mockObserve).toHaveBeenCalledTimes(1); // Observer is attached
    
    unmount();
    expect(mockUnobserve).toHaveBeenCalledTimes(1); // Observer is detached on unmount
  });

});