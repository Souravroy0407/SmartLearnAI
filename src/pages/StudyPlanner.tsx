import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, MoreVertical, Plus } from 'lucide-react';

const StudyPlanner = () => {
    const [selectedDate, setSelectedDate] = useState<number>(new Date().getDate());

    const days = [
        { day: 'Mon', date: 12, active: true },
        { day: 'Tue', date: 13, active: true },
        { day: 'Wed', date: 14, active: true },
        { day: 'Thu', date: 15, active: true },
        { day: 'Fri', date: 16, active: true },
        { day: 'Sat', date: 17, active: false },
        { day: 'Sun', date: 18, active: false },
    ];

    const tasks = [
        {
            id: 1,
            title: 'Physics: Rotational Motion',
            type: 'Revision',
            time: '09:00 AM - 10:30 AM',
            duration: '1h 30m',
            status: 'completed',
            color: 'bg-primary',
            textColor: 'text-primary'
        },
        {
            id: 2,
            title: 'Chemistry: Thermodynamics',
            type: 'Practice Quiz',
            time: '11:00 AM - 12:00 PM',
            duration: '1h',
            status: 'pending',
            color: 'bg-warning',
            textColor: 'text-warning'
        },
        {
            id: 3,
            title: 'Math: Calculus II',
            type: 'Video Lecture',
            time: '02:00 PM - 03:30 PM',
            duration: '1h 30m',
            status: 'pending',
            color: 'bg-error',
            textColor: 'text-error'
        },
        {
            id: 4,
            title: 'English: Essay Writing',
            type: 'Assignment',
            time: '04:00 PM - 05:00 PM',
            duration: '1h',
            status: 'pending',
            color: 'bg-success',
            textColor: 'text-success'
        }
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-dark mb-2">Smart Study Planner</h1>
                    <p className="text-secondary">Your AI-generated schedule for maximum productivity.</p>
                </div>
                <button className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-medium hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">
                    <Plus className="w-5 h-5" />
                    Add Custom Task
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Calendar Strip */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-secondary-light/20">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-secondary-dark">October 2025</h2>
                            <div className="flex gap-2">
                                <button className="p-2 hover:bg-secondary-light/10 rounded-lg transition-colors">
                                    <ChevronRight className="w-5 h-5 text-secondary rotate-180" />
                                </button>
                                <button className="p-2 hover:bg-secondary-light/10 rounded-lg transition-colors">
                                    <ChevronRight className="w-5 h-5 text-secondary" />
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            {days.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedDate(item.date)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${selectedDate === item.date
                                        ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110'
                                        : 'hover:bg-secondary-light/10 text-secondary'
                                        }`}
                                >
                                    <span className="text-xs font-medium opacity-80">{item.day}</span>
                                    <span className="text-lg font-bold">{item.date}</span>
                                    {item.active && (
                                        <span className={`w-1.5 h-1.5 rounded-full ${selectedDate === item.date ? 'bg-white' : 'bg-primary'}`}></span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-secondary-dark">Today's Schedule</h3>
                        <div className="space-y-4">
                            {tasks.map((task, index) => (
                                <motion.div
                                    key={task.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="group bg-white p-5 rounded-2xl shadow-sm border border-secondary-light/20 hover:shadow-md transition-all flex items-center gap-4"
                                >
                                    <div className="flex flex-col items-center gap-1 min-w-[80px]">
                                        <span className="text-sm font-bold text-secondary-dark">{task.time.split(' - ')[0]}</span>
                                        <span className="text-xs text-secondary-light">{task.duration}</span>
                                    </div>

                                    <div className={`w-1.5 h-12 rounded-full ${task.color} opacity-20 group-hover:opacity-100 transition-opacity`}></div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${task.color.replace('bg-', 'bg-')}/10 ${task.textColor}`}>
                                                {task.type}
                                            </span>
                                            {task.status === 'completed' && (
                                                <CheckCircle2 className="w-4 h-4 text-success" />
                                            )}
                                        </div>
                                        <h4 className="font-bold text-secondary-dark">{task.title}</h4>
                                    </div>

                                    <button className="p-2 text-secondary-light hover:text-secondary hover:bg-secondary-light/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                        <MoreVertical className="w-5 h-5" />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar Stats */}
                <div className="space-y-6">
                    <div className="bg-primary text-white p-6 rounded-3xl shadow-xl shadow-primary/20 relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold mb-1">Daily Goal</h3>
                            <p className="text-white/80 text-sm mb-6">You're doing great! Keep it up.</p>

                            <div className="flex items-end gap-2 mb-2">
                                <span className="text-4xl font-bold">4.5</span>
                                <span className="text-lg opacity-80 mb-1">/ 6 hrs</span>
                            </div>
                            <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                                <div className="h-full bg-white w-[75%] rounded-full"></div>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-secondary-light/20">
                        <h3 className="text-lg font-bold text-secondary-dark mb-4">Upcoming Exams</h3>
                        <div className="space-y-4">
                            {[
                                { name: 'Physics Midterm', date: 'Oct 24', daysLeft: '6 days' },
                                { name: 'Chemistry Final', date: 'Nov 02', daysLeft: '15 days' },
                            ].map((exam, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-background transition-colors">
                                    <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center text-error font-bold text-sm">
                                        {exam.date.split(' ')[1]}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-secondary-dark text-sm">{exam.name}</h4>
                                        <p className="text-xs text-secondary">{exam.date}</p>
                                    </div>
                                    <span className="text-xs font-medium text-primary bg-primary/5 px-2 py-1 rounded-md">
                                        {exam.daysLeft}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudyPlanner;
