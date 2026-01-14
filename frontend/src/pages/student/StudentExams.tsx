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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.map((exam) => {
                        const isExpired = exam.deadline ? new Date(exam.deadline) < new Date() : false;
                        const uiStatus = exam.status === 'assigned' ? (isExpired ? 'EXPIRED' : 'ACTIVE') : 'SUBMITTED';

                        return (
                            <div
                                key={exam.id}
                                className={`
                                    group bg-white border rounded-3xl p-6 relative flex flex-col
                                    transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/50
                                    ${uiStatus === 'ACTIVE' ? 'border-gray-100 hover:border-primary/20' :
                                        uiStatus === 'SUBMITTED' ? 'border-green-100 bg-green-50/10' :
                                            'border-gray-100 bg-gray-50/50 opacity-90'}
                                `}
                            >
                                {/* Header: Status & Type */}
                                <div className="flex justify-between items-start mb-5">
                                    <ExamStatusBadge status={exam.status} isExpired={isExpired} />
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-500 rounded-xl border border-gray-100 text-xs font-bold uppercase tracking-wider shadow-sm">
                                        {getExamTypeIcon(exam.exam_type)}
                                        {exam.exam_type}
                                    </div>
                                </div>

                                {/* Content: Title & Subject */}
                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors min-h-[3.5rem] leading-tight mb-2">
                                        {exam.title}
                                    </h3>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/5 text-primary border border-primary/10">
                                        {exam.subject}
                                    </span>
                                </div>

                                {/* Stats: Marks & Deadline */}
                                <div className="space-y-3 mb-6 mt-auto">
                                    <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <Calendar className="w-4 h-4" />
                                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Deadline</span>
                                        </div>
                                        <span className={`text-sm font-bold ${isExpired && exam.status === 'assigned' ? 'text-red-500' : 'text-gray-700'}`}>
                                            {exam.deadline ? formatDateTime(exam.deadline) : 'No Deadline'}
                                        </span>
                                    </div>

                                    {exam.marks_obtained !== undefined && exam.marks_obtained !== null ? (
                                        <div className="flex items-center justify-between p-3 bg-green-50/50 rounded-2xl border border-green-100/50 shadow-sm shadow-green-100/20">
                                            <div className="flex items-center gap-2 text-green-700">
                                                <BarChart2 className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase tracking-wider">Score</span>
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


