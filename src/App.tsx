
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
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

import DoubtSolver from './pages/DoubtSolver';
import Analytics from './pages/Analytics';
import LandingPage from './pages/LandingPage';
import UserManagement from './pages/admin/UserManagement'; // Import User Management
import QuizManagement from './pages/teacher/QuizManagement'; // Import Quiz Management
import StudentQuizList from './pages/student/StudentQuizList';
import QuizActive from './pages/student/QuizActive';


function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route element={<ProtectedRoute />}>
                        <Route path="/dashboard" element={<MainLayout />}>
                            <Route index element={<Dashboard />} />
                            <Route element={<ProtectedRoute allowedRoles={['student', 'teacher']} />}>
                                <Route path="exam-checker" element={<ExamChecker />} />
                            </Route>
                            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                                <Route path="study-planner" element={<StudyPlanner />} />

                                <Route path="doubt-solver" element={<DoubtSolver />} />
                                <Route path="student-quizzes" element={<StudentQuizList />} />
                            </Route>
                            {/* Analytics is open to all dashboard users */}
                            <Route path="analytics" element={<Analytics />} />
                        </Route>
                    </Route>



                    {/* Admin Routes */}
                    <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                        <Route path="/admin" element={<AdminLayout />}>
                            <Route index element={<AdminDashboard />} />
                            <Route path="users" element={<UserManagement />} />
                        </Route>
                    </Route>

                    {/* Teacher Routes */}
                    <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
                        <Route path="/teacher" element={<TeacherLayout />}>
                            <Route index element={<TeacherDashboard />} />
                            <Route path="quizzes" element={<QuizManagement />} />
                            <Route path="exam-checker" element={<ExamChecker />} />
                        </Route>
                    </Route>

                    {/* Student Exclusive Routes */}
                    <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                        <Route path="/student/quiz/:id" element={<QuizActive />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
