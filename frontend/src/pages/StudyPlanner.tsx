import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, MoreVertical, Plus, Sparkles, Clock, Loader2, Trash2, X, Edit3, Calendar as CalendarIcon, RotateCw, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../api/axios';
import CreateTaskModal from '../components/CreateTaskModal';
import CreateGoalModal from '../components/CreateGoalModal';
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
        ensureDataLoaded,
        updateTask: contextUpdateTask,
        updateTasksBulk: contextUpdateTasksBulk,
        deleteTask: contextDeleteTask,
        setUserEnergyPref,
        refreshGoals,
        refreshAll,
        addTasksBulk
    } = useStudyPlanner();

    // Local UI State
    const [isGoalsExpanded, setIsGoalsExpanded] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isMuted, setIsMuted] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [isPeakHourModalOpen, setIsPeakHourModalOpen] = useState(false);
    const [isEnergyModalOpen, setIsEnergyModalOpen] = useState(false);

    const [isOptimizing, setIsOptimizing] = useState(false);
    const [activeMenuTaskId, setActiveMenuTaskId] = useState<number | null>(null);
    const [menuPlacement, setMenuPlacement] = useState<'top' | 'bottom'>('bottom');
    const [taskToDelete, setTaskToDelete] = useState<StudyTask | null>(null);
    const [goalToDelete, setGoalToDelete] = useState<any>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeletingGoal, setIsDeletingGoal] = useState(false);
    const [isDeletingTask, setIsDeletingTask] = useState(false); // Task Deletion Loading State
    const [isUpdatingTask, setIsUpdatingTask] = useState(false); // Task Update Loading State (Reschedule)
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [taskToReschedule, setTaskToReschedule] = useState<StudyTask | null>(null);
    const [taskToRescheduleAI, setTaskToRescheduleAI] = useState<StudyTask | null>(null);
    const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
    const [isFetchingAI, setIsFetchingAI] = useState(false);

    // Initial Data Load
    useEffect(() => {
        ensureDataLoaded();
    }, []);

    // Derived State: Is Selected Date an Exam Day or Revision Day?
    const { isExamDay, isRevisionDay, isAfterAllExams } = useMemo(() => {
        const startOfSelected = new Date(selectedDate);
        startOfSelected.setHours(0, 0, 0, 0);

        const allExamDates = exams.map(e => {
            const d = new Date(e.exam.deadline);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        });

        const tomorrow = new Date(startOfSelected);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const maxExamDate = allExamDates.length > 0 ? Math.max(...allExamDates) : 0;

        return {
            isExamDay: allExamDates.includes(startOfSelected.getTime()),
            isRevisionDay: allExamDates.includes(tomorrow.getTime()),
            isAfterAllExams: maxExamDate > 0 && startOfSelected.getTime() > maxExamDate
        };
    }, [selectedDate, exams]);

    // Derived State: Filter Tasks for Selected Date
    // Derived State: Filter Tasks for Selected Date
    const dailyTasks = useMemo(() => {
        // if (isAfterAllExams) return []; // Removed to allow tasks beyond exam dates (e.g. generic goals)

        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const formattedSelected = `${year}-${month}-${day}`;

        return allTasks.filter(t => {
            // Robust check: Compare date strings directly (YYYY-MM-DD)
            // This prevents timezone mishaps with UTC timestamps
            if (t.task_date) {
                return t.task_date === formattedSelected;
            }

            // Fallback for legacy tasks without task_date (shouldn't exist anymore for new tasks)
            const tDate = new Date(t.start_time);
            return tDate.getDate() === selectedDate.getDate() &&
                tDate.getMonth() === selectedDate.getMonth() &&
                tDate.getFullYear() === selectedDate.getFullYear();
        });
    }, [allTasks, selectedDate, isAfterAllExams]);

    // Derived State: Daily Goal Stats
    const { completedCount, totalCount, progress } = useMemo(() => {
        const total = dailyTasks.length;
        const completed = dailyTasks.filter(t => t.status?.toLowerCase() === 'completed').length;
        return {
            completedCount: completed,
            totalCount: total,
            progress: total === 0 ? 0 : Math.round((completed / total) * 100)
        };
    }, [dailyTasks]);

    const handleRefresh = async () => {
        setIsMuted(true);
        try {
            await refreshAll();
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
            // Guard: No peak hour updates allowed on/after exam days for study tasks
            if (isExamDay) {
                showToast("Cannot reschedule study tasks on your exam day.", "error");
                setIsPeakHourModalOpen(false);
                return;
            }

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

                // If it's a revision day, we strictly enforce 'Revision' task type
                const taskType = isRevisionDay ? 'Revision' : task.task_type;

                // Check if task fits in peak window (including buffer check)
                if (!isInOverflow && (currentPointer.getTime() + taskDurationMs) <= peakEnd.getTime()) {
                    // Phase 1: Peak Allocation
                    updatedTasks.push({
                        ...task,
                        task_type: taskType,
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
                        task_type: taskType,
                        start_time: currentPointer.toISOString(),
                        color: 'bg-primary' // Standard overflow color
                    });
                    currentPointer = new Date(currentPointer.getTime() + (task.duration_minutes + bufferMinutes) * 60000);
                }
            });

            // 6. Batch Update Context
            contextUpdateTasksBulk(updatedTasks);
            setUserEnergyPref(preference);
            showToast(isRevisionDay ? `Schedule optimized for Revision!` : `Schedule optimized for ${preference}!`, "success");
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

        // Toggle status: 'completed' <-> 'pending'
        const isNowCompleted = currentStatus !== 'completed';
        const newStatus = isNowCompleted ? 'completed' : 'pending';

        // Update color based on status (success for completed, original/primary if pending)
        // Note: Ideally we'd restore original priority color, but defaulting to primary is safe fallback
        // If we want to preserve original color, we might need a separate field or logic.
        // For now, let's assume 'bg-success' for completed, and revert to 'bg-primary' for pending 
        // unless we know the original. A better approach is to keep color as priority and use a separate UI style for completion.
        // However, the existing UI uses color for completion status too.

        const updatedTask = {
            ...task,
            status: newStatus,
            color: isNowCompleted ? 'bg-success' : 'bg-primary'
        };

        try {
            // Optimistic update via Context
            contextUpdateTask(updatedTask);

            if (task.is_manual) {
                // Unified endpoint handles both, but context logic separates them slightly?
                // Actually the unified update endpoint `PUT /api/study-planner/tasks/{id}` works for both now.
                // Reverting to unified call.
                await api.put(`/api/study-planner/tasks/${taskId}`, { status: newStatus });
            } else {
                await api.put(`/api/study-planner/tasks/${taskId}`, { status: newStatus });
            }
        } catch (error) {
            console.error("Error updating task:", error);
            contextUpdateTask(task); // Revert on error
            showToast('Failed to update status', 'error');
        }
    };

    const handleDeleteTask = async () => {
        if (!taskToDelete) return;

        setIsDeletingTask(true); // Start loading

        try {
            console.log("Deleting task_id:", taskToDelete.task_id);

            // Conditional delete based on source_type (backend task_type)
            if (taskToDelete.source_type === 'manual') {
                await api.delete(`/api/study-planner/tasks/manual/${taskToDelete.task_id}`);
            } else {
                // Default to AI task deletion (covers 'ai' and fallback)
                await api.delete(`/api/study-planner/tasks/ai/${taskToDelete.task_id}`);
            }

            // Update state ONLY after successful API response
            // Note: Context still uses internal 'id' for state management
            contextDeleteTask(taskToDelete.id);
            setTaskToDelete(null); // Close modal only on success
            showToast('Task deleted', 'success');
        } catch (error) {
            console.error("Error deleting task:", error);
            showToast('Failed to delete task', 'error');
            // Do not close modal on error so user can retry
        } finally {
            setIsDeletingTask(false); // Stop loading in all cases
        }
    };

    const showToast = (message: string, type: ToastType) => {
        setToast({ message, type });
    };


    // Exam deletion functions removed as they are no longer used

    const handleDeleteGoal = (goalItem: any) => {
        setGoalToDelete(goalItem);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteGoal = async () => {
        if (!goalToDelete) return;

        setIsDeleteModalOpen(false); // Close confirm modal immediately to show loading screen
        setIsDeletingGoal(true); // Show loading screen

        try {
            await api.delete(`/api/goals/${goalToDelete.exam.id}`);

            // Optimistic update handled by refreshGoals
            await refreshGoals();
            await refreshAll(); // Clear related tasks from calendar

            setGoalToDelete(null);
            showToast('Goal deleted successfully', 'success');
        } catch (error) {
            console.error("Error deleting goal:", error);
            showToast('Failed to delete goal', 'error');
        } finally {
            setIsDeletingGoal(false); // Hide loading screen
        }
    };

    const handleRescheduleSave = async (updatedTaskPart: Partial<StudyTask>) => {
        if (!taskToReschedule) return;

        setIsUpdatingTask(true);

        try {
            // Updated Context with ALL fields (Optimistic UI - Color, Date, Time, Duration)
            const task = allTasks.find(t => t.id === taskToReschedule.id);
            if (task) {
                const optimisticUpdates = { ...updatedTaskPart };

                // CRITICAL: Sync task_date if start_time changed
                // This ensures the task moves to the correct day in the UI immediately
                if (optimisticUpdates.start_time) {
                    optimisticUpdates.task_date = optimisticUpdates.start_time.split('T')[0];
                }

                contextUpdateTask({ ...task, ...optimisticUpdates });
            }

            // Prepare Strict API Payload (DB Fields Only)
            // Backend Schema: { task_date: str, task_time: datetime, duration_minutes: int }
            if (updatedTaskPart.start_time && updatedTaskPart.duration_minutes) {

                // STEP 7: Add Safety Guards
                // Ensure critical IDs and Types exist before calling API
                if (!taskToReschedule.task_id) {
                    console.warn("Safety Check Failed: Missing task_id for reschedule.");
                    setIsUpdatingTask(false);
                    return; // Abort silently/log only
                }

                if (!taskToReschedule.source_type) {
                    console.warn("Safety Check Failed: Missing source_type for reschedule.");
                    setIsUpdatingTask(false);
                    return;
                }

                const apiPayload = {
                    task_date: updatedTaskPart.start_time.split('T')[0],
                    task_time: updatedTaskPart.start_time,
                    duration_minutes: updatedTaskPart.duration_minutes
                };

                // STEP 5: Conditional API Call Logic
                if (taskToReschedule.source_type === 'manual') {
                    await api.put(`/api/study-planner/tasks/manual/${taskToReschedule.task_id}`, apiPayload);
                } else {
                    // Default to AI/Regular tasks
                    await api.put(`/api/study-planner/tasks/ai/${taskToReschedule.task_id}`, apiPayload);
                }

                setTaskToReschedule(null);
                setIsUpdatingTask(false);
                showToast('Task rescheduled', 'success');
            } else {
                console.warn("Safety Check Failed: Missing start_time or duration_minutes for reschedule payload.");
                setIsUpdatingTask(false);
                // throw new Error("Missing required fields for reschedule"); // Removed to prevent crash
            }

        } catch (error) {
            console.error("Error updating task:", error);
            refreshAll(); // Revert
            setIsUpdatingTask(false);
            showToast('Failed to reschedule', 'error');
        }
    };

    // --- Smart Local Rescheduling Logic ---
    // --- Smart Local Rescheduling Logic (Optimized) ---
    const findSmartSlots = (taskToMove: StudyTask) => {
        const slotsFound = [];
        const taskDate = new Date(taskToMove.start_time);

        // 1. Determine Week Range
        const currentDay = taskDate.getDay();
        const diffToMon = currentDay === 0 ? -6 : 1 - currentDay;

        const monday = new Date(taskDate);
        monday.setDate(taskDate.getDate() + diffToMon);
        monday.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Optimization: Pre-group all tasks by date string (YYYY-MM-DD)
        // This makes the lookup O(1) inside the loop instead of O(N) filtering
        const tasksByDate = new Map<string, StudyTask[]>();

        allTasks.forEach(t => {
            if (t.id === taskToMove.id) return; // Exclude self

            let dateKey = t.task_date;
            if (!dateKey) {
                const d = new Date(t.start_time);
                dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }

            if (!tasksByDate.has(dateKey)) {
                tasksByDate.set(dateKey, []);
            }
            tasksByDate.get(dateKey)?.push(t);
        });

        // check 7 days of the week
        for (let i = 0; i < 7; i++) {
            const checkDate = new Date(monday);
            checkDate.setDate(monday.getDate() + i);

            // 2. Filter Past Dates
            if (checkDate < today) continue;

            const dayString = checkDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;

            // 3. Setup Day Boundaries (8:00 AM - 10:00 PM)
            const dayStart = new Date(checkDate);
            dayStart.setHours(8, 0, 0, 0);

            const dayEnd = new Date(checkDate);
            dayEnd.setHours(22, 0, 0, 0);

            // 4. Get Tasks (O(1) Map Lookup + small Sort)
            const tasksForDay = (tasksByDate.get(dateStr) || [])
                .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

            // 5. Gap Finding
            const requiredDurationMs = taskToMove.duration_minutes * 60 * 1000;
            const bufferMs = 15 * 60 * 1000;
            let currentPointer = dayStart.getTime();
            const daySlots = [];

            for (const t of tasksForDay) {
                const tStart = new Date(t.start_time).getTime();
                const tEnd = tStart + (t.duration_minutes * 60 * 1000);

                // Check gap before this task
                if (currentPointer + requiredDurationMs <= tStart) {
                    daySlots.push({
                        start: new Date(currentPointer).toISOString(),
                        end: new Date(currentPointer + requiredDurationMs).toISOString()
                    });
                }
                currentPointer = Math.max(currentPointer, tEnd + bufferMs);
            }

            // Check after last task
            if (currentPointer + requiredDurationMs <= dayEnd.getTime()) {
                daySlots.push({
                    start: new Date(currentPointer).toISOString(),
                    end: new Date(currentPointer + requiredDurationMs).toISOString()
                });
            }

            if (daySlots.length > 0) {
                slotsFound.push({
                    date: dayString,
                    iso_date: checkDate.toISOString(),
                    slots: daySlots
                });
            }
        }

        return slotsFound;
    };

    const handleRescheduleSmartClick = (task: StudyTask) => {
        setTaskToRescheduleAI(task);
        setIsFetchingAI(true);
        setAiSuggestions([]);

        // Instant execution (No artificial delay)
        // Wrapped in requestAnimationFrame to ensure modal opens smoothly first if needed, 
        // but simple sync call is usually fastest for "instant" feel.
        // We'll use a specific immediate execution.
        try {
            const slots = findSmartSlots(task);
            setAiSuggestions(slots);
        } catch (e) {
            console.error("Error calculating slots", e);
        } finally {
            setIsFetchingAI(false);
        }
    };

    const handleApplySmartSuggestion = async (suggestion: any) => {
        if (!taskToRescheduleAI) return;

        setIsUpdatingTask(true);

        try {
            const payload = {
                task_date: suggestion.iso_start_time.split('T')[0],
                task_time: suggestion.iso_start_time,
                status: taskToRescheduleAI.status
            };

            // Calculate new end time for state update
            // Optimistic Update
            contextUpdateTask({
                ...taskToRescheduleAI,
                start_time: suggestion.iso_start_time
                // end_time is not tracked in frontend state explicitly for StudyTask,
                // it is derived or backend only.
            });

            // Conditional API Call for AI Tasks (or Manual if triggered here)
            if (taskToRescheduleAI.source_type === 'manual') {
                await api.put(`/api/study-planner/tasks/manual/${taskToRescheduleAI.task_id}`, payload);
            } else {
                await api.put(`/api/study-planner/tasks/ai/${taskToRescheduleAI.task_id}`, payload);
            }

            showToast('Rescheduled successfully', 'success');
            setTaskToRescheduleAI(null); // Close modal
            setIsUpdatingTask(false);
        } catch (error) {
            console.error("Failed to apply smart suggestion", error);
            // Revert on error (fetch fresh)
            refreshAll();
            showToast('Failed to reschedule', 'error');
            setIsUpdatingTask(false);
        }
    };

    // Close menu when clicking outside or pressing Escape
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuTaskId(null);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setActiveMenuTaskId(null);
        };

        window.addEventListener('click', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('click', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
        };
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
                                        const selectedIndex = calendarDays.findIndex(d =>
                                            d.fullDate.getDate() === selectedDate.getDate() &&
                                            d.fullDate.getMonth() === selectedDate.getMonth() &&
                                            d.fullDate.getFullYear() === selectedDate.getFullYear()
                                        );
                                        if (selectedIndex > 0) {
                                            setSelectedDate(calendarDays[selectedIndex - 1].fullDate);
                                        }
                                    }}
                                    disabled={calendarDays.length === 0 ||
                                        calendarDays.findIndex(d =>
                                            d.fullDate.getDate() === selectedDate.getDate() &&
                                            d.fullDate.getMonth() === selectedDate.getMonth() &&
                                            d.fullDate.getFullYear() === selectedDate.getFullYear()
                                        ) <= 0}
                                    className="p-2 hover:bg-secondary-light/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-5 h-5 text-secondary rotate-180" />
                                </button>
                                <button
                                    onClick={() => {
                                        const selectedIndex = calendarDays.findIndex(d =>
                                            d.fullDate.getDate() === selectedDate.getDate() &&
                                            d.fullDate.getMonth() === selectedDate.getMonth() &&
                                            d.fullDate.getFullYear() === selectedDate.getFullYear()
                                        );
                                        if (selectedIndex < calendarDays.length - 1 && selectedIndex !== -1) {
                                            setSelectedDate(calendarDays[selectedIndex + 1].fullDate);
                                        }
                                    }}
                                    disabled={calendarDays.length === 0 ||
                                        calendarDays.findIndex(d =>
                                            d.fullDate.getDate() === selectedDate.getDate() &&
                                            d.fullDate.getMonth() === selectedDate.getMonth() &&
                                            d.fullDate.getFullYear() === selectedDate.getFullYear()
                                        ) >= calendarDays.length - 1}
                                    className="p-2 hover:bg-secondary-light/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-secondary-dark">
                                    Schedule for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                </h3>
                            </div>
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
                                {dailyTasks.map((task, index) => {
                                    // SAFE COLOR LOGIC:
                                    // AI tasks do not have colourtag, Manual tasks do.
                                    // We fallback to 'bg-primary' to prevent crashes.
                                    const taskColor = (task as any).colourtag || task.color || 'bg-primary';

                                    return (
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

                                            <div className={`w-1.5 h-12 rounded-full ${taskColor} opacity-20 group-hover:opacity-100 transition-opacity`}></div>

                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${taskColor.replace('bg-', 'bg-')}/10 text-${taskColor.replace('bg-', '')}`}>
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
                                                        // Smart Positioning Logic
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        const spaceBelow = window.innerHeight - rect.bottom;
                                                        const menuHeight = 200; // Approximate height

                                                        // Prefer DOWN, fallback UP if not enough space
                                                        setMenuPlacement(spaceBelow < (menuHeight + 20) ? 'top' : 'bottom');

                                                        setActiveMenuTaskId(activeMenuTaskId === task.id ? null : task.id);
                                                    }}
                                                    className="p-2 text-secondary-light hover:text-secondary hover:bg-secondary-light/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>

                                                {activeMenuTaskId === task.id && (
                                                    <div
                                                        className={`absolute right-0 w-56 bg-white rounded-xl shadow-lg border border-secondary-light/20 overflow-hidden z-10 ${menuPlacement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
                                                            }`}
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
                                                                handleRescheduleSmartClick(task);
                                                                setActiveMenuTaskId(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-secondary-dark hover:bg-secondary-light/5 transition-colors border-b border-secondary-light/10"
                                                        >
                                                            <Sparkles className="w-4 h-4" />
                                                            Smart Reschedule
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
                                    );
                                })}
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
                            <span className="text-4xl font-bold text-primary">{completedCount}</span>
                            <span className="text-lg text-secondary-light font-medium mb-1">/ {totalCount} tasks</span>
                        </div>

                        <div className="w-full h-3 bg-secondary-light/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>

                        <p className="text-xs text-secondary mt-4 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-warning" />
                            {completedCount === totalCount && totalCount > 0
                                ? "All caught up! Great job!"
                                : "Keep going, you're doing great!"}
                        </p>
                    </div>

                    {/* Upcoming Exams Section */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-secondary-light/20">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-secondary-dark">Your Goals</h3>
                            <button
                                onClick={() => setIsGoalModalOpen(true)}
                                className="text-sm text-primary font-bold hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                + Create Goal
                            </button>
                        </div>

                        {exams.length === 0 ? (
                            <div className="p-4 bg-secondary-light/5 rounded-xl border border-dashed border-secondary-light/20 text-center">
                                <p className="text-sm text-secondary">No upcoming exams found.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {(isGoalsExpanded ? exams : exams.slice(0, 2)).map((item) => {
                                    // Handle null/invalid dates. If deadline is null, we treat as no date.
                                    // In Context we map null to null, but here we passed it to new Date().
                                    // Let's ensure context passes a value that new Date() handles or check here.
                                    // Actually context passes null, new Date(null) is 1970.
                                    const examDate = item.exam.deadline ? new Date(item.exam.deadline) : new Date(0); // 1970 fallback

                                    const today = new Date();
                                    const diffTime = examDate.getTime() - today.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                    return (
                                        <div key={item.exam.id} className="relative flex gap-4 items-center p-4 hover:bg-secondary-light/5 rounded-2xl transition-colors group cursor-default">
                                            {/* Column 1: Redesigned Date Badge */}
                                            {/* [ 24 ] \n Wed \n 2025 */}
                                            <div className={`flex flex-col items-center justify-center w-16 px-1 py-2 rounded-2xl border flex-shrink-0 ${examDate.getFullYear() === 1970
                                                ? 'bg-secondary-light/5 text-secondary-light border-secondary-light/10'
                                                : 'bg-white text-secondary-dark border-secondary-light/20 shadow-sm'}`}>
                                                {examDate.getFullYear() === 1970 ? (
                                                    <CalendarIcon className="w-6 h-6 opacity-50" />
                                                ) : (
                                                    <>
                                                        <span className="text-2xl font-bold leading-none mb-1">{examDate.getDate()}</span>
                                                        <div className="flex flex-col items-center leading-none gap-0.5">
                                                            <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                                                                {examDate.toLocaleDateString('en-US', { weekday: 'short' })}
                                                            </span>
                                                            <span className="text-[10px] font-medium text-secondary-light">
                                                                {examDate.getFullYear()}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Column 2: Goal Info (Single Flex Area) */}
                                            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                                <h4 className="font-bold text-secondary-dark text-base leading-tight truncate" title={item.exam.title}>
                                                    {item.exam.title}
                                                </h4>

                                                {/* Single Row: Type Pill + Countdown */}
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${item.status.toLowerCase() === 'exam'
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'bg-secondary/10 text-secondary'
                                                        }`}>
                                                        {item.status}
                                                    </span>

                                                    {/* Countdown (Inline) */}
                                                    {item.status.toLowerCase() === 'exam' && item.goal_status !== 'completed' && examDate.getFullYear() !== 1970 && (
                                                        <span className={`text-xs font-bold whitespace-nowrap ${diffDays <= 3 ? 'text-error' :
                                                            diffDays <= 7 ? 'text-warning' :
                                                                'text-secondary-light'
                                                            }`}>
                                                            {diffDays < 0 ? 'Done' : diffDays === 0 ? 'Today' : `${diffDays} days left`}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Delete Button (Hover Only) */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteGoal(item);
                                                }}
                                                className="absolute top-2 right-2 p-1.5 text-secondary-light/50 hover:text-error hover:bg-error/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                                                title="Delete Goal"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })}

                                {exams.length > 2 && (
                                    <button
                                        onClick={() => setIsGoalsExpanded(!isGoalsExpanded)}
                                        className="w-full flex items-center justify-center gap-1.5 text-sm font-bold text-secondary hover:text-primary mt-2 transition-colors py-2 rounded-xl hover:bg-secondary/5"
                                    >
                                        {isGoalsExpanded ? (
                                            <>
                                                Show Less <ChevronUp className="w-4 h-4" />
                                            </>
                                        ) : (
                                            <>
                                                Show {exams.length - 2} More <ChevronDown className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            <CreateTaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onTaskCreated={() => refreshAll()}
                selectedDate={selectedDate}
            />

            <CreateGoalModal
                isOpen={isGoalModalOpen}
                onClose={() => setIsGoalModalOpen(false)}
                onGoalCreated={() => {
                    refreshGoals();
                }}
            />

            <GeneratePlanModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                onPlanGenerated={(newTasks) => {
                    addTasksBulk(newTasks);
                    refreshGoals(); // Refresh goals to ensure consistency/status updates if any
                }}
                goals={exams.map(e => ({ id: e.exam.id, title: e.exam.title }))}
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
                                        disabled={isDeletingTask}
                                        className="flex-1 px-4 py-3 border border-secondary-light/30 text-secondary-dark font-medium rounded-xl hover:bg-secondary-light/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteTask}
                                        disabled={isDeletingTask}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-error text-white font-medium rounded-xl hover:bg-error/90 transition-colors shadow-lg shadow-error/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isDeletingTask ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Deleting...
                                            </>
                                        ) : (
                                            'Delete Task'
                                        )}
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
                        onSelect={handleApplySmartSuggestion}
                    />
                )
            }

            {/* Delete Goal Confirmation Modal */}
            {
                isDeleteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full"
                        >
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center text-error mb-2">
                                    <Trash2 className="w-6 h-6" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-secondary-dark mb-2">Delete Goal?</h3>
                                    <p className="text-sm text-secondary">
                                        Are you sure you want to delete <span className="font-bold">"{goalToDelete?.exam.title}"</span>?
                                        This will permanently remove the study plan and all associated tasks.
                                    </p>
                                </div>

                                <div className="flex gap-3 w-full mt-2">
                                    <button
                                        onClick={() => setIsDeleteModalOpen(false)}
                                        className="flex-1 py-3 px-4 rounded-xl font-bold text-secondary bg-secondary-light/10 hover:bg-secondary-light/20 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDeleteGoal}
                                        className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-error hover:bg-error/90 shadow-lg shadow-error/20 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )
            }

            {/* Deleting Goal Overlay */}
            {isDeletingGoal && (
                <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm text-center"
                    >
                        <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mb-4">
                            <Loader2 className="w-8 h-8 text-error animate-spin" />
                        </div>
                        <h3 className="text-xl font-bold text-secondary-dark mb-2">Deleting your goal...</h3>
                        <p className="text-secondary-light">Please wait. This may take a moment while we clean up your schedule.</p>
                    </motion.div>
                </div>
            )}

            {/* Updating Task Overlay */}
            {isUpdatingTask && (
                <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm text-center"
                    >
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                        <h3 className="text-xl font-bold text-secondary-dark mb-2">Updating task...</h3>
                        <p className="text-secondary-light">Applying your schedule changes.</p>
                    </motion.div>
                </div>
            )}
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

// AI/Smart Reschedule Modal
function RescheduleAIModal({ task, suggestions, isLoading, onClose, onSelect }: { task: StudyTask | null, suggestions: any[], isLoading: boolean, onClose: () => void, onSelect: (s: any) => void }) {
    const [selectedDateIdx, setSelectedDateIdx] = useState<number | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<any | null>(null);

    // Auto-select first date when suggestions load
    useEffect(() => {
        if (suggestions.length > 0 && selectedDateIdx === null) {
            setSelectedDateIdx(0);
        }
    }, [suggestions]);

    const activeDate = selectedDateIdx !== null ? suggestions[selectedDateIdx] : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col md:flex-row max-h-[80vh]"
            >
                {/* Left Column: Date Selection */}
                <div className="w-full md:w-1/3 bg-secondary-light/5 border-r border-secondary-light/10 p-6 flex flex-col">
                    <div className="mb-6">
                        <div className="flex items-center gap-2 text-secondary-dark mb-4">
                            <Sparkles className="w-5 h-5 text-primary" />
                            <h3 className="text-lg font-bold">Smart Reschedule</h3>
                        </div>
                        <p className="text-xs font-bold text-secondary-light uppercase tracking-wider mb-1">Task</p>
                        <h4 className="text-sm font-bold text-secondary-dark line-clamp-2">{task?.title}</h4>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        <p className="text-xs font-bold text-secondary-light uppercase tracking-wider mb-2">Available Dates</p>
                        {isLoading ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-16 bg-secondary-light/10 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : suggestions.length > 0 ? (
                            suggestions.map((s, i) => {
                                const dateObj = new Date(s.iso_date);
                                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                                const dayNum = dateObj.getDate();
                                const isSelected = selectedDateIdx === i;

                                return (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setSelectedDateIdx(i);
                                            setSelectedSlot(null);
                                        }}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${isSelected
                                            ? 'bg-white border-primary shadow-md shadow-primary/10'
                                            : 'bg-transparent border-transparent hover:bg-white hover:border-secondary-light/20'
                                            }`}
                                    >
                                        <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-lg ${isSelected ? 'bg-primary text-white' : 'bg-secondary-light/10 text-secondary'
                                            }`}>
                                            <span className="text-[10px] font-bold uppercase leading-none">{dayName}</span>
                                            <span className="text-sm font-bold leading-none">{dayNum}</span>
                                        </div>
                                        <div>
                                            <span className={`text-sm font-bold block ${isSelected ? 'text-primary' : 'text-secondary-dark'}`}>
                                                {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                            <span className="text-xs text-secondary-light">{s.slots.length} slots found</span>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="p-4 bg-secondary-light/10 text-secondary text-xs rounded-xl text-center">
                                No dates found this week.
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="mt-4 w-full py-3 border border-secondary-light/20 text-secondary font-bold rounded-xl hover:bg-white transition-colors text-sm"
                    >
                        Cancel
                    </button>
                </div>

                {/* Right Column: Slot Selection */}
                <div className="flex-1 p-6 flex flex-col bg-white">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-secondary-dark">
                            {activeDate
                                ? `Select time for ${new Date(activeDate.iso_date).toLocaleDateString('en-US', { weekday: 'long' })}`
                                : 'Select a date'}
                        </h3>
                        <button onClick={onClose} className="md:hidden p-2 hover:bg-secondary-light/10 rounded-full transition-colors">
                            <X className="w-5 h-5 text-secondary" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2">
                        {activeDate ? (
                            <div className="grid grid-cols-2 gap-3">
                                {activeDate.slots.map((slot: any, idx: number) => {
                                    const start = new Date(slot.start);
                                    const end = new Date(slot.end);
                                    const isSelected = selectedSlot === slot;

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedSlot(slot)}
                                            className={`p-4 rounded-xl border-2 transition-all text-left ${isSelected
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                : 'border-secondary-light/10 hover:border-primary/30 hover:bg-secondary-light/5'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <Clock className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-secondary-light'}`} />
                                                <span className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-secondary-dark'}`}>
                                                    {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <span className="text-xs text-secondary-light block pl-6">
                                                To {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-secondary-light/50">
                                <Clock className="w-12 h-12 mb-2 opacity-50" />
                                <p className="text-sm">Select a date to view available slots</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 pt-6 border-t border-secondary-light/10 flex justify-end">
                        <button
                            onClick={() => {
                                if (selectedSlot) {
                                    onSelect({ iso_start_time: selectedSlot.start });
                                }
                            }}
                            disabled={!selectedSlot}
                            className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Confirm Reschedule
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default StudyPlanner;
