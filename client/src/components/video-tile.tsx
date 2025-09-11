import { useEffect, useRef } from "react";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import type { Participant } from "@shared/schema";

interface VideoTileProps {
  stream?: MediaStream | null;
  participant: Participant;
  isLocal: boolean;
}

export function VideoTile({ stream, participant, isLocal }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="video-tile aspect-video relative group" data-testid={`video-tile-${participant.peerId}`}>
      {stream && participant.videoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
          data-testid={`video-element-${participant.peerId}`}
        />
      ) : (
        <div className="w-full h-full bg-secondary flex items-center justify-center">
          <div className="participant-avatar">
            <span>{getInitials(participant.username)}</span>
          </div>
        </div>
      )}
      
      {/* Video Controls Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-end">
        <div className="p-4 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm font-medium">
                {isLocal ? 'You' : participant.username}
              </span>
              {isLocal && (
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <div className={`rounded-full p-1 ${
                participant.audioEnabled 
                  ? 'bg-black bg-opacity-70' 
                  : 'bg-destructive'
              }`}>
                {participant.audioEnabled ? (
                  <Mic className="text-success" size={12} />
                ) : (
                  <MicOff className="text-white" size={12} />
                )}
              </div>
              {!participant.videoEnabled && (
                <div className="bg-destructive rounded-full p-1">
                  <VideoOff className="text-white" size={12} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Local video indicator */}
      {isLocal && (
        <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
          YOU
        </div>
      )}
    </div>
  );
}
