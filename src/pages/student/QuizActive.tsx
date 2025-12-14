import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { Clock, AlertTriangle } from 'lucide-react';

interface Question {
    id: number;
    text: string;
    options: { id: number; text: string }[];
}

interface Quiz {
    id: number;
    title: string;
    description: string;
    duration_minutes: number;
    questions: Question[];
}

const QuizActive = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Fetch Quiz Details
    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const response = await axios.get(`/api/quiz/${id}`);
                setQuiz(response.data);
                setTimeLeft(response.data.duration_minutes * 60);
            } catch (error: any) {
                console.error("Error fetching quiz", error);
                if (error.response?.status === 400 || error.response?.status === 404) {
                    alert(error.response.data.detail);
                    navigate('/dashboard/quizzes'); // Redirect if already attempted or not found
                }
            } finally {
                setLoading(false);
            }
        };
        fetchQuiz();
    }, [id, navigate]);

    // Timer Logic
    useEffect(() => {
        if (loading || timeLeft === 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    submitQuiz(true); // Auto-submit
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
        // We only want to set up the timer once when loading finishes and time is set.
        // We exclude timeLeft from dependencies so the interval persists.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    // Format Time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleOptionSelect = (questionId: number, optionId: number) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    };

    const handleSubmitClick = () => {
        setShowConfirm(true);
    };

    const confirmSubmit = async () => {
        setShowConfirm(false);
        await submitQuiz(false);
    };

    const submitQuiz = useCallback(async (auto = false) => {
        if (submitting) return;
        setSubmitting(true);

        try {
            const formattedAnswers = Object.entries(answers).map(([qId, oId]) => ({
                question_id: parseInt(qId),
                selected_option_id: oId
            }));

            // Send payload matching QuizSubmission schema: { answers: [...] }
            await axios.post(`/api/quiz/${id}/submit`, { answers: formattedAnswers });

            // Replaced alert with simple navigation. Ideally show a success toast but navigation is fast enough.
            navigate('/dashboard/student-quizzes');
        } catch (error: any) {
            console.error("Submission failed", error);
            const msg = error.response?.data?.detail || "Failed to submit quiz. Please try again.";
            // Keep alert for error only as fallback, or simpler handling
            alert(msg);
            // If already attempted, force redirect
            if (error.response?.status === 400) {
                navigate('/dashboard/student-quizzes');
            }
            setSubmitting(false);
        }
    }, [answers, id, navigate, submitting]);


    if (loading) return <div className="p-12 text-center text-gray-500">Loading quiz...</div>;
    if (!quiz) return <div className="p-12 text-center text-red-500">Quiz not found</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6 relative">
            {/* Header */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-light/20 flex justify-between items-center sticky top-4 z-10">
                <div>
                    <h1 className="text-2xl font-bold text-primary-dark">{quiz.title}</h1>
                    <p className="text-secondary">Answer all questions before time runs out</p>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-lg font-bold ${timeLeft < 60 ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary'
                    }`}>
                    <Clock className="w-5 h-5" />
                    {formatTime(timeLeft)}
                </div>
            </div>

            {/* Questions List */}
            <div className="space-y-6 pb-20">
                {quiz.questions.map((q, idx) => (
                    <div key={q.id} className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-light/20">
                        <div className="flex gap-4">
                            <span className="flex-shrink-0 w-8 h-8 bg-secondary-light/20 rounded-full flex items-center justify-center font-bold text-secondary">
                                {idx + 1}
                            </span>
                            <div className="flex-1 space-y-4">
                                <h3 className="text-lg font-medium text-primary-dark">{q.text}</h3>
                                <div className="space-y-3">
                                    {q.options.map((opt) => (
                                        <label
                                            key={opt.id}
                                            className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${answers[q.id] === opt.id
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-transparent bg-secondary-light/10 hover:bg-secondary-light/20'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name={`question-${q.id}`}
                                                className="w-4 h-4 text-primary focus:ring-primary"
                                                checked={answers[q.id] === opt.id}
                                                onChange={() => handleOptionSelect(q.id, opt.id)}
                                            />
                                            <span className={answers[q.id] === opt.id ? 'text-primary font-medium' : 'text-secondary'}>
                                                {opt.text}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-secondary-light/20 md:pl-64">
                <div className="max-w-3xl mx-auto flex justify-end">
                    <button
                        onClick={handleSubmitClick}
                        disabled={submitting}
                        className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {submitting ? 'Submitting...' : 'Submit Quiz'}
                    </button>
                </div>
            </div>

            {/* Custom Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl transform transition-all scale-100">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Submit Quiz?</h3>
                                <p className="text-gray-500 mt-2">
                                    Are you sure you want to finish? You cannot undo this action once submitted.
                                </p>
                            </div>
                            <div className="flex gap-3 w-full mt-4">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmSubmit}
                                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
                                >
                                    Submit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizActive;
