# CVVIN Platform Documentation

Welcome to the CVVIN platform documentation! This directory contains all technical documentation, setup guides, and architectural information for the project.

## 📚 Documentation Structure

### 🔧 Setup Guides (`/setup`)

Step-by-step guides for configuring the CVVIN platform:

- **[Firebase Setup](setup/firebase-setup.md)** - Firebase Authentication and Firestore configuration
- **[Firebase Admin Setup](setup/firebase-admin-setup.md)** - Firebase Admin SDK for password reset functionality
- **[Custom OTP Setup](setup/custom-otp-setup.md)** - Gmail SMTP configuration for OTP emails

### 📖 User Guides (`/guides`)

Comprehensive guides for testing, previewing, and troubleshooting:

- **[Testing Guide](guides/testing-guide.md)** - Complete testing walkthrough for all user flows
- **[Preview Guide](guides/preview-guide.md)** - Application preview and feature walkthrough
- **[Troubleshooting](guides/troubleshooting.md)** - Common issues and solutions

### 🏗️ Architecture (`/architecture`)

Technical implementation details and system architecture:

- **[Full Mock Flow](architecture/full-mock-flow.md)** - End-to-end full mock interview implementation
- **[Phase 1 Summary](architecture/phase1-summary.md)** - Frontend transformation completion summary

## 🚀 Quick Start

### For New Developers

1. **Setup**:
   - Start with [Firebase Setup](setup/firebase-setup.md)
   - Configure [Custom OTP](setup/custom-otp-setup.md)
   - Set up [Firebase Admin SDK](setup/firebase-admin-setup.md)

2. **Development**:
   - Use workspace commands: `npm run dev` (starts both frontend & backend)
   - Or individual commands: `npm run dev:frontend` / `npm run dev:backend`

3. **Testing**:
   - Follow the [Testing Guide](guides/testing-guide.md)
   - Use the [Preview Guide](guides/preview-guide.md) for feature walkthrough

4. **Troubleshooting**:
   - Check [Troubleshooting Guide](guides/troubleshooting.md) for common issues

### For Understanding Architecture

1. Read [Phase 1 Summary](architecture/phase1-summary.md) for project overview
2. Explore [Full Mock Flow](architecture/full-mock-flow.md) for interview system details

## 🎯 Key Features Documented

### Authentication & OTP System
- Firebase Authentication integration
- Custom OTP email system with Gmail SMTP
- Password reset flow
- Email verification

### Interview Platform
- Full mock interview orchestration
- Resume analysis with ATS compatibility
- Technical interviews (MCQ + Coding challenges)
- HR behavioral interviews
- Comprehensive feedback system

### User Experience
- Progressive onboarding for new users
- Smart dashboard with personalized content
- Profile management with multi-step forms
- Session tracking and history

## 📋 Documentation Standards

All documentation follows these conventions:

- **Clear headings** with emoji indicators
- **Step-by-step instructions** with code examples
- **Troubleshooting sections** for common issues
- **Visual indicators** (✅, 🔧, 🎯, etc.) for quick scanning
- **Code blocks** with syntax highlighting
- **Links** to related documentation

## 🔄 Keeping Documentation Updated

When making changes to the platform:

1. **Update relevant guides** if you change functionality
2. **Add troubleshooting entries** for new known issues
3. **Update architecture docs** for significant structural changes
4. **Keep code examples current** with actual implementation

## 🏗️ Project Structure

The CVVIN platform uses a monorepo structure:

```
cvvin-platform/
├── frontend/                 # React application
├── backend/                  # Express.js API server
└── package.json              # Workspace configuration
```

**Development Commands:**
- `npm run dev` - Start both frontend and backend
- `npm run dev:frontend` - Frontend only (port 8080)
- `npm run dev:backend` - Backend only (port 3000)

## 📞 Support

If you can't find what you're looking for:

1. Check the [Troubleshooting Guide](guides/troubleshooting.md)
2. Review relevant setup guides
3. Examine the architecture documentation
4. Check the main [project README](../../README.md)

## 🗂️ Document Index

### Setup Documentation
| Document | Purpose | Target Audience |
|----------|---------|----------------|
| Firebase Setup | Configure Firebase Auth & Firestore | Developers |
| Firebase Admin Setup | Set up Admin SDK for password reset | Backend Developers |
| Custom OTP Setup | Configure Gmail SMTP for OTP emails | Backend Developers |

### User Guides
| Document | Purpose | Target Audience |
|----------|---------|----------------|
| Testing Guide | Test all platform features | QA, Developers |
| Preview Guide | Application walkthrough | Product, Stakeholders |
| Troubleshooting | Resolve common issues | All Users |

### Architecture Documentation
| Document | Purpose | Target Audience |
|----------|---------|----------------|
| Full Mock Flow | Interview system architecture | Developers |
| Phase 1 Summary | Frontend completion overview | All Stakeholders |

---

**Last Updated**: October 2025  
**Platform**: CVVIN AI-Powered Interview Preparation  
**Version**: Phase 1 Complete

