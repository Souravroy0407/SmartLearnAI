import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    Download,
    FileText,
    AlertCircle,
    CheckCircle2,
    Eye
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

    // Loading States for Blobs
    const [isLoadingPaper, setIsLoadingPaper] = useState(false);
    const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);

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
            // Optimized Fetch: Single endpoint for all metadata
            const res = await axios.get(`/api/exams/${examId}/evaluation/${studentId}`);
            setData(res.data);

            if (res.data.evaluation.marks !== null) {
                setMarks(res.data.evaluation.marks.toString());
            }
            if (res.data.evaluation.feedback) {
                setFeedback(res.data.evaluation.feedback);
            }

        } catch (err: any) {
            console.error(err);
            setError("Failed to load evaluation data.");
        } finally {
            setLoading(false);
        }
    };

    const handleViewPaper = async () => {
        setIsLoadingPaper(true);
        try {
            const paperRes = await axios.get(`/api/exams/${examId}/download-paper`, { responseType: 'blob' });
            const paperBlob = new Blob([paperRes.data], { type: 'application/pdf' });
            setPaperUrl(URL.createObjectURL(paperBlob));
        } catch (e) { console.error(e); }
        finally { setIsLoadingPaper(false); }
    };

    const handleViewAnswer = async () => {
        setIsLoadingAnswer(true);
        try {
            const answerRes = await axios.get(`/api/exams/${examId}/submissions/${studentId}/download-answer`, { responseType: 'blob' });
            const answerBlob = new Blob([answerRes.data], { type: 'application/pdf' });
            setAnswerUrl(URL.createObjectURL(answerBlob));
        } catch (e) { console.error(e); }
        finally { setIsLoadingAnswer(false); }
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

            if (data.submission.status === 'reeval_requested') {
                await axios.post(`/api/exams/${examId}/reevaluate/${studentId}`, {
                    marks: marksInt,
                    feedback: feedback
                });
            } else {
                await axios.post(`/api/exams/${examId}/evaluate/${studentId}`, {
                    marks: marksInt,
                    feedback: feedback
                });
            }

            setSuccess(true);
            setMarks(marksInt.toString());

            setTimeout(() => {
                navigate(`/teacher/exams/${examId}/submissions`);
            }, 1000);

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

    const isReadOnly = data.submission.status !== 'submitted' && data.submission.status !== 'reeval_requested';

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(`/teacher/exams/${examId}/submissions`)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </button>
                        <div>
                            <h1 className="font-bold text-xl text-gray-900 leading-tight">{data.exam.title}</h1>
                            <p className="text-sm text-gray-500">
                                {data.submission.student_name} • Submitted {new Date(data.submission.submitted_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Status</span>
                            <span className={`font-bold ${data.submission.status === 'checked' ? 'text-green-600' :
                                    data.submission.status === 'reeval_requested' ? 'text-purple-600' :
                                        'text-amber-600'
                                }`}>
                                {data.submission.status.replace('_', ' ').toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {data.submission.reeval_reason && (
                    <div className="mb-6 bg-purple-50 border border-purple-100 rounded-xl p-4 flex items-start gap-4 shadow-sm">
                        <AlertCircle className="w-6 h-6 text-purple-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-bold text-purple-900">Re-evaluation Request</h3>
                            <p className="text-purple-700 mt-1">{data.submission.reeval_reason}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Content */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Question Paper Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-gray-400" />
                                    Question Paper
                                </h2>
                                {paperUrl && (
                                    <a href={paperUrl} download={`Question_Paper_${data.exam.id}.pdf`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                        <Download className="w-4 h-4" /> Download
                                    </a>
                                )}
                            </div>
                            <div className="p-1 min-h-[500px] bg-gray-50 flex flex-col items-center justify-center">
                                {data.exam.question_format === 'pdf' ? (
                                    paperUrl ? (
                                        <iframe src={paperUrl} className="w-full h-[600px] rounded-b-xl" title="Question Paper" />
                                    ) : isLoadingPaper ? (
                                        <div className="w-full h-[600px] bg-gray-100 animate-pulse flex flex-col items-center justify-center">
                                            <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-500 rounded-full animate-spin mb-4"></div>
                                            <span className="text-gray-500 font-medium">Loading Document...</span>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4">
                                                <FileText className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <h3 className="font-medium text-gray-900 mb-2">Question Paper Preview</h3>
                                            <button
                                                onClick={handleViewPaper}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-gray-700 font-medium transition-all"
                                            >
                                                <Eye className="w-4 h-4 text-gray-500" />
                                                View Question Paper
                                            </button>
                                        </div>
                                    )
                                ) : (
                                    <div className="p-8 w-full prose max-w-none text-gray-600">
                                        <p>Questions are text-based. (Preview not implemented)</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Answer Sheet Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-gray-400" />
                                    Student Answer
                                </h2>
                                {answerUrl && (
                                    <a href={answerUrl} download={`Answer_${studentId}.pdf`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                        <Download className="w-4 h-4" /> Download
                                    </a>
                                )}
                            </div>
                            <div className="p-1 min-h-[500px] bg-gray-50 flex flex-col items-center justify-center">
                                {answerUrl ? (
                                    <iframe src={answerUrl} className="w-full h-[600px] rounded-b-xl" title="Answer Sheet" />
                                ) : isLoadingAnswer ? (
                                    <div className="w-full h-[600px] bg-gray-100 animate-pulse flex flex-col items-center justify-center">
                                        <div className="w-12 h-12 border-4 border-gray-300 border-t-green-500 rounded-full animate-spin mb-4"></div>
                                        <span className="text-gray-500 font-medium">Loading Answer Sheet...</span>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4">
                                            <FileText className="w-8 h-8 text-green-500" />
                                        </div>
                                        <h3 className="font-medium text-gray-900 mb-2">Student Answer Sheet</h3>
                                        <button
                                            onClick={handleViewAnswer}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-gray-700 font-medium transition-all"
                                        >
                                            <Eye className="w-4 h-4 text-green-600" />
                                            View Answer Sheet
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Evaluation Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
                            <h2 className="font-bold text-lg text-gray-900 mb-6">Evaluation</h2>

                            {error && (
                                <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex gap-2">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="mb-4 bg-green-50 text-green-600 p-3 rounded-lg text-sm flex gap-2">
                                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                                    Evaluation Saved!
                                </div>
                            )}

                            <form id="eval-form" onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Marks Obtained <span className="text-gray-400 font-normal ml-1">/ {data.exam.total_marks}</span>
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        max={data.exam.total_marks}
                                        value={marks}
                                        onChange={e => setMarks(e.target.value)}
                                        disabled={isReadOnly}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-2xl font-bold text-center disabled:bg-gray-50 disabled:text-gray-500"
                                        placeholder="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Feedback
                                    </label>
                                    <textarea
                                        required
                                        rows={6}
                                        value={feedback}
                                        onChange={e => setFeedback(e.target.value)}
                                        disabled={isReadOnly}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none disabled:bg-gray-50 disabled:text-gray-500 resize-none text-sm"
                                        placeholder="Write your feedback..."
                                    />
                                </div>

                                {!isReadOnly && (
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {submitting ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Save className="w-5 h-5" />
                                                Submit Check
                                            </>
                                        )}
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
