import { useState, useEffect, useRef } from 'react';
import { Users, Search, MoreVertical, Shield, GraduationCap, School, Check, X, Plus, RefreshCw, Trash2, User as UserIcon } from 'lucide-react';
import axios from '../../api/axios';
import Modal from '../../components/Modal';
import Toast, { type ToastType } from '../../components/Toast';

interface User {
    id: number;
    email: string;
    full_name: string;
    role: string;
    status: string;
}

const UserManagement = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter & Refresh States
    const [searchQuery, setSearchQuery] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Action States
    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState<User | null>(null);
    const [addingUser, setAddingUser] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Status Toggle States
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [selectedAction, setSelectedAction] = useState<'activate' | 'deactivate' | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Add User Form State
    const [newUser, setNewUser] = useState({
        full_name: '',
        email: '',
        password: '',
        role: 'student',
        status: 'active'
    });

    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchUsers();

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchUsers = async (userInput = false) => {
        if (userInput) setIsRefreshing(true);
        try {
            const response = await axios.get('/api/users/');
            setUsers(response.data);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch users", err);
            setError("Failed to load users. Please try again.");
        } finally {
            setLoading(false);
            if (userInput) setIsRefreshing(false);
        }
    };

    const handleRefresh = () => {
        fetchUsers(true);
    };

    const handleStatusUpdate = async () => {
        if (!selectedUserId || !selectedAction) return;

        setIsProcessing(true);
        try {
            const newStatus = selectedAction === 'activate' ? 'active' : 'inactive';

            await axios.patch(`/api/admin/users/${selectedUserId}/status`, { status: newStatus });

            // Success
            setUsers(users.map(u => u.id === selectedUserId ? { ...u, status: newStatus } : u));
            setToast({
                message: `User ${selectedAction === 'activate' ? 'activated' : 'deactivated'} successfully`,
                type: 'success'
            });
            setIsConfirmOpen(false);
            setActiveDropdown(null);
        } catch (err) {
            console.error("Failed to update status", err);
            setToast({ message: "Failed to update user status. Please try again.", type: 'error' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCreateUser = async () => {
        setAddingUser(true);
        try {
            await axios.post('/api/admin/users', newUser);
            setShowAddModal(false);
            setNewUser({ full_name: '', email: '', password: '', role: 'student', status: 'active' });
            fetchUsers();
        } catch (err: any) {
            console.error("Failed to create user", err);
            alert(err.response?.data?.detail || "Failed to create user");
        } finally {
            setAddingUser(false);
        }
    };

    const handleDeleteUser = async (userId: number) => {
        setIsDeleting(true);
        try {
            await axios.delete(`/api/admin/users/${userId}`);
            setUsers(users.filter(u => u.id !== userId));
            setShowDeleteModal(null);
            setActiveDropdown(null);
        } catch (err: any) {
            console.error("Failed to delete user", err);
            alert(err.response?.data?.detail || "Failed to delete user");
        } finally {
            setIsDeleting(false);
        }
    };

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

    const getStatusBadge = (status: string) => {
        return status === 'active'
            ? <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
            : <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactive</span>;
    };

    // Client-side filtering
    const filteredUsers = users.filter(user => {
        const query = searchQuery.toLowerCase();
        return (
            user.full_name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query)
        );
    });

    return (
        <div className="pt-10 space-y-8 relative max-w-7xl mx-auto">
            {/* Control Bar w/ Title, Count, Search, Reload, Add Button */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">

                {/* Left Side: Title, Count AND Search Bar */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-x-3">
                    {/* Title & Count */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                            <Users className="w-6 h-6" />
                        </div>
                        <div className="whitespace-nowrap">
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                Users
                                <span className="text-sm font-bold bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                                    {users.length}
                                </span>
                            </h1>
                            <p className="text-gray-500 text-sm font-medium">Manage access and roles</p>
                        </div>
                    </div>

                    {/* Search bar now grouped with title with a small gap */}
                    <div className="relative w-full md:w-[320px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or email..."
                            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-gray-800 placeholder-gray-400 font-medium"
                        />
                    </div>
                </div>

                {/* Right Side: Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                    {/* Reload Button */}
                    <button
                        onClick={handleRefresh}
                        disabled={loading || isRefreshing}
                        className="p-3 px-4 rounded-2xl bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 font-medium"
                        title="Refresh list"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>

                    {/* Add User Button */}
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5" />
                        Add User
                    </button>
                </div>
            </div>

            {/* Users List Container */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 min-h-[500px] flex flex-col">
                {error ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center px-4 flex-1">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
                            <X className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-6">{error}</p>
                        <button
                            onClick={handleRefresh}
                            className="px-6 py-2 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            Try Again
                        </button>
                    </div>
                ) : loading && !users.length ? (
                    <div className="flex flex-col items-center justify-center py-32 text-gray-400 flex-1">
                        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                        <p className="font-medium animate-pulse">Loading users...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-gray-400 flex-1">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <Search className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="text-lg font-bold text-gray-600">No users found</p>
                        <p className="text-sm">Try adjusting your search query</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                        <div className="flex flex-col min-w-[900px]">
                            {/* Table Header */}
                            <div className="grid grid-cols-[2.5fr_1.2fr_1fr_2.8fr_0.4fr] gap-4 px-8 py-4 bg-gray-50/50 border-b border-gray-100 items-center">
                                <div className="text-xs font-extra-bold text-gray-400 uppercase tracking-wider">User Profile</div>
                                <div className="text-xs font-extra-bold text-gray-400 uppercase tracking-wider">Role</div>
                                <div className="text-xs font-extra-bold text-gray-400 uppercase tracking-wider">Status</div>
                                <div className="text-xs font-extra-bold text-gray-400 uppercase tracking-wider">Email Address</div>
                                <div className="text-right text-xs font-extra-bold text-gray-400 uppercase tracking-wider">Actions</div>
                            </div>

                            {/* Table Body */}
                            <div className="divide-y divide-gray-100 flex-1">
                                {filteredUsers.map((user, index) => (
                                    <div key={user.id} className="grid grid-cols-[2.5fr_1.2fr_1fr_2.8fr_0.4fr] gap-4 px-8 py-4 items-center group hover:bg-gray-50/50 transition-colors relative">
                                        {/* User Profile */}
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center font-bold text-gray-600 shadow-inner text-sm">
                                                {user.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <span className="block font-bold text-gray-900 text-sm truncate" title={user.full_name}>{user.full_name}</span>
                                                <span className="text-xs text-gray-400 font-medium truncate block">ID: #{user.id}</span>
                                            </div>
                                        </div>

                                        {/* Role */}
                                        <div>
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${getRoleBadge(user.role).replace('bg-', 'bg-opacity-10 border-').replace('text-', 'text-')}`}>
                                                {getRoleIcon(user.role)}
                                                <span className="capitalize">{user.role}</span>
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div>
                                            {getStatusBadge(user.status || 'active')}
                                        </div>

                                        {/* Email */}
                                        <div className="text-sm font-medium text-gray-500 truncate" title={user.email}>
                                            {user.email}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex justify-end">
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveDropdown(activeDropdown === user.id ? null : user.id);
                                                    }}
                                                    className={`p-2 rounded-xl transition-all duration-200 ${activeDropdown === user.id ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                                >
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>

                                                {activeDropdown === user.id && (
                                                    <div
                                                        ref={dropdownRef}
                                                        className={`absolute right-0 w-64 rounded-2xl shadow-2xl shadow-gray-300/50 bg-white ring-1 ring-gray-100 z-[100] p-2 animate-in fade-in zoom-in-95 duration-100 overflow-y-auto max-h-[280px] custom-scrollbar ${index > filteredUsers.length - 3 && filteredUsers.length > 3
                                                            ? 'bottom-full mb-2 origin-bottom-right'
                                                            : 'top-full mt-2 origin-top-right'
                                                            }`}
                                                    >
                                                        <div className="px-3 py-2 border-b border-gray-50 mb-1 sticky top-0 bg-white z-10">
                                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Manage User</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedUserId(user.id);
                                                                    setSelectedAction(user.status === 'inactive' ? 'activate' : 'deactivate');
                                                                    setIsConfirmOpen(true);
                                                                }}
                                                                disabled={isProcessing}
                                                                className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm rounded-xl font-medium transition-colors ${user.status === 'inactive'
                                                                    ? 'text-green-600 hover:bg-green-50'
                                                                    : 'text-orange-600 hover:bg-orange-50'
                                                                    } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                                                            >
                                                                {user.status === 'inactive' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                                                {user.status === 'inactive' ? 'Activate Account' : 'Deactivate Account'}
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setShowDeleteModal(user);
                                                                    setActiveDropdown(null);
                                                                }}
                                                                className="flex w-full items-center gap-3 px-3 py-2.5 text-sm rounded-xl font-medium text-red-600 hover:bg-red-50 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Delete User
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add User Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add New User"
            >
                <div className="space-y-5 p-1">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Full Name</label>
                        <div className="relative">
                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={newUser.full_name}
                                onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                                className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium"
                                placeholder="e.g. John Doe"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Email Address</label>
                        <input
                            type="email"
                            value={newUser.email}
                            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium"
                            placeholder="john@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Password</label>
                        <input
                            type="password"
                            value={newUser.password}
                            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Role</label>
                            <select
                                value={newUser.role}
                                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium appearance-none"
                            >
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Status</label>
                            <div className="flex bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                                <button
                                    onClick={() => setNewUser({ ...newUser, status: 'active' })}
                                    className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${newUser.status === 'active' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Active
                                </button>
                                <button
                                    onClick={() => setNewUser({ ...newUser, status: 'inactive' })}
                                    className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${newUser.status === 'inactive' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Inactive
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-6 mt-2">
                        <button
                            onClick={() => setShowAddModal(false)}
                            className="flex-1 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateUser}
                            disabled={addingUser || !newUser.full_name || !newUser.email || !newUser.password}
                            className="flex-1 py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25 hover:shadow-primary/40 active:translate-y-0.5 disabled:opacity-50 disabled:shadow-none"
                        >
                            {addingUser ? 'Creating...' : 'Create User'}
                        </button>
                    </div>
                </div>
            </Modal>
            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!showDeleteModal}
                onClose={() => setShowDeleteModal(null)}
                title="Delete User"
            >
                <div className="space-y-6">
                    <div className="flex flex-col items-center text-center p-4">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-600">
                            <Trash2 className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Are you absolutely sure?</h3>
                        <p className="text-gray-500 max-w-sm text-sm">
                            This will permanently delete <span className="font-bold text-gray-900">{showDeleteModal?.full_name}</span> and all associated data, including quizzes, attempts, and goals. This action cannot be undone.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => setShowDeleteModal(null)}
                            disabled={isDeleting}
                            className="flex-1 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => showDeleteModal && handleDeleteUser(showDeleteModal.id)}
                            disabled={isDeleting}
                            className="flex-1 py-3.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isDeleting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Deleting...
                                </>
                            ) : 'Yes, Delete'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Status Confirmation Modal */}
            <Modal
                isOpen={isConfirmOpen}
                onClose={() => !isProcessing && setIsConfirmOpen(false)}
                title={`${selectedAction === 'activate' ? 'Activate' : 'Deactivate'} User`}
            >
                <div className="space-y-6">
                    <div className="flex flex-col items-center text-center p-4">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${selectedAction === 'activate' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                            {selectedAction === 'activate' ? <Check className="w-10 h-10" /> : <X className="w-10 h-10" />}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {selectedAction === 'activate' ? 'Activate' : 'Deactivate'} User?
                        </h3>
                        <p className="text-gray-500 max-w-sm text-sm">
                            {selectedAction === 'activate'
                                ? "Are you sure you want to activate this user? They will regain access to all features immediately."
                                : "Are you sure you want to deactivate this user? This user will not be able to log in until reactivated."
                            }
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => setIsConfirmOpen(false)}
                            disabled={isProcessing}
                            className="flex-1 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleStatusUpdate}
                            disabled={isProcessing}
                            className={`flex-1 py-3.5 rounded-xl text-white font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${selectedAction === 'activate'
                                ? 'bg-green-600 hover:bg-green-700 shadow-green-200'
                                : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200'
                                }`}
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                selectedAction === 'activate' ? 'Confirm Activation' : 'Confirm Deactivation'
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default UserManagement;
