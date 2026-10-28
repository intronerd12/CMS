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

    // Slide Creator State
    let slideBuilderSlides = [];
    let activeSlideTopicId = null;

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

            // Fetch subjects
            const res = await fetch(`/api/subjects?role=${encodeURIComponent(user.role || 'student')}`, {
                headers: { 'x-user-role': user.role || 'student' }
            });
            const data = await res.json();
            const subjects = data.subjects || [];

            if (subjects.length === 0) {
                document.getElementById('quizzesContainer').innerHTML = `
                    <div class="empty-state-full">
                        <h3>No Subjects Available</h3>
                        <p>No courses have been created yet.</p>
                    </div>`;
                return;
            }

            // Populate subject selector
            const quizSubSelect = document.getElementById('quizSubjectSelect');
            if (quizSubSelect) {
                quizSubSelect.innerHTML = subjects.map(s => `
                    <option value="${s.id}" ${s.id === currentSubjectId ? 'selected' : ''}>${s.code} - ${s.name}</option>
                `).join('');

                if (!currentSubjectId || !subjects.some(s => s.id === currentSubjectId)) {
                    currentSubjectId = subjects[0].id;
                }
                quizSubSelect.value = currentSubjectId;
            }

            // Render faculty controls
            const facultyBar = document.getElementById('quizzesFacultyActions');
            if (facultyBar) {
                facultyBar.style.display = isFacultyUser() ? 'flex' : 'none';
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
            const subRes = await fetch(`/api/subjects/${subjectId}?role=${encodeURIComponent(user.role || 'student')}`, {
                headers: { 'x-user-role': user.role || 'student' }
            });
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
            const quizzesRes = await fetch(`/api/subjects/${subjectId}/quizzes`);
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
                    <div style="font-size: 0.75rem; color: rgba(255,255,255,0.8); margin-top: 0.4rem;">
                        ${p.percentage === 100 
                            ? '🎉 Congratulations! You have successfully mastered and unlocked all 14 topics!' 
                            : 'Pass each topic\'s quiz to unlock the next lesson in sequence.'}
                    </div>
                </div>`;
        } else if (isFaculty) {
            progressHtml = `
                <div class="classroom-progress-card">
                    <div class="classroom-progress-header">
                        <span>Faculty Instructor Mode</span>
                        <span>14 Modules Syllabus</span>
                    </div>
                    <div style="font-size: 0.8125rem; color: rgba(255,255,255,0.9);">
                        Manage PowerPoint presentations, custom slides, and quizzes (10-30 MC questions). Shuffled choices anti-cheating enabled.
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
            const quiz = quizzes.find(q => q.topicId === topic.id);
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
            let badgeText = '🔒 Locked';
            if (isPassed) {
                badgeClass = 'status-passed';
                badgeText = `✓ Passed (${bestScore}%)`;
            } else if (status === 'failed_retry') {
                badgeClass = 'status-failed';
                badgeText = `Retry (${bestScore}%)`;
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
                        <button type="button" class="btn btn-secondary btn-sm" onclick="window.previewQuiz('${quiz.id}')" title="Preview Student Experience">Preview</button>
                        <button type="button" class="btn btn-primary btn-sm" onclick="window.openEditQuizModal('${quiz.id}')" title="Edit Questions">Edit (${quiz.questionCount || 10} Qs)</button>
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
                    actionsHtml = `
                        <button type="button" class="btn-view-result" onclick="window.viewPastResult('${lastAttempt ? lastAttempt.id : ''}')">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            View Result & Certificate
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="window.startQuizAttempt('${quiz ? quiz.id : ''}')" title="Retake to improve score">
                            Retake
                        </button>`;
                } else if (isUnlocked && quiz) {
                    actionsHtml = `
                        <button type="button" class="btn-start-quiz" onclick="window.startQuizAttempt('${quiz.id}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="5 3 19 12 5 21 5 3"/>
                            </svg>
                            ${status === 'failed_retry' ? 'Retake Quiz' : 'Start Quiz'}
                        </button>`;
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
                window.showTopicLockModal(data.requiredTopicOrder + 1);
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
        document.getElementById('questionTextBox').textContent = q.questionText;

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
        if (!timerEl) return;

        const mins = Math.floor(Math.max(0, timeRemainingSeconds) / 60);
        const secs = Math.max(0, timeRemainingSeconds) % 60;
        timerEl.textContent = `⏱ ${mins}:${secs < 10 ? '0' : ''}${secs}`;

        if (timeRemainingSeconds <= 120) {
            timerEl.classList.add('urgent');
        } else {
            timerEl.classList.remove('urgent');
        }
    }

    window.confirmSubmitQuiz = function () {
        const answeredCount = Object.keys(studentAnswers).length;
        const total = activeQuestions.length;
        const unanswered = total - answeredCount;

        if (unanswered > 0) {
            if (!confirm(`You have ${unanswered} unanswered question${unanswered !== 1 ? 's' : ''}. Are you sure you want to submit?`)) {
                return;
            }
        }
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
            const res = await fetch(`/api/scores/${scoreId}`);
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

    function renderQuizResultPage(result) {
        const container = document.getElementById('quizResultContent');
        if (!container) return;

        const isPassed = result.passed;
        const score = result.score;
        const total = result.totalQuestions;
        const percentage = result.percentage;
        const passReq = result.passingScorePercent;
        const user = getCurrentUser();
        const scoreId = result.scoreId || (result.scoreRecord ? result.scoreRecord.id : '');

        // Time spent formatting
        const mins = Math.floor((result.timeSpentSeconds || 0) / 60);
        const secs = (result.timeSpentSeconds || 0) % 60;
        const timeText = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;

        // Next topic information
        let nextTopicTitle = 'the next lesson';
        let nextTopicOrder = '';
        if (result.nextTopic) {
            nextTopicTitle = `Topic ${result.nextTopic.orderIndex}: ${result.nextTopic.title}`;
            nextTopicOrder = result.nextTopic.orderIndex;
        }

        // Hero banner HTML
        let heroHtml = '';
        if (isPassed) {
            heroHtml = `
                <div class="result-hero-banner passed">
                    <span class="result-hero-badge">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                        ASSESSMENT PASSED (MASTERY ACHIEVED)
                    </span>
                    <h2 class="result-hero-title">Congratulations, ${user ? user.firstName : 'Student'}!</h2>
                    <p class="result-hero-subtitle">
                        Outstanding work! You scored <strong>${percentage}%</strong> (passing requirement: <strong>${passReq}%</strong>).
                        ${result.unlockedNextTopic ? `<br>🔓 <strong>${nextTopicTitle}</strong> has been successfully UNLOCKED and is ready in your course classwork!` : ''}
                    </p>

                    <div class="result-stats-row">
                        <div class="result-stat-box">
                            <div class="result-stat-value">${score} / ${total}</div>
                            <div class="result-stat-label">Correct Answers</div>
                        </div>
                        <div class="result-stat-box">
                            <div class="result-stat-value">${percentage}%</div>
                            <div class="result-stat-label">Final Grade</div>
                        </div>
                        <div class="result-stat-box">
                            <div class="result-stat-value">${passReq}%</div>
                            <div class="result-stat-label">Required Mark</div>
                        </div>
                        <div class="result-stat-box">
                            <div class="result-stat-value">${timeText}</div>
                            <div class="result-stat-label">Time Spent</div>
                        </div>
                    </div>

                    <div class="result-actions-row">
                        ${result.unlockedNextTopic ? `
                            <button type="button" class="btn-proceed-topic" onclick="window.proceedToTopic('${result.nextTopic.id}')">
                                <span>🚀 Proceed to Topic ${nextTopicOrder}</span>
                            </button>` : `
                            <button type="button" class="btn-proceed-topic" onclick="window.navigateTo('topics')">
                                <span>📚 Back to Course Topics</span>
                            </button>`}

                        <button type="button" class="btn-download-cert" onclick="window.openCertificateModal('${scoreId}')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Download Official Result & Certificate
                        </button>
                    </div>
                </div>`;
        } else {
            heroHtml = `
                <div class="result-hero-banner failed" style="border-left: 6px solid #ef4444; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);">
                    <span class="result-hero-badge" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        FAILED QUIZ • CANNOT PROCEED TO NEXT TOPIC (REPEAT TOPIC - ITEM 5)
                    </span>
                    <h2 class="result-hero-title" style="color: #991b1b;">Cannot Proceed to Next Topic</h2>
                    <p class="result-hero-subtitle" style="color: #7f1d1d;">
                        Whiteboard Requirement #5: You scored <strong>${percentage}%</strong>. The required passing threshold is <strong>${passReq}%</strong>.
                        <br>⚠️ <strong>You cannot proceed to the next topic until you pass this quiz.</strong> Please repeat this topic and review the lecture presentation before retaking the test.
                    </p>

                    <div class="result-stats-row">
                        <div class="result-stat-box">
                            <div class="result-stat-value" style="color: #dc2626;">${score} / ${total}</div>
                            <div class="result-stat-label">Correct Answers</div>
                        </div>
                        <div class="result-stat-box">
                            <div class="result-stat-value" style="color: #dc2626;">${percentage}%</div>
                            <div class="result-stat-label">Your Grade</div>
                        </div>
                        <div class="result-stat-box">
                            <div class="result-stat-value" style="color: #15803d;">${passReq}%</div>
                            <div class="result-stat-label">Passing Mark (75%)</div>
                        </div>
                        <div class="result-stat-box">
                            <div class="result-stat-value">${timeText}</div>
                            <div class="result-stat-label">Time Spent</div>
                        </div>
                    </div>

                    <div class="result-actions-row">
                        <button type="button" class="btn-proceed-topic" style="background: #dc2626; border-color: #b91c1c; color: #fff;" onclick="window.repeatTopicLesson('${result.scoreRecord ? result.scoreRecord.topicId : ''}')">
                            <span>🔄 Repeat Topic (Review Lessons & Presentation)</span>
                        </button>
                        <button type="button" class="btn-retake-quiz" onclick="window.startQuizAttempt('${activeQuiz ? activeQuiz.id : (result.scoreRecord ? result.scoreRecord.quizId : '')}')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="1 4 1 10 7 10"/>
                                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                            </svg>
                            <span>Retake Quiz Now</span>
                        </button>
                        <button type="button" class="btn-download-cert" onclick="window.openCertificateModal('${scoreId}')">
                            📄 Download Grade Slip Record
                        </button>
                    </div>
                </div>`;
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
            reviewHtml = `
                <h3 class="review-section-title">Question by Question Review</h3>
                <div class="review-list">
                    ${result.reviewDetails.map((item, i) => `
                        <div class="review-card ${item.isCorrect ? 'correct' : 'incorrect'}">
                            <div class="review-header">
                                <span class="review-q-num">Question ${i + 1}</span>
                                <span class="badge ${item.isCorrect ? 'badge-success' : 'badge-error'}">
                                    ${item.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                </span>
                            </div>
                            <div class="review-q-text">${item.questionText}</div>

                            <div class="review-answer-row review-student-answer ${item.isCorrect ? 'correct' : 'incorrect'}">
                                <strong>Your Answer:</strong> ${item.selectedText || 'No answer submitted'}
                            </div>

                            ${!item.isCorrect ? `
                                <div class="review-answer-row review-correct-answer">
                                    <strong>Correct Answer:</strong> ${item.correctText}
                                </div>` : ''}

                            ${item.explanation ? `
                                <div class="review-explanation">
                                    <strong>Explanation:</strong> ${item.explanation}
                                </div>` : ''}
                        </div>
                    `).join('')}
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

            const dateStr = new Date(s.completedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const certCode = `CERT-CMS-${s.id.substring(0, 8).toUpperCase()}`;

            certBox.innerHTML = `
                <div class="cert-header">
                    <div class="cert-logo-title">CMS Learning Management System</div>
                    <div class="cert-doc-type">Official Academic Assessment Grade Slip & Verification</div>
                    <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.25rem;">College of Computer Studies • IT Professional Curriculum</div>
                </div>

                <div class="cert-grid-info">
                    <div class="cert-info-item">
                        <label>Student Name</label>
                        <span>${s.firstName} ${s.lastName}</span>
                    </div>
                    <div class="cert-info-item">
                        <label>Student Email / Username</label>
                        <span>${s.email} (${s.username})</span>
                    </div>
                    <div class="cert-info-item">
                        <label>Subject Course</label>
                        <span>Content Management Systems (IT 315)</span>
                    </div>
                    <div class="cert-info-item">
                        <label>Topic Assessment</label>
                        <span>Topic ${s.topicOrderIndex}: ${s.topicTitle}</span>
                    </div>
                    <div class="cert-info-item">
                        <label>Assessment Title</label>
                        <span>${s.quizTitle}</span>
                    </div>
                    <div class="cert-info-item">
                        <label>Date & Timestamp</label>
                        <span>${dateStr}</span>
                    </div>
                </div>

                <div class="cert-verdict-banner ${s.passed ? 'passed' : 'failed'}">
                    <div class="cert-verdict-title">${s.passed ? '★ OFFICIALLY PASSED ★' : 'REQUIRES RETAKE'}</div>
                    <div style="font-size: 1.1rem; font-weight: 700; margin-top: 0.25rem;">
                        Score: ${s.score} / ${s.totalQuestions} (${s.percentage}%) • Minimum Passing Requirement: ${s.passingScorePercent}%
                    </div>
                    <div style="font-size: 0.8125rem; margin-top: 0.35rem;">
                        ${s.passed ? 'Student has successfully fulfilled the competency requirement for this curriculum topic.' : 'Score does not meet the prerequisite passing score threshold for sequential unlocking.'}
                    </div>
                </div>

                <div class="cert-footer-row">
                    <div class="cert-verification-seal">
                        <div>VERIFICATION ID: ${certCode}</div>
                        <div>SYSTEM ID: ${s.id}</div>
                        <div>DIGITALLY VERIFIED BY LMS ENGINE</div>
                    </div>
                    <div class="cert-sign-line">
                        <div></div>
                        <span>Department Chair / Faculty Signature</span>
                    </div>
                </div>`;

            modal.classList.add('active');
        } catch (err) {
            console.error('Certificate error:', err);
            showToast('Failed to generate certificate', 'error');
        }
    };

    window.printOfficialCertificate = function () {
        window.print();
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
            const subRes = await fetch(`/api/subjects?role=${encodeURIComponent(user.role || 'student')}`, {
                headers: { 'x-user-role': user.role || 'student' }
            });
            const subData = await subRes.json();
            const subjects = subData.subjects || [];

            const selectEl = document.getElementById('scoresSubjectSelect');
            if (selectEl && subjects.length > 0) {
                selectEl.innerHTML = subjects.map(s => `
                    <option value="${s.id}" ${s.id === currentSubjectId ? 'selected' : ''}>${s.code} - ${s.name}</option>
                `).join('');
                if (!currentSubjectId) currentSubjectId = subjects[0].id;
                selectEl.value = currentSubjectId;
            }

            await loadScoresForSubject(currentSubjectId);
        } catch (err) {
            console.error('Error loading scores:', err);
        }
    };

    // State for Whiteboard Items #6 & #8 (Scores, Sorting, Matrix, Exports)
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
            <!-- Tabs Bar: Whiteboard #6 vs Whiteboard #8 -->
            <div class="scores-tabs-bar">
                <button type="button" class="scores-tab-btn ${scoresCurrentTab === 'topic-summary' ? 'active' : ''}" onclick="window.switchScoresTab('topic-summary')">
                    📋 Topic Assessment Summary (Item 6)
                </button>
                <button type="button" class="scores-tab-btn ${scoresCurrentTab === 'master-matrix' ? 'active' : ''}" onclick="window.switchScoresTab('master-matrix')">
                    📊 Summary of ALL Quiz Scores per Student (Item 8)
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
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
                <div class="card" style="padding: 1.25rem;">
                    <div style="font-size: 0.8125rem; color: var(--color-text-muted);">Total Quiz Submissions</div>
                    <div style="font-size: 1.75rem; font-weight: 800; color: var(--color-primary);">${totalAttempts}</div>
                </div>
                <div class="card" style="padding: 1.25rem;">
                    <div style="font-size: 0.8125rem; color: var(--color-text-muted);">Overall Pass Rate</div>
                    <div style="font-size: 1.75rem; font-weight: 800; color: #10b981;">${passRate}%</div>
                </div>
                <div class="card" style="padding: 1.25rem;">
                    <div style="font-size: 0.8125rem; color: var(--color-text-muted);">Class Average Grade</div>
                    <div style="font-size: 1.75rem; font-weight: 800; color: var(--color-text);">${avgScore}%</div>
                </div>
            </div>

            <!-- Controls Row: Search, Topic Filter, Sort by Surname / Score, Export (Print/PDF/CSV) -->
            <div class="scores-controls-row">
                <div class="scores-filters-group">
                    <input type="text" class="form-control" style="max-width: 200px;" placeholder="Search student..." value="${escapeHtml(summarySearch)}" oninput="window.setSummarySearch(this.value)">

                    <select class="form-control" style="max-width: 170px;" onchange="window.setSummaryTopicFilter(this.value)">
                        <option value="all" ${summaryTopicFilter === 'all' ? 'selected' : ''}>All Topics (1 to 14)</option>
                        ${topicOptions.map(num => `
                            <option value="${num}" ${summaryTopicFilter === String(num) ? 'selected' : ''}>Topic ${num}</option>
                        `).join('')}
                    </select>

                    <select class="form-control" style="max-width: 150px;" onchange="window.setSummaryVerdictFilter(this.value)">
                        <option value="all" ${summaryVerdictFilter === 'all' ? 'selected' : ''}>All Verdicts</option>
                        <option value="passed" ${summaryVerdictFilter === 'passed' ? 'selected' : ''}>Passed Only</option>
                        <option value="failed" ${summaryVerdictFilter === 'failed' ? 'selected' : ''}>Needs Retake</option>
                    </select>

                    <select class="form-control" style="max-width: 210px; font-weight: 700; color: var(--color-primary);" onchange="window.setSummarySort(this.value)">
                        <option value="surname-asc" ${summarySort === 'surname-asc' ? 'selected' : ''}>🔤 Sorted by Surname (A → Z)</option>
                        <option value="surname-desc" ${summarySort === 'surname-desc' ? 'selected' : ''}>🔤 Sorted by Surname (Z → A)</option>
                        <option value="score-desc" ${summarySort === 'score-desc' ? 'selected' : ''}>⭐ Sorted by Score (High → Low)</option>
                        <option value="score-asc" ${summarySort === 'score-asc' ? 'selected' : ''}>⭐ Sorted by Score (Low → High)</option>
                        <option value="date-desc" ${summarySort === 'date-desc' ? 'selected' : ''}>⏱ Sorted by Date (Newest)</option>
                    </select>
                </div>

                <div class="scores-export-group">
                    <button type="button" class="btn-export-action" onclick="window.printSummaryReport('topic-summary')" title="Print summary table to physical printer">
                        🖨️ <span>Print</span>
                    </button>
                    <button type="button" class="btn-export-action btn-pdf" onclick="window.printSummaryReport('topic-summary')" title="Save report as PDF">
                        📄 <span>PDF</span>
                    </button>
                    <button type="button" class="btn-export-action btn-csv" onclick="window.exportTopicSummaryCSV()" title="Download spreadsheet (.csv) for Excel or Google Sheets">
                        📊 <span>Spreadsheet (.CSV)</span>
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
                                                    ${s.passed ? '✓ Passed' : '✗ Needs Retake'}
                                                </span>
                                            </td>
                                            <td>${new Date(s.completedAt).toLocaleDateString()} ${new Date(s.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td>
                                                <button type="button" class="btn btn-secondary btn-sm" onclick="window.viewPastResult('${s.id}')">View</button>
                                                <button type="button" class="btn btn-secondary btn-sm" onclick="window.openCertificateModal('${s.id}')">Slip</button>
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
                    <input type="text" class="form-control" style="max-width: 240px;" placeholder="Search student name..." value="${escapeHtml(matrixSearch)}" oninput="window.setMatrixSearch(this.value)">

                    <select class="form-control" style="max-width: 240px; font-weight: 700; color: var(--color-primary);" onchange="window.setMatrixSort(this.value)">
                        <option value="surname-asc" ${matrixSort === 'surname-asc' ? 'selected' : ''}>🔤 Sorted by Surname (A → Z)</option>
                        <option value="surname-desc" ${matrixSort === 'surname-desc' ? 'selected' : ''}>🔤 Sorted by Surname (Z → A)</option>
                        <option value="avg-desc" ${matrixSort === 'avg-desc' ? 'selected' : ''}>⭐ Sorted by Average Grade (High → Low)</option>
                        <option value="avg-asc" ${matrixSort === 'avg-asc' ? 'selected' : ''}>⭐ Sorted by Average Grade (Low → High)</option>
                        <option value="completed-desc" ${matrixSort === 'completed-desc' ? 'selected' : ''}>🏆 Sorted by Topics Passed</option>
                    </select>
                </div>

                <div class="scores-export-group">
                    <button type="button" class="btn-export-action" onclick="window.printSummaryReport('master-matrix')" title="Print Master Matrix to physical printer">
                        🖨️ <span>Print</span>
                    </button>
                    <button type="button" class="btn-export-action btn-pdf" onclick="window.printSummaryReport('master-matrix')" title="Save Master Matrix as PDF">
                        📄 <span>PDF</span>
                    </button>
                    <button type="button" class="btn-export-action btn-csv" onclick="window.exportMatrixCSV()" title="Download master matrix (.csv) for Excel or Google Sheets">
                        📊 <span>Spreadsheet (.CSV)</span>
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

        const container = document.getElementById('matrixPageContent');
        if (!container) return;

        try {
            // Populate subject dropdown for matrix
            const subRes = await fetch(`/api/subjects?role=${encodeURIComponent(user.role || 'student')}`, {
                headers: { 'x-user-role': user.role || 'student' }
            });
            const subData = await subRes.json();
            const subjects = subData.subjects || [];

            const selectEl = document.getElementById('matrixSubjectSelect');
            if (selectEl && subjects.length > 0) {
                selectEl.innerHTML = subjects.map(s => `
                    <option value="${s.id}" ${s.id === currentSubjectId ? 'selected' : ''}>${s.code} - ${s.name} (${s.term || s.year || ''})</option>
                `).join('');
                if (!currentSubjectId) currentSubjectId = subjects[0].id;
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
                <p>Loading Cumulative Quiz Performance Matrix (Whiteboard Item 8)...</p>
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
                    fetch(`/api/subjects/${subjectId}`)
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
            <!-- Whiteboard Item #8 Requirement Banner -->
            <div class="matrix-hero-banner">
                <div class="matrix-hero-left">
                    <span class="matrix-req-badge">Whiteboard Requirement #8</span>
                    <h2 class="matrix-hero-title">Summary of ALL Quiz Scores per Student</h2>
                    <p class="matrix-hero-desc">
                        Cumulative assessment ledger tracking individual performance across all curriculum topics (Topics 1 to ${topics.length || 14}).
                        Sequential progression requires ≥ 75% on each topic's quiz.
                    </p>
                </div>
                <div class="matrix-hero-right">
                    <div class="matrix-badge-pill">🔤 Sorted by Surname & Score</div>
                    <div class="matrix-badge-pill">🖨️ Print • 📄 PDF • 📊 Spreadsheet</div>
                </div>
            </div>

            <!-- KPI Analytics Grid -->
            <div class="matrix-kpi-grid">
                <div class="matrix-stat-card">
                    <div class="matrix-stat-icon" style="background: rgba(37, 99, 235, 0.1); color: #2563eb;">👥</div>
                    <div class="matrix-stat-body">
                        <div class="matrix-stat-value">${totalStudents}</div>
                        <div class="matrix-stat-label">Enrolled Students</div>
                    </div>
                </div>
                <div class="matrix-stat-card">
                    <div class="matrix-stat-icon" style="background: rgba(16, 185, 129, 0.1); color: #059669;">⭐</div>
                    <div class="matrix-stat-body">
                        <div class="matrix-stat-value" style="color: ${classAvg >= 75 ? '#059669' : '#d97706'};">${classAvg}%</div>
                        <div class="matrix-stat-label">Class Quiz Average</div>
                    </div>
                </div>
                <div class="matrix-stat-card">
                    <div class="matrix-stat-icon" style="background: rgba(139, 92, 246, 0.1); color: #7c3aed;">🏆</div>
                    <div class="matrix-stat-body">
                        <div class="matrix-stat-value">${completedCount} <span style="font-size: 0.85rem; color: var(--color-text-muted);">/ ${totalStudents}</span></div>
                        <div class="matrix-stat-label">Curriculum Mastered</div>
                    </div>
                </div>
                <div class="matrix-stat-card">
                    <div class="matrix-stat-icon" style="background: rgba(245, 158, 11, 0.1); color: #d97706;">👑</div>
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
                    <input type="text" class="form-control" style="max-width: 250px;" placeholder="Search student name or ID..." value="${escapeHtml(matrixSearch)}" oninput="window.setMatrixSearch(this.value)">

                    <select class="form-control" style="max-width: 260px; font-weight: 700; color: var(--color-primary);" onchange="window.setMatrixSort(this.value)">
                        <option value="surname-asc" ${matrixSort === 'surname-asc' ? 'selected' : ''}>🔤 Sorted by Surname (A → Z)</option>
                        <option value="surname-desc" ${matrixSort === 'surname-desc' ? 'selected' : ''}>🔤 Sorted by Surname (Z → A)</option>
                        <option value="avg-desc" ${matrixSort === 'avg-desc' ? 'selected' : ''}>⭐ Sorted by Average Grade (High → Low)</option>
                        <option value="avg-asc" ${matrixSort === 'avg-asc' ? 'selected' : ''}>⭐ Sorted by Average Grade (Low → High)</option>
                        <option value="completed-desc" ${matrixSort === 'completed-desc' ? 'selected' : ''}>🏆 Sorted by Topics Passed</option>
                    </select>
                </div>

                <div class="scores-export-group">
                    <button type="button" class="btn-export-action" onclick="window.printSummaryReport('master-matrix')" title="Print Master Matrix to physical printer">
                        🖨️ <span>Print</span>
                    </button>
                    <button type="button" class="btn-export-action btn-pdf" onclick="window.printSummaryReport('master-matrix')" title="Save Master Matrix as PDF">
                        📄 <span>PDF</span>
                    </button>
                    <button type="button" class="btn-export-action btn-csv" onclick="window.exportMatrixCSV()" title="Download master matrix (.csv) for Excel or Google Sheets">
                        📊 <span>Spreadsheet (.CSV)</span>
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
            <!-- Whiteboard Item #8 Requirement Banner for Student -->
            <div class="matrix-hero-banner">
                <div class="matrix-hero-left">
                    <span class="matrix-req-badge">Whiteboard Requirement #8</span>
                    <h2 class="matrix-hero-title">My Cumulative Quiz Summary</h2>
                    <p class="matrix-hero-desc">
                        Official academic performance ledger for <strong>${escapeHtml(subCode)}: ${escapeHtml(subName)}</strong> (${escapeHtml(subTerm)}, ${escapeHtml(subYear)}).
                        Passing score: <strong>75%</strong> on each topic.
                    </p>
                </div>
                <div class="matrix-hero-right">
                    <div class="matrix-badge-pill">🎓 Student Transcript</div>
                    <div class="matrix-badge-pill">🖨️ Print • 📄 PDF • 📊 Spreadsheet</div>
                </div>
            </div>

            <!-- Student KPI Summary -->
            <div class="matrix-kpi-grid">
                <div class="matrix-stat-card">
                    <div class="matrix-stat-icon" style="background: rgba(37, 99, 235, 0.1); color: #2563eb;">📚</div>
                    <div class="matrix-stat-body">
                        <div class="matrix-stat-value">${passedTopicsCount} <span style="font-size: 0.85rem; color: var(--color-text-muted);">/ ${totalTopics}</span></div>
                        <div class="matrix-stat-label">Modules Passed (${completionRate}%)</div>
                    </div>
                </div>
                <div class="matrix-stat-card">
                    <div class="matrix-stat-icon" style="background: rgba(16, 185, 129, 0.1); color: #059669;">⭐</div>
                    <div class="matrix-stat-body">
                        <div class="matrix-stat-value" style="color: ${avgScore >= 75 ? '#059669' : '#d97706'};">${avgScore}%</div>
                        <div class="matrix-stat-label">My Cumulative Average</div>
                    </div>
                </div>
                <div class="matrix-stat-card">
                    <div class="matrix-stat-icon" style="background: rgba(139, 92, 246, 0.1); color: #7c3aed;">🎯</div>
                    <div class="matrix-stat-body">
                        <div class="matrix-stat-value" style="font-size: 1.15rem; color: ${isGraduated ? '#059669' : '#2563eb'};">
                            ${isGraduated ? '★ Mastered All' : `At Topic ${passedTopicsCount + 1}`}
                        </div>
                        <div class="matrix-stat-label">Sequential Status</div>
                    </div>
                </div>
                <div class="matrix-stat-card">
                    <div class="matrix-stat-icon" style="background: rgba(245, 158, 11, 0.1); color: #d97706;">📝</div>
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
                    <button type="button" class="btn-export-action" onclick="window.printSummaryReport('student-transcript')" title="Print transcript">
                        🖨️ <span>Print</span>
                    </button>
                    <button type="button" class="btn-export-action btn-pdf" onclick="window.printSummaryReport('student-transcript')" title="Save as PDF">
                        📄 <span>PDF</span>
                    </button>
                    <button type="button" class="btn-export-action btn-csv" onclick="window.exportStudentTranscriptCSV()" title="Download Spreadsheet (.CSV)">
                        📊 <span>Spreadsheet (.CSV)</span>
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
                                                    <span class="quiz-status-badge status-locked">🔒 Locked</span>
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
                    <h3 style="margin: 0;">My Official Assessment Transcript</h3>
                    <div style="font-size: 0.78rem; color: var(--color-text-muted);">Recorded grades and pass/fail verification history</div>
                </div>
                <div class="scores-export-group">
                    <button type="button" class="btn-export-action" onclick="window.printSummaryReport('student-transcript')" title="Print my assessment transcript">
                        🖨️ <span>Print</span>
                    </button>
                    <button type="button" class="btn-export-action btn-pdf" onclick="window.printSummaryReport('student-transcript')" title="Save transcript as PDF">
                        📄 <span>PDF</span>
                    </button>
                    <button type="button" class="btn-export-action btn-csv" onclick="window.exportStudentTranscriptCSV()" title="Download spreadsheet (.csv)">
                        📊 <span>Spreadsheet (.CSV)</span>
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
                                            <button type="button" class="btn btn-primary btn-sm" onclick="window.openCertificateModal('${s.id}')">Download Slip</button>
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
    // PRINT & PDF REPORT GENERATOR
    // Formats academic header, signature block, and crisp layout
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
                    <h4>Topic Assessment Summary Report (Whiteboard Item 6)</h4>
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
                    <h4>Summary of ALL Quiz Scores per Student - Master Matrix (Whiteboard Item 8)</h4>
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
    // FACULTY QUIZ CREATOR & UPLOADER
    // Requirements: 10 min, 30 max questions, Multiple choice
    // Passing score: 50%, 60%, 75%, 80%, 90%
    // ============================================

    window.openCreateQuizModal = function (topicId) {
        editingQuizId = null;
        const topic = currentSubject ? currentSubject.topics.find(t => t.id === topicId) : null;

        document.getElementById('quizModalTitle').textContent = `Create Topic Quiz - ${topic ? topic.title : ''}`;
        document.getElementById('quizModalTopicId').value = topicId;
        document.getElementById('quizModalSubjectId').value = currentSubjectId;
        document.getElementById('quizTitleInput').value = `${topic ? topic.title : 'Topic'} Quiz Evaluation`;
        document.getElementById('quizDescInput').value = `Comprehensive multiple choice quiz for ${topic ? topic.title : 'this topic'}.`;
        document.getElementById('quizPassingScoreInput').value = '75';
        document.getElementById('quizTimeLimitInput').value = '10';

        // Initialize with 10 default template questions (Max: 30)
        builderQuestions = Array.from({ length: 10 }).map((_, i) => ({
            questionText: `Question ${i + 1}: `,
            options: [
                { id: 'opt_1', text: '' },
                { id: 'opt_2', text: '' },
                { id: 'opt_3', text: '' },
                { id: 'opt_4', text: '' }
            ],
            correctAnswer: 'opt_1',
            explanation: ''
        }));

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

            document.getElementById('quizModalTitle').textContent = `Edit Quiz: ${q.title} (10 Min • Max 30 Qs)`;
            document.getElementById('quizModalTopicId').value = q.topicId;
            document.getElementById('quizModalSubjectId').value = q.subjectId;
            document.getElementById('quizTitleInput').value = q.title;
            document.getElementById('quizDescInput').value = q.description || '';
            document.getElementById('quizPassingScoreInput').value = q.passingScorePercent || 75;
            document.getElementById('quizTimeLimitInput').value = q.timeLimitMinutes || 10;

            builderQuestions = (q.questions || []).map(item => ({
                questionText: item.questionText,
                options: item.options || [
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
        if (!container) return;

        const count = builderQuestions.length;
        if (counter) {
            counter.textContent = `Questions: ${count} / 20 (Whiteboard Item 5: 10 min; max 20)`;
            if (count < 1 || count > 20) {
                counter.style.color = 'var(--color-error)';
            } else {
                counter.style.color = '#10b981';
            }
        }

        container.innerHTML = builderQuestions.map((q, qIndex) => {
            const letters = ['A', 'B', 'C', 'D'];
            return `
                <div class="card" style="margin-bottom: 1rem; padding: 1.25rem;" id="builderQCard-${qIndex}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <span style="font-size: 0.8125rem; font-weight: 700; color: var(--color-primary);">Question #${qIndex + 1}</span>
                        ${builderQuestions.length > 1 ? `
                            <button type="button" class="btn btn-danger btn-sm" onclick="window.removeBuilderQuestion(${qIndex})" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">
                                Remove
                            </button>` : `<span style="font-size: 0.72rem; color: var(--color-text-muted);">(At least 1 question)</span>`}
                    </div>

                    <div class="form-group" style="margin-bottom: 0.75rem;">
                        <input type="text" class="form-control" placeholder="Enter question text..." value="${escapeHtml(q.questionText)}" oninput="window.updateBuilderQText(${qIndex}, this.value)" required>
                    </div>

                    <div style="font-size: 0.75rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--color-text-muted);">Multiple Choice Options (Select radio for correct answer):</div>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem;">
                        ${q.options.map((opt, optIndex) => `
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <label style="display: flex; align-items: center; gap: 0.35rem; font-weight: 700; font-size: 0.8125rem; cursor: pointer;">
                                    <input type="radio" name="correctOpt-${qIndex}" value="${opt.id}" ${q.correctAnswer === opt.id ? 'checked' : ''} onchange="window.updateBuilderCorrect(${qIndex}, '${opt.id}')">
                                    <span>${letters[optIndex]}:</span>
                                </label>
                                <input type="text" class="form-control" style="flex: 1;" placeholder="Option ${letters[optIndex]} text..." value="${escapeHtml(opt.text)}" oninput="window.updateBuilderOptText(${qIndex}, ${optIndex}, this.value)" required>
                            </div>
                        `).join('')}
                    </div>

                    <div class="form-group" style="margin-bottom: 0;">
                        <input type="text" class="form-control" style="font-size: 0.8125rem;" placeholder="Explanation / rationale for correct answer..." value="${escapeHtml(q.explanation)}" oninput="window.updateBuilderExplanation(${qIndex}, this.value)">
                    </div>
                </div>`;
        }).join('');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    window.addBuilderQuestion = function () {
        if (builderQuestions.length >= 20) {
            showToast('Maximum 20 questions reached (Whiteboard Item 5: max 20)', 'warning');
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
    };

    window.removeBuilderQuestion = function (index) {
        if (builderQuestions.length <= 1) {
            showToast('Quiz must have at least 1 question', 'warning');
            return;
        }
        builderQuestions.splice(index, 1);
        renderBuilderQuestions();
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
        if (builderQuestions[qIndex]) builderQuestions[qIndex].correctAnswer = optId;
    };

    window.updateBuilderExplanation = function (qIndex, text) {
        if (builderQuestions[qIndex]) builderQuestions[qIndex].explanation = text;
    };

    // Auto-fill questions for faculty testing
    window.autoFillTopicQuestions = function () {
        const topicId = document.getElementById('quizModalTopicId').value;
        const topic = currentSubject ? currentSubject.topics.find(t => t.id === topicId) : null;
        const topicTitle = topic ? topic.title : 'CMS';

        builderQuestions = Array.from({ length: 10 }).map((_, i) => ({
            questionText: `Sample Question ${i + 1} regarding ${topicTitle}: What is the core function of component #${i + 1}?`,
            options: [
                { id: 'opt_1', text: `Primary architectural function of ${topicTitle} component ${i + 1}` },
                { id: 'opt_2', text: `Secondary design layout option ${i + 1}` },
                { id: 'opt_3', text: `Alternative auxiliary module ${i + 1}` },
                { id: 'opt_4', text: `Client side CSS property ${i + 1}` }
            ],
            correctAnswer: 'opt_1',
            explanation: `Option A is correct because it encapsulates the primary architecture for ${topicTitle}.`
        }));

        renderBuilderQuestions();
        showToast('Auto-filled 10 sample questions (Whiteboard: max 20)!', 'success');
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
        // Split by question indicators like "1.", "1)", "Question 1:", or double newlines
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
                // Check for Answer line: "Answer: A" or "Ans: B"
                const ansMatch = line.match(/^(?:Answer|Ans|Correct(?:\s*Answer)?)\s*[:\-\=]\s*([A-D1-4])/i);
                if (ansMatch) {
                    const letter = ansMatch[1].toUpperCase();
                    if (letter === 'A' || letter === '1') correctAnswer = 'opt_1';
                    else if (letter === 'B' || letter === '2') correctAnswer = 'opt_2';
                    else if (letter === 'C' || letter === '3') correctAnswer = 'opt_3';
                    else if (letter === 'D' || letter === '4') correctAnswer = 'opt_4';
                    continue;
                }

                // Check for Explanation line: "Explanation: ..."
                const expMatch = line.match(/^(?:Explanation|Rationale|Note)\s*[:\-\=]\s*(.+)/i);
                if (expMatch) {
                    explanation = expMatch[1].trim();
                    continue;
                }

                // Check for Option line: "A. Text", "A) Text", "*B. Text", etc.
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

                // Otherwise question text
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
            showToast(`Note: Maximum 20 questions allowed (Whiteboard Item 5: max 20). Keeping first 20 out of ${parsed.length}.`, 'info');
            parsed.splice(20);
        }

        builderQuestions = parsed;
        renderBuilderQuestions();
        closeModal('insertTextQuizModal');
        showToast(`Successfully inserted ${parsed.length} questions from text!`, 'success');
    };

    window.saveQuizFromBuilder = async function () {
        const topicId = document.getElementById('quizModalTopicId').value;
        const subjectId = document.getElementById('quizModalSubjectId').value;
        const title = document.getElementById('quizTitleInput').value.trim();
        const description = document.getElementById('quizDescInput').value.trim();
        const passingScorePercent = Number(document.getElementById('quizPassingScoreInput').value) || 75;
        const timeLimitMinutes = Number(document.getElementById('quizTimeLimitInput').value) || 10;

        if (!title) {
            showToast('Please enter a quiz title', 'warning');
            return;
        }

        // Validate max 20 questions (Whiteboard Item 5: max 20)
        if (builderQuestions.length < 1 || builderQuestions.length > 20) {
            showToast(`Quiz can have between 1 and 20 questions (Whiteboard Item 5: max 20). Currently: ${builderQuestions.length}`, 'error');
            return;
        }

        // Validate all fields
        for (let i = 0; i < builderQuestions.length; i++) {
            const q = builderQuestions[i];
            if (!q.questionText.trim()) {
                showToast(`Please enter text for Question #${i + 1}`, 'warning');
                return;
            }
            for (let j = 0; j < q.options.length; j++) {
                if (!q.options[j].text.trim()) {
                    showToast(`Please enter text for Question #${i + 1}, Option ${j + 1}`, 'warning');
                    return;
                }
            }
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save quiz');
            }

            showToast(editingQuizId ? 'Quiz updated successfully!' : 'Quiz created successfully!', 'success');
            closeModal('quizModal');
            loadQuizzesForSubject(currentSubjectId);
        } catch (err) {
            console.error('Save quiz error:', err);
            showToast(err.message, 'error');
        }
    };

    window.deleteQuizConfirm = async function (quizId) {
        if (!confirm('Are you sure you want to delete this quiz? All student records for this quiz will be permanently removed.')) {
            return;
        }

        try {
            const res = await fetch(`/api/quizzes/${quizId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete quiz');
            showToast('Quiz deleted successfully', 'success');
            loadQuizzesForSubject(currentSubjectId);
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

            showToast(data.message, 'success');
            closeModal('quizUploadModal');

            // Populate builder with parsed questions!
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
    // IN-SYSTEM PRESENTATION SLIDES CREATOR
    // ============================================

    window.openSlideCreatorModal = function (topicId) {
        activeSlideTopicId = topicId;
        const topic = currentSubject ? currentSubject.topics.find(t => t.id === topicId) : null;

        document.getElementById('slideCreatorTopicTitle').textContent = `Presentation Slides - ${topic ? topic.title : ''}`;

        // Load existing custom slides or init default slides
        slideBuilderSlides = (topic && topic.customSlides && topic.customSlides.length > 0)
            ? JSON.parse(JSON.stringify(topic.customSlides))
            : [
                {
                    title: `${topic ? topic.title : 'Topic Overview'}`,
                    subtitle: 'Module Learning Objectives & Architecture',
                    bullets: ['Introduction to core concepts', 'Architectural elements and data flow', 'Industry best practices and implementation'],
                    theme: 'indigo'
                }
            ];

        renderSlideBuilderList();
        openModal('slideCreatorModal');
    };

    function renderSlideBuilderList() {
        const container = document.getElementById('slideBuilderList');
        if (!container) return;

        const themes = ['indigo', 'blue', 'emerald', 'orange', 'rose', 'purple', 'cyan'];

        container.innerHTML = slideBuilderSlides.map((slide, i) => `
            <div class="slide-builder-card">
                <div class="slide-builder-header">
                    <span class="slide-number-badge">Slide #${i + 1}</span>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div class="slide-color-picker">
                            ${themes.map(t => `
                                <div class="color-dot theme-${t} ${slide.theme === t ? 'active' : ''}" style="background: var(--theme-${t}-color, #4f46e5);" onclick="window.setSlideTheme(${i}, '${t}')" title="Theme ${t}"></div>
                            `).join('')}
                        </div>
                        ${slideBuilderSlides.length > 1 ? `
                            <button type="button" class="btn btn-danger btn-sm" onclick="window.removeSlideItem(${i})" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">Remove</button>
                        ` : ''}
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 0.5rem;">
                    <input type="text" class="form-control" placeholder="Slide Title" value="${escapeHtml(slide.title)}" oninput="window.updateSlideTitle(${i}, this.value)" required>
                </div>
                <div class="form-group" style="margin-bottom: 0.5rem;">
                    <input type="text" class="form-control" placeholder="Slide Subtitle / Category" value="${escapeHtml(slide.subtitle)}" oninput="window.updateSlideSubtitle(${i}, this.value)">
                </div>
                <div class="form-group" style="margin-bottom: 0.5rem;">
                    <label style="font-size: 0.75rem; font-weight: 700; color: var(--color-text-muted);">Bullet Points (One per line):</label>
                    <textarea class="form-control" rows="3" placeholder="Key concept point 1&#10;Key concept point 2&#10;Key concept point 3" oninput="window.updateSlideBullets(${i}, this.value)">${Array.isArray(slide.bullets) ? slide.bullets.join('\n') : ''}</textarea>
                </div>
            </div>
        `).join('');
    }

    window.addSlideItem = function () {
        slideBuilderSlides.push({
            title: `Key Concepts ${slideBuilderSlides.length + 1}`,
            subtitle: 'Detailed Architecture Overview',
            bullets: ['Key takeaway point A', 'Key takeaway point B', 'Key takeaway point C'],
            theme: 'blue'
        });
        renderSlideBuilderList();
    };

    window.removeSlideItem = function (index) {
        if (slideBuilderSlides.length <= 1) return;
        slideBuilderSlides.splice(index, 1);
        renderSlideBuilderList();
    };

    window.updateSlideTitle = function (i, val) {
        if (slideBuilderSlides[i]) slideBuilderSlides[i].title = val;
    };

    window.updateSlideSubtitle = function (i, val) {
        if (slideBuilderSlides[i]) slideBuilderSlides[i].subtitle = val;
    };

    window.updateSlideBullets = function (i, val) {
        if (slideBuilderSlides[i]) {
            slideBuilderSlides[i].bullets = val.split('\n').filter(l => l.trim().length > 0);
        }
    };

    window.setSlideTheme = function (i, theme) {
        if (slideBuilderSlides[i]) {
            slideBuilderSlides[i].theme = theme;
            renderSlideBuilderList();
        }
    };

    window.savePresentationSlides = async function () {
        if (!activeSlideTopicId) return;

        try {
            const res = await fetch(`/api/topics/${activeSlideTopicId}/slides`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slides: slideBuilderSlides })
            });

            if (!res.ok) throw new Error('Failed to save slides');
            showToast('Presentation slides saved successfully!', 'success');
            closeModal('slideCreatorModal');

            // Reload topics page if on topics
            if (typeof window.loadTopicsPage === 'function') {
                window.loadTopicsPage();
            }
        } catch (err) {
            console.error('Save slides error:', err);
            showToast(err.message, 'error');
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
