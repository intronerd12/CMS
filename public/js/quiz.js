/* ============================================
   QUIZ.JS - Google Classroom & MS Teams Style
   Quiz System, Anti-Cheating Taker,
   Dedicated Results Page & Official Grade Slip
   ============================================ */

(function () {
    // State
    let currentSubjectId = null;
    let currentSubject = null;
    let currentQuizzes = [];
    let currentStudentProgress = null;

    // Active Quiz Taking State
    let activeQuiz = null;
    let activeQuestions = [];
    let currentQuestionIndex = 0;
    let studentAnswers = {}; // { [questionId]: optionId }
    let quizTimerInterval = null;
    let timeRemainingSeconds = 0;
    let timeSpentSeconds = 0;

    // Active Quiz Builder State
    let builderQuestions = [];
    let editingQuizId = null;
    let builderTipTapEditors = [];

    function destroyBuilderTipTapEditors() {
        if (Array.isArray(builderTipTapEditors)) {
            builderTipTapEditors.forEach(ed => {
                try { if (ed && typeof ed.destroy === 'function') ed.destroy(); } catch (e) {}
            });
        }
        builderTipTapEditors = [];
    }

    // Helpers
    function getCurrentUser() {
        if (typeof currentUser !== 'undefined' && currentUser) return currentUser;
        const stored = sessionStorage.getItem('currentUser');
        if (stored) {
            try { return JSON.parse(stored); } catch (e) {}
        }
        return null;
    }

    function isFacultyUser() {
        const u = getCurrentUser();
        return u && u.role === 'faculty';
    }

    function showToast(msg, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    // ============================================
    // INITIALIZATION & EVENT LISTENERS
    // ============================================
    document.addEventListener('DOMContentLoaded', () => {
        initQuizEventListeners();
        const hash = (window.location.hash || '').replace('#', '');
        if (hash === 'matrix' && typeof window.loadMatrixPage === 'function') {
            window.loadMatrixPage();
        } else if (hash === 'scores' && typeof window.loadScoresPage === 'function') {
            window.loadScoresPage();
        } else if (hash === 'quizzes' && typeof window.loadQuizzesPage === 'function') {
            window.loadQuizzesPage();
        }
    });

    function initQuizEventListeners() {
        // Quizzes Subject Selector
        const quizSubSelect = document.getElementById('quizSubjectSelect');
        if (quizSubSelect) {
            quizSubSelect.addEventListener('change', (e) => {
                currentSubjectId = e.target.value;
                loadQuizzesForSubject(currentSubjectId);
            });
        }

        // Scores Subject Selector (Item 6)
        const scoresSubSelect = document.getElementById('scoresSubjectSelect');
        if (scoresSubSelect) {
            scoresSubSelect.addEventListener('change', (e) => {
                loadScoresForSubject(e.target.value);
            });
        }

        // Master Matrix Subject Selector (Item 8)
        const matrixSubSelect = document.getElementById('matrixSubjectSelect');
        if (matrixSubSelect) {
            matrixSubSelect.addEventListener('change', (e) => {
                currentSubjectId = e.target.value;
                loadMatrixForSubject(e.target.value);
            });
        }

        // Keyboard navigation for active quiz theater
        document.addEventListener('keydown', (e) => {
            const theater = document.getElementById('quizTheaterModal');
            if (theater && theater.classList.contains('active')) {
                if (e.key === 'ArrowRight' && currentQuestionIndex < activeQuestions.length - 1) {
                    goToQuestion(currentQuestionIndex + 1);
                } else if (e.key === 'ArrowLeft' && currentQuestionIndex > 0) {
                    goToQuestion(currentQuestionIndex - 1);
                }
            }
        });
    }

    // ============================================
    // LOAD QUIZZES PAGE
    // ============================================
    window.loadQuizzesPage = async function () {
        try {
            const user = getCurrentUser();
            if (!user) return;
            const isFaculty = isFacultyUser();

            // Fetch subjects (scoped to joined classes for students)
            const userParam = isFaculty ? `&facultyId=${encodeURIComponent(user.id || '')}` : `&studentId=${encodeURIComponent(user.id || '')}`;
            const res = await fetch(`/api/subjects?role=${encodeURIComponent(user.role || 'student')}${userParam}`, {
                headers: {
                    'x-user-role': user.role || 'student',
                    'x-user-id': user.id || ''
                }
            });
            const data = await res.json();
            const subjects = data.subjects || [];

            const quizSubSelect = document.getElementById('quizSubjectSelect');
            const facultyBar = document.getElementById('quizzesFacultyActions');
            if (facultyBar) {
                facultyBar.style.display = isFaculty ? 'flex' : 'none';
            }

            if (subjects.length === 0) {
                if (quizSubSelect) {
                    quizSubSelect.innerHTML = `<option value="">${isFaculty ? 'No Subjects Created' : 'No Classes Joined Yet'}</option>`;
                }
                const headerContainer = document.getElementById('classroomHeaderBanner');
                if (headerContainer) headerContainer.innerHTML = '';

                const grid = document.getElementById('quizzesGrid');
                if (grid) {
                    grid.innerHTML = isFaculty ? `
                        <div class="empty-state-full" style="grid-column: 1 / -1;">
                            <h3>No Subjects Available</h3>
                            <p>Create a course subject first before building topic quizzes.</p>
                        </div>` : `
                        <div class="empty-state-full class-enroll-needed-card" style="grid-column: 1 / -1;">
                            <div class="enroll-needed-icon icon-purple">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                            </div>
                            <h3>Join a Class to Access Quizzes</h3>
                            <p>
                                Enter the <strong>Class Join Code</strong> provided by your instructor to enroll in the classroom and unlock topic assessments.
                            </p>
                            <div class="inline-enroll-action-group">
                                <input type="text" id="quizzesInlineJoinInput" class="class-code-inline-input" placeholder="e.g. CMS315" maxlength="12" autocomplete="off" onkeydown="if(event.key==='Enter')window.handleQuizzesInlineJoin()">
                                <button type="button" class="btn btn-primary" onclick="window.handleQuizzesInlineJoin()">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span>Join Class</span>
                                </button>
                            </div>
                        </div>`;
                }
                return;
            }

            // Populate subject selector
            if (quizSubSelect) {
                quizSubSelect.innerHTML = subjects.map(s => `
                    <option value="${s.id}" ${s.id === currentSubjectId ? 'selected' : ''}>${s.code} - ${s.name}</option>
                `).join('');

                if (!currentSubjectId || !subjects.some(s => s.id === currentSubjectId)) {
                    currentSubjectId = subjects[0].id;
                }
                quizSubSelect.value = currentSubjectId;
            }

            await loadQuizzesForSubject(currentSubjectId);
        } catch (err) {
            console.error('Error loading quizzes page:', err);
            showToast('Failed to load quizzes', 'error');
        }
    };

    async function loadQuizzesForSubject(subjectId) {
        try {
            const user = getCurrentUser();
            const isFaculty = isFacultyUser();

            // Fetch subject details
            const subRes = await fetch(`/api/subjects/${subjectId}?role=${encodeURIComponent(user.role || 'student')}&studentId=${encodeURIComponent(user.id || '')}`, {
                headers: {
                    'x-user-role': user.role || 'student',
                    'x-user-id': user.id || ''
                }
            });
            if (!subRes.ok) {
                return;
            }
            const subData = await subRes.json();
            currentSubject = subData.subject;

            // If student, fetch sequential progression
            let progressData = null;
            if (!isFaculty && user.id) {
                const progRes = await fetch(`/api/subjects/${subjectId}/student-progress/${user.id}`);
                if (progRes.ok) {
                    progressData = await progRes.json();
                    currentStudentProgress = progressData;
                }
            }

            // Fetch quizzes
            const userParam = isFaculty ? `?facultyId=${encodeURIComponent(user.id || '')}` : `?studentId=${encodeURIComponent(user.id || '')}`;
            const quizzesRes = await fetch(`/api/subjects/${subjectId}/quizzes${userParam}`, {
                headers: {
                    'x-user-role': user.role || 'student',
                    'x-user-id': user.id || ''
                }
            });
            const quizzesData = await quizzesRes.json();
            currentQuizzes = quizzesData.quizzes || [];

            renderClassroomHeader(currentSubject, progressData);
            renderQuizzesList(currentSubject, currentQuizzes, progressData);
        } catch (err) {
            console.error('Error loading quizzes for subject:', err);
        }
    }

    function renderClassroomHeader(subject, progressData) {
        const headerContainer = document.getElementById('classroomHeaderBanner');
        if (!headerContainer || !subject) return;

        const isFaculty = isFacultyUser();
        let progressHtml = '';

        if (!isFaculty && progressData && progressData.progress) {
            const p = progressData.progress;
            progressHtml = `
                <div class="classroom-progress-card">
                    <div class="classroom-progress-header">
                        <span>Course Progression (Sequential Mastery)</span>
                        <span>${p.completedTopics} of ${p.totalTopics} Topics Passed (${p.percentage}%)</span>
                    </div>
                    <div class="classroom-progress-track">
                        <div class="classroom-progress-fill" style="width: ${p.percentage}%;"></div>
                    </div>
                    <div style="font-size: 0.75rem; color: rgba(255,255,255,0.85); margin-top: 0.4rem;">
                        ${p.percentage === 100 
                            ? 'Congratulations! You have mastered and unlocked all 14 curriculum topics.' 
                            : 'Pass each topic\'s quiz to unlock the next lesson in sequence.'}
                    </div>
                </div>`;
        } else if (isFaculty) {
            const joinCode = subject.joinCode || 'CMS315';
            const enrolledCount = Number(subject.enrolledCount || 0);
            progressHtml = `
                <div class="classroom-progress-card">
                    <div class="classroom-progress-header" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                        <span>Faculty Instructor Studio • ${subject.topics ? subject.topics.length : 14} Modules</span>
                        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                            <span style="background: rgba(255,255,255,0.18); padding: 0.25rem 0.65rem; border-radius: 6px; font-family: monospace; font-weight: 800; letter-spacing: 0.08em; border: 1px solid rgba(255,255,255,0.28);">
                                Class Code: ${escapeHtml(joinCode)}
                            </span>
                            <button type="button" class="btn btn-sm" style="background: rgba(255,255,255,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.3); padding: 0.2rem 0.55rem; font-size: 0.72rem;" onclick="window.copyClassJoinCode('${escapeHtml(joinCode)}')">
                                Copy Code
                            </button>
                            <button type="button" class="btn btn-sm" style="background: #fff; color: #1e293b; border: none; padding: 0.2rem 0.65rem; font-size: 0.72rem; font-weight: 700;" onclick="window.openClassRosterModal('${subject.id}')">
                                Class Roster (${enrolledCount})
                            </button>
                        </div>
                    </div>
                    <div style="font-size: 0.8125rem; color: rgba(255,255,255,0.92); margin-top: 0.35rem;">
                        Full CRUD enabled: Create, inspect, edit, and delete Topic Presentations (Slide Studio / .PPTX) and Assessments (Quiz Studio).
                    </div>
                </div>`;
        }

        headerContainer.innerHTML = `
            <div class="classroom-banner">
                <div class="classroom-banner-content">
                    <span class="classroom-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                        ${subject.code} • ${subject.term}
                    </span>
                    <h2 class="classroom-title">${subject.name}</h2>
                    <div class="classroom-meta">
                        <div class="classroom-meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            <span>${subject.year}</span>
                        </div>
                        <div class="classroom-meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                            </svg>
                            <span>${subject.topics ? subject.topics.length : 0} Curriculum Lessons</span>
                        </div>
                    </div>
                    ${progressHtml}
                </div>
            </div>`;
    }

    function renderQuizzesList(subject, quizzes, progressData) {
        const grid = document.getElementById('quizzesGrid');
        if (!grid) return;

        const isFaculty = isFacultyUser();
        const topics = subject.topics || [];

        if (topics.length === 0) {
            grid.innerHTML = `
                <div class="empty-state-full" style="grid-column: 1 / -1;">
                    <h3>No Topics Found</h3>
                    <p>Add curriculum topics first before creating quizzes.</p>
                </div>`;
            return;
        }

        grid.innerHTML = topics.map(topic => {
            let quiz = quizzes.find(q => q.topicId === topic.id);
            if (!quiz && topic.quiz) {
                quiz = topic.quiz;
            }
            if (!quiz && quizzes.length > 0) {
                quiz = quizzes.find(q => q.title && topic.title && (
                    q.title.toLowerCase().includes(topic.title.toLowerCase()) ||
                    topic.title.toLowerCase().includes(q.title.replace(/^Topic\s*\d+\s*Quiz:?\s*/i, '').trim().toLowerCase())
                ));
            }
            let topicProg = null;
            if (progressData && progressData.topics) {
                topicProg = progressData.topics.find(t => t.id === topic.id);
            }

            const isUnlocked = isFaculty ? true : (topicProg ? topicProg.isUnlocked : (topic.orderIndex === 1));
            const isPassed = topicProg ? topicProg.isPassed : false;
            const status = topicProg ? topicProg.status : (isUnlocked ? 'available' : 'locked');
            const bestScore = topicProg && topicProg.bestScorePercentage ? topicProg.bestScorePercentage : null;
            const lastAttempt = topicProg && topicProg.lastAttempt ? topicProg.lastAttempt : null;

            // Status Badge
            let badgeClass = 'status-locked';
            let badgeText = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align: -1px; margin-right: 3px;"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Locked';
            if (isFaculty) {
                if (quiz) {
                    badgeClass = 'status-passed';
                    badgeText = `Published (${quiz.questionCount || 10} Qs)`;
                } else {
                    badgeClass = 'status-locked';
                    badgeText = 'No Quiz Yet';
                }
            } else if (isPassed) {
                badgeClass = 'status-passed';
                badgeText = `✓ Passed (${bestScore}%)`;
            } else if (status === 'failed_retry') {
                const retakeAuthorized = Boolean(topicProg && topicProg.retakeAllowed);
                badgeClass = 'status-failed';
                badgeText = retakeAuthorized ? `Retry Allowed (${bestScore}%)` : `Retake Locked (${bestScore}%)`;
            } else if (isUnlocked) {
                badgeClass = 'status-available';
                badgeText = 'Ready to Take';
            }

            // Card classes
            const cardClasses = ['quiz-card'];
            if (!isUnlocked) cardClasses.push('locked');
            if (isPassed) cardClasses.push('passed');

            // Action buttons
            let actionsHtml = '';
            if (isFaculty) {
                if (quiz) {
                    actionsHtml = `
                        <button type="button" class="btn btn-secondary btn-sm" onclick="window.inspectQuizAnswerKey('${quiz.id}')" title="Read / View Questions & Answer Key">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                            <span>Answer Key</span>
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="window.previewQuiz('${quiz.id}')" title="Preview Student Quiz Taker">Preview</button>
                        <button type="button" class="btn btn-primary btn-sm" onclick="window.openEditQuizModal('${quiz.id}')" title="Update / Edit Quiz in Studio">Edit (${quiz.questionCount || 10} Qs)</button>
                        <button type="button" class="btn btn-danger btn-sm" onclick="window.deleteQuizConfirm('${quiz.id}')" title="Delete Quiz" style="padding: 0.4rem 0.6rem;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>`;
                } else {
                    actionsHtml = `
                        <button type="button" class="btn btn-primary btn-sm btn-full" onclick="window.openCreateQuizModal('${topic.id}')">
                            + Create Topic Quiz
                        </button>`;
                }
            } else {
                // Student Actions
                if (isPassed) {
                    const targetAttempt = (topicProg && topicProg.passedAttempt)
                        ? topicProg.passedAttempt
                        : ((topicProg && topicProg.bestAttempt) ? topicProg.bestAttempt : lastAttempt);
                    actionsHtml = `
                        <button type="button" class="btn-view-result" onclick="window.viewPastResult('${targetAttempt ? targetAttempt.id : ''}')" style="width: 100%; justify-content: center;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            View Result &amp; Certificate
                        </button>`;
                } else if (isUnlocked && quiz) {
                    const isRetry = status === 'failed_retry';
                    if (isRetry) {
                        const retakeAuthorized = Boolean(topicProg && topicProg.retakeAllowed);
                        if (retakeAuthorized) {
                            actionsHtml = `
                                <button type="button" class="btn-start-quiz btn-primary" onclick="window.startQuizAttempt('${quiz.id}')" style="background: #2563eb; color: #ffffff; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 700;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="1 4 1 10 7 10"/>
                                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                                    </svg>
                                    <span>▷ Retake Quiz (Authorized by Professor)</span>
                                </button>
                                <div style="font-size: 0.78rem; color: #065f46; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 0.45rem 0.65rem; margin-top: 0.5rem; line-height: 1.35; display: flex; align-items: flex-start; gap: 6px;">
                                    <span style="font-size: 0.85rem;">✓</span>
                                    <span>Your professor has authorized 1 retake for this quiz. Previous score: ${bestScore}%.</span>
                                </div>`;
                        } else {
                            actionsHtml = `
                                <button type="button" class="btn-start-quiz" onclick="window.showRetakeLockedNotice('${escapeHtml(quiz.title)}', ${bestScore})" style="background: #f8fafc; color: #94a3b8; border: 1.5px dashed #cbd5e1; cursor: pointer; width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 600;" title="Retake Locked: Ask permission from your professor">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2"/>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                    <span>🔒 Retake Locked (Permission Required)</span>
                                </button>
                                <div style="font-size: 0.78rem; color: #9a3412; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 0.45rem 0.65rem; margin-top: 0.5rem; line-height: 1.35; display: flex; align-items: flex-start; gap: 6px;">
                                    <span style="font-size: 0.85rem;">ℹ️</span>
                                    <span>Previous score was ${bestScore}% (passing mark: 75%). Quizzes can only be taken once by default. Please contact your professor to authorize a retake.</span>
                                </div>`;
                        }
                    } else {
                        actionsHtml = `
                            <button type="button" class="btn-start-quiz" onclick="window.startQuizAttempt('${quiz.id}')" style="width: 100%;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="5 3 19 12 5 21 5 3"/>
                                </svg>
                                <span>Start Quiz</span>
                            </button>`;
                    }
                } else if (isUnlocked && !quiz) {
                    actionsHtml = `<span style="font-size: 0.8125rem; color: var(--color-text-muted);">Quiz in preparation by faculty</span>`;
                } else {
                    // Locked
                    actionsHtml = `
                        <button type="button" class="btn-start-quiz" onclick="window.showTopicLockModal(${topic.orderIndex})" style="background: #f8fafc; color: #64748b; border: 1px solid #cbd5e1; cursor: pointer;" title="Locked: Pass Topic ${topic.orderIndex - 1} Quiz First">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            Locked (Pass Topic ${topic.orderIndex - 1} First)
                        </button>`;
                }
            }

            return `
                <div class="${cardClasses.join(' ')}" id="quizCard-${topic.id}">
                    <div>
                        <div class="quiz-card-header">
                            <span class="quiz-topic-num">Topic ${topic.orderIndex}</span>
                            <span class="quiz-status-badge ${badgeClass}">${badgeText}</span>
                        </div>
                        <h4 class="quiz-card-title">${quiz ? quiz.title : `Topic ${topic.orderIndex} Evaluation`}</h4>
                        <p class="quiz-card-desc">${topic.title}: ${topic.description || 'Comprehensive multiple choice assessment.'}</p>
                    </div>

                    <div>
                        <div class="quiz-meta-row">
                            <div class="quiz-meta-pill" title="Question Count">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                                </svg>
                                <span>${quiz ? (quiz.questionCount || 10) : 10} Questions</span>
                            </div>
                            <div class="quiz-meta-pill" title="Time Limit">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polyline points="12 6 12 12 16 14"/>
                                </svg>
                                <span>${quiz ? quiz.timeLimitMinutes : 10} mins</span>
                            </div>
                            <div class="quiz-meta-pill" title="Passing Score">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                    <polyline points="22 4 12 14.01 9 11.01"/>
                                </svg>
                                <span>Pass: ${quiz ? quiz.passingScorePercent : 75}%</span>
                            </div>
                        </div>

                        <div class="quiz-card-actions">
                            ${actionsHtml}
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    // ============================================
    // ANTI-CHEATING STUDENT QUIZ TAKER (THEATER)
    // ============================================
    window.startQuizAttempt = async function (quizId, isPreview = false) {
        if (!quizId) {
            showToast('No quiz available for this topic yet', 'warning');
            return;
        }

        try {
            const user = getCurrentUser();
            const userId = user ? user.id : '';
            const isFaculty = user && user.role === 'faculty';
            const previewFlag = (isPreview || isFaculty) ? '&preview=true' : '';

            // Fetch attempt with anti-cheating shuffled options and questions
            const res = await fetch(`/api/quizzes/${quizId}/take?studentId=${encodeURIComponent(userId)}${previewFlag}`);
            if (res.status === 403) {
                const data = await res.json();
                if (data.alreadyPassed) {
                    showToast(data.error || 'You have already passed this quiz assessment. Retakes are not permitted for passed quizzes.', 'info');
                    return;
                }
                if (data.retakeLocked) {
                    showToast(data.error || 'Retake locked by faculty. Quizzes can only be taken once by default.', 'warning');
                    if (typeof window.showRetakeLockedNoticeModal === 'function') {
                        window.showRetakeLockedNoticeModal(data.error);
                    }
                    return;
                }
                if (data.requiredTopicOrder) {
                    window.showTopicLockModal(data.requiredTopicOrder + 1);
                } else {
                    showToast(data.error || 'Access denied to this quiz', 'error');
                }
                return;
            }

            if (!res.ok) throw new Error('Failed to load quiz');
            const data = await res.json();

            activeQuiz = data.quiz;
            activeQuiz.isFacultyPreview = Boolean(isFaculty || isPreview || data.isFacultyPreview);
            activeQuestions = data.questions || [];
            currentQuestionIndex = 0;
            studentAnswers = {};
            timeSpentSeconds = 0;
            timeRemainingSeconds = (activeQuiz.timeLimitMinutes || 10) * 60;

            if (activeQuestions.length === 0) {
                showToast('Quiz contains no questions', 'warning');
                return;
            }

            if (data.retakeWarning) {
                showToast(`⚠️ ${data.retakeWarning}`, 'warning');
            }

            launchQuizTheater();
        } catch (err) {
            console.error('Start quiz attempt error:', err);
            showToast(err.message || 'Error starting quiz', 'error');
        }
    };

    // Faculty preview mode (Unrestricted access to all quizzes)
    window.previewQuiz = function (quizId) {
        window.startQuizAttempt(quizId, true);
    };

    function launchQuizTheater() {
        const modal = document.getElementById('quizTheaterModal');
        if (!modal) return;

        // Populate topbar
        document.getElementById('theaterQuizTitle').textContent = activeQuiz.title;
        if (activeQuiz.isFacultyPreview) {
            document.getElementById('theaterTopicTitle').innerHTML = `
                <span style="color: #b45309; font-weight: 700; background: #fef3c7; padding: 2px 8px; border-radius: 4px; border: 1px solid #fde68a;">👁️ Faculty Quiz Preview</span>
                <span style="margin-left: 6px;">Topic ${activeQuiz.topicOrderIndex}: ${activeQuiz.topicTitle} • Passing Threshold: ${activeQuiz.passingScorePercent}%</span>`;
        } else {
            document.getElementById('theaterTopicTitle').textContent = `Topic ${activeQuiz.topicOrderIndex}: ${activeQuiz.topicTitle} • Minimum Pass: ${activeQuiz.passingScorePercent}%`;
        }

        // Render question nav pills
        renderNavPills();

        // Render first question
        renderActiveQuestion(0);

        // Start timer
        startQuizTimer();

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function renderNavPills() {
        const container = document.getElementById('theaterNavPills');
        if (!container) return;

        container.innerHTML = activeQuestions.map((q, i) => {
            const isAnswered = studentAnswers[q.id] !== undefined;
            const isCurrent = i === currentQuestionIndex;
            const classes = ['nav-pill'];
            if (isCurrent) classes.push('current');
            if (isAnswered) classes.push('answered');

            return `<button type="button" class="${classes.join(' ')}" onclick="window.goToQuestion(${i})">${i + 1}</button>`;
        }).join('');
    }

    function renderActiveQuestion(index) {
        currentQuestionIndex = index;
        const q = activeQuestions[index];
        if (!q) return;

        document.getElementById('questionCounterLabel').textContent = `Question ${index + 1} of ${activeQuestions.length}`;
        const qBox = document.getElementById('questionTextBox');
        if (qBox) {
            if (q.questionText && q.questionText.includes('<')) {
                qBox.innerHTML = q.questionText;
                qBox.classList.add('tiptap-content');
            } else {
                qBox.textContent = q.questionText || '';
                qBox.classList.remove('tiptap-content');
            }
        }

        const optionsContainer = document.getElementById('theaterOptionsList');
        const selectedOptId = studentAnswers[q.id];

        // Options are already shuffled by backend
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
        optionsContainer.innerHTML = q.options.map((opt, i) => {
            const isSelected = selectedOptId === opt.id;
            return `
                <div class="theater-option-item ${isSelected ? 'selected' : ''}" onclick="window.selectQuizOption('${q.id}', '${opt.id}')">
                    <span class="option-badge-letter">${letters[i] || (i + 1)}</span>
                    <span class="option-text-label">${opt.text}</span>
                </div>`;
        }).join('');

        // Update Prev / Next buttons
        const prevBtn = document.getElementById('theaterPrevBtn');
        const nextBtn = document.getElementById('theaterNextBtn');
        const submitBtn = document.getElementById('theaterSubmitBtn');

        if (prevBtn) prevBtn.disabled = (index === 0);
        if (nextBtn) nextBtn.style.display = (index === activeQuestions.length - 1) ? 'none' : 'inline-flex';
        if (submitBtn) submitBtn.style.display = (index === activeQuestions.length - 1) ? 'inline-flex' : 'none';

        renderNavPills();
    }

    window.goToQuestion = function (index) {
        if (index >= 0 && index < activeQuestions.length) {
            renderActiveQuestion(index);
        }
    };

    window.selectQuizOption = function (questionId, optionId) {
        studentAnswers[questionId] = optionId;
        renderActiveQuestion(currentQuestionIndex);
    };

    window.theaterNextQuestion = function () {
        if (currentQuestionIndex < activeQuestions.length - 1) {
            renderActiveQuestion(currentQuestionIndex + 1);
        }
    };

    window.theaterPrevQuestion = function () {
        if (currentQuestionIndex > 0) {
            renderActiveQuestion(currentQuestionIndex - 1);
        }
    };

    function startQuizTimer() {
        clearInterval(quizTimerInterval);
        updateTimerDisplay();

        quizTimerInterval = setInterval(() => {
            timeRemainingSeconds--;
            timeSpentSeconds++;
            updateTimerDisplay();

            if (timeRemainingSeconds <= 0) {
                clearInterval(quizTimerInterval);
                showToast('Time expired! Submitting your quiz automatically...', 'warning');
                window.submitActiveQuiz(true);
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        const timerEl = document.getElementById('theaterTimer');
        const timerDigits = document.getElementById('theaterTimerDigits');
        if (!timerEl) return;

        const mins = Math.floor(Math.max(0, timeRemainingSeconds) / 60);
        const secs = Math.max(0, timeRemainingSeconds) % 60;
        const formatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

        if (timerDigits) {
            timerDigits.textContent = formatted;
        } else {
            timerEl.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span id="theaterTimerDigits">${formatted}</span>`;
        }

        if (timeRemainingSeconds <= 120) {
            timerEl.classList.add('urgent');
        } else {
            timerEl.classList.remove('urgent');
        }
    }

    window.promptExitQuizTheater = function () {
        const modal = document.getElementById('quizExitConfirmModal');
        if (modal) {
            modal.classList.add('active');
        } else {
            if (confirm('Are you sure you want to exit the quiz? Your answers will not be submitted.')) {
                window.closeQuizTheater();
            }
        }
    };

    window.closeExitConfirmModal = function () {
        const modal = document.getElementById('quizExitConfirmModal');
        if (modal) modal.classList.remove('active');
    };

    window.confirmExitQuizTheater = function () {
        window.closeExitConfirmModal();
        window.closeQuizTheater();
    };

    window.confirmSubmitQuiz = function () {
        const answeredCount = Object.keys(studentAnswers).length;
        const total = activeQuestions.length;
        const unanswered = total - answeredCount;

        const modal = document.getElementById('quizSubmitConfirmModal');
        const modalTitle = document.getElementById('quizSubmitModalTitle');
        const modalText = document.getElementById('quizSubmitModalText');
        const modalIcon = document.getElementById('quizSubmitModalIcon');

        if (modal && modalTitle && modalText) {
            if (unanswered > 0) {
                if (modalIcon) {
                    modalIcon.style.background = '#fef2f2';
                    modalIcon.style.borderColor = '#fee2e2';
                    modalIcon.style.color = '#dc2626';
                    modalIcon.innerHTML = `
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>`;
                }
                modalTitle.textContent = 'Unanswered Questions';
                modalText.innerHTML = `You have <strong style="color: #dc2626;">${unanswered} unanswered question${unanswered !== 1 ? 's' : ''}</strong> out of ${total}. Are you sure you want to finalize and submit? Unanswered items will receive 0 points.`;
            } else {
                if (modalIcon) {
                    modalIcon.style.background = '#ecfdf5';
                    modalIcon.style.borderColor = '#d1fae5';
                    modalIcon.style.color = '#059669';
                    modalIcon.innerHTML = `
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>`;
                }
                modalTitle.textContent = 'Submit Assessment?';
                modalText.textContent = `You have answered all ${total} questions. Are you ready to submit your test for official grading?`;
            }
            modal.classList.add('active');
        } else {
            if (unanswered > 0) {
                if (!confirm(`You have ${unanswered} unanswered question${unanswered !== 1 ? 's' : ''}. Are you sure you want to submit?`)) return;
            }
            window.submitActiveQuiz(false);
        }
    };

    window.closeSubmitConfirmModal = function () {
        const modal = document.getElementById('quizSubmitConfirmModal');
        if (modal) modal.classList.remove('active');
    };

    window.finalizeSubmitQuiz = function () {
        window.closeSubmitConfirmModal();
        window.submitActiveQuiz(false);
    };

    window.submitActiveQuiz = async function (force = false) {
        clearInterval(quizTimerInterval);
        const user = getCurrentUser();

        try {
            const submitBtn = document.getElementById('theaterSubmitBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting & Grading...';
            }

            const res = await fetch(`/api/quizzes/${activeQuiz.id}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: user ? user.id : 'anonymous',
                    answers: studentAnswers,
                    timeSpentSeconds
                })
            });

            if (!res.ok) throw new Error('Failed to submit quiz');
            const resultData = await res.json();

            // Close theater modal
            closeQuizTheater();

            // Navigate to dedicated Quiz Result Page!
            window.navigateTo('quiz-result');
            renderQuizResultPage(resultData);
        } catch (err) {
            console.error('Submit quiz error:', err);
            showToast(err.message || 'Error submitting quiz', 'error');
            const submitBtn = document.getElementById('theaterSubmitBtn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Quiz';
            }
        }
    };

    window.closeQuizTheater = function () {
        clearInterval(quizTimerInterval);
        const modal = document.getElementById('quizTheaterModal');
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
    };

    // ============================================
    // DEDICATED QUIZ RESULT PAGE
    // Requirement #5: Student can only proceed if passed
    // Result can be downloaded as official grade slip/certificate
    // ============================================

    window.loadQuizResultPage = function () {
        // If loaded directly without an active result, show placeholder or recent result
        const container = document.getElementById('quizResultContent');
        if (!container || container.innerHTML.trim() !== '') return;

        container.innerHTML = `
            <div class="empty-state-full">
                <h3>No Quiz Assessment Selected</h3>
                <p>Complete a topic quiz to view your official grade slip and progression status.</p>
                <button type="button" class="btn btn-primary" onclick="window.navigateTo('quizzes')">Go to Quizzes</button>
            </div>`;
    };

    window.viewPastResult = async function (scoreId) {
        if (!scoreId) {
            showToast('No score record found', 'warning');
            return;
        }

        try {
            const user = getCurrentUser();
            const res = await fetch(`/api/scores/${scoreId}`, {
                headers: {
                    'x-user-id': user ? user.id : '',
                    'x-user-role': user ? user.role : ''
                }
            });
            if (!res.ok) throw new Error('Failed to load score record');
            const data = await res.json();

            window.navigateTo('quiz-result');
            renderQuizResultPage({
                scoreId: data.score.id,
                score: data.score.score,
                totalQuestions: data.score.totalQuestions,
                percentage: data.score.percentage,
                passingScorePercent: data.score.passingScorePercent,
                passed: data.score.passed === 1,
                timeSpentSeconds: data.score.timeSpentSeconds,
                completedAt: data.score.completedAt,
                reviewDetails: data.score.answers,
                scoreRecord: data.score
            });
        } catch (err) {
            console.error('View past result error:', err);
            showToast('Failed to load quiz score', 'error');
        }
    };

    window.toggleRetakePermissionFromResults = async function (scoreId, allowRetake) {
        if (!scoreId) return;
        try {
            const user = getCurrentUser();
            const res = await fetch(`/api/scores/${scoreId}/retake-permission`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-role': user ? user.role : 'faculty',
                    'x-user-id': user ? user.id : ''
                },
                body: JSON.stringify({ allowRetake: Boolean(allowRetake) })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update retake permission');
            }

            const data = await res.json();
            showToast(allowRetake ? '✓ Retake permission granted to student' : '🔒 Retake permission revoked', 'success');

            // Update in rawFacultyScores cache
            if (typeof rawFacultyScores !== 'undefined' && Array.isArray(rawFacultyScores)) {
                const target = rawFacultyScores.find(item => item.id === scoreId);
                if (target) {
                    rawFacultyScores.forEach(item => {
                        if (item.quizId === target.quizId && item.studentId === target.studentId) {
                            item.retakeAllowed = allowRetake ? 1 : 0;
                        }
                    });
                }
            }

            // Dynamically refresh the view
            await window.viewPastResult(scoreId);
        } catch (err) {
            console.error('Error toggling retake from results:', err);
            showToast(err.message || 'Error updating retake permission', 'error');
        }
    };

    function renderQuizResultPage(result) {
        const container = document.getElementById('quizResultContent');
        if (!container) return;

        const isPassed = result.passed;
        const score = result.score;
        const total = result.totalQuestions;
        const percentage = result.percentage;
        const passReq = result.passingScorePercent;
        const user = getCurrentUser();
        const isFaculty = isFacultyUser();
        const scoreId = result.scoreId || (result.scoreRecord ? result.scoreRecord.id : '');
        const scoreRec = result.scoreRecord || null;

        // Determine if viewer is faculty reviewing a student's attempt
        const isFacultyReviewingStudent = isFaculty || (scoreRec && user && scoreRec.studentId && scoreRec.studentId !== user.id);

        let studentFullName = '';
        let studentEmail = '';
        let studentUsername = '';
        if (scoreRec) {
            studentFullName = `${scoreRec.firstName || ''} ${scoreRec.lastName || ''}`.trim() || scoreRec.username || 'Student';
            studentEmail = scoreRec.email || '';
            studentUsername = scoreRec.username || '';
        } else if (user) {
            studentFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Student';
            studentEmail = user.email || '';
            studentUsername = user.username || '';
        }

        // Time spent formatting
        const mins = Math.floor((result.timeSpentSeconds || 0) / 60);
        const secs = (result.timeSpentSeconds || 0) % 60;
        const timeText = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;

        // Date formatting
        let dateText = '';
        if (result.completedAt || (scoreRec && scoreRec.completedAt)) {
            const d = new Date(result.completedAt || scoreRec.completedAt);
            dateText = `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

        // Next topic info for students
        let nextTopicTitle = 'the next lesson';
        let nextTopicOrder = '';
        if (result.nextTopic) {
            nextTopicTitle = `Topic ${result.nextTopic.orderIndex}: ${result.nextTopic.title}`;
            nextTopicOrder = result.nextTopic.orderIndex;
        }

        // Retake status flag
        const isRetakeAllowed = Boolean(scoreRec ? (scoreRec.retakeAllowed === 1 || scoreRec.retakeAllowed === true) : (result.retakeAllowed === 1 || result.retakeAllowed === true));

        // Hero banner HTML
        let heroHtml = '';

        if (isFacultyReviewingStudent) {
            // ============================================
            // FACULTY REVIEW MODE: Inspecting Student Exam
            // ============================================
            if (isPassed) {
                heroHtml = `
                    <div class="result-hero-banner passed">
                        <span class="result-hero-badge passed">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                            STUDENT EVALUATION • PASSED (${percentage}%)
                        </span>
                        <h2 class="result-hero-title">Student Submission: ${escapeHtml(studentFullName)}</h2>
                        <p class="result-hero-subtitle">
                            Student Account: <strong>${escapeHtml(studentEmail || studentUsername)}</strong> (@${escapeHtml(studentUsername)}) &bull; Completed ${dateText ? dateText : 'Recently'}
                        </p>

                        <div class="result-notice-box passed" style="margin-top: 1rem;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 14 14"/>
                            </svg>
                            <div>
                                <strong>Mastery Requirement Met:</strong> <strong>${escapeHtml(studentFullName)}</strong> achieved <strong>${percentage}%</strong> (passing threshold: <strong>${passReq}%</strong>). The sequential topic gate for this lesson is unlocked.
                            </div>
                        </div>

                        <div class="result-stats-row">
                            <div class="result-stat-box">
                                <div class="result-stat-value success">${score} / ${total}</div>
                                <div class="result-stat-label">Correct Answers</div>
                            </div>
                            <div class="result-stat-box">
                                <div class="result-stat-value success">${percentage}%</div>
                                <div class="result-stat-label">Final Grade</div>
                            </div>
                            <div class="result-stat-box">
                                <div class="result-stat-value">${passReq}%</div>
                                <div class="result-stat-label">Passing Mark (${passReq}%)</div>
                            </div>
                            <div class="result-stat-box">
                                <div class="result-stat-value">${timeText}</div>
                                <div class="result-stat-label">Time Spent</div>
                            </div>
                        </div>

                        <div class="result-actions-row">
                            <button type="button" class="btn-proceed-topic" onclick="window.navigateTo('scores')" style="background: #1e293b; color: #fff;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="19" y1="12" x2="5" y2="12"/>
                                    <polyline points="12 19 5 12 12 5"/>
                                </svg>
                                <span>Return to Scores &amp; Gradebook</span>
                            </button>

                            <button type="button" class="btn-download-cert" onclick="window.openCertificateModal('${scoreId}')">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                    <polyline points="10 9 9 9 8 9"/>
                                </svg>
                                <span>Download Official Student Certificate</span>
                            </button>
                        </div>
                    </div>`;
            } else {
                heroHtml = `
                    <div class="result-hero-banner failed">
                        <span class="result-hero-badge failed">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            STUDENT EVALUATION • DID NOT PASS (${percentage}%)
                        </span>
                        <h2 class="result-hero-title">Student Submission: ${escapeHtml(studentFullName)}</h2>
                        <p class="result-hero-subtitle">
                            Student Account: <strong>${escapeHtml(studentEmail || studentUsername)}</strong> (@${escapeHtml(studentUsername)}) &bull; Attempt completed on ${dateText ? dateText : 'Recently'}
                        </p>

                        <div style="background: #fff5f5; border: 1.5px solid #fed7d7; border-left: 4px solid #e53e3e; border-radius: 8px; padding: 1rem 1.25rem; margin-top: 1rem; color: #9b2c2c; font-size: 0.875rem; line-height: 1.5;">
                            <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; margin-bottom: 0.25rem;">
                                <span>⚠️ Passing Threshold Not Met:</span>
                            </div>
                            <span><strong>${escapeHtml(studentFullName)}</strong> scored <strong>${percentage}%</strong> (passing threshold: <strong>${passReq}%</strong>). The sequential curriculum remains locked until this student attains a passing score. Review student answers below and decide whether to authorize a retake.</span>
                        </div>

                        <div class="result-stats-row">
                            <div class="result-stat-box">
                                <div class="result-stat-value danger">${score} / ${total}</div>
                                <div class="result-stat-label">Correct Answers</div>
                            </div>
                            <div class="result-stat-box">
                                <div class="result-stat-value danger">${percentage}%</div>
                                <div class="result-stat-label">Student Grade</div>
                            </div>
                            <div class="result-stat-box">
                                <div class="result-stat-value">${passReq}%</div>
                                <div class="result-stat-label">Passing Mark (${passReq}%)</div>
                            </div>
                            <div class="result-stat-box">
                                <div class="result-stat-value">${timeText}</div>
                                <div class="result-stat-label">Time Spent</div>
                            </div>
                        </div>

                        <!-- DEDICATED FACULTY RETAKE GOVERNANCE CARD -->
                        ${isRetakeAllowed ? `
                            <div class="faculty-retake-action-box" style="background: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 10px; padding: 1.15rem 1.35rem; margin-top: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                                <div style="flex: 1; min-width: 260px;">
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 0.35rem;">
                                        <span style="font-weight: 700; color: #065f46; font-size: 0.95rem;">Retake Authorization:</span>
                                        <span class="retake-status-pill allowed">
                                            <span class="pulse-indicator-green"></span>
                                            Retake Allowed
                                        </span>
                                    </div>
                                    <p style="margin: 0; font-size: 0.825rem; color: #047857; line-height: 1.45;">
                                        Permission is currently granted. <strong>${escapeHtml(studentFullName)}</strong> can retake this quiz from their student portal.
                                    </p>
                                </div>
                                <button type="button" class="btn-faculty-retake revoke" onclick="window.toggleRetakePermissionFromResults('${scoreId}', 0)" style="font-size: 0.85rem; padding: 0.55rem 1rem;">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                    <span>Don't Allow (Lock Retake)</span>
                                </button>
                            </div>
                        ` : `
                            <div class="faculty-retake-action-box" style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 1.15rem 1.35rem; margin-top: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                                <div style="flex: 1; min-width: 260px;">
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 0.35rem;">
                                        <span style="font-weight: 700; color: #1e3a8a; font-size: 0.95rem;">Retake Authorization:</span>
                                        <span class="retake-status-pill locked">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                            Retake Locked
                                        </span>
                                    </div>
                                    <p style="margin: 0; font-size: 0.825rem; color: #1e40af; line-height: 1.45;">
                                        <strong>${escapeHtml(studentFullName)}</strong>'s retake is locked. Quizzes are one-time assessments by default. Click Allow Retake to grant 1 retake opportunity.
                                    </p>
                                </div>
                                <button type="button" class="btn-faculty-retake grant" onclick="window.toggleRetakePermissionFromResults('${scoreId}', 1)" style="font-size: 0.85rem; padding: 0.55rem 1.15rem;">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                                    <span>Allow Student to Retake Quiz</span>
                                </button>
                            </div>
                        `}

                        <div class="result-actions-row">
                            <button type="button" class="btn-proceed-topic" onclick="window.navigateTo('scores')" style="background: #1e293b; color: #fff;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="19" y1="12" x2="5" y2="12"/>
                                    <polyline points="12 19 5 12 12 5"/>
                                </svg>
                                <span>Return to Scores &amp; Gradebook</span>
                            </button>

                            <button type="button" class="btn-download-cert" onclick="window.openCertificateModal('${scoreId}')">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                </svg>
                                <span>Download Grade Slip Record</span>
                            </button>
                        </div>
                    </div>`;
            }
        } else {
            // ============================================
            // STUDENT MODE: Viewing Own Quiz Results
            // ============================================
            if (isPassed) {
                heroHtml = `
                    <div class="result-hero-banner passed">
                        <span class="result-hero-badge passed">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                            ASSESSMENT PASSED • MASTERY ACHIEVED
                        </span>
                        <h2 class="result-hero-title">Congratulations, ${escapeHtml(user ? user.firstName : 'Student')}!</h2>
                        <p class="result-hero-subtitle">
                            Outstanding work! You scored <strong>${percentage}%</strong> (passing requirement: <strong>${passReq}%</strong>).
                        </p>

                        ${result.unlockedNextTopic ? `
                            <div class="result-notice-box passed">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;">
                                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                                </svg>
                                <div><strong>Topic Unlocked:</strong> <strong>${nextTopicTitle}</strong> has been successfully unlocked and is ready in your course classwork!</div>
                            </div>` : ''}

                        <div class="result-stats-row">
                            <div class="result-stat-box">
                                <div class="result-stat-value success">${score} / ${total}</div>
                                <div class="result-stat-label">Correct Answers</div>
                            </div>
                            <div class="result-stat-box">
                                <div class="result-stat-value success">${percentage}%</div>
                                <div class="result-stat-label">Final Grade</div>
                            </div>
                            <div class="result-stat-box">
                                <div class="result-stat-value">${passReq}%</div>
                                <div class="result-stat-label">Passing Mark (${passReq}%)</div>
                            </div>
                            <div class="result-stat-box">
                                <div class="result-stat-value">${timeText}</div>
                                <div class="result-stat-label">Time Spent</div>
                            </div>
                        </div>

                        <div class="result-actions-row">
                            ${result.unlockedNextTopic ? `
                                <button type="button" class="btn-proceed-topic" onclick="window.proceedToTopic('${result.nextTopic.id}')">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12"/>
                                        <polyline points="12 5 19 12 12 19"/>
                                    </svg>
                                    <span>Proceed to Topic ${nextTopicOrder}</span>
                                </button>` : `
                                <button type="button" class="btn-proceed-topic" onclick="window.navigateTo('topics')">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                                    </svg>
                                    <span>Back to Course Topics</span>
                                </button>`}

                            <button type="button" class="btn-download-cert" onclick="window.openCertificateModal('${scoreId}')">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                    <polyline points="10 9 9 9 8 9"/>
                                </svg>
                                <span>Download Official Result &amp; Certificate</span>
                            </button>
                        </div>
                    </div>`;
            } else {
                heroHtml = `
                    <div class="result-hero-banner failed">
                        <span class="result-hero-badge failed">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            ASSESSMENT NOT PASSED • RETAKE REQUIRED
                        </span>
                        <h2 class="result-hero-title">Cannot Proceed to Next Topic</h2>
                        <p class="result-hero-subtitle">
                            You scored <strong>${percentage}%</strong>. The required passing threshold is <strong>${passReq}%</strong>.
                        </p>

                        <div class="result-notice-box failed">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            <div>
                                <strong>Prerequisite Requirement:</strong> You cannot advance to the next topic until you achieve a passing grade of ${passReq}%. Please review the lecture presentation and ask your professor for retake permission.
                            </div>
                        </div>

                        <div class="result-stats-row">
                            <div class="result-stat-box">
                                <div class="result-stat-value danger">${score} / ${total}</div>
                                <div class="result-stat-label">Correct Answers</div>
                            </div>
                            <div class="result-stat-box">
                                <div class="result-stat-value danger">${percentage}%</div>
                                <div class="result-stat-label">Your Grade</div>
                            </div>
                            <div class="result-stat-box">
                                <div class="result-stat-value">${passReq}%</div>
                                <div class="result-stat-label">Passing Mark (${passReq}%)</div>
                            </div>
                            <div class="result-stat-box">
                                <div class="result-stat-value">${timeText}</div>
                                <div class="result-stat-label">Time Spent</div>
                            </div>
                        </div>

                        <div class="result-actions-row">
                            <button type="button" class="btn-repeat-topic" onclick="window.repeatTopicLesson('${result.topicId || (scoreRec ? scoreRec.topicId : '')}')">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                                </svg>
                                <span>Repeat Topic (Review Lessons &amp; Presentation)</span>
                            </button>

                            ${isRetakeAllowed ? `
                                <button type="button" class="btn-retake-quiz" onclick="window.startQuizAttempt('${activeQuiz ? activeQuiz.id : (scoreRec ? scoreRec.quizId : '')}')" style="background: #2563eb; color: #ffffff; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 700;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="1 4 1 10 7 10"/>
                                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                                    </svg>
                                    <span>▷ Retake Quiz (Authorized by Professor)</span>
                                </button>
                            ` : `
                                <button type="button" class="btn-retake-quiz" onclick="window.showRetakeLockedNoticeModal()" style="background: #f8fafc; color: #94a3b8; border: 1.5px dashed #cbd5e1; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 600;" title="Retake Locked: Ask permission from your professor">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2"/>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                    <span>🔒 Retake Locked (Permission Required)</span>
                                </button>
                            `}

                            <button type="button" class="btn-download-cert" onclick="window.openCertificateModal('${scoreId}')">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                </svg>
                                <span>Download Grade Slip Record</span>
                            </button>
                        </div>
                    </div>`;
            }
        }

        window.repeatTopicLesson = function (topicId) {
            if (topicId && typeof window.openTopicSlides === 'function') {
                window.openTopicSlides(topicId);
            } else {
                window.navigateTo('topics');
            }
        };

        // Detailed Question Review Breakdown
        let reviewHtml = '';
        if (Array.isArray(result.reviewDetails) && result.reviewDetails.length > 0) {
            const sectionTitle = isFacultyReviewingStudent ? 'Question by Question Review (Faculty Evaluation View)' : 'Question by Question Review';
            let badgeHtml = '';
            if (isFacultyReviewingStudent) {
                badgeHtml = `<span class="badge" style="font-size: 0.75rem; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-weight: 700; padding: 3px 8px; border-radius: 6px;">
                    👁 Faculty Answer Key &amp; Rationales Visible
                </span>`;
            } else {
                badgeHtml = `<span class="badge ${isPassed ? 'badge-success' : 'badge-warning'}" style="font-size: 0.75rem;">
                    ${isPassed ? '✓ Answer Key &amp; Rationales Available' : '🔒 Answer Key Protected'}
                </span>`;
            }

            let protectionNotice = '';
            if (!isFacultyReviewingStudent && !isPassed) {
                protectionNotice = `
                    <div class="review-protection-notice" style="background: #fffbeb; border: 1.5px solid #fde68a; border-left: 4px solid #f59e0b; padding: 1rem 1.25rem; border-radius: 8px; margin-bottom: 1.5rem; display: flex; align-items: flex-start; gap: 0.75rem;">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">
                            <rect x="3" y="11" width="18" height="11" rx="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        <div>
                            <strong style="color: #92400e; font-size: 0.95rem;">Answer Key &amp; Explanations Protected</strong>
                            <p style="margin: 0.25rem 0 0 0; font-size: 0.8125rem; color: #78350f; line-height: 1.45;">
                                Because you did not reach the passing threshold (${passReq}%), the correct answers and faculty explanations are hidden. Please review the lecture presentation and notes for this topic, and ask your professor for retake authorization.
                            </p>
                        </div>
                    </div>
                `;
            }

            reviewHtml = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                    <h3 class="review-section-title" style="margin: 0;">${sectionTitle}</h3>
                    ${badgeHtml}
                </div>

                ${protectionNotice}

                <div class="review-list">
                    ${result.reviewDetails.map((item, i) => {
                        const answerLabel = isFacultyReviewingStudent ? 'Student Answer:' : 'Your Answer:';
                        const canSeeCorrect = isFacultyReviewingStudent || isPassed;

                        return `
                            <div class="review-card ${item.isCorrect ? 'correct' : 'incorrect'}">
                                <div class="review-header">
                                    <span class="review-q-num">Question ${i + 1}</span>
                                    <span class="badge ${item.isCorrect ? 'badge-success' : 'badge-error'}">
                                        ${item.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                    </span>
                                </div>
                                <div class="review-q-text tiptap-content">${item.questionText || ''}</div>

                                <div class="review-answer-row review-student-answer ${item.isCorrect ? 'correct' : 'incorrect'}">
                                    <strong>${answerLabel}</strong> ${item.selectedText || '<em style="color:#94a3b8;">No answer submitted</em>'}
                                </div>

                                ${canSeeCorrect && !item.isCorrect && item.correctText ? `
                                    <div class="review-answer-row review-correct-answer">
                                        <strong>Correct Answer:</strong> ${item.correctText}
                                    </div>` : ''}

                                ${canSeeCorrect && item.explanation ? `
                                    <div class="review-explanation tiptap-content">
                                        <strong>Faculty Explanation:</strong> ${item.explanation}
                                    </div>` : ''}

                                ${!canSeeCorrect && !item.isCorrect ? `
                                    <div style="font-size: 0.75rem; color: #94a3b8; font-style: italic; margin-top: 0.35rem; display: flex; align-items: center; gap: 4px;">
                                        <span>🔒</span>
                                        <span>Correct answer hidden until assessment is passed.</span>
                                    </div>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>`;
        }

        container.innerHTML = `
            ${heroHtml}
            ${reviewHtml}`;
    }

    window.proceedToTopic = function (topicId) {
        window.navigateTo('topics');
        if (typeof window.selectTopicById === 'function') {
            window.selectTopicById(topicId);
        }
    };

    // ============================================
    // SHARED ACADEMIC GRAPHICS & SVGS
    // For Certificate Modal & High-Fidelity PDF Generation
    // ============================================
    const SHARED_ACADEMIC_CREST_SVG = `<svg width="56" height="56" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M60 110 C35 110 18 90 18 60 C18 40 28 24 38 16 C36 28 42 42 50 48 C42 36 44 22 52 14 C48 26 56 38 60 40 C64 38 72 26 68 14 C76 22 78 36 70 48 C78 42 84 28 82 16 C92 24 102 40 102 60 C102 90 85 110 60 110Z" fill="#d4af37" opacity="0.85"/>
        <path d="M60 22 C78 22 90 28 90 42 C90 74 60 96 60 96 C60 96 30 74 30 42 C30 28 42 22 60 22Z" fill="#0f2347" stroke="#d4af37" stroke-width="3"/>
        <path d="M60 26 C75 26 86 31 86 43 C86 71 60 90 60 90 C60 90 34 71 34 43 C34 31 45 26 60 26Z" fill="#0b1a30"/>
        <path d="M45 58 C52 55 58 56 60 58 C62 56 68 55 75 58 V72 C68 69 62 70 60 72 C58 70 52 69 45 72 V58Z" fill="#d4af37"/>
        <line x1="60" y1="58" x2="60" y2="72" stroke="#0b1a30" stroke-width="1.5"/>
        <path d="M60 36 C57 41 55 45 57 49 C58 51 60 52 60 52 C60 52 62 51 63 49 C65 45 63 41 60 36Z" fill="#f59e0b"/>
        <circle cx="60" cy="48" r="2" fill="#ef4444"/>
        <polygon points="45,42 46.5,45.5 50,45.5 47,47.5 48.5,51 45,49 41.5,51 43,47.5 40,45.5 43.5,45.5" fill="#d4af37"/>
        <polygon points="75,42 76.5,45.5 80,45.5 77,47.5 78.5,51 75,49 71.5,51 73,47.5 70,45.5 73.5,45.5" fill="#d4af37"/>
    </svg>`;

    const SHARED_GOLD_SEAL_SVG = `<svg class="cert-gold-seal" viewBox="0 0 100 115" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M38 68 L24 108 L38 98 L52 108 L44 68 Z" fill="#991b1b" stroke="#f59e0b" stroke-width="1.2"/>
        <path d="M62 68 L50 108 L64 98 L78 108 L70 68 Z" fill="#7f1d1d" stroke="#f59e0b" stroke-width="1.2"/>
        <circle cx="50" cy="46" r="42" fill="#d4af37"/>
        <circle cx="50" cy="46" r="38" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3 2"/>
        <circle cx="50" cy="46" r="34" fill="#0f2347" stroke="#f59e0b" stroke-width="2"/>
        <polygon points="50,37 52.5,42 58,42.5 54,46 55,51.5 50,49 45,51.5 46,46 42,42.5 47.5,42" fill="#fef08a"/>
        <text x="50" y="58" font-size="5" font-weight="700" fill="#ffffff" text-anchor="middle" font-family="'Inter', sans-serif" letter-spacing="0.6">VERIFIED</text>
    </svg>`;

    const SHARED_INSTRUCTOR_SIGN_SVG = `<svg width="140" height="36" viewBox="0 0 180 50" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 35 C20 15 30 10 38 25 C45 38 48 40 55 22 C60 12 70 18 78 30 C85 40 92 20 105 25 C118 30 130 18 145 22 C155 25 168 15 172 20" stroke="#0f2347" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M25 40 C60 38 120 37 165 35" stroke="#0f2347" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M42 12 C35 25 32 38 35 44" stroke="#0f2347" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;

    const SHARED_DEAN_SIGN_SVG = `<svg width="140" height="36" viewBox="0 0 180 50" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 42 C15 20 25 12 40 18 C52 24 55 38 48 44 C42 48 38 38 60 24 C80 12 95 28 110 32 C125 36 138 22 150 25 C162 28 170 18 175 22" stroke="#0f2347" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M30 26 C75 24 135 26 168 28" stroke="#0f2347" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M115 14 C112 28 116 38 122 42" stroke="#0f2347" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`;

    // ============================================
    // OFFICIAL PRINTABLE GRADE SLIP & CERTIFICATE
    // Requirement #5: Result can be downloaded
    // ============================================
    window.openCertificateModal = async function (scoreId) {
        if (!scoreId) {
            showToast('Score record not found', 'warning');
            return;
        }

        try {
            const res = await fetch(`/api/scores/${scoreId}`);
            if (!res.ok) throw new Error('Score not found');
            const data = await res.json();
            const s = data.score;

            const modal = document.getElementById('certificateModal');
            const certBox = document.getElementById('printableCertificate');
            if (!modal || !certBox) return;

            const studentFullName = `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.username || 'Honored Student';
            const dateStr = new Date(s.completedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const certCode = `CERT-CMS-${s.id.substring(0, 8).toUpperCase()}`;
            const isPassed = !!s.passed;

            // Set metadata attributes for PDF naming
            certBox.setAttribute('data-student-name', studentFullName.replace(/[^a-zA-Z0-9]/g, '_'));
            certBox.setAttribute('data-topic-title', (s.topicTitle || 'Assessment').replace(/[^a-zA-Z0-9]/g, '_'));
            certBox.setAttribute('data-topic-index', s.topicOrderIndex || '1');

            const cornerSvg = `<svg class="cert-corner" viewBox="0 0 60 60" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4 h36 c-2 8 -8 14 -16 16 c-8 2 -14 8 -16 16 v-32 z" opacity="0.2"/>
                <path d="M4 4 h52 v4 h-48 v48 h-4 z"/>
                <path d="M12 12 h36 v2 h-34 v34 h-2 z" opacity="0.6"/>
                <circle cx="20" cy="20" r="3"/>
                <path d="M20 20 Q35 22 38 38" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>`;

            const academicCrestSvg = SHARED_ACADEMIC_CREST_SVG;
            const goldSealSvg = SHARED_GOLD_SEAL_SVG;
            const instructorSignSvg = SHARED_INSTRUCTOR_SIGN_SVG;
            const deanSignSvg = SHARED_DEAN_SIGN_SVG;

            certBox.innerHTML = `
                <div class="cert-outer-frame">
                    <div class="cert-inner-frame">
                        <!-- Corner Filigrees -->
                        <div class="cert-corner top-left">${cornerSvg}</div>
                        <div class="cert-corner top-right">${cornerSvg}</div>
                        <div class="cert-corner bottom-left">${cornerSvg}</div>
                        <div class="cert-corner bottom-right">${cornerSvg}</div>

                        <!-- Faint Security Watermark Background -->
                        <div class="cert-watermark-bg">${academicCrestSvg}</div>

                        <div class="cert-content-layer">
                            <!-- Academic Header & Crest -->
                            <div class="cert-crest-wrap">${academicCrestSvg}</div>
                            <div class="cert-institution-name">COLLEGE OF COMPUTER STUDIES &amp; INFORMATION TECHNOLOGY</div>
                            <div class="cert-institution-sub">CMS LEARNING MANAGEMENT SYSTEM • CURRICULUM ACCREDITATION</div>

                            <div class="cert-main-title ${isPassed ? '' : 'status-failed'}">
                                ${isPassed ? 'Certificate of Academic Excellence &amp; Grade Slip' : 'Official Academic Assessment Grade Slip'}
                            </div>

                            <div class="cert-divider">
                                <div class="cert-divider-line"></div>
                                <div class="cert-divider-diamond">◆</div>
                                <div class="cert-divider-line"></div>
                            </div>

                            <!-- Presentation & Recipient -->
                            <div class="cert-presentation-text">
                                ${isPassed ? 'THIS CREDENTIAL OF DISTINCTION IS PROUDLY CONFERRED UPON' : 'OFFICIAL EXAMINATION TRANSCRIPT RECORDED FOR'}
                            </div>
                            <div class="cert-recipient-name">${studentFullName}</div>
                            <div class="cert-recipient-bar"></div>
                            <div class="cert-recipient-id">Student ID / Email: ${s.email || s.username || 'student@domain.edu'} ${s.username ? '(' + s.username + ')' : ''}</div>

                            <!-- Narrative Statement -->
                            <div class="cert-body-text">
                                ${isPassed 
                                    ? 'for demonstrating distinguished scholastic diligence, conceptual understanding, and verified subject-matter mastery in the formal curriculum assessment for:' 
                                    : 'for completing the scheduled competency assessment evaluation in the curriculum syllabus for:'}
                            </div>

                            <!-- Topic & Course Card -->
                            <div class="cert-topic-card ${isPassed ? '' : 'failed-card'}">
                                <div>
                                    <div class="cert-topic-title">Topic ${s.topicOrderIndex || '1'}: ${s.topicTitle || 'Curriculum Assessment'}</div>
                                    <div class="cert-course-name">Course: Content Management Systems (IT 315) • ${s.quizTitle || 'Assessment Module'}</div>
                                </div>
                                <div>
                                    <span class="cert-status-badge ${isPassed ? 'passed' : 'failed'}">
                                        ${isPassed ? '★ Mastered / Passed (' + s.percentage + '%)' : '⚠ Requires Retake (' + s.percentage + '%)'}
                                    </span>
                                </div>
                            </div>

                            <!-- Metrics Row (4 Columns for complete Grade Slip information) -->
                            <div class="cert-metrics-row">
                                <div class="cert-metric-box">
                                    <div class="cert-metric-label">Raw Score</div>
                                    <div class="cert-metric-val">${s.score} / ${s.totalQuestions} Qs</div>
                                </div>
                                <div class="cert-metric-box">
                                    <div class="cert-metric-label">Final Grade</div>
                                    <div class="cert-metric-val" style="color: ${isPassed ? '#059669' : '#dc2626'}">${s.percentage}%</div>
                                </div>
                                <div class="cert-metric-box">
                                    <div class="cert-metric-label">Passing Standard</div>
                                    <div class="cert-metric-val">${s.passingScorePercent || 75}% Required</div>
                                </div>
                                <div class="cert-metric-box">
                                    <div class="cert-metric-label">Date Conferred</div>
                                    <div class="cert-metric-val" style="font-size: 0.85rem; padding-top: 0.12rem;">${dateStr}</div>
                                </div>
                            </div>

                            <!-- Footer Signatures & Official 3D Seal -->
                            <div class="cert-footer-grid">
                                <div class="cert-sign-col">
                                    <div class="cert-sign-svg">${instructorSignSvg}</div>
                                    <div class="cert-sign-rule"></div>
                                    <div class="cert-signer-name">Prof. Maria Santos</div>
                                    <div class="cert-signer-role">Lead Course Faculty Instructor</div>
                                </div>

                                <div class="cert-seal-wrap">
                                    ${goldSealSvg}
                                    <div class="cert-seal-code">ID: ${certCode}</div>
                                </div>

                                <div class="cert-sign-col">
                                    <div class="cert-sign-svg">${deanSignSvg}</div>
                                    <div class="cert-sign-rule"></div>
                                    <div class="cert-signer-name">Dr. Robert Taylor</div>
                                    <div class="cert-signer-role">Dean, College of Computer Studies</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;

            modal.classList.add('active');
        } catch (err) {
            console.error('Certificate error:', err);
            showToast('Failed to generate certificate', 'error');
        }
    };

    window.downloadCertificatePdf = async function () {
        const certBox = document.getElementById('printableCertificate');
        if (!certBox) {
            showToast('Certificate element not found', 'error');
            return;
        }

        const downloadBtn = document.getElementById('certDownloadPdfBtn');
        const origHtml = downloadBtn ? downloadBtn.innerHTML : '';
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = `
                <svg class="spin-animation" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10"/>
                </svg>
                <span>Generating PDF...</span>`;
        }

        try {
            const student = certBox.getAttribute('data-student-name') || 'Student';
            const topic = certBox.getAttribute('data-topic-title') || 'Assessment';
            const topicIdx = certBox.getAttribute('data-topic-index') || '1';
            const filename = `CMS-GradeSlip-${student}-Topic${topicIdx}_${topic}.pdf`;

            if (typeof window.html2pdf !== 'function') {
                console.warn('html2pdf library not found, falling back to window.print');
                window.print();
                return;
            }

            const opt = {
                margin: [4, 4, 4, 4],
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    letterRendering: true,
                    backgroundColor: '#ffffff',
                    scrollY: 0,
                    scrollX: 0
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'landscape'
                },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            await window.html2pdf().set(opt).from(certBox).save();
            showToast('Grade Slip PDF downloaded successfully!', 'success');
        } catch (err) {
            console.error('Failed to export PDF:', err);
            showToast('PDF export issue, opening print dialog...', 'warning');
            window.print();
        } finally {
            if (downloadBtn) {
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = origHtml;
            }
        }
    };

    window.printOfficialCertificate = function () {
        window.print();
    };

    window.downloadGradeSlipDirectly = async function (scoreId, btnElement) {
        if (!scoreId) {
            showToast('Assessment record ID is required', 'warning');
            return;
        }

        const origHtml = btnElement ? btnElement.innerHTML : '';
        if (btnElement) {
            btnElement.disabled = true;
            btnElement.innerHTML = `
                <svg class="spin-animation" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10"/>
                </svg>
                <span>Downloading...</span>`;
        }

        try {
            await window.openCertificateModal(scoreId);
            await window.downloadCertificatePdf();
        } catch (err) {
            console.error('Direct Grade Slip download error:', err);
            showToast('Could not download grade slip directly', 'error');
        } finally {
            if (btnElement) {
                btnElement.disabled = false;
                btnElement.innerHTML = origHtml;
            }
        }
    };

    // ============================================
    // SCORES & SUMMARY PAGE / GRADEBOOK
    // ============================================
    window.loadScoresPage = async function () {
        const user = getCurrentUser();
        if (!user) return;

        const isFaculty = isFacultyUser();
        const container = document.getElementById('scoresContent');
        if (!container) return;

        // Populate subject dropdown for scores
        try {
            const subRes = await fetch(`/api/subjects?role=${encodeURIComponent(user.role || 'student')}&studentId=${encodeURIComponent(user.id || '')}`, {
                headers: {
                    'x-user-role': user.role || 'student',
                    'x-user-id': user.id || ''
                }
            });
            const subData = await subRes.json();
            const subjects = subData.subjects || [];

            const selectEl = document.getElementById('scoresSubjectSelect');
            if (subjects.length === 0) {
                if (selectEl) {
                    selectEl.innerHTML = `<option value="">${isFaculty ? 'No Subjects Created' : 'No Classes Joined Yet'}</option>`;
                }
                if (!isFaculty) {
                    container.innerHTML = `
                        <div class="empty-state-full class-enroll-needed-card">
                            <div class="enroll-needed-icon">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                            </div>
                            <h3>Join a Class to View Your Scores</h3>
                            <p>
                                Enter your instructor's <strong>Class Join Code</strong> to enroll in a class and view your quiz transcript and grade reports.
                            </p>
                            <div class="inline-enroll-action-group">
                                <input type="text" id="scoresInlineJoinInput" class="class-code-inline-input" placeholder="e.g. CMS315" maxlength="12" autocomplete="off" onkeydown="if(event.key==='Enter')window.handleScoresInlineJoin()">
                                <button type="button" class="btn btn-primary" onclick="window.handleScoresInlineJoin()">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span>Join Class</span>
                                </button>
                            </div>
                        </div>`;
                    return;
                }
            }

            if (selectEl && subjects.length > 0) {
                selectEl.innerHTML = subjects.map(s => `
                    <option value="${s.id}" ${s.id === currentSubjectId ? 'selected' : ''}>${s.code} - ${s.name}</option>
                `).join('');
                if (!currentSubjectId || !subjects.some(s => s.id === currentSubjectId)) {
                    currentSubjectId = subjects[0].id;
                }
                selectEl.value = currentSubjectId;
            }

            await loadScoresForSubject(currentSubjectId);
        } catch (err) {
            console.error('Error loading scores:', err);
        }
    };

    window.handleScoresInlineJoin = async function () {
        const inp = document.getElementById('scoresInlineJoinInput');
        const code = inp ? inp.value.trim() : '';
        if (typeof window.performJoinClassByCode === 'function') {
            await window.performJoinClassByCode(code, null);
        }
    };

    window.handleMatrixInlineJoin = async function () {
        const inp = document.getElementById('matrixInlineJoinInput');
        const code = inp ? inp.value.trim() : '';
        if (typeof window.performJoinClassByCode === 'function') {
            await window.performJoinClassByCode(code, null);
        }
    };

    window.handleQuizzesInlineJoin = async function () {
        const inp = document.getElementById('quizzesInlineJoinInput');
        const code = inp ? inp.value.trim() : '';
        if (typeof window.performJoinClassByCode === 'function') {
            await window.performJoinClassByCode(code, null);
        }
    };

    // State for Scores, Sorting, Matrix, Exports
    let rawFacultyScores = [];
    let rawFacultyMatrix = null;
    let scoresCurrentTab = 'topic-summary'; // 'topic-summary' (Item 6) | 'master-matrix' (Item 8)
    let summaryTopicFilter = 'all';
    let summaryVerdictFilter = 'all';
    let summarySort = 'surname-asc';
    let summarySearch = '';
    let matrixSort = 'surname-asc';
    let matrixSearch = '';
    let rawStudentScores = [];

    async function loadScoresForSubject(subjectId) {
        const user = getCurrentUser();
        const isFaculty = isFacultyUser();
        const container = document.getElementById('scoresContent');
        if (!container) return;

        if (isFaculty) {
            try {
                // Fetch both Gradebook (Item 6) and Master Matrix (Item 8)
                const [gbRes, matRes] = await Promise.all([
                    fetch(`/api/subjects/${subjectId}/gradebook`),
                    fetch(`/api/subjects/${subjectId}/matrix`)
                ]);

                const gbData = await gbRes.json();
                const matData = await matRes.json();

                rawFacultyScores = gbData.scores || [];
                rawFacultyMatrix = matData || { topics: [], matrix: [] };

                renderFacultyScoresUI();
            } catch (err) {
                console.error('Error loading gradebook:', err);
                showToast('Failed to load class assessment records', 'error');
            }
        } else {
            // Student Assessment Transcript
            try {
                const res = await fetch(`/api/scores/student/${user.id}`);
                const data = await res.json();
                rawStudentScores = data.scores || [];
                renderStudentScoresUI();
            } catch (err) {
                console.error('Error loading student scores:', err);
                showToast('Failed to load assessment transcript', 'error');
            }
        }
    }

    // ============================================
    // FACULTY UI: TABS, SORTING, PRINT & EXPORTS
    // ============================================

    function renderFacultyScoresUI() {
        const container = document.getElementById('scoresContent');
        if (!container) return;

        container.innerHTML = `
            <!-- Tabs Bar -->
            <div class="scores-tabs-bar">
                <button type="button" class="scores-tab-btn ${scoresCurrentTab === 'topic-summary' ? 'active' : ''}" onclick="window.switchScoresTab('topic-summary')">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    <span>Topic Assessment Records</span>
                </button>
                <button type="button" class="scores-tab-btn ${scoresCurrentTab === 'master-matrix' ? 'active' : ''}" onclick="window.switchScoresTab('master-matrix')">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                    <span>Cumulative Master Matrix</span>
                </button>
            </div>

            <!-- Active Tab Content -->
            <div id="scoresActiveTabContent">
                ${scoresCurrentTab === 'topic-summary' ? renderTopicSummaryHtml() : renderMasterMatrixHtml()}
            </div>
        `;
    }

    window.switchScoresTab = function (tabName) {
        scoresCurrentTab = tabName;
        renderFacultyScoresUI();
    };

    window.toggleRetakePermission = async function (scoreId, allowRetake) {
        try {
            const user = getCurrentUser();
            const res = await fetch(`/api/scores/${scoreId}/retake-permission`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-role': user ? user.role : 'faculty',
                    'x-user-id': user ? user.id : ''
                },
                body: JSON.stringify({ allowRetake })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update retake permission');
            }

            const data = await res.json();
            showToast(allowRetake ? '✓ Retake permission granted to student' : '🔒 Retake permission revoked', 'success');

            // Update in rawFacultyScores cache and re-render
            if (typeof rawFacultyScores !== 'undefined' && Array.isArray(rawFacultyScores)) {
                const target = rawFacultyScores.find(item => item.id === scoreId);
                if (target) {
                    rawFacultyScores.forEach(item => {
                        if (item.quizId === target.quizId && item.studentId === target.studentId) {
                            item.retakeAllowed = allowRetake ? 1 : 0;
                        }
                    });
                }
            }
            updateActiveTabContent();
        } catch (err) {
            console.error('Error toggling retake permission:', err);
            showToast(err.message, 'error');
        }
    };

    // Filter & Sort handlers for Item 6
    window.setSummarySearch = function (val) {
        summarySearch = (val || '').toLowerCase().trim();
        updateActiveTabContent();
    };

    window.setSummaryTopicFilter = function (val) {
        summaryTopicFilter = val;
        updateActiveTabContent();
    };

    window.setSummaryVerdictFilter = function (val) {
        summaryVerdictFilter = val;
        updateActiveTabContent();
    };

    window.setSummarySort = function (val) {
        summarySort = val;
        updateActiveTabContent();
    };

    // Filter & Sort handlers for Item 8
    window.setMatrixSearch = function (val) {
        matrixSearch = (val || '').toLowerCase().trim();
        updateActiveTabContent();
    };

    window.setMatrixSort = function (val) {
        matrixSort = val;
        updateActiveTabContent();
    };

    function updateActiveTabContent() {
        const activeEl = document.activeElement;
        const activeId = activeEl && activeEl.id ? activeEl.id : null;
        const selStart = activeEl && typeof activeEl.selectionStart === 'number' ? activeEl.selectionStart : null;
        const selEnd = activeEl && typeof activeEl.selectionEnd === 'number' ? activeEl.selectionEnd : null;

        const tabBox = document.getElementById('scoresActiveTabContent');
        if (tabBox) {
            tabBox.innerHTML = scoresCurrentTab === 'topic-summary' ? renderTopicSummaryHtml() : renderMasterMatrixHtml();
        }
        const matrixPageBox = document.getElementById('matrixPageContent');
        if (matrixPageBox) {
            if (isFacultyUser()) {
                renderMasterMatrixPageUI();
            }
        }

        if (activeId) {
            const nextEl = document.getElementById(activeId);
            if (nextEl) {
                nextEl.focus();
                if (selStart !== null && typeof nextEl.setSelectionRange === 'function') {
                    nextEl.setSelectionRange(selStart, selEnd !== null ? selEnd : selStart);
                }
            }
        }
    }

    // ============================================
    // WHITEBOARD ITEM #6: TOPIC ASSESSMENT SUMMARY
    // Sorted by Surname, by Score; Print, PDF, Spreadsheet
    // ============================================

    function getFilteredAndSortedTopicScores() {
        let list = [...rawFacultyScores];

        // Filter by topic
        if (summaryTopicFilter !== 'all') {
            const orderNum = Number(summaryTopicFilter);
            list = list.filter(s => s.topicOrderIndex === orderNum || s.topicId === summaryTopicFilter);
        }

        // Filter by verdict
        if (summaryVerdictFilter === 'passed') {
            list = list.filter(s => s.passed === 1);
        } else if (summaryVerdictFilter === 'failed') {
            list = list.filter(s => s.passed === 0);
        }

        // Search term
        if (summarySearch) {
            list = list.filter(s => 
                (s.lastName || '').toLowerCase().includes(summarySearch) ||
                (s.firstName || '').toLowerCase().includes(summarySearch) ||
                (s.username || '').toLowerCase().includes(summarySearch) ||
                (s.email || '').toLowerCase().includes(summarySearch) ||
                (s.topicTitle || '').toLowerCase().includes(summarySearch)
            );
        }

        // Sorting: by surname, by score, by date
        list.sort((a, b) => {
            const surA = (a.lastName || '').toLowerCase();
            const surB = (b.lastName || '').toLowerCase();
            const firstA = (a.firstName || '').toLowerCase();
            const firstB = (b.firstName || '').toLowerCase();

            switch (summarySort) {
                case 'surname-asc':
                    return surA.localeCompare(surB) || firstA.localeCompare(firstB);
                case 'surname-desc':
                    return surB.localeCompare(surA) || firstB.localeCompare(firstA);
                case 'score-desc':
                    return b.percentage - a.percentage || surA.localeCompare(surB);
                case 'score-asc':
                    return a.percentage - b.percentage || surA.localeCompare(surB);
                case 'date-desc':
                default:
                    return new Date(b.completedAt) - new Date(a.completedAt);
            }
        });

        return list;
    }

    function renderTopicSummaryHtml() {
        const scores = getFilteredAndSortedTopicScores();

        // Unique topics for filter dropdown
        const topicOptions = Array.from({ length: 14 }, (_, i) => i + 1);

        const totalAttempts = rawFacultyScores.length;
        const passedAttempts = rawFacultyScores.filter(s => s.passed === 1).length;
        const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;
        const avgScore = totalAttempts > 0 ? (rawFacultyScores.reduce((sum, s) => sum + s.percentage, 0) / totalAttempts).toFixed(1) : 0;

        return `
            <!-- Summary KPI Cards -->
            <div class="matrix-kpi-grid">
                <div class="matrix-stat-card">
                    <div class="matrix-stat-icon icon-blue">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 11l3 3L22 4"/>
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                    </div>
                    <div class="matrix-stat-body">
                        <div class="matrix-stat-value" style="color: var(--color-primary);">${totalAttempts}</div>
                        <div class="matrix-stat-label">Total Quiz Submissions</div>
                    </div>
                </div>
                <div class="matrix-stat-card">
                    <div class="matrix-stat-icon icon-emerald">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                    </div>
                    <div class="matrix-stat-body">
                        <div class="matrix-stat-value" style="color: #059669;">${passRate}%</div>
                        <div class="matrix-stat-label">Overall Pass Rate</div>
                    </div>
                </div>
                <div class="matrix-stat-card">
                    <div class="matrix-stat-icon icon-violet">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="20" x2="18" y2="10"/>
                            <line x1="12" y1="20" x2="12" y2="4"/>
                            <line x1="6" y1="20" x2="6" y2="14"/>
                        </svg>
                    </div>
                    <div class="matrix-stat-body">
                        <div class="matrix-stat-value">${avgScore}%</div>
                        <div class="matrix-stat-label">Class Average Grade</div>
                    </div>
                </div>
            </div>

            <!-- Controls Row: Search, Topic Filter, Sort by Surname / Score, Export (Print/PDF/CSV) -->
            <div class="scores-controls-row">
                <div class="scores-filters-group">
                    <div class="search-box">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        <input type="text" id="summarySearchInput" class="search-input" placeholder="Search student name or ID..." value="${escapeHtml(summarySearch)}" oninput="window.setSummarySearch(this.value)">
                    </div>

                    <select class="filter-select" onchange="window.setSummaryTopicFilter(this.value)">
                        <option value="all" ${summaryTopicFilter === 'all' ? 'selected' : ''}>All Topics (1 to 14)</option>
                        ${topicOptions.map(num => `
                            <option value="${num}" ${summaryTopicFilter === String(num) ? 'selected' : ''}>Topic ${num}</option>
                        `).join('')}
                    </select>

                    <select class="filter-select" onchange="window.setSummaryVerdictFilter(this.value)">
                        <option value="all" ${summaryVerdictFilter === 'all' ? 'selected' : ''}>All Verdicts</option>
                        <option value="passed" ${summaryVerdictFilter === 'passed' ? 'selected' : ''}>Passed Only</option>
                        <option value="failed" ${summaryVerdictFilter === 'failed' ? 'selected' : ''}>Needs Retake</option>
                    </select>

                    <select class="filter-select sort-select-control" onchange="window.setSummarySort(this.value)">
                        <option value="surname-asc" ${summarySort === 'surname-asc' ? 'selected' : ''}>Sort: Surname (A → Z)</option>
                        <option value="surname-desc" ${summarySort === 'surname-desc' ? 'selected' : ''}>Sort: Surname (Z → A)</option>
                        <option value="score-desc" ${summarySort === 'score-desc' ? 'selected' : ''}>Sort: Score (High → Low)</option>
                        <option value="score-asc" ${summarySort === 'score-asc' ? 'selected' : ''}>Sort: Score (Low → High)</option>
                        <option value="date-desc" ${summarySort === 'date-desc' ? 'selected' : ''}>Sort: Date (Newest)</option>
                    </select>
                </div>

                <div class="scores-export-group">
                    <button type="button" class="btn-export-action btn-print" onclick="window.printSummaryReport('topic-summary')" title="Print summary table to physical printer">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        <span>Print</span>
                    </button>
                    <button type="button" class="btn-export-action btn-pdf" onclick="window.downloadReportPdf('topic-summary', this)" title="Save report as PDF">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        <span>PDF</span>
                    </button>
                    <button type="button" class="btn-export-action btn-csv" onclick="window.exportTopicSummaryCSV()" title="Download spreadsheet (.csv) for Excel or Google Sheets">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
                        <span>Spreadsheet (.CSV)</span>
                    </button>
                </div>
            </div>

            <!-- Table of Topic Records -->
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3>Topic Quiz Assessment Records</h3>
                    <span class="badge badge-primary">${scores.length} Record${scores.length !== 1 ? 's' : ''} Listed</span>
                </div>
                <div class="card-body">
                    ${scores.length === 0 ? `
                        <div class="empty-state-full" style="padding: 2.5rem 1rem;">
                            <h4>No matching assessment records found</h4>
                            <p>Adjust your search filters or sort options above.</p>
                        </div>
                    ` : `
                        <div class="table-wrapper">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Student (Surname First)</th>
                                        <th>Topic Assessment</th>
                                        <th>Raw Score</th>
                                        <th>Grade %</th>
                                        <th>Verdict</th>
                                        <th>Retake Control</th>
                                        <th>Completed At</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${scores.map(s => `
                                        <tr>
                                            <td>
                                                <strong style="color: var(--color-primary);">${escapeHtml(s.lastName)}, ${escapeHtml(s.firstName)}</strong>
                                                <br><small style="color: var(--color-text-muted);">${escapeHtml(s.email)} (${escapeHtml(s.username)})</small>
                                            </td>
                                            <td>
                                                <strong>Topic ${s.topicOrderIndex}: ${escapeHtml(s.topicTitle)}</strong>
                                                <br><small style="color: var(--color-text-muted);">${escapeHtml(s.quizTitle)}</small>
                                            </td>
                                            <td>${s.score} / ${s.totalQuestions}</td>
                                            <td>
                                                <strong style="font-size: 1rem; color: ${s.passed ? '#059669' : '#dc2626'};">${s.percentage}%</strong>
                                            </td>
                                            <td>
                                                <span class="quiz-status-badge ${s.passed ? 'status-passed' : 'status-failed'}">
                                                    ${s.passed ? '✓ Passed' : '✗ Failed'}
                                                </span>
                                            </td>
                                            <td>
                                                ${s.passed === 1 ? `
                                                    <div class="faculty-retake-cell">
                                                        <span class="retake-status-pill passed">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                                            Passed (Mastered)
                                                        </span>
                                                        <small style="color: #64748b; font-size: 0.72rem;">No retake needed</small>
                                                    </div>
                                                ` : (s.retakeAllowed === 1 ? `
                                                    <div class="faculty-retake-cell">
                                                        <span class="retake-status-pill allowed">
                                                            <span class="pulse-indicator-green"></span>
                                                            Retake Allowed
                                                        </span>
                                                        <button type="button" class="btn-faculty-retake revoke" onclick="window.toggleRetakePermission('${s.id}', 0)" title="Revoke retake permission for this student">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                                            Don't Allow (Lock)
                                                        </button>
                                                    </div>
                                                ` : `
                                                    <div class="faculty-retake-cell">
                                                        <span class="retake-status-pill locked">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                                            Retake Locked
                                                        </span>
                                                        <button type="button" class="btn-faculty-retake grant" onclick="window.toggleRetakePermission('${s.id}', 1)" title="Grant student retake permission">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                                                            Allow Retake
                                                        </button>
                                                    </div>
                                                `)}
                                            </td>
                                            <td>${new Date(s.completedAt).toLocaleDateString()} ${new Date(s.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td>
                                                <button type="button" class="btn btn-secondary btn-sm" onclick="window.viewPastResult('${s.id}')">View</button>
                                                <button type="button" class="btn btn-secondary btn-sm" onclick="window.downloadGradeSlipDirectly('${s.id}', this)" title="Download Grade Slip PDF">Slip</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    // ============================================
    // WHITEBOARD ITEM #8: SUMMARY OF ALL QUIZ SCORES PER STUDENT
    // Master Matrix; Print, PDF, Spreadsheet
    // ============================================

    function getFilteredAndSortedMatrix() {
        if (!rawFacultyMatrix || !Array.isArray(rawFacultyMatrix.matrix)) return [];
        let list = [...rawFacultyMatrix.matrix];

        // Search term
        if (matrixSearch) {
            list = list.filter(m => 
                (m.lastName || '').toLowerCase().includes(matrixSearch) ||
                (m.firstName || '').toLowerCase().includes(matrixSearch) ||
                (m.username || '').toLowerCase().includes(matrixSearch) ||
                (m.email || '').toLowerCase().includes(matrixSearch)
            );
        }

        // Sorting
        list.sort((a, b) => {
            const surA = (a.lastName || '').toLowerCase();
            const surB = (b.lastName || '').toLowerCase();
            const firstA = (a.firstName || '').toLowerCase();
            const firstB = (b.firstName || '').toLowerCase();

            switch (matrixSort) {
                case 'surname-asc':
                    return surA.localeCompare(surB) || firstA.localeCompare(firstB);
                case 'surname-desc':
                    return surB.localeCompare(surA) || firstB.localeCompare(firstA);
                case 'avg-desc':
                    return b.overallAverage - a.overallAverage || surA.localeCompare(surB);
                case 'avg-asc':
                    return a.overallAverage - b.overallAverage || surA.localeCompare(surB);
                case 'completed-desc':
                    return b.passedCount - a.passedCount || surA.localeCompare(surB);
                default:
                    return surA.localeCompare(surB);
            }
        });

        return list;
    }

    function renderMasterMatrixHtml() {
        const matrixList = getFilteredAndSortedMatrix();
        const topics = (rawFacultyMatrix && rawFacultyMatrix.topics) || [];

        return `
            <!-- Controls Row: Search, Sort, Export (Print/PDF/CSV) -->
            <div class="scores-controls-row">
                <div class="scores-filters-group">
                    <div class="search-box">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        <input type="text" id="matrixTabSearchInput" class="search-input" placeholder="Search student name or ID..." value="${escapeHtml(matrixSearch)}" oninput="window.setMatrixSearch(this.value)">
                    </div>

                    <select class="filter-select sort-select-control" onchange="window.setMatrixSort(this.value)">
                        <option value="surname-asc" ${matrixSort === 'surname-asc' ? 'selected' : ''}>Sort: Surname (A → Z)</option>
                        <option value="surname-desc" ${matrixSort === 'surname-desc' ? 'selected' : ''}>Sort: Surname (Z → A)</option>
                        <option value="avg-desc" ${matrixSort === 'avg-desc' ? 'selected' : ''}>Sort: Average Grade (High → Low)</option>
                        <option value="avg-asc" ${matrixSort === 'avg-asc' ? 'selected' : ''}>Sort: Average Grade (Low → High)</option>
                        <option value="completed-desc" ${matrixSort === 'completed-desc' ? 'selected' : ''}>Sort: Topics Passed</option>
                    </select>
                </div>

                <div class="scores-export-group">
                    <button type="button" class="btn-export-action btn-print" onclick="window.printSummaryReport('master-matrix')" title="Print Master Matrix to physical printer">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        <span>Print</span>
                    </button>
                    <button type="button" class="btn-export-action btn-pdf" onclick="window.downloadReportPdf('master-matrix', this)" title="Save Master Matrix as PDF">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        <span>PDF</span>
                    </button>
                    <button type="button" class="btn-export-action btn-csv" onclick="window.exportMatrixCSV()" title="Download master matrix (.csv) for Excel or Google Sheets">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
                        <span>Spreadsheet (.CSV)</span>
                    </button>
                </div>
            </div>

            <!-- Master Cumulative Scores Matrix Table -->
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="margin: 0;">Summary of ALL Quiz Scores per Student</h3>
                        <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 2px;">Cumulative student performance across curriculum Topics 1 to 14</div>
                    </div>
                    <span class="badge badge-primary">${matrixList.length} Student${matrixList.length !== 1 ? 's' : ''} Enrolled</span>
                </div>
                <div class="card-body" style="padding: 0;">
                    ${matrixList.length === 0 ? `
                        <div class="empty-state-full" style="padding: 2.5rem 1rem;">
                            <h4>No enrolled students found</h4>
                        </div>
                    ` : `
                        <div class="table-wrapper" style="overflow-x: auto;">
                            <table class="matrix-table">
                                <thead>
                                    <tr>
                                        <th class="student-col">Student Name (Surname First)</th>
                                        ${topics.map(t => `
                                            <th title="${escapeHtml(t.title)}">T${t.orderIndex}</th>
                                        `).join('')}
                                        <th>Passed</th>
                                        <th>Average Grade</th>
                                        <th>Curriculum Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${matrixList.map(st => `
                                        <tr>
                                            <td class="student-col">
                                                <strong style="color: var(--color-primary);">${escapeHtml(st.lastName)}, ${escapeHtml(st.firstName)}</strong>
                                                <br><small style="color: var(--color-text-muted);">${escapeHtml(st.username)}</small>
                                            </td>
                                            ${(st.topicResults || []).map(r => `
                                                <td>
                                                    ${r.score !== null ? `
                                                        <span class="matrix-topic-cell ${r.isPassed ? 'passed' : 'failed'}" title="Topic ${r.orderIndex}: ${r.score}% (${r.isPassed ? 'Passed' : 'Needs Retake'})">
                                                            ${r.score}%
                                                        </span>
                                                    ` : `
                                                        <span class="matrix-topic-cell unattempted" title="Not attempted yet">—</span>
                                                    `}
                                                </td>
                                            `).join('')}
                                            <td>
                                                <strong>${st.passedCount} / ${st.totalTopics}</strong>
                                                <div style="font-size: 0.7rem; color: var(--color-text-muted);">${st.completionRate}%</div>
                                            </td>
                                            <td>
                                                <strong style="font-size: 0.95rem; color: ${st.overallAverage >= 75 ? '#059669' : st.overallAverage > 0 ? '#d97706' : '#6b7280'};">
                                                    ${st.overallAverage}%
                                                </strong>
                                            </td>
                                            <td>
                                                ${st.isCompleted ? `
                                                    <span class="quiz-status-badge status-passed">★ Graduated</span>
                                                ` : st.passedCount > 0 ? `
                                                    <span class="quiz-status-badge status-available">At Topic ${st.passedCount + 1}</span>
                                                ` : `
                                                    <span class="quiz-status-badge status-locked">At Topic 1</span>
                                                `}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    // ============================================
    // WHITEBOARD ITEM #8: DEDICATED MATRIX PAGE
    // Summary of ALL Quiz Scores per Student
    // ============================================

    window.loadMatrixPage = async function () {
        const user = getCurrentUser();
        if (!user) return;
        const isFaculty = isFacultyUser();

        const container = document.getElementById('matrixPageContent');
        if (!container) return;

        try {
            // Populate subject dropdown for matrix
            const subRes = await fetch(`/api/subjects?role=${encodeURIComponent(user.role || 'student')}&studentId=${encodeURIComponent(user.id || '')}`, {
                headers: {
                    'x-user-role': user.role || 'student',
                    'x-user-id': user.id || ''
                }
            });
            const subData = await subRes.json();
            const subjects = subData.subjects || [];

            const selectEl = document.getElementById('matrixSubjectSelect');
            if (subjects.length === 0) {
                if (selectEl) {
                    selectEl.innerHTML = `<option value="">${isFaculty ? 'No Subjects Created' : 'No Classes Joined Yet'}</option>`;
                }
                if (!isFaculty) {
                    container.innerHTML = `
                        <div class="empty-state-full class-enroll-needed-card">
                            <div class="enroll-needed-icon icon-orange">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                            </div>
                            <h3>Join a Class to View Your Performance Matrix</h3>
                            <p>
                                Enter your instructor's <strong>Class Join Code</strong> to enroll in a class and view your 14-topic progress matrix.
                            </p>
                            <div class="inline-enroll-action-group">
                                <input type="text" id="matrixInlineJoinInput" class="class-code-inline-input" placeholder="e.g. CMS315" maxlength="12" autocomplete="off" onkeydown="if(event.key==='Enter')window.handleMatrixInlineJoin()">
                                <button type="button" class="btn btn-primary" onclick="window.handleMatrixInlineJoin()">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span>Join Class</span>
                                </button>
                            </div>
                        </div>`;
                    return;
                }
            }

            if (selectEl && subjects.length > 0) {
                selectEl.innerHTML = subjects.map(s => `
                    <option value="${s.id}" ${s.id === currentSubjectId ? 'selected' : ''}>${s.code} - ${s.name} (${s.term || s.year || ''})</option>
                `).join('');
                if (!currentSubjectId || !subjects.some(s => s.id === currentSubjectId)) {
                    currentSubjectId = subjects[0].id;
                }
                selectEl.value = currentSubjectId;
            }

            await loadMatrixForSubject(currentSubjectId || (subjects[0] ? subjects[0].id : null));
        } catch (err) {
            console.error('Error loading matrix page:', err);
            showToast('Failed to load matrix page', 'error');
        }
    };

    async function loadMatrixForSubject(subjectId) {
        if (!subjectId) return;
        currentSubjectId = subjectId;
        const user = getCurrentUser();
        const isFaculty = isFacultyUser();
        const matrixBox = document.getElementById('matrixPageContent');
        if (!matrixBox) return;

        matrixBox.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--color-text-muted);">
                <div class="spinner" style="margin: 0 auto 1rem;"></div>
                <p>Loading Cumulative Quiz Performance Matrix...</p>
            </div>
        `;

        try {
            if (isFaculty) {
                const res = await fetch(`/api/subjects/${subjectId}/matrix`);
                const matData = await res.json();
                rawFacultyMatrix = matData || { topics: [], matrix: [] };
                renderMasterMatrixPageUI();
            } else {
                const [scoresRes, subRes] = await Promise.all([
                    fetch(`/api/scores/student/${user.id}`),
                    fetch(`/api/subjects/${subjectId}?role=student&studentId=${encodeURIComponent(user.id || '')}`)
                ]);
                const scoresData = await scoresRes.json();
                const subData = await subRes.json();
                rawStudentScores = scoresData.scores || [];
                renderStudentMatrixPageUI(subData.subject);
            }
        } catch (err) {
            console.error('Error loading matrix for subject:', err);
            matrixBox.innerHTML = `
                <div class="empty-state-full" style="padding: 2.5rem 1rem;">
                    <h4>Failed to load quiz performance matrix</h4>
                    <p>${escapeHtml(err.message || 'Please check your connection and try again.')}</p>
                </div>
            `;
        }
    }

    function renderMasterMatrixPageUI() {
        const matrixBox = document.getElementById('matrixPageContent');
        if (!matrixBox) return;

        const matrixList = getFilteredAndSortedMatrix();
        const allStudents = (rawFacultyMatrix && Array.isArray(rawFacultyMatrix.matrix)) ? rawFacultyMatrix.matrix : [];
        const topics = (rawFacultyMatrix && rawFacultyMatrix.topics) || [];
        const totalStudents = allStudents.length;
        const classAvg = totalStudents > 0 
            ? Math.round(allStudents.reduce((acc, s) => acc + (s.overallAverage || 0), 0) / totalStudents) 
            : 0;
        const completedCount = allStudents.filter(s => s.isCompleted).length;
        const topStudent = [...allStudents].sort((a, b) => (b.overallAverage || 0) - (a.overallAverage || 0))[0] || null;

        matrixBox.innerHTML = `
            <!-- Cumulative Performance Ledger Banner -->
            <div class="matrix-hero-banner">
                <div class="matrix-hero-left">
                    <span class="matrix-req-badge">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="vertical-align: -1px; margin-right: 4px;"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        Official Performance Ledger
                    </span>
                    <h2 class="matrix-hero-title">Summary of ALL Quiz Scores per Student</h2>
                    <p class="matrix-hero-desc">
                        Cumulative assessment ledger tracking individual performance across all curriculum topics (Topics 1 to ${topics.length || 14}).
                        Sequential progression requires ≥ 75% on each topic's quiz.
                    </p>
                </div>
                <div class="matrix-hero-right">
                    <div class="matrix-badge-pill">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 5h10"/>
                            <path d="M11 9h7"/>
                            <path d="M11 13h4"/>
                            <path d="M3 17l3 3 3-3"/>
                            <path d="M6 18V4"/>
                        </svg>
                        <span>Sorted by Surname &amp; Score</span>
                    </div>
                    <div class="matrix-badge-pill">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 6 2 18 2 18 9"/>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                            <rect x="6" y="14" width="12" height="8"/>
                        </svg>
                        <span>Print</span>
                        <span class="pill-dot">•</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <span>PDF</span>
                        <span class="pill-dot">•</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <line x1="3" y1="9" x2="21" y2="9"/>
                            <line x1="9" y1="21" x2="9" y2="9"/>
                        </svg>
                        <span>Spreadsheet</span>
                    </div>
                </div>
            </div>

            <!-- KPI Analytics Grid -->
            <div class="matrix-kpi-grid">
                <div class="matrix-stat-card">
                    <div class="matrix-stat-icon icon-blue">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                    </div>
                    <div class="matrix-stat-body">
                        <div class="matrix-stat-value">${totalStudents}</div>
                        <div class="matrix-stat-label">Enrolled Students</div>
                    </div>
                </div>
                <div class="matrix-stat-card">
                    <div class="matrix-stat-icon icon-emerald">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                    </div>
                    <div class="matrix-stat-body">
                        <div class="matrix-stat-value" style="color: ${classAvg >= 75 ? '#059669' : '#d97706'};">${classAvg}%</div>
                        <div class="matrix-stat-label">Class Quiz Average</div>
                    </div>
                </div>
                <div class="matrix-stat-card">
                    <div class="matrix-stat-icon icon-violet">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                            <path d="M4 22h16"/>
                            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                        </svg>
                    </div>
                    <div class="matrix-stat-body">
                        <div class="matrix-stat-value">${completedCount} <span style="font-size: 0.85rem; color: var(--color-text-muted);">/ ${totalStudents}</span></div>
                        <div class="matrix-stat-label">Curriculum Mastered</div>
                    </div>
                </div>
                <div class="matrix-stat-card">
                    <div class="matrix-stat-icon icon-amber">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>
                        </svg>
                    </div>
                    <div class="matrix-stat-body">
                        <div class="matrix-stat-value" style="font-size: 1.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${topStudent ? `${topStudent.lastName}, ${topStudent.firstName}` : 'None'}">
                            ${topStudent ? `${escapeHtml(topStudent.lastName)}, ${escapeHtml(topStudent.firstName || '')}` : '—'}
                        </div>
                        <div class="matrix-stat-label">Top Performer (${topStudent ? topStudent.overallAverage + '%' : 'N/A'})</div>
                    </div>
                </div>
            </div>

            <!-- Matrix Filter, Search and Export Toolbar -->
            <div class="scores-controls-row" style="margin-top: 1.5rem;">
                <div class="scores-filters-group">
                    <div class="search-box">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        <input type="text" id="matrixPageSearchInput" class="search-input" placeholder="Search student name or ID..." value="${escapeHtml(matrixSearch)}" oninput="window.setMatrixSearch(this.value)">
                    </div>

                    <select class="filter-select sort-select-control" onchange="window.setMatrixSort(this.value)">
                        <option value="surname-asc" ${matrixSort === 'surname-asc' ? 'selected' : ''}>Sort: Surname (A → Z)</option>
                        <option value="surname-desc" ${matrixSort === 'surname-desc' ? 'selected' : ''}>Sort: Surname (Z → A)</option>
                        <option value="avg-desc" ${matrixSort === 'avg-desc' ? 'selected' : ''}>Sort: Average Grade (High → Low)</option>
                        <option value="avg-asc" ${matrixSort === 'avg-asc' ? 'selected' : ''}>Sort: Average Grade (Low → High)</option>
                        <option value="completed-desc" ${matrixSort === 'completed-desc' ? 'selected' : ''}>Sort: Topics Passed</option>
                    </select>
                </div>

                <div class="scores-export-group">
                    <button type="button" class="btn-export-action btn-print" onclick="window.printSummaryReport('master-matrix')" title="Print Master Matrix to physical printer">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        <span>Print</span>
                    </button>
                    <button type="button" class="btn-export-action btn-pdf" onclick="window.downloadReportPdf('master-matrix', this)" title="Save Master Matrix as PDF">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        <span>PDF</span>
                    </button>
                    <button type="button" class="btn-export-action btn-csv" onclick="window.exportMatrixCSV()" title="Download master matrix (.csv) for Excel or Google Sheets">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
                        <span>Spreadsheet (.CSV)</span>
                    </button>
                </div>
            </div>

            <!-- Full Master Cumulative Matrix Table -->
            <div class="card" style="margin-top: 1rem; border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-sm);">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; background: #fafafa; border-bottom: 1px solid var(--color-border); padding: 1rem 1.25rem;">
                    <div>
                        <h3 style="margin: 0; font-size: 1.1rem; font-weight: 800; color: var(--color-text);">Master Performance Matrix: All Topics</h3>
                        <div style="font-size: 0.78rem; color: var(--color-text-muted); margin-top: 2px;">
                            Shows each student's highest verified quiz score for each curriculum module.
                        </div>
                    </div>
                    <span class="badge badge-primary" style="font-size: 0.8125rem; padding: 0.4rem 0.75rem;">
                        ${matrixList.length} of ${totalStudents} Student${totalStudents !== 1 ? 's' : ''} Displayed
                    </span>
                </div>
                <div class="card-body" style="padding: 0;">
                    ${matrixList.length === 0 ? `
                        <div class="empty-state-full" style="padding: 3rem 1rem;">
                            <h4>No matching students found</h4>
                            <p>Try adjusting your search query or sorting options.</p>
                        </div>
                    ` : `
                        <div class="table-wrapper" style="overflow-x: auto;">
                            <table class="matrix-table">
                                <thead>
                                    <tr>
                                        <th class="student-col">Student Name (Surname First)</th>
                                        ${topics.map(t => `
                                            <th title="${escapeHtml(t.title)} (Topic ${t.orderIndex})">T${t.orderIndex}</th>
                                        `).join('')}
                                        <th>Passed</th>
                                        <th>Average Grade</th>
                                        <th>Curriculum Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${matrixList.map(st => `
                                        <tr>
                                            <td class="student-col">
                                                <strong style="color: var(--color-primary); font-size: 0.875rem;">${escapeHtml(st.lastName)}, ${escapeHtml(st.firstName)}</strong>
                                                <br><small style="color: var(--color-text-muted);">${escapeHtml(st.username)} • ${escapeHtml(st.email || '')}</small>
                                            </td>
                                            ${(st.topicResults || []).map(r => `
                                                <td>
                                                    ${r.score !== null ? `
                                                        <span class="matrix-topic-cell ${r.isPassed ? 'passed' : 'failed'}" title="Topic ${r.orderIndex}: ${r.score}% (${r.isPassed ? 'Passed ✓' : 'Needs Retake ✗'})">
                                                            ${r.score}%
                                                        </span>
                                                    ` : `
                                                        <span class="matrix-topic-cell unattempted" title="Not attempted yet">—</span>
                                                    `}
                                                </td>
                                            `).join('')}
                                            <td>
                                                <strong style="font-size: 0.875rem;">${st.passedCount} / ${st.totalTopics}</strong>
                                                <div style="font-size: 0.7rem; color: var(--color-text-muted);">${st.completionRate}%</div>
                                            </td>
                                            <td>
                                                <strong style="font-size: 0.95rem; color: ${st.overallAverage >= 75 ? '#059669' : st.overallAverage > 0 ? '#d97706' : '#6b7280'};">
                                                    ${st.overallAverage}%
                                                </strong>
                                            </td>
                                            <td>
                                                ${st.isCompleted ? `
                                                    <span class="quiz-status-badge status-passed">★ Graduated</span>
                                                ` : st.passedCount > 0 ? `
                                                    <span class="quiz-status-badge status-available">At Topic ${st.passedCount + 1}</span>
                                                ` : `
                                                    <span class="quiz-status-badge status-locked">At Topic 1</span>
                                                `}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    function renderStudentMatrixPageUI(subject) {
        const matrixBox = document.getElementById('matrixPageContent');
        if (!matrixBox) return;

        const subName = subject ? subject.name : 'Curriculum Course';
        const subCode = subject ? subject.code : 'CMS';
        const subTerm = subject ? subject.term : '1st Semester';
        const subYear = subject ? subject.year : '2024-2025';
        const topics = (subject && subject.topics) || [];
        const totalTopics = topics.length;

        // Group student's highest scores by topic
        const topicScoresMap = {};
        rawStudentScores.forEach(s => {
            if (!topicScoresMap[s.topicId] || s.percentage > topicScoresMap[s.topicId].percentage) {
                topicScoresMap[s.topicId] = s;
            }
        });

        const passedTopicsCount = Object.values(topicScoresMap).filter(s => s.passed).length;
        const completionRate = totalTopics > 0 ? Math.round((passedTopicsCount / totalTopics) * 100) : 0;
        const scoreValues = Object.values(topicScoresMap).map(s => s.percentage);
        const avgScore = scoreValues.length > 0 ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) : 0;
        const isGraduated = totalTopics > 0 && passedTopicsCount >= totalTopics;

        matrixBox.innerHTML = `
            <!-- Student Cumulative Summary Banner -->
            <div class="matrix-hero-banner">
                <div class="matrix-hero-left">
                    <span class="matrix-req-badge">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="vertical-align: -1px; margin-right: 4px;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                        Student Transcript
                    </span>
                    <h2 class="matrix-hero-title">My Cumulative Quiz Summary</h2>
                    <p class="matrix-hero-desc">
                        Official academic performance ledger for <strong>${escapeHtml(subCode)}: ${escapeHtml(subName)}</strong> (${escapeHtml(subTerm)}, ${escapeHtml(subYear)}).
                        Passing score: <strong>75%</strong> on each topic.
                    </p>
                </div>
                <div class="matrix-hero-right">
                    <div class="matrix-badge-pill">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                        </svg>
                        <span>Student Transcript</span>
                    </div>
                    <div class="matrix-badge-pill">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 6 2 18 2 18 9"/>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                            <rect x="6" y="14" width="12" height="8"/>
                        </svg>
                        <span>Print</span>
                        <span class="pill-dot">•</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <span>PDF</span>
                        <span class="pill-dot">•</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <line x1="3" y1="9" x2="21" y2="9"/>
                            <line x1="9" y1="21" x2="9" y2="9"/>
                        </svg>
                        <span>Spreadsheet</span>
                    </div>
                </div>
            </div>

            <!-- Student KPI Summary -->
            <div class="matrix-kpi-grid">
                <div class="matrix-stat-card">
                    <div class="matrix-stat-icon icon-blue">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                    </div>
                    <div class="matrix-stat-body">
                        <div class="matrix-stat-value">${passedTopicsCount} <span style="font-size: 0.85rem; color: var(--color-text-muted);">/ ${totalTopics}</span></div>
                        <div class="matrix-stat-label">Modules Passed (${completionRate}%)</div>
                    </div>
                </div>
                <div class="matrix-stat-card">
                    <div class="matrix-stat-icon icon-emerald">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                    </div>
                    <div class="matrix-stat-body">
                        <div class="matrix-stat-value" style="color: ${avgScore >= 75 ? '#059669' : '#d97706'};">${avgScore}%</div>
                        <div class="matrix-stat-label">My Cumulative Average</div>
                    </div>
                </div>
                <div class="matrix-stat-card">
                    <div class="matrix-stat-icon icon-violet">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <circle cx="12" cy="12" r="6"/>
                            <circle cx="12" cy="12" r="2"/>
                        </svg>
                    </div>
                    <div class="matrix-stat-body">
                        <div class="matrix-stat-value" style="font-size: 1.15rem; color: ${isGraduated ? '#059669' : '#2563eb'};">
                            ${isGraduated ? '★ Mastered All' : `At Topic ${passedTopicsCount + 1}`}
                        </div>
                        <div class="matrix-stat-label">Sequential Status</div>
                    </div>
                </div>
                <div class="matrix-stat-card">
                    <div class="matrix-stat-icon icon-amber">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                            <path d="M9 14l2 2 4-4"/>
                        </svg>
                    </div>
                    <div class="matrix-stat-body">
                        <div class="matrix-stat-value">${rawStudentScores.length}</div>
                        <div class="matrix-stat-label">Total Quiz Attempts</div>
                    </div>
                </div>
            </div>

            <!-- Student Action Bar -->
            <div class="scores-controls-row" style="margin-top: 1.5rem;">
                <div>
                    <h3 style="margin: 0; font-size: 1.1rem; font-weight: 800;">Topic by Topic Mastery Ledger</h3>
                    <div style="font-size: 0.78rem; color: var(--color-text-muted);">Sequential unlocking history and grades</div>
                </div>
                <div class="scores-export-group">
                    <button type="button" class="btn-export-action btn-print" onclick="window.printSummaryReport('student-transcript')" title="Print transcript">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        <span>Print</span>
                    </button>
                    <button type="button" class="btn-export-action btn-pdf" onclick="window.downloadReportPdf('student-transcript', this)" title="Save as PDF">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        <span>PDF</span>
                    </button>
                    <button type="button" class="btn-export-action btn-csv" onclick="window.exportStudentTranscriptCSV()" title="Download Spreadsheet (.CSV)">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
                        <span>Spreadsheet (.CSV)</span>
                    </button>
                </div>
            </div>

            <!-- Student Topics Table -->
            <div class="card" style="margin-top: 1rem; border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-sm);">
                <div class="card-body" style="padding: 0;">
                    <div class="table-wrapper">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Topic #</th>
                                    <th>Curriculum Lesson</th>
                                    <th>Highest Score</th>
                                    <th>Passing Standard</th>
                                    <th>Verdict</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${topics.map(t => {
                                    const bestAttempt = topicScoresMap[t.id];
                                    const isPassed = bestAttempt && bestAttempt.passed;
                                    const isAvailable = t.orderIndex <= passedTopicsCount + 1;
                                    return `
                                        <tr>
                                            <td><strong>Topic ${t.orderIndex}</strong></td>
                                            <td>
                                                <strong>${escapeHtml(t.title)}</strong>
                                                ${t.description ? `<br><small style="color: var(--color-text-muted);">${escapeHtml(t.description)}</small>` : ''}
                                            </td>
                                            <td>
                                                ${bestAttempt ? `
                                                    <strong style="color: ${isPassed ? '#059669' : '#dc2626'}; font-size: 0.95rem;">
                                                        ${bestAttempt.percentage}% (${bestAttempt.score}/${bestAttempt.totalQuestions})
                                                    </strong>
                                                ` : '<span style="color: var(--color-text-muted);">Not Taken Yet</span>'}
                                            </td>
                                            <td>75% Passing Mark</td>
                                            <td>
                                                ${isPassed ? `
                                                    <span class="quiz-status-badge status-passed">Passed ✓</span>
                                                ` : bestAttempt ? `
                                                    <span class="quiz-status-badge status-failed">Needs Retake ✗</span>
                                                ` : isAvailable ? `
                                                    <span class="quiz-status-badge status-available">Unlocked</span>
                                                ` : `
                                                    <span class="quiz-status-badge status-locked"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align: -1px; margin-right: 3px;"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Locked</span>
                                                `}
                                            </td>
                                            <td>
                                                ${bestAttempt ? `
                                                    <button type="button" class="btn btn-secondary btn-sm" onclick="window.viewPastResult('${bestAttempt.id}')">Review</button>
                                                ` : isAvailable ? `
                                                    <button type="button" class="btn btn-primary btn-sm" onclick="window.navigateTo('quizzes')">Take Quiz</button>
                                                ` : `
                                                    <span style="font-size: 0.75rem; color: var(--color-text-muted);">Pass Topic ${t.orderIndex - 1} First</span>
                                                `}
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    // ============================================
    // STUDENT UI: TRANSCRIPT, PRINT & SPREADSHEET
    // ============================================

    function renderStudentScoresUI() {
        const container = document.getElementById('scoresContent');
        if (!container) return;

        if (rawStudentScores.length === 0) {
            container.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3>My Assessment Transcript</h3>
                    </div>
                    <div class="card-body">
                        <div class="empty-state-full">
                            <h3>No Quizzes Taken Yet</h3>
                            <p>Start with Topic 1: CMS Fundamentals to begin unlocking the course curriculum.</p>
                            <button type="button" class="btn btn-primary" onclick="window.navigateTo('quizzes')">View Course Quizzes</button>
                        </div>
                    </div>
                </div>`;
            return;
        }

        container.innerHTML = `
            <div class="scores-controls-row">
                <div>
                    <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800; color: var(--color-text);">My Official Assessment Transcript</h3>
                    <div style="font-size: 0.78rem; color: var(--color-text-muted);">Recorded grades and pass/fail verification history</div>
                </div>
                <div class="scores-export-group">
                    <button type="button" class="btn-export-action btn-print" onclick="window.printSummaryReport('student-transcript')" title="Print my assessment transcript">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        <span>Print</span>
                    </button>
                    <button type="button" class="btn-export-action btn-pdf" onclick="window.downloadReportPdf('student-transcript', this)" title="Save transcript as PDF">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        <span>PDF</span>
                    </button>
                    <button type="button" class="btn-export-action btn-csv" onclick="window.exportStudentTranscriptCSV()" title="Download spreadsheet (.csv)">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
                        <span>Spreadsheet (.CSV)</span>
                    </button>
                </div>
            </div>

            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3>Academic Records</h3>
                    <span class="badge badge-primary">${rawStudentScores.length} Assessment Attempt${rawStudentScores.length !== 1 ? 's' : ''}</span>
                </div>
                <div class="card-body">
                    <div class="table-wrapper">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Topic Assessment</th>
                                    <th>Score</th>
                                    <th>Grade %</th>
                                    <th>Passing Mark</th>
                                    <th>Verdict</th>
                                    <th>Date Completed</th>
                                    <th>Official Verification</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rawStudentScores.map(s => `
                                    <tr>
                                        <td>
                                            <strong>Topic ${s.topicOrderIndex}: ${escapeHtml(s.topicTitle)}</strong>
                                            <br><small style="color: var(--color-text-muted);">${escapeHtml(s.quizTitle)}</small>
                                        </td>
                                        <td>${s.score} / ${s.totalQuestions}</td>
                                        <td><strong style="color: ${s.passed ? '#10b981' : '#ef4444'}; font-size: 0.95rem;">${s.percentage}%</strong></td>
                                        <td>${s.passingScorePercent}%</td>
                                        <td>
                                            <span class="quiz-status-badge ${s.passed ? 'status-passed' : 'status-failed'}">
                                                ${s.passed ? 'Passed ✓' : 'Did Not Pass'}
                                            </span>
                                        </td>
                                        <td>${new Date(s.completedAt).toLocaleDateString()}</td>
                                        <td>
                                            <button type="button" class="btn btn-secondary btn-sm" onclick="window.viewPastResult('${s.id}')">View</button>
                                            <button type="button" class="btn btn-primary btn-sm" onclick="window.downloadGradeSlipDirectly('${s.id}', this)" title="Download Official Grade Slip PDF">Download Slip</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    // ============================================
    // SPREADSHEET EXPORTERS (CSV for Excel / Sheets)
    // Whiteboard Requirement #6 and #8
    // ============================================

    function downloadCSVFile(filename, headers, rows) {
        const csvContent = [
            headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
            ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        ].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Spreadsheet downloaded: ${filename}`, 'success');
    }

    window.exportTopicSummaryCSV = function () {
        const scores = getFilteredAndSortedTopicScores();
        if (scores.length === 0) {
            showToast('No records to export', 'warning');
            return;
        }

        const headers = [
            'Student Surname',
            'Student First Name',
            'Username',
            'Email',
            'Topic Order',
            'Topic Title',
            'Quiz Title',
            'Correct Score',
            'Total Questions',
            'Percentage Grade',
            'Passing Mark',
            'Passed (1/0)',
            'Status Verdict',
            'Completed Date'
        ];

        const rows = scores.map(s => [
            s.lastName || '',
            s.firstName || '',
            s.username || '',
            s.email || '',
            s.topicOrderIndex || '',
            s.topicTitle || '',
            s.quizTitle || '',
            s.score,
            s.totalQuestions,
            `${s.percentage}%`,
            `${s.passingScorePercent}%`,
            s.passed,
            s.passed ? 'PASSED' : 'NEEDS_RETAKE',
            new Date(s.completedAt).toISOString()
        ]);

        downloadCSVFile(`CMS_Quiz_Summary_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    };

    window.exportMatrixCSV = function () {
        const matrixList = getFilteredAndSortedMatrix();
        const topics = (rawFacultyMatrix && rawFacultyMatrix.topics) || [];
        if (matrixList.length === 0) {
            showToast('No student matrix data to export', 'warning');
            return;
        }

        const headers = [
            'Student Surname',
            'Student First Name',
            'Username',
            'Email',
            ...topics.map(t => `Topic ${t.orderIndex}: ${t.title}`),
            'Passed Topics Count',
            'Total Topics',
            'Overall Average Grade',
            'Completion Rate %',
            'Curriculum Status'
        ];

        const rows = matrixList.map(st => [
            st.lastName || '',
            st.firstName || '',
            st.username || '',
            st.email || '',
            ...(st.topicResults || []).map(r => r.score !== null ? `${r.score}%` : 'N/A'),
            st.passedCount,
            st.totalTopics,
            `${st.overallAverage}%`,
            `${st.completionRate}%`,
            st.isCompleted ? 'GRADUATED' : `IN_PROGRESS_AT_TOPIC_${st.passedCount + 1}`
        ]);

        downloadCSVFile(`CMS_Master_Scores_Matrix_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    };

    window.exportStudentTranscriptCSV = function () {
        if (rawStudentScores.length === 0) {
            showToast('No transcript records to export', 'warning');
            return;
        }

        const headers = [
            'Topic Order',
            'Topic Title',
            'Quiz Assessment',
            'Score',
            'Total Questions',
            'Percentage Grade',
            'Passing Mark %',
            'Verdict',
            'Completed Date'
        ];

        const rows = rawStudentScores.map(s => [
            s.topicOrderIndex,
            s.topicTitle,
            s.quizTitle,
            s.score,
            s.totalQuestions,
            `${s.percentage}%`,
            `${s.passingScorePercent}%`,
            s.passed ? 'PASSED' : 'DID_NOT_PASS',
            new Date(s.completedAt).toISOString()
        ]);

        downloadCSVFile(`My_Assessment_Transcript_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    };

    // ============================================
    // OFFICIAL PDF REPORT GENERATOR (HTML2PDF)
    // Downloads institutional, high-fidelity PDF documents
    // ============================================

    window.downloadReportPdf = async function (reportType, btnElement) {
        let origHtml = '';
        if (btnElement) {
            origHtml = btnElement.innerHTML;
            btnElement.disabled = true;
            btnElement.innerHTML = `
                <svg class="spin-animation" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10"/>
                </svg>
                <span>Generating PDF...</span>`;
        }

        try {
            if (typeof window.html2pdf !== 'function') {
                console.warn('html2pdf library not found, falling back to print dialog');
                showToast('PDF generator library not loaded, opening print dialog...', 'warning');
                if (typeof window.printSummaryReport === 'function') {
                    window.printSummaryReport(reportType);
                } else {
                    window.print();
                }
                return;
            }

            let renderWrapper = document.getElementById('reportPdfRenderWrapper');
            if (!renderWrapper) {
                renderWrapper = document.createElement('div');
                renderWrapper.id = 'reportPdfRenderWrapper';
                document.body.appendChild(renderWrapper);
            }

            const dateStr = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const dateIso = new Date().toISOString().slice(0, 10);
            let filename = `CMS-Report-${dateIso}.pdf`;
            let orientation = 'portrait';
            let templateHtml = '';

            if (reportType === 'student-transcript') {
                if (!rawStudentScores || rawStudentScores.length === 0) {
                    showToast('No assessment attempts recorded yet to export', 'warning');
                    return;
                }

                const user = getCurrentUser() || {};
                const studentFullName = `${user.lastName ? user.lastName + ', ' : ''}${user.firstName || user.username || 'Student'}`;
                const studentEmail = user.email || 'student@domain.edu';
                const studentUsername = user.username || 'student';
                const transcriptCode = 'TRX-' + (user.id ? String(user.id).slice(-6) : Math.random().toString(36).substring(2, 8)).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

                const totalAttempts = rawStudentScores.length;
                const passedCount = rawStudentScores.filter(s => s.passed).length;
                const sumScore = rawStudentScores.reduce((acc, s) => acc + (Number(s.percentage) || 0), 0);
                const avgGrade = totalAttempts > 0 ? (sumScore / totalAttempts).toFixed(1) : '0';
                const standing = Number(avgGrade) >= 90 ? "President's Honors List" : (Number(avgGrade) >= 75 ? "Satisfactory Progress" : "Academic Review Required");

                filename = `CMS-OfficialTranscript-${(user.lastName || 'Student').replace(/[^a-zA-Z0-9]/g, '_')}_${(user.firstName || 'Record').replace(/[^a-zA-Z0-9]/g, '_')}-${dateIso}.pdf`;
                orientation = 'portrait';

                templateHtml = `
                    <div class="pdf-portrait-doc">
                        <div class="pdf-doc-outer">
                            <div class="pdf-header-section">
                                <div class="pdf-crest-box">${SHARED_ACADEMIC_CREST_SVG}</div>
                                <div class="pdf-title-box">
                                    <div class="pdf-inst-name">COLLEGE OF COMPUTER STUDIES &amp; INFORMATION TECHNOLOGY</div>
                                    <div class="pdf-inst-sub">CMS LEARNING MANAGEMENT SYSTEM • CURRICULUM ACCREDITATION DIVISION</div>
                                    <div class="pdf-main-heading">Official Student Assessment Transcript</div>
                                </div>
                            </div>

                            <div class="pdf-meta-banner">
                                <div class="pdf-meta-item">
                                    <div class="pdf-meta-label">Student Name</div>
                                    <div class="pdf-meta-value" title="${escapeHtml(studentFullName)}">${escapeHtml(studentFullName)}</div>
                                </div>
                                <div class="pdf-meta-item">
                                    <div class="pdf-meta-label">Account / ID</div>
                                    <div class="pdf-meta-value" title="${escapeHtml(studentUsername)}">${escapeHtml(studentUsername)}</div>
                                </div>
                                <div class="pdf-meta-item">
                                    <div class="pdf-meta-label">Course Subject</div>
                                    <div class="pdf-meta-value">IT 315 — CMS</div>
                                </div>
                                <div class="pdf-meta-item">
                                    <div class="pdf-meta-label">Date Generated</div>
                                    <div class="pdf-meta-value">${dateStr}</div>
                                </div>
                            </div>

                            <div class="pdf-kpi-row">
                                <div class="pdf-kpi-card">
                                    <div class="pdf-kpi-val">${totalAttempts}</div>
                                    <div class="pdf-kpi-lbl">Total Attempts</div>
                                </div>
                                <div class="pdf-kpi-card">
                                    <div class="pdf-kpi-val" style="color: #059669;">${passedCount}</div>
                                    <div class="pdf-kpi-lbl">Assessments Passed</div>
                                </div>
                                <div class="pdf-kpi-card">
                                    <div class="pdf-kpi-val" style="color: #0f2347;">${avgGrade}%</div>
                                    <div class="pdf-kpi-lbl">Cumulative Average</div>
                                </div>
                                <div class="pdf-kpi-card">
                                    <div class="pdf-kpi-val" style="font-size: 11px; padding-top: 4px; color: ${Number(avgGrade) >= 75 ? '#059669' : '#dc2626'};">${standing}</div>
                                    <div class="pdf-kpi-lbl">Scholastic Standing</div>
                                </div>
                            </div>

                            <table class="pdf-data-table">
                                <thead>
                                    <tr>
                                        <th style="width: 14%;">Topic #</th>
                                        <th style="width: 38%;">Curriculum Assessment Module</th>
                                        <th style="width: 12%; text-align: center;">Raw Score</th>
                                        <th style="width: 12%; text-align: center;">Grade %</th>
                                        <th style="width: 12%; text-align: center;">Status</th>
                                        <th style="width: 12%; text-align: right;">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rawStudentScores.map(s => `
                                        <tr>
                                            <td><strong>Topic ${s.topicOrderIndex || '1'}</strong></td>
                                            <td>
                                                <strong>${escapeHtml(s.topicTitle || 'Assessment')}</strong>
                                                ${s.quizTitle ? `<br><small style="color: #64748b; font-size: 8px;">${escapeHtml(s.quizTitle)}</small>` : ''}
                                            </td>
                                            <td style="text-align: center;">${s.score} / ${s.totalQuestions}</td>
                                            <td style="text-align: center;">
                                                <strong style="color: ${s.passed ? '#059669' : '#dc2626'};">${s.percentage}%</strong>
                                            </td>
                                            <td style="text-align: center;">
                                                <span class="pdf-pill ${s.passed ? 'pdf-pill-passed' : 'pdf-pill-failed'}">
                                                    ${s.passed ? 'PASSED ✓' : 'NEEDS RETAKE'}
                                                </span>
                                            </td>
                                            <td style="text-align: right; font-size: 8.5px; color: #475569;">
                                                ${new Date(s.completedAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>

                            <div class="pdf-footer-signatures">
                                <div class="pdf-sig-col">
                                    <div class="pdf-sig-svg">${SHARED_INSTRUCTOR_SIGN_SVG}</div>
                                    <div class="pdf-sig-rule"></div>
                                    <div class="pdf-sig-name">Prof. Maria Santos</div>
                                    <div class="pdf-sig-title">Lead Course Faculty Instructor</div>
                                </div>
                                <div class="pdf-seal-box">
                                    ${SHARED_GOLD_SEAL_SVG}
                                    <div style="font-size: 6.5px; color: #64748b; font-weight: 700; margin-top: 2px;">${transcriptCode}</div>
                                </div>
                                <div class="pdf-sig-col">
                                    <div class="pdf-sig-svg">${SHARED_DEAN_SIGN_SVG}</div>
                                    <div class="pdf-sig-rule"></div>
                                    <div class="pdf-sig-name">Dr. Robert Taylor</div>
                                    <div class="pdf-sig-title">Dean, College of Computer Studies</div>
                                </div>
                            </div>

                            <div class="pdf-bottom-notice">
                                Official Academic Transcript • CMS Learning Management System • Verified Institutional Accreditation Record • Ref: ${transcriptCode}
                            </div>
                        </div>
                    </div>
                `;
            } else if (reportType === 'topic-summary') {
                const scores = getFilteredAndSortedTopicScores();
                if (scores.length === 0) {
                    showToast('No matching assessment records to export', 'warning');
                    return;
                }

                const totalRecords = scores.length;
                const totalPassed = scores.filter(s => s.passed === 1 || s.passed === true).length;
                const passRate = totalRecords > 0 ? Math.round((totalPassed / totalRecords) * 100) : 0;
                const sumPercentage = scores.reduce((acc, s) => acc + (Number(s.percentage) || 0), 0);
                const avgGrade = totalRecords > 0 ? (sumPercentage / totalRecords).toFixed(1) : '0';
                const uniqueStudents = new Set(scores.map(s => s.userId || s.username)).size;
                const reportCode = 'REP-TOPIC-' + Date.now().toString(36).toUpperCase();

                filename = `CMS-TopicAssessment-Summary-${dateIso}.pdf`;
                orientation = 'portrait';

                templateHtml = `
                    <div class="pdf-portrait-doc">
                        <div class="pdf-doc-outer">
                            <div class="pdf-header-section">
                                <div class="pdf-crest-box">${SHARED_ACADEMIC_CREST_SVG}</div>
                                <div class="pdf-title-box">
                                    <div class="pdf-inst-name">COLLEGE OF COMPUTER STUDIES &amp; INFORMATION TECHNOLOGY</div>
                                    <div class="pdf-inst-sub">CMS LEARNING MANAGEMENT SYSTEM • FACULTY EVALUATION GRADEBOOK</div>
                                    <div class="pdf-main-heading">Topic Assessment Summary Report</div>
                                </div>
                            </div>

                            <div class="pdf-meta-banner">
                                <div class="pdf-meta-item">
                                    <div class="pdf-meta-label">Course Subject</div>
                                    <div class="pdf-meta-value">IT 315 — CMS</div>
                                </div>
                                <div class="pdf-meta-item">
                                    <div class="pdf-meta-label">Lead Faculty</div>
                                    <div class="pdf-meta-value">Prof. Maria Santos</div>
                                </div>
                                <div class="pdf-meta-item">
                                    <div class="pdf-meta-label">Filter &amp; Sort</div>
                                    <div class="pdf-meta-value">${escapeHtml(summaryTopicFilter)} • ${escapeHtml(summarySort)}</div>
                                </div>
                                <div class="pdf-meta-item">
                                    <div class="pdf-meta-label">Date Generated</div>
                                    <div class="pdf-meta-value">${dateStr}</div>
                                </div>
                            </div>

                            <div class="pdf-kpi-row">
                                <div class="pdf-kpi-card">
                                    <div class="pdf-kpi-val">${totalRecords}</div>
                                    <div class="pdf-kpi-lbl">Total Attempts</div>
                                </div>
                                <div class="pdf-kpi-card">
                                    <div class="pdf-kpi-val">${uniqueStudents}</div>
                                    <div class="pdf-kpi-lbl">Students Evaluated</div>
                                </div>
                                <div class="pdf-kpi-card">
                                    <div class="pdf-kpi-val" style="color: #059669;">${passRate}%</div>
                                    <div class="pdf-kpi-lbl">Pass Rate (${totalPassed}/${totalRecords})</div>
                                </div>
                                <div class="pdf-kpi-card">
                                    <div class="pdf-kpi-val" style="color: #0f2347;">${avgGrade}%</div>
                                    <div class="pdf-kpi-lbl">Class Average Grade</div>
                                </div>
                            </div>

                            <table class="pdf-data-table">
                                <thead>
                                    <tr>
                                        <th style="width: 25%;">Student (Surname First)</th>
                                        <th style="width: 32%;">Topic Assessment</th>
                                        <th style="width: 11%; text-align: center;">Raw Score</th>
                                        <th style="width: 10%; text-align: center;">Grade %</th>
                                        <th style="width: 11%; text-align: center;">Verdict</th>
                                        <th style="width: 11%; text-align: right;">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${scores.map(s => `
                                        <tr>
                                            <td>
                                                <strong style="color: #0f2347;">${escapeHtml(s.lastName)}, ${escapeHtml(s.firstName)}</strong>
                                                <br><small style="color: #64748b; font-size: 8px;">${escapeHtml(s.username)}</small>
                                            </td>
                                            <td>
                                                <strong>Topic ${s.topicOrderIndex}: ${escapeHtml(s.topicTitle)}</strong>
                                                <br><small style="color: #64748b; font-size: 8px;">${escapeHtml(s.quizTitle)}</small>
                                            </td>
                                            <td style="text-align: center;">${s.score} / ${s.totalQuestions}</td>
                                            <td style="text-align: center;">
                                                <strong style="color: ${s.passed ? '#059669' : '#dc2626'};">${s.percentage}%</strong>
                                            </td>
                                            <td style="text-align: center;">
                                                <span class="pdf-pill ${s.passed ? 'pdf-pill-passed' : 'pdf-pill-failed'}">
                                                    ${s.passed ? 'PASSED ✓' : 'FAILED'}
                                                </span>
                                            </td>
                                            <td style="text-align: right; font-size: 8.5px; color: #475569;">
                                                ${new Date(s.completedAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>

                            <div class="pdf-footer-signatures">
                                <div class="pdf-sig-col">
                                    <div class="pdf-sig-svg">${SHARED_INSTRUCTOR_SIGN_SVG}</div>
                                    <div class="pdf-sig-rule"></div>
                                    <div class="pdf-sig-name">Prof. Maria Santos</div>
                                    <div class="pdf-sig-title">Lead Course Faculty Instructor</div>
                                </div>
                                <div class="pdf-seal-box">
                                    ${SHARED_GOLD_SEAL_SVG}
                                    <div style="font-size: 6.5px; color: #64748b; font-weight: 700; margin-top: 2px;">${reportCode}</div>
                                </div>
                                <div class="pdf-sig-col">
                                    <div class="pdf-sig-svg">${SHARED_DEAN_SIGN_SVG}</div>
                                    <div class="pdf-sig-rule"></div>
                                    <div class="pdf-sig-name">Dr. Robert Taylor</div>
                                    <div class="pdf-sig-title">Dean, College of Computer Studies</div>
                                </div>
                            </div>

                            <div class="pdf-bottom-notice">
                                Official Faculty Gradebook Summary • Verified CMS Accreditation Ledger • Ref: ${reportCode}
                            </div>
                        </div>
                    </div>
                `;
            } else if (reportType === 'master-matrix') {
                const matrixList = getFilteredAndSortedMatrix();
                const topics = (rawFacultyMatrix && rawFacultyMatrix.topics) || [];
                if (matrixList.length === 0) {
                    showToast('No student records found in matrix to export', 'warning');
                    return;
                }

                const totalEnrolled = matrixList.length;
                const totalCompleted = matrixList.filter(s => s.isCompleted).length;
                const cohortSum = matrixList.reduce((acc, s) => acc + (Number(s.overallAverage) || 0), 0);
                const cohortAvg = totalEnrolled > 0 ? (cohortSum / totalEnrolled).toFixed(1) : '0';
                const matrixCode = 'MTX-' + Date.now().toString(36).toUpperCase();

                filename = `CMS-MasterPerformanceMatrix-Topics1-14-${dateIso}.pdf`;
                orientation = 'landscape';

                templateHtml = `
                    <div class="pdf-landscape-doc">
                        <div class="pdf-doc-outer">
                            <div class="pdf-header-section">
                                <div class="pdf-crest-box">${SHARED_ACADEMIC_CREST_SVG}</div>
                                <div class="pdf-title-box">
                                    <div class="pdf-inst-name">COLLEGE OF COMPUTER STUDIES &amp; INFORMATION TECHNOLOGY</div>
                                    <div class="pdf-inst-sub">CMS LEARNING MANAGEMENT SYSTEM • CUMULATIVE CURRICULUM PERFORMANCE LEDGER</div>
                                    <div class="pdf-main-heading">Summary of ALL Quiz Scores per Student — Master Matrix (Topics 1 - 14)</div>
                                </div>
                            </div>

                            <div class="pdf-meta-banner">
                                <div class="pdf-meta-item">
                                    <div class="pdf-meta-label">Course Subject</div>
                                    <div class="pdf-meta-value">IT 315 — Content Management Systems</div>
                                </div>
                                <div class="pdf-meta-item">
                                    <div class="pdf-meta-label">Course Instructor</div>
                                    <div class="pdf-meta-value">Prof. Maria Santos</div>
                                </div>
                                <div class="pdf-meta-item">
                                    <div class="pdf-meta-label">Cohort Enrolled</div>
                                    <div class="pdf-meta-value">${totalEnrolled} Students Enrolled</div>
                                </div>
                                <div class="pdf-meta-item">
                                    <div class="pdf-meta-label">Date Generated</div>
                                    <div class="pdf-meta-value">${dateStr}</div>
                                </div>
                            </div>

                            <div class="pdf-kpi-row">
                                <div class="pdf-kpi-card">
                                    <div class="pdf-kpi-val">${totalEnrolled}</div>
                                    <div class="pdf-kpi-lbl">Total Enrolled</div>
                                </div>
                                <div class="pdf-kpi-card">
                                    <div class="pdf-kpi-val" style="color: #059669;">${totalCompleted}</div>
                                    <div class="pdf-kpi-lbl">Curriculum Completed</div>
                                </div>
                                <div class="pdf-kpi-card">
                                    <div class="pdf-kpi-val" style="color: #0f2347;">${cohortAvg}%</div>
                                    <div class="pdf-kpi-lbl">Class Average Grade</div>
                                </div>
                                <div class="pdf-kpi-card">
                                    <div class="pdf-kpi-val">14 Modules</div>
                                    <div class="pdf-kpi-lbl">Curriculum Scope</div>
                                </div>
                            </div>

                            <table class="pdf-data-table" style="font-size: 8px; margin-top: 14px;">
                                <thead>
                                    <tr>
                                        <th style="width: 17%; font-size: 8px;">Student (Surname First)</th>
                                        ${topics.map(t => `<th style="text-align: center; width: 4.8%; font-size: 7.5px; padding: 4px 1px;">T${t.orderIndex}</th>`).join('')}
                                        <th style="text-align: center; width: 6%; font-size: 7.5px;">Passed</th>
                                        <th style="text-align: center; width: 6%; font-size: 7.5px;">Average</th>
                                        <th style="text-align: center; width: 6%; font-size: 7.5px;">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${matrixList.map(st => `
                                        <tr>
                                            <td>
                                                <strong style="color: #0f2347; font-size: 8.5px;">${escapeHtml(st.lastName)}, ${escapeHtml(st.firstName)}</strong>
                                                <br><small style="color: #64748b; font-size: 7px;">${escapeHtml(st.username)}</small>
                                            </td>
                                            ${(st.topicResults || []).map(r => `
                                                <td style="text-align: center; font-size: 7.5px; padding: 3px 1px;">
                                                    ${r.score !== null ? `
                                                        <span style="font-weight: 700; color: ${r.passed ? '#059669' : '#dc2626'};">${r.score}%</span>
                                                    ` : `<span style="color: #cbd5e1;">—</span>`}
                                                </td>
                                            `).join('')}
                                            <td style="text-align: center; font-weight: 700;">${st.passedCount}/${st.totalTopics}</td>
                                            <td style="text-align: center; font-weight: 700; color: #0f2347;">${st.overallAverage}%</td>
                                            <td style="text-align: center;">
                                                <span class="pdf-pill ${st.isCompleted ? 'pdf-pill-passed' : 'pdf-pill-locked'}" style="font-size: 7px; padding: 1px 4px;">
                                                    ${st.isCompleted ? 'COMPLETED' : 'PROGRESS'}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>

                            <div class="pdf-footer-signatures">
                                <div class="pdf-sig-col">
                                    <div class="pdf-sig-svg">${SHARED_INSTRUCTOR_SIGN_SVG}</div>
                                    <div class="pdf-sig-rule"></div>
                                    <div class="pdf-sig-name">Prof. Maria Santos</div>
                                    <div class="pdf-sig-title">Lead Course Faculty Instructor</div>
                                </div>
                                <div class="pdf-seal-box">
                                    ${SHARED_GOLD_SEAL_SVG}
                                    <div style="font-size: 6.5px; color: #64748b; font-weight: 700; margin-top: 2px;">${matrixCode}</div>
                                </div>
                                <div class="pdf-sig-col">
                                    <div class="pdf-sig-svg">${SHARED_DEAN_SIGN_SVG}</div>
                                    <div class="pdf-sig-rule"></div>
                                    <div class="pdf-sig-name">Dr. Robert Taylor</div>
                                    <div class="pdf-sig-title">Dean, College of Computer Studies</div>
                                </div>
                            </div>

                            <div class="pdf-bottom-notice">
                                Master Cumulative Evaluation Matrix • Official CMS Accreditation Record • Ref: ${matrixCode}
                            </div>
                        </div>
                    </div>
                `;
            }

            renderWrapper.innerHTML = templateHtml;

            const opt = {
                margin: [4, 4, 4, 4],
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    letterRendering: true,
                    backgroundColor: '#ffffff',
                    scrollY: 0,
                    scrollX: 0
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: orientation
                },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            await window.html2pdf().set(opt).from(renderWrapper.firstElementChild).save();
            renderWrapper.innerHTML = '';
            showToast(`PDF downloaded: ${filename}`, 'success');
        } catch (err) {
            console.error('Failed to download report PDF:', err);
            showToast('PDF generation issue, opening print dialog...', 'warning');
            if (typeof window.printSummaryReport === 'function') {
                window.printSummaryReport(reportType);
            } else {
                window.print();
            }
        } finally {
            if (btnElement) {
                btnElement.disabled = false;
                btnElement.innerHTML = origHtml;
            }
        }
    };

    // ============================================
    // PRINT REPORT GENERATOR (PHYSICAL PRINTER FALLBACK)
    // ============================================

    window.printSummaryReport = function (reportType) {
        const printBox = document.getElementById('printableReportBox');
        if (!printBox) return;

        const dateStr = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        if (reportType === 'topic-summary') {
            const scores = getFilteredAndSortedTopicScores();
            printBox.innerHTML = `
                <div class="print-report-header">
                    <h2>CMS Learning Management System</h2>
                    <h4>Topic Assessment Summary Report</h4>
                    <p>Course: Content Management Systems (IT 315) • Date Generated: ${dateStr}</p>
                    <p style="margin-top: 0.25rem;">Sorted by: <strong>${summarySort}</strong> • Filter: <strong>${summaryTopicFilter}</strong></p>
                </div>

                <table class="print-table">
                    <thead>
                        <tr>
                            <th>Student Surname, First Name</th>
                            <th>Username</th>
                            <th>Topic Assessment</th>
                            <th>Score</th>
                            <th>Grade %</th>
                            <th>Verdict</th>
                            <th>Completed Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${scores.map(s => `
                            <tr>
                                <td><strong>${escapeHtml(s.lastName)}, ${escapeHtml(s.firstName)}</strong></td>
                                <td>${escapeHtml(s.username)}</td>
                                <td>Topic ${s.topicOrderIndex}: ${escapeHtml(s.topicTitle)}</td>
                                <td>${s.score} / ${s.totalQuestions}</td>
                                <td><strong>${s.percentage}%</strong></td>
                                <td>${s.passed ? 'PASSED' : 'NEEDS RETAKE'}</td>
                                <td>${new Date(s.completedAt).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="print-footer-signatures">
                    <div class="print-sig-block">
                        <div class="print-sig-line"></div>
                        <span>Instructor / Faculty In-Charge</span>
                    </div>
                    <div class="print-sig-block">
                        <div class="print-sig-line"></div>
                        <span>Department Chair / College Dean</span>
                    </div>
                </div>
            `;
        } else if (reportType === 'master-matrix') {
            const matrixList = getFilteredAndSortedMatrix();
            const topics = (rawFacultyMatrix && rawFacultyMatrix.topics) || [];
            printBox.innerHTML = `
                <div class="print-report-header">
                    <h2>CMS Learning Management System</h2>
                    <h4>Summary of ALL Quiz Scores per Student - Master Matrix</h4>
                    <p>Course: Content Management Systems (IT 315) • Date Generated: ${dateStr}</p>
                    <p style="margin-top: 0.25rem;">Sorted by: <strong>${matrixSort}</strong> • Total Enrolled: <strong>${matrixList.length}</strong></p>
                </div>

                <table class="print-table">
                    <thead>
                        <tr>
                            <th>Student (Surname First)</th>
                            ${topics.map(t => `<th>T${t.orderIndex}</th>`).join('')}
                            <th>Passed</th>
                            <th>Average</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${matrixList.map(st => `
                            <tr>
                                <td><strong>${escapeHtml(st.lastName)}, ${escapeHtml(st.firstName)}</strong></td>
                                ${(st.topicResults || []).map(r => `
                                    <td style="text-align: center;">${r.score !== null ? `${r.score}%` : '—'}</td>
                                `).join('')}
                                <td style="text-align: center;"><strong>${st.passedCount}/${st.totalTopics}</strong></td>
                                <td style="text-align: center;"><strong>${st.overallAverage}%</strong></td>
                                <td>${st.isCompleted ? 'COMPLETED' : `TOPIC ${st.passedCount + 1}`}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="print-footer-signatures">
                    <div class="print-sig-block">
                        <div class="print-sig-line"></div>
                        <span>Instructor / Faculty In-Charge</span>
                    </div>
                    <div class="print-sig-block">
                        <div class="print-sig-line"></div>
                        <span>Department Chair / College Dean</span>
                    </div>
                </div>
            `;
        } else if (reportType === 'student-transcript') {
            const user = getCurrentUser();
            printBox.innerHTML = `
                <div class="print-report-header">
                    <h2>CMS Learning Management System</h2>
                    <h4>Student Official Academic Transcript</h4>
                    <p>Student: <strong>${user ? `${user.lastName}, ${user.firstName}` : ''}</strong> (${user ? user.username : ''}) • Date Generated: ${dateStr}</p>
                </div>

                <table class="print-table">
                    <thead>
                        <tr>
                            <th>Topic Assessment</th>
                            <th>Score</th>
                            <th>Grade %</th>
                            <th>Passing Mark</th>
                            <th>Verdict</th>
                            <th>Date Completed</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rawStudentScores.map(s => `
                            <tr>
                                <td>Topic ${s.topicOrderIndex}: ${escapeHtml(s.topicTitle)}</td>
                                <td>${s.score} / ${s.totalQuestions}</td>
                                <td><strong>${s.percentage}%</strong></td>
                                <td>${s.passingScorePercent}%</td>
                                <td>${s.passed ? 'PASSED ✓' : 'FAILED'}</td>
                                <td>${new Date(s.completedAt).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="print-footer-signatures">
                    <div class="print-sig-block">
                        <div class="print-sig-line"></div>
                        <span>Student Signature</span>
                    </div>
                    <div class="print-sig-block">
                        <div class="print-sig-line"></div>
                        <span>Registrar / Faculty Signature</span>
                    </div>
                </div>
            `;
        }

        window.print();
    };

    // ============================================
    // FACULTY QUIZ STUDIO & UPLOADER (FULL CRUD)
    // Requirements: 10 min, max 20 questions, Multiple choice
    // Passing score: 50%, 60%, 75%, 80%, 90%
    // ============================================

    async function ensureSubjectContextLoaded(topicId) {
        try {
            if (!currentSubject || !Array.isArray(currentSubject.topics) || (topicId && !currentSubject.topics.some(t => t.id === topicId))) {
                const subRes = await fetch('/api/subjects?role=faculty', {
                    headers: { 'x-user-role': 'faculty' }
                });
                const subData = await subRes.json();
                const allSubjects = subData.subjects || [];
                if (allSubjects.length > 0) {
                    let matched = null;
                    if (topicId) {
                        matched = allSubjects.find(s => (s.topics || []).some(t => t.id === topicId));
                    }
                    if (!matched && currentSubjectId) {
                        matched = allSubjects.find(s => s.id === currentSubjectId);
                    }
                    currentSubject = matched || allSubjects[0];
                    currentSubjectId = currentSubject.id;
                }
            }
            if (currentSubjectId) {
                const qRes = await fetch(`/api/subjects/${currentSubjectId}/quizzes`);
                if (qRes.ok) {
                    const qData = await qRes.json();
                    currentQuizzes = qData.quizzes || [];
                }
            }
        } catch (err) {
            console.warn('Could not preload subject context:', err);
        }
    }

    function populateQuizModalTopicDropdown(selectedTopicId) {
        const selectEl = document.getElementById('quizModalTopicSelect');
        if (!selectEl || !currentSubject || !Array.isArray(currentSubject.topics)) return;

        selectEl.innerHTML = currentSubject.topics.map(t => {
            const hasQuiz = currentQuizzes.some(q => q.topicId === t.id) || Boolean(t.quiz);
            return `<option value="${t.id}" ${t.id === selectedTopicId ? 'selected' : ''}>Topic #${t.orderIndex}: ${escapeHtml(t.title)} ${hasQuiz ? '(Has Quiz)' : '(No Quiz Yet)'}</option>`;
        }).join('');
        if (selectedTopicId) {
            selectEl.value = selectedTopicId;
        }
    }

    window.handleQuizModalTopicChange = async function (newTopicId) {
        if (!newTopicId) return;
        document.getElementById('quizModalTopicId').value = newTopicId;

        if (currentSubject && Array.isArray(currentSubject.topics)) {
            const t = currentSubject.topics.find(item => item.id === newTopicId);
            if (t && t.subjectId) {
                document.getElementById('quizModalSubjectId').value = t.subjectId;
            }
        }

        const existingQuiz = currentQuizzes.find(q => q.topicId === newTopicId);
        if (existingQuiz) {
            await window.openEditQuizModal(existingQuiz.id);
        } else {
            await window.openCreateQuizModal(newTopicId);
        }
    };

    window.openCreateQuizModal = async function (topicId) {
        await ensureSubjectContextLoaded(topicId);

        const topics = (currentSubject && currentSubject.topics) || [];
        let targetTopicId = topicId;
        if (!targetTopicId && topics.length > 0) {
            const firstWithoutQuiz = topics.find(t => !currentQuizzes.some(q => q.topicId === t.id));
            targetTopicId = firstWithoutQuiz ? firstWithoutQuiz.id : topics[0].id;
        }

        // If the selected topic already has a quiz, open it in Edit mode so CRUD is seamless
        const existingQuiz = currentQuizzes.find(q => q.topicId === targetTopicId);
        if (existingQuiz) {
            return window.openEditQuizModal(existingQuiz.id);
        }

        editingQuizId = existingQuiz ? existingQuiz.id : null;
        const topic = topics.find(t => t.id === targetTopicId) || null;

        populateQuizModalTopicDropdown(targetTopicId);

        const deleteBtn = document.getElementById('quizModalDeleteBtn');
        if (deleteBtn) deleteBtn.style.display = editingQuizId ? 'inline-flex' : 'none';

        document.getElementById('quizModalTitle').textContent = `Create Topic Quiz — ${topic ? `Topic #${topic.orderIndex}: ${topic.title}` : 'New Assessment'}`;
        document.getElementById('quizModalTopicId').value = targetTopicId || '';
        document.getElementById('quizModalSubjectId').value = currentSubjectId || (currentSubject ? currentSubject.id : '');
        document.getElementById('quizTitleInput').value = `${topic ? topic.title : 'Topic'} Quiz Evaluation`;
        document.getElementById('quizDescInput').value = `Comprehensive multiple choice quiz for ${topic ? topic.title : 'this topic'}.`;
        document.getElementById('quizPassingScoreInput').value = '75';
        document.getElementById('quizTimeLimitInput').value = '10';

        // Initialize with 1 clean question with valid initial choices (Max: 20)
        builderQuestions = [
            {
                questionText: `Question 1: What is the primary purpose and architectural concept of ${topic ? topic.title : 'this curriculum lesson'}?`,
                options: [
                    { id: 'opt_1', text: `Primary core framework and architecture of ${topic ? topic.title : 'the lesson'}` },
                    { id: 'opt_2', text: 'Secondary configuration setting' },
                    { id: 'opt_3', text: 'Auxiliary client-side layout rule' },
                    { id: 'opt_4', text: 'Deprecated legacy library component' }
                ],
                correctAnswer: 'opt_1',
                explanation: `Option A encapsulates the fundamental architecture of ${topic ? topic.title : 'the topic'}.`
            }
        ];

        renderBuilderQuestions();
        openModal('quizModal');
    };

    window.openEditQuizModal = async function (quizId) {
        editingQuizId = quizId;
        try {
            const res = await fetch(`/api/quizzes/${quizId}`);
            if (!res.ok) throw new Error('Quiz not found');
            const data = await res.json();
            const q = data.quiz;

            currentSubjectId = q.subjectId || currentSubjectId;
            await ensureSubjectContextLoaded(q.topicId);
            populateQuizModalTopicDropdown(q.topicId);

            const deleteBtn = document.getElementById('quizModalDeleteBtn');
            if (deleteBtn) deleteBtn.style.display = 'inline-flex';

            document.getElementById('quizModalTitle').textContent = `Edit Quiz Studio: ${q.title}`;
            document.getElementById('quizModalTopicId').value = q.topicId;
            document.getElementById('quizModalSubjectId').value = q.subjectId;
            document.getElementById('quizTitleInput').value = q.title;
            document.getElementById('quizDescInput').value = q.description || '';
            document.getElementById('quizPassingScoreInput').value = q.passingScorePercent || 75;
            document.getElementById('quizTimeLimitInput').value = q.timeLimitMinutes || 10;

            builderQuestions = (q.questions || []).map(item => ({
                questionText: item.questionText,
                options: (item.options && item.options.length >= 2) ? item.options.map((o, idx) => ({
                    id: o.id || `opt_${idx + 1}`,
                    text: o.text || ''
                })) : [
                    { id: 'opt_1', text: '' },
                    { id: 'opt_2', text: '' },
                    { id: 'opt_3', text: '' },
                    { id: 'opt_4', text: '' }
                ],
                correctAnswer: item.correctAnswer || 'opt_1',
                explanation: item.explanation || ''
            }));

            renderBuilderQuestions();
            openModal('quizModal');
        } catch (err) {
            console.error('Open edit quiz error:', err);
            showToast('Failed to load quiz for editing', 'error');
        }
    };

    function renderBuilderQuestions() {
        const container = document.getElementById('builderQuestionsList');
        const counter = document.getElementById('builderQuestionCounter');
        const pillsBar = document.getElementById('builderQuestionNavPills');
        if (!container) return;

        const count = builderQuestions.length;
        if (counter) {
            counter.textContent = `Questions: ${count} / 20 (10 min • max 20 MC questions)`;
            counter.style.color = (count < 1 || count > 20) ? 'var(--color-error)' : '#10b981';
        }

        if (pillsBar) {
            pillsBar.innerHTML = builderQuestions.map((q, idx) => {
                const isComplete = Boolean(
                    q.questionText &&
                    q.questionText.trim().length > 0 &&
                    !q.questionText.trim().endsWith(':') &&
                    Array.isArray(q.options) &&
                    q.options.every(o => o.text && o.text.trim().length > 0)
                );
                return `
                    <button type="button" class="builder-q-pill ${isComplete ? 'complete' : 'incomplete'}" onclick="window.scrollToBuilderQuestion(${idx})" title="Jump to Question #${idx + 1} (${isComplete ? 'Complete' : 'Needs text/options'})">
                        Q${idx + 1}
                    </button>`;
            }).join('') + (count < 20 ? `
                <button type="button" class="builder-q-pill add-pill" onclick="window.addBuilderQuestion()" title="Add Question (+1)">
                    + Add
                </button>` : '');
        }

        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

        destroyBuilderTipTapEditors();
        container.innerHTML = builderQuestions.map((q, qIndex) => {
            return `
                <div class="card quiz-builder-q-card" style="margin-bottom: 1rem; padding: 1.25rem; border: 1px solid #e2e8f0; border-radius: 14px;" id="builderQCard-${qIndex}">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.85rem; padding-bottom: 0.65rem; border-bottom: 1px solid #f1f5f9;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="background: #eef2ff; color: #4338ca; font-size: 0.78rem; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 999px; border: 1px solid #c7d2fe;">
                                Question #${qIndex + 1}
                            </span>
                            <span style="font-size: 0.74rem; color: #64748b;">
                                Correct Key: <strong class="builder-correct-key-label" style="color: #059669;">Option ${letters[Math.max(0, q.options.findIndex(o => o.id === q.correctAnswer))] || 'A'}</strong>
                            </span>
                        </div>

                        <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                            <button type="button" class="btn btn-secondary btn-sm" onclick="window.moveBuilderQuestion(${qIndex}, -1)" ${qIndex === 0 ? 'disabled' : ''} title="Move Question Up" style="padding: 0.22rem 0.5rem; font-size: 0.74rem;">
                                ↑
                            </button>
                            <button type="button" class="btn btn-secondary btn-sm" onclick="window.moveBuilderQuestion(${qIndex}, 1)" ${qIndex === builderQuestions.length - 1 ? 'disabled' : ''} title="Move Question Down" style="padding: 0.22rem 0.5rem; font-size: 0.74rem;">
                                ↓
                            </button>
                            <button type="button" class="btn btn-secondary btn-sm" onclick="window.duplicateBuilderQuestion(${qIndex})" title="Duplicate Question" style="padding: 0.22rem 0.55rem; font-size: 0.74rem;">
                                Duplicate
                            </button>
                            ${q.options.length < 6 ? `
                                <button type="button" class="btn btn-secondary btn-sm" onclick="window.addBuilderOption(${qIndex})" title="Add Choice Option" style="padding: 0.22rem 0.55rem; font-size: 0.74rem;">
                                    + Choice
                                </button>` : ''}
                            ${builderQuestions.length > 1 ? `
                                <button type="button" class="btn btn-danger btn-sm" onclick="window.removeBuilderQuestion(${qIndex})" style="padding: 0.22rem 0.55rem; font-size: 0.74rem;">
                                    Delete
                                </button>` : `<span style="font-size: 0.72rem; color: var(--color-text-muted);">(Min 1 Q)</span>`}
                        </div>
                    </div>

                    <div class="form-group quiz-q-editor-section" style="margin-bottom: 0.85rem;">
                        <div class="quiz-q-editor-label">
                            <span>Question Prompt / Stem (TipTap Rich Text)</span>
                            <span style="font-size: 0.68rem; color: #6366f1; font-weight: 600;">Supports Code Snippets, Bold, Lists &amp; Formatting</span>
                        </div>
                        <div class="tiptap-editor-wrapper">
                            <div id="qPromptToolbar-${qIndex}"></div>
                            <div id="qPromptEditor-${qIndex}" style="min-height: 80px;"></div>
                        </div>
                    </div>

                    <div style="font-size: 0.75rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--color-text-muted);">
                        Multiple Choice Options (Select the radio button beside the correct answer):
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.85rem;">
                        ${q.options.map((opt, optIndex) => {
                            const isCorrect = q.correctAnswer === opt.id;
                            return `
                                <div class="builder-opt-row" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.55rem; border-radius: 10px; background: ${isCorrect ? '#ecfdf5' : '#f8fafc'}; border: 1px solid ${isCorrect ? '#6ee7b7' : '#e2e8f0'};">
                                    <label style="display: flex; align-items: center; gap: 0.35rem; font-weight: 800; font-size: 0.8125rem; cursor: pointer; color: ${isCorrect ? '#047857' : '#334155'}; min-width: 44px;">
                                        <input type="radio" name="correctOpt-${qIndex}" value="${opt.id}" ${isCorrect ? 'checked' : ''} onchange="window.updateBuilderCorrect(${qIndex}, '${opt.id}')">
                                        <span>${letters[optIndex] || (optIndex + 1)}:</span>
                                    </label>
                                    <input type="text" class="form-control builder-opt-input" data-opt-index="${optIndex}" style="flex: 1; background: #fff;" placeholder="Choice ${letters[optIndex] || (optIndex + 1)} text..." value="${escapeHtml(opt.text)}" oninput="window.updateBuilderOptText(${qIndex}, ${optIndex}, this.value)" required>
                                    ${q.options.length > 2 ? `
                                        <button type="button" class="btn btn-secondary btn-sm" onclick="window.removeBuilderOption(${qIndex}, ${optIndex})" title="Remove choice" style="padding: 0.2rem 0.45rem; color: #dc2626;">×</button>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <div class="form-group quiz-q-editor-section" style="margin-bottom: 0;">
                        <div class="quiz-q-editor-label">
                            <span>Answer Rationale / Explanation (Shown after submission)</span>
                            <span style="font-size: 0.68rem; color: #64748b;">TipTap Rich Text</span>
                        </div>
                        <div class="tiptap-editor-wrapper">
                            <div id="qExplainToolbar-${qIndex}"></div>
                            <div id="qExplainEditor-${qIndex}" style="min-height: 55px;"></div>
                        </div>
                    </div>
                </div>`;
        }).join('');

        initBuilderTipTapEditors();
    }

    function initBuilderTipTapEditors() {
        if (!window.TipTap || typeof window.TipTap.createTipTapEditor !== 'function') return;

        builderQuestions.forEach((q, qIndex) => {
            const promptEl = document.getElementById(`qPromptEditor-${qIndex}`);
            const promptTb = document.getElementById(`qPromptToolbar-${qIndex}`);
            if (promptEl) {
                if (promptTb) {
                    promptTb.innerHTML = window.TipTap.renderToolbarHtml(`qPromptTbInner-${qIndex}`, { compact: true });
                }
                const promptEd = window.TipTap.createTipTapEditor({
                    element: promptEl,
                    toolbar: document.getElementById(`qPromptTbInner-${qIndex}`) || promptTb,
                    content: q.questionText || '',
                    placeholder: 'Enter question prompt, code snippet, or scenario...',
                    compact: true,
                    onChange: (html) => {
                        if (builderQuestions[qIndex]) {
                            builderQuestions[qIndex].questionText = html;
                        }
                    }
                });
                if (promptEd) builderTipTapEditors.push(promptEd);
            }

            const explainEl = document.getElementById(`qExplainEditor-${qIndex}`);
            const explainTb = document.getElementById(`qExplainToolbar-${qIndex}`);
            if (explainEl) {
                if (explainTb) {
                    explainTb.innerHTML = window.TipTap.renderToolbarHtml(`qExplainTbInner-${qIndex}`, { compact: true });
                }
                const explainEd = window.TipTap.createTipTapEditor({
                    element: explainEl,
                    toolbar: document.getElementById(`qExplainTbInner-${qIndex}`) || explainTb,
                    content: q.explanation || '',
                    placeholder: 'Explain why the correct answer is right...',
                    compact: true,
                    onChange: (html) => {
                        if (builderQuestions[qIndex]) {
                            builderQuestions[qIndex].explanation = html;
                        }
                    }
                });
                if (explainEd) builderTipTapEditors.push(explainEd);
            }
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    window.scrollToBuilderQuestion = function (qIndex) {
        const card = document.getElementById(`builderQCard-${qIndex}`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    window.addBuilderQuestion = function () {
        if (builderQuestions.length >= 20) {
            showToast('Maximum 20 questions reached (max 20 questions allowed)', 'warning');
            return;
        }

        builderQuestions.push({
            questionText: `Question ${builderQuestions.length + 1}: `,
            options: [
                { id: 'opt_1', text: '' },
                { id: 'opt_2', text: '' },
                { id: 'opt_3', text: '' },
                { id: 'opt_4', text: '' }
            ],
            correctAnswer: 'opt_1',
            explanation: ''
        });

        renderBuilderQuestions();
        setTimeout(() => window.scrollToBuilderQuestion(builderQuestions.length - 1), 60);
    };

    window.duplicateBuilderQuestion = function (qIndex) {
        if (builderQuestions.length >= 20) {
            showToast('Maximum 20 questions reached', 'warning');
            return;
        }
        const source = builderQuestions[qIndex];
        if (!source) return;
        const copy = JSON.parse(JSON.stringify(source));
        copy.questionText = `${copy.questionText} (Copy)`;
        builderQuestions.splice(qIndex + 1, 0, copy);
        renderBuilderQuestions();
        showToast(`Duplicated Question #${qIndex + 1}`, 'info');
    };

    window.moveBuilderQuestion = function (qIndex, delta) {
        const targetIndex = qIndex + delta;
        if (targetIndex < 0 || targetIndex >= builderQuestions.length) return;
        const temp = builderQuestions[qIndex];
        builderQuestions[qIndex] = builderQuestions[targetIndex];
        builderQuestions[targetIndex] = temp;
        renderBuilderQuestions();
    };

    window.addBuilderOption = function (qIndex) {
        const q = builderQuestions[qIndex];
        if (!q || q.options.length >= 6) return;
        const nextNum = q.options.length + 1;
        q.options.push({ id: `opt_${Date.now()}_${nextNum}`, text: '' });
        renderBuilderQuestions();
    };

    window.removeBuilderOption = function (qIndex, optIndex) {
        const q = builderQuestions[qIndex];
        if (!q || q.options.length <= 2) {
            showToast('Each question must have at least 2 options', 'warning');
            return;
        }
        const removed = q.options.splice(optIndex, 1)[0];
        if (removed && q.correctAnswer === removed.id) {
            q.correctAnswer = q.options[0].id;
        }
        renderBuilderQuestions();
    };

    window.removeBuilderQuestion = function (index) {
        if (builderQuestions.length <= 1) {
            showToast('Quiz must have at least 1 question', 'warning');
            return;
        }
        builderQuestions.splice(index, 1);
        renderBuilderQuestions();
    };

    window.clearAllBuilderQuestions = function () {
        if (!confirm('Reset the question builder to 1 blank question?')) return;
        builderQuestions = [{
            questionText: 'Question 1: ',
            options: [
                { id: 'opt_1', text: '' },
                { id: 'opt_2', text: '' },
                { id: 'opt_3', text: '' },
                { id: 'opt_4', text: '' }
            ],
            correctAnswer: 'opt_1',
            explanation: ''
        }];
        renderBuilderQuestions();
        showToast('Cleared question list', 'info');
    };

    window.exportBuilderQuizJson = function () {
        const title = document.getElementById('quizTitleInput')?.value?.trim() || 'Topic Quiz';
        const description = document.getElementById('quizDescInput')?.value?.trim() || '';
        const passingScorePercent = Number(document.getElementById('quizPassingScoreInput')?.value) || 75;
        const timeLimitMinutes = Number(document.getElementById('quizTimeLimitInput')?.value) || 10;

        const exportData = {
            title,
            description,
            passingScorePercent,
            timeLimitMinutes,
            exportedAt: new Date().toISOString(),
            questions: builderQuestions
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast('Exported quiz JSON file!', 'success');
    };

    window.updateBuilderQText = function (qIndex, text) {
        if (builderQuestions[qIndex]) builderQuestions[qIndex].questionText = text;
    };

    window.updateBuilderOptText = function (qIndex, optIndex, text) {
        if (builderQuestions[qIndex] && builderQuestions[qIndex].options[optIndex]) {
            builderQuestions[qIndex].options[optIndex].text = text;
        }
    };

    window.updateBuilderCorrect = function (qIndex, optId) {
        if (builderQuestions[qIndex]) {
            builderQuestions[qIndex].correctAnswer = optId;
            const card = document.getElementById(`builderQCard-${qIndex}`);
            if (card) {
                const rows = card.querySelectorAll('.builder-opt-row');
                rows.forEach(row => {
                    const radio = row.querySelector(`input[name="correctOpt-${qIndex}"]`);
                    const isChecked = radio && radio.value === optId;
                    if (radio) radio.checked = isChecked;
                    row.style.background = isChecked ? '#ecfdf5' : '#f8fafc';
                    row.style.borderColor = isChecked ? '#6ee7b7' : '#e2e8f0';
                    const lbl = row.querySelector('label');
                    if (lbl) lbl.style.color = isChecked ? '#047857' : '#334155';
                });
                const keyBadge = card.querySelector('.builder-correct-key-label');
                if (keyBadge) {
                    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                    const optIdx = builderQuestions[qIndex].options.findIndex(o => o.id === optId);
                    keyBadge.textContent = `Option ${letters[Math.max(0, optIdx)] || 'A'}`;
                }
            }
        }
    };

    window.updateBuilderExplanation = function (qIndex, text) {
        if (builderQuestions[qIndex]) builderQuestions[qIndex].explanation = text;
    };

    // READ CRUD: Inspect Quiz Answer Key & Full Question Bank
    window.inspectQuizAnswerKey = async function (quizId) {
        if (!quizId) return;
        try {
            const res = await fetch(`/api/quizzes/${quizId}`);
            if (!res.ok) throw new Error('Failed to load quiz details');
            const data = await res.json();
            const q = data.quiz;

            const titleEl = document.getElementById('quizInspectTitle');
            const subEl = document.getElementById('quizInspectSubtitle');
            const bodyEl = document.getElementById('quizInspectBody');
            const editBtn = document.getElementById('quizInspectEditBtn');
            const previewBtn = document.getElementById('quizInspectPreviewBtn') || document.getElementById('quizInspectSimBtn');

            if (titleEl) titleEl.textContent = q.title || 'Quiz Specification & Answer Key';
            if (subEl) {
                subEl.textContent = `${(q.questions || []).length} Multiple Choice Questions • ${q.timeLimitMinutes || 10} Mins • Passing Score: ${q.passingScorePercent || 75}%`;
            }

            if (editBtn) {
                editBtn.onclick = function () {
                    closeModal('quizInspectModal');
                    window.openEditQuizModal(q.id);
                };
            }
            if (previewBtn) {
                previewBtn.onclick = function () {
                    closeModal('quizInspectModal');
                    window.previewQuiz(q.id);
                };
            }

            const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
            if (bodyEl) {
                bodyEl.innerHTML = `
                    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.25rem; padding: 0.9rem 1.1rem; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                        <div style="flex: 1; min-width: 180px;">
                            <div style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: #64748b;">Assessment Description</div>
                            <div style="font-size: 0.85rem; color: #0f172a; font-weight: 600;">${escapeHtml(q.description || 'Standard topic mastery evaluation.')}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: #64748b;">Anti-Cheating</div>
                            <div style="font-size: 0.82rem; color: #059669; font-weight: 700;">Shuffled Qs & Choices Enabled</div>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 0.85rem;">
                        ${(q.questions || []).map((item, idx) => `
                            <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem 1.15rem; background: #fff;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.65rem;">
                                    <div style="font-weight: 700; color: #0f172a; font-size: 0.92rem;">
                                        <span style="color: #4f46e5; font-weight: 800; margin-right: 0.35rem;">Q${idx + 1}.</span>
                                        ${escapeHtml(item.questionText)}
                                    </div>
                                    <span style="background: #ecfdf5; color: #047857; border: 1px solid #6ee7b7; font-size: 0.72rem; font-weight: 800; padding: 0.2rem 0.55rem; border-radius: 999px; white-space: nowrap;">
                                        Key: ${letters[Math.max(0, (item.options || []).findIndex(o => o.id === item.correctAnswer))] || 'A'}
                                    </span>
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.45rem; margin-bottom: ${item.explanation ? '0.6rem' : '0'};">
                                    ${(item.options || []).map((opt, oIdx) => {
                                        const isCorrect = opt.id === item.correctAnswer;
                                        return `
                                            <div style="padding: 0.45rem 0.7rem; border-radius: 8px; font-size: 0.82rem; background: ${isCorrect ? '#ecfdf5' : '#f8fafc'}; border: 1px solid ${isCorrect ? '#34d399' : '#e2e8f0'}; color: ${isCorrect ? '#065f46' : '#334155'}; font-weight: ${isCorrect ? '700' : '500'};">
                                                <strong>${letters[oIdx] || (oIdx + 1)}.</strong> ${escapeHtml(opt.text)} ${isCorrect ? '✓' : ''}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                                ${item.explanation ? `
                                    <div style="font-size: 0.78rem; color: #475569; background: #f1f5f9; padding: 0.45rem 0.7rem; border-radius: 8px;">
                                        <strong>Rationale:</strong> ${escapeHtml(item.explanation)}
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            openModal('quizInspectModal');
        } catch (err) {
            console.error('Inspect quiz error:', err);
            showToast(err.message || 'Failed to inspect quiz', 'error');
        }
    };

    // Client-side question banks for instant sample quiz generation for PPT topics
    const CLIENT_SAMPLE_QUESTION_BANKS = {
        cms: [
            {
                questionText: 'What does the acronym CMS stand for in digital web development?',
                options: ['Content Management System', 'Centralized Media Server', 'Client Markup Structure', 'Cloud Moderation Service'],
                correctAnswer: 'Content Management System',
                explanation: 'CMS stands for Content Management System, software that allows users to create, manage, and modify website content without coding.'
            },
            {
                questionText: 'Which CMS component provides the graphical user interface where content creators draft and edit content without HTML knowledge?',
                options: ['CMA (Content Management Application)', 'CDA (Content Delivery Application)', 'API Gateway', 'CDN Edge Cache'],
                correctAnswer: 'CMA (Content Management Application)',
                explanation: 'The Content Management Application (CMA) provides the authoring GUI and WYSIWYG editor for non-technical users.'
            },
            {
                questionText: 'What is the primary role of the Content Delivery Application (CDA) in a traditional CMS?',
                options: ['Compiling content, applying templates, and rendering HTML for website visitors', 'Managing user billing and payment gateways', 'Writing scheduled database backup scripts', 'Designing vector logo graphics'],
                correctAnswer: 'Compiling content, applying templates, and rendering HTML for website visitors',
                explanation: 'The CDA handles the backend delivery pipeline, fetching raw content from the database and assembling it with templates for visitors.'
            },
            {
                questionText: 'Which of the following is NOT a stage in the standard CMS Content Lifecycle?',
                options: ['Creation', 'Management & Taxonomy', 'Hardware Soldering', 'Publishing & Delivery'],
                correctAnswer: 'Hardware Soldering',
                explanation: 'Hardware soldering is physical electronics manufacturing, whereas the CMS lifecycle encompasses Creation, Management, Publishing, and Presentation.'
            },
            {
                questionText: 'Prior to modern CMS platforms, how were website content updates conventionally executed?',
                options: ['Manually editing static HTML/CSS files and uploading them via FTP', 'Executing automated container microservices', 'Using voice-controlled neural networks', 'Through decentralized blockchain consensus'],
                correctAnswer: 'Manually editing static HTML/CSS files and uploading them via FTP',
                explanation: 'Early websites relied on webmasters hand-coding static HTML documents and uploading them manually to web servers over FTP.'
            },
            {
                questionText: 'What key organizational advantage does an enterprise CMS provide?',
                options: ['Enables editorial teams to publish content rapidly without requiring software engineers', 'Eliminates the requirement for web servers or domain names', 'Guarantees 100% protection against all internet outages', 'Replaces the server operating system kernel'],
                correctAnswer: 'Enables editorial teams to publish content rapidly without requiring software engineers',
                explanation: 'A CMS decentralizes content publishing across marketing and editorial departments without developer bottlenecks.'
            },
            {
                questionText: 'In a dynamic CMS, where are article body text and metadata persisted prior to page requests?',
                options: ['In a relational database such as MySQL, MariaDB, or SQLite', 'Exclusively on physical magnetic tape', 'Inside the client browser RAM permanently', 'In compiler bytecode on the GPU memory'],
                correctAnswer: 'In a relational database such as MySQL, MariaDB, or SQLite',
                explanation: 'Dynamic CMS platforms store posts, taxonomy, user permissions, and settings in a database management system.'
            },
            {
                questionText: 'What does the acronym WYSIWYG represent in CMS rich-text editors?',
                options: ['What You See Is What You Get', 'Where Your System Is Working Your Goal', 'When You Save It Writes Your Guide', 'Web Yields Standard Internet Web Yields Graphs'],
                correctAnswer: 'What You See Is What You Get',
                explanation: 'WYSIWYG stands for "What You See Is What You Get", providing visual formatting tools that preview the live output.'
            },
            {
                questionText: 'What is the architectural purpose of a "Theme" or "Template" in a CMS?',
                options: ['To separate visual layout and presentation from stored data and content', 'To manage physical CPU cooling fans', 'To replace the database query optimizer', 'To format and partition local hard drives'],
                correctAnswer: 'To separate visual layout and presentation from stored data and content',
                explanation: 'Templates enforce the separation of concerns: design and CSS live in templates, allowing sitewide design changes without modifying stored text.'
            },
            {
                questionText: 'What occurs during the "Publishing" phase of the CMS content workflow?',
                options: ['Approved content is scheduled or made publicly accessible to site visitors', 'The CMS database credentials are wiped', 'All user passwords are automatically reset', 'The website domain registration is auctioned'],
                correctAnswer: 'Approved content is scheduled or made publicly accessible to site visitors',
                explanation: 'Publishing promotes drafted content into production visibility or sets an automated timestamp for release.'
            },
            {
                questionText: 'Why is page and object caching critical in high-traffic dynamic CMS installations?',
                options: ['It avoids repetitive database queries and PHP execution by serving pre-rendered HTML', 'It permanently deletes old database records to free disk space', 'It disables all CSS styling to minimize network bandwidth', 'It encrypts every visitor browser session into a ZIP archive'],
                correctAnswer: 'It avoids repetitive database queries and PHP execution by serving pre-rendered HTML',
                explanation: 'Caching stores assembled HTML or query results in memory (like Redis or Varnish), allowing high traffic loads without database strain.'
            },
            {
                questionText: 'What distinguishes a "Decoupled / Headless" CMS architecture from a "Monolithic" CMS?',
                options: ['The content repository is separated from the presentation layer and accessed via APIs', 'It operates without any database engine whatsoever', 'It only runs on command-line terminal interfaces without CSS', 'It prevents users from uploading any images or videos'],
                correctAnswer: 'The content repository is separated from the presentation layer and accessed via APIs',
                explanation: 'Headless CMS separates backend content management from the frontend UI, delivering content via REST or GraphQL APIs to any device.'
            }
        ],

        wordpress: [
            {
                questionText: 'Which programming language and database engine form the primary foundation of WordPress Core?',
                options: ['PHP and MySQL / MariaDB', 'Ruby and PostgreSQL', 'Python and MongoDB', 'Java and Oracle DB'],
                correctAnswer: 'PHP and MySQL / MariaDB',
                explanation: 'WordPress is built on PHP for server-side logic and uses MySQL or MariaDB to persist content and configuration.'
            },
            {
                questionText: 'What is "The Loop" in WordPress theme and template development?',
                options: ['PHP code that iterates through fetched posts and outputs titles, content, and metadata', 'An endless infinite redirect loop that causes a 508 error', 'The internal cron scheduler for background updates', 'A CSS keyframe animation for spinning loading spinners'],
                correctAnswer: 'PHP code that iterates through fetched posts and outputs titles, content, and metadata',
                explanation: 'The Loop (`while (have_posts()) : the_post();`) is the core mechanism WordPress uses to display posts matching the current query.'
            },
            {
                questionText: 'Which core database table stores pages, posts, attachments, revisions, and custom post types in WordPress?',
                options: ['wp_posts', 'wp_content_items', 'wp_articles', 'wp_documents'],
                correctAnswer: 'wp_posts',
                explanation: 'WordPress stores standard blog posts, static pages, media attachments, navigation items, and custom post types inside `wp_posts`.'
            },
            {
                questionText: 'Where does WordPress store arbitrary custom metadata (key-value pairs) associated with a specific post?',
                options: ['wp_postmeta', 'wp_options', 'wp_metadata_store', 'wp_customfields'],
                correctAnswer: 'wp_postmeta',
                explanation: 'The `wp_postmeta` table links custom metadata keys and values to specific post IDs via foreign key relationships.'
            },
            {
                questionText: 'What is the primary operational difference between a WordPress "Action" and a "Filter"?',
                options: ['Actions execute custom code at specific lifecycle events; Filters modify and return variable data', 'Actions alter database records; Filters delete user accounts', 'Actions only style CSS; Filters only query JavaScript', 'Actions are written in Python; Filters are written in C++'],
                correctAnswer: 'Actions execute custom code at specific lifecycle events; Filters modify and return variable data',
                explanation: 'Actions (`add_action`) trigger side effects when events occur. Filters (`add_filter`) receive data, modify it, and return the modified value.'
            },
            {
                questionText: 'Which template file is the mandatory fallback at the bottom of the WordPress Template Hierarchy?',
                options: ['index.php', 'single.php', 'front-page.php', 'archive.php'],
                correctAnswer: 'index.php',
                explanation: '`index.php` is the most generic template in the WordPress hierarchy. If a more specific template is not found, WordPress falls back to `index.php`.'
            },
            {
                questionText: 'Why should custom features be developed as plugins rather than directly editing WordPress core files?',
                options: ['Core modifications are permanently overwritten and erased whenever WordPress updates', 'Modifying core files consumes double server RAM', 'Core files cannot interpret PHP syntax', 'Core files are encrypted with proprietary hardware keys'],
                correctAnswer: 'Core modifications are permanently overwritten and erased whenever WordPress updates',
                explanation: 'Editing core files breaks update compatibility; updates replace core files, wiping custom code and exposing security vulnerabilities.'
            },
            {
                questionText: 'Which file in a WordPress theme directory is automatically executed to enqueue scripts, styles, and register sidebars?',
                options: ['functions.php', 'header.php', 'bootstrap.php', 'controller.php'],
                correctAnswer: 'functions.php',
                explanation: '`functions.php` acts as a theme-level plugin where developers hook into WordPress lifecycle events, enqueue assets, and register features.'
            },
            {
                questionText: 'What is the role of the `wp-config.php` file in a WordPress installation?',
                options: ['Contains database connection credentials, table prefix, and unique security auth salts', 'Contains the entire graphical layout of the front page', 'Stores user blog posts in plain text format', 'Translates PHP templates into JavaScript code'],
                correctAnswer: 'Contains database connection credentials, table prefix, and unique security auth salts',
                explanation: '`wp-config.php` holds essential environment configurations: database credentials, security keys/salts, debug settings, and table prefixes.'
            },
            {
                questionText: 'What is the purpose of creating a "Child Theme" in WordPress development?',
                options: ['To customize styles and templates while safely receiving parent theme updates', 'To make the website strictly accessible to children under 13', 'To build mobile-only AMP pages', 'To lower database server RAM usage'],
                correctAnswer: 'To customize styles and templates while safely receiving parent theme updates',
                explanation: 'A child theme inherits the functionality and styling of the parent theme, allowing developer changes to persist through parent theme updates.'
            }
        ],

        joomla: [
            {
                questionText: 'Which architectural software design pattern forms the core structural foundation of the Joomla CMS framework?',
                options: ['Model-View-Controller (MVC)', 'Entity-Component-System (ECS)', 'Microkernel Plugin-Only', 'Pipeline and Filter Pattern'],
                correctAnswer: 'Model-View-Controller (MVC)',
                explanation: 'Joomla is built on the classic MVC pattern: Models manage data logic, Views assemble display data, and Controllers handle user requests.'
            },
            {
                questionText: 'In Joomla extension architecture, what is a "Component"?',
                options: ['A major mini-application that renders the primary content body of the requested page', 'A tiny widget that only floats in sidebars', 'A CSS color stylesheet file', 'A hardware cooling sensor'],
                correctAnswer: 'A major mini-application that renders the primary content body of the requested page',
                explanation: 'Components (prefixed with `com_`, like `com_content`) are the most powerful extension type in Joomla, responsible for the primary body area of a page.'
            },
            {
                questionText: 'What is the specific function of a "Module" in Joomla?',
                options: ['A lightweight presentation box displayed around the main component in designated template positions', 'A database migration script runner', 'An operating system kernel extension', 'A domain name registrar tool'],
                correctAnswer: 'A lightweight presentation box displayed around the main component in designated template positions',
                explanation: 'Modules (e.g. login boxes, breadcrumbs, search bars, menus) render peripheral content in specific module positions defined by the template.'
            },
            {
                questionText: 'What type of Joomla extension executes background event hooks, such as user authentication or content filtering?',
                options: ['Plugins', 'Modules', 'Templates', 'Languages'],
                correctAnswer: 'Plugins',
                explanation: 'Joomla plugins are event handlers triggered by system events (e.g., `onContentPrepare`, `onUserLogin`), modifying behavior without changing core code.'
            },
            {
                questionText: 'Which Joomla core component handles articles, categories, and standard editorial publications?',
                options: ['com_content', 'com_articles', 'com_blog', 'com_editorial'],
                correctAnswer: 'com_content',
                explanation: '`com_content` is Joomla\'s native article management component, governing articles, categories, featured items, and blog layouts.'
            },
            {
                questionText: 'How does Joomla define and render custom visual layouts and designated widget placement areas?',
                options: ['Through Templates and defined "Module Positions"', 'Through compiled C++ DLL libraries', 'Through the client browser registry keys', 'Through server DNS SRV records'],
                correctAnswer: 'Through Templates and defined "Module Positions"',
                explanation: 'Joomla templates define the overall HTML/CSS shell and declare named module positions where administrators assign modules.'
            },
            {
                questionText: 'What enterprise security feature in Joomla provides fine-grained permissions across hierarchical user groups?',
                options: ['Access Control List (ACL)', 'Single-Sign-On Registry', 'Biometric Password Hasher', 'Hardware Token Validator'],
                correctAnswer: 'Access Control List (ACL)',
                explanation: 'Joomla\'s native ACL system allows administrators to control exactly what content and administrative tools each user group can view, edit, or publish.'
            },
            {
                questionText: 'How can a Joomla developer customize the HTML output of a core component without modifying core files?',
                options: ['By creating a Template Override inside the template\'s `html/` directory', 'By deleting the component PHP files', 'By modifying MySQL tables directly in binary format', 'By recompiling the Apache web server'],
                correctAnswer: 'By creating a Template Override inside the template\'s `html/` directory',
                explanation: 'Template Overrides allow developers to copy a component or module view into the active template\'s `html/` folder to safely customize layout markup.'
            },
            {
                questionText: 'Which central file stores Joomla\'s global site configuration parameters and database connection details?',
                options: ['configuration.php', 'settings.ini', 'joomla.conf', 'database.json'],
                correctAnswer: 'configuration.php',
                explanation: 'Joomla stores database credentials, mail server settings, caching parameters, and error reporting flags in `configuration.php`.'
            },
            {
                questionText: 'What is the purpose of Joomla\'s built-in Language Overrides system?',
                options: ['Modifying site text strings without editing core language files or code', 'Translating database column names into foreign alphabets', 'Converting PHP into Python syntax', 'Changing the programming language of the database'],
                correctAnswer: 'Modifying site text strings without editing core language files or code',
                explanation: 'Language Overrides allow administrators to change any interface text constant safely from the administration panel.'
            },
            {
                questionText: 'What is the role of the `jinput` object in Joomla framework programming?',
                options: ['Safely inspecting and filtering HTTP GET, POST, and COOKIE request variables', 'Measuring keyboard typing latency', 'Controlling touch screen brightness', 'Simulating mouse clicks for unit testing'],
                correctAnswer: 'Safely inspecting and filtering HTTP GET, POST, and COOKIE request variables',
                explanation: 'JInput provides a secure, sanitized API for retrieving request data, preventing cross-site scripting and unauthorized variable injection.'
            },
            {
                questionText: 'What distinguishes Joomla\'s Menu system from simple website link lists?',
                options: ['Joomla menu items define the routing, active template, modules displayed, and page parameters', 'Joomla menus can only link to external URLs', 'Joomla menus do not support hierarchical sub-menus', 'Joomla menus require flash player to render'],
                correctAnswer: 'Joomla menu items define the routing, active template, modules displayed, and page parameters',
                explanation: 'In Joomla, menu items are central controllers: each item generates a unique ItemID that dictates module assignments, layout parameters, and SEF URLs.'
            }
        ],

        drupal: [
            {
                questionText: 'In Drupal terminology, what is a "Node"?',
                options: ['A discrete piece of content (such as an article, page, or custom entity item)', 'A network router on the local LAN', 'A CPU processor thread', 'A JavaScript browser alert dialog'],
                correctAnswer: 'A discrete piece of content (such as an article, page, or custom entity item)',
                explanation: 'In Drupal, a node is any individual piece of content possessing a title, body, author, publishing status, and unique Node ID (NID).'
            },
            {
                questionText: 'Which powerful core Drupal module provides a graphical query builder for displaying lists, grids, and tables of content without writing SQL?',
                options: ['Views', 'Queries', 'Panels', 'Layouts'],
                correctAnswer: 'Views',
                explanation: 'The Views module is Drupal\'s visual query builder, allowing site builders to query, filter, sort, and render content entities in diverse formats.'
            },
            {
                questionText: 'What is the purpose of Drupal\'s "Taxonomy" system?',
                options: ['Organizing content using Vocabularies and Terms', 'Calculating sales tax on e-commerce transactions', 'Auditing PHP memory leak exceptions', 'Compressing media files into WebP format'],
                correctAnswer: 'Organizing content using Vocabularies and Terms',
                explanation: 'Taxonomy in Drupal allows administrators to create Vocabularies (like "Topic" or "Department") and populate them with hierarchical Terms to categorize nodes.'
            },
            {
                questionText: 'Which modern templating engine was integrated into Drupal 8, replacing raw PHP template files (`.tpl.php`)?',
                options: ['Twig', 'Blade', 'Smarty', 'Handlebars'],
                correctAnswer: 'Twig',
                explanation: 'Drupal transitioned to the Twig templating engine, providing secure, fast, and readable syntax like `{{ content }}` and `{% if %}`.'
            },
            {
                questionText: 'Which prominent enterprise PHP framework provides foundational components (Routing, EventDispatcher, HTTPKernel) for modern Drupal?',
                options: ['Symfony', 'Laravel', 'CodeIgniter', 'Yii Framework'],
                correctAnswer: 'Symfony',
                explanation: 'Modern Drupal (Drupal 8, 9, 10) is built upon robust Symfony PHP components, adhering to modern object-oriented standards.'
            },
            {
                questionText: 'What is the official command-line shell and scripting interface widely used to administer and deploy Drupal sites?',
                options: ['Drush', 'Composer CLI', 'DrupalTerm', 'NodeCLI'],
                correctAnswer: 'Drush',
                explanation: 'Drush (Drupal Shell) is the premier CLI tool for Drupal developers, enabling cache clears (`drush cr`), database updates (`drush updb`), and config exports.'
            },
            {
                questionText: 'How does Drupal\'s Configuration Management System (CMI) facilitate staging and deployment workflows?',
                options: ['It exports site settings, content types, and views into version-controlled YAML files', 'It compiles all website code into a single binary EXE file', 'It streams configuration over live peer-to-peer WebRTC connections', 'It prevents administrators from changing any settings in production'],
                correctAnswer: 'It exports site settings, content types, and views into version-controlled YAML files',
                explanation: 'CMI enables developers to export entire site configurations as YAML files, commit them to Git, and import them seamlessly into production.'
            },
            {
                questionText: 'What is the difference between "Content Entities" and "Configuration Entities" in Drupal?',
                options: ['Content entities store dynamic site data (nodes, users); Configuration entities store administrative settings and views', 'Content entities are written in Python; Configuration entities in Ruby', 'Content entities cannot be deleted; Configuration entities are erased hourly', 'Content entities are stored on client machines; Configuration entities on the server'],
                correctAnswer: 'Content entities store dynamic site data (nodes, users); Configuration entities store administrative settings and views',
                explanation: 'Content entities (nodes, taxonomy terms, custom blocks) represent user data, while Configuration entities represent structural definitions like Views and Content Types.'
            },
            {
                questionText: 'What built-in Drupal module accelerates perceived loading performance by streaming personalized content after cached page shells?',
                options: ['BigPipe', 'SpeedBooster', 'FastHTML', 'StreamCache'],
                correctAnswer: 'BigPipe',
                explanation: 'Drupal\'s BigPipe module sends the main cached page frame immediately to the browser, streaming dynamic/personalized placeholders as they finish rendering.'
            }
        ],

        wix: [
            {
                questionText: 'What hosting and delivery model does Wix operate under?',
                options: ['Software-as-a-Service (SaaS) fully managed cloud platform', 'Self-hosted open source LAMP stack', 'Physical dedicated on-premise hardware only', 'Peer-to-peer decentralized torrent node'],
                correctAnswer: 'Software-as-a-Service (SaaS) fully managed cloud platform',
                explanation: 'Wix is a proprietary SaaS website builder where hosting, security, backups, software updates, and CDN delivery are fully managed by Wix.'
            },
            {
                questionText: 'What visual editing paradigm is Wix renowned for that distinguishes it from traditional flow-based CMS platforms?',
                options: ['Drag-and-drop absolute positioning and visual ADI (Artificial Design Intelligence)', 'Raw markdown file compilation in a terminal', 'Strictly table-based HTML 3.2 coding', 'Voice-only prompt generation without a visual canvas'],
                correctAnswer: 'Drag-and-drop absolute positioning and visual ADI (Artificial Design Intelligence)',
                explanation: 'Wix provides an intuitive WYSIWYG drag-and-drop canvas allowing elements to be placed with pixel precision, alongside ADI automated design.'
            },
            {
                questionText: 'What is "Velo by Wix" (formerly Corvid)?',
                options: ['A full-stack development environment for writing custom JavaScript (front-end and backend) on Wix', 'A 3D virtual reality video player', 'A proprietary operating system for tablets', 'A billing invoice payment calculator'],
                correctAnswer: 'A full-stack development environment for writing custom JavaScript (front-end and backend) on Wix',
                explanation: 'Velo is Wix\'s development platform that lets developers write custom JavaScript APIs, database hooks, and backend web modules on top of Wix.'
            },
            {
                questionText: 'What is a major trade-off or architectural limitation of proprietary SaaS website builders like Wix compared to self-hosted open-source CMS?',
                options: ['Vendor lock-in and the inability to export raw server backend code or database schemas to another host', 'Inability to display digital photographs', 'Zero support for custom domain names', 'Maximum limit of 3 web pages per website'],
                correctAnswer: 'Vendor lock-in and the inability to export raw server backend code or database schemas to another host',
                explanation: 'Because Wix is a closed SaaS ecosystem, users cannot export the underlying backend source code or migrate the database to an independent hosting provider.'
            },
            {
                questionText: 'Where can Wix users discover and install third-party extensions, forms, and marketing integrations?',
                options: ['Wix App Market', 'WordPress Plugin Directory', 'npm Public Registry', 'Google Chrome Web Store'],
                correctAnswer: 'Wix App Market',
                explanation: 'The Wix App Market offers hundreds of vetted integrations, widgets, booking tools, and business applications that plug into Wix sites.'
            },
            {
                questionText: 'In Wix Velo/CMS, what are "Dynamic Pages"?',
                options: ['Single page design templates that dynamically render different content based on items in a database collection', 'Pages that randomly change background colors every second', 'Pages that only display animated GIF images', 'Pages that require users to solve a math puzzle before opening'],
                correctAnswer: 'Single page design templates that dynamically render different content based on items in a database collection',
                explanation: 'Dynamic Pages let developers design a single layout that automatically generates unique URLs and renders content populated from database collection rows.'
            },
            {
                questionText: 'Which built-in Wix feature guides site owners through optimizing meta tags, URL slugs, and indexing with Google Search Console?',
                options: ['Wix SEO Wiz / SEO Setup Checklist', 'Google Rank Booster Pro', 'Search Engine Submitter EXE', 'Robot Validator Tool'],
                correctAnswer: 'Wix SEO Wiz / SEO Setup Checklist',
                explanation: 'Wix SEO Setup Checklist provides step-by-step guidance for setting up page titles, descriptions, canonical URLs, and indexing with Google.'
            },
            {
                questionText: 'How does Wix handle mobile device presentation for sites built in the standard Wix Editor?',
                options: ['It generates a dedicated mobile editor view allowing tailored mobile layout adjustments without breaking desktop design', 'It completely hides the website on smartphones', 'It converts all mobile pages to plain text email', 'It prompts mobile visitors to install a native desktop app'],
                correctAnswer: 'It generates a dedicated mobile editor view allowing tailored mobile layout adjustments without breaking desktop design',
                explanation: 'Wix provides an adaptive Mobile Editor where authors can reorder, resize, or hide elements specifically for mobile screens without affecting desktop.'
            },
            {
                questionText: 'What is the role of Wix Stores within the platform ecosystem?',
                options: ['A native turnkey e-commerce solution for selling physical/digital products with built-in payments and inventory', 'A warehouse for physical shipping pallets', 'An outlet store for second-hand computers', 'A cloud hard drive for video backups'],
                correctAnswer: 'A native turnkey e-commerce solution for selling physical/digital products with built-in payments and inventory',
                explanation: 'Wix Stores provides an integrated e-commerce suite covering product catalogs, payment gateways, tax calculation, and order tracking.'
            },
            {
                questionText: 'How are SSL certificates managed on custom domain websites connected to Wix?',
                options: ['Wix automatically provisions, configures, and renews 256-bit SSL certificates at no extra charge', 'Site owners must manually generate OpenSSL keys in a Linux terminal annually', 'Wix websites do not support HTTPS encrypted traffic', 'Users must purchase physical cryptographic smartcards'],
                correctAnswer: 'Wix automatically provisions, configures, and renews 256-bit SSL certificates at no extra charge',
                explanation: 'Wix automatically provisions and manages TLS/SSL encryption for all domains connected to its platform.'
            },
            {
                questionText: 'What responsive layout engine was introduced in Wix Studio / Editor X to support advanced CSS Grid and Flexbox layouts?',
                options: ['Fluid responsive breakpoints with CSS Grid, Flexbox, and docking', 'Flash ActionScript 3.0 vector engine', 'Direct pixel-only absolute frame tables', 'HTML frameset and iframe nesting'],
                correctAnswer: 'Fluid responsive breakpoints with CSS Grid, Flexbox, and docking',
                explanation: 'Wix Studio / Editor X offers professional design tools utilizing CSS Grid, Flexbox layouts, fluid typography, and custom viewport breakpoints.'
            },
            {
                questionText: 'What security benefit does a managed SaaS builder like Wix provide over unmaintained self-hosted CMS installations?',
                options: ['Server patches, security updates, and vulnerability mitigation are handled automatically without user intervention', 'It makes passwords completely unnecessary for login', 'It prevents users from ever receiving spam emails', 'It encrypts the visitor screen so it cannot be screenshotted'],
                correctAnswer: 'Server patches, security updates, and vulnerability mitigation are handled automatically without user intervention',
                explanation: 'In managed SaaS platforms, the vendor continuously patches server software and core dependencies, eliminating the risk of out-of-date unpatched plugins.'
            }
        ],

        shopify: [
            {
                questionText: 'What open-source templating language did Shopify create to render dynamic storefront data safely in theme files?',
                options: ['Liquid', 'Jinja', 'Handlebars', 'Mustache'],
                correctAnswer: 'Liquid',
                explanation: 'Shopify created the Liquid templating language (now used across many platforms) to safely expose store data inside theme files.'
            },
            {
                questionText: 'In Shopify Liquid syntax, which delimiters are used to output variable content (Objects) to the HTML?',
                options: ['{{ product.title }}', '{% product.title %}', '[[ product.title ]]', '(( product.title ))'],
                correctAnswer: '{{ product.title }}',
                explanation: 'Double curly braces `{{ ... }}` denote Liquid output objects, evaluating and printing dynamic variables directly to the rendered page.'
            },
            {
                questionText: 'In Shopify Liquid syntax, which delimiters denote control flow and logic (Tags like `if`, `for`, `assign`)?',
                options: ['{% for item in cart.items %}', '{{ for item in cart.items }}', '[[ for item in cart.items ]]', '<% for item in cart.items %>'],
                correctAnswer: '{% for item in cart.items %}',
                explanation: 'Curly brace percent delimiters `{% ... %}` represent Liquid logic tags used for loops, conditions, and variable assignments.'
            },
            {
                questionText: 'How are Liquid "Filters" applied to format or manipulate data outputs (e.g. currency formatting)?',
                options: ['Using the pipe character: `{{ product.price | money }}`', 'Using the exclamation mark: `{{ product.price ! money }}`', 'Using the ampersand: `{{ product.price & money }}`', 'Using the hash symbol: `{{ product.price # money }}`'],
                correctAnswer: 'Using the pipe character: `{{ product.price | money }}`',
                explanation: 'Liquid filters are applied from left to right using pipe characters `|`, transforming inputs into formatted currency, dates, or strings.'
            },
            {
                questionText: 'Which security compliance standard does Shopify maintain natively to handle credit card transactions securely?',
                options: ['PCI-DSS Level 1 Compliance', 'ISO 9001 Factory Quality Standard', 'HIPAA Healthcare Record Standard', 'GDPR Cookie Banner Only'],
                correctAnswer: 'PCI-DSS Level 1 Compliance',
                explanation: 'Shopify is certified Level 1 PCI-DSS compliant, adhering to stringent financial security requirements for handling payment card transactions.'
            },
            {
                questionText: 'What is the role of the Shopify Storefront API in modern web architectures?',
                options: ['Enables custom headless commerce frontends (Next.js, mobile apps, kiosks) via GraphQL queries', 'Allows users to edit raw SQL tables directly', 'Replaces credit card processing with cash on delivery only', 'Manages physical shipping truck logistics'],
                correctAnswer: 'Enables custom headless commerce frontends (Next.js, mobile apps, kiosks) via GraphQL queries',
                explanation: 'The Storefront API provides a GraphQL interface, empowering developers to build custom headless frontends powered by Shopify\'s commerce backend.'
            },
            {
                questionText: 'In Shopify theme architecture (Online Store 2.0), what file format defines customizable sections across templates?',
                options: ['JSON templates (`templates/*.json`)', 'XML schemas (`templates/*.xml`)', 'Plain text CSV (`templates/*.csv`)', 'Compiled binary C++ files'],
                correctAnswer: 'JSON templates (`templates/*.json`)',
                explanation: 'Online Store 2.0 uses JSON templates to store section configurations, allowing merchants to add and reorder sections on any page.'
            },
            {
                questionText: 'What mechanism does Shopify provide to inform external systems (like fulfillment warehouses) when an order is created?',
                options: ['Webhooks (HTTP POST event notifications)', 'Printed physical postal letters', 'Dial-up telephone voice calls', 'Manual copy-pasting from email notifications'],
                correctAnswer: 'Webhooks (HTTP POST event notifications)',
                explanation: 'Shopify Webhooks send automated JSON HTTP POST payloads to external endpoints whenever specific events (like `orders/create`) occur.'
            },
            {
                questionText: 'What is the hierarchy relationship between a Shopify "Product" and its "Variants"?',
                options: ['A product represents the general item (e.g. T-Shirt); variants represent specific options (e.g. Small / Red) with distinct SKUs and prices', 'Variants are separate websites; products are blog articles', 'Products are customer reviews; variants are store discounts', 'There is no difference; they are identical synonyms'],
                correctAnswer: 'A product represents the general item (e.g. T-Shirt); variants represent specific options (e.g. Small / Red) with distinct SKUs and prices',
                explanation: 'A product serves as the overarching catalog container, while variants define specific combinations of options with separate inventory and SKUs.'
            },
            {
                questionText: 'What is the purpose of Shopify App Bridge in app development?',
                options: ['A JavaScript library that embeds third-party app interfaces seamlessly inside the Shopify admin dashboard', 'A physical bridge that connects Shopify servers to internet providers', 'An algorithm that changes product prices based on weather', 'A tool that automatically deletes slow-selling inventory'],
                correctAnswer: 'A JavaScript library that embeds third-party app interfaces seamlessly inside the Shopify admin dashboard',
                explanation: 'Shopify App Bridge provides communication between embedded apps and the Shopify admin, ensuring a native UI feel and unified navigation.'
            }
        ],

        magento: [
            {
                questionText: 'What enterprise software corporation acquired the Magento platform in 2018, rebranding its enterprise cloud solution as Adobe Commerce?',
                options: ['Adobe', 'Oracle', 'Microsoft', 'Salesforce'],
                correctAnswer: 'Adobe',
                explanation: 'Adobe acquired Magento for $1.68 billion in 2018, integrating it into the Adobe Experience Cloud ecosystem as Adobe Commerce.'
            },
            {
                questionText: 'What database architecture pattern does Magento utilize to support infinite dynamic attributes for diverse catalog products?',
                options: ['Entity-Attribute-Value (EAV)', 'Document Key-Value Cache only', 'Single Flat Table with fixed columns', 'Graph Neural Network Matrix'],
                correctAnswer: 'Entity-Attribute-Value (EAV)',
                explanation: 'Magento uses the EAV model: entities (products) have dynamic attributes stored across value tables, allowing unlimited custom attributes.'
            },
            {
                questionText: 'What command-line tool is fundamental to compiling dependency injection, deploying static view files, and re-indexing Magento 2?',
                options: ['bin/magento', 'magento-cli', 'drush', 'artisan'],
                correctAnswer: 'bin/magento',
                explanation: '`bin/magento` is the official CLI tool in Magento 2, executing crucial tasks like `setup:upgrade`, `setup:di:compile`, and `indexer:reindex`.'
            },
            {
                questionText: 'Why is Indexing critical in Magento\'s catalog performance management?',
                options: ['It flattens complex EAV data into optimized lookup tables to accelerate frontend catalog queries', 'It alphabetically sorts product titles in the admin panel', 'It compresses product images into vector graphics', 'It translates product names into different languages'],
                correctAnswer: 'It flattens complex EAV data into optimized lookup tables to accelerate frontend catalog queries',
                explanation: 'Because querying multi-table EAV models is computationally intensive, indexers pre-calculate catalog data into flat index tables for rapid storefront retrieval.'
            },
            {
                questionText: 'Which high-performance HTTP reverse-proxy caching software is recommended and officially supported by Magento for Full Page Caching?',
                options: ['Varnish Cache', 'Apache Tomcat', 'Squid Proxy', 'Memcached CLI'],
                correctAnswer: 'Varnish Cache',
                explanation: 'Magento provides native VCL configurations for Varnish Cache, enabling lightning-fast full page cache delivery directly from RAM.'
            },
            {
                questionText: 'What is the correct multi-tier organizational hierarchy in Magento multi-store architecture?',
                options: ['Global > Website > Store > Store View', 'Website > Global > Store View > Store', 'Store View > Store > Website > Global', 'Store > Website > Global > Store View'],
                correctAnswer: 'Global > Website > Store > Store View',
                explanation: 'Magento structures multi-tenancy as: Global (system-wide) > Website (customer/order scope) > Store (catalog/category scope) > Store View (language/currency display).'
            },
            {
                questionText: 'In Magento 2 extension development, what feature allows developers to intercept and modify public method execution (before, around, after)?',
                options: ['Plugins (Interceptors)', 'Event Listeners only', 'Class Inheritance overrides only', 'Direct PHP monkey patching'],
                correctAnswer: 'Plugins (Interceptors)',
                explanation: 'Magento 2 Plugins allow developers to hook into any public method on any class, executing code before, after, or around the target method.'
            },
            {
                questionText: 'What configuration file in Magento modules specifies Dependency Injection rules, preferences, and plugin interceptors?',
                options: ['etc/di.xml', 'etc/config.xml', 'etc/module.xml', 'etc/routes.xml'],
                correctAnswer: 'etc/di.xml',
                explanation: '`etc/di.xml` configures object manager dependencies, class preferences, parameter injections, and plugin interceptor declarations.'
            },
            {
                questionText: 'Which search engine technology is a mandatory core requirement for catalog search and layered navigation in Magento 2.4+?',
                options: ['Elasticsearch / OpenSearch', 'MySQL Fulltext Search only', 'Apache Solr only', 'SQLite MATCH FTS5'],
                correctAnswer: 'Elasticsearch / OpenSearch',
                explanation: 'Starting in Magento 2.4, Elasticsearch or OpenSearch is a mandatory requirement for catalog search and layered navigation filters.'
            },
            {
                questionText: 'How are visual layouts constructed and blocks declared in Magento 2 themes?',
                options: ['Through XML layout handle declarations (`view/frontend/layout/*.xml`) referencing PHTML templates', 'Through raw HTML files placed in the public root folder', 'Through JSON schema files compiled by Webpack only', 'Through Microsoft Access MDB database forms'],
                correctAnswer: 'Through XML layout handle declarations (`view/frontend/layout/*.xml`) referencing PHTML templates',
                explanation: 'Magento 2 uses declarative XML layout files to position blocks and containers, rendering presentation markup via `.phtml` PHP templates.'
            },
            {
                questionText: 'What package manager does Magento utilize to manage modules, dependencies, and core system upgrades?',
                options: ['Composer', 'npm', 'Pip', 'RubyGems'],
                correctAnswer: 'Composer',
                explanation: 'Magento relies entirely on Composer to declare, install, and manage core libraries and third-party extensions.'
            },
            {
                questionText: 'What is the primary difference between a "Simple Product" and a "Configurable Product" in Magento?',
                options: ['A configurable product presents options (size/color) that map to individual child simple products with independent stock', 'A simple product cannot have a price; a configurable product can', 'A simple product only sells digital downloads; a configurable sells physical goods', 'A configurable product does not require a database record'],
                correctAnswer: 'A configurable product presents options (size/color) that map to individual child simple products with independent stock',
                explanation: 'A Configurable product is a parent container with drop-down attributes (like Size and Color), where each combination maps to a discrete Simple Product with its own SKU and inventory.'
            }
        ]
    };

    function shuffleClientArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function generateClientSampleQuiz(topicKeyOrTitle, topicTitle = 'Lesson') {
        const normalized = (topicKeyOrTitle || topicTitle || '').toLowerCase().trim();
        let key = 'cms';
        if (normalized.includes('word') || normalized.includes('wp')) key = 'wordpress';
        else if (normalized.includes('joom')) key = 'joomla';
        else if (normalized.includes('drup')) key = 'drupal';
        else if (normalized.includes('wix')) key = 'wix';
        else if (normalized.includes('shop')) key = 'shopify';
        else if (normalized.includes('magent') || normalized.includes('adobe')) key = 'magento';
        else if (normalized.includes('cms') || normalized.includes('fund')) key = 'cms';

        const bank = CLIENT_SAMPLE_QUESTION_BANKS[key] || CLIENT_SAMPLE_QUESTION_BANKS.cms;
        const minCount = Math.min(7, bank.length);
        const maxCount = Math.min(14, bank.length);
        const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;

        const picked = shuffleClientArray(bank).slice(0, count);

        const questions = picked.map((q, idx) => {
            const shuffledOpts = shuffleClientArray(q.options);
            const optionsWithIds = shuffledOpts.map((optText, oIdx) => ({
                id: `opt_${oIdx + 1}`,
                text: optText
            }));
            const correctMatch = optionsWithIds.find(o => o.text.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase());
            const correctId = correctMatch ? correctMatch.id : 'opt_1';

            return {
                id: `q_sample_${Date.now()}_${idx + 1}`,
                questionText: q.questionText,
                options: optionsWithIds,
                correctAnswer: correctId,
                explanation: q.explanation || `Correct answer is: ${q.correctAnswer}`
            };
        });

        return {
            title: `${topicTitle} Assessment`,
            timeLimitMinutes: Math.max(10, Math.ceil(count * 1.5)),
            passingScorePercent: 75,
            questions
        };
    }

    // Auto-fill questions for faculty testing with randomized count and PPT alignment
    window.autoFillTopicQuestions = async function () {
        const topicSelectEl = document.getElementById('quizModalTopicSelect');
        const topicId = (topicSelectEl && topicSelectEl.value) ? topicSelectEl.value : document.getElementById('quizModalTopicId')?.value;
        const topic = currentSubject && currentSubject.topics ? currentSubject.topics.find(t => t.id === topicId) : null;
        const topicTitle = topic ? topic.title : 'Lesson';
        const topicKey = topic ? (topic.presentationKey || topic.title || '') : '';

        try {
            // First attempt to fetch from backend API for fresh randomized sample quiz
            if (topicId) {
                const res = await fetch(`/api/quizzes/sample/${topicId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data.questions) && data.questions.length > 0) {
                        builderQuestions = data.questions.map(q => ({
                            questionText: q.questionText,
                            options: q.options.map(opt => ({ id: opt.id, text: opt.text })),
                            correctAnswer: q.correctAnswer,
                            explanation: q.explanation || ''
                        }));
                        if (data.title && document.getElementById('quizTitleInput')) {
                            document.getElementById('quizTitleInput').value = data.title;
                        }
                        if (data.timeLimitMinutes && document.getElementById('quizTimeLimitInput')) {
                            document.getElementById('quizTimeLimitInput').value = String(data.timeLimitMinutes);
                        }
                        renderBuilderQuestions();
                        showToast(`✓ Auto-filled ${builderQuestions.length} randomized sample questions from ${data.topicTitle || topicTitle} PPT!`, 'success');
                        return;
                    }
                }
            }
        } catch (err) {
            console.warn('API sample quiz fetch fallback:', err.message);
        }

        // Client-side fallback if offline or API unavailable
        const clientSample = generateClientSampleQuiz(topicKey, topicTitle);
        builderQuestions = clientSample.questions;
        if (document.getElementById('quizTitleInput')) {
            document.getElementById('quizTitleInput').value = clientSample.title;
        }
        if (document.getElementById('quizTimeLimitInput')) {
            document.getElementById('quizTimeLimitInput').value = String(clientSample.timeLimitMinutes);
        }
        renderBuilderQuestions();
        showToast(`✓ Auto-filled ${builderQuestions.length} randomized sample questions from ${topicTitle} PPT!`, 'success');
    };

    window.openCreateSampleQuizForTopic = async function (topicId) {
        await window.openCreateQuizModal(topicId);
        await window.autoFillTopicQuestions();
    };

    // ============================================
    // WHITEBOARD ITEM #5: INSERT TEXT QUIZ PARSER
    // ============================================

    window.openInsertTextQuizModal = function () {
        const feedback = document.getElementById('insertTextQuizFeedback');
        if (feedback) feedback.style.display = 'none';
        openModal('insertTextQuizModal');
    };

    window.insertSampleQuizText = function () {
        const input = document.getElementById('insertTextQuizInput');
        if (!input) return;
        input.value = `1. What does CMS stand for?
A. Content Management System
B. Computer Monitoring Service
C. Centralized Media Storage
D. Core Module Structure
Answer: A
Explanation: CMS allows non-technical users to build and edit web content.

2. Which open-source CMS uses WordPress hooks, actions, and filters?
A. WordPress
B. Drupal
C. Magento
D. Joomla
Answer: A
Explanation: WordPress core architecture relies on an extensive hook and filter pipeline.

3. What framework does modern Drupal 8/9/10 utilize?
A. Symfony PHP components
B. Ruby on Rails
C. Django
D. Express JS
Answer: A
Explanation: Drupal 8+ transitioned to Symfony components for enterprise PHP architecture.

4. Which CMS platform is designed primarily for hosted e-commerce?
A. Shopify
B. Joomla
C. WordPress Core
D. phpBB
Answer: A
Explanation: Shopify is a dedicated e-commerce SaaS CMS.

5. What is the key advantage of a Headless CMS?
A. Decoupled frontend presentation from backend content repository
B. No database is required
C. Cannot use APIs
D. Only works on Windows desktop
Answer: A
Explanation: Headless CMS delivers content via REST or GraphQL APIs to any frontend framework.`;
    };

    function parseRawTextQuestions(rawText) {
        const parsed = [];
        const blocks = rawText.split(/\n\s*(?=(?:(?:Question\s*\d+|Q\d+|\d+)[\.\:\)]|\bQ\d+\b))/i);

        for (let block of blocks) {
            block = block.trim();
            if (!block) continue;

            const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            if (lines.length < 2) continue;

            let qText = '';
            const options = [];
            let correctAnswer = 'opt_1';
            let explanation = '';

            for (const line of lines) {
                const ansMatch = line.match(/^(?:Answer|Ans|Correct(?:\s*Answer)?)\s*[:\-\=]\s*([A-D1-4])/i);
                if (ansMatch) {
                    const letter = ansMatch[1].toUpperCase();
                    if (letter === 'A' || letter === '1') correctAnswer = 'opt_1';
                    else if (letter === 'B' || letter === '2') correctAnswer = 'opt_2';
                    else if (letter === 'C' || letter === '3') correctAnswer = 'opt_3';
                    else if (letter === 'D' || letter === '4') correctAnswer = 'opt_4';
                    continue;
                }

                const expMatch = line.match(/^(?:Explanation|Rationale|Note)\s*[:\-\=]\s*(.+)/i);
                if (expMatch) {
                    explanation = expMatch[1].trim();
                    continue;
                }

                const optMatch = line.match(/^(?:\*?\s*[\(\[]?([A-D1-4])[\.\)\:\-\]]?\s+)(.+)/i);
                if (optMatch) {
                    const optLetter = optMatch[1].toUpperCase();
                    const optText = optMatch[2].trim();
                    let optId = 'opt_' + (options.length + 1);
                    if (optLetter === 'A' || optLetter === '1') optId = 'opt_1';
                    else if (optLetter === 'B' || optLetter === '2') optId = 'opt_2';
                    else if (optLetter === 'C' || optLetter === '3') optId = 'opt_3';
                    else if (optLetter === 'D' || optLetter === '4') optId = 'opt_4';

                    if (line.startsWith('*')) {
                        correctAnswer = optId;
                    }

                    options.push({ id: optId, text: optText });
                    continue;
                }

                if (options.length === 0) {
                    const clean = line.replace(/^(?:Question\s*\d+|Q\d+|\d+)[\.\:\)]\s*/i, '');
                    qText = qText ? `${qText} ${clean}` : clean;
                }
            }

            if (qText && options.length >= 2) {
                while (options.length < 4) {
                    options.push({ id: `opt_${options.length + 1}`, text: `Alternative choice ${options.length + 1}` });
                }
                parsed.push({
                    questionText: qText,
                    options: options.slice(0, 4),
                    correctAnswer,
                    explanation
                });
            }
        }

        return parsed;
    }

    window.parseAndAddTextQuiz = function () {
        const input = document.getElementById('insertTextQuizInput');
        const feedback = document.getElementById('insertTextQuizFeedback');
        if (!input) return;

        const rawText = input.value.trim();
        if (!rawText) {
            showToast('Please paste quiz text into the field', 'warning');
            return;
        }

        const parsed = parseRawTextQuestions(rawText);
        if (parsed.length === 0) {
            if (feedback) {
                feedback.style.display = 'block';
                feedback.style.background = '#fef2f2';
                feedback.style.border = '1px solid #fca5a5';
                feedback.style.color = '#991b1b';
                feedback.innerHTML = '<strong>Parsing Error:</strong> Could not detect questions. Please ensure each question has options (A, B, C, D) and an "Answer: [Letter]" designation.';
            }
            return;
        }

        if (parsed.length > 20) {
            showToast(`Note: Maximum 20 questions allowed. Keeping first 20 out of ${parsed.length}.`, 'info');
            parsed.splice(20);
        }

        builderQuestions = parsed;
        renderBuilderQuestions();
        closeModal('insertTextQuizModal');
        showToast(`Successfully inserted ${parsed.length} questions from text!`, 'success');
    };

    window.saveQuizFromBuilder = async function () {
        const topicSelectEl = document.getElementById('quizModalTopicSelect');
        const topicId = (topicSelectEl && topicSelectEl.value) ? topicSelectEl.value : document.getElementById('quizModalTopicId').value;
        const subjectId = document.getElementById('quizModalSubjectId').value || currentSubjectId;
        const title = document.getElementById('quizTitleInput').value.trim();
        const description = document.getElementById('quizDescInput').value.trim();
        const passingScorePercent = Number(document.getElementById('quizPassingScoreInput').value) || 75;
        const timeLimitMinutes = Number(document.getElementById('quizTimeLimitInput').value) || 10;

        const saveBtn = document.querySelector('#quizModal .modal-footer .btn-primary');
        const originalBtnHtml = saveBtn ? saveBtn.innerHTML : '';

        if (!topicId) {
            showToast('Please select a curriculum topic for this quiz', 'warning');
            return;
        }

        if (!title) {
            showToast('Please enter a quiz title', 'warning');
            return;
        }

        // 1. Synchronize option input values directly from DOM
        builderQuestions.forEach((q, qIndex) => {
            const cardEl = document.getElementById(`builderQCard-${qIndex}`);
            if (cardEl) {
                const optInputs = cardEl.querySelectorAll('input.builder-opt-input, input[type="text"]');
                optInputs.forEach((inputEl, optIdx) => {
                    if (q.options[optIdx]) {
                        q.options[optIdx].text = inputEl.value.trim();
                    }
                });
            }
        });

        // 2. Synchronize rich content from active TipTap editors
        if (Array.isArray(builderTipTapEditors)) {
            builderQuestions.forEach((q, qIndex) => {
                const promptEl = document.getElementById(`qPromptEditor-${qIndex}`);
                if (promptEl) {
                    const promptEd = builderTipTapEditors.find(ed => ed && (
                        (ed.options && ed.options.element === promptEl) ||
                        (ed.view && ed.view.dom && promptEl.contains(ed.view.dom))
                    ));
                    if (promptEd && typeof promptEd.getHTML === 'function') {
                        const html = promptEd.getHTML();
                        if (html && html !== '<p></p>' && html !== '<p><br></p>') {
                            q.questionText = html;
                        }
                    }
                }
                const explainEl = document.getElementById(`qExplainEditor-${qIndex}`);
                if (explainEl) {
                    const explainEd = builderTipTapEditors.find(ed => ed && (
                        (ed.options && ed.options.element === explainEl) ||
                        (ed.view && ed.view.dom && explainEl.contains(ed.view.dom))
                    ));
                    if (explainEd && typeof explainEd.getHTML === 'function') {
                        const html = explainEd.getHTML();
                        if (html && html !== '<p></p>' && html !== '<p><br></p>') {
                            q.explanation = html;
                        }
                    }
                }
            });
        }

        // 3. Auto-prune blank questions at the end
        while (builderQuestions.length > 1) {
            const last = builderQuestions[builderQuestions.length - 1];
            const cleanStem = (last.questionText || '').replace(/<[^>]*>/g, '').trim();
            const hasOptionText = Array.isArray(last.options) && last.options.some(o => o.text && o.text.trim().length > 0);
            const isDefaultStem = /^Question\s+\d+\s*:\s*$/i.test(cleanStem);
            if ((!cleanStem || isDefaultStem) && !hasOptionText) {
                builderQuestions.pop();
            } else {
                break;
            }
        }

        if (builderQuestions.length < 1 || builderQuestions.length > 20) {
            showToast(`Quiz can have between 1 and 20 questions. Currently: ${builderQuestions.length}`, 'error');
            return;
        }

        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
        for (let i = 0; i < builderQuestions.length; i++) {
            const q = builderQuestions[i];
            const cleanStem = (q.questionText || '').replace(/<[^>]*>/g, '').trim();
            const hasMedia = /<img|<svg|<video|<audio/i.test(q.questionText || '');
            if (!cleanStem && !hasMedia && (!q.questionText || !q.questionText.trim())) {
                showToast(`Please enter question text for Question #${i + 1}`, 'warning');
                window.scrollToBuilderQuestion(i);
                return;
            }
            if (!Array.isArray(q.options) || q.options.length < 2) {
                showToast(`Question #${i + 1} must have at least 2 multiple-choice options`, 'warning');
                window.scrollToBuilderQuestion(i);
                return;
            }
            for (let j = 0; j < q.options.length; j++) {
                if (!q.options[j].text || !q.options[j].text.trim()) {
                    showToast(`Please enter text for Question #${i + 1}, Choice ${letters[j] || (j + 1)}`, 'warning');
                    window.scrollToBuilderQuestion(i);
                    return;
                }
            }
            if (!q.correctAnswer || !q.options.some(o => o.id === q.correctAnswer)) {
                q.correctAnswer = q.options[0].id;
            }
        }

        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: spin 1s linear infinite;">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"/>
                </svg>
                <span>Saving Quiz...</span>`;
        }

        const user = getCurrentUser();
        const payload = {
            topicId,
            subjectId,
            title,
            description,
            passingScorePercent,
            timeLimitMinutes,
            shuffleChoices: true,
            createdBy: user ? user.id : null,
            questions: builderQuestions
        };

        try {
            const url = editingQuizId ? `/api/quizzes/${editingQuizId}` : '/api/quizzes';
            const method = editingQuizId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-role': user ? user.role : 'faculty',
                    'x-user-id': user ? user.id : ''
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to save quiz');
            }

            showToast(editingQuizId ? '✓ Quiz assessment updated successfully!' : '✓ Quiz assessment created successfully!', 'success');
            closeModal('quizModal');

            // Refresh Quizzes and Subject views
            const targetSubjectId = currentSubjectId || subjectId;
            await loadQuizzesForSubject(targetSubjectId);
            if (typeof window.refreshCurrentSubjectAfterSave === 'function') {
                await window.refreshCurrentSubjectAfterSave();
            }
            if (typeof window.fetchSubjectDetails === 'function' && targetSubjectId) {
                await window.fetchSubjectDetails(targetSubjectId);
            }
            if (typeof window.renderTOC === 'function') {
                window.renderTOC();
            }
            if (typeof window.loadDashboardData === 'function') {
                window.loadDashboardData();
            }
        } catch (err) {
            console.error('Save quiz error:', err);
            showToast(err.message, 'error');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalBtnHtml;
            }
        }
    };

    window.deleteQuizFromBuilderModal = async function () {
        if (!editingQuizId) return;
        await window.deleteQuizConfirm(editingQuizId);
        closeModal('quizModal');
    };

    window.deleteQuizConfirm = async function (quizId) {
        if (!confirm('Are you sure you want to delete this quiz? All student records for this quiz will be permanently removed.')) {
            return;
        }

        try {
            const res = await fetch(`/api/quizzes/${quizId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete quiz');
            showToast('Quiz deleted successfully', 'success');
            await loadQuizzesForSubject(currentSubjectId);
            if (typeof window.refreshCurrentSubjectAfterSave === 'function') {
                window.refreshCurrentSubjectAfterSave();
            }
        } catch (err) {
            console.error('Delete quiz error:', err);
            showToast(err.message, 'error');
        }
    };

    // ============================================
    // UPLOAD QUIZ FROM COMPUTER (.json / .csv)
    // ============================================

    window.openQuizUploadModal = function () {
        openModal('quizUploadModal');
    };

    window.handleQuizFileUpload = async function (file) {
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const statusBox = document.getElementById('quizUploadStatus');
            if (statusBox) {
                statusBox.style.display = 'block';
                statusBox.textContent = `Uploading and parsing ${file.name}...`;
            }

            const res = await fetch('/api/quizzes/upload', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to upload quiz');

            await ensureSubjectContextLoaded();
            showToast(data.message, 'success');
            closeModal('quizUploadModal');

            const topics = (currentSubject && currentSubject.topics) || [];
            const currentTopicVal = document.getElementById('quizModalTopicId')?.value;
            const targetTopicId = currentTopicVal || (topics[0] ? topics[0].id : '');
            const existingForTopic = currentQuizzes.find(q => q.topicId === targetTopicId);
            editingQuizId = existingForTopic ? existingForTopic.id : null;
            const deleteBtn = document.getElementById('quizModalDeleteBtn');
            if (deleteBtn) deleteBtn.style.display = editingQuizId ? 'inline-flex' : 'none';

            populateQuizModalTopicDropdown(targetTopicId);
            if (document.getElementById('quizModalTopicId')) {
                document.getElementById('quizModalTopicId').value = targetTopicId;
            }
            if (document.getElementById('quizModalSubjectId') && currentSubjectId) {
                document.getElementById('quizModalSubjectId').value = currentSubjectId;
            }

            builderQuestions = data.questions.map(q => ({
                questionText: q.questionText,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation || ''
            }));

            if (data.metadata) {
                if (data.metadata.title) document.getElementById('quizTitleInput').value = data.metadata.title;
                if (data.metadata.passingScorePercent) document.getElementById('quizPassingScoreInput').value = data.metadata.passingScorePercent;
                if (data.metadata.timeLimitMinutes) document.getElementById('quizTimeLimitInput').value = data.metadata.timeLimitMinutes;
            }

            renderBuilderQuestions();
            openModal('quizModal');
        } catch (err) {
            console.error('Quiz upload error:', err);
            showToast(err.message, 'error');
            const statusBox = document.getElementById('quizUploadStatus');
            if (statusBox) {
                statusBox.textContent = `Error: ${err.message}`;
            }
        }
    };

    // ============================================
    // TOPIC PRESENTATION HELPER
    // ============================================
    window.openSlideCreatorModal = function (topicId) {
        if (typeof window.openEditTopicModal === 'function') {
            window.openEditTopicModal(topicId);
        }
    };

    // ============================================
    // LOCKED TOPIC INTERCEPTOR
    // ============================================
    window.showTopicLockModal = function (topicNumber) {
        const modal = document.getElementById('lockedTopicModal');
        const desc = document.getElementById('lockedTopicModalDesc');
        const actionBtn = document.getElementById('lockedTopicModalBtn');

        const prevNum = Math.max(1, topicNumber - 1);
        if (desc) {
            desc.innerHTML = `
                <p>Topic <strong>#${topicNumber}</strong> is currently locked.</p>
                <p style="margin-top: 0.5rem; color: var(--color-text-muted);">
                    According to the sequential progression requirement, you must first achieve a passing grade on the quiz for <strong>Topic #${prevNum}</strong> to unlock this lesson.
                </p>`;
        }

        if (actionBtn) {
            actionBtn.onclick = function () {
                closeModal('lockedTopicModal');
                window.navigateTo('quizzes');
            };
        }

        openModal('lockedTopicModal');
    };

    // ============================================
    // RETAKE PERMISSION MODAL INTERCEPTOR
    // ============================================
    window.showRetakeLockedNoticeModal = function (customMessage) {
        const desc = document.getElementById('retakeLockedModalDesc');
        if (desc && customMessage) {
            desc.innerHTML = `
                <p><strong>${escapeHtml(customMessage)}</strong></p>
                <p style="margin-top: 0.5rem; color: #64748b; font-size: 0.85rem;">
                    Quizzes are one-time assessments by default. Please contact your professor to authorize a retake in the Faculty Gradebook.
                </p>`;
        } else if (desc) {
            desc.innerHTML = `
                <p>Quizzes can only be taken once by default.</p>
                <p style="margin-top: 0.5rem; color: #64748b; font-size: 0.85rem;">
                    To retake this assessment, you must obtain permission from your professor. Once authorized, the retake button will unlock automatically.
                </p>`;
        }
        openModal('retakeLockedModal');
    };

    window.showRetakeLockedNotice = function (quizTitle, score) {
        window.showRetakeLockedNoticeModal(`Previous attempt score: ${score}%. Quizzes are single-attempt by default.`);
    };

    window.startQuizFromTopic = function (topicId, quizId) {
        if (quizId) {
            window.startQuizAttempt(quizId);
        } else {
            window.navigateTo('quizzes');
        }
    };

    // Global Modal Helpers
    function openModal(id) {
        const m = document.getElementById(id);
        if (m) m.classList.add('active');
    }

    function closeModal(id) {
        const m = document.getElementById(id);
        if (m) m.classList.remove('active');
    }

    window.openModal = openModal;
    window.closeModal = closeModal;
})();
