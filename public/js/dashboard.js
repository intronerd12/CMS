/* ============================================
   DASHBOARD.JS - Dashboard Logic
   ============================================ */

const API_BASE = '';
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const userStr = sessionStorage.getItem('currentUser');
    if (!userStr) {
        window.location.href = '/';
        return;
    }

    currentUser = JSON.parse(userStr);
    initializeDashboard();
});

function initializeDashboard() {
    // Apply role-based theme (student: blue, faculty: yellow, admin: red)
    const role = currentUser.role || 'student';
    document.body.setAttribute('data-role', role);
    document.body.classList.remove('theme-student', 'theme-faculty', 'theme-admin');
    document.body.classList.add(`theme-${role}`);

    // Set portal badge in topbar
    const portalText = document.getElementById('portalText');
    if (portalText) {
        if (role === 'admin') {
            portalText.textContent = 'Admin Console';
        } else if (role === 'faculty') {
            portalText.textContent = 'Faculty Portal';
        } else {
            portalText.textContent = 'Student Portal';
        }
    }

    // Set user info in sidebar
    document.getElementById('userName').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
    document.getElementById('userRole').textContent = role;
    document.getElementById('userAvatar').textContent = currentUser.firstName.charAt(0).toUpperCase();

    // Set greeting
    const hour = new Date().getHours();
    let greetingText = 'Good morning';
    if (hour >= 12 && hour < 17) greetingText = 'Good afternoon';
    else if (hour >= 17) greetingText = 'Good evening';
    document.getElementById('greeting').textContent = `${greetingText}, ${currentUser.firstName}!`;

    // Role-specific subtitle
    const pageSubtitle = document.getElementById('pageSubtitle');
    if (pageSubtitle) {
        if (role === 'admin') {
            pageSubtitle.textContent = 'System administration and user oversight';
        } else if (role === 'faculty') {
            pageSubtitle.textContent = 'Course management and student assessment';
        } else {
            pageSubtitle.textContent = 'Welcome back to your learning hub';
        }
    }

    // Show admin nav if admin
    if (currentUser.role === 'admin') {
        document.getElementById('adminNav').style.display = 'block';
    }

    // Show faculty actions
    if (currentUser.role === 'faculty' || currentUser.role === 'admin') {
        document.querySelectorAll('.faculty-only').forEach(el => {
            el.style.display = 'flex';
        });
    }

    // Setup navigation
    setupNavigation();

    // Setup sidebar toggle
    setupSidebar();

    // Setup logout
    setupLogout();

    // Load initial data
    loadDashboardData();
}

// ==================== NAVIGATION ====================

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateTo(page);
        });
    });

    // Check hash on load
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        navigateTo(hash);
    }
}

function navigateTo(pageName) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });

    // Show correct page
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // Update page title
    const titles = {
        dashboard: { title: 'Dashboard', subtitle: 'Welcome back to your learning hub' },
        subjects: { title: 'Subjects', subtitle: 'Manage your subjects and courses' },
        topics: { title: 'Topics & Lessons', subtitle: 'Content and learning materials' },
        quizzes: { title: 'Quizzes', subtitle: 'Assessments and evaluations' },
        scores: { title: 'Scores & Summary', subtitle: 'View performance reports' },
        users: { title: 'User Management', subtitle: 'Manage registered users' }
    };

    const info = titles[pageName] || { title: 'Dashboard', subtitle: '' };
    document.getElementById('pageTitle').textContent = info.title;
    document.getElementById('pageSubtitle').textContent = info.subtitle;

    // Update hash
    window.location.hash = pageName;

    // Load page-specific data
    if (pageName === 'users') {
        loadUsers();
    } else if (pageName === 'subjects') {
        if (typeof window.loadSubjectsPage === 'function') {
            window.loadSubjectsPage();
        }
    } else if (pageName === 'topics') {
        if (typeof window.loadTopicsPage === 'function') {
            window.loadTopicsPage();
        }
    }

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
}

// ==================== SIDEBAR ====================

function setupSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });
}

// ==================== LOGOUT ====================

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            window.location.href = '/';
        });
    }
}

// ==================== LOAD DATA ====================

async function loadDashboardData() {
    try {
        const role = currentUser ? (currentUser.role || 'student') : 'student';
        // Load subjects count with role-based topic filtering
        const subjectsRes = await fetch(`${API_BASE}/api/subjects?role=${encodeURIComponent(role)}`, {
            headers: { 'x-user-role': role }
        });
        const subjectsData = await subjectsRes.json();
        document.getElementById('statSubjects').textContent = subjectsData.subjects ? subjectsData.subjects.length : 0;

        // Count topics across all subjects visible to this role
        let totalTopics = 0;
        if (subjectsData.subjects) {
            subjectsData.subjects.forEach(s => {
                totalTopics += (s.topics ? s.topics.length : 0);
            });
        }
        document.getElementById('statTopics').textContent = totalTopics;

    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/api/users`);
        const data = await response.json();

        const tbody = document.getElementById('usersTableBody');
        const countBadge = document.getElementById('userCount');

        if (data.users && data.users.length > 0) {
            countBadge.textContent = `${data.users.length} user${data.users.length !== 1 ? 's' : ''}`;

            tbody.innerHTML = data.users.map(user => `
                <tr>
                    <td><strong>${user.firstName} ${user.lastName}</strong></td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td><span class="badge badge-${getRoleBadgeClass(user.role)}">${user.role}</span></td>
                    <td>${formatDate(user.createdAt)}</td>
                    <td><span class="badge ${user.isActive ? 'badge-success' : 'badge-error'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">No users found</td></tr>';
        }

    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// ==================== HELPERS ====================

function getRoleBadgeClass(role) {
    switch (role) {
        case 'admin': return 'error';
        case 'faculty': return 'warning';
        case 'student': return '';
        default: return '';
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Make navigateTo global for onclick handlers
window.navigateTo = navigateTo;
