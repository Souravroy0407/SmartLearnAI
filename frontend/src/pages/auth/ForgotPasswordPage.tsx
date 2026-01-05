import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/axios';
import PasswordInput from '../../components/common/PasswordInput';

const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await api.post('/api/auth/forgot-password', { email });
            setStep(2);
            // toast.success("OTP sent to your email");
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to send OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await api.post('/api/auth/verify-reset-otp', { email, otp });
            setStep(3);
            // toast.success("OTP verified");
        } catch (err: any) {
            setError(err.response?.data?.detail || "Invalid OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await api.post('/api/auth/reset-password', { email, otp, new_password: password });
            setStep(4);
            // toast.success("Password reset successful"); // Shown in UI
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to reset password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-slate-50 selection:bg-indigo-500/30">

            {/* Background elements matched to LoginPage */}
            <div className="absolute inset-0 z-0 bg-[linear-gradient(120deg,#f5f3ff_0%,#eef2ff_40%,#ffffff_100%)]" />
            <div className="absolute inset-0 z-0 opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] bg-indigo-500 rounded-full blur-[140px] opacity-[0.15] pointer-events-none mix-blend-multiply" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] bg-purple-500 rounded-full blur-[140px] opacity-[0.15] pointer-events-none mix-blend-multiply" />
            <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-pink-100 rounded-full blur-[120px] opacity-[0.4] pointer-events-none mix-blend-multiply" />
            <div className="absolute inset-0 z-0 opacity-[0.4] pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")` }} />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-[420px]"
            >
                {/* Back Glow */}
                <div className="absolute inset-0 bg-indigo-500/20 blur-3xl -z-10 rounded-[3rem] transform translate-y-4 scale-95" />

                {/* Glass Card */}
                <div className="bg-white/80 backdrop-blur-2xl border border-white/60 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.12),0_12px_24px_-8px_rgba(0,0,0,0.06)] rounded-[2rem] p-8 sm:p-10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />

                    {/* Step 4: Success View */}
                    {step === 4 ? (
                        <div className="text-center py-8">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"
                            >
                                <CheckCircle2 className="w-10 h-10" />
                            </motion.div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Password Reset!</h2>
                            <p className="text-slate-500 mb-8">Your password has been successfully updated. You can now log in with your new password.</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30"
                            >
                                Back to Login
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="text-center mb-10">
                                <motion.div
                                    initial={{ y: -10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="inline-flex items-center justify-center mb-6 relative"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl blur-lg opacity-40" />
                                    <div className="relative w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                        <KeyRound className="w-8 h-8 text-white" />
                                    </div>
                                </motion.div>

                                <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
                                    {step === 1 && "Forgot Password?"}
                                    {step === 2 && "Enter Verification Code"}
                                    {step === 3 && "Set New Password"}
                                </h1>
                                <p className="text-slate-500 font-medium">
                                    {step === 1 && "Start the reset process to regain access."}
                                    {step === 2 && `We sent a code to ${email}`}
                                    {step === 3 && "Create a secure new password."}
                                </p>
                            </div>

                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mb-6 p-4 bg-red-50/50 border border-red-100 text-red-600 text-sm rounded-2xl flex items-start gap-3"
                                    >
                                        <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                        <span className="font-medium">{error}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Standard Form Area */}
                            <div className="space-y-6">
                                {step === 1 && (
                                    <form onSubmit={handleSendOtp} className="space-y-5">
                                        <div className="group">
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
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <span>Send Code</span>}
                                        </button>
                                    </form>
                                )}

                                {step === 2 && (
                                    <form onSubmit={handleVerifyOtp} className="space-y-5">
                                        <div className="group">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                                                Verification Code
                                            </label>
                                            <input
                                                type="text"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value)}
                                                className="w-full text-center tracking-[1em] text-2xl py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-900 font-bold placeholder:tracking-normal placeholder:font-medium placeholder:text-sm"
                                                placeholder="0000"
                                                maxLength={4}
                                                required
                                                autoFocus
                                            />
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setStep(1)}
                                                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                                            >
                                                Back
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="flex-[2] bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                            >
                                                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <span>Verify Code</span>}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {step === 3 && (
                                    <form onSubmit={handleResetPassword} className="space-y-5">
                                        <PasswordInput
                                            value={password}
                                            onChange={(e: any) => setPassword(e.target.value)}
                                            className="!py-4 !bg-slate-50/50 !border-slate-200 !rounded-2xl focus:!bg-white focus:!border-indigo-500/50 focus:!ring-4 focus:!ring-indigo-500/10 placeholder:!text-slate-400 !font-medium"
                                            label="New Password"
                                        />
                                        <PasswordInput
                                            value={confirmPassword}
                                            onChange={(e: any) => setConfirmPassword(e.target.value)}
                                            className="!py-4 !bg-slate-50/50 !border-slate-200 !rounded-2xl focus:!bg-white focus:!border-indigo-500/50 focus:!ring-4 focus:!ring-indigo-500/10 placeholder:!text-slate-400 !font-medium"
                                            label="Confirm New Password"
                                        />
                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setStep(2)}
                                                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                                            >
                                                Back
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="flex-[2] bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                            >
                                                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <span>Reset Password</span>}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* Footer Links */}
                                {step === 1 && (
                                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                                        <p className="text-slate-500 text-sm font-medium">
                                            Remember your password?{' '}
                                            <Link
                                                to="/login"
                                                className="text-indigo-600 hover:text-purple-600 font-bold hover:underline decoration-2 underline-offset-4 transition-all"
                                            >
                                                Sign In
                                            </Link>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Ambient floating shape */}
                <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border border-white/20 rounded-full opacity-20 pointer-events-none" />
            </motion.div>
        </div>
    );
};

export default ForgotPasswordPage;
