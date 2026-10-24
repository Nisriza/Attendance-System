import React, { useState } from 'react';

export default function App() {
  const [enteredName, setEnteredName] = useState('');
  const [user, setUser] = useState(null); // or whatever state tracks if logged in

  // 1. Put the handleLogin function here
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: enteredName })
      });

      const data = await response.json();

      if (data.success) {
        // Save user data to localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user); // update state if you use it for rendering dashboard
        
        // If your app uses state-based rendering instead of routing:
        // (You can also do window.location.reload() or navigate here)
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('Login failed. Please try again.');
    }
  };

  // 2. Attach it to your form's onSubmit or button's onClick:
  return (
    <div>
      {!user ? (
        <form onSubmit={handleLogin}> {/* or onSubmit={handleLogin} */}
          <h2>Student Login</h2>
          <input 
            type="text" 
            placeholder="Enter full name" 
            value={enteredName} 
            onChange={(e) => setEnteredName(e.target.value)} 
          />
          <button type="submit">Login</button>
        </form>
      ) : (
        <div>
          <h1>Welcome, {user.name}!</h1>
          {/* Your Dashboard components go here */}
        </div>
      )}
    </div>
  );
}
