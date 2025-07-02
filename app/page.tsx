'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Hash, Send, Smile, Plus, Settings, Mic,
  Headphones, Volume2, Users, Bell, Pin,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import {
  collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, getDoc, setDoc,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { UserProfile } from '@/types';

interface Message {
  id: string;
  user: string;
  avatar: string;
  content: string;
  timestamp: Date;
  type?: 'message' | 'system';
}

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
}

interface Server {
  id: string;
  name: string;
  avatar: string;
  channels: Channel[];
}

interface User {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  activity?: string;
  // New property for voice indicator
  isSpeaking?: boolean;
  // New property to track if user is in a voice channel
  currentVoiceChannelId?: string;
}

const servers: Server[] = [
  {
    id: '1',
    name: 'Gaming Hub',
    avatar: '🎮',
    channels: [
      { id: '1', name: 'general', type: 'text' },
      { id: '2', name: 'gaming', type: 'text' },
      { id: '3', name: 'memes', type: 'text' },
      { id: '4', name: 'General Voice', type: 'voice' },
    ],
  },
  {
    id: '2',
    name: 'Dev Community',
    avatar: '💻',
    channels: [
      { id: '5', name: 'general', type: 'text' },
      { id: '6', name: 'help', type: 'text' },
      { id: '7', name: 'showcase', type: 'text' },
    ],
  },
];

// Enhanced users data to include a placeholder for voice state
const initialUsers: User[] = [
  {
    id: '1',
    name: 'Alex Chen',
    avatar: '/placeholder.svg?height=32&width=32',
    status: 'online',
    activity: 'Playing Valorant',
    currentVoiceChannelId: null, // Track the voice channel they are in
    isSpeaking: false,
  },
  {
    id: '2',
    name: 'Sarah Kim',
    avatar: '/placeholder.svg?height=32&width=32',
    status: 'online',
    currentVoiceChannelId: null,
    isSpeaking: false,
  },
  {
    id: '3',
    name: 'Mike Johnson',
    avatar: '/placeholder.svg?height=32&width=32',
    status: 'away',
    activity: 'Away',
    currentVoiceChannelId: null,
    isSpeaking: false,
  },
  {
    id: '4',
    name: 'Emma Davis',
    avatar: '/placeholder.svg?height=32&width=32',
    status: 'busy',
    activity: 'In a meeting',
    currentVoiceChannelId: null,
    isSpeaking: false,
  },
  {
    id: '5',
    name: 'Tom Wilson',
    avatar: '/placeholder.svg?height=32&width=32',
    status: 'offline',
    currentVoiceChannelId: null,
    isSpeaking: false,
  },
];

export default function DiscordClone() {
  const [selectedServer, setSelectedServer] = useState(servers[0]);
  const [selectedChannel, setSelectedChannel] = useState(servers[0].channels[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { user: authUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice chat states & refs
  const [isInVoiceChannel, setIsInVoiceChannel] = useState(false);
  const [currentVoiceChannelId, setCurrentVoiceChannelId] = useState<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // State to simulate other users' voice activity (for demonstration)
  const [voiceActiveUsers, setVoiceActiveUsers] = useState<Record<string, boolean>>({});
  const [allUsers, setAllUsers] = useState<User[]>(initialUsers); // Use a state for users

  const router = useRouter();

  // Function to update user's voice state in Firestore
  const updateUserVoiceState = useCallback(async (userId: string, channelId: string | null, isSpeaking: boolean = false) => {
    if (!userId) return;
    try {
      // In a real app, you'd update a dedicated voice state collection or user presence.
      // For this example, we'll just update the local 'allUsers' state to simulate.
      // If using Firestore, you'd do:
      // await setDoc(doc(db, 'voice_states', userId), {
      //   currentVoiceChannelId: channelId,
      //   isSpeaking: isSpeaking,
      //   lastUpdated: serverTimestamp()
      // }, { merge: true });
      setAllUsers(prevUsers => prevUsers.map(u =>
        u.id === userId
          ? { ...u, currentVoiceChannelId: channelId, isSpeaking: isSpeaking }
          : u
      ));
    } catch (error) {
      console.error("Error updating user voice state:", error);
    }
  }, []);

  // Set up audio processing for voice indicators
  useEffect(() => {
    if (localStreamRef.current && isInVoiceChannel) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(localStreamRef.current);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256; // Smaller FFT size for quicker analysis
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

      sourceNodeRef.current.connect(analyserRef.current);
      // Connect to destination to hear yourself (or for WebRTC, to send to peers)
      analyserRef.current.connect(audioContextRef.current.destination);

      const detectVoiceActivity = () => {
        if (analyserRef.current && dataArrayRef.current && authUser?.uid) {
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          const sum = dataArrayRef.current.reduce((a, b) => a + b, 0);
          const average = sum / dataArrayRef.current.length;
          const speakingThreshold = 10; // Adjust this value based on microphone sensitivity

          const currentlySpeaking = average > speakingThreshold;
          if (voiceActiveUsers[authUser.uid] !== currentlySpeaking) {
            setVoiceActiveUsers(prev => ({ ...prev, [authUser.uid]: currentlySpeaking }));
            updateUserVoiceState(authUser.uid, currentVoiceChannelId, currentlySpeaking);
          }
        }
        requestAnimationFrame(detectVoiceActivity);
      };

      detectVoiceActivity();

      return () => {
        if (sourceNodeRef.current) sourceNodeRef.current.disconnect();
        if (analyserRef.current) analyserRef.current.disconnect();
        if (audioContextRef.current) audioContextRef.current.close();
      };
    }
  }, [isInVoiceChannel, authUser?.uid, currentVoiceChannelId, voiceActiveUsers, updateUserVoiceState]);

  // Handle text channel messages
  useEffect(() => {
    if (!selectedServer || !selectedChannel) return;

    if (selectedChannel.type === 'text') {
      const messagesRef = collection(
        db,
        'servers',
        selectedServer.id,
        'channels',
        selectedChannel.id,
        'messages'
      );
      const q = query(messagesRef, orderBy('timestamp', 'asc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            user: data.user,
            avatar: data.avatar,
            content: data.content,
            timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
          } as Message;
        });
        setMessages(msgs);
      });

      return () => unsubscribe();
    } else {
      // Clear messages if switching to voice channel
      setMessages([]);
    }
  }, [selectedServer, selectedChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!authUser) return;
      const ref = doc(db, 'users', authUser.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setCurrentUser(snap.data() as UserProfile);
      }
    };
    fetchProfile();
  }, [authUser]);

  // Load persistent voice state from localStorage on initial load
  useEffect(() => {
    const savedVoiceState = localStorage.getItem('voiceState');
    if (savedVoiceState && authUser) {
      const { channelId, serverId } = JSON.parse(savedVoiceState);
      const server = servers.find(s => s.id === serverId);
      const channel = server?.channels.find(c => c.id === channelId && c.type === 'voice');
      if (server && channel) {
        setSelectedServer(server);
        setSelectedChannel(channel);
        joinVoiceChannel(channel.id);
      }
    }

    // Simulate other users' voice state updates via Firestore listener
    // In a real app, you'd listen to the 'voice_states' collection for all users
    // For this example, we'll just update a couple of dummy users
    const simulateOtherUsersVoice = setInterval(() => {
      setAllUsers(prevUsers => prevUsers.map(u => {
        // Example: Mike Johnson joins and leaves voice periodically
        if (u.id === '3') {
          const inVoice = Math.random() > 0.5;
          return { ...u, currentVoiceChannelId: inVoice ? '4' : null, isSpeaking: inVoice && Math.random() > 0.3 };
        }
        // Example: Sarah Kim is sometimes speaking if in voice
        if (u.id === '2' && u.currentVoiceChannelId === '4') {
          return { ...u, isSpeaking: Math.random() > 0.5 };
        }
        return u;
      }));
    }, 3000); // Update every 3 seconds

    return () => clearInterval(simulateOtherUsersVoice);
  }, [authUser, updateUserVoiceState]);

  // Auto-leave voice when switching channels
  useEffect(() => {
    if (isInVoiceChannel && selectedChannel.type === 'text') {
      leaveVoiceChannel();
    }
  }, [selectedChannel, isInVoiceChannel]);


  // Function to join a voice channel
  const joinVoiceChannel = async (channelId: string) => {
    if (isInVoiceChannel && currentVoiceChannelId === channelId) {
      console.log('Already in this voice channel');
      return;
    }
    // Automatically leave current voice channel if already in one
    if (isInVoiceChannel) {
      leaveVoiceChannel();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      if (audioRef.current) {
        audioRef.current.srcObject = stream;
        audioRef.current.play();
      }

      setIsInVoiceChannel(true);
      setCurrentVoiceChannelId(channelId);
      console.log(`Joined voice channel ${channelId}`);

      // Persist voice state
      if (authUser) {
        localStorage.setItem('voiceState', JSON.stringify({
          userId: authUser.uid,
          channelId: channelId,
          serverId: selectedServer.id
        }));
        updateUserVoiceState(authUser.uid, channelId, false); // Not speaking initially
      }

      // TODO: Implement signaling to connect peers here (socket.io, WebRTC peer connections, etc)
      // For demonstration, we'll just set a dummy user as speaking
      if (authUser) {
        setVoiceActiveUsers(prev => ({ ...prev, [authUser.uid]: false })); // Initialize self as not speaking
      }


    } catch (err) {
      console.error('Error accessing microphone:', err);
      setIsInVoiceChannel(false);
      setCurrentVoiceChannelId(null);
    }
  };

  // Function to leave voice channel
  const leaveVoiceChannel = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
      sourceNodeRef.current = null;
      dataArrayRef.current = null;
    }

    setIsInVoiceChannel(false);
    setCurrentVoiceChannelId(null);
    console.log('Left voice channel');

    // Remove persistent voice state
    localStorage.removeItem('voiceState');
    if (authUser) {
      updateUserVoiceState(authUser.uid, null, false);
      setVoiceActiveUsers(prev => {
        const newState = { ...prev };
        delete newState[authUser.uid];
        return newState;
      });
    }
  }, [authUser, updateUserVoiceState]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    const messagesRef = collection(
      db,
      'servers',
      selectedServer.id,
      'channels',
      selectedChannel.id,
      'messages'
    );
    await addDoc(messagesRef, {
      user: currentUser.username || 'Unknown',
      avatar: currentUser.avatarUrl || '/placeholder.svg',
      content: newMessage,
      timestamp: serverTimestamp(),
    });

    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const navigateToSettings = () => {
    router.push('/settings');
  };

  return (
    <div className="flex h-screen bg-gray-800 text-white">
      {/* Server Sidebar */}
      <div className="w-16 bg-gray-900 flex flex-col items-center py-3 space-y-2">
        {servers.map((server) => (
          <button
            key={server.id}
            onClick={() => {
              setSelectedServer(server);
              setSelectedChannel(server.channels[0]);
              setMessages([]);
              // Auto-leave voice is handled by useEffect for channel type change
            }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-200 hover:rounded-xl ${
              selectedServer.id === server.id
                ? 'bg-indigo-600 rounded-xl'
                : 'bg-gray-700 hover:bg-indigo-600'
            }`}
          >
            {server.avatar}
          </button>
        ))}
        <div className="w-8 h-0.5 bg-gray-600 rounded"></div>
        <button className="w-12 h-12 rounded-2xl bg-gray-700 hover:bg-green-600 hover:rounded-xl transition-all duration-200 flex items-center justify-center">
          <Plus size={20} />
        </button>
      </div>

      {/* Channel Sidebar */}
      <div className="w-60 bg-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-600">
          <h2 className="font-semibold text-white">{selectedServer.name}</h2>
        </div>

        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 py-1">
              Text Channels
            </div>
            {selectedServer.channels
              .filter((c) => c.type === 'text')
              .map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => {
                    setSelectedChannel(channel);
                  }}
                  className={`w-full flex items-center space-x-2 px-2 py-1 rounded text-left hover:bg-gray-600 ${
                    selectedChannel.id === channel.id ? 'bg-gray-600 text-white' : 'text-gray-300'
                  }`}
                >
                  <Hash size={16} />
                  <span>{channel.name}</span>
                </button>
              ))}
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 py-1 mt-4">
              Voice Channels
            </div>
            {selectedServer.channels
              .filter((c) => c.type === 'voice')
              .map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => {
                    setSelectedChannel(channel);
                    joinVoiceChannel(channel.id);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1 rounded text-left hover:bg-gray-600 ${
                    selectedChannel.id === channel.id && isInVoiceChannel ? 'bg-gray-600 text-white' : 'text-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Volume2 size={16} />
                    <span>{channel.name}</span>
                  </div>

                  {/* Voice indicators for other users & self */}
                  <div className="flex -space-x-1 overflow-hidden">
                    {allUsers
                      .filter(user => user.currentVoiceChannelId === channel.id)
                      .map(user => (
                        <div key={user.id} className="relative">
                          <Avatar className={`w-5 h-5 border-2 ${user.isSpeaking ? 'border-green-500' : 'border-transparent'}`}>
                            <AvatarImage src={user.avatar || '/placeholder.svg'} />
                            <AvatarFallback>{user.name[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          {user.isSpeaking && (
                            <span className="absolute top-0 right-0 block h-1.5 w-1.5 rounded-full ring-2 ring-gray-700 bg-green-500 animate-pulse" />
                          )}
                        </div>
                      ))}
                  </div>
                </button>
              ))}
          </div>
        </ScrollArea>

        {/* User Panel */}
        <div className="p-2 bg-gray-800 flex items-center space-x-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={currentUser?.avatarUrl || '/placeholder.svg'} />
            <AvatarFallback>{currentUser?.username?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{currentUser?.username || 'Guest'}</div>
            <div className="text-xs text-gray-400">#1234</div>
          </div>
          <div className="flex space-x-1">
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              <Mic size={16} />
            </Button>
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              <Headphones size={16} />
            </Button>
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0" onClick={navigateToSettings}>
              <Settings size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="h-12 border-b border-gray-600 flex items-center px-4 space-x-2">
          <Hash size={20} className="text-gray-400" />
          <span className="font-semibold">{selectedChannel.name}</span>
          <div className="flex-1"></div>
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              <Bell size={16} />
            </Button>
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              <Pin size={16} />
            </Button>
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              <Users size={16} />
            </Button>
            <div className="w-40">
              <Input placeholder="Search" className="h-6 text-sm bg-gray-900 border-none" />
            </div>
          </div>
        </div>

        {/* Messages */}
        {selectedChannel.type === 'text' ? (
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="flex space-x-3 hover:bg-gray-700/30 p-2 rounded">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={message.avatar || '/placeholder.svg'} />
                    <AvatarFallback>{message.user[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline space-x-2">
                      <span className="font-medium text-white">{message.user}</span>
                      <span className="text-xs text-gray-400">{formatTime(message.timestamp)}</span>
                    </div>
                    <p className="text-gray-100 mt-1">{message.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center text-gray-400">
            <p>You are connected to voice channel: <strong>{selectedChannel.name}</strong></p>
            <Button
              onClick={leaveVoiceChannel}
              variant="destructive"
              className="mt-4 px-6"
            >
              Leave Voice Channel
            </Button>
            {/* Hidden audio element to play mic audio locally */}
            <audio ref={audioRef} autoPlay muted className="hidden" />
            <div className="mt-4 text-sm text-gray-500">
              {/* This section would display other users in the voice channel with their speaking indicators */}
              <p className="font-semibold text-white mb-2">Users in Voice Channel:</p>
              <div className="flex flex-wrap justify-center gap-4">
                {allUsers
                  .filter(user => user.currentVoiceChannelId === selectedChannel.id)
                  .map(user => (
                    <div key={user.id} className="flex flex-col items-center">
                      <div className="relative">
                        <Avatar className={`w-12 h-12 border-4 ${user.isSpeaking ? 'border-green-500' : 'border-transparent'}`}>
                          <AvatarImage src={user.avatar || '/placeholder.svg'} />
                          <AvatarFallback>{user.name[0]}</AvatarFallback>
                        </Avatar>
                        {user.isSpeaking && (
                          <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-gray-700 bg-green-500 animate-pulse" />
                        )}
                      </div>
                      <span className="mt-2 text-white text-sm">{user.name}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Input (only for text channels) */}
        {selectedChannel.type === 'text' && (
          <div className="p-4">
            <div className="flex items-center space-x-2 bg-gray-600 rounded-lg p-3">
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                <Plus size={16} />
              </Button>
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Message #${selectedChannel.name}`}
                className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-gray-400"
              />
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                <Smile size={16} />
              </Button>
              <Button onClick={handleSendMessage} variant="ghost" size="sm" className="w-8 h-8 p-0">
                <Send size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Users Sidebar */}
      <div className="w-60 bg-gray-700 p-4">
        <div className="space-y-4">
          {/* Online Users */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Online — {allUsers.filter((u) => u.status === 'online').length}
            </div>
            <div className="space-y-2">
              {allUsers
                .filter((u) => u.status === 'online')
                .map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-2 p-1 rounded hover:bg-gray-600"
                  >
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.avatar || '/placeholder.svg'} />
                        <AvatarFallback>{user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-700 ${getStatusColor(
                          user.status
                        )}`}
                      ></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{user.name}</div>
                      {user.activity && (
                        <div className="text-xs text-gray-400 truncate">{user.activity}</div>
                      )}
                      {user.currentVoiceChannelId && (
                        <div className="text-xs text-gray-400 flex items-center">
                          <Volume2 size={12} className="mr-1" />
                          In voice: {selectedServer.channels.find(c => c.id === user.currentVoiceChannelId)?.name}
                          {user.isSpeaking && (
                            <span className="ml-1 block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Away Users */}
          {allUsers.some((u) => u.status === 'away' || u.status === 'busy') && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Away — {allUsers.filter((u) => u.status === 'away' || u.status === 'busy').length}
              </div>
              <div className="space-y-2">
                {allUsers
                  .filter((u) => u.status === 'away' || u.status === 'busy')
                  .map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-2 p-1 rounded hover:bg-gray-600"
                    >
                      <div className="relative">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.avatar || '/placeholder.svg'} />
                          <AvatarFallback>{user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-700 ${getStatusColor(
                            user.status
                          )}`}
                        ></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-300 truncate">{user.name}</div>
                        {user.activity && (
                          <div className="text-xs text-gray-400 truncate">{user.activity}</div>
                        )}
                        {user.currentVoiceChannelId && (
                          <div className="text-xs text-gray-400 flex items-center">
                            <Volume2 size={12} className="mr-1" />
                            In voice: {selectedServer.channels.find(c => c.id === user.currentVoiceChannelId)?.name}
                            {user.isSpeaking && (
                              <span className="ml-1 block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Offline Users */}
          {allUsers.some((u) => u.status === 'offline') && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Offline — {allUsers.filter((u) => u.status === 'offline').length}
              </div>
              <div className="space-y-2">
                {allUsers
                  .filter((u) => u.status === 'offline')
                  .map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-2 p-1 rounded hover:bg-gray-600 opacity-50"
                    >
                      <div className="relative">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.avatar || '/placeholder.svg'} />
                          <AvatarFallback>{user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-700 ${getStatusColor(
                            user.status
                          )}`}
                        ></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-400 truncate">{user.name}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}