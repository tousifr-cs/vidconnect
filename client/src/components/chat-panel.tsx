import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, X } from "lucide-react";
import type { WSMessage } from "@shared/schema";

interface ChatMessage {
  id: string;
  peerId: string;
  username: string;
  message: string;
  timestamp: number;
  isOwn: boolean;
}

interface ChatPanelProps {
  roomId: string;
  username: string;
  peerId: string;
  messages: ChatMessage[];
  isVisible: boolean;
  onToggle: () => void;
  onSendMessage?: (message: WSMessage) => void;
}

export function ChatPanel({ 
  roomId, 
  username, 
  peerId,
  messages,
  isVisible, 
  onToggle,
  onSendMessage,
}: ChatPanelProps) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim() && onSendMessage) {
      const chatMessage: WSMessage = {
        type: 'chat-message',
        roomId,
        peerId,
        username,
        message: newMessage.trim(),
        timestamp: Date.now(),
      };
      
      onSendMessage(chatMessage);
      setNewMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`w-80 bg-card border-l border-border flex flex-col h-full ${!isVisible ? 'hidden' : ''}`}>
      {/* Chat Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center" data-testid="text-chat-title">
          <MessageCircle className="mr-2" size={16} />
          Chat
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onToggle}
          className="h-auto p-1"
          data-testid="button-close-chat"
        >
          <X size={16} />
        </Button>
      </div>
      
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                data-testid={`chat-message-${msg.id}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.isOwn 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-medium opacity-80">
                      {msg.isOwn ? 'You' : msg.username}
                    </span>
                    <span className="text-xs opacity-60">
                      {new Date(msg.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Message Input */}
      <div className="p-4 border-t border-border">
        <div className="flex space-x-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            data-testid="input-chat-message"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            size="sm"
            data-testid="button-send-message"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}