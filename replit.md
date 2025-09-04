# Overview

This is a modern multimeter reading application that captures and processes digital multimeter display values using camera OCR technology. The application allows users to take manual or automatic readings from multimeter displays, store them in a database, and analyze the data through various visualization and export features.

The system combines computer vision (OpenCV.js), speech synthesis, and modern web technologies to create an accessible tool for electrical measurements and data logging.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **UI Library**: Shadcn/ui components built on Radix UI primitives for accessible, customizable interface elements
- **Styling**: Tailwind CSS with CSS custom properties for theming and responsive design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Camera Integration**: MediaDevices API with custom React hooks for camera access and frame capture
- **Computer Vision**: OpenCV.js for image processing and OCR on multimeter displays
- **Speech Synthesis**: Web Speech API for text-to-speech functionality

## Backend Architecture
- **Runtime**: Node.js with Express.js REST API server
- **Language**: TypeScript with ES modules for type safety and modern JavaScript features
- **Development Setup**: tsx for TypeScript execution in development, esbuild for production bundling
- **API Design**: RESTful endpoints with JSON responses, error handling middleware
- **Request Logging**: Custom middleware for API request/response logging with timing
- **Static Serving**: Vite integration for development, static file serving for production

## Data Storage
- **ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Database**: PostgreSQL via Neon serverless database
- **Schema**: 
  - `readings` table: stores measurement values with metadata (value, quantity, unit, timestamp, mode, confidence)
  - `settings` table: application configuration (OCR thresholds, speech settings, auto-capture intervals)
- **Migrations**: Drizzle Kit for schema migrations and database management
- **Validation**: Zod schemas for runtime type validation on API boundaries

## Core Features
- **Camera Capture**: Real-time camera feed with manual and automatic capture modes
- **OCR Processing**: OpenCV.js-based image processing to extract numerical values from multimeter displays
- **Data Management**: CRUD operations for readings with pagination and filtering
- **Export Functionality**: CSV export service for data analysis
- **Replay System**: Import and playback of CSV data with speech synthesis
- **Settings Management**: Configurable OCR thresholds, speech parameters, and capture intervals

## Development Tools
- **Type Safety**: Shared TypeScript types between client and server via `/shared` directory
- **Path Aliases**: Configured for clean imports (`@/`, `@shared/`)
- **Development Experience**: Hot module replacement, error overlays, and Replit integration
- **Build Process**: Separate client (Vite) and server (esbuild) build pipelines

## External Dependencies

- **Neon Database**: Serverless PostgreSQL hosting for data persistence
- **OpenCV.js**: Computer vision library loaded from CDN for image processing and OCR
- **Radix UI**: Headless UI component library for accessible interface elements
- **Lucide React**: Icon library for consistent iconography
- **TanStack Query**: Server state management and caching
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Replit Services**: Development environment integration and runtime error handling

The application follows a modern full-stack architecture with clear separation between presentation, business logic, and data persistence layers. The use of TypeScript throughout ensures type safety, while the modular design allows for easy maintenance and feature extension.