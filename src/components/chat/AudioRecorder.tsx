import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Mic, MicOff, Square, Send, Trash2, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
  onAudioReady: (audioBlob: Blob, duration: number) => void;
  disabled?: boolean;
}

export function AudioRecorder({ onAudioReady, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        const url = URL.createObjectURL(audioBlob);
        
        setAudioBlob(audioBlob);
        setAudioUrl(url);
        
        // Get audio duration
        const audio = new Audio(url);
        audio.onloadedmetadata = () => {
          setAudioDuration(audio.duration);
        };
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Erro no microfone",
        description: "Não foi possível acessar o microfone. Verifique as permissões.",
        variant: "destructive",
      });
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
      setIsPaused(!isPaused);
    }
  }, [isRecording, isPaused]);

  const discardRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setAudioDuration(0);
    setIsPlaying(false);
  }, [audioUrl]);

  const playPreview = useCallback(() => {
    if (!audioUrl) return;

    if (isPlaying) {
      audioPlayerRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio(audioUrl);
        audioPlayerRef.current.onended = () => setIsPlaying(false);
      }
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  }, [audioUrl, isPlaying]);

  const sendAudio = useCallback(() => {
    if (audioBlob) {
      onAudioReady(audioBlob, audioDuration);
      discardRecording();
    }
  }, [audioBlob, audioDuration, onAudioReady, discardRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Recording state
  if (isRecording) {
    return (
      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-full border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full bg-red-500",
            !isPaused && "animate-pulse"
          )} />
          <span className="text-sm font-mono text-red-600 dark:text-red-400">
            {formatTime(recordingTime)}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
            onClick={pauseRecording}
            disabled={disabled}
          >
            {isPaused ? (
              <Mic className="h-4 w-4 text-red-600" />
            ) : (
              <MicOff className="h-4 w-4 text-red-600" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
            onClick={stopRecording}
            disabled={disabled}
          >
            <Square className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </div>
    );
  }

  // Preview state
  if (audioBlob) {
    return (
      <div className="flex items-center gap-2 bg-primary/10 px-3 py-2 rounded-full border border-primary/20">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-primary/20"
          onClick={playPreview}
          disabled={disabled}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 text-primary" />
          ) : (
            <Play className="h-4 w-4 text-primary" />
          )}
        </Button>
        
        <span className="text-sm font-mono text-primary">
          {formatTime(Math.floor(audioDuration))}
        </span>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
            onClick={discardRecording}
            disabled={disabled}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-900/30"
            onClick={sendAudio}
            disabled={disabled}
          >
            <Send className="h-4 w-4 text-green-600" />
          </Button>
        </div>
      </div>
    );
  }

  // Default mic button
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 hover:bg-muted rounded-full"
      onMouseDown={startRecording}
      disabled={disabled}
      title="Pressione e segure para gravar áudio"
    >
      <Mic className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
}