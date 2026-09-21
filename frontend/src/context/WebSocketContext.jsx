import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const { staffToken, staffUser, selectedHospitalId } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [caseReadyEvent, setCaseReadyEvent] = useState(null);
  const [queueUpdateEvent, setQueueUpdateEvent] = useState(null);
  const [yourTurnEvent, setYourTurnEvent] = useState(null);
  const [queueUpdateTrigger, setQueueUpdateTrigger] = useState(0);

  const wsRef = useRef(null);
  const subscribedCaseIdRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  const triggerSync = () => {
    setQueueUpdateTrigger(prev => prev + 1);
  };

  const connectWebSocket = () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Prefer current host (Vite proxy forwards /ws to port 5000 seamlessly on localhost or LAN)
      const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `${window.location.hostname}:5000`
        : window.location.host;

      let wsUrl = `${protocol}//${host}/ws`;
      if (staffToken) {
        wsUrl += `?token=${encodeURIComponent(staffToken)}`;
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Trigger immediate queue refresh on connection
        setQueueUpdateTrigger(prev => prev + 1);

        const hospitalIdToSub = staffUser?.hospital_id || selectedHospitalId || 'hosp-0000-0000-0000-0001';
        if (hospitalIdToSub) {
          ws.send(JSON.stringify({ action: 'subscribe_hospital', hospital_id: hospitalIdToSub }));
        }
        if (subscribedCaseIdRef.current) {
          ws.send(JSON.stringify({ action: 'subscribe_case', case_id: subscribedCaseIdRef.current }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);

          if (data.event === 'case_ready') {
            setCaseReadyEvent(data);
            setQueueUpdateTrigger(prev => prev + 1);
          }
          if (data.event === 'queue_update') {
            setQueueUpdateEvent(data);
            setQueueUpdateTrigger(prev => prev + 1);
          }
          if (data.event === 'your_turn') {
            setYourTurnEvent(data);
            setQueueUpdateTrigger(prev => prev + 1);
          }
        } catch (e) {}
      };

      ws.onerror = () => {
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Auto-reconnect after 2 seconds
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          connectWebSocket();
        }, 2000);
      };
    } catch (err) {
      console.log('[WebSocket Init error]', err.message);
    }
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [staffToken, staffUser?.hospital_id, selectedHospitalId]);

  const subscribeToCase = (caseId) => {
    subscribedCaseIdRef.current = caseId;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'subscribe_case', case_id: caseId }));
    }
  };

  return (
    <WebSocketContext.Provider value={{
      isConnected,
      lastMessage,
      caseReadyEvent,
      queueUpdateEvent,
      yourTurnEvent,
      queueUpdateTrigger,
      triggerSync,
      subscribeToCase
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => useContext(WebSocketContext);
