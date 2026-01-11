import { useState, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import axios from '../../api/axios';
import Toast, { type ToastType } from '../Toast';

interface AssignExamModalProps {
    examId: number;
    examTitle: string;
    onClose: () => void;
}

interface Student {
    student_id: number;
    user_id: number;
    full_name: string;
    email: string;
    avatar_url: string | null;
}

export default function AssignExamModal({ examId, examTitle, onClose }: AssignExamModalProps) {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Selection State
    const [assignToAll, setAssignToAll] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const [studentsRes, assignmentsRes] = await Promise.all([
                axios.get('/api/users/teacher/students'),
                axios.get(`/api/exams/${examId}/assignments`)
            ]);

            const allStudents = studentsRes.data;
            const assignedIds = assignmentsRes.data; // List of user_ids

            // Filter out already assigned students
            const unassigned = allStudents.filter((s: Student) => !assignedIds.includes(s.user_id));
            setStudents(unassigned);
        } catch (error) {
            console.error("Failed to fetch data", error);
            setToast({ message: "Failed to load students", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStudent = (userId: number) => {
        if (assignToAll) return; // Disable individual selection if "All" is checked

        setSelectedStudentIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSubmit = async () => {
        if (!assignToAll && selectedStudentIds.length === 0) {
            setToast({ message: "Please select at least one student", type: 'error' });
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                assign_to_all: assignToAll,
                student_ids: assignToAll ? [] : selectedStudentIds
            };

            const response = await axios.post(`/api/exams/${examId}/assign`, payload);

            // Check for success message or specific count
            const msg = response.data.message || "Exam assigned successfully";
            setToast({ message: msg, type: 'success' });

            // Close after delay
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.detail || "Failed to assign exam";
            setToast({ message: msg, type: 'error' });
            setSubmitting(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Assign Exam</h2>
                        <p className="text-sm text-gray-500 font-medium">To: <span className="text-primary">{examTitle}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                            <p className="text-gray-400 text-sm">Loading students...</p>
                        </div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Check className="w-12 h-12 mx-auto mb-3 opacity-20 text-green-500" />
                            <p className="font-bold text-gray-600">All Set!</p>
                            <p>All students are already assigned this exam.</p>
                        </div>
                    ) : (
                        <>
                            {/* "Assign to All" Option */}
                            <label className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${assignToAll ? 'bg-primary/5 border-primary ring-1 ring-primary' : 'bg-gray-50 border-gray-200 hover:border-primary/50'}`}>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${assignToAll ? 'bg-primary border-primary' : 'bg-white border-gray-300'}`}>
                                    {assignToAll && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={assignToAll} onChange={() => setAssignToAll(!assignToAll)} />
                                <div className="flex-1">
                                    <span className="font-bold text-gray-900 block">Assign to Remaining Students</span>
                                    <span className="text-sm text-gray-500">Assign to all {students.length} unassigned students.</span>
                                </div>
                            </label>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-100"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-400 font-medium">OR Select Students</span>
                                </div>
                            </div>

                            {/* Search & List */}
                            <div className={`space-y-4 transition-opacity ${assignToAll ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search students..."
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                    {filteredStudents.length === 0 ? (
                                        <p className="text-center text-gray-400 text-sm py-4">No matching students found.</p>
                                    ) : (
                                        filteredStudents.map(student => (
                                            <label
                                                key={student.user_id}
                                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${selectedStudentIds.includes(student.user_id)
                                                    ? 'bg-blue-50 border-blue-200'
                                                    : 'hover:bg-gray-50 border-transparent'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${selectedStudentIds.includes(student.user_id)
                                                    ? 'bg-blue-500 border-blue-500'
                                                    : 'bg-white border-gray-300'
                                                    }`}>
                                                    {selectedStudentIds.includes(student.user_id) && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={selectedStudentIds.includes(student.user_id)}
                                                    onChange={() => handleToggleStudent(student.user_id)}
                                                />
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    {student.avatar_url ? (
                                                        <img src={student.avatar_url} alt="" className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs flex-shrink-0">
                                                            {student.full_name[0]}
                                                        </div>
                                                    )}
                                                    <div className="truncate">
                                                        <p className="font-bold text-gray-900 text-sm truncate">{student.full_name}</p>
                                                        <p className="text-xs text-gray-500 truncate">{student.email}</p>
                                                    </div>
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 space-y-3">
                    {/* Error Summary if needed */}

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || (loading || (!assignToAll && selectedStudentIds.length === 0))}
                            className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Assign Exam
                                    {assignToAll ? (
                                        <span className="bg-white/20 px-2 py-0.5 rounded text-xs">All</span>
                                    ) : (
                                        selectedStudentIds.length > 0 && <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{selectedStudentIds.length}</span>
                                    )}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

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
