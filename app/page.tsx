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
  orderBy 
} from "firebase/firestore"

import { db } from "../firebase" // Adjust path if needed

interface Message {
  id: string
  user: string
  avatar: string
  content: string
  timestamp: Date
  type?: "message" | "system"
}

// (Your Server, Channel, User arrays unchanged)

export default function DiscordClone() {
  const [selectedServer, setSelectedServer] = useState(servers[0])
  const [selectedChannel, setSelectedChannel] = useState(servers[0].channels[0])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [currentUser] = useState({
    name: "You",
    avatar: "/placeholder.svg?height=40&width=40",
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Firestore: Listen to messages in real-time for the selected channel
  useEffect(() => {
    // Reference to the messages collection, filter by channel
    const messagesRef = collection(db, "channels", selectedChannel.id, "messages")
    const q = query(messagesRef, orderBy("timestamp", "asc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        msgs.push({
          id: doc.id,
          user: data.user,
          avatar: data.avatar,
          content: data.content,
          timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
          type: data.type || "message",
        })
      })
      setMessages(msgs)
    })

    return () => unsubscribe()
  }, [selectedChannel])

  // Send message to Firestore
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      const messagesRef = collection(db, "channels", selectedChannel.id, "messages")

      await addDoc(messagesRef, {
        user: currentUser.name,
        avatar: currentUser.avatar,
        content: newMessage.trim(),
        timestamp: serverTimestamp(),
        type: "message",
      })

      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

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
      {/* (unchanged) */}
      {/* Channel Sidebar */}
      {/* (unchanged) */}
      {/* User Panel */}
      {/* (unchanged) */}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        {/* (unchanged) */}

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className="flex space-x-3 hover:bg-gray-700/30 p-2 rounded"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={message.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{message.user[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline space-x-2">
                    <span className="font-medium text-white">{message.user}</span>
                    <span className="text-xs text-gray-400">
                      {formatTime(message.timestamp)}
                    </span>
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
            <Button
              onClick={handleSendMessage}
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0"
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Users Sidebar */}
      {/* (unchanged) */}
    </div>
  )
}
