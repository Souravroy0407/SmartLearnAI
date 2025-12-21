
import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import axios from '../api/axios';
import { useAuth } from './AuthContext';

export interface Teacher {
    id: number;
    full_name: string;
    avatar_url?: string;
    subjects?: string;
    experience?: string;
    bio?: string;
    price_label?: string;
    is_following: boolean;
}

interface TeacherContextType {
    teachers: Teacher[];
    loading: boolean;
    fetchTeachers: (force?: boolean) => Promise<void>;
    updateTeacherState: (updatedTeacher: Teacher) => void;
}

const TeacherContext = createContext<TeacherContextType | undefined>(undefined);

export const TeacherProvider = ({ children }: { children: ReactNode }) => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const [hasFetched, setHasFetched] = useState(false);

    // Reset cache on logout
    useEffect(() => {
        if (!user) {
            setTeachers([]);
            setHasFetched(false);
        }
    }, [user]);

    const fetchTeachers = useCallback(async (force = false) => {
        if (hasFetched && !force) {
            return;
        }

        setLoading(true);
        try {
            const res = await axios.get('/api/users/teachers');
            setTeachers(res.data);
            setHasFetched(true);
        } catch (error) {
            console.error('Failed to fetch teachers:', error);
        } finally {
            setLoading(false);
        }
    }, [hasFetched]);

    const updateTeacherState = useCallback((updatedTeacher: Teacher) => {
        setTeachers(prev => prev.map(t => t.id === updatedTeacher.id ? updatedTeacher : t));
    }, []);

    return (
        <TeacherContext.Provider value={{ teachers, loading, fetchTeachers, updateTeacherState }}>
            {children}
        </TeacherContext.Provider>
    );
};

export const useTeacher = () => {
    const context = useContext(TeacherContext);
    if (context === undefined) {
        throw new Error('useTeacher must be used within a TeacherProvider');
    }
    return context;
};
