import { useState, useEffect } from 'react';
import api from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, ChevronRight, Trophy, Timer, ArrowRight } from 'lucide-react';

const AdaptiveQuiz = () => {
    const [gameState, setGameState] = useState<'start' | 'quiz' | 'result'>('start');
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
    const [streak, setStreak] = useState(0);

    interface Question {
        id: number;
        question: string;
        options: string[];
        correct: string;
        difficulty: string;
    }
    const [questions, setQuestions] = useState<Question[]>([]);

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const response = await api.get('/api/quiz/start');
                setQuestions(response.data.questions);
            } catch (error) {
                console.error("Failed to load questions", error);
            }
        };
        fetchQuestions();
    }, []);

    const handleAnswer = (index: number) => {
        if (!questions.length) return;
        const selectedOption = questions[currentQuestion].options[index];
        const isCorrect = selectedOption === questions[currentQuestion].correct;

        if (isCorrect) {
            setScore(score + 10);
            setStreak(streak + 1);
            if (streak >= 1) setDifficulty('Hard');
        } else {
            setStreak(0);
            setDifficulty('Easy');
        }

        if (currentQuestion < questions.length - 1) {
            setTimeout(() => setCurrentQuestion(currentQuestion + 1), 500);
        } else {
            setTimeout(() => setGameState('result'), 500);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
                {gameState === 'start' && (
                    <motion.div
                        key="start"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white rounded-3xl shadow-sm border border-secondary-light/20 p-12 text-center"
                    >
                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
                            <BrainCircuit className="w-12 h-12 text-primary" />
                        </div>
                        <h1 className="text-4xl font-bold text-secondary-dark mb-4">Adaptive Quiz Mode</h1>
                        <p className="text-xl text-secondary mb-8 max-w-lg mx-auto">
                            Questions adjust to your skill level in real-time. Get streaks to unlock harder questions and earn more points.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left">
                            <Feature icon={BrainCircuit} title="Smart Difficulty" desc="Adjusts based on performance" />
                            <Feature icon={Timer} title="Timed Questions" desc="Test your speed and accuracy" />
                            <Feature icon={Trophy} title="Earn Badges" desc="Unlock achievements as you learn" />
                        </div>

                        <button
                            onClick={() => setGameState('quiz')}
                            className="bg-primary text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1"
                        >
                            Start Challenge
                        </button>
                    </motion.div>
                )}

                {gameState === 'quiz' && (
                    <motion.div
                        key="quiz"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-secondary-light/20">
                            <div className="flex items-center gap-4">
                                <div className="px-3 py-1 bg-secondary-light/10 rounded-lg text-sm font-medium text-secondary-dark">
                                    Q{currentQuestion + 1}/{questions.length}
                                </div>
                                <div className={`px-3 py-1 rounded-lg text-sm font-medium ${difficulty === 'Easy' ? 'bg-success/10 text-success' :
                                    difficulty === 'Medium' ? 'bg-warning/10 text-warning' :
                                        'bg-error/10 text-error'
                                    }`}>
                                    {difficulty}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-warning" />
                                <span className="font-bold text-secondary-dark">{score} pts</span>
                            </div>
                        </div>

                        {/* Question Card */}
                        <div className="bg-white rounded-3xl shadow-lg border border-secondary-light/20 p-8 md:p-12">
                            <h2 className="text-2xl font-bold text-secondary-dark mb-8 leading-relaxed">
                                {questions[currentQuestion].question}
                            </h2>

                            <div className="grid grid-cols-1 gap-4">
                                {questions[currentQuestion].options.map((option, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleAnswer(index)}
                                        className="group flex items-center justify-between p-5 rounded-xl border-2 border-secondary-light/20 hover:border-primary hover:bg-primary/5 transition-all text-left"
                                    >
                                        <span className="font-medium text-secondary-dark group-hover:text-primary transition-colors">{option}</span>
                                        <ChevronRight className="w-5 h-5 text-secondary-light group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {gameState === 'result' && (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl shadow-sm border border-secondary-light/20 p-12 text-center"
                    >
                        <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trophy className="w-12 h-12 text-success" />
                        </div>
                        <h2 className="text-3xl font-bold text-secondary-dark mb-2">Quiz Completed!</h2>
                        <p className="text-secondary mb-8">You showed great mastery in Physics concepts.</p>

                        <div className="grid grid-cols-3 gap-4 mb-10">
                            <ResultStat label="Total Score" value={score} />
                            <ResultStat label="Accuracy" value="80%" />
                            <ResultStat label="Best Streak" value="3" />
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => {
                                    setGameState('start');
                                    setCurrentQuestion(0);
                                    setScore(0);
                                }}
                                className="w-full sm:w-auto bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors"
                            >
                                Play Again
                            </button>
                            <button className="w-full sm:w-auto flex items-center justify-center gap-2 text-secondary-dark border border-secondary-light/20 px-8 py-3 rounded-xl font-bold hover:bg-secondary-light/5 transition-colors">
                                View Analytics
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const Feature = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
    <div className="flex items-start gap-4">
        <div className="p-3 bg-background rounded-xl">
            <Icon className="w-6 h-6 text-secondary-dark" />
        </div>
        <div>
            <h3 className="font-bold text-secondary-dark">{title}</h3>
            <p className="text-sm text-secondary">{desc}</p>
        </div>
    </div>
);

const ResultStat = ({ label, value }: { label: string, value: string | number }) => (
    <div className="bg-background p-4 rounded-2xl">
        <p className="text-sm text-secondary mb-1">{label}</p>
        <p className="text-2xl font-bold text-secondary-dark">{value}</p>
    </div>
);

export default AdaptiveQuiz;
