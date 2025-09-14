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
    'چت بات چه کمکی به شما می تواند بکند؟',
    'در مورد دسترسی مشاهده اطلاعات توضیح بده؟',
    'لیست موارد شروع نشده ؟',
    'لیست موارد در حال اجرا؟',
    'لیست موارد دارای تاخیر؟',
    'معرفی خلاصه سامانه ‌مدیریت وظایف',
];

type ChatbotResult = { success: boolean; error?: string; [key: string]: any; };

export const ChatbotModal = ({ 
    isOpen, 
    onClose, 
    projects, 
    actions, 
    users, 
    currentUser, 
    taskItems, 
    approvalItems, 
    teamMembers,
    onCreateProject,
    onCreateAction,
    onCreateActivity,
    onAddTeamMember,
    onRemoveTeamMember,
    onDeleteProject,
    onDeleteAction,
    onDeleteActivity
}: {
    isOpen: boolean;
    onClose: () => void;
    projects: any[];
    actions: any[];
    users: User[];
    currentUser: User | null;
    taskItems: any[];
    approvalItems: any[];
    teamMembers: any[];
    onCreateProject: (data: any) => Promise<ChatbotResult>;
    onCreateAction: (data: any) => Promise<ChatbotResult>;
    onCreateActivity: (data: any) => Promise<ChatbotResult>;
    onAddTeamMember: (data: any) => Promise<ChatbotResult>;
    onRemoveTeamMember: (data: any) => Promise<ChatbotResult>;
    onDeleteProject: (data: any) => Promise<ChatbotResult>;
    onDeleteAction: (data: any) => Promise<ChatbotResult>;
    onDeleteActivity: (data: any) => Promise<ChatbotResult>;
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
        
        const botResponse = await getChatbotResponse(question, projects, actions, users, currentUser, taskItems, approvalItems, teamMembers);
        
        setIsLoading(false);

        if (botResponse.type === 'tool_call') {
            for (const call of botResponse.calls) {
                const { tool_name, args } = call;

                const itemTypeMap: Record<string, string> = {
                    create_project: `ایجاد پروژه "${args.title}"`,
                    create_action: `ایجاد اقدام "${args.title}"`,
                    create_activity: `ایجاد فعالیت "${args.title}"`,
                    add_team_member: `افزودن کاربر "${args.username}"`,
                    remove_team_member: `حذف کاربر "${args.username}"`,
                    delete_project: `حذف پروژه "${args.title}"`,
                    delete_action: `حذف اقدام "${args.title}"`,
                    delete_activity: `حذف فعالیت "${args.title}"`,
                };
                const operationText = itemTypeMap[tool_name] || 'انجام عملیات';
    
                const inProgressMessage: Message = { id: Date.now() + Math.random(), text: `در حال ${operationText}...`, sender: 'bot' };
                setMessages(prev => [...prev, inProgressMessage]);
    
                let result: ChatbotResult = { success: false, error: 'ابزار ناشناخته' };
                switch (tool_name) {
                    case 'create_project': result = await onCreateProject(args); break;
                    case 'create_action': result = await onCreateAction(args); break;
                    case 'create_activity': result = await onCreateActivity(args); break;
                    case 'add_team_member': result = await onAddTeamMember(args); break;
                    case 'remove_team_member': result = await onRemoveTeamMember(args); break;
                    case 'delete_project': result = await onDeleteProject(args); break;
                    case 'delete_action': result = await onDeleteAction(args); break;
                    case 'delete_activity': result = await onDeleteActivity(args); break;
                }
                
                let resultText = '';
                if (result?.success) {
                    switch (tool_name) {
                        case 'create_project': resultText = `پروژه "${result.title}" با موفقیت ایجاد شد.`; break;
                        case 'create_action': resultText = `اقدام "${result.title}" با موفقیت ایجاد شد.`; break;
                        case 'create_activity': resultText = `فعالیت "${result.title}" با موفقیت در پروژه "${result.parent}" ایجاد شد.`; break;
                        case 'add_team_member': resultText = `کاربر "${result.name}" با نقش "${result.role}" با موفقیت به تیم اضافه شد.`; break;
                        case 'remove_team_member': resultText = `کاربر "${result.name}" با موفقیت از تیم حذف شد.`; break;
                        case 'delete_project': resultText = `پروژه "${result.title}" با موفقیت حذف شد.`; break;
                        case 'delete_action': resultText = `اقدام "${result.title}" با موفقیت حذف شد.`; break;
                        case 'delete_activity': resultText = `فعالیت "${result.title}" از پروژه "${result.parent}" با موفقیت حذف شد.`; break;
                        default: resultText = 'عملیات با موفقیت انجام شد.';
                    }
                } else {
                    resultText = `متاسفانه در ${operationText} خطایی رخ داد: ${result?.error || 'خطای نامشخص'}`;
                }
                const resultMessage: Message = { id: Date.now() + Math.random(), text: resultText, sender: 'bot' };
                setMessages(prev => [...prev, resultMessage]);
            }

        } else {
            const newBotMessage: Message = { id: Date.now() + 1, text: botResponse.text, sender: 'bot' };
            setMessages(prev => [...prev, newBotMessage]);
        }
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