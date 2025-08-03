let ws: WebSocket | null = null;

export function connectWebSocket(): WebSocket {
  if (ws && ws.readyState === WebSocket.OPEN) {
    return ws;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('WebSocket connected');
  };

  ws.onclose = (event) => {
    console.log('WebSocket disconnected:', event.code, event.reason);
    // Attempt to reconnect after a delay
    setTimeout(() => {
      if (ws?.readyState === WebSocket.CLOSED) {
        connectWebSocket();
      }
    }, 5000);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return ws;
}

export function sendWebSocketMessage(message: any): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  } else {
    console.warn('WebSocket is not open. Message not sent:', message);
  }
}

export function closeWebSocket(): void {
  if (ws) {
    ws.close();
    ws = null;
  }
}
