import { useState, useEffect, useRef, useMemo } from 'react';
import { FileText, Clock, Play, CheckCircle, Info, Calendar, X, Search, BookOpen, AlertTriangle, Filter, ChevronDown, Check, ChevronRight, User, ArrowLeft, BarChart2, RefreshCw } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuiz, type Quiz } from '../../context/QuizContext';
import { useTeacher } from '../../context/TeacherContext';
import { formatDateTime } from '../../utils/date';


interface QuizDetailsModalProps {
    quiz: Quiz;
    onClose: () => void;
}

type FilterType = 'all' | 'expired' | 'unattempted' | 'attempted';
type ViewMode = 'TEACHERS' | 'SUBJECTS' | 'QUIZZES';

const QuizDetailsModal = ({ quiz, onClose }: QuizDetailsModalProps) => {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                </button>

                <div className="mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 text-primary">
                        <FileText className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 pr-10 leading-tight">{quiz.title}</h2>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                        <div className="p-2 bg-white rounded-xl shadow-sm text-primary">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Published On</p>
                            <p className="text-gray-800 font-medium text-sm">{formatDateTime(quiz.created_at)}</p>
                        </div>
                    </div>

                    <div className={`flex items-center gap-4 p-3 rounded-2xl border ${quiz.deadline ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                        <div className={`p-2 bg-white rounded-xl shadow-sm ${quiz.deadline ? 'text-red-500' : 'text-gray-400'}`}>
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-wider ${quiz.deadline ? 'text-red-500/70' : 'text-gray-500'}`}>Deadline</p>
                            <p className={`font-medium text-sm ${quiz.deadline ? 'text-red-700' : 'text-gray-800'}`}>
                                {quiz.deadline ? formatDateTime(quiz.deadline) : 'No Deadline'}
                            </p>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-sm text-gray-600 leading-relaxed">
                        {quiz.description || "No description provided."}
                    </div>

                    <div className="flex gap-2">
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold uppercase rounded-lg">
                            {quiz.topic || "General"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};



const StudentQuizList = () => {
    const { quizzes, loading: quizzesLoading, hasFetched, fetchQuizzes } = useQuiz();
    const { teachers, loading: teachersLoading, fetchTeachers } = useTeacher();

    // Drill-down Persistence Logic
    const [searchParams, setSearchParams] = useSearchParams();

    const selectedTeacherId = searchParams.get('teacher') ? Number(searchParams.get('teacher')) : null;
    const selectedSubject = searchParams.get('subject');

    // Derived ViewMode
    const viewMode: ViewMode = useMemo(() => {
        if (selectedTeacherId && selectedSubject) return 'QUIZZES';
        if (selectedTeacherId) return 'SUBJECTS';
        return 'TEACHERS';
    }, [selectedTeacherId, selectedSubject]);

    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Close filter dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        fetchTeachers();
        fetchQuizzes();
    }, [fetchTeachers, fetchQuizzes]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        // Refresh both to ensure drill-down counts are accurate (e.g. if a teacher added a new quiz)
        await Promise.all([fetchTeachers(), fetchQuizzes(true)]);
        setIsRefreshing(false);
    };



    const handleStartQuiz = (quizId: number) => {
        navigate(`/student/quiz/${quizId}`);
    };

    const handleViewResult = (quizId: number) => {
        navigate(`/dashboard/student-quiz-result/${quizId}`);
    };

    // --- DRILL-DOWN LOGIC ---

    // 1. Filter ONLY followed teachers
    const followedTeachers = useMemo(() =>
        teachers.filter(t => t.is_following),
        [teachers]);

    const selectedTeacher = useMemo(() =>
        teachers.find(t => t.id === selectedTeacherId),
        [teachers, selectedTeacherId]);

    // Get subjects for selected teacher that actually have quizzes
    const teacherSubjects = useMemo(() => {
        if (!selectedTeacher) return [];

        // 1. Get subjects from teacher profile (Normalizing: trim & lowercase)
        const profileSubjects = selectedTeacher.subjects
            ? selectedTeacher.subjects.split(',').map(s => s.trim()).filter(Boolean)
            : [];

        // 2. Filter quizzes for this teacher FIRST (using correct Profile ID)
        const targetTeacherProfileId = selectedTeacher.teacher_id;
        if (!targetTeacherProfileId) return [];

        const teacherQuizzes = quizzes.filter(q => q.teacher_id === targetTeacherProfileId);

        // 3. Map subjects to quiz counts with normalization
        const subjectCounts = profileSubjects.reduce((acc, rawSubject) => {
            const normalizedProfileSubject = rawSubject.toLowerCase();

            // Count quizzes that match this subject (case-insensitive)
            const count = teacherQuizzes.filter(q =>
                (q.subject || '').trim().toLowerCase() === normalizedProfileSubject
            ).length;

            acc.push({ name: rawSubject, count });
            return acc;
        }, [] as { name: string; count: number }[]);

        return subjectCounts;
    }, [selectedTeacher, quizzes]);

    // Filter quizzes for the final view
    const filteredQuizzes = useMemo(() => {
        let result = [...quizzes];

        // STEP 1: Drill-down (Teacher + Subject)
        if (viewMode === 'QUIZZES') {
            if (!selectedTeacherId || !selectedSubject) return [];

            // Must use Teacher Profile ID from the teacher object
            const teacherProfileId = selectedTeacher?.teacher_id;
            const subjectKey = selectedSubject.trim().toLowerCase();

            if (!teacherProfileId) return [];

            result = result.filter(q =>
                q.teacher_id === teacherProfileId &&
                (q.subject || '').trim().toLowerCase() === subjectKey
            );
        } else {
            // Not in quiz view
            return [];
        }

        // STEP 2: Search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(q =>
                q.title.toLowerCase().includes(query) ||
                (q.description || '').toLowerCase().includes(query)
            );
        }

        // STEP 3: Status Filter (STRICT)
        if (filterType === 'expired') {
            result = result.filter(q => q.is_expired);
        }

        if (filterType === 'attempted') {
            result = result.filter(q => q.status === 'attempted');
        }

        if (filterType === 'unattempted') {
            result = result.filter(q => !q.is_expired && q.status !== 'attempted');
        }

        // STEP 4: Sorting (Unified)
        result.sort((a, b) => {
            // Priority: Expired (last/first?) -> The user request said "Result Sort" but didn't specify priority for mixed list
            // However, the requested logic for Sorting ONLY was specific:
            // "if (a.is_expired !== b.is_expired) return a.is_expired ? 1 : -1;" -> Expired at bottom?
            // "if (a.status !== b.status) return a.status === 'attempted' ? 1 : -1;" -> Attempted at bottom?
            // "return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();" -> Newest first

            // Replicating exactly (Expired -> Bottom, Attempted -> Middle, Active -> Top)
            const getPriority = (q: Quiz) => {
                if (q.is_expired) return 3;
                if (q.status === 'attempted') return 2;
                return 1;
            };

            const pA = getPriority(a);
            const pB = getPriority(b);

            if (pA !== pB) return pA - pB;

            // Default sort by Created At
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        return result;
    }, [quizzes, searchQuery, filterType, viewMode, selectedTeacherId, selectedSubject, selectedTeacher]);

    // Navigation Handlers (Updated for URL Persistence)
    const handleTeacherSelect = (teacherId: number) => {
        setSearchParams({ teacher: teacherId.toString() });
        setSearchQuery('');
    };

    const handleSubjectSelect = (subject: string) => {
        if (selectedTeacherId) {
            setSearchParams({
                teacher: selectedTeacherId.toString(),
                subject: subject
            });
            setSearchQuery('');
        }
    };

    const handleBackToTeachers = () => {
        setSearchParams({});
        setSearchQuery('');
    };

    const handleBackToSubjects = () => {
        if (selectedTeacherId) {
            setSearchParams({ teacher: selectedTeacherId.toString() });
            setSearchQuery('');
        } else {
            setSearchParams({});
        }
    };

    // Breadcrumbs Component
    const renderBreadcrumbs = () => (
        <div className="flex items-center gap-2 text-sm font-medium mb-6 text-gray-500 overflow-x-auto whitespace-nowrap pb-2 scrollbar-hide">
            <button
                onClick={handleBackToTeachers}
                className={`flex items-center hover:text-primary transition-colors ${viewMode === 'TEACHERS' ? 'text-primary font-bold' : ''}`}
            >
                <User className="w-4 h-4 mr-1" />
                Teachers
            </button>

            {(viewMode === 'SUBJECTS' || viewMode === 'QUIZZES') && selectedTeacher && (
                <>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    <button
                        onClick={handleBackToSubjects}
                        disabled={viewMode === 'SUBJECTS'}
                        className={`flex items-center hover:text-primary transition-colors ${viewMode === 'SUBJECTS' ? 'text-primary font-bold cursor-default' : ''}`}
                    >
                        <span className="max-w-[150px] truncate">{selectedTeacher.full_name}</span>
                    </button>
                </>
            )}

            {viewMode === 'QUIZZES' && selectedSubject && (
                <>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    <span className="text-primary font-bold flex items-center">
                        <BookOpen className="w-4 h-4 mr-1" />
                        {selectedSubject}
                    </span>
                </>
            )}
        </div>
    );

    // --- VIEW RENDERERS ---

    const renderTeacherList = () => {
        if (teachersLoading && teachers.length === 0) {
            return (
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {[1, 2, 3, 4].map(n => (
                        <div key={n} className="min-w-[200px] h-20 bg-gray-100 rounded-2xl animate-pulse" />
                    ))}
                </div>
            );
        }

        if (followedTeachers.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-10 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                    <User className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium mb-4">You aren't following any teachers yet.</p>
                    <button
                        onClick={() => navigate('/dashboard/teachers')}
                        className="px-5 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
                    >
                        Find Teachers
                    </button>
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-3 pb-4">
                {followedTeachers.map((teacher) => (
                    <button
                        key={teacher.id}
                        onClick={() => handleTeacherSelect(teacher.id)}
                        className={`
                            group w-full flex items-center bg-white border p-3 rounded-2xl shadow-sm transition-all text-left relative overflow-hidden
                            ${selectedTeacherId === teacher.id
                                ? 'border-primary ring-1 ring-primary shadow-md bg-primary/5'
                                : 'border-gray-100 hover:shadow-md hover:border-primary/20'}
                        `}
                    >
                        {/* Left Accent & Label */}
                        <div className={`
                            flex flex-col items-center justify-center mr-4 pl-1 border-l-4 transition-colors h-10 w-16
                            ${selectedTeacherId === teacher.id ? 'border-primary' : 'border-primary/20 group-hover:border-primary'}
                        `}>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Teacher</span>
                        </div>

                        {/* Center Info */}
                        <div className="flex-1 min-w-0">
                            <h3 className={`font-bold truncate transition-colors ${selectedTeacherId === teacher.id ? 'text-primary' : 'text-gray-900 group-hover:text-primary'}`}>
                                {teacher.full_name}
                            </h3>
                            <p className="text-xs text-gray-500 font-medium truncate">@{teacher.username}</p>
                        </div>

                        {/* Right Icon */}
                        <div className={`p-2 rounded-full transition-colors ${selectedTeacherId === teacher.id ? 'bg-primary text-white' : 'bg-transparent text-gray-300 group-hover:text-primary'}`}>
                            <ChevronRight className="w-5 h-5" />
                        </div>
                    </button>
                ))}
            </div>
        );
    };

    const renderSubjectList = () => {
        if (quizzesLoading || !hasFetched) {
            return (
                <div className="flex flex-col gap-3 pb-4">
                    {[1, 2, 3].map(n => (
                        <div key={n} className="w-full h-16 bg-white border border-gray-100 rounded-2xl animate-pulse" />
                    ))}
                </div>
            );
        }

        if (teacherSubjects.length === 0) {
            return (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No subjects with quizzes found.</p>
                    <button onClick={handleBackToTeachers} className="mt-4 text-primary font-bold hover:underline">
                        Choose another teacher
                    </button>
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-3 pb-4">
                {teacherSubjects.map((sub, idx) => (
                    <button
                        key={idx}
                        onClick={() => sub.count > 0 && handleSubjectSelect(sub.name)}
                        disabled={sub.count === 0}
                        className={`
                            group w-full flex items-center bg-white border p-3 rounded-2xl shadow-sm transition-all text-left relative overflow-hidden
                            ${sub.count > 0
                                ? 'border-gray-100 hover:shadow-md hover:border-primary/20 cursor-pointer'
                                : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'}
                            ${selectedSubject === sub.name && sub.count > 0 ? 'border-primary ring-1 ring-primary bg-primary/5 shadow-md' : ''}
                        `}
                    >
                        {/* Left Accent & Label */}
                        <div className={`
                            flex flex-col items-center justify-center mr-4 pl-1 border-l-4 transition-colors h-10 w-16
                            ${sub.count > 0 ? 'border-primary/20 group-hover:border-primary' : 'border-gray-200'}
                            ${selectedSubject === sub.name ? 'border-primary' : ''}
                        `}>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Subject</span>
                        </div>

                        {/* Center Info */}
                        <div className="flex-1 min-w-0">
                            <h3 className={`font-bold truncate transition-colors ${sub.count > 0 ? 'text-gray-900 group-hover:text-primary' : 'text-gray-400'} ${selectedSubject === sub.name ? 'text-primary' : ''}`}>
                                {sub.name}
                            </h3>
                            <p className="text-xs text-gray-500 font-medium">
                                {sub.count > 0 ? `${sub.count} ${sub.count === 1 ? 'Quiz' : 'Quizzes'}` : 'No quizzes yet'}
                            </p>
                        </div>

                        {/* Right Icon */}
                        {sub.count > 0 && (
                            <div className={`p-2 rounded-full transition-colors ${selectedSubject === sub.name ? 'bg-primary text-white' : 'bg-transparent text-gray-300 group-hover:text-primary'}`}>
                                <ChevronRight className="w-5 h-5" />
                            </div>
                        )}
                    </button>
                ))}
            </div>
        );
    };

    const renderQuizList = () => (
        <>
            {/* Filter Bar */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 mb-6 relative">
                <div className="p-4 bg-gray-50/30 flex gap-4 rounded-[2rem]">
                    {/* Back Button for mobile/convenience */}
                    <button
                        onClick={handleBackToSubjects}
                        className="p-3.5 rounded-2xl bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all active:scale-95 md:hidden"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search quizzes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-gray-800 placeholder-gray-400 font-medium"
                        />
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing || quizzesLoading}
                        className="p-3.5 rounded-2xl bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                        title="Refresh quizzes"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing || quizzesLoading ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Filter Dropdown */}
                    <div className="relative ml-auto" ref={filterRef}>
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`
                                flex items-center gap-2 px-4 py-3.5 rounded-2xl border transition-all active:scale-95
                                ${isFilterOpen || filterType !== 'all'
                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                    : 'bg-white border-gray-200 text-gray-700 hover:text-primary hover:border-primary hover:bg-primary/5'}
                            `}
                        >
                            <Filter className="w-5 h-5" />
                            <span className="font-medium hidden md:inline">Filter</span>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isFilterOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-2 space-y-1">
                                    {(['all', 'expired', 'unattempted', 'attempted'] as const).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => {
                                                setFilterType(type);
                                                setIsFilterOpen(false);
                                            }}
                                            className={`
                                                w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                                                ${filterType === type
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                                            `}
                                        >
                                            <div className="flex items-center gap-2">
                                                {type === 'all' && <BookOpen className="w-4 h-4 opacity-70" />}
                                                {type === 'expired' && <AlertTriangle className="w-4 h-4 opacity-70" />}
                                                {type === 'unattempted' && <Play className="w-4 h-4 opacity-70" />}
                                                {type === 'attempted' && <CheckCircle className="w-4 h-4 opacity-70" />}

                                                <span className="capitalize">
                                                    {type === 'all' ? 'Show All' : `${type} Only`}
                                                </span>
                                            </div>
                                            {filterType === type && <Check className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(quizzesLoading || !hasFetched) ? (
                    // Skeleton Loading State
                    [1, 2, 3, 4, 5, 6].map((n) => (
                        <div key={n} className="bg-white border border-gray-100 rounded-3xl p-6 h-[280px] animate-pulse flex flex-col">
                            <div className="flex justify-between items-start mb-6">
                                <div className="h-6 w-24 bg-gray-100 rounded-xl"></div>
                            </div>
                            <div className="h-7 w-3/4 bg-gray-100 rounded-lg mb-2"></div>
                            <div className="h-5 w-16 bg-gray-100 rounded-md mb-4"></div>
                            <div className="h-10 w-full bg-gray-100 rounded-md mb-6 flex-1"></div>
                            <div className="grid grid-cols-[auto_1fr] gap-3 pt-4 border-t border-gray-50 mt-auto">
                                <div className="h-12 w-12 bg-gray-100 rounded-xl"></div>
                                <div className="h-12 w-full bg-gray-100 rounded-xl"></div>
                            </div>
                        </div>
                    ))
                ) : filteredQuizzes.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-gray-400 flex flex-col items-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <BookOpen className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="text-lg font-medium text-gray-500">No active quizzes found</p>
                        <p className="text-sm mb-6 text-gray-400">Try adjusting filters or check back later.</p>
                    </div>
                ) : (
                    filteredQuizzes.map((quiz) => {
                        let uiStatus: 'EXPIRED' | 'COMPLETED' | 'AVAILABLE';
                        if (quiz.is_expired) {
                            uiStatus = 'EXPIRED';
                        } else if (quiz.status === 'attempted') {
                            uiStatus = 'COMPLETED';
                        } else {
                            uiStatus = 'AVAILABLE';
                        }

                        return (
                            <div
                                key={quiz.id}
                                className={`
                                    group bg-white border rounded-3xl p-6 relative flex flex-col
                                    transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/50
                                    ${uiStatus === 'AVAILABLE' ? 'border-gray-100 hover:border-primary/20' :
                                        uiStatus === 'COMPLETED' ? 'border-green-100 bg-green-50/10' :
                                            'border-gray-100 bg-gray-50/50 opacity-80 hover:opacity-100'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`
                                    flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider
                                    ${uiStatus === 'EXPIRED' ? 'bg-red-100 text-red-700' :
                                            uiStatus === 'COMPLETED' ? 'bg-green-100 text-green-700 shadow-green-100/50' :
                                                'bg-blue-50 text-blue-700 shadow-blue-100/50'}
                                `}>
                                        {uiStatus === 'EXPIRED' ? <AlertTriangle className="w-4 h-4" /> :
                                            uiStatus === 'COMPLETED' ? <CheckCircle className="w-4 h-4" /> :
                                                <Play className="w-4 h-4 fill-current" />}
                                        {uiStatus === 'EXPIRED' ? 'Expired' : uiStatus === 'COMPLETED' ? 'Completed' : 'Active'}
                                    </div>

                                </div>

                                <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-1 group-hover:text-primary transition-colors">{quiz.title}</h3>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="text-xs font-medium px-2 py-0.5 bg-gray-50 text-gray-500 rounded border border-gray-100">
                                        {quiz.topic || "General"}
                                    </span>
                                </div>

                                <p className="text-gray-500 text-sm mb-6 line-clamp-2 h-10">{quiz.description}</p>

                                <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 mt-auto">
                                    <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg group/info relative cursor-help">
                                        <FileText className="w-4 h-4 text-gray-400 group-hover/info:text-primary transition-colors" />
                                        <span className="font-medium">{quiz.questions_count} Qs</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg group/info relative cursor-help">
                                        <Clock className="w-4 h-4 text-gray-400 group-hover/info:text-primary transition-colors" />
                                        <span className="font-medium">{quiz.duration_minutes}m</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-[auto_1fr] gap-3 pt-4 border-t border-gray-50">
                                    <button
                                        onClick={() => setSelectedQuiz(quiz)}
                                        className="p-3 rounded-xl border border-gray-100 text-gray-400 hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-colors"
                                        title="View Details"
                                    >
                                        <Info className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (quiz.status === 'attempted') handleViewResult(quiz.id);
                                            else handleStartQuiz(quiz.id);
                                        }}
                                        disabled={uiStatus === 'EXPIRED' && quiz.status !== 'attempted'}
                                        className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 ${quiz.status === 'attempted'
                                            ? 'bg-green-600 text-white shadow-green-200 hover:shadow-green-300 hover:bg-green-700'
                                            : uiStatus === 'EXPIRED'
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                                : 'bg-primary text-white hover:bg-primary-dark shadow-primary/25 hover:shadow-primary/40'
                                            }`}
                                    >
                                        {quiz.status === 'attempted' ? (
                                            <>
                                                <BarChart2 className="w-5 h-5" />
                                                View Result
                                            </>
                                        ) : uiStatus === 'EXPIRED' ? (
                                            <>
                                                <Clock className="w-5 h-5" />
                                                Expired
                                            </>
                                        ) : (
                                            <>
                                                Start Quiz
                                                <Play className="w-4 h-4 fill-current" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </>
    );

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-gradient-to-r from-white to-gray-50/50 p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Available Quizzes</h1>
                    <p className="text-gray-500 text-lg">
                        {viewMode === 'TEACHERS' && "Your teachers"}
                        {viewMode === 'SUBJECTS' && `Select a subject from ${selectedTeacher?.full_name}.`}
                        {viewMode === 'QUIZZES' && `Viewing ${selectedSubject} quizzes by ${selectedTeacher?.full_name}.`}
                    </p>
                </div>

                {viewMode !== 'QUIZZES' && (
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing || quizzesLoading}
                        className="p-3 rounded-2xl bg-white/50 border border-gray-200/50 text-gray-500 hover:text-primary hover:bg-white hover:border-primary/20 hover:shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none mb-1 backdrop-blur-sm"
                        title="Refresh data"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing || quizzesLoading ? 'animate-spin' : ''}`} />
                    </button>
                )}
            </div>

            {/* Breadcrumb Navigation */}
            {renderBreadcrumbs()}

            {/* Main Content Area */}
            <div className="min-h-[500px]">
                {viewMode === 'TEACHERS' && renderTeacherList()}
                {viewMode === 'SUBJECTS' && renderSubjectList()}
                {viewMode === 'QUIZZES' && renderQuizList()}
            </div>

            {selectedQuiz && (
                <QuizDetailsModal quiz={selectedQuiz} onClose={() => setSelectedQuiz(null)} />
            )}
        </div >
    );
};

export default StudentQuizList;
