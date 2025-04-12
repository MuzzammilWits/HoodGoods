import { Auth0Provider } from '@auth0/auth0-react';  
import AuthButtons from './AuthButtons.tsx';  

function App() {  
  return (  
    <Auth0Provider  
      domain={import.meta.env.VITE_AUTH0_DOMAIN}  
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}  
      authorizationParams={{  
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,  
        redirect_uri: import.meta.env.VITE_AUTH0_CALLBACK_URL,  
      }}  
    >  
      <main>  
        <h1>Welcome to HoodGoods</h1>  
        <AuthButtons />  
      </main>  
    </Auth0Provider>  
  );  
}  

export default App;  