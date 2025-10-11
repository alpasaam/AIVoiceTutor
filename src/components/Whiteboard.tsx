import { useRef, useEffect, useState } from 'react';
import { Mic, MicOff, Eraser, Pencil, Upload, Type, Trash2, Volume2, VolumeX } from 'lucide-react';

interface DrawingElement {
  type: 'path' | 'text' | 'image';
  data: any;
  timestamp: number;
}

interface WhiteboardProps {
  onCanvasUpdate?: (elements: DrawingElement[]) => void;
  initialElements?: DrawingElement[];
  isListening?: boolean;
  isSpeaking?: boolean;
  onToggleListening?: () => void;
  onToggleSpeaking?: () => void;
}

export function Whiteboard({
  onCanvasUpdate,
  initialElements = [],
  isListening = false,
  isSpeaking = false,
  onToggleListening,
  onToggleSpeaking
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
  const [color, setColor] = useState('#1e40af');
  const [lineWidth, setLineWidth] = useState(3);
  const [elements, setElements] = useState<DrawingElement[]>(initialElements);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      redrawCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  useEffect(() => {
    redrawCanvas();
  }, [elements]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    elements.forEach((element) => {
      if (element.type === 'path') {
        drawPath(ctx, element.data);
      } else if (element.type === 'image') {
        const img = new Image();
        img.src = element.data.url;
        img.onload = () => {
          ctx.drawImage(img, element.data.x, element.data.y, element.data.width, element.data.height);
        };
      } else if (element.type === 'text') {
        ctx.font = element.data.font || '16px sans-serif';
        ctx.fillStyle = element.data.color || '#000000';
        ctx.fillText(element.data.text, element.data.x, element.data.y);
      }
    });
  };

  const drawPath = (ctx: CanvasRenderingContext2D, pathData: any) => {
    if (pathData.points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = pathData.color;
    ctx.lineWidth = pathData.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(pathData.points[0].x, pathData.points[0].y);
    for (let i = 1; i < pathData.points.length; i++) {
      ctx.lineTo(pathData.points[i].x, pathData.points[i].y);
    }
    ctx.stroke();
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const pos = getMousePos(e);
    setCurrentPath([pos]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const pos = getMousePos(e);
    const newPath = [...currentPath, pos];
    setCurrentPath(newPath);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentPath.length > 0) {
      ctx.moveTo(currentPath[currentPath.length - 1].x, currentPath[currentPath.length - 1].y);
    }
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    if (isDrawing && currentPath.length > 1) {
      const newElement: DrawingElement = {
        type: 'path',
        data: {
          points: currentPath,
          color: tool === 'eraser' ? '#ffffff' : color,
          lineWidth: tool === 'eraser' ? lineWidth * 3 : lineWidth,
        },
        timestamp: Date.now(),
      };

      const updatedElements = [...elements, newElement];
      setElements(updatedElements);
      onCanvasUpdate?.(updatedElements);
    }

    setIsDrawing(false);
    setCurrentPath([]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const maxWidth = canvas.width / window.devicePixelRatio * 0.5;
        const scale = maxWidth / img.width;
        const width = img.width * scale;
        const height = img.height * scale;

        const newElement: DrawingElement = {
          type: 'image',
          data: {
            url: event.target?.result as string,
            x: 50,
            y: 50,
            width,
            height,
          },
          timestamp: Date.now(),
        };

        const updatedElements = [...elements, newElement];
        setElements(updatedElements);
        onCanvasUpdate?.(updatedElements);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const clearCanvas = () => {
    setElements([]);
    onCanvasUpdate?.([]);
    redrawCanvas();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setTool('pencil')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition ${
                tool === 'pencil' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Pencil className="w-4 h-4" />
              <span>Draw</span>
            </button>

            <button
              onClick={() => setTool('eraser')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition ${
                tool === 'eraser' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Eraser className="w-4 h-4" />
              <span>Erase</span>
            </button>

            <div className="flex items-center space-x-2 ml-4">
              <label className="text-sm font-medium text-slate-700">Color:</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <label className="text-sm font-medium text-slate-700">Size:</label>
              <input
                type="range"
                min="1"
                max="20"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-slate-600 w-8">{lineWidth}px</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onToggleSpeaking && (
              <button
                onClick={onToggleSpeaking}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition ${
                  isSpeaking
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-slate-600 text-white hover:bg-slate-700'
                }`}
              >
                {isSpeaking ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span>{isSpeaking ? 'Voice On' : 'Voice Off'}</span>
              </button>
            )}

            {onToggleListening && (
              <button
                onClick={onToggleListening}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition ${
                  isListening
                    ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isListening ? 'Stop Listening' : 'Start Voice'}</span>
              </button>
            )}

            <label className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 cursor-pointer transition">
              <Upload className="w-4 h-4" />
              <span>Upload Image</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>

            <button
              onClick={clearCanvas}
              className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="absolute inset-0 w-full h-full cursor-crosshair bg-white"
        />
      </div>
    </div>
  );
}
