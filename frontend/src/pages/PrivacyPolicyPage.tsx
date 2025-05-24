// frontend/src/pages/PrivacyPolicyPage.tsx
import React from 'react';
import './PrivacyPolicyPage.css'; 

const PrivacyPolicyPage: React.FC = () => {
  return (
    <main className="privacy-policy-container">
      <article className="privacy-policy-article">
        <h1 className="privacy-policy-main-heading">
          Privacy Policy for HoodsGoods
        </h1>
        <p className="privacy-policy-last-updated">
          <strong>Last Updated:</strong> May 24, 2025
        </p>

        <section className="privacy-policy-content">
          <p>
            Welcome to HoodsGoods ("we," "us," or "our"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our project website [https://victorious-mud-0224f2003.6.azurestaticapps.net], or use our services (collectively, the "Services").
          </p>
          <p>
            Use of our Services is also governed by our Terms of Service and, for users acting as sellers, by our Seller Agreement. These additional terms may further detail how user-generated content and specific services are managed.
          </p>
          <p>
            Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the Services.
          </p>

          <h2>
            1. INFORMATION WE COLLECT
          </h2>
          <p>
            We may collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us.
          </p>
          <p>
            The personal information that we collect depends on the context of your interactions with us and the Services, the choices you make, and the products and features you use. The personal information we collect may include the following:
          </p>

          <h3>Personal Information Provided by You:</h3>
          <ul>
            <li>
              <strong>Account Information:</strong> When you create an account, we collect your user ID (derived from Auth0's `sub` claim) and your designated role (e.g., buyer, seller). For authentication, we utilize Auth0, and we encourage you to review Auth0's privacy policy.
            </li>
            <li>
              <strong>Seller and Store Information:</strong> If you register as a seller, we collect your store name, delivery options (including pricing and estimated times). Store details like `storeId` are also stored. Your agreement to the Seller Agreement, including its terms on store name permanence and content guidelines, is recorded.
            </li>
            <li>
              <strong>Product Information:</strong> Information you provide about the products you list, including name, description, category, price, quantity, and images. This information is subject to review and approval as per our Seller Agreement.
            </li>
            <li>
              <strong>Order Information:</strong> When you place or receive an order, we collect information necessary to process the order, including selected products, quantities, grand total, pickup area, pickup point, delivery method, and delivery price.
            </li>
            <li>
              <strong>Payment Information:</strong> We use Yoco as our payment processor. We do not directly store your full credit card details. Payment information is handled by Yoco, and we recommend you review their privacy policy. We may store transaction IDs or partial payment information for order fulfillment and record-keeping.
            </li>
            <li>
              <strong>Communications:</strong> If you contact us directly, we may receive additional information about you such as your name, email address, phone number, the contents of the message and/or attachments you may send us, and any other information you may choose to provide.
            </li>
          </ul>

          <h3>Information Automatically Collected:</h3>
          <ul>
            <li>
              <strong>Log and Usage Data:</strong> Log and usage data is service-related, diagnostic, usage, and performance information our servers automatically collect when you access or use our Services and which we record in log files. This log data may include your IP address, browser type, operating system, referring/exit pages, and date/time stamps.
            </li>
            <li>
              <strong>Cookies and Similar Technologies:</strong> We may use cookies and similar tracking technologies to collect and store your information. You can control the use of cookies at the individual browser level.
            </li>
          </ul>

          <h2>
            2. HOW WE USE YOUR INFORMATION
          </h2>
          <p>
            We use personal information collected via our Services for a variety of business purposes described below:
          </p>
          <h3>To Provide and Manage Our Services:</h3>
          <ul>
            <li>To facilitate account creation and logon process (via Auth0).</li>
            <li>To create and manage user, seller, and admin accounts.</li>
            <li>To process transactions and fulfill orders, including managing payments (via Yoco), shipping, and delivery.</li>
            <li>To manage seller stores and product listings. For sellers, this includes the review, approval, and moderation of their store name and product content (name, description, images) to ensure compliance with our platform's Seller Agreement and Content Guidelines.</li>
            <li>To manage shopping carts.</li>
          </ul>

          <h3>To Communicate with You:</h3>
          <ul>
            <li>To send you administrative information, such as updates to our terms, conditions, and policies.</li>
            <li>To respond to your inquiries and solve any potential issues you might have with the use of our Services.</li>
            <li>To send you marketing and promotional communications if you have opted-in. You can opt-out of our marketing emails at any time.</li>
          </ul>

          <h3>To Improve Our Services:</h3>
          <ul>
            <li>To understand how users interact with our Services for analytics and improvement purposes.</li>
            <li>For data analysis, identifying usage trends, determining the effectiveness of our promotional campaigns, and to evaluate and improve our Services, products, marketing, and your experience.</li>
            <li>To provide reporting features for sellers (inventory status, sales trends) and admins (platform metrics).</li>
            <li>To offer product recommendations (e.g., best sellers).</li>
          </ul>

          <h3>For Security and Fraud Prevention:</h3>
          <ul>
            <li>To detect and prevent fraud, abuse, and security incidents.</li>
            <li>To protect the rights, property, or safety of HoodsGoods, our users, or others.</li>
          </ul>

          <h3>To Comply with Legal Obligations:</h3>
          <ul>
            <li>To comply with applicable laws, regulations, legal processes, or governmental requests.</li>
          </ul>


          <h2>
            3. SHARING YOUR INFORMATION
          </h2>
          <p>We may share your information in the following situations:</p>
          <ul>
            <li>
              <strong>With Service Providers:</strong> We may share your information with third-party vendors, service providers, contractors, or agents who perform services for us or on our behalf and require access to such information to do that work. Examples include payment processing (Yoco), authentication services (Auth0), cloud hosting (Supabase, Azure), and image storage (Supabase). These service providers are contractually obligated to protect your information.
            </li>
            <li>
              <strong>With Other Users (Buyers and Sellers):</strong>
              If you are a seller, your store name and approved product information will be visible to buyers.
              If you are a buyer, your necessary order information (e.g., for delivery or pickup coordination) will be shared with the respective seller(s) from whom you purchase products. Your payment details are not shared directly with sellers by us.
            </li>
            <li>
              <strong>For Legal Reasons:</strong> We may disclose your information if we are required to do so by law or in response to valid requests by public authorities (e.g., a court or a government agency).
            </li>
            <li>
              <strong>Business Transfers:</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.
            </li>
            <li>
              <strong>With Your Consent:</strong> We may disclose your personal information for any other purpose with your consent. This includes your agreement to the Seller Agreement if you are a seller, which outlines how your store and product content is managed.
            </li>
          </ul>

          <h2>
            4. INTERNATIONAL TRANSFERS OF YOUR INFORMATION
          </h2>
          <p>
            Your information, including personal data, may be transferred to — and maintained on — computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ from those in your jurisdiction. As our services (Auth0, Supabase, Azure) may operate internationally, your information might be processed in countries outside of South Africa. We will take all steps reasonably necessary to ensure that your data is treated securely and in accordance with this privacy policy.
          </p>

          <h2>
            5. DATA RETENTION
          </h2>
          <p>
            We will retain your personal information only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use your information to the extent necessary to comply with our legal obligations, resolve disputes, and enforce our legal agreements and policies.
          </p>
          <p>
            For example, user account information will be retained for the duration of the project's operational simulation. Order information will be mock-retained for a simulated 1-year period for analytical purposes within the project. Content provided by sellers, such as store names and product listings, that is found to be in violation of our Seller Agreement or Content Guidelines may be removed or deleted, as detailed in those specific terms. If a seller's store name is rejected, the store and any products within it will be deleted. Editing certain product details may also temporarily affect visibility and requires re-approval as outlined in the Seller Agreement.
          </p>


          <h2>
            6. SECURITY OF YOUR INFORMATION
          </h2>
          <p>
            We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us (e.g., using HTTPS, JWT for API authentication, and relying on secure third-party services like Auth0 and Supabase), please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse. Any information disclosed online is vulnerable to interception and misuse by unauthorized parties.
          </p>

          <h2>
            7. YOUR DATA PROTECTION RIGHTS (POPIA)
          </h2>
          <p>
            If you are a resident of South Africa, you have certain data protection rights under the Protection of Personal Information Act (POPIA). HoodsGoods aims to take reasonable steps to allow you to correct, amend, delete, or limit the use of your Personal Data.
          </p>
          <ul>
            <li><strong>The right to access:</strong> You have the right to request copies of your personal data.</li>
            <li><strong>The right to rectification:</strong> You have the right to request that we correct any information you believe is inaccurate or complete information you believe is incomplete.</li>
            <li><strong>The right to erasure (right to be forgotten):</strong> You have the right to request that we erase your personal data, under certain conditions.</li>
            <li><strong>The right to restrict processing:</strong> You have the right to request that we restrict the processing of your personal data, under certain conditions.</li>
            <li><strong>The right to object to processing:</strong> You have the right to object to our processing of your personal data, under certain conditions.</li>
            <li><strong>The right to data portability:</strong> You have the right to request that we transfer the data that we have collected to another organization, or directly to you, under certain conditions.</li>
            <li>
              <strong>The right to complain to an Information Regulator:</strong> You have the right to complain to the Information Regulator if you believe we are unlawfully processing your personal information. The Information Regulator's contact details are:
              <address className="contact-address"> 
                JD House, 27 Stiemens Street, Braamfontein, Johannesburg, 2001<br />
                Phone: 010 023 5200<br />
                Email: enquiries@inforegulator.org.za
              </address>
            </li>
          </ul>
          <p>
            If you wish to exercise any of these rights, please contact us at privacy@hoodsgoods.example.com.
          </p>

          <h2>
            8. CHILDREN'S PRIVACY
          </h2>
          <p>
            Our Services are not intended for use by children under the age of 18. We do not knowingly collect personally identifiable information from children under 18. If we become aware that we have collected Personal Data from children without verification of parental consent, we take steps to remove that information from our servers.
          </p>

          <h2>
            9. THIRD-PARTY WEBSITES
          </h2>
          <p>
            The Services may contain links to third-party websites and applications of interest, including advertisements and external services, that are not affiliated with us. Once you have used these links to leave the Services, any information you provide to these third parties is not covered by this Privacy Policy, and we cannot guarantee the safety and privacy of your information. Before visiting and providing any information to any third-party websites, you should inform yourself of the privacy policies and practices (if any) of the third party responsible for that website, and should take those steps necessary to, in your discretion, protect the privacy of your information. We are not responsible for the content or privacy and security practices and policies of any third parties, including other sites, services or applications that may be linked to or from the Services (e.g. Auth0, Yoco, Supabase).
          </p>

          <h2>
            10. CHANGES TO THIS PRIVACY POLICY
          </h2>
          <p>
            We may update this Privacy Policy from time to time. The updated version will be indicated by an updated "Last Updated" date and the updated version will be effective as soon as it is accessible. If we make material changes to this privacy policy, we may notify you either by prominently posting a notice of such changes or by directly sending you a notification. We encourage you to review this privacy policy frequently to be informed of how we are protecting your information.
          </p>

          <h2>
            11. CONTACT US
          </h2>
          <p>
            If you have questions or comments about this Privacy Policy, please contact us at:
          </p>
          <address className="contact-address contact-address-final"> 
            HoodsGoods<br />
            privacy@hoodsgoods.com<br />
            https://victorious-mud-0224f2003.6.azurestaticapps.net
          </address>
        </section>
      </article>
    </main>
  );
};

export default PrivacyPolicyPage;
