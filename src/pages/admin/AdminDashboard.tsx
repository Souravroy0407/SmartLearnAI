import { Users, BookOpen, Clock, TrendingUp, MoreVertical, Plus } from 'lucide-react';

const AdminDashboard = () => {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-dark mb-1">Teacher Dashboard</h1>
                    <p className="text-secondary">Welcome back, Prof. Anderson. Here's what's happening today.</p>
                </div>
                <button className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-medium hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">
                    <Plus className="w-5 h-5" />
                    Create New Quiz
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={Users}
                    label="Total Students"
                    value="1,240"
                    trend="+12%"
                    trendUp={true}
                    color="text-primary"
                    bg="bg-primary/10"
                />
                <StatCard
                    icon={BookOpen}
                    label="Active Courses"
                    value="8"
                    trend="Same"
                    trendUp={null}
                    color="text-purple-600"
                    bg="bg-purple-100"
                />
                <StatCard
                    icon={Clock}
                    label="Pending Reviews"
                    value="24"
                    trend="-5"
                    trendUp={true} // Interpreted as "good" that pending is down? Or just trend direction. Let's say improvement.
                    color="text-orange-600"
                    bg="bg-orange-100"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Avg. Class Score"
                    value="78%"
                    trend="+3%"
                    trendUp={true}
                    color="text-success"
                    bg="bg-green-100"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-secondary-light/10 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-secondary-dark">Recent Submissions</h2>
                        <button className="text-sm text-primary font-medium hover:underline">View All</button>
                    </div>
                    <div className="space-y-4">
                        <SubmissionItem
                            student="Alice Smith"
                            course="Physics 101"
                            exam="Midterm Exam"
                            score="92/100"
                            time="2 mins ago"
                            img="https://api.dicebear.com/7.x/avataaars/svg?seed=Alice"
                        />
                        <SubmissionItem
                            student="Bob Johnson"
                            course="Math 202"
                            exam="Calculus Quiz"
                            score="78/100"
                            time="15 mins ago"
                            img="https://api.dicebear.com/7.x/avataaars/svg?seed=Bob"
                        />
                        <SubmissionItem
                            student="Charlie Brown"
                            course="Chemistry 101"
                            exam="Lab Report"
                            score="Pending"
                            time="1 hour ago"
                            img="https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie"
                            pending
                        />
                        <SubmissionItem
                            student="Diana Prince"
                            course="Physics 101"
                            exam="Midterm Exam"
                            score="88/100"
                            time="2 hours ago"
                            img="https://api.dicebear.com/7.x/avataaars/svg?seed=Diana"
                        />
                    </div>
                </div>

                {/* Quick Actions / Classes */}
                <div className="bg-white rounded-3xl p-6 border border-secondary-light/10 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-secondary-dark">My Classes</h2>
                        <button className="p-2 hover:bg-secondary-light/10 rounded-full text-secondary">
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="space-y-4">
                        <ClassItem name="Physics 101" students={42} nextClass="10:00 AM Today" color="bg-blue-500" />
                        <ClassItem name="Math 202" students={35} nextClass="2:00 PM Tomorrow" color="bg-purple-500" />
                        <ClassItem name="Chemistry 101" students={28} nextClass="11:00 AM Wed" color="bg-green-500" />
                    </div>

                    <button className="w-full mt-6 py-3 border-2 border-dashed border-secondary-light/30 rounded-xl text-secondary font-medium hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add New Class
                    </button>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ icon: Icon, label, value, trend, trendUp, color, bg }: any) => (
    <div className="bg-white p-6 rounded-3xl border border-secondary-light/10 shadow-sm flex items-start justify-between">
        <div>
            <p className="text-secondary text-sm font-medium mb-1">{label}</p>
            <h3 className="text-3xl font-bold text-secondary-dark mb-2">{value}</h3>
            {trendUp !== null && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                    {trend} from last month
                </span>
            )}
            {trendUp === null && (
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-secondary-light/10 text-secondary">
                    {trend}
                </span>
            )}
        </div>
        <div className={`p-4 rounded-2xl ${bg}`}>
            <Icon className={`w-6 h-6 ${color}`} />
        </div>
    </div>
);

const SubmissionItem = ({ student, course, exam, score, time, img, pending }: any) => (
    <div className="flex items-center justify-between p-4 hover:bg-secondary-light/5 rounded-2xl transition-colors group">
        <div className="flex items-center gap-4">
            <img src={img} alt={student} className="w-10 h-10 rounded-full bg-secondary-light/10" />
            <div>
                <h4 className="font-bold text-secondary-dark">{student}</h4>
                <p className="text-xs text-secondary">{course} • {exam}</p>
            </div>
        </div>
        <div className="text-right">
            <span className={`block font-bold ${pending ? 'text-orange-500' : 'text-secondary-dark'}`}>{score}</span>
            <span className="text-xs text-secondary-light">{time}</span>
        </div>
    </div>
);

const ClassItem = ({ name, students, nextClass, color }: any) => (
    <div className="flex items-center gap-4 p-3 bg-secondary-light/5 rounded-2xl">
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white font-bold text-lg shadow-lg opacity-90`}>
            {name.charAt(0)}
        </div>
        <div>
            <h4 className="font-bold text-secondary-dark">{name}</h4>
            <p className="text-xs text-secondary">{students} Students • Next: {nextClass}</p>
        </div>
    </div>
);

export default AdminDashboard;
