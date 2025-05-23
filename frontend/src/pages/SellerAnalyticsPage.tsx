// frontend/src/pages/SellerAnalyticsPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import supabase from '../supabaseClient'; // Default import
import SalesTrendReport from '../components/reporting/SalesTrendReport';
import InventoryStatusReport from '../components/reporting/InventoryStatusReport';
import './SellerAnalyticsPage.css';

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
  const [activeReport, setActiveReport] = useState<'inventory' | 'sales' | 'custom'>('inventory');

  const fetchStoreData = useCallback(async (userId: string) => {
    // Supabase session setting is optional if NestJS backend doesn't rely on it.
    // const { error: sessionError } = await supabase.auth.setSession({
    //   access_token: token,
    //   refresh_token: '', // Typically not needed for this kind of operation
    // });
    // if (sessionError) {
    //   console.warn('Warning: Could not set Supabase session:', sessionError.message);
    // }

    const { data: storeData, error: storeFetchError } = await supabase
      .from('Stores')
      .select('store_id, store_name')
      .eq('userID', userId)
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
        const fetchedStoreData = await fetchStoreData(auth0UserId);

        if (fetchedStoreData && fetchedStoreData.store_id) {
          setStoreId(fetchedStoreData.store_id);
          setStoreName(fetchedStoreData.store_name || 'Your Store');
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
    return (
        <main className="seller-analytics-page"> {/* Added main wrapper for consistency */}
            <section className="loading-container centered-message" aria-label="Loading Analytics Dashboard">
                {/* Spinner can be added here if desired, for now, it's CSS based or none */}
                <p>Loading Analytics Dashboard...</p>
            </section>
        </main>
    );
  }

  if (error) {
    return (
      <main className="seller-analytics-page message-container error-message-container centered-message">
        <header><h2>Analytics Unavailable</h2></header>
        <p>{error}</p>
      </main>
    );
  }

  if (!storeId) {
    return (
      <main className="seller-analytics-page message-container info-message-container centered-message">
        <header><h2>Analytics Unavailable</h2></header>
        <p>Store information could not be loaded. Please ensure you have a store registered.</p>
      </main>
    );
  }

  return (
    <main className="seller-analytics-page container mt-4">
      <header className="page-header analytics-header mb-4">
        <h1>{storeName ? `${storeName} - ` : ''}Analytics Dashboard</h1>
        <nav className="report-nav" aria-label="Analytics Reports Navigation">
          <button
            onClick={() => setActiveReport('inventory')}
            className={activeReport === 'inventory' ? 'active' : ''}
            aria-pressed={activeReport === 'inventory'}
          >
            Inventory Status
          </button>
          <button
            onClick={() => setActiveReport('sales')}
            className={activeReport === 'sales' ? 'active' : ''}
            aria-pressed={activeReport === 'sales'}
          >
            Sales Trends
          </button>
           {/* <button
            onClick={() => setActiveReport('custom')}
            className={activeReport === 'custom' ? 'active' : ''}
            aria-pressed={activeReport === 'custom'}
            disabled // Example: Disable if not ready
          >
            Custom View (Soon)
          </button> */}
        </nav>
      </header>

      <section className="analytics-content">
        {activeReport === 'inventory' && (
          <article className="report-group mb-5" aria-labelledby="inventory-status-heading">
            <h2 id="inventory-status-heading" className="visually-hidden">Inventory Status Report Section</h2>
            <InventoryStatusReport />
          </article>
        )}

        {activeReport === 'sales' && (
          <article className="report-group mb-5" aria-labelledby="sales-trends-heading">
            <h2 id="sales-trends-heading" className="visually-hidden">Sales Trends Report Section</h2>
            <SalesTrendReport />
          </article>
        )}

        {activeReport === 'custom' && (
          <article className="report-group" aria-labelledby="custom-view-heading">
            <article className="card"> {/* Changed div to article */}
              <header className="card-header"> {/* Changed div to header */}
                <h2 id="custom-view-heading" className="report-group-title h5 mb-0">Custom Performance View</h2>
              </header>
              <section className="card-body"> {/* Changed div to section */}
                <p className="placeholder-text card-text">Custom View Report - Coming Soon!</p>
              </section>
            </article>
          </article>
        )}
      </section>
    </main>
  );
};
 
export default SellerAnalyticsPage;