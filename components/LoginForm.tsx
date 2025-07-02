// components/LoginForm.tsx
'use client';

import React, { useState } from 'react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Add auth logic here
    console.log('Logging in with:', { email, password });
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4 max-w-md w-full p-4 bg-gray-900 rounded-lg">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
        className="w-full p-2 rounded text-black"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
        className="w-full p-2 rounded text-black"
      />
      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded">
        Login
      </button>
    </form>
  );
}
