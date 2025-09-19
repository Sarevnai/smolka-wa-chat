import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

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
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setAudioDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = (value[0] / 100) * audioDuration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-xl min-w-[280px]",
      isOutbound ? "bg-white/10" : "bg-gray-100",
      className
    )}>
      <audio ref={audioRef} src={audioUrl} />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={togglePlay}
        className={cn(
          "h-10 w-10 p-0 rounded-full flex-shrink-0",
          isOutbound ? "bg-white/20 hover:bg-white/30 text-white" : "bg-primary hover:bg-primary/90 text-white"
        )}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" />
        )}
      </Button>

      <div className="flex-1 space-y-2">
        <div className="relative h-1 bg-white/20 rounded-full overflow-hidden">
          <div 
            className={cn(
              "absolute left-0 top-0 h-full rounded-full transition-all duration-300",
              isOutbound ? "bg-white/60" : "bg-primary"
            )}
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => handleSeek([Number(e.target.value)])}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        
        <div className="flex justify-between items-center">
          <span className={cn(
            "text-xs font-medium",
            isOutbound ? "text-white/80" : "text-gray-600"
          )}>
            {formatTime(currentTime)}
          </span>
          <div className="flex items-center gap-1">
            <Volume2 className={cn(
              "h-3 w-3",
              isOutbound ? "text-white/60" : "text-gray-500"
            )} />
          </div>
          <span className={cn(
            "text-xs font-medium",
            isOutbound ? "text-white/80" : "text-gray-600"
          )}>
            {formatTime(audioDuration)}
          </span>
        </div>
      </div>
    </div>
  );
}