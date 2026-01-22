import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Calendar, AlertCircle } from 'lucide-react';
import api from '../../api/axios';

// Badge Components
const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
        assigned: "bg-blue-100 text-blue-700 border-blue-200",
        submitted: "bg-green-100 text-green-700 border-green-200",
        checked: "bg-purple-100 text-purple-700 border-purple-200",
        reeval_requested: "bg-orange-100 text-orange-700 border-orange-200",
        re_evaluated: "bg-teal-100 text-teal-700 border-teal-200",
    };

    const labels = {
        assigned: "Assigned",
        submitted: "Submitted",
        checked: "Checked",
        reeval_requested: "Re-eval Requested",
        re_evaluated: "Re-evaluated",
    };

    const statusKey = status as keyof typeof styles;
    const style = styles[statusKey] || "bg-gray-100 text-gray-700 border-gray-200";
    const label = labels[statusKey] || status;

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
            {label}
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
    marks_obtained?: number;
}

const StudentExams = () => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const response = await api.get('/api/exams/my-exams');
            setExams(response.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching exams:", err);
            setError("Failed to load exams");
            setLoading(false);
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
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Exams</h1>
                    <p className="text-secondary mt-1">View and manage your assigned exams</p>
                </div>
            </div>

            {exams.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-gray-200 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">No exams assigned yet</h3>
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
                                        </td>
                                        <td className="px-6 py-4">
                                            {exam.marks_obtained !== undefined && exam.marks_obtained !== null ? (
                                                <span className="font-bold text-gray-900">
                                                    {exam.marks_obtained} <span className="text-gray-400 font-normal">/ {exam.total_marks}</span>
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={exam.status} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentExams;
