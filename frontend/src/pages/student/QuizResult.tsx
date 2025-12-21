import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import {
    CheckCircle, XCircle, Clock, Award, ArrowLeft,
    Layout, AlertTriangle, MousePointer
} from 'lucide-react';

interface QuestionReview {
    id: number;
    text: string;
    options: {
        id: number;
        text: string;
        is_correct: boolean;
    }[];
    selected_option_id: number | null;
    correct_option_id: number | null;
    is_correct: boolean;
}

interface QuizResultData {
    quiz_title: string;
    score: number;
    total_questions: number;
    percentage: number;
    correct_count: number;
    wrong_count: number;
    unattempted_count: number;
    time_taken: string;
    tab_switch_count: number;
    submission_type: string;
    questions: QuestionReview[];
}

const QuizResult = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const [result, setResult] = useState<QuizResultData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchResult = async () => {
            try {
                const res = await axios.get(`/api/quiz/${quizId}/result`);
                setResult(res.data);
            } catch (err) {
                console.error("Failed to fetch result:", err);
                setError("Failed to load quiz results. It might not be evaluated yet.");
            } finally {
                setLoading(false);
            }
        };

        fetchResult();
    }, [quizId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !result) {
        return (
            <div className="max-w-2xl mx-auto mt-10 p-6 bg-red-50 rounded-2xl border border-red-100 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-red-700 mb-2">Error Loading Results</h2>
                <p className="text-red-600 mb-6">{error || "Result not found"}</p>
                <button
                    onClick={() => navigate('/dashboard/student-quizzes')}
                    className="px-6 py-2 bg-white text-red-600 font-bold rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
                >
                    Back to Quizzes
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Summary Card */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-purple-500" />

                <div className="p-8 md:p-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                        <div>
                            <button
                                onClick={() => navigate('/dashboard/student-quizzes')}
                                className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors mb-4 font-medium text-sm"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Quizzes
                            </button>
                            <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                                {result.quiz_title} <span className="text-primary">Results</span>
                            </h1>
                            <p className="text-gray-500 mt-2">Here's how you performed on this assessment.</p>
                        </div>

                        <div className={`
                            px-6 py-3 rounded-2xl text-xl font-bold flex items-center gap-3 border shadow-sm
                            ${result.percentage >= 70 ? 'bg-green-50 text-green-700 border-green-100' :
                                result.percentage >= 40 ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                    'bg-red-50 text-red-700 border-red-100'}
                        `}>
                            <Award className="w-6 h-6" />
                            {result.percentage}% Score
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center hover:bg-white hover:shadow-md transition-all">
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total Score</p>
                            <p className="text-2xl font-black text-gray-800">{result.score} <span className="text-gray-400 text-base font-medium">/ {result.total_questions}</span></p>
                        </div>
                        <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100 text-center hover:bg-green-50 transition-all">
                            <p className="text-green-600/70 text-xs font-bold uppercase tracking-wider mb-1">Correct</p>
                            <p className="text-2xl font-black text-green-700">{result.correct_count}</p>
                        </div>
                        <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100 text-center hover:bg-red-50 transition-all">
                            <p className="text-red-600/70 text-xs font-bold uppercase tracking-wider mb-1">Incorrect</p>
                            <p className="text-2xl font-black text-red-700">{result.wrong_count}</p>
                        </div>
                        <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 text-center hover:bg-orange-50 transition-all">
                            <p className="text-orange-600/70 text-xs font-bold uppercase tracking-wider mb-1">Unattempted</p>
                            <p className="text-2xl font-black text-orange-700">{result.unattempted_count}</p>
                        </div>
                        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-center hover:bg-blue-50 transition-all">
                            <p className="text-blue-600/70 text-xs font-bold uppercase tracking-wider mb-1">Time Taken</p>
                            <p className="text-2xl font-black text-blue-700 flex justify-center items-center gap-2">
                                <Clock className="w-5 h-5 opacity-50" />
                                {result.time_taken}
                            </p>
                        </div>
                    </div>

                    {/* Meta Stats */}
                    <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-500 font-medium">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                            <Layout className="w-4 h-4" />
                            Tab Switches: <span className={result.tab_switch_count > 0 ? "text-red-500 font-bold" : "text-gray-700"}>{result.tab_switch_count}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                            <MousePointer className="w-4 h-4" />
                            Submission: <span className="text-gray-700 capitalize">{result.submission_type}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Review */}
            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-6 px-2">Detailed Question Review</h2>
                <div className="space-y-6">
                    {result.questions.map((q, index) => (
                        <div key={q.id} className={`
                            ${q.is_correct ? 'border-gray-100 shadow-sm' :
                                q.selected_option_id ? 'border-red-100 shadow-sm shadow-red-100/20' : 'border-gray-200 border-dashed'}
                        `}>
                            {/* Question Status Stripe */}
                            <div className={`absolute top-0 left-0 w-1.5 h-full ${q.is_correct ? 'bg-green-500' :
                                q.selected_option_id ? 'bg-red-500' : 'bg-gray-300'}`} />

                            <div className="flex gap-4 mb-6">
                                <span className={`
                                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                    ${q.is_correct ? 'bg-green-100 text-green-700' :
                                        q.selected_option_id ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}
                                `}>
                                    {index + 1}
                                </span>
                                <h3 className="text-lg font-medium text-gray-800 leading-relaxed pt-0.5">{q.text}</h3>
                            </div>

                            <div className="space-y-3 pl-0 md:pl-12">
                                {q.options.map((opt) => {
                                    const isSelected = q.selected_option_id === opt.id;
                                    const isCorrect = opt.is_correct; // Only revealed in result

                                    let optionClass = "border-gray-100 hover:bg-gray-50";
                                    let icon = null;

                                    if (isSelected && isCorrect) {
                                        optionClass = "bg-green-50 border-green-200 text-green-800 ring-1 ring-green-200";
                                        icon = <CheckCircle className="w-5 h-5 text-green-600" />;
                                    } else if (isSelected && !isCorrect) {
                                        optionClass = "bg-red-50 border-red-200 text-red-800 ring-1 ring-red-200";
                                        icon = <XCircle className="w-5 h-5 text-red-600" />;
                                    } else if (!isSelected && isCorrect) {
                                        optionClass = "bg-green-50/50 border-green-100 text-green-800 border-dashed";
                                        icon = <CheckCircle className="w-5 h-5 text-green-600 opacity-50" />;
                                    }

                                    return (
                                        <div key={opt.id} className={`
                                            w-full p-4 rounded-xl border flex items-center justify-between gap-4 transition-all
                                            ${optionClass}
                                        `}>
                                            <span className="font-medium">{opt.text}</span>
                                            {icon}
                                        </div>
                                    );
                                })}
                            </div>

                            {!q.selected_option_id && (
                                <div className="mt-4 pl-12">
                                    <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded">Not Attempted</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default QuizResult;
