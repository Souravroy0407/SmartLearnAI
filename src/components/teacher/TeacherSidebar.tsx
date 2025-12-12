import { LayoutDashboard, Users, BookOpen, Clock, Settings, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const TeacherSidebar = () => {
    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/teacher' },
        { icon: BookOpen, label: 'Exam Checker', path: '/teacher/exam-checker' },
        { icon: Settings, label: 'Quiz Management', path: '/teacher/quizzes' },
    ];

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-secondary-light/20 z-40 flex flex-col">
            <div className="h-16 flex items-center px-8 border-b border-secondary-light/20">
                <span className="font-bold text-xl text-secondary-dark">SmartLearn Teacher</span>
            </div>

            <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/teacher'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-primary text-white shadow-lg shadow-primary/25 translate-x-1'
                                : 'text-secondary hover:bg-secondary-light/10 hover:text-secondary-dark hover:translate-x-1'
                            }`
                        }
                    >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-secondary-light/20">
                <NavLink
                    to="/"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all duration-200"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                </NavLink>
            </div>
        </aside>
    );
};

export default TeacherSidebar;
