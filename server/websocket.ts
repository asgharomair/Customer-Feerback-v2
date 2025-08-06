import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { randomUUID } from "crypto";

export interface WebSocketClient {
  id: string;
  ws: WebSocket;
  tenantId?: string;
  userId?: string;
  connectedAt: Date;
  lastPing?: Date;
  userAgent?: string;
  ip?: string;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface NotificationEvent {
  type: 'feedback' | 'alert' | 'analytics' | 'system';
  tenantId: string;
  data: any;
  severity?: 'info' | 'warning' | 'critical';
}

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private tenantClients: Map<string, Set<string>> = new Map();
  private pingInterval: NodeJS.Timeout;
  private connectionTimeout: NodeJS.Timeout;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      clientTracking: false // We'll handle tracking ourselves
    });

    this.setupWebSocketServer();
    this.startPingInterval();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }

  private handleConnection(ws: WebSocket, req: any) {
    const clientId = randomUUID();
    const client: WebSocketClient = {
      id: clientId,
      ws,
      connectedAt: new Date(),
      ip: req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    this.clients.set(clientId, client);

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connection',
      data: { 
        clientId,
        message: 'Connected to feedback platform',
        timestamp: Date.now()
      },
      timestamp: Date.now()
    });

    ws.on('message', (message: Buffer) => {
      this.handleMessage(clientId, message);
    });

    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.handleDisconnection(clientId);
    });

    // Set up ping/pong for connection health
    ws.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.lastPing = new Date();
      }
    });

    console.log(`WebSocket client connected: ${clientId}`);
  }

  private handleMessage(clientId: string, message: Buffer) {
    try {
      const data = JSON.parse(message.toString());
      const client = this.clients.get(clientId);

      if (!client) {
        console.error(`Client ${clientId} not found`);
        return;
      }

      switch (data.type) {
        case 'auth':
          this.handleAuth(clientId, data);
          break;
        case 'ping':
          this.sendToClient(clientId, {
            type: 'pong',
            data: { timestamp: Date.now() },
            timestamp: Date.now()
          });
          break;
        case 'subscribe':
          this.handleSubscribe(clientId, data);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(clientId, data);
          break;
        default:
          console.log(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      this.sendToClient(clientId, {
        type: 'error',
        data: { message: 'Invalid message format' },
        timestamp: Date.now()
      });
    }
  }

  private handleAuth(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (data.tenantId) {
      client.tenantId = data.tenantId;
      client.userId = data.userId;

      // Add to tenant clients
      if (!this.tenantClients.has(data.tenantId)) {
        this.tenantClients.set(data.tenantId, new Set());
      }
      this.tenantClients.get(data.tenantId)!.add(clientId);

      this.sendToClient(clientId, {
        type: 'auth_success',
        data: { 
          tenantId: data.tenantId,
          message: 'Authentication successful'
        },
        timestamp: Date.now()
      });

      console.log(`Client ${clientId} authenticated for tenant ${data.tenantId}`);
    }
  }

  private handleSubscribe(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client || !client.tenantId) {
      this.sendToClient(clientId, {
        type: 'error',
        data: { message: 'Must authenticate before subscribing' },
        timestamp: Date.now()
      });
      return;
    }

    // Handle different subscription types
    switch (data.channel) {
      case 'feedback':
      case 'alerts':
      case 'analytics':
        this.sendToClient(clientId, {
          type: 'subscribed',
          data: { 
            channel: data.channel,
            message: `Subscribed to ${data.channel}`
          },
          timestamp: Date.now()
        });
        break;
      default:
        this.sendToClient(clientId, {
          type: 'error',
          data: { message: `Unknown channel: ${data.channel}` },
          timestamp: Date.now()
        });
    }
  }

  private handleUnsubscribe(clientId: string, data: any) {
    this.sendToClient(clientId, {
      type: 'unsubscribed',
      data: { 
        channel: data.channel,
        message: `Unsubscribed from ${data.channel}`
      },
      timestamp: Date.now()
    });
  }

  private handleDisconnection(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      // Remove from tenant clients
      if (client.tenantId && this.tenantClients.has(client.tenantId)) {
        this.tenantClients.get(client.tenantId)!.delete(clientId);
        
        // Clean up empty tenant sets
        if (this.tenantClients.get(client.tenantId)!.size === 0) {
          this.tenantClients.delete(client.tenantId);
        }
      }

      this.clients.delete(clientId);
      console.log(`WebSocket client disconnected: ${clientId}`);
    }
  }

  private sendToClient(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Error sending message to client ${clientId}:`, error);
      this.handleDisconnection(clientId);
    }
  }

  // Public methods for broadcasting events
  public broadcastToTenant(tenantId: string, event: NotificationEvent) {
    const tenantClientIds = this.tenantClients.get(tenantId);
    if (!tenantClientIds) {
      return;
    }

    const message: WebSocketMessage = {
      type: event.type,
      data: event.data,
      timestamp: Date.now()
    };

    tenantClientIds.forEach(clientId => {
      this.sendToClient(clientId, message);
    });

    console.log(`Broadcasted ${event.type} event to ${tenantClientIds.size} clients in tenant ${tenantId}`);
  }

  public broadcastToAll(event: NotificationEvent) {
    const message: WebSocketMessage = {
      type: event.type,
      data: event.data,
      timestamp: Date.now()
    };

    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        this.sendToClient(clientId, message);
      }
    });
  }

  public sendToUser(userId: string, event: NotificationEvent) {
    this.clients.forEach((client, clientId) => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        this.sendToClient(clientId, {
          type: event.type,
          data: event.data,
          timestamp: Date.now()
        });
      }
    });
  }

  // Connection health monitoring
  private startPingInterval() {
    this.pingInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          try {
            client.ws.ping();
          } catch (error) {
            console.error(`Error pinging client ${clientId}:`, error);
            this.handleDisconnection(clientId);
          }
        }
      });
    }, 30000); // Ping every 30 seconds
  }

  // Cleanup dead connections
  public cleanupDeadConnections() {
    const now = new Date();
    this.clients.forEach((client, clientId) => {
      if (client.lastPing) {
        const timeSincePing = now.getTime() - client.lastPing.getTime();
        if (timeSincePing > 60000) { // 1 minute timeout
          console.log(`Cleaning up dead connection: ${clientId}`);
          this.handleDisconnection(clientId);
        }
      }
    });
  }

  // Get connection statistics
  public getStats() {
    return {
      totalConnections: this.clients.size,
      tenantConnections: Object.fromEntries(
        Array.from(this.tenantClients.entries()).map(([tenantId, clients]) => [
          tenantId,
          clients.size
        ])
      ),
      uptime: Date.now()
    };
  }

  // Graceful shutdown
  public shutdown() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close(1000, 'Server shutdown');
      }
    });

    this.wss.close();
  }
} 