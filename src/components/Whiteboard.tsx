import { useRef, useEffect, useState } from 'react';
import { Mic, MicOff, Eraser, Pencil, Trash2, Volume2, VolumeX } from 'lucide-react';

interface WhiteboardProps {
  onCanvasUpdate?: (canvasDataUrl: string) => void;
  backgroundImageUrl?: string;
  questionText?: string;
  isListening?: boolean;
  isSpeaking?: boolean;
  onToggleListening?: () => void;
  onToggleSpeaking?: () => void;
}

export function Whiteboard({
  onCanvasUpdate,
  backgroundImageUrl,
  questionText,
  isListening = false,
  isSpeaking = false,
  onToggleListening,
  onToggleSpeaking
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundRef = useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [textBackgroundUrl, setTextBackgroundUrl] = useState<string>('');
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
  const [color, setColor] = useState('#1e40af');
  const [lineWidth, setLineWidth] = useState(3);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

useEffect(() => {
    if (questionText && !backgroundImageUrl) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 1024;
      tempCanvas.height = 768;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      ctx.fillStyle = '#1e293b';
      ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const maxWidth = 700;
      const lineHeight = 36;
      const x = 40;
      let y = 40;

      const words = questionText.split(' ');
      let line = '';

      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line, x, y);
          line = words[i] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, y);

      setTextBackgroundUrl(tempCanvas.toDataURL('image/png'));
    } else if (!questionText && !backgroundImageUrl) {
      setTextBackgroundUrl('');
    }
  }, [questionText, backgroundImageUrl]);

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
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

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
    lastPosRef.current = pos;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPosRef.current) return;

    const pos = getMousePos(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.strokeStyle = tool === 'eraser' ? 'rgba(255, 255, 255, 1)' : color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';

    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPosRef.current = pos;
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;

    setIsDrawing(false);
    lastPosRef.current = null;

    if (canvasRef.current && onCanvasUpdate) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onCanvasUpdate(dataUrl);
    }
  };

  const notifyCanvasChange = () => {
    if (canvasRef.current && onCanvasUpdate) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onCanvasUpdate(dataUrl);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    notifyCanvasChange();
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

      <div className="flex-1 relative bg-white">
        {(backgroundImageUrl || textBackgroundUrl) && (
          <img
            ref={backgroundRef}
            src={backgroundImageUrl || textBackgroundUrl}
            alt="Whiteboard background"
            className="absolute pointer-events-none"
            style={{
              top: 0,
              left: 0,
              width: 'auto',
              height: 'auto',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          />
        )}

        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          style={{ background: 'transparent' }}
        />
      </div>
    </div>
  );
}
