import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Sunrise, Coffee, MinusCircle } from 'lucide-react';
import type { EnergyPreference } from '../utils/energyPlanner';

interface EnergyPreferenceModalProps {
    isOpen: boolean;
    onSelect: (preference: EnergyPreference) => void;
    title?: string;
    selectedPreference?: string | null;
}

const EnergyPreferenceModal: React.FC<EnergyPreferenceModalProps> = ({ isOpen, onSelect, title, selectedPreference }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-8">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                                    <SparklesIcon className="w-8 h-8" />
                                </div>
                                <h2 className="text-2xl font-bold text-secondary-dark mb-2">
                                    {title || "Do you have a preferred study time?"}
                                </h2>
                                <p className="text-secondary text-sm">
                                    We can optimize your schedule based on your natural energy levels.
                                </p>
                            </div>

                            <div className="grid gap-3">
                                <button
                                    onClick={() => onSelect('morning')}
                                    className={`group relative flex items-center gap-4 p-3 rounded-2xl border-2 transition-all hover:shadow-lg ${selectedPreference === 'morning' ? 'border-primary bg-primary/5' : 'border-transparent hover:border-primary/20 bg-secondary-light/5 hover:bg-white'}`}
                                >
                                    <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Sunrise className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-secondary-dark text-sm">Morning Person</h3>
                                        <p className="text-[10px] text-secondary">Peak focus: 6 AM - 10 AM</p>
                                    </div>
                                    {selectedPreference === 'morning' && (
                                        <div className="absolute right-4 w-3 h-3 bg-primary rounded-full" />
                                    )}
                                </button>

                                <button
                                    onClick={() => onSelect('afternoon')}
                                    className={`group relative flex items-center gap-4 p-3 rounded-2xl border-2 transition-all hover:shadow-lg ${selectedPreference === 'afternoon' ? 'border-primary bg-primary/5' : 'border-transparent hover:border-primary/20 bg-secondary-light/5 hover:bg-white'}`}
                                >
                                    <div className="w-10 h-10 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Sun className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-secondary-dark text-sm">Afternoon Person</h3>
                                        <p className="text-[10px] text-secondary">Peak focus: 12 PM - 4 PM</p>
                                    </div>
                                    {selectedPreference === 'afternoon' && (
                                        <div className="absolute right-4 w-3 h-3 bg-primary rounded-full" />
                                    )}
                                </button>

                                <button
                                    onClick={() => onSelect('night')}
                                    className={`group relative flex items-center gap-4 p-3 rounded-2xl border-2 transition-all hover:shadow-lg ${selectedPreference === 'night' ? 'border-primary bg-primary/5' : 'border-transparent hover:border-primary/20 bg-secondary-light/5 hover:bg-white'}`}
                                >
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Moon className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-secondary-dark text-sm">Night Person</h3>
                                        <p className="text-[10px] text-secondary">Peak focus: 7 PM - 11 PM</p>
                                    </div>
                                    {selectedPreference === 'night' && (
                                        <div className="absolute right-4 w-3 h-3 bg-primary rounded-full" />
                                    )}
                                </button>

                                <button
                                    onClick={() => onSelect('none')}
                                    className={`group relative flex items-center gap-4 p-3 rounded-2xl border-2 transition-all hover:shadow-lg ${selectedPreference === 'none' || selectedPreference === 'balanced' ? 'border-gray-400 bg-gray-50' : 'border-transparent hover:border-gray-200 bg-secondary-light/5 hover:bg-white'}`}
                                >
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <MinusCircle className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-secondary-dark text-sm">No specific preference</h3>
                                        <p className="text-[10px] text-secondary">Balanced schedule starting 9 AM</p>
                                    </div>
                                    {(selectedPreference === 'none' || selectedPreference === 'balanced') && (
                                        <div className="absolute right-4 w-3 h-3 bg-gray-400 rounded-full" />
                                    )}
                                </button>
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// Simple Sparkles icon component since lucide might not be imported in this file context if I didn't add it
const SparklesIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
);

export default EnergyPreferenceModal;
