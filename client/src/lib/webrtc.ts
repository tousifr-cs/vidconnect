export class WebRTCManager {
  private localStream: MediaStream;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  public onRemoteStream?: (peerId: string, stream: MediaStream) => void;
  public onRemoteStreamRemoved?: (peerId: string) => void;

  constructor(localStream: MediaStream) {
    this.localStream = localStream;
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
      if (event.candidate) {
        // In a real implementation, send this candidate to the remote peer via signaling
        console.log('ICE candidate:', event.candidate);
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
