// Authentication utility functions

// Get token from localStorage
function getToken() {
    return localStorage.getItem('token');
}

// Get current user from localStorage
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getToken();
}

// Check if user is chief manager
function isChiefManager() {
    const user = getCurrentUser();
    return user && user.role === 'chief_manager';
}

// Logout user
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Make authenticated API request
async function authenticatedFetch(url, options = {}) {
    const token = getToken();
    
    if (!token) {
        throw new Error('Not authenticated');
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    // Handle unauthorized
    if (response.status === 401) {
        logout();
        throw new Error('Session expired. Please login again.');
    }
    
    return response;
}

// Protect page - redirect to login if not authenticated
function protectPage() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Require chief manager role
function requireChief() {
    if (!protectPage()) return false;
    
    if (!isChiefManager()) {
        alert('Access denied. Chief Manager role required.');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}
