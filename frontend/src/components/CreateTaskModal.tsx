import React, { useState } from 'react';
import Modal from './Modal';
import api from '../api/axios';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskCreated: () => void;
    selectedDate: Date;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, onTaskCreated, selectedDate }) => {
    // Helper to format date as YYYY-MM-DD
    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [title, setTitle] = useState('');
    const [taskDate, setTaskDate] = useState(formatDate(selectedDate));

    const [color, setColor] = useState('bg-primary'); // Renamed/Adjusted label in UI
    const [startTime, setStartTime] = useState('09:00');
    const [duration, setDuration] = useState(60);
    const [loading, setLoading] = useState(false);

    // Update local date when prop changes
    React.useEffect(() => {
        if (isOpen) {
            setTaskDate(formatDate(selectedDate));
        }
    }, [selectedDate, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!title.trim() || !taskDate || !startTime) {
            alert("Please fill in all required fields.");
            return;
        }

        // Prevent past dates
        const todayStr = new Date().toISOString().split('T')[0];
        if (taskDate < todayStr) {
            alert("Cannot create tasks in the past.");
            return;
        }

        setLoading(true);

        try {
            // Combine selected date with time for task_time
            const startDateTime = new Date(`${taskDate}T${startTime}:00`);

            // Validate Date object
            if (isNaN(startDateTime.getTime())) {
                alert("Invalid date or time selected.");
                setLoading(false);
                return;
            }

            // Prepare Payload (No duration, mapped keys)
            const payload = {
                title,
                task_date: taskDate,
                colourtag: color, // Map 'color' state to 'colourtag'
                task_time: `${taskDate}T${startTime}:00`,
                duration_minutes: Number(duration)
            };

            console.log("POST about to be sent", payload);

            // NOTE: Using the newly created manual task endpoint
            await api.post('/api/study-planner/manual', payload);

            console.log("POST completed");

            // Only close and update parent state on success
            if (onTaskCreated) onTaskCreated();
            onClose();

            // Reset form
            setTitle('');
            setStartTime('09:00');
        } catch (error) {
            console.error("Failed to create task", error);
            alert("Failed to create task. Please try again.");
        } finally {
            // Ensure loading state is reset even if component unmounts check relies on React cleanup, 
            // but setting state on unmounted component is the crash risk.
            // Since we wait for onClose, we usually assume modal is still mounted until we close it.
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Task">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Task Title <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="e.g., Physics: Laws of Motion"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Task Date <span className="text-red-500">*</span></label>
                    <input
                        type="date"
                        required
                        min={new Date().toISOString().split('T')[0]} // Restrict past dates
                        value={taskDate}
                        onChange={(e) => setTaskDate(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color Tag</label>
                    <select
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    >
                        <option value="bg-primary">Blue (Primary)</option>
                        <option value="bg-warning">Yellow (Warning)</option>
                        <option value="bg-error">Red (Urgent)</option>
                        <option value="bg-success">Green (Done)</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time <span className="text-red-500">*</span></label>
                        <input
                            type="time"
                            required
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                        <input
                            type="number"
                            required
                            min="1"
                            step="1"
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                    {loading ? 'Saving...' : 'Create Task'}
                </button>
            </form>
        </Modal>
    );
};

export default CreateTaskModal;
