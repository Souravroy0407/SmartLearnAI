import { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import Modal from './Modal';
import api from '../api/axios';

interface GeneratePlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPlanGenerated: (newTasks: any[]) => void;
    goals: { id: number; title: string; deadline?: string }[];
}

const GeneratePlanModal = ({ isOpen, onClose, onPlanGenerated, goals }: GeneratePlanModalProps) => {
    const [selectedGoalId, setSelectedGoalId] = useState<number | ''>('');
    const [topics, setTopics] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [hoursPerDay, setHoursPerDay] = useState(2);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');

    // Derived state: check if selected goal is an exam with a deadline
    const selectedGoal = goals.find(g => g.id === Number(selectedGoalId));
    const isExamGoal = !!(selectedGoal && selectedGoal.deadline);

    // Effect: Enforce End Date Constraint for Exam Goals
    // Rule: End Date = Deadline - 1 Day
    // This runs immediately when a goal is selected
    useEffect(() => {
        if (isExamGoal && selectedGoal?.deadline) {
            const deadlineDate = new Date(selectedGoal.deadline);
            // Subtract 1 day
            deadlineDate.setDate(deadlineDate.getDate() - 1);

            const autoEndDate = deadlineDate.toISOString().split('T')[0];
            setEndDate(autoEndDate);
        }
    }, [selectedGoalId, isExamGoal, selectedGoal]);

    // ... existing handleSubmit ...

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGenerating(true);
        setError('');

        try {
            const response = await api.post('/api/ai/generate-tasks', {
                goal_id: Number(selectedGoalId),
                topics,
                start_date: startDate,
                end_date: endDate,
                hours_per_day: Number(hoursPerDay)
            });
            onPlanGenerated(response.data);
            onClose();
            // Reset form
            setSelectedGoalId('');
            setTopics('');
            setEndDate('');
        } catch (err) {
            console.error("Failed to generate plan:", err);
            setError('Failed to generate plan. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    // ... existing footer ...
    const footer = (
        <div className="flex justify-end gap-3">
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-secondary font-medium hover:bg-secondary-light/10 rounded-xl transition-colors"
                disabled={isGenerating}
            >
                Cancel
            </button>
            <button
                type="submit"
                form="generate-plan-form"
                disabled={isGenerating}
                className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-70"
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                    </>
                ) : (
                    <>
                        <Sparkles className="w-5 h-5" />
                        Generate Plan
                    </>
                )}
            </button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Generate AI Study Plan" footer={footer}>
            <form id="generate-plan-form" onSubmit={(e) => {
                if (startDate && endDate && startDate >= endDate) {
                    e.preventDefault();
                    setError("Start Date must be before End Date");
                    return;
                }
                handleSubmit(e);
            }} className="space-y-4">
                {/* ... existing header ... */}
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-secondary-dark leading-relaxed">
                        Select a goal, describe topics, and let AI build your schedule.
                    </p>
                </div>

                {error && (
                    <div className="bg-error/10 text-error text-sm p-3 rounded-lg">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-secondary-dark mb-1">Select Goal</label>
                    <select
                        required
                        value={selectedGoalId}
                        onChange={(e) => setSelectedGoalId(Number(e.target.value))}
                        className="w-full px-4 py-2 rounded-xl border border-secondary-light/30 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
                    >
                        <option value="" disabled>-- Choose a Goal --</option>
                        {goals.map(g => (
                            <option key={g.id} value={g.id}>{g.title}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-secondary-dark mb-1">Topics to Cover</label>
                    <textarea
                        required
                        value={topics}
                        onChange={(e) => setTopics(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-secondary-light/30 focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px]"
                        placeholder="e.g., Newton's Laws, Rotational Motion, Gravitation..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-secondary-dark mb-1">Start Date</label>
                        <input
                            type="date"
                            required
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-2 rounded-xl border border-secondary-light/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-secondary-dark mb-1">End Date</label>
                        {/* Exam Goal Constraint Logic */}
                        <div className="relative">
                            <input
                                type="date"
                                required
                                value={endDate}
                                onChange={(e) => !isExamGoal && setEndDate(e.target.value)}
                                min={startDate || new Date().toISOString().split('T')[0]}
                                disabled={isExamGoal} // Disable manual edit for exams
                                className={`w-full px-4 py-2 rounded-xl border border-secondary-light/30 focus:outline-none focus:ring-2 focus:ring-primary/50 ${isExamGoal ? 'bg-secondary-light/10 text-secondary cursor-not-allowed' : ''
                                    }`}
                            />
                            {isExamGoal && (
                                <p className="text-[10px] text-primary mt-1 font-medium">
                                    Ends one day before exam.
                                </p>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-secondary-dark mb-1">Hours / Day</label>
                        <input
                            type="number"
                            required
                            min="0.5"
                            max="12"
                            step="0.5"
                            value={hoursPerDay}
                            onChange={(e) => setHoursPerDay(Number(e.target.value))}
                            className="w-full px-4 py-2 rounded-xl border border-secondary-light/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default GeneratePlanModal;
