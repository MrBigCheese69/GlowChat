// components/SignUpForm.tsx
'use client';

import { useState } from 'react';

export default function SignUpForm() {
  const [username, setUsername] = useState('');

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    // handle signup logic
  };

  return (
    <form onSubmit={handleSignup} className="space-y-4 max-w-md mx-auto p-4">
      <input
        type="text"
        placeholder="Username"
        className="w-full px-4 py-2 rounded"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
        Sign Up
      </button>
    </form>
  );
}
