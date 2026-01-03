import { useState, useEffect } from 'react';
import axios, { API_BASE_URL } from '../../api/axios';
import { Search, UserPlus, UserCheck, Star, Briefcase, GraduationCap, Loader2, RefreshCw } from 'lucide-react';
import Toast, { type ToastType } from '../../components/Toast';
import { useTeacher, type Teacher } from '../../context/TeacherContext';


const TeacherAvatar = ({ teacher }: { teacher: Teacher }) => {
    const [imgError, setImgError] = useState(false);
    const avatarUrl = teacher.avatar_url?.startsWith('http')
        ? teacher.avatar_url
        : `${API_BASE_URL}${teacher.avatar_url}`;

    if (!teacher.avatar_url || imgError) {
        return (
            <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-2xl bg-gray-50">
                {teacher.full_name.charAt(0)}
            </div>
        );
    }

    return (
        <img
            src={avatarUrl}
            alt={teacher.full_name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
        />
    );
};

const Teachers = () => {
    const { teachers, loading, fetchTeachers, updateTeacherState } = useTeacher();
    const [processingIds, setProcessingIds] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    useEffect(() => {
        fetchTeachers();
    }, [fetchTeachers]);

    const showToast = (message: string, type: ToastType) => {
        setToast({ message, type });
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchTeachers(true);
        setIsRefreshing(false);
    };

    const handleFollowToggle = async (teacher: Teacher) => {
        if (processingIds.includes(teacher.id)) return;

        setProcessingIds(prev => [...prev, teacher.id]);

        // Optimistic update
        const previousState = { ...teacher };
        updateTeacherState({ ...teacher, is_following: !teacher.is_following });

        try {
            if (teacher.is_following) {
                await axios.post(`/api/users/unfollow/${teacher.id}`);
                showToast(`Unfollowed ${teacher.full_name}`, 'success');
            } else {
                await axios.post(`/api/users/follow/${teacher.id}`);
                showToast(`Followed ${teacher.full_name}`, 'success');
            }

        } catch (error) {
            console.error("Follow toggle failed", error);
            showToast("Action failed. Please try again.", 'error');
            // Revert on failure
            updateTeacherState(previousState);
        } finally {
            setProcessingIds(prev => prev.filter(id => id !== teacher.id));
        }
    };

    const filteredTeachers = teachers.filter(t =>
        t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.subjects && t.subjects.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-gradient-to-r from-white to-purple-50/50 p-8 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Teachers</h1>
                    <p className="text-gray-500 text-lg">Follow expert teachers to access their quizzes and exams.</p>
                </div>
            </div>

            {/* Search Bar & Reload */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or subject..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-gray-800 placeholder-gray-400 font-medium"
                    />
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={loading || isRefreshing}
                    className="p-3.5 rounded-2xl bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    title="Refresh list"
                >
                    <RefreshCw className={`w-5 h-5 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Grid */}
            {loading && teachers.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="bg-white p-6 rounded-3xl border border-gray-100 h-80 animate-pulse">
                            <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4"></div>
                            <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto mb-6"></div>
                            <div className="h-20 bg-gray-200 rounded w-full mb-6"></div>
                            <div className="h-10 bg-gray-200 rounded w-full mt-auto"></div>
                        </div>
                    ))}
                </div>
            ) : filteredTeachers.length === 0 ? (
                <div className="col-span-full py-20 text-center text-gray-400">
                    <p className="text-lg font-medium">No teachers found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTeachers.map((teacher) => (
                        <div key={teacher.id} className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-primary/5 to-purple-500/5"></div>

                            <div className="relative flex flex-col items-center text-center mb-6">
                                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg mb-4 overflow-hidden bg-gray-100 flex-shrink-0">
                                    <TeacherAvatar teacher={teacher} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">{teacher.full_name}</h3>
                                <p className="text-primary font-medium text-sm mb-3 flex items-center gap-1">
                                    <GraduationCap className="w-4 h-4" />
                                    {teacher.subjects || "General Subjects"}
                                </p>

                                <div className="flex gap-2 text-xs text-secondary-light font-medium bg-secondary-light/5 px-3 py-1.5 rounded-full">
                                    <Briefcase className="w-3.5 h-3.5" />
                                    <span>{teacher.experience || "Fresh"} Exp</span>
                                </div>
                            </div>

                            <p className="text-gray-500 text-sm italic mb-6 text-center line-clamp-3 px-2 flex-grow">
                                "{teacher.bio || "Passionate educator committed to student success."}"
                            </p>

                            <div className="mt-auto pt-6 border-t border-gray-50 w-full">
                                <button
                                    onClick={() => handleFollowToggle(teacher)}
                                    disabled={processingIds.includes(teacher.id)}
                                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed ${teacher.is_following
                                        ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100' // Unfollow style
                                        : 'bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/25 hover:shadow-primary/40' // Follow style
                                        }`}
                                >
                                    {processingIds.includes(teacher.id) ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : teacher.is_following ? (
                                        <>
                                            <UserCheck className="w-5 h-5" />
                                            Following
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="w-5 h-5" />
                                            Follow Teacher
                                        </>
                                    )}
                                </button>

                                <div className="mt-4 flex justify-between items-center text-xs font-bold uppercase tracking-wider text-gray-400">
                                    <span>{teacher.price_label || "Free"}</span>
                                    <span className="flex items-center gap-1 text-amber-400">
                                        <Star className="w-3 h-3 fill-current" />
                                        4.9
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Teachers;
