import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Calendar, Target, Loader2 } from 'lucide-react';
import api from '../api/axios';

interface CreateGoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGoalCreated?: () => void;
}

export default function CreateGoalModal({ isOpen, onClose, onGoalCreated }: CreateGoalModalProps) {
    const [title, setTitle] = useState('');
    const [type, setType] = useState<'Exam' | 'Others'>('Exam');
    const [date, setDate] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || isLoading) return;

        setIsLoading(true);
        try {
            const payload = {
                title,
                type,
                date: date || null
            };

            // Assuming 'api' is an imported axios instance or similar
            // For this example, we'll simulate an API call
            // await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
            await api.post('/api/study-planner/goals', payload);
            console.log("Goal created successfully", payload);

            // Trigger refresh
            if (onGoalCreated) {
                onGoalCreated();
            }

            // Reset and close
            setTitle('');
            setType('Exam');
            setDate('');
            onClose();

            // Note: Data refresh is not explicitly handled here as per strict requirements,
            // but normally we would trigger a refresh.
        } catch (error) {
            console.error("Failed to create goal:", error);
            // Optionally could show a toast here if Toast context was available
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                >
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <Trophy className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold text-secondary-dark">Create New Goal</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-secondary-light hover:text-secondary hover:bg-secondary-light/10 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Title Field */}
                            <div>
                                <label className="block text-xs font-bold text-secondary-light uppercase tracking-wider mb-1.5">
                                    Goal Title <span className="text-error">*</span>
                                </label>
                                <div className="relative">
                                    <Target className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-light" />
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g. Finals Preparation"
                                        className="w-full pl-10 pr-4 py-3 bg-secondary-light/5 border border-secondary-light/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-secondary-dark font-medium placeholder:text-secondary-light/50 transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Type Field */}
                            <div>
                                <label className="block text-xs font-bold text-secondary-light uppercase tracking-wider mb-1.5">
                                    Type <span className="text-error">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setType('Exam')}
                                        className={`py-3 px-4 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${type === 'Exam'
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-secondary-light/20 bg-white text-secondary hover:border-secondary-light/40'
                                            }`}
                                    >
                                        Exam
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('Others')}
                                        className={`py-3 px-4 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${type === 'Others'
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-secondary-light/20 bg-white text-secondary hover:border-secondary-light/40'
                                            }`}
                                    >
                                        Others
                                    </button>
                                </div>
                            </div>

                            {/* Date Field */}
                            <div>
                                <label className="block text-xs font-bold text-secondary-light uppercase tracking-wider mb-1.5">
                                    Target Date <span className="text-secondary-light/50 font-normal normal-case">(Optional)</span>
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-light" />
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-secondary-light/5 border border-secondary-light/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-secondary-dark font-medium transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-3.5 border border-secondary-light/20 text-secondary font-bold rounded-xl hover:bg-secondary-light/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 py-3.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Goal"}
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
