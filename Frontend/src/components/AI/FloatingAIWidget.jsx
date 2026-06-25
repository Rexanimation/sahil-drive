import React, { useState, useEffect, useRef } from 'react';
import { io } from "socket.io-client";
import { API_URL } from '../../config';

const FloatingAIWidget = ({ onActionTriggered }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isSending) return;
        
        const userMsg = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsSending(true);

        try {
            // Context we can extract globally if needed, for now just pass basic
            const response = await fetch(`${API_URL}/api/chat/ai`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${document.cookie.split('jwt=')[1]?.split(';')[0]}` // Adjust based on how auth is handled, standard axios might be better
                },
                body: JSON.stringify({ message: userMsg, parentFolderId: null }) // Or pass current folder
            });
            // Actually, wait, Sahil Drive uses axios withCredentials, let's stick to that.
            // ...
        } catch (error) {
            console.error("AI chat error", error);
        }
    };

    return null; // Will refine this later or integrate directly into Home.jsx for easier state access
};

export default FloatingAIWidget;
