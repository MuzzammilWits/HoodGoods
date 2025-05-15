// frontend/src/pages/SellerAnalyticsPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import supabase from '../supabaseClient'; // Default import
import SalesTrendReport from '../components/reporting/SalesTrendReport';
// Import other report components later:
// import InventoryStatusReport from '../components/reporting/InventoryStatusReport';
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

  const fetchStoreData = useCallback(async (userId: string, token: string) => {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: '',
    });

    if (sessionError) {
      console.warn('Warning: Could not set Supabase session with Auth0 token:', sessionError.message);
    }

    // MODIFIED: Use 'userID' in the .eq() filter
    const { data: storeData, error: storeFetchError } = await supabase
      .from('Stores')
      .select('store_id, store_name') 
      .eq('userID', userId) // Changed 'user_id' to 'userID'
      .single();

    if (storeFetchError) {
      console.error('Error fetching store data from Supabase:', storeFetchError);
      throw new Error(`Failed to fetch store details: ${storeFetchError.message}. Ensure the 'Stores' table and 'userID' column (or its actual name) are correct, and RLS permits this query.`);
    }
    return storeData;
  }, []); 

  useEffect(() => {
    if (auth0Loading) {
      setIsLoadingPageData(true);
      return;
    }

    if (!isAuthenticated || !auth0User?.sub) {
      setError("User not authenticated or user identifier (Auth0 sub) is missing. Please log in.");
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
            console.error("Failed to get access token from Auth0.");
            throw new Error("Authentication token could not be retrieved. Please try logging in again.");
        }
        const storeData = await fetchStoreData(auth0UserId, token);

        if (storeData && storeData.store_id) {
          setStoreId(storeData.store_id);
          setStoreName(storeData.store_name || 'Your Store'); 
        } else {
          setError("No store associated with this seller account. Please create your store first to view analytics.");
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
    return (
      <main className="seller-analytics-page message-container info-message-container centered-message">
        <h2>Analytics Unavailable</h2>
        <p>Store information could not be loaded. Unable to display analytics.</p>
      </main>
    );
  }

  return (
    <main className="seller-analytics-page container mt-4">
      <header className="page-header mb-4">
        <h1>{storeName ? `${storeName} - ` : ''}Analytics Dashboard</h1>
      </header>

      <section className="report-group mb-5" aria-labelledby="sales-trends-heading">
        <SalesTrendReport getAccessTokenSilently={getAccessTokenSilently} />
      </section>

      <section className="report-group mb-5" aria-labelledby="inventory-status-heading">
        <div className="card">
          <div className="card-header">
            <h2 id="inventory-status-heading" className="report-group-title h5 mb-0">Inventory Status</h2>
          </div>
          <div className="card-body">
            <p className="placeholder-text card-text">Inventory Status Report - Coming Soon!</p>
          </div>
        </div>
      </section>

      <section className="report-group" aria-labelledby="custom-view-heading">
         <div className="card">
          <div className="card-header">
            <h2 id="custom-view-heading" className="report-group-title h5 mb-0">Custom View</h2>
          </div>
          <div className="card-body">
            <p className="placeholder-text card-text">Custom View Report - Coming Soon!</p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default SellerAnalyticsPage;