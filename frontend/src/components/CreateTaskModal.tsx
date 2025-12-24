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
    const [type, setType] = useState('Revision');
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
                task_time: startDateTime.toISOString()
            };

            console.log("POST about to be sent", payload);

            // NOTE: Using the newly created manual task endpoint
            await api.post('/api/tasks/manual', payload);

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
                        value={taskDate}
                        onChange={(e) => setTaskDate(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                    <div>
                        {/* Hidden or optional Type field? User asked for 5 fields. Kept Type as it was there? 
                             User list: Title, Date, Color, Start Time, Duration. 
                             Does not mention Type. I will hide Type or assume Color Tag replaces it?
                             Actually, code had Type AND Color. 
                             User request: "Fields Required: ... 3. Color Tag ...". 
                             It didn't explicitly ask to REMOVE Type. 
                             But strict compliance usually implies "only these fields".
                             However, backend likely needs 'task_type'.
                             I'll keep 'Type' in state but maybe hide it or default it, strictly following UI list?
                             "Fields Required: ...".
                             Let's check if 'Type' was important. It defaults to 'Revision'.
                             I'll assume I should keep it visible OR maybe the user missed it.
                             "Color Tag dropdown - keep existing".
                             "Title - keep existing".
                             I'll keep 'Type' but maybe move it or leave it. 
                             The user didn't say "REMOVE Type".
                             But I'll stick to the visual layout requested: "Manual Create Task UI ... Fields Required..."
                             I will keep 'Color Tag' prominently. 
                             I'll comment out Type UI to be safe with "Fields Required" list, defaulting strictly to 'Revision'.
                             Wait, if I remove Type UI, user can't select "Assignment".
                             Let's keep Type UI but maybe put it with Color?
                             Actually, looking at previous code, Type was there.
                             I'll keep it there to be safe, creating valid tasks.
                          */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        >
                            <option>Revision</option>
                            <option>Practice Quiz</option>
                            <option>Video Lecture</option>
                            <option>Assignment</option>
                        </select>
                    </div>
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
                            min="15"
                            step="15"
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
