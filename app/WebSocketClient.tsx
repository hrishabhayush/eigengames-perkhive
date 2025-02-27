'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketClientProps {
url: string;
onMessage: (data: any) => void;
onOpen?: () => void;
onClose?: () => void;
onError?: (error: Event) => void;
}

export function useWebSocket({
url,
onMessage,
onOpen,
onClose,
onError
}: WebSocketClientProps) {
const socketRef = useRef<WebSocket | null>(null);
const [isConnected, setIsConnected] = useState(false);
const [error, setError] = useState<Event | null>(null);

useEffect(() => {
    // Create WebSocket connection
    socketRef.current = new WebSocket(url);

    // Connection opened
    socketRef.current.onopen = () => {
    setIsConnected(true);
    console.log('WebSocket connection established');
    if (onOpen) onOpen();
    };

    // Handle messages from server
    socketRef.current.onmessage = (event) => {
    let data;
    try {
        data = JSON.parse(event.data);
    } catch (err) {
        data = event.data;
    }
    onMessage(data);
    };

    // Handle connection closed
    socketRef.current.onclose = () => {
    setIsConnected(false);
    console.log('WebSocket connection closed');
    if (onClose) onClose();
    };

    // Handle errors
    socketRef.current.onerror = (event) => {
    setError(event);
    console.error('WebSocket error:', event);
    if (onError) onError(event);
    };

    // Clean up on unmount
    return () => {
    if (socketRef.current) {
        socketRef.current.close();
    }
    };
}, [url, onMessage, onOpen, onClose, onError]);

// Function to send messages
const sendMessage = useCallback((message: string | object) => {
    if (socketRef.current && isConnected) {
    const formattedMessage = typeof message === 'string' 
        ? message 
        : JSON.stringify(message);
    socketRef.current.send(formattedMessage);
    } else {
    console.warn('Cannot send message: WebSocket is not connected');
    }
}, [isConnected]);

// Function to close the connection manually
const closeConnection = useCallback(() => {
    if (socketRef.current) {
    socketRef.current.close();
    }
}, []);

return {
    isConnected,
    sendMessage,
    closeConnection,
    error
};
}

export default useWebSocket;

