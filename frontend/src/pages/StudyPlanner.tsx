import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, MoreVertical, Plus, Sparkles, Clock, Loader2, Trash2, X, Edit3, Calendar as CalendarIcon, RotateCw } from 'lucide-react';
import api from '../api/axios';
import CreateTaskModal from '../components/CreateTaskModal';
import GeneratePlanModal from '../components/GeneratePlanModal';
import EnergyPreferenceModal from '../components/EnergyPreferenceModal';
import Toast, { type ToastType } from '../components/Toast';
import { useStudyPlanner, type StudyTask } from '../context/StudyPlannerContext';



const StudyPlanner = () => {
    // Global State
    const {
        allTasks,
        exams,
        calendarDays,
        userEnergyPref,
        isLoading: isGlobalLoading,
        refreshData,
        ensureDataLoaded,
        updateTask: contextUpdateTask,
        updateTasksBulk: contextUpdateTasksBulk,
        deleteTask: contextDeleteTask,
        setUserEnergyPref
    } = useStudyPlanner();

    // Local UI State
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isMuted, setIsMuted] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [isPeakHourModalOpen, setIsPeakHourModalOpen] = useState(false);
    const [isEnergyModalOpen, setIsEnergyModalOpen] = useState(false);

    const [isOptimizing, setIsOptimizing] = useState(false);
    const [activeMenuTaskId, setActiveMenuTaskId] = useState<number | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<StudyTask | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [taskToReschedule, setTaskToReschedule] = useState<StudyTask | null>(null);
    const [taskToRescheduleAI, setTaskToRescheduleAI] = useState<StudyTask | null>(null);
    const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
    const [isFetchingAI, setIsFetchingAI] = useState(false);

    // Initial Data Load
    useEffect(() => {
        ensureDataLoaded();
    }, []);

    // Derived State: Filter Tasks for Selected Date
    const dailyTasks = useMemo(() => {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        return allTasks.filter(t => {
            const tDate = new Date(t.start_time);
            return tDate >= startOfDay && tDate <= endOfDay;
        });
    }, [allTasks, selectedDate]);

    const handleRefresh = async () => {
        setIsMuted(true);
        try {
            await refreshData();
            showToast('Schedule updated', 'success');
        } catch (error) {
            showToast('Failed to refresh', 'error');
        } finally {
            setIsMuted(false);
        }
    };

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

    const handlePeakHourUpdate = async (preference: string) => {
        try {
            setIsOptimizing(true);

            // Artificial delay for smooth UX
            await new Promise(resolve => setTimeout(resolve, 600));

            // 1. Define Standard Windows (Priority-based, lowercase keys for matching)
            const windows: Record<string, { start: number, end: number }> = {
                'morning': { start: 6, end: 10 },
                'afternoon': { start: 12, end: 16 },
                'night': { start: 19, end: 23 }
            };

            const normalizedPref = preference.toLowerCase();
            const selectedWindow = windows[normalizedPref] || windows['morning'];

            // 2. Filter and Sort Daily Tasks
            const sortedTasks = [...dailyTasks].sort((a, b) =>
                new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            );

            if (sortedTasks.length === 0) {
                showToast("No tasks to reschedule for today.", "info");
                setIsPeakHourModalOpen(false);
                return;
            }

            // 3. Calculate Global Requirements
            const bufferMinutes = 15;
            const totalRequiredMinutes = sortedTasks.reduce((acc, t, idx) => {
                const buffer = idx === sortedTasks.length - 1 ? 0 : bufferMinutes;
                return acc + t.duration_minutes + buffer;
            }, 0);

            // Sanity Check: If total tasks > 19 hours, it won't fit in any day
            if (totalRequiredMinutes > 1140) {
                showToast("Too many tasks for a single day.", "error");
                setIsPeakHourModalOpen(false);
                return;
            }

            // 4. Initial Start Time Determination (HARD PRIORITY: Window Start)
            const peakStart = new Date(selectedDate);
            peakStart.setHours(selectedWindow.start, 0, 0, 0);

            const peakEnd = new Date(selectedDate);
            peakEnd.setHours(selectedWindow.end, 0, 0, 0);

            // 5. Two-Phase Allocation Loop
            const updatedTasks: StudyTask[] = [];
            let currentPointer = new Date(peakStart);
            let isInOverflow = false;

            sortedTasks.forEach(task => {
                const taskDurationMs = task.duration_minutes * 60000;

                // Check if task fits in peak window (including buffer check)
                if (!isInOverflow && (currentPointer.getTime() + taskDurationMs) <= peakEnd.getTime()) {
                    // Phase 1: Peak Allocation
                    updatedTasks.push({
                        ...task,
                        start_time: currentPointer.toISOString(),
                        color: 'bg-warning' // Peak highlight
                    });
                    currentPointer = new Date(currentPointer.getTime() + (task.duration_minutes + bufferMinutes) * 60000);
                } else {
                    // Phase 2: Overflow Allocation
                    if (!isInOverflow) {
                        // First overflow task starts exactly at window end
                        currentPointer = new Date(peakEnd);
                        isInOverflow = true;
                    }

                    updatedTasks.push({
                        ...task,
                        start_time: currentPointer.toISOString(),
                        color: 'bg-primary' // Standard overflow color
                    });
                    currentPointer = new Date(currentPointer.getTime() + (task.duration_minutes + bufferMinutes) * 60000);
                }
            });

            // 6. Batch Update Context
            contextUpdateTasksBulk(updatedTasks);
            setUserEnergyPref(preference);
            showToast(`Schedule optimized for ${preference}!`, "success");
            setIsPeakHourModalOpen(false);

        } catch (error) {
            console.error("Advanced scheduling failed:", error);
            showToast("Failed to optimize schedule.", "error");
        } finally {
            setIsOptimizing(false);
        }
    };

    const handleTaskCompletion = async (taskId: number, currentStatus: string) => {
        const task = allTasks.find(t => t.id === taskId);
        if (!task) return;

        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
        const updatedTask = { ...task, status: newStatus };

        try {
            // Optimistic update via Context
            contextUpdateTask(updatedTask);
            await api.put(`/api/study-planner/tasks/${taskId}`, { status: newStatus });
        } catch (error) {
            console.error("Error updating task:", error);
            contextUpdateTask(task); // Revert on error
            showToast('Failed to update status', 'error');
        }
    };

    const handleDeleteTask = async () => {
        if (!taskToDelete) return;

        try {
            // Optimistic update via Context
            contextDeleteTask(taskToDelete.id);
            setTaskToDelete(null); // Close modal immediately
            await api.delete(`/api/study-planner/tasks/${taskToDelete.id}`);
            showToast('Task deleted', 'success');
        } catch (error) {
            console.error("Error deleting task:", error);
            showToast('Failed to delete task', 'error');
            refreshData(); // Sync on error
        }
    };

    const showToast = (message: string, type: ToastType) => {
        setToast({ message, type });
    };

    // Exam deletion functions removed as they are no longer used


    const handleRescheduleSave = async (updatedTaskPart: Partial<StudyTask>) => {
        if (!taskToReschedule) return;

        try {
            // Update in context
            const task = allTasks.find(t => t.id === taskToReschedule.id);
            if (task) {
                contextUpdateTask({ ...task, ...updatedTaskPart });
            }

            await api.put(`/api/study-planner/tasks/${taskToReschedule.id}`, updatedTaskPart);
            setTaskToReschedule(null);
            showToast('Task rescheduled', 'success');
        } catch (error) {
            console.error("Error updating task:", error);
            refreshData();
            showToast('Failed to reschedule', 'error');
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

            const task = allTasks.find(t => t.id === taskToRescheduleAI.id);
            if (task) {
                contextUpdateTask({ ...task, ...updatedPart });
            }

            await api.put(`/api/study-planner/tasks/${taskToRescheduleAI.id}`, updatedPart);
            setTaskToRescheduleAI(null);
            setAiSuggestions([]);
            showToast('AI suggestion applied', 'success');
        } catch (error) {
            console.error("Error applying AI suggestion:", error);
            refreshData();
            showToast('Failed to apply suggestion', 'error');
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
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleGenerateClick}
                        className="flex-1 min-w-[160px] flex items-center justify-center gap-2 bg-primary text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <Sparkles className="w-5 h-5" />
                        Generate Plan
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex-1 min-w-[160px] flex items-center justify-center gap-2 bg-white text-secondary-dark px-6 py-4 rounded-2xl font-bold border-2 border-secondary-light/20 hover:border-primary/30 active:scale-[0.98] transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Custom Task
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
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-secondary-dark">
                                Schedule for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                            </h3>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setIsPeakHourModalOpen(true)}
                                    className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors"
                                    title="Adjust Peak Hours"
                                >
                                    <Clock className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleRefresh}
                                    className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors"
                                    disabled={isGlobalLoading}
                                    title="Refresh Schedule"
                                >
                                    <RotateCw className={`w-5 h-5 ${isGlobalLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {isGlobalLoading && !dailyTasks.length ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-secondary-light/20">
                                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                                <p className="text-secondary font-medium">Loading your study plan...</p>
                            </div>
                        ) : dailyTasks.length === 0 ? (
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
                            <div className={`space-y-4 ${isMuted ? 'opacity-50 pointer-events-none' : ''}`}>
                                {dailyTasks.map((task, index) => (
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
                            <span className="text-4xl font-bold text-primary">{dailyTasks.filter(t => t.status === 'completed').length}</span>
                            <span className="text-lg text-secondary-light font-medium mb-1">/ {dailyTasks.length} tasks</span>
                        </div>

                        <div className="w-full h-3 bg-secondary-light/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${dailyTasks.length === 0 ? 0 : Math.round((dailyTasks.filter(t => t.status === 'completed').length / dailyTasks.length) * 100)}%` }}
                            ></div>
                        </div>

                        <p className="text-xs text-secondary mt-4 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-warning" />
                            {dailyTasks.filter(t => t.status === 'completed').length === dailyTasks.length && dailyTasks.length > 0
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
                    onTaskCreated={() => refreshData()}
                    selectedDate={selectedDate}
                />

                <GeneratePlanModal
                    isOpen={isAIModalOpen}
                    onClose={() => setIsAIModalOpen(false)}
                    onPlanGenerated={() => refreshData()}
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
