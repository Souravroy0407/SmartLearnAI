import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrainCircuit, Mail, User, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import PasswordInput from '../../components/common/PasswordInput';

const SignupPage = () => {
    const navigate = useNavigate();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await api.post('/api/auth/register', {
                full_name: fullName,
                email: email,
                password: password
            });

            localStorage.setItem('token', response.data.access_token);
            navigate('/dashboard');
        } catch (err: any) {
            console.error("Signup Error", err);
            setError(err.response?.data?.detail || "Failed to create account. Try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-secondary-light/20"
            >
                <div className="p-8 text-center bg-primary/5">
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                        <BrainCircuit className="w-7 h-7 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-secondary-dark">Create Account</h2>
                    <p className="text-secondary text-sm">Join SmartLearn AI today</p>
                </div>

                <div className="p-8 pt-6">
                    {error && (
                        <div className="mb-4 p-3 bg-error/10 text-error text-sm rounded-xl flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-error" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-secondary-dark uppercase tracking-wide ml-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-light" />
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-background border border-secondary-light/20 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none text-secondary-dark"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-secondary-dark uppercase tracking-wide ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-light" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-background border border-secondary-light/20 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none text-secondary-dark"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <PasswordInput
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            showStrengthMeter={true}
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign Up <ArrowRight className="w-5 h-5" /></>}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-secondary text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="font-bold text-primary hover:text-primary-dark transition-colors">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default SignupPage;
