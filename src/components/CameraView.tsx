import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Zap, Crown, Barcode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode } from 'html5-qrcode';
import { AdBanner } from './AdBanner';

interface CameraViewProps {
  onCapture: (base64Image: string, isBarcode?: boolean) => void;
  onBarcodeScan: (barcode: string) => void;
  isProcessing: boolean;
  scansToday: number;
  scanLimit: number;
  isPremium: boolean;
}

export const CameraView: React.FC<CameraViewProps> = ({ 
  onCapture, 
  onBarcodeScan,
  isProcessing, 
  scansToday, 
  scanLimit, 
  isPremium 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBarcodeMode, setIsBarcodeMode] = useState(false);
  const [showScanSuccess, setShowScanSuccess] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedCode = useRef<string | null>(null);
  const lastScanTime = useRef<number>(0);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startCamera = async () => {
    try {
      if (isBarcodeMode) {
        stopStream();
        await stopScanner();

        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode("barcode-reader");
        }

        await scannerRef.current.start(
          { facingMode: "environment" },
          {
            fps: 20,
            aspectRatio: 1.0
          },
          (decodedText) => {
            const now = Date.now();
            if (decodedText === lastScannedCode.current && now - lastScanTime.current < 3000) {
              return;
            }
            
            lastScannedCode.current = decodedText;
            lastScanTime.current = now;

            if (navigator.vibrate) navigator.vibrate(100);
            
            // Play success sound
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
              audio.volume = 0.5;
              audio.play().catch(() => {});
            } catch (e) {}
            
            setShowScanSuccess(true);
            setTimeout(() => setShowScanSuccess(false), 500);

            onBarcodeScan(decodedText);
          },
          () => {}
        );

        try {
          const capabilities = scannerRef.current.getRunningTrackCapabilities();
          if (capabilities.torch) {
            setHasTorch(true);
          }
        } catch (e) {
          console.log("Torch not supported", e);
        }
      } else {
        await stopScanner();
        stopStream();

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        const track = mediaStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        setHasTorch(!!capabilities.torch);
      }
    } catch (err) {
      if (err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setError('Camera permission was denied. Please enable it in your browser settings and refresh.');
      } else {
        setError('Could not access camera. Please ensure permissions are granted and you are using HTTPS.');
      }
      console.error(err);
    }
  };

  const toggleTorch = async () => {
    try {
      const newTorchState = !isTorchOn;
      if (isBarcodeMode && scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: newTorchState }] as any
        });
      } else if (stream) {
        const track = stream.getVideoTracks()[0];
        await track.applyConstraints({
          advanced: [{ torch: newTorchState }] as any
        });
      }
      setIsTorchOn(newTorchState);
    } catch (err) {
      console.error("Error toggling torch:", err);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopStream();
      stopScanner();
    };
  }, [isBarcodeMode]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(50);
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Downscale image to max 1024px to prevent Gemini processing errors
      const MAX_DIMENSION = 1024;
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      if (width > height) {
        if (width > MAX_DIMENSION) {
          height *= MAX_DIMENSION / width;
          width = MAX_DIMENSION;
        }
      } else {
        if (height > MAX_DIMENSION) {
          width *= MAX_DIMENSION / height;
          height = MAX_DIMENSION;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // 0.8 quality for smaller payload
        onCapture(dataUrl, isBarcodeMode);
      }
    }
  };

  return (
    <div className="relative w-full aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10">
      {/* Main Viewport */}
      <div className="absolute inset-0">
        {isBarcodeMode ? (
          <div 
            id="barcode-reader" 
            className="w-full h-full"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {/* Scan Success Flash */}
      <AnimatePresence>
        {showScanSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-emerald-500/30 z-30 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1.2 }}
              className="bg-white p-4 rounded-full shadow-2xl"
            >
              <Barcode className="w-12 h-12 text-emerald-500" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barcode Framing Overlay (Visual only in barcode mode) */}
      <AnimatePresence>
        {isBarcodeMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10"
          >
            <div className="w-64 h-40 border-2 border-emerald-500 rounded-2xl relative">
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-500 rounded-br-lg" />
              <motion.div 
                animate={{ top: ['10%', '90%', '10%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-0.5 bg-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
              />
            </div>
            <p className="mt-4 text-white text-xs font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
              Scan de barcode van het product
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/90 p-6 text-center">
          <p className="text-white font-medium">{error}</p>
        </div>
      )}

      <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
        {!isPremium && (
          <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-white text-[10px] font-bold uppercase tracking-wider">
              {Math.max(0, scanLimit - scansToday)} Scans Left
            </span>
          </div>
        )}
        {isPremium && (
          <div className="bg-amber-400 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-lg">
            <Crown className="w-3 h-3 text-zinc-900 fill-zinc-900" />
            <span className="text-zinc-900 text-[10px] font-bold uppercase tracking-wider">
              Premium
            </span>
          </div>
        )}

        {hasTorch && (
          <button
            onClick={toggleTorch}
            className={`p-2 rounded-xl backdrop-blur-md border transition-all ${
              isTorchOn 
                ? 'bg-amber-400 border-amber-300 text-zinc-900' 
                : 'bg-black/40 border-white/10 text-white'
            }`}
          >
            <Zap className={`w-5 h-5 ${isTorchOn ? 'fill-zinc-900' : ''}`} />
          </button>
        )}
      </div>

      <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-6">
        <button
          onClick={() => setIsBarcodeMode(!isBarcodeMode)}
          className={`p-3 rounded-2xl border backdrop-blur-md transition-all ${
            isBarcodeMode 
              ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' 
              : 'bg-black/40 border-white/10 text-white hover:bg-black/60'
          }`}
        >
          <Barcode className="w-6 h-6" />
        </button>

        {!isBarcodeMode && (
          <button
            onClick={capturePhoto}
            disabled={isProcessing}
            className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
          >
            <div className="w-16 h-16 rounded-full border-4 border-zinc-200 flex items-center justify-center">
              <Camera className="w-8 h-8 text-zinc-900" />
            </div>
          </button>
        )}
      </div>

      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center z-20"
          >
            <div className="relative w-24 h-24">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-full h-full border-4 border-white/20 border-t-white rounded-full"
              />
              <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-white fill-white" />
            </div>
            <p className="mt-4 text-white font-medium tracking-wide uppercase text-xs">Analyzing Meal...</p>
            {!isPremium && (
              <div className="mt-8 w-64">
                <AdBanner type="card" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
