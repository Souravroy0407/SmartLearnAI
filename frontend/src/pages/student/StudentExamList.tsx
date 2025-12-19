import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { FileText, Link, Upload, Clock, Calendar, CheckCircle, ExternalLink } from 'lucide-react';
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

interface ExamStatus {
    exam: Exam;
    status: string; // 'pending', 'submitted', 'graded'
    marks?: number;
}

const StudentExamList = () => {
    const [examStatuses, setExamStatuses] = useState<ExamStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    useEffect(() => {
        fetchExams();
    }, []);

    const showToast = (message: string, type: ToastType) => {
        setToast({ message, type });
    };

    const fetchExams = async (bg = false) => {
        if (!bg && examStatuses.length === 0) setLoading(true);
        else setIsRefreshing(true);

        try {
            const response = await axios.get('/api/exam/list/student');
            setExamStatuses(response.data);
        } catch (error) {
            console.error("Error fetching exams:", error);
            showToast("Failed to fetch exams", 'error');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedExam || !file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('exam_id', selectedExam.id.toString());
            formData.append('file', file);

            await axios.post('/api/exam/submit', formData);
            showToast("Exam submitted successfully!", 'success');
            setSelectedExam(null);
            setFile(null);
            fetchExams(true); // Refresh status in background
        } catch (error) {
            console.error("Error submitting exam:", error);
            showToast("Failed to submit exam.", 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleGoogleFormClick = async (exam: Exam) => {
        window.open(exam.external_link, '_blank');
    };

    const markAsDone = async (examId: number) => {
        try {
            const formData = new FormData();
            formData.append('exam_id', examId.toString());
            await axios.post('/api/exam/submit', formData);
            fetchExams(true); // Refresh status in background
        } catch (error) {
            console.error("Error marking as done:", error);
            showToast("Failed to mark as done", 'error');
        }
    }

    return (
        <div className="space-y-6">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
            <div>
                <h1 className="text-2xl font-bold text-secondary-dark">Exams</h1>
                <p className="text-secondary">View and attempt your assigned exams</p>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-light/20 h-64 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-full mb-6"></div>
                            <div className="mt-auto h-10 bg-gray-200 rounded w-full"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {examStatuses.map(({ exam, status, marks }) => (
                        <div key={exam.id} className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-light/20 flex flex-col h-full relative overflow-hidden">
                            {/* Loading overlay for existing items if checking for updates? 
                                Do we want this? The user said "Merge new data... WITHOUT clearing existing list".
                                We don't necessarily need an overlay on each item, just keep them visible.
                                But if we want to show 'refreshing', maybe a small indicator?
                                Let's stick to the main requirement: don't clear the list. 
                                The 'loading' state handles initial load. 
                             */}

                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-xl ${exam.exam_type === 'fileupload' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                    {exam.exam_type === 'fileupload' ? <Upload className="w-6 h-6" /> : <Link className="w-6 h-6" />}
                                </div>
                                {status === 'submitted' || status === 'graded' ? (
                                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-lg flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" /> Submitted
                                    </span>
                                ) : (
                                    <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-lg">
                                        Pending
                                    </span>
                                )}
                            </div>

                            <h3 className="font-bold text-lg text-secondary-dark mb-2">{exam.title}</h3>
                            <p className="text-secondary text-sm mb-4 flex-1">{exam.instructions}</p>

                            <div className="space-y-2 text-sm text-secondary mb-6">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span>Duration: {exam.duration_minutes} mins</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <span>Due: {new Date(exam.deadline).toLocaleDateString()}</span>
                                </div>
                                {status === 'graded' && (
                                    <div className="mt-2 text-primary font-bold">
                                        Score: {marks} / 100
                                    </div>
                                )}
                            </div>

                            <div className="mt-auto">
                                {status === 'pending' && (
                                    <>
                                        {exam.exam_type === 'googleform' ? (
                                            <div className="space-y-2">
                                                <button
                                                    onClick={() => handleGoogleFormClick(exam)}
                                                    className="w-full py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <span>Open Exam</span>
                                                    <ExternalLink className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => markAsDone(exam.id)}
                                                    className="w-full py-2 border border-green-600 text-green-600 rounded-xl hover:bg-green-50 transition-colors text-sm"
                                                >
                                                    Mark as Done
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setSelectedExam(exam)}
                                                className="w-full py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors"
                                            >
                                                Attempt Exam
                                            </button>
                                        )}
                                    </>
                                )}
                                {(status === 'submitted' || status === 'graded') && (
                                    <button disabled className="w-full py-2 bg-gray-100 text-gray-400 rounded-xl cursor-not-allowed">
                                        Completed
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            {selectedExam && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-secondary-dark mb-4">Submit Exam</h2>
                        <p className="text-sm text-secondary mb-4">Please upload your answer sheet (PDF or Image).</p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    required
                                    accept=".pdf,image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                                />
                                {file ? (
                                    <div className="flex flex-col items-center text-primary">
                                        <FileText className="w-8 h-8 mb-2" />
                                        <span className="text-sm font-medium">{file.name}</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-gray-400">
                                        <Upload className="w-8 h-8 mb-2" />
                                        <span className="text-sm">Click to upload or drag and drop</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setSelectedExam(null); setFile(null); }}
                                    className="flex-1 py-2 border border-gray-200 text-secondary rounded-xl hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!file || isUploading}
                                    className="flex-1 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? 'Uploading...' : 'Submit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentExamList;
