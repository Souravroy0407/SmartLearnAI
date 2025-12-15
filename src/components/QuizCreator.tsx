import { useState } from 'react';
import { X, Plus, Trash2, CheckCircle2, Circle, Clock, Sparkles, Wand2, Loader2 } from 'lucide-react';
import axios from '../api/axios';

interface Question {
    text: string;
    options: { text: string; is_correct: boolean }[];
}

interface QuizCreatorProps {
    onClose: () => void;
    onSuccess: () => void;
}

const QuizCreator = ({ onClose, onSuccess }: QuizCreatorProps) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState('30');
    const [deadline, setDeadline] = useState('');
    const [questions, setQuestions] = useState<Question[]>([
        { text: '', options: [{ text: '', is_correct: false }, { text: '', is_correct: false }] }
    ]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // AI Generation State
    const [generationMode, setGenerationMode] = useState<'manual' | 'ai'>('manual');
    const [aiSubject, setAiSubject] = useState('');
    const [aiTopic, setAiTopic] = useState('');
    const [aiDifficulty, setAiDifficulty] = useState('Medium');
    const [aiCount, setAiCount] = useState(5);
    const [isGenerating, setIsGenerating] = useState(false);

    const addQuestion = () => {
        setQuestions([...questions, { text: '', options: [{ text: '', is_correct: false }, { text: '', is_correct: false }] }]);
    };

    const removeQuestion = (index: number) => {
        if (questions.length === 1) return;
        const newQuestions = [...questions];
        newQuestions.splice(index, 1);
        setQuestions(newQuestions);
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

            // Transform generated questions to match local state format if needed
            // The backend returns matching format: { text: string, options: [{text, is_correct}] }
            setQuestions(res.data);
            setGenerationMode('manual');

            // Auto-fill title if empty
            if (!title) setTitle(`${aiTopic} Quiz`);
            if (!description) setDescription(`A ${aiDifficulty} difficulty quiz about ${aiSubject} - ${aiTopic}.`);

        } catch (err: any) {
            console.error("AI Generation failed", err);
            setError(err.response?.data?.detail || 'Failed to generate quiz with AI. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };


    const handleSubmit = async () => {
        setError('');

        if (!title.trim() || !description.trim()) {
            setError('Please fill in the quiz title and description.');
            return;
        }

        if (parseInt(duration) < 1) {
            setError('Duration must be at least 1 minute.');
            return;
        }

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.text.trim()) {
                setError(`Question ${i + 1} cannot be empty.`);
                return;
            }
            if (q.options.some(o => !o.text.trim())) {
                setError(`All options for Question ${i + 1} must be filled.`);
                return;
            }
            if (!q.options.some(o => o.is_correct)) {
                setError(`Please ensure Question ${i + 1} has a correct answer marked.`);
                return;
            }
        }

        setLoading(true);
        try {
            await axios.post('/api/quiz/', {
                title,
                description,
                duration_minutes: parseInt(duration),
                deadline: deadline || null,
                questions
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to create quiz", error);
            setError("Failed to create quiz. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white/50 backdrop-blur-xl z-10">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-secondary-dark to-primary bg-clip-text text-transparent">
                            Create New Quiz
                        </h2>
                        <p className="text-secondary text-sm">Design assessments manually or with AI magic</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-red-50 hover:text-red-500 text-secondary rounded-full transition-all duration-200"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Mode Tabs */}
                <div className="px-6 pt-4 pb-0 flex gap-2 border-b border-gray-100 bg-gray-50/50">
                    <button
                        onClick={() => setGenerationMode('manual')}
                        className={`pb-3 px-4 font-medium text-sm transition-all duration-200 relative ${generationMode === 'manual'
                            ? 'text-primary'
                            : 'text-secondary hover:text-secondary-dark'
                            }`}
                    >
                        Manual Creation
                        {generationMode === 'manual' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full layout-id-tab" />
                        )}
                    </button>
                    <button
                        onClick={() => setGenerationMode('ai')}
                        className={`pb-3 px-4 font-medium text-sm transition-all duration-200 relative flex items-center gap-2 ${generationMode === 'ai'
                            ? 'text-violet-600'
                            : 'text-secondary hover:text-secondary-dark'
                            }`}
                    >
                        <Sparkles className={`w-4 h-4 ${generationMode === 'ai' ? 'animate-pulse' : ''}`} />
                        Generate with AI
                        {generationMode === 'ai' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-600 rounded-t-full layout-id-tab" />
                        )}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-gray-50/30 ScrollBar">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2">
                            <Circle className="w-4 h-4 fill-current" />
                            {error}
                        </div>
                    )}

                    {generationMode === 'ai' ? (
                        <div className="space-y-8 max-w-xl mx-auto py-8 animate-in slide-in-from-right-4 duration-300">
                            <div className="text-center mb-8 relative">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl -z-10" />
                                <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-xl shadow-purple-500/30 transform hover:scale-105 transition-transform duration-300">
                                    <Wand2 className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800">AI Quiz Generator</h3>
                                <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                                    Describe your topic, and let our advanced AI craft the perfect quiz for your students in seconds.
                                </p>
                            </div>

                            <div className="space-y-5 bg-white p-8 rounded-3xl shadow-sm border border-purple-100">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
                                    <input
                                        type="text"
                                        value={aiSubject}
                                        onChange={(e) => setAiSubject(e.target.value)}
                                        placeholder="e.g., Physics"
                                        className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none text-gray-800 placeholder-gray-400 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Topic</label>
                                    <input
                                        type="text"
                                        value={aiTopic}
                                        onChange={(e) => setAiTopic(e.target.value)}
                                        placeholder="e.g., Quantum Mechanics"
                                        className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none text-gray-800 placeholder-gray-400 font-medium"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Difficulty</label>
                                        <div className="relative">
                                            <select
                                                value={aiDifficulty}
                                                onChange={(e) => setAiDifficulty(e.target.value)}
                                                className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none text-gray-800 appearance-none font-medium cursor-pointer"
                                            >
                                                <option>Easy</option>
                                                <option>Medium</option>
                                                <option>Hard</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Questions</label>
                                        <div className="relative">
                                            <select
                                                value={aiCount}
                                                onChange={(e) => setAiCount(parseInt(e.target.value))}
                                                className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none text-gray-800 appearance-none font-medium cursor-pointer"
                                            >
                                                <option value={3}>3 Questions</option>
                                                <option value={5}>5 Questions</option>
                                                <option value={10}>10 Questions</option>
                                                <option value={15}>15 Questions</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleAiGenerate}
                                disabled={isGenerating}
                                className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-2xl font-bold text-lg hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2 group"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Generating Magic...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                                        Generate Quiz
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="animate-in slide-in-from-left-4 duration-300">
                            {/* Basic Info */}
                            <div className="space-y-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-6">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <div className="w-1 h-6 bg-primary rounded-full" />
                                    Quiz Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Quiz Title</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-gray-800 placeholder-gray-400 font-medium"
                                            placeholder="e.g., Introduction to Python Variables"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Duration (minutes)</label>
                                        <div className="relative">
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="number"
                                                value={duration}
                                                onChange={(e) => setDuration(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-gray-800"
                                                min="1"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Deadline (Optional)</label>
                                        <input
                                            type="datetime-local"
                                            value={deadline}
                                            onChange={(e) => setDeadline(e.target.value)}
                                            className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-gray-800 font-medium"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-gray-800 placeholder-gray-400 min-h-[100px] font-medium resize-none"
                                            placeholder="Brief description of what this quiz covers..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Questions */}
                            <div className="space-y-6">
                                <div className="flex justify-between items-center px-1">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <div className="w-1 h-6 bg-primary rounded-full" />
                                        Questions ({questions.length})
                                    </h3>
                                </div>

                                {questions.map((q, qIndex) => (
                                    <div key={qIndex} className="bg-white p-6 rounded-2xl space-y-4 border border-gray-100 shadow-sm transition-all hover:shadow-md group">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-primary uppercase tracking-wide mb-2 opacity-70">
                                                    Question {qIndex + 1}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={q.text}
                                                    onChange={(e) => updateQuestion(qIndex, e.target.value)}
                                                    className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-gray-800 placeholder-gray-400 font-medium text-lg"
                                                    placeholder="Enter your question here..."
                                                />
                                            </div>
                                            <button
                                                onClick={() => removeQuestion(qIndex)}
                                                disabled={questions.length === 1}
                                                className="mt-8 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-0"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <div className="space-y-3 pl-4 border-l-2 border-gray-100 ml-2">
                                            {q.options.map((opt, oIndex) => (
                                                <div key={oIndex} className="flex items-center gap-3 group/option">
                                                    <button
                                                        onClick={() => setCorrectOption(qIndex, oIndex)}
                                                        className={`p-1 rounded-full transition-all duration-200 transform hover:scale-110 ${opt.is_correct ? 'text-green-500' : 'text-gray-300 hover:text-green-400'
                                                            }`}
                                                    >
                                                        {opt.is_correct ? (
                                                            <CheckCircle2 className="w-6 h-6 fill-current" />
                                                        ) : (
                                                            <Circle className="w-6 h-6" />
                                                        )}
                                                    </button>
                                                    <input
                                                        type="text"
                                                        value={opt.text}
                                                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                                        className={`flex-1 px-4 py-2.5 rounded-xl border transition-all outline-none text-sm font-medium ${opt.is_correct
                                                            ? 'bg-green-50 border-green-200 text-green-800 focus:ring-2 focus:ring-green-500/20'
                                                            : 'bg-white border-gray-100 text-gray-600 focus:border-primary focus:ring-2 focus:ring-primary/10'
                                                            }`}
                                                        placeholder={`Option ${oIndex + 1}`}
                                                    />
                                                    <button
                                                        onClick={() => removeOption(qIndex, oIndex)}
                                                        disabled={q.options.length <= 2}
                                                        className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg transition-colors opacity-0 group-hover/option:opacity-100"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => addOption(qIndex)}
                                                className="text-sm font-bold text-primary hover:text-primary-dark flex items-center gap-1 pl-10 pt-1 transition-colors group/add"
                                            >
                                                <div className="p-1 bg-primary/10 rounded-full group-hover/add:bg-primary/20 transition-colors">
                                                    <Plus className="w-3 h-3" />
                                                </div>
                                                Add Option
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={addQuestion}
                                    className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 font-bold group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                                        <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    </div>
                                    Add Another Question
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {generationMode === 'manual' && (
                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white z-10">
                        <button
                            onClick={onClose}
                            className="px-6 py-3.5 rounded-xl font-bold text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Quiz'
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuizCreator;

