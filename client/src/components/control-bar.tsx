import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  PhoneOff, 
  Users, 
  MessageCircle, 
  MoreVertical,
  Copy,
  Link
} from "lucide-react";

interface ControlBarProps {
  roomId: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  onToggleParticipants: () => void;
}

export function ControlBar({
  roomId,
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  onToggleParticipants,
}: ControlBarProps) {
  const { toast } = useToast();

  const handleCopyMeetingId = () => {
    navigator.clipboard.writeText(roomId);
    toast({
      title: "Copied!",
      description: "Meeting ID copied to clipboard",
    });
  };

  return (
    <div className="bg-card border-t border-border px-4 py-4">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        
        {/* Left Controls */}
        <div className="flex items-center space-x-2">
          {/* Meeting ID */}
          <div className="hidden md:flex items-center space-x-2 bg-muted px-3 py-2 rounded-lg">
            <Link size={14} className="text-muted-foreground" />
            <span className="text-sm font-mono text-foreground" data-testid="text-room-id">{roomId}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyMeetingId}
              className="h-auto p-1 text-primary hover:text-primary/80"
              data-testid="button-copy-room-id"
            >
              <Copy size={12} />
            </Button>
          </div>
        </div>
        
        {/* Center Controls */}
        <div className="flex items-center space-x-3">
          {/* Microphone Toggle */}
          <Button
            variant={isAudioEnabled ? "secondary" : "destructive"}
            size="lg"
            className="control-button w-12 h-12 rounded-full p-0"
            onClick={onToggleAudio}
            data-testid="button-toggle-microphone"
          >
            {isAudioEnabled ? (
              <Mic size={20} />
            ) : (
              <MicOff size={20} />
            )}
          </Button>
          
          {/* Camera Toggle */}
          <Button
            variant={isVideoEnabled ? "secondary" : "destructive"}
            size="lg"
            className="control-button w-12 h-12 rounded-full p-0"
            onClick={onToggleVideo}
            data-testid="button-toggle-camera"
          >
            {isVideoEnabled ? (
              <Video size={20} />
            ) : (
              <VideoOff size={20} />
            )}
          </Button>
          
          {/* Screen Share */}
          <Button
            variant="secondary"
            size="lg"
            className="control-button w-12 h-12 rounded-full p-0"
            data-testid="button-screen-share"
          >
            <Monitor size={20} />
          </Button>
          
          {/* Hang Up */}
          <Button
            variant="destructive"
            size="lg"
            className="control-button w-12 h-12 rounded-full p-0"
            onClick={onEndCall}
            data-testid="button-end-call"
          >
            <PhoneOff size={20} />
          </Button>
        </div>
        
        {/* Right Controls */}
        <div className="flex items-center space-x-2">
          {/* Participants Toggle (Mobile) */}
          <Button
            variant="secondary"
            size="sm"
            className="lg:hidden control-button w-10 h-10 p-0"
            onClick={onToggleParticipants}
            data-testid="button-toggle-participants"
          >
            <Users size={16} />
          </Button>
          
          {/* Chat Toggle */}
          <Button
            variant="secondary"
            size="sm"
            className="control-button w-10 h-10 p-0 relative"
            data-testid="button-toggle-chat"
          >
            <MessageCircle size={16} />
            {/* Chat notification badge */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">2</span>
            </div>
          </Button>
          
          {/* More Options */}
          <Button
            variant="secondary"
            size="sm"
            className="control-button w-10 h-10 p-0"
            data-testid="button-more-options"
          >
            <MoreVertical size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
