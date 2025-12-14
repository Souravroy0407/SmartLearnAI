import { useState, useEffect } from 'react';
import { FileText, Clock, Play, CheckCircle } from 'lucide-react';
import axios from '../../api/axios';
import { useNavigate } from 'react-router-dom';

interface Quiz {
    id: number;
    title: string;
    description: string;
    duration_minutes: number;
    questions_count: number;
    status: 'active' | 'attempted';
    score?: number;
}

const StudentQuizList = () => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
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
                        <div key={quiz.id} className="bg-white rounded-2xl border border-secondary-light/10 p-6 hover:shadow-lg transition-all duration-300">
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

                            <h3 className="text-xl font-bold text-secondary-dark mb-2">{quiz.title}</h3>
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

                            <button
                                onClick={() => quiz.status !== 'attempted' && handleStartQuiz(quiz.id)}
                                disabled={quiz.status === 'attempted'}
                                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${quiz.status === 'attempted'
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/20'
                                    }`}
                            >
                                {quiz.status === 'attempted' ? (
                                    <>Completed</>
                                ) : (
                                    <>
                                        Start Quiz <Play className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StudentQuizList;
