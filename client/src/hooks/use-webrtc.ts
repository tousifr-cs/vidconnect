import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { WebRTCManager } from "@/lib/webrtc";
import type { WSMessage } from "@shared/schema";

export function useWebRTC(sendMessage?: (message: WSMessage) => void, peerId?: string) {
  const [, setLocation] = useLocation();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const webrtcManager = useRef<WebRTCManager | null>(null);

  useEffect(() => {
    initializeMedia();
    return () => {
      cleanup();
    };
  }, []);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      setLocalStream(stream);
      
      if (!webrtcManager.current && peerId && sendMessage) {
        const roomId = window.location.pathname.split('/')[2]; // Get room ID from URL
        webrtcManager.current = new WebRTCManager(stream, peerId, roomId);
        
        webrtcManager.current.onRemoteStream = (peerId, stream) => {
          setRemoteStreams(prev => ({
            ...prev,
            [peerId]: stream,
          }));
        };
        
        webrtcManager.current.onRemoteStreamRemoved = (peerId) => {
          setRemoteStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[peerId];
            return newStreams;
          });
        };
        
        webrtcManager.current.onSendMessage = sendMessage;
      }
    } catch (error) {
      console.error("Failed to get user media:", error);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const endCall = () => {
    cleanup();
    setLocation("/");
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    Object.values(remoteStreams).forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    
    if (webrtcManager.current) {
      webrtcManager.current.cleanup();
    }
    
    setLocalStream(null);
    setRemoteStreams({});
  };

  return {
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
    endCall,
    webrtcManager: webrtcManager.current,
  };
}
