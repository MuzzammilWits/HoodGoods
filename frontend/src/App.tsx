import { useState } from 'react';
import './App.css';
import { createUser } from './api/user'; // make sure this path matches your actual structure

function App() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    try {
      const res = await createUser(name, email);
      setMessage(` User created with ID: ${res.id}`);
      setName('');
      setEmail('');
    } catch (err) {
      console.error(err);
      setMessage(' Failed to create user');
    }
  };

  return (
    <div className="App">
      <h1>HoodGoods User Creator</h1>
      <div className="form">
        <input
          type="text"
          placeholder="Enter name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button onClick={handleSubmit}>Create User</button>
        {message && <p>{message}</p>}
      </div>
    </div>
  );
}

export default App;
