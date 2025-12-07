
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileCheck, Calendar, BrainCircuit, MessageSquare, BarChart3, LogOut } from 'lucide-react';
import clsx from 'clsx';

const Sidebar = () => {
    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: FileCheck, label: 'Exam Checker', path: '/exam-checker' },
        { icon: Calendar, label: 'Study Planner', path: '/study-planner' },
        { icon: BrainCircuit, label: 'Adaptive Quiz', path: '/adaptive-quiz' },
        { icon: MessageSquare, label: 'Doubt Solver', path: '/doubt-solver' },
        { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    ];

    return (
        <div className="h-screen w-64 bg-white border-r border-secondary-light/20 flex flex-col fixed left-0 top-0">
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <BrainCircuit className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-primary-dark">SmartLearn AI</span>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            clsx(
                                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
                                isActive
                                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                    : 'text-secondary hover:bg-secondary-light/10 hover:text-primary'
                            )
                        }
                    >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-secondary-light/20">
                <button className="flex items-center gap-3 px-4 py-3 w-full text-secondary hover:text-error hover:bg-error/10 rounded-xl transition-colors">
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
