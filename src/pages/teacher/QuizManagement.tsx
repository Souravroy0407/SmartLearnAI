import { Plus, Search, FileText, Clock, BarChart2 } from 'lucide-react';

const QuizManagement = () => {
    const quizzes = [
        { id: 1, title: 'Physics Midterm - Mechanics', questions: 25, duration: '60 mins', status: 'Active', attempts: 42 },
        { id: 2, title: 'Calculus - Derivatives', questions: 15, duration: '45 mins', status: 'Draft', attempts: 0 },
        { id: 3, title: 'Chemistry - Organic Basics', questions: 20, duration: '50 mins', status: 'Closed', attempts: 156 },
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-dark">Quiz Management</h1>
                    <p className="text-secondary">Create and manage your quizzes and assessments.</p>
                </div>
                <button className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-medium hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">
                    <Plus className="w-5 h-5" />
                    Create New Quiz
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-secondary-light/10 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-secondary-light/10 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-light" />
                        <input
                            type="text"
                            placeholder="Search quizzes..."
                            className="w-full pl-10 pr-4 py-2 rounded-xl bg-secondary-light/5 border-none focus:ring-2 focus:ring-primary/20 text-secondary-dark placeholder-secondary"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                    {quizzes.map((quiz) => (
                        <div key={quiz.id} className="border border-secondary-light/20 rounded-2xl p-5 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-primary/10 rounded-xl">
                                    <FileText className="w-6 h-6 text-primary" />
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${quiz.status === 'Active' ? 'bg-success/10 text-success' :
                                        quiz.status === 'Draft' ? 'bg-secondary-light/20 text-secondary' :
                                            'bg-error/10 text-error'
                                    }`}>
                                    {quiz.status}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-secondary-dark mb-2">{quiz.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-secondary mb-4">
                                <div className="flex items-center gap-1">
                                    <FileText className="w-4 h-4" />
                                    {quiz.questions} Qs
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {quiz.duration}
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-secondary-light/10">
                                <div className="flex items-center gap-1 text-sm font-medium text-secondary-dark">
                                    <BarChart2 className="w-4 h-4 text-secondary" />
                                    {quiz.attempts} Attempts
                                </div>
                                <button className="text-primary font-bold text-sm hover:underline">Manage</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default QuizManagement;
