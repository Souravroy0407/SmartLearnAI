import { useState, useEffect } from 'react';
import { X, BarChart2, User, Calendar } from 'lucide-react';
import axios from '../api/axios';

interface StudentResult {
    student_name: string;
    score: number;
    date: string;
}

interface AnalyticsData {
    title: string;
    total_attempts: number;
    average_score: number;
    student_results: StudentResult[];
}

interface QuizAnalyticsProps {
    quizId: number;
    onClose: () => void;
}

const QuizAnalytics = ({ quizId, onClose }: QuizAnalyticsProps) => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const response = await axios.get(`/api/quiz/${quizId}/analytics`);
                setData(response.data);
            } catch (error) {
                console.error("Failed to fetch analytics", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [quizId]);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-light-gray flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-bold text-dark-blue flex items-center gap-2">
                        <BarChart2 className="w-6 h-6 text-primary" />
                        Quiz Analytics
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-light-gray rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-12 text-gray-400">Loading stats...</div>
                    ) : data ? (
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-2xl font-bold text-secondary-dark">{data.title}</h3>
                                <p className="text-secondary text-sm">Performance Overview</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                                    <p className="text-secondary text-sm font-medium mb-1">Total Attempts</p>
                                    <p className="text-3xl font-bold text-primary">{data.total_attempts}</p>
                                </div>
                                <div className="bg-warning/5 p-4 rounded-2xl border border-warning/10">
                                    <p className="text-secondary text-sm font-medium mb-1">Average Score</p>
                                    <p className="text-3xl font-bold text-warning">{data.average_score}%</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-secondary-dark mb-4 flex items-center gap-2">
                                    <User className="w-5 h-5" /> Student Results
                                </h4>
                                <div className="space-y-3">
                                    {data.student_results.length === 0 ? (
                                        <p className="text-gray-400 text-sm italic">No attempts yet.</p>
                                    ) : (
                                        data.student_results.map((result, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 text-xs">
                                                        {result.student_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-secondary-dark">{result.student_name}</p>
                                                        <p className="text-xs text-gray-400 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(result.date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={`font-bold text-lg ${result.score >= 80 ? 'text-green-500' : result.score >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                                                    {result.score}%
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-red-400">Failed to load data</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuizAnalytics;
