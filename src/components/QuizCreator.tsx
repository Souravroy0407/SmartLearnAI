import { useState } from 'react';
import { X, Plus, Trash2, CheckCircle2, Circle, Clock } from 'lucide-react';
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
    const [questions, setQuestions] = useState<Question[]>([
        { text: '', options: [{ text: '', is_correct: false }, { text: '', is_correct: false }] }
    ]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
                {/* Header */}
                <div className="p-6 border-b border-secondary-light/10 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-secondary-dark">Create New Quiz</h2>
                        <p className="text-secondary text-sm">Add questions and configure settings</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary-light/10 rounded-full transition-colors">
                        <X className="w-6 h-6 text-secondary" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-secondary-dark mb-2">Quiz Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-secondary-light/5 border-none focus:ring-2 focus:ring-primary/20 text-secondary-dark placeholder-secondary/50"
                                    placeholder="e.g., Introduction to Python Variables"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-dark mb-2">Duration (minutes)</label>
                                <div className="relative">
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary/50" />
                                    <input
                                        type="number"
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-secondary-light/5 border-none focus:ring-2 focus:ring-primary/20 text-secondary-dark"
                                        min="1"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-secondary-dark mb-2">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-secondary-light/5 border-none focus:ring-2 focus:ring-primary/20 text-secondary-dark placeholder-secondary/50 min-h-[100px]"
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
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-secondary-light/10 flex justify-end gap-3 bg-gray-50/50 rounded-b-3xl">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl font-bold text-secondary hover:bg-secondary-light/10 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2.5 rounded-xl font-bold bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/25 transition-all disabled:opacity-70 flex items-center gap-2"
                    >
                        {loading ? 'Creating...' : 'Create Quiz'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuizCreator;
