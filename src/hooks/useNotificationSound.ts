import { useEffect, useRef, useState } from 'react';

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio('/sounds/notification.wav');
    audioRef.current.volume = 0.7;
    audioRef.current.preload = 'auto';

    // Handle window focus/blur
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Check initial focus state
    setIsWindowFocused(document.hasFocus());

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const playNotificationSound = async () => {
    if (!soundEnabled || isWindowFocused || !audioRef.current) {
      return;
    }

    try {
      // Reset audio to start
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  const toggleSound = () => {
    setSoundEnabled(prev => !prev);
  };

  return {
    playNotificationSound,
    soundEnabled,
    toggleSound,
    isWindowFocused
  };
}