import { useState, useRef, useEffect } from 'react';
import {
    X, Plus, Trash2, CheckCircle2, Circle, Clock, Sparkles,
    Wand2, Loader2, AlertTriangle, ChevronDown, ChevronUp,
    Save, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';

interface Question {
    text: string;
    options: { text: string; is_correct: boolean }[];
}

interface QuizCreatorProps {
    onClose: () => void;
    onSuccess: () => void;
    editQuizId?: number | null;
    studentIds?: number[];
}

const QuizCreator = ({ onClose, onSuccess, editQuizId, studentIds = [] }: QuizCreatorProps) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [topic, setTopic] = useState('');
    const [duration, setDuration] = useState('30');
    const [deadline, setDeadline] = useState('');
    const [questions, setQuestions] = useState<Question[]>([
        { text: '', options: [{ text: '', is_correct: false }, { text: '', is_correct: false }] }
    ]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);

    // AI Generation State
    const [generationMode, setGenerationMode] = useState<'manual' | 'ai'>('manual');
    const [aiSubject, setAiSubject] = useState('');
    const [aiTopic, setAiTopic] = useState('');
    const [aiDifficulty, setAiDifficulty] = useState('Medium');
    const [aiCount, setAiCount] = useState(5);
    const [isGenerating, setIsGenerating] = useState(false);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const addQuestion = () => {
        const newIndex = questions.length;
        setQuestions([...questions, { text: '', options: [{ text: '', is_correct: false }, { text: '', is_correct: false }] }]);
        setExpandedQuestion(newIndex);
        // Scroll to the new question after a small delay to allow render
        setTimeout(() => {
            const el = document.getElementById(`question-card-${newIndex}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    const removeQuestion = (index: number) => {
        if (questions.length === 1) return;
        const newQuestions = [...questions];
        newQuestions.splice(index, 1);
        setQuestions(newQuestions);
        if (expandedQuestion === index) {
            setExpandedQuestion(null);
        } else if (expandedQuestion !== null && expandedQuestion > index) {
            setExpandedQuestion(expandedQuestion - 1);
        }
    };

    const updateQuestion = (index: number, text: string) => {
        const newQuestions = [...questions];
        newQuestions[index].text = text;
        setQuestions(newQuestions);
    };

    const addOption = (qIndex: number) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options.push({ text: '', is_correct: false });
        setQuestions(newQuestions);
    };

    const removeOption = (qIndex: number, oIndex: number) => {
        if (questions[qIndex].options.length <= 2) return;
        const newQuestions = [...questions];
        newQuestions[qIndex].options.splice(oIndex, 1);
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex: number, oIndex: number, text: string) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex].text = text;
        setQuestions(newQuestions);
    };

    const setCorrectOption = (qIndex: number, oIndex: number) => {
        // Haptic feedback for mobile if supported
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
        const newQuestions = [...questions];
        newQuestions[qIndex].options.forEach((opt, idx) => {
            opt.is_correct = idx === oIndex;
        });
        setQuestions(newQuestions);
    };

    const handleAiGenerate = async () => {
        if (!aiSubject || !aiTopic) {
            setError('Please provide both Subject and Topic for AI generation.');
            return;
        }

        setIsGenerating(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/quiz/generate-ai', {
                subject: aiSubject,
                topic: aiTopic,
                difficulty: aiDifficulty,
                count: aiCount
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const { title: aiTitle, description: aiDescription, questions: aiQuestions } = res.data;

            setQuestions(aiQuestions);
            setGenerationMode('manual');
            setSubject(aiTopic);
            setTopic(aiSubject);
            setTitle(aiTitle);
            setDescription(aiDescription);
            setExpandedQuestion(0);

        } catch (err: any) {
            console.error("AI Generation failed", err);
            setError(err.response?.data?.detail || 'Failed to generate quiz with AI.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSubmit = async () => {
        setError('');

        if (!title.trim()) {
            setError('Quiz title is required.');
            setExpandedQuestion(null);
            document.getElementById('quiz-details-section')?.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        if (!subject.trim()) {
            setError('Please select a subject.');
            setExpandedQuestion(null);
            document.getElementById('quiz-details-section')?.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.text.trim()) {
                setError(`Question ${i + 1} is empty.`);
                setExpandedQuestion(i);
                return;
            }
            if (q.options.some(o => !o.text.trim())) {
                setError(`All options for Question ${i + 1} must be filled.`);
                setExpandedQuestion(i);
                return;
            }
            if (!q.options.some(o => o.is_correct)) {
                setError(`Question ${i + 1} needs a correct answer marked.`);
                setExpandedQuestion(i);
                return;
            }
        }

        let utcDeadline = null;
        if (deadline) {
            try {
                utcDeadline = new Date(deadline).toISOString();
            } catch (e) {
                setError('Invalid deadline format.');
                return;
            }
        }

        setLoading(true);
        try {
            const payload = {
                title,
                description,
                subject,
                topic,
                difficulty: null,
                duration_minutes: parseInt(duration),
                deadline: utcDeadline,
                questions,
                student_ids: studentIds
            };

            if (editQuizId) {
                await axios.put(`/api/quiz/${editQuizId}`, payload);
            } else {
                await axios.post('/api/quiz/', payload);
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Failed to save quiz", error);
            setError(error.response?.data?.detail || "Failed to save quiz.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDraft = () => {
        // Mock save draft
        setError('');
        // We could save to localStorage here
        const draft = { title, description, subject, topic, duration, deadline, questions };
        localStorage.setItem('quiz_draft', JSON.stringify(draft));
        alert('Draft saved locally! This feature is in preview.');
    };

    useEffect(() => {
        if (editQuizId) {
            const fetchQuizDetails = async () => {
                setLoading(true);
                try {
                    const res = await axios.get(`/api/quiz/${editQuizId}/edit`);
                    const quiz = res.data;
                    setTitle(quiz.title);
                    setSubject(quiz.subject);
                    setDescription(quiz.description || '');
                    setTopic(quiz.topic || '');
                    setDuration(quiz.duration_minutes.toString());

                    // Format deadline for datetime-local
                    if (quiz.deadline) {
                        const date = new Date(quiz.deadline);
                        const formatted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                            .toISOString()
                            .slice(0, 16);
                        setDeadline(formatted);
                    } else {
                        setDeadline('');
                    }

                    setQuestions(quiz.questions);
                    setExpandedQuestion(0);
                } catch (err: any) {
                    console.error("Failed to fetch quiz details", err);
                    setError("Failed to load quiz details for editing.");
                } finally {
                    setLoading(false);
                }
            };
            fetchQuizDetails();
        }
    }, [editQuizId]);

    const handleCancel = () => {
        if (!editQuizId && (title || questions.some(q => q.text))) {
            setShowCancelConfirm(true);
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-white z-[60] flex flex-col h-[100dvh] overflow-hidden">
            {/* Header - Sticky */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-20">
                <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 text-gray-500 font-medium py-2 px-1 active:bg-gray-100 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5" />
                    <span>Cancel</span>
                </button>
                <h2 className="text-lg font-bold text-gray-900 absolute left-1/2 -translate-x-1/2">
                    {editQuizId ? 'Edit Quiz' : 'New Quiz'}
                </h2>
                <div className="w-20" /> {/* Spacer for symmetry */}
            </div>

            {/* Mode Tabs */}
            <div className="flex bg-gray-50 p-1 mx-4 mt-4 rounded-xl border border-gray-200">
                <button
                    onClick={() => setGenerationMode('manual')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${generationMode === 'manual'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-gray-500'
                        }`}
                >
                    Manual
                </button>
                <button
                    onClick={() => setGenerationMode('ai')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${generationMode === 'ai'
                        ? 'bg-white text-violet-600 shadow-sm'
                        : 'text-gray-500'
                        }`}
                >
                    <Sparkles className="w-4 h-4" />
                    AI Assistant
                </button>
            </div>

            {/* Main Content Area */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6 ScrollBar">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium flex items-center gap-3"
                    >
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </motion.div>
                )}

                {generationMode === 'ai' ? (
                    <div className="space-y-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
                                <Wand2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">AI Quiz Generator</h3>
                            <p className="text-gray-500 text-sm mt-1 px-8">
                                Describe your topic and we'll handle the rest.
                            </p>
                        </div>

                        <div className="space-y-4 bg-gray-50 p-5 rounded-3xl border border-gray-200">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Subject</label>
                                <select
                                    value={aiTopic}
                                    onChange={(e) => setAiTopic(e.target.value)}
                                    className="w-full h-14 px-4 rounded-xl bg-white border border-gray-200 focus:border-violet-500 outline-none text-gray-900 font-medium appearance-none"
                                >
                                    <option value="" disabled>Select subject</option>
                                    {user?.subjects?.split(',').map(s => s.trim()).filter(Boolean).map((s, i) => (
                                        <option key={i} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Topic / Detailed Context</label>
                                <textarea
                                    value={aiSubject}
                                    onChange={(e) => setAiSubject(e.target.value)}
                                    placeholder="e.g. Fundamental particles of an atom"
                                    className="w-full p-4 rounded-xl bg-white border border-gray-200 focus:border-violet-500 outline-none text-gray-900 font-medium h-32 resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Level</label>
                                    <select
                                        value={aiDifficulty}
                                        onChange={(e) => setAiDifficulty(e.target.value)}
                                        className="w-full h-14 px-4 rounded-xl bg-white border border-gray-200 outline-none font-medium"
                                    >
                                        <option>Easy</option>
                                        <option>Medium</option>
                                        <option>Hard</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Count</label>
                                    <select
                                        value={aiCount}
                                        onChange={(e) => setAiCount(parseInt(e.target.value))}
                                        className="w-full h-14 px-4 rounded-xl bg-white border border-gray-200 outline-none font-medium"
                                    >
                                        <option value={5}>5 Qs</option>
                                        <option value={10}>10 Qs</option>
                                        <option value={15}>15 Qs</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleAiGenerate}
                            disabled={isGenerating}
                            className="w-full h-16 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isGenerating ? (
                                <span className="flex items-center justify-center gap-3">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    Creating Magic...
                                </span>
                            ) : 'Generate Quiz'}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Section: Basic Info */}
                        <div id="quiz-details-section" className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-[0.1em] ml-1 flex items-center gap-2">
                                <div className="w-1 h-4 bg-primary rounded-full" />
                                General Information
                            </h3>
                            <div className="bg-white border border-gray-100 rounded-[2rem] p-5 shadow-sm space-y-5">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-gray-500 ml-1">Quiz Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full h-12 bg-gray-50 px-4 rounded-xl border-transparent focus:bg-white focus:border-primary outline-none text-gray-900 font-semibold transition-all"
                                        placeholder="e.g. Physics Weekly Assessment"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-gray-500 ml-1">Subject</label>
                                        <select
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            className="w-full h-12 bg-gray-50 px-3 rounded-xl border-transparent focus:bg-white focus:border-primary outline-none text-gray-900 font-semibold appearance-none"
                                        >
                                            <option value="" disabled>Select</option>
                                            {user?.subjects?.split(',').map(s => s.trim()).filter(Boolean).map((s, i) => (
                                                <option key={i} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-gray-500 ml-1">Time (mins)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={duration}
                                                onChange={(e) => setDuration(e.target.value)}
                                                className="w-full h-12 bg-gray-50 pl-10 pr-4 rounded-xl border-transparent focus:bg-white focus:border-primary outline-none text-gray-900 font-semibold"
                                            />
                                            <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-gray-500 ml-1">Deadline Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        value={deadline}
                                        onChange={(e) => setDeadline(e.target.value)}
                                        className="w-full h-12 bg-gray-50 px-4 rounded-xl border-transparent focus:bg-white focus:border-primary outline-none text-gray-900 font-semibold"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-gray-500 ml-1">Description (Optional)</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full p-4 bg-gray-50 rounded-xl border-transparent focus:bg-white focus:border-primary outline-none text-gray-900 font-medium h-24 resize-none transition-all"
                                        placeholder="Add instructions or details..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: Questions */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-[0.1em] flex items-center gap-2">
                                    <div className="w-1 h-4 bg-primary rounded-full" />
                                    Questions ({questions.length})
                                </h3>
                            </div>

                            <div className="space-y-4">
                                {questions.map((q, qIndex) => (
                                    <div
                                        key={qIndex}
                                        id={`question-card-${qIndex}`}
                                        className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden ${expandedQuestion === qIndex
                                            ? 'border-primary shadow-lg ring-1 ring-primary/20'
                                            : 'border-gray-100 shadow-sm'
                                            }`}
                                    >
                                        <button
                                            onClick={() => setExpandedQuestion(expandedQuestion === qIndex ? null : qIndex)}
                                            className="w-full p-5 flex items-center justify-between active:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${expandedQuestion === qIndex ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {qIndex + 1}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[10px] text-primary font-bold uppercase tracking-wider">
                                                        Question {qIndex + 1} of {questions.length}
                                                    </p>
                                                    <p className="text-sm font-bold text-gray-900 truncate max-w-[180px]">
                                                        {q.text || "New Question"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {q.options.some(o => o.is_correct) && (
                                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                )}
                                                {expandedQuestion === qIndex ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                            </div>
                                        </button>

                                        <AnimatePresence>
                                            {expandedQuestion === qIndex && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="border-t border-gray-50"
                                                >
                                                    <div className="p-5 space-y-6">
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center">
                                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Question Text</label>
                                                                <button
                                                                    onClick={() => removeQuestion(qIndex)}
                                                                    disabled={questions.length === 1}
                                                                    className="text-red-400 p-2 active:bg-red-50 rounded-lg transition-colors"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                            <textarea
                                                                value={q.text}
                                                                onChange={(e) => updateQuestion(qIndex, e.target.value)}
                                                                className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-gray-900 font-semibold focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all min-h-[100px] resize-none border border-transparent focus:border-primary"
                                                                placeholder="Type your question..."
                                                            />
                                                        </div>

                                                        <div className="space-y-3">
                                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Options</label>
                                                            {q.options.map((opt, oIndex) => (
                                                                <div key={oIndex} className="relative group">
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => setCorrectOption(qIndex, oIndex)}
                                                                            className={`w-12 h-14 flex items-center justify-center rounded-2xl transition-all ${opt.is_correct
                                                                                ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                                                                : 'bg-gray-100 text-gray-400 active:scale-90'
                                                                                }`}
                                                                        >
                                                                            {opt.is_correct ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                                                                        </button>
                                                                        <input
                                                                            type="text"
                                                                            value={opt.text}
                                                                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                                                            className="flex-1 h-14 px-4 bg-gray-50 rounded-2xl outline-none font-bold text-gray-900 focus:bg-white border border-transparent focus:border-gray-200 transition-all"
                                                                            placeholder={`Option ${oIndex + 1}`}
                                                                        />
                                                                        <button
                                                                            onClick={() => removeOption(qIndex, oIndex)}
                                                                            disabled={q.options.length <= 2}
                                                                            className="w-10 h-14 flex items-center justify-center text-gray-300 active:text-red-400 transition-colors"
                                                                        >
                                                                            <X className="w-5 h-5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            <button
                                                                onClick={() => addOption(qIndex)}
                                                                className="w-full h-14 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold active:bg-gray-50 active:border-gray-300 mt-2 transition-all"
                                                            >
                                                                <Plus className="w-5 h-5" />
                                                                Add Option
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={addQuestion}
                                className="w-full h-16 bg-primary/5 border-2 border-dashed border-primary/30 rounded-3xl flex items-center justify-center gap-2 text-primary font-bold active:bg-primary/10 transition-all mb-8 shadow-sm"
                            >
                                <Plus className="w-6 h-6" />
                                Add Question
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Action Bar - Sticky */}
            {generationMode === 'manual' && (
                <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 pb-8 flex items-center gap-3 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] rounded-t-3xl">
                    <button
                        onClick={handleSaveDraft}
                        className="flex-1 h-14 rounded-2xl bg-gray-100 text-gray-600 font-bold flex items-center justify-center gap-2 active:bg-gray-200 transition-all"
                    >
                        <Save className="w-5 h-5" />
                        Save Draft
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-[1.5] h-14 rounded-2xl bg-primary text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-[0.98] active:brightness-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                {editQuizId ? 'Update Quiz' : 'Publish Quiz'}
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Cancel Confirmation Modal */}
            <AnimatePresence>
                {showCancelConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl space-y-6 text-center"
                        >
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                                <AlertTriangle className="w-10 h-10 text-red-500" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-xl font-bold text-gray-900">Discard changes?</h4>
                                <p className="text-gray-500 text-sm">
                                    You have unsaved changes. Leaving now will permanently lose your progress.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={onClose}
                                    className="w-full h-14 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 active:scale-[0.98] transition-all"
                                >
                                    Yes, Discard
                                </button>
                                <button
                                    onClick={() => setShowCancelConfirm(false)}
                                    className="w-full h-14 rounded-2xl bg-gray-100 text-gray-700 font-bold active:bg-gray-200 transition-all"
                                >
                                    Keep Editing
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default QuizCreator;

