import { useEffect, useRef, useState, useCallback } from 'react';

export interface NotificationSettings {
  newChats: boolean;
  priorityChats: boolean;
  mentions: boolean;
  mediaMessages: boolean;
  volume: number;
  soundType: 'default' | 'subtle' | 'urgent';
  silentModeEnabled: boolean;
  silentStart: string;
  silentEnd: string;
  peakHoursEnabled: boolean;
  peakStart: string;
  peakEnd: string;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  newChats: true,
  priorityChats: true,
  mentions: true,
  mediaMessages: true,
  volume: 0.7,
  soundType: 'default',
  silentModeEnabled: false,
  silentStart: '22:00',
  silentEnd: '08:00',
  peakHoursEnabled: false,
  peakStart: '09:00',
  peakEnd: '18:00',
};

const SOUND_FILES = {
  default: '/sounds/notification.wav',
  subtle: '/sounds/notification-subtle.mp3',
  urgent: '/sounds/notification-urgent.mp3'
};

export function useAdvancedNotifications() {
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const stored = localStorage.getItem('notification-settings');
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  });
  
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notification-settings', JSON.stringify(settings));
  }, [settings]);

  // Initialize audio and window focus handlers
  useEffect(() => {
    audioRef.current = new Audio(SOUND_FILES[settings.soundType]);
    audioRef.current.volume = settings.volume;
    audioRef.current.preload = 'auto';

    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    setIsWindowFocused(document.hasFocus());

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [settings.soundType, settings.volume]);

  // Update audio when settings change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = SOUND_FILES[settings.soundType];
      audioRef.current.volume = settings.volume;
    }
  }, [settings.soundType, settings.volume]);

  const isInSilentMode = useCallback(() => {
    if (!settings.silentModeEnabled) return false;
    
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    
    return currentTime >= settings.silentStart || currentTime <= settings.silentEnd;
  }, [settings.silentModeEnabled, settings.silentStart, settings.silentEnd]);

  const isInPeakHours = useCallback(() => {
    if (!settings.peakHoursEnabled) return false;
    
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    
    return currentTime >= settings.peakStart && currentTime <= settings.peakEnd;
  }, [settings.peakHoursEnabled, settings.peakStart, settings.peakEnd]);

  const shouldPlayNotification = useCallback((type: keyof Pick<NotificationSettings, 'newChats' | 'priorityChats' | 'mentions' | 'mediaMessages'>) => {
    if (isWindowFocused) return false;
    if (isInSilentMode()) return false;
    if (!settings[type]) return false;
    
    return true;
  }, [isWindowFocused, isInSilentMode, settings]);

  const playNotificationSound = async (type: keyof Pick<NotificationSettings, 'newChats' | 'priorityChats' | 'mentions' | 'mediaMessages'> = 'newChats') => {
    if (!shouldPlayNotification(type) || !audioRef.current) return;

    try {
      audioRef.current.currentTime = 0;
      
      // Adjust volume for peak hours
      if (isInPeakHours()) {
        audioRef.current.volume = Math.min(settings.volume * 1.2, 1);
      } else {
        audioRef.current.volume = settings.volume;
      }
      
      await audioRef.current.play();
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return {
    settings,
    updateSettings,
    playNotificationSound,
    shouldPlayNotification,
    isInSilentMode: isInSilentMode(),
    isInPeakHours: isInPeakHours(),
    isWindowFocused
  };
}