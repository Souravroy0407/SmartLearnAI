import { useState, useEffect, useRef } from 'react';
import { Bell, Search, User, Menu, LogOut, Settings, X, Camera, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { API_BASE_URL } from '../api/axios';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';

interface TopbarProps {
    onMenuClick?: () => void;
}

const Topbar = ({ onMenuClick }: TopbarProps) => {
    const { user, login, logout } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Edit Form State
    const [editName, setEditName] = useState('');
    const [editAvatarUrl, setEditAvatarUrl] = useState(''); // This will store the final URL (remote or uploaded)
    const [isLoading, setIsLoading] = useState(false);

    // Cropper State
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            setEditName(user.full_name || '');
            setEditAvatarUrl(user.avatar_url || '');
        }
    }, [user, isEditModalOpen]);

    const handleLogout = () => {
        setIsDropdownOpen(false);
        logout();
    };

    const readFile = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.addEventListener('load', () => resolve(reader.result as string));
            reader.readAsDataURL(file);
        });
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const imageDataUrl = await readFile(file);
            setImageSrc(imageDataUrl);
            setIsCropModalOpen(true);
        }
    };

    const handleCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
    };

    const handleUploadCroppedImage = async () => {
        try {
            setIsLoading(true);
            if (!imageSrc || !croppedAreaPixels) return;

            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (!croppedImageBlob) return;

            const formData = new FormData();
            formData.append('file', croppedImageBlob, 'avatar.jpg');

            const token = localStorage.getItem('token');
            const response = await api.post('/api/users/upload-avatar', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const timestamp = new Date().getTime();
            const newAvatarUrl = `${response.data.avatar_url}?t=${timestamp}`;

            if (response.data.access_token) {
                // Update context immediately with the new token
                login(response.data.access_token);
                // Also update local state to reflect change before context propagates or if context is slow
                setEditAvatarUrl(newAvatarUrl);
            } else {
                setEditAvatarUrl(newAvatarUrl);
            }

            setIsCropModalOpen(false);
            setImageSrc(null); // Clear raw image
            // No success message needed for upload per se, or maybe yes? logic below implies update profile is the main one.
            // But this is separate upload. Let's add success here too.
            // showToast("Avatar uploaded successfully!"); // Optional, but usually strictly required by user? 
            // Actually user asked about "Profile updated successfully" which is in handleSaveProfile.
        } catch (error: any) {
            console.error("Failed to upload image", error);
            const msg = error.response?.data?.detail || error.message || "Failed to upload image";
            showToast(msg, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        try {
            setIsLoading(true);
            const response = await api.patch('/api/users/me', {
                full_name: editName,
                avatar_url: editAvatarUrl
            });

            if (response.data.access_token) {
                login(response.data.access_token);
            }

            showToast("Profile updated successfully!", 'success');
            setIsEditModalOpen(false);
            setIsDropdownOpen(false);
        } catch (error: any) {
            console.error("Failed to update profile", error);
            const msg = error.response?.data?.detail || error.message || "Failed to update profile";
            showToast(msg, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="h-16 bg-white border-b border-secondary-light/20 flex items-center justify-between px-4 md:px-8 fixed top-0 right-0 left-0 md:left-64 z-30">
                <div className="flex items-center gap-4 flex-1 max-w-xl">
                    <button
                        onClick={onMenuClick}
                        className="md:hidden p-2 text-secondary hover:text-primary hover:bg-secondary-light/10 rounded-lg transition-colors"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
                        <input
                            type="text"
                            placeholder="Search for topics, exams, or doubts..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border-none focus:ring-2 focus:ring-primary/20 text-sm text-secondary-dark placeholder:text-secondary-light outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <button className="relative p-2 text-secondary hover:text-primary transition-colors">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-3 pl-6 border-l border-secondary-light/20 hover:bg-gray-50 transition-colors p-2 rounded-lg"
                        >
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-secondary-dark">{user?.full_name || 'User'}</p>
                                <p className="text-xs text-secondary capitalize">{user?.role || 'Guest'}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                                {user?.avatar_url ? (
                                    <img
                                        src={user.avatar_url.startsWith('http') ? user.avatar_url : `${API_BASE_URL}${user.avatar_url}`}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="w-5 h-5 text-primary" />
                                )}
                            </div>
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-secondary-light/20 py-2 z-50">
                                <button
                                    onClick={() => { setIsEditModalOpen(true); setIsDropdownOpen(false); }}
                                    className="w-full px-4 py-2 text-sm text-secondary-dark hover:bg-secondary-light/10 flex items-center gap-2"
                                >
                                    <Settings className="w-4 h-4" />
                                    Edit Profile
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full px-4 py-2 text-sm text-error hover:bg-error/10 flex items-center gap-2"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-secondary-light/20">
                            <h3 className="text-lg font-bold text-secondary-dark">Edit Profile</h3>
                            <button onClick={() => { setIsEditModalOpen(false); setImageSrc(null); setIsCropModalOpen(false); }} className="text-secondary hover:text-secondary-dark">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="flex flex-col items-center gap-4 mb-6">
                                <div className="relative group cursor-pointer w-24 h-24" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-white shadow-md overflow-hidden">
                                        {editAvatarUrl ? (
                                            <img
                                                src={editAvatarUrl.startsWith('http') ? editAvatarUrl : `${API_BASE_URL}${editAvatarUrl}`}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User className="w-10 h-10 text-primary" />
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-8 h-8 text-white" />
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={onFileChange}
                                />
                                <p className="text-xs text-secondary">Click to change picture</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-secondary-dark">Full Name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-secondary-light/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    placeholder="Enter your name"
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 border-t border-secondary-light/20 flex justify-end gap-3">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-4 py-2 rounded-lg text-secondary-dark hover:bg-gray-200 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                disabled={isLoading}
                                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                            >
                                {isLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Cropper Modal */}
            {isCropModalOpen && imageSrc && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col h-[500px]">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Crop Image</h3>
                            <button onClick={() => { setIsCropModalOpen(false); setImageSrc(null); }} className="p-1 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="relative flex-1 bg-black">
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onCropComplete={handleCropComplete}
                                onZoomChange={setZoom}
                                cropShape="round"
                                showGrid={false}
                            />
                        </div>
                        <div className="p-4 bg-white space-y-4">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">Zoom</span>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => { setIsCropModalOpen(false); setImageSrc(null); }}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUploadCroppedImage}
                                    disabled={isLoading}
                                    className="px-6 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50"
                                >
                                    {isLoading ? 'Uploading...' : 'Done'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 duration-300 ${toast.type === 'success' ? 'bg-white border-l-4 border-green-500 text-gray-800' : 'bg-white border-l-4 border-red-500 text-gray-800'
                    }`}>
                    <div className={`p-1 rounded-full ${toast.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </div>
                    <span className="font-medium text-sm">{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </>
    );
};

export default Topbar;
