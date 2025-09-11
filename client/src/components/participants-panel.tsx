import { Button } from "@/components/ui/button";
import { Users, UserPlus, MoreVertical, Mic, MicOff, Video, VideoOff } from "lucide-react";
import type { Participant } from "@shared/schema";

interface ParticipantsPanelProps {
  participants: Participant[];
  isVisible: boolean;
  onToggle: () => void;
}

export function ParticipantsPanel({ participants, isVisible }: ParticipantsPanelProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`${isVisible ? 'block' : 'hidden'} lg:block w-80 bg-card border-l border-border`}>
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground flex items-center" data-testid="text-participants-count">
          <Users className="mr-2" size={16} />
          Participants ({participants.length})
        </h3>
      </div>
      
      <div className="p-4 space-y-3">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted transition-colors"
            data-testid={`participant-${participant.peerId}`}
          >
            <div className="participant-avatar">
              <span>{getInitials(participant.username)}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-foreground">
                  {participant.username}
                </span>
                {participant.isHost && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                    Host
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 mt-1">
                {participant.audioEnabled ? (
                  <Mic className="text-success" size={12} />
                ) : (
                  <MicOff className="text-destructive" size={12} />
                )}
                {participant.videoEnabled ? (
                  <Video className="text-success" size={12} />
                ) : (
                  <VideoOff className="text-destructive" size={12} />
                )}
              </div>
            </div>
            {!participant.isHost && (
              <Button variant="ghost" size="sm" className="p-1" data-testid={`button-participant-options-${participant.peerId}`}>
                <MoreVertical size={12} />
              </Button>
            )}
          </div>
        ))}
      </div>
      
      {/* Invite Section */}
      <div className="p-4 border-t border-border">
        <Button className="w-full" size="sm" data-testid="button-invite-others">
          <UserPlus className="mr-2" size={16} />
          Invite Others
        </Button>
      </div>
    </div>
  );
}
