import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import TeacherSidebar from '../components/teacher/TeacherSidebar';
import Topbar from '../components/Topbar';

const TeacherLayout = () => {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background font-sans text-secondary-dark">
            <TeacherSidebar
                isOpen={isMobileSidebarOpen}
                onClose={() => setIsMobileSidebarOpen(false)}
            />

            <Topbar onMenuClick={() => setIsMobileSidebarOpen(true)} />

            <main className="md:pl-64 pt-16 min-h-screen transition-all duration-300">
                <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default TeacherLayout;
