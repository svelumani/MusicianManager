/**
 * WebSocket Server for Real-time Data Updates
 * 
 * This service provides real-time data updates to connected clients
 * using WebSockets, ensuring all clients see the most recent data
 * without relying on HTTP caching mechanisms.
 */
import WebSocket, { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server as HttpServer } from 'http';
import { getVersionKeyToEntity } from './entityMapping';

export type UpdateEntity = 
  | 'planners'
  | 'plannerSlots'
  | 'plannerAssignments'
  | 'musicians'
  | 'venues'
  | 'categories'
  | 'musicianPayRates'
  | 'eventCategories'
  | 'availability'
  | 'monthlyContracts'
  | 'all';

export type NotificationType = 
  | 'data-update' 
  | 'refresh-required' 
  | 'system-message';

export interface UpdateMessage {
  type: NotificationType;
  entity?: UpdateEntity;
  message?: string;
  timestamp: number;
}

let wss: WebSocketServer | null = null;

/**
 * Initialize the WebSocket server
 */
export function initWebSocketServer(httpServer: HttpServer) {
  if (wss) {
    console.log('WebSocket server already initialized');
    return;
  }
  
  // Create a new WebSocket server with more robust error handling
  wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws',
    // Increase timeouts to give clients more time
    clientTracking: true,
    // Set heartbeat interval
    perMessageDeflate: {
      zlibDeflateOptions: {
        // See zlib defaults.
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      // Below options are specified as default values.
      concurrencyLimit: 10, // Limits zlib concurrency for performance.
      threshold: 1024 // Size (in bytes) below which messages should not be compressed.
    }
  });
  
  // Handle server-level errors
  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });
  
  // Handle connection events
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.log(`New WebSocket connection from ${req.socket.remoteAddress || 'unknown'}`);
    
    // Setup ping interval to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        // Send server-initiated ping to client
        try {
          ws.send(JSON.stringify({
            type: 'server-ping',
            timestamp: Date.now()
          }));
        } catch (error) {
          console.error('Error sending ping to client:', error);
          clearInterval(pingInterval);
        }
      } else {
        // WebSocket is no longer open, clear the interval
        clearInterval(pingInterval);
      }
    }, 30000); // Every 30 seconds
    
    // Send a welcome message to confirm connection
    try {
      const welcomeMsg: UpdateMessage = {
        type: 'system-message',
        message: 'Connected to VAMP server. You will receive real-time updates.',
        timestamp: Date.now()
      };
      
      ws.send(JSON.stringify(welcomeMsg));
    } catch (error) {
      console.error('Error sending welcome message:', error);
    }
    
    // Handle messages from clients
    ws.on('message', (message: WebSocket.Data) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle ping messages to keep connection alive
        if (data.type === 'ping') {
          // Send a pong response to acknowledge
          try {
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: Date.now()
            }));
          } catch (error) {
            console.error('Error sending pong response:', error);
          }
          // Don't log pings to avoid cluttering logs
          return;
        }
        
        console.log('Received message from client:', message.toString());
      } catch (err) {
        console.error('Error handling client message:', err);
      }
    });
    
    // Handle connection close
    ws.on('close', (code: number, reason: string) => {
      console.log(`WebSocket connection closed: ${code} - ${reason || 'No reason provided'}`);
      clearInterval(pingInterval);
    });
    
    // Handle connection errors
    ws.on('error', (error: Error) => {
      console.error('WebSocket connection error:', error);
      // Try to close the connection gracefully
      try {
        ws.close();
      } catch (closeError) {
        console.error('Error closing WebSocket after error:', closeError);
      }
      clearInterval(pingInterval);
    });
  });
  
  console.log('WebSocket server initialized and ready for connections');
}

/**
 * Notify all connected clients about a data update
 */
export function notifyDataUpdate(entity: UpdateEntity) {
  const message: UpdateMessage = {
    type: 'data-update',
    entity,
    timestamp: Date.now()
  };
  
  broadcastMessage(message);
}

/**
 * Ask all clients to refresh specific entity data
 */
export function requestDataRefresh(entity: UpdateEntity) {
  const message: UpdateMessage = {
    type: 'refresh-required',
    entity,
    timestamp: Date.now()
  };
  
  broadcastMessage(message);
}

/**
 * Send a system message to all clients
 */
export function sendSystemMessage(messageText: string) {
  const message: UpdateMessage = {
    type: 'system-message',
    message: messageText,
    timestamp: Date.now()
  };
  
  broadcastMessage(message);
}

/**
 * Broadcast a message to all connected clients
 */
function broadcastMessage(message: UpdateMessage) {
  if (!wss) {
    console.warn('WebSocket server not initialized yet, cannot broadcast message');
    return;
  }
  
  const messageString = JSON.stringify(message);
  
  // Count of clients who received the message successfully
  let sentCount = 0;
  
  wss.clients.forEach((client: WebSocket) => {
    // Only send to clients that are open
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageString);
      sentCount++;
    }
  });
  
  console.log(`Broadcast ${message.type} message to ${sentCount} clients`);
}