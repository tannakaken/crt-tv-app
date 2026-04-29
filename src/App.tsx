import { useState, useEffect } from 'react';
import { useCamera } from './hooks/useCamera';
import { useFaceDetection } from './hooks/useFaceDetection';
import CrtMonitor from './components/CrtMonitor';
import './App.css';

function App() {
  const { stream, startCamera } = useCamera();
  const { results: faceResults } = useFaceDetection(stream);
  const [noiseIntensity, setNoiseIntensity] = useState(0.05);
  const [isHorror, setIsHorror] = useState(false);
  const [phase, setPhase] = useState<'normal' | 'glitching' | 'whiteout' | 'reveal'>('normal');
  const [showModal, setShowModal] = useState(true);

  const handleStart = () => {
    setShowModal(false);
    startCamera();
  };

  useEffect(() => {
    if (phase === 'normal' && faceResults && faceResults.faceLandmarks.length > 0) {
      setPhase('glitching');
    }
  }, [faceResults, phase]);

  useEffect(() => {
    if (phase === 'glitching') {
      const interval = setInterval(() => {
        setNoiseIntensity(prev => {
          if (prev >= 1) {
            clearInterval(interval);
            setPhase('whiteout');
            return 1;
          }
          return prev + 0.05; // 少し速める
        });
      }, 50);
      return () => clearInterval(interval);
    }

    if (phase === 'whiteout') {
      const timer = setTimeout(() => {
        setIsHorror(true);
        setPhase('reveal');
      }, 1500); 
      return () => clearTimeout(timer);
    }

    if (phase === 'reveal') {
      const interval = setInterval(() => {
        setNoiseIntensity(prev => {
          if (prev <= 0.2) {
            clearInterval(interval);
            return 0.2;
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
          faceLandmarks={faceResults?.faceLandmarks?.[0]}
        />
      </main>
    </div>
  );
}

export default App;
