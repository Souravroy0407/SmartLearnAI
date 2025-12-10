
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
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
                <Route path="/dashboard" element={<MainLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="exam-checker" element={<ExamChecker />} />
                    <Route path="study-planner" element={<StudyPlanner />} />
                    <Route path="adaptive-quiz" element={<AdaptiveQuiz />} />
                    <Route path="doubt-solver" element={<DoubtSolver />} />
                    <Route path="analytics" element={<Analytics />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
