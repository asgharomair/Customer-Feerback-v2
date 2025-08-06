import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from './use-toast';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface WebSocketEvent {
  type: 'feedback' | 'alert' | 'analytics' | 'system';
  data: any;
  severity?: 'info' | 'warning' | 'critical';
}

interface UseWebSocketOptions {
  tenantId?: string;
  userId?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (event: WebSocketEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    tenantId,
    userId,
    autoReconnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    onMessage,
    onConnect,
    onDisconnect,
    onError
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Get WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }, []);

  // Send message to WebSocket
  const sendMessage = useCallback((type: string, data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type,
        data,
        timestamp: Date.now()
      };
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  // Authenticate with tenant
  const authenticate = useCallback(() => {
    if (tenantId) {
      sendMessage('auth', { tenantId, userId });
    }
  }, [tenantId, userId, sendMessage]);

  // Subscribe to channels
  const subscribe = useCallback((channel: string) => {
    sendMessage('subscribe', { channel });
  }, [sendMessage]);

  // Unsubscribe from channels
  const unsubscribe = useCallback((channel: string) => {
    sendMessage('unsubscribe', { channel });
  }, [sendMessage]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    setConnectionError(null);

    try {
      const wsUrl = getWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        setReconnectAttempts(0);
        setConnectionError(null);
        
        // Authenticate immediately after connection
        authenticate();
        
        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          sendMessage('ping', {});
        }, 30000);

        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Handle different message types
          switch (message.type) {
            case 'connection':
              console.log('Connection established:', message.data);
              break;
              
            case 'auth_success':
              console.log('Authentication successful:', message.data);
              // Auto-subscribe to default channels
              subscribe('feedback');
              subscribe('alerts');
              subscribe('analytics');
              break;
              
            case 'pong':
              // Handle pong response
              break;
              
            case 'feedback':
            case 'alert':
            case 'analytics':
            case 'system':
              // Handle real-time events
              const wsEvent: WebSocketEvent = {
                type: message.type as any,
                data: message.data,
                severity: message.data.severity
              };
              
              onMessage?.(wsEvent);
              
              // Show toast for alerts
              if (message.type === 'alert' && message.data.severity === 'critical') {
                toast({
                  title: "Critical Alert",
                  description: message.data.message || "A critical alert has been triggered",
                  variant: "destructive",
                });
              }
              break;
              
            case 'error':
              console.error('WebSocket error:', message.data);
              setConnectionError(message.data.message);
              break;
              
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        onDisconnect?.();

        // Auto-reconnect if enabled
        if (autoReconnect && reconnectAttempts < maxReconnectAttempts) {
          const nextAttempt = reconnectAttempts + 1;
          setReconnectAttempts(nextAttempt);
          
          console.log(`Attempting to reconnect (${nextAttempt}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          setConnectionError('Max reconnection attempts reached');
          toast({
            title: "Connection Lost",
            description: "Unable to reconnect to real-time updates. Please refresh the page.",
            variant: "destructive",
          });
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection error occurred');
        onError?.(error);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setIsConnecting(false);
      setConnectionError('Failed to create connection');
    }
  }, [
    isConnecting,
    isConnected,
    getWebSocketUrl,
    authenticate,
    subscribe,
    autoReconnect,
    reconnectAttempts,
    maxReconnectAttempts,
    reconnectInterval,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    toast
  ]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setReconnectAttempts(0);
  }, []);

  // Manual reconnect
  const reconnect = useCallback(() => {
    disconnect();
    setReconnectAttempts(0);
    connect();
  }, [disconnect, connect]);

  // Effect to connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Effect to re-authenticate when tenantId changes
  useEffect(() => {
    if (isConnected && tenantId) {
      authenticate();
    }
  }, [isConnected, tenantId, authenticate]);

  return {
    isConnected,
    isConnecting,
    connectionError,
    reconnectAttempts,
    sendMessage,
    authenticate,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
    reconnect
  };
} 