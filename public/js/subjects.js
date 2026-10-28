/* ============================================
   SUBJECTS & TABLE OF CONTENTS (TOC) LOGIC
   Functional Requirements #2 & #3
   Teacher Upload & Visibility Control
   ============================================ */

(function () {
    // Shared State
    let subjectsData = [];
    let currentSubjectId = null;
    let currentSubject = null;
    let presentationsLibrary = [];
    let subjectsViewMode = 'grid'; // 'grid' | 'table'
    let tocViewMode = 'whiteboard'; // 'whiteboard' (1-3, 4-6) | 'sequential'
    let customUploadedPresentation = null;

    // Slide Viewer State
    let slideViewer = {
        active: false,
        topic: null,
        slides: [],
        currentIndex: 0,
        isFullscreen: false,
        notesOpen: false
    };

    // Platform Brand Theme Map
    const BRAND_COLORS = {
        cms:       { color: '#6366f1', light: '#eef2ff', label: 'CMS Overview' },
        wordpress: { color: '#21759b', light: '#e8f4fd', label: 'WordPress' },
        joomla:    { color: '#e8562a', light: '#fdf2ef', label: 'Joomla' },
        drupal:    { color: '#0678be', light: '#eaf4fa', label: 'Drupal' },
        wix:       { color: '#116dff', light: '#eff5ff', label: 'Wix' },
        shopify:   { color: '#5e8e3e', light: '#f2f8ee', label: 'Shopify' },
        magento:   { color: '#ee672f', light: '#fdf3ed', label: 'Magento' }
    };

    function getUserRole() {
        if (currentUser && currentUser.role) return currentUser.role;
        const stored = sessionStorage.getItem('currentUser');
        if (stored) {
            try { return JSON.parse(stored).role || 'student'; } catch (e) {}
        }
        return 'student';
    }

    function isTeacherOrAdmin() {
        const r = getUserRole();
        return r === 'faculty';
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        loadPresentationsLibrary();
        hookIntoNavigation();
        initEventListeners();
    });

    // ============================================
    // API CALLS
    // ============================================

    async function loadPresentationsLibrary() {
        try {
            const res = await fetch('/api/presentations');
            if (res.ok) {
                const data = await res.json();
                presentationsLibrary = data.presentations || [];
                populatePresentationDropdown();
            }
        } catch (err) {
            console.error('Failed to load presentation library:', err);
        }
    }

    async function fetchSubjects() {
        try {
            const role = getUserRole();
            const res = await fetch(`/api/subjects?role=${encodeURIComponent(role)}`, {
                headers: { 'x-user-role': role }
            });
            if (!res.ok) throw new Error('Failed to fetch subjects');
            const data = await res.json();
            subjectsData = data.subjects || [];
            return subjectsData;
        } catch (err) {
            showToast(err.message, 'error');
            return [];
        }
    }

    async function fetchSubjectDetails(id) {
        try {
            const role = getUserRole();
            const res = await fetch(`/api/subjects/${id}?role=${encodeURIComponent(role)}`, {
                headers: { 'x-user-role': role }
            });
            if (!res.ok) throw new Error('Failed to fetch subject');
            const data = await res.json();
            currentSubject = data.subject;

            // If user is a student, fetch progression status for all topics
            if (!isTeacherOrAdmin()) {
                const u = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : JSON.parse(sessionStorage.getItem('currentUser') || '{}');
                if (u && u.id) {
                    try {
                        const progRes = await fetch(`/api/subjects/${id}/student-progress/${u.id}`);
                        if (progRes.ok) {
                            const progData = await progRes.json();
                            if (currentSubject && currentSubject.topics && progData.topics) {
                                currentSubject.topics = currentSubject.topics.map(t => {
                                    const pt = progData.topics.find(p => p.id === t.id);
                                    return pt ? { ...t, isUnlocked: pt.isUnlocked, isPassed: pt.isPassed, status: pt.status } : t;
                                });
                            }
                        }
                    } catch (e) {
                        console.error('Progress fetch error:', e);
                    }
                }
            }

            return currentSubject;
        } catch (err) {
            showToast(err.message, 'error');
            return null;
        }
    }

    // ============================================
    // REQUIREMENT #2: SUBJECT MANAGEMENT
    // ============================================

    window.loadSubjectsPage = async function () {
        await fetchSubjects();
        renderSubjects();
    };

    function renderSubjects() {
        const grid = document.getElementById('subjectsGrid');
        const tableBody = document.getElementById('subjectsTableBody');
        const emptyState = document.getElementById('subjectsEmptyState');
        const countBadge = document.getElementById('subjectsTotalCount');
        const searchTerm = (document.getElementById('subjectSearchInput')?.value || '').toLowerCase().trim();
        const termFilter = document.getElementById('subjectTermFilter')?.value || '';
        const yearFilter = document.getElementById('subjectYearFilter')?.value || '';

        // Filter subjects
        const filtered = subjectsData.filter(s => {
            const matchesSearch = !searchTerm || 
                s.name.toLowerCase().includes(searchTerm) || 
                s.code.toLowerCase().includes(searchTerm) ||
                (s.description && s.description.toLowerCase().includes(searchTerm));
            const matchesTerm = !termFilter || s.term === termFilter;
            const matchesYear = !yearFilter || s.year === yearFilter;
            return matchesSearch && matchesTerm && matchesYear;
        });

        if (countBadge) {
            countBadge.textContent = `${filtered.length} Subject${filtered.length !== 1 ? 's' : ''}`;
        }

        if (filtered.length === 0) {
            if (grid) grid.style.display = 'none';
            if (document.getElementById('subjectsTableWrapper')) {
                document.getElementById('subjectsTableWrapper').style.display = 'none';
            }
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        const isStaff = isTeacherOrAdmin();

        // Render Cards Grid
        if (grid) {
            grid.style.display = subjectsViewMode === 'grid' ? 'grid' : 'none';
            grid.innerHTML = filtered.map(subject => {
                const topicsCount = subject.topics ? subject.topics.length : 0;
                let totalSlides = 0;
                const deckAvatars = [];

                if (subject.topics) {
                    subject.topics.forEach(t => {
                        if (t.presentation) {
                            totalSlides += t.presentation.slideCount || 0;
                            if (t.presentation.cover && deckAvatars.length < 5) {
                                deckAvatars.push({
                                    cover: t.presentation.cover,
                                    title: t.title
                                });
                            }
                        }
                    });
                }

                return `
                    <div class="subject-card" data-id="${subject.id}">
                        <div>
                            <div class="subject-card-header">
                                <span class="subject-code-badge">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                        <polyline points="4 7 4 4 20 4 20 7"/>
                                        <line x1="9" y1="20" x2="15" y2="20"/>
                                        <line x1="12" y1="4" x2="12" y2="20"/>
                                    </svg>
                                    ${escapeHtml(subject.code)}
                                </span>
                                <div class="subject-meta-chips">
                                    <span class="chip-term">${escapeHtml(subject.term)}</span>
                                    <span class="chip-year">${escapeHtml(subject.year)}</span>
                                    ${isStaff ? `
                                        <button class="card-menu-btn" onclick="openEditSubjectModal('${subject.id}')" title="Edit Subject">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M12 20h9"/>
                                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                                            </svg>
                                        </button>
                                        <button class="card-menu-btn" onclick="confirmDeleteSubject('${subject.id}', '${escapeHtml(subject.name)}')" title="Delete Subject" style="color: var(--color-error);">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polyline points="3 6 5 6 21 6"/>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                            </svg>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>

                            <h3 class="subject-card-title">${escapeHtml(subject.name)}</h3>
                            <p class="subject-card-desc">${escapeHtml(subject.description || 'Comprehensive curriculum covering core principles, hands-on demonstrations, and assessments.')}</p>

                            <!-- Presentation Decks Preview Stack -->
                            <div class="deck-stack-preview">
                                <div class="deck-stack-header">
                                    <span>Curriculum Slide Decks</span>
                                    <span>${deckAvatars.length} Attached</span>
                                </div>
                                <div class="deck-stack-avatars">
                                    ${deckAvatars.map(d => `
                                        <img src="${d.cover}" alt="${escapeHtml(d.title)}" class="deck-avatar" title="${escapeHtml(d.title)}">
                                    `).join('')}
                                    ${topicsCount > deckAvatars.length ? `
                                        <span class="deck-avatar-more">+${topicsCount - deckAvatars.length}</span>
                                    ` : ''}
                                </div>
                            </div>
                        </div>

                        <div class="subject-card-footer">
                            <div class="subject-stats-summary">
                                <span class="subject-stat-pill" title="Lessons in Table of Contents">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                                    </svg>
                                    ${topicsCount} Lessons
                                </span>
                                <span class="subject-stat-pill" title="Total Slides">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                                        <line x1="8" y1="21" x2="16" y2="21"/>
                                        <line x1="12" y1="17" x2="12" y2="21"/>
                                    </svg>
                                    ${totalSlides} Slides
                                </span>
                            </div>

                            <button class="btn-open-toc" onclick="openSubjectTOC('${subject.id}')">
                                <span>Table of Contents</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                    <polyline points="12 5 19 12 12 19"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Render Catalog Table
        const tableWrapper = document.getElementById('subjectsTableWrapper');
        if (tableWrapper && tableBody) {
            tableWrapper.style.display = subjectsViewMode === 'table' ? 'block' : 'none';
            tableBody.innerHTML = filtered.map(subject => {
                const topicsCount = subject.topics ? subject.topics.length : 0;
                let totalSlides = 0;
                if (subject.topics) {
                    subject.topics.forEach(t => totalSlides += (t.presentation?.slideCount || 0));
                }

                return `
                    <tr>
                        <td><span class="subject-code-badge">${escapeHtml(subject.code)}</span></td>
                        <td>
                            <strong>${escapeHtml(subject.name)}</strong>
                            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">${escapeHtml(subject.description || '')}</div>
                        </td>
                        <td><span class="chip-term">${escapeHtml(subject.term)}</span></td>
                        <td><span class="chip-year">${escapeHtml(subject.year)}</span></td>
                        <td>${topicsCount} topics</td>
                        <td>${totalSlides} slides</td>
                        <td>
                            <div style="display: flex; gap: var(--space-2); align-items: center;">
                                <button class="btn-open-toc" onclick="openSubjectTOC('${subject.id}')" style="padding: 0.3rem 0.6rem;">Explore TOC</button>
                                ${isStaff ? `
                                    <button class="btn-icon-control" onclick="openEditSubjectModal('${subject.id}')" title="Edit">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M12 20h9"/>
                                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                                        </svg>
                                    </button>
                                    <button class="btn-icon-control danger" onclick="confirmDeleteSubject('${subject.id}', '${escapeHtml(subject.name)}')" title="Delete">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="3 6 5 6 21 6"/>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                        </svg>
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    // Modal: Create Subject
    window.openCreateSubjectModal = function () {
        document.getElementById('subjectModalTitle').textContent = 'Create New Subject';
        document.getElementById('subjectForm').reset();
        document.getElementById('subjectIdInput').value = '';

        selectSegment('termSegmented', '1st Semester');
        selectSegment('yearSegmented', '1st Year');

        updateSubjectPreview();
        openModal('subjectModal');
    };

    // Modal: Edit Subject
    window.openEditSubjectModal = function (id) {
        const subject = subjectsData.find(s => s.id === id);
        if (!subject) return;

        document.getElementById('subjectModalTitle').textContent = 'Edit Subject Details';
        document.getElementById('subjectIdInput').value = subject.id;
        document.getElementById('subjectNameInput').value = subject.name;
        document.getElementById('subjectCodeInput').value = subject.code;
        document.getElementById('subjectDescInput').value = subject.description || '';

        selectSegment('termSegmented', subject.term);
        selectSegment('yearSegmented', subject.year);

        updateSubjectPreview();
        openModal('subjectModal');
    };

    // Save Subject
    window.handleSubjectFormSubmit = async function (e) {
        e.preventDefault();
        const id = document.getElementById('subjectIdInput').value;
        const name = document.getElementById('subjectNameInput').value.trim();
        const code = document.getElementById('subjectCodeInput').value.trim().toUpperCase();
        const term = getSelectedSegment('termSegmented');
        const year = getSelectedSegment('yearSegmented');
        const description = document.getElementById('subjectDescInput').value.trim();

        if (!name || !code || !term || !year) {
            showToast('Subject Name, Code, Term, and Year Level are required.', 'error');
            return;
        }

        const payload = {
            name,
            code,
            term,
            year,
            description,
            createdBy: currentUser ? currentUser.id : null
        };

        try {
            const url = id ? `/api/subjects/${id}` : '/api/subjects';
            const method = id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save subject');

            showToast(id ? 'Subject updated successfully!' : 'Subject created successfully!', 'success');
            closeModal('subjectModal');

            await fetchSubjects();
            renderSubjects();

            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // Delete Subject
    window.confirmDeleteSubject = function (id, name) {
        document.getElementById('deleteSubjectName').textContent = name;
        document.getElementById('deleteSubjectConfirmBtn').onclick = () => deleteSubject(id);
        openModal('deleteSubjectModal');
    };

    async function deleteSubject(id) {
        try {
            const res = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete subject');

            showToast('Subject deleted successfully', 'success');
            closeModal('deleteSubjectModal');

            if (currentSubjectId === id) {
                currentSubjectId = null;
            }

            await fetchSubjects();
            renderSubjects();

            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    // ============================================
    // REQUIREMENT #3: TABLE OF CONTENTS (TOC) & LESSONS
    // ============================================

    window.openSubjectTOC = function (subjectId) {
        currentSubjectId = subjectId;
        if (typeof window.navigateTo === 'function') {
            window.navigateTo('topics');
        }
    };

    window.loadTopicsPage = async function (preferredSubjectId) {
        if (subjectsData.length === 0) {
            await fetchSubjects();
        }

        const subjectId = preferredSubjectId || currentSubjectId || (subjectsData[0] ? subjectsData[0].id : null);
        if (!subjectId) {
            document.getElementById('tocEmptyState').style.display = 'block';
            document.getElementById('tocContentWrapper').style.display = 'none';
            return;
        }

        currentSubjectId = subjectId;
        await fetchSubjectDetails(subjectId);
        renderTOC();
    };

    function renderTOC() {
        if (!currentSubject) {
            document.getElementById('tocEmptyState').style.display = 'block';
            document.getElementById('tocContentWrapper').style.display = 'none';
            return;
        }

        document.getElementById('tocEmptyState').style.display = 'none';
        document.getElementById('tocContentWrapper').style.display = 'block';

        const isStaff = isTeacherOrAdmin();
        const topics = currentSubject.topics || [];

        // Render Hero Banner
        document.getElementById('tocHeroCode').textContent = currentSubject.code;
        document.getElementById('tocHeroTerm').textContent = currentSubject.term;
        document.getElementById('tocHeroYear').textContent = currentSubject.year;
        document.getElementById('tocHeroTitle').textContent = currentSubject.name;
        document.getElementById('tocHeroDesc').textContent = currentSubject.description || 'Welcome to the course Table of Contents. Work through each presentation in order.';

        let totalSlides = 0;
        let publishedCount = 0;
        topics.forEach(t => {
            totalSlides += (t.presentation?.slideCount || 0);
            if (t.isPublished !== 0) publishedCount++;
        });

        document.getElementById('tocMetricTopics').textContent = topics.length;
        document.getElementById('tocMetricSlides').textContent = totalSlides;

        // Student Banner notice if any topics are withheld/drafted by instructor
        let studentBanner = document.getElementById('tocStudentBanner');
        if (!studentBanner) {
            studentBanner = document.createElement('div');
            studentBanner.id = 'tocStudentBanner';
            const controlsBar = document.querySelector('.toc-controls-bar');
            if (controlsBar && controlsBar.parentNode) {
                controlsBar.parentNode.insertBefore(studentBanner, controlsBar);
            }
        }

        if (!isStaff) {
            studentBanner.className = 'student-notice-banner';
            studentBanner.style.display = 'flex';
            studentBanner.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <span>Showing <strong>${publishedCount} released lesson${publishedCount !== 1 ? 's' : ''}</strong> uploaded by your instructor for this course.</span>
            `;
        } else {
            studentBanner.style.display = 'none';
        }

        // Populate Subject Switcher in TOC
        populateSubjectSwitcher();

        // Render Views
        const whiteboardContainer = document.getElementById('tocWhiteboardGrid');
        const sequentialContainer = document.getElementById('tocSequentialList');

        if (tocViewMode === 'whiteboard') {
            whiteboardContainer.style.display = 'grid';
            sequentialContainer.style.display = 'none';
            renderWhiteboardGrid(topics);
        } else {
            whiteboardContainer.style.display = 'none';
            sequentialContainer.style.display = 'flex';
            renderSequentialTOC(topics);
        }
    }

    // Whiteboard Grid View: 2 Columns (1-3 on Left, 4-6 on Right)
    function renderWhiteboardGrid(topics) {
        const col1 = document.getElementById('tocCol1');
        const col2 = document.getElementById('tocCol2');
        if (!col1 || !col2) return;

        if (topics.length === 0) {
            col1.innerHTML = '<div style="padding: 2rem; color: var(--color-text-muted); text-align: center;">No lessons uploaded yet by instructor.</div>';
            col2.innerHTML = '';
            return;
        }

        // Split topics: first half to left (1, 2, 3), second half to right (4, 5, 6)
        const half = Math.ceil(topics.length / 2);
        const leftTopics = topics.slice(0, half);
        const rightTopics = topics.slice(half);

        col1.innerHTML = `
            <div class="toc-column-header">
                <span>Section 1 • Foundation Modules</span>
                <span>${leftTopics.length} Lessons</span>
            </div>
            ${leftTopics.map((topic, i) => renderTopicCard(topic, i + 1, topics.length)).join('')}
        `;

        col2.innerHTML = `
            <div class="toc-column-header">
                <span>Section 2 • Advanced & E-Commerce</span>
                <span>${rightTopics.length} Lessons</span>
            </div>
            ${rightTopics.map((topic, i) => renderTopicCard(topic, half + i + 1, topics.length)).join('')}
        `;
    }

    function renderTopicCard(topic, displayIndex, totalCount) {
        const key = (topic.presentationKey || '').toLowerCase();
        const brand = BRAND_COLORS[key] || { color: '#0073aa', light: '#e8f4fd', label: topic.title };
        const pres = topic.presentation || {};
        const coverUrl = pres.cover || '/uploads/presentations/placeholder.webp';
        const slideCount = pres.slideCount || 0;
        const sourceUrl = pres.sourceUrl || null;
        const sourceName = pres.sourceName || `${topic.title}.pptx`;
        const outlineItems = topic.outline ? topic.outline.split('\n').filter(Boolean) : [];
        const isStaff = isTeacherOrAdmin();
        const isUploaded = topic.isPublished !== 0;
        const isLocked = !isStaff && topic.isUnlocked === false;
        const isPassed = !isStaff && topic.isPassed === true;

        return `
            <div class="topic-card ${!isUploaded ? 'is-draft' : ''} ${isLocked ? 'is-locked-card' : ''}" data-topic-id="${topic.id}">
                <div class="topic-card-accent-bar" style="background: ${isLocked ? '#9ca3af' : brand.color};"></div>
                <div class="topic-card-body">
                    <div class="topic-head-row">
                        <div style="display: flex; align-items: center; gap: var(--space-2);">
                            <span class="topic-numeral" style="color: ${isLocked ? '#9ca3af' : brand.color}; display: inline-flex; align-items: center; gap: 3px;">
                                ${isLocked ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' : ''}${String(displayIndex).padStart(2, '0')}
                            </span>
                            <span class="topic-brand-tag" style="background: ${isLocked ? '#6b7280' : brand.color};">
                                ${escapeHtml(brand.label)}
                            </span>
                        </div>

                        ${isStaff ? `
                            <span class="status-badge ${isUploaded ? 'published' : 'draft'}">
                                <span class="status-dot ${isUploaded ? 'green' : 'amber'}"></span>
                                ${isUploaded ? 'Uploaded (Live)' : 'Not Uploaded (Draft)'}
                            </span>
                        ` : `
                            ${isPassed ? `
                                <span class="status-badge published" style="background: #ecfdf5; color: #065f46; border: 1px solid rgba(16, 185, 129, 0.4);">
                                    <span class="status-dot green"></span>
                                    Passed
                                </span>
                            ` : isLocked ? `
                                <span class="status-badge draft" style="background: #f3f4f6; color: #6b7280; border: 1px solid #e5e7eb; display: inline-flex; align-items: center; gap: 4px;">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                    <span>Locked</span>
                                </span>
                            ` : `
                                <span class="status-badge" style="background: #eff6ff; color: #1d4ed8; border: 1px solid rgba(59, 130, 246, 0.4);">
                                    <span class="status-dot green" style="background: #3b82f6; box-shadow: 0 0 6px rgba(59, 130, 246, 0.6);"></span>
                                    Available
                                </span>
                            `}
                        `}
                    </div>

                    <!-- Slide Preview Thumbnail -->
                    <div class="topic-preview-container ${isLocked ? 'locked-preview' : ''}" 
                         onclick="${isLocked ? `window.showTopicLockModal(${displayIndex})` : `openTopicSlides('${topic.id}')`}" 
                         title="${isLocked ? `Topic ${displayIndex} is locked. Pass Topic ${displayIndex - 1} Quiz first!` : 'Click to launch interactive slide presentation'}">
                        <img src="${coverUrl}" alt="${escapeHtml(topic.title)}" class="topic-preview-img" style="${isLocked ? 'filter: grayscale(85%) opacity(0.7);' : ''}" onerror="this.src='/uploads/presentations/placeholder.webp'">
                        <div class="topic-preview-overlay">
                            ${isLocked ? `
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                                <span>Locked (Pass Topic ${displayIndex - 1} Quiz)</span>
                            ` : `
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polygon points="10 8 16 12 10 16 10 8"/>
                                </svg>
                                <span>Launch Presentation</span>
                            `}
                        </div>
                        <span class="topic-slide-counter-chip">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                            </svg>
                            ${slideCount} slides
                        </span>
                    </div>

                    <div>
                        <h4 class="topic-title" style="${isLocked ? 'color: var(--color-text-muted);' : ''}">${escapeHtml(topic.title)}</h4>
                        <p class="topic-description">${escapeHtml(topic.description || 'Slide presentation module and structured syllabus.')}</p>
                    </div>

                    <!-- Outline / Syllabus Pills -->
                    ${outlineItems.length > 0 ? `
                        <div class="topic-outline-box">
                            <span class="topic-outline-label">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="8" y1="6" x2="21" y2="6"/>
                                    <line x1="8" y1="12" x2="21" y2="12"/>
                                    <line x1="8" y1="18" x2="21" y2="18"/>
                                    <line x1="3" y1="6" x2="3.01" y2="6"/>
                                    <line x1="3" y1="12" x2="3.01" y2="12"/>
                                    <line x1="3" y1="18" x2="3.01" y2="18"/>
                                </svg>
                                Syllabus Agenda (${outlineItems.length} Key Topics)
                            </span>
                            <ul class="topic-outline-list">
                                ${outlineItems.map(item => `
                                    <li class="topic-outline-tag">${escapeHtml(item)}</li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>

                <div class="topic-card-footer">
                    <div style="display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap;">
                        ${isLocked ? `
                            <button class="btn-deck-action" onclick="window.showTopicLockModal(${displayIndex})" style="background: #f3f4f6; color: #6b7280; border: 1px dashed #d1d5db;">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                                <span>Locked</span>
                            </button>
                        ` : `
                            <button class="btn-deck-action btn-open-slides" onclick="openTopicSlides('${topic.id}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="5 3 19 12 5 21 5 3"/>
                                </svg>
                                <span>Open Slides</span>
                            </button>
                        `}

                        ${!isStaff && isPassed ? `
                            <button class="btn-deck-action" onclick="window.navigateTo('scores')" style="background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0;" title="View official grade slip">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                <span>Grade Slip</span>
                            </button>
                        ` : !isStaff && !isLocked ? `
                            <button class="btn-deck-action" onclick="window.navigateTo('quizzes')" style="background: var(--color-primary); color: #ffffff; border: none; font-weight: 700;" title="Take topic quiz">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polygon points="10 8 16 12 10 16 10 8"/>
                                </svg>
                                <span>Take Quiz</span>
                            </button>
                        ` : ''}

                        ${sourceUrl && !isLocked ? `
                            <a href="${sourceUrl}" download="${sourceName}" class="btn-deck-action btn-download-deck" title="Download original PowerPoint presentation (.pptx)">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                <span>.PPTX</span>
                            </a>
                        ` : ''}

                        ${isStaff ? `
                            <button class="btn-deck-action" onclick="window.openSlideCreatorModal('${topic.id}')" title="Create or edit interactive presentation slides" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 20h9"/>
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                                </svg>
                                <span>+ Slides</span>
                            </button>
                            <button class="btn-deck-action" onclick="window.openCreateQuizModal('${topic.id}')" title="Create or edit multiple choice quiz (10-30 questions)" style="background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0;">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                                </svg>
                                <span>+ Quiz</span>
                            </button>
                            ${topic.quiz ? `
                                <button class="btn-deck-action" onclick="if(window.previewQuiz) window.previewQuiz('${topic.quiz.id}')" title="Preview multiple choice quiz for this topic" style="background: #fef3c7; color: #92400e; border: 1px solid #fde68a;">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                    <span>Preview</span>
                                </button>
                            ` : ''}
                            <button class="btn-toggle-upload ${isUploaded ? 'hide-btn' : 'upload-btn'}" 
                                    onclick="toggleTopicPublish('${topic.id}', ${!isUploaded})">
                                ${isUploaded ? `
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                        <line x1="1" y1="1" x2="23" y2="23"/>
                                    </svg>
                                    <span>Hide</span>
                                ` : `
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="16 16 12 12 8 16"/>
                                        <line x1="12" y1="12" x2="12" y2="21"/>
                                        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                                    </svg>
                                    <span>Upload</span>
                                `}
                            </button>
                        ` : ''}
                    </div>

                    ${isStaff ? `
                        <div class="topic-staff-controls">
                            <button class="btn-icon-control" onclick="moveTopic('${topic.id}', 'up')" title="Move Up" ${displayIndex === 1 ? 'disabled style="opacity:0.3;"' : ''}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="18 15 12 9 6 15"/>
                                </svg>
                            </button>
                            <button class="btn-icon-control" onclick="moveTopic('${topic.id}', 'down')" title="Move Down" ${displayIndex === totalCount ? 'disabled style="opacity:0.3;"' : ''}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9"/>
                                </svg>
                            </button>
                            <button class="btn-icon-control" onclick="openEditTopicModal('${topic.id}')" title="Edit Topic">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 20h9"/>
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                                </svg>
                            </button>
                            <button class="btn-icon-control danger" onclick="confirmDeleteTopic('${topic.id}', '${escapeHtml(topic.title)}')" title="Delete Topic">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Teacher Toggle Publish API call
    window.toggleTopicPublish = async function (topicId, newStatus) {
        try {
            const role = getUserRole();
            const res = await fetch(`/api/topics/${topicId}/publish`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-role': role
                },
                body: JSON.stringify({ isPublished: newStatus })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update visibility');

            showToast(
                newStatus ? 'Lesson uploaded and now visible to students!' : 'Lesson hidden from students (draft mode).',
                newStatus ? 'success' : 'info'
            );

            await fetchSubjectDetails(currentSubject.id);
            renderTOC();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // Sequential TOC View
    function renderSequentialTOC(topics) {
        const container = document.getElementById('tocSequentialList');
        if (!container) return;

        const isStaff = isTeacherOrAdmin();

        if (topics.length === 0) {
            container.innerHTML = '<div style="padding: 2rem; color: var(--color-text-muted); text-align: center;">No released lessons available yet.</div>';
            return;
        }

        container.innerHTML = topics.map((topic, i) => {
            const pres = topic.presentation || {};
            const coverUrl = pres.cover || '/uploads/presentations/placeholder.webp';
            const slideCount = pres.slideCount || 0;
            const sourceUrl = pres.sourceUrl || null;
            const sourceName = pres.sourceName || `${topic.title}.pptx`;
            const isUploaded = topic.isPublished !== 0;
            const isLocked = !isStaff && topic.isUnlocked === false;
            const isPassed = !isStaff && topic.isPassed === true;

            return `
                <div class="toc-seq-item ${isLocked ? 'locked' : ''}" data-topic-id="${topic.id}">
                    <span class="toc-seq-num" style="${isLocked ? 'color: #9ca3af;' : ''}">
                        ${isLocked ? '🔒' : String(i + 1).padStart(2, '0')}
                    </span>
                    <img src="${coverUrl}" alt="${escapeHtml(topic.title)}" class="toc-seq-thumb" 
                         style="${isLocked ? 'filter: grayscale(85%) opacity(0.7);' : ''}"
                         onclick="${isLocked ? `window.showTopicLockModal(${i + 1})` : `openTopicSlides('${topic.id}')`}" 
                         title="${isLocked ? `Locked. Pass Topic ${i} Quiz first` : 'Open slide viewer'}">
                    <div class="toc-seq-info">
                        <div class="toc-seq-title-row">
                            <span class="toc-seq-title" style="${isLocked ? 'color: var(--color-text-muted);' : ''}">${escapeHtml(topic.title)}</span>
                            ${isStaff ? `
                                <span class="status-badge ${isUploaded ? 'published' : 'draft'}" style="font-size: 0.6875rem; padding: 0.15rem 0.5rem;">
                                    <span class="status-dot ${isUploaded ? 'green' : 'amber'}"></span>
                                    ${isUploaded ? 'Uploaded' : 'Draft'}
                                </span>
                            ` : `
                                ${isPassed ? `
                                    <span class="status-badge published" style="font-size: 0.6875rem; padding: 0.15rem 0.5rem;">✓ Passed</span>
                                ` : isLocked ? `
                                    <span class="status-badge draft" style="font-size: 0.6875rem; padding: 0.15rem 0.5rem; background:#f3f4f6; color:#6b7280; border: 1px solid #e5e7eb;">🔒 Locked</span>
                                ` : `
                                    <span class="status-badge" style="font-size: 0.6875rem; padding: 0.15rem 0.5rem; background:#eff6ff; color:#1d4ed8; border: 1px solid rgba(59, 130, 246, 0.3);">Available</span>
                                `}
                            `}
                            <div class="toc-seq-leader"></div>
                            <span class="toc-seq-slides-badge">${slideCount} slides</span>
                        </div>
                        <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: 2px;">
                            ${escapeHtml(topic.description || '')}
                        </div>
                    </div>
                    <div style="display: flex; gap: var(--space-2); align-items: center;">
                        ${isLocked ? `
                            <button class="btn-deck-action" onclick="window.showTopicLockModal(${i + 1})" style="padding: 0.35rem 0.65rem; background: #f3f4f6; color: #6b7280; border: 1px dashed #d1d5db;">
                                🔒 Locked
                            </button>
                        ` : `
                            <button class="btn-deck-action btn-open-slides" onclick="openTopicSlides('${topic.id}')" style="padding: 0.35rem 0.65rem;">
                                View
                            </button>
                        `}
                        ${sourceUrl && !isLocked ? `
                            <a href="${sourceUrl}" download="${escapeHtml(sourceName)}" class="btn-deck-action btn-download-deck" style="padding: 0.35rem 0.65rem;" title="Download ${escapeHtml(sourceName)}">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                <span>.PPTX</span>
                            </a>
                        ` : ''}
                        ${isStaff ? `
                            <button class="btn-toggle-upload ${isUploaded ? 'hide-btn' : 'upload-btn'}" 
                                    onclick="toggleTopicPublish('${topic.id}', ${!isUploaded})" style="padding: 0.3rem 0.6rem;">
                                ${isUploaded ? 'Hide' : 'Upload'}
                            </button>
                            <button class="btn-icon-control" onclick="openEditTopicModal('${topic.id}')" title="Edit">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 20h9"/>
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Modal: Add Topic
    window.openAddTopicModal = function () {
        if (!currentSubject) return;
        document.getElementById('topicModalTitle').textContent = `Add Lesson to ${currentSubject.code}`;
        document.getElementById('topicForm').reset();
        document.getElementById('topicIdInput').value = '';
        document.getElementById('topicSubjectIdInput').value = currentSubject.id;

        if (document.getElementById('topicSummaryInput')) document.getElementById('topicSummaryInput').value = '';
        if (document.getElementById('topicContentInput')) document.getElementById('topicContentInput').value = '';

        // Default: Upload to students checked
        const publishCheckbox = document.getElementById('topicIsPublishedCheckbox');
        if (publishCheckbox) publishCheckbox.checked = true;

        const fileStatus = document.getElementById('topicFileUploadStatus');
        if (fileStatus) fileStatus.style.display = 'none';

        customUploadedPresentation = null;
        updateTopicPresentationPreview();
        openModal('topicModal');
    };

    // Modal: Edit Topic
    window.openEditTopicModal = function (topicId) {
        if (!currentSubject) return;
        const topic = (currentSubject.topics || []).find(t => t.id === topicId);
        if (!topic) return;

        document.getElementById('topicModalTitle').textContent = 'Edit Lesson Details';
        document.getElementById('topicIdInput').value = topic.id;
        document.getElementById('topicSubjectIdInput').value = currentSubject.id;
        document.getElementById('topicTitleInput').value = topic.title;
        document.getElementById('topicDescInput').value = topic.description || '';
        document.getElementById('topicOutlineInput').value = topic.outline || '';

        if (document.getElementById('topicSummaryInput')) {
            document.getElementById('topicSummaryInput').value = topic.summary || '';
        }
        if (document.getElementById('topicContentInput')) {
            document.getElementById('topicContentInput').value = topic.content || '';
        }

        const publishCheckbox = document.getElementById('topicIsPublishedCheckbox');
        if (publishCheckbox) {
            publishCheckbox.checked = topic.isPublished !== 0;
        }

        const presSelect = document.getElementById('topicPresentationSelect');
        if (presSelect) {
            presSelect.value = topic.presentationKey || '';
        }

        const fileStatus = document.getElementById('topicFileUploadStatus');
        if (topic.customFile) {
            customUploadedPresentation = {
                fileUrl: topic.customFile,
                filename: topic.customFile.split('/').pop(),
                originalname: topic.customFile.split('/').pop()
            };
            if (fileStatus) {
                fileStatus.style.display = 'inline-block';
                fileStatus.textContent = 'Attached file: ' + customUploadedPresentation.originalname;
                fileStatus.style.color = 'var(--color-primary)';
            }
        } else {
            customUploadedPresentation = null;
            if (fileStatus) fileStatus.style.display = 'none';
        }

        updateTopicPresentationPreview();
        openModal('topicModal');
    };

    window.launchInSystemSlideCreatorFromModal = function () {
        const topicId = document.getElementById('topicIdInput').value;
        closeModal('topicModal');
        if (topicId && typeof window.openSlideCreatorModal === 'function') {
            window.openSlideCreatorModal(topicId);
        } else {
            showToast('Save the lesson first, then you can customize presentation slides.', 'info');
        }
    };

    // Save Topic
    window.handleTopicFormSubmit = async function (e) {
        e.preventDefault();
        const topicId = document.getElementById('topicIdInput').value;
        const subjectId = document.getElementById('topicSubjectIdInput').value || currentSubject.id;
        const title = document.getElementById('topicTitleInput').value.trim();
        const description = document.getElementById('topicDescInput').value.trim();
        const presentationKey = document.getElementById('topicPresentationSelect').value;
        const outline = document.getElementById('topicOutlineInput').value.trim();
        const summary = document.getElementById('topicSummaryInput') ? document.getElementById('topicSummaryInput').value.trim() : '';
        const content = document.getElementById('topicContentInput') ? document.getElementById('topicContentInput').value.trim() : '';
        const isPublished = document.getElementById('topicIsPublishedCheckbox') ? document.getElementById('topicIsPublishedCheckbox').checked : true;

        if (!title) {
            showToast('Lesson Title is required', 'error');
            return;
        }

        const payload = {
            title,
            description,
            presentationKey: presentationKey || null,
            customFile: customUploadedPresentation ? customUploadedPresentation.fileUrl : null,
            outline,
            summary: summary || null,
            content: content || null,
            isPublished
        };

        try {
            const url = topicId ? `/api/topics/${topicId}` : `/api/subjects/${subjectId}/topics`;
            const method = topicId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'x-user-role': getUserRole()
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save lesson');

            showToast(topicId ? 'Lesson updated!' : 'Lesson added to Table of Contents!', 'success');
            closeModal('topicModal');

            await fetchSubjectDetails(subjectId);
            renderTOC();

            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // Move Topic (Reorder)
    window.moveTopic = async function (topicId, direction) {
        if (!currentSubject || !currentSubject.topics) return;
        const list = [...currentSubject.topics];
        const index = list.findIndex(t => t.id === topicId);
        if (index === -1) return;

        if (direction === 'up' && index > 0) {
            const temp = list[index];
            list[index] = list[index - 1];
            list[index - 1] = temp;
        } else if (direction === 'down' && index < list.length - 1) {
            const temp = list[index];
            list[index] = list[index + 1];
            list[index + 1] = temp;
        } else {
            return;
        }

        const orderedIds = list.map(t => t.id);

        try {
            const res = await fetch(`/api/subjects/${currentSubject.id}/topics/reorder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderedIds })
            });

            if (!res.ok) throw new Error('Failed to reorder lessons');
            showToast('Table of Contents reordered!', 'success');

            await fetchSubjectDetails(currentSubject.id);
            renderTOC();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // Delete Topic
    window.confirmDeleteTopic = function (id, title) {
        document.getElementById('deleteTopicTitle').textContent = title;
        document.getElementById('deleteTopicConfirmBtn').onclick = () => deleteTopic(id);
        openModal('deleteTopicModal');
    };

    async function deleteTopic(id) {
        try {
            const res = await fetch(`/api/topics/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete lesson');

            showToast('Lesson deleted from Table of Contents', 'success');
            closeModal('deleteTopicModal');

            await fetchSubjectDetails(currentSubject.id);
            renderTOC();

            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    // ============================================
    // INTERACTIVE SLIDE THEATER / VIEWER
    // ============================================

    window.openTopicSlides = function (topicId) {
        if (!currentSubject || !currentSubject.topics) return;
        const topic = currentSubject.topics.find(t => t.id === topicId);
        if (!topic) return;

        // Prerequisite check: if student attempts to open a locked topic
        if (!isTeacherOrAdmin() && topic.isUnlocked === false) {
            window.showTopicLockModal(topic.orderIndex);
            return;
        }

        let slides = [];
        let isCustom = false;
        if (topic.presentation && Array.isArray(topic.presentation.slides) && topic.presentation.slides.length > 0) {
            slides = topic.presentation.slides;
            isCustom = false;
        } else if (Array.isArray(topic.customSlides) && topic.customSlides.length > 0) {
            slides = topic.customSlides;
            isCustom = true;
        } else {
            showToast('No slide presentation attached to this lesson yet.', 'info');
            return;
        }

        slideViewer.active = true;
        slideViewer.topic = topic;
        slideViewer.slides = slides;
        slideViewer.isCustom = isCustom;
        slideViewer.currentIndex = 0;
        slideViewer.notesOpen = false;

        const modal = document.getElementById('slideViewerModal');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Title and meta
        document.getElementById('viewerTopicTitle').textContent = topic.title;
        document.getElementById('viewerDeckCategory').textContent = isCustom ? 'In-System Slides' : (topic.presentation?.category || 'Presentation');

        // Download link
        const downloadBtn = document.getElementById('viewerDownloadBtn');
        if (downloadBtn) {
            if (topic.presentation && topic.presentation.sourceUrl) {
                downloadBtn.href = topic.presentation.sourceUrl;
                downloadBtn.setAttribute('download', topic.presentation.sourceName || `${topic.title}.pptx`);
                downloadBtn.title = `Download ${topic.presentation.sourceName || `${topic.title}.pptx`}`;
                downloadBtn.style.display = 'inline-flex';
            } else {
                downloadBtn.style.display = 'none';
            }
        }

        // Quiz button in viewer
        const quizBtn = document.getElementById('viewerQuizBtn');
        if (quizBtn) {
            if (topic.hasQuiz && topic.quiz) {
                quizBtn.style.display = 'inline-flex';
            } else {
                quizBtn.style.display = 'none';
            }
        }

        // Render notes drawer
        const outlineItems = topic.outline ? topic.outline.split('\n').filter(Boolean) : [];
        document.getElementById('viewerNotesContent').innerHTML = `
            <h4 style="font-size: var(--font-size-base); font-weight:700; margin-bottom: var(--space-3); color:#fff;">${escapeHtml(topic.title)} Syllabus</h4>
            <p style="font-size: var(--font-size-sm); color: rgba(255,255,255,0.7); margin-bottom: var(--space-4);">${escapeHtml(topic.description || '')}</p>
            <h5 style="font-size: var(--font-size-xs); text-transform:uppercase; color: var(--color-primary-accent); margin-bottom: var(--space-2);">Agenda Points</h5>
            <ul style="list-style: disc; padding-left: var(--space-4); font-size: var(--font-size-sm); color: rgba(255,255,255,0.85); line-height: 1.6;">
                ${outlineItems.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
        `;

        // Render Filmstrip
        const filmstrip = document.getElementById('viewerFilmstrip');
        if (isCustom) {
            filmstrip.innerHTML = slides.map((s, i) => `
                <div class="filmstrip-thumb ${i === 0 ? 'active' : ''}" style="width: 72px; height: 42px; background: #1e293b; color: #fff; font-size: 0.72rem; display: flex; align-items: center; justify-content: center; font-weight: 700; cursor: pointer; border-radius: 4px;" onclick="window.jumpToSlide(${i})" data-index="${i}">
                    Slide ${i + 1}
                </div>
            `).join('');
        } else {
            filmstrip.innerHTML = slides.map((url, i) => `
                <img src="${url}" alt="Slide ${i + 1}" class="filmstrip-thumb ${i === 0 ? 'active' : ''}" 
                     onclick="window.jumpToSlide(${i})" data-index="${i}">
            `).join('');
        }

        renderCurrentSlide();
        document.addEventListener('keydown', handleViewerKeydown);
    };

    window.launchQuizFromViewer = function () {
        if (slideViewer.topic && slideViewer.topic.quiz) {
            const qId = slideViewer.topic.quiz.id;
            window.closeSlideViewer();
            if (typeof window.startQuizAttempt === 'function') {
                window.startQuizAttempt(qId);
            }
        }
    };

    window.closeSlideViewer = function () {
        slideViewer.active = false;
        const modal = document.getElementById('slideViewerModal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleViewerKeydown);
    };

    window.viewerNextSlide = function () {
        if (!slideViewer.active) return;
        if (slideViewer.currentIndex < slideViewer.slides.length - 1) {
            slideViewer.currentIndex++;
            renderCurrentSlide();
        }
    };

    window.viewerPrevSlide = function () {
        if (!slideViewer.active) return;
        if (slideViewer.currentIndex > 0) {
            slideViewer.currentIndex--;
            renderCurrentSlide();
        }
    };

    window.jumpToSlide = function (index) {
        if (!slideViewer.active || index < 0 || index >= slideViewer.slides.length) return;
        slideViewer.currentIndex = index;
        renderCurrentSlide();
    };

    window.toggleViewerNotes = function () {
        slideViewer.notesOpen = !slideViewer.notesOpen;
        const drawer = document.getElementById('viewerNotesDrawer');
        if (drawer) {
            drawer.classList.toggle('open', slideViewer.notesOpen);
        }
    };

    window.toggleViewerFullscreen = function () {
        const modal = document.getElementById('slideViewerModal');
        if (!document.fullscreenElement) {
            modal.requestFullscreen().catch(err => console.log(err));
        } else {
            document.exitFullscreen().catch(err => console.log(err));
        }
    };

    function renderCurrentSlide() {
        const total = slideViewer.slides.length;
        const current = slideViewer.currentIndex;

        const img = document.getElementById('viewerSlideImage');
        const customContainer = document.getElementById('viewerCustomSlideContent');

        if (slideViewer.isCustom) {
            if (img) img.style.display = 'none';
            if (customContainer) {
                customContainer.style.display = 'block';
                const slide = slideViewer.slides[current];
                customContainer.className = `slide-html-card theme-${slide.theme || 'indigo'}`;
                customContainer.innerHTML = `
                    <h3 class="slide-html-title">${escapeHtml(slide.title)}</h3>
                    <div class="slide-html-subtitle">${escapeHtml(slide.subtitle || '')}</div>
                    <ul class="slide-html-bullets">
                        ${(slide.bullets || []).map(b => `<li>${escapeHtml(b)}</li>`).join('')}
                    </ul>
                `;
            }
        } else {
            if (customContainer) customContainer.style.display = 'none';
            if (img) {
                img.style.display = 'block';
                img.style.opacity = '0.4';
                img.src = slideViewer.slides[current];
                img.onload = () => { img.style.opacity = '1'; };
            }
        }

        document.getElementById('viewerCounterBadge').textContent = `Slide ${current + 1} of ${total}`;
        const pct = ((current + 1) / total) * 100;
        document.getElementById('viewerProgressBar').style.width = `${pct}%`;

        const thumbs = document.querySelectorAll('.filmstrip-thumb');
        thumbs.forEach((t, i) => {
            if (i === current) {
                t.classList.add('active');
                t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            } else {
                t.classList.remove('active');
            }
        });

        const prevBtn = document.getElementById('viewerPrevBtn');
        const nextBtn = document.getElementById('viewerNextBtn');
        if (prevBtn) prevBtn.style.opacity = current === 0 ? '0.3' : '1';
        if (nextBtn) nextBtn.style.opacity = current === total - 1 ? '0.3' : '1';
    }

    function handleViewerKeydown(e) {
        if (!slideViewer.active) return;
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'd' || e.key === 'D') {
            e.preventDefault();
            window.viewerNextSlide();
        } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            e.preventDefault();
            window.viewerPrevSlide();
        } else if (e.key === 'Escape') {
            window.closeSlideViewer();
        }
    }

    // ============================================
    // UI HELPERS & LISTENERS
    // ============================================

    function initEventListeners() {
        // Search & Filters on Subjects Page
        const searchInput = document.getElementById('subjectSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => renderSubjects());
        }

        const termFilter = document.getElementById('subjectTermFilter');
        if (termFilter) {
            termFilter.addEventListener('change', () => renderSubjects());
        }

        const yearFilter = document.getElementById('subjectYearFilter');
        if (yearFilter) {
            yearFilter.addEventListener('change', () => renderSubjects());
        }

        // View Mode Switcher on Subjects Page
        const viewGridBtn = document.getElementById('subjectViewGridBtn');
        const viewTableBtn = document.getElementById('subjectViewTableBtn');
        if (viewGridBtn && viewTableBtn) {
            viewGridBtn.addEventListener('click', () => {
                subjectsViewMode = 'grid';
                viewGridBtn.classList.add('active');
                viewTableBtn.classList.remove('active');
                renderSubjects();
            });
            viewTableBtn.addEventListener('click', () => {
                subjectsViewMode = 'table';
                viewTableBtn.classList.add('active');
                viewGridBtn.classList.remove('active');
                renderSubjects();
            });
        }

        // TOC View Mode Switcher
        const tocViewWhiteboardBtn = document.getElementById('tocViewWhiteboardBtn');
        const tocViewSeqBtn = document.getElementById('tocViewSeqBtn');
        if (tocViewWhiteboardBtn && tocViewSeqBtn) {
            tocViewWhiteboardBtn.addEventListener('click', () => {
                tocViewMode = 'whiteboard';
                tocViewWhiteboardBtn.classList.add('active');
                tocViewSeqBtn.classList.remove('active');
                renderTOC();
            });
            tocViewSeqBtn.addEventListener('click', () => {
                tocViewMode = 'sequential';
                tocViewSeqBtn.classList.add('active');
                tocViewWhiteboardBtn.classList.remove('active');
                renderTOC();
            });
        }

        // Live Preview in Subject Modal
        const nameInp = document.getElementById('subjectNameInput');
        const codeInp = document.getElementById('subjectCodeInput');
        const descInp = document.getElementById('subjectDescInput');
        [nameInp, codeInp, descInp].forEach(el => {
            if (el) el.addEventListener('input', updateSubjectPreview);
        });

        // Presentation Selector in Topic Modal
        const presSelect = document.getElementById('topicPresentationSelect');
        if (presSelect) {
            presSelect.addEventListener('change', updateTopicPresentationPreview);
        }

        // Custom File Upload in Topic Modal
        const customFileInput = document.getElementById('topicCustomFileInput');
        if (customFileInput) {
            customFileInput.addEventListener('change', handleCustomFileUpload);
        }

        // Forms
        const subjectForm = document.getElementById('subjectForm');
        if (subjectForm) {
            subjectForm.addEventListener('submit', window.handleSubjectFormSubmit);
        }

        const topicForm = document.getElementById('topicForm');
        if (topicForm) {
            topicForm.addEventListener('submit', window.handleTopicFormSubmit);
        }
    }

    async function handleCustomFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const statusEl = document.getElementById('topicFileUploadStatus');
        statusEl.style.display = 'block';
        statusEl.textContent = `Uploading ${file.name}...`;
        statusEl.style.color = 'var(--color-primary)';

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/topics/upload-presentation', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');

            statusEl.textContent = `Uploaded: ${data.originalname} (${Math.round(data.size / 1024)} KB)`;
            statusEl.style.color = 'var(--color-success)';

            // Auto-fill title if empty
            const titleInput = document.getElementById('topicTitleInput');
            if (titleInput && !titleInput.value) {
                titleInput.value = file.name.replace(/\.[^/.]+$/, "");
            }

            customUploadedPresentation = data;

            // Update preview box
            const previewBox = document.getElementById('topicPresentationPreviewBox');
            if (previewBox) {
                previewBox.style.display = 'flex';
                previewBox.innerHTML = `
                    <div style="font-size: 2rem;">📊</div>
                    <div>
                        <strong>Custom Presentation Attached: ${escapeHtml(data.originalname)}</strong>
                        <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: 2px;">
                            ${data.fileUrl} (${Math.round(data.size / 1024)} KB)
                        </div>
                    </div>
                `;
            }
        } catch (err) {
            statusEl.textContent = `Error: ${err.message}`;
            statusEl.style.color = 'var(--color-error)';
        }
    }

    window.handleTopicCustomUpload = function (file) {
        if (!file) return;
        handleCustomFileUpload({ target: { files: [file] } });
    };

    function hookIntoNavigation() {
        const origNavigateTo = window.navigateTo;
        window.navigateTo = function (pageName) {
            if (typeof origNavigateTo === 'function') {
                origNavigateTo(pageName);
            }
            if (pageName === 'subjects') {
                window.loadSubjectsPage();
            } else if (pageName === 'topics') {
                window.loadTopicsPage();
            }
        };
    }

    function populatePresentationDropdown() {
        const select = document.getElementById('topicPresentationSelect');
        if (!select) return;

        const currentVal = select.value;
        select.innerHTML = `
            <option value="">-- No Presentation Attached (Text Only) --</option>
            ${presentationsLibrary.map(p => `
                <option value="${p.key}">
                    ${escapeHtml(p.title)} (${p.slideCount} slides - ${escapeHtml(p.category)})
                </option>
            `).join('')}
        `;
        if (currentVal) select.value = currentVal;
    }

    function populateSubjectSwitcher() {
        const switcher = document.getElementById('tocSubjectSwitcher');
        if (!switcher) return;

        switcher.innerHTML = subjectsData.map(s => `
            <option value="${s.id}" ${s.id === currentSubjectId ? 'selected' : ''}>
                ${escapeHtml(s.code)}: ${escapeHtml(s.name)}
            </option>
        `).join('');

        switcher.onchange = (e) => {
            window.loadTopicsPage(e.target.value);
        };
    }

    function updateSubjectPreview() {
        const code = (document.getElementById('subjectCodeInput')?.value || 'IT 315').toUpperCase();
        const name = document.getElementById('subjectNameInput')?.value || 'Course Title';
        const term = getSelectedSegment('termSegmented') || '1st Semester';
        const year = getSelectedSegment('yearSegmented') || '1st Year';
        const desc = document.getElementById('subjectDescInput')?.value || 'Course overview and learning objectives.';

        const codeEl = document.getElementById('previewSubjectCode');
        const nameEl = document.getElementById('previewSubjectName');
        const termEl = document.getElementById('previewSubjectTerm');
        const yearEl = document.getElementById('previewSubjectYear');
        const descEl = document.getElementById('previewSubjectDesc');

        if (codeEl) codeEl.textContent = code;
        if (nameEl) nameEl.textContent = name;
        if (termEl) termEl.textContent = term;
        if (yearEl) yearEl.textContent = year;
        if (descEl) descEl.textContent = desc;
    }

    function updateTopicPresentationPreview() {
        const key = document.getElementById('topicPresentationSelect')?.value;
        const box = document.getElementById('topicPresentationPreviewBox');
        if (!box) return;

        if (!key) {
            if (!customUploadedPresentation) {
                box.style.display = 'none';
            } else {
                box.style.display = 'flex';
                box.innerHTML = `
                    <div style="font-size: 2rem;">📊</div>
                    <div>
                        <strong>Custom Presentation Attached: ${escapeHtml(customUploadedPresentation.originalname || 'Presentation')}</strong>
                        <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: 2px;">
                            ${escapeHtml(customUploadedPresentation.fileUrl)}
                        </div>
                    </div>
                `;
            }
            return;
        }

        const deck = presentationsLibrary.find(p => p.key === key);
        if (!deck) {
            box.style.display = 'none';
            return;
        }

        box.style.display = 'flex';
        box.innerHTML = `
            <img src="${deck.cover}" alt="${escapeHtml(deck.title)}" style="width: 100px; height: 60px; object-fit: cover; border-radius: 4px; box-shadow: var(--shadow-sm);">
            <div>
                <strong>${escapeHtml(deck.title)} Deck Attached</strong>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: 2px;">
                    ${deck.slideCount} extracted slides ready for students.
                </div>
                <div style="font-size: var(--font-size-xs); color: var(--color-primary); font-weight: 600; margin-top: 2px;">
                    Category: ${escapeHtml(deck.category)}
                </div>
            </div>
        `;
    }

    // Segmented Control Helpers
    window.selectSegment = function (containerId, value) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const options = container.querySelectorAll('.segmented-option');
        options.forEach(opt => {
            if (opt.dataset.value === value) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
        updateSubjectPreview();
    };

    function getSelectedSegment(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return null;
        const selected = container.querySelector('.segmented-option.selected');
        return selected ? selected.dataset.value : null;
    }

    // Modal Helpers
    window.openModal = function (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    };

    window.closeModal = function (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

    // Toast Notifications
    window.showToast = function (message, type = 'info') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${type === 'success' 
                    ? '<polyline points="20 6 9 17 4 12"/>' 
                    : (type === 'error' 
                        ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' 
                        : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>')}
            </svg>
            <span>${escapeHtml(message)}</span>
        `;

        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(30px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    };

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

})();
