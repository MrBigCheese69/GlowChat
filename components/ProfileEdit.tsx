'use client';
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { updateDoc, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { UserProfile } from '../types';

export default function ProfileEdit() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      }
      setLoading(false);
    };
    loadProfile();
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    const ref = doc(db, 'users', user.uid);
    await updateDoc(ref, {
      username: profile.username,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio
    });
    alert('Profile updated!');
  };

  if (loading || !profile) return <p>Loading profile...</p>;

  return (
    <form onSubmit={handleUpdate} className="space-y-4 max-w-md mx-auto p-4">
      <input
        type="text"
        placeholder="Username"
        value={profile.username}
        onChange={(e) => setProfile({ ...profile, username: e.target.value })}
        className="w-full p-2 border rounded"
      />
      <input
        type="text"
        placeholder="Avatar URL"
        value={profile.avatarUrl}
        onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })}
        className="w-full p-2 border rounded"
      />
      <textarea
        placeholder="Bio"
        value={profile.bio}
        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
        className="w-full p-2 border rounded"
      />
      <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded">
        Save Changes
      </button>
    </form>
  );
}
