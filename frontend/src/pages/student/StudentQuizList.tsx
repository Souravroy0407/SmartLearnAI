import { useState, useEffect, useRef, useMemo } from 'react';
import { FileText, Clock, Play, CheckCircle, Info, Calendar, X, Search, BookOpen, AlertTriangle, RefreshCw, BarChart2, Filter, ChevronDown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuiz, type Quiz } from '../../context/QuizContext';
import { formatDateTime } from '../../utils/date';

interface QuizDetailsModalProps {
    quiz: Quiz;
    onClose: () => void;
}

type FilterType = 'all' | 'expired' | 'unattempted' | 'attempted';

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
                            <p className="text-gray-800 font-medium text-sm">{formatDateTime(quiz.created_at)}</p>
                        </div>
                    </div>

                    <div className={`flex items-center gap-4 p-3 rounded-2xl border ${quiz.deadline ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                        <div className={`p-2 bg-white rounded-xl shadow-sm ${quiz.deadline ? 'text-red-500' : 'text-gray-400'}`}>
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-wider ${quiz.deadline ? 'text-red-500/70' : 'text-gray-500'}`}>Deadline</p>
                            <p className={`font-medium text-sm ${quiz.deadline ? 'text-red-700' : 'text-gray-800'}`}>
                                {quiz.deadline ? formatDateTime(quiz.deadline) : 'No Deadline'}
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
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Close filter dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Memoized Filter & Sort Logic
    const filteredQuizzes = useMemo(() => {
        let result = [...quizzes];

        // 1. Text Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(q =>
                q.title.toLowerCase().includes(query) ||
                q.description.toLowerCase().includes(query)
            );
        }

        // 2. Filter Type Logic
        switch (filterType) {
            case 'expired':
                // Show ONLY expired quizzes
                result = result.filter(q => q.is_expired);
                // Sort by newest expired first (using deadline)
                result.sort((a, b) => new Date(b.deadline || 0).getTime() - new Date(a.deadline || 0).getTime());
                break;

            case 'unattempted':
                // Show quizzes where: status = active AND (attempted === false OR attempt_count === 0)
                // Note: is_expired handles the "expired" check, so "active" here implies !is_expired
                result = result.filter(q => !q.is_expired && q.status !== 'attempted');
                // Sort by most recent first
                result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                break;

            case 'attempted':
                // Show quizzes already attempted
                result = result.filter(q => q.status === 'attempted');
                // Sort by most recent attempt date (using created_at as proxy if attempt date missing, or updated_at if available)
                result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                break;

            case 'all':
            default:
                // Sorting priority:
                // a) Recent & Unattempted (active) (highest priority)
                // b) Recent & Attempted
                // c) Expired quizzes (last)
                result.sort((a, b) => {
                    const getPriority = (q: Quiz) => {
                        if (q.is_expired) return 1; // Lowest priority
                        if (q.status === 'attempted') return 2;
                        return 3; // Highest priority (Active & Unattempted)
                    };

                    const pA = getPriority(a);
                    const pB = getPriority(b);

                    if (pA !== pB) return pB - pA; // Higher priority first

                    // Secondary sort: Recency
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                });
                break;
        }

        return result;
    }, [quizzes, searchQuery, filterType]);

    // Progress Stats (Memoized)
    const stats = useMemo(() => {
        const activeQuizzes = quizzes.filter(q => !q.is_expired);
        const totalActive = activeQuizzes.length;
        const completedActive = activeQuizzes.filter(q => q.status === 'attempted').length;
        const percentage = totalActive > 0 ? (completedActive / totalActive) * 100 : 0;

        return {
            total: totalActive,
            completed: completedActive,
            percentage: percentage,
            label: totalActive === 0 ? "No active quizzes" : `${completedActive} / ${totalActive} Completed`
        };
    }, [quizzes]);

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
                            {stats.label}
                        </span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${stats.percentage}%` }}
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

                    {/* Filter Dropdown */}
                    <div className="relative" ref={filterRef}>
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`
                                flex items-center gap-2 px-4 py-3.5 rounded-2xl border transition-all active:scale-95
                                ${isFilterOpen || filterType !== 'all'
                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                    : 'bg-white border-gray-200 text-gray-700 hover:text-primary hover:border-primary hover:bg-primary/5'}
                            `}
                        >
                            <Filter className="w-5 h-5" />
                            <span className="font-medium">Filter</span>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isFilterOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-2 space-y-1">
                                    {(['all', 'expired', 'unattempted', 'attempted'] as const).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => {
                                                setFilterType(type);
                                                setIsFilterOpen(false);
                                            }}
                                            className={`
                                                w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                                                ${filterType === type
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                                            `}
                                        >
                                            <div className="flex items-center gap-2">
                                                {type === 'all' && <BookOpen className="w-4 h-4 opacity-70" />}
                                                {type === 'expired' && <AlertTriangle className="w-4 h-4 opacity-70" />}
                                                {type === 'unattempted' && <Play className="w-4 h-4 opacity-70" />}
                                                {type === 'attempted' && <CheckCircle className="w-4 h-4 opacity-70" />}

                                                <span className="capitalize">
                                                    {type === 'all' ? 'Show All' : `${type} Only`}
                                                </span>
                                            </div>
                                            {filterType === type && <Check className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
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
