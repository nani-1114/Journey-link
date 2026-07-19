import { useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';

export const useWebSocket = (trackingCode, onMessageReceived) => {
  const stompClientRef = useRef(null);

  useEffect(() => {
    if (!trackingCode) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'localhost:8080'
      : `${window.location.hostname}:8080`;
    
    const brokerURL = `${wsProtocol}//${wsHost}/ws`;

    const client = new Client({
      brokerURL: brokerURL,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('Connected to WebSocket Broker');
        client.subscribe(`/journey/live/${trackingCode}`, (message) => {
          if (message.body) {
            try {
              const data = JSON.parse(message.body);
              onMessageReceived(data);
            } catch (err) {
              console.error('Error parsing WS message:', err);
            }
          }
        });
      },
      onStompError: (frame) => {
        console.error('Broker error: ' + frame.headers['message']);
        console.error('Details: ' + frame.body);
      },
      onDisconnect: () => {
        console.log('Disconnected from WebSocket Broker');
      }
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (client) {
        client.deactivate();
      }
    };
  }, [trackingCode, onMessageReceived]);

  const sendLocation = useCallback((latitude, longitude, speed) => {
    if (stompClientRef.current && stompClientRef.current.connected) {
      stompClientRef.current.publish({
        destination: `/app/journey/${trackingCode}/location`,
        body: JSON.stringify({ latitude, longitude, speed }),
      });
    } else {
      console.warn('STOMP client not connected, location update ignored');
    }
  }, [trackingCode]);

  return { sendLocation };
};
export default useWebSocket;
