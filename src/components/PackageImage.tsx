import React, { useEffect, useRef, useState, useCallback } from 'react';

interface PackageImageProps {
  packageName: string;
  deviceName: string;
  pinout: Record<number, string>; // pinout[pinNumber] = padName
  width?: number;
  height?: number;
  scale?: number; // Scale factor for package drawing (default: 1.0)
}

interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
}

export const PackageImage: React.FC<PackageImageProps> = ({ 
  packageName, 
  deviceName,
  pinout,
  width = 600,
  height = 600,
  scale = 0.5
}) => {
  // View state for zoom and pan
  const [viewState, setViewState] = useState<ViewState>({
    zoom: 1.0,
    panX: 0,
    panY: 0
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  console.log('=== PackageImage Component Rendered ===');
  console.log('Props received:');
  console.log('- packageName:', packageName);
  console.log('- deviceName:', deviceName);
  console.log('- pinout:', pinout);
  console.log('- width:', width);
  console.log('- height:', height);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pin colors based on the original application
  const pinColor = (name?: string): string => {
    if (!name) return 'white';
    
    // Remove numbers to match by type
    const cleanName = name.replace(/(.*)\d+/, "$1");
    
    switch (cleanName) {
      case 'VDD':
      case 'VDDIO':
      case 'VDDCORE':
      case 'VCC': return "#ff0000";
      case 'VBUS':
      case 'UCAP':
      case 'UVCC': return "#c02020";
      case 'VDDANA':
      case 'AVDD':
      case 'AVCC': return "#ff2000";
      case 'AREF': return "#ff4010";
      case 'GNDANA':
      case 'AGND':
      case 'GND': return "#000000";
      case 'UGND': return "#202020";
      case 'DNC':
      case 'NC': return "#808080";
      case 'XTAL': return "#808000";
      case 'RESET_N':
      case 'RESET': return "#ff2080";
      case 'ADC': return "#20c0c0";
      case 'DP':
      case 'DM':
      case 'D+':
      case 'D-': return "#20c020";
      case 'PDI':
      case 'UPDI': return "#2020ff";
      default: return "white";
    }
  };

  // Extract type and pin count
  const getPackageInfo = (name: string) => {
    const upperName = name.toUpperCase();
    const pinMatch = name.match(/(\d+)/);
    const pinCount = pinMatch ? parseInt(pinMatch[1]) : Object.keys(pinout).length;
    
    let type = 'GENERIC';
    if (upperName.includes('TQFP') || upperName.includes('LQFP')) type = 'TQFP';
    else if (upperName.includes('QFN') || upperName.includes('MLF') || upperName.includes('VQFN')) type = 'QFN';
    else if (upperName.includes('PDIP') || upperName.includes('DIP')) type = 'PDIP';
    else if (upperName.includes('SOIC') || upperName.includes('TSSOP') || upperName.includes('UDFN') || upperName.includes('SOT23')) type = 'SOIC';
    
    return { type, pinCount };
  };

  const drawPackage = (canvas: HTMLCanvasElement, type: string, pinCount: number) => {
    console.log('=== START DRAWPACKAGE ===');
    console.log('Canvas:', canvas);
    console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Cannot get 2D context');
      return;
    }

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    console.log('Canvas cleared');

    // Basic test: draw a diagonal line to verify the canvas works
    /*
    ctx.save();
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.stroke();
    ctx.restore();
    console.log(`Diagonal line drawn from (0,0) to (${canvas.width},${canvas.height})`);
    */

    console.log('=== PARAMETRES DRAWPACKAGE ===');
    console.log('packageName:', packageName);
    console.log('deviceName:', deviceName);
    console.log('type:', type);
    console.log('pinCount:', pinCount);
    console.log('canvas dimensions:', width, 'x', height);
    console.log('pinout keys:', Object.keys(pinout));
    console.log('pinout complet:', pinout);

    // Test: draw text to verify display - 2 lines
    ctx.save();
    ctx.fillStyle = 'green';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const packageType = `${type}${pinCount}`;
    // Line 1: Package type (e.g. TQFP64)
    //ctx.fillText(packageType, width/2, height/2 - 15);
    
    // Line 2: Component name (e.g. AT90CAN128)
    //ctx.fillText(deviceName, width/2, height/2 + 15);
    
    ctx.restore();
    console.log(`Green text displayed at center:`);
    console.log(`Line 1: ${packageType}`);
    console.log(`Line 2: ${deviceName}`);

    // Use real pinout from AtPack data
    console.log('RECEIVED PINOUT:', pinout);
    console.log('Number of pins in pinout:', Object.keys(pinout).length);
    console.log('Pinout details:');
    Object.entries(pinout).forEach(([pin, pad]) => {
      console.log(`  Pin ${pin}: ${pad}`);
    });
    
    // Use real pinout, even if empty (show numbers only)
    const actualPinout = pinout;

    // Now draw the real package
    drawSimplePackage(ctx, type, pinCount, actualPinout);
    
    console.log('=== END DEBUG PackageImage ===');
  };

  // Simplified function to draw packages
  const drawSimplePackage = (ctx: CanvasRenderingContext2D, type: string, pinCount: number, actualPinout: Record<number, string>) => {
    console.log('=== DRAWING SIMPLE PACKAGE ===');
    console.log('Type:', type, 'PinCount:', pinCount, 'Scale:', scale);
    console.log('ViewState:', viewState);
    
    // Apply zoom and pan transformations
    ctx.save();
    ctx.translate(viewState.panX, viewState.panY);
    ctx.scale(viewState.zoom, viewState.zoom);
    
    // Base dimensions (scaled)
    const pinSpacing = 30 * scale;
    
    // Calculate package dimensions according to type
    let packageWidth = 200 * scale;
    let packageHeight = 200 * scale;
    let packageX = width / 2 - packageWidth / 2;
    let packageY = height / 2 - packageHeight / 2;
    
    // Adjust based on number of pins
    if (type === 'PDIP' || type === 'SOIC') {
      // 2-sided package
      packageHeight = Math.max(200 * scale, (pinCount / 2) * pinSpacing + 60 * scale);
      packageY = height / 2 - packageHeight / 2;
    } else {
      // 4-sided package (QFN, TQFP, etc.)
      const sideLength = Math.max(200 * scale, (pinCount / 4) * pinSpacing + 60 * scale);
      packageWidth = sideLength;
      packageHeight = sideLength;
      packageX = width / 2 - packageWidth / 2;
      packageY = height / 2 - packageHeight / 2;
    }
    
    // Draw the package body
    ctx.save();
    ctx.fillStyle = '#f0f0f0';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.fillRect(packageX, packageY, packageWidth, packageHeight);
    ctx.strokeRect(packageX, packageY, packageWidth, packageHeight);
    
    // Orientation mark (triangle or notch)
    ctx.fillStyle = 'black';
    if (type === 'PDIP' || type === 'SOIC') {
      // Half-circle (notch) at the center top for DIP/SOIC
      const notchX = packageX + packageWidth / 2;
      const notchY = packageY;
      const notchSize = 12 * scale;
      ctx.beginPath();
      ctx.arc(notchX, notchY, notchSize, 0, Math.PI, false);
      ctx.fill();
    } else {
      // Circular dot at the upper left corner for QFN/TQFP
      const dotSize = 8 * scale;
      const dotOffset = 5 * scale;
      ctx.beginPath();
      ctx.arc(packageX + dotSize + dotOffset, packageY + dotSize + dotOffset, dotSize, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Package text at center
    ctx.fillStyle = 'black';
    ctx.font = `bold ${16 * scale}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const packageType = `${type}${pinCount}`;
    ctx.fillText(packageType, packageX + packageWidth / 2, packageY + packageHeight / 2 - 10 * scale);
    ctx.font = `${14 * scale}px Arial`;
    ctx.fillText(deviceName, packageX + packageWidth / 2, packageY + packageHeight / 2 + 10 * scale);
    
    ctx.restore();
    
    // Draw pins based on package type
    if (type === 'PDIP' || type === 'SOIC') {
      drawDIPPins(ctx, packageX, packageY, packageWidth, packageHeight, pinCount, actualPinout);
    } else {
      drawQuadPins(ctx, packageX, packageY, packageWidth, packageHeight, pinCount, actualPinout);
    }
    
    // Restore transformations
    ctx.restore();
  };
  
  // Draw pins for DIP/SOIC packages (2 sides)
  const drawDIPPins = (ctx: CanvasRenderingContext2D, pkgX: number, pkgY: number, pkgW: number, pkgH: number, pinCount: number, actualPinout: Record<number, string>) => {
    const pinsPerSide = pinCount / 2;
    const pinSpacing = (pkgH - 40 * scale) / (pinsPerSide - 1);
    const pinSize = 20 * scale;
    const marginSize = 20 * scale;
    
    // Left side (pins 1 to pinsPerSide)
    for (let i = 0; i < pinsPerSide; i++) {
      const pinNum = i + 1;
      const pinY = pkgY + marginSize + i * pinSpacing;
      const pinX = pkgX - pinSize;
      
      // Draw the pin
      ctx.fillStyle = pinColor(actualPinout[pinNum]);
      ctx.fillRect(pinX, pinY, pinSize, pinSize);
      ctx.strokeStyle = 'black';
      ctx.strokeRect(pinX, pinY, pinSize, pinSize);
      
      // Pin number inside the component (to the right of the pin)
      ctx.fillStyle = 'black';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = `${10 * scale}px Arial`;
      ctx.fillText(pinNum.toString(), pkgX + 5 * scale, pinY + pinSize / 2);
      
      // Pin name outside the component (only if there's a name)
      if (actualPinout[pinNum]) {
        ctx.font = `${12 * scale}px Arial`;
        ctx.textAlign = 'right';
        ctx.fillText(actualPinout[pinNum], pinX - 5 * scale, pinY + pinSize / 2);
      }
    }
    
    // Right side (pins pinsPerSide+1 to pinCount)
    for (let i = 0; i < pinsPerSide; i++) {
      const pinNum = pinCount - i; // Reverse numbering
      const pinY = pkgY + marginSize + i * pinSpacing;
      const pinX = pkgX + pkgW;
      
      // Draw the pin
      ctx.fillStyle = pinColor(actualPinout[pinNum]);
      ctx.fillRect(pinX, pinY, pinSize, pinSize);
      ctx.strokeStyle = 'black';
      ctx.strokeRect(pinX, pinY, pinSize, pinSize);
      
      // Pin number inside the component (to the left of the pin)
      ctx.fillStyle = 'black';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.font = `${10 * scale}px Arial`;
      ctx.fillText(pinNum.toString(), pkgX + pkgW - 5 * scale, pinY + pinSize / 2);
      
      // Pin name outside the component (only if there's a name)
      if (actualPinout[pinNum]) {
        ctx.font = `${12 * scale}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(actualPinout[pinNum], pinX + pinSize + 5 * scale, pinY + pinSize / 2);
      }
    }
  };
  
  // Draw pins for QFN/TQFP packages (4 sides)
  const drawQuadPins = (ctx: CanvasRenderingContext2D, pkgX: number, pkgY: number, pkgW: number, pkgH: number, pinCount: number, actualPinout: Record<number, string>) => {
    const pinsPerSide = pinCount / 4;
    const pinSize = 15 * scale;
    const marginSize = 20 * scale;
    
    ctx.font = `${10 * scale}px Arial`;
    
    // Left side (pins 1 to pinsPerSide)
    const leftSpacing = (pkgH - 40 * scale) / (pinsPerSide - 1);
    for (let i = 0; i < pinsPerSide; i++) {
      const pinNum = i + 1;
      const pinY = pkgY + marginSize + i * leftSpacing;
      const pinX = pkgX - pinSize;
      
      drawPin(ctx, pinX, pinY, pinSize, pinNum, actualPinout[pinNum], 'left');
    }
    
    // Bottom side (pins pinsPerSide+1 to 2*pinsPerSide)
    const bottomSpacing = (pkgW - 40 * scale) / (pinsPerSide - 1);
    for (let i = 0; i < pinsPerSide; i++) {
      const pinNum = pinsPerSide + i + 1;
      const pinX = pkgX + marginSize + i * bottomSpacing;
      const pinY = pkgY + pkgH;
      
      drawPin(ctx, pinX, pinY, pinSize, pinNum, actualPinout[pinNum], 'bottom');
    }
    
    // Right side (pins 2*pinsPerSide+1 to 3*pinsPerSide)
    for (let i = 0; i < pinsPerSide; i++) {
      const pinNum = 2 * pinsPerSide + i + 1;
      const pinY = pkgY + pkgH - marginSize - i * leftSpacing; // Reversed
      const pinX = pkgX + pkgW;
      
      drawPin(ctx, pinX, pinY, pinSize, pinNum, actualPinout[pinNum], 'right');
    }
    
    // Top side (pins 3*pinsPerSide+1 to pinCount)
    for (let i = 0; i < pinsPerSide; i++) {
      const pinNum = 3 * pinsPerSide + i + 1;
      const pinX = pkgX + pkgW - marginSize - i * bottomSpacing; // Reversed
      const pinY = pkgY - pinSize;
      
      drawPin(ctx, pinX, pinY, pinSize, pinNum, actualPinout[pinNum], 'top');
    }
  };
  
  // Helper function to draw an individual pin
  const drawPin = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, pinNum: number, pinName: string, side: string) => {
    // Draw the pin
    ctx.fillStyle = pinColor(pinName);
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = 'black';
    ctx.strokeRect(x, y, size, size);
    
    // Pin number inside the component based on orientation
    ctx.fillStyle = 'black';
    ctx.font = `${8 * scale}px Arial`;
    
    // Pin name outside the component based on orientation
    ctx.font = `${10 * scale}px Arial`;
    
    switch (side) {
      case 'left':
        // Number to the right of the pin (inside the component)
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = `${8 * scale}px Arial`;
        ctx.fillText(pinNum.toString(), x + size + 3 * scale, y + size / 2);
        
        // Name to the left of the pin (outside the component)
        if (pinName) {
          ctx.font = `${10 * scale}px Arial`;
          ctx.textAlign = 'right';
          ctx.fillText(pinName, x - 5 * scale, y + size / 2);
        }
        break;
        
      case 'right':
        // Number to the left of the pin (inside the component)
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.font = `${8 * scale}px Arial`;
        ctx.fillText(pinNum.toString(), x - 3 * scale, y + size / 2);
        
        // Name to the right of the pin (outside the component)
        if (pinName) {
          ctx.font = `${10 * scale}px Arial`;
          ctx.textAlign = 'left';
          ctx.fillText(pinName, x + size + 5 * scale, y + size / 2);
        }
        break;
        
      case 'top':
        // Number below the pin (inside the component)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = `${8 * scale}px Arial`;
        ctx.fillText(pinNum.toString(), x + size / 2, y + size + 3 * scale);
        
        // Name above the pin (outside the component) - aligned left (pin side)
        if (pinName) {
          ctx.save();
          ctx.translate(x + size / 2, y - 5 * scale);
          ctx.rotate(-Math.PI / 2);
          ctx.font = `${10 * scale}px Arial`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(pinName, 0, 0);
          ctx.restore();
        }
        break;
        
      case 'bottom':
        // Number above the pin (inside the component)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.font = `${8 * scale}px Arial`;
        ctx.fillText(pinNum.toString(), x + size / 2, y - 3 * scale);
        
        // Name below the pin (outside the component) - aligned right (pin side)
        if (pinName) {
          ctx.save();
          ctx.translate(x + size / 2, y + size + 5 * scale);
          ctx.rotate(-Math.PI / 2);
          ctx.font = `${10 * scale}px Arial`;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(pinName, 0, 0);
          ctx.restore();
        }
        break;
    }
  };

  // Mouse and wheel event handlers
  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    
    setViewState(prev => {
      const newZoom = Math.max(0.1, Math.min(5.0, prev.zoom * zoomFactor));
      
      // Zoom towards mouse position
      const zoomChange = newZoom / prev.zoom;
      const newPanX = mouseX - (mouseX - prev.panX) * zoomChange;
      const newPanY = mouseY - (mouseY - prev.panY) * zoomChange;
      
      return {
        zoom: newZoom,
        panX: newPanX,
        panY: newPanY
      };
    });
  }, []);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setLastMousePos({ x: event.clientX, y: event.clientY });
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const deltaX = event.clientX - lastMousePos.x;
    const deltaY = event.clientY - lastMousePos.y;

    setViewState(prev => ({
      ...prev,
      panX: prev.panX + deltaX,
      panY: prev.panY + deltaY
    }));

    setLastMousePos({ x: event.clientX, y: event.clientY });
  }, [isDragging, lastMousePos]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = useCallback(() => {
    setViewState({
      zoom: 1.0,
      panX: 0,
      panY: 0
    });
  }, []);

  // Set up wheel event listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  useEffect(() => {
    console.log('PackageImage useEffect triggered');
    console.log('canvasRef.current:', canvasRef.current);
    console.log('packageName:', packageName);
    console.log('pinout:', pinout);
    
    if (canvasRef.current) {
      const { type, pinCount } = getPackageInfo(packageName);
      console.log('Calling drawPackage with type:', type, 'pinCount:', pinCount);
      drawPackage(canvasRef.current, type, pinCount);
    } else {
      console.log('Canvas ref is null!');
    }
  }, [packageName, deviceName, pinout, width, height, scale, viewState]);

  return (
    <div style={{ display: 'inline-block', margin: '10px', textAlign: 'center' }}>
      {/* Zoom and Pan Controls */}
      <div style={{ 
        marginBottom: '5px', 
        fontSize: '12px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '10px',
        backgroundColor: '#f5f5f5',
        padding: '5px',
        borderRadius: '3px'
      }}>
        <span>Zoom: {viewState.zoom.toFixed(1)}x</span>
        <button 
          onClick={resetView} 
          style={{ 
            padding: '2px 6px', 
            fontSize: '10px',
            border: '1px solid #ccc',
            borderRadius: '2px',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          Reset View
        </button>
        <span style={{ fontSize: '10px', color: '#666' }}>
          Mouse wheel: zoom | Drag: pan
        </span>
      </div>
      
      <canvas 
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          border: '1px solid #ccc',
          backgroundColor: 'white',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      />
      <div style={{ fontSize: '12px', marginTop: '5px', fontWeight: 'bold' }}>
        {packageName}
      </div>
    </div>
  );
};

export default PackageImage;
