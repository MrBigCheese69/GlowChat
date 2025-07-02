"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Keyboard,
  Bell,
  Shield,
  Palette,
  Settings,
  Upload,
  Save,
  Mic,
  Speaker,
  Camera,
  ChevronRight,
} from "lucide-react"

interface SettingsCategory {
  id: string
  name: string
  icon: React.ReactNode
  description: string
}

const settingsCategories: SettingsCategory[] = [
  { id: "profile", name: "My Account", icon: <User size={20} />, description: "Profile and account settings" },
  { id: "audio", name: "Voice & Video", icon: <Mic size={20} />, description: "Audio and video settings" },
  { id: "keybinds", name: "Keybinds", icon: <Keyboard size={20} />, description: "Keyboard shortcuts" },
  { id: "notifications", name: "Notifications", icon: <Bell size={20} />, description: "Notification preferences" },
  { id: "privacy", name: "Privacy & Safety", icon: <Shield size={20} />, description: "Privacy and safety settings" },
  { id: "appearance", name: "Appearance", icon: <Palette size={20} />, description: "Theme and display settings" },
  { id: "advanced", name: "Advanced", icon: <Settings size={20} />, description: "Advanced settings" },
]

export default function SettingsPage() {
  const [activeCategory, setActiveCategory] = useState("profile")
  const [profileData, setProfileData] = useState({
    username: "YourUsername",
    displayName: "Your Display Name",
    email: "your.email@example.com",
    bio: "Hey there! I'm using this awesome chat app.",
    status: "online",
    avatar: "/placeholder.svg?height=80&width=80",
  })

  const [audioSettings, setAudioSettings] = useState({
    inputVolume: [75],
    outputVolume: [80],
    micSensitivity: [60],
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true, // New state for auto gain control
    inputDevice: "default",
    outputDevice: "default",
    cameraDevice: "default",
  })

  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([])
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([])
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([])

  // State for mic test
  const [micLevel, setMicLevel] = useState(0) // 0-100 for visual bar
  const [isMicTestRunning, setIsMicTestRunning] = useState(false) // New state to control test start/stop

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const [keybinds, setKeybinds] = useState([
    { action: "Push to Talk", key: "T", description: "Hold to transmit voice" },
    { action: "Mute/Unmute", key: "Ctrl+M", description: "Toggle microphone" },
    { action: "Deafen/Undeafen", key: "Ctrl+D", description: "Toggle audio output" },
    { action: "Toggle Settings", key: "Ctrl+,", description: "Open settings menu" },
    { action: "Search", key: "Ctrl+K", description: "Search messages and channels" },
  ])

  const [notifications, setNotifications] = useState({
    desktopNotifications: true,
    soundNotifications: true,
    messageNotifications: true,
    mentionNotifications: true,
    dmNotifications: true,
    serverNotifications: true,
    notificationSound: "default",
    quietHours: false,
    quietStart: "22:00",
    quietEnd: "08:00",
  })

  const [privacy, setPrivacy] = useState({
    directMessages: "friends",
    friendRequests: "everyone",
    serverInvites: "friends",
    showActivity: true,
    showOnlineStatus: true,
    readReceipts: true,
    typingIndicator: true,
  })

  const [appearance, setAppearance] = useState({
    theme: "dark",
    messageDisplay: "cozy",
    fontSize: [14],
    zoomLevel: [100],
    showAvatars: true,
    showEmojis: true,
    compactMode: false,
    developerMode: false,
  })

  // Function to get media devices
  const getMediaDevices = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      console.warn("enumerateDevices() not supported.")
      return
    }

    try {
      // Request media stream to get device labels (permissions)
      // We don't necessarily need the stream itself, just the permission check
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() => {
        console.warn("Microphone and/or camera permission denied. Device names may not be available.")
      })

      const devices = await navigator.mediaDevices.enumerateDevices()

      const audioInput = devices.filter((device) => device.kind === "audioinput")
      const audioOutput = devices.filter((device) => device.kind === "audiooutput")
      const videoInput = devices.filter((device) => device.kind === "videoinput")

      setInputDevices(audioInput)
      setOutputDevices(audioOutput)
      setCameraDevices(videoInput)

      // Set default selected devices if they were "default" and now specific devices are available
      if (audioInput.length > 0 && audioSettings.inputDevice === "default") {
        setAudioSettings(prev => ({ ...prev, inputDevice: audioInput[0].deviceId }));
      }
      if (audioOutput.length > 0 && audioSettings.outputDevice === "default") {
        setAudioSettings(prev => ({ ...prev, outputDevice: audioOutput[0].deviceId }));
      }
      if (videoInput.length > 0 && audioSettings.cameraDevice === "default") {
        setAudioSettings(prev => ({ ...prev, cameraDevice: videoInput[0].deviceId }));
      }

    } catch (err) {
      console.error("Error enumerating devices:", err)
    }
  }

  // --- Mic Test Functions ---

  const startMicTest = async () => {
    // Ensure we're in the audio settings and an input device is selected
    if (activeCategory !== "audio" || audioSettings.inputDevice === "no-devices" || audioSettings.inputDevice === "default") {
      console.warn("Cannot start mic test: Not in audio settings or no device selected.");
      return;
    }

    // Stop any previously running test cleanly
    stopMicTest();

    try {
      // 1. Create (or get existing) AudioContext and AnalyserNode
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;

      if (audioContext.state === 'suspended') {
        await audioContext.resume(); // Ensure AudioContext is running
      }

      if (!analyserRef.current) {
        analyserRef.current = audioContext.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.8; // Smooth out rapid changes
      }
      const analyser = analyserRef.current;

      // 2. Get MediaStream from the selected device with initial constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: audioSettings.inputDevice }, // Use exact device ID
          echoCancellation: audioSettings.echoCancellation,
          noiseSuppression: audioSettings.noiseSuppression,
          autoGainControl: audioSettings.autoGainControl, // Apply AGC constraint
          // Volume constraint can also be applied here, but we'll apply it to the track for dynamic changes
        },
      });
      mediaStreamRef.current = stream;

      // Apply initial volume based on settings
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const volumeValue = audioSettings.inputVolume[0] / 100; // Normalize to 0-1
        const sensitivityValue = audioSettings.micSensitivity[0] / 100; // Normalize to 0-1

        audioTrack.applyConstraints({
          volume: audioSettings.autoGainControl ? undefined : (volumeValue * sensitivityValue),
          // If AGC is true, let it handle volume. Otherwise, apply combined manual volume/sensitivity.
        }).catch(e => console.error("Error applying volume constraints on start:", e));
      }

      // 3. Connect MediaStream to AnalyserNode
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // 4. Start analysis loop
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMicLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        // Map average (0-255) to 0-100, clamped
        setMicLevel(Math.min(100, Math.max(0, Math.floor((average / 255) * 100))));
        animationFrameRef.current = requestAnimationFrame(updateMicLevel);
      };

      animationFrameRef.current = requestAnimationFrame(updateMicLevel);
      setIsMicTestRunning(true); // Set test to running

    } catch (err) {
      console.error("Error starting mic test:", err);
      setMicLevel(0); // Reset level on error
      setIsMicTestRunning(false); // Ensure test state is off
      alert("Could not start microphone test. Please ensure microphone permissions are granted and a device is selected.");
    }
  };

  const stopMicTest = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    // Only close AudioContext if it exists and is not already closed
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().then(() => {
        audioContextRef.current = null;
      }).catch(e => console.error("Error closing AudioContext:", e));
    }
    setMicLevel(0);
    setIsMicTestRunning(false); // Set test to stopped
  };

  // Effect to manage device enumeration and global cleanup
  useEffect(() => {
    getMediaDevices(); // Initial device scan
    navigator.mediaDevices.addEventListener('devicechange', getMediaDevices);

    // Cleanup: stop mic test and remove event listener when component unmounts
    return () => {
      stopMicTest(); // Ensure mic test is stopped on unmount
      navigator.mediaDevices.removeEventListener('devicechange', getMediaDevices);
    };
  }, []); // Run once on mount

  // Effect to stop mic test when category changes away from audio
  useEffect(() => {
    if (activeCategory !== "audio" && isMicTestRunning) {
      stopMicTest();
    }
  }, [activeCategory, isMicTestRunning]);

  // New Effect: Apply constraints when slider values or audio settings change
  useEffect(() => {
    if (isMicTestRunning && mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        const volumeValue = audioSettings.inputVolume[0] / 100; // Normalize to 0-1
        const sensitivityValue = audioSettings.micSensitivity[0] / 100; // Normalize to 0-1

        const constraints: MediaTrackConstraints = {
          echoCancellation: audioSettings.echoCancellation,
          noiseSuppression: audioSettings.noiseSuppression,
          autoGainControl: audioSettings.autoGainControl,
        };

        // Only apply volume constraint if autoGainControl is false
        if (!audioSettings.autoGainControl) {
            constraints.volume = volumeValue * sensitivityValue;
        }

        audioTrack.applyConstraints(constraints)
          .catch(e => console.error("Error applying media track constraints:", e));
      }
    }
  }, [
    audioSettings.inputVolume,
    audioSettings.micSensitivity,
    audioSettings.noiseSuppression,
    audioSettings.echoCancellation,
    audioSettings.autoGainControl,
    isMicTestRunning,
  ]);


  // --- Handlers for button actions ---

  const handleUploadAvatar = () => {
    alert("Functionality to upload avatar goes here!")
  }

  const handleChangeKeybind = (index: number) => {
    const newKey = prompt(`Change key for "${keybinds[index].action}"? Current: ${keybinds[index].key}`)
    if (newKey) {
      const updatedKeybinds = [...keybinds]
      updatedKeybinds[index].key = newKey
      setKeybinds(updatedKeybinds)
      alert(`Keybind for "${keybinds[index].action}" changed to "${newKey}".`)
    }
  }

  const handleClearCache = () => {
    const confirmed = confirm("Are you sure you want to clear the application cache? This action cannot be undone.")
    if (confirmed) {
      alert("Application cache cleared!")
    }
  }

  const handleExportData = () => {
    alert("Functionality to export user data goes here!")
  }

  const handleDeleteAccount = () => {
    const confirmed = confirm(
      "WARNING: Are you absolutely sure you want to delete your account? This action is irreversible!",
    )
    if (confirmed) {
      alert("Account deletion initiated. Goodbye!")
    }
  }

  const handleResetToDefault = () => {
    const confirmed = confirm("Are you sure you want to reset all settings to their default values?")
    if (confirmed) {
      setProfileData({
        username: "YourUsername",
        displayName: "Your Display Name",
        email: "your.email@example.com",
        bio: "Hey there! I'm using this awesome chat app.",
        status: "online",
        avatar: "/placeholder.svg?height=80&width=80",
      })
      setAudioSettings({
        inputVolume: [75],
        outputVolume: [80],
        micSensitivity: [60],
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: true,
        inputDevice: "default",
        outputDevice: "default",
        cameraDevice: "default",
      })
      setKeybinds([
        { action: "Push to Talk", key: "T", description: "Hold to transmit voice" },
        { action: "Mute/Unmute", key: "Ctrl+M", description: "Toggle microphone" },
        { action: "Deafen/Undeafen", key: "Ctrl+D", description: "Toggle audio output" },
        { action: "Toggle Settings", key: "Ctrl+,", description: "Open settings menu" },
        { action: "Search", key: "Ctrl+K", description: "Search messages and channels" },
      ])
      setNotifications({
        desktopNotifications: true,
        soundNotifications: true,
        messageNotifications: true,
        mentionNotifications: true,
        dmNotifications: true,
        serverNotifications: true,
        notificationSound: "default",
        quietHours: false,
        quietStart: "22:00",
        quietEnd: "08:00",
      })
      setPrivacy({
        directMessages: "friends",
        friendRequests: "everyone",
        serverInvites: "friends",
        showActivity: true,
        showOnlineStatus: true,
        readReceipts: true,
        typingIndicator: true,
      })
      setAppearance({
        theme: "dark",
        messageDisplay: "cozy",
        fontSize: [14],
        zoomLevel: [100],
        showAvatars: true,
        showEmojis: true,
        compactMode: false,
        developerMode: false,
      })
      alert("All settings have been reset to default values.")
    }
  }

  const handleSaveChanges = () => {
    const currentSettings = {
      profileData,
      audioSettings,
      keybinds,
      notifications,
      privacy,
      appearance,
    }
    console.log("Saving changes:", currentSettings)
    alert("Settings saved successfully!")
  }

  // --- Render functions (modifications for audio/video selects) ---

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your profile details and avatar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profileData.avatar || "/placeholder.svg"} />
              <AvatarFallback>{profileData.username[0]}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="flex items-center space-x-2 bg-transparent"
                onClick={handleUploadAvatar}
              >
                <Upload size={16} />
                <span>Change Avatar</span>
              </Button>
              <p className="text-sm text-gray-400">JPG, PNG or GIF. Max size 8MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={profileData.username}
                onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={profileData.displayName}
                onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">About Me</Label>
            <Textarea
              id="bio"
              value={profileData.bio}
              onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
              placeholder="Tell others about yourself..."
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={profileData.status}
              onValueChange={(value) => setProfileData({ ...profileData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">🟢 Online</SelectItem>
                <SelectItem value="away">🟡 Away</SelectItem>
                <SelectItem value="busy">🔴 Do Not Disturb</SelectItem>
                <SelectItem value="invisible">⚫ Invisible</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderAudioSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mic size={20} />
            <span>Microphone</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="input-device-select">Input Device</Label>
            <Select
              value={audioSettings.inputDevice}
              onValueChange={(value) => {
                setAudioSettings({ ...audioSettings, inputDevice: value });
                // If the device changes, stop the current test to prepare for new one
                stopMicTest();
              }}
            >
              <SelectTrigger id="input-device-select">
                <SelectValue placeholder="Select an input device" />
              </SelectTrigger>
              <SelectContent>
                {inputDevices.length > 0 ? (
                  inputDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone (${device.deviceId.substring(0, 8)}...)`}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-devices" disabled>
                    No input devices found. Grant microphone access.
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Microphone Test Bar */}
          <div className="space-y-2">
            <Label>Mic Test</Label>
            <div className="w-full h-8 bg-gray-700 rounded-md overflow-hidden relative">
              <div
                className="h-full bg-green-500 transition-all duration-75 ease-linear"
                style={{ width: `${micLevel}%` }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white">
                {isMicTestRunning ? `${micLevel}%` : "Test stopped"}
              </div>
            </div>
            <Button
              onClick={isMicTestRunning ? stopMicTest : startMicTest}
              disabled={audioSettings.inputDevice === "default" || audioSettings.inputDevice === "no-devices"}
              className="w-full"
            >
              {isMicTestRunning ? "Stop Mic Test" : "Start Mic Test"}
            </Button>
            {(audioSettings.inputDevice === "default" || audioSettings.inputDevice === "no-devices") && (
                <p className="text-sm text-gray-400 mt-2">
                    Please select a specific input device to start the mic test.
                </p>
            )}
            {!isMicTestRunning && (
                <p className="text-sm text-gray-400 mt-2">
                    Press "Start Mic Test" and speak into your microphone.
                </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Input Volume: {audioSettings.inputVolume[0]}%</Label>
            <Slider
              value={audioSettings.inputVolume}
              onValueChange={(value) => setAudioSettings({ ...audioSettings, inputVolume: value })}
              max={100}
              step={1}
              className="w-full"
              disabled={!isMicTestRunning || !audioSettings.autoGainControl} // Disable if AGC is off, as sensitivity takes over
            />
             {!audioSettings.autoGainControl && (
                <p className="text-sm text-gray-400">
                    Input Volume is controlled by Microphone Sensitivity when Automatic Gain Control is off.
                </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Microphone Sensitivity: {audioSettings.micSensitivity[0]}%</Label>
            <Slider
              value={audioSettings.micSensitivity}
              onValueChange={(value) => setAudioSettings({ ...audioSettings, micSensitivity: value })}
              max={100}
              step={1}
              className="w-full"
              disabled={!isMicTestRunning || audioSettings.autoGainControl} // Disable if AGC is on
            />
            {audioSettings.autoGainControl && (
                <p className="text-sm text-gray-400">
                    Microphone Sensitivity is controlled by Automatic Gain Control. Turn AGC off to adjust manually.
                </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-gain-control">Automatic Gain Control (AGC)</Label>
            <Switch
              id="auto-gain-control"
              checked={audioSettings.autoGainControl}
              onCheckedChange={(checked) => {
                setAudioSettings({ ...audioSettings, autoGainControl: checked });
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="noise-suppression">Noise Suppression</Label>
            <Switch
              id="noise-suppression"
              checked={audioSettings.noiseSuppression}
              onCheckedChange={(checked) => setAudioSettings({ ...audioSettings, noiseSuppression: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="echo-cancellation">Echo Cancellation</Label>
            <Switch
              id="echo-cancellation"
              checked={audioSettings.echoCancellation}
              onCheckedChange={(checked) => setAudioSettings({ ...audioSettings, echoCancellation: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Speaker size={20} />
            <span>Speakers</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="output-device-select">Output Device</Label>
            <Select
              value={audioSettings.outputDevice}
              onValueChange={(value) => setAudioSettings({ ...audioSettings, outputDevice: value })}
            >
              <SelectTrigger id="output-device-select">
                <SelectValue placeholder="Select an output device" />
              </SelectTrigger>
              <SelectContent>
                {outputDevices.length > 0 ? (
                  outputDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Speaker (${device.deviceId.substring(0, 8)}...)`}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-devices" disabled>
                    No output devices found.
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Output Volume: {audioSettings.outputVolume[0]}%</Label>
            <Slider
              value={audioSettings.outputVolume}
              onValueChange={(value) => setAudioSettings({ ...audioSettings, outputVolume: value })}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera size={20} />
            <span>Camera</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="camera-device-select">Camera Device</Label>
            <Select
              value={audioSettings.cameraDevice}
              onValueChange={(value) => setAudioSettings({ ...audioSettings, cameraDevice: value })}
            >
              <SelectTrigger id="camera-device-select">
                <SelectValue placeholder="Select a camera device" />
              </SelectTrigger>
              <SelectContent>
                {cameraDevices.length > 0 ? (
                  cameraDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera (${device.deviceId.substring(0, 8)}...)`}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-devices" disabled>
                    No camera devices found. Grant camera access.
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderKeybinds = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Keyboard Shortcuts</CardTitle>
          <CardDescription>Customize your keyboard shortcuts for quick actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {keybinds.map((keybind, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{keybind.action}</div>
                  <div className="text-sm text-gray-400">{keybind.description}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="font-mono">
                    {keybind.key}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => handleChangeKeybind(index)}>
                    Change
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderNotifications = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Desktop Notifications</CardTitle>
          <CardDescription>Control when and how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="desktop-notifications">Enable Desktop Notifications</Label>
            <Switch
              id="desktop-notifications"
              checked={notifications.desktopNotifications}
              onCheckedChange={(checked) => setNotifications({ ...notifications, desktopNotifications: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sound-notifications">Sound Notifications</Label>
            <Switch
              id="sound-notifications"
              checked={notifications.soundNotifications}
              onCheckedChange={(checked) => setNotifications({ ...notifications, soundNotifications: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label>Notification Sound</Label>
            <Select
              value={notifications.notificationSound}
              onValueChange={(value) => setNotifications({ ...notifications, notificationSound: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="chime">Chime</SelectItem>
                <SelectItem value="ding">Ding</SelectItem>
                <SelectItem value="pop">Pop</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="message-notifications">All Messages</Label>
            <Switch
              id="message-notifications"
              checked={notifications.messageNotifications}
              onCheckedChange={(checked) => setNotifications({ ...notifications, messageNotifications: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="mention-notifications">Only @mentions</Label>
            <Switch
              id="mention-notifications"
              checked={notifications.mentionNotifications}
              onCheckedChange={(checked) => setNotifications({ ...notifications, mentionNotifications: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="dm-notifications">Direct Messages</Label>
            <Switch
              id="dm-notifications"
              checked={notifications.dmNotifications}
              onCheckedChange={(checked) => setNotifications({ ...notifications, dmNotifications: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quiet Hours</CardTitle>
          <CardDescription>Disable notifications during specific hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="quiet-hours">Enable Quiet Hours</Label>
            <Switch
              id="quiet-hours"
              checked={notifications.quietHours}
              onCheckedChange={(checked) => setNotifications({ ...notifications, quietHours: checked })}
            />
          </div>

          {notifications.quietHours && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quiet-start">Start Time</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={notifications.quietStart}
                  onChange={(e) => setNotifications({ ...notifications, quietStart: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiet-end">End Time</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={notifications.quietEnd}
                  onChange={(e) => setNotifications({ ...notifications, quietEnd: e.target.value })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderPrivacy = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
          <CardDescription>Control who can contact you and see your information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Who can send you direct messages?</Label>
            <Select
              value={privacy.directMessages}
              onValueChange={(value) => setPrivacy({ ...privacy, directMessages: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone</SelectItem>
                <SelectItem value="friends">Friends only</SelectItem>
                <SelectItem value="none">No one</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Who can send you friend requests?</Label>
            <Select
              value={privacy.friendRequests}
              onValueChange={(value) => setPrivacy({ ...privacy, friendRequests: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone</SelectItem>
                <SelectItem value="friends-of-friends">Friends of friends</SelectItem>
                <SelectItem value="none">No one</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-activity">Show current activity</Label>
            <Switch
              id="show-activity"
              checked={privacy.showActivity}
              onCheckedChange={(checked) => setPrivacy({ ...privacy, showActivity: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-online-status">Show online status</Label>
            <Switch
              id="show-online-status"
              checked={privacy.showOnlineStatus}
              onCheckedChange={(checked) => setPrivacy({ ...privacy, showOnlineStatus: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="read-receipts">Send read receipts</Label>
            <Switch
              id="read-receipts"
              checked={privacy.readReceipts}
              onCheckedChange={(checked) => setPrivacy({ ...privacy, readReceipts: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="typing-indicator">Show typing indicator</Label>
            <Switch
              id="typing-indicator"
              checked={privacy.typingIndicator}
              onCheckedChange={(checked) => setPrivacy({ ...privacy, typingIndicator: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderAppearance = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Choose your preferred color scheme</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={appearance.theme} onValueChange={(value) => setAppearance({ ...appearance, theme: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">🌙 Dark</SelectItem>
                <SelectItem value="light">☀️ Light</SelectItem>
                <SelectItem value="auto">🔄 Auto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Message Display</Label>
            <Select
              value={appearance.messageDisplay}
              onValueChange={(value) => setAppearance({ ...appearance, messageDisplay: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cozy">Cozy</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Font Size: {appearance.fontSize[0]}px</Label>
            <Slider
              value={appearance.fontSize}
              onValueChange={(value) => setAppearance({ ...appearance, fontSize: value })}
              min={12}
              max={20}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Zoom Level: {appearance.zoomLevel[0]}%</Label>
            <Slider
              value={appearance.zoomLevel}
              onValueChange={(value) => setAppearance({ ...appearance, zoomLevel: value })}
              min={75}
              max={150}
              step={5}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-avatars">Show user avatars</Label>
            <Switch
              id="show-avatars"
              checked={appearance.showAvatars}
              onCheckedChange={(checked) => setAppearance({ ...appearance, showAvatars: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-emojis">Show emoji reactions</Label>
            <Switch
              id="show-emojis"
              checked={appearance.showEmojis}
              onCheckedChange={(checked) => setAppearance({ ...appearance, showEmojis: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderAdvanced = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
          <CardDescription>Advanced options for power users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="developer-mode">Developer Mode</Label>
              <p className="text-sm text-gray-400">Enable developer features and debugging tools</p>
            </div>
            <Switch
              id="developer-mode"
              checked={appearance.developerMode}
              onCheckedChange={(checked) => setAppearance({ ...appearance, developerMode: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="compact-mode">Compact Mode</Label>
              <p className="text-sm text-gray-400">Reduce spacing and padding throughout the app</p>
            </div>
            <Switch
              id="compact-mode"
              checked={appearance.compactMode}
              onCheckedChange={(checked) => setAppearance({ ...appearance, compactMode: checked })}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Data & Storage</Label>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handleClearCache}>
                Clear Cache
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handleExportData}>
                Export Data
              </Button>
              <Button variant="destructive" className="w-full justify-start" onClick={handleDeleteAccount}>
                Delete Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderContent = () => {
    switch (activeCategory) {
      case "profile":
        return renderProfileSettings()
      case "audio":
        return renderAudioSettings()
      case "keybinds":
        return renderKeybinds()
      case "notifications":
        return renderNotifications()
      case "privacy":
        return renderPrivacy()
      case "appearance":
        return renderAppearance()
      case "advanced":
        return renderAdvanced()
      default:
        return renderProfileSettings()
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="flex">
        {/* Settings Sidebar */}
        <div className="w-80 bg-gray-800 min-h-screen p-4">
          <div className="mb-6">
            <h1 className="text-xl font-bold mb-2">Settings</h1>
            <p className="text-sm text-gray-400">Customize your experience</p>
          </div>

          <div className="space-y-1">
            {settingsCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeCategory === category.id
                    ? "bg-indigo-600 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {category.icon}
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{category.name}</div>
                  <div className="text-xs text-gray-400 truncate">{category.description}</div>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">
                {settingsCategories.find((c) => c.id === activeCategory)?.name}
              </h2>
              <p className="text-gray-400">{settingsCategories.find((c) => c.id === activeCategory)?.description}</p>
            </div>

            {renderContent()}

            {/* Save Button */}
            <div className="mt-8 flex justify-end space-x-4">
              <Button variant="outline" onClick={handleResetToDefault}>
                Reset to Default
              </Button>
              <Button className="flex items-center space-x-2" onClick={handleSaveChanges}>
                <Save size={16} />
                <span>Save Changes</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}