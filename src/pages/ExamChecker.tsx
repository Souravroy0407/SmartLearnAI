import { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, CheckCircle2, AlertCircle, Lightbulb, ArrowRight, X } from 'lucide-react';


const ExamChecker = () => {
    const [step, setStep] = useState<'upload' | 'analyzing' | 'results'>('upload');
    const [, setFile] = useState<File | null>(null);
    const [results, setResults] = useState<any>(null); // TODO: Define strict interface

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFile(file);
            setStep('analyzing');

            const formData = new FormData();
            formData.append('file', file);

            try {
                // Call Python Backend
                const response = await axios.post('http://localhost:8000/api/exam/analyze', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setResults(response.data);
                setStep('results');
            } catch (error) {
                console.error("Analysis Failed", error);
                alert("Failed to analyze exam. Ensure backend is running.");
                setStep('upload');
            }
        }
    };

    const reset = () => {
        setFile(null);
        setStep('upload');
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-secondary-dark mb-2">AI Exam Checker</h1>
                <p className="text-secondary">Upload your answer sheet to get instant feedback, grading, and improvement tips.</p>
            </div>

            <AnimatePresence mode="wait">
                {step === 'upload' && (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white rounded-3xl border-2 border-dashed border-secondary-light/30 p-12 text-center hover:border-primary/50 transition-colors relative"
                    >
                        <input
                            type="file"
                            onChange={handleUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            accept=".pdf,.jpg,.png"
                        />
                        <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Upload className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-secondary-dark mb-2">Upload Answer Sheet</h3>
                        <p className="text-secondary mb-6">Drag & drop your PDF or image here, or click to browse</p>
                        <button className="bg-primary text-white px-6 py-2.5 rounded-xl font-medium hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">
                            Select File
                        </button>
                        <p className="mt-4 text-xs text-secondary-light">Supports PDF, JPG, PNG (Max 10MB)</p>
                    </motion.div>
                )}

                {step === 'analyzing' && (
                    <motion.div
                        key="analyzing"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-3xl shadow-sm border border-secondary-light/20 p-12 text-center max-w-xl mx-auto"
                    >
                        <div className="relative w-24 h-24 mx-auto mb-8">
                            <div className="absolute inset-0 border-4 border-secondary-light/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                            <BrainIcon className="absolute inset-0 m-auto w-10 h-10 text-primary animate-pulse" />
                        </div>
                        <h3 className="text-2xl font-bold text-secondary-dark mb-2">Analyzing Your Answers...</h3>
                        <p className="text-secondary">Our AI is checking handwriting, evaluating logic, and assigning marks.</p>

                        <div className="mt-8 space-y-3 text-left max-w-xs mx-auto">
                            <AnalysisStep label="Scanning document" delay={0} />
                            <AnalysisStep label="Reading handwriting" delay={1} />
                            <AnalysisStep label="Checking against answer key" delay={2} />
                            <AnalysisStep label="Generating feedback" delay={2.5} />
                        </div>
                    </motion.div>
                )}

                {step === 'results' && (
                    <motion.div
                        key="results"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {/* Score Overview */}
                        <div className="bg-white rounded-3xl shadow-sm border border-secondary-light/20 p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6">
                                <button onClick={reset} className="p-2 hover:bg-secondary-light/10 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-secondary" />
                                </button>
                            </div>

                            <div className="flex flex-col md:flex-row items-center gap-12">
                                <div className="relative w-48 h-48 flex-shrink-0">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="96" cy="96" r="88" fill="none" stroke="#F1F5F9" strokeWidth="12" />
                                        <circle
                                            cx="96" cy="96" r="88"
                                            fill="none"
                                            stroke="#4F46E5"
                                            strokeWidth="12"
                                            strokeDasharray={2 * Math.PI * 88}
                                            strokeDashoffset={2 * Math.PI * 88 * (1 - 0.72)}
                                            strokeLinecap="round"
                                            className="animate-[dash_1.5s_ease-out_forwards]"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-5xl font-bold text-secondary-dark">{results?.score || 0}</span>
                                        <span className="text-secondary font-medium">/ {results?.total_marks || 100}</span>
                                    </div>
                                </div>

                                <div className="flex-1 space-y-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-secondary-dark mb-1">{results?.subject || 'Exam Result'}</h2>
                                        <p className="text-secondary">Evaluated on {new Date().toLocaleDateString()}</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <StatCard label="Accuracy" value="78%" color="text-success" />
                                        <StatCard label="Attempted" value="22/25" color="text-primary" />
                                        <StatCard label="Time Taken" value="45m" color="text-warning" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Detailed Feedback */}
                            <div className="space-y-4">
                                <FeedbackCard
                                    type="strength"
                                    title="Strengths"
                                    items={results?.strengths || []}
                                />
                                <FeedbackCard
                                    type="weakness"
                                    title="Areas for Improvement"
                                    items={results?.weaknesses || []}
                                />
                                <FeedbackCard
                                    type="tip"
                                    title="AI Improvement Tips"
                                    items={results?.tips || []}
                                />
                            </div>

                            {/* Topic Performance */}
                            <div className="bg-white rounded-3xl shadow-sm border border-secondary-light/20 p-6">
                                <h3 className="text-lg font-bold text-secondary-dark mb-6">Topic-wise Performance</h3>
                                <div className="space-y-6">
                                    {results?.topic_performance && Object.entries(results.topic_performance).map(([topic, score]) => (
                                        <TopicBar key={topic} topic={topic} score={score as number} />
                                    ))}
                                </div>

                                <div className="mt-8 pt-6 border-t border-secondary-light/10">
                                    <button className="w-full flex items-center justify-center gap-2 bg-primary/5 text-primary py-3 rounded-xl font-medium hover:bg-primary/10 transition-colors">
                                        View Full Answer Key
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const BrainIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
);

const AnalysisStep = ({ label, delay }: { label: string, delay: number }) => (
    <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: delay, duration: 0.5 }}
        className="flex items-center gap-3 text-sm text-secondary"
    >
        <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="w-3 h-3 text-success" />
        </div>
        {label}
    </motion.div>
);

const StatCard = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <div className="bg-background rounded-2xl p-4 border border-secondary-light/10">
        <p className="text-xs text-secondary mb-1">{label}</p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
);

const FeedbackCard = ({ type, title, items }: { type: 'strength' | 'weakness' | 'tip', title: string, items: string[] }) => {
    const styles = {
        strength: { bg: 'bg-success/5', border: 'border-success/20', icon: CheckCircle2, iconColor: 'text-success' },
        weakness: { bg: 'bg-error/5', border: 'border-error/20', icon: AlertCircle, iconColor: 'text-error' },
        tip: { bg: 'bg-warning/5', border: 'border-warning/20', icon: Lightbulb, iconColor: 'text-warning' },
    };

    const style = styles[type];
    const Icon = style.icon;

    return (
        <div className={`rounded-2xl border ${style.border} ${style.bg} p-6`}>
            <div className="flex items-center gap-3 mb-4">
                <Icon className={`w-5 h-5 ${style.iconColor}`} />
                <h3 className="font-bold text-secondary-dark">{title}</h3>
            </div>
            <ul className="space-y-2">
                {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-secondary-dark/80">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current opacity-50 flex-shrink-0"></span>
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
};

const TopicBar = ({ topic, score }: { topic: string, score: number }) => (
    <div>
        <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-secondary-dark">{topic}</span>
            <span className="text-secondary">{score}%</span>
        </div>
        <div className="h-2 bg-background rounded-full overflow-hidden">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full rounded-full ${score >= 80 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-error'}`}
            />
        </div>
    </div>
);

export default ExamChecker;
