
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout'; // Import Admin Layout
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/admin/AdminDashboard'; // Import Admin Dashboard
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import TeacherLayout from './layouts/TeacherLayout';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ExamChecker from './pages/ExamChecker';
import StudyPlanner from './pages/StudyPlanner';
import AdaptiveQuiz from './pages/AdaptiveQuiz';
import DoubtSolver from './pages/DoubtSolver';
import Analytics from './pages/Analytics';

import LandingPage from './pages/LandingPage';



function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/dashboard" element={<MainLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="exam-checker" element={<ExamChecker />} />
                    <Route path="study-planner" element={<StudyPlanner />} />
                    <Route path="adaptive-quiz" element={<AdaptiveQuiz />} />
                    <Route path="doubt-solver" element={<DoubtSolver />} />
                    <Route path="analytics" element={<Analytics />} />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    {/* Future admin routes can go here */}
                </Route>

                {/* Teacher Routes */}
                <Route path="/teacher" element={<TeacherLayout />}>
                    <Route index element={<TeacherDashboard />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
