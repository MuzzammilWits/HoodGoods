import React from 'react';
import './WhyChooseUs.css';


interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const Feature: React.FC<FeatureProps> = ({ icon, title, description }) => {
  return (
    <article className="selling-point-item">
      <figure className="selling-point-icon">
        {icon}
      </figure>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
};

const WhyChooseUs: React.FC = () => {
  return (
    <section id="about-us" className="why-choose-us-container">
      <main className="container">
        <section className="about-us-section">
            <h2 className="section-title common-section-heading">About Us</h2>
            <p className="about-us-text">
                HoodsGoods is a vibrant marketplace connecting talented local artisans with conscious consumers who value handcrafted quality. Founded in 2020, our platform supports independent creators throughout South Africa, providing them with a digital space to showcase their unique skills and products. We believe that behind every handmade item is a story of passion, creativity, and craftsmanship. Our mission is to celebrate these stories while promoting sustainable shopping practices and supporting local economies. When you shop at HoodsGoods, you're not just buying a product - you're investing in a community of makers and the authentic art of handmade creation.
            </p>
        </section>

        {/* --- Trust Icons Section --- */}
        <section className="trust-icons-section">
            <h2 className="common-section-heading">Our Impact</h2> {/* Or a suitable title */}
            <div className="trust-icons-grid">
                <article className="trust-icon-item">
                    {/* Placeholder for Icon 1 */}
                    <div className="trust-icon">
                      <svg version="1.1" viewBox="0 0 50 50" xmlSpace="preserve" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"><g id="Layer_1"><path d="M45.293,19.562l0.699-6.683l-6.139-2.731l-2.73-6.139l-6.683,0.698L25,0.765l-5.439,3.942l-6.682-0.698l-2.731,6.138   l-6.139,2.732l0.698,6.682L0.765,25l3.942,5.438l-0.699,6.683l6.139,2.731l2.73,6.139l6.683-0.698L25,49.235l5.439-3.942   l6.682,0.698l2.731-6.138l6.139-2.732l-0.698-6.682L49.235,25L45.293,19.562z M43.851,35.885l-5.514,2.453l-2.453,5.513   l-5.999-0.626L25,46.765l-4.885-3.54l-6,0.626l-2.453-5.514l-5.513-2.452l0.626-5.999L3.235,25l3.541-4.885l-0.626-6l5.514-2.453   l2.453-5.513l5.999,0.626L25,3.235l4.885,3.54l6-0.626l2.453,5.514l5.513,2.452l-0.626,5.999L46.765,25l-3.541,4.885L43.851,35.885   z"/><polygon points="21,31.586 14.707,25.293 13.293,26.707 21,34.414 38.707,16.707 37.293,15.293  "/></g><g/></svg>
                    </div>
                    <p>1000+ certified sellers</p>
                </article>
                <article className="trust-icon-item">
                    {/* Placeholder for Icon 2 */}
                    <div className="trust-icon">
                      <svg height="60px" version="1.1" viewBox="0 0 60 60" width="60px" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"><title/><desc/><defs/><g fill="none" fill-rule="evenodd" id="People" stroke="none" stroke-width="1"><g fill="#000000" id="Icon-34"><path d="M26.2051,26.2929 C25.8141,26.6839 25.8141,27.3159 26.2051,27.7069 L32.2051,33.7069 C32.4001,33.9019 32.6561,33.9999 32.9121,33.9999 C33.1681,33.9999 33.4241,33.9019 33.6191,33.7069 C34.0101,33.3159 34.0101,32.6839 33.6191,32.2929 L27.6191,26.2929 C27.2281,25.9019 26.5961,25.9019 26.2051,26.2929 L26.2051,26.2929 Z M23.6191,30.2929 C23.2281,29.9019 22.5961,29.9019 22.2051,30.2929 C21.8141,30.6839 21.8141,31.3159 22.2051,31.7069 L28.2051,37.7069 C28.4001,37.9019 28.6561,37.9999 28.9121,37.9999 C29.1681,37.9999 29.4241,37.9019 29.6191,37.7069 C30.0101,37.3159 30.0101,36.6839 29.6191,36.2929 L23.6191,30.2929 Z M19.6191,34.2929 C19.2281,33.9019 18.5961,33.9019 18.2051,34.2929 C17.8141,34.6839 17.8141,35.3159 18.2051,35.7069 L24.2051,41.7069 C24.4001,41.9019 24.6561,41.9999 24.9121,41.9999 C25.1681,41.9999 25.4241,41.9019 25.6191,41.7069 C26.0101,41.3159 26.0101,40.6839 25.6191,40.2929 L19.6191,34.2929 Z M38.4981,31.9999 L27.9121,21.4139 L13.3261,35.9999 L23.9121,46.5859 L38.4981,31.9999 Z M28.6191,19.2929 L40.6191,31.2929 C41.0101,31.6839 41.0101,32.3159 40.6191,32.7069 L24.6191,48.7069 C24.4241,48.9019 24.1681,48.9999 23.9121,48.9999 C23.6561,48.9999 23.4001,48.9019 23.2051,48.7069 L11.2051,36.7069 C10.8141,36.3159 10.8141,35.6839 11.2051,35.2929 L27.2051,19.2929 C27.5961,18.9019 28.2281,18.9019 28.6191,19.2929 L28.6191,19.2929 Z M51.8871,36.5749 C51.4091,36.2939 50.7971,36.4549 50.5181,36.9319 L39.0561,56.4819 C38.2281,57.9149 36.3891,58.4079 35.0011,57.6079 L32.7681,56.1609 C32.3061,55.8599 31.6861,55.9929 31.3861,56.4559 C31.0851,56.9199 31.2171,57.5389 31.6811,57.8389 L33.9571,59.3139 C34.7421,59.7669 35.6011,59.9819 36.4491,59.9819 C38.1781,59.9819 39.8611,59.0869 40.7841,57.4879 L52.2431,37.9429 C52.5221,37.4669 52.3631,36.8549 51.8871,36.5749 L51.8871,36.5749 Z M59.9121,4.9999 L59.9121,20.9999 C59.9121,24.0939 58.9281,26.3989 56.6191,28.7069 L26.9211,58.4469 C25.9761,59.3919 24.7201,59.9109 23.3841,59.9109 C22.0481,59.9109 20.7931,59.3919 19.8501,58.4469 L1.4651,40.0629 C0.5201,39.1179 0.0001,37.8619 0.0001,36.5259 C0.0001,35.1899 0.5201,33.9349 1.4651,32.9909 L27.4391,7.0519 C20.6471,5.5079 16.4321,5.4039 15.1981,5.7649 C15.7191,6.2979 17.3421,7.4299 21.2591,8.9739 C21.7731,9.1769 22.0251,9.7569 21.8231,10.2709 C21.6201,10.7849 21.0391,11.0339 20.5261,10.8349 C12.4181,7.6389 12.8921,5.8669 13.0711,5.1999 C13.4421,3.8099 15.4231,3.3469 19.4811,3.7019 C22.7861,3.9909 27.0521,4.8059 31.4931,5.9949 C35.9341,7.1849 40.0341,8.6119 43.0401,10.0149 C46.7351,11.7379 48.2161,13.1269 47.8431,14.5179 C47.4831,15.8599 45.6121,16.0239 44.9971,16.0779 C44.9681,16.0809 44.9381,16.0819 44.9091,16.0819 C44.3961,16.0819 43.9601,15.6889 43.9141,15.1689 C43.8651,14.6189 44.2721,14.1339 44.8231,14.0859 C45.2491,14.0489 45.5321,13.9909 45.7151,13.9389 C45.2871,13.4919 44.2041,12.7949 42.4721,11.9649 C42.1091,12.5769 41.9121,13.2799 41.9121,13.9999 C41.9121,16.2059 43.7061,17.9999 45.9121,17.9999 C48.1181,17.9999 49.9121,16.2059 49.9121,13.9999 C49.9121,11.7939 48.1181,9.9999 45.9121,9.9999 C45.3591,9.9999 44.9121,9.5529 44.9121,8.9999 C44.9121,8.4469 45.3591,7.9999 45.9121,7.9999 C49.2211,7.9999 51.9121,10.6909 51.9121,13.9999 C51.9121,17.3089 49.2211,19.9999 45.9121,19.9999 C42.6031,19.9999 39.9121,17.3089 39.9121,13.9999 C39.9121,12.9969 40.1761,12.0199 40.6471,11.1479 C38.2541,10.1429 35.0441,9.0179 30.9761,7.9269 C30.5471,7.8119 30.1341,7.7069 29.7211,7.6019 L2.8791,34.4059 C2.3121,34.9719 2.0001,35.7259 2.0001,36.5259 C2.0001,37.3279 2.3121,38.0809 2.8791,38.6479 L21.2641,57.0329 C22.3971,58.1659 24.3731,58.1659 25.5061,57.0329 L55.2041,27.2929 C57.1531,25.3449 57.9121,23.5799 57.9121,20.9999 L57.9121,4.9999 C57.9121,3.3459 56.5661,1.9999 54.9121,1.9999 L38.9121,1.9999 C36.3321,1.9999 34.5671,2.7589 32.6191,4.7069 C32.2281,5.0979 31.5961,5.0979 31.2051,4.7069 C30.8141,4.3159 30.8141,3.6839 31.2051,3.2929 C33.5131,0.9839 35.8181,-0.0001 38.9121,-0.0001 L54.9121,-0.0001 C57.6691,-0.0001 59.9121,2.2429 59.9121,4.9999 L59.9121,4.9999 Z" id="price-tag"/></g></g></svg>
                    </div>
                    <p>20k+ listed products</p>
                </article>
                <article className="trust-icon-item">
                    {/* Placeholder for Icon 3 */}
                    <div className="trust-icon">
                      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><title/><g data-name="Shipped Order" id="Shipped_Order"><path d="M30.5,14.4a.47.47,0,0,0-.15-.35L26,9.65a.47.47,0,0,0-.35-.15H18a.5.5,0,0,0-.5.5V21.5h-.31V8a.5.5,0,0,0-.5-.5H2.9a.5.5,0,0,0-.5.5V21.5H2a.5.5,0,0,0-.5.5v4a.5.5,0,0,0,.5.5H3.43A2.49,2.49,0,0,0,7.66,28a2.41,2.41,0,0,0,.71-1.48H23.55a2.5,2.5,0,0,0,2.45,2,2.52,2.52,0,0,0,2.45-2H29a.49.49,0,0,0,.48-.38l1-4s0,0,0-.05,0-.05,0-.07Zm-12-3.9h6.89l4.11,4.11V21.5h-11Zm-3.21,11h-1v-3h1Zm.9-12h-4.9v-1h4.9Zm-6.9,1h1v3.29l-.14-.14a.51.51,0,0,0-.36-.15.49.49,0,0,0-.35.15l-.15.14Zm1-2v1h-1v-1ZM3.4,8.5H8.29v1H3.4Zm0,2H8.29V15a.5.5,0,0,0,.31.46.49.49,0,0,0,.55-.11l.64-.64.65.64a.47.47,0,0,0,.35.15.41.41,0,0,0,.19,0,.5.5,0,0,0,.31-.46V10.5h4.9v7.21a.5.5,0,0,0-.4-.21h-2a.5.5,0,0,0-.5.5v3.5h-1V18a.5.5,0,0,0-.5-.5h-2a.5.5,0,0,0-.5.5v3.5H3.4Zm7.89,11h-1v-3h1ZM7,27.27a1.52,1.52,0,0,1-1.06.44,1.5,1.5,0,0,1-1.5-1.5,1,1,0,0,1,0-.16,1.51,1.51,0,0,1,.42-.91,1.57,1.57,0,0,1,2.13,0,1.53,1.53,0,0,1,.44.93v.14A1.5,1.5,0,0,1,7,27.27Zm20.09-.21A1.46,1.46,0,0,1,26,27.5,1.5,1.5,0,0,1,24.5,26,1.47,1.47,0,0,1,25,24.94a1.5,1.5,0,0,1,2.11,0,1.47,1.47,0,0,1,0,2.11Zm1.56-1.56h-.16a2.54,2.54,0,0,0-.22-.6s-.05-.09-.07-.14a2.76,2.76,0,0,0-.39-.51,2.55,2.55,0,0,0-3.53,0,2.44,2.44,0,0,0-.39.52,1,1,0,0,0-.08.14,2.54,2.54,0,0,0-.22.6H8.3s0,0,0,0a2.67,2.67,0,0,0-.2-.46L8,24.88a2.12,2.12,0,0,0-.35-.44,2.56,2.56,0,0,0-3.54,0,2.66,2.66,0,0,0-.33.44.75.75,0,0,0-.07.12,2.33,2.33,0,0,0-.21.49h-1v-3H29.36Z"/><path d="M25.44,11.56a.5.5,0,0,0-.35-.14H19.92a.5.5,0,0,0-.5.5V16a.5.5,0,0,0,.5.5h8.16a.5.5,0,0,0,.5-.5V14.91a.5.5,0,0,0-.14-.35Zm2.14,3.94H20.42V12.42h4.46l2.7,2.7Z"/></g></svg>
                    </div>
                    <p>10k+ successfully shipped orders</p>
                </article>
            </div>
        </section>

        <section className="why-choose-us-section">
            <h2 className="common-section-heading">Why Choose Us?</h2>

            <section className="selling-points-grid">
              <Feature
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="50" height="50" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                }
                title="Secure & Trusted Shopping"
                description="Shop with confidence. We use secure payment gateways and prioritize your privacy for a safe online experience."
              />

              <Feature
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="50" height="50" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                  </svg>
                }
                title="Truly Handmade Treasures"
                description="Discover one-of-a-kind items crafted with passion and skill by talented artisans right here in South Africa."
              />

              <Feature
                icon={
                  <svg xmlns="http://www.w3.org/000/svg" viewBox="0 0 24 24" width="50" height="50" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="22" height="18" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                  </svg>
                }
                title="Careful & Reliable Delivery"
                description="Your handmade items are packed with care and shipped reliably to your choice of pickup points. Choose the best delivery option for you at checkout."
              />

              <Feature
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="50" height="50" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                }
                title="Easy to Shop"
                description="Browse, discover, and buy with ease. Our clean, simple interface makes finding something special a breeze."
              />
            </section>
        </section>
      </main>
    </section>
  );
};

export default WhyChooseUs;