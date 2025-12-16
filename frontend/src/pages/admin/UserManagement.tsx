import { useState, useEffect } from 'react';
import { Users, Search, Filter, MoreVertical, Shield, GraduationCap, School } from 'lucide-react';
import api from '../../api/axios';

interface User {
    id: number;
    email: string;
    full_name: string;
    role: string;
}

const UserManagement = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await api.get('/api/users/');
                setUsers(response.data);
            } catch (err) {
                console.error("Failed to fetch users", err);
                setError("Failed to load users. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'admin': return <Shield className="w-4 h-4 text-primary" />;
            case 'teacher': return <School className="w-4 h-4 text-purple-600" />;
            default: return <GraduationCap className="w-4 h-4 text-green-600" />;
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-primary/10 text-primary';
            case 'teacher': return 'bg-purple-100 text-purple-700';
            default: return 'bg-green-100 text-green-700';
        }
    };

    if (loading) return <div className="p-8">Loading users...</div>;
    if (error) return <div className="p-8 text-error">{error}</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-dark">User Management</h1>
                    <p className="text-secondary">Manage access and roles for all users.</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-secondary-light/10 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-secondary-light/10 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-light" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="w-full pl-10 pr-4 py-2 rounded-xl bg-secondary-light/5 border-none focus:ring-2 focus:ring-primary/20 text-secondary-dark placeholder-secondary"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-secondary-light/5">
                            <tr>
                                <th className="text-left py-4 px-6 text-xs font-bold text-secondary uppercase tracking-wider">User</th>
                                <th className="text-left py-4 px-6 text-xs font-bold text-secondary uppercase tracking-wider">Role</th>
                                <th className="text-left py-4 px-6 text-xs font-bold text-secondary uppercase tracking-wider">Email</th>
                                <th className="text-right py-4 px-6 text-xs font-bold text-secondary uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-light/10">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-secondary-light/5 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-secondary-light/10 flex items-center justify-center font-bold text-secondary">
                                                {user.full_name.charAt(0)}
                                            </div>
                                            <span className="font-medium text-secondary-dark">{user.full_name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getRoleBadge(user.role)}`}>
                                            {getRoleIcon(user.role)}
                                            <span className="capitalize">{user.role}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-secondary">{user.email}</td>
                                    <td className="py-4 px-6 text-right">
                                        <button className="p-2 hover:bg-secondary-light/10 rounded-lg text-secondary transition-colors">
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
