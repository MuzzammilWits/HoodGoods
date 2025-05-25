import { render, screen } from '@testing-library/react'; // Import 'within'
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PrivacyPolicyPage from './PrivacyPolicyPage';

// Helper function to render the component within MemoryRouter
const renderWithRouter = () => {
  return render(
    <MemoryRouter>
      <PrivacyPolicyPage />
    </MemoryRouter>
  );
};

describe('PrivacyPolicyPage', () => {
  it('should render the main heading and last updated date', () => {
    renderWithRouter();

    const mainHeading = screen.getByRole('heading', {
      level: 1,
      name: /Privacy Policy for HoodsGoods/i,
    });
    expect(mainHeading).toBeInTheDocument();

    expect(screen.getByText(/Last Updated:/i)).toBeInTheDocument();
    expect(screen.getByText(/May 24, 2025/i)).toBeInTheDocument();
  });

  it('should render all main section headings (H2)', () => {
    renderWithRouter();

    const expectedH2Headings = [
      /1. INFORMATION WE COLLECT/i,
      /2. HOW WE USE YOUR INFORMATION/i,
      /3. SHARING YOUR INFORMATION/i,
      /4. INTERNATIONAL TRANSFERS OF YOUR INFORMATION/i,
      /5. DATA RETENTION/i,
      /6. SECURITY OF YOUR INFORMATION/i,
      /7. YOUR DATA PROTECTION RIGHTS \(POPIA\)/i,
      /8. CHILDREN'S PRIVACY/i,
      /9. THIRD-PARTY WEBSITES/i,
      /10. CHANGES TO THIS PRIVACY POLICY/i,
      /11. CONTACT US/i,
    ];

    expectedH2Headings.forEach((headingText) => {
      const headingElement = screen.getByRole('heading', {
        level: 2,
        name: headingText,
      });
      expect(headingElement).toBeInTheDocument();
    });
  });

  it('should render specific sub-section headings (H3)', () => {
    renderWithRouter();

    const expectedH3Headings = [
      /Personal Information Provided by You:/i,
      /Information Automatically Collected:/i,
      /To Provide and Manage Our Services:/i,
      /To Communicate with You:/i,
      /To Improve Our Services:/i,
      /For Security and Fraud Prevention:/i,
      /To Comply with Legal Obligations:/i,
    ];

    expectedH3Headings.forEach((headingText) => {
      const headingElement = screen.getByRole('heading', {
        level: 3,
        name: headingText,
      });
      expect(headingElement).toBeInTheDocument();
    });
  });

  it('should display the introductory paragraph content', () => {
    renderWithRouter();
    expect(
      screen.getByText(/Welcome to HoodsGoods \("we," "us," or "our"\)/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/project website \[https:\/\/victorious-mud-0224f2003.6.azurestaticapps.net\]/i) // This will match the first instance
    ).toBeInTheDocument();
  });
  
  it('should render details about information collected, like Account Information', () => {
    renderWithRouter();
    expect(screen.getByText(/Account Information:/i)).toBeInTheDocument();
    expect(screen.getByText(/When you create an account, we collect your user ID/i)).toBeInTheDocument();
  });

  it('should render information about sharing information, like with Service Providers', () => {
    renderWithRouter();
    expect(screen.getByText(/With Service Providers:/i)).toBeInTheDocument();
    expect(screen.getByText(/We may share your information with third-party vendors/i)).toBeInTheDocument();
  });
  
  
  it('should mention the Information Regulator contact details', () => {
    renderWithRouter();
    expect(screen.getByText(/The Information Regulator's contact details are:/i)).toBeInTheDocument();
    expect(screen.getByText(/enquiries@inforegulator.org.za/i)).toBeInTheDocument();
  });

});