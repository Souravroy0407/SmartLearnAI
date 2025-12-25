export type EnergyPreference = 'morning' | 'afternoon' | 'night' | 'none';

export interface TimeSlot {
    start: number; // Hour 0-23
    end: number;
    type: 'peak' | 'low' | 'neutral';
}

export interface StudyTask {
    id: number;
    goal_id?: number; // Added for consistency
    title: string;
    task_type: string; // 'Revision' | 'Practice' | 'Video Lecture' | etc.
    start_time: string; // ISO string
    duration_minutes: number;
    status: string;
    color: string;
    energy_tag?: 'peak' | 'low';
    // New fields
    priority?: 'high' | 'medium' | 'low';
    difficulty_feedback?: 'easy' | 'hard' | 'neutral';
    is_locked?: boolean;
}

export interface OptimizationResult {
    optimizedTasks: StudyTask[];
    explanation: string;
}

export const getEnergySlots = (preference: EnergyPreference): TimeSlot[] => {
    switch (preference) {
        case 'morning':
            return [
                { start: 6, end: 10, type: 'peak' },
                { start: 16, end: 21, type: 'low' }
            ];
        case 'afternoon':
            return [
                { start: 12, end: 16, type: 'peak' },
                { start: 8, end: 11, type: 'low' }
            ];
        case 'night':
            return [
                { start: 19, end: 23, type: 'peak' },
                { start: 13, end: 17, type: 'low' }
            ];
        default:
            return [];
    }
};

export const classifyTaskDifficulty = (taskType: string, title: string, feedback?: string): 'high' | 'low' | 'neutral' => {
    // Explicit User Feedback overrides everything
    if (feedback === 'hard') return 'high';
    if (feedback === 'easy') return 'low';

    const lowerType = taskType.toLowerCase();
    const lowerTitle = title.toLowerCase();

    // High Focus: New concepts, numericals, problem solving, assignments
    if (
        lowerType.includes('new concept') ||
        lowerType.includes('problem solving') ||
        lowerType.includes('numerical') ||
        lowerType.includes('hard') ||
        lowerType.includes('assignment') ||
        lowerType.includes('project') ||
        lowerTitle.includes('difficult') ||
        lowerTitle.includes('chapter')
    ) {
        return 'high';
    }

    // Low Focus: Revision, formula review, notes, video
    if (
        lowerType.includes('revision') ||
        lowerType.includes('review') ||
        lowerType.includes('notes') ||
        lowerType.includes('easy') ||
        lowerType.includes('video') ||
        lowerTitle.includes('quick') ||
        lowerTitle.includes('intro')
    ) {
        return 'low';
    }

    return 'neutral';
};

/**
 * Optimizes the schedule by:
 * 1. Keeping LOCKED tasks in their place.
 * 2. Scheduling floating tasks around them, respecting Priority and Energy.
 */
export const optimizeSchedule = (tasks: StudyTask[], preference: EnergyPreference | null): OptimizationResult => {
    if (!tasks || tasks.length === 0) return { optimizedTasks: [], explanation: '' };

    // Separate Locked and Floating tasks
    const lockedTasks = tasks.filter(t => t.is_locked);
    const floatingTasks = tasks.filter(t => !t.is_locked);

    let explanation = "Schedule balanced.";
    let startHour = 9;

    if (preference === 'morning') {
        startHour = 6;
        explanation = "Schedule optimized for Morning energy.";
    } else if (preference === 'afternoon') {
        startHour = 12;
        explanation = "Schedule optimized for Afternoon energy.";
    } else if (preference === 'night') {
        startHour = 19;
        explanation = "Schedule optimized for Night energy.";
    } else {
        explanation = "Schedule evenly distributed.";
    }

    if (lockedTasks.length > 0) {
        explanation += " Manual overrides respected.";
    }

    // Sort Floating Tasks by Priority first, then Difficulty
    if (preference && preference !== 'none') {
        floatingTasks.sort((a, b) => {
            // Priority Value: High=3, Medium=2, Low=1
            const getPrioVal = (p?: string) => p === 'high' ? 3 : (p === 'low' ? 1 : 2);
            const pA = getPrioVal(a.priority);
            const pB = getPrioVal(b.priority);

            if (pA !== pB) return pB - pA; // Higher priority first

            // If priority same, sort by difficulty
            const diffA = classifyTaskDifficulty(a.task_type, a.title, a.difficulty_feedback);
            const diffB = classifyTaskDifficulty(b.task_type, b.title, b.difficulty_feedback);

            const score = (d: string) => d === 'high' ? 2 : (d === 'neutral' ? 1 : 0);
            return score(diffB) - score(diffA);
        });
    }

    // Prepare Timeline
    const energySlots = preference && preference !== 'none' ? getEnergySlots(preference) : [];
    const baseDate = new Date(tasks[0].start_time); // Use day of first task
    baseDate.setHours(startHour, 0, 0, 0);

    let currentTime = new Date(baseDate);
    const resultTasks: StudyTask[] = [...lockedTasks]; // Start with locked tasks

    // Helper: Check if a time range overlaps with any Locked Task
    const isOverlapping = (start: Date, durationMinutes: number): boolean => {
        const end = new Date(start.getTime() + durationMinutes * 60000);
        for (const locked of lockedTasks) {
            const lStart = new Date(locked.start_time);
            const lEnd = new Date(lStart.getTime() + locked.duration_minutes * 60000);
            // Overlap condition: (StartA < EndB) and (EndA > StartB)
            if (start < lEnd && end > lStart) {
                return true;
            }
        }
        return false;
    };

    // Helper: Find next available slot for a task
    const findNextSlot = (durationMinutes: number): Date => {
        let candidate = new Date(currentTime);
        // Safety break to prevent infinite loops (e.g. check max 24 hours ahead)
        let attempts = 0;
        while (isOverlapping(candidate, durationMinutes) && attempts < 100) {
            // Move forward by 15 mins if conflict
            candidate = new Date(candidate.getTime() + 15 * 60000);
            attempts++;
        }
        return candidate;
    };

    // Schedule Floating Tasks
    for (const task of floatingTasks) {
        const slotStart = findNextSlot(task.duration_minutes);

        // Update current time pointer for next task (sequential stacking)
        currentTime = new Date(slotStart.getTime() + task.duration_minutes * 60000);

        // Assign Energy Tag
        const hour = slotStart.getHours();
        let energyTag: 'peak' | 'low' | undefined = undefined;
        if (preference && preference !== 'none') {
            for (const slot of energySlots) {
                if (hour >= slot.start && hour < slot.end) {
                    energyTag = slot.type === 'peak' ? 'peak' : 'low';
                    break;
                }
            }
        }

        resultTasks.push({
            ...task,
            start_time: slotStart.toISOString(),
            energy_tag: energyTag
        });
    }

    // Also re-tag locked tasks based on their fixed position
    const finalTasks = resultTasks.map(task => {
        if (task.is_locked) {
            const tStart = new Date(task.start_time);
            const hour = tStart.getHours();
            let tag: 'peak' | 'low' | undefined = undefined;
            if (energySlots.length > 0) {
                for (const slot of energySlots) {
                    if (hour >= slot.start && hour < slot.end) {
                        tag = slot.type === 'peak' ? 'peak' : 'low';
                        break;
                    }
                }
            }
            return { ...task, energy_tag: tag };
        }
        return task;
    });

    // Sort Chronologically
    finalTasks.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    return { optimizedTasks: finalTasks, explanation };
};

// Deprecated, keeping for backward compat if needed, but `optimizeSchedule` replaces it.
export const reorderTasksBasedOnEnergy = (tasks: StudyTask[], preference: EnergyPreference): StudyTask[] => {
    return optimizeSchedule(tasks, preference).optimizedTasks;
};

