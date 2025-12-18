import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Clock, Trash2, X, AlertTriangle, Calendar, BookOpen, RefreshCw, BarChart2, User } from 'lucide-react';

import axios from '../../api/axios';
import QuizCreator from '../../components/QuizCreator';
import Toast, { type ToastType } from '../../components/Toast';

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
    const [view, setView] = useState<'summary' | 'detailed'>('summary');
    const [attempts, setAttempts] = useState<any[]>([]);
    const [loadingAttempts, setLoadingAttempts] = useState(false);

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

    const handleViewDetails = async () => {
        setView('detailed');
        if (attempts.length === 0) {
            setLoadingAttempts(true);
            try {
                const res = await axios.get(`/api/quiz/${quiz.id}/analytics`);
                setAttempts(res.data);
            } catch (error) {
                console.error("Failed to fetch student attempts", error);
            } finally {
                setLoadingAttempts(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl p-8 relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 flex flex-col">
                <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors z-10">
                    <X className="w-6 h-6 text-gray-400" />
                </button>

                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3 flex-shrink-0">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                        <BarChart2 className="w-6 h-6" />
                    </div>
                    {view === 'summary' ? (
                        <>Quiz Analytics: <span className="text-primary">{quiz.title}</span></>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setView('summary')} className="text-gray-400 hover:text-gray-600 transition-colors mr-2">
                                <span className="text-sm font-medium">← Back</span>
                            </button>
                            Student Performance Details
                        </div>
                    )}
                </h2>

                {loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="animate-spin w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"></div>
                    </div>
                ) : view === 'summary' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                                <p className="text-green-600 font-medium mb-1">Avg Accuracy</p>
                                <p className="text-3xl font-bold text-green-700">
                                    {Math.round(heatmap.reduce((acc, q) => acc + q.accuracy, 0) / (heatmap.length || 1))}%
                                </p>
                            </div>
                            <button
                                onClick={handleViewDetails}
                                className="group bg-blue-50 p-6 rounded-2xl border border-blue-100 text-left hover:shadow-lg hover:shadow-blue-100/50 hover:bg-blue-100/50 transition-all cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400">
                                    <BarChart2 className="w-5 h-5" />
                                </div>
                                <p className="text-blue-600 font-medium mb-1 group-hover:text-blue-700 transition-colors flex items-center gap-2">
                                    Total Attempts
                                    <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">View Details</span>
                                </p>
                                <p className="text-3xl font-bold text-blue-700 group-hover:scale-105 origin-left transition-transform">
                                    {heatmap.length > 0 ? heatmap[0].total : 0}
                                </p>
                            </button>
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
                ) : (
                    <div className="flex-1 overflow-auto animate-in fade-in slide-in-from-right-8 duration-300">
                        {loadingAttempts ? (
                            <div className="py-20 flex justify-center">
                                <div className="animate-spin w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full"></div>
                            </div>
                        ) : attempts.length === 0 ? (
                            <div className="text-center py-20 text-gray-400">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <User className="w-8 h-8 opacity-20" />
                                </div>
                                <p>No attempts recorded yet.</p>
                            </div>
                        ) : (
                            <div className="overflow-hidden bg-white border border-gray-100 rounded-2xl">
                                <table className="w-full">
                                    <thead className="bg-gray-50/50 text-left">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Score</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Submitted</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {attempts.map((attempt) => {
                                            // Safety Check: Skip invalid rows
                                            if (!attempt.submitted_at ||
                                                attempt.submitted_at === '1970-01-01T00:00:00' ||
                                                attempt.attempted_count === 0 && attempt.score === 0) {
                                                return null;
                                            }
                                            return (
                                                <tr key={attempt.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-gray-800">{attempt.student_name}</p>
                                                        <p className="text-xs text-gray-400">{attempt.student_email}</p>
                                                        {attempt.warnings_count > 0 && (
                                                            <div className="mt-1 flex items-center gap-1 text-xs text-orange-600 bg-orange-50 w-fit px-2 py-0.5 rounded-full border border-orange-100">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                {attempt.warnings_count} Tab Switch{attempt.warnings_count > 1 ? 'es' : ''}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative w-10 h-10 flex items-center justify-center">
                                                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                                                    <path className="text-gray-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                                                    <path className={`${(attempt.score / (quiz.questions_count || 1)) >= 0.7 ? 'text-green-500' :
                                                                        (attempt.score / (quiz.questions_count || 1)) >= 0.4 ? 'text-yellow-500' : 'text-red-500'
                                                                        }`} strokeDasharray={`${(attempt.score / (quiz.questions_count || 1)) * 100}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                                                </svg>
                                                                <span className="absolute text-xs font-bold text-gray-700">
                                                                    {Math.round((attempt.score / (quiz.questions_count || 1)) * 100)}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 space-y-1">
                                                        <div className="flex justify-between max-w-[140px]">
                                                            <span className="text-xs uppercase tracking-wide text-gray-400">Correct:</span>
                                                            <span className="font-bold text-green-600">{attempt.score}</span>
                                                        </div>
                                                        <div className="flex justify-between max-w-[140px]">
                                                            <span className="text-xs uppercase tracking-wide text-gray-400">Attempted:</span>
                                                            <span className="font-bold text-gray-700">{attempt.attempted_count}</span>
                                                        </div>
                                                        <div className="flex justify-between max-w-[140px]">
                                                            <span className="text-xs uppercase tracking-wide text-gray-400">Type:</span>
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${attempt.submission_type === 'auto_timeout'
                                                                ? 'bg-red-100 text-red-600 border border-red-200'
                                                                : 'bg-blue-50 text-blue-600 border border-blue-100'
                                                                }`}>
                                                                {attempt.submission_type === 'auto_timeout' ? 'Auto-Submit' : 'Manual'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <p className="font-medium text-gray-800 text-sm">
                                                            {new Date(attempt.submitted_at).toLocaleDateString()}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {new Date(attempt.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        {attempt.time_taken && attempt.time_taken !== '—' ? (
                                                            <p className="text-xs text-gray-600 mt-1 flex items-center justify-end gap-1 font-medium bg-gray-100 px-2 py-0.5 rounded-lg w-fit ml-auto">
                                                                <Clock className="w-3 h-3" /> {attempt.time_taken}
                                                            </p>
                                                        ) : (
                                                            <p className="text-xs text-gray-300 mt-1">—</p>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};



const QuizManagement = () => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showCreator, setShowCreator] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [quizToDelete, setQuizToDelete] = useState<number | null>(null);
    const [selectedAnalyticsQuiz, setSelectedAnalyticsQuiz] = useState<Quiz | null>(null);

    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const isExpired = (deadline?: string) => {
        if (!deadline) return false;
        return new Date() > new Date(deadline);
    };

    const fetchQuizzes = async (bg = false) => {
        if (!bg && quizzes.length === 0) setLoading(true);
        else setIsRefreshing(true);

        try {
            const res = await axios.get('/api/quiz/');
            setQuizzes(res.data);
        } catch (error) {
            console.error("Failed to fetch quizzes", error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
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

        // Optimistic UI Update
        const previousQuizzes = [...quizzes];
        const idToDelete = quizToDelete; // Capture ID

        // Immediately update UI
        setQuizzes(quizzes.filter(q => q.id !== idToDelete));
        setShowDeleteModal(false);
        setQuizToDelete(null);

        try {
            await axios.delete(`/api/quiz/${idToDelete}`);
            // Success
            setToast({ message: "Quiz deleted successfully", type: "success" });
        } catch (error) {
            console.error("Failed to delete quiz", error);
            // Revert on failure
            setQuizzes(previousQuizzes);
            setToast({ message: "Failed to delete quiz. Please try again", type: "error" });
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
                        onClick={() => fetchQuizzes(true)}
                        disabled={loading || isRefreshing}
                        className="p-3.5 rounded-2xl bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                        title="Refresh list"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
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
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/25"
                            >
                                Delete
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

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div >
    );
};

export default QuizManagement;
