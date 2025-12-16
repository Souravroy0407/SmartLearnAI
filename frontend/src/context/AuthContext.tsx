import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

interface User {
    email: string;
    role: 'student' | 'teacher' | 'admin';
    full_name: string;
    avatar_url?: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (token: string) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                // Check expiry
                if (decoded.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    setUser({
                        email: decoded.sub,
                        role: decoded.role || 'student', // Default to student if no role in token yet
                        full_name: decoded.full_name || 'User',
                        avatar_url: decoded.avatar_url
                    });
                }
            } catch (error) {
                console.error("Invalid token", error);
                logout();
            }
        }
        setIsLoading(false);
    }, []);

    const login = (token: string) => {
        localStorage.setItem('token', token);
        const decoded: any = jwtDecode(token);
        setUser({
            email: decoded.sub,
            role: decoded.role || 'student',
            full_name: decoded.full_name || 'User',
            avatar_url: decoded.avatar_url
        });
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
