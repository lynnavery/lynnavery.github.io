// Function to check if we're on a local server
function isLocalServer() {
    // Check if we're on localhost or 127.0.0.1
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname === '';
}

// Function to add the admin link to the nav
function addAdminLink() {
    if (isLocalServer()) {
        const nav = document.querySelector('.nav');
        if (nav) {
            const adminLink = document.createElement('a');
            adminLink.href = '/admin/editor.html';
            adminLink.className = 'admin-link';
            adminLink.textContent = 'admin';
            nav.appendChild(adminLink);
        }
    }
}

// Add the admin link when the DOM is loaded
document.addEventListener('DOMContentLoaded', addAdminLink); 