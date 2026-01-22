import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
    FileText, Calendar, Clock, AlertCircle, Upload, CheckCircle,
    Download, ChevronLeft, X, Eye
} from 'lucide-react';

interface Question {
    id: number;
    question_text: string;
    marks: number;
    order_no: number;
}

interface ExamDetail {
    id: number;
    title: string;
    subject: string;
    instructions: string | null;
    total_marks: number;
    deadline: string | null;
    exam_type: string;
    question_format: string | null;
    external_link: string | null;
    status: string;
    questions?: Question[];
    marks_obtained?: number;
    feedback?: string;
    has_feedback_file?: boolean;
    feedback_file_mime?: string;
    feedback_file_name?: string;
    reeval_reason?: string;
}

const StudentExamDetail = () => {
    const { user } = useAuth();
    const { examId } = useParams<{ examId: string }>();
    const navigate = useNavigate();
    const [exam, setExam] = useState<ExamDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [downloadingPaper, setDownloadingPaper] = useState(false);

    // Feedback file states
    const [viewingFeedback, setViewingFeedback] = useState(false);
    const [downloadingFeedback, setDownloadingFeedback] = useState(false);

    // Re-evaluation State
    const [showReevalModal, setShowReevalModal] = useState(false);
    const [reevalReason, setReevalReason] = useState('');
    const [reevalSubmitting, setReevalSubmitting] = useState(false);

    useEffect(() => {
        fetchExamDetails();
    }, [examId]);

    const fetchExamDetails = async () => {
        try {
            const response = await api.get(`/api/exams/${examId}/student-access`);
            setExam(response.data);
            setLoading(false);
        } catch (err: any) {
            console.error("Error fetching exam details:", err);
            const msg = err.response?.data?.detail
                || err.message
                || "Failed to load exam details";
            setError(`${msg} (Debug: ${JSON.stringify(err)})`);
            setLoading(false);
        }
    };

    const handleDownloadPaper = async () => {
        try {
            setDownloadingPaper(true);
            const response = await api.get(`/api/exams/${examId}/download-paper`, {
                responseType: 'blob'
            });

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Exam_${examId}_Paper.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Error downloading paper:", err);
            alert("Failed to download question paper");
        } finally {
            setDownloadingPaper(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            // Append new files to existing ones
            const newFiles = Array.from(e.target.files);
            setSelectedFiles(prev => [...prev, ...newFiles]);

            // Reset input value to allow re-selecting the same file if needed
            e.target.value = '';
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Allow if files selected OR it is an external exam (markers as completed without files)
        if ((selectedFiles.length === 0 && exam?.exam_type !== 'external') || !exam) return;

        setSubmitting(true);
        const formData = new FormData();
        selectedFiles.forEach(file => {
            formData.append('files', file);
        });

        try {
            await api.post(`/api/exams/${examId}/submit`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Optimistic UI update: Immediately mark as submitted upon success
            setExam(prev => prev ? { ...prev, status: 'submitted' } : null);

            // Do NOT call setSubmitting(false) here - this prevents the button from
            // re-enabling/flickering before the "Submitted" view renders.

            // For subjective exams, we still fetch details to sync with server,
            // but the UI is already in the correct state.
            if (exam.exam_type !== 'external') {
                fetchExamDetails();
            }
        } catch (err: any) {
            console.error("Error submitting exam:", err);
            alert(err.response?.data?.detail || "Failed to submit exam");
            setSubmitting(false);
        }
    };

    const handleReevalRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reevalReason.trim()) return;

        setReevalSubmitting(true);
        try {
            await api.post(`/api/exams/${examId}/request-reeval`,
                { reason: reevalReason }
            );

            setReevalSubmitting(false);
            setShowReevalModal(false);
            fetchExamDetails();
        } catch (err: any) {
            console.error("Error requesting re-evaluation:", err);
            alert(err.response?.data?.detail || "Failed to request re-evaluation");
            setReevalSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !exam) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-red-500">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p>{error || "Exam not found"}</p>
                <button
                    onClick={() => navigate('/dashboard/student-exams')}
                    className="mt-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
                >
                    <ChevronLeft className="w-4 h-4" /> Back to Exams
                </button>
            </div>
        );
    }

    const isDeadlinePassed = exam.deadline ? new Date(exam.deadline) < new Date() : false;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <button
                        onClick={() => navigate('/dashboard/student-exams')}
                        className="text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-2 text-sm"
                    >
                        <ChevronLeft className="w-4 h-4" /> Back to My Exams
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {exam.subject}
                        </span>
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="w-4 h-4" /> {exam.total_marks} Marks
                        </span>
                        {exam.deadline && (
                            <span className={`text-sm flex items-center gap-1 ${isDeadlinePassed ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                <Calendar className="w-4 h-4" />
                                {isDeadlinePassed ? "Deadline Passed: " : "Due: "}
                                {new Date(exam.deadline).toLocaleString()}
                            </span>
                        )}
                    </div>
                </div>
                <div>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold border capitalize
                        ${exam.status === 'assigned' ? "bg-blue-50 text-blue-700 border-blue-200" :
                            exam.status === 'submitted' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                exam.status === 'checked' ? "bg-green-50 text-green-700 border-green-200" :
                                    exam.status === 'reeval_requested' ? "bg-purple-50 text-purple-700 border-purple-200" :
                                        "bg-blue-50 text-blue-700 border-blue-200" // re_evaluated
                        }`}
                    >
                        {exam.status.replace('_', ' ')}
                    </span>
                </div>
            </div>

            {/* Evaluation Results Section */}
            {['checked', 'reeval_requested', 're_evaluated'].includes(exam.status) && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex flex-col md:flex-row gap-6 md:items-start justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-1">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                {exam.status === 're_evaluated' ? "Re-evaluation Results" : "Exam Results"}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {exam.status === 'reeval_requested'
                                    ? "You have requested a re-evaluation. Results will update once reviewed."
                                    : "Your exam has been checked by the teacher."}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {exam.status === 'checked' && exam.exam_type !== 'external' && (
                                <button
                                    onClick={() => setShowReevalModal(true)}
                                    className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
                                >
                                    Request Re-evaluation
                                </button>
                            )}
                            <div className="text-right bg-gray-50 px-6 py-3 rounded-xl border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Marks Obtained</p>
                                <p className="text-3xl font-bold text-gray-900">
                                    {exam.marks_obtained} <span className="text-lg text-gray-400 font-normal">/ {exam.total_marks}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                    {exam.feedback && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <h4 className="text-sm font-bold text-gray-900 mb-2">Teacher Feedback</h4>
                            <p className="text-gray-700 bg-gray-50 p-4 rounded-xl text-sm leading-relaxed border border-gray-100">
                                {exam.feedback}
                            </p>

                            {exam.has_feedback_file && (
                                <div className="mt-3 flex justify-end gap-2">
                                    <button
                                        onClick={async () => {
                                            if (user?.id && !viewingFeedback) {
                                                setViewingFeedback(true);
                                                try {
                                                    const res = await api.get(`/api/exams/${examId}/evaluation/${user.id}/download-feedback`, { responseType: 'blob' });
                                                    const file = new Blob([res.data], { type: exam.feedback_file_mime || 'application/pdf' });
                                                    const fileURL = URL.createObjectURL(file);
                                                    window.open(fileURL, '_blank');
                                                } catch (e) {
                                                    console.error(e);
                                                    alert("Failed to load feedback file.");
                                                } finally {
                                                    setViewingFeedback(false);
                                                }
                                            }
                                        }}
                                        disabled={viewingFeedback}
                                        className="text-gray-500 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors tooltip tooltip-left disabled:opacity-50"
                                        title="View Attachment"
                                    >
                                        {viewingFeedback ? (
                                            <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (user?.id && !downloadingFeedback) {
                                                setDownloadingFeedback(true);
                                                try {
                                                    const res = await api.get(`/api/exams/${examId}/evaluation/${user.id}/download-feedback`, { responseType: 'blob' });
                                                    const url = window.URL.createObjectURL(new Blob([res.data]));
                                                    const link = document.createElement('a');
                                                    link.href = url;
                                                    link.setAttribute('download', exam.feedback_file_name || 'feedback.pdf');
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    link.remove();
                                                } catch (e) {
                                                    console.error(e);
                                                    alert("Failed to download feedback file.");
                                                } finally {
                                                    setDownloadingFeedback(false);
                                                }
                                            }
                                        }}
                                        disabled={downloadingFeedback}
                                        className="text-gray-500 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                                        title="Download Attachment"
                                    >
                                        {downloadingFeedback ? (
                                            <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                                        ) : (
                                            <Download className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Re-evaluation Modal */}
            {
                showReevalModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Request Re-evaluation</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Please provide a reason for your request. The teacher will review your submission again.
                            </p>
                            <form onSubmit={handleReevalRequest}>
                                <textarea
                                    value={reevalReason}
                                    onChange={(e) => setReevalReason(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none mb-6"
                                    placeholder="E.g., Question 3 was marked incorrectly..."
                                    rows={4}
                                    required
                                />
                                <div className="flex gap-3 justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setShowReevalModal(false)}
                                        className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={reevalSubmitting || !reevalReason.trim()}
                                        className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {reevalSubmitting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            "Submit Request"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Layout based on Exam Type */}
            {
                exam.exam_type === 'external' ? (
                    /* EXTERNAL EXAM LAYOUT */
                    <div className="max-w-3xl mx-auto space-y-6">
                        {exam.instructions && (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-gray-400" /> Instructions
                                </h3>
                                <p className="text-gray-600 whitespace-pre-line">{exam.instructions}</p>
                            </div>
                        )}

                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center space-y-6">
                            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto">
                                <Eye className="w-8 h-8" />
                            </div>

                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-2">External Exam</h2>
                                <p className="text-gray-500 max-w-lg mx-auto">
                                    This exam is hosted on an external platform. Please verify you have completed it before marking it as done here.
                                </p>
                            </div>

                            {exam.status === 'assigned' && !isDeadlinePassed ? (
                                <div className="space-y-6 max-w-md mx-auto">
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-left">
                                        <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Step 1: Open Link</p>
                                        {exam.external_link && (
                                            <a
                                                href={exam.external_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-full py-3 bg-white text-blue-600 text-center rounded-lg border border-blue-200 font-bold hover:bg-blue-50 transition-colors break-all shadow-sm"
                                            >
                                                Open Exam Link ↗
                                            </a>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Step 2: Confirm Completion</p>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={submitting}
                                            className="w-full py-4 px-4 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 active:translate-y-0.5"
                                        >
                                            {submitting ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Marking as Completed...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-5 h-5" />
                                                    Mark as Completed
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-green-50 text-green-700 p-6 rounded-xl border border-green-100 inline-block w-full max-w-md">
                                    <div className="flex items-center justify-center gap-2 font-bold text-lg mb-1">
                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                        {isDeadlinePassed && exam.status === 'assigned' ? "Missed Deadline" : "Exam Completed"}
                                    </div>
                                    <p className="text-sm opacity-90">
                                        {isDeadlinePassed && exam.status === 'assigned'
                                            ? "The deadline for this exam has passed."
                                            : "You have marked this external exam as completed."}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* SUBJECTIVE EXAM LAYOUT (Two Columns) */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column: Exam Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Instructions */}
                            {exam.instructions && (
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-gray-400" /> Instructions
                                    </h3>
                                    <p className="text-gray-600 whitespace-pre-line">{exam.instructions}</p>
                                </div>
                            )}

                            {/* Question Paper */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-gray-400" /> Questions
                                </h3>

                                {exam.question_format === 'pdf' ? (
                                    <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <FileText className="w-12 h-12 text-gray-400 mb-3" />
                                        <p className="text-gray-600 mb-4 text-center">
                                            The question paper is available as a PDF document.
                                        </p>
                                        <button
                                            onClick={handleDownloadPaper}
                                            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                                        >
                                            <Download className={`w-4 h-4 ${downloadingPaper ? 'animate-bounce' : ''}`} />
                                            {downloadingPaper ? "Downloading..." : "Download Question Paper"}
                                        </button>
                                    </div>
                                ) : exam.questions && exam.questions.length > 0 ? (
                                    <div className="space-y-6">
                                        {exam.questions.map((q) => (
                                            <div key={q.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex gap-3">
                                                        <span className="font-medium text-gray-900 min-w-[24px]">Q{q.order_no}.</span>
                                                        <p className="text-gray-800 whitespace-pre-wrap">{q.question_text}</p>
                                                    </div>
                                                    <span className="text-xs font-medium bg-white px-2 py-1 rounded border border-gray-200 text-gray-500 whitespace-nowrap">
                                                        {q.marks} Marks
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic">No questions to display.</p>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Submission */}
                        <div className="lg:col-span-1">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-6">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-gray-400" /> Submission
                                </h3>

                                {exam.status === 'assigned' ? (
                                    isDeadlinePassed ? (
                                        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-medium">Submission Closed</p>
                                                <p className="text-sm mt-1">The deadline for this exam has passed.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-center cursor-pointer relative group">
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept=".pdf,image/*"
                                                    onChange={handleFileChange}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                <div className="flex flex-col items-center justify-center py-4">
                                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                        <Upload className="w-5 h-5 text-gray-500" />
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        Click to select files
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">PDF or Images accepted</p>
                                                </div>
                                            </div>

                                            {selectedFiles.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Selected Files ({selectedFiles.length})</p>
                                                    {selectedFiles.map((file, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl group/item hover:bg-white hover:shadow-sm transition-all">
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                                                    <FileText className="w-4 h-4" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                                                                    <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeFile(idx)}
                                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={selectedFiles.length === 0 || submitting}
                                                className="w-full py-3 px-4 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 active:translate-y-0.5"
                                            >
                                                {submitting ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        Submitting...
                                                    </>
                                                ) : (
                                                    "Submit Exam"
                                                )}
                                            </button>
                                        </form>
                                    )
                                ) : (
                                    <div className="bg-green-50 text-green-700 p-6 rounded-xl border border-green-100 text-center">
                                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <CheckCircle className="w-6 h-6 text-green-600" />
                                        </div>
                                        <h4 className="font-semibold text-lg mb-1">Submitted!</h4>
                                        <p className="text-sm opacity-90">
                                            You have successfully submitted this exam.
                                        </p>
                                    </div>
                                )}

                                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <h4 className="font-medium text-blue-900 text-sm mb-2">Notice</h4>
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        Ensure your answers are clear and legible. Once submitted, you cannot make changes.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default StudentExamDetail;
