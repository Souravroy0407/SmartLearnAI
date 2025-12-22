
import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import axios from '../api/axios';
import { useAuth } from './AuthContext';

export interface Quiz {
    id: number;
    title: string;
    description: string;
    duration_minutes: number;
    questions_count: number;
    status: 'active' | 'attempted' | 'expired';
    score?: number;
    attempted_count?: number;
    created_at: string;
    deadline?: string;
    difficulty: string;
    topic: string;
    is_expired: boolean;
}

interface QuizContextType {
    quizzes: Quiz[];
    loading: boolean;
    fetchQuizzes: (force?: boolean) => Promise<void>;
    updateQuizState: (updatedQuiz: Quiz) => void;
    removeQuiz: (id: number) => void;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export const QuizProvider = ({ children }: { children: ReactNode }) => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const [hasFetched, setHasFetched] = useState(false);

    // Reset cache on logout (when user becomes null)
    useEffect(() => {
        if (!user) {
            setQuizzes([]);
            setHasFetched(false);
        }
    }, [user]);

    const fetchQuizzes = useCallback(async (force = false) => {
        // If we already have data and not forcing a refresh, do nothing
        if (hasFetched && !force) {
            return;
        }

        setLoading(true);
        try {
            const res = await axios.get('/api/quiz/');
            const quizzesData = res.data;

            // Default Sort: Newest first
            quizzesData.sort((a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            setQuizzes(quizzesData);
            setHasFetched(true);
        } catch (error) {
            console.error('Failed to fetch quizzes:', error);
        } finally {
            setLoading(false);
        }
    }, [hasFetched]);

    const updateQuizState = useCallback((updatedQuiz: Quiz) => {
        setQuizzes(prev => prev.map(q => q.id === updatedQuiz.id ? updatedQuiz : q));
    }, []);

    const removeQuiz = useCallback((id: number) => {
        setQuizzes(prev => prev.filter(q => q.id !== id));
    }, []);

    return (
        <QuizContext.Provider value={{ quizzes, loading, fetchQuizzes, updateQuizState, removeQuiz }}>
            {children}
        </QuizContext.Provider>
    );
};

export const useQuiz = () => {
    const context = useContext(QuizContext);
    if (context === undefined) {
        throw new Error('useQuiz must be used within a QuizProvider');
    }
    return context;
};
