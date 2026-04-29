import { useState, useEffect, useRef, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision';

export const useFaceDetection = (stream: MediaStream | null) => {
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  const [results, setResults] = useState<FaceLandmarkerResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const requestRef = useRef<number>(null);

  useEffect(() => {
    const initFaceLandmarker = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        setFaceLandmarker(landmarker);
        setIsLoading(false);
      } catch (err) {
        console.error("FaceLandmarker initialization failed:", err);
        setError("Failed to load face detection model.");
        setIsLoading(false);
      }
    };

    initFaceLandmarker();
  }, []);

  const detect = useCallback(() => {
    if (faceLandmarker && videoRef.current && videoRef.current.readyState >= 2) {
      const startTimeMs = performance.now();
      const results = faceLandmarker.detectForVideo(videoRef.current, startTimeMs);
      setResults(results);
    }
    requestRef.current = requestAnimationFrame(detect);
  }, [faceLandmarker]);

  useEffect(() => {
    if (stream && faceLandmarker) {
      if (!videoRef.current) {
        videoRef.current = document.createElement('video');
      }
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      requestRef.current = requestAnimationFrame(detect);
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [stream, faceLandmarker, detect]);

  return { results };
};
