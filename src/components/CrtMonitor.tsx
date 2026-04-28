import React, { useRef, useEffect } from 'react';
import './CrtMonitor.css';

interface CrtMonitorProps {
  stream: MediaStream | null;
  noiseIntensity?: number;
  isHorror?: boolean;
}

const CrtMonitor: React.FC<CrtMonitorProps> = ({ stream, noiseIntensity = 0.15, isHorror = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const horrorImageRef = useRef<HTMLCanvasElement | null>(null);

  // ホラー画像の生成 (不気味な顔のようなもの)
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // 背景
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 目（不気味な赤）
      ctx.fillStyle = '#880000';
      ctx.beginPath();
      ctx.ellipse(300, 250, 40, 60, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(500, 250, 40, 60, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // 瞳（真っ黒）
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(300, 250, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(500, 250, 10, 0, Math.PI * 2);
      ctx.fill();
      
      // 口
      ctx.strokeStyle = '#330000';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(250, 450);
      ctx.bezierCurveTo(350, 500, 450, 500, 550, 450);
      ctx.stroke();
      
      // 全体的なノイズ・テクスチャ
      for (let i = 0; i < 5000; i++) {
        ctx.fillStyle = `rgba(${Math.random() * 50}, 0, 0, ${Math.random() * 0.5})`;
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
      }
    }
    horrorImageRef.current = canvas;
  }, []);

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
        
        if (isHorror && horrorImageRef.current) {
          ctx.drawImage(horrorImageRef.current, 0, 0, canvas.width, canvas.height);
          // ホラー時はさらに赤みを加える
          ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          ctx.drawImage(video, -5, -5, canvas.width + 10, canvas.height + 10);
        }
        ctx.restore();

        // 2. 砂嵐ノイズ
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
