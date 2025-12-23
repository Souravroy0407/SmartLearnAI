import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Brain, Sparkles, Users, Rocket, CheckCircle, X, Construction, Play } from 'lucide-react';
import heroImg from '../assets/hero-illustration.png';

const LandingPage = () => {
    const [isBannerVisible, setIsBannerVisible] = useState(true);
    const [scrolled, setScrolled] = useState(false);
    const [isDemoOpen, setIsDemoOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);

        // Handle ESC key for modal
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsDemoOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 font-sans overflow-x-hidden selection:bg-indigo-500/30">

            {/* BACKGROUND SYSTEM */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                {/* 1. Base Gradient Wash */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-slate-50" />

                {/* 2. Focused Blobs */}
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] mix-blend-multiply" />
                <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] mix-blend-multiply" />
                <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-[120px] mix-blend-multiply" />

                {/* 3. Noise Texture */}
                <div
                    className="absolute inset-0 opacity-[0.4] mix-blend-overlay"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")`
                    }}
                />
            </div>

            {/* Video Modal */}
            <AnimatePresence>
                {isDemoOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
                    >
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-slate-900/90 backdrop-blur-md"
                            onClick={() => setIsDemoOpen(false)}
                        />

                        {/* Modal Content */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-5xl bg-slate-950 rounded-2xl shadow-2xl overflow-hidden aspect-video border border-white/10"
                        >
                            <button
                                onClick={() => setIsDemoOpen(false)}
                                className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm"
                            >
                                <X size={20} />
                            </button>

                            <video
                                src="/videos/demo.mp4"
                                className="w-full h-full object-cover"
                                controls
                                autoPlay
                                playsInline
                                onError={(e) => {
                                    // Fallback UI handling logic (simplified)
                                    // In a real app, strict error states would be managed
                                    console.log("Video load error", e);
                                }}
                            >
                                <div className="flex items-center justify-center h-full text-white flex-col gap-4">
                                    <p className="text-lg font-semibold">Demo video unavailable</p>
                                    <p className="text-sm text-gray-400">Please verify 'public/videos/demo.mp4' exists.</p>
                                </div>
                            </video>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Under Construction Banner */}
            <AnimatePresence>
                {isBannerVisible && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="fixed top-0 left-0 w-full z-[60] bg-gray-900/95 backdrop-blur-sm text-white border-b border-white/10"
                    >
                        <div className="max-w-7xl mx-auto py-2 px-4 flex items-center justify-between text-xs md:text-sm font-medium">
                            <div className="flex items-center gap-2 mx-auto">
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                </span>
                                <span className="text-gray-300">Preview Mode: <span className="text-white">Active Development</span></span>
                            </div>
                            <button
                                onClick={() => setIsBannerVisible(false)}
                                className="absolute right-4 p-1 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navbar */}
            <nav className={`fixed left-0 right-0 z-50 transition-all duration-300 ${isBannerVisible ? 'top-12' : 'top-0'} ${scrolled ? 'bg-white/80 backdrop-blur-md border-b border-slate-200/50 py-4 shadow-sm' : 'py-6 bg-transparent'}`}>
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                            <Sparkles size={20} fill="currentColor" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-slate-900">SmartLearn AI</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                        <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
                        <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How it Works</a>
                        <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors px-4 py-2">
                            Log in
                        </Link>
                        <Link
                            to="/signup"
                            className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all shadow-lg shadow-slate-900/20 hover:shadow-slate-900/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 z-10">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">

                    {/* Left Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="text-left space-y-8 relative z-20"
                    >
                        {/* Chip */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-indigo-100 rounded-full text-xs font-semibold text-indigo-600 shadow-sm">
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            V2.0 Now Live
                        </div>

                        {/* Heading */}
                        <h1 className="text-5xl md:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight">
                            Unlock Your <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 pb-2">
                                Potential, Together.
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl text-slate-600 max-w-lg leading-relaxed font-medium">
                            Experience personalized learning powered by advanced AI.
                            Adaptive quizzes, instant doubt solving, and a curriculum that grows with you.
                        </p>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-2">
                            <Link to="/signup" className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-full shadow-xl shadow-indigo-500/25 hover:shadow-2xl hover:shadow-indigo-500/40 hover:-translate-y-1 active:translate-y-0 transition-all overflow-hidden text-center">
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    Start Learning Free <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Link>
                            <button
                                onClick={() => setIsDemoOpen(true)}
                                className="px-8 py-4 bg-white text-slate-700 font-bold rounded-full shadow-lg shadow-gray-200/50 border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 group"
                            >
                                <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                    <Play size={14} className="text-indigo-600 fill-indigo-600 ml-0.5" />
                                </div>
                                Watch Demo
                            </button>
                        </div>

                        {/* Social Proof */}
                        <div className="flex items-center gap-4 pt-6">
                            <div className="flex -space-x-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className={`w-10 h-10 rounded-full border-[3px] border-white bg-slate-100 shadow-sm flex items-center justify-center overflow-hidden`}>
                                        <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i * 13}`} alt="user" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                            <div className="text-sm">
                                <p className="font-bold text-slate-900">10,000+ Students</p>
                                <p className="text-slate-500">trust SmartLearn AI</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Illustration */}
                    <div className="relative">
                        {/* Focus Vignette for Illustration */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-purple-500/5 rounded-[3rem] blur-2xl -z-10 transform rotate-3" />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="relative z-10"
                        >
                            <img src={heroImg} alt="AI Learning Platform" className="w-full h-auto drop-shadow-2xl hover:scale-[1.02] transition-transform duration-700 ease-in-out" />

                            {/* Floating Card 1 */}
                            <motion.div
                                animate={{ y: [-10, 10, -10] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute top-[10%] -right-4 md:-right-12 bg-white/80 backdrop-blur-xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] p-4 rounded-2xl border border-white max-w-[180px]"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-green-100 rounded-lg text-green-600"><CheckCircle size={16} /></div>
                                    <span className="font-bold text-slate-800 text-sm">Target Met!</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-green-500 w-[85%] h-full rounded-full" />
                                </div>
                            </motion.div>

                            {/* Floating Card 2 */}
                            <motion.div
                                animate={{ y: [15, -15, 15] }}
                                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                className="absolute bottom-[20%] -left-4 md:-left-12 bg-white/80 backdrop-blur-xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] p-4 rounded-2xl border border-white flex items-center gap-4"
                            >
                                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-orange-500/20">🔥</div>
                                <div>
                                    <p className="font-black text-slate-900 text-xl">247</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Day Streak</p>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Features Section - Cleaner & More depth */}
            <section id="features" className="py-32 relative z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20 space-y-4">
                        <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">Supercharge Your Learning</h2>
                        <p className="text-slate-600 max-w-2xl mx-auto text-lg">Everything you need to excel, packed into one beautiful, intelligent platform.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="md:col-span-2 group bg-white rounded-[2.5rem] p-10 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100/60 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:border-slate-300/50 transition-all duration-300 relative overflow-hidden">
                            <div className="relative z-10 max-w-sm">
                                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-8 group-hover:scale-110 transition-transform duration-300">
                                    <Brain size={28} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-4">AI-Powered Adaptation</h3>
                                <p className="text-slate-600 text-lg leading-relaxed">Our algorithms analyze your performance in real-time to adjust quiz difficulty, ensuring you're always challenged just enough to grow.</p>
                            </div>
                            <div className="absolute right-[-10%] bottom-[-20%] w-[400px] h-[400px] bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-10 shadow-xl text-white relative overflow-hidden group">
                            <div className="relative z-10 h-full flex flex-col">
                                <div className="mb-auto">
                                    <Rocket className="mb-8 w-14 h-14 text-indigo-200" />
                                    <h3 className="text-2xl font-bold mb-3">Gamified Progress</h3>
                                    <p className="text-indigo-100 leading-relaxed">Earn badges, XP, and climb the global leaderboard.</p>
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100/60 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:border-slate-300/50 transition-all duration-300 group">
                            <div className="w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-500 mb-8 group-hover:rotate-6 transition-transform">
                                <Users size={28} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">Community Hub</h3>
                            <p className="text-slate-600 text-lg leading-relaxed">Connect with peers, share notes, and study together in virtual rooms.</p>
                        </div>

                        {/* Feature 4 */}
                        <div className="md:col-span-2 bg-white rounded-[2.5rem] p-10 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100/60 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:border-slate-300/50 transition-all duration-300 relative overflow-hidden group">
                            <div className="flex flex-col md:flex-row items-center gap-12">
                                <div className="flex-1 relative z-10">
                                    <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 mb-8">
                                        <BookOpen size={28} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-4">Smart Study Plans</h3>
                                    <p className="text-slate-600 text-lg leading-relaxed">Let AI design your revision schedule based on your exam dates and weak areas.</p>
                                </div>
                                <div className="flex-1 w-full bg-slate-50 rounded-2xl p-6 border border-slate-100 group-hover:border-orange-200/50 transition-colors">
                                    {/* Abstract Activity Graph */}
                                    <div className="flex items-end justify-between h-32 gap-2">
                                        {[40, 70, 45, 90, 65, 85, 55].map((h, i) => (
                                            <div key={i} className="w-full bg-slate-200 rounded-t-lg relative overflow-hidden group-hover:bg-orange-100 transition-colors" style={{ height: `${h}%` }}>
                                                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-orange-400 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ height: '100%' }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 px-6 relative z-10">
                <div className="max-w-5xl mx-auto bg-slate-900 rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden shadow-2xl">
                    {/* Background Decoration */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500 rounded-full blur-[120px] opacity-20" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500 rounded-full blur-[120px] opacity-20" />

                    {/* Grid texture overlay */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light" />

                    <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 relative z-10 tracking-tight">
                        Ready to start your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
                            adventure?
                        </span>
                    </h2>
                    <p className="text-slate-400 text-lg md:text-xl mb-12 max-w-xl mx-auto relative z-10 leading-relaxed">
                        Join thousands of students who have already transformed their learning experience with SmartLearn AI.
                    </p>

                    <Link to="/signup" className="relative z-10 inline-flex px-12 py-5 bg-white text-slate-900 font-bold text-lg rounded-full shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:scale-105 hover:bg-indigo-50 transition-all duration-300">
                        Create Free Account
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-100 pt-20 pb-12 relative z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-1 md:col-span-1">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                                    <Sparkles size={16} fill="currentColor" />
                                </div>
                                <span className="font-bold text-lg text-slate-900">SmartLearn AI</span>
                            </div>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Empowering students with intelligent, adaptive, and personalized learning tools.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-900 mb-6">Product</h4>
                            <ul className="space-y-4 text-sm text-slate-600">
                                <li><a href="#" className="hover:text-indigo-600 transition-colors">Features</a></li>
                                <li><a href="#" className="hover:text-indigo-600 transition-colors">Pricing</a></li>
                                <li><a href="#" className="hover:text-indigo-600 transition-colors">Case Studies</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-900 mb-6">Company</h4>
                            <ul className="space-y-4 text-sm text-slate-600">
                                <li><a href="#" className="hover:text-indigo-600 transition-colors">About</a></li>
                                <li><a href="#" className="hover:text-indigo-600 transition-colors">Blog</a></li>
                                <li><a href="#" className="hover:text-indigo-600 transition-colors">Careers</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-900 mb-6">Legal</h4>
                            <ul className="space-y-4 text-sm text-slate-600">
                                <li><a href="#" className="hover:text-indigo-600 transition-colors">Privacy</a></li>
                                <li><a href="#" className="hover:text-indigo-600 transition-colors">Terms</a></li>
                                <li><a href="#" className="hover:text-indigo-600 transition-colors">Security</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-slate-500">© 2025 SmartLearn AI. All rights reserved.</p>
                        <div className="flex gap-6">
                            {/* Social icons would go here */}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
