"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Hash,
  Send,
  Smile,
  Plus,
  Settings,
  Mic,
  Headphones,
  Volume2,
  Users,
  Bell,
  Pin,
} from "lucide-react"

import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore"
import { db } from "@/firebase" // adjust this path if needed

interface Message {
  id: string
  user: string
  avatar: string
  content: string
  timestamp: Date
  type?: "message" | "system"
}

interface Channel {
  id: string
  name: string
  type: "text" | "voice"
}

interface Server {
  id: string
  name: string
  avatar: string
  channels: Channel[]
}

interface User {
  id: string
  name: string
  avatar: string
  status: "online" | "away" | "busy" | "offline"
  activity?: string
}

const servers: Server[] = [
  {
    id: "1",
    name: "Gaming Hub",
    avatar: "🎮",
    channels: [
      { id: "1", name: "general", type: "text" },
      { id: "2", name: "gaming", type: "text" },
      { id: "3", name: "memes", type: "text" },
      { id: "4", name: "General Voice", type: "voice" },
    ],
  },
  {
    id: "2",
    name: "Dev Community",
    avatar: "💻",
    channels: [
      { id: "5", name: "general", type: "text" },
      { id: "6", name: "help", type: "text" },
      { id: "7", name: "showcase", type: "text" },
    ],
  },
]

const users: User[] = [
  {
    id: "1",
    name: "Alex Chen",
    avatar: "/placeholder.svg?height=32&width=32",
    status: "online",
    activity: "Playing Valorant",
  },
  { id: "2", name: "Sarah Kim", avatar: "/placeholder.svg?height=32&width=32", status: "online" },
  { id: "3", name: "Mike Johnson", avatar: "/placeholder.svg?height=32&width=32", status: "away", activity: "Away" },
  {
    id: "4",
    name: "Emma Davis",
    avatar: "/placeholder.svg?height=32&width=32",
    status: "busy",
    activity: "In a meeting",
  },
  { id: "5", name: "Tom Wilson", avatar: "/placeholder.svg?height=32&width=32", status: "offline" },
]

export default function DiscordClone() {
  const [selectedServer, setSelectedServer] = useState(servers[0])
  const [selectedChannel, setSelectedChannel] = useState(servers[0].channels[0])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [currentUser] = useState({ name: "You", avatar: "/placeholder.svg?height=40&width=40" })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedServer || !selectedChannel) return

    // Firestore path: servers/{serverId}/channels/{channelId}/messages
    const messagesRef = collection(db, "servers", selectedServer.id, "channels", selectedChannel.id, "messages")
    const q = query(messagesRef, orderBy("timestamp", "asc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          user: data.user,
          avatar: data.avatar,
          content: data.content,
          timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
        } as Message
      })
      setMessages(msgs)
    })

    return () => unsubscribe()
  }, [selectedServer, selectedChannel])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    const messagesRef = collection(db, "servers", selectedServer.id, "channels", selectedChannel.id, "messages")
    await addDoc(messagesRef, {
      user: currentUser.name,
      avatar: currentUser.avatar,
      content: newMessage,
      timestamp: serverTimestamp(),
    })

    setNewMessage("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "away":
        return "bg-yellow-500"
      case "busy":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="flex h-screen bg-gray-800 text-white">
      {/* Server Sidebar */}
      <div className="w-16 bg-gray-900 flex flex-col items-center py-3 space-y-2">
        {servers.map((server) => (
          <button
            key={server.id}
            onClick={() => {
              setSelectedServer(server)
              setSelectedChannel(server.channels[0])
            }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-200 hover:rounded-xl ${
              selectedServer.id === server.id ? "bg-indigo-600 rounded-xl" : "bg-gray-700 hover:bg-indigo-600"
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
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 py-1">Text Channels</div>
            {selectedServer.channels
              .filter((c) => c.type === "text")
              .map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel)}
                  className={`w-full flex items-center space-x-2 px-2 py-1 rounded text-left hover:bg-gray-600 ${
                    selectedChannel.id === channel.id ? "bg-gray-600 text-white" : "text-gray-300"
                  }`}
                >
                  <Hash size={16} />
                  <span>{channel.name}</span>
                </button>
              ))}

            {selectedServer.channels.some((c) => c.type === "voice") && (
              <>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 py-1 mt-4">
                  Voice Channels
                </div>
                {selectedServer.channels
                  .filter((c) => c.type === "voice")
                  .map((channel) => (
                    <button
                      key={channel.id}
                      className="w-full flex items-center space-x-2 px-2 py-1 rounded text-left hover:bg-gray-600 text-gray-300"
                    >
                      <Volume2 size={16} />
                      <span>{channel.name}</span>
                    </button>
                  ))}
              </>
            )}
          </div>
        </ScrollArea>

        {/* User Panel */}
        <div className="p-2 bg-gray-800 flex items-center space-x-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={currentUser.avatar || "/placeholder.svg"} />
            <AvatarFallback>You</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{currentUser.name}</div>
            <div className="text-xs text-gray-400">#1234</div>
          </div>
          <div className="flex space-x-1">
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              <Mic size={16} />
            </Button>
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              <Headphones size={16} />
            </Button>
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
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
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="flex space-x-3 hover:bg-gray-700/30 p-2 rounded">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={message.avatar || "/placeholder.svg"} />
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

        {/* Message Input */}
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
      </div>

      {/* Users Sidebar */}
      <div className="w-60 bg-gray-700 p-4">
        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Online — {users.filter((u) => u.status === "online").length}
            </div>
            <div className="space-y-2">
              {users
                .filter((u) => u.status === "online")
                .map((user) => (
                  <div key={user.id} className="flex items-center space-x-2 p-1 rounded hover:bg-gray-600">
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.avatar || "/placeholder.svg"} />
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
                      {user.activity && <div className="text-xs text-gray-400 truncate">{user.activity}</div>}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {users.some((u) => u.status !== "online" && u.status !== "offline") && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Away — {users.filter((u) => u.status === "away" || u.status === "busy").length}
              </div>
              <div className="space-y-2">
                {users
                  .filter((u) => u.status === "away" || u.status === "busy")
                  .map((user) => (
                    <div key={user.id} className="flex items-center space-x-2 p-1 rounded hover:bg-gray-600">
                      <div className="relative">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.avatar || "/placeholder.svg"} />
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
                        {user.activity && <div className="text-xs text-gray-400 truncate">{user.activity}</div>}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {users.some((u) => u.status === "offline") && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Offline — {users.filter((u) => u.status === "offline").length}
              </div>
              <div className="space-y-2">
                {users
                  .filter((u) => u.status === "offline")
                  .map((user) => (
                    <div key={user.id} className="flex items-center space-x-2 p-1 rounded hover:bg-gray-600">
                      <div className="relative">
                        <Avatar className="w-8 h-8 opacity-50">
                          <AvatarImage src={user.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-700 bg-gray-500"></div>
                      </div>
                      <div className="flex-1 min-w-0 opacity-50">
                        <div className="text-sm font-medium truncate">{user.name}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
