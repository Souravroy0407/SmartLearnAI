import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Clock, BarChart2, Trash2, X } from 'lucide-react';
import axios from '../../api/axios';
import QuizCreator from '../../components/QuizCreator';

interface Quiz {
    id: number;
    title: string;
    description: string;
    duration_minutes: number;
    questions_count: number;
    created_at: string;
}

interface AnalyticsData {
    student_name: string;
    score: number;
    total: number;
    timestamp: string;
}

const QuizManagement = () => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [showCreator, setShowCreator] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState<number | null>(null);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchQuizzes = async () => {
        try {
            const res = await axios.get('/api/quiz/');
            setQuizzes(res.data);
        } catch (error) {
            console.error("Failed to fetch quizzes", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this quiz? This cannot be undone.")) return;
        try {
            await axios.delete(`/api/quiz/${id}`);
            setQuizzes(quizzes.filter(q => q.id !== id));
        } catch (error) {
            console.error("Failed to delete quiz", error);
            alert("Failed to delete quiz");
        }
    };

    const handleShowAnalytics = async (quizId: number) => {
        try {
            const res = await axios.get(`/api/quiz/${quizId}/analytics`);
            setAnalyticsData(res.data);
            setShowAnalytics(quizId);
        } catch (error) {
            console.error("Failed to fetch analytics", error);
            alert("Failed to load analytics");
        }
    };

    return (
        <div className="space-y-8 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-dark">Quiz Management</h1>
                    <p className="text-secondary">Create and manage your quizzes and assessments.</p>
                </div>
                <button
                    onClick={() => setShowCreator(true)}
                    className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-medium hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
                >
                    <Plus className="w-5 h-5" />
                    Create New Quiz
                </button>
            </div>

            {/* Quiz List */}
            <div className="bg-white rounded-3xl border border-secondary-light/10 shadow-sm overflow-hidden min-h-[400px]">
                <div className="p-4 border-b border-secondary-light/10 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-light" />
                        <input
                            type="text"
                            placeholder="Search quizzes..."
                            className="w-full pl-10 pr-4 py-2 rounded-xl bg-secondary-light/5 border-none focus:ring-2 focus:ring-primary/20 text-secondary-dark placeholder-secondary"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                    {loading ? <p className="p-6 text-gray-500">Loading quizzes...</p> : quizzes.length === 0 ? <p className="p-6 text-gray-500">No quizzes found. Create one to get started!</p> : quizzes.map((quiz) => (
                        <div key={quiz.id} className="border border-secondary-light/20 rounded-2xl p-5 hover:shadow-md transition-shadow relative group">
                            <button
                                onClick={() => handleDelete(quiz.id)}
                                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                title="Delete Quiz"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-primary/10 rounded-xl">
                                    <FileText className="w-6 h-6 text-primary" />
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-secondary-dark mb-2">{quiz.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-secondary mb-4">
                                <div className="flex items-center gap-1">
                                    <FileText className="w-4 h-4" />
                                    {quiz.questions_count} Qs
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {quiz.duration_minutes} mins
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-secondary-light/10">
                                <button
                                    onClick={() => handleShowAnalytics(quiz.id)}
                                    className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                                >
                                    <BarChart2 className="w-4 h-4" />
                                    View Analytics
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Creator Modal */}
            {showCreator && (
                <QuizCreator
                    onClose={() => setShowCreator(false)}
                    onSuccess={fetchQuizzes}
                />
            )}

            {/* Analytics Modal */}
            {showAnalytics && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Quiz Analytics</h2>
                            <button onClick={() => setShowAnalytics(null)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            {analyticsData.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No attempts recorded yet.</p>
                            ) : (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-200 text-sm text-gray-500">
                                            <th className="pb-3 font-semibold">Student</th>
                                            <th className="pb-3 font-semibold">Score</th>
                                            <th className="pb-3 font-semibold">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {analyticsData.map((row, idx) => (
                                            <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                                <td className="py-3 font-medium text-gray-900">{row.student_name}</td>
                                                <td className="py-3 text-primary font-bold">{row.score} / {row.total}</td>
                                                <td className="py-3 text-gray-500">{new Date(row.timestamp).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizManagement;
