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
  
  // Create a new WebSocket server
  wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });
  
  // Handle connection events
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.log(`New WebSocket connection from ${req.socket.remoteAddress}`);
    
    // Send a welcome message to confirm connection
    const welcomeMsg: UpdateMessage = {
      type: 'system-message',
      message: 'Connected to VAMP server. You will receive real-time updates.',
      timestamp: Date.now()
    };
    
    ws.send(JSON.stringify(welcomeMsg));
    
    // Handle messages from clients
    ws.on('message', (message: WebSocket.Data) => {
      console.log('Received message from client:', message.toString());
      
      // For now, we don't need to handle client messages
      // This is a one-way notification system
    });
    
    // Handle connection close
    ws.on('close', (code: number, reason: string) => {
      console.log(`WebSocket connection closed: ${code} - ${reason}`);
    });
    
    // Handle connection errors
    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
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