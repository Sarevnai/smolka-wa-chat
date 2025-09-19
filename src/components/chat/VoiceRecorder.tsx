import { useState, useRef } from "react";
import { Mic, MicOff, Send, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onSendAudio: (audioBlob: Blob) => void;
  onCancel: () => void;
  className?: string;
}

export function VoiceRecorder({ onSendAudio, onCancel, className }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stopStream();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      onSendAudio(audioBlob);
      handleCancel();
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
      stopStream();
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setAudioBlob(null);
    setRecordingTime(0);
    onCancel();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("flex items-center gap-2 p-3 bg-background border rounded-lg", className)}>
      {!isRecording && !audioBlob && (
        <>
          <Button
            onClick={startRecording}
            className="h-10 w-10 p-0 bg-red-500 hover:bg-red-600 text-white"
          >
            <Mic className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Toque para gravar áudio
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="ml-auto h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      )}

      {isRecording && (
        <>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-mono">
              {formatTime(recordingTime)}
            </span>
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 transition-all duration-300"
                style={{ width: `${Math.min((recordingTime / 60) * 100, 100)}%` }}
              />
            </div>
          </div>
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            
            <Button
              onClick={stopRecording}
              className="h-8 w-8 p-0"
            >
              <MicOff className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {audioBlob && !isRecording && (
        <>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-8 w-8 bg-primary/20 rounded-full flex items-center justify-center">
              <Mic className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm">
              Áudio gravado ({formatTime(recordingTime)})
            </span>
          </div>
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
            
            <Button
              onClick={handleSend}
              size="sm"
              className="h-8 px-3"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}