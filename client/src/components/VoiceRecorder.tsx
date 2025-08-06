import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Play, Pause, Square, Trash2, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onUploadComplete?: (uploadUrl: string) => void;
  maxDuration?: number; // in seconds
  autoUpload?: boolean;
  tenantId?: string;
}

export default function VoiceRecorder({ 
  onRecordingComplete, 
  onUploadComplete,
  maxDuration = 120, // 2 minutes default
  autoUpload = false,
  tenantId
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
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

  // Audio compression function
  const compressAudio = async (blob: Blob): Promise<Blob> => {
    return new Promise((resolve) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const fileReader = new FileReader();
      
      fileReader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Create offline context for processing
          const offlineContext = new OfflineAudioContext(
            1, // mono
            audioBuffer.length,
            22050 // 22kHz sample rate for compression
          );
          
          const source = offlineContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(offlineContext.destination);
          source.start();
          
          const renderedBuffer = await offlineContext.startRendering();
          
          // Convert back to blob
          const wavBlob = audioBufferToWav(renderedBuffer);
          resolve(wavBlob);
        } catch (error) {
          console.warn('Audio compression failed, using original:', error);
          resolve(blob);
        }
      };
      
      fileReader.readAsArrayBuffer(blob);
    });
  };

  // Convert AudioBuffer to WAV blob
  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // Write audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  // Upload audio to backend
  const uploadAudio = async (blob: Blob): Promise<string> => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Compress audio first
      const compressedBlob = await compressAudio(blob);
      
      // Get upload URL from backend
      const uploadResponse = await apiRequest('/api/objects/upload', {
        method: 'POST',
        body: JSON.stringify({
          fileType: 'voice',
          fileName: `voice_${Date.now()}.wav`,
          fileSize: compressedBlob.size,
          tenantId
        }),
      });

      const { uploadURL } = uploadResponse;
      
      // Upload file with progress tracking
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            setUploadProgress(progress);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const fileUrl = uploadURL.split('?')[0]; // Remove query parameters
            resolve(fileUrl);
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });
        
        xhr.open('PUT', uploadURL);
        xhr.setRequestHeader('Content-Type', 'audio/wav');
        xhr.send(compressedBlob);
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1, // Mono for better compression
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

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        onRecordingComplete(blob);
        
        // Auto-upload if enabled
        if (autoUpload && onUploadComplete) {
          try {
            const uploadUrl = await uploadAudio(blob);
            onUploadComplete(uploadUrl);
            toast({
              title: "Voice uploaded",
              description: "Voice recording has been uploaded successfully.",
            });
          } catch (error) {
            console.error('Upload failed:', error);
            toast({
              title: "Upload failed",
              description: "Failed to upload voice recording. Please try again.",
              variant: "destructive",
            });
          }
        }
        
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

  const manualUpload = async () => {
    if (!audioBlob || !onUploadComplete) return;
    
    try {
      const uploadUrl = await uploadAudio(audioBlob);
      onUploadComplete(uploadUrl);
      toast({
        title: "Voice uploaded",
        description: "Voice recording has been uploaded successfully.",
      });
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload voice recording. Please try again.",
        variant: "destructive",
      });
    }
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
                {isUploading && (
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500">Uploading...</div>
                    <Progress value={uploadProgress} className="w-32 h-2" />
                  </div>
                )}
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
                  disabled={isUploading}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                
                {!autoUpload && onUploadComplete && (
                  <Button
                    onClick={manualUpload}
                    size="lg"
                    variant="outline"
                    className="rounded-full w-12 h-12"
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  </Button>
                )}
                
                <Button
                  onClick={deleteRecording}
                  size="lg"
                  variant="outline"
                  className="rounded-full w-12 h-12 text-red-600 hover:text-red-700"
                  disabled={isUploading}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
                
                <Button
                  onClick={startRecording}
                  size="lg"
                  variant="outline"
                  className="rounded-full w-12 h-12"
                  disabled={isUploading}
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