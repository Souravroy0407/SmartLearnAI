import { useState, useEffect } from 'react';
import { FileText, Clock, Play, CheckCircle, Info, Calendar, X, Search, BookOpen, AlertTriangle } from 'lucide-react';
import axios from '../../api/axios';
import { useNavigate } from 'react-router-dom';

interface Quiz {
    id: number;
    title: string;
    description: string;
    duration_minutes: number;
    questions_count: number;
    status: 'active' | 'attempted' | 'expired';
    score?: number;
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

const StudentQuizList = () => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async () => {
        try {
            const res = await axios.get('/api/quiz/');
            // Backend now filters and returns status/score directly!
            const quizzesData = res.data;

            // Sort: Unattempted first, then by date (newest first)
            quizzesData.sort((a: any, b: any) => {
                const aAttempted = a.status === 'attempted';
                const bAttempted = b.status === 'attempted';

                if (aAttempted !== bAttempted) {
                    return aAttempted ? 1 : -1; // Unattempted first
                }

                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            setQuizzes(quizzesData);
        } catch (error) {
            console.error('Failed to fetch quizzes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartQuiz = (quizId: number) => {
        navigate(`/student/quiz/${quizId}`);
    };

    const filteredQuizzes = quizzes.filter(quiz =>
        quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quiz.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-gradient-to-r from-white to-gray-50/50 p-8 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Available Quizzes</h1>
                    <p className="text-gray-500 text-lg">Test your knowledge with these assessments.</p>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                    {loading ? (
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
                            <p className="text-sm">Check back later for new assessments!</p>
                        </div>
                    ) : (
                        filteredQuizzes.map((quiz) => (
                            <div key={quiz.id} className="group bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-xl hover:shadow-gray-200/50 hover:border-primary/20 transition-all duration-300 relative flex flex-col">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`p-3.5 rounded-2xl transition-transform duration-300 group-hover:scale-110 ${quiz.status === 'attempted' ? 'bg-green-100 text-green-600' :
                                        quiz.status === 'expired' ? 'bg-red-100 text-red-600' :
                                            'bg-gradient-to-br from-primary/10 to-primary/5 text-primary'
                                        }`}>
                                        {quiz.status === 'attempted' ? <CheckCircle className="w-6 h-6" /> :
                                            quiz.status === 'expired' ? <AlertTriangle className="w-6 h-6" /> :
                                                <FileText className="w-6 h-6" />}
                                    </div>
                                    {quiz.status === 'attempted' && (
                                        <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-lg border border-green-200">
                                            Score: {Math.round(((quiz.score || 0) / quiz.questions_count) * 100)}%
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-1 group-hover:text-primary transition-colors">{quiz.title}</h3>
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
                                        onClick={() => handleStartQuiz(quiz.id)}
                                        disabled={quiz.status === 'attempted' || quiz.status === 'expired'}
                                        className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 ${quiz.status === 'attempted' || quiz.status === 'expired'
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                            : 'bg-primary text-white hover:bg-primary-dark shadow-primary/25 hover:shadow-primary/40'
                                            }`}
                                    >
                                        {quiz.status === 'attempted' ? (
                                            <>
                                                <CheckCircle className="w-5 h-5" />
                                                Completed
                                            </>
                                        ) : quiz.status === 'expired' ? (
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
                        ))
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
