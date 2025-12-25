import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrainCircuit, Mail, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import PasswordInput from '../../components/common/PasswordInput';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await api.post('/api/auth/login', {
                email: email,
                password: password
            });

            login(response.data.access_token);

            try {
                const token = response.data.access_token;
                const payload = JSON.parse(atob(token.split('.')[1]));
                const role = payload.role;

                if (role === 'admin') {
                    navigate('/admin');
                } else if (role === 'teacher') {
                    navigate('/teacher');
                } else {
                    navigate('/dashboard');
                }
            } catch (e) {
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error("Login Error", err);
            setError(err.response?.data?.detail || "Invalid email or password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-slate-50 selection:bg-indigo-500/30">

            {/* 1. Split-Tone Background Surface */}
            <div
                className="absolute inset-0 z-0 bg-[linear-gradient(120deg,#f5f3ff_0%,#eef2ff_40%,#ffffff_100%)]"
            />

            {/* 2. Light Grid / Dot Texture (Visible 3-5%) */}
            <div
                className="absolute inset-0 z-0 opacity-[0.4]"
                style={{
                    backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                }}
            />

            {/* 3. Large Gradient Blobs (Visible 15-20%) */}
            <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] bg-indigo-500 rounded-full blur-[140px] opacity-[0.15] pointer-events-none mix-blend-multiply" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] bg-purple-500 rounded-full blur-[140px] opacity-[0.15] pointer-events-none mix-blend-multiply" />

            {/* Center wash to bridge the gap */}
            <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-pink-100 rounded-full blur-[120px] opacity-[0.4] pointer-events-none mix-blend-multiply" />

            {/* 3. Noise Texture (Very subtle grain) */}
            <div
                className="absolute inset-0 z-0 opacity-[0.4] pointer-events-none mix-blend-overlay"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")`
                }}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-[420px]"
            >
                {/* Back Glow for Card Pop */}
                <div className="absolute inset-0 bg-indigo-500/20 blur-3xl -z-10 rounded-[3rem] transform translate-y-4 scale-95" />

                {/* Glass Card - Strong modern contrast */}
                <div className="bg-white/80 backdrop-blur-2xl border border-white/60 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.12),0_12px_24px_-8px_rgba(0,0,0,0.06)] rounded-[2rem] p-8 sm:p-10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />

                    {/* Header */}
                    <div className="text-center mb-10">
                        <motion.div
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="inline-flex items-center justify-center mb-6 relative"
                        >
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl blur-lg opacity-40 animate-pulse" />
                            <div className="relative w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <BrainCircuit className="w-8 h-8 text-white" />
                            </div>
                            <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm border border-indigo-100">
                                <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
                            </div>
                        </motion.div>

                        <motion.h1
                            initial={{ y: 5, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-3xl font-bold tracking-tight text-slate-900 mb-2"
                        >
                            Welcome Back
                        </motion.h1>
                        <motion.p
                            initial={{ y: 5, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-slate-500 font-medium"
                        >
                            Sign in to your intelligent learning space
                        </motion.p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="p-4 bg-red-50/50 border border-red-100 text-red-600 text-sm rounded-2xl flex items-start gap-3"
                            >
                                <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                <span className="font-medium">{error}</span>
                            </motion.div>
                        )}

                        <div className="space-y-5">
                            <motion.div
                                initial={{ x: -10, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="group"
                            >
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                                    Email Address
                                </label>
                                <div className="relative transition-all duration-300 group-focus-within:scale-[1.01]">
                                    <div className="absolute inset-0 bg-indigo-500/5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-indigo-500 pointer-events-none" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-800 placeholder:text-slate-400 font-medium"
                                        placeholder="name@example.com"
                                        required
                                    />
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ x: -10, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="group"
                            >
                                {/* Recreating the label style here to match Email input, passing className to PasswordInput for consistent styling */}
                                <PasswordInput
                                    value={password}
                                    onChange={(e: any) => setPassword(e.target.value)}
                                    className="!py-4 !bg-slate-50/50 !border-slate-200 !rounded-2xl focus:!bg-white focus:!border-indigo-500/50 focus:!ring-4 focus:!ring-indigo-500/10 placeholder:!text-slate-400 !font-medium"
                                    label="Password"
                                />
                                <div className="flex justify-end mt-2">
                                    <Link
                                        to="/forgot-password"
                                        className="text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                        Forgot Password?
                                    </Link>
                                </div>
                            </motion.div>
                        </div>

                        <motion.button
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            whileHover={{ scale: 1.02, translateY: -1 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all flex items-center justify-center gap-2 group relative overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </motion.button>
                    </form>

                    {/* Footer */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="mt-8 pt-6 border-t border-slate-100 text-center"
                    >
                        <p className="text-slate-500 text-sm font-medium">
                            Don't have an account?{' '}
                            <Link
                                to="/signup"
                                className="text-indigo-600 hover:text-purple-600 font-bold hover:underline decoration-2 underline-offset-4 transition-all"
                            >
                                Create Account
                            </Link>
                        </p>
                    </motion.div>
                </div>

                {/* Ambient floating shape */}
                <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border border-white/20 rounded-full opacity-20 pointer-events-none" />
            </motion.div>
        </div>
    );
};

export default LoginPage;
