import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Search,
    CheckCircle2,
    Clock,
    ArrowLeft,
    PenTool
} from 'lucide-react';
import axios from '../../api/axios';

interface Submission {
    student_id: number;
    student_name: string;
    student_email: string;
    status: 'assigned' | 'submitted' | 'checked' | 'reeval_requested' | 're_evaluated';
    assigned_at: string;
    submitted_at: string | null;
    marks_obtained: number | null;
    is_evaluated: boolean;
}

interface ExamDetails {
    id: number;
    title: string;
    subject: string;
    total_marks: number;
}

export default function ExamSubmissions() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [exam, setExam] = useState<ExamDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (examId) {
            fetchData();
        }
    }, [examId]);

    const fetchData = async () => {
        try {
            // Parallel fetch
            const [examRes, subsRes] = await Promise.all([
                // We don't have a direct "get exam details" for teacher except via list?
                // Or we can assume we might need one. 
                // Actually teacher has list logic. 
                // Let's assume we can get exam details from list or fetch specifically.
                // Ideally we should have GET /api/exams/{id} for teacher.
                // Currently exams.py has list_exams and get_student_exam_details.
                // We might miss a detailed single exam fetch for teacher.
                // BUT, we can filter from full list or just fetch submissions and maybe exam details are not crucial or we add an endpoint.
                // Let's check exams.py again.
                // There isn't a single "get exam" for teacher. 
                // I can add one or just use the submissions endpoint and maybe include exam title?
                // Or just assume the user knows context.
                // Better UX: Show Exam Title.
                // I can add a small endpoint or just update submissions to return exam info wrapper.
                // Or fetch list and find.
                axios.get('/api/exams/'),
                axios.get(`/api/exams/${examId}/submissions`)
            ]);

            const foundExam = examRes.data.find((e: any) => e.id === Number(examId));
            setExam(foundExam || null);
            setSubmissions(subsRes.data);

        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSubmissions = submissions.filter(sub =>
        sub.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.student_email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'submitted': return 'text-amber-600 bg-amber-50';
            case 'checked': return 'text-green-600 bg-green-50';
            case 'reeval_requested': return 'text-purple-600 bg-purple-50';
            case 're_evaluated': return 'text-blue-600 bg-blue-50';
            default: return 'text-gray-500 bg-gray-50';
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <button
                    onClick={() => navigate('/teacher/exams')}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors w-fit"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Exams
                </button>
                <div className="flex justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {exam ? exam.title : 'Exam Submissions'}
                        </h1>
                        <p className="text-gray-500">
                            {exam ? `${exam.subject} • ${exam.total_marks} Marks` : 'Manage student submissions'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm min-h-[500px] flex flex-col">
                {/* Filters */}
                <div className="p-6 border-b border-gray-100">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search student..."
                            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-x-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                            <p>Loading submissions...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 text-sm font-medium text-gray-500">
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Submitted At</th>
                                    <th className="px-6 py-4">Marks</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredSubmissions.map((sub) => (
                                    <tr key={sub.student_id} className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
                                                    {sub.student_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{sub.student_name}</div>
                                                    <div className="text-sm text-gray-500">{sub.student_email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(sub.status)}`}>
                                                {sub.status === 'checked' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                {sub.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-medium">
                                            {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900">
                                            {sub.marks_obtained !== null ? `${sub.marks_obtained} / ${exam?.total_marks}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {(sub.status === 'submitted' || sub.status === 'checked' || sub.status === 'reeval_requested' || sub.status === 're_evaluated') && (
                                                <button
                                                    onClick={() => navigate(`/teacher/exams/${examId}/evaluate/${sub.student_id}`)}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-all shadow-md active:scale-95"
                                                >
                                                    <PenTool className="w-4 h-4" />
                                                    {sub.status === 'submitted' ? 'Evaluate' : 'View'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredSubmissions.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center text-gray-500">
                                            No students found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
