import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    FileText,
    Link as LinkIcon,
    UserPlus,
    Clock,
    CheckCircle2,
    MoreVertical,
    Trash2,
    Edit,
    X,
    Save,
    RotateCcw
} from 'lucide-react';
import axios from '../../api/axios';
import AssignExamModal from '../../components/teacher/AssignExamModal';
import Toast, { type ToastType } from '../../components/Toast';

interface Exam {
    id: number;
    title: string;
    subject: string;
    exam_type: 'subjective' | 'external';
    total_marks: number;
    deadline: string | null;
    created_at: string;
    question_format: 'pdf' | 'text' | null;
    external_link: string | null;
}

export default function ExamList() {
    const navigate = useNavigate();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [assignModalExam, setAssignModalExam] = useState<Exam | null>(null);
    const [editModalExam, setEditModalExam] = useState<Exam | null>(null);
    const [deleteModalExam, setDeleteModalExam] = useState<Exam | null>(null);
    const [rollbackModalExam, setRollbackModalExam] = useState<Exam | null>(null);
    const [activeMenu, setActiveMenu] = useState<number | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const response = await axios.get('/api/exams/');
            setExams(response.data);
        } catch (error) {
            console.error("Failed to fetch exams", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'No Deadline';
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
        });
    };

    const filteredExams = exams.filter(exam =>
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
                    <p className="text-gray-500">Create and manage your exams.</p>
                </div>
                <button
                    onClick={() => navigate('create')}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 active:translate-y-0.5 hover:-translate-y-0.5"
                >
                    <Plus className="w-5 h-5" />
                    Create New Exam
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm min-h-[500px] flex flex-col">
                {/* Filters */}
                <div className="p-6 border-b border-gray-100">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search exams..."
                            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                        <p>Loading exams...</p>
                    </div>
                ) : filteredExams.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-20">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-10 h-10 opacity-20" />
                        </div>
                        <p className="font-bold text-gray-600 text-lg">No exams found</p>
                        <p className="text-sm">Create your first exam to get started.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredExams.map(exam => (
                            <div key={exam.id} className="p-6 hover:bg-gray-50/50 transition-colors flex flex-col md:flex-row gap-6 items-start md:items-center group">
                                {/* Icon */}
                                <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl shadow-sm ${exam.exam_type === 'subjective' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'
                                    }`}>
                                    {exam.exam_type === 'subjective' ? <FileText className="w-7 h-7" /> : <LinkIcon className="w-7 h-7" />}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0 space-y-1">
                                    <h3 className="text-lg font-bold text-gray-900 truncate">{exam.title}</h3>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                        <span className="font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">{exam.subject}</span>
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            Deadline: {formatDate(exam.deadline)}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {exam.total_marks} Marks
                                        </span>
                                    </div>
                                </div>

                                {/* Actions Menu */}
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenu(activeMenu === exam.id ? null : exam.id);
                                        }}
                                        className="p-3 hover:bg-gray-200 rounded-full transition-all text-gray-500 hover:text-gray-900 active:scale-90 cursor-pointer"
                                    >
                                        <MoreVertical className="w-6 h-6" />
                                    </button>

                                    {activeMenu === exam.id && (
                                        <>
                                            {/* Backdrop */}
                                            <div
                                                className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] md:bg-transparent md:backdrop-blur-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenu(null);
                                                }}
                                            />

                                            {/* Menu Content */}
                                            <div className="
                                                fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-gray-100 p-4 pb-8 animate-in slide-in-from-bottom duration-200
                                                md:absolute md:top-full md:right-0 md:left-auto md:bottom-auto md:w-56 md:rounded-2xl md:shadow-xl md:border md:p-2 md:pb-2 md:animate-in md:fade-in md:zoom-in-95
                                            ">
                                                {/* Mobile Header */}
                                                <div className="md:hidden flex items-center justify-between mb-4 px-2">
                                                    <span className="font-bold text-gray-900 text-lg">Actions</span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveMenu(null);
                                                        }}
                                                        className="p-2 bg-gray-100 rounded-full text-gray-500"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMenu(null);
                                                        navigate(`${exam.id}/submissions`);
                                                    }}
                                                    className="w-full text-left px-4 py-3.5 md:px-3 md:py-2.5 hover:bg-gray-50 rounded-xl md:rounded-lg flex items-center gap-3 text-base md:text-sm font-bold text-gray-700 transition-colors cursor-pointer"
                                                >
                                                    <div className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-blue-50 flex items-center justify-center">
                                                        <FileText className="w-5 h-5 md:w-4 md:h-4 text-blue-500" />
                                                    </div>
                                                    Submissions
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMenu(null);
                                                        setAssignModalExam(exam);
                                                    }}
                                                    className="w-full text-left px-4 py-3.5 md:px-3 md:py-2.5 hover:bg-gray-50 rounded-xl md:rounded-lg flex items-center gap-3 text-base md:text-sm font-bold text-gray-700 transition-colors cursor-pointer"
                                                >
                                                    <div className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-purple-50 flex items-center justify-center">
                                                        <UserPlus className="w-5 h-5 md:w-4 md:h-4 text-purple-500" />
                                                    </div>
                                                    Assign
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMenu(null);
                                                        setEditModalExam(exam);
                                                    }}
                                                    className="w-full text-left px-4 py-3.5 md:px-3 md:py-2.5 hover:bg-gray-50 rounded-xl md:rounded-lg flex items-center gap-3 text-base md:text-sm font-bold text-gray-700 transition-colors cursor-pointer"
                                                >
                                                    <div className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-amber-50 flex items-center justify-center">
                                                        <Edit className="w-5 h-5 md:w-4 md:h-4 text-amber-500" />
                                                    </div>
                                                    Edit Exam
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMenu(null);
                                                        setRollbackModalExam(exam);
                                                    }}
                                                    className="w-full text-left px-4 py-3.5 md:px-3 md:py-2.5 hover:bg-gray-50 rounded-xl md:rounded-lg flex items-center gap-3 text-base md:text-sm font-bold text-gray-700 transition-colors cursor-pointer"
                                                >
                                                    <div className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                                                        <RotateCcw className="w-5 h-5 md:w-4 md:h-4 text-indigo-500" />
                                                    </div>
                                                    Remove Assignment
                                                </button>

                                                <div className="my-2 border-t border-gray-100 hidden md:block" />

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMenu(null);
                                                        setDeleteModalExam(exam);
                                                    }}
                                                    className="w-full text-left px-4 py-3.5 md:px-3 md:py-2.5 hover:bg-red-50 rounded-xl md:rounded-lg flex items-center gap-3 text-base md:text-sm font-bold text-red-600 transition-colors cursor-pointer"
                                                >
                                                    <div className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-red-50 flex items-center justify-center">
                                                        <Trash2 className="w-5 h-5 md:w-4 md:h-4 text-red-500 md:text-red-500" />
                                                    </div>
                                                    Delete Exam
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Assign Modal */}
            {assignModalExam && (
                <AssignExamModal
                    examId={assignModalExam.id}
                    examTitle={assignModalExam.title}
                    onClose={() => setAssignModalExam(null)}
                />
            )}

            {/* Edit Modal */}
            {editModalExam && (
                <EditExamModal
                    exam={editModalExam}
                    onClose={() => setEditModalExam(null)}
                    onUpdate={() => {
                        setEditModalExam(null);
                        fetchExams();
                    }}
                />
            )}

            {/* Delete Modal */}
            {deleteModalExam && (
                <DeleteExamModal
                    exam={deleteModalExam}
                    onClose={() => setDeleteModalExam(null)}
                    onDeleted={() => {
                        setDeleteModalExam(null);
                        fetchExams();
                    }}
                />
            )}

            {/* Rollback Modal */}
            {rollbackModalExam && (
                <RollbackAssignmentModal
                    exam={rollbackModalExam}
                    onClose={() => setRollbackModalExam(null)}
                    onRolledBack={() => {
                        setRollbackModalExam(null);
                        setToast({ message: "Student(s) unassigned successfully", type: 'success' });
                    }}
                />
            )}

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}

// ===================== Modals =====================

function EditExamModal({ exam, onClose, onUpdate }: { exam: any, onClose: () => void, onUpdate: () => void }) {
    const [title, setTitle] = useState(exam.title);
    const [instructions, setInstructions] = useState(exam.instructions || '');
    const [deadline, setDeadline] = useState('');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: ToastType } | null>(null);

    useEffect(() => {
        if (exam.deadline) {
            const date = new Date(exam.deadline);
            const localIso = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            setDeadline(localIso);
        }
    }, [exam]);

    const handleSave = async () => {
        try {
            setSaving(true);
            await axios.patch(`/api/exams/${exam.id}`, {
                title,
                instructions,
                new_deadline: deadline ? new Date(deadline).toISOString() : null
            });
            onUpdate();
        } catch (error: any) {
            setToast({ message: error.response?.data?.detail || "Failed to update exam", type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Edit Exam</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Exam Title</label>
                        <input
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Instructions</label>
                        <textarea
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium min-h-[120px]"
                            value={instructions}
                            placeholder="Add instructions for students..."
                            onChange={(e) => setInstructions(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Deadline</label>
                        <input
                            type="datetime-local"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                        />
                        <p className="text-xs text-amber-600 mt-2 font-medium">Students will be notified about deadline change.</p>
                    </div>
                </div>
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-2">
                        {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Save</>}
                    </button>
                </div>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}

function DeleteExamModal({ exam, onClose, onDeleted }: { exam: Exam, onClose: () => void, onDeleted: () => void }) {
    const [confirmationText, setConfirmationText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: ToastType } | null>(null);

    const handleDelete = async () => {
        if (confirmationText !== 'DELETE') return;
        try {
            setDeleting(true);
            await axios.delete(`/api/exams/${exam.id}`);
            onDeleted();
        } catch (error: any) {
            setToast({ message: error.response?.data?.detail || "Failed to delete exam", type: 'error' });
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-red-50/50">
                    <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
                        <Trash2 className="w-5 h-5" />
                        Delete Exam
                    </h2>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-gray-600 font-medium">
                        This action will <b>permanently delete</b> the exam <span className="text-red-600">"{exam.title}"</span>, assignments, submissions, and evaluations.
                    </p>
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm font-medium">
                        This cannot be undone. Please type <b>DELETE</b> to confirm.
                    </div>
                    <input
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all font-bold text-center tracking-widest placeholder:tracking-normal placeholder:font-medium"
                        placeholder="Type DELETE here"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                    />
                </div>
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                    <button
                        onClick={handleDelete}
                        disabled={confirmationText !== 'DELETE' || deleting}
                        className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {deleting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Delete Permanently'}
                    </button>
                </div>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}

function RollbackAssignmentModal({ exam, onClose, onRolledBack }: { exam: Exam, onClose: () => void, onRolledBack: () => void }) {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [confirming, setConfirming] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: ToastType } | null>(null);

    useEffect(() => {
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        try {
            const response = await axios.get(`/api/exams/${exam.id}/submissions`);
            setStudents(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleRollback = async () => {
        if (selectedIds.length === 0) return;
        try {
            setSubmitting(true);
            await axios.post(`/api/exams/${exam.id}/rollback-assignments`, {
                student_ids: selectedIds
            });
            onRolledBack();
        } catch (error: any) {
            setToast({ message: error.response?.data?.detail || "Failed to rollback assignments", type: 'error' });
            setConfirming(false); // Reset to selection on error
        } finally {
            setSubmitting(false);
        }
    };

    const toggleStudent = (id: number, status: string) => {
        if (status !== 'assigned') return;
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Remove Assignment</h2>
                        <p className="text-sm text-gray-500 font-medium">{exam.title}</p>
                    </div>
                    {!confirming && (
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                    )}
                </div>

                {confirming ? (
                    // CONFIRMATION VIEW
                    <div className="p-8 flex flex-col items-center text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-2">
                            <RotateCcw className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">Are you sure?</h3>
                        <p className="text-gray-500 max-w-sm">
                            You are about to unassign <span className="font-bold text-gray-900">{selectedIds.length} student(s)</span>.
                            This action cannot be undone.
                        </p>

                        <div className="flex gap-3 w-full mt-6">
                            <button
                                onClick={() => setConfirming(false)}
                                className="flex-1 py-3 text-gray-600 font-bold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRollback}
                                disabled={submitting}
                                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-200"
                            >
                                {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Yes, Remove'}
                            </button>
                        </div>
                    </div>
                ) : (
                    // SELECTION VIEW
                    <>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            {loading ? (
                                <div className="py-10 flex justify-center"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
                            ) : students.length === 0 ? (
                                <p className="text-center py-10 text-gray-400">No assigned students found.</p>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm text-gray-500 font-medium">Select students to unassign:</p>
                                        {selectedIds.length > 0 && <span className="text-sm font-bold text-primary">{selectedIds.length} selected</span>}
                                    </div>
                                    {students.map(s => {
                                        const isRemovable = s.status === 'assigned';
                                        return (
                                            <div
                                                key={s.student_id}
                                                onClick={() => toggleStudent(s.student_id, s.status)}
                                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${!isRemovable ? 'opacity-50 cursor-not-allowed bg-gray-50' :
                                                    selectedIds.includes(s.student_id) ? 'border-primary bg-primary/5 cursor-pointer' : 'border-gray-100 hover:border-gray-200 cursor-pointer'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">{s.student_name[0]}</div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{s.student_name}</p>
                                                        <p className="text-xs text-gray-500 font-medium">Status: <span className="capitalize">{s.status.replace('_', ' ')}</span></p>
                                                    </div>
                                                </div>
                                                {isRemovable && (
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedIds.includes(s.student_id) ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}>
                                                        {selectedIds.includes(s.student_id) && <CheckCircle2 className="w-4 h-4 text-white" />}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                            <button onClick={onClose} className="flex-1 py-3 text-gray-600 font-bold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                            <button
                                onClick={() => setConfirming(true)}
                                disabled={selectedIds.length === 0}
                                className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
                            >
                                Continue
                            </button>
                        </div>
                    </>
                )}
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
