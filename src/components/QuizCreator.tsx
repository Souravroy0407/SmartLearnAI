import { useState } from 'react';
import { X, Plus, Trash2, CheckCircle2, Circle, Clock, Sparkles, Wand2 } from 'lucide-react';
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-secondary-dark">Create New Quiz</h2>
                        <p className="text-secondary">Add questions and configure settings</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-6 h-6 text-secondary" />
                    </button>
                </div>

                {/* Mode Tabs */}
                <div className="px-6 pt-4 flex gap-4 border-b border-gray-100">
                    <button
                        onClick={() => setGenerationMode('manual')}
                        className={`pb-3 px-1 font-medium text-sm transition-colors relative ${generationMode === 'manual' ? 'text-primary' : 'text-secondary'}`}
                    >
                        Manual Creation
                        {generationMode === 'manual' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
                    </button>
                    <button
                        onClick={() => setGenerationMode('ai')}
                        className={`pb-3 px-1 font-medium text-sm transition-colors relative flex items-center gap-2 ${generationMode === 'ai' ? 'text-primary' : 'text-secondary'}`}
                    >
                        <Sparkles className="w-4 h-4" />
                        Generate with AI
                        {generationMode === 'ai' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {generationMode === 'ai' ? (
                        <div className="space-y-6 max-w-xl mx-auto py-8">
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-xl shadow-primary/20">
                                    <Wand2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-secondary-dark">AI Quiz Generator</h3>
                                <p className="text-secondary mt-2">Describe what you need, and our AI will create a quiz for you instantly.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-secondary-dark mb-2">Subject</label>
                                    <input
                                        type="text"
                                        value={aiSubject}
                                        onChange={(e) => setAiSubject(e.target.value)}
                                        placeholder="e.g., Mathematics, History, Physics"
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 text-secondary-dark placeholder-gray-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-secondary-dark mb-2">Topic</label>
                                    <input
                                        type="text"
                                        value={aiTopic}
                                        onChange={(e) => setAiTopic(e.target.value)}
                                        placeholder="e.g., Calculus, World War II, Thermodynamics"
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 text-secondary-dark placeholder-gray-400"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-secondary-dark mb-2">Difficulty</label>
                                        <select
                                            value={aiDifficulty}
                                            onChange={(e) => setAiDifficulty(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 text-secondary-dark"
                                        >
                                            <option>Easy</option>
                                            <option>Medium</option>
                                            <option>Hard</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-secondary-dark mb-2">Number of Questions</label>
                                        <select
                                            value={aiCount}
                                            onChange={(e) => setAiCount(parseInt(e.target.value))}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 text-secondary-dark"
                                        >
                                            <option value={3}>3 Questions</option>
                                            <option value={5}>5 Questions</option>
                                            <option value={10}>10 Questions</option>
                                            <option value={15}>15 Questions</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleAiGenerate}
                                disabled={isGenerating}
                                className="w-full py-4 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-bold hover:shadow-lg hover:from-primary-dark hover:to-purple-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Generating Magic...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        Generate Quiz
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-secondary-dark mb-2">Quiz Title</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 text-secondary-dark placeholder-gray-400"
                                            placeholder="e.g., Introduction to Python Variables"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-secondary-dark mb-2">Duration (minutes)</label>
                                        <div className="relative">
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary/50" />
                                            <input
                                                type="number"
                                                value={duration}
                                                onChange={(e) => setDuration(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 text-secondary-dark"
                                                min="1"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-secondary-dark mb-2">Deadline (Optional)</label>
                                        <input
                                            type="datetime-local"
                                            value={deadline}
                                            onChange={(e) => setDeadline(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 text-secondary-dark"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-secondary-dark mb-2">Description</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 text-secondary-dark placeholder-gray-400 min-h-[100px]"
                                            placeholder="Brief description of what this quiz covers..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Questions */}
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-secondary-dark">Questions ({questions.length})</h3>
                                </div>

                                {questions.map((q, qIndex) => (
                                    <div key={qIndex} className="bg-secondary-light/5 p-6 rounded-2xl space-y-4">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-secondary-dark uppercase tracking-wide mb-2">
                                                    Question {qIndex + 1}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={q.text}
                                                    onChange={(e) => updateQuestion(qIndex, e.target.value)}
                                                    className="w-full px-4 py-3 rounded-xl bg-white border border-secondary-light/10 focus:ring-2 focus:ring-primary/20 text-secondary-dark"
                                                    placeholder="Enter your question here..."
                                                />
                                            </div>
                                            <button
                                                onClick={() => removeQuestion(qIndex)}
                                                disabled={questions.length === 1}
                                                className="mt-8 p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <div className="space-y-3 pl-4 border-l-2 border-secondary-light/10">
                                            {q.options.map((opt, oIndex) => (
                                                <div key={oIndex} className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setCorrectOption(qIndex, oIndex)}
                                                        className={`p-1 rounded-full transition-colors ${opt.is_correct ? 'text-success' : 'text-secondary/30 hover:text-secondary/50'
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
                                                        className={`flex-1 px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary/20 text-sm ${opt.is_correct
                                                            ? 'bg-success/5 border-success/30 text-secondary-dark font-medium'
                                                            : 'bg-white border-secondary-light/10 text-secondary'
                                                            }`}
                                                        placeholder={`Option ${oIndex + 1}`}
                                                    />
                                                    <button
                                                        onClick={() => removeOption(qIndex, oIndex)}
                                                        disabled={q.options.length <= 2}
                                                        className="p-1.5 text-secondary/30 hover:text-red-400 rounded-lg transition-colors disabled:opacity-0"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => addOption(qIndex)}
                                                className="text-sm font-medium text-primary hover:text-primary-dark flex items-center gap-1 pl-9 transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Add Option
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={addQuestion}
                                    className="w-full py-4 border-2 border-dashed border-secondary-light/20 rounded-2xl text-secondary hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 font-medium"
                                >
                                    <Plus className="w-5 h-5" />
                                    Add Another Question
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {generationMode === 'manual' && (
                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white rounded-b-3xl">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-bold text-secondary hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-8 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? 'Creating...' : 'Create Quiz'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuizCreator;

