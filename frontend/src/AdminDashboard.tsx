import { useAuth0 } from '@auth0/auth0-react';
import { Navigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { user, logout } = useAuth0();
  const isAdmin = user?.app_metadata?.roles?.includes('Admin');

  if (!isAdmin) {
    return <Navigate to="/admin-dashboard" />; // Redirect non-admins
  }

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Admin Dashboard</h1>
      <button 
        onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
        style={{ 
          padding: '0.5rem 1rem',
          background: '#ff4444', 
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          marginTop: '1rem'
        }}
      >
        Log Out
      </button>
    </div>
  );
}