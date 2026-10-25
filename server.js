const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./database');
const presentations = require('./presentations');

const app = express();
const PORT = 3000;

// Custom uploads directory
const customUploadsDir = path.join(__dirname, 'public', 'uploads', 'custom');
if (!fs.existsSync(customUploadsDir)) {
    fs.mkdirSync(customUploadsDir, { recursive: true });
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
    return role === 'faculty' || role === 'admin';
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', (req, res) => {
    try {
        const { username, email, password, firstName, lastName, role } = req.body;

        // Validation
        if (!username || !email || !password || !firstName || !lastName || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const validRoles = ['student', 'faculty', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role selected' });
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
            return res.status(403).json({ error: 'Account is deactivated. Contact admin.' });
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

// Get all users (Admin only)
app.get('/api/users', (req, res) => {
    try {
        const users = db.getAllUsers();
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
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

// ==================== SUBJECT ROUTES (Requirement #2) ====================

app.get('/api/subjects', (req, res) => {
    try {
        const isStaff = isStaffUser(req);
        const subjects = db.getAllSubjects(isStaff);
        res.json({ subjects });
    } catch (error) {
        res.status(500).json({ error: 'Server error loading subjects' });
    }
});

app.get('/api/subjects/:id', (req, res) => {
    try {
        const isStaff = isStaffUser(req);
        const subject = db.getSubjectById(req.params.id, isStaff);
        if (!subject) {
            return res.status(404).json({ error: 'Subject not found' });
        }
        res.json({ subject });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
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

        const newSubject = {
            id: uuidv4(),
            name: trimmedName,
            code: trimmedCode,
            term,
            year,
            description: description ? description.trim() : null,
            createdBy: createdBy || null,
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

        const { title, description, presentationKey, outline, isPublished } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Topic title is required' });
        }

        const newTopic = {
            id: uuidv4(),
            subjectId,
            title: title.trim(),
            description: description ? description.trim() : null,
            presentationKey: presentationKey ? presentationKey.trim().toLowerCase() : null,
            outline: Array.isArray(outline) ? outline.join('\n') : (outline ? outline.trim() : null),
            isPublished: isPublished !== false && isPublished !== 0 && isPublished !== '0'
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

        const { title, description, presentationKey, outline, isPublished } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Topic title is required' });
        }

        db.updateTopic({
            id,
            title: title.trim(),
            description: description ? description.trim() : null,
            presentationKey: presentationKey ? presentationKey.trim().toLowerCase() : null,
            outline: Array.isArray(outline) ? outline.join('\n') : (outline ? outline.trim() : null),
            isPublished: isPublished !== undefined ? (isPublished !== false && isPublished !== 0 && isPublished !== '0') : current.isPublished,
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

// Custom presentation file upload
app.post('/api/topics/upload-presentation', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No presentation file was uploaded' });
        }

        const fileUrl = `/uploads/custom/${req.file.filename}`;
        res.json({
            message: 'Presentation uploaded successfully',
            fileUrl,
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size
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

// ==================== STATS ROUTE ====================

app.get('/api/stats', (req, res) => {
    try {
        const subjects = db.getAllSubjects();
        const totalTopics = db.getTotalTopicsCount();
        const totalQuizzes = db.getTotalQuizzesCount();
        const users = db.getAllUsers();

        res.json({
            totalSubjects: subjects.length,
            totalTopics,
            totalQuizzes,
            totalUsers: users.length
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== SERVE FRONTEND ====================

// Serve login page as default
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`LMS Server running at http://127.0.0.1:${PORT}`);
    console.log(`Database: SQLite (data/lms.db)`);
});
