// frontend/src/pages/SellerAnalyticsPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import supabase from '../supabaseClient'; // Default import
import SalesTrendReport from '../components/reporting/SalesTrendReport';
import InventoryStatusReport from '../components/reporting/InventoryStatusReport'; // Import the new component
// Import CustomViewReport later when it's ready
// import CustomViewReport from '../components/reporting/CustomViewReport';
import './SellerAnalyticsPage.css'; // Ensure this file exists

const SellerAnalyticsPage: React.FC = () => {
  const {
    user: auth0User,
    isAuthenticated,
    isLoading: auth0Loading,
    getAccessTokenSilently,
  } = useAuth0();

  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [isLoadingPageData, setIsLoadingPageData] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State to manage which report is currently active
  const [activeReport, setActiveReport] = useState<'sales' | 'inventory' | 'custom'>('inventory');

  const fetchStoreData = useCallback(async (userId: string, token: string) => {
    // Supabase session setting can be optional or handled differently if
    // your backend API (NestJS) is the primary data source and doesn't rely on Supabase session for RLS for these calls.
    // For calls to your NestJS backend, this Supabase session set might not be directly relevant.
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: '', // Refresh token might not be available or needed here
    });

    if (sessionError) {
      console.warn('Warning: Could not set Supabase session with Auth0 token:', sessionError.message);
    }

    // This Supabase call fetches store details. It seems to be working for you.
    const { data: storeData, error: storeFetchError } = await supabase
      .from('Stores')
      .select('store_id, store_name')
      .eq('userID', userId) // Ensure 'userID' is the correct column name in your 'Stores' table
      .single();

    if (storeFetchError) {
      console.error('Error fetching store data from Supabase:', storeFetchError);
      throw new Error(`Failed to fetch store details: ${storeFetchError.message}.`);
    }
    return storeData;
  }, []);

  useEffect(() => {
    if (auth0Loading) {
      setIsLoadingPageData(true);
      return;
    }

    if (!isAuthenticated || !auth0User?.sub) {
      setError("User not authenticated. Please log in.");
      setIsLoadingPageData(false);
      return;
    }

    const auth0UserId = auth0User.sub;

    const loadInitialPageData = async () => {
      setIsLoadingPageData(true);
      setError(null);
      try {
        const token = await getAccessTokenSilently();
        if (!token) {
            throw new Error("Authentication token could not be retrieved.");
        }
        const storeData = await fetchStoreData(auth0UserId, token);

        if (storeData && storeData.store_id) {
          setStoreId(storeData.store_id);
          setStoreName(storeData.store_name || 'Your Store');
        } else {
          setError("No store associated with this seller account.");
          setStoreId(null);
          setStoreName(null);
        }
      } catch (e: any) {
        console.error('Error loading seller analytics page data:', e);
        setError(`An unexpected error occurred: ${e.message}`);
        setStoreId(null);
        setStoreName(null);
      } finally {
        setIsLoadingPageData(false);
      }
    };

    loadInitialPageData();
  }, [auth0User, isAuthenticated, auth0Loading, getAccessTokenSilently, fetchStoreData]);

  if (auth0Loading || isLoadingPageData) {
    return <div className="loading-container centered-message"><p>Loading Analytics Dashboard...</p></div>;
  }

  if (error) {
    return (
      <main className="seller-analytics-page message-container error-message-container centered-message">
        <h2>Analytics Unavailable</h2>
        <p>{error}</p>
      </main>
    );
  }

  if (!storeId) {
    // This state is now effectively covered by the error state "No store associated..."
    // but keeping it as a fallback or if error is cleared but storeId isn't set.
    return (
      <main className="seller-analytics-page message-container info-message-container centered-message">
        <h2>Analytics Unavailable</h2>
        <p>Store information could not be loaded. Please ensure you have a store registered.</p>
      </main>
    );
  }

  // If SalesTrendReport also uses useAuth0 hook internally, you don't need to pass getAccessTokenSilently
  // For now, assuming SalesTrendReport might still expect it as a prop.
  // InventoryStatusReport and future reports should ideally use the useAuth0 hook internally.

  return (
    <main className="seller-analytics-page container mt-4">
      <header className="page-header analytics-header mb-4"> {/* Added analytics-header class */}
        <h1>{storeName ? `${storeName} - ` : ''}Analytics Dashboard</h1>
        <nav className="report-nav">
          <button
            onClick={() => setActiveReport('inventory')}
            className={activeReport === 'inventory' ? 'active' : ''}
          >
            Inventory Status
          </button>
          <button
            onClick={() => setActiveReport('sales')}
            className={activeReport === 'sales' ? 'active' : ''}
          >
            Sales Trends
          </button>
          <button
            onClick={() => setActiveReport('custom')}
            className={activeReport === 'custom' ? 'active' : ''}
            disabled // Disable until CustomViewReport is ready
          >
            Custom Performance
          </button>
        </nav>
      </header>

      <section className="analytics-content">
        {activeReport === 'inventory' && (
          <div className="report-group mb-5" aria-labelledby="inventory-status-heading">
            {/* The InventoryStatusReport component will have its own internal H2 or H3 title */}
            <InventoryStatusReport />
          </div>
        )}

        {activeReport === 'sales' && (
          <section className="report-group mb-5" aria-labelledby="sales-trends-heading">
            {/* The SalesTrendReport component likely has its own internal H2 or H3 title */}
            <SalesTrendReport />
          </section>
        )}

        {activeReport === 'custom' && (
          <section className="report-group" aria-labelledby="custom-view-heading">
            <div className="card">
              <div className="card-header">
                <h2 id="custom-view-heading" className="report-group-title h5 mb-0">Custom Performance View</h2>
              </div>
              <div className="card-body">
                <p className="placeholder-text card-text">Custom View Report - Coming Soon!</p>
                {/* <CustomViewReport />  -- When ready */}
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
};

export default SellerAnalyticsPage;