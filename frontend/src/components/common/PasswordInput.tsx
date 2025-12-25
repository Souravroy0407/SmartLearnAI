import { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface PasswordInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    showStrengthMeter?: boolean;
    label?: string;
    name?: string;
    disabled?: boolean;
    className?: string;
}

const PasswordInput = ({
    value,
    onChange,
    placeholder = "••••••••",
    showStrengthMeter = false,
    label = "Password",
    name = "password",
    disabled = false,
    className = ""
}: PasswordInputProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const [strength, setStrength] = useState(0);
    const [requirements, setRequirements] = useState({
        length: false,
        number: false,
        special: false,
        uppercase: false
    });

    useEffect(() => {
        if (!showStrengthMeter) return;

        const reqs = {
            length: value.length >= 8,
            number: /\d/.test(value),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(value),
            uppercase: /[A-Z]/.test(value)
        };
        setRequirements(reqs);

        const score = Object.values(reqs).filter(Boolean).length;
        setStrength(score);
    }, [value, showStrengthMeter]);

    const getStrengthColor = () => {
        if (strength === 0) return 'bg-gray-200';
        if (strength <= 2) return 'bg-error';      // Weak
        if (strength === 3) return 'bg-warning';   // Medium
        return 'bg-success';                       // Strong
    };

    const getStrengthLabel = () => {
        if (strength === 0) return 'Enter password';
        if (strength <= 2) return 'Weak';
        if (strength === 3) return 'Medium';
        return 'Strong';
    };

    return (
        <div className="space-y-1">
            <label className="text-xs font-semibold text-secondary-dark uppercase tracking-wide ml-1">
                {label}
            </label>
            <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-light pointer-events-none" />
                <input
                    type={isVisible ? "text" : "password"}
                    value={value}
                    onChange={onChange}
                    name={name}
                    disabled={disabled}
                    className={`w-full pl-12 pr-12 py-3 bg-background border border-secondary-light/20 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none text-secondary-dark ${className}`}
                    placeholder={placeholder}
                    required
                />
                <button
                    type="button"
                    onClick={() => setIsVisible(!isVisible)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary-light hover:text-primary transition-colors focus:outline-none p-1 rounded-full hover:bg-secondary-light/10"
                    aria-label={isVisible ? "Hide password" : "Show password"}
                >
                    {isVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
            </div>

            {showStrengthMeter && (
                <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Strength Indicator Bar */}
                    {value.length > 0 && (
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs px-1">
                                <span className="text-secondary">Strength</span>
                                <span className={`font-semibold ${strength === 4 ? 'text-success' : strength === 3 ? 'text-warning' : strength > 0 ? 'text-error' : 'text-secondary'}`}>
                                    {getStrengthLabel()}
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                    className={`h-full ${getStrengthColor()}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(strength / 4) * 100}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Requirements List */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <RequirementItem met={requirements.length} label="8+ characters" />
                        <RequirementItem met={requirements.uppercase} label="Uppercase letter" />
                        <RequirementItem met={requirements.number} label="At least 1 number" />
                        <RequirementItem met={requirements.special} label="Special character" />
                    </div>
                </div>
            )}
        </div>
    );
};

const RequirementItem = ({ met, label }: { met: boolean; label: string }) => (
    <div className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${met ? 'text-success font-medium' : 'text-secondary-light'}`}>
        {met ? <Check className="w-3.5 h-3.5 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-current opacity-50 shrink-0" />}
        <span>{label}</span>
    </div>
);

export default PasswordInput;
