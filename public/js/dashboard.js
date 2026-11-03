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

    // Asynchronously sync profile to ensure registered name & handle are always up to date
    if (currentUser && currentUser.id) {
        fetch(`${API_BASE}/api/auth/profile/${currentUser.id}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data && data.user) {
                    const fresh = data.user;
                    sessionStorage.setItem('currentUser', JSON.stringify(fresh));
                    currentUser = fresh;
                    const freshName = `${fresh.firstName || ''} ${fresh.lastName || ''}`.trim() || fresh.username || 'User';
                    const nameEl = document.getElementById('userName');
                    if (nameEl) nameEl.textContent = freshName;
                    const handleEl = document.getElementById('userHandle');
                    if (handleEl) handleEl.textContent = fresh.username ? `@${fresh.username}` : '';
                    renderUserAvatar(fresh);
                }
            })
            .catch(() => {});
    }
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

    // Set user info in sidebar - strictly using registered name & handle
    const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username || 'User';
    document.getElementById('userName').textContent = fullName;
    const handleEl = document.getElementById('userHandle');
    if (handleEl) {
        handleEl.textContent = currentUser.username ? `@${currentUser.username}` : '';
    }
    const roleEl = document.getElementById('userRole');
    if (roleEl) {
        if (role === 'faculty') {
            roleEl.innerHTML = '<span class="role-status-dot"></span>Faculty';
            roleEl.className = 'user-role role-faculty';
        } else {
            roleEl.innerHTML = '<span class="role-status-dot"></span>Student';
            roleEl.className = 'user-role role-student';
        }
    }
    renderUserAvatar(currentUser);

    // Set greeting
    const hour = new Date().getHours();
    let greetingText = 'Good morning';
    if (hour >= 12 && hour < 17) greetingText = 'Good afternoon';
    else if (hour >= 17) greetingText = 'Good evening';
    const greetingFirstName = currentUser.firstName || currentUser.username || 'User';
    document.getElementById('greeting').textContent = `${greetingText}, ${greetingFirstName}!`;

    // Role-specific subtitle
    const pageSubtitle = document.getElementById('pageSubtitle');
    if (pageSubtitle) {
        if (role === 'faculty') {
            pageSubtitle.textContent = 'Course management and student assessment';
        } else {
            pageSubtitle.textContent = 'Welcome back to your learning hub';
        }
    }

    // Show role-specific actions
    if (currentUser.role === 'faculty') {
        document.querySelectorAll('.faculty-only').forEach(el => {
            el.style.display = 'flex';
        });
        document.querySelectorAll('.student-only').forEach(el => {
            el.style.display = 'none';
        });
    } else {
        document.querySelectorAll('.faculty-only').forEach(el => {
            el.style.display = 'none';
        });
        document.querySelectorAll('.student-only').forEach(el => {
            el.style.display = 'inline-flex';
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
        scores: { title: 'Scores & Gradebook', subtitle: 'View topic assessment reports and student quiz scores' },
        matrix: { title: 'Summary of ALL Quiz Scores per Student', subtitle: 'Cumulative assessment ledger tracking student performance across all curriculum topics' },
        'quiz-result': { title: 'Quiz Assessment Results', subtitle: 'Official evaluation report and certification' },
        users: { title: 'User Management', subtitle: 'Manage registered users' }
    };

    const info = titles[pageName] || { title: 'Dashboard', subtitle: '' };
    document.getElementById('pageTitle').textContent = info.title;
    document.getElementById('pageSubtitle').textContent = info.subtitle;

    // Update hash
    window.location.hash = pageName;

    // Load page-specific data
    if (pageName === 'dashboard') {
        loadDashboardData();
    } else if (pageName === 'subjects') {
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
    } else if (pageName === 'matrix') {
        if (typeof window.loadMatrixPage === 'function') {
            window.loadMatrixPage();
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

    if (!sidebar) return;

    // Restore saved minimized/maximized state
    const isCollapsedSaved = localStorage.getItem('sidebar_collapsed') === 'true';
    if (isCollapsedSaved && window.innerWidth > 768) {
        sidebar.classList.add('collapsed');
        document.body.classList.add('sidebar-collapsed');
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            sidebar.classList.toggle('collapsed');
            document.body.classList.toggle('sidebar-collapsed');
            const isNowCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebar_collapsed', isNowCollapsed ? 'true' : 'false');
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
        const userId = currentUser ? currentUser.id : '';
        const userParam = role === 'faculty' 
            ? `&facultyId=${encodeURIComponent(userId)}`
            : `&studentId=${encodeURIComponent(userId)}`;

        // Load subjects visible to this user (for students: only joined classes!)
        const subjectsRes = await fetch(`${API_BASE}/api/subjects?role=${encodeURIComponent(role)}${userParam}`, {
            headers: {
                'x-user-role': role,
                'x-user-id': currentUser ? currentUser.id : ''
            }
        });
        const subjectsData = await subjectsRes.json();
        const subjectsList = subjectsData.subjects || [];
        document.getElementById('statSubjects').textContent = subjectsList.length;

        // Count topics across visible subjects
        let totalTopics = 0;
        subjectsList.forEach(s => {
            totalTopics += (s.topics ? s.topics.length : 0);
        });
        document.getElementById('statTopics').textContent = totalTopics;

        // Render Class Join Code & Enrollment Banner on Dashboard
        renderDashboardEnrollmentBanner(subjectsList, role);

        // Fetch stats & scores
        const statsRes = await fetch(`${API_BASE}/api/stats?role=${encodeURIComponent(role)}${userParam}`, {
            headers: {
                'x-user-role': role,
                'x-user-id': currentUser ? currentUser.id : ''
            }
        });
        if (statsRes.ok) {
            const stats = await statsRes.json();
            const statQuizzesEl = document.getElementById('statQuizzes');
            const statAvgScoreEl = document.getElementById('statAvgScore');
            if (role === 'student' && currentUser && currentUser.id) {
                const scRes = await fetch(`${API_BASE}/api/scores/student/${currentUser.id}`);
                if (scRes.ok) {
                    const scData = await scRes.json();
                    const scores = scData.scores || [];
                    if (statQuizzesEl) {
                        statQuizzesEl.textContent = scores.filter(s => s.passed === 1).length;
                    }
                    if (statAvgScoreEl) {
                        if (scores.length > 0) {
                            const avg = Math.round(scores.reduce((acc, s) => acc + Number(s.percentage || 0), 0) / scores.length);
                            statAvgScoreEl.textContent = `${avg}%`;
                        } else {
                            statAvgScoreEl.textContent = '—';
                        }
                    }
                }
            } else {
                if (statQuizzesEl) statQuizzesEl.textContent = stats.totalQuizzes || 0;
            }
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderDashboardEnrollmentBanner(subjects, role) {
    const container = document.getElementById('dashboardClassEnrollmentBanner');
    if (!container) return;

    if (role === 'faculty') {
        if (!subjects || subjects.length === 0) {
            container.innerHTML = '';
            return;
        }
        container.innerHTML = `
            <div class="class-code-hub-card faculty-code-hub">
                <div class="class-code-hub-header">
                    <div class="class-code-hub-left">
                        <div class="class-code-hub-badge">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                            </svg>
                            <span>Classroom Enrollment Codes</span>
                        </div>
                        <h3>Share Class Codes with Students</h3>
                        <p>Students enroll by entering your unique 6-character Class Code (Google Classroom &amp; MS Teams style). Share the code below with your students to grant access.</p>
                    </div>
                </div>
                <div class="class-code-hub-list">
                    ${subjects.map(s => `
                        <div class="class-code-pill-card">
                            <div class="class-code-pill-meta">
                                <div class="class-code-pill-title-row">
                                    <span class="class-course-code-tag">${escapeHtml(s.code)}</span>
                                    <h4 class="class-course-name">${escapeHtml(s.name)}</h4>
                                </div>
                                <div class="class-code-pill-sub-row">
                                    <span class="class-code-term-chip">${escapeHtml(s.term || '1st Semester')} • ${escapeHtml(s.year || '3rd Year')}</span>
                                    <span class="class-code-pill-roster">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                                        <strong>${s.enrolledCount || 0}</strong> Student${(s.enrolledCount === 1) ? '' : 's'} Enrolled
                                    </span>
                                </div>
                            </div>
                            <div class="class-code-pill-actions">
                                <div class="class-code-display-box" title="Class Join Code">
                                    <span class="class-code-label">CLASS CODE</span>
                                    <span class="class-code-mono">${escapeHtml(s.joinCode || 'CMS315')}</span>
                                    <button type="button" class="btn-copy-code-pill" onclick="window.copyClassJoinCode('${escapeHtml(s.joinCode || 'CMS315')}')" title="Copy Class Code">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                        <span>Copy</span>
                                    </button>
                                </div>
                                <button type="button" class="btn btn-primary btn-sm btn-manage-roster" onclick="window.openClassRosterModal('${escapeHtml(s.id)}')">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                    <span>Code &amp; Roster</span>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        if (!subjects || subjects.length === 0) {
            container.innerHTML = `
                <div class="class-code-hub-card student-join-hub">
                    <div class="student-hub-content">
                        <div class="class-code-hub-left">
                            <div class="class-code-hub-badge badge-orange">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                                </svg>
                                <span>Class Enrollment Required</span>
                            </div>
                            <h3>Join Your Instructor's Class with a Code</h3>
                            <p>You are not enrolled in any classes yet. Enter the 6-character Class Code provided by your instructor to unlock topics, lesson presentations, and quizzes.</p>
                        </div>
                        <form class="class-code-inline-form" onsubmit="window.handleInlineDashboardJoin(event)">
                            <div class="inline-input-wrapper">
                                <input
                                    type="text"
                                    id="dashboardInlineJoinCodeInput"
                                    class="class-code-inline-input"
                                    placeholder="Enter Code (e.g. CMS315)"
                                    maxlength="12"
                                    required
                                    autocomplete="off"
                                >
                                <button type="submit" class="btn btn-primary btn-join-inline">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span>Join Class</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="class-code-hub-card student-enrolled-hub">
                    <div class="student-hub-content enrolled">
                        <div class="class-code-hub-left">
                            <div class="class-code-hub-badge badge-emerald">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                                </svg>
                                <span>Enrolled Classroom${subjects.length > 1 ? 's' : ''} (${subjects.length})</span>
                            </div>
                            <h3>Your Active Course Classrooms</h3>
                            <p>You are actively enrolled in: ${subjects.map(s => `<span class="enrolled-subject-tag">${escapeHtml(s.code)} — ${escapeHtml(s.name)}</span>`).join(' ')}</p>
                        </div>
                        <div class="student-hub-actions">
                            <button type="button" class="btn btn-secondary" onclick="navigateTo('topics')">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                                <span>Open Course Lessons</span>
                            </button>
                            <button type="button" class="btn btn-primary" onclick="window.openJoinClassModal()">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                <span>Join Another Class</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

window.loadDashboardData = loadDashboardData;

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


// ==================== PROFILE SETTINGS & PHOTO LOGIC ====================

let pendingProfileAvatar = null;

function renderUserAvatar(user) {
    if (!user) return;
    const avatarEl = document.getElementById('userAvatar');
    if (!avatarEl) return;

    if (user.profilePic && typeof user.profilePic === 'string' && user.profilePic.trim().length > 0) {
        avatarEl.innerHTML = `<img src="${user.profilePic}" alt="${user.firstName || 'User'}" class="user-avatar-img" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    } else {
        const userInitial = (user.firstName || user.username || 'U').charAt(0).toUpperCase();
        avatarEl.textContent = userInitial;
    }
}
window.renderUserAvatar = renderUserAvatar;

window.openProfileSettingsModal = function () {
    if (!currentUser) return;

    pendingProfileAvatar = currentUser.profilePic || '';

    const fnInput = document.getElementById('profileModalFirstName');
    const lnInput = document.getElementById('profileModalLastName');
    const emInput = document.getElementById('profileModalEmail');
    const unInput = document.getElementById('profileModalUsername');
    const roleInput = document.getElementById('profileModalRole');
    const roleBadge = document.getElementById('profileModalRoleBadge');
    const pwdInput = document.getElementById('profileModalPassword');
    const pwdConfirmInput = document.getElementById('profileModalConfirmPassword');
    const feedback = document.getElementById('profileModalFeedback');

    if (fnInput) fnInput.value = currentUser.firstName || '';
    if (lnInput) lnInput.value = currentUser.lastName || '';
    if (emInput) emInput.value = currentUser.email || '';
    if (unInput) unInput.value = currentUser.username || '';
    if (roleInput) roleInput.value = (currentUser.role === 'faculty') ? 'Faculty Member' : 'Enrolled Student';
    if (pwdInput) pwdInput.value = '';
    if (pwdConfirmInput) pwdConfirmInput.value = '';
    if (feedback) feedback.style.display = 'none';

    if (roleBadge) {
        if (currentUser.role === 'faculty') {
            roleBadge.textContent = 'Faculty Member';
            roleBadge.className = 'profile-role-badge faculty';
        } else {
            roleBadge.textContent = 'Enrolled Student';
            roleBadge.className = 'profile-role-badge student';
        }
    }

    renderModalAvatarPreview();

    const fileInput = document.getElementById('profileModalPicInput');
    if (fileInput && !fileInput.dataset.bound) {
        fileInput.dataset.bound = 'true';
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                showToast('Image size must be less than 5MB', 'warning');
                fileInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const size = Math.min(img.width, img.height);
                    const targetSize = Math.min(size, 256);
                    canvas.width = targetSize;
                    canvas.height = targetSize;
                    const ctx = canvas.getContext('2d');
                    const sx = (img.width - size) / 2;
                    const sy = (img.height - size) / 2;
                    ctx.drawImage(img, sx, sy, size, size, 0, 0, targetSize, targetSize);
                    pendingProfileAvatar = canvas.toDataURL('image/jpeg', 0.88);
                    renderModalAvatarPreview();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    const modal = document.getElementById('profileSettingsModal');
    if (modal) modal.classList.add('active');
};

function renderModalAvatarPreview() {
    const circle = document.getElementById('profileModalAvatarCircle');
    const removeBtn = document.getElementById('profileModalRemovePicBtn');
    if (!circle) return;

    if (pendingProfileAvatar && pendingProfileAvatar.trim().length > 0) {
        circle.innerHTML = `<img src="${pendingProfileAvatar}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        if (removeBtn) removeBtn.style.display = 'inline-flex';
    } else {
        const initial = (currentUser ? (currentUser.firstName || currentUser.username || 'U') : 'U').charAt(0).toUpperCase();
        circle.innerHTML = `<span>${initial}</span>`;
        if (removeBtn) removeBtn.style.display = 'none';
    }
}

window.removeProfileModalPic = function () {
    pendingProfileAvatar = '';
    const fileInput = document.getElementById('profileModalPicInput');
    if (fileInput) fileInput.value = '';
    renderModalAvatarPreview();
};

window.promptConfirmProfileUpdate = function () {
    const fn = (document.getElementById('profileModalFirstName')?.value || '').trim();
    const ln = (document.getElementById('profileModalLastName')?.value || '').trim();
    const em = (document.getElementById('profileModalEmail')?.value || '').trim();
    const pwd = document.getElementById('profileModalPassword')?.value || '';
    const pwdConfirm = document.getElementById('profileModalConfirmPassword')?.value || '';
    const feedback = document.getElementById('profileModalFeedback');

    if (!fn || !ln || !em) {
        if (feedback) {
            feedback.textContent = 'Please fill in your first name, last name, and email address.';
            feedback.style.background = '#fef2f2';
            feedback.style.color = '#991b1b';
            feedback.style.border = '1px solid #fecaca';
            feedback.style.display = 'block';
        }
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(em)) {
        if (feedback) {
            feedback.textContent = 'Please enter a valid email address.';
            feedback.style.background = '#fef2f2';
            feedback.style.color = '#991b1b';
            feedback.style.border = '1px solid #fecaca';
            feedback.style.display = 'block';
        }
        return;
    }

    if (pwd || pwdConfirm) {
        if (pwd.length < 6) {
            if (feedback) {
                feedback.textContent = 'New password must be at least 6 characters.';
                feedback.style.background = '#fef2f2';
                feedback.style.color = '#991b1b';
                feedback.style.border = '1px solid #fecaca';
                feedback.style.display = 'block';
            }
            return;
        }
        if (pwd !== pwdConfirm) {
            if (feedback) {
                feedback.textContent = 'New passwords do not match. Please verify.';
                feedback.style.background = '#fef2f2';
                feedback.style.color = '#991b1b';
                feedback.style.border = '1px solid #fecaca';
                feedback.style.display = 'block';
            }
            return;
        }
    }

    if (feedback) feedback.style.display = 'none';

    // Populate Confirm Warning Modal
    const nameSummary = document.getElementById('confirmSummaryName');
    const emailSummary = document.getElementById('confirmSummaryEmail');
    const photoSummary = document.getElementById('confirmSummaryPhoto');
    const pwdSummary = document.getElementById('confirmSummaryPassword');

    if (nameSummary) nameSummary.textContent = `${fn} ${ln}`;
    if (emailSummary) emailSummary.textContent = em;

    if (photoSummary) {
        const currentPic = (currentUser ? currentUser.profilePic : '') || '';
        if (pendingProfileAvatar !== currentPic) {
            if (pendingProfileAvatar) {
                photoSummary.textContent = 'New Photo Selected';
                photoSummary.className = 'confirm-summary-badge updated';
            } else {
                photoSummary.textContent = 'Photo Removed';
                photoSummary.className = 'confirm-summary-badge removed';
            }
        } else {
            photoSummary.textContent = 'Unchanged';
            photoSummary.className = 'confirm-summary-badge';
        }
    }

    if (pwdSummary) {
        if (pwd) {
            pwdSummary.textContent = 'Will Be Updated';
            pwdSummary.className = 'confirm-summary-badge updated';
        } else {
            pwdSummary.textContent = 'Unchanged';
            pwdSummary.className = 'confirm-summary-badge';
        }
    }

    const confirmModal = document.getElementById('confirmProfileChangeModal');
    if (confirmModal) confirmModal.classList.add('active');
};

window.executeProfileUpdate = async function () {
    const fn = (document.getElementById('profileModalFirstName')?.value || '').trim();
    const ln = (document.getElementById('profileModalLastName')?.value || '').trim();
    const em = (document.getElementById('profileModalEmail')?.value || '').trim();
    const pwd = document.getElementById('profileModalPassword')?.value || '';

    const btn = document.getElementById('confirmSaveProfileBtn');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
            <svg class="spin-animation" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10"/>
            </svg>
            <span>Saving Updates...</span>
        `;
    }

    try {
        const payload = {
            firstName: fn,
            lastName: ln,
            email: em,
            profilePic: pendingProfileAvatar
        };
        if (pwd && pwd.length >= 6) {
            payload.password = pwd;
        }

        const res = await fetch(`${API_BASE}/api/auth/profile/${currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Failed to update profile');
        }

        currentUser = data.user;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

        const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username || 'User';
        const nameEl = document.getElementById('userName');
        if (nameEl) nameEl.textContent = fullName;

        const handleEl = document.getElementById('userHandle');
        if (handleEl) handleEl.textContent = currentUser.username ? `@${currentUser.username}` : '';

        renderUserAvatar(currentUser);

        const hour = new Date().getHours();
        let greetingText = 'Good morning';
        if (hour >= 12 && hour < 17) greetingText = 'Good afternoon';
        else if (hour >= 17) greetingText = 'Good evening';
        const greetingEl = document.getElementById('greeting');
        if (greetingEl) {
            greetingEl.textContent = `${greetingText}, ${currentUser.firstName || currentUser.username || 'User'}!`;
        }

        closeModal('confirmProfileChangeModal');
        closeModal('profileSettingsModal');

        showToast('Profile and picture updated successfully!', 'success');
    } catch (err) {
        console.error('Profile update error:', err);
        showToast(err.message || 'Error updating profile', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
};
