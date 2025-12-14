import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, MoreVertical, Plus, Sparkles } from 'lucide-react';
import api from '../api/axios';
import CreateTaskModal from '../components/CreateTaskModal';
import GeneratePlanModal from '../components/GeneratePlanModal';

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
    const [weekDays, setWeekDays] = useState<{ day: string; date: number; fullDate: Date; active: boolean }[]>([]);

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

    // Fetch tasks
    const fetchTasks = async () => {
        try {
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
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [selectedDate]);

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
                        onClick={() => setIsAIModalOpen(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/20"
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

                        {tasks.length === 0 ? (
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

                                        <button className="p-2 text-secondary-light hover:text-secondary hover:bg-secondary-light/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
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
            />
        </div>
    );
};

export default StudyPlanner;
