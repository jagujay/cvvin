# CVVIN - AI-Powered Interview Preparation Platform

CVVIN is a comprehensive mock interview preparation platform that helps job seekers practice and improve their interview skills through AI-powered simulations, resume analysis, and personalized feedback.

## 🚀 Features

- **Full Mock Interviews**: End-to-end interview simulation covering resume analysis, technical, and HR rounds
- **Resume Analysis**: ATS compatibility checking and skills matching with job descriptions
- **Technical Interviews**: MCQ tests and coding challenges with multiple language support
- **HR Interviews**: Behavioral question practice with STAR method guidance
- **Comprehensive Feedback**: Detailed performance reports with actionable recommendations
- **Progress Tracking**: Session history and performance analytics

## 📚 Documentation

All project documentation is organized in the [`frontend/docs/`](frontend/docs/) directory:

### 🔧 Setup Guides
- [Firebase Setup](frontend/docs/setup/firebase-setup.md) - Authentication and Firestore configuration
- [Firebase Admin Setup](frontend/docs/setup/firebase-admin-setup.md) - Admin SDK for password reset
- [Custom OTP Setup](frontend/docs/setup/custom-otp-setup.md) - Gmail SMTP for OTP emails

### 📖 User Guides
- [Testing Guide](frontend/docs/guides/testing-guide.md) - Complete testing walkthrough
- [Preview Guide](frontend/docs/guides/preview-guide.md) - Feature walkthrough and demo scenarios
- [Troubleshooting](frontend/docs/guides/troubleshooting.md) - Common issues and solutions

### 🏗️ Architecture
- [Full Mock Flow](frontend/docs/architecture/full-mock-flow.md) - Interview system architecture
- [Phase 1 Summary](frontend/docs/architecture/phase1-summary.md) - Frontend completion overview

For a complete documentation index, see [frontend/docs/README.md](frontend/docs/README.md)

## 🛠️ Technologies

### Frontend
- **React** 18.3.1 with TypeScript
- **Vite** for fast development and building
- **shadcn/ui** for UI components
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Firebase** for authentication

### Backend
- **Express.js** for API server
- **Firebase Admin SDK** for user management
- **Nodemailer** for email services
- **CORS** for cross-origin requests

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Firebase account
- Gmail account (for OTP emails)

### Installation

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd cvvin-platform
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Configure environment variables**
   
   Frontend (`frontend/.env.local`):
   ```bash
   cd frontend
   cp env.example .env.local
   # Edit .env.local with your Firebase credentials
   cd ..
   ```

   Backend (`backend/.env`):
   ```bash
   cd backend
   cp env.example .env
   # Edit .env with your Gmail SMTP and Firebase Admin credentials
   cd ..
   ```

4. **Start development servers**
   
   **Option 1: Start both servers simultaneously**
   ```bash
   npm run dev
   ```

   **Option 2: Start servers individually**
   ```bash
   # Terminal 1 - Backend
   npm run dev:backend

   # Terminal 2 - Frontend
   npm run dev:frontend
   ```

5. **Access the application**
   - Frontend: http://localhost:8080
   - Backend: http://localhost:3001

For detailed setup instructions, see the [documentation](frontend/docs/README.md).

## 📖 Development

### Available Scripts

**Workspace Commands:**
- `npm run dev` - Start both frontend and backend servers
- `npm run build` - Build both applications for production
- `npm run install:all` - Install dependencies for all workspaces
- `npm run clean` - Clean all node_modules and build artifacts
- `npm run test` - Run tests for all workspaces
- `npm run lint` - Run linter for all workspaces

**Individual Commands:**
- `npm run dev:frontend` - Start frontend development server
- `npm run dev:backend` - Start backend development server
- `npm run build:frontend` - Build frontend for production
- `npm run build:backend` - Build backend for production

### Project Structure

```
cvvin-platform/
├── frontend/                 # Frontend application
│   ├── src/                 # Frontend source
│   │   ├── components/       # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom hooks
│   │   ├── contexts/        # React contexts
│   │   ├── lib/             # Utilities
│   │   ├── services/        # API services
│   │   ├── assets/          # Frontend bundled assets
│   │   └── mock/            # Mock data
│   ├── docs/                # Documentation
│   │   ├── setup/           # Setup guides
│   │   ├── guides/          # User guides
│   │   └── architecture/    # Architecture docs
│   ├── assets/              # Platform-wide assets
│   │   ├── logos/           # Brand logos
│   │   ├── images/          # General images
│   │   └── icons/           # Custom icons
│   ├── public/              # Static public files
│   └── package.json         # Frontend dependencies
├── backend/                 # Backend application
│   ├── src/                 # Backend source
│   │   ├── config/          # Configuration
│   │   ├── services/        # Business logic
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Express middleware
│   │   └── utils/           # Utility functions
│   ├── server.js            # Express server entry point
│   └── package.json         # Backend dependencies
└── package.json             # Workspace configuration
```

## 🧪 Testing

Follow the [Testing Guide](frontend/docs/guides/testing-guide.md) for comprehensive testing instructions covering:
- New user onboarding flow
- Returning user experience
- Full mock interview end-to-end
- Individual module testing

## 🐛 Troubleshooting

If you encounter issues, check the [Troubleshooting Guide](frontend/docs/guides/troubleshooting.md) for:
- Authentication problems
- OTP email issues
- Backend configuration
- Frontend errors

## 📄 License

This project is built with Lovable and uses open-source technologies.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For questions or issues:
1. Check the [documentation](frontend/docs/README.md)
2. Review the [troubleshooting guide](frontend/docs/guides/troubleshooting.md)
3. Contact: cvvinteam@gmail.com

---

**Project**: CVVIN AI-Powered Interview Preparation Platform  
**Version**: Phase 1 Complete  
**Last Updated**: October 2025
