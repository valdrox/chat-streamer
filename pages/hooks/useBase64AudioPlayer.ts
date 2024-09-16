import { useState, useRef, useCallback, useEffect } from 'react';

// Define the custom hook
const useBase64AudioPlayer = (onChunkChange?: (chunk: { audio: string; metadata: object } | null) => void) => {
  const [queue, setQueue] = useState<Array<{ audio: string; metadata: object }>>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlaying = useRef(false);

  // Initialize AudioContext
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  // Function to decode and play a base64 audio chunk
  const playChunk = useCallback(async (chunk: { audio: string; metadata: object }) => {
    if (!audioContextRef.current) return;

    const { audio, metadata } = chunk;

    // Convert base64 to ArrayBuffer
    const binaryString = atob(audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    try {
      // Decode the audio data
      const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);

      // Create a buffer source and connect it to the audio context
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      // Start playback and handle when it ends
      source.start();
      source.onended = () => {
        setQueue((prevQueue) => prevQueue.slice(1)); // Remove the played chunk from the queue
        isPlaying.current = false;

        // When audio ends, provide null to indicate no chunk is playing
        if (onChunkChange) {
          onChunkChange(null);
        }
      };

      // Trigger the callback when the chunk starts playing
      if (onChunkChange) {
        onChunkChange(chunk);
      }
    } catch (error) {
      console.error('Error decoding or playing audio', error);
    }
  }, [onChunkChange]);

  // Effect to play the next audio chunk when the queue updates
  useEffect(() => {
    if (queue.length > 0 && !isPlaying.current) {
      isPlaying.current = true;
      const nextChunk = queue[0];
      playChunk(nextChunk);
    }
  }, [queue, playChunk]);

  // Add a new audio chunk to the queue
  const addChunk = useCallback((chunk: { audio: string; metadata: object }) => {
    initAudioContext(); // Ensure the AudioContext is initialized
    setQueue((prevQueue) => [...prevQueue, chunk]); // Safely update the queue
  }, []);

  // Stop playing and clear the queue
  const stopAndFlush = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close(); // Close the AudioContext to stop any ongoing playback
      audioContextRef.current = null; // Reset the AudioContext
    }
    setQueue([]); // Clear the queue
    isPlaying.current = false;

    // Call the provided callback with null to indicate no chunk is playing
    if (onChunkChange) {
      onChunkChange(null);
    }
  }, [onChunkChange]);

  // Return the functions to use in components
  return { addChunk, stopAndFlush };
};

export default useBase64AudioPlayer;
