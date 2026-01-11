import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    Download,
    FileText,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import axios from '../../api/axios';


export default function ExamEvaluation() {
    const { examId, studentId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [data, setData] = useState<any>(null); // We'll build a composite object

    // Form State
    const [marks, setMarks] = useState<string>('');
    const [feedback, setFeedback] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // PDFs
    const [paperUrl, setPaperUrl] = useState<string | null>(null);
    const [answerUrl, setAnswerUrl] = useState<string | null>(null);

    useEffect(() => {
        if (examId && studentId) {
            loadData();
        }
        return () => {
            // Cleanup object URLs
            if (paperUrl) URL.revokeObjectURL(paperUrl);
            if (answerUrl) URL.revokeObjectURL(answerUrl);
        };
    }, [examId, studentId]);

    const loadData = async () => {
        try {
            setLoading(true);
            // 1. Fetch Exam List to find Exam Details (since we don't have single fetch)
            const examsRes = await axios.get('/api/exams/');
            const exam = examsRes.data.find((e: any) => e.id === Number(examId));

            if (!exam) throw new Error("Exam not found");

            // 2. Fetch Submissions list to find Student Submission Details
            const subsRes = await axios.get(`/api/exams/${examId}/submissions`);
            const sub = subsRes.data.find((s: any) => s.student_id === Number(studentId));

            if (!sub) throw new Error("Submission not found");

            setData({ exam, submission: sub });

            if (sub.is_evaluated && sub.marks_obtained !== null) {
                setMarks(sub.marks_obtained.toString());
                if (sub.feedback) setFeedback(sub.feedback);
            }

            // 3. Fetch PDFs (Blob)
            // Exam Paper
            if (exam.question_format === 'pdf') {
                const paperRes = await axios.get(`/api/exams/${examId}/download-paper`, { responseType: 'blob' });
                const url = URL.createObjectURL(paperRes.data);
                setPaperUrl(url);
            }

            // Answer Sheet
            const answerRes = await axios.get(`/api/exams/${examId}/submissions/${studentId}/download-answer`, { responseType: 'blob' });
            const itemUrl = URL.createObjectURL(answerRes.data);
            setAnswerUrl(itemUrl);

        } catch (err: any) {
            console.error(err);
            setError("Failed to load evaluation data.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            const marksInt = parseInt(marks);
            if (isNaN(marksInt)) throw new Error("Invalid marks");
            if (marksInt < 0 || marksInt > data.exam.total_marks) {
                throw new Error(`Marks must be between 0 and ${data.exam.total_marks}`);
            }

            await axios.post(`/api/exams/${examId}/evaluate/${studentId}`, {
                marks: marksInt,
                feedback: feedback
            });

            setSuccess(true);
            // Reload to update status
            loadData();
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || err.message || "Failed to submit evaluation");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (!data) return <div className="p-10 text-center">Data not found</div>;

    const isReadOnly = data.submission.status !== 'submitted';

    return (
        <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(`/teacher/exams/${examId}/submissions`)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg text-gray-900">{data.exam.title}</h1>
                        <p className="text-sm text-gray-500">{data.submission.student_name} • Submitted {new Date(data.submission.submitted_at).toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</div>
                        <div className={`font-bold ${data.submission.status === 'checked' ? 'text-green-600' : 'text-amber-600'
                            }`}>
                            {data.submission.status.replace('_', ' ').toUpperCase()}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content - Split Screen */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Question Paper */}
                <div className="w-1/3 border-r border-gray-200 bg-white flex flex-col">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 font-bold text-sm text-gray-700 flex justify-between items-center">
                        <span>Question Paper</span>
                        {/* If text format, show info. If PDF, shows viewer */}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
                        {data.exam.question_format === 'pdf' && paperUrl ? (
                            <iframe src={paperUrl} className="w-full h-full rounded-lg shadow-sm border border-gray-200 bg-white" />
                        ) : (
                            <div className="prose max-w-none p-4 bg-white rounded-lg shadow-sm">
                                {data.exam.question_format === 'text' ? (
                                    <p className="text-gray-500 italic">Questions are text-based. (Implementation for text questions view pending if not using existing endpoint)</p>
                                ) : (
                                    <p>No Question Component Available</p>
                                )}
                                {/* Minimal Text Questions Display if needed */}
                            </div>
                        )}
                    </div>
                </div>

                {/* Middle: Answer Sheet */}
                <div className="w-1/3 border-r border-gray-200 bg-white flex flex-col">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 font-bold text-sm text-gray-700 flex justify-between items-center">
                        <span>Student Answer</span>
                        <a href={answerUrl || '#'} download={`Answer_${studentId}.pdf`} className="text-primary hover:text-primary-dark">
                            <Download className="w-4 h-4 ml-2 inline" />
                        </a>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
                        {answerUrl ? (
                            <iframe src={answerUrl} className="w-full h-full rounded-lg shadow-sm border border-gray-200 bg-white" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                <FileText className="w-12 h-12 mb-2" />
                                <p>No Answer Sheet Preview</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Evaluation Form */}
                <div className="w-1/3 bg-white flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-200 font-bold text-lg text-gray-900">
                        Evaluation
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 text-sm">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}
                        {success && (
                            <div className="bg-green-50 text-green-600 p-4 rounded-xl flex items-start gap-3 text-sm">
                                <CheckCircle2 className="w-5 h-5 shrink-0" />
                                <p>Evaluation submitted successfully!</p>
                            </div>
                        )}

                        <form id="eval-form" onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Marks Obtained <span className="text-gray-400 font-normal">(Max: {data.exam.total_marks})</span>
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    max={data.exam.total_marks}
                                    value={marks}
                                    onChange={e => setMarks(e.target.value)}
                                    disabled={isReadOnly}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-lg font-bold disabled:bg-gray-50 disabled:text-gray-500"
                                    placeholder="0"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Feedback / Remarks
                                </label>
                                <textarea
                                    required
                                    rows={8}
                                    value={feedback}
                                    onChange={e => setFeedback(e.target.value)}
                                    disabled={isReadOnly}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none disabled:bg-gray-50 disabled:text-gray-500 resize-none"
                                    placeholder="Enter your feedback here..."
                                />
                            </div>
                        </form>
                    </div>

                    {!isReadOnly && (
                        <div className="p-6 border-t border-gray-200 bg-gray-50">
                            <button
                                form="eval-form"
                                type="submit"
                                disabled={submitting}
                                className="w-full px-6 py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Submit Evaluation
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
