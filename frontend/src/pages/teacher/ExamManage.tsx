import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { Plus, Link, Upload, Calendar, FileText, X, Check } from 'lucide-react';
import Toast, { type ToastType } from '../../components/Toast';

interface Exam {
    id: number;
    title: string;
    instructions: string;
    exam_type: 'fileupload' | 'googleform';
    duration_minutes: number;
    deadline: string;
    external_link?: string;
    created_at: string;
}

interface Submission {
    submission: {
        id: number;
        student_id: number;
        has_file: boolean;
        submitted_at: string;
        marks_obtained?: number;
        feedback?: string;
        status: string;
    };
    student_name: string;
    student_email: string;
}

const ExamManage = () => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        instructions: '',
        exam_type: 'fileupload',
        duration_minutes: 60,
        deadline: '',
        external_link: ''
    });

    useEffect(() => {
        fetchExams();
    }, []);

    const showToast = (message: string, type: ToastType) => {
        setToast({ message, type });
    };

    const fetchExams = async () => {
        try {
            const response = await axios.get('/api/exam/list/teacher');
            setExams(response.data);
        } catch (error) {
            console.error("Error fetching exams:", error);
            showToast("Failed to fetch exams", 'error');
        }
    };

    const fetchSubmissions = async (examId: number) => {
        try {
            const response = await axios.get(`/api/exam/submissions/${examId}`);
            setSubmissions(response.data);
        } catch (error) {
            console.error("Error fetching submissions:", error);
            showToast("Failed to fetch submissions", 'error');
        }
    };

    const handleCreateExam = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = new FormData();
            data.append('title', formData.title);
            data.append('instructions', formData.instructions);
            data.append('exam_type', formData.exam_type);
            data.append('duration_minutes', formData.duration_minutes.toString());
            data.append('deadline', formData.deadline);
            if (formData.external_link) data.append('external_link', formData.external_link);

            await axios.post('/api/exam/create', data);
            setIsCreateModalOpen(false);
            fetchExams();
            showToast("Exam created successfully!", 'success');
            // Reset form
            setFormData({
                title: '',
                instructions: '',
                exam_type: 'fileupload',
                duration_minutes: 60,
                deadline: '',
                external_link: ''
            });
        } catch (error) {
            console.error("Error creating exam:", error);
            showToast("Failed to create exam", 'error');
        }
    };

    const handleGrade = async (submissionId: number, marks: number, feedback: string) => {
        try {
            const data = new FormData();
            data.append('submission_id', submissionId.toString());
            data.append('marks', marks.toString());
            data.append('feedback', feedback);

            await axios.post('/api/exam/grade', data);
            showToast("Grade submitted successfully", 'success');
            // Refresh submissions
            if (selectedExam) fetchSubmissions(selectedExam.id);
        } catch (error) {
            console.error("Error grading:", error);
            showToast("Failed to submit grade", 'error');
        }
    };

    return (
        <div className="space-y-6">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-dark">Exam Management</h1>
                    <p className="text-secondary">Create and manage exams for your students</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    <span>Create Exam</span>
                </button>
            </div>

            {/* Exam List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exams.map((exam) => (
                    <div key={exam.id} className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-light/20 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${exam.exam_type === 'fileupload' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                {exam.exam_type === 'fileupload' ? <Upload className="w-6 h-6" /> : <Link className="w-6 h-6" />}
                            </div>
                            <span className="text-xs font-medium text-secondary bg-secondary-light/10 px-2 py-1 rounded-lg">
                                {exam.duration_minutes} mins
                            </span>
                        </div>
                        <h3 className="font-bold text-lg text-secondary-dark mb-2">{exam.title}</h3>
                        <p className="text-secondary text-sm mb-4 line-clamp-2">{exam.instructions}</p>

                        <div className="flex items-center gap-2 text-sm text-secondary mb-4">
                            <Calendar className="w-4 h-4" />
                            <span>Deadline: {new Date(exam.deadline).toLocaleDateString()}</span>
                        </div>

                        <button
                            onClick={() => { setSelectedExam(exam); fetchSubmissions(exam.id); }}
                            className="w-full py-2 border border-primary text-primary rounded-xl hover:bg-primary/5 transition-colors font-medium"
                        >
                            View Submissions
                        </button>
                    </div>
                ))}
            </div>

            {/* Create Exam Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-secondary-dark">Create New Exam</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-secondary hover:text-secondary-dark">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateExam} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-secondary-dark mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-secondary-dark mb-1">Type</label>
                                <select
                                    className="w-full p-2 border border-gray-200 rounded-lg outline-none"
                                    value={formData.exam_type}
                                    onChange={(e) => setFormData({ ...formData, exam_type: e.target.value as 'fileupload' | 'googleform' })}
                                >
                                    <option value="fileupload">Handwritten / File Upload</option>
                                    <option value="googleform">Google Form / External Link</option>
                                </select>
                            </div>

                            {formData.exam_type === 'googleform' && (
                                <div>
                                    <label className="block text-sm font-medium text-secondary-dark mb-1">Google Form Link</label>
                                    <input
                                        type="url"
                                        required
                                        className="w-full p-2 border border-gray-200 rounded-lg outline-none"
                                        value={formData.external_link}
                                        onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-secondary-dark mb-1">Instructions</label>
                                <textarea
                                    required
                                    className="w-full p-2 border border-gray-200 rounded-lg outline-none h-24"
                                    value={formData.instructions}
                                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-dark mb-1">Duration (mins)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full p-2 border border-gray-200 rounded-lg outline-none"
                                        value={formData.duration_minutes}
                                        onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-dark mb-1">Deadline</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        className="w-full p-2 border border-gray-200 rounded-lg outline-none"
                                        value={formData.deadline}
                                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors mt-6"
                            >
                                Create Exam
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Submissions Modal / View */}
            {selectedExam && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-secondary-dark">Submissions: {selectedExam.title}</h2>
                                <p className="text-sm text-secondary">Total Submissions: {submissions.length}</p>
                            </div>
                            <button onClick={() => setSelectedExam(null)} className="text-secondary hover:text-secondary-dark">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {submissions.map((sub) => (
                                <div key={sub.submission.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50 flex flex-col md:flex-row gap-4 justify-between">
                                    <div>
                                        <h4 className="font-bold text-secondary-dark">{sub.student_name}</h4>
                                        <p className="text-sm text-secondary">{sub.student_email}</p>
                                        <p className="text-xs text-gray-500 mt-1">Submitted: {new Date(sub.submission.submitted_at).toLocaleString()}</p>

                                        {sub.submission.has_file && (
                                            <a
                                                href={`${import.meta.env.VITE_API_URL || ''}/api/exam/submission/${sub.submission.id}/download`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-blue-600 hover:underline mt-2 text-sm"
                                            >
                                                <FileText className="w-4 h-4" />
                                                View Answer Sheet
                                            </a>
                                        )}
                                    </div>

                                    <div className="w-full md:w-1/3 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                placeholder="Marks"
                                                className="w-20 p-2 border rounded-lg text-sm"
                                                defaultValue={sub.submission.marks_obtained || ''}
                                                id={`marks-${sub.submission.id}`}
                                            />
                                            <span className="text-sm text-gray-500">/ 100</span>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Feedback..."
                                            className="w-full p-2 border rounded-lg text-sm"
                                            defaultValue={sub.submission.feedback || ''}
                                            id={`feedback-${sub.submission.id}`}
                                        />
                                        <button
                                            onClick={() => {
                                                const marks = (document.getElementById(`marks-${sub.submission.id}`) as HTMLInputElement).value;
                                                const feedback = (document.getElementById(`feedback-${sub.submission.id}`) as HTMLInputElement).value;
                                                handleGrade(sub.submission.id, parseInt(marks), feedback);
                                            }}
                                            className="w-full py-1 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                                        >
                                            Submit Grade
                                        </button>
                                        {sub.submission.status === 'graded' && (
                                            <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                                                <Check className="w-3 h-3" /> Graded
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {submissions.length === 0 && (
                                <p className="text-center text-gray-400 py-8">No submissions yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamManage;
