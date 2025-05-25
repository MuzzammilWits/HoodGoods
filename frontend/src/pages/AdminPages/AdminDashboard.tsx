// frontend/src/pages/AdminPages/AdminDashboard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleCardKeyDown = (
    event: React.KeyboardEvent<HTMLLIElement>,
    path: string
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigate(path);
    }
  };

  return (
    <main className="admin-dashboard-container">
      <section className="main-titles">
        <h1>Admin Dashboard</h1>
      </section>

      <ul className="management-cards2">
        {/* Store Management Card */}
        <li
          className="management-card3 product-card"
          onClick={() => navigate('/admin/store-approval')}
          role="link" // Provides semantic meaning for assistive technologies
          tabIndex={0} // Makes the element focusable
          onKeyDown={(e) => handleCardKeyDown(e, '/admin/store-approval')}
          aria-label="Manage Stores"
        >
          <figure className="product-image-container">
          <svg
            className="store-card-svg"
            viewBox="0 0 18 16"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
          >
            <title />
            <desc />
            <defs />
            <rect width="100%" height="100%" fill="white" />
            <g fill="#97C9BA" id="Core" transform="translate(-465.000000, -424.000000)">
              <g id="store" transform="translate(465.000000, 424.000000)">
                <path d="M17,0 L1,0 L1,2 L17,2 L17,0 L17,0 Z M18,10 L18,8 L17,3 L1,3 L0,8 L0,10 L1,10 L1,16 L11,16 L11,10 L15,10 L15,16 L17,16 L17,10 L18,10 L18,10 Z M9,14 L3,14 L3,10 L9,10 L9,14 L9,14 Z" id="Shape" />
              </g>
            </g>
          </svg>

          </figure>
          <article className="product-details">
            <button
              className="manage-btn"
              onClick={(e) => {
                e.stopPropagation(); // Prevent li's onClick from firing twice
                navigate('/admin/store-approval');
              }}
            >
              Store Management
            </button>
            <p className="product-description">
              Approve or reject new store applications
            </p>
          </article>
        </li>

        {/* Product Management Card */}
        <li
          className="management-card3 product-card"
          onClick={() => navigate('/admin/product-approval')}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => handleCardKeyDown(e, '/admin/product-approval')}
          aria-label="Manage Products"
        >
          <figure className="product-image-container">
          <svg className="dashboard-card-svg" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"><title/><desc/><defs/><g fill="none" fill-rule="evenodd" id="People" stroke="none" stroke-width="1"><g fill="#97C9BA" id="Icon-34"><path d="M26.2051,26.2929 C25.8141,26.6839 25.8141,27.3159 26.2051,27.7069 L32.2051,33.7069 C32.4001,33.9019 32.6561,33.9999 32.9121,33.9999 C33.1681,33.9999 33.4241,33.9019 33.6191,33.7069 C34.0101,33.3159 34.0101,32.6839 33.6191,32.2929 L27.6191,26.2929 C27.2281,25.9019 26.5961,25.9019 26.2051,26.2929 L26.2051,26.2929 Z M23.6191,30.2929 C23.2281,29.9019 22.5961,29.9019 22.2051,30.2929 C21.8141,30.6839 21.8141,31.3159 22.2051,31.7069 L28.2051,37.7069 C28.4001,37.9019 28.6561,37.9999 28.9121,37.9999 C29.1681,37.9999 29.4241,37.9019 29.6191,37.7069 C30.0101,37.3159 30.0101,36.6839 29.6191,36.2929 L23.6191,30.2929 Z M19.6191,34.2929 C19.2281,33.9019 18.5961,33.9019 18.2051,34.2929 C17.8141,34.6839 17.8141,35.3159 18.2051,35.7069 L24.2051,41.7069 C24.4001,41.9019 24.6561,41.9999 24.9121,41.9999 C25.1681,41.9999 25.4241,41.9019 25.6191,41.7069 C26.0101,41.3159 26.0101,40.6839 25.6191,40.2929 L19.6191,34.2929 Z M38.4981,31.9999 L27.9121,21.4139 L13.3261,35.9999 L23.9121,46.5859 L38.4981,31.9999 Z M28.6191,19.2929 L40.6191,31.2929 C41.0101,31.6839 41.0101,32.3159 40.6191,32.7069 L24.6191,48.7069 C24.4241,48.9019 24.1681,48.9999 23.9121,48.9999 C23.6561,48.9999 23.4001,48.9019 23.2051,48.7069 L11.2051,36.7069 C10.8141,36.3159 10.8141,35.6839 11.2051,35.2929 L27.2051,19.2929 C27.5961,18.9019 28.2281,18.9019 28.6191,19.2929 L28.6191,19.2929 Z M51.8871,36.5749 C51.4091,36.2939 50.7971,36.4549 50.5181,36.9319 L39.0561,56.4819 C38.2281,57.9149 36.3891,58.4079 35.0011,57.6079 L32.7681,56.1609 C32.3061,55.8599 31.6861,55.9929 31.3861,56.4559 C31.0851,56.9199 31.2171,57.5389 31.6811,57.8389 L33.9571,59.3139 C34.7421,59.7669 35.6011,59.9819 36.4491,59.9819 C38.1781,59.9819 39.8611,59.0869 40.7841,57.4879 L52.2431,37.9429 C52.5221,37.4669 52.3631,36.8549 51.8871,36.5749 L51.8871,36.5749 Z M59.9121,4.9999 L59.9121,20.9999 C59.9121,24.0939 58.9281,26.3989 56.6191,28.7069 L26.9211,58.4469 C25.9761,59.3919 24.7201,59.9109 23.3841,59.9109 C22.0481,59.9109 20.7931,59.3919 19.8501,58.4469 L1.4651,40.0629 C0.5201,39.1179 0.0001,37.8619 0.0001,36.5259 C0.0001,35.1899 0.5201,33.9349 1.4651,32.9909 L27.4391,7.0519 C20.6471,5.5079 16.4321,5.4039 15.1981,5.7649 C15.7191,6.2979 17.3421,7.4299 21.2591,8.9739 C21.7731,9.1769 22.0251,9.7569 21.8231,10.2709 C21.6201,10.7849 21.0391,11.0339 20.5261,10.8349 C12.4181,7.6389 12.8921,5.8669 13.0711,5.1999 C13.4421,3.8099 15.4231,3.3469 19.4811,3.7019 C22.7861,3.9909 27.0521,4.8059 31.4931,5.9949 C35.9341,7.1849 40.0341,8.6119 43.0401,10.0149 C46.7351,11.7379 48.2161,13.1269 47.8431,14.5179 C47.4831,15.8599 45.6121,16.0239 44.9971,16.0779 C44.9681,16.0809 44.9381,16.0819 44.9091,16.0819 C44.3961,16.0819 43.9601,15.6889 43.9141,15.1689 C43.8651,14.6189 44.2721,14.1339 44.8231,14.0859 C45.2491,14.0489 45.5321,13.9909 45.7151,13.9389 C45.2871,13.4919 44.2041,12.7949 42.4721,11.9649 C42.1091,12.5769 41.9121,13.2799 41.9121,13.9999 C41.9121,16.2059 43.7061,17.9999 45.9121,17.9999 C48.1181,17.9999 49.9121,16.2059 49.9121,13.9999 C49.9121,11.7939 48.1181,9.9999 45.9121,9.9999 C45.3591,9.9999 44.9121,9.5529 44.9121,8.9999 C44.9121,8.4469 45.3591,7.9999 45.9121,7.9999 C49.2211,7.9999 51.9121,10.6909 51.9121,13.9999 C51.9121,17.3089 49.2211,19.9999 45.9121,19.9999 C42.6031,19.9999 39.9121,17.3089 39.9121,13.9999 C39.9121,12.9969 40.1761,12.0199 40.6471,11.1479 C38.2541,10.1429 35.0441,9.0179 30.9761,7.9269 C30.5471,7.8119 30.1341,7.7069 29.7211,7.6019 L2.8791,34.4059 C2.3121,34.9719 2.0001,35.7259 2.0001,36.5259 C2.0001,37.3279 2.3121,38.0809 2.8791,38.6479 L21.2641,57.0329 C22.3971,58.1659 24.3731,58.1659 25.5061,57.0329 L55.2041,27.2929 C57.1531,25.3449 57.9121,23.5799 57.9121,20.9999 L57.9121,4.9999 C57.9121,3.3459 56.5661,1.9999 54.9121,1.9999 L38.9121,1.9999 C36.3321,1.9999 34.5671,2.7589 32.6191,4.7069 C32.2281,5.0979 31.5961,5.0979 31.2051,4.7069 C30.8141,4.3159 30.8141,3.6839 31.2051,3.2929 C33.5131,0.9839 35.8181,-0.0001 38.9121,-0.0001 L54.9121,-0.0001 C57.6691,-0.0001 59.9121,2.2429 59.9121,4.9999 L59.9121,4.9999 Z" id="price-tag"/></g></g></svg>
          </figure>
          <article className="product-details">
            <button
              className="manage-btn"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/admin/product-approval');
              }}
            >
              Product Management
            </button>
            <p className="product-description">
              Approve or reject new product listings
            </p>
          </article>
        </li>

        {/* Reports Card */}
        <li
          className="management-card3 product-card"
          onClick={() => navigate('/admin/analytics')}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => handleCardKeyDown(e, '/admin/analytics')}
          aria-label="View Reports and Analytics"
        >
          <figure className="product-image-container">
          <svg className="dashboard-card-svg" id="Layer_1" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"><g fill="currentColor"><path d="M29.4,190.9c2.8,0,5-2.2,5-5v-52.3l30.2-16.2v42.9c0,2.8,2.2,5,5,5c2.8,0,5-2.2,5-5v-59.6l-50.1,26.9v58.3   C24.4,188.6,26.6,190.9,29.4,190.9z"/><path d="M89.6,153c2.8,0,5-2.2,5-5V59.6l30.2-16.2v143.8c0,2.8,2.2,5,5,5c2.8,0,5-2.2,5-5V26.7L84.6,53.6V148   C84.6,150.7,86.8,153,89.6,153z"/><path d="M149.8,185.7c2.8,0,5-2.2,5-5V85.4L185,69.2v86.3c0,2.8,2.2,5,5,5c2.8,0,5-2.2,5-5v-103l-50.1,26.9v101.3   C144.8,183.5,147.1,185.7,149.8,185.7z"/><path d="M250,146.2c-0.9-1.5-2.5-2.5-4.3-2.5h-34.5c-1.8,0-3.4,1-4.3,2.5c-0.9,1.5-0.9,3.4,0,5l6.2,10.7l-27.5,16.7   c-4.2,2.6-8.3,5.1-12.5,7.7c-3,1.9-6,3.7-8.9,5.6c-7.8,5-14.7,9.5-21.1,13.9c-3.3,2.2-6.5,4.5-9.8,6.7l-44.8-43.8L7.7,220.1   c-2.3,1.5-3,4.6-1.5,6.9c1,1.5,2.6,2.3,4.2,2.3c0.9,0,1.8-0.3,2.7-0.8l74-47.1l45.2,44.1l6.1-4.4c3.4-2.4,6.8-4.8,10.3-7.1   c6.3-4.3,13.1-8.7,20.9-13.7c2.9-1.9,5.9-3.7,8.8-5.6c4.1-2.6,8.3-5.1,12.4-7.7l25.3-15.5l2-1.2l6.1,10.6c0.9,1.5,2.5,2.5,4.3,2.5   s3.4-1,4.3-2.5l17.3-29.9C250.9,149.7,250.9,147.8,250,146.2z M228.4,168.6l-8.6-14.9H237L228.4,168.6z"/></g></svg>
          </figure>
          <article className="product-details">
            <button
              className="manage-btn"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/admin/analytics');
              }}
            >
              Admin Analytics
            </button>
            <p className="product-description">
              View system reports and analytics
            </p>
          </article>
        </li>
      </ul>
    </main>
  );
};

export default AdminDashboard;