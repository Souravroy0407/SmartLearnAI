import { useState, useEffect, useRef } from 'react';
import {
    Users, Search, X, GraduationCap, Calendar,
    Plus, MoreHorizontal, ChevronRight, Megaphone,
    AlertCircle, CheckCircle, ClipboardCheck, Clock
} from 'lucide-react';
import axios from '../../api/axios';
import clsx from 'clsx';

// --- Types ---

interface Batch {
    batch_id: number;
    name: string;
    is_default: boolean;
    student_count: number;
    created_at: string;
    // New
    run_days?: string[];
    start_time?: string;
    end_time?: string;
    timezone?: string;
    status: 'active' | 'paused' | 'completed';
}

interface Student {
    student_id: number;
    full_name: string;
    username: string;
    email?: string;
}

interface FailedRecipient {
    student_id: number;
    name: string;
    reason: string;
}

interface AttendanceStudent {
    student_id: number;
    full_name: string;
    username: string;
    status: 'P' | 'A' | 'TA' | null;
}

interface AttendanceSessionResponse {
    batch_id: number;
    date: string;
    is_open: boolean;
    is_edit: boolean;
    updated_at: string | null;
    students: AttendanceStudent[];
}

const TeacherStudentList = () => {
    // --- State ---
    const [batches, setBatches] = useState<Batch[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'attendance'>('list');

    const [loadingStudents, setLoadingStudents] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBatch, setEditingBatch] = useState<Batch | null>(null); // null = create mode

    // Announcement State
    const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
    const [announcementBatch, setAnnouncementBatch] = useState<Batch | null>(null);

    // Toast State
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // --- Actions ---

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchBatches = async () => {
        try {
            const res = await axios.get('/api/batches/');
            setBatches(res.data);

            // Auto-select first batch if none selected
            if (res.data.length > 0 && selectedBatchId === null) {
                // Prefer default batch
                const defaultBatch = res.data.find((b: Batch) => b.is_default);
                setSelectedBatchId(defaultBatch ? defaultBatch.batch_id : res.data[0].batch_id);
            }
        } catch (err) {
            console.error("Failed to fetch batches", err);
            showToast("Failed to load batches", "error");
        }
    };

    const fetchStudents = async () => {
        if (selectedBatchId === null) return;
        setLoadingStudents(true);
        try {
            const res = await axios.get(`/api/batches/students?batch_id=${selectedBatchId}`);
            setStudents(res.data);
        } catch (err) {
            console.error("Failed to fetch students", err);
            showToast("Failed to load students", "error");
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleSaveBatch = async (data: any) => {
        try {
            if (editingBatch) {
                // UPDATE
                const res = await axios.patch(`/api/batches/${editingBatch.batch_id}`, data);
                setBatches(batches.map(b => b.batch_id === editingBatch.batch_id ? res.data : b));
                showToast("Batch updated successfully");
            } else {
                // CREATE
                const res = await axios.post('/api/batches/', data);
                setBatches([...batches, res.data]);
                // Optionally select the new batch
                setSelectedBatchId(res.data.batch_id);
                showToast("Batch created successfully");
            }
            setIsModalOpen(false);
            setEditingBatch(null);
        } catch (err: any) {
            console.error("Failed to save batch", err);
            showToast(err.response?.data?.detail || "Failed to save batch.", "error");
        }
    };

    const handleDeleteBatch = async (batchId: number) => {
        if (!window.confirm("Are you sure? All students will be moved to the Default Batch.")) return;
        try {
            await axios.delete(`/api/batches/${batchId}`);
            setBatches(batches.filter(b => b.batch_id !== batchId));
            // If we deleted the selected batch, switch to default
            if (selectedBatchId === batchId) {
                const defaultBatch = batches.find(b => b.is_default);
                setSelectedBatchId(defaultBatch ? defaultBatch.batch_id : null);
            }
            showToast("Batch deleted successfully");
        } catch (err: any) {
            console.error("Failed to delete batch", err);
            showToast(err.response?.data?.detail || "Failed to delete batch.", "error");
        }
    };

    const handleMoveStudent = async (studentId: number, targetBatchId: number) => {
        try {
            await axios.patch(`/api/batches/students/${studentId}`, { target_batch_id: targetBatchId });
            // Refresh students and batches (counts change)
            fetchStudents();
            fetchBatches();
            showToast("Student moved successfully");
        } catch (err: any) {
            console.error("Failed to move student", err);
            // Show backend error message (e.g., "Cannot move to paused batch")
            showToast(err.response?.data?.detail || "Failed to move student.", "error");
        }
    };

    const handleSendAnnouncement = async (message: string) => {
        if (!announcementBatch) return;

        try {
            const res = await axios.post(`/api/batches/${announcementBatch.batch_id}/announce`, { message });
            const data = res.data;

            // Check failures
            if (data.failed_count > 0) {
                const failedNames = data.failed_recipients.map((f: FailedRecipient) => `${f.name} (${f.reason})`).join("\n");
                // Showing a combined message for partial failure
                showToast(`Sent to ${data.sent_count}. Failed: ${data.failed_count}. Check console for details.`, "error");
                console.error("Failed Recipients:", failedNames);
            } else {
                showToast(`Announcement sent to ${data.sent_count} students in ${announcementBatch.name}`);
            }
            setIsAnnouncementOpen(false);
            setAnnouncementBatch(null);
        } catch (err: any) {
            console.error("Failed to send announcement", err);
            showToast(err.response?.data?.detail || "Failed to send announcement.", "error");
        }
    };

    // --- Effects ---

    useEffect(() => {
        fetchBatches();
    }, []);

    useEffect(() => {
        if (selectedBatchId !== null) {
            fetchStudents();
            setViewMode('list'); // Reset view on batch change
        }
    }, [selectedBatchId]);


    // --- Render Helpers ---

    const filteredStudents = students.filter(s =>
        s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedBatch = batches.find(b => b.batch_id === selectedBatchId);

    // Check if actions are allowed in current batch
    const areActionsDisabled = selectedBatch && !selectedBatch.is_default && selectedBatch.status !== 'active';

    return (
        <div className="pt-8 space-y-8 max-w-7xl mx-auto px-4 sm:px-6 relative">

            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className={clsx(
                        "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border font-medium",
                        toast.type === 'success' ? "bg-white border-green-100 text-gray-800" : "bg-white border-red-100 text-gray-800"
                    )}>
                        {toast.type === 'success' ? (
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                        ) : (
                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                        )}
                        <div>
                            <p className="text-sm">{toast.message}</p>
                        </div>
                        <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600 ml-2">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-dark tracking-tight">Students & Batches</h1>
                    <p className="text-secondary text-sm mt-1">Manage your student groups and enrollments</p>
                </div>
            </div>

            {/* Batch Selector - Horizontal Scroll */}
            <div className="relative group">
                <div className="flex items-center gap-4 overflow-x-auto pb-4 pt-2 -mx-4 px-4 scrollbar-hide snap-x">
                    {batches.map(batch => (
                        <BatchCard
                            key={batch.batch_id}
                            batch={batch}
                            isSelected={selectedBatchId === batch.batch_id}
                            onSelect={() => setSelectedBatchId(batch.batch_id)}
                            onEdit={() => { setEditingBatch(batch); setIsModalOpen(true); }}
                            onDelete={() => handleDeleteBatch(batch.batch_id)}
                            onAnnounce={() => { setAnnouncementBatch(batch); setIsAnnouncementOpen(true); }}
                        />
                    ))}

                    {/* Add Batch Button */}
                    <button
                        onClick={() => { setEditingBatch(null); setIsModalOpen(true); }}
                        className="flex-shrink-0 w-20 h-[170px] rounded-2xl border-2 border-dashed border-gray-200 hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-primary transition-all snap-center"
                    >
                        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                            <Plus className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold">Add</span>
                    </button>
                </div>
            </div>

            {/* Main Student List Section */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden min-h-[600px] flex flex-col">


                {/* Toolbar */}
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-500">
                            {viewMode === 'list' ? <GraduationCap className="w-5 h-5" /> : <ClipboardCheck className="w-5 h-5" />}
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-gray-900">
                                {selectedBatch?.name || 'All Students'}
                            </h2>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    {viewMode === 'list' ? `${students.length} Total` : 'Attendance'}
                                </span>
                                {areActionsDisabled && (
                                    <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                        {selectedBatch?.status} - Read Only
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* View Switcher & Search */}
                    <div className="flex items-center gap-3">
                        {selectedBatch && !selectedBatch.is_default && (
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-lg text-sm font-bold transition-all",
                                        viewMode === 'list' ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    Students
                                </button>
                                <button
                                    onClick={() => setViewMode('attendance')}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-lg text-sm font-bold transition-all",
                                        viewMode === 'attendance' ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    Attendance
                                </button>
                            </div>
                        )}

                        {viewMode === 'list' && (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search students..."
                                    className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary w-full sm:w-64 transition-all"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-x-auto">
                    {viewMode === 'attendance' && selectedBatch ? (
                        <AttendanceView
                            batchId={selectedBatch.batch_id}
                            showToast={showToast}
                        />
                    ) : loadingStudents ? (
                        <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                            <span className="text-sm font-medium">Loading students...</span>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Users className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="font-bold text-gray-600">No students found</p>
                            <p className="text-sm">Try adding students to this batch.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider pl-8">Student Name</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Username</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right pr-8">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredStudents.map(student => (
                                    <StudentRow
                                        key={student.student_id}
                                        student={student}
                                        batches={batches}
                                        currentBatchId={selectedBatchId!}
                                        onMove={handleMoveStudent}
                                        disabled={!!areActionsDisabled} // Disable move if current batch is locked
                                    />
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Batch Modal */}
            {
                isModalOpen && (
                    <BatchModal
                        batch={editingBatch}
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleSaveBatch}
                        showToast={showToast}
                    />
                )
            }

            {/* Announcement Modal */}
            {
                isAnnouncementOpen && announcementBatch && (
                    <AnnouncementModal
                        batch={announcementBatch}
                        onClose={() => setIsAnnouncementOpen(false)}
                        onSend={handleSendAnnouncement}
                    />
                )
            }
        </div >
    );
};

// --- Sub-Components ---

const BatchCard = ({ batch, isSelected, onSelect, onEdit, onDelete, onAnnounce }: any) => {
    // Status color
    const statusColor = {
        active: "bg-green-100 text-green-700",
        paused: "bg-yellow-100 text-yellow-700",
        completed: "bg-gray-100 text-gray-600"
    }[batch.status as string] || "bg-gray-100 text-gray-600";

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu on click outside
    useEffect(() => {
        const handleClick = (e: any) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setIsMenuOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Format Schedule
    const hasSchedule = batch.run_days && batch.run_days.length > 0;
    const scheduleSummary = hasSchedule
        ? `${batch.run_days.map((d: string) => d.slice(0, 3)).join(', ')}`
        : null;
    const timeSummary = batch.start_time && batch.end_time
        ? `${batch.start_time.slice(0, 5)} - ${batch.end_time.slice(0, 5)}`
        : null;

    const isActive = batch.is_default || batch.status === 'active';

    return (
        <div
            className={clsx(
                "flex-shrink-0 w-72 p-5 rounded-2xl border text-left transition-all duration-200 snap-center relative group/card",
                isSelected
                    ? "bg-white border-primary ring-2 ring-primary/10 shadow-lg shadow-primary/5"
                    : "bg-white border-transparent hover:border-gray-200 shadow-sm hover:shadow-md text-gray-500"
            )}
            onClick={onSelect}
        >
            <div className="flex justify-between items-start mb-3">
                <div className={clsx(
                    "p-2 rounded-lg",
                    isSelected ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-400"
                )}>
                    <Users className="w-5 h-5" />
                </div>

                <div className="flex items-center gap-2">
                    {/* Status Badge (Non-Default Only) */}
                    {!batch.is_default && (
                        <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase", statusColor)}>
                            {batch.status}
                        </span>
                    )}

                    {/* Announcement Button - Always visible but disabled if not active */}
                    <button
                        onClick={(e) => { e.stopPropagation(); if (isActive) onAnnounce(); }}
                        disabled={!isActive}
                        className={clsx(
                            "p-1.5 rounded-full transition-colors",
                            isActive
                                ? "text-gray-400 hover:text-primary hover:bg-primary/5"
                                : "text-gray-200 cursor-not-allowed"
                        )}
                        title={isActive ? "Make Announcement" : "Batch is not active"}
                    >
                        <Megaphone className="w-4 h-4" />
                    </button>

                    {/* Edit Menu (Non-Default Only) */}
                    {!batch.is_default && (
                        <div className="relative" ref={menuRef} onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {isMenuOpen && (
                                <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-10 py-1 text-sm font-medium">
                                    <button onClick={() => { onEdit(); setIsMenuOpen(false); }} className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700">Edit</button>
                                    <button onClick={() => { onDelete(); setIsMenuOpen(false); }} className="block w-full text-left px-3 py-2 hover:bg-red-50 text-red-600">Delete</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <h3 className={clsx("font-bold text-lg truncate", isSelected ? "text-secondary-dark" : "text-gray-600")}>
                {batch.name}
            </h3>

            <p className="text-sm text-gray-400 font-medium mt-1">
                {batch.student_count} Students
            </p>

            {/* Schedule Display */}
            {!batch.is_default && (hasSchedule || timeSummary) && (
                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col gap-1">
                    {hasSchedule && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span className="truncate">{scheduleSummary}</span>
                        </div>
                    )}
                    {timeSummary && (
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-400 pl-5">
                            <span>{timeSummary}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const AnnouncementModal = ({ batch, onClose, onSend }: any) => {
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);

    const handleSubmit = async () => {
        if (!message.trim()) return;
        setSending(true);
        await onSend(message);
        setSending(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-900">Make Announcement</h2>
                    <button onClick={onClose} disabled={sending} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium">
                        <Megaphone className="w-5 h-5" />
                        <div>
                            <span className="block font-bold">Broadcasting to {batch.name}</span>
                            <span className="text-xs opacity-80">This will email ~{batch.student_count} students.</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Message</label>
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value.slice(0, 500))}
                            disabled={sending}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-primary font-medium min-h-[120px] resize-none"
                            placeholder="e.g., Tomorrow's class is cancelled due to heavy rain."
                        />
                        <div className="flex justify-end mt-1">
                            <span className={clsx("text-xs font-bold", message.length >= 500 ? "text-red-500" : "text-gray-400")}>
                                {message.length} / 500
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                    <button onClick={onClose} disabled={sending} className="flex-1 px-4 py-3 bg-white text-gray-600 font-bold rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                    <button
                        onClick={handleSubmit}
                        disabled={!message.trim() || sending}
                        className="flex-1 px-4 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        {sending && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {sending ? "Sending..." : "Send Now"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const BatchModal = ({ batch, onClose, onSave, showToast }: any) => {
    const isEdit = !!batch;
    const [name, setName] = useState(batch?.name || "");
    const [runDays, setRunDays] = useState<string[]>(batch?.run_days || []);
    const [startTime, setStartTime] = useState(batch?.start_time || "");
    const [endTime, setEndTime] = useState(batch?.end_time || "");
    const [status, setStatus] = useState(batch?.status || "active");

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const toggleDay = (day: string) => {
        if (runDays.includes(day)) setRunDays(runDays.filter(d => d !== day));
        else setRunDays([...runDays, day]);
    };

    const handleSubmit = () => {
        if (!name.trim()) return showToast("Name is required", "error");
        // Time validation
        if ((startTime && !endTime) || (!startTime && endTime)) {
            return showToast("Both Start and End time must be provided.", "error");
        }
        if (startTime && endTime && endTime <= startTime) {
            return showToast("End time must be after start time.", "error");
        }

        onSave({
            name,
            run_days: runDays.length ? runDays : null,
            start_time: startTime || null,
            end_time: endTime || null,
            status: isEdit ? status : undefined
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-900">{isEdit ? "Edit Batch" : "Create Batch"}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Name */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Batch Name</label>
                        <input
                            value={name} onChange={e => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-primary font-medium"
                            placeholder="e.g. Mathematics Class A"
                        />
                    </div>

                    {/* Schedule */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Schedule (Optional)</label>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {days.map(day => (
                                <button
                                    key={day}
                                    onClick={() => toggleDay(day)}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                        runDays.includes(day)
                                            ? "bg-primary text-white border-primary"
                                            : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                                    )}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Start Time</label>
                                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">End Time</label>
                                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                            </div>
                        </div>
                    </div>

                    {/* Status (Edit Only) */}
                    {isEdit && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Status</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-primary font-medium"
                            >
                                <option value="active">Active</option>
                                <option value="paused">Paused</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-3 bg-white text-gray-600 font-bold rounded-xl border border-gray-200 hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSubmit} className="flex-1 px-4 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark shadow-lg shadow-primary/20">Save Batch</button>
                </div>
            </div>
        </div>
    );
};

const AttendanceView = ({ batchId, showToast }: { batchId: number, showToast: any }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sessionData, setSessionData] = useState<AttendanceSessionResponse | null>(null);
    const [marks, setMarks] = useState<{ [studentId: number]: 'P' | 'A' | 'TA' }>({});

    useEffect(() => {
        fetchAttendance();
    }, [batchId]);

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/batches/${batchId}/attendance/today`);
            setSessionData(res.data);

            // Initialize marks
            const initialMarks: any = {};
            res.data.students.forEach((s: AttendanceStudent) => {
                initialMarks[s.student_id] = s.status || 'A'; // Default to Absent if null
            });
            setMarks(initialMarks);
        } catch (err: any) {
            console.error("Failed to fetch attendance", err);
            showToast(err.response?.data?.detail || "Failed to load attendance", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const records = Object.entries(marks).map(([studentId, status]) => ({
                student_id: parseInt(studentId),
                status
            }));
            await axios.post(`/api/batches/${batchId}/attendance`, records);
            showToast("Attendance saved successfully");
            fetchAttendance(); // Refresh to confirm
        } catch (err: any) {
            console.error("Failed to save attendance", err);
            showToast(err.response?.data?.detail || "Failed to save attendance", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleBulkSet = (status: 'P' | 'A' | 'TA') => {
        if (!sessionData) return;
        const newMarks = { ...marks };
        sessionData.students.forEach(s => {
            newMarks[s.student_id] = status;
        });
        setMarks(newMarks);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                Loading attendance...
            </div>
        );
    }

    if (!sessionData) return <div className="p-8 text-center text-gray-500">Failed to load session.</div>;

    const areAllTA = Object.values(marks).every(v => v === 'TA') && sessionData.students.length > 0;

    return (
        <div className="p-8">
            {/* Header / Info */}
            <div className="flex items-center justify-between mb-8 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-center gap-4">
                    <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center", sessionData.is_open ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">
                            {sessionData.is_open ? "Attendance Open" : "Attendance Closed"}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(sessionData.date).toDateString()}
                            {sessionData.updated_at && (
                                <span className="text-xs text-gray-400 border-l pl-2 ml-2">
                                    Last updated: {new Date(sessionData.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {!sessionData.is_open && (
                    <div className="bg-white px-4 py-2 rounded-lg text-xs font-bold text-red-500 border border-red-100 shadow-sm">
                        Class not started or not scheduled for today.
                    </div>
                )}
            </div>

            {areAllTA && (
                <div className="mb-6 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm font-medium flex items-center gap-2 border border-yellow-200">
                    <AlertCircle className="w-4 h-4" />
                    Class marked as not conducted (Teacher Absent).
                </div>
            )}

            {/* List */}
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-gray-100">
                        <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider pl-8">Student</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {sessionData.students.map(student => (
                        <tr key={student.student_id} className="hover:bg-gray-50/50">
                            <td className="py-4 px-6 pl-8 font-medium text-gray-800">
                                {student.full_name}
                                <div className="text-xs text-gray-400 font-normal">@{student.username}</div>
                            </td>
                            <td className="py-4 px-6 flex justify-center">
                                {/* Radio Group */}
                                <div className="bg-gray-100 p-1 rounded-lg flex items-center gap-1">
                                    {(['P', 'A', 'TA'] as const).map((status) => (
                                        <label
                                            key={status}
                                            className={clsx(
                                                "cursor-pointer px-4 py-1.5 rounded-md text-sm font-bold transition-all",
                                                marks[student.student_id] === status
                                                    ? {
                                                        'P': "bg-green-500 text-white shadow-sm",
                                                        'A': "bg-red-500 text-white shadow-sm",
                                                        'TA': "bg-yellow-500 text-white shadow-sm"
                                                    }[status]
                                                    : "text-gray-500 hover:bg-gray-200"
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name={`status-${student.student_id}`}
                                                value={status}
                                                checked={marks[student.student_id] === status}
                                                onChange={() => setMarks(prev => ({ ...prev, [student.student_id]: status }))}
                                                disabled={!sessionData.is_open}
                                                className="hidden"
                                            />
                                            {status}
                                        </label>
                                    ))}
                                </div>
                            </td>
                        </tr>
                    ))}
                    {sessionData.students.length === 0 && (
                        <tr>
                            <td colSpan={2} className="py-8 text-center text-gray-400">No students in this batch.</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Footer Actions */}
            <div className="mt-8 flex justify-between items-center bg-gray-50 p-6 rounded-xl border border-gray-100">
                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                    Bulk Actions:
                    <button onClick={() => handleBulkSet('P')} disabled={!sessionData.is_open} className="ml-2 hover:text-primary disabled:opacity-50">Mark All Present</button>
                    <span className="mx-2">|</span>
                    <button onClick={() => handleBulkSet('A')} disabled={!sessionData.is_open} className="hover:text-primary disabled:opacity-50">Mark All Absent</button>
                </div>

                <button
                    onClick={handleSave}
                    disabled={!sessionData.is_open || saving || sessionData.students.length === 0}
                    className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                >
                    {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {saving ? "Saving..." : (sessionData.is_edit ? "Save Changes" : "Save Daily Attendance")}
                </button>
            </div>
        </div>
    );
};

const StudentRow = ({ student, batches, currentBatchId, onMove, disabled }: any) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <tr className="group hover:bg-gray-50/50 transition-colors">
            <td className="py-4 px-6 pl-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100 shadow-sm">
                        {student.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span className="font-bold text-gray-900">{student.full_name}</span>
                </div>
            </td>
            <td className="py-4 px-6">
                <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                    <span className="bg-gray-100 px-2 py-1 rounded-md text-gray-600 text-xs font-mono">
                        @{student.username}
                    </span>
                    {student.email && <span className="text-gray-400">• {student.email}</span>}
                </div>
            </td>
            <td className="py-4 px-6 text-right pr-8">
                <div className="relative inline-block text-left" ref={menuRef}>
                    <button
                        onClick={() => !disabled && setIsMenuOpen(!isMenuOpen)}
                        disabled={disabled}
                        className={clsx(
                            "p-2 rounded-lg transition-colors",
                            disabled ? "text-gray-300 cursor-not-allowed" : "text-gray-400 hover:text-primary hover:bg-primary/5"
                        )}
                        title={disabled ? "Batch is read-only" : "Actions"}
                    >
                        <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-gray-100 z-10 p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                            <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                Move to Batch
                            </div>
                            {batches.filter((b: any) => b.batch_id !== currentBatchId).map((batch: any) => (
                                <button
                                    key={batch.batch_id}
                                    onClick={() => { onMove(student.student_id, batch.batch_id); setIsMenuOpen(false); }}
                                    // Disable move to paused/completed batches on frontend as well for better UX
                                    disabled={!batch.is_default && batch.status !== 'active'}
                                    className={clsx(
                                        "flex items-center justify-between w-full px-3 py-2 text-sm text-left rounded-lg transition-colors",
                                        (!batch.is_default && batch.status !== 'active')
                                            ? "text-gray-400 cursor-not-allowed bg-gray-50"
                                            : "text-gray-600 hover:bg-gray-50"
                                    )}
                                    title={(!batch.is_default && batch.status !== 'active') ? `Batch is ${batch.status}` : ""}
                                >
                                    <span className="truncate flex items-center gap-2">
                                        {batch.name}
                                        {!batch.is_default && batch.status !== 'active' && (
                                            <span className="text-[9px] uppercase border px-1 rounded bg-white">{batch.status}</span>
                                        )}
                                    </span>
                                    <ChevronRight className="w-3 h-3 text-gray-300" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
};

export default TeacherStudentList;
