
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, BookOpen, CheckCircle, Clock } from 'lucide-react';

const Dashboard = () => {
    const stats = [
        { label: 'Exams Checked', value: '14', change: '+2 this week', icon: CheckCircle, color: 'text-primary', bg: 'bg-primary/10' },
        { label: 'Average Score', value: '78%', change: '+5% vs last month', icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
        { label: 'Focus Area', value: 'Calculus II', change: 'Needs attention', icon: BookOpen, color: 'text-warning', bg: 'bg-warning/10' },
        { label: 'Study Hours', value: '24h', change: 'On track', icon: Clock, color: 'text-secondary', bg: 'bg-secondary/10' },
    ];

    const scoreData = [
        { name: 'Week 1', score: 65 },
        { name: 'Week 2', score: 72 },
        { name: 'Week 3', score: 68 },
        { name: 'Week 4', score: 78 },
        { name: 'Week 5', score: 82 },
        { name: 'Week 6', score: 75 },
        { name: 'Week 7', score: 85 },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-secondary-dark">Dashboard</h1>
                <p className="text-secondary">Welcome back, Alex! Here's your learning summary.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-light/20 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-xl ${stat.bg}`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${stat.color === 'text-success' ? 'bg-success/10 text-success' : 'bg-secondary/10 text-secondary'}`}>
                                {stat.change}
                            </span>
                        </div>
                        <h3 className="text-3xl font-bold text-secondary-dark mb-1">{stat.value}</h3>
                        <p className="text-sm text-secondary">{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Score Trend Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-secondary-light/20">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-secondary-dark">Score Trend History</h2>
                        <select className="bg-background border-none text-sm text-secondary font-medium focus:ring-0 cursor-pointer">
                            <option>Last 7 Weeks</option>
                            <option>Last 3 Months</option>
                        </select>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={scoreData}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Syllabus Progress */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-light/20">
                    <h2 className="text-lg font-bold text-secondary-dark mb-6">Syllabus Progress</h2>
                    <div className="space-y-6">
                        {[
                            { subject: 'Physics', progress: 75, color: 'bg-primary' },
                            { subject: 'Chemistry', progress: 45, color: 'bg-warning' },
                            { subject: 'Mathematics', progress: 90, color: 'bg-success' },
                            { subject: 'Biology', progress: 60, color: 'bg-error' },
                        ].map((item, index) => (
                            <div key={index}>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="font-medium text-secondary-dark">{item.subject}</span>
                                    <span className="text-secondary">{item.progress}%</span>
                                </div>
                                <div className="h-2 bg-background rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${item.color}`}
                                        style={{ width: `${item.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
