import { Users, BookOpen, Clock, Activity } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, trend, trendUp }: { icon: any, label: string, value: string, trend: string, trendUp: boolean }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-light/10">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl ${trendUp ? 'bg-primary/10' : 'bg-purple-100'}`}>
                <Icon className={`w-6 h-6 ${trendUp ? 'text-primary' : 'text-purple-600'}`} />
            </div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {trend}
            </span>
        </div>
        <h3 className="text-secondary text-sm font-medium mb-1">{label}</h3>
        <p className="text-2xl font-bold text-secondary-dark">{value}</p>
    </div>
);

const TeacherDashboard = () => {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-dark">Teacher Dashboard</h1>
                    <p className="text-secondary">Welcome back, Professor! Here's what's happening today.</p>
                </div>
                <div className="flex gap-4">
                    <button className="bg-primary text-white px-6 py-2 rounded-xl font-medium hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">
                        Create Assignment
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={Users}
                    label="Total Students"
                    value="156"
                    trend="+12%"
                    trendUp={true}
                />
                <StatCard
                    icon={BookOpen}
                    label="Active Courses"
                    value="8"
                    trend="+2"
                    trendUp={true}
                />
                <StatCard
                    icon={Clock}
                    label="Hours Taught"
                    value="32.5"
                    trend="+4%"
                    trendUp={true}
                />
                <StatCard
                    icon={Activity}
                    label="Avg. Attendance"
                    value="94%"
                    trend="-1%"
                    trendUp={false}
                />
            </div>

            {/* Main Content Area - Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-secondary-light/10 p-6 min-h-[400px]">
                    <h2 className="text-lg font-bold text-secondary-dark mb-4">Class Performance</h2>
                    <div className="flex items-center justify-center h-full text-secondary">
                        <p>Chart or graph placeholder</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-secondary-light/10 p-6">
                    <h2 className="text-lg font-bold text-secondary-dark mb-4">Upcoming Classes</h2>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-secondary-light/5 transition-colors cursor-pointer border border-transparent hover:border-secondary-light/10">
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    09:00
                                </div>
                                <div>
                                    <h4 className="font-semibold text-secondary-dark">Advanced Mathematics</h4>
                                    <p className="text-xs text-secondary">Class 12-A • Room 302</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;
