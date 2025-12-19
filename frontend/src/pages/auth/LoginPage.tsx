import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrainCircuit, Mail, ArrowRight, Loader2 } from 'lucide-react';
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
            // Using central api client which handles baseURL and Auth headers automatically
            const response = await api.post('/api/auth/login', {
                email: email,
                password: password
            });

            login(response.data.access_token);

            // Decode token to check role and redirect accordingly
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
                navigate('/dashboard'); // Fallback
            }
        } catch (err: any) {
            console.error("Login Error", err);
            setError(err.response?.data?.detail || "Invalid email or password");
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
                    <h2 className="text-2xl font-bold text-secondary-dark">Welcome Back</h2>
                    <p className="text-secondary text-sm">Sign in to continue your learning journey</p>
                </div>

                <div className="p-8 pt-6">
                    {error && (
                        <div className="mb-4 p-3 bg-error/10 text-error text-sm rounded-xl flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-error" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
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
                        // label="Password" (default)
                        />

                        <div className="flex items-center justify-end">
                            <Link to="#" className="text-xs font-medium text-primary hover:text-primary-dark transition-colors">Forgot Password?</Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-5 h-5" /></>}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-secondary text-sm">
                            Don't have an account?{' '}
                            <Link to="/signup" className="font-bold text-primary hover:text-primary-dark transition-colors">
                                Create Account
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default LoginPage;
