import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Brain, Sparkles, Users, Rocket, CheckCircle } from 'lucide-react';
import heroImg from '../assets/hero-illustration.png';

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-white font-sans overflow-hidden">
            {/* Navbar */}
            <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-6xl">
                <div className="bg-white/80 backdrop-blur-md rounded-full shadow-lg border border-white/20 px-6 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-br from-orange-400 to-pink-500 p-2 rounded-xl text-white">
                            <Sparkles size={20} fill="currentColor" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-gray-800">SmartLearn AI</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
                        <a href="#features" className="hover:text-pink-500 transition-colors">Features</a>
                        <a href="#how-it-works" className="hover:text-pink-500 transition-colors">How it Works</a>
                        <a href="#pricing" className="hover:text-pink-500 transition-colors">Pricing</a>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-pink-500 transition-colors">Login</Link>
                        <Link
                            to="/signup"
                            className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-5 py-2.5 rounded-full transition-all shadow-md hover:shadow-lg active:scale-95"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
                {/* Abstract Background Blobs */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                    <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-orange-200/40 rounded-full blur-3xl opacity-60 animate-blob" />
                    <div className="absolute top-[10%] right-[-10%] w-[600px] h-[600px] bg-pink-200/40 rounded-full blur-3xl opacity-60 animate-blob animation-delay-2000" />
                    <div className="absolute bottom-[-10%] left-[20%] w-[700px] h-[700px] bg-yellow-100/40 rounded-full blur-3xl opacity-60 animate-blob animation-delay-4000" />
                </div>

                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="text-left space-y-8"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-full text-sm font-semibold border border-orange-100 shadow-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                            </span>
                            Next Gen AI Learning
                        </div>

                        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-[1.1] tracking-tight">
                            Unlock Your <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500">
                                Potential, Together!
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl text-gray-600 max-w-lg leading-relaxed">
                            Experience personalized learning powered by advanced AI.
                            Adaptive quizzes, instant doubt solving, and a curriculum that grows with you.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Link to="/signup" className="group relative px-8 py-4 bg-gradient-to-r from-orange-500 to-pink-600 text-white font-bold rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 transition-all overflow-hidden">
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    Start Learning Free <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                            </Link>
                            <button className="px-8 py-4 bg-white text-gray-700 font-bold rounded-full shadow-md border border-gray-100 hover:bg-gray-50 hover:shadow-lg transition-all flex items-center justify-center gap-2">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                    <span className="block w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-gray-600 border-b-[5px] border-b-transparent ml-1"></span>
                                </div>
                                Watch Demo
                            </button>
                        </div>

                        <div className="flex items-center gap-4 pt-8 text-sm text-gray-500 font-medium">
                            <div className="flex -space-x-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className={`w-10 h-10 rounded-full border-2 border-white bg-gray-200 shadow-sm flex items-center justify-center overflow-hidden`}>
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 13}`} alt="user" />
                                    </div>
                                ))}
                            </div>
                            <p>Trusted by 10,000+ Students</p>
                        </div>
                    </motion.div>

                    {/* 3D Illustration Area */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative"
                    >
                        <div className="relative z-10 animate-float">
                            {/* Make sure this image exists or is replaced by the generated one */}
                            <img src={heroImg} alt="Funny 3D Robot Teacher" className="w-full h-auto drop-shadow-2xl hover:scale-105 transition-transform duration-500" />
                        </div>

                        {/* Floating Elements */}
                        <motion.div
                            animate={{ y: [-10, 10, -10] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-10 right-10 bg-white/90 backdrop-blur shadow-xl p-4 rounded-2xl z-20 border border-white/50 max-w-[160px]"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-green-100 rounded-lg text-green-600"><CheckCircle size={18} /></div>
                                <span className="font-bold text-gray-800 text-sm">Target Met!</span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-green-500 w-[85%] h-full rounded-full" />
                            </div>
                        </motion.div>

                        <motion.div
                            animate={{ y: [15, -15, 15] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            className="absolute bottom-20 left-0 bg-white/90 backdrop-blur shadow-xl p-4 rounded-2xl z-20 border border-white/50 flex items-center gap-3"
                        >
                            <div className="text-3xl">🔥</div>
                            <div>
                                <p className="font-extrabold text-gray-900 text-lg">247</p>
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Day Streak</p>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Bento Grid Features */}
            <section id="features" className="py-24 bg-gray-50/50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-5xl font-bold text-gray-900">Supercharge Your Learning</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto text-lg">Everything you need to excel, packed into one beautiful platform.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
                        {/* Feature 1: Large Span */}
                        <div className="md:col-span-2 bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-shadow relative overflow-hidden group">
                            <div className="relative z-10 max-w-sm">
                                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
                                    <Brain size={24} />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-3">AI-Powered Adaptation</h3>
                                <p className="text-gray-600">Our algorithms analyze your performance in real-time to adjust quiz difficulty, ensuring you're always challenged just enough.</p>
                            </div>
                            <div className="absolute right-[-50px] bottom-[-50px] w-64 h-64 bg-blue-500/10 rounded-full group-hover:scale-150 transition-transform duration-700 ease-in-out" />
                            <img src="https://api.dicebear.com/7.x/identicon/svg?seed=brain" className="absolute right-10 bottom-10 w-32 h-32 opacity-20 group-hover:opacity-40 transition-opacity" />
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-[2rem] p-8 shadow-lg text-white relative overflow-hidden group">
                            <div className="relative z-10">
                                <Rocket className="mb-6 w-12 h-12 text-purple-200" />
                                <h3 className="text-2xl font-bold mb-2">Gamified Progress</h3>
                                <p className="text-purple-100">Earn badges, XP, and climb the leaderboard.</p>
                            </div>
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-shadow group">
                            <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center text-pink-600 mb-6 group-hover:rotate-12 transition-transform">
                                <Users size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Community Hub</h3>
                            <p className="text-gray-600">Connect with peers, share notes, and study together in virtual rooms.</p>
                        </div>

                        {/* Feature 4: Large Span */}
                        <div className="md:col-span-2 bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-shadow relative overflow-hidden group">
                            <div className="flex flex-col md:flex-row items-center gap-8 h-full">
                                <div className="flex-1 space-y-4 relative z-10">
                                    <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                                        <BookOpen size={24} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900">Smart Study Plans</h3>
                                    <p className="text-gray-600">Let AI design your revision schedule based on your exam dates and weak areas.</p>
                                </div>
                                {/* Simulated Graph UI */}
                                <div className="flex-1 bg-gray-50 rounded-xl w-full h-full p-4 border border-gray-100 group-hover:border-orange-200 transition-colors">
                                    <div className="space-y-3">
                                        <div className="h-2 w-3/4 bg-gray-200 rounded-full" />
                                        <div className="h-2 w-1/2 bg-gray-200 rounded-full" />
                                        <div className="flex gap-2 items-end h-20 pt-4">
                                            <div className="w-1/5 bg-orange-200 h-[40%] rounded-t-sm" />
                                            <div className="w-1/5 bg-orange-300 h-[60%] rounded-t-sm" />
                                            <div className="w-1/5 bg-orange-400 h-[30%] rounded-t-sm" />
                                            <div className="w-1/5 bg-orange-500 h-[90%] rounded-t-sm" />
                                            <div className="w-1/5 bg-pink-500 h-[70%] rounded-t-sm" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6">
                <div className="max-w-5xl mx-auto bg-gray-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
                    {/* Background Decoration */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500 rounded-full blur-[100px] opacity-20" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-[100px] opacity-20" />

                    <h2 className="text-4xl md:text-6xl font-black text-white mb-8 relative z-10">Ready to start your <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">adventure?</span></h2>
                    <p className="text-gray-300 text-lg mb-10 max-w-xl mx-auto relative z-10">Join thousands of students who have already transformed their learning experience with SmartLearn AI.</p>

                    <Link to="/signup" className="relative z-10 inline-block px-10 py-5 bg-white text-gray-900 font-bold text-lg rounded-full shadow-2xl hover:bg-gray-100 hover:scale-105 transition-all">
                        Create Free Account
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
                <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-gray-500">
                    <div className="flex items-center gap-2 mb-4 md:mb-0">
                        <Sparkles size={18} className="text-pink-500" />
                        <span className="font-bold text-gray-900">SmartLearn AI</span>
                    </div>
                    <div className="flex gap-8 text-sm">
                        <a href="#" className="hover:text-gray-900">Privacy Policy</a>
                        <a href="#" className="hover:text-gray-900">Terms of Service</a>
                        <a href="#" className="hover:text-gray-900">Contact</a>
                    </div>
                    <div className="text-sm mt-4 md:mt-0">
                        © 2025 SmartLearn AI. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
