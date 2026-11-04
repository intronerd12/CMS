const express = require('express');
const bcrypt = require('bcryptjs');
const { randomUUID: uuidv4 } = require('crypto');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./database');
const presentations = require('./presentations');
const { extractPptxSlides } = require('./pptx-parser');
const sampleQuizBank = require('./sample-quiz-bank');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Custom uploads directory (Render & Serverless safe)
const isServerless = db.isServerless;
const customUploadsDir = process.env.UPLOADS_DIR || (
    isServerless
        ? path.join('/tmp', 'uploads', 'custom')
        : path.join(__dirname, 'public', 'uploads', 'custom')
);

try {
    if (!fs.existsSync(customUploadsDir)) {
        fs.mkdirSync(customUploadsDir, { recursive: true });
    }
} catch (e) {
    console.warn('[Uploads] Note on uploads directory:', e.message);
}

const uploadStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, customUploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        cb(null, `${Date.now()}-${base}${ext}`);
    }
});

const upload = multer({
    storage: uploadStorage,
    limits: { fileSize: 50 * 1024 * 1024 }
});

function isStaffUser(req) {
    const role = (req.headers['x-user-role'] || req.query.role || '').toLowerCase();
    if (role === 'faculty') return true;
    const userId = req.headers['x-user-id'] || req.query.userId;
    if (userId) {
        try {
            const u = db.getUserById(userId);
            if (u && u.role === 'faculty') return true;
        } catch (_) {}
    }
    return false;
}

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-user-id', 'x-requested-with']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads/custom', express.static(customUploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint for Render & Vercel connectivity
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'LMS Backend (Render)',
        database: 'SQLite',
        dbPath: db.DB_PATH,
        timestamp: new Date().toISOString()
    });
});

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', (req, res) => {
    try {
        const { username, email, password, firstName, lastName, role, profilePic } = req.body;

        // Validation
        if (!username || !email || !password || !firstName || !lastName || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const validRoles = ['student', 'faculty'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role selected (Must be Student or Faculty)' });
        }

        // Check if username or email already exists in SQLite
        if (db.getUserByUsername(username)) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        if (db.getUserByEmail(email)) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Hash password
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);

        const newUser = {
            id: uuidv4(),
            username: username.trim(),
            email: email.trim(),
            password: hashedPassword,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            role,
            profilePic: (profilePic && typeof profilePic === 'string') ? profilePic.trim() : '',
            createdAt: new Date().toISOString(),
            isActive: 1
        };

        db.createUser(newUser);

        // Return user without password
        const { password: _, ...userWithoutPassword } = newUser;
        res.status(201).json({ 
            message: 'Registration successful', 
            user: userWithoutPassword 
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login
app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = db.getUserByUsername(username.trim());

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        if (!user.isActive) {
            return res.status(403).json({ error: 'Account is deactivated. Contact faculty.' });
        }

        const isMatch = bcrypt.compareSync(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        res.json({ 
            message: 'Login successful', 
            user: userWithoutPassword 
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Self-healing: Restore user if database restarted / wiped on git push
app.post('/api/auth/restore-user', (req, res) => {
    try {
        const userData = req.body.user || req.body;
        if (!userData || !userData.username) {
            return res.status(400).json({ error: 'User data required' });
        }
        const restored = db.restoreUser(userData);
        if (!restored) {
            return res.status(500).json({ error: 'Failed to restore user' });
        }
        const { password: _, ...userWithoutPassword } = restored;
        res.json({ message: 'User restored successfully', user: userWithoutPassword });
    } catch (err) {
        console.error('Restore user error:', err);
        res.status(500).json({ error: 'Server error restoring user' });
    }
});

// Self-healing: Batch sync roster from client account registry
app.post('/api/auth/sync-roster', (req, res) => {
    try {
        const accounts = req.body.accounts || [];
        if (!Array.isArray(accounts)) {
            return res.status(400).json({ error: 'Accounts array required' });
        }
        const restored = db.syncRoster(accounts);
        res.json({ message: `Synced ${restored.length} accounts`, count: restored.length });
    } catch (err) {
        console.error('Sync roster error:', err);
        res.status(500).json({ error: 'Server error syncing roster' });
    }
});

// Get current user profile
app.get('/api/auth/profile/:userId', (req, res) => {
    try {
        const user = db.getUserById(req.params.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update user profile
app.put('/api/auth/profile/:userId', (req, res) => {
    try {
        const userId = req.params.userId;
        const { firstName, lastName, email, profilePic, password } = req.body;

        const existing = db.getUserById(userId);
        if (!existing) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!firstName || !lastName || !email) {
            return res.status(400).json({ error: 'First name, last name, and email are required' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }

        const existingByEmail = db.getUserByEmail(email.trim());
        if (existingByEmail && existingByEmail.id !== userId) {
            return res.status(400).json({ error: 'Email address is already in use by another account' });
        }

        db.updateUserProfile({
            id: userId,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            profilePic: profilePic !== undefined ? (profilePic || '') : (existing.profilePic || '')
        });

        if (password && password.trim().length > 0) {
            if (password.length < 6) {
                return res.status(400).json({ error: 'New password must be at least 6 characters' });
            }
            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync(password, salt);
            db.updateUserPassword(userId, hashedPassword);
        }

        const updated = db.getUserById(userId);
        res.json({
            message: 'Profile updated successfully',
            user: updated
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile: ' + error.message });
    }
});

// Upload avatar directly
app.post('/api/auth/upload-avatar', upload.single('avatar'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No avatar image file was uploaded' });
        }
        if (!req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({ error: 'Uploaded file must be an image (PNG, JPG, WEBP)' });
        }
        const fileUrl = `/uploads/custom/${req.file.filename}`;
        res.json({
            message: 'Avatar uploaded successfully',
            url: fileUrl
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: 'Failed to upload avatar: ' + error.message });
    }
});

// ==================== PRESENTATIONS LIBRARY ====================

app.get('/api/presentations', (req, res) => {
    try {
        const list = presentations.listPresentations();
        res.json({ presentations: list });
    } catch (error) {
        res.status(500).json({ error: 'Server error loading presentations' });
    }
});

app.get('/api/presentations/:key', (req, res) => {
    try {
        const deck = presentations.getPresentation(req.params.key);
        if (!deck) {
            return res.status(404).json({ error: 'Presentation deck not found' });
        }
        res.json({ presentation: deck });
    } catch (error) {
        res.status(500).json({ error: 'Server error loading presentation' });
    }
});

// Download presentation file with proper attachment headers
app.get('/api/presentations/:key/download', (req, res) => {
    try {
        const key = (req.params.key || '').toLowerCase();
        const deck = presentations.getPresentation(key);
        if (!deck || !deck.sourceName) {
            return res.status(404).json({ error: 'Presentation deck or file not found' });
        }
        const filePath = path.join(__dirname, 'public', 'uploads', 'presentations', key, deck.sourceName);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Source presentation file not found on disk' });
        }
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        res.download(filePath, deck.sourceName);
    } catch (error) {
        console.error('Download presentation error:', error);
        res.status(500).json({ error: 'Server error downloading presentation' });
    }
});

// Download presentation for a topic
app.get('/api/topics/:id/download', (req, res) => {
    try {
        const topic = db.getTopicById(req.params.id);
        if (!topic) {
            return res.status(404).json({ error: 'Topic not found' });
        }
        if (!topic.presentationKey) {
            return res.status(404).json({ error: 'No presentation linked to this topic' });
        }
        const deck = presentations.getPresentation(topic.presentationKey);
        if (!deck || !deck.sourceName) {
            return res.status(404).json({ error: 'Presentation file not found' });
        }
        const filePath = path.join(__dirname, 'public', 'uploads', 'presentations', topic.presentationKey, deck.sourceName);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Presentation file does not exist on disk' });
        }
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        res.download(filePath, deck.sourceName);
    } catch (error) {
        console.error('Download topic presentation error:', error);
        res.status(500).json({ error: 'Server error downloading topic presentation' });
    }
});

// ==================== SUBJECT & CLASS ENROLLMENT ROUTES (Requirement #2) ====================

app.get('/api/subjects', (req, res) => {
    try {
        const isStaff = isStaffUser(req);
        const userId = req.headers['x-user-id'] || req.query.userId || req.query.studentId || req.query.facultyId;
        if (!isStaff) {
            const studentId = req.query.studentId || userId;
            const subjects = studentId ? db.getSubjectsForStudent(studentId) : [];
            return res.json({ subjects });
        }
        // Faculty: return subjects created by this faculty
        const facultyId = req.query.facultyId || req.query.createdBy || userId;
        const subjects = facultyId ? db.getSubjectsForFaculty(facultyId, true) : [];
        res.json({ subjects });
    } catch (error) {
        res.status(500).json({ error: 'Server error loading subjects' });
    }
});

app.get('/api/subjects/:id', (req, res) => {
    try {
        const isStaff = isStaffUser(req);
        const studentId = req.query.studentId || req.headers['x-user-id'];
        if (!isStaff && (!studentId || !db.isStudentEnrolled(studentId, req.params.id))) {
            return res.status(403).json({
                error: 'You must join this class with a Class Code from your instructor first.',
                notEnrolled: true
            });
        }
        const subject = db.getSubjectById(req.params.id, isStaff);
        if (!subject) {
            return res.status(404).json({ error: 'Subject not found' });
        }
        res.json({ subject });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Student joins a class using a Class Code (Google Classroom / MS Teams style)
app.post('/api/classes/join', (req, res) => {
    try {
        const { studentId, joinCode } = req.body;
        if (!studentId || !joinCode) {
            return res.status(400).json({ error: 'Student ID and Class Code are required' });
        }
        const student = db.getUserById(studentId);
        if (!student) {
            return res.status(404).json({ error: 'Student account not found' });
        }

        const result = db.joinSubjectByCode(studentId, joinCode);
        res.json({
            message: result.alreadyEnrolled
                ? `You are already enrolled in ${result.subject.code} — ${result.subject.name}`
                : `Successfully joined ${result.subject.code} — ${result.subject.name}!`,
            alreadyEnrolled: result.alreadyEnrolled,
            subject: result.subject
        });
    } catch (error) {
        res.status(400).json({ error: error.message || 'Could not join class with that code' });
    }
});

// Student leaves / unenrolls from a class
app.post('/api/subjects/:id/leave', (req, res) => {
    try {
        const { studentId } = req.body;
        if (!studentId) {
            return res.status(400).json({ error: 'Student ID is required' });
        }
        db.leaveSubject(studentId, req.params.id);
        res.json({ message: 'You have left the class.' });
    } catch (error) {
        res.status(500).json({ error: 'Server error leaving class' });
    }
});

// Faculty regenerates a subject's Class Join Code
app.post('/api/subjects/:id/regenerate-code', (req, res) => {
    try {
        const subject = db.getSubjectById(req.params.id, true);
        if (!subject) {
            return res.status(404).json({ error: 'Subject not found' });
        }
        const joinCode = db.regenerateSubjectJoinCode(req.params.id);
        const updated = db.getSubjectById(req.params.id, true);
        res.json({
            message: `New Class Code generated: ${joinCode}`,
            joinCode,
            subject: updated
        });
    } catch (error) {
        console.error('Regenerate join code error:', error);
        res.status(500).json({ error: 'Server error regenerating class code' });
    }
});

// Faculty views enrolled students roster for a subject
app.get('/api/subjects/:id/students', (req, res) => {
    try {
        const subject = db.getSubjectById(req.params.id, true);
        if (!subject) {
            return res.status(404).json({ error: 'Subject not found' });
        }
        const students = db.getEnrolledStudents(req.params.id);
        res.json({
            subjectId: subject.id,
            subjectName: subject.name,
            subjectCode: subject.code,
            joinCode: subject.joinCode,
            enrolledCount: students.length,
            students
        });
    } catch (error) {
        console.error('Get enrolled students error:', error);
        res.status(500).json({ error: 'Server error loading class roster' });
    }
});

// Faculty removes a student from a class
app.delete('/api/subjects/:id/students/:studentId', (req, res) => {
    try {
        db.removeStudentFromSubject(req.params.id, req.params.studentId);
        const students = db.getEnrolledStudents(req.params.id);
        res.json({
            message: 'Student removed from class roster',
            enrolledCount: students.length,
            students
        });
    } catch (error) {
        console.error('Remove student error:', error);
        res.status(500).json({ error: 'Server error removing student' });
    }
});

app.post('/api/subjects', (req, res) => {
    try {
        const { name, code, term, year, description, createdBy } = req.body;

        if (!name || !code || !term || !year) {
            return res.status(400).json({ error: 'Subject Name, Code, Term/Semester, and Year Level are required' });
        }

        const trimmedCode = code.trim().toUpperCase();
        const trimmedName = name.trim();

        // Check for duplicate code in same term and year
        const existing = db.findDuplicateSubject(trimmedCode, term, year);
        if (existing) {
            return res.status(400).json({ error: `A subject with code "${trimmedCode}" already exists for ${term}, ${year}` });
        }

        const facultyOwner = createdBy || req.headers['x-user-id'] || req.query.facultyId || null;
        const newSubject = {
            id: uuidv4(),
            name: trimmedName,
            code: trimmedCode,
            term,
            year,
            description: description ? description.trim() : null,
            createdBy: facultyOwner,
            createdAt: new Date().toISOString()
        };

        db.createSubject(newSubject);
        const created = db.getSubjectById(newSubject.id);

        res.status(201).json({ message: 'Subject created successfully', subject: created });
    } catch (error) {
        console.error('Create subject error:', error);
        res.status(500).json({ error: 'Server error creating subject' });
    }
});

app.put('/api/subjects/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, term, year, description } = req.body;

        const current = db.getSubjectById(id);
        if (!current) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        if (!name || !code || !term || !year) {
            return res.status(400).json({ error: 'Subject Name, Code, Term/Semester, and Year Level are required' });
        }

        const trimmedCode = code.trim().toUpperCase();
        const duplicate = db.findDuplicateSubject(trimmedCode, term, year);
        if (duplicate && duplicate.id !== id) {
            return res.status(400).json({ error: `Another subject with code "${trimmedCode}" already exists for ${term}, ${year}` });
        }

        db.updateSubject({
            id,
            name: name.trim(),
            code: trimmedCode,
            term,
            year,
            description: description ? description.trim() : null,
            updatedAt: new Date().toISOString()
        });

        const updated = db.getSubjectById(id);
        res.json({ message: 'Subject updated successfully', subject: updated });
    } catch (error) {
        console.error('Update subject error:', error);
        res.status(500).json({ error: 'Server error updating subject' });
    }
});

app.delete('/api/subjects/:id', (req, res) => {
    try {
        const { id } = req.params;
        const current = db.getSubjectById(id);
        if (!current) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        db.deleteSubject(id);
        res.json({ message: 'Subject deleted successfully' });
    } catch (error) {
        console.error('Delete subject error:', error);
        res.status(500).json({ error: 'Server error deleting subject' });
    }
});

// ==================== TOPIC / TOC ROUTES (Requirement #3) ====================

app.get('/api/subjects/:id/topics', (req, res) => {
    try {
        const isStaff = isStaffUser(req);
        const studentId = req.query.studentId || req.headers['x-user-id'];
        if (!isStaff && (!studentId || !db.isStudentEnrolled(studentId, req.params.id))) {
            return res.status(403).json({
                error: 'You must join this class with a Class Code from your instructor first.',
                notEnrolled: true
            });
        }
        const subject = db.getSubjectById(req.params.id, true);
        if (!subject) return res.status(404).json({ error: 'Subject not found' });
        const facultyId = req.headers['x-user-id'] || req.query.facultyId;
        if (isStaff && facultyId && subject.createdBy && subject.createdBy !== facultyId) {
            return res.status(403).json({ error: 'Unauthorized: You do not have access to this course topics' });
        }
        const topics = db.getTopicsBySubject(req.params.id, isStaff);
        res.json({ topics });
    } catch (error) {
        res.status(500).json({ error: 'Server error loading topics' });
    }
});

app.post('/api/subjects/:id/topics', (req, res) => {
    try {
        const subjectId = req.params.id;
        const subject = db.getSubjectById(subjectId, true);
        if (!subject) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        const { title, description, presentationKey, outline, isPublished, customFile, slidesContent, summary, content } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Topic title is required' });
        }

        let resolvedSlidesContent = slidesContent ? (typeof slidesContent === 'string' ? slidesContent : JSON.stringify(slidesContent)) : null;
        let resolvedOutline = Array.isArray(outline) ? outline.join('\n') : (outline ? outline.trim() : null);

        // Auto-extract slides from uploaded PPTX if slidesContent not provided
        if (!resolvedSlidesContent && customFile && /\.pptx?$/i.test(customFile)) {
            try {
                const diskPath = path.join(__dirname, 'public', customFile.replace(/^\//, ''));
                const altPath = path.join(customUploadsDir, path.basename(customFile));
                const targetPath = fs.existsSync(diskPath) ? diskPath : (fs.existsSync(altPath) ? altPath : null);
                if (targetPath) {
                    const parsed = extractPptxSlides(targetPath, {
                        outputDir: path.join(customUploadsDir, 'slides'),
                        publicUrlPrefix: '/uploads/custom/slides',
                        deckSlug: path.basename(customFile, path.extname(customFile)),
                        isServerless
                    });
                    if (parsed && parsed.length > 0) {
                        resolvedSlidesContent = JSON.stringify(parsed);
                        if (!resolvedOutline) {
                            resolvedOutline = parsed.map(s => s.title).filter(t => t && !/^slide\s+\d+$/i.test(t)).slice(0, 12).join('\n');
                        }
                    }
                }
            } catch (err) {
                console.error('[Create Topic] Error extracting PPTX slides:', err.message);
            }
        }

        const newTopic = {
            id: uuidv4(),
            subjectId,
            title: title.trim(),
            description: description ? description.trim() : null,
            presentationKey: presentationKey ? presentationKey.trim().toLowerCase() : (customFile ? 'custom' : null),
            customFile: customFile ? customFile.trim() : null,
            slidesContent: resolvedSlidesContent,
            outline: resolvedOutline,
            isPublished: isPublished !== false && isPublished !== 0 && isPublished !== '0',
            summary: summary ? summary.trim() : null,
            content: content ? content.trim() : null
        };

        db.createTopic(newTopic);
        const created = db.getTopicById(newTopic.id);

        res.status(201).json({ message: 'Topic created successfully', topic: created });
    } catch (error) {
        console.error('Create topic error:', error);
        res.status(500).json({ error: 'Server error creating topic' });
    }
});

app.put('/api/topics/:id', (req, res) => {
    try {
        const { id } = req.params;
        const current = db.getTopicById(id);
        if (!current) {
            return res.status(404).json({ error: 'Topic not found' });
        }

        const { title, description, presentationKey, outline, isPublished, summary, content, customFile, slidesContent } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Topic title is required' });
        }

        const targetCustomFile = customFile !== undefined ? (customFile ? customFile.trim() : null) : current.customFile;
        let resolvedSlidesContent = slidesContent !== undefined ? slidesContent : current.slidesContent;
        let resolvedOutline = outline !== undefined ? (Array.isArray(outline) ? outline.join('\n') : (outline ? outline.trim() : null)) : current.outline;

        // Auto-extract slides from uploaded PPTX if slidesContent not provided
        if (!resolvedSlidesContent && targetCustomFile && /\.pptx?$/i.test(targetCustomFile)) {
            try {
                const diskPath = path.join(__dirname, 'public', targetCustomFile.replace(/^\//, ''));
                const altPath = path.join(customUploadsDir, path.basename(targetCustomFile));
                const targetPath = fs.existsSync(diskPath) ? diskPath : (fs.existsSync(altPath) ? altPath : null);
                if (targetPath) {
                    const parsed = extractPptxSlides(targetPath, {
                        outputDir: path.join(customUploadsDir, 'slides'),
                        publicUrlPrefix: '/uploads/custom/slides',
                        deckSlug: path.basename(targetCustomFile, path.extname(targetCustomFile)),
                        isServerless
                    });
                    if (parsed && parsed.length > 0) {
                        resolvedSlidesContent = JSON.stringify(parsed);
                        if (!resolvedOutline) {
                            resolvedOutline = parsed.map(s => s.title).filter(t => t && !/^slide\s+\d+$/i.test(t)).slice(0, 12).join('\n');
                        }
                    }
                }
            } catch (err) {
                console.error('[Update Topic] Error extracting PPTX slides:', err.message);
            }
        }

        db.updateTopic({
            id,
            title: title.trim(),
            description: description !== undefined ? (description ? description.trim() : null) : current.description,
            presentationKey: presentationKey !== undefined ? (presentationKey ? presentationKey.trim().toLowerCase() : (targetCustomFile ? 'custom' : null)) : (targetCustomFile ? 'custom' : current.presentationKey),
            customFile: targetCustomFile,
            slidesContent: resolvedSlidesContent,
            outline: resolvedOutline,
            isPublished: isPublished !== undefined ? (isPublished !== false && isPublished !== 0 && isPublished !== '0') : current.isPublished,
            summary: summary !== undefined ? (summary ? summary.trim() : null) : current.summary,
            content: content !== undefined ? (content ? content.trim() : null) : current.content,
            updatedAt: new Date().toISOString()
        });

        const updated = db.getTopicById(id);
        res.json({ message: 'Topic updated successfully', topic: updated });
    } catch (error) {
        console.error('Update topic error:', error);
        res.status(500).json({ error: 'Server error updating topic' });
    }
});

// Teacher toggle upload/publish state
app.patch('/api/topics/:id/publish', (req, res) => {
    try {
        const { id } = req.params;
        const current = db.getTopicById(id);
        if (!current) {
            return res.status(404).json({ error: 'Topic not found' });
        }

        const isPublished = req.body.isPublished === true || req.body.isPublished === 1 || req.body.isPublished === '1';
        db.toggleTopicPublish(id, isPublished);
        const updated = db.getTopicById(id);

        res.json({
            message: isPublished ? 'Topic uploaded and visible to students' : 'Topic hidden from students (draft mode)',
            topic: updated
        });
    } catch (error) {
        console.error('Toggle topic publish error:', error);
        res.status(500).json({ error: 'Server error updating topic visibility' });
    }
});

// Custom presentation file upload with automatic slide extraction
app.post('/api/topics/upload-presentation', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No presentation file was uploaded' });
        }

        const fileUrl = `/uploads/custom/${req.file.filename}`;
        const ext = path.extname(req.file.originalname).toLowerCase();
        let extractedSlides = [];

        if (ext === '.pptx' || ext === '.ppt') {
            try {
                extractedSlides = extractPptxSlides(req.file.path, {
                    outputDir: path.join(customUploadsDir, 'slides'),
                    publicUrlPrefix: '/uploads/custom/slides',
                    deckSlug: path.basename(req.file.filename, ext),
                    isServerless
                });
            } catch (parseErr) {
                console.error('[Upload Presentation] Error extracting PPTX slides:', parseErr.message);
            }
        }

        const outline = extractedSlides
            .map(s => s.title)
            .filter(t => t && !/^slide\s+\d+$/i.test(t))
            .slice(0, 12)
            .join('\n');

        res.json({
            message: 'Presentation uploaded successfully',
            fileUrl,
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size,
            slideCount: extractedSlides.length,
            slides: extractedSlides,
            outline
        });
    } catch (error) {
        console.error('Upload presentation error:', error);
        res.status(500).json({ error: 'Failed to upload presentation file' });
    }
});

app.delete('/api/topics/:id', (req, res) => {
    try {
        const { id } = req.params;
        const current = db.getTopicById(id);
        if (!current) {
            return res.status(404).json({ error: 'Topic not found' });
        }

        db.deleteTopic(id);
        res.json({ message: 'Topic deleted successfully' });
    } catch (error) {
        console.error('Delete topic error:', error);
        res.status(500).json({ error: 'Server error deleting topic' });
    }
});

app.put('/api/subjects/:id/topics/reorder', (req, res) => {
    try {
        const subjectId = req.params.id;
        const { orderedIds } = req.body;

        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            return res.status(400).json({ error: 'orderedIds array is required' });
        }

        db.reorderTopics(subjectId, orderedIds);
        const updatedTopics = db.getTopicsBySubject(subjectId);

        res.json({ message: 'Topics reordered successfully', topics: updatedTopics });
    } catch (error) {
        console.error('Reorder topics error:', error);
        res.status(500).json({ error: 'Server error reordering topics' });
    }
});

// Presentation / Slide Studio Full CRUD Routes (Create, Read, Update, Delete)
app.get('/api/topics/:id/slides', (req, res) => {
    try {
        const topic = db.getTopicById(req.params.id);
        if (!topic) {
            return res.status(404).json({ error: 'Topic not found' });
        }
        res.json({
            topic,
            slides: topic.customSlides || [],
            presentation: topic.presentation
        });
    } catch (error) {
        console.error('Get topic slides error:', error);
        res.status(500).json({ error: 'Server error loading slides' });
    }
});

function handleSaveTopicSlides(req, res) {
    try {
        const { id } = req.params;
        const topic = db.getTopicById(id);
        if (!topic) {
            return res.status(404).json({ error: 'Topic not found' });
        }

        const { slides, presentationKey, customFile, outline, summary, content } = req.body;
        if (!Array.isArray(slides)) {
            return res.status(400).json({ error: 'Slides must be an array' });
        }

        // Default to 'custom' when saving studio slides so custom slides become the active presentation immediately
        const resolvedKey = presentationKey !== undefined
            ? (presentationKey ? String(presentationKey).trim() : null)
            : (slides.length > 0 ? 'custom' : topic.presentationKey);

        const resolvedCustomFile = customFile !== undefined
            ? (typeof customFile === 'object' && customFile ? (customFile.fileUrl || customFile.fileName || null) : customFile)
            : topic.customFile;

        db.updateTopic({
            id,
            title: topic.title,
            description: topic.description,
            presentationKey: resolvedKey,
            outline: outline !== undefined ? outline : topic.outline,
            slidesContent: slides.length > 0 ? JSON.stringify(slides) : null,
            customFile: resolvedCustomFile,
            summary: summary !== undefined ? summary : topic.summary,
            content: content !== undefined ? content : topic.content,
            isPublished: topic.isPublished
        });

        const updated = db.getTopicById(id);
        res.json({ message: 'Presentation slides saved successfully', topic: updated });
    } catch (error) {
        console.error('Save topic slides error:', error);
        res.status(500).json({ error: 'Server error saving slides' });
    }
}

app.post('/api/topics/:id/slides', handleSaveTopicSlides);
app.put('/api/topics/:id/slides', handleSaveTopicSlides);

app.delete('/api/topics/:id/slides', (req, res) => {
    try {
        const { id } = req.params;
        const topic = db.getTopicById(id);
        if (!topic) {
            return res.status(404).json({ error: 'Topic not found' });
        }
        const updated = db.deleteTopicPresentation(id);
        res.json({
            message: 'Presentation removed from topic successfully',
            topic: updated
        });
    } catch (error) {
        console.error('Delete topic slides error:', error);
        res.status(500).json({ error: 'Server error deleting presentation' });
    }
});

// ==================== SEQUENTIAL PROGRESSION ROUTE ====================

// Get student's sequential progression status for all topics (Topic 1 to 14)
app.get('/api/subjects/:id/student-progress/:studentId', (req, res) => {
    try {
        const { id: subjectId, studentId } = req.params;
        const subject = db.getSubjectById(subjectId);
        if (!subject) {
            return res.status(404).json({ error: 'Subject not found' });
        }
        const isStaff = isStaffUser(req);
        if (!isStaff && !db.isStudentEnrolled(studentId, subjectId)) {
            return res.status(403).json({
                error: 'You must join this class with a Class Code first.',
                notEnrolled: true
            });
        }

        const progressData = db.getStudentTopicProgress(studentId, subjectId);
        res.json({ subject, ...progressData });
    } catch (error) {
        console.error('Student progress error:', error);
        res.status(500).json({ error: 'Server error loading student progression' });
    }
});

// ==================== QUIZ ROUTES (Faculty & Anti-Cheating) ====================

// Get all quizzes for a subject
app.get('/api/subjects/:id/quizzes', (req, res) => {
    try {
        const subject = db.getSubjectById(req.params.id, true);
        if (!subject) return res.status(404).json({ error: 'Subject not found' });

        const isStaff = isStaffUser(req);
        const facultyId = req.headers['x-user-id'] || req.query.facultyId;
        if (isStaff && facultyId && subject.createdBy && subject.createdBy !== facultyId) {
            return res.status(403).json({ error: 'Unauthorized: You do not have access to this course quizzes' });
        }
        const quizzes = db.getAllQuizzesBySubject(req.params.id);
        res.json({ quizzes });
    } catch (error) {
        console.error('Get quizzes error:', error);
        res.status(500).json({ error: 'Server error loading quizzes' });
    }
});

// Get quiz for a specific topic
app.get('/api/topics/:id/quiz', (req, res) => {
    try {
        const quiz = db.getQuizByTopicId(req.params.id);
        if (!quiz) {
            return res.status(404).json({ error: 'No quiz assigned to this topic yet' });
        }
        res.json({ quiz });
    } catch (error) {
        console.error('Get topic quiz error:', error);
        res.status(500).json({ error: 'Server error loading topic quiz' });
    }
});

// Generate randomized sample quiz tailored to topic's PPT slide deck
app.get('/api/quizzes/sample/:topicId', (req, res) => {
    try {
        const { topicId } = req.params;
        const topic = db.getTopicById(topicId);
        const requestedCount = req.query.count ? parseInt(req.query.count, 10) : null;

        const topicKey = topic ? (topic.presentationKey || topic.title || '') : 'cms';
        const sample = sampleQuizBank.getRandomizedSampleQuiz(topicKey, requestedCount);

        res.json({
            success: true,
            topicId,
            topicTitle: topic ? topic.title : 'Lesson Assessment',
            subjectId: topic ? topic.subjectId : null,
            ...sample
        });
    } catch (error) {
        console.error('Generate sample quiz error:', error);
        res.status(500).json({ error: 'Failed to generate sample quiz: ' + error.message });
    }
});

// Get quiz by ID (Faculty view with answers)
app.get('/api/quizzes/:id', (req, res) => {
    try {
        const quiz = db.getQuizById(req.params.id, true);
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        res.json({ quiz });
    } catch (error) {
        console.error('Get quiz error:', error);
        res.status(500).json({ error: 'Server error loading quiz' });
    }
});

// Create Quiz (Faculty only) - Validates 1 <= questions <= 20
app.post('/api/quizzes', (req, res) => {
    try {
        const { topicId, subjectId, title, description, timeLimitMinutes, passingScorePercent, shuffleChoices, createdBy, questions } = req.body;

        if (!topicId || !title || !title.trim()) {
            return res.status(400).json({ error: 'Topic and Quiz Title are required' });
        }

        // Resolve target topic and subject safely to prevent foreign key errors
        let targetTopic = db.getTopicById(topicId);
        let resolvedSubjectId = subjectId;

        if (targetTopic) {
            resolvedSubjectId = targetTopic.subjectId || resolvedSubjectId;
        } else {
            // Check if topicId matches by title
            const matchedByTitle = db.db.prepare('SELECT * FROM topics WHERE title = ? OR title LIKE ? LIMIT 1').get(topicId, `%${topicId}%`);
            if (matchedByTitle) {
                targetTopic = matchedByTitle;
                resolvedSubjectId = matchedByTitle.subjectId || resolvedSubjectId;
            } else {
                let candidateSubject = (resolvedSubjectId ? db.getSubjectById(resolvedSubjectId) : null) || db.getAllSubjects()[0];
                if (!candidateSubject) {
                    return res.status(400).json({ error: 'No active course subject found to attach this quiz to' });
                }
                resolvedSubjectId = candidateSubject.id;
                const autoTopicTitle = title.replace(/\s*Quiz.*$/i, '').trim() || 'Curriculum Lesson';
                targetTopic = db.createTopic({
                    id: topicId,
                    subjectId: resolvedSubjectId,
                    title: autoTopicTitle,
                    description: description ? description.trim() : null,
                    orderIndex: (candidateSubject.topics ? candidateSubject.topics.length : 0) + 1,
                    isPublished: 1
                });
            }
        }

        const parentSubject = db.getSubjectById(resolvedSubjectId) || db.getAllSubjects()[0];
        if (!parentSubject) {
            return res.status(400).json({ error: 'Course subject record not found for this quiz' });
        }
        resolvedSubjectId = parentSubject.id;

        if (!Array.isArray(questions) || questions.length < 1 || questions.length > 20) {
            return res.status(400).json({
                error: `Requirement: Quiz can have up to 20 multiple-choice questions (max 20 questions). Current count: ${Array.isArray(questions) ? questions.length : 0}.`
            });
        }

        // Validate each question
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const cleanText = (q.questionText || '').replace(/<[^>]*>/g, '').trim();
            const hasMedia = /<img|<svg|<video|<audio/i.test(q.questionText || '');
            if (!cleanText && !hasMedia && (!q.questionText || !q.questionText.trim())) {
                return res.status(400).json({ error: `Question #${i + 1} is missing question prompt` });
            }
            if (!Array.isArray(q.options) || q.options.length < 2) {
                return res.status(400).json({ error: `Question #${i + 1} must have multiple-choice options` });
            }
            for (let j = 0; j < q.options.length; j++) {
                if (!q.options[j].text || !q.options[j].text.trim()) {
                    return res.status(400).json({ error: `Question #${i + 1}, Choice ${j + 1} is missing text` });
                }
            }
            if (!q.correctAnswer) {
                q.correctAnswer = q.options[0].id;
            }
        }

        // Check if topic already has a quiz (Upsert: update existing quiz if present)
        const existing = db.getQuizByTopicId(targetTopic.id);
        if (existing) {
            const updatedQuiz = db.updateQuiz({
                id: existing.id,
                topicId: targetTopic.id,
                subjectId: resolvedSubjectId,
                title: title.trim(),
                description: description ? description.trim() : null,
                timeLimitMinutes: Number(timeLimitMinutes) || 10,
                passingScorePercent: Number(passingScorePercent) || 75.0,
                shuffleChoices: shuffleChoices !== false
            }, questions);
            return res.status(200).json({ message: 'Quiz updated successfully', quiz: updatedQuiz });
        }

        const newQuiz = db.createQuiz({
            topicId: targetTopic.id,
            subjectId: resolvedSubjectId,
            title: title.trim(),
            description: description ? description.trim() : null,
            timeLimitMinutes: Number(timeLimitMinutes) || 10,
            passingScorePercent: Number(passingScorePercent) || 75.0,
            shuffleChoices: shuffleChoices !== false,
            createdBy: createdBy || null
        }, questions);

        res.status(201).json({ message: 'Quiz created successfully', quiz: newQuiz });
    } catch (error) {
        console.error('Create quiz error:', error);
        res.status(500).json({ error: error.message || 'Server error creating quiz' });
    }
});

// Update Quiz (Faculty only) - Validates 1 <= questions <= 20
app.put('/api/quizzes/:id', (req, res) => {
    try {
        const { id } = req.params;
        let current = db.getQuizById(id);
        const { title, description, timeLimitMinutes, passingScorePercent, shuffleChoices, questions, topicId, subjectId } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Quiz title is required' });
        }

        if (!Array.isArray(questions) || questions.length < 1 || questions.length > 20) {
            return res.status(400).json({
                error: `Requirement: Quiz can have up to 20 multiple-choice questions (max 20 questions). Current count: ${Array.isArray(questions) ? questions.length : 0}.`
            });
        }

        // Validate each question
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const cleanText = (q.questionText || '').replace(/<[^>]*>/g, '').trim();
            const hasMedia = /<img|<svg|<video|<audio/i.test(q.questionText || '');
            if (!cleanText && !hasMedia && (!q.questionText || !q.questionText.trim())) {
                return res.status(400).json({ error: `Question #${i + 1} is missing question prompt` });
            }
            if (!Array.isArray(q.options) || q.options.length < 2) {
                return res.status(400).json({ error: `Question #${i + 1} must have multiple-choice options` });
            }
            for (let j = 0; j < q.options.length; j++) {
                if (!q.options[j].text || !q.options[j].text.trim()) {
                    return res.status(400).json({ error: `Question #${i + 1}, Choice ${j + 1} is missing text` });
                }
            }
            if (!q.correctAnswer) {
                q.correctAnswer = q.options[0].id;
            }
        }

        if (!current && topicId) {
            const topicQuiz = db.getQuizByTopicId(topicId);
            if (topicQuiz) current = topicQuiz;
        }

        let updatedQuiz;
        if (current) {
            updatedQuiz = db.updateQuiz({
                id: current.id,
                topicId: topicId || current.topicId,
                subjectId: subjectId || current.subjectId,
                title: title.trim(),
                description: description ? description.trim() : null,
                timeLimitMinutes: Number(timeLimitMinutes) || 10,
                passingScorePercent: Number(passingScorePercent) || 75.0,
                shuffleChoices: shuffleChoices !== false
            }, questions);
        } else {
            // Fallback create if not found
            updatedQuiz = db.createQuiz({
                id,
                topicId,
                subjectId,
                title: title.trim(),
                description: description ? description.trim() : null,
                timeLimitMinutes: Number(timeLimitMinutes) || 10,
                passingScorePercent: Number(passingScorePercent) || 75.0,
                shuffleChoices: shuffleChoices !== false,
                createdBy: req.headers['x-user-id'] || null
            }, questions);
        }

        res.json({ message: 'Quiz updated successfully', quiz: updatedQuiz });
    } catch (error) {
        console.error('Update quiz error:', error);
        res.status(500).json({ error: error.message || 'Server error updating quiz' });
    }
});

// Delete Quiz
app.delete('/api/quizzes/:id', (req, res) => {
    try {
        const { id } = req.params;
        const current = db.getQuizById(id);
        if (!current) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        db.deleteQuiz(id);
        res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
        console.error('Delete quiz error:', error);
        res.status(500).json({ error: 'Server error deleting quiz' });
    }
});

// CSV line parser supporting quoted commas
function parseCSVLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
        } else {
            cur += ch;
        }
    }
    result.push(cur.trim());
    return result;
}

// Memory upload for quiz files (JSON & CSV)
const quizUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Upload Quiz from Computer (Faculty feature)
app.post('/api/quizzes/upload', quizUpload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please choose a quiz file (.json or .csv) to upload' });
        }

        const originalName = req.file.originalname.toLowerCase();
        const content = req.file.buffer.toString('utf8');
        let questions = [];
        let metadata = {};

        if (originalName.endsWith('.json')) {
            try {
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed)) {
                    questions = parsed;
                } else if (parsed && Array.isArray(parsed.questions)) {
                    questions = parsed.questions;
                    metadata = {
                        title: parsed.title,
                        passingScorePercent: parsed.passingScorePercent,
                        timeLimitMinutes: parsed.timeLimitMinutes
                    };
                } else {
                    return res.status(400).json({ error: 'JSON file must contain an array of questions or a "questions" property' });
                }
            } catch (err) {
                return res.status(400).json({ error: 'Malformed JSON file: ' + err.message });
            }
        } else if (originalName.endsWith('.csv') || originalName.endsWith('.txt')) {
            const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
            if (lines.length === 0) {
                return res.status(400).json({ error: 'Uploaded file is empty' });
            }

            let startIdx = 0;
            if (lines[0].toLowerCase().includes('question') && lines[0].toLowerCase().includes('option')) {
                startIdx = 1; // Header row
            }

            for (let i = startIdx; i < lines.length; i++) {
                const parts = parseCSVLine(lines[i]);
                if (parts.length >= 6) {
                    const questionText = parts[0];
                    const options = [
                        { id: 'opt_1', text: parts[1] },
                        { id: 'opt_2', text: parts[2] },
                        { id: 'opt_3', text: parts[3] },
                        { id: 'opt_4', text: parts[4] }
                    ];

                    let correctRaw = parts[5].trim().toUpperCase();
                    let correctOpt = 'opt_1';
                    if (correctRaw === 'A' || correctRaw === '1') correctOpt = 'opt_1';
                    else if (correctRaw === 'B' || correctRaw === '2') correctOpt = 'opt_2';
                    else if (correctRaw === 'C' || correctRaw === '3') correctOpt = 'opt_3';
                    else if (correctRaw === 'D' || correctRaw === '4') correctOpt = 'opt_4';
                    else {
                        const matched = options.find(o => o.text.trim().toLowerCase() === parts[5].trim().toLowerCase());
                        if (matched) correctOpt = matched.id;
                    }

                    questions.push({
                        questionText,
                        options,
                        correctAnswer: correctOpt,
                        explanation: parts[6] || ''
                    });
                }
            }
        } else {
            return res.status(400).json({ error: 'Unsupported file type. Please upload a .json or .csv quiz file.' });
        }

        // Validate question count (max 20 questions)
        if (questions.length < 1 || questions.length > 20) {
            return res.status(400).json({
                error: `Requirement check failed: Quiz must have between 1 and 20 questions (max 20 questions). The uploaded file has ${questions.length} questions.`
            });
        }

        res.json({
            message: `Successfully parsed ${questions.length} questions from ${req.file.originalname}`,
            questionsCount: questions.length,
            questions,
            metadata
        });
    } catch (error) {
        console.error('Quiz upload error:', error);
        res.status(500).json({ error: 'Failed to parse uploaded quiz file: ' + error.message });
    }
});

// Download sample quiz templates (JSON and CSV)
app.get('/api/quizzes/template/download', (req, res) => {
    const format = (req.query.format || 'csv').toLowerCase();

    if (format === 'json') {
        const sampleJson = {
            title: "Sample Quiz - 10 Multiple Choice Questions",
            passingScorePercent: 75,
            timeLimitMinutes: 15,
            questions: Array.from({ length: 10 }).map((_, i) => ({
                questionText: `Sample Question ${i + 1}: What is the primary role of this CMS concept?`,
                options: [
                    { id: "opt_1", text: "Primary correct architecture concept" },
                    { id: "opt_2", text: "Alternative distractor choice B" },
                    { id: "opt_3", text: "Alternative distractor choice C" },
                    { id: "opt_4", text: "Alternative distractor choice D" }
                ],
                correctAnswer: "opt_1",
                explanation: `Detailed explanation for question ${i + 1} explaining why option A is correct.`
            }))
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="quiz-template-sample.json"');
        return res.send(JSON.stringify(sampleJson, null, 2));
    } else {
        // CSV format
        let csv = 'Question,OptionA,OptionB,OptionC,OptionD,CorrectOption,Explanation\r\n';
        for (let i = 1; i <= 10; i++) {
            csv += `"Sample Question ${i}: What is the key function of this CMS tool?","Correct Answer Option A","Distractor Option B","Distractor Option C","Distractor Option D","A","Explanation for Question ${i}"\r\n`;
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="quiz-template-sample.csv"');
        return res.send(csv);
    }
});

// ==================== ANTI-CHEATING STUDENT QUIZ DELIVERY ====================

// Student take quiz: Randomizes/shuffles options and questions; hides correct answers
app.get('/api/quizzes/:id/take', (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.query.studentId || req.headers['x-user-id'];

        const quizData = db.getQuizForStudentAttempt(id);
        if (!quizData) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        // Only students are subject to sequential prerequisite locking!
        // Faculty can preview any quiz anytime without restrictions.
        if (studentId) {
            const user = db.getUserById(studentId);
            const isFaculty = (user && user.role === 'faculty') || req.query.preview === 'true';

            if (isFaculty) {
                quizData.isFacultyPreview = true;
            } else {
                if (!db.isStudentEnrolled(studentId, quizData.quiz.subjectId)) {
                    try {
                        db.enrollStudentInClass(studentId, quizData.quiz.subjectId);
                    } catch (_) {}
                }
                // Check if student has previous attempt on this quiz (Default rule: One attempt only; if failed, retake requires faculty permission)
                const previousScores = db.getScoresForStudentOnQuiz(id, studentId);
                if (previousScores.length > 0) {
                    const hasPassed = previousScores.some(s => s.passed === 1);
                    if (hasPassed) {
                        return res.status(403).json({
                            error: 'You have already passed this quiz assessment. Retakes are not permitted for passed quizzes.',
                            alreadyPassed: true
                        });
                    }

                    const latestScore = previousScores[0];
                    const isRetakeAllowed = latestScore && (latestScore.retakeAllowed === 1 || latestScore.retakeAllowed === true);

                    if (!isRetakeAllowed) {
                        return res.status(403).json({
                            error: `Retake Locked: You scored ${latestScore.percentage}% on your previous attempt. Quizzes can only be taken once by default. You must request authorization from your professor to retake this quiz.`,
                            retakeLocked: true,
                            previousScore: latestScore.percentage
                        });
                    }

                    // Faculty explicitly authorized this retake
                    quizData.hasPreviousAttempt = true;
                    quizData.isAuthorizedRetake = true;
                    quizData.previousScore = latestScore.percentage;
                    quizData.previousPassed = false;
                    quizData.retakeWarning = `Your professor has authorized 1 retake for this quiz. Please review your lecture presentation before submitting.`;
                }
                const topic = db.getTopicById(quizData.quiz.topicId);
                if (topic && topic.orderIndex > 1) {
                    const progress = db.getStudentTopicProgress(studentId, quizData.quiz.subjectId);
                    const currentTopicProgress = progress.topics.find(t => t.id === topic.id);
                    if (currentTopicProgress && !currentTopicProgress.isUnlocked) {
                        return res.status(403).json({
                            error: 'Topic Locked: You must first pass the quiz for Topic ' + (topic.orderIndex - 1) + ' to access this quiz.',
                            isLocked: true,
                            requiredTopicOrder: topic.orderIndex - 1
                        });
                    }
                }
            }
        }

        res.json(quizData);
    } catch (error) {
        console.error('Take quiz error:', error);
        res.status(500).json({ error: 'Server error preparing quiz attempt' });
    }
});

// Student submit quiz: Grades submission, determines pass/fail, unlocks next topic
app.post('/api/quizzes/:id/submit', (req, res) => {
    try {
        const { id } = req.params;
        const { studentId, answers, timeSpentSeconds } = req.body;

        if (!studentId) {
            return res.status(400).json({ error: 'Student ID is required to record quiz score' });
        }

        const student = db.getUserById(studentId);
        if (!student) {
            return res.status(404).json({ error: 'Student user not found' });
        }

        const isStaff = isStaffUser(req);
        if (!isStaff) {
            const previousScores = db.getScoresForStudentOnQuiz(id, studentId);
            if (previousScores.length > 0) {
                const hasPassed = previousScores.some(s => s.passed === 1);
                if (hasPassed) {
                    return res.status(403).json({
                        error: 'You have already passed this quiz assessment. Retakes are not permitted for passed quizzes.',
                        alreadyPassed: true
                    });
                }
                const latestScore = previousScores[0];
                const isRetakeAllowed = latestScore && (latestScore.retakeAllowed === 1 || latestScore.retakeAllowed === true);
                if (!isRetakeAllowed) {
                    return res.status(403).json({
                        error: 'Retake Locked: Quizzes can only be taken once by default. You must request authorization from your professor to retake this quiz.',
                        retakeLocked: true
                    });
                }
            }
        }

        const result = db.submitQuizAttempt(id, studentId, answers || {}, timeSpentSeconds || 0);

        res.json({
            message: result.passed ? 'Congratulations! You passed the quiz!' : 'Quiz submitted. Score did not reach the passing threshold.',
            ...result
        });
    } catch (error) {
        console.error('Submit quiz error:', error);
        res.status(500).json({ error: error.message || 'Server error grading quiz' });
    }
});

// ==================== SCORES & GRADEBOOK ROUTES ====================

// Get score by ID (Dedicated quiz result view & certificate download)
app.get('/api/scores/:id', (req, res) => {
    try {
        const score = db.getScoreById(req.params.id);
        if (!score) {
            return res.status(404).json({ error: 'Score report not found' });
        }

        const isStaff = isStaffUser(req);
        // Academic Protection: If student failed the quiz, remove the answer key and rationales!
        if (!isStaff && score.passed === 0 && Array.isArray(score.answers)) {
            score.answers = score.answers.map(a => ({
                questionId: a.questionId,
                questionText: a.questionText,
                options: (a.options || []).map(o => ({ id: o.id, text: o.text })),
                selectedOptionId: a.selectedOptionId,
                selectedText: a.selectedText,
                isCorrect: a.isCorrect,
                correctOptionId: null,
                correctText: null,
                explanation: null
            }));
            score.answerKeyProtected = true;
        }

        res.json({ score });
    } catch (error) {
        console.error('Get score error:', error);
        res.status(500).json({ error: 'Server error loading score record' });
    }
});

// Grant or Revoke Retake Permission for a Student (Requirement: Faculty-governed Quiz Retakes)
app.post('/api/scores/:id/retake-permission', (req, res) => {
    try {
        const isStaff = isStaffUser(req);
        if (!isStaff) {
            return res.status(403).json({ error: 'Only faculty members can grant or revoke quiz retake permissions' });
        }
        const { allowRetake } = req.body;
        const scoreId = req.params.id;
        const score = db.getScoreById(scoreId);
        if (!score) {
            return res.status(404).json({ error: 'Score record not found' });
        }

        const updated = db.setScoreRetakeAllowed(scoreId, allowRetake ? 1 : 0);
        res.json({
            message: allowRetake ? 'Retake permission granted to student' : 'Retake permission revoked',
            score: updated,
            retakeAllowed: allowRetake ? 1 : 0
        });
    } catch (err) {
        console.error('Toggle retake error:', err);
        res.status(500).json({ error: 'Server error updating retake permission' });
    }
});

// Get scores for a student
app.get('/api/scores/student/:studentId', (req, res) => {
    try {
        const scores = db.getScoresByStudent(req.params.studentId);
        res.json({ scores });
    } catch (error) {
        console.error('Get student scores error:', error);
        res.status(500).json({ error: 'Server error loading student scores' });
    }
});

// Get subject gradebook for Faculty (Topic Assessment Records - Item 6)
app.get('/api/subjects/:id/gradebook', (req, res) => {
    try {
        const isStaff = isStaffUser(req);
        const facultyId = req.headers['x-user-id'] || req.query.facultyId;
        const subject = db.getSubjectById(req.params.id);
        if (!subject) return res.status(404).json({ error: 'Subject not found' });
        if (isStaff && facultyId && subject.createdBy && subject.createdBy !== facultyId) {
            return res.status(403).json({ error: 'Unauthorized: You do not have access to this course gradebook' });
        }
        const scores = db.getAllScoresForSubject(req.params.id);
        res.json({ scores });
    } catch (error) {
        console.error('Get gradebook error:', error);
        res.status(500).json({ error: 'Server error loading gradebook' });
    }
});

// Get Summary of ALL Quiz scores per student (Master Matrix - Item 8)
app.get('/api/subjects/:id/matrix', (req, res) => {
    try {
        const isStaff = isStaffUser(req);
        const facultyId = req.headers['x-user-id'] || req.query.facultyId;
        const subject = db.getSubjectById(req.params.id);
        if (!subject) return res.status(404).json({ error: 'Subject not found' });
        if (isStaff && facultyId && subject.createdBy && subject.createdBy !== facultyId) {
            return res.status(403).json({ error: 'Unauthorized: You do not have access to this course matrix' });
        }
        const matrixData = db.getClassScoresMatrix(req.params.id);
        res.json(matrixData);
    } catch (error) {
        console.error('Get matrix error:', error);
        res.status(500).json({ error: 'Server error loading quiz matrix' });
    }
});

// ==================== STATS ROUTE ====================

app.get('/api/stats', (req, res) => {
    try {
        const isStaff = isStaffUser(req);
        const userId = req.headers['x-user-id'] || req.query.userId || req.query.studentId || req.query.facultyId;
        if (!isStaff && userId) {
            const enrolledSubjects = db.getSubjectsForStudent(userId);
            if (enrolledSubjects.length === 0) {
                return res.json({
                    totalSubjects: 0,
                    totalTopics: 0,
                    totalQuizzes: 0,
                    totalScores: 0,
                    totalUsers: 1
                });
            }
            const enrolledIds = new Set(enrolledSubjects.map(s => s.id));
            const totalTopics = enrolledSubjects.reduce((sum, s) => sum + (s.topics ? s.topics.length : 0), 0);
            const totalQuizzes = enrolledSubjects.reduce((sum, s) => sum + (s.topics ? s.topics.filter(t => t.hasQuiz).length : 0), 0);
            const studentScores = db.getScoresByStudent(userId).filter(s => enrolledIds.has(s.subjectId));
            return res.json({
                totalSubjects: enrolledSubjects.length,
                totalTopics,
                totalQuizzes,
                totalScores: studentScores.length,
                totalUsers: 1
            });
        }
        if (isStaff && userId) {
            const stats = db.getFacultyStats(userId);
            return res.json(stats);
        }

        res.json({
            totalSubjects: 0,
            totalTopics: 0,
            totalQuizzes: 0,
            totalScores: 0,
            totalUsers: 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== SYSTEM BACKUP & RESTORE ====================

// Export complete state (users, scores, enrollments) so database survives across git pushes and redeploys
app.get('/api/system/backup', (req, res) => {
    try {
        const users = db.getAllUsersWithPassword();
        const enrollments = db.raw.prepare('SELECT * FROM class_enrollments').all();
        const scores = db.raw.prepare('SELECT * FROM scores').all();
        res.json({
            timestamp: new Date().toISOString(),
            usersCount: users.length,
            scoresCount: scores.length,
            enrollmentsCount: enrollments.length,
            users,
            scores,
            enrollments
        });
    } catch (err) {
        console.error('System backup error:', err);
        res.status(500).json({ error: 'Server error generating backup' });
    }
});

app.post('/api/system/restore', (req, res) => {
    try {
        const { users, scores, enrollments } = req.body;
        let userCount = 0;
        let scoreCount = 0;
        let enrollCount = 0;

        if (Array.isArray(users)) {
            const restored = db.syncRoster(users);
            userCount = restored.length;
        }

        if (Array.isArray(enrollments)) {
            const stmtEnroll = db.raw.prepare('INSERT OR IGNORE INTO class_enrollments (id, subjectId, studentId, enrolledAt) VALUES (@id, @subjectId, @studentId, @enrolledAt)');
            enrollments.forEach(e => {
                try {
                    stmtEnroll.run(e);
                    enrollCount++;
                } catch (_) {}
            });
        }

        if (Array.isArray(scores)) {
            const stmtScore = db.raw.prepare(`
                INSERT OR IGNORE INTO scores (id, quizId, topicId, studentId, score, totalQuestions, percentage, passed, answers, timeSpentSeconds, completedAt, retakeAllowed)
                VALUES (@id, @quizId, @topicId, @studentId, @score, @totalQuestions, @percentage, @passed, @answers, @timeSpentSeconds, @completedAt, @retakeAllowed)
            `);
            scores.forEach(s => {
                try {
                    stmtScore.run({
                        id: s.id,
                        quizId: s.quizId,
                        topicId: s.topicId,
                        studentId: s.studentId,
                        score: s.score,
                        totalQuestions: s.totalQuestions,
                        percentage: s.percentage,
                        passed: s.passed,
                        answers: typeof s.answers === 'string' ? s.answers : JSON.stringify(s.answers || []),
                        timeSpentSeconds: s.timeSpentSeconds || 0,
                        completedAt: s.completedAt,
                        retakeAllowed: s.retakeAllowed || 0
                    });
                    scoreCount++;
                } catch (_) {}
            });
        }

        res.json({
            message: 'System restore completed',
            userCount,
            scoreCount,
            enrollCount
        });
    } catch (err) {
        console.error('System restore error:', err);
        res.status(500).json({ error: 'Server error restoring system' });
    }
});

// ==================== SERVE FRONTEND ====================

// Serve login page as default
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

app.get('/favicon.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'favicon.png'));
});

// Export app for serverless (Vercel)
module.exports = app;

// Start Server locally if run directly
if (require.main === module) {
    app.listen(PORT, HOST, () => {
        console.log(`LMS Server running at http://${HOST}:${PORT}`);
        console.log(`Database: SQLite (${db.DB_PATH})`);
    });
}
