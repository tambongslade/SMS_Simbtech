# SMS Simbtech Desktop App

This document provides instructions for building and running the SMS Simbtech School Management System as a desktop application using Electron.

## Features

- **Cross-platform**: Works on Windows, macOS, and Linux
- **Native desktop experience**: Full desktop integration with system menus, notifications, and shortcuts
- **Offline-ready**: Can run independently of web browsers
- **Auto-updates**: Built-in update mechanism for production releases
- **Security**: Isolated environment with proper security measures

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- The SMS Simbtech web application should be working

### Installation

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Create application icons**:
   ```bash
   npm run create-icons
   ```
   
   Note: This creates placeholder icons. For production, replace the files in the `build/` directory with proper icon files:
   - `build/icon.png` (512x512) - Linux
   - `build/icon.ico` (256x256) - Windows
   - `build/icon.icns` (512x512) - macOS

### Development

1. **Start development server with Electron**:
   ```bash
   npm run electron-dev
   ```
   
   Or use the helper script:
   ```bash
   npm run dev-desktop
   ```

2. **Development features**:
   - Hot reload enabled
   - Developer tools available
   - Both web and desktop versions run simultaneously

## Building for Production

### Build Options

1. **Create distributable packages**:
   ```bash
   npm run build-electron
   ```

2. **Create unpacked directory** (for testing):
   ```bash
   npm run pack
   ```

3. **Build and publish** (requires GitHub setup):
   ```bash
   npm run dist
   ```

### Platform-specific Builds

The app will build for your current platform by default. The configuration supports:

- **Windows**: `.exe` installer (NSIS) and portable `.exe`
- **macOS**: `.dmg` installer
- **Linux**: AppImage and `.deb` packages

### Output

Built applications will be available in the `dist/` directory:
- Windows: `SMS Simbtech Setup 0.1.0.exe`
- macOS: `SMS Simbtech-0.1.0.dmg`
- Linux: `SMS Simbtech-0.1.0.AppImage`

## Configuration

### App Settings

Key configuration options in `package.json`:

```json
{
  "build": {
    "appId": "com.simbtech.sms",
    "productName": "SMS Simbtech",
    "directories": {
      "output": "dist"
    }
  }
}
```

### Environment Variables

Configure the desktop app using `electron.env`:

- `NEXT_PUBLIC_API_BASE_URL`: Backend API endpoint
- `ELECTRON_WINDOW_WIDTH/HEIGHT`: Default window size
- `ELECTRON_AUTO_UPDATE`: Enable/disable auto-updates

### Main Process

The main Electron process is configured in `electron/main.js`:
- Window creation and management
- Menu setup
- Security configurations
- Auto-updater integration

## Architecture

```
SMS Simbtech Desktop App
├── Next.js Frontend (Renderer Process)
│   ├── React Components
│   ├── API Integration
│   └── Static Assets
├── Electron Main Process
│   ├── Window Management
│   ├── Menu System
│   ├── Security Layer
│   └── Auto-updater
└── Preload Scripts
    ├── IPC Communication
    └── Security Bridge
```

## Security Features

- **Context Isolation**: Renderer process is isolated from Node.js
- **Preload Scripts**: Safe communication between main and renderer
- **CSP Headers**: Content Security Policy enabled
- **External Link Handling**: Opens external links in system browser
- **No Node Integration**: Renderer process has no direct Node.js access

## Troubleshooting

### Common Issues

1. **Build fails with "next export" error**:
   - Ensure all pages are static-friendly
   - Check for server-side only features
   - Verify Next.js configuration

2. **Icons not showing**:
   - Ensure icon files exist in `build/` directory
   - Check file formats (.ico for Windows, .icns for macOS)
   - Verify paths in `package.json` build config

3. **App won't start in development**:
   - Ensure Next.js dev server is running on port 3000
   - Check if port is already in use
   - Verify all dependencies are installed

4. **API connection issues**:
   - Update `NEXT_PUBLIC_API_BASE_URL` in environment
   - Ensure backend server is running
   - Check CORS configuration

### Development Tips

1. **Debug Electron issues**:
   ```bash
   # Enable Electron logging
   export ELECTRON_ENABLE_LOGGING=true
   npm run electron-dev
   ```

2. **Access DevTools**:
   - Press `Ctrl+Shift+I` (or `Cmd+Option+I` on macOS)
   - Or use the View menu → Toggle Developer Tools

3. **Reload app**:
   - Press `Ctrl+R` (or `Cmd+R` on macOS)
   - Or use the File menu → Reload

## Distribution

### App Signing (Production)

For production releases, you'll need to:

1. **Code signing certificates**:
   - Windows: Get a code signing certificate
   - macOS: Apple Developer account and certificate
   - Linux: No signing required

2. **Update package.json**:
   ```json
   {
     "build": {
       "win": {
         "certificateFile": "path/to/certificate.p12",
         "certificatePassword": "password"
       },
       "mac": {
         "identity": "Developer ID Application: Your Name"
       }
     }
   }
   ```

### Auto-Updates

The app includes electron-updater for automatic updates:

1. Configure GitHub releases or custom update server
2. Build and publish releases
3. App will check for updates on startup

## API Integration

The desktop app connects to the same backend API as the web version:

- Default endpoint: `http://localhost:4000/api/v1`
- Configure via `NEXT_PUBLIC_API_BASE_URL`
- All existing authentication and data flows work unchanged

## Performance

### Optimization Tips

1. **Reduce bundle size**:
   - Only include necessary Node modules
   - Use tree-shaking for frontend code
   - Optimize images and assets

2. **Memory usage**:
   - Close unused windows
   - Clean up event listeners
   - Implement proper garbage collection

3. **Startup time**:
   - Minimize startup scripts
   - Defer heavy operations
   - Use splash screen if needed

## Support

For desktop app specific issues:
1. Check this README
2. Review Electron documentation
3. Check GitHub issues
4. Contact development team

---

**Version**: 0.1.0  
**Last Updated**: January 2025  
**Electron Version**: 37.x  
**Next.js Version**: 15.x