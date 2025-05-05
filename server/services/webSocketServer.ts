/**
 * WebSocket Server for Real-time Data Updates
 * 
 * This service provides real-time data updates to connected clients
 * using WebSockets, ensuring all clients see the most recent data
 * without relying on HTTP caching mechanisms.
 */
import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { VERSION_KEYS } from './dataVersion';

// Store active connections
const clients: Map<string, WebSocket> = new Map();

// Track the next client ID
let nextClientId = 1;

// Supported notification types
export type NotificationType = 
  | 'data-update' 
  | 'refresh-required' 
  | 'system-message';

// Data update entities
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

// Message structure for data updates
export interface UpdateMessage {
  type: NotificationType;
  entity?: UpdateEntity;
  message?: string;
  timestamp: number;
}

/**
 * Initialize the WebSocket server
 */
export function initWebSocketServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });

  console.log('WebSocket server initialized and ready for connections');

  wss.on('connection', (ws) => {
    const clientId = `client-${nextClientId++}`;
    clients.set(clientId, ws);
    console.log(`Client connected: ${clientId}, total clients: ${clients.size}`);

    // Send welcome message
    const welcomeMsg: UpdateMessage = {
      type: 'system-message',
      message: 'Connected to VAMP data server. You will receive real-time updates.',
      timestamp: Date.now()
    };
    ws.send(JSON.stringify(welcomeMsg));

    // Handle disconnection
    ws.on('close', () => {
      clients.delete(clientId);
      console.log(`Client disconnected: ${clientId}, remaining clients: ${clients.size}`);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      clients.delete(clientId);
    });

    // Ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
        clients.delete(clientId);
      }
    }, 30000); // Every 30 seconds
  });

  return wss;
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
  console.log(`Notified all clients of update to ${entity}`);
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
  console.log(`Requested all clients to refresh ${entity}`);
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
  const messageStr = JSON.stringify(message);
  let successCount = 0;
  
  clients.forEach((client, id) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
      successCount++;
    } else {
      // Clean up any closed connections
      clients.delete(id);
    }
  });
  
  console.log(`Message broadcast to ${successCount} client(s)`);
}

// Map VERSION_KEYS to UpdateEntity types for data version service integration
export const versionKeyToEntity: Record<string, UpdateEntity> = {
  [VERSION_KEYS.PLANNER]: 'planners',
  [VERSION_KEYS.PLANNER_SLOTS]: 'plannerSlots',
  [VERSION_KEYS.PLANNER_ASSIGNMENTS]: 'plannerAssignments',
  [VERSION_KEYS.MUSICIANS]: 'musicians',
  [VERSION_KEYS.VENUES]: 'venues',
  [VERSION_KEYS.CATEGORIES]: 'categories',
  [VERSION_KEYS.MONTHLY_CONTRACTS]: 'monthlyContracts',
  // Add more mappings as needed
};