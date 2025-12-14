import { useState } from 'react';
import { X, Plus, Save, CheckCircle, Trash2, HelpCircle, Clock, FileText, AlertCircle } from 'lucide-react';
import axios from '../api/axios';

interface Option {
    text: string;
    is_correct: boolean;
}

interface Question {
    text: string;
    options: Option[];
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
                questions: questions.map(q => ({
                    text: q.text,
                    options: q.options.map(o => ({
                        text: o.text,
                        is_correct: o.is_correct
                    }))
                }))
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            const errorMessage = err.response?.data?.detail || 'Failed to create quiz. Please check your connection and try again.';
            setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4 overflow-hidden">
            <div className="bg-white md:rounded-3xl w-full max-w-5xl h-full md:h-auto md:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10 sticky top-0">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-secondary-dark flex items-center gap-2">
                            <Plus className="w-6 h-6 text-primary" />
                            Create New Quiz
                        </h2>
                        <p className="text-xs md:text-sm text-secondary hidden md:block">Design a challenge for your students</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-gray-50/50">
                    {/* Error Alert */}
                    {error && (
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Basic Info Section */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                        <div className="flex items-center gap-2 text-secondary-dark font-bold text-lg mb-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <h3>Quiz Details</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Quiz Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full p-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                    placeholder="e.g., Advanced Mathematics Final"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                                    <Clock className="w-4 h-4" /> Duration (min)
                                </label>
                                <input
                                    type="number"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    className="w-full p-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                    min="1"
                                />
                            </div>
                            <div className="col-span-full space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full p-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-28 resize-none text-sm"
                                    placeholder="What topics does this quiz cover?"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Questions Section */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-center sticky top-0 z-10 bg-gray-50/50 backdrop-blur-sm py-2">
                            <h3 className="text-lg font-bold text-secondary-dark flex items-center gap-2">
                                <HelpCircle className="w-5 h-5 text-primary" />
                                Please Add Questions
                            </h3>
                            <button
                                onClick={addQuestion}
                                className="bg-white text-primary border border-primary/20 hover:bg-primary/5 hover:border-primary px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-sm"
                            >
                                <Plus className="w-4 h-4" /> Add Question
                            </button>
                        </div>

                        {questions.map((q, qIdx) => (
                            <div key={qIdx} className="bg-white rounded-2xl p-4 md:p-6 border border-gray-200 shadow-sm relative group transition-all hover:shadow-md hover:border-primary/30">
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <button
                                        onClick={() => removeQuestion(qIdx)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Remove Question"
                                        disabled={questions.length === 1}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-5">
                                    <div className="flex gap-4 items-start">
                                        <div className="flex-shrink-0 w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-bold text-sm mt-1">
                                            {qIdx + 1}
                                        </div>
                                        <div className="flex-1 mr-8">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Question Text</label>
                                            <input
                                                type="text"
                                                value={q.text}
                                                onChange={(e) => updateQuestion(qIdx, e.target.value)}
                                                className="w-full bg-transparent border-b-2 border-gray-100 focus:border-primary outline-none py-2 font-medium text-lg placeholder-gray-300 transition-colors"
                                                placeholder="Type your question here..."
                                            />
                                        </div>
                                    </div>

                                    <div className="pl-0 md:pl-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {q.options.map((opt, oIdx) => (
                                            <div key={oIdx} className={`relative flex items-center p-1 rounded-xl border-2 transition-all ${opt.is_correct ? 'border-green-500 bg-green-50/30' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
                                                <button
                                                    onClick={() => setCorrectOption(qIdx, oIdx)}
                                                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${opt.is_correct ? 'bg-green-500 text-white shadow-sm' : 'text-gray-300 hover:text-green-500'
                                                        }`}
                                                    title={opt.is_correct ? "Correct Answer" : "Mark as Correct"}
                                                >
                                                    <CheckCircle className={`w-5 h-5 ${opt.is_correct ? 'fill-current' : ''}`} />
                                                </button>

                                                <input
                                                    type="text"
                                                    value={opt.text}
                                                    onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium px-3 text-secondary-dark placeholder-gray-400"
                                                    placeholder={`Option ${oIdx + 1}`}
                                                />

                                                {q.options.length > 2 && (
                                                    <button
                                                        onClick={() => removeOption(qIdx, oIdx)}
                                                        className="p-2 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => addOption(qIdx)}
                                            className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all text-sm font-medium h-full min-h-[50px]"
                                        >
                                            <Plus className="w-4 h-4" /> Add Option
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom Padding for scrolling */}
                    <div className="h-20 md:h-0" />
                </div>

                {/* Footer */}
                <div className="p-4 md:p-6 border-t border-gray-100 bg-white flex flex-col-reverse md:flex-row justify-end gap-3 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <button
                        onClick={onClose}
                        className="w-full md:w-auto px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full md:w-auto px-8 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Creating Quiz...' : <><Save className="w-5 h-5" /> Save Quiz</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuizCreator;
