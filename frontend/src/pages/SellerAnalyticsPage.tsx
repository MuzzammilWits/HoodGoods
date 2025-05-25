// frontend/src/pages/SellerAnalyticsPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react'; // For handling user authentication
import supabase from '../supabaseClient'; // Supabase client for database interactions
import SalesTrendReport from '../components/reporting/SalesTrendReport';
import InventoryStatusReport from '../components/reporting/InventoryStatusReport';
import './SellerAnalyticsPage.css';

const SellerAnalyticsPage: React.FC = () => {
  // Get user authentication status and details from Auth0
  const {
    user: auth0User,
    isAuthenticated,
    isLoading: auth0Loading,
    getAccessTokenSilently,
  } = useAuth0();

  // State for managing store information, loading states, errors, and active report view
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [isLoadingPageData, setIsLoadingPageData] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<'inventory' | 'sales' | 'custom'>('inventory'); // Default to inventory report

  // Fetches store ID and name from Supabase based on the user ID
  const fetchStoreData = useCallback(async (userId: string) => {

    const { data: storeData, error: storeFetchError } = await supabase
      .from('Stores')
      .select('store_id, store_name')
      .eq('userID', userId) // Match store to the logged-in user
      .single(); // Expecting one store per user

    if (storeFetchError) {
      console.error('Error fetching store data from Supabase:', storeFetchError);
      throw new Error(`Failed to fetch store details: ${storeFetchError.message}.`);
    }
    return storeData;
  }, []);

  // Effect to load initial page data once authentication is resolved
  useEffect(() => {
    if (auth0Loading) {
      setIsLoadingPageData(true); // Still loading auth, so page data is also loading
      return;
    }

    if (!isAuthenticated || !auth0User?.sub) {
      setError("User not authenticated. Please log in.");
      setIsLoadingPageData(false);
      return;
    }

    const auth0UserId = auth0User.sub; // Auth0 user ID

    // Async function to fetch store details
    const loadInitialPageData = async () => {
      setIsLoadingPageData(true);
      setError(null);
      try {
        // Get token silently for secure API calls (if reports were fetched from a custom backend)
        const token = await getAccessTokenSilently();
        if (!token) {
          throw new Error("Authentication token could not be retrieved.");
        }
        const fetchedStoreData = await fetchStoreData(auth0UserId);

        if (fetchedStoreData && fetchedStoreData.store_id) {
          setStoreId(fetchedStoreData.store_id);
          setStoreName(fetchedStoreData.store_name || 'Your Store'); // Default name if none
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

  // Display loading message while auth or page data is being fetched
  if (auth0Loading || isLoadingPageData) {
    return (
        <main className="seller-analytics-page">
            <section className="loading-container centered-message" aria-label="Loading Analytics Dashboard">
                <p>Loading Analytics Dashboard...</p>
            </section>
        </main>
    );
  }

  // Display error message if something went wrong
  if (error) {
    return (
      <main className="seller-analytics-page message-container error-message-container centered-message">
        <header><h2>Analytics Unavailable</h2></header>
        <p>{error}</p>
      </main>
    );
  }

  // Display message if no store ID could be loaded (e.g., user has no store)
  if (!storeId) {
    return (
      <main className="seller-analytics-page message-container info-message-container centered-message">
        <header><h2>Analytics Unavailable</h2></header>
        <p>Store information could not be loaded. Please ensure you have a store registered.</p>
      </main>
    );
  }

  // Main analytics dashboard content
  return (
    <main className="seller-analytics-page container mt-4">
      <header className="page-header analytics-header mb-4">
        <h1>{storeName ? `${storeName} - ` : ''}Analytics Dashboard</h1>
        {/* Navigation to switch between different reports */}
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
        </nav>
      </header>

      <section className="analytics-content">
        {/* Conditionally render the selected report component */}
        {activeReport === 'inventory' && (
          <article className="report-group mb-5" aria-labelledby="inventory-status-heading">
            <h2 id="inventory-status-heading" className="visually-hidden">Inventory Status Report Section</h2>
            <InventoryStatusReport /> {/* Component to display inventory data */}
          </article>
        )}

        {activeReport === 'sales' && (
          <article className="report-group mb-5" aria-labelledby="sales-trends-heading">
            <h2 id="sales-trends-heading" className="visually-hidden">Sales Trends Report Section</h2>
            <SalesTrendReport /> {/* Component to display sales trend data */}
          </article>
        )}

        {/* Placeholder for a future 'Custom View' report */}
        {activeReport === 'custom' && (
          <article className="report-group" aria-labelledby="custom-view-heading">
            <article className="card">
              <header className="card-header">
                <h2 id="custom-view-heading" className="report-group-title h5 mb-0">Custom Performance View</h2>
              </header>
              <section className="card-body">
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