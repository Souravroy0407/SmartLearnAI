import { useState, useEffect } from 'react';
import { FileText, Clock, Play, CheckCircle, Info, Calendar, X, Search, BookOpen, AlertTriangle, RefreshCw, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuiz, type Quiz } from '../../context/QuizContext';

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
                        {quiz.description || "No description provided."}
                    </div>

                    <div className="flex gap-2">
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold uppercase rounded-lg">
                            {quiz.difficulty || "Medium"}
                        </span>
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold uppercase rounded-lg">
                            {quiz.topic || "General"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StudentQuizList = () => {
    const { quizzes, loading, fetchQuizzes } = useQuiz();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    // Sort quizzes: Unattempted first, then by date
    const sortedQuizzes = [...quizzes].sort((a, b) => {
        const aAttempted = a.status === 'attempted';
        const bAttempted = b.status === 'attempted';

        if (aAttempted !== bAttempted) {
            return aAttempted ? 1 : -1; // Unattempted first
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Progress Stats
    const totalQuizzes = quizzes.length;
    const completedQuizzes = quizzes.filter(q => q.status === 'attempted').length;
    const progressPercentage = totalQuizzes > 0 ? (completedQuizzes / totalQuizzes) * 100 : 0;

    useEffect(() => {
        fetchQuizzes();
    }, [fetchQuizzes]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchQuizzes(true);
        setIsRefreshing(false);
    };

    const handleStartQuiz = (quizId: number) => {
        navigate(`/student/quiz/${quizId}`);
    };

    const handleViewResult = (quizId: number) => {
        navigate(`/dashboard/student-quiz-result/${quizId}`);
    };

    const filteredQuizzes = sortedQuizzes.filter(quiz =>
        quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quiz.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Only show full page loader if we have no quizzes and it's loading
    // Using isRefreshing to keep list visible during manual refresh
    const showFullLoader = loading && quizzes.length === 0;

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-gradient-to-r from-white to-gray-50/50 p-8 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Available Quizzes</h1>
                    <p className="text-gray-500 text-lg">Test your knowledge with these assessments.</p>
                </div>

                {/* Progress Summary Card */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm min-w-[280px]">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-gray-700">Your Progress</span>
                        <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg">
                            {completedQuizzes} / {totalQuizzes} Completed
                        </span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Quiz List Container */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden min-h-[500px]">
                <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search quizzes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-gray-800 placeholder-gray-400 font-medium"
                        />
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={loading || isRefreshing}
                        className="p-3.5 rounded-2xl bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                        title="Refresh list"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                    {showFullLoader ? (
                        <div className="col-span-full py-20 text-center">
                            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-gray-400 font-medium">Loading quizzes...</p>
                        </div>
                    ) : filteredQuizzes.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-gray-400 flex flex-col items-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <BookOpen className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="text-lg font-medium text-gray-500">No quizzes found</p>
                            <p className="text-sm mb-6">Follow teachers to access their quizzes and content.</p>
                            <button
                                onClick={() => navigate('/dashboard/teachers')}
                                className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
                            >
                                Browse Teachers
                            </button>
                        </div>
                    ) : (
                        filteredQuizzes.map((quiz) => {
                            // STRICT PRIORITY LOGIC:
                            // 1. Expired (Overrides everything for status display)
                            // 2. Attempted (Completed)
                            // 3. Available (Active)
                            let uiStatus: 'EXPIRED' | 'COMPLETED' | 'AVAILABLE';
                            if (quiz.is_expired) {
                                uiStatus = 'EXPIRED';
                            } else if (quiz.status === 'attempted') {
                                uiStatus = 'COMPLETED';
                            } else {
                                uiStatus = 'AVAILABLE';
                            }

                            return (
                                <div key={quiz.id} className="group bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-xl hover:shadow-gray-200/50 hover:border-primary/20 transition-all duration-300 relative flex flex-col">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`
                                        flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider
                                        ${uiStatus === 'EXPIRED' ? 'bg-red-100 text-red-700' :
                                                uiStatus === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                    'bg-blue-50 text-blue-700'}
                                    `}>
                                            {uiStatus === 'EXPIRED' ? <AlertTriangle className="w-4 h-4" /> :
                                                uiStatus === 'COMPLETED' ? <CheckCircle className="w-4 h-4" /> :
                                                    <Play className="w-4 h-4 fill-current" />}
                                            {uiStatus === 'EXPIRED' ? 'Expired' : uiStatus === 'COMPLETED' ? 'Completed' : 'Active'}
                                        </div>

                                        {/* Difficulty Tag */}
                                        <span className={`
                                        px-2.5 py-1 rounded-lg text-xs font-bold border
                                        ${quiz.difficulty === 'Hard' ? 'bg-red-50 text-red-600 border-red-100' :
                                                quiz.difficulty === 'Easy' ? 'bg-green-50 text-green-600 border-green-100' :
                                                    'bg-orange-50 text-orange-600 border-orange-100'}
                                    `}>
                                            {quiz.difficulty || 'Medium'}
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-1 group-hover:text-primary transition-colors">{quiz.title}</h3>

                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <span className="text-xs font-medium px-2 py-0.5 bg-gray-50 text-gray-500 rounded border border-gray-100">
                                            {quiz.topic || "General"}
                                        </span>
                                    </div>

                                    <p className="text-gray-500 text-sm mb-6 line-clamp-2 h-10">{quiz.description}</p>

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

                                    <div className="grid grid-cols-[auto_1fr] gap-3 pt-4 border-t border-gray-50">
                                        <button
                                            onClick={() => setSelectedQuiz(quiz)}
                                            className="p-3 rounded-xl border border-gray-100 text-gray-400 hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-colors"
                                            title="View Details"
                                        >
                                            <Info className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (quiz.status === 'attempted') handleViewResult(quiz.id);
                                                else handleStartQuiz(quiz.id);
                                            }}
                                            disabled={uiStatus === 'EXPIRED' && quiz.status !== 'attempted'}
                                            className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 ${quiz.status === 'attempted'
                                                    ? 'bg-green-600 text-white shadow-green-200 hover:shadow-green-300 hover:bg-green-700'
                                                    : uiStatus === 'EXPIRED'
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                                        : 'bg-primary text-white hover:bg-primary-dark shadow-primary/25 hover:shadow-primary/40'
                                                }`}
                                        >
                                            {quiz.status === 'attempted' ? (
                                                <>
                                                    <BarChart2 className="w-5 h-5" />
                                                    View Result
                                                </>
                                            ) : uiStatus === 'EXPIRED' ? (
                                                <>
                                                    <Clock className="w-5 h-5" />
                                                    Expired
                                                </>
                                            ) : (
                                                <>
                                                    Start Quiz
                                                    <Play className="w-4 h-4 fill-current" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {selectedQuiz && (
                <QuizDetailsModal quiz={selectedQuiz} onClose={() => setSelectedQuiz(null)} />
            )}
        </div>
    );
};

export default StudentQuizList;
