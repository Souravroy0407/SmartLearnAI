import { motion } from 'framer-motion';
import { ArrowRight, BrainCircuit, CheckCircle2, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-white font-sans selection:bg-primary/20">
            {/* Navbar */}
            <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-secondary-light/20">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <BrainCircuit className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-bold text-2xl text-secondary-dark tracking-tight">SmartLearn AI</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link to="/dashboard" className="text-secondary font-medium hover:text-primary transition-colors">Login</Link>
                        <Link to="/dashboard" className="bg-primary text-white px-6 py-2.5 rounded-xl font-medium hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40">
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl mix-blend-multiply animate-blob"></div>
                    <div className="absolute top-20 right-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-500/10 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-4000"></div>
                </div>

                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 text-primary text-sm font-semibold mb-8 border border-primary/10">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            New: AI Exam Checker is live
                        </span>
                        <h1 className="text-5xl md:text-7xl font-bold text-secondary-dark mb-8 tracking-tight leading-tight">
                            Master Your Exams with <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">AI-Powered Insights</span>
                        </h1>
                        <p className="text-xl text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
                            Upload your answer sheets, get instant AI evaluation, and receive a personalized study plan. The ultimate tool for data-driven students.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
                            <Link to="/dashboard" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1">
                                Get Started for Free
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-secondary-dark border border-secondary-light/20 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-secondary-light/5 transition-all hover:-translate-y-1">
                                <Play className="w-5 h-5 fill-current" />
                                Watch Demo
                            </button>
                        </div>
                    </motion.div>

                    {/* Mockup */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative mx-auto max-w-5xl"
                    >
                        <div className="bg-secondary-dark rounded-2xl p-2 shadow-2xl ring-1 ring-white/10">
                            <div className="bg-background rounded-xl overflow-hidden border border-secondary-light/20 aspect-[16/10] flex items-center justify-center relative group">
                                {/* Placeholder for actual dashboard screenshot or interactive component */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-purple-500/5"></div>
                                <div className="text-center p-8">
                                    <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500">
                                        <BrainCircuit className="w-10 h-10 text-primary" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-secondary-dark mb-2">Interactive Dashboard Preview</h3>
                                    <p className="text-secondary">Sign up to access the full student dashboard</p>
                                </div>

                                {/* Floating Elements */}
                                <motion.div
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute top-10 right-10 bg-white p-4 rounded-xl shadow-lg border border-secondary-light/10 max-w-xs hidden md:block"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-success/10 rounded-lg">
                                            <CheckCircle2 className="w-5 h-5 text-success" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-secondary-dark">Physics Exam</p>
                                            <p className="text-xs text-success font-medium">92% Score Achieved</p>
                                        </div>
                                    </div>
                                    <div className="h-1.5 bg-secondary-light/10 rounded-full overflow-hidden">
                                        <div className="h-full w-[92%] bg-success rounded-full"></div>
                                    </div>
                                </motion.div>

                                <motion.div
                                    animate={{ y: [0, 10, 0] }}
                                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                    className="absolute bottom-10 left-10 bg-white p-4 rounded-xl shadow-lg border border-secondary-light/10 max-w-xs hidden md:block"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="font-bold text-primary text-sm">AI</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-secondary-dark">"Great progress in Calculus!"</p>
                                            <p className="text-xs text-secondary">Just now</p>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
