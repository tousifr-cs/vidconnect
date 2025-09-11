import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Video, Plus, LogIn, Lock, Clock, Shield } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [meetingId, setMeetingId] = useState("");
  const { toast } = useToast();

  const createMeetingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/rooms");
      return response.json();
    },
    onSuccess: (room) => {
      toast({
        title: "Meeting Created!",
        description: `Meeting ID: ${room.id}`,
      });
      setLocation(`/room/${room.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create meeting",
        variant: "destructive",
      });
    },
  });

  const handleJoinMeeting = () => {
    if (!meetingId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a meeting ID",
        variant: "destructive",
      });
      return;
    }
    setLocation(`/room/${meetingId.trim()}`);
  };

  const handleCreateMeeting = () => {
    createMeetingMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="max-w-md w-full mx-4">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="text-primary-foreground text-2xl" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">VideoConnect</h1>
          <p className="text-muted-foreground">Connect with anyone, anywhere</p>
        </div>

        {/* Join/Create Form */}
        <Card className="shadow-lg border border-border">
          <CardContent className="p-6 space-y-6">
            {/* Join Existing Room */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Join a Meeting</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="meeting-id" className="block text-sm font-medium text-foreground mb-2">
                    Meeting ID
                  </Label>
                  <Input
                    id="meeting-id"
                    type="text"
                    placeholder="Enter meeting ID"
                    value={meetingId}
                    onChange={(e) => setMeetingId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleJoinMeeting()}
                    className="w-full"
                    data-testid="input-meeting-id"
                  />
                </div>
                <Button 
                  onClick={handleJoinMeeting}
                  className="w-full"
                  data-testid="button-join-meeting"
                >
                  <LogIn className="mr-2" size={16} />
                  Join Meeting
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {/* Create New Room */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Start a New Meeting</h2>
              <Button 
                onClick={handleCreateMeeting}
                variant="secondary"
                className="w-full"
                disabled={createMeetingMutation.isPending}
                data-testid="button-create-meeting"
              >
                <Plus className="mr-2" size={16} />
                {createMeetingMutation.isPending ? "Creating..." : "Create Meeting"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-6 text-center space-y-2">
          <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Shield size={14} />
              <span>Secure</span>
            </div>
            <div className="flex items-center space-x-1">
              <Lock size={14} />
              <span>No account needed</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock size={14} />
              <span>Free</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
