import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, MoreVertical, Plus, Sparkles, Clock, Loader2, Trash2, AlertTriangle, X, Calendar, Edit3 } from 'lucide-react';
import api from '../api/axios';
import CreateTaskModal from '../components/CreateTaskModal';
import GeneratePlanModal from '../components/GeneratePlanModal';
import EnergyPreferenceModal from '../components/EnergyPreferenceModal';

interface StudyTask {
    id: number;
    title: string;
    task_type: string;
    start_time: string;
    duration_minutes: number;
    status: string;
    color: string;
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
    const [weekDays, setWeekDays] = useState<{ day: string; date: number; fullDate: Date; active: boolean }[]>([]);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    const [activeMenuTaskId, setActiveMenuTaskId] = useState<number | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<StudyTask | null>(null);
    const [taskToReschedule, setTaskToReschedule] = useState<StudyTask | null>(null);

    // Generate week days based on selected date (or current date)
    useEffect(() => {
        const days = [];
        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1); // Start from Monday

        for (let i = 0; i < 7; i++) {
            const current = new Date(startOfWeek);
            current.setDate(startOfWeek.getDate() + i);
            days.push({
                day: current.toLocaleDateString('en-US', { weekday: 'short' }),
                date: current.getDate(),
                fullDate: current,
                active: true
            });
        }
        setWeekDays(days);
    }, [selectedDate]);

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

    useEffect(() => {
        fetchTasks();
    }, [selectedDate]);

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
                        <div className="flex justify-between items-center overflow-x-auto pb-2">
                            {weekDays.map((item, index) => {
                                const isSelected = selectedDate.getDate() === item.date && selectedDate.getMonth() === item.fullDate.getMonth();
                                return (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedDate(item.fullDate)}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all min-w-[60px] ${isSelected
                                            ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110'
                                            : 'hover:bg-secondary-light/10 text-secondary'
                                            }`}
                                    >
                                        <span className="text-xs font-medium opacity-80">{item.day}</span>
                                        <span className="text-lg font-bold">{item.date}</span>
                                        {/* Simple indicator dot if active, in real app check for tasks on this day */}
                                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`}></span>
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

                {/* Sidebar Stats (Static for now, could be dynamic later) */}
                <div className="space-y-6">
                    <div className="bg-primary text-white p-6 rounded-3xl shadow-xl shadow-primary/20 relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold mb-1">Daily Goal</h3>
                            <p className="text-white/80 text-sm mb-6">You're doing great! Keep it up.</p>

                            <div className="flex items-end gap-2 mb-2">
                                <span className="text-4xl font-bold">
                                    {(tasks.filter(t => t.status === 'completed').reduce((acc, t) => acc + t.duration_minutes, 0) / 60).toFixed(1)}
                                </span>
                                <span className="text-lg opacity-80 mb-1">/ 6 hrs</span>
                            </div>
                            <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                                <div className="h-full bg-white w-[75%] rounded-full"></div>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-secondary-light/20">
                        <h3 className="text-lg font-bold text-secondary-dark mb-4">Upcoming Exams</h3>
                        <div className="space-y-4">
                            {[
                                { name: 'Physics Midterm', date: 'Oct 24', daysLeft: '6 days' },
                                { name: 'Chemistry Final', date: 'Nov 02', daysLeft: '15 days' },
                            ].map((exam, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-background transition-colors">
                                    <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center text-error font-bold text-sm">
                                        {exam.date.split(' ')[1]}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-secondary-dark text-sm">{exam.name}</h4>
                                        <p className="text-xs text-secondary">{exam.date}</p>
                                    </div>
                                    <span className="text-xs font-medium text-primary bg-primary/5 px-2 py-1 rounded-md">
                                        {exam.daysLeft}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <CreateTaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onTaskCreated={fetchTasks}
                selectedDate={selectedDate}
            />

            <GeneratePlanModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                onPlanGenerated={fetchTasks}
                energyPreference={userEnergyPref}
            />

            <EnergyPreferenceModal
                isOpen={isEnergyModalOpen}
                onSelect={handleEnergySelect}
            />

            <EnergyPreferenceModal
                isOpen={isPeakHourModalOpen}
                onSelect={handlePeakHourUpdate}
                title="Choose your Peak Study Hour"
                selectedPreference={userEnergyPref}
            />
            {isOptimizing && (
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
            )}

            {/* Delete Confirmation Modal */}
            {taskToDelete && (
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
            )}
            {/* Reschedule Modal */}
            {taskToReschedule && (
                <RescheduleModal
                    task={taskToReschedule}
                    onClose={() => setTaskToReschedule(null)}
                    onSave={handleRescheduleSave}
                />
            )}
        </div>
    );
};

// Inline Reschedule Modal Component
const RescheduleModal = ({ task, onClose, onSave }: { task: StudyTask, onClose: () => void, onSave: (data: any) => void }) => {
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
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-light" />
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

export default StudyPlanner;
