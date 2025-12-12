import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, BrainCircuit, MessageSquare, BarChart3 } from 'lucide-react'; // Removed FileCheck, LogOut
import clsx from 'clsx';
// Removed useAuth import as it is unused if we remove logout logic completely, 
// wait, we still need to know the role? "const role = user?.role || 'student';"
// If we needed role for filtering, we'd need useAuth. 
// But in the previous code "const filteredItems = navItems;" so role wasn't really used for filtering logic yet.
// Removed useAuth import as it is unused if we remove logout logic completely, 
// import { useAuth } from '../context/AuthContext';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    // const { user } = useAuth(); // If we aren't using user/role yet, we can comment out or remove. 
    // The previous code had "const role = user?.role..." but barely used it.
    // Let's keep it minimal.
    // const { user } = useAuth();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Calendar, label: 'Study Planner', path: '/dashboard/study-planner' },
        { icon: BrainCircuit, label: 'Adaptive Quiz', path: '/dashboard/adaptive-quiz' },
        { icon: MessageSquare, label: 'Doubt Solver', path: '/dashboard/doubt-solver' },
        // { icon: FileCheck, label: 'Exam Checker', path: '/dashboard/exam-checker' }, // Optionally keep for student upload
        { icon: BarChart3, label: 'Analytics', path: '/dashboard/analytics' },
    ];

    // Filter items if needed, or just show all for student view
    const filteredItems = navItems;

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            <div className={clsx(
                "h-screen w-64 bg-white border-r border-secondary-light/20 flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 md:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}>
                <div className="p-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <BrainCircuit className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-xl text-primary-dark">SmartLearn AI</span>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-2">
                    {filteredItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/dashboard'} // Only exact match for dashboard home
                            onClick={() => onClose && onClose()} // Close sidebar on mobile click
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
            </div>
        </>
    );
};

export default Sidebar;
