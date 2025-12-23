import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const toTitleCase = (str: string) => {
    if (!str) return str;
    return str
        .toLowerCase()
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

// Types (Moved from StudyPlanner.tsx)
export interface StudyTask {
    id: number;
    title: string;
    task_type: string;
    start_time: string;
    task_date: string; // Added for robust filtering
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
    goal_status?: string; // Added for Study Goals
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
    refreshGoals: () => Promise<void>;
    refreshTasks: () => Promise<void>;
    refreshAll: () => Promise<void>;
    ensureDataLoaded: () => Promise<void>;
    // Optimistic Update Helpers
    updateTask: (updatedTask: StudyTask) => void;
    updateTasksBulk: (updatedTasks: StudyTask[]) => void;
    addTasksBulk: (newTasks: StudyTask[]) => void;
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

    const refreshGoals = async () => {
        if (!user) return;
        try {
            const goalsRes = await api.get('/api/study-planner/goals');
            const goals = goalsRes.data;

            const mappedGoals: ExamResponse[] = goals.map((g: any) => ({
                exam: {
                    id: g.goal_id,
                    title: toTitleCase(g.title),
                    deadline: g.date || null,
                    duration_minutes: 0
                },
                status: g.type,
                marks: null,
                goal_status: g.current_status
            }));

            const sortedGoals = mappedGoals.sort((a, b) => {
                if (!a.exam.deadline) return 1;
                if (!b.exam.deadline) return -1;
                const dateA = new Date(a.exam.deadline).getTime();
                const dateB = new Date(b.exam.deadline).getTime();
                return dateA - dateB;
            });

            setExams(sortedGoals);
        } catch (goalError) {
            console.error("Failed to fetch goals:", goalError);
            setExams([]);
        }
    };

    const refreshTasks = async () => {
        if (!user) return;
        try {
            const response = await api.get('/api/study-planner/tasks');
            const newTasks = response.data.map((t: any) => ({
                id: t.task_id,
                title: toTitleCase(t.title),
                task_type: t.title.toLowerCase().includes('exam') ? 'Exam' : 'Study',
                start_time: t.task_time,
                task_date: t.task_date,
                duration_minutes: t.duration_minutes || 60,
                status: t.task_status,
                color: t.task_status === 'completed' ? 'bg-success' : 'bg-primary'
            }));
            setAllTasks(newTasks);
            calculateCalendarRange(newTasks);
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
            setAllTasks([]);
        }
    };

    const refreshAll = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            await Promise.all([
                refreshTasks(),
                refreshGoals()
            ]);
            setIsLoaded(true);
        } catch (error) {
            console.error("Error fetching study planner data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Public Actions
    const refreshData = async () => {
        await refreshAll();
    };

    const ensureDataLoaded = async () => {
        if (!isLoaded && !isLoading) {
            await refreshAll();
        }
    };

    const updateTask = (updatedTask: StudyTask) => {
        const normalizedTask = { ...updatedTask, title: toTitleCase(updatedTask.title) };
        setAllTasks(prev => prev.map(t => t.id === normalizedTask.id ? normalizedTask : t));
    };

    const updateTasksBulk = (updatedTasks: StudyTask[]) => {
        const normalizedTasks = updatedTasks.map(t => ({ ...t, title: toTitleCase(t.title) }));
        const updatedIds = new Set(normalizedTasks.map(t => t.id));
        setAllTasks(prev => prev.map(t => {
            if (updatedIds.has(t.id)) {
                return normalizedTasks.find(ut => ut.id === t.id) || t;
            }
            return t;
        }));
    };

    const deleteTask = (taskId: number) => {
        setAllTasks(prev => prev.filter(t => t.id !== taskId));
    };

    const addTask = (newTask: StudyTask) => {
        const normalizedTask = { ...newTask, title: toTitleCase(newTask.title) };
        setAllTasks(prev => [...prev, normalizedTask]);
    };

    const addTasksBulk = (newTasks: StudyTask[]) => {
        const normalized = newTasks.map(t => ({ ...t, title: toTitleCase(t.title) }));
        setAllTasks(prev => [...prev, ...normalized]);
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
            refreshGoals,
            refreshTasks,
            refreshAll,
            ensureDataLoaded,
            updateTask,
            updateTasksBulk,
            addTasksBulk,
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
