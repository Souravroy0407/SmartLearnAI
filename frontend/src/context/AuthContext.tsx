import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

interface User {
    email: string;
    role: 'student' | 'teacher' | 'admin';
    full_name: string;
    avatar_url?: string;

    // Teacher Profile Fields
    bio?: string;
    subjects?: string;
    experience?: string;
    professional_title?: string;
    education?: string;
    teaching_languages?: string;
    teaching_style?: string;
    linkedin_url?: string;
    website_url?: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (token: string, userData?: User) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const decoded: any = jwtDecode(token);
                    if (decoded.exp * 1000 < Date.now()) {
                        logout();
                    } else {
                        // Set initial state from token for immediate UI feedback
                        setUser({
                            email: decoded.sub,
                            role: decoded.role || 'student',
                            full_name: decoded.full_name || 'User',
                            avatar_url: decoded.avatar_url
                        });

                        // Fetch full profile from API to get all fields
                        try {
                            // We need to import api here, but avoiding circular dependecy at module level might be tricky?
                            // Actually axios.ts defines the instance. We can just use fetch or import api.
                            // Let's rely on the imported `api`.
                            // Dynamic import to avoid potential cycle if api imports something that imports auth? 
                            // No, api.ts is leaf.

                            // Note: api request interceptor uses localStorage, which is already set.
                            const { default: api } = await import('../api/axios');
                            const response = await api.get('/api/users/me');
                            if (response.data) {
                                setUser(response.data);
                            }
                        } catch (err) {
                            console.error("Failed to fetch user profile", err);
                            // If 401, maybe logout? But token check passed. 
                            // Could be network error. Keep token data as fallback.
                        }
                    }
                } catch (error) {
                    console.error("Invalid token", error);
                    logout();
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    const login = async (token: string, userData?: User) => {
        localStorage.setItem('token', token);

        if (userData) {
            setUser(userData);
        } else {
            // Fallback to token decoding if no user data provided
            const decoded: any = jwtDecode(token);
            setUser({
                email: decoded.sub,
                role: decoded.role || 'student',
                full_name: decoded.full_name || 'User',
                avatar_url: decoded.avatar_url
            });

            // Try to fetch full profile in background
            try {
                const { default: api } = await import('../api/axios');
                const response = await api.get('/api/users/me');
                if (response.data) {
                    setUser(response.data);
                }
            } catch (err) {
                console.error("Failed to fetch user profile on login", err);
            }
        }
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
