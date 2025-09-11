import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { VideoTile } from "@/components/video-tile";
import { ControlBar } from "@/components/control-bar";
import { ParticipantsPanel } from "@/components/participants-panel";
import { useWebRTC } from "@/hooks/use-webrtc";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Video, Settings, Copy, Clock, Circle } from "lucide-react";
import type { Participant } from "@shared/schema";

export default function Room() {
  const [, params] = useRoute("/room/:roomId");
  const roomId = params?.roomId;
  const [username] = useState("User"); // In a real app, this would come from user input
  const [showParticipants, setShowParticipants] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState("00:00");
  const { toast } = useToast();

  const { 
    localStream, 
    remoteStreams, 
    isAudioEnabled, 
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
    endCall
  } = useWebRTC();

  const {
    participants,
    isConnected,
    sendMessage
  } = useWebSocket(roomId!, username);

  // Fetch room details
  const { data: roomData, error } = useQuery({
    queryKey: ["/api/rooms", roomId],
    enabled: !!roomId,
    retry: false,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Room not found or unavailable",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    // Update meeting duration every second
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      setMeetingDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleCopyMeetingId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      toast({
        title: "Copied!",
        description: "Meeting ID copied to clipboard",
      });
    }
  };

  const handleToggleAudio = () => {
    toggleAudio();
    if (sendMessage) {
      sendMessage({
        type: 'participant-update',
        roomId: roomId!,
        peerId: 'local', // In real implementation, this would be the actual peer ID
        audioEnabled: !isAudioEnabled,
      });
    }
  };

  const handleToggleVideo = () => {
    toggleVideo();
    if (sendMessage) {
      sendMessage({
        type: 'participant-update',
        roomId: roomId!,
        peerId: 'local',
        videoEnabled: !isVideoEnabled,
      });
    }
  };

  if (!roomId) {
    return <div>Invalid room ID</div>;
  }

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header Bar */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Video className="text-primary-foreground" size={16} />
            </div>
            <span className="font-semibold text-foreground">VideoConnect</span>
          </div>
          <div className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
            <Copy size={14} />
            <span data-testid="text-meeting-id">{roomId}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyMeetingId}
              className="h-auto p-1"
              data-testid="button-copy-meeting-id"
            >
              <Copy size={12} />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Meeting Info */}
          <div className="hidden lg:flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Clock size={14} />
              <span data-testid="text-meeting-duration">{meetingDuration}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Circle className="w-2 h-2 fill-success text-success" />
              <span>Connected</span>
            </div>
          </div>
          
          {/* Settings Button */}
          <Button variant="ghost" size="sm" data-testid="button-settings">
            <Settings size={16} />
          </Button>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 flex">
        {/* Video Grid */}
        <div className="flex-1 p-4">
          <div className="h-full flex flex-col">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
              {/* Local Video */}
              <VideoTile
                stream={localStream}
                participant={{
                  id: 'local',
                  username: 'You',
                  peerId: 'local',
                  isHost: true,
                  audioEnabled: isAudioEnabled,
                  videoEnabled: isVideoEnabled,
                } as Participant}
                isLocal={true}
              />

              {/* Remote Videos */}
              {Object.entries(remoteStreams).map(([peerId, stream]) => {
                const participant = participants.find(p => p.peerId === peerId);
                return participant ? (
                  <VideoTile
                    key={peerId}
                    stream={stream}
                    participant={participant}
                    isLocal={false}
                  />
                ) : null;
              })}

              {/* Empty slots */}
              {Array.from({ length: Math.max(0, 6 - 1 - Object.keys(remoteStreams).length) }).map((_, index) => (
                <div
                  key={index}
                  className="video-tile aspect-video relative bg-muted border-2 border-dashed border-border flex items-center justify-center"
                  data-testid={`empty-slot-${index}`}
                >
                  <div className="text-center text-muted-foreground">
                    <div className="w-12 h-12 bg-muted-foreground/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Video size={24} />
                    </div>
                    <p className="text-sm">Waiting for participants</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar - Participants Panel */}
        <ParticipantsPanel
          participants={participants}
          isVisible={showParticipants}
          onToggle={() => setShowParticipants(!showParticipants)}
        />
      </div>

      {/* Control Bar */}
      <ControlBar
        roomId={roomId}
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onEndCall={endCall}
        onToggleParticipants={() => setShowParticipants(!showParticipants)}
      />
    </div>
  );
}
