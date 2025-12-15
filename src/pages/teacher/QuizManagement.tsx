import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Clock, Trash2, X, AlertTriangle, Calendar, BookOpen } from 'lucide-react';
import axios from '../../api/axios';
import QuizCreator from '../../components/QuizCreator';

interface Quiz {
    id: number;
    title: string;
    description: string;
    duration_minutes: number;
    questions_count: number;
    created_at: string;
    deadline?: string;
}

interface QuizDetailsModalProps {
    quiz: Quiz;
    onClose: () => void;
}

const QuizDetailsModal = ({ quiz, onClose }: QuizDetailsModalProps) => {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                </button>

                <div className="mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 text-primary">
                        <FileText className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 pr-10 leading-tight">{quiz.title}</h2>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                        <div className="p-2 bg-white rounded-xl shadow-sm text-primary">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Published On</p>
                            <p className="text-gray-800 font-medium text-sm">{new Date(quiz.created_at).toLocaleString()}</p>
                        </div>
                    </div>

                    <div className={`flex items-center gap-4 p-3 rounded-2xl border ${quiz.deadline ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                        <div className={`p-2 bg-white rounded-xl shadow-sm ${quiz.deadline ? 'text-red-500' : 'text-gray-400'}`}>
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-wider ${quiz.deadline ? 'text-red-500/70' : 'text-gray-500'}`}>Deadline</p>
                            <p className={`font-medium text-sm ${quiz.deadline ? 'text-red-700' : 'text-gray-800'}`}>
                                {quiz.deadline ? new Date(quiz.deadline).toLocaleString() : 'No Deadline'}
                            </p>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-sm text-gray-600 leading-relaxed">
                        <h4 className="font-bold text-gray-800 mb-1 text-xs uppercase tracking-wider">Description</h4>
                        {quiz.description || "No description provided."}
                    </div>
                </div>
            </div>
        </div>
    );
};

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
    const [analyticsLoadingId, setAnalyticsLoadingId] = useState<number | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [quizToDelete, setQuizToDelete] = useState<number | null>(null);

    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);

    const isExpired = (deadline?: string) => {
        if (!deadline) return false;
        return new Date() > new Date(deadline);
    };

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

    const handleDeleteClick = (id: number) => {
        setQuizToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!quizToDelete) return;
        setIsDeleting(true);
        try {
            await axios.delete(`/api/quiz/${quizToDelete}`);
            setQuizzes(quizzes.filter(q => q.id !== quizToDelete));
            setShowDeleteModal(false);
            setQuizToDelete(null);
        } catch (error) {
            console.error("Failed to delete quiz", error);
            alert("Failed to delete quiz");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleShowAnalytics = async (quizId: number) => {
        setAnalyticsLoadingId(quizId);
        try {
            const res = await axios.get(`/api/quiz/${quizId}/analytics`);
            setAnalyticsData(res.data);
            setShowAnalytics(quizId);
        } catch (error) {
            console.error("Failed to fetch analytics", error);
            alert("Failed to load analytics");
        } finally {
            setAnalyticsLoadingId(null);
        }
    };

    return (
        <div className="space-y-8 relative max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-gradient-to-r from-white to-gray-50/50 p-8 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Management</h1>
                    <p className="text-gray-500 text-lg">Create, manage, and track your assessments.</p>
                </div>
                <button
                    onClick={() => setShowCreator(true)}
                    className="flex items-center gap-2 bg-primary text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0"
                >
                    <Plus className="w-5 h-5" />
                    Create New Quiz
                </button>
            </div>

            {/* Quiz List */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden min-h-[500px]">
                <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search quizzes..."
                            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-gray-800 placeholder-gray-400 font-medium"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                    {loading ? (
                        <div className="col-span-full py-20 text-center">
                            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-gray-400 font-medium">Loading quizzes...</p>
                        </div>
                    ) : quizzes.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-gray-400 flex flex-col items-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <BookOpen className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="text-lg font-medium text-gray-500">No quizzes found</p>
                            <p className="text-sm">Create one to get started!</p>
                        </div>
                    ) : (
                        quizzes.map((quiz) => (
                            <div key={quiz.id} className="group bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-xl hover:shadow-gray-200/50 hover:border-primary/20 transition-all duration-300 relative flex flex-col">
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                    <button
                                        onClick={() => handleDeleteClick(quiz.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                        title="Delete Quiz"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3.5 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl text-primary group-hover:scale-110 transition-transform duration-300">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-1">{quiz.title}</h3>

                                <div className="flex items-center gap-2 mb-4 min-h-[24px]">
                                    {isExpired(quiz.deadline) ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-100">
                                            <AlertTriangle className="w-3 h-3" /> Expired
                                        </span>
                                    ) : quiz.deadline ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-600 border border-green-100">
                                            <Clock className="w-3 h-3" /> Active
                                        </span>
                                    ) : null}
                                </div>

                                <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 mt-auto">
                                    <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg">
                                        <FileText className="w-4 h-4" />
                                        <span className="font-medium">{quiz.questions_count} Qs</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg">
                                        <Clock className="w-4 h-4" />
                                        <span className="font-medium">{quiz.duration_minutes}m</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
                                    <button
                                        onClick={() => setSelectedQuiz(quiz)}
                                        className="py-2.5 px-4 rounded-xl text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
                                    >
                                        Details
                                    </button>
                                    <button
                                        onClick={() => handleShowAnalytics(quiz.id)}
                                        disabled={analyticsLoadingId === quiz.id}
                                        className="py-2.5 px-4 rounded-xl text-sm font-bold text-primary bg-primary/5 hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {analyticsLoadingId === quiz.id ? (
                                            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        ) : (
                                            'Analytics'
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Quiz?</h3>
                        <p className="text-gray-500 text-center mb-6">
                            Are you sure you want to delete this quiz? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/25"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Analytics Modal */}
            {showAnalytics && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Quiz Analytics</h2>
                            <button onClick={() => setShowAnalytics(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            {analyticsData.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <p>No attempts recorded yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {analyticsData.map((data, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div>
                                                <p className="font-bold text-gray-900">{data.student_name}</p>
                                                <p className="text-xs text-gray-500 font-medium mt-1">{new Date(data.timestamp).toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`inline-block px-3 py-1 rounded-lg text-sm font-bold ${(data.score / data.total) >= 0.7
                                                    ? 'bg-green-100 text-green-700'
                                                    : (data.score / data.total) >= 0.4
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {data.score} / {data.total}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {selectedQuiz && (
                <QuizDetailsModal quiz={selectedQuiz} onClose={() => setSelectedQuiz(null)} />
            )}

            {showCreator && <QuizCreator onClose={() => setShowCreator(false)} onSuccess={fetchQuizzes} />}
        </div>
    );
};

export default QuizManagement;
