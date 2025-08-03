import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Play, Pause, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  maxDuration?: number; // in seconds
}

export default function VoiceRecorder({ 
  onRecordingComplete, 
  maxDuration = 120 // 2 minutes default
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        onRecordingComplete(blob);
        
        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return newTime;
        });
      }, 1000);

      toast({
        title: "Recording started",
        description: `Recording voice feedback (max ${maxDuration}s)`,
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => {
            const newTime = prev + 1;
            if (newTime >= maxDuration) {
              stopRecording();
              return maxDuration;
            }
            return newTime;
          });
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    }
  };

  const playRecording = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setRecordingTime(0);
    setIsPlaying(false);
    
    toast({
      title: "Recording deleted",
      description: "Voice recording has been removed.",
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (recordingTime / maxDuration) * 100;

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex flex-col items-center space-y-4">
          {/* Recording Status */}
          <div className="text-center min-h-[60px] flex flex-col justify-center">
            {isRecording ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`}></div>
                  <span className="text-sm font-medium">
                    {isPaused ? 'Recording Paused' : 'Recording...'}
                  </span>
                </div>
                <div className="text-lg font-mono text-gray-700">
                  {formatTime(recordingTime)} / {formatTime(maxDuration)}
                </div>
                <Progress value={progressPercentage} className="w-32 h-2" />
              </div>
            ) : audioBlob ? (
              <div className="space-y-2">
                <div className="text-sm font-medium text-green-600">
                  Recording Complete
                </div>
                <div className="text-lg font-mono text-gray-700">
                  Duration: {formatTime(recordingTime)}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                Tap the microphone to start recording
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-3">
            {!isRecording && !audioBlob && (
              <Button
                onClick={startRecording}
                size="lg"
                className="rounded-full w-16 h-16 bg-red-500 hover:bg-red-600"
              >
                <Mic className="w-6 h-6 text-white" />
              </Button>
            )}

            {isRecording && (
              <>
                <Button
                  onClick={pauseRecording}
                  size="lg"
                  variant="outline"
                  className="rounded-full w-12 h-12"
                >
                  {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </Button>
                
                <Button
                  onClick={stopRecording}
                  size="lg"
                  className="rounded-full w-16 h-16 bg-gray-600 hover:bg-gray-700"
                >
                  <Square className="w-6 h-6 text-white" />
                </Button>
              </>
            )}

            {audioBlob && (
              <>
                <Button
                  onClick={playRecording}
                  size="lg"
                  variant="outline"
                  className="rounded-full w-12 h-12"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                
                <Button
                  onClick={deleteRecording}
                  size="lg"
                  variant="outline"
                  className="rounded-full w-12 h-12 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
                
                <Button
                  onClick={startRecording}
                  size="lg"
                  variant="outline"
                  className="rounded-full w-12 h-12"
                >
                  <MicOff className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>

          {/* Hidden audio element for playback */}
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              style={{ display: 'none' }}
            />
          )}

          {/* Recording Tips */}
          {!isRecording && !audioBlob && (
            <div className="text-xs text-gray-500 text-center max-w-xs">
              <p>• Speak clearly into your device's microphone</p>
              <p>• Find a quiet environment for best quality</p>
              <p>• Maximum recording time: {maxDuration / 60} minutes</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}