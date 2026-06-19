import { createContext, useContext, useMemo } from 'react';
import { useAudio } from '../hooks/useAudio';
import './AudioManager.css';

// Audio context so any component can call playSound
const AudioContext = createContext(null);

export function useGameAudio() {
  return useContext(AudioContext);
}

/**
 * AudioManager wraps the app and provides audio context.
 * Also renders a mute toggle button in the top-right.
 */
export default function AudioManager({ children }) {
  const { playSound, isMuted, toggleMute, startAmbient, stopAmbient } = useAudio();

  const value = useMemo(() => ({ playSound, isMuted, startAmbient, stopAmbient }), [playSound, isMuted, startAmbient, stopAmbient]);

  return (
    <AudioContext.Provider value={value}>
      {children}
      <button
        className="audio-toggle"
        onClick={toggleMute}
        title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
    </AudioContext.Provider>
  );
}
