import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Brain, Sparkles, Users, Rocket, CheckCircle, X, Play } from 'lucide-react';
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

            {/* Hero Section - Depth & Flow */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-40 px-6 z-10 overflow-hidden">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 md:gap-24 items-center">

                    {/* Left Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="text-left space-y-8 relative z-20"
                    >
                        {/* Chip */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-md border border-indigo-100/50 rounded-full text-xs font-semibold text-indigo-600 shadow-sm ring-1 ring-indigo-50"
                        >
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            <span>V2.0 is Live</span>
                        </motion.div>

                        {/* Heading with Micro-Highlight */}
                        <h1 className="text-5xl md:text-7xl font-bold text-slate-900 leading-[1.05] tracking-tight relative">
                            Unlock Your <br />
                            <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 pb-2 animate-gradient-slow">
                                Potential
                                <motion.span
                                    initial={{ width: 0 }}
                                    animate={{ width: '100%' }}
                                    transition={{ duration: 1.2, delay: 0.5, ease: "circOut" }}
                                    className="absolute bottom-0 left-0 h-[6px] bg-indigo-200/50 -z-10 rounded-full"
                                />
                            </span>{" "}
                            <span className="relative z-10">Together.</span>
                        </h1>

                        <p className="text-lg md:text-xl text-slate-600 max-w-lg leading-relaxed font-medium">
                            Experience personalized learning powered by advanced AI.
                            Adaptive quizzes, instant doubt solving, and a curriculum that grows with you.
                        </p>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Link to="/signup" className="group relative px-8 py-4 bg-slate-900 text-white font-bold rounded-full shadow-[0_10px_30px_-10px_rgba(15,23,42,0.3)] hover:shadow-[0_20px_40px_-10px_rgba(15,23,42,0.5)] hover:-translate-y-1 active:translate-y-0 transition-all overflow-hidden text-center flex items-center justify-center gap-2">
                                <span className="relative z-10 flex items-center gap-2">
                                    Start Learning Free
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            </Link>

                            <button
                                onClick={() => setIsDemoOpen(true)}
                                className="px-8 py-4 bg-white/50 backdrop-blur-sm text-slate-700 font-bold rounded-full shadow-sm border border-white/60 hover:bg-white hover:border-white hover:shadow-md transition-all flex items-center justify-center gap-3 group"
                            >
                                <div className="w-8 h-8 bg-indigo-50/80 rounded-full flex items-center justify-center group-hover:bg-indigo-100 transition-colors shadow-inner">
                                    <Play size={12} className="text-indigo-600 fill-indigo-600 ml-0.5" />
                                </div>
                                <span>Watch Demo</span>
                            </button>
                        </div>

                        {/* Social Proof */}
                        <div className="flex items-center gap-4 pt-8 border-t border-slate-200/50">
                            <div className="flex -space-x-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className={`w-12 h-12 rounded-full border-[3px] border-white shadow-sm flex items-center justify-center overflow-hidden bg-slate-100 ring-1 ring-slate-100`}>
                                        <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i * 13 + 5}`} alt="user" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                                <div className="w-12 h-12 rounded-full border-[3px] border-white bg-slate-900 text-white text-xs font-bold flex items-center justify-center shadow-sm relative z-10 ring-1 ring-slate-900">
                                    2k+
                                </div>
                            </div>
                            <div className="text-sm">
                                <div className="flex items-center gap-1 text-slate-900 font-bold">
                                    <div className="flex">
                                        {[1, 2, 3, 4, 5].map(s => <Sparkles key={s} size={10} className="text-amber-400 fill-amber-400" />)}
                                    </div>
                                    <span className="ml-1">5.0/5</span>
                                </div>
                                <p className="text-slate-500 font-medium">from 10,000+ students</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Illustration - Depth Layering */}
                    <div className="relative perspective-[2000px] group">
                        {/* Background Glows */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-full blur-[80px] -z-10 animate-blob" />

                        <motion.div
                            initial={{ opacity: 0, rotateY: 10, scale: 0.9 }}
                            animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="relative z-10 transform-gpu"
                            style={{ transformStyle: 'preserve-3d' }}
                        >
                            <img
                                src={heroImg}
                                alt="AI Learning Platform"
                                className="w-full h-auto drop-shadow-2xl rounded-xl"
                            />

                            {/* Floating Element 1 - Top Right */}
                            <motion.div
                                animate={{ y: [-15, 0, -15], rotate: [2, -2, 2] }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute -top-6 -right-6 md:-right-12 bg-white/90 backdrop-blur-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] p-4 rounded-2xl border border-white/50 max-w-[200px] z-20"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-green-100 rounded-xl text-green-600 ring-1 ring-green-200/50"><CheckCircle size={18} /></div>
                                    <span className="font-bold text-slate-800 text-sm">Concept Mastered!</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '85%' }}
                                        transition={{ duration: 1.5, delay: 1 }}
                                        className="bg-green-500 w-[85%] h-full rounded-full"
                                    />
                                </div>
                            </motion.div>

                            {/* Floating Element 2 - Bottom Left */}
                            <motion.div
                                animate={{ y: [15, 0, 15] }}
                                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                className="absolute -bottom-8 -left-4 md:-left-12 bg-white/90 backdrop-blur-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] p-4 pr-8 rounded-2xl border border-white/50 flex items-center gap-4 z-20"
                            >
                                <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center text-3xl shadow-lg shadow-orange-500/30">🔥</div>
                                <div>
                                    <p className="font-black text-slate-900 text-2xl leading-none">247</p>
                                    <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mt-1">Day Streak</p>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Section Separator - Soft Wave */}
            <div className="relative w-full overflow-hidden leading-none z-20 -mt-24 pointer-events-none">
                <svg className="relative block w-[calc(100%+1.3px)] h-[100px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                    <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-white/80 opacity-40"></path>
                    <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className="fill-slate-50/40 translate-y-2 blur-[1px]"></path>
                </svg>
            </div>

            {/* Features Section - Premium Card System */}
            <section id="features" className="pt-12 pb-32 relative z-10 overflow-hidden">
                {/* Background Decoration for Section */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-indigo-50/40 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-indigo-50/30 to-slate-50 opacity-60" />

                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-24 space-y-6 max-w-3xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100/80 rounded-full text-sm font-semibold text-indigo-600 mb-4 shadow-sm"
                        >
                            <Sparkles size={14} className="animate-pulse" />
                            <span>Power Features</span>
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            viewport={{ once: true }}
                            className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight"
                        >
                            Everything you need to <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">master your studies.</span>
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            viewport={{ once: true }}
                            className="text-slate-500 text-lg md:text-xl leading-relaxed"
                        >
                            SmartLearn AI combines cognitive science with advanced machine learning to create the perfect study environment.
                        </motion.p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-6 gap-6 md:gap-8">
                        {/* Feature 1: Adaptive Learning (Large Card) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            whileHover={{ y: -5 }}
                            className="md:col-span-4 bg-white/60 backdrop-blur-md rounded-[2rem] p-8 md:p-12 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-100 hover:shadow-[0_20px_60px_-10px_rgba(79,70,229,0.15)] hover:border-indigo-100/50 transition-all duration-300 relative overflow-hidden group"
                        >
                            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
                                <div className="flex-1 space-y-6">
                                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-500">
                                        <Brain size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-900 mb-3">Adaptive Intelligence</h3>
                                        <p className="text-slate-500 text-lg leading-relaxed">
                                            Our engine learns how you learn. It identifies your weak spots in real-time and adjusts the curriculum to ensure you're always improving, never stalling.
                                        </p>
                                    </div>
                                </div>
                                <div className="hidden md:block w-48 h-48 bg-indigo-50 rounded-full blur-3xl absolute -right-12 -top-12 mix-blend-multiply opacity-50" />
                            </div>
                        </motion.div>

                        {/* Feature 2: Gamification (Tall Card) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            viewport={{ once: true }}
                            whileHover={{ y: -5 }}
                            className="md:col-span-2 bg-slate-900 rounded-[2rem] p-8 md:p-10 shadow-2xl shadow-slate-900/10 relative overflow-hidden group text-white border border-slate-800"
                        >
                            <div className="relative z-10 h-full flex flex-col">
                                <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-indigo-300 mb-6 border border-white/10 group-hover:bg-white/20 transition-colors">
                                    <Rocket size={24} />
                                </div>
                                <h3 className="text-xl font-bold mb-3">Gamified Growth</h3>
                                <p className="text-slate-300 leading-relaxed mb-8">Earn XP, unlock badges, and maintain streaks.</p>

                                <div className="mt-auto bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                    <div className="flex justify-between items-center text-sm font-medium text-slate-300 mb-2">
                                        <span>Level 5</span>
                                        <span className="text-indigo-400">2,450 XP</span>
                                    </div>
                                    <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                                        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 w-[70%] h-full rounded-full" />
                                    </div>
                                </div>
                            </div>
                            {/* Glow effects - using index.css noise */}
                            <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay pointer-events-none" />
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                        </motion.div>

                        {/* Feature 3: Community (Standard Card) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            viewport={{ once: true }}
                            whileHover={{ y: -5 }}
                            className="md:col-span-2 bg-white/60 backdrop-blur-md rounded-[2rem] p-8 md:p-10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-100 hover:shadow-[0_20px_60px_-10px_rgba(236,72,153,0.15)] hover:border-pink-100/50 transition-all duration-300 group relative overflow-hidden"
                        >
                            <div className="w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-500 mb-6 group-hover:scale-110 transition-transform">
                                <Users size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Study Groups</h3>
                            <p className="text-slate-500 leading-relaxed">
                                Connect with peers, share notes, and solve doubts together in real-time.
                            </p>
                        </motion.div>

                        {/* Feature 4: Analytics (Large Card with Graph) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            viewport={{ once: true }}
                            whileHover={{ y: -5 }}
                            className="md:col-span-4 bg-gradient-to-br from-indigo-50/50 to-white/80 backdrop-blur-sm rounded-[2rem] p-8 md:p-10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-indigo-50 hover:border-indigo-100/50 hover:shadow-[0_20px_60px_-10px_rgba(79,70,229,0.1)] transition-all duration-300 relative overflow-hidden group"
                        >
                            <div className="flex flex-col md:flex-row items-center gap-12">
                                <div className="flex-1 relative z-10">
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-orange-500 mb-6 shadow-sm border border-orange-50">
                                        <BookOpen size={28} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-3">Smart Curriculum</h3>
                                    <p className="text-slate-500 text-lg leading-relaxed">
                                        Dynamic study plans that evolve. We prioritize what you need to learn today to ace your exam tomorrow.
                                    </p>
                                </div>
                                <div className="w-full md:w-1/2 bg-white rounded-xl p-6 shadow-sm border border-slate-100 group-hover:scale-[1.02] transition-transform duration-500">
                                    <div className="flex items-end justify-between h-24 gap-3">
                                        {[35, 60, 45, 80, 55, 90, 70].map((h, i) => (
                                            <div key={i} className="w-full bg-slate-100 rounded-t-md relative overflow-hidden">
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    whileInView={{ height: `${h}%` }}
                                                    transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                                                    className="absolute bottom-0 left-0 w-full rounded-t-md bg-gradient-to-t from-orange-400 to-pink-500"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 px-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="max-w-5xl mx-auto bg-slate-900 rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden shadow-2xl"
                >
                    {/* Background Decoration */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500 rounded-full blur-[120px] opacity-20" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500 rounded-full blur-[120px] opacity-20" />

                    {/* Noise texture overlay */}
                    <div className="absolute inset-0 bg-noise opacity-[0.08] mix-blend-soft-light" />

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
                </motion.div>
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
                            {/* Social icons would go here, simplified placeholders */}
                            <a href="#" className="text-slate-400 hover:text-indigo-600 transition-colors"><span className="sr-only">Twitter</span><svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg></a>
                            <a href="#" className="text-slate-400 hover:text-indigo-600 transition-colors"><span className="sr-only">GitHub</span><svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg></a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
