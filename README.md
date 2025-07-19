# AtPack viewer

Atmel/Microchip's AtPack parser/viewer, developed with Reac, TypeScript, Vite, Tailwind CSS, Zustand...

### Package Drawing Scale

The package diagrams support adjustable scaling to accommodate different screen sizes and preferences:

- **Scale Range**: 0.3x to 2.0x (default: 1.0x)
- **Interactive Control**: Use the slider in the Packages section to adjust scale in real-time
- **Quick Reset**: Click the "Reset" button to return to default scale (1.0x)
- **All Elements Scaled**: Package body, pins, text, and orientation marks all scale proportionally

### Interactive Zoom and Pan

Each package diagram supports independent zoom and pan functionality:

#### Controls:
- **Mouse Wheel**: Zoom in/out (centered on mouse position)
- **Click & Drag**: Pan the view around
- **Reset View Button**: Restore to default zoom (1.0x) and center position

#### Features:
- **Zoom Range**: 0.1x to 5.0x
- **Smooth Zoom**: Zoom towards mouse cursor position
- **Independent Views**: Each package canvas maintains its own zoom/pan state
- **Visual Feedback**: Cursor changes to indicate interaction mode
- **Real-time Display**: Current zoom level shown above each canvas

#### Usage Tips:
- Use mouse wheel to zoom into pin details
- Drag to pan around large packages that extend beyond canvas
- Double-click "Reset View" to quickly return to overview
- Combine with scale slider for optimal viewing experience

Example usage in code:
```tsx
<PackageImage 
  packageName="TQFP64"
  deviceName="AT90CAN128"
  pinout={pinoutData}
  scale={0.5}  // 50% of original size
/>
```

...existing code...eatures

- 🔍 **Advanced XML Parser** : Analyzes Atmel/Microchip AtPack files (.atpack)
- 📱 **Modern Interface** : Responsive user interface with React and Tailwind CSS
- 🛠️ **Calculators** : Integrated fuse and lockbit calculators
- 🔧 **TypeScript** : Complete type safety for all components
- ⚡ **Performance** : Optimized with Vite and modern React hooks

## Installation

```bash
# Clone the repository
git clone [your-repo]
cd atpack-viewer

# Install dependencies
npm install

# Run in development mode
npm run dev
```

## Usage

1. **Load an AtPack** : Click "Load AtPack" and select an .atpack file
2. **Select a device** : Choose a microcontroller from the list
3. **Explore** : View details, memory, fuses and calculators

## Available Scripts

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run preview` - Build preview
- `npm run test` - Unit tests
- `npm run lint` - ESLint linting
- `npm run lint:fix` - Automatic ESLint fixes

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Generic UI components
│   ├── device/         # Device-specific components
│   ├── calculators/    # Fuse/lockbit calculators
│   └── layout/         # Layout components
├── types/              # TypeScript definitions
├── services/           # Services (parsers, API)
├── stores/             # State management (Zustand)
├── utils/              # Utilities
└── hooks/              # Custom React hooks
```

## Technologies Used

- **Frontend** : React 18, TypeScript
- **Styling** : Tailwind CSS, Radix UI
- **State** : Zustand
- **Build** : Vite
- **Tests** : Vitest, React Testing Library
- **Linting** : ESLint, Prettier

## Development Features

### Debug Mode

When running in development mode (`npm run dev`), additional debug features are available:

- **Show Parser Test** button: Displays the XML parser test interface
- **Show Debug Info** button: Shows detailed debugging information about the loaded AtPack and devices

These debug features are automatically hidden in production builds to keep the interface clean for end users.

### Environment Detection

The application uses Vite's environment variables to detect the current mode:
- `development`: Debug features enabled
- `production`: Debug features hidden

### Package Drawing Scale

The package diagrams support adjustable scaling to accommodate different screen sizes and preferences:

- **Scale Range**: 0.3x to 2.0x (default: 1.0x)
- **Interactive Control**: Use the slider in the Packages section to adjust scale in real-time
- **Quick Reset**: Click the "Reset" button to return to default scale (1.0x)
- **All Elements Scaled**: Package body, pins, text, and orientation marks all scale proportionally

Example usage in code:
```tsx
<PackageImage 
  packageName="TQFP64"
  deviceName="AT90CAN128"
  pinout={pinoutData}
  scale={0.5}  // 50% of original size
/>
```

## Contributing

1. Fork the project
2. Create a feature branch (git checkout -b feature/AmazingFeature)
3. Commit changes (git commit -m 'Add AmazingFeature')
4. Push to the branch (git push origin feature/AmazingFeature)
5. Open a Pull Request

## License

This project is licensed under Apache 2.0 license - see the [LICENSE](LICENSE) file for details.

AtPack data files are copyrighted by Atmel/Microchip and are available on the following websites:

- https://packs.download.microchip.com/
- http://packs.download.atmel.com/
