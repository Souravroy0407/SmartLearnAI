import { LayoutDashboard, BookOpen, Settings, LogOut, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

const TeacherSidebar = ({ isOpen, onClose }: SidebarProps) => {
    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/teacher' },
        { icon: BookOpen, label: 'Exam Checker', path: '/teacher/exam-checker' },
        { icon: Settings, label: 'Quiz Management', path: '/teacher/quizzes' },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in"
                    onClick={onClose}
                />
            )}

            <aside className={clsx(
                "fixed left-0 top-0 h-screen w-64 bg-white border-r border-secondary-light/20 z-50 flex flex-col transition-transform duration-300 md:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="h-16 flex items-center justify-between px-6 border-b border-secondary-light/20">
                    <span className="font-bold text-xl text-secondary-dark">SmartLearn</span>
                    <button onClick={onClose} className="md:hidden p-1 text-secondary hover:bg-secondary-light/10 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/teacher'}
                            onClick={() => onClose?.()}
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
        </>
    );
};

export default TeacherSidebar;
