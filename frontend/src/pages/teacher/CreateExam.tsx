import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText,
    Link as LinkIcon,
    Upload,
    Plus,
    Trash2,
    Calendar,
    CheckCircle2,
    AlertCircle,
    Save,
    ArrowLeft
} from 'lucide-react';
import axios from '../../api/axios';
import Toast, { type ToastType } from '../../components/Toast';

export default function CreateExam() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Form State
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [instructions, setInstructions] = useState('');
    const [examType, setExamType] = useState<'subjective' | 'external'>('subjective');
    const [questionFormat, setQuestionFormat] = useState<'pdf' | 'text'>('pdf');
    const [externalLink, setExternalLink] = useState('');
    const [totalMarks, setTotalMarks] = useState<number>(100);
    const [deadline, setDeadline] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [questions, setQuestions] = useState<{ text: string; marks: number }[]>([
        { text: '', marks: 5 }
    ]);

    // Handlers
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleAddQuestion = () => {
        setQuestions([...questions, { text: '', marks: 5 }]);
    };

    const handleRemoveQuestion = (index: number) => {
        const newQuestions = [...questions];
        newQuestions.splice(index, 1);
        setQuestions(newQuestions);
    };

    const handleQuestionChange = (index: number, field: 'text' | 'marks', value: any) => {
        const newQuestions = [...questions];
        // @ts-ignore
        newQuestions[index][field] = value;
        setQuestions(newQuestions);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('subject', subject);
            formData.append('instructions', instructions);
            formData.append('exam_type', examType);
            formData.append('total_marks', totalMarks.toString());

            // Handle Deadline (Client Local -> UTC ISO)
            if (deadline) {
                const date = new Date(deadline);
                formData.append('deadline', date.toISOString());
            }

            if (examType === 'external') {
                formData.append('external_link', externalLink);
            } else {
                formData.append('question_format', questionFormat);

                if (questionFormat === 'pdf') {
                    if (!file) {
                        setToast({ message: "Please upload a question paper PDF", type: "error" });
                        setLoading(false);
                        return;
                    }
                    formData.append('question_paper', file);
                } else {
                    // Text format
                    const validQuestions = questions.filter(q => q.text.trim() !== '');
                    if (validQuestions.length === 0) {
                        setToast({ message: "Please add at least one question", type: "error" });
                        setLoading(false);
                        return;
                    }

                    // Add order_no
                    const processedQuestions = validQuestions.map((q, i) => ({
                        question_text: q.text,
                        marks: Number(q.marks),
                        order_no: i + 1
                    }));

                    formData.append('questions_json', JSON.stringify(processedQuestions));
                }
            }

            await axios.post('/api/exams/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setToast({ message: "Exam created successfully!", type: "success" });

            // Redirect after short delay
            setTimeout(() => {
                navigate('/teacher/exams'); // Or dashboard if no list page exists yet
            }, 1500);

        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.detail || "Failed to create exam";
            setToast({ message: msg, type: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Create New Exam</h1>
                    <p className="text-gray-500">Configure exam details and questions</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Main Content */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Basic Details Card */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                        <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Exam Details
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-600 ml-1">Title</label>
                                <input
                                    required
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium"
                                    placeholder="e.g. Midterm Physics Exam"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-600 ml-1">Subject</label>
                                <input
                                    required
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium"
                                    placeholder="e.g. Physics"
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-600 ml-1">Instructions</label>
                            <textarea
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium min-h-[100px]"
                                placeholder="Enter specific instructions for students..."
                                value={instructions}
                                onChange={e => setInstructions(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Question Source Configuration */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                        <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                            Configuration
                        </h2>

                        {/* Exam Type Selector */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setExamType('subjective')}
                                className={`p-4 rounded-2xl border-2 text-left transition-all ${examType === 'subjective'
                                    ? 'border-primary bg-primary/5 text-primary'
                                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                <div className="font-bold mb-1">Subjective Exam</div>
                                <div className="text-xs opacity-70">Students submit files or answers</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setExamType('external')}
                                className={`p-4 rounded-2xl border-2 text-left transition-all ${examType === 'external'
                                    ? 'border-primary bg-primary/5 text-primary'
                                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                <div className="font-bold mb-1">External Exam</div>
                                <div className="text-xs opacity-70">Link to external platform</div>
                            </button>
                        </div>

                        {/* Conditional Content */}
                        {examType === 'external' ? (
                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                                <label className="text-sm font-bold text-gray-600 ml-1">External Link</label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        required
                                        type="url"
                                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium"
                                        placeholder="https://..."
                                        value={externalLink}
                                        onChange={e => setExternalLink(e.target.value)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                                {/* Question Format Selector */}
                                <div className="flex gap-6 border-b border-gray-100 pb-4">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${questionFormat === 'pdf' ? 'border-primary' : 'border-gray-300'}`}>
                                            {questionFormat === 'pdf' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                        </div>
                                        <input type="radio" className="hidden"
                                            checked={questionFormat === 'pdf'}
                                            onChange={() => setQuestionFormat('pdf')}
                                        />
                                        <span className={`font-medium ${questionFormat === 'pdf' ? 'text-gray-800' : 'text-gray-500'}`}>Upload PDF Question Paper</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${questionFormat === 'text' ? 'border-primary' : 'border-gray-300'}`}>
                                            {questionFormat === 'text' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                        </div>
                                        <input type="radio" className="hidden"
                                            checked={questionFormat === 'text'}
                                            onChange={() => setQuestionFormat('text')}
                                        />
                                        <span className={`font-medium ${questionFormat === 'text' ? 'text-gray-800' : 'text-gray-500'}`}>Enter Questions Manually</span>
                                    </label>
                                </div>

                                {/* PDF Upload */}
                                {questionFormat === 'pdf' && (
                                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 hover:bg-gray-50 hover:border-primary/50 transition-all text-center group cursor-pointer relative">
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                            <Upload className="w-8 h-8" />
                                        </div>
                                        {file ? (
                                            <div>
                                                <p className="font-bold text-gray-800 text-lg">{file.name}</p>
                                                <p className="text-gray-500 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                <p className="text-green-500 text-sm font-bold mt-2">Ready to upload</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="font-bold text-gray-800 text-lg">Click to Upload Question Paper</p>
                                                <p className="text-gray-500">PDF files only, max 10MB</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Manual Questions */}
                                {questionFormat === 'text' && (
                                    <div className="space-y-4">
                                        {questions.map((q, idx) => (
                                            <div key={idx} className="flex gap-4 items-start group">
                                                <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500 mt-2">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <input
                                                        value={q.text}
                                                        onChange={e => handleQuestionChange(idx, 'text', e.target.value)}
                                                        className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                                        placeholder="Enter question text..."
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-gray-500 uppercase">Marks:</span>
                                                        <input
                                                            type="number"
                                                            value={q.marks}
                                                            onChange={e => handleQuestionChange(idx, 'marks', e.target.value)}
                                                            className="w-20 px-3 py-1.5 rounded-lg bg-gray-50 border border-transparent focus:bg-white focus:border-primary outline-none text-sm font-bold"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveQuestion(idx)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={handleAddQuestion}
                                            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 font-bold hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-5 h-5" />
                                            Add Another Question
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Settings & Actions */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                        <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            Settings
                        </h2>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-600 ml-1">Total Marks</label>
                            <input
                                type="number"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-bold text-lg text-gray-800"
                                value={totalMarks}
                                onChange={e => setTotalMarks(Number(e.target.value))}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-600 ml-1">Deadline</label>
                            <input
                                type="datetime-local"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-gray-600"
                                value={deadline}
                                onChange={e => setDeadline(e.target.value)}
                            />
                            <p className="text-xs text-gray-400 px-1">
                                Students must submit before this time.
                            </p>
                        </div>

                        <hr className="border-gray-100" />

                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-700 text-sm">
                            <div className="flex gap-2 mb-1 font-bold items-center">
                                <AlertCircle className="w-4 h-4" />
                                Important
                            </div>
                            Once created, exam type and questions cannot be modified.
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-lg hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 active:translate-y-0.5 hover:-translate-y-0.5 disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Create Exam
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}
