import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    FileText, Calendar, Clock, AlertCircle, Upload, CheckCircle,
    Download, ChevronLeft
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
}

const StudentExamDetail = () => {
    const { examId } = useParams<{ examId: string }>();
    const navigate = useNavigate();
    const [exam, setExam] = useState<ExamDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchExamDetails();
    }, [examId]);

    const fetchExamDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/exams/${examId}/student-access`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setExam(response.data);
            setLoading(false);
        } catch (err: any) {
            console.error("Error fetching exam details:", err);
            setError(err.response?.data?.detail || "Failed to load exam details");
            setLoading(false);
        }
    };

    const handleDownloadPaper = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/exams/${examId}/download-paper`, {
                headers: { Authorization: `Bearer ${token}` },
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
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFiles(e.target.files);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFiles || !exam) return;

        setSubmitting(true);
        const formData = new FormData();
        for (let i = 0; i < selectedFiles.length; i++) {
            formData.append('files', selectedFiles[i]);
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/exams/${examId}/submit`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setSubmitting(false);
            // Refresh exam details to update status
            fetchExamDetails();
        } catch (err: any) {
            console.error("Error submitting exam:", err);
            alert(err.response?.data?.detail || "Failed to submit exam");
            setSubmitting(false);
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
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border
                        ${exam.status === 'assigned' ? "bg-blue-50 text-blue-700 border-blue-200" :
                            exam.status === 'submitted' ? "bg-green-50 text-green-700 border-green-200" :
                                "bg-purple-50 text-purple-700 border-purple-200"
                        }`}
                    >
                        {exam.status.replace('_', ' ').toUpperCase()}
                    </span>
                </div>
            </div>

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
                                    <Download className="w-4 h-4" /> Download Question Paper
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
                                    <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-center cursor-pointer relative">
                                        <input
                                            type="file"
                                            multiple
                                            accept=".pdf,image/*"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <div className="flex flex-col items-center justify-center py-4">
                                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                            <p className="text-sm font-medium text-gray-900">
                                                {selectedFiles ? `${selectedFiles.length} file(s) selected` : "Click to upload answers"}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">PDF or Images accepted</p>
                                        </div>
                                    </div>

                                    {selectedFiles && (
                                        <div className="space-y-2">
                                            {Array.from(selectedFiles).map((file, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                                    <FileText className="w-4 h-4" />
                                                    <span className="truncate">{file.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={!selectedFiles || submitting}
                                        className="w-full py-2.5 px-4 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
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
        </div>
    );
};

export default StudentExamDetail;
