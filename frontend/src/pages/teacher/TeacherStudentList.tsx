import { useState, useEffect } from 'react';
import { Users, Search, RefreshCw, X, GraduationCap, Calendar, Mail } from 'lucide-react';
import axios, { API_BASE_URL } from '../../api/axios';

interface Student {
    student_id: number;
    full_name: string;
    username: string;
    email: string;
    avatar_url: string | null;
    followed_at: string;
    status: string;
}

const TeacherStudentList = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter & Refresh States
    const [searchQuery, setSearchQuery] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async (userInput = false) => {
        if (userInput) setIsRefreshing(true);
        try {
            const response = await axios.get('/api/users/teacher/students');
            setStudents(response.data);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch students", err);
            setError("Failed to load students. Please try again.");
        } finally {
            setLoading(false);
            if (userInput) setIsRefreshing(false);
        }
    };

    const handleRefresh = () => {
        fetchStudents(true);
    };

    // Client-side filtering
    const filteredStudents = students.filter(student => {
        const query = searchQuery.toLowerCase();
        return (
            student.full_name.toLowerCase().includes(query) ||
            student.email.toLowerCase().includes(query) ||
            student.username.toLowerCase().includes(query)
        );
    });

    // Helper to format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="pt-10 space-y-8 relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Control Bar w/ Title, Count, Search, Reload */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">

                {/* Left Side: Title, Count AND Search Bar */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-x-3 w-full xl:w-auto">
                    {/* Title & Count */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                            <Users className="w-6 h-6" />
                        </div>
                        <div className="whitespace-nowrap">
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                Students
                                <span className="text-sm font-bold bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                                    {students.length}
                                </span>
                            </h1>
                            <p className="text-gray-500 text-sm font-medium">View students following you</p>
                        </div>
                    </div>

                    {/* Search bar now grouped with title with a small gap */}
                    <div className="relative w-full md:w-[320px] md:ml-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or email..."
                            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-gray-800 placeholder-gray-400 font-medium"
                        />
                    </div>
                </div>

                {/* Right Side: Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                    {/* Reload Button */}
                    <button
                        onClick={handleRefresh}
                        disabled={loading || isRefreshing}
                        className="p-3 px-4 rounded-2xl bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 font-medium"
                        title="Refresh list"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {/* Students List Container */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 min-h-[500px] flex flex-col">
                {error ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center px-4 flex-1">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
                            <X className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-6">{error}</p>
                        <button
                            onClick={handleRefresh}
                            className="px-6 py-2 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            Try Again
                        </button>
                    </div>
                ) : loading && !students.length ? (
                    <div className="flex flex-col items-center justify-center py-32 text-gray-400 flex-1">
                        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                        <p className="font-medium animate-pulse">Loading students...</p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-gray-400 flex-1">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <GraduationCap className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="text-lg font-bold text-gray-600">No students found</p>
                        <p className="text-sm">
                            {students.length === 0
                                ? "You don't have any followers yet."
                                : "Try adjusting your search query."}
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                        <div className="flex flex-col min-w-[900px]">
                            {/* Table Header */}
                            <div className="grid grid-cols-[3fr_2fr_1.5fr_1fr] gap-4 px-8 py-4 bg-gray-50/50 border-b border-gray-100 items-center">
                                <div className="text-xs font-extra-bold text-gray-400 uppercase tracking-wider">Student Profile</div>
                                <div className="text-xs font-extra-bold text-gray-400 uppercase tracking-wider">Contact Info</div>
                                <div className="text-xs font-extra-bold text-gray-400 uppercase tracking-wider">Followed Since</div>
                                <div className="text-xs font-extra-bold text-gray-400 uppercase tracking-wider">Status</div>
                            </div>

                            {/* Table Body */}
                            <div className="divide-y divide-gray-100 flex-1">
                                {filteredStudents.map((student) => (
                                    <div key={student.student_id} className="grid grid-cols-[3fr_2fr_1.5fr_1fr] gap-4 px-8 py-4 items-center group hover:bg-gray-50/50 transition-colors">
                                        {/* Student Profile */}
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            {student.avatar_url ? (
                                                <img
                                                    src={`${API_BASE_URL}${student.avatar_url}`}
                                                    alt={student.full_name}
                                                    className="w-10 h-10 rounded-xl object-cover border border-gray-100"
                                                    onError={(e) => {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.full_name)}&background=random`;
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center font-bold text-gray-600 shadow-inner text-sm border border-gray-100">
                                                    {student.full_name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <span className="block font-bold text-gray-900 text-sm truncate" title={student.full_name}>{student.full_name}</span>
                                            </div>
                                        </div>

                                        {/* Contact Info */}
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <Mail className="w-4 h-4 text-gray-300" />
                                            <span className="text-sm font-medium truncate" title={student.email}>{student.email}</span>
                                        </div>

                                        {/* Followed Since */}
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <Calendar className="w-4 h-4 text-gray-300" />
                                            <span className="text-sm font-medium">{formatDate(student.followed_at)}</span>
                                        </div>

                                        {/* Status */}
                                        <div>
                                            {student.status === 'active' ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherStudentList;
