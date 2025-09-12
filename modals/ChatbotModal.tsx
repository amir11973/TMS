/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { SendChatIcon, ChatbotIcon } from '../icons';
import { getChatbotResponse } from '../chatbotService';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot';
}

const suggestionChips = [
    'لیست موارد شروع نشده ؟',
    'لیست موارد در حال اجرا؟',
    'لیست موارد دارای تاخیر؟',
    'لیست موارد خاتمه نیافته با اهمیت زیاد؟',
    'معرفی خلاصه سامانه ‌مدیریت وظایف',
    'در مورد دسترسی به اطلاعات توضیح بده؟',
];

export const ChatbotModal = ({ isOpen, onClose, projects, actions, users, currentUser, taskItems, approvalItems, teamMembers }: {
    isOpen: boolean;
    onClose: () => void;
    projects: any[];
    actions: any[];
    users: User[];
    currentUser: User | null;
    taskItems: any[];
    approvalItems: any[];
    teamMembers: any[];
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setMessages([
                { id: 1, text: 'سلام! من دستیار هوشمند شما هستم. چطور می‌توانم کمکتان کنم؟ می‌توانید یکی از سوالات زیر را انتخاب کنید یا سوال خود را تایپ کنید.', sender: 'bot' }
            ]);
        }
    }, [isOpen]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    if (!isOpen || !currentUser) return null;

    const handleSend = async (question: string) => {
        if (!question.trim() || isLoading) return;

        const newUserMessage: Message = { id: Date.now(), text: question, sender: 'user' };
        setMessages(prev => [...prev, newUserMessage]);
        setInput('');
        setIsLoading(true);
        
        const botResponseText = await getChatbotResponse(question, projects, actions, users, currentUser, taskItems, approvalItems, teamMembers);

        const newBotMessage: Message = { id: Date.now() + 1, text: botResponseText, sender: 'bot' };
        setMessages(prev => [...prev, newBotMessage]);
        setIsLoading(false);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSend(input);
    };
    
    const handleChipClick = (question: string) => {
        handleSend(question);
    };

    return (
        <div className={`chatbot-modal-container ${isOpen ? 'open' : ''}`}>
            <div className="chatbot-modal-content">
                <div className="modal-header">
                    <div className="chatbot-header-title">
                        <ChatbotIcon />
                        <h3>دستیار هوشمند</h3>
                    </div>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="chat-messages">
                    {messages.map(msg => (
                        <div key={msg.id} className={`chat-message ${msg.sender === 'user' ? 'user-message' : 'bot-message'}`}>
                            <p>{msg.text}</p>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="chat-message bot-message loading">
                            <div className="typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    )}
                    {messages.length === 1 && !isLoading && (
                        <div className="suggestion-chips">
                            {suggestionChips.map((chip, index) => (
                                <button key={index} onClick={() => handleChipClick(chip)}>{chip}</button>
                            ))}
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <form className="chat-input-form" onSubmit={handleFormSubmit}>
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="پیام خود را تایپ کنید..."
                        disabled={isLoading}
                        aria-label="پیام خود را تایپ کنید"
                    />
                    <button type="submit" disabled={isLoading || !input.trim()} aria-label="ارسال پیام">
                        <SendChatIcon />
                    </button>
                </form>
            </div>
        </div>
    );
};