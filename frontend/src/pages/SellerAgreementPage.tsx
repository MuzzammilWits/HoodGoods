import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './SellerAgreementPage.css';

function SellerAgreementPage() {
  const navigate = useNavigate();
  const [isAgreed, setIsAgreed] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const scrollableContentRef = useRef<HTMLElement>(null);
  const endOfContentRef = useRef<HTMLDivElement>(null);

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsAgreed(event.target.checked);
  };

  const handleContinue = () => {
    if (isAgreed && hasScrolledToBottom) {
      navigate('/create-store');
    }
  };

  useEffect(() => {
    const currentScrollableContent = scrollableContentRef.current;
    const currentEndOfContent = endOfContentRef.current;

    if (!currentScrollableContent || !currentEndOfContent) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setHasScrolledToBottom(true);
        }
      },
      {
        root: currentScrollableContent,
        threshold: 1.0,
      }
    );

    observer.observe(currentEndOfContent);

    return () => {
      if (currentEndOfContent) {
        observer.unobserve(currentEndOfContent);
      }
    };
  }, []);


  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 antialiased font-sans">
      <article className="bg-white shadow-lg rounded-lg agreement-page-article">
        <section className="main-titles">
          <h1>Become a Seller: Important Information & Agreement</h1>
        </section>

        <section
          ref={scrollableContentRef}
          className="prose prose-sm sm:prose-base max-w-none text-gray-700 space-y-4 border border-gray-300 rounded-md max-h-[50vh] overflow-y-auto bg-gray-50 scrollable-agreement-content"
          aria-labelledby="agreement-content-heading"
        >
          <h2 id="agreement-content-heading" className="sr-only">Agreement Content</h2>
          <p>
            Welcome to our platform! We're excited to have you join our
            community of sellers. Before you proceed to create your store, please carefully
            read the following important information and agreement. Understanding these
            points will help ensure a smooth experience for everyone.
          </p>

          <h2 className="text-lg sm:text-xl font-semibold text-gray-700 !mt-6 !mb-3 !border-b !pb-2">How Our Platform Works</h2>

          <h3 className="text-base sm:text-lg font-semibold text-gray-700 !mt-4 !mb-1">1. Deliveries & Our Unique System:</h3>
          <p>
            Understanding our delivery process is key to a successful selling experience on our platform. We operate a bit differently from traditional direct-to-address delivery services.
          </p>
          <ul className="list-disc pl-5 space-y-2"> {/* Added space-y-2 for better spacing between main points */}
            <li>
              <strong>Designated Pickup Zones & Points:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-px">
                <li>We do not deliver to individual customer addresses directly.</li>
                <li>Instead, we have established three main delivery zones, each with specific pickup points.</li>
                <li>When customers place an order, they will select their preferred pickup point from the options available within these zones.</li>
              </ul>
            </li>
            <li>
              <strong>Your Delivery Pricing:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-px">
                <li>When you set up your store, you'll define prices for "Standard Delivery" and "Express Delivery."</li>
                <li>These prices should cover your costs to get orders to any of our designated pickup points.</li>
                <li>You will also set estimated delivery timeframes for these options.</li>
              </ul>
            </li>
            <li>
              <strong>Our Current Pickup Points Are:</strong>
              <ul className="list-circle pl-5 mt-1 space-y-1">
                <li>
                  <strong>Area 1:</strong>
                  <ul className="list-disc pl-5">
                    <li>Pickup Point Alpha</li>
                    <li>Pickup Point Beta</li>
                  </ul>
                </li>
                <li>
                  <strong>Area 2:</strong>
                  <ul className="list-disc pl-5">
                    <li>Pickup Point Gamma</li>
                    <li>Pickup Point Delta</li>
                    <li>Pickup Point Epsilon</li>
                  </ul>
                </li>
                <li>
                  <strong>Area 3:</strong>
                  <ul className="list-disc pl-5">
                    <li>Pickup Point Zeta</li>
                    <li>Pickup Point Eta</li>
                    <li>Pickup Point Theta</li>
                  </ul>
                </li>
              </ul>
            </li>
            <li>
              <strong>Seller Responsibility:</strong>
               <ul className="list-disc pl-5 mt-1 space-y-px">
                <li>This system allows us to offer reliable and streamlined delivery options.</li>
                <li>As a seller, you are responsible for ensuring your products can reach these specified pickup points within your stated delivery times.</li>
              </ul>
            </li>
          </ul>

          <h3 className="text-base sm:text-lg font-semibold text-gray-700 !mt-4 !mb-1">2. Your Store Name:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Store Name is Permanent:</strong> Once you choose and set your store name during the
              creation process, it cannot be changed.
            </li>
            <li>
              This policy is in place to maintain consistency, ensure the integrity of order
              histories, and build trust with customers. Please choose your store name
              carefully.
            </li>
          </ul>

          <h2 className="text-lg sm:text-xl font-semibold text-gray-700 !mt-8 !mb-3 !border-b !pb-2">Store & Product Content: Approval and Guidelines</h2>
          <p>
            To maintain a high-quality, safe, and trustworthy
            marketplace, all store names and product listings are subject to review and
            approval by our admin team based on the "Comprehensive Content
            Guidelines" detailed below. This is a sequential process:
          </p>

          <h3 className="text-base sm:text-lg font-semibold text-gray-700 !mt-4 !mb-1">1. Step 1: Store Name Review & Approval</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              When you create your store, your chosen <strong>Store Name</strong> is the first item
              reviewed by our admin team. This review is based on the "Store Name
              Guidelines" (see section 4C below).
            </li>
            <li>
              <strong>If Your Store Name is Approved:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-px">
                <li>Your store is validated.</li>
                <li>This doesn't immediately change anything visible on your side, but it allows our admins to proceed to the next step: reviewing the products you've created within that store.</li>
              </ul>
            </li>
            <li>
              <strong>If Your Store Name is Rejected:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-px">
                <li>If your store name violates our guidelines, the store itself, along with <strong>any products you have created within it (regardless of whether the products themselves were compliant), will be deleted.</strong></li>
                <li>You will be informed that the store was rejected due to a non-compliant store name.</li>
                <li>You are welcome to create a new store with a name that meets our guidelines.</li>
              </ul>
            </li>
            <li>
              <strong>Important:</strong> Products you add to your store will remain in a "Pending" state and will not be reviewed or made visible to buyers until your store name has been successfully approved.
            </li>
          </ul>

          <h3 className="text-base sm:text-lg font-semibold text-gray-700 !mt-4 !mb-1">2. Step 2: Product Listing Review & Approval (Only for Approved Stores)</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Once your store name is approved, our admin team will then review each
              individual product you've listed. This review is based on the
              "General Prohibitions" and "Product Listing
              Specifics" (see sections 4A and 4B below).
            </li>
            <li>
              <strong>Product Approved:</strong> If a product's name, description, and image(s) fully meet
              our guidelines, it will be approved and become visible to buyers on the
              platform.
            </li>
            <li>
              <strong>Product Rejected:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-px">
                <li>If a product is rejected, it is <strong>definitively because its name, description, and/or image(s) did not meet our Content Guidelines.</strong></li>
                <li>The specific non-compliant element (name, description, or image) will be the reason for rejection.</li>
                <li>Rejected products will be <strong>deleted</strong> from your "My Store" page.</li>
              </ul>
            </li>
          </ul>

          <h3 className="text-base sm:text-lg font-semibold text-gray-700 !mt-4 !mb-1">3. Editing Approved Products & Re-Approval Process</h3>
          <p>
            If you edit an already approved product, the following rules apply:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Changes Requiring Re-Approval:</strong> If you modify the <strong>product name, description, or image(s)</strong>, the product will automatically return to a "Pending" status. It will be temporarily hidden from buyers and will require re-approval from our admin team against our Content Guidelines.
            </li>
            <li>
              <strong>Changes Not Requiring Re-Approval:</strong> Editing the <strong>price or quantity</strong> of an approved product does <strong>not</strong> require re-approval and will take effect immediately.
            </li>
          </ul>

          <h3 className="text-base sm:text-lg font-semibold text-gray-700 !mt-4 !mb-1">4. Comprehensive Content Guidelines:</h3>
          <p>
            All content submitted to our platform, including
            but not limited to store names, product names, product descriptions,
            images, and any other seller-generated material, must adhere to the
            following:
          </p>

          <h4 className="text-sm sm:text-base font-semibold text-gray-600 !mt-3 !mb-1">A. General Prohibitions:</h4>
          <p>You may NOT list or post content that is:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Illegal:</strong> Promotes or facilitates illegal activities or sells illegal products/services according to South African law and any applicable international regulations.</li>
            <li><strong>Hateful or Discriminatory:</strong> Promotes hatred, violence, or discrimination against individuals or groups based on race, ethnicity, national origin, religion, gender, gender identity, sexual orientation, disability, or medical condition.</li>
            <li><strong>Harassing or Abusive:</strong> Threatens, harasses, bullies, defames, or abuses others.</li>
            <li><strong>Violent or Graphic:</strong> Glorifies violence, promotes self-harm, or contains excessively graphic or gratuitous violent content.</li>
            <li><strong>Sexually Explicit or Adult-Themed:</strong> Pornographic, overtly sexually suggestive, or primarily intended for adult audiences.</li>
            <li><strong>Intellectual Property Infringing:</strong> Violates copyright, trademark, patent, or other intellectual property rights of others. This includes counterfeit goods or unauthorized replicas.</li>
            <li><strong>Dangerous:</strong> Relates to weapons (firearms, ammunition, explosives, etc.), hazardous materials, or items that pose a significant safety risk.</li>
            <li><strong>Misleading, Deceptive, or Fraudulent:</strong> Involves scams, phishing attempts, spreading misinformation, or making false claims about products or services.</li>
            <li><strong>Exploitative:</strong> Exploits, abuses, or endangers children.</li>
            <li><strong>Private & Confidential Information:</strong> Shares private or personally identifiable information of others without their explicit consent.</li>
          </ul>

          <h4 className="text-sm sm:text-base font-semibold text-gray-600 !mt-3 !mb-1">B. Product Listing Specifics (Name, Description, Images):</h4>
          <ul className="list-disc pl-5 space-y-2"> {/* Increased space-y for readability of main B points */}
            <li>
              <strong>Accuracy & Honesty:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-px"> {/* Changed from list-circle for consistency */}
                <li>All product information (name, description, price, specifications, condition) must be truthful, accurate, and not misleading.</li>
                <li>Claims about product benefits, performance, or origin must be verifiable.</li>
              </ul>
            </li>
            <li>
              <strong>Clarity & Professionalism:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-px">
                <li>Product names and descriptions should be clear, concise, and easy for buyers to understand. Use proper grammar and spelling.</li>
                <li>Avoid excessive or gimmicky use of capitalization (e.g., "SALE!!! BUY NOW!!!"), special characters, or repeated emojis.</li>
              </ul>
            </li>
            <li>
              <strong>Images:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-px">
                <li>Must be clear, well-lit, in focus, and provide an accurate visual representation of the product being sold.</li>
                <li>The primary image should prominently feature the product, preferably on a simple or neutral background.</li>
                <li>Show different angles and relevant details of the product where appropriate.</li>
                <li>Images must not be placeholder images (e.g., "image coming soon").</li>
                <li>No offensive, inappropriate, or irrelevant imagery.</li>
                <li>Avoid text overlays, promotional badges (e.g., "50% OFF!"), or distracting watermarks that are not an integral and discreet part of your brand identity or the product itself. Images should primarily showcase the product.</li>
                <li>Images must also comply with all General Prohibitions listed above.</li>
              </ul>
            </li>
            <li>
              <strong>Relevance:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-px"> {/* Ensured this is a list even for one item */}
                <li>The product name, description, images, and any chosen categories or tags must be directly relevant to the item being sold. Do not use irrelevant keywords to manipulate search results.</li>
              </ul>
            </li>
            <li>
              <strong>No Off-Platform Transactions:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-px"> {/* Ensured this is a list even for one item */}
                <li>Product listings must not contain external website links, email addresses, phone numbers, social media handles, QR codes, or any other information or calls to action that attempt to divert buyers or complete transactions outside of our platform. All sales communication and transactions should occur through the platform.</li>
              </ul>
            </li>
          </ul>

          <h4 className="text-sm sm:text-base font-semibold text-gray-600 !mt-3 !mb-1">C. Store Name Guidelines:</h4>
          <p>Your store name must:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Comply with all General Prohibitions listed above.</li>
            <li>Be unique and not attempt to impersonate another brand, seller, or individual.</li>
            <li>Not be offensive, vulgar, or misleading.</li>
            <li>Not consist primarily of generic product categories (e.g., "Cheap Shoes Store") or solely of keywords.</li>
            <li>Not contain website URLs, ".com," or other domain extensions, or contact information.</li>
          </ul>

          <h3 className="text-base sm:text-lg font-semibold text-gray-700 !mt-4 !mb-1">5. Our Right to Enforce & Update Guidelines:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              We reserve the right to interpret these guidelines and determine, at our
              sole discretion, whether content is in violation.
            </li>
            <li>
              Violation of these guidelines may result in content removal, product rejection,
              store suspension, or permanent store deletion, depending on the severity
              and frequency of violations.
            </li>
            <li>
              These guidelines may be updated from time to time. It is your responsibility to
              review them periodically. Continued use of the platform after changes
              constitutes acceptance of the new guidelines.
            </li>
          </ul>
          <div ref={endOfContentRef} style={{ height: '1px' }} />
        </section>

        <section className="agreement-controls-section">
          <div className="agreement-checkbox-container">
            <input
              type="checkbox"
              id="agreeCheckbox"
              checked={isAgreed}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" // Standard Tailwind for checkbox
              aria-labelledby="agreeCheckboxLabel"
            />
            <label htmlFor="agreeCheckbox" id="agreeCheckboxLabel" className="ml-2 block text-sm text-gray-900">
              I have read, understood, and agree to all the information, policies, and guidelines outlined above.
            </label>
          </div>

          <div className="agreement-buttons-container">
            <button
              type="button"
              onClick={handleContinue}
              disabled={!(hasScrolledToBottom && isAgreed)}
              className="agreement-button agreement-continue-btn" // CSS classes for styling
            >
              Continue
            </button>
            <Link
              to="/"
              className="agreement-button agreement-cancel-btn" // CSS classes for styling
            >
              Cancel and return to Home
            </Link>
          </div>
          {!hasScrolledToBottom && (
            <p className="agreement-scroll-message text-red-600 text-center sm:text-left">
              Please scroll to the bottom of the agreement to enable the 'Continue' button.
            </p>
          )}
        </section>
      </article>
    </main>
  );
}

export default SellerAgreementPage;