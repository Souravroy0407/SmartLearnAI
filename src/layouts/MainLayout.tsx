
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const MainLayout = () => {
    return (
        <div className="min-h-screen bg-background font-sans">
            <Sidebar />
            <Topbar />
            <main className="pl-64 pt-16 min-h-screen">
                <div className="p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div> 
    );
};

export default MainLayout;
