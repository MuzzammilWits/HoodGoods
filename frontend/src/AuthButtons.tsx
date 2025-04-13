import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';

export default function AuthButtons() {
  const {
    loginWithRedirect,
    logout,
    isAuthenticated,
    user,
    getAccessTokenSilently,
  } = useAuth0();

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const token = await getAccessTokenSilently();
        sessionStorage.setItem('access_token', token);
        console.log("✅ Access Token:", token);
      } catch (e) {
        console.error("❌ Error getting token:", e);
      }
    };

    if (isAuthenticated) {
      fetchToken();
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  return (
    <section>
      {!isAuthenticated ? (
        <button onClick={() => loginWithRedirect()}>Log In</button>
      ) : (
        <div>
          <p>Hello, {user?.name}!</p>
          <button
            onClick={() =>
              logout({
                logoutParams: { returnTo: window.location.origin },
              })
            }
          >
            Log Out
          </button>
        </div>
      )}
    </section>
  );
}
