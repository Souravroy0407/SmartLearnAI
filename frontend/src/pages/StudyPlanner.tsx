import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, MoreVertical, Plus, Sparkles, Clock, Loader2, Trash2, X, Edit3, Calendar as CalendarIcon } from 'lucide-react';
import api from '../api/axios';
import CreateTaskModal from '../components/CreateTaskModal';
import GeneratePlanModal from '../components/GeneratePlanModal';
import EnergyPreferenceModal from '../components/EnergyPreferenceModal';
import Toast, { type ToastType } from '../components/Toast'; // Import Toast

interface StudyTask {
    id: number;
    title: string;
    task_type: string;
    start_time: string;
    duration_minutes: number;
    status: string;
    color: string;
}

// Exam interface removed as it is no longer managed here

interface ExamResponse {
    exam: {
        id: number;
        title: string;
        deadline: string;
        duration_minutes: number;
    };
    status: string;
    marks: number | null;
}



const StudyPlanner = () => {
    // State
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [tasks, setTasks] = useState<StudyTask[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [isPeakHourModalOpen, setIsPeakHourModalOpen] = useState(false);
    const [isEnergyModalOpen, setIsEnergyModalOpen] = useState(false);
    const [userEnergyPref, setUserEnergyPref] = useState<string | null>(null);

    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    const [activeMenuTaskId, setActiveMenuTaskId] = useState<number | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<StudyTask | null>(null);
    // const [examToDelete, setExamToDelete] = useState<Exam | null>(null); // Deprecated

    // const [isDeleting, setIsDeleting] = useState(false); // Deprecated exam deletion state
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null); // Toast state
    const [taskToReschedule, setTaskToReschedule] = useState<StudyTask | null>(null);
    const [taskToRescheduleAI, setTaskToRescheduleAI] = useState<StudyTask | null>(null);
    const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
    const [isFetchingAI, setIsFetchingAI] = useState(false);
    const [exams, setExams] = useState<ExamResponse[]>([]);



    const [calendarDays, setCalendarDays] = useState<{ day: string; date: number; fullDate: Date; active: boolean; hasTask: boolean }[]>([]);

    // Fetch full calendar range
    const fetchCalendarRange = async () => {
        try {
            // Get ALL tasks to determine range
            const response = await api.get('/api/study-planner/tasks');
            const allTasks: StudyTask[] = response.data;

            if (allTasks.length === 0) {
                // Fallback to today if empty
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

            // Find Min and Max date
            const timestamps = allTasks.map(t => new Date(t.start_time).getTime());
            const minDate = new Date(Math.min(...timestamps));
            const maxDate = new Date(Math.max(...timestamps));

            // Generate all days in range
            const days = [];
            let current = new Date(minDate);
            // Normalize to start of day
            current.setHours(0, 0, 0, 0);

            const end = new Date(maxDate);
            end.setHours(23, 59, 59, 999);

            // Create a set of dates that have tasks for quick lookup
            const taskDates = new Set(allTasks.map(t => new Date(t.start_time).toDateString()));

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

            // If selectedDate is outside range, select the first day
            /* 
               Checking if selectedDate is within [minDate, maxDate] is good, 
               but technically we can let user select whatever. 
               However, for better UX, if they generate a plan that starts tomorrow, 
               we should probably jump to tomorrow.
            */
            // const startNormalized = new Date(minDate); startNormalized.setHours(0,0,0,0);
            // if (selectedDate < startNormalized || selectedDate > end) {
            //     setSelectedDate(startNormalized);
            // }

        } catch (error) {
            console.error("Error fetching calendar range:", error);
        }
    };

    // Initial load
    useEffect(() => {
        fetchCalendarRange();
    }, []);

    // Fetch user preference on mount
    useEffect(() => {
        const fetchUserPref = async () => {
            try {
                const response = await api.get('/api/users/me');
                if (response.data.energy_preference) {
                    setUserEnergyPref(response.data.energy_preference);
                }
            } catch (error) {
                console.error("Error fetching user profile:", error);
            }
        };
        fetchUserPref();
    }, []);

    // Fetch tasks
    const fetchTasks = async () => {
        try {
            setIsLoadingTasks(true);
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            const response = await api.get('/api/study-planner/tasks', {
                params: {
                    start_date: startOfDay.toISOString(),
                    end_date: endOfDay.toISOString()
                }
            });
            setTasks(response.data);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        } finally {
            setIsLoadingTasks(false);
        }
    };

    const fetchExams = async () => {
        let teacherExams: ExamResponse[] = [];
        let convertedExams: ExamResponse[] = [];

        try {
            // 1. Fetch Teacher Exams (DISABLED to prevent 500 errors on empty table)
            // The backend endpoint '/api/exam/list/student' returns 500 if no data/profile exists.
            // Since AI exams are stored as StudyTasks, we skip this optional call for now.
            /*
            try {
                const teacherExamsRes = await api.get('/api/exam/list/student');
                if (Array.isArray(teacherExamsRes.data)) {
                    teacherExams = teacherExamsRes.data;
                }
            } catch (err) {
                // Expected failure if table is empty or student not enrolled. 
            }
            */

            // 2. Fetch User "Exam" Tasks (Generated by AI)
            const today = new Date();
            const startOfDay = new Date(today);
            startOfDay.setHours(0, 0, 0, 0);

            const tasksRes = await api.get('/api/study-planner/tasks', {
                params: {
                    start_date: startOfDay.toISOString()
                }
            });
            const allTasks: StudyTask[] = tasksRes.data;

            // Filter for tasks that look like exams (Case insensitive check)
            const examTasks = allTasks.filter(t =>
                t.task_type.toLowerCase() === 'exam' ||
                t.title.toLowerCase().includes('exam')
            );

            // 3. Convert Task to ExamResponse
            convertedExams = examTasks.map(t => ({
                exam: {
                    id: -t.id, // Negative ID to avoid collision
                    title: t.title,
                    deadline: t.start_time,
                    duration_minutes: t.duration_minutes
                },
                status: 'personal',
                marks: null
            }));

            // 4. Merge and Sort
            const merged = [...teacherExams, ...convertedExams].sort((a, b) =>
                new Date(a.exam.deadline).getTime() - new Date(b.exam.deadline).getTime()
            );

            setExams(merged);
        } catch (error) {
            console.error("Critical error in fetchExams:", error);
        }
    };



    useEffect(() => {
        fetchTasks();
        fetchExams();
    }, [selectedDate]);

    // Auto-cleanup orphans removed (Endpoint deprecated)
    // useEffect(() => { ... }, []);


    const handleGenerateClick = () => {
        if (userEnergyPref) {
            setIsAIModalOpen(true);
        } else {
            setIsEnergyModalOpen(true);
        }
    };

    const handleEnergySelect = (preference: any) => {
        setUserEnergyPref(preference);
        setIsEnergyModalOpen(false);
        setIsAIModalOpen(true);
    };

    const handlePeakHourUpdate = async (preference: any) => {
        try {
            setIsOptimizing(true);
            // Call reoptimize endpoint
            await api.post('/api/study-planner/reoptimize', null, {
                params: { energy_preference: preference }
            });
            setUserEnergyPref(preference);
            setIsPeakHourModalOpen(false);
            setUserEnergyPref(preference);
            setIsPeakHourModalOpen(false);
            await fetchCalendarRange(); // Re-fetch range as optimization might change dates
            await fetchTasks(); // Refresh tasks to show new times
        } catch (error) {
            console.error("Failed to reoptimize:", error);
        } finally {
            setIsOptimizing(false);
        }
    };

    const handleTaskCompletion = async (taskId: number, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
            // Optimistic update
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

            await api.put(`/api/study-planner/tasks/${taskId}`, { status: newStatus });
        } catch (error) {
            console.error("Error updating task:", error);
            fetchTasks(); // Revert on error
        }
    };

    const handleDeleteTask = async () => {
        if (!taskToDelete) return;

        try {
            // Optimistic update
            setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
            setTaskToDelete(null); // Close modal immediately

            await api.delete(`/api/study-planner/tasks/${taskToDelete.id}`);
        } catch (error) {
            console.error("Error deleting task:", error);
            // Revert or show error
            fetchTasks();
        }
    };

    // Exam deletion functions removed as they are no longer used


    const handleRescheduleSave = async (updatedTaskPart: Partial<StudyTask>) => {
        if (!taskToReschedule) return;

        try {
            // Optimistic update
            setTasks(prev => prev.map(t =>
                t.id === taskToReschedule.id ? { ...t, ...updatedTaskPart } : t
            ));

            // Build API payload
            // Note: API expects snake_case but our internal interface is also snake_case for props, so clean mapping
            await api.put(`/api/study-planner/tasks/${taskToReschedule.id}`, updatedTaskPart);

            setTaskToReschedule(null);
        } catch (error) {
            console.error("Error updating task:", error);
            fetchTasks();
        }
    };

    const handleRescheduleAIClick = async (task: StudyTask) => {
        try {
            setTaskToRescheduleAI(task);
            setIsFetchingAI(true);
            const response = await api.post(`/api/study-planner/tasks/${task.id}/reschedule-suggestions`);
            setAiSuggestions(response.data);
        } catch (error) {
            console.error("Error fetching AI suggestions:", error);
        } finally {
            setIsFetchingAI(false);
        }
    };

    const handleApplyAISuggestion = async (suggestion: any) => {
        if (!taskToRescheduleAI) return;

        try {
            const updatedPart = {
                start_time: suggestion.iso_start_time
            };

            // Optimistic update
            setTasks(prev => prev.map(t =>
                t.id === taskToRescheduleAI.id ? { ...t, ...updatedPart } : t
            ));

            await api.put(`/api/study-planner/tasks/${taskToRescheduleAI.id}`, updatedPart);
            setTaskToRescheduleAI(null);
            setAiSuggestions([]);
        } catch (error) {
            console.error("Error applying AI suggestion:", error);
            fetchTasks();
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuTaskId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDuration = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-dark mb-2">Smart Study Planner</h1>
                    <p className="text-secondary">Your AI-generated schedule for maximum productivity.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsPeakHourModalOpen(true)}
                        className="flex items-center gap-2 bg-white text-secondary-dark border border-secondary-light/30 px-4 py-2.5 rounded-xl font-medium hover:bg-secondary-light/10 transition-colors"
                    >
                        <Clock className="w-5 h-5 text-primary" />
                        Choose Peak Hour
                    </button>
                    <button
                        onClick={handleGenerateClick}
                        className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 text-white px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg shadow-pink-500/20"
                    >
                        <Sparkles className="w-5 h-5" />
                        Generate with AI
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-white text-secondary-dark border border-secondary-light/30 px-5 py-2.5 rounded-xl font-medium hover:bg-secondary-light/10 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Add Custom Task
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Calendar Strip */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-secondary-light/20">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-secondary-dark">
                                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        const newDate = new Date(selectedDate);
                                        newDate.setDate(newDate.getDate() - 7);
                                        setSelectedDate(newDate);
                                    }}
                                    className="p-2 hover:bg-secondary-light/10 rounded-lg transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5 text-secondary rotate-180" />
                                </button>
                                <button
                                    onClick={() => {
                                        const newDate = new Date(selectedDate);
                                        newDate.setDate(newDate.getDate() + 7);
                                        setSelectedDate(newDate);
                                    }}
                                    className="p-2 hover:bg-secondary-light/10 rounded-lg transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5 text-secondary" />
                                </button>
                            </div>
                        </div>
                        <div className="flex overflow-x-auto pb-4 gap-2 scrollbar-thin scrollbar-thumb-secondary-light/20 scrollbar-track-transparent">
                            {calendarDays.map((item, index) => {
                                const isSelected = selectedDate.getDate() === item.date && selectedDate.getMonth() === item.fullDate.getMonth();
                                return (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedDate(item.fullDate)}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all min-w-[64px] flex-shrink-0 ${isSelected
                                            ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105'
                                            : 'hover:bg-secondary-light/10 text-secondary border border-transparent hover:border-secondary-light/20'
                                            }`}
                                    >
                                        <span className={`text-xs font-medium ${isSelected ? 'opacity-90' : 'opacity-60'}`}>{item.day}</span>
                                        <span className="text-xl font-bold">{item.date}</span>
                                        {/* Indicator dot */}
                                        <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white' :
                                            item.hasTask ? 'bg-primary' : 'bg-transparent'
                                            }`}></div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-secondary-dark">
                            Schedule for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </h3>

                        {isLoadingTasks ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-secondary-light/20">
                                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                                <p className="text-secondary font-medium">Loading your study plan...</p>
                            </div>
                        ) : tasks.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-secondary-light/30">
                                <p className="text-secondary mb-4">No tasks scheduled for this day.</p>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="text-primary font-medium hover:underline"
                                >
                                    Create a task
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {tasks.map((task, index) => (
                                    <motion.div
                                        key={task.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="group bg-white p-5 rounded-2xl shadow-sm border border-secondary-light/20 hover:shadow-md transition-all flex items-center gap-4"
                                    >
                                        <div className="flex flex-col items-center gap-1 min-w-[80px]">
                                            <span className="text-sm font-bold text-secondary-dark">{formatTime(task.start_time)}</span>
                                            <span className="text-xs text-secondary-light">{formatDuration(task.duration_minutes)}</span>
                                        </div>

                                        <div className={`w-1.5 h-12 rounded-full ${task.color} opacity-20 group-hover:opacity-100 transition-opacity`}></div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${task.color.replace('bg-', 'bg-')}/10 text-${task.color.replace('bg-', '')}`}>
                                                    {task.task_type}
                                                </span>
                                                {task.status === 'completed' && (
                                                    <CheckCircle2 className="w-4 h-4 text-success" />
                                                )}
                                            </div>
                                            <h4 className={`font-bold text-secondary-dark ${task.status === 'completed' ? 'line-through opacity-50' : ''}`}>
                                                {task.title}
                                            </h4>
                                        </div>

                                        <button
                                            onClick={() => handleTaskCompletion(task.id, task.status)}
                                            className={`p-2 rounded-lg transition-colors ${task.status === 'completed' ? 'text-success bg-success/10' : 'text-secondary-light hover:text-primary hover:bg-primary/10'}`}
                                            title={task.status === 'completed' ? "Mark as pending" : "Mark as completed"}
                                        >
                                            <CheckCircle2 className="w-5 h-5" />
                                        </button>

                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenuTaskId(activeMenuTaskId === task.id ? null : task.id);
                                                }}
                                                className="p-2 text-secondary-light hover:text-secondary hover:bg-secondary-light/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </button>

                                            {activeMenuTaskId === task.id && (
                                                <div
                                                    className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-secondary-light/20 overflow-hidden z-10"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={() => {
                                                            setTaskToReschedule(task);
                                                            setActiveMenuTaskId(null);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-secondary-dark hover:bg-secondary-light/5 transition-colors border-b border-secondary-light/10"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                        Reschedule Manually
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            handleRescheduleAIClick(task);
                                                            setActiveMenuTaskId(null);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-secondary-dark hover:bg-secondary-light/5 transition-colors border-b border-secondary-light/10"
                                                    >
                                                        <Sparkles className="w-4 h-4" />
                                                        Reschedule with AI
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setTaskToDelete(task);
                                                            setActiveMenuTaskId(null);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-error hover:bg-error/5 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete Task
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar - Daily Goal */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-secondary-light/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                        <h3 className="text-lg font-bold text-secondary-dark mb-1">Daily Goal</h3>
                        <p className="text-sm text-secondary mb-6">{selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}'s Progress</p>

                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-4xl font-bold text-primary">{tasks.filter(t => t.status === 'completed').length}</span>
                            <span className="text-lg text-secondary-light font-medium mb-1">/ {tasks.length} tasks</span>
                        </div>

                        <div className="w-full h-3 bg-secondary-light/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${tasks.length === 0 ? 0 : Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)}%` }}
                            ></div>
                        </div>

                        <p className="text-xs text-secondary mt-4 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-warning" />
                            {tasks.filter(t => t.status === 'completed').length === tasks.length && tasks.length > 0
                                ? "All caught up! Great job!"
                                : "Keep going, you're doing great!"}
                        </p>
                    </div>

                    {/* Upcoming Exams Section */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-secondary-light/20">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-secondary-dark">Upcoming Exams</h3>
                        </div>

                        {exams.length === 0 ? (
                            <div className="p-4 bg-secondary-light/5 rounded-xl border border-dashed border-secondary-light/20 text-center">
                                <p className="text-sm text-secondary">No upcoming exams found.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {exams.map((item) => {
                                    const examDate = new Date(item.exam.deadline);
                                    const today = new Date();
                                    const diffTime = examDate.getTime() - today.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                    return (
                                        <div key={item.exam.id} className="grid grid-cols-[auto_1fr] gap-4 items-center p-4 hover:bg-secondary-light/5 rounded-2xl transition-colors group cursor-default">
                                            {/* Column 1: Date Badge */}
                                            <div className="flex flex-col items-center justify-center w-14 h-14 bg-secondary-light/10 text-secondary-dark rounded-2xl font-bold border border-secondary-light/20">
                                                <span className="text-xs text-secondary uppercase tracking-wider">{examDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                                                <span className="text-xl">{examDate.getDate()}</span>
                                            </div>

                                            {/* Column 2: Exam Info + Badge */}
                                            <div className="min-w-0 flex flex-col gap-1">
                                                <h4 className="font-bold text-secondary-dark text-base leading-tight" title={item.exam.title}>
                                                    {item.exam.title}
                                                </h4>

                                                <div className="flex items-center gap-3">
                                                    <p className="text-xs text-secondary font-medium">
                                                        {examDate.toLocaleDateString('en-US', { weekday: 'long' })}, {examDate.getFullYear()}
                                                    </p>

                                                    {/* Days Left Badge (Inline) */}
                                                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${diffDays <= 3 ? 'bg-error/10 text-error' :
                                                        diffDays <= 7 ? 'bg-warning/10 text-warning' :
                                                            'bg-success/10 text-success'
                                                        }`}>
                                                        {diffDays < 0 ? 'Done' : diffDays === 0 ? 'Today' : `${diffDays} days left`}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>


                <CreateTaskModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onTaskCreated={() => { fetchTasks(); fetchCalendarRange(); fetchExams(); }}
                    selectedDate={selectedDate}
                />

                <GeneratePlanModal
                    isOpen={isAIModalOpen}
                    onClose={() => setIsAIModalOpen(false)}
                    onPlanGenerated={() => { fetchTasks(); fetchCalendarRange(); fetchExams(); }}
                    energyPreference={userEnergyPref}
                />

                <EnergyPreferenceModal
                    isOpen={isEnergyModalOpen}
                    onClose={() => setIsEnergyModalOpen(false)}
                    onSelect={handleEnergySelect}
                />

                <EnergyPreferenceModal
                    isOpen={isPeakHourModalOpen}
                    onClose={() => setIsPeakHourModalOpen(false)}
                    onSelect={handlePeakHourUpdate}
                    title="Choose your Peak Study Hour"
                    selectedPreference={userEnergyPref}
                />
                {
                    isOptimizing && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4"
                            >
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary">
                                    <Sparkles className="w-8 h-8 animate-pulse" />
                                </div>
                                <h3 className="text-xl font-bold text-secondary-dark mb-2 text-center">Optimizing Schedule</h3>
                                <p className="text-secondary text-center mb-6">
                                    Optimizing your study plan for your peak hours...
                                </p>
                                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                            </motion.div>
                        </div>
                    )
                }



                {/* Toast Notification */}
                {
                    toast && (
                        <Toast
                            message={toast.message}
                            type={toast.type}
                            onClose={() => setToast(null)}
                        />
                    )
                }

                {/* Delete Confirmation Modal (Task) */}
                {
                    taskToDelete && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
                            >
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error">
                                            <Trash2 className="w-6 h-6" />
                                        </div>
                                        <button
                                            onClick={() => setTaskToDelete(null)}
                                            className="p-2 text-secondary-light hover:text-secondary hover:bg-secondary-light/10 rounded-full transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <h3 className="text-xl font-bold text-secondary-dark mb-2">Delete this task?</h3>
                                    <p className="text-secondary mb-6">
                                        Are you sure you want to delete <span className="font-bold text-secondary-dark">"{taskToDelete.title}"</span>?
                                        This action cannot be undone.
                                    </p>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setTaskToDelete(null)}
                                            className="flex-1 px-4 py-3 border border-secondary-light/30 text-secondary-dark font-medium rounded-xl hover:bg-secondary-light/5 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleDeleteTask}
                                            className="flex-1 px-4 py-3 bg-error text-white font-medium rounded-xl hover:bg-error/90 transition-colors shadow-lg shadow-error/20"
                                        >
                                            Delete Task
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )
                }


                {/* Reschedule Modal */}
                {
                    taskToReschedule && (
                        <RescheduleModal
                            task={taskToReschedule}
                            onClose={() => setTaskToReschedule(null)}
                            onSave={handleRescheduleSave}
                        />
                    )
                }

                {/* AI Reschedule Suggestion Modal */}
                {
                    (taskToRescheduleAI || isFetchingAI) && (
                        <RescheduleAIModal
                            task={taskToRescheduleAI}
                            suggestions={aiSuggestions}
                            isLoading={isFetchingAI}
                            onClose={() => {
                                setTaskToRescheduleAI(null);
                                setAiSuggestions([]);
                            }}
                            onSelect={handleApplyAISuggestion}
                        />
                    )
                }
            </div >
        </div >
    );
};

// Inline Reschedule Modal Component
function RescheduleModal({ task, onClose, onSave }: { task: StudyTask, onClose: () => void, onSave: (data: any) => void }) {
    // Initialize state with task values
    // Date handling: existing start_time is ISO string. 
    const taskDate = new Date(task.start_time);

    // Format date for input type="date" (YYYY-MM-DD)
    const [date, setDate] = useState(taskDate.toISOString().split('T')[0]);

    // Format time for input type="time" (HH:MM)
    const [time, setTime] = useState(taskDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));

    const [duration, setDuration] = useState(task.duration_minutes);
    const [priorityColor, setPriorityColor] = useState(task.color);

    const handleSubmit = () => {
        // Construct new start_time ISO string
        const newDateTime = new Date(`${date}T${time}:00`);

        onSave({
            start_time: newDateTime.toISOString(),
            duration_minutes: Number(duration),
            color: priorityColor
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-secondary-dark">Reschedule Task</h3>
                        <button onClick={onClose} className="p-2 hover:bg-secondary-light/10 rounded-full transition-colors">
                            <X className="w-5 h-5 text-secondary" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Date Input */}
                        <div>
                            <label className="block text-xs font-bold text-secondary-light mb-1 uppercase tracking-wider">Date</label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-light" />
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-secondary-light/5 border border-secondary-light/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-secondary-dark font-medium"
                                />
                            </div>
                        </div>

                        {/* Time & Duration Row */}
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-secondary-light mb-1 uppercase tracking-wider">Start Time</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-light" />
                                    <input
                                        type="time"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-secondary-light/5 border border-secondary-light/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-secondary-dark font-medium"
                                    />
                                </div>
                            </div>
                            <div className="w-1/3">
                                <label className="block text-xs font-bold text-secondary-light mb-1 uppercase tracking-wider">Mins</label>
                                <input
                                    type="number"
                                    value={duration}
                                    onChange={(e) => setDuration(Number(e.target.value))}
                                    className="w-full px-4 py-3 bg-secondary-light/5 border border-secondary-light/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-secondary-dark font-medium text-center"
                                />
                            </div>
                        </div>

                        {/* Priority Selection */}
                        <div>
                            <label className="block text-xs font-bold text-secondary-light mb-2 uppercase tracking-wider">Priority</label>
                            <div className="flex gap-2">
                                {[
                                    { label: 'Low', value: 'bg-success', color: 'text-success bg-success/10 border-success/20' },
                                    { label: 'Medium', value: 'bg-primary', color: 'text-primary bg-primary/10 border-primary/20' },
                                    { label: 'High', value: 'bg-warning', color: 'text-warning bg-warning/10 border-warning/20' }
                                ].map((p) => (
                                    <button
                                        key={p.value}
                                        onClick={() => setPriorityColor(p.value)}
                                        className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${priorityColor === p.value
                                            ? p.color + ' ring-2 ring-offset-2 ring-offset-white ring-' + p.value.split('-')[1]
                                            : 'bg-white border-secondary-light/10 text-secondary hover:bg-secondary-light/5'
                                            }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-secondary-light/30 text-secondary-dark font-medium rounded-xl hover:bg-secondary-light/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="flex-1 px-4 py-3 bg-primary text-white font-medium rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// AI Reschedule Modal
function RescheduleAIModal({ task, suggestions, isLoading, onClose, onSelect }: { task: StudyTask | null, suggestions: any[], isLoading: boolean, onClose: () => void, onSelect: (s: any) => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="w-16 h-16 bg-secondary-light/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-secondary-light">
                                <CalendarIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-secondary-dark">AI Reschedule</h3>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-secondary-light/10 rounded-full transition-colors">
                            <X className="w-5 h-5 text-secondary" />
                        </button>
                    </div>

                    <div className="mb-6">
                        <p className="text-sm text-secondary-light mb-1 uppercase tracking-wider font-bold">Task</p>
                        <h4 className="text-lg font-bold text-secondary-dark">{task?.title}</h4>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm font-medium text-secondary">Recommended Slots:</p>

                        {isLoading ? (
                            <div className="py-12 flex flex-col items-center justify-center space-y-4 bg-secondary-light/5 rounded-2xl border border-dashed border-secondary-light/20">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                <p className="text-sm text-secondary-light font-medium animate-pulse">Analyzing schedule...</p>
                            </div>
                        ) : suggestions.length > 0 ? (
                            suggestions.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => onSelect(s)}
                                    className="w-full text-left p-4 rounded-2xl border border-secondary-light/20 hover:border-primary hover:bg-primary/5 transition-all group relative overflow-hidden"
                                >
                                    <div className="relative z-10 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-secondary-dark">{s.display_text}</p>
                                            <p className="text-xs text-secondary-light">Optimized for your peak hours</p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-secondary-light group-hover:text-primary transition-colors" />
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))
                        ) : (
                            <div className="p-4 bg-error/5 text-error text-sm rounded-xl border border-error/10">
                                No suitable slots found. Try manual rescheduling.
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full mt-8 px-4 py-3 border border-secondary-light/30 text-secondary-dark font-medium rounded-xl hover:bg-secondary-light/5 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default StudyPlanner;
