import React, { useRef, useEffect } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import './CrtMonitor.css';

interface CrtMonitorProps {
  stream: MediaStream | null;
  noiseIntensity?: number;
  isHorror?: boolean;
  faceLandmarks?: NormalizedLandmark[];
}

const CrtMonitor: React.FC<CrtMonitorProps> = ({ 
  stream, 
  noiseIntensity = 0.15, 
  isHorror = false,
  faceLandmarks
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const capturedFrameRef = useRef<ImageData | null>(null);
  const faceCenterRef = useRef<{x: number, y: number} | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // 顔の中心を計算（鼻先などの代表点を使用するか、全点の平均をとる）
  useEffect(() => {
    if (faceLandmarks && faceLandmarks.length > 0) {
      // 1番（鼻先）や平均など。ここでは全点の平均をとる
      let sumX = 0;
      let sumY = 0;
      faceLandmarks.forEach(lp => {
        sumX += lp.x;
        sumY += lp.y;
      });
      faceCenterRef.current = {
        x: sumX / faceLandmarks.length,
        y: sumY / faceLandmarks.length
      };
    }
  }, [faceLandmarks]);

  const applySwirlDistortion = (imageData: ImageData, centerX: number, centerY: number, radius: number, angle: number): ImageData => {
    const { width, height, data } = imageData;
    const newImageData = new ImageData(new Uint8ClampedArray(data), width, height);
    const newData = newImageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < radius) {
          const percent = (radius - distance) / radius;
          const theta = angle * percent * percent;
          const cosTheta = Math.cos(theta);
          const sinTheta = Math.sin(theta);

          const sourceX = Math.round(centerX + dx * cosTheta - dy * sinTheta);
          const sourceY = Math.round(centerY + dx * sinTheta + dy * cosTheta);

          if (sourceX >= 0 && sourceX < width && sourceY >= 0 && sourceY < height) {
            const destIdx = (y * width + x) * 4;
            const srcIdx = (sourceY * width + sourceX) * 4;
            newData[destIdx] = data[srcIdx];
            newData[destIdx + 1] = data[srcIdx + 1];
            newData[destIdx + 2] = data[srcIdx + 2];
            newData[destIdx + 3] = data[srcIdx + 3];
          }
        }
      }
    }
    return newImageData;
  };

  const applyHorrorFilter = (imageData: ImageData): ImageData => {
    const { data } = imageData;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // グレースケール化
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // 赤黒いコントラスト強調
      // 暗い部分はより黒く、明るい部分は赤く
      if (gray < 128) {
        data[i] = gray * 0.8;   // Red
        data[i + 1] = 0;        // Green
        data[i + 2] = 0;        // Blue
      } else {
        data[i] = Math.min(255, gray * 1.5);
        data[i + 1] = (gray - 128) * 0.2;
        data[i + 2] = (gray - 128) * 0.2;
      }
    }
    return imageData;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA || isHorror) {
        if (canvas.width !== video.videoWidth && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (isHorror) {
          // ホラーモード：キャプチャした画像を表示
          if (!capturedFrameRef.current && video.readyState === video.HAVE_ENOUGH_DATA) {
            ctx.drawImage(video, 0, 0);
            capturedFrameRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
          }

          if (capturedFrameRef.current) {
            let processedData = new ImageData(
              new Uint8ClampedArray(capturedFrameRef.current.data),
              capturedFrameRef.current.width,
              capturedFrameRef.current.height
            );

            // 渦巻き歪み
            if (faceCenterRef.current) {
              const cx = faceCenterRef.current.x * canvas.width;
              const cy = faceCenterRef.current.y * canvas.height;
              processedData = applySwirlDistortion(processedData, cx, cy, 250, Math.PI * 2.5);
            }

            // ホラーフィルター
            processedData = applyHorrorFilter(processedData);
            
            ctx.putImageData(processedData, 0, 0);
          }
        } else {
          // 通常モード：カメラ映像
          ctx.drawImage(video, 0, 0);
        }

        // 砂嵐ノイズ
        if (noiseIntensity > 0) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            if (Math.random() < noiseIntensity) {
              const noise = Math.random() * 255;
              data[i] = noise;
              data[i + 1] = noise;
              data[i + 2] = noise;
            }
          }
          ctx.putImageData(imageData, 0, 0);
          
          // 水平同期ズレ風のライン
          if (Math.random() < noiseIntensity * 0.3) {
            const h = Math.random() * 20;
            const y = Math.random() * canvas.height;
            const offset = (Math.random() - 0.5) * 40 * noiseIntensity;
            ctx.drawImage(canvas, 0, y, canvas.width, h, offset, y, canvas.width, h);
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
