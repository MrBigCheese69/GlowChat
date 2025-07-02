'use client';
import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', res.user.uid), {
        uid: res.user.uid,
        email,
        username,
        avatarUrl: '',
        bio: ''
      });
      router.push('/chat');
    } catch (err) {
      console.error('Signup failed:', err);
    }
  };

  return (
    <form onSubmit={handleSignup} className="space-y-4 max-w-md mx-auto p-4">
      <input
        type="text"
        placeholder="Username"
        className="w-full p-2 border rounded"
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="email"
        placeholder="Email"
        className="w-full p-2 border rounded"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full p-2 border rounded"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">
        Sign Up
