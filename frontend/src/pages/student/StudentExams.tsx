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
                    <div className="overflow-x-auto">
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
                                    <tr key={exam.id} className="hover:bg-gray-50/50 transition-colors">
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
