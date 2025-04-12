export const createUser = async (name: string, email: string) => {
    const res = await fetch('http://localhost:3000/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });
  
    if (!res.ok) throw new Error('Failed to create user');
    return res.json();
  };
  