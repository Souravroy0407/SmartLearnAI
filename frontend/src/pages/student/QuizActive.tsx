import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { Clock, AlertTriangle, ArrowRight, Sparkles, Brain, CheckCircle2 } from 'lucide-react';
import { useQuiz } from '../../context/QuizContext';
import { motion, AnimatePresence } from 'framer-motion';

interface Question {
    id: number;
    text: string;
    options: { id: number; text: string }[];
}

interface Quiz {
    id: number;
    title: string;
    description: string;
    duration_minutes: number;
    questions: Question[];
}

const QuizActive = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { fetchQuizzes } = useQuiz();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [messageModal, setMessageModal] = useState<{ show: boolean; message: string; type: 'error' | 'warning' | 'info' }>({ show: false, message: '', type: 'info' });

    // Fix: Use ref to track current answers so timer interval can access them without stale closure
    const answersRef = useRef(answers);
    const tabSwitchCountRef = useRef(0);

    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    // Fetch Quiz Details
    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                // Simulate a small delay for the loading animation to be appreciated
                const [response] = await Promise.all([
                    axios.get(`/api/quiz/${id}`),
                    new Promise(resolve => setTimeout(resolve, 1500))
                ]);

                setQuiz(response.data);
                setTimeLeft(response.data.duration_minutes * 60);

                // Start the quiz (tracking attempt)
                await axios.post(`/api/quiz/${id}/start`);
            } catch (error: any) {
                console.error("Error fetching quiz", error);
                if (error.response?.status === 400 || error.response?.status === 404) {
                    setMessageModal({ show: true, message: error.response.data.detail, type: 'error' });
                    setTimeout(() => navigate('/dashboard/quizzes'), 2000); // Redirect after delay
                }
            } finally {
                setLoading(false);
            }
        };
        fetchQuiz();
    }, [id, navigate]);

    // Timer Logic
    useEffect(() => {
        if (loading || timeLeft === 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    submitQuiz(true); // Auto-submit
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    // Proctoring Logic: Detect Tab Switch
    useEffect(() => {
        if (loading || submitting || !quiz) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                tabSwitchCountRef.current += 1;
                setMessageModal({
                    show: true,
                    message: "⚠️ WARNING: Tab switching is monitored! Focusing away from the quiz may lead to disqualification.",
                    type: 'warning'
                });
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [loading, submitting, quiz]);

    // Format Time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleOptionSelect = (questionId: number, optionId: number) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    };

    const handleSubmitClick = () => {
        if (Object.keys(answers).length === 0) {
            setMessageModal({ show: true, message: "Please answer at least one question before submitting.", type: 'warning' });
            return;
        }
        setShowConfirm(true);
    };

    const confirmSubmit = async () => {
        setShowConfirm(false);
        await submitQuiz(false);
    };

    const submitQuiz = useCallback(async (auto = false) => {
        if (submitting) return;
        setSubmitting(true);

        try {
            const currentAnswers = answersRef.current;
            const formattedAnswers = Object.entries(currentAnswers).map(([qId, oId]) => ({
                question_id: parseInt(qId),
                selected_option_id: oId
            }));

            await axios.post(`/api/quiz/${id}/submit`, {
                answers: formattedAnswers,
                submission_type: auto ? 'auto_timeout' : 'manual',
                tab_switch_count: tabSwitchCountRef.current
            });

            await fetchQuizzes(true);
            navigate('/dashboard/student-quizzes');
        } catch (error: any) {
            console.error("Submission failed", error);
            const msg = error.response?.data?.detail || "Failed to submit quiz. Please try again.";
            setMessageModal({ show: true, message: msg, type: 'error' });
            if (error.response?.status === 400) {
                setTimeout(() => navigate('/dashboard/student-quizzes'), 2000);
            }
            setSubmitting(false);
        }
    }, [id, navigate, submitting, fetchQuizzes]);

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: "spring" as const, stiffness: 100 }
        }
    };

    // Calculate Progress
    const answeredCount = Object.keys(answers).length;
    const totalQuestions = quiz?.questions.length || 0;
    const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
                    >
                        <div className="relative w-32 h-32 mb-8">
                            <motion.div
                                className="absolute inset-0 border-4 border-gray-100 rounded-full"
                            />
                            <motion.div
                                className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Brain className="w-12 h-12 text-primary" />
                            </div>
                        </div>
                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="text-2xl font-bold text-gray-800 mb-2"
                        >
                            Preparing Your Quiz
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="text-gray-500"
                        >
                            Get ready to test your knowledge!
                        </motion.p>
                    </motion.div>
                ) : quiz ? (
                    <motion.div
                        key="content"
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                        className="pb-32"
                    >
                        {/* Glassmorphism Header */}
                        <motion.div
                            className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-sm"
                            initial={{ y: -100 }}
                            animate={{ y: 0 }}
                            transition={{ type: "spring", stiffness: 100, damping: 20 }}
                        >
                            <div className="max-w-4xl mx-auto px-4 py-4">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h1 className="text-xl font-bold text-gray-900 line-clamp-1">{quiz.title}</h1>
                                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Sparkles className="w-3 h-3 text-yellow-500" />
                                                {totalQuestions} Questions
                                            </span>
                                            <span>•</span>
                                            <span>{quiz.description}</span>
                                        </div>
                                    </div>

                                    <motion.div
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-lg font-bold shadow-sm transition-colors duration-300 ${timeLeft < 60 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-white text-primary border border-gray-100'
                                            }`}
                                        animate={timeLeft < 60 ? { scale: [1, 1.05, 1] } : {}}
                                        transition={{ repeat: Infinity, duration: 1 }}
                                    >
                                        <Clock className={`w-5 h-5 ${timeLeft < 60 ? 'animate-pulse' : ''}`} />
                                        {formatTime(timeLeft)}
                                    </motion.div>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        <span>Progress</span>
                                        <span>{answeredCount} / {totalQuestions} Answered</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-primary to-indigo-600 rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progressPercent}%` }}
                                            transition={{ type: "spring", stiffness: 50, damping: 15 }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Questions List */}
                        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                            {quiz.questions.map((q, idx) => (
                                <motion.div
                                    key={q.id}
                                    variants={itemVariants}
                                    className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100/50 hover:shadow-md transition-shadow duration-300"
                                >
                                    <div className="flex gap-4 md:gap-6">
                                        <div className="flex-shrink-0">
                                            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary/10 to-indigo-50 rounded-2xl flex items-center justify-center font-bold text-primary shadow-inner">
                                                {idx + 1}
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-6">
                                            <h3 className="text-lg md:text-xl font-medium text-gray-800 leading-relaxed">
                                                {q.text}
                                            </h3>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {q.options.map((opt, optIdx) => {
                                                    const isSelected = answers[q.id] === opt.id;
                                                    const letters = ['A', 'B', 'C', 'D'];

                                                    return (
                                                        <motion.div
                                                            key={opt.id}
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            onClick={() => handleOptionSelect(q.id, opt.id)}
                                                            className={`relative group cursor-pointer p-5 rounded-2xl border-2 transition-all duration-300 ${isSelected
                                                                ? 'border-primary bg-primary/5 shadow-sm'
                                                                : 'border-transparent bg-gray-50 hover:bg-white hover:shadow-md hover:border-gray-200'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${isSelected
                                                                    ? 'bg-primary text-white'
                                                                    : 'bg-white text-gray-400 group-hover:text-gray-600 shadow-sm'
                                                                    }`}>
                                                                    {letters[optIdx]}
                                                                </span>
                                                                <span className={`flex-1 font-medium transition-colors ${isSelected ? 'text-primary' : 'text-gray-600 group-hover:text-gray-900'
                                                                    }`}>
                                                                    {opt.text}
                                                                </span>
                                                                {isSelected && (
                                                                    <motion.div
                                                                        initial={{ scale: 0 }}
                                                                        animate={{ scale: 1 }}
                                                                        className="text-primary"
                                                                    >
                                                                        <CheckCircle2 className="w-6 h-6 fill-primary/10" />
                                                                    </motion.div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Floating Footer */}
                        <motion.div
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-50 md:pl-72" // Added md:pl-72 to account for sidebar if present, or adapt based on layout
                        >
                            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                                <div className="hidden md:block text-sm text-gray-500">
                                    <span className="font-medium text-gray-900">{answeredCount}</span> of <span className="font-medium text-gray-900">{totalQuestions}</span> questions answered
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)" }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleSubmitClick}
                                    disabled={submitting}
                                    className="w-full md:w-auto ml-auto bg-gradient-to-r from-primary to-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                                >
                                    {submitting ? (
                                        <>Submitting...</>
                                    ) : (
                                        <>
                                            Submit Quiz
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                ) : (
                    <div className="flex h-screen items-center justify-center text-red-500">
                        Quiz not found
                    </div>
                )}
            </AnimatePresence>

            {/* Custom Confirmation Modal */}
            <AnimatePresence>
                {showConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
                        >
                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-500 ring-8 ring-yellow-50/50">
                                    <AlertTriangle className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Finish & Submit?</h3>
                                    <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                                        You are about to submit your answers. This action cannot be undone.
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 w-full">
                                    <button
                                        onClick={() => setShowConfirm(false)}
                                        className="px-6 py-3 bg-gray-50 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmSubmit}
                                        className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
                                    >
                                        Submit
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Message Modal */}
            <AnimatePresence>
                {messageModal.show && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
                        >
                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center ring-8 ${messageModal.type === 'error' ? 'bg-red-50 text-red-500 ring-red-50/50' :
                                    messageModal.type === 'warning' ? 'bg-yellow-50 text-yellow-500 ring-yellow-50/50' :
                                        'bg-blue-50 text-blue-500 ring-blue-50/50'
                                    }`}>
                                    {messageModal.type === 'error' ? <AlertTriangle className="w-8 h-8" /> :
                                        messageModal.type === 'warning' ? <AlertTriangle className="w-8 h-8" /> :
                                            <Sparkles className="w-8 h-8" />}
                                </div>
                                <p className="text-gray-800 font-medium text-lg">
                                    {messageModal.message}
                                </p>
                                <button
                                    onClick={() => setMessageModal(prev => ({ ...prev, show: false }))}
                                    className="w-full px-6 py-3 bg-gray-50 text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-colors"
                                >
                                    Got it
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default QuizActive;
