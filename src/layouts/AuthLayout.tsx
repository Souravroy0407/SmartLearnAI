import { type ReactNode } from 'react';
import { BrainCircuit } from 'lucide-react';

interface AuthLayoutProps {
    children: ReactNode;
    title: string;
    subtitle: string;
}

const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
            {/* Left Side - Visuals */}
            <div className="hidden lg:flex flex-col justify-between bg-secondary-dark relative overflow-hidden p-12 text-white">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-secondary-dark/90 to-secondary-dark/40"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <BrainCircuit className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-bold text-2xl tracking-tight">SmartLearn AI</span>
                    </div>
                </div>

                <div className="relative z-10 max-w-lg">
                    <h2 className="text-4xl font-bold mb-6 leading-tight">
                        Unlock your potential with AI-powered learning.
                    </h2>
                    <p className="text-lg text-gray-300 leading-relaxed">
                        Join thousands of students improving their grades with personalized study plans, instant exam feedback, and adaptive quizzes.
                    </p>
                </div>

                <div className="relative z-10 text-sm text-gray-500">
                    &copy; 2025 SmartLearn AI. All rights reserved.
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex flex-col items-center justify-center p-6 sm:p-12 bg-background relative">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <div className="lg:hidden flex justify-center mb-6">
                            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                                <BrainCircuit className="w-7 h-7 text-white" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-secondary-dark tracking-tight">{title}</h1>
                        <p className="mt-2 text-secondary">{subtitle}</p>
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
