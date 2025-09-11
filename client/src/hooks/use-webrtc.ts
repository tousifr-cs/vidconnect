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
  const [isScreenSharing, setIsScreenSharing] = useState(false);
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

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: true 
      });
      
      // Replace video track in peer connections
      if (webrtcManager.current && localStream) {
        const videoTrack = screenStream.getVideoTracks()[0];
        if (videoTrack) {
          // Replace video track for all peer connections
          webrtcManager.current.replaceVideoTrack(videoTrack);
          
          // Replace local stream video track
          const oldVideoTrack = localStream.getVideoTracks()[0];
          if (oldVideoTrack) {
            localStream.removeTrack(oldVideoTrack);
            oldVideoTrack.stop();
          }
          localStream.addTrack(videoTrack);
          
          setIsScreenSharing(true);
          
          // Listen for screen share end
          videoTrack.onended = () => {
            stopScreenShare();
          };
        }
      }
    } catch (error) {
      console.error("Failed to start screen sharing:", error);
    }
  };

  const stopScreenShare = async () => {
    try {
      // Get camera stream back
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false // Don't replace audio track
      });
      
      const videoTrack = cameraStream.getVideoTracks()[0];
      if (videoTrack && webrtcManager.current && localStream) {
        // Replace screen share track with camera track
        webrtcManager.current.replaceVideoTrack(videoTrack);
        
        // Replace in local stream
        const oldVideoTrack = localStream.getVideoTracks()[0];
        if (oldVideoTrack) {
          localStream.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        localStream.addTrack(videoTrack);
        
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error("Failed to stop screen sharing:", error);
    }
  };

  const toggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
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
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    endCall,
    webrtcManager: webrtcManager.current,
    webrtcManagerRef: webrtcManager,
  };
}
