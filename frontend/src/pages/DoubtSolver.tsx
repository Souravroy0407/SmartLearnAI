import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { Send, Sparkles, MoreHorizontal, Bot, User, Code, Calculator, Atom, BookOpen, Paperclip, Smile } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
    id: number;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
};

const suggestedPrompts = [
    { icon: Calculator, label: "Math Help", prompt: "Help me solve this calculus problem..." },
    { icon: Code, label: "Code Debug", prompt: "Why is my React component not rendering?" },
    { icon: Atom, label: "Physics Concept", prompt: "Explain quantum entanglement simply." },
    { icon: BookOpen, label: "Exam Prep", prompt: "Create a study plan for my finals." },
];

const DoubtSolver = () => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [input]);

    const handleSend = async (textOverride?: string) => {
        const textToSend = textOverride || input;
        if (!textToSend.trim()) return;

        const newMessage: Message = {
            id: Date.now(),
            text: textToSend,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newMessage]);
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setIsTyping(true);

        try {
            const response = await api.post('/api/chat/chat', {
                message: textToSend,
                history: [] // You might want to pass actual history here if supported
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
        <div className="h-[calc(100vh-6rem)] flex flex-col max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative">

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-20 absolute top-0 w-full">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-800 text-lg">AI Tutor</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs text-slate-500 font-medium">Always here to help</span>
                        </div>
                    </div>
                </div>
                <button className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto pt-24 pb-32 px-4 md:px-8 space-y-6 scroll-smooth bg-slate-50/50">
                <AnimatePresence mode='popLayout'>
                    {messages.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4"
                        >
                            <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 ring-4 ring-purple-50">
                                <Bot className="w-10 h-10 text-primary" />
                            </div>
                            <h1 className="text-3xl font-bold text-slate-800 mb-3">Hi, I'm your AI Study Buddy!</h1>
                            <p className="text-slate-500 max-w-md mx-auto mb-10 text-lg">
                                I can help you solving math problems, debugging code, preparing for exams, and much more.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                                {suggestedPrompts.map((item, index) => (
                                    <motion.button
                                        key={index}
                                        whileHover={{ scale: 1.02, y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleSend(item.prompt)}
                                        className="flex items-center gap-4 p-4 bg-white hover:bg-white border boundary-slate-200 hover:border-primary/30 rounded-2xl shadow-sm hover:shadow-md transition-all text-left group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                                            <item.icon className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-700 group-hover:text-primary transition-colors">{item.label}</div>
                                            <div className="text-xs text-slate-400 truncate w-40">{item.prompt}</div>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex items-end gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.sender === 'ai' ? 'bg-gradient-to-br from-primary to-purple-600 text-white' : 'bg-slate-200'
                                    }`}>
                                    {msg.sender === 'ai' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5 text-slate-500" />}
                                </div>

                                <div className={`max-w-[85%] md:max-w-[70%] p-4 shadow-sm ${msg.sender === 'user'
                                    ? 'bg-primary text-white rounded-2xl rounded-tr-sm'
                                    : 'bg-white rounded-2xl rounded-tl-sm text-slate-700 border border-slate-100'
                                    }`}>
                                    <div className={`prose text-sm leading-relaxed max-w-none ${msg.sender === 'user' ? 'prose-invert' : 'prose-slate'}`}>
                                        <Markdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                h1: ({ node, ...props }) => <h1 className={`text-xl font-bold mb-3 mt-4 border-b pb-2 ${msg.sender === 'user' ? 'text-white border-white/20' : 'text-slate-800 border-slate-100'}`} {...props} />,
                                                h2: ({ node, ...props }) => <h2 className={`text-lg font-bold mb-2 mt-4 ${msg.sender === 'user' ? 'text-white' : 'text-slate-700'}`} {...props} />,
                                                h3: ({ node, ...props }) => <h3 className={`text-md font-semibold mb-2 mt-3 ${msg.sender === 'user' ? 'text-white' : 'text-slate-800'}`} {...props} />,
                                                p: ({ node, ...props }) => <p className={`mb-3 leading-relaxed ${msg.sender === 'user' ? 'text-white/90' : 'text-slate-600'}`} {...props} />,
                                                ul: ({ node, ...props }) => <ul className={`list-disc list-outside ml-5 mb-4 space-y-1 ${msg.sender === 'user' ? 'marker:text-white/60' : 'marker:text-primary/60'}`} {...props} />,
                                                ol: ({ node, ...props }) => <ol className={`list-decimal list-outside ml-5 mb-4 space-y-1 marker:font-medium ${msg.sender === 'user' ? 'marker:text-white/80' : 'marker:text-primary/80'}`} {...props} />,
                                                li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                blockquote: ({ node, ...props }) => (
                                                    <div className={`border-l-4 pl-4 py-3 pr-2 my-4 rounded-r-lg italic relative ${msg.sender === 'user'
                                                            ? 'border-white/50 bg-white/10 text-white'
                                                            : 'border-primary/30 bg-primary/5 text-slate-700'
                                                        }`}>
                                                        <span className={`absolute -top-3 -left-3 p-1 rounded-full shadow-sm ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-white'}`}>
                                                            <Sparkles className={`w-4 h-4 ${msg.sender === 'user' ? 'text-white' : 'text-primary'}`} />
                                                        </span>
                                                        <blockquote {...props} />
                                                    </div>
                                                ),
                                                code: ({ node, ...props }: any) => {
                                                    const match = /language-(\w+)/.exec(props.className || '')
                                                    const isInline = !match && !String(props.children).includes('\n')
                                                    return isInline
                                                        ? <code className={`${msg.sender === 'user' ? 'bg-white/20 text-white border-white/20' : 'bg-slate-100 text-pink-600 border-slate-200'} px-1.5 py-0.5 rounded text-[0.9em] font-medium font-mono border`} {...props} />
                                                        : <code className="block bg-slate-900 text-slate-50 p-4 rounded-lg my-4 text-sm font-mono overflow-x-auto shadow-inner" {...props} />
                                                },
                                            }}
                                        >
                                            {msg.text}
                                        </Markdown>
                                    </div>
                                    <span className={`text-[10px] mt-2 block opacity-60 ${msg.sender === 'user' ? 'text-white' : 'text-slate-400'}`}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>

                {isTyping && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-end gap-3"
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-sm">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm p-4 shadow-sm">
                            <div className="flex gap-1.5">
                                <motion.span
                                    className="w-2 h-2 bg-primary/40 rounded-full"
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                                />
                                <motion.span
                                    className="w-2 h-2 bg-primary/40 rounded-full"
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                                />
                                <motion.span
                                    className="w-2 h-2 bg-primary/40 rounded-full"
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 w-full p-4 sm:p-6 bg-gradient-to-t from-white via-white to-transparent z-10">
                <div className="bg-white rounded-[24px] p-2 pr-3 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 flex items-end gap-2 relative">
                    {/* Attach Button */}
                    <button className="p-3 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-full transition-all flex-shrink-0" title="Attach file">
                        <Paperclip className="w-5 h-5" />
                    </button>

                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Message AI Tutor..."
                        className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 py-3.5 text-slate-700 placeholder:text-slate-400 leading-relaxed text-[15px]"
                        rows={1}
                    />

                    <div className="flex items-center gap-1 pb-1">
                        {!input && (
                            <button className="p-2 text-slate-300 hover:text-slate-500 transition-colors hidden sm:block">
                                <Smile className="w-5 h-5" />
                            </button>
                        )}
                        <motion.button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isTyping}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`p-3 rounded-xl flex items-center justify-center transition-all duration-300 ${input.trim()
                                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                }`}
                        >
                            <Send className="w-5 h-5" />
                        </motion.button>
                    </div>
                </div>
                <div className="text-center mt-3 text-[11px] text-slate-400 font-medium">
                    AI can make mistakes. Verify important info.
                </div>
            </div>
        </div>
    );
};

export default DoubtSolver;
