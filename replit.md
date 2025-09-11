# Video Conferencing Application

## Overview

This is a real-time video conferencing application built with React and Express. The application enables users to create and join video meeting rooms with features like audio/video controls, screen sharing, participant management, and real-time chat. It uses WebRTC for peer-to-peer communication and WebSockets for signaling.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query for server state management and React hooks for local state
- **Routing**: Wouter for client-side routing
- **WebRTC Integration**: Custom WebRTC manager class handling peer connections, media streams, and signaling

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **WebSocket Server**: Native WebSocket implementation for real-time signaling
- **Storage Layer**: Abstract storage interface with memory-based implementation (easily extensible to database)
- **API Design**: RESTful endpoints for room management with WebSocket channels for real-time features

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Design**: Two main entities - rooms and participants with proper relationships
- **Migration Management**: Drizzle Kit for database schema migrations and management
- **Connection**: Neon Database serverless PostgreSQL for cloud deployment

### Authentication and Authorization
- **Current State**: No authentication system implemented
- **Session Management**: Basic session handling infrastructure present but not actively used
- **Security**: Basic CORS and request validation, suitable for development/demo purposes

### External Service Integrations
- **STUN Servers**: Google's public STUN servers for NAT traversal in WebRTC connections
- **Font Services**: Google Fonts integration for typography
- **Development Tools**: Replit-specific development banner and error overlay integration

### Communication Layer
- **WebRTC**: Handles direct peer-to-peer audio/video streaming with automatic codec negotiation
- **WebSocket Signaling**: Custom protocol for room management, participant updates, and WebRTC signaling
- **REST API**: Traditional HTTP endpoints for room creation and participant management

### Media Management
- **Stream Handling**: Dynamic media stream management with support for audio/video toggling
- **Screen Sharing**: Built-in screen capture capabilities with stream switching
- **Device Management**: Automatic device detection and permission handling for camera/microphone access

### Component Architecture
- **Modular Design**: Separate components for video tiles, control bars, participant panels, and chat
- **Responsive Layout**: Mobile-first design with adaptive layouts for different screen sizes
- **Real-time Updates**: Components automatically sync with WebSocket events for live participant updates

### Development and Build Process
- **Hot Reload**: Vite development server with fast refresh for rapid development
- **TypeScript**: Full type safety across frontend, backend, and shared schemas
- **Build Pipeline**: Separate builds for client (Vite) and server (esbuild) with optimized production bundles
- **Path Aliases**: Configured import aliases for clean, maintainable code organization