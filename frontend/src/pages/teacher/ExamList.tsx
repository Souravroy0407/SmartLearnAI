import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    FileText,
    Link as LinkIcon,
    UserPlus,
    Clock,
    CheckCircle2
} from 'lucide-react';
import axios from '../../api/axios';
import AssignExamModal from '../../components/teacher/AssignExamModal';

interface Exam {
    id: number;
    title: string;
    subject: string;
    exam_type: 'subjective' | 'external';
    total_marks: number;
    deadline: string | null;
    created_at: string;
    question_format: 'pdf' | 'text' | null;
    external_link: string | null;
}

export default function ExamList() {
    const navigate = useNavigate();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [assignModalExam, setAssignModalExam] = useState<Exam | null>(null);

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const response = await axios.get('/api/exams/');
            setExams(response.data);
        } catch (error) {
            console.error("Failed to fetch exams", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'No Deadline';
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
        });
    };

    const filteredExams = exams.filter(exam =>
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
                    <p className="text-gray-500">Create and manage your exams.</p>
                </div>
                <button
                    onClick={() => navigate('create')}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 active:translate-y-0.5 hover:-translate-y-0.5"
                >
                    <Plus className="w-5 h-5" />
                    Create New Exam
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm min-h-[500px] flex flex-col">
                {/* Filters */}
                <div className="p-6 border-b border-gray-100">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search exams..."
                            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                        <p>Loading exams...</p>
                    </div>
                ) : filteredExams.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-20">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-10 h-10 opacity-20" />
                        </div>
                        <p className="font-bold text-gray-600 text-lg">No exams found</p>
                        <p className="text-sm">Create your first exam to get started.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredExams.map(exam => (
                            <div key={exam.id} className="p-6 hover:bg-gray-50/50 transition-colors flex flex-col md:flex-row gap-6 items-start md:items-center group">
                                {/* Icon */}
                                <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl shadow-sm ${exam.exam_type === 'subjective' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'
                                    }`}>
                                    {exam.exam_type === 'subjective' ? <FileText className="w-7 h-7" /> : <LinkIcon className="w-7 h-7" />}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0 space-y-1">
                                    <h3 className="text-lg font-bold text-gray-900 truncate">{exam.title}</h3>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                        <span className="font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">{exam.subject}</span>
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            Deadline: {formatDate(exam.deadline)}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {exam.total_marks} Marks
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
                                    <button
                                        onClick={() => navigate(`${exam.id}/submissions`)}
                                        className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2 active:scale-95"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Submissions
                                    </button>
                                    <button
                                        onClick={() => setAssignModalExam(exam)}
                                        className="flex-1 md:flex-none px-5 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 hover:shadow-gray-300 flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Assign
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Assign Modal */}
            {assignModalExam && (
                <AssignExamModal
                    examId={assignModalExam.id}
                    examTitle={assignModalExam.title}
                    onClose={() => setAssignModalExam(null)}
                />
            )}
        </div>
    );
}
