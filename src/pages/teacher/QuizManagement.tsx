import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Clock, Trash2, X, AlertTriangle, Calendar, BookOpen, RefreshCw, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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

interface AnalyticsModalProps {
    quiz: Quiz;
    onClose: () => void;
}

const AnalyticsModal = ({ quiz, onClose }: AnalyticsModalProps) => {
    const [heatmap, setHeatmap] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await axios.get(`/api/quiz/${quiz.id}/analytics/heatmap`);
                setHeatmap(res.data);
            } catch (error) {
                console.error("Failed to fetch analytics", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [quiz.id]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl p-8 relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors z-10">
                    <X className="w-6 h-6 text-gray-400" />
                </button>

                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                        <BarChart2 className="w-6 h-6" />
                    </div>
                    Quiz Analytics: <span className="text-primary">{quiz.title}</span>
                </h2>

                {loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="animate-spin w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"></div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                                <p className="text-green-600 font-medium mb-1">Avg Accuracy</p>
                                <p className="text-3xl font-bold text-green-700">
                                    {Math.round(heatmap.reduce((acc, q) => acc + q.accuracy, 0) / (heatmap.length || 1))}%
                                </p>
                            </div>
                            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                                <p className="text-blue-600 font-medium mb-1">Total Attempts</p>
                                <p className="text-3xl font-bold text-blue-700">
                                    {heatmap.length > 0 ? heatmap[0].total : 0}
                                </p>
                            </div>
                        </div>

                        {/* Question Heatmap */}
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Question Performance Heatmap</h3>
                            <div className="space-y-4">
                                {heatmap.map((q, idx) => (
                                    <div key={q.question_id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex gap-3">
                                                <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <p className="font-medium text-gray-800 line-clamp-2 w-full max-w-xl">{q.text}</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-lg text-sm font-bold flex-shrink-0 ml-2 ${q.accuracy >= 70 ? 'bg-green-100 text-green-700' :
                                                q.accuracy >= 40 ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {Math.round(q.accuracy)}% Correct
                                            </span>
                                        </div>
                                        {/* Progress Bar */}
                                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${q.accuracy >= 70 ? 'bg-green-500' :
                                                    q.accuracy >= 40 ? 'bg-yellow-500' :
                                                        'bg-red-500'
                                                    }`}
                                                style={{ width: `${q.accuracy}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between mt-1 text-xs text-gray-500 font-medium">
                                            <span>{q.correct} correct</span>
                                            <span>{q.incorrect} incorrect</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};



const QuizManagement = () => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreator, setShowCreator] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [quizToDelete, setQuizToDelete] = useState<number | null>(null);
    const [selectedAnalyticsQuiz, setSelectedAnalyticsQuiz] = useState<Quiz | null>(null);

    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);

    const isExpired = (deadline?: string) => {
        if (!deadline) return false;
        return new Date() > new Date(deadline);
    };

    const fetchQuizzes = async () => {
        setLoading(true);
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
                    <button
                        onClick={fetchQuizzes}
                        disabled={loading}
                        className="p-3.5 rounded-2xl bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                        title="Refresh list"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
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
                                        onClick={() => setSelectedAnalyticsQuiz(quiz)}
                                        className="py-2.5 px-4 rounded-xl text-sm font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <BarChart2 className="w-4 h-4" />
                                        Analysis
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
            )
            }



            {/* Details Modal */}
            {
                selectedQuiz && (
                    <QuizDetailsModal quiz={selectedQuiz} onClose={() => setSelectedQuiz(null)} />
                )
            }

            {selectedAnalyticsQuiz && (
                <AnalyticsModal
                    quiz={selectedAnalyticsQuiz}
                    onClose={() => setSelectedAnalyticsQuiz(null)}
                />
            )}

            {showCreator && <QuizCreator onClose={() => setShowCreator(false)} onSuccess={fetchQuizzes} />}
        </div >
    );
};

export default QuizManagement;
