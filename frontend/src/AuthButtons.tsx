import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthButtons() {
  const {
    loginWithRedirect,
    logout,
    isAuthenticated,
    user,
    getAccessTokenSilently,
  } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await getAccessTokenSilently();
        sessionStorage.setItem('access_token', token);
        
        // Debug: Print critical info
        console.log('🔐 Token:', token);
        console.log('👤 User:', user);
        console.log('🔄 app_metadata:', user?.app_metadata);
        
        // Case-sensitive role check
        if (user?.app_metadata?.roles?.includes('Admin')) { // ← Changed to 'Admin'
          console.log('🛎️ Redirecting admin');
          navigate('/admin-dashboard');
        }
      } catch (e) {
        console.error("❌ Auth error:", e);
      }
    };

    if (isAuthenticated) {
      checkAuth();
    }
  }, [isAuthenticated, getAccessTokenSilently, user, navigate]);

  return (
    <section>
      {!isAuthenticated ? (
        <button onClick={() => loginWithRedirect()}>Log In</button>
      ) : (
        <div>
          {user?.app_metadata?.roles?.includes('Admin') ? (
            <p>Welcome Admin!</p>
          ) : (
            <p>Hello, {user?.name}!</p>
          )}
          <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
            Log Out
          </button>
        </div>
      )}
    </section>
  );
}