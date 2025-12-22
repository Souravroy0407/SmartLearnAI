import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import Modal from './Modal';
import api from '../api/axios';

interface GeneratePlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPlanGenerated: () => void;
    energyPreference?: string | null;
}

const GeneratePlanModal = ({ isOpen, onClose, onPlanGenerated, energyPreference }: GeneratePlanModalProps) => {
    const [subject, setSubject] = useState('');
    const [topics, setTopics] = useState('');
    const [startDate, setStartDate] = useState('');
    const [examDate, setExamDate] = useState('');
    const [hoursPerDay, setHoursPerDay] = useState(2);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGenerating(true);
        setError('');

        try {
            await api.post('/api/study-planner/generate', {
                subject,
                topics,
                start_date: startDate,
                exam_date: examDate,
                hours_per_day: Number(hoursPerDay),
                energy_preference: energyPreference
            });
            onPlanGenerated();
            onClose();
            // Reset form
            setSubject('');
            setTopics('');
            setExamDate('');
        } catch (err) {
            console.error("Failed to generate plan:", err);
            setError('Failed to generate plan. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

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
                if (startDate && examDate && startDate >= examDate) {
                    e.preventDefault();
                    setError("Start Date must be before Exam Date");
                    return;
                }
                handleSubmit(e);
            }} className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-secondary-dark leading-relaxed">
                        Describe what you need to study, and our AI will create a personalized schedule for you, balancing revision, practice, and learning.
                    </p>
                </div>

                {error && (
                    <div className="bg-error/10 text-error text-sm p-3 rounded-lg">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-secondary-dark mb-1">Subject</label>
                    <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-secondary-light/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="e.g., Physics, History, Calculus"
                    />
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
                            min={new Date().toISOString().split('T')[0]} // Optional: Prevent past dates
                            className="w-full px-4 py-2 rounded-xl border border-secondary-light/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-secondary-dark mb-1">Exam Date</label>
                        <input
                            type="date"
                            required
                            value={examDate}
                            onChange={(e) => setExamDate(e.target.value)}
                            min={startDate || new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-2 rounded-xl border border-secondary-light/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
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
