import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Calendar, AlertCircle, Clock, ExternalLink, FileDown, PenTool, CheckCircle, ChevronRight, BarChart2, RefreshCw } from 'lucide-react';
import api from '../../api/axios';
import { formatDateTime } from '../../utils/date';

// Enhanced Status Badge for Cards
const ExamStatusBadge = ({ status, isExpired }: { status: string; isExpired: boolean }) => {
    let uiStatus: 'ACTIVE' | 'EXPIRED' | 'SUBMITTED';

    if (status === 'assigned') {
        uiStatus = isExpired ? 'EXPIRED' : 'ACTIVE';
    } else {
        uiStatus = 'SUBMITTED';
    }

    const configs = {
        ACTIVE: {
            label: "Active",
            styles: "bg-blue-50 text-blue-700 border-blue-100 shadow-sm shadow-blue-100/50",
            icon: <Clock className="w-3.5 h-3.5 mr-1" />
        },
        EXPIRED: {
            label: "Expired",
            styles: "bg-red-50 text-red-700 border-red-100",
            icon: <AlertCircle className="w-3.5 h-3.5 mr-1" />
        },
        SUBMITTED: {
            label: "Submitted",
            styles: "bg-green-50 text-green-700 border-green-100 shadow-sm shadow-green-100/50",
            icon: <CheckCircle className="w-3.5 h-3.5 mr-1" />
        }
    };

    const config = configs[uiStatus];

    return (
        <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border ${config.styles}`}>
            {config.icon}
            {config.label}
        </span>
    );
};

interface Exam {
    id: number;
    title: string;
    subject: string;
    exam_type: string;
    total_marks: number;
    deadline: string | null;
    instructions: string | null;
    status: string;
    assigned_at: string;
    marks_obtained?: number | null;
}

const StudentExams = () => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async (showRefresh = false) => {
        if (showRefresh) setIsRefreshing(true);
        try {
            const response = await api.get('/api/exams/my-exams');
            setExams(response.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching exams:", err);
            setError("Failed to load exams");
            setLoading(false);
        } finally {
            if (showRefresh) setIsRefreshing(false);
        }
    };

    const getExamTypeIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'external': return <ExternalLink className="w-4 h-4" />;
            case 'pdf': return <FileDown className="w-4 h-4" />;
            case 'subjective': return <PenTool className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-red-500">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p>{error}</p>
                <button
                    onClick={() => fetchExams(true)}
                    className="mt-4 px-4 py-2 bg-primary text-white rounded-xl font-bold flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" /> Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-gradient-to-r from-white to-gray-50/50 p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">My Exams</h1>
                    <p className="text-gray-500 text-lg">View and manage your assigned exams</p>
                </div>
                <button
                    onClick={() => fetchExams(true)}
                    disabled={isRefreshing}
                    className="p-3.5 rounded-2xl bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    title="Refresh exams"
                >
                    <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {exams.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-dashed border-gray-200 text-center">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <FileText className="w-10 h-10 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">No exams assigned yet</h3>
                    <p className="text-gray-500 mt-2 max-w-sm">
                        You don't have any exams assigned at the moment. Check back later!
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Mobile Card View */}
                    <div className="block sm:hidden space-y-4 p-4 bg-gray-50/50">
                        {exams.map((exam) => (
                            <Link
                                key={exam.id}
                                to={`/dashboard/student-exams/${exam.id}`}
                                className="block bg-white rounded-2xl p-5 shadow-sm border border-gray-100 active:scale-[0.98] transition-all cursor-pointer"
                            >
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                            <FileText className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 line-clamp-1">{exam.title}</h3>
                                            <p className="text-xs text-secondary font-medium">{exam.subject} • <span className="capitalize">{exam.exam_type}</span></p>
                                        </div>
                                    </div>
                                    <StatusBadge status={exam.status} />
                                </div>

                                <div className="flex items-center justify-between text-sm text-gray-500 mt-4 pt-4 border-t border-gray-50">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        {exam.deadline ? (
                                            new Date(exam.deadline).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric'
                                            })
                                        ) : 'No Deadline'}
                                    </div>

                                    <div className="font-bold text-gray-900">
                                        {exam.marks_obtained !== undefined && exam.marks_obtained !== null ? (
                                            <span>
                                                {exam.marks_obtained} <span className="text-gray-400 font-normal">/ {exam.total_marks}</span>
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 uppercase text-xs font-semibold">Not Graded</span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Exam Title</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Deadline</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {exams.map((exam) => (
                                    <tr key={exam.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => window.location.href = `/dashboard/student-exams/${exam.id}`}>
                                        <td className="px-6 py-4">
                                            <Link to={`/dashboard/student-exams/${exam.id}`} className="block group">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 bg-blue-50 rounded-lg shrink-0 group-hover:bg-blue-100 transition-colors">
                                                        <FileText className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{exam.title}</h3>
                                                        <span className="text-xs text-gray-500 capitalize">{exam.exam_type} Exam</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                                {exam.subject}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-sm text-gray-500">
                                                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                                {exam.deadline ? (
                                                    new Date(exam.deadline).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })
                                                ) : (
                                                    <span className="text-gray-400">No Deadline</span>
                                                )}
                                            </div>
                                            <span className="font-bold text-gray-900">
                                                {exam.marks_obtained} <span className="text-gray-400 font-normal">/ {exam.total_marks}</span>
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <Clock className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase tracking-wider">Total Marks</span>
                                            </div>
                                            <span className="text-sm font-bold text-gray-700">{exam.total_marks}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Footer: Action Button */}
                                <div className="pt-4 border-t border-gray-50">
                                    <button
                                        onClick={() => navigate(`/dashboard/student-exams/${exam.id}`)}
                                        className={`w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 ${uiStatus === 'ACTIVE'
                                                ? 'bg-primary text-white shadow-primary/25 hover:shadow-primary/40 hover:bg-primary/90'
                                                : uiStatus === 'SUBMITTED'
                                                    ? 'bg-green-600 text-white shadow-green-200 hover:shadow-green-300 hover:bg-green-700'
                                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 shadow-none'
                                            }`}
                                    >
                                        {uiStatus === 'ACTIVE' ? (
                                            <>
                                                Start Exam
                                                <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                                            </>
                                        ) : uiStatus === 'SUBMITTED' ? (
                                            <>
                                                <CheckCircle className="w-5 h-5" />
                                                View Exam
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle className="w-5 h-5" />
                                                View Details
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default StudentExams;


