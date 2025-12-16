import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../api/axios';
import { Send, Image as ImageIcon, Bot, User, Sparkles, MoreHorizontal } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
    id: number;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
};

const DoubtSolver = () => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            text: "Hi there! I'm your AI tutor. Stuck on a problem? Upload a photo or type your question here.",
            sender: 'ai',
            timestamp: new Date()
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const newMessage: Message = {
            id: Date.now(),
            text: input,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newMessage]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await api.post('/api/chat/chat', {
                message: input,
                history: []
            });

            const aiResponse: Message = {
                id: Date.now() + 1,
                text: response.data.response,
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiResponse]);
        } catch (error: any) {
            console.error("Chat Error", error);
            let errorMessage = "Sorry, I couldn't connect to the server.";

            if (error.response && error.response.data && error.response.data.detail) {
                errorMessage = `Error: ${error.response.data.detail}`;
            }

            const errorMsg: Message = {
                id: Date.now() + 1,
                text: errorMessage,
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col max-w-5xl mx-auto bg-white rounded-3xl shadow-sm border border-secondary-light/20 overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 border-b border-secondary-light/10 flex items-center justify-between bg-white z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="font-bold text-secondary-dark">AI Doubt Solver</h2>
                        <p className="text-xs text-secondary flex items-center gap-1">
                            <span className="w-2 h-2 bg-success rounded-full"></span>
                            Online
                        </p>
                    </div>
                </div>
                <button className="p-2 hover:bg-secondary-light/10 rounded-full transition-colors">
                    <MoreHorizontal className="w-5 h-5 text-secondary" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background/50">
                {messages.map((msg) => (
                    <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.sender === 'ai' ? 'bg-primary text-white' : 'bg-secondary-dark text-white'
                            }`}>
                            {msg.sender === 'ai' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                        </div>

                        <div className={`max-w-[80%] rounded-2xl p-4 ${msg.sender === 'user'
                            ? 'bg-primary text-white rounded-tr-none'
                            : 'bg-white border border-secondary-light/10 rounded-tl-none shadow-sm'
                            }`}>
                            <div className={`text-sm leading-relaxed ${msg.sender === 'user' ? 'text-white' : 'text-secondary-dark'}`}>
                                <div className={`prose ${msg.sender === 'user' ? 'prose-invert' : ''} prose-sm max-w-none prose-p:my-1 prose-pre:bg-gray-800 prose-pre:text-white overflow-x-auto`}>
                                    <Markdown remarkPlugins={[remarkGfm]}>
                                        {msg.text}
                                    </Markdown>
                                </div>
                            </div>
                            <span className={`text-[10px] mt-2 block opacity-70 ${msg.sender === 'user' ? 'text-white' : 'text-secondary'}`}>
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </motion.div>
                ))}

                {isTyping && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3"
                    >
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div className="bg-white border border-secondary-light/10 rounded-2xl rounded-tl-none p-4 shadow-sm flex gap-1">
                            <span className="w-2 h-2 bg-secondary-light/40 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-secondary-light/40 rounded-full animate-bounce delay-100"></span>
                            <span className="w-2 h-2 bg-secondary-light/40 rounded-full animate-bounce delay-200"></span>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-secondary-light/10">
                <div className="flex items-end gap-2 bg-background rounded-2xl p-2 border border-secondary-light/20 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                    <button className="p-3 text-secondary hover:text-primary hover:bg-primary/5 rounded-xl transition-colors">
                        <ImageIcon className="w-5 h-5" />
                    </button>

                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type your question..."
                        className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 py-3 text-secondary-dark placeholder:text-secondary-light"
                        rows={1}
                        style={{ minHeight: '44px' }}
                    />

                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="p-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-center text-xs text-secondary-light mt-2">
                    AI can make mistakes. Please verify important information.
                </p>
            </div>
        </div>
    );
};

export default DoubtSolver;
