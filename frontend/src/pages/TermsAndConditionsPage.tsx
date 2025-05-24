// frontend/src/pages/TermsAndConditionsPage.tsx
import React from 'react';
import { Link } from 'react-router-dom'; // For linking to Privacy Policy or Seller Agreement
import './TermsAndConditionsPage.css';

const TermsAndConditionsPage: React.FC = () => {
  return (
    <main className="terms-conditions-container">
      <article className="terms-conditions-article">
        <h1 className="terms-conditions-main-heading">
          Terms and Conditions for HoodsGoods
        </h1>
        <p className="terms-conditions-last-updated">
          <strong>Last Updated:</strong> May 24, 2025
        </p>

        <section className="terms-conditions-content">
          <p>
            Welcome to HoodsGoods! These Terms and Conditions ("Terms") govern your use of the HoodsGoods website, any related mobile applications (collectively, the "Platform"), and the services offered by us (collectively, the "Services"). By accessing or using our Services, you agree to be bound by these Terms and our <Link to="/privacy-policy">Privacy Policy</Link>. If you do not agree to these Terms, please do not use our Services.
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By creating an account, accessing the Platform, or using any of our Services, you affirm that you are of legal age to enter into this agreement, or, if you are not, that you have obtained parental or guardian consent to enter into this agreement. You also agree to comply with these Terms and all applicable local, national, and international laws and regulations.
          </p>

          <h2>2. User Accounts</h2>
          <p>
            <strong>a. Registration:</strong> To access certain features of the Platform, such as buying or selling, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.
          </p>
          <p>
            <strong>b. Account Security:</strong> You are responsible for safeguarding your account password and for any activities or actions under your account. We encourage you to use a "strong" password (passwords that use a combination of upper and lower case letters, numbers, and symbols). You agree to notify us immediately of any unauthorized use of your account.
          </p>
          <p>
            <strong>c. Account Roles:</strong> The platform distinguishes between "Buyers" and "Sellers." Additional terms specific to Sellers are outlined in our Seller Agreement, which forms part of these Terms for all Sellers.
          </p>

          <h2>3. Use of the Platform</h2>
          <p>
            <strong>a. Permitted Use:</strong> You may use the Platform only for lawful purposes and in accordance with these Terms. You agree to use the Platform to browse, buy, and (if registered as a Seller) sell handmade products.
          </p>
          <p>
            <strong>b. Prohibited Conduct:</strong> You agree not to engage in any of the following prohibited activities:
          </p>
          <ul>
            <li>Violating any applicable laws or regulations.</li>
            <li>Posting or transmitting any content that is illegal, hateful, discriminatory, harassing, abusive, violent, sexually explicit, infringing on intellectual property, dangerous, misleading, or exploitative, as further detailed in our Content Guidelines (see Seller Agreement for specifics which apply to all user-generated content where applicable).</li>
            <li>Attempting to interfere with the proper functioning of the Platform.</li>
            <li>Bypassing any measures we may use to prevent or restrict access to the Services.</li>
            <li>Using the Platform for any commercial solicitation purposes not expressly permitted by these Terms or the Seller Agreement.</li>
            <li>Attempting to collect or store personal data about other users without their consent.</li>
            <li>Engaging in any conduct that restricts or inhibits anyone's use or enjoyment of the Platform, or which, as determined by us, may harm HoodsGoods or users of the Platform or expose them to liability.</li>
            <li>Attempting to divert users or transactions off-platform.</li>
          </ul>

          <h2>4. Content and Intellectual Property</h2>
          <p>
            <strong>a. User-Generated Content:</strong> Users may post, upload, or otherwise contribute content to the Platform, including product listings, reviews, and comments ("User Content"). You retain ownership of your User Content. However, by providing User Content to HoodsGoods, you grant us a worldwide, non-exclusive, royalty-free, sublicensable, and transferable license to use, reproduce, distribute, prepare derivative works of, display, and perform your User Content in connection with the Services and HoodsGoods' (and its successors' and affiliates') business.
          </p>
          <p>
            <strong>b. Content Standards:</strong> All User Content must comply with our Content Guidelines. For Sellers, these are explicitly detailed in the Seller Agreement, including rules about accuracy, professionalism, image quality, and prohibited items. These standards generally apply to all forms of User Content to maintain a respectful and lawful environment. We reserve the right to remove or refuse to post any User Content for any or no reason in our sole discretion.
          </p>
          <p>
            <strong>c. Platform Intellectual Property:</strong> The Platform and its original content (excluding User Content), features, and functionality are and will remain the exclusive property of HoodsGoods and its licensors. This includes, but is not limited to, the HoodsGoods logo, design, text, graphics, and software. These Terms do not grant you any right, title, or interest in the Services or Platform Content.
          </p>

          <h2>5. Seller Specific Terms</h2>
          <p>
            Users who wish to sell products on the Platform ("Sellers") are subject to additional terms and conditions outlined in the Seller Agreement. This includes, but is not limited to:
          </p>
          <ul>
            <li>The unique delivery system involving designated pickup zones and points.</li>
            <li>Policies regarding store name selection and permanence.</li>
            <li>The store and product review and approval process.</li>
            <li>Detailed Content Guidelines for store names, product listings, descriptions, and images.</li>
          </ul>
          <p>
            By registering as a Seller, you explicitly agree to the terms set forth in the Seller Agreement.
          </p>

          <h2>6. Purchases and Payments</h2>
          <p>
            <strong>a. Buying Products:</strong> When you purchase an item, you are agreeing to pay the listed price, including any applicable taxes and delivery fees specified by the seller for your chosen pickup zone and delivery option.
          </p>
          <p>
            <strong>b. Payment Processing:</strong> Payments are processed through our third-party payment processor, Yoco. HoodsGoods does not store your full payment card details. By making a purchase, you agree to abide by Yoco's terms and conditions.
          </p>
          <p>
            <strong>c. Order Fulfillment:</strong> Sellers are responsible for fulfilling orders in accordance with the details provided in their listings and the delivery timeframe selected by the buyer.
          </p>

          <h2>7. Delivery System</h2>
          <p>
            HoodsGoods utilizes a system of designated pickup zones and points for order delivery.
          </p>
          <ul>
            <li>Buyers will select a preferred pickup point during checkout.</li>
            <li>Sellers are responsible for delivering items to these specified pickup points. Direct delivery to individual customer addresses is not facilitated by the Platform's core system.</li>
            <li>Delivery times and costs are set by individual Sellers and vary based on the chosen delivery option (Standard or Express).</li>
          </ul>

          <h2>8. Disclaimers</h2>
          <p>
            THE SERVICES ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. HOODSGOODS MAKES NO WARRANTIES, EXPRESS OR IMPLIED, REGARDING THE OPERATION OF THE PLATFORM OR THE INFORMATION, CONTENT, MATERIALS, OR PRODUCTS INCLUDED ON THE PLATFORM. TO THE FULLEST EXTENT PERMISSIBLE BY APPLICABLE LAW, HOODSGOODS DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. WE DO NOT WARRANT THAT THE PLATFORM, ITS SERVERS, OR EMAIL SENT FROM US ARE FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
          </p>

          <h2>9. Limitation of Liability</h2>
          <p>
            TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL HOODSGOODS, ITS AFFILIATES, DIRECTORS, EMPLOYEES, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (I) YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICES; (II) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICES; (III) ANY CONTENT OBTAINED FROM THE SERVICES; AND (IV) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR ANY OTHER LEGAL THEORY, WHETHER OR NOT WE HAVE BEEN INFORMED OF THE POSSIBILITY OF SUCH DAMAGE.
          </p>

          <h2>10. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless HoodsGoods and its licensee and licensors, and their employees, contractors, agents, officers, and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited to attorney's fees), resulting from or arising out of a) your use and access of the Service, by you or any person using your account and password, or b) a breach of these Terms.
          </p>

          <h2>11. Termination</h2>
          <p>
            We may terminate or suspend your account and bar access to the Services immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms or the Seller Agreement.
          </p>
          <p>
            If you wish to terminate your account, you may simply discontinue using the Services.
          </p>
          <p>
            All provisions of the Terms which by their nature should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
          </p>

          <h2>12. Governing Law</h2>
          <p>
            These Terms shall be governed and construed in accordance with the laws of South Africa, without regard to its conflict of law provisions.
          </p>

          <h2>13. Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after any revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, you are no longer authorized to use the Service. It is your responsibility to review these Terms periodically.
          </p>

          <h2>14. Contact Information</h2>
          <p>
            If you have any questions about these Terms, please contact us:
          </p>
          <address className="contact-address contact-address-final">
            HoodsGoods<br/>
            legal@hoodsgoods.example.com 
          </address>
        </section>
      </article>
    </main>
  );
};

export default TermsAndConditionsPage;
