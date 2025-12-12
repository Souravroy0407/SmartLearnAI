import axios from 'axios';

// Dynamically determine the base URL based on the current window location
// This allows the app to work on localhost and on local network (e.g. mobile testing)
// without manual code changes.
const getBaseUrl = () => {
    const { hostname } = window.location;

    // Assuming backend always runs on port 8000
    // If you are using https in production, this logic might need adjustment
    return `http://${hostname}:8000`;
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to include the auth token if available
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
