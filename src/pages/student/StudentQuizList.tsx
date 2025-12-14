import { useState, useEffect } from 'react';
import { FileText, Clock, Play, CheckCircle, Info, Calendar, X } from 'lucide-react';
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-secondary-light/10 rounded-full transition-colors">
                    <X className="w-5 h-5 text-secondary" />
                </button>

                <h2 className="text-xl font-bold text-secondary-dark mb-4 pr-10">{quiz.title}</h2>
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-secondary font-medium uppercase tracking-wide">Published On</p>
                            <p className="text-secondary-dark font-medium">{new Date(quiz.created_at).toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-secondary font-medium uppercase tracking-wide">Deadline</p>
                            <p className="text-secondary-dark font-medium">
                                {quiz.deadline ? new Date(quiz.deadline).toLocaleString() : 'No Deadline'}
                            </p>
                        </div>
                    </div>

                    <div className="p-4 bg-secondary-light/5 rounded-xl text-sm text-secondary">
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
    const navigate = useNavigate();

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async () => {
        try {
            const res = await axios.get('/api/quiz/');
            const quizzesData = res.data;

            // Fetch status for each quiz
            const quizzesWithStatus = await Promise.all(quizzesData.map(async (q: any) => {
                try {
                    const statusRes = await axios.get(`/api/quiz/${q.id}/status`);
                    return { ...q, ...statusRes.data }; // Merges status and score
                } catch (e) {
                    return { ...q, status: 'not_started' };
                }
            }));

            // Sort: Unattempted first, then by date (newest first)
            quizzesWithStatus.sort((a: any, b: any) => {
                const aAttempted = a.status === 'attempted';
                const bAttempted = b.status === 'attempted';

                if (aAttempted !== bAttempted) {
                    return aAttempted ? 1 : -1; // Unattempted first
                }

                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            setQuizzes(quizzesWithStatus);
        } catch (error) {
            console.error('Failed to fetch quizzes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartQuiz = (quizId: number) => {
        navigate(`/student/quiz/${quizId}`);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-secondary-dark">Available Quizzes</h1>
                <p className="text-secondary">Test your knowledge with these assessments.</p>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-400">Loading quizzes...</div>
            ) : quizzes.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No quizzes available at the moment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quizzes.map((quiz) => (
                        <div key={quiz.id} className="bg-white rounded-2xl border border-secondary-light/10 p-6 hover:shadow-lg transition-all duration-300 relative group">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-xl ${quiz.status === 'attempted' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                                    {quiz.status === 'attempted' ? <CheckCircle className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                                </div>
                                {quiz.status === 'attempted' && (
                                    <span className="px-3 py-1 bg-success/10 text-success text-sm font-bold rounded-full">
                                        Score: {Math.round(((quiz.score || 0) / quiz.questions_count) * 100)}%
                                    </span>
                                )}
                            </div>

                            <h3 className="text-xl font-bold text-secondary-dark mb-2 group-hover:text-primary transition-colors">{quiz.title}</h3>
                            <p className="text-secondary text-sm mb-6 line-clamp-2">{quiz.description}</p>

                            <div className="flex items-center gap-4 text-sm text-secondary mb-6">
                                <div className="flex items-center gap-1.5">
                                    <FileText className="w-4 h-4" />
                                    <span>{quiz.questions_count} Questions</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4" />
                                    <span>{quiz.duration_minutes} Mins</span>
                                </div>
                            </div>



                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectedQuiz(quiz)}
                                    className="p-3 rounded-xl border-2 border-secondary-light/10 text-secondary hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-colors"
                                    title="View Details"
                                >
                                    <Info className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleStartQuiz(quiz.id)}
                                    disabled={quiz.status === 'attempted' || quiz.status === 'expired'}
                                    className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${quiz.status === 'attempted' || quiz.status === 'expired'
                                        ? 'bg-secondary-light/10 text-secondary cursor-not-allowed'
                                        : 'bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/25'
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
                                            <Play className="w-5 h-5 fill-current" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedQuiz && (
                <QuizDetailsModal quiz={selectedQuiz} onClose={() => setSelectedQuiz(null)} />
            )}
        </div>
    );
};

export default StudentQuizList;
