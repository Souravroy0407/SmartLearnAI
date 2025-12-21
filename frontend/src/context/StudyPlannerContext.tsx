import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

// Types (Moved from StudyPlanner.tsx)
export interface StudyTask {
    id: number;
    title: string;
    task_type: string;
    start_time: string;
    duration_minutes: number;
    status: string;
    color: string;
}

export interface ExamResponse {
    exam: {
        id: number;
        title: string;
        deadline: string;
        duration_minutes: number;
    };
    status: string;
    marks: number | null;
}

interface CalendarDay {
    day: string;
    date: number;
    fullDate: Date;
    active: boolean;
    hasTask: boolean;
}

interface StudyPlannerContextType {
    allTasks: StudyTask[];
    exams: ExamResponse[];
    calendarDays: CalendarDay[];
    userEnergyPref: string | null;
    isLoaded: boolean;
    isLoading: boolean;
    refreshData: () => Promise<void>;
    ensureDataLoaded: () => Promise<void>;
    // Optimistic Update Helpers
    updateTask: (updatedTask: StudyTask) => void;
    updateTasksBulk: (updatedTasks: StudyTask[]) => void;
    deleteTask: (taskId: number) => void;
    addTask: (newTask: StudyTask) => void;
    setUserEnergyPref: (pref: string) => void;
}

const StudyPlannerContext = createContext<StudyPlannerContextType | undefined>(undefined);

export const StudyPlannerProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth(); // Trigger refresh on user change/login if needed
    const [allTasks, setAllTasks] = useState<StudyTask[]>([]);
    const [exams, setExams] = useState<ExamResponse[]>([]);
    const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
    const [userEnergyPref, setUserEnergyPref] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // userEnergyPref is now handled purely at runtime
    // Removing fetchUserPref logic and setting initial state to null

    // Calculate Calendar Range from Tasks
    const calculateCalendarRange = (tasks: StudyTask[]) => {
        if (tasks.length === 0) {
            const today = new Date();
            setCalendarDays([{
                day: today.toLocaleDateString('en-US', { weekday: 'short' }),
                date: today.getDate(),
                fullDate: today,
                active: true,
                hasTask: false
            }]);
            return;
        }

        const timestamps = tasks.map(t => new Date(t.start_time).getTime());
        const minDate = new Date(Math.min(...timestamps));
        const maxDate = new Date(Math.max(...timestamps));

        const days: CalendarDay[] = [];
        let current = new Date(minDate);
        current.setHours(0, 0, 0, 0);

        const end = new Date(maxDate);
        end.setHours(23, 59, 59, 999);

        const taskDates = new Set(tasks.map(t => new Date(t.start_time).toDateString()));

        while (current <= end) {
            days.push({
                day: current.toLocaleDateString('en-US', { weekday: 'short' }),
                date: current.getDate(),
                fullDate: new Date(current),
                active: true,
                hasTask: taskDates.has(current.toDateString())
            });
            current.setDate(current.getDate() + 1);
        }
        setCalendarDays(days);
    };

    const fetchData = async () => {
        if (!user) return; // Prevent fetching if no user session exists
        setIsLoading(true);
        try {
            // 1. Preferences are now runtime-only, skipping redundant profile fetch

            // 2. Fetch ALL Tasks (No date range filters)
            const tasksRes = await api.get('/api/study-planner/tasks');
            const tasks: StudyTask[] = tasksRes.data;
            setAllTasks(tasks);
            calculateCalendarRange(tasks);

            // 3. Process Exams (From Tasks - as per recent fix)
            // Fetch Teacher Exams (Optional - skipped to avoid errors as per previous fix)
            const teacherExams: ExamResponse[] = [];

            // Extract Personal Exams from Tasks
            const examTasks = tasks.filter(t =>
                t.task_type.toLowerCase() === 'exam' ||
                t.title.toLowerCase().includes('exam')
            );

            const convertedExams: ExamResponse[] = examTasks.map(t => ({
                exam: {
                    id: -t.id,
                    title: t.title,
                    deadline: t.start_time,
                    duration_minutes: t.duration_minutes
                },
                status: 'personal',
                marks: null
            }));

            const mergedExams = [...teacherExams, ...convertedExams].sort((a, b) =>
                new Date(a.exam.deadline).getTime() - new Date(b.exam.deadline).getTime()
            );
            setExams(mergedExams);

            setIsLoaded(true);
        } catch (error) {
            console.error("Error fetching study planner data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Public Actions
    const refreshData = async () => {
        await fetchData();
    };

    const ensureDataLoaded = async () => {
        if (!isLoaded && !isLoading) {
            await fetchData();
        }
    };

    const updateTask = (updatedTask: StudyTask) => {
        setAllTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    };

    const updateTasksBulk = (updatedTasks: StudyTask[]) => {
        const updatedIds = new Set(updatedTasks.map(t => t.id));
        setAllTasks(prev => prev.map(t => {
            if (updatedIds.has(t.id)) {
                return updatedTasks.find(ut => ut.id === t.id) || t;
            }
            return t;
        }));
    };

    const deleteTask = (taskId: number) => {
        setAllTasks(prev => prev.filter(t => t.id !== taskId));
    };

    const addTask = (newTask: StudyTask) => {
        setAllTasks(prev => [...prev, newTask]);
    };

    // Reset on logout (if user becomes null)
    useEffect(() => {
        if (!user) {
            setAllTasks([]);
            setExams([]);
            setIsLoaded(false);
        } else {
            // Option: Auto-load on login? 
            // Better to let the component trigger ensureDataLoaded to avoid eager loading if user isn't on planner.
        }
    }, [user]);

    return (
        <StudyPlannerContext.Provider value={{
            allTasks,
            exams,
            calendarDays,
            userEnergyPref,
            isLoaded,
            isLoading,
            refreshData,
            ensureDataLoaded,
            updateTask,
            updateTasksBulk,
            deleteTask,
            addTask,
            setUserEnergyPref
        }}>
            {children}
        </StudyPlannerContext.Provider>
    );
};

export const useStudyPlanner = () => {
    const context = useContext(StudyPlannerContext);
    if (!context) {
        throw new Error('useStudyPlanner must be used within a StudyPlannerProvider');
    }
    return context;
};
