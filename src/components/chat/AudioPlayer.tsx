import { useState, useRef, useEffect } from "react";
import { Play, Pause, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AudioPlayerProps {
  audioUrl: string;
  duration?: number;
  className?: string;
  isOutbound?: boolean;
}

export function AudioPlayer({ audioUrl, duration, className, isOutbound }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadError, setIsLoadError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      setAudioDuration(audio.duration);
      setIsLoaded(true);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleLoadStart = () => setIsLoaded(false);
    const handleCanPlay = () => setIsLoaded(true);
    const handleError = () => {
      setIsLoadError(true);
      setIsLoaded(true);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !isLoaded) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsLoadError(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !isLoaded) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    const newTime = percentage * audioDuration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audio-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration ? (currentTime / audioDuration) * 100 : 0;

  if (isLoadError) {
    return (
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg min-w-[250px]",
        isOutbound ? "bg-white/10" : "bg-gray-100",
        className
      )}>
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
          <span className="text-red-500 text-xs">✕</span>
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600">Erro ao carregar áudio</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg min-w-[260px] max-w-[340px]",
      isOutbound ? "bg-white/10" : "bg-gray-100/90",
      className
    )}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={togglePlay}
        disabled={!isLoaded}
        className={cn(
          "w-10 h-10 p-0 rounded-full flex-shrink-0 transition-all duration-200",
          isOutbound 
            ? "bg-white/20 hover:bg-white/30 text-white disabled:bg-white/10" 
            : "bg-primary hover:bg-primary/90 text-white disabled:bg-gray-300"
        )}
      >
        {!isLoaded ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </Button>

      {/* Progress and Waveform */}
      <div className="flex-1 space-y-1.5">
        {/* Waveform-style progress bar */}
        <div 
          className="relative h-8 cursor-pointer group"
          onClick={handleSeek}
        >
          {/* Background bars (simulated waveform) */}
          <div className="flex items-end justify-between h-full gap-0.5">
            {Array.from({ length: 32 }, (_, i) => {
              const height = Math.max(2, Math.random() * 100);
              const isActive = (i / 32) * 100 <= progress;
              return (
                <div
                  key={i}
                  className={cn(
                    "w-1 rounded-full transition-all duration-200",
                    isActive 
                      ? isOutbound ? "bg-white/80" : "bg-primary"
                      : isOutbound ? "bg-white/30" : "bg-gray-400/60"
                  )}
                  style={{ height: `${Math.max(8, height / 4)}%` }}
                />
              );
            })}
          </div>
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded" />
        </div>
        
        {/* Time display */}
        <div className="flex justify-between items-center">
          <span className={cn(
            "text-xs font-medium",
            isOutbound ? "text-white/80" : "text-gray-600"
          )}>
            {formatTime(currentTime)}
          </span>
          <span className={cn(
            "text-xs font-medium",
            isOutbound ? "text-white/80" : "text-gray-600"
          )}>
            {formatTime(audioDuration)}
          </span>
        </div>
      </div>

      {/* Download Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDownload}
        className={cn(
          "w-8 h-8 p-0 rounded-md transition-colors",
          isOutbound ? "hover:bg-white/20 text-white/70" : "hover:bg-gray-200/80 text-gray-600"
        )}
      >
        <Download className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}