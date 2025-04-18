import React from 'react';

const CreateYourStore: React.FC = () => {

  const handleCreateStore = async () => {
    const token = sessionStorage.getItem('access_token');
    try {
      // Change to your local URL for testing
      const response = await fetch('http://localhost:3000/auth/promote-to-seller', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert('You are now a seller!');
        // ✅ Force reload and redirect to homepage
        window.location.href = '/'; // This will reload the page and fetch the updated role
      } else {
        alert('Failed to become seller');
      }
    } catch (err) {
      console.error('❌ Error promoting to seller:', err);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Create Your Store</h2>
      <p>This is a placeholder. Click below to simulate store creation and become a seller.</p>
      <button onClick={handleCreateStore}>Create Store</button>
    </div>
  );
};

export default CreateYourStore;
