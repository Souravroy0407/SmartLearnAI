import { motion } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    BarChart, Bar
} from 'recharts';
import { TrendingUp, Clock, Target, Award, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const Analytics = () => {
    const subjectData = [
        { subject: 'Physics', A: 120, fullMark: 150 },
        { subject: 'Chemistry', A: 98, fullMark: 150 },
        { subject: 'Math', A: 86, fullMark: 150 },
        { subject: 'Biology', A: 99, fullMark: 150 },
        { subject: 'English', A: 85, fullMark: 150 },
        { subject: 'History', A: 65, fullMark: 150 },
    ];

    const progressData = [
        { name: 'Week 1', score: 65 },
        { name: 'Week 2', score: 72 },
        { name: 'Week 3', score: 68 },
        { name: 'Week 4', score: 85 },
        { name: 'Week 5', score: 82 },
        { name: 'Week 6', score: 90 },
    ];

    const timeData = [
        { name: 'Mon', hours: 4.5 },
        { name: 'Tue', hours: 5.2 },
        { name: 'Wed', hours: 3.8 },
        { name: 'Thu', hours: 6.0 },
        { name: 'Fri', hours: 4.2 },
        { name: 'Sat', hours: 7.5 },
        { name: 'Sun', hours: 2.0 },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-dark mb-2">Performance Analytics</h1>
                    <p className="text-secondary">Deep dive into your learning progress and habits.</p>
                </div>
                <div className="flex gap-2">
                    <select className="bg-white border border-secondary-light/20 text-secondary-dark px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20">
                        <option>Last 7 Days</option>
                        <option>Last 30 Days</option>
                        <option>This Semester</option>
                    </select>
                    <button className="bg-primary text-white px-4 py-2 rounded-xl font-medium hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">
                        Export Report
                    </button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Average Score"
                    value="82%"
                    trend="+5.4%"
                    trendUp={true}
                    icon={TrendingUp}
                    color="text-primary"
                    bg="bg-primary/10"
                />
                <MetricCard
                    title="Study Hours"
                    value="32.5h"
                    trend="-2.1%"
                    trendUp={false}
                    icon={Clock}
                    color="text-warning"
                    bg="bg-warning/10"
                />
                <MetricCard
                    title="Tests Taken"
                    value="14"
                    trend="+3"
                    trendUp={true}
                    icon={Target}
                    color="text-success"
                    bg="bg-success/10"
                />
                <MetricCard
                    title="Class Rank"
                    value="Top 5%"
                    trend="Same"
                    trendUp={true}
                    icon={Award}
                    color="text-purple-500"
                    bg="bg-purple-500/10"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Score Trend */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-3xl shadow-sm border border-secondary-light/20"
                >
                    <h3 className="text-lg font-bold text-secondary-dark mb-6">Score Trajectory</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={progressData}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Subject Radar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-6 rounded-3xl shadow-sm border border-secondary-light/20"
                >
                    <h3 className="text-lg font-bold text-secondary-dark mb-6">Subject Proficiency</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={subjectData}>
                                <PolarGrid stroke="#E2E8F0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                                <Radar name="Student" dataKey="A" stroke="#10B981" strokeWidth={2} fill="#10B981" fillOpacity={0.3} />
                                <Tooltip />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Study Time Bar Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-6 rounded-3xl shadow-sm border border-secondary-light/20 lg:col-span-2"
                >
                    <h3 className="text-lg font-bold text-secondary-dark mb-6">Daily Study Hours</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={timeData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} />
                                <Tooltip
                                    cursor={{ fill: '#F1F5F9' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="hours" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, trend, trendUp, icon: Icon, color, bg }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-light/20">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl ${bg}`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${trendUp ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {trend}
            </div>
        </div>
        <h3 className="text-secondary text-sm font-medium mb-1">{title}</h3>
        <p className="text-2xl font-bold text-secondary-dark">{value}</p>
    </div>
);

export default Analytics;
