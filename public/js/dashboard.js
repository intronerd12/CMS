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
    // Apply role-based theme (student: blue, faculty: yellow)
    const role = (currentUser.role === 'faculty') ? 'faculty' : 'student';
    document.body.setAttribute('data-role', role);
    document.body.classList.remove('theme-student', 'theme-faculty', 'theme-admin');
    document.body.classList.add(`theme-${role}`);

    // Set portal badge in topbar
    const portalText = document.getElementById('portalText');
    if (portalText) {
        if (role === 'faculty') {
            portalText.textContent = 'Faculty Portal';
        } else {
            portalText.textContent = 'Student Portal';
        }
    }

    // Set user info in sidebar
    document.getElementById('userName').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
    document.getElementById('userRole').textContent = role === 'faculty' ? 'Faculty Member' : 'Student';
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
        if (role === 'faculty') {
            pageSubtitle.textContent = 'Course management and student assessment';
        } else {
            pageSubtitle.textContent = 'Welcome back to your learning hub';
        }
    }

    // Show faculty actions
    if (currentUser.role === 'faculty') {
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
        'quiz-result': { title: 'Quiz Assessment Results', subtitle: 'Official evaluation report and certification' },
        users: { title: 'User Management', subtitle: 'Manage registered users' }
    };

    const info = titles[pageName] || { title: 'Dashboard', subtitle: '' };
    document.getElementById('pageTitle').textContent = info.title;
    document.getElementById('pageSubtitle').textContent = info.subtitle;

    // Update hash
    window.location.hash = pageName;

    // Load page-specific data
    if (pageName === 'subjects') {
        if (typeof window.loadSubjectsPage === 'function') {
            window.loadSubjectsPage();
        }
    } else if (pageName === 'topics') {
        if (typeof window.loadTopicsPage === 'function') {
            window.loadTopicsPage();
        }
    } else if (pageName === 'quizzes') {
        if (typeof window.loadQuizzesPage === 'function') {
            window.loadQuizzesPage();
        }
    } else if (pageName === 'scores') {
        if (typeof window.loadScoresPage === 'function') {
            window.loadScoresPage();
        }
    } else if (pageName === 'quiz-result') {
        if (typeof window.loadQuizResultPage === 'function') {
            window.loadQuizResultPage();
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

        // Fetch stats
        const statsRes = await fetch(`${API_BASE}/api/stats`);
        if (statsRes.ok) {
            const stats = await statsRes.json();
            const statQuizzesEl = document.getElementById('statQuizzes');
            if (statQuizzesEl) {
                if (role === 'student' && currentUser && currentUser.id) {
                    const scRes = await fetch(`${API_BASE}/api/scores/student/${currentUser.id}`);
                    if (scRes.ok) {
                        const scData = await scRes.json();
                        statQuizzesEl.textContent = scData.scores ? scData.scores.filter(s => s.passed === 1).length : 0;
                    } else {
                        statQuizzesEl.textContent = stats.totalQuizzes || 0;
                    }
                } else {
                    statQuizzesEl.textContent = stats.totalQuizzes || 0;
                }
            }
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// ==================== HELPERS ====================

function getRoleBadgeClass(role) {
    switch (role) {
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
