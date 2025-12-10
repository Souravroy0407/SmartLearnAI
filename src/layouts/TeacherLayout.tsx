import { Outlet } from 'react-router-dom';
import TeacherSidebar from '../components/teacher/TeacherSidebar';
import Topbar from '../components/Topbar';

const TeacherLayout = () => {
    return (
        <div className="min-h-screen bg-background font-sans text-secondary-dark flex">
            <TeacherSidebar />

            <div className="flex-1 ml-64 flex flex-col min-h-screen">
                <Topbar />

                <main className="flex-1 p-8 overflow-x-hidden">
                    <div className="max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default TeacherLayout;
