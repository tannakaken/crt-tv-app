import React, { useRef, useEffect } from 'react';
import './CrtMonitor.css';

interface CrtMonitorProps {
  stream: MediaStream | null;
  noiseIntensity?: number;
  isHorror?: boolean;
  noiseDelay?: number;
}

const CrtMonitor: React.FC<CrtMonitorProps> = ({ stream, noiseIntensity = 0.15, isHorror = false, noiseDelay = 0 }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const capturedFrameRef = useRef<ImageData | null>(null);
  const noiseEnabledRef = useRef(noiseDelay <= 0);

  useEffect(() => {
    if (noiseDelay > 0) {
      const timer = setTimeout(() => {
        noiseEnabledRef.current = true;
      }, noiseDelay * 1000);
      return () => clearTimeout(timer);
    }
  }, [noiseDelay]);

  const applyWaveDistortion = (imageData: ImageData, wavePhase: number): ImageData => {
    const { width, height, data } = imageData;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    const newImageData = tempCtx.createImageData(width, height);
    const newData = newImageData.data;

    const frequency = 0.04;
    const amplitude = 16;

    // 水平波形歪み
    for (let y = 0; y < height; y++) {
      const offset = Math.sin(y * frequency + wavePhase) * amplitude;
      for (let x = 0; x < width; x++) {
        const srcX = Math.round(x + offset);
        if (srcX >= 0 && srcX < width) {
          const srcIdx = (y * width + srcX) * 4;
          const dstIdx = (y * width + x) * 4;
          newData[dstIdx] = data[srcIdx];
          newData[dstIdx + 1] = data[srcIdx + 1];
          newData[dstIdx + 2] = data[srcIdx + 2];
          newData[dstIdx + 3] = data[srcIdx + 3];
        }
      }
    }
    // 垂直波形歪み
    const finalResult = tempCtx.createImageData(width, height);
    const verticalData = finalResult.data;

    const verticalFrequency = 0.03;
    const verticalAmplitude = 18;

    for (let x = 0; x < width; x++) {
      const offset = Math.sin(x * verticalFrequency + wavePhase) * verticalAmplitude;
      for (let y = 0; y < height; y++) {
      const srcY = Math.round(y + offset);
      if (srcY >= 0 && srcY < height) {
        const srcIdx = (srcY * width + x) * 4;
        const dstIdx = (y * width + x) * 4;
        verticalData[dstIdx] = newData[srcIdx];
        verticalData[dstIdx + 1] = newData[srcIdx + 1];
        verticalData[dstIdx + 2] = newData[srcIdx + 2];
        verticalData[dstIdx + 3] = newData[srcIdx + 3];
      }
      }
    }

    return finalResult;
  };

  const applyRedBlackFilter = (imageData: ImageData): ImageData => {
    const { width, height, data } = imageData;
    const newImageData = new ImageData(width, height);
    const newData = newImageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      newData[i] = Math.min(255, gray * 1.5 + 80);
      newData[i + 1] = Math.max(0, gray * 0.2 - 40);
      newData[i + 2] = Math.max(0, gray * 0.2 - 40);
      newData[i + 3] = 255;
    }

    return newImageData;
  };

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      if (isHorror || video.readyState === video.HAVE_ENOUGH_DATA) {
        if (canvas.width !== (isHorror ? 800 : video.videoWidth)) {
          canvas.width = isHorror ? 800 : video.videoWidth;
          canvas.height = isHorror ? 600 : video.videoHeight;
        }

        const jitterX = (Math.random() - 0.5) * (4 + noiseIntensity * 20);
        const jitterY = (Math.random() - 0.5) * (4 + noiseIntensity * 20);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(jitterX, jitterY);
        
        if (isHorror) {
          if (!capturedFrameRef.current && video.readyState === video.HAVE_ENOUGH_DATA) {
            try {
              ctx.drawImage(video, -5, -5, canvas.width + 10, canvas.height + 10);
              capturedFrameRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
            } catch {}
          }
          if (capturedFrameRef.current) {
            const distorted = applyWaveDistortion(capturedFrameRef.current, 0);
            const filtered = applyRedBlackFilter(distorted);
            ctx.putImageData(filtered, 0, 0);
          }
        } else {
          ctx.drawImage(video, -5, -5, canvas.width + 10, canvas.height + 10);
        }
        ctx.restore();

        // 2. 砂嵐ノイズ
        if (noiseEnabledRef.current) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          for (let i = 0; i < data.length; i += 4) {
            if (Math.random() < noiseIntensity) {
              const noise = Math.random() * 255;
              data[i] = noise;
              data[i + 1] = noise;
              data[i + 2] = noise;
              data[i + 3] = 255; 
            }
          }
          ctx.putImageData(imageData, 0, 0);

          // 3. 水平同期ズレ
          if (Math.random() > (1 - noiseIntensity)) {
            const sliceY = Math.random() * canvas.height;
            const sliceH = Math.random() * (20 + noiseIntensity * 100);
            const hOffset = (Math.random() - 0.5) * (20 + noiseIntensity * 200);
            ctx.drawImage(canvas, 0, sliceY, canvas.width, sliceH, hOffset, sliceY, canvas.width, sliceH);
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [stream, noiseIntensity, isHorror]);

  return (
    <div className="monitor-container">
      <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }} />
      <div className="screen-frame">
        <canvas ref={canvasRef} className="crt-canvas" />
        <div className="scanlines"></div>
        <div className="flicker"></div>
        <div className="vignette"></div>
      </div>
    </div>
  );
};

export default CrtMonitor;
