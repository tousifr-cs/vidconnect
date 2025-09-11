import type { WSMessage } from "@shared/schema";

export class WebRTCManager {
  private localStream: MediaStream;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  public onRemoteStream?: (peerId: string, stream: MediaStream) => void;
  public onRemoteStreamRemoved?: (peerId: string) => void;
  public onSendMessage?: (message: WSMessage) => void;
  private myPeerId: string;
  private roomId: string;

  constructor(localStream: MediaStream, peerId: string, roomId: string) {
    this.localStream = localStream;
    this.myPeerId = peerId;
    this.roomId = roomId;
  }

  async createPeerConnection(peerId: string): Promise<RTCPeerConnection> {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const peerConnection = new RTCPeerConnection(configuration);

    // Add local stream tracks
    this.localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, this.localStream);
    });

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (this.onRemoteStream) {
        this.onRemoteStream(peerId, remoteStream);
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onSendMessage) {
        this.onSendMessage({
          type: 'webrtc-ice-candidate',
          roomId: this.roomId,
          targetPeerId: peerId,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state for ${peerId}:`, peerConnection.connectionState);
      
      if (peerConnection.connectionState === 'disconnected' || 
          peerConnection.connectionState === 'failed' ||
          peerConnection.connectionState === 'closed') {
        this.removePeerConnection(peerId);
      }
    };

    this.peerConnections.set(peerId, peerConnection);
    return peerConnection;
  }

  async createOffer(peerId: string): Promise<RTCSessionDescriptionInit> {
    const peerConnection = await this.createPeerConnection(peerId);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(peerId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const peerConnection = await this.createPeerConnection(peerId);
    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peerConnection = this.peerConnections.get(peerId);
    if (peerConnection) {
      await peerConnection.setRemoteDescription(answer);
    }
  }

  async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peerConnection = this.peerConnections.get(peerId);
    if (peerConnection) {
      await peerConnection.addIceCandidate(candidate);
    }
  }

  removePeerConnection(peerId: string): void {
    const peerConnection = this.peerConnections.get(peerId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(peerId);
      
      if (this.onRemoteStreamRemoved) {
        this.onRemoteStreamRemoved(peerId);
      }
    }
  }

  // Handle incoming WebSocket messages
  async handleWebSocketMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'webrtc-offer':
        if (message.targetPeerId === this.myPeerId) {
          await this.handleIncomingOffer(message.offer, message.peerId);
        }
        break;
        
      case 'webrtc-answer':
        if (message.targetPeerId === this.myPeerId) {
          await this.handleAnswer(message.peerId, message.answer);
        }
        break;
        
      case 'webrtc-ice-candidate':
        if (message.targetPeerId === this.myPeerId) {
          await this.handleIceCandidate(message.peerId, message.candidate);
        }
        break;
    }
  }

  // Create and send offer to a new peer
  async initiateConnection(peerId: string): Promise<void> {
    try {
      const offer = await this.createOffer(peerId);
      if (this.onSendMessage) {
        this.onSendMessage({
          type: 'webrtc-offer',
          roomId: this.roomId,
          targetPeerId: peerId,
          offer,
        });
      }
    } catch (error) {
      console.error('Failed to initiate connection:', error);
    }
  }

  // Handle incoming offer from a peer
  private async handleIncomingOffer(offer: RTCSessionDescriptionInit, fromPeerId: string): Promise<void> {
    try {
      const answer = await this.createAnswer(fromPeerId, offer);
      if (this.onSendMessage) {
        this.onSendMessage({
          type: 'webrtc-answer',
          roomId: this.roomId,
          targetPeerId: fromPeerId,
          answer,
        });
      }
    } catch (error) {
      console.error('Failed to handle incoming offer:', error);
    }
  }

  cleanup(): void {
    this.peerConnections.forEach((pc, peerId) => {
      pc.close();
      if (this.onRemoteStreamRemoved) {
        this.onRemoteStreamRemoved(peerId);
      }
    });
    this.peerConnections.clear();
  }
}
