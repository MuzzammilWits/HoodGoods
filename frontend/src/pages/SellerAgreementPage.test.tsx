import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SellerAgreementPage from './SellerAgreementPage';

// Mock react-router-dom's useNavigate hook for testing navigation calls
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom'); // Import actual module
  return {
    ...actual, // Spread actual exports
    useNavigate: () => mockNavigate, // Override useNavigate
  };
});

// Mocks for IntersectionObserver to simulate scrolling behavior
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();
const mockDisconnect = vi.fn();

// Setup IntersectionObserver mock before each test
beforeEach(() => {
  global.IntersectionObserver = vi.fn((callback, options) => {
    // Store the callback to trigger it manually in tests
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
  // Clear mocks for a clean slate per test
  mockNavigate.mockClear();
  mockObserve.mockClear();
  mockUnobserve.mockClear();
  mockDisconnect.mockClear();
});

// Restore any changed mocks after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// Helper to manually trigger the IntersectionObserver callback
const simulateIntersection = (isIntersecting: boolean) => {
  const callback = (global.IntersectionObserver as any)._callback;
  if (callback) {
    // Wrap in act because this will cause state updates in the component
    act(() => {
      callback([{ isIntersecting: isIntersecting, target: {} }], {});
    });
  }
};

// Helper function to render the component with MemoryRouter for routing context
const renderComponent = () => {
  return render(
    <MemoryRouter>
      <SellerAgreementPage />
    </MemoryRouter>
  );
};

// Test suite for the SellerAgreementPage
describe('SellerAgreementPage', () => {
  // Checks if the main page heading is rendered
  it('should render the main heading', () => {
    renderComponent();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Become a Seller: Important Information & Agreement/i,
      })
    ).toBeInTheDocument();
  });

  // Verifies that key sections of the agreement text are present
  it('should render key agreement sections', () => {
    renderComponent();
    expect(screen.getByText(/How Our Platform Works/i)).toBeInTheDocument();
    expect(screen.getByText(/Store & Product Content: Approval and Guidelines/i)).toBeInTheDocument();
    expect(screen.getByText(/Comprehensive Content Guidelines:/i)).toBeInTheDocument();
  });

  // Checks the initial state of the continue button (disabled) and checkbox (unchecked)
  it('should initially have the "Continue" button disabled and checkbox unchecked', () => {
    renderComponent();
    const continueButton = screen.getByRole('button', { name: /Continue/i });
    const agreeCheckbox = screen.getByRole('checkbox', {
      name: /I have read, understood, and agree/i,
    });

    expect(continueButton).toBeDisabled();
    expect(agreeCheckbox).not.toBeChecked();
  });

  // Ensures the "please scroll" message is visible at first
  it('should show the scroll message initially', () => {
    renderComponent();
    expect(
      screen.getByText(
        /Please scroll to the bottom of the agreement to enable the 'Continue' button./i
      )
    ).toBeInTheDocument();
  });

  // Tests that clicking the agreement checkbox checks it
  it('should enable the checkbox when clicked', () => {
    renderComponent();
    const agreeCheckbox = screen.getByRole('checkbox', {
      name: /I have read, understood, and agree/i,
    });

    fireEvent.click(agreeCheckbox);
    expect(agreeCheckbox).toBeChecked();
  });

  // Comprehensive test for the logic: scroll message visibility and button enablement based on scrolling and checkbox state
  it('should hide the scroll message and enable the "Continue" button only after scrolling to bottom and checking the box', () => {
    renderComponent();
    const continueButton = screen.getByRole('button', { name: /Continue/i });
    const agreeCheckbox = screen.getByRole('checkbox', {
      name: /I have read, understood, and agree/i,
    });
    const scrollMessage = () => screen.queryByText(
        /Please scroll to the bottom of the agreement to enable the 'Continue' button./i
      );

    // Initial: button disabled, message visible
    expect(continueButton).toBeDisabled();
    expect(scrollMessage()).toBeInTheDocument();

    // 1. Check box (not scrolled): button still disabled, message visible
    fireEvent.click(agreeCheckbox);
    expect(agreeCheckbox).toBeChecked();
    expect(continueButton).toBeDisabled();
    expect(scrollMessage()).toBeInTheDocument();

    // 2. Scroll (box unchecked): message hidden, button still disabled
    fireEvent.click(agreeCheckbox); // Uncheck first
    simulateIntersection(true); // Simulate scroll
    expect(scrollMessage()).not.toBeInTheDocument();
    expect(continueButton).toBeDisabled();

    // 3. Scroll AND check box: message hidden, button enabled
    fireEvent.click(agreeCheckbox); // Check it
    expect(agreeCheckbox).toBeChecked();
    expect(scrollMessage()).not.toBeInTheDocument(); // Message should stay hidden
    expect(continueButton).not.toBeDisabled();
  });

  // Tests scenario where user scrolls first, then checks the box
  it('should enable the "Continue" button if already scrolled and then checkbox is ticked', () => {
    renderComponent();
    const continueButton = screen.getByRole('button', { name: /Continue/i });
    const agreeCheckbox = screen.getByRole('checkbox', {
      name: /I have read, understood, and agree/i,
    });

    // 1. Simulate scroll to bottom
    simulateIntersection(true);
    expect(screen.queryByText(/Please scroll to the bottom/i)).not.toBeInTheDocument();
    expect(continueButton).toBeDisabled(); // Button still disabled (checkbox not ticked)

    // 2. Tick checkbox
    fireEvent.click(agreeCheckbox);
    expect(agreeCheckbox).toBeChecked();
    expect(continueButton).not.toBeDisabled(); // Button enabled
  });

  // Tests navigation when the "Continue" button is clicked after conditions are met
  it('should navigate to /create-store when "Continue" is clicked and conditions are met', () => {
    renderComponent();
    const continueButton = screen.getByRole('button', { name: /Continue/i });
    const agreeCheckbox = screen.getByRole('checkbox', {
      name: /I have read, understood, and agree/i,
    });

    // Meet conditions: scroll and check box
    simulateIntersection(true);
    fireEvent.click(agreeCheckbox);

    expect(continueButton).not.toBeDisabled();
    fireEvent.click(continueButton);
    expect(mockNavigate).toHaveBeenCalledWith('/create-store'); // Check navigation call
  });

  // Verifies the "Cancel" link exists and points to the homepage
  it('should have a "Cancel and return to Home" link that points to "/"', () => {
    renderComponent();
    const cancelLink = screen.getByRole('link', {
      name: /Cancel and return to Home/i,
    });
    expect(cancelLink).toBeInTheDocument();
    expect(cancelLink).toHaveAttribute('href', '/');
  });

  // Checks if the IntersectionObserver is correctly set up and cleaned up on component unmount
  it('IntersectionObserver should be correctly set up and cleaned up', () => {
    const { unmount } = renderComponent();
    expect(mockObserve).toHaveBeenCalledTimes(1); // Observer should be attached once

    unmount(); // Unmount the component
    expect(mockUnobserve).toHaveBeenCalledTimes(1); // Observer should be detached
  });

});