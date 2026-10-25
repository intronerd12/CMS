const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'lms.db');
const db = new Database(DB_PATH);

// Enable foreign keys and WAL mode for better concurrency
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// ==================== SCHEMA INITIALIZATION ====================

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL COLLATE NOCASE,
        email TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('student', 'faculty', 'admin')),
        createdAt TEXT NOT NULL,
        isActive INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        term TEXT NOT NULL,
        year TEXT NOT NULL,
        createdBy TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS topics (
        id TEXT PRIMARY KEY,
        subjectId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        orderIndex INTEGER DEFAULT 0,
        content TEXT,
        presentationUrl TEXT,
        summary TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quizzes (
        id TEXT PRIMARY KEY,
        topicId TEXT,
        subjectId TEXT,
        title TEXT NOT NULL,
        timeLimitMinutes INTEGER DEFAULT 10,
        passingScorePercent REAL DEFAULT 75.0,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (topicId) REFERENCES topics(id) ON DELETE CASCADE,
        FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scores (
        id TEXT PRIMARY KEY,
        quizId TEXT NOT NULL,
        studentId TEXT NOT NULL,
        score REAL NOT NULL,
        totalQuestions INTEGER NOT NULL,
        percentage REAL NOT NULL,
        passed INTEGER NOT NULL,
        completedAt TEXT NOT NULL,
        FOREIGN KEY (quizId) REFERENCES quizzes(id) ON DELETE CASCADE,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
    CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subjectId);
    CREATE INDEX IF NOT EXISTS idx_scores_student ON scores(studentId);
`);

// ==================== COLUMN MIGRATIONS ====================
// Adds columns introduced by Requirements #2 & #3 to existing databases.

function ensureColumn(table, column, definition) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!cols.some(c => c.name === column)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`[SQLite] Added column ${table}.${column}`);
    }
}

ensureColumn('subjects', 'description', 'TEXT');
ensureColumn('subjects', 'updatedAt', 'TEXT');
ensureColumn('topics', 'presentationKey', 'TEXT');
ensureColumn('topics', 'outline', 'TEXT');
ensureColumn('topics', 'isPublished', 'INTEGER NOT NULL DEFAULT 1');
ensureColumn('topics', 'updatedAt', 'TEXT');

// ==================== DEFAULT COURSE (from PowerPoint decks) ====================

const DEFAULT_SUBJECT = {
    name: 'Content Management Systems',
    code: 'IT 315',
    term: '1st Semester',
    year: '3rd Year',
    description: 'A survey of the leading content management and e-commerce platforms: how they are structured, installed and used to build and run modern websites and online stores.'
};

const DEFAULT_LESSONS = [
    {
        key: 'cms',
        title: 'CMS Fundamentals',
        description: 'An introduction to Content Management Systems: evolution from early platforms, CMA vs CDA elements, architecture, and lifecycle.',
        outline: ['Introduction: How CMS was born', 'What is a Content Management System (CMS)?', 'Two Elements: CMA & CDA', 'CMS Architecture & Template Workflows', 'Life Cycle of CMS (Creation, Management, Publishing, Presentation)']
    },
    {
        key: 'wordpress',
        title: 'WordPress',
        description: 'An overview of the world\'s most widely used CMS — what it is, why it is popular and how to get a site running.',
        outline: ['Introduction', 'What is WordPress?', 'Benefits of WordPress', 'How to install WordPress']
    },
    {
        key: 'joomla',
        title: 'Joomla',
        description: 'Joomla as an open-source CMS: its architecture, how it works, key features and the installation process.',
        outline: ['What is Joomla?', 'What is a CMS?', 'Architecture of Joomla', 'How Joomla works', 'Where Joomla is used', 'Important features', 'System requirements', 'Installation process', 'Package structure of Joomla']
    },
    {
        key: 'drupal',
        title: 'Drupal',
        description: 'Drupal basics — the core concepts behind this flexible, enterprise-grade CMS, with comparisons to WordPress.',
        outline: ['Introductions', 'What is Drupal?', 'Core concepts: nodes, content types & blocks', 'Modules and themes', 'Drupal vs. WordPress comparisons']
    },
    {
        key: 'wix',
        title: 'Wix',
        description: 'Web page design using templates and online WYSIWYG platforms, with Wix as the hands-on example.',
        outline: ['What does "WYSIWYG" mean?', 'Template-based web design', 'Online website builders', 'Building pages with the Wix editor', 'Publishing your site']
    },
    {
        key: 'shopify',
        title: 'Shopify',
        description: 'Shopify as a hosted e-commerce platform, including the Liquid templating language used to build store themes.',
        outline: ['What is Shopify?', 'Five important facts', 'What is Liquid?', 'Liquid syntax, objects & properties', 'Uses of Shopify', 'Advantages & disadvantages', 'Conclusion']
    },
    {
        key: 'magento',
        title: 'Magento',
        description: 'An introduction to Magento, the open-source e-commerce platform: architecture, popular features and Magento 2.',
        outline: ['Introduction', 'Architecture overview', 'Popular features', 'Magento Connect', 'Demonstration', 'Magento 2 — new features', 'Resources for learning']
    }
];

function seedDefaultCourse() {
    db.exec('CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT)');
    const seeded = db.prepare("SELECT value FROM app_meta WHERE key = 'seed_cms_course'").get();
    if (seeded) return;

    const now = new Date().toISOString();
    const subjectId = uuidv4();
    const insertTopic = db.prepare(`
        INSERT INTO topics (id, subjectId, title, description, orderIndex, presentationKey, outline, createdAt, updatedAt)
        VALUES (@id, @subjectId, @title, @description, @orderIndex, @presentationKey, @outline, @createdAt, @createdAt)
    `);

    db.transaction(() => {
        db.prepare(`
            INSERT INTO subjects (id, name, code, term, year, description, createdBy, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
        `).run(subjectId, DEFAULT_SUBJECT.name, DEFAULT_SUBJECT.code, DEFAULT_SUBJECT.term,
            DEFAULT_SUBJECT.year, DEFAULT_SUBJECT.description, now, now);

        DEFAULT_LESSONS.forEach((lesson, i) => {
            insertTopic.run({
                id: uuidv4(),
                subjectId,
                title: lesson.title,
                description: lesson.description,
                orderIndex: i + 1,
                presentationKey: lesson.key,
                outline: lesson.outline.join('\n'),
                isPublished: 1,
                createdAt: now
            });
        });

        db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('seed_cms_course', '1')").run();
    })();

    console.log(`[SQLite] Seeded default subject "${DEFAULT_SUBJECT.name}" with ${DEFAULT_LESSONS.length} lessons`);
}

// ==================== SEED & MIGRATE ====================

function seedAndMigrate() {
    // 1. Migrate existing users.json if present
    const usersJsonPath = path.join(DATA_DIR, 'users.json');
    if (fs.existsSync(usersJsonPath)) {
        try {
            const raw = fs.readFileSync(usersJsonPath, 'utf8');
            const jsonUsers = JSON.parse(raw);
            if (Array.isArray(jsonUsers)) {
                const insertUser = db.prepare(`
                    INSERT OR IGNORE INTO users (id, username, email, password, firstName, lastName, role, createdAt, isActive)
                    VALUES (@id, @username, @email, @password, @firstName, @lastName, @role, @createdAt, @isActive)
                `);
                const insertMany = db.transaction((users) => {
                    for (const u of users) {
                        insertUser.run({
                            id: u.id || uuidv4(),
                            username: u.username,
                            email: u.email,
                            password: u.password,
                            firstName: u.firstName,
                            lastName: u.lastName,
                            role: u.role,
                            createdAt: u.createdAt || new Date().toISOString(),
                            isActive: u.isActive === false ? 0 : 1
                        });
                    }
                });
                insertMany(jsonUsers);
                console.log(`[SQLite] Migrated ${jsonUsers.length} users from users.json`);
            }
        } catch (err) {
            console.error('[SQLite] Migration error for users.json:', err.message);
        }
    }

    // 2. Ensure default admin exists
    const adminCheck = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
    if (!adminCheck) {
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync('admin123', salt);
        db.prepare(`
            INSERT INTO users (id, username, email, password, firstName, lastName, role, createdAt, isActive)
            VALUES (?, 'admin', 'admin@lms.com', ?, 'System', 'Administrator', 'admin', ?, 1)
        `).run(uuidv4(), hashedPassword, new Date().toISOString());
        console.log('[SQLite] Default admin created (username: admin, password: admin123)');
    }

    // 3. Seed the default CMS course built from the bundled PowerPoint decks
    seedDefaultCourse();
}

seedAndMigrate();

// ==================== REUSABLE PREPARED STATEMENTS ====================

const stmtGetUserByUsername = db.prepare('SELECT * FROM users WHERE username = ?');
const stmtGetUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const stmtGetUserById = db.prepare('SELECT id, username, email, firstName, lastName, role, createdAt, isActive FROM users WHERE id = ?');
const stmtGetAllUsers = db.prepare('SELECT id, username, email, firstName, lastName, role, createdAt, isActive FROM users ORDER BY createdAt DESC');
const stmtInsertUser = db.prepare(`
    INSERT INTO users (id, username, email, password, firstName, lastName, role, createdAt, isActive)
    VALUES (@id, @username, @email, @password, @firstName, @lastName, @role, @createdAt, @isActive)
`);

const stmtGetAllSubjects = db.prepare('SELECT * FROM subjects ORDER BY createdAt DESC');
const stmtGetSubjectById = db.prepare('SELECT * FROM subjects WHERE id = ?');
const stmtGetSubjectByCode = db.prepare('SELECT * FROM subjects WHERE code = ? COLLATE NOCASE AND term = ? AND year = ?');
const stmtInsertSubject = db.prepare(`
    INSERT INTO subjects (id, name, code, term, year, description, createdBy, createdAt, updatedAt)
    VALUES (@id, @name, @code, @term, @year, @description, @createdBy, @createdAt, @createdAt)
`);
const stmtUpdateSubject = db.prepare(`
    UPDATE subjects SET name = @name, code = @code, term = @term, year = @year,
        description = @description, updatedAt = @updatedAt
    WHERE id = @id
`);
const stmtDeleteSubject = db.prepare('DELETE FROM subjects WHERE id = ?');

const stmtGetTopicsBySubjectAll = db.prepare('SELECT * FROM topics WHERE subjectId = ? ORDER BY orderIndex ASC, createdAt ASC');
const stmtGetTopicsBySubjectPublished = db.prepare('SELECT * FROM topics WHERE subjectId = ? AND isPublished = 1 ORDER BY orderIndex ASC, createdAt ASC');
const stmtGetTopicById = db.prepare('SELECT * FROM topics WHERE id = ?');
const stmtGetMaxTopicOrder = db.prepare('SELECT COALESCE(MAX(orderIndex), 0) AS m FROM topics WHERE subjectId = ?');
const stmtInsertTopic = db.prepare(`
    INSERT INTO topics (id, subjectId, title, description, orderIndex, presentationKey, outline, isPublished, createdAt, updatedAt)
    VALUES (@id, @subjectId, @title, @description, @orderIndex, @presentationKey, @outline, @isPublished, @createdAt, @createdAt)
`);
const stmtUpdateTopic = db.prepare(`
    UPDATE topics SET title = @title, description = @description, presentationKey = @presentationKey,
        outline = @outline, isPublished = @isPublished, updatedAt = @updatedAt
    WHERE id = @id
`);
const stmtToggleTopicPublish = db.prepare(`
    UPDATE topics SET isPublished = ?, updatedAt = ? WHERE id = ?
`);
const stmtUpdateTopicOrder = db.prepare('UPDATE topics SET orderIndex = ? WHERE id = ? AND subjectId = ?');
const stmtDeleteTopic = db.prepare('DELETE FROM topics WHERE id = ?');
const stmtGetTotalTopicsCount = db.prepare('SELECT COUNT(*) AS count FROM topics');
const stmtGetTotalQuizzesCount = db.prepare('SELECT COUNT(*) AS count FROM quizzes');

const presentations = require('./presentations');

function enrichTopic(topic) {
    if (!topic) return topic;
    const deck = topic.presentationKey ? presentations.getPresentation(topic.presentationKey) : null;
    return {
        ...topic,
        presentation: deck ? {
            key: deck.key,
            title: deck.title,
            category: deck.category,
            accent: deck.accent,
            slideCount: deck.slideCount,
            cover: deck.cover,
            slides: deck.slides,
            sourceUrl: deck.sourceUrl,
            sourceName: deck.sourceName
        } : null
    };
}

// ==================== EXPORTED HELPER METHODS ====================

module.exports = {
    db,

    // Users
    getUserByUsername: (username) => stmtGetUserByUsername.get(username),
    getUserByEmail: (email) => stmtGetUserByEmail.get(email),
    getUserById: (id) => stmtGetUserById.get(id),
    getAllUsers: () => stmtGetAllUsers.all(),
    createUser: (userData) => stmtInsertUser.run(userData),

    // Subjects
    getAllSubjects: (includeUnpublished = true) => {
        const subjects = stmtGetAllSubjects.all();
        const topicStmt = includeUnpublished ? stmtGetTopicsBySubjectAll : stmtGetTopicsBySubjectPublished;
        return subjects.map(s => ({
            ...s,
            topics: topicStmt.all(s.id).map(enrichTopic)
        }));
    },
    getSubjectById: (id, includeUnpublished = true) => {
        const s = stmtGetSubjectById.get(id);
        if (!s) return null;
        const topicStmt = includeUnpublished ? stmtGetTopicsBySubjectAll : stmtGetTopicsBySubjectPublished;
        return {
            ...s,
            topics: topicStmt.all(s.id).map(enrichTopic)
        };
    },
    findDuplicateSubject: (code, term, year) => stmtGetSubjectByCode.get(code, term, year),
    createSubject: (subjectData) => {
        const now = new Date().toISOString();
        return stmtInsertSubject.run({
            id: subjectData.id || uuidv4(),
            name: subjectData.name,
            code: subjectData.code,
            term: subjectData.term,
            year: subjectData.year,
            description: subjectData.description || null,
            createdBy: subjectData.createdBy || null,
            createdAt: subjectData.createdAt || now
        });
    },
    updateSubject: (subjectData) => {
        return stmtUpdateSubject.run({
            id: subjectData.id,
            name: subjectData.name,
            code: subjectData.code,
            term: subjectData.term,
            year: subjectData.year,
            description: subjectData.description || null,
            updatedAt: subjectData.updatedAt || new Date().toISOString()
        });
    },
    deleteSubject: (id) => stmtDeleteSubject.run(id),

    // Topics / Table of Contents
    getTopicsBySubject: (subjectId, includeUnpublished = true) => {
        const stmt = includeUnpublished ? stmtGetTopicsBySubjectAll : stmtGetTopicsBySubjectPublished;
        return stmt.all(subjectId).map(enrichTopic);
    },
    getTopicById: (id) => {
        const topic = stmtGetTopicById.get(id);
        return topic ? enrichTopic(topic) : null;
    },
    getNextTopicOrder: (subjectId) => stmtGetMaxTopicOrder.get(subjectId).m + 1,
    createTopic: (topicData) => {
        const now = new Date().toISOString();
        const order = topicData.orderIndex !== undefined ? topicData.orderIndex : (stmtGetMaxTopicOrder.get(topicData.subjectId).m + 1);
        const isPublished = topicData.isPublished !== undefined ? (topicData.isPublished ? 1 : 0) : 1;
        return stmtInsertTopic.run({
            id: topicData.id || uuidv4(),
            subjectId: topicData.subjectId,
            title: topicData.title,
            description: topicData.description || null,
            orderIndex: order,
            presentationKey: topicData.presentationKey || null,
            outline: topicData.outline || null,
            isPublished,
            createdAt: topicData.createdAt || now
        });
    },
    updateTopic: (topicData) => {
        const current = stmtGetTopicById.get(topicData.id);
        const isPublished = topicData.isPublished !== undefined 
            ? (topicData.isPublished ? 1 : 0) 
            : (current ? current.isPublished : 1);
        return stmtUpdateTopic.run({
            id: topicData.id,
            title: topicData.title,
            description: topicData.description || null,
            presentationKey: topicData.presentationKey || null,
            outline: topicData.outline || null,
            isPublished,
            updatedAt: topicData.updatedAt || new Date().toISOString()
        });
    },
    toggleTopicPublish: (id, isPublished) => {
        return stmtToggleTopicPublish.run(isPublished ? 1 : 0, new Date().toISOString(), id);
    },
    deleteTopic: (id) => {
        const topic = stmtGetTopicById.get(id);
        if (!topic) return;
        db.transaction(() => {
            stmtDeleteTopic.run(id);
            // Re-number remaining lessons so the TOC stays sequential
            stmtGetTopicsBySubjectAll.all(topic.subjectId)
                .forEach((t, i) => stmtUpdateTopicOrder.run(i + 1, t.id, topic.subjectId));
        })();
    },
    reorderTopics: (subjectId, orderedIds) => {
        db.transaction(() => {
            orderedIds.forEach((id, i) => stmtUpdateTopicOrder.run(i + 1, id, subjectId));
        })();
    },

    // Counts
    getTotalTopicsCount: () => {
        const row = stmtGetTotalTopicsCount.get();
        return row ? row.count : 0;
    },
    getTotalQuizzesCount: () => {
        const row = stmtGetTotalQuizzesCount.get();
        return row ? row.count : 0;
    }
};
