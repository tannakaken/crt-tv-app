import { useState, useEffect } from 'react';
import { useCamera } from './hooks/useCamera';
import CrtMonitor from './components/CrtMonitor';
import './App.css';

function App() {
  const { stream, startCamera } = useCamera();
  const [noiseIntensity, setNoiseIntensity] = useState(0.05);
  const [isHorror, setIsHorror] = useState(false);
  const [phase, setPhase] = useState<'normal' | 'glitching' | 'whiteout' | 'reveal'>('normal');
  const [showModal, setShowModal] = useState(true);

  const handleStart = () => {
    setShowModal(false);
    startCamera();
  };

  useEffect(() => {
    if (!stream) return;

    // 演出のタイムライン
    const timer = setTimeout(() => {
      setPhase('glitching');
    }, 5000); // 5秒後にノイズが強くなり始める

    return () => clearTimeout(timer);
  }, [stream]);

  useEffect(() => {
    if (phase === 'glitching') {
      const interval = setInterval(() => {
        setNoiseIntensity(prev => {
          if (prev >= 1) {
            clearInterval(interval);
            setPhase('whiteout');
            return 1;
          }
          return prev + 0.02;
        });
      }, 100);
      return () => clearInterval(interval);
    }

    if (phase === 'whiteout') {
      const timer = setTimeout(() => {
        setIsHorror(true);
        setPhase('reveal');
      }, 2000); // 完全に真っ白な状態を2秒維持
      return () => clearTimeout(timer);
    }

    if (phase === 'reveal') {
      const interval = setInterval(() => {
        setNoiseIntensity(prev => {
          if (prev <= 0.15) {
            clearInterval(interval);
            return 0.15;
          }
          return prev - 0.05;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [phase]);

  return (
    <div className="app-container horror-mode">
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>あなたの真の姿を映してください</h2>
            <button onClick={handleStart}>OK</button>
          </div>
        </div>
      )}
      <main className="main-content full-screen">
        <CrtMonitor 
          stream={stream} 
          noiseIntensity={noiseIntensity} 
          isHorror={isHorror}
          noiseDelay={5}
        />
      </main>
    </div>
  );
}

export default App;
