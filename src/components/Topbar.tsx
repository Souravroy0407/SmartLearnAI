
import { Bell, Search, User } from 'lucide-react';

const Topbar = () => {
    return (
        <div className="h-16 bg-white border-b border-secondary-light/20 flex items-center justify-between px-8 fixed top-0 right-0 left-64 z-10">
            <div className="flex items-center gap-4 flex-1 max-w-xl">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
                    <input
                        type="text"
                        placeholder="Search for topics, exams, or doubts..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border-none focus:ring-2 focus:ring-primary/20 text-sm text-secondary-dark placeholder:text-secondary-light outline-none transition-all"
                    />
                </div>
            </div>

            <div className="flex items-center gap-6">
                <button className="relative p-2 text-secondary hover:text-primary transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
                </button>

                <div className="flex items-center gap-3 pl-6 border-l border-secondary-light/20">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-secondary-dark">Alex Johnson</p>
                        <p className="text-xs text-secondary">Class 12 • Science</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-white shadow-sm">
                        <User className="w-5 h-5 text-primary" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Topbar;
