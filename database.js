const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { SYLLABUS_14_TOPICS } = require('./quiz-data');
const presentations = require('./presentations');

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
        role TEXT NOT NULL CHECK(role IN ('student', 'faculty')),
        createdAt TEXT NOT NULL,
        isActive INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        term TEXT NOT NULL,
        year TEXT NOT NULL,
        description TEXT,
        createdBy TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT,
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
        presentationKey TEXT,
        outline TEXT,
        slidesContent TEXT,
        customFile TEXT,
        isPublished INTEGER NOT NULL DEFAULT 1,
        summary TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT,
        FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quizzes (
        id TEXT PRIMARY KEY,
        topicId TEXT NOT NULL,
        subjectId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        timeLimitMinutes INTEGER DEFAULT 10,
        passingScorePercent REAL DEFAULT 75.0,
        shuffleChoices INTEGER DEFAULT 1,
        createdBy TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT,
        FOREIGN KEY (topicId) REFERENCES topics(id) ON DELETE CASCADE,
        FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
        id TEXT PRIMARY KEY,
        quizId TEXT NOT NULL,
        questionText TEXT NOT NULL,
        options TEXT NOT NULL,
        correctAnswer TEXT NOT NULL,
        explanation TEXT,
        orderIndex INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (quizId) REFERENCES quizzes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scores (
        id TEXT PRIMARY KEY,
        quizId TEXT NOT NULL,
        topicId TEXT NOT NULL,
        studentId TEXT NOT NULL,
        score REAL NOT NULL,
        totalQuestions INTEGER NOT NULL,
        percentage REAL NOT NULL,
        passed INTEGER NOT NULL,
        answers TEXT,
        timeSpentSeconds INTEGER DEFAULT 0,
        completedAt TEXT NOT NULL,
        FOREIGN KEY (quizId) REFERENCES quizzes(id) ON DELETE CASCADE,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
    CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subjectId);
`);

// ==================== COLUMN MIGRATIONS ====================

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
ensureColumn('topics', 'slidesContent', 'TEXT');
ensureColumn('topics', 'customFile', 'TEXT');
ensureColumn('topics', 'isPublished', 'INTEGER NOT NULL DEFAULT 1');
ensureColumn('topics', 'summary', 'TEXT');
ensureColumn('topics', 'content', 'TEXT');
ensureColumn('topics', 'updatedAt', 'TEXT');
ensureColumn('quizzes', 'description', 'TEXT');
ensureColumn('quizzes', 'shuffleChoices', 'INTEGER DEFAULT 1');
ensureColumn('quizzes', 'createdBy', 'TEXT');
ensureColumn('quizzes', 'updatedAt', 'TEXT');
ensureColumn('scores', 'topicId', 'TEXT');
ensureColumn('scores', 'answers', 'TEXT');
ensureColumn('scores', 'timeSpentSeconds', 'INTEGER DEFAULT 0');

// Create indexes on migrated columns
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_quizzes_topic ON quizzes(topicId);
    CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quizId);
    CREATE INDEX IF NOT EXISTS idx_scores_student ON scores(studentId);
    CREATE INDEX IF NOT EXISTS idx_scores_quiz ON scores(quizId);
    CREATE INDEX IF NOT EXISTS idx_scores_topic ON scores(topicId);
`);

// ==================== UTILITY FUNCTIONS ====================

function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

// ==================== SEED COURSE & 14 TOPICS + QUIZZES ====================

const DEFAULT_SUBJECT = {
    name: 'Content Management Systems',
    code: 'IT 315',
    term: '1st Semester',
    year: '3rd Year',
    description: 'A comprehensive 14-topic curriculum exploring architecture, platforms (WordPress, Joomla, Drupal, Wix, Shopify, Magento, Headless CMS), development, security, and cloud deployment.'
};

function seedFull14TopicsAndQuizzes() {
    db.exec('CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT)');
    const alreadySeeded = db.prepare("SELECT value FROM app_meta WHERE key = 'seed_cms_14_topics_v3'").get();
    if (alreadySeeded) return;

    const now = new Date().toISOString();

    // 1. Find or create the default subject
    let subject = db.prepare("SELECT * FROM subjects WHERE code = 'IT 315' LIMIT 1").get();
    let subjectId;
    if (!subject) {
        subjectId = uuidv4();
        db.prepare(`
            INSERT INTO subjects (id, name, code, term, year, description, createdBy, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
        `).run(subjectId, DEFAULT_SUBJECT.name, DEFAULT_SUBJECT.code, DEFAULT_SUBJECT.term,
            DEFAULT_SUBJECT.year, DEFAULT_SUBJECT.description, now, now);
        console.log(`[SQLite] Created primary subject: ${DEFAULT_SUBJECT.name}`);
    } else {
        subjectId = subject.id;
    }

    // 2. Insert or update all 14 topics and their quizzes
    const insertTopicStmt = db.prepare(`
        INSERT INTO topics (id, subjectId, title, description, orderIndex, presentationKey, outline, slidesContent, isPublished, createdAt, updatedAt)
        VALUES (@id, @subjectId, @title, @description, @orderIndex, @presentationKey, @outline, @slidesContent, 1, @createdAt, @createdAt)
    `);

    const updateTopicStmt = db.prepare(`
        UPDATE topics SET title = @title, description = @description, outline = @outline,
            slidesContent = @slidesContent, presentationKey = @presentationKey, updatedAt = @updatedAt
        WHERE id = @id
    `);

    const insertQuizStmt = db.prepare(`
        INSERT INTO quizzes (id, topicId, subjectId, title, description, timeLimitMinutes, passingScorePercent, shuffleChoices, createdBy, createdAt, updatedAt)
        VALUES (@id, @topicId, @subjectId, @title, @description, @timeLimitMinutes, @passingScorePercent, 1, 'system', @createdAt, @createdAt)
    `);

    const insertQuestionStmt = db.prepare(`
        INSERT INTO quiz_questions (id, quizId, questionText, options, correctAnswer, explanation, orderIndex, createdAt)
        VALUES (@id, @quizId, @questionText, @options, @correctAnswer, @explanation, @orderIndex, @createdAt)
    `);

    db.transaction(() => {
        SYLLABUS_14_TOPICS.forEach((item) => {
            // Find existing topic by orderIndex
            let existingTopic = db.prepare("SELECT * FROM topics WHERE subjectId = ? AND orderIndex = ?").get(subjectId, item.orderIndex);
            let topicId;

            const slidesJson = item.slides ? JSON.stringify(item.slides) : null;
            const outlineStr = Array.isArray(item.outline) ? item.outline.join('\n') : item.outline;

            if (existingTopic) {
                topicId = existingTopic.id;
                updateTopicStmt.run({
                    id: topicId,
                    title: item.title,
                    description: item.description,
                    outline: outlineStr,
                    slidesContent: slidesJson,
                    presentationKey: item.key,
                    updatedAt: now
                });
            } else {
                topicId = uuidv4();
                insertTopicStmt.run({
                    id: topicId,
                    subjectId,
                    title: item.title,
                    description: item.description,
                    orderIndex: item.orderIndex,
                    presentationKey: item.key,
                    outline: outlineStr,
                    slidesContent: slidesJson,
                    createdAt: now
                });
            }

            // Check if quiz exists for this topic
            let existingQuiz = db.prepare("SELECT * FROM quizzes WHERE topicId = ?").get(topicId);
            if (!existingQuiz && item.quiz) {
                const quizId = uuidv4();
                insertQuizStmt.run({
                    id: quizId,
                    topicId,
                    subjectId,
                    title: item.quiz.title,
                    description: `Multiple choice evaluation for ${item.title}. Minimum passing grade is ${item.quiz.passingScorePercent}%.`,
                    timeLimitMinutes: item.quiz.timeLimitMinutes || 10,
                    passingScorePercent: item.quiz.passingScorePercent || 75.0,
                    createdAt: now
                });

                // Insert questions
                item.quiz.questions.forEach((q, qIndex) => {
                    const formattedOptions = q.options.map((opt, optIndex) => ({
                        id: `opt_${optIndex + 1}`,
                        text: opt
                    }));

                    // Match correct option text to option id
                    const matchedOpt = formattedOptions.find(o => o.text.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase());
                    const correctId = matchedOpt ? matchedOpt.id : 'opt_1';

                    insertQuestionStmt.run({
                        id: uuidv4(),
                        quizId,
                        questionText: q.questionText,
                        options: JSON.stringify(formattedOptions),
                        correctAnswer: correctId,
                        explanation: q.explanation || '',
                        orderIndex: qIndex + 1,
                        createdAt: now
                    });
                });
            }
        });

        db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('seed_cms_14_topics_v3', '1')").run();
    })();

    console.log(`[SQLite] Successfully verified and seeded 14 curriculum topics and quizzes!`);
}

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
            }
        } catch (err) {
            console.error('[SQLite] Migration error for users.json:', err.message);
        }
    }

    // 2. Clean up any admin accounts - only student and faculty roles exist
    try {
        db.prepare("DELETE FROM users WHERE role = 'admin' OR username = 'admin'").run();
        db.prepare("UPDATE quizzes SET timeLimitMinutes = 10 WHERE timeLimitMinutes = 15").run();
    } catch (e) {
        // Ignore if clean
    }

    // 3. Seed 14 topics & quizzes
    seedFull14TopicsAndQuizzes();
}

seedAndMigrate();

// ==================== ENRICH TOPIC HELPER ====================

function enrichTopic(topic) {
    if (!topic) return topic;

    // Deck from uploaded presentations
    const deck = topic.presentationKey ? presentations.getPresentation(topic.presentationKey) : null;

    // Custom slides created by faculty
    let customSlides = [];
    if (topic.slidesContent) {
        try {
            customSlides = JSON.parse(topic.slidesContent);
        } catch (e) {
            customSlides = [];
        }
    }

    // Check if quiz exists for this topic
    const quiz = db.prepare('SELECT id, title, timeLimitMinutes, passingScorePercent FROM quizzes WHERE topicId = ?').get(topic.id);
    let questionCount = 0;
    if (quiz) {
        const countRow = db.prepare('SELECT COUNT(*) AS c FROM quiz_questions WHERE quizId = ?').get(quiz.id);
        questionCount = countRow ? countRow.c : 0;
    }

    return {
        ...topic,
        customSlides,
        hasQuiz: !!quiz,
        quiz: quiz ? { ...quiz, questionCount } : null,
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

// ==================== PREPARED STATEMENTS ====================

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
    INSERT INTO topics (id, subjectId, title, description, orderIndex, presentationKey, outline, slidesContent, customFile, isPublished, summary, content, createdAt, updatedAt)
    VALUES (@id, @subjectId, @title, @description, @orderIndex, @presentationKey, @outline, @slidesContent, @customFile, @isPublished, @summary, @content, @createdAt, @createdAt)
`);
const stmtUpdateTopic = db.prepare(`
    UPDATE topics SET title = @title, description = @description, presentationKey = @presentationKey,
        outline = @outline, slidesContent = @slidesContent, customFile = @customFile, isPublished = @isPublished,
        summary = @summary, content = @content, updatedAt = @updatedAt
    WHERE id = @id
`);
const stmtToggleTopicPublish = db.prepare(`UPDATE topics SET isPublished = ?, updatedAt = ? WHERE id = ?`);
const stmtUpdateTopicOrder = db.prepare('UPDATE topics SET orderIndex = ? WHERE id = ? AND subjectId = ?');
const stmtDeleteTopic = db.prepare('DELETE FROM topics WHERE id = ?');

// Quiz Statements
const stmtGetQuizzesBySubject = db.prepare(`
    SELECT q.*, t.title AS topicTitle, t.orderIndex AS topicOrderIndex,
           (SELECT COUNT(*) FROM quiz_questions WHERE quizId = q.id) AS questionCount
    FROM quizzes q
    JOIN topics t ON q.topicId = t.id
    WHERE q.subjectId = ?
    ORDER BY t.orderIndex ASC
`);
const stmtGetQuizById = db.prepare(`
    SELECT q.*, t.title AS topicTitle, t.orderIndex AS topicOrderIndex, t.subjectId
    FROM quizzes q
    JOIN topics t ON q.topicId = t.id
    WHERE q.id = ?
`);
const stmtGetQuizByTopicId = db.prepare('SELECT * FROM quizzes WHERE topicId = ?');
const stmtGetQuestionsByQuizId = db.prepare('SELECT * FROM quiz_questions WHERE quizId = ? ORDER BY orderIndex ASC');
const stmtDeleteQuestionsByQuizId = db.prepare('DELETE FROM quiz_questions WHERE quizId = ?');
const stmtInsertQuiz = db.prepare(`
    INSERT INTO quizzes (id, topicId, subjectId, title, description, timeLimitMinutes, passingScorePercent, shuffleChoices, createdBy, createdAt, updatedAt)
    VALUES (@id, @topicId, @subjectId, @title, @description, @timeLimitMinutes, @passingScorePercent, @shuffleChoices, @createdBy, @createdAt, @updatedAt)
`);
const stmtUpdateQuiz = db.prepare(`
    UPDATE quizzes SET title = @title, description = @description, timeLimitMinutes = @timeLimitMinutes,
        passingScorePercent = @passingScorePercent, shuffleChoices = @shuffleChoices, updatedAt = @updatedAt
    WHERE id = @id
`);
const stmtDeleteQuiz = db.prepare('DELETE FROM quizzes WHERE id = ?');
const stmtInsertQuestion = db.prepare(`
    INSERT INTO quiz_questions (id, quizId, questionText, options, correctAnswer, explanation, orderIndex, createdAt)
    VALUES (@id, @quizId, @questionText, @options, @correctAnswer, @explanation, @orderIndex, @createdAt)
`);

// Scores Statements
const stmtInsertScore = db.prepare(`
    INSERT INTO scores (id, quizId, topicId, studentId, score, totalQuestions, percentage, passed, answers, timeSpentSeconds, completedAt)
    VALUES (@id, @quizId, @topicId, @studentId, @score, @totalQuestions, @percentage, @passed, @answers, @timeSpentSeconds, @completedAt)
`);
const stmtGetScoreById = db.prepare(`
    SELECT s.*, q.title AS quizTitle, q.passingScorePercent, t.title AS topicTitle, t.orderIndex AS topicOrderIndex,
           u.firstName, u.lastName, u.email, u.username
    FROM scores s
    JOIN quizzes q ON s.quizId = q.id
    JOIN topics t ON s.topicId = t.id
    JOIN users u ON s.studentId = u.id
    WHERE s.id = ?
`);
const stmtGetScoresByStudent = db.prepare(`
    SELECT s.*, q.title AS quizTitle, q.passingScorePercent, t.title AS topicTitle, t.orderIndex AS topicOrderIndex, t.subjectId
    FROM scores s
    JOIN quizzes q ON s.quizId = q.id
    JOIN topics t ON s.topicId = t.id
    WHERE s.studentId = ?
    ORDER BY s.completedAt DESC
`);
const stmtGetAllScoresForSubject = db.prepare(`
    SELECT s.*, q.title AS quizTitle, q.passingScorePercent, t.title AS topicTitle, t.orderIndex AS topicOrderIndex,
           u.firstName, u.lastName, u.email, u.username
    FROM scores s
    JOIN quizzes q ON s.quizId = q.id
    JOIN topics t ON s.topicId = t.id
    JOIN users u ON s.studentId = u.id
    WHERE t.subjectId = ?
    ORDER BY s.completedAt DESC
`);

// Counts
const stmtGetTotalTopicsCount = db.prepare('SELECT COUNT(*) AS count FROM topics');
const stmtGetTotalQuizzesCount = db.prepare('SELECT COUNT(*) AS count FROM quizzes');
const stmtGetTotalScoresCount = db.prepare('SELECT COUNT(*) AS count FROM scores');

// ==================== EXPORTED HELPER METHODS ====================

module.exports = {
    db,
    shuffleArray,

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

    // Topics
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
            slidesContent: topicData.slidesContent ? (typeof topicData.slidesContent === 'string' ? topicData.slidesContent : JSON.stringify(topicData.slidesContent)) : null,
            customFile: topicData.customFile || null,
            isPublished,
            summary: topicData.summary || null,
            content: topicData.content || null,
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
            slidesContent: topicData.slidesContent ? (typeof topicData.slidesContent === 'string' ? topicData.slidesContent : JSON.stringify(topicData.slidesContent)) : null,
            customFile: topicData.customFile !== undefined ? topicData.customFile : (current ? current.customFile : null),
            isPublished,
            summary: topicData.summary !== undefined ? topicData.summary : (current ? current.summary : null),
            content: topicData.content !== undefined ? topicData.content : (current ? current.content : null),
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
            stmtGetTopicsBySubjectAll.all(topic.subjectId)
                .forEach((t, i) => stmtUpdateTopicOrder.run(i + 1, t.id, topic.subjectId));
        })();
    },
    reorderTopics: (subjectId, orderedIds) => {
        db.transaction(() => {
            orderedIds.forEach((id, i) => stmtUpdateTopicOrder.run(i + 1, id, subjectId));
        })();
    },

    // Quizzes & Questions
    getAllQuizzesBySubject: (subjectId) => stmtGetQuizzesBySubject.all(subjectId),
    getQuizByTopicId: (topicId) => {
        const quiz = stmtGetQuizByTopicId.get(topicId);
        if (!quiz) return null;
        const questions = stmtGetQuestionsByQuizId.all(quiz.id).map(q => ({
            ...q,
            options: JSON.parse(q.options)
        }));
        return { ...quiz, questions };
    },
    getQuizById: (id, includeAnswers = true) => {
        const quiz = stmtGetQuizById.get(id);
        if (!quiz) return null;
        let questions = stmtGetQuestionsByQuizId.all(quiz.id).map(q => {
            const parsedOptions = JSON.parse(q.options);
            if (!includeAnswers) {
                const { correctAnswer, explanation, ...sanitized } = q;
                return { ...sanitized, options: parsedOptions };
            }
            return { ...q, options: parsedOptions };
        });
        return { ...quiz, questions };
    },
    createQuiz: (quizData, questions = []) => {
        if (!questions || questions.length < 10 || questions.length > 30) {
            throw new Error(`Quiz must have between 10 and 30 questions. You provided ${questions ? questions.length : 0}.`);
        }
        const now = new Date().toISOString();
        const quizId = quizData.id || uuidv4();

        db.transaction(() => {
            stmtInsertQuiz.run({
                id: quizId,
                topicId: quizData.topicId,
                subjectId: quizData.subjectId,
                title: quizData.title,
                description: quizData.description || null,
                timeLimitMinutes: quizData.timeLimitMinutes || 10,
                passingScorePercent: quizData.passingScorePercent || 75.0,
                shuffleChoices: quizData.shuffleChoices !== undefined ? (quizData.shuffleChoices ? 1 : 0) : 1,
                createdBy: quizData.createdBy || null,
                createdAt: now,
                updatedAt: now
            });

            questions.forEach((q, idx) => {
                stmtInsertQuestion.run({
                    id: uuidv4(),
                    quizId,
                    questionText: q.questionText,
                    options: typeof q.options === 'string' ? q.options : JSON.stringify(q.options),
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation || null,
                    orderIndex: idx + 1,
                    createdAt: now
                });
            });
        })();

        return module.exports.getQuizById(quizId, true);
    },
    updateQuiz: (quizData, questions = []) => {
        if (!questions || questions.length < 10 || questions.length > 30) {
            throw new Error(`Quiz must have between 10 and 30 questions. You provided ${questions ? questions.length : 0}.`);
        }
        const now = new Date().toISOString();

        db.transaction(() => {
            stmtUpdateQuiz.run({
                id: quizData.id,
                title: quizData.title,
                description: quizData.description || null,
                timeLimitMinutes: quizData.timeLimitMinutes || 10,
                passingScorePercent: quizData.passingScorePercent || 75.0,
                shuffleChoices: quizData.shuffleChoices !== undefined ? (quizData.shuffleChoices ? 1 : 0) : 1,
                updatedAt: now
            });

            // Replace questions
            stmtDeleteQuestionsByQuizId.run(quizData.id);
            questions.forEach((q, idx) => {
                stmtInsertQuestion.run({
                    id: uuidv4(),
                    quizId: quizData.id,
                    questionText: q.questionText,
                    options: typeof q.options === 'string' ? q.options : JSON.stringify(q.options),
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation || null,
                    orderIndex: idx + 1,
                    createdAt: now
                });
            });
        })();

        return module.exports.getQuizById(quizData.id, true);
    },
    deleteQuiz: (id) => stmtDeleteQuiz.run(id),

    // ==================== SEQUENTIAL PROGRESSION ENGINE ====================

    getStudentTopicProgress: (studentId, subjectId) => {
        // Fetch all published topics in order
        const topics = stmtGetTopicsBySubjectPublished.all(subjectId).map(enrichTopic);
        // Fetch all scores for this student
        const studentScores = stmtGetScoresByStudent.all(studentId);

        let completedTopicCount = 0;
        let lastTopicPassed = true; // Topic 1 is unlocked initially

        const topicsWithProgress = topics.map((topic, index) => {
            // Find scores for this topic
            const topicScores = studentScores.filter(s => s.topicId === topic.id);
            const passedScore = topicScores.find(s => s.passed === 1);
            const isPassed = !!passedScore;
            const highestScore = topicScores.reduce((max, s) => Math.max(max, s.percentage), 0);

            // Sequential rule: Topic 1 is ALWAYS unlocked.
            // Topic i (i > 0) is unlocked IF AND ONLY IF Topic i-1 has been passed!
            let isUnlocked = false;
            if (index === 0) {
                isUnlocked = true;
            } else {
                isUnlocked = lastTopicPassed;
            }

            if (isPassed) {
                completedTopicCount++;
                lastTopicPassed = true;
            } else {
                lastTopicPassed = false;
            }

            let status = 'locked';
            if (isPassed) {
                status = 'passed';
            } else if (isUnlocked && topicScores.length > 0) {
                status = 'failed_retry';
            } else if (isUnlocked) {
                status = 'available';
            }

            return {
                ...topic,
                isUnlocked,
                isPassed,
                status,
                attemptsCount: topicScores.length,
                bestScorePercentage: highestScore,
                lastAttempt: topicScores[0] || null,
                requiredPassingScore: topic.quiz ? topic.quiz.passingScorePercent : 75.0
            };
        });

        return {
            topics: topicsWithProgress,
            progress: {
                totalTopics: topics.length,
                completedTopics: completedTopicCount,
                percentage: topics.length > 0 ? Math.round((completedTopicCount / topics.length) * 100) : 0,
                nextUnlockedTopic: topicsWithProgress.find(t => t.status === 'available' || t.status === 'failed_retry') || null
            }
        };
    },

    // ==================== ANTI-CHEATING QUIZ DELIVERY ====================

    getQuizForStudentAttempt: (quizId) => {
        const quiz = stmtGetQuizById.get(quizId);
        if (!quiz) return null;

        const rawQuestions = stmtGetQuestionsByQuizId.all(quizId);

        // Anti-Cheating: Shuffle choices for each question, and randomize question order
        const sanitizedQuestions = rawQuestions.map(q => {
            const rawOptions = JSON.parse(q.options);
            // Fisher-Yates shuffle the options
            const shuffledOptions = shuffleArray(rawOptions);

            return {
                id: q.id,
                questionText: q.questionText,
                options: shuffledOptions, // Options are in randomized order for each student
                orderIndex: q.orderIndex
                // Note: correctAnswer and explanation are completely withheld from student payload!
            };
        });

        // Also randomize question order so students cannot look at adjacent screens
        const randomizedQuestions = shuffleArray(sanitizedQuestions).map((q, idx) => ({
            ...q,
            displayNumber: idx + 1
        }));

        return {
            quiz: {
                id: quiz.id,
                title: quiz.title,
                description: quiz.description,
                topicId: quiz.topicId,
                topicTitle: quiz.topicTitle,
                topicOrderIndex: quiz.topicOrderIndex,
                subjectId: quiz.subjectId,
                timeLimitMinutes: quiz.timeLimitMinutes,
                passingScorePercent: quiz.passingScorePercent,
                totalQuestions: randomizedQuestions.length
            },
            questions: randomizedQuestions
        };
    },

    // ==================== QUIZ GRADING & RECORDING ====================

    submitQuizAttempt: (quizId, studentId, studentAnswers = {}, timeSpentSeconds = 0) => {
        const quiz = stmtGetQuizById.get(quizId);
        if (!quiz) throw new Error('Quiz not found');

        const rawQuestions = stmtGetQuestionsByQuizId.all(quizId);
        if (rawQuestions.length === 0) throw new Error('Quiz has no questions');

        let correctCount = 0;
        const reviewDetails = [];

        rawQuestions.forEach(q => {
            const options = JSON.parse(q.options);
            const studentSelectedOptionId = studentAnswers[q.id] || null;
            const isCorrect = studentSelectedOptionId === q.correctAnswer;

            if (isCorrect) correctCount++;

            const studentSelectedOpt = options.find(o => o.id === studentSelectedOptionId);
            const correctOpt = options.find(o => o.id === q.correctAnswer);

            reviewDetails.push({
                questionId: q.id,
                questionText: q.questionText,
                options,
                selectedOptionId: studentSelectedOptionId,
                selectedText: studentSelectedOpt ? studentSelectedOpt.text : 'No answer provided',
                correctOptionId: q.correctAnswer,
                correctText: correctOpt ? correctOpt.text : '',
                isCorrect,
                explanation: q.explanation || ''
            });
        });

        const totalQuestions = rawQuestions.length;
        const percentage = Number(((correctCount / totalQuestions) * 100).toFixed(1));
        const passed = percentage >= quiz.passingScorePercent ? 1 : 0;
        const scoreId = uuidv4();
        const completedAt = new Date().toISOString();

        stmtInsertScore.run({
            id: scoreId,
            quizId,
            topicId: quiz.topicId,
            studentId,
            score: correctCount,
            totalQuestions,
            percentage,
            passed,
            answers: JSON.stringify(reviewDetails),
            timeSpentSeconds: Number(timeSpentSeconds) || 0,
            completedAt
        });

        // Determine if this passed attempt unlocked the next topic
        let nextTopic = null;
        if (passed) {
            const currentTopic = stmtGetTopicById.get(quiz.topicId);
            if (currentTopic) {
                const candidate = db.prepare('SELECT * FROM topics WHERE subjectId = ? AND orderIndex = ?').get(currentTopic.subjectId, currentTopic.orderIndex + 1);
                if (candidate) {
                    nextTopic = enrichTopic(candidate);
                }
            }
        }

        const scoreRecord = stmtGetScoreById.get(scoreId);

        return {
            scoreId,
            score: correctCount,
            totalQuestions,
            percentage,
            passingScorePercent: quiz.passingScorePercent,
            passed: passed === 1,
            completedAt,
            timeSpentSeconds,
            unlockedNextTopic: passed === 1 && !!nextTopic,
            nextTopic,
            reviewDetails,
            scoreRecord
        };
    },

    // Scores queries
    getScoreById: (scoreId) => {
        const s = stmtGetScoreById.get(scoreId);
        if (!s) return null;
        return {
            ...s,
            answers: s.answers ? JSON.parse(s.answers) : []
        };
    },
    getScoresByStudent: (studentId) => {
        return stmtGetScoresByStudent.all(studentId).map(s => ({
            ...s,
            answers: s.answers ? JSON.parse(s.answers) : []
        }));
    },
    getAllScoresForSubject: (subjectId) => {
        return stmtGetAllScoresForSubject.all(subjectId).map(s => ({
            ...s,
            answers: s.answers ? JSON.parse(s.answers) : []
        }));
    },
    getClassScoresMatrix: (subjectId) => {
        const topics = stmtGetTopicsBySubjectPublished.all(subjectId).map(enrichTopic);
        const students = db.prepare("SELECT id, username, email, firstName, lastName FROM users WHERE role = 'student' AND isActive = 1 ORDER BY lastName ASC, firstName ASC").all();
        const allScores = stmtGetAllScoresForSubject.all(subjectId);

        const matrix = students.map(student => {
            const studentScores = allScores.filter(s => s.studentId === student.id);
            let totalPercentageSum = 0;
            let scoredTopicsCount = 0;
            let passedCount = 0;

            const topicResults = topics.map(t => {
                const topicScores = studentScores.filter(s => s.topicId === t.id);
                const passedScore = topicScores.find(s => s.passed === 1);
                const isPassed = !!passedScore;
                const highestScore = topicScores.length > 0 ? topicScores.reduce((max, s) => Math.max(max, s.percentage), 0) : null;

                if (isPassed) passedCount++;
                if (highestScore !== null) {
                    totalPercentageSum += highestScore;
                    scoredTopicsCount++;
                }

                return {
                    topicId: t.id,
                    orderIndex: t.orderIndex,
                    title: t.title,
                    score: highestScore,
                    isPassed,
                    attemptsCount: topicScores.length
                };
            });

            const overallAverage = scoredTopicsCount > 0 ? Number((totalPercentageSum / scoredTopicsCount).toFixed(1)) : 0;
            const completionRate = topics.length > 0 ? Math.round((passedCount / topics.length) * 100) : 0;

            return {
                studentId: student.id,
                username: student.username,
                email: student.email,
                firstName: student.firstName,
                lastName: student.lastName,
                fullName: `${student.lastName}, ${student.firstName}`,
                topicResults,
                passedCount,
                totalTopics: topics.length,
                overallAverage,
                completionRate,
                isCompleted: passedCount === topics.length && topics.length > 0
            };
        });

        return {
            topics: topics.map(t => ({ id: t.id, orderIndex: t.orderIndex, title: t.title })),
            matrix
        };
    },

    // Counts
    getTotalTopicsCount: () => {
        const row = stmtGetTotalTopicsCount.get();
        return row ? row.count : 0;
    },
    getTotalQuizzesCount: () => {
        const row = stmtGetTotalQuizzesCount.get();
        return row ? row.count : 0;
    },
    getTotalScoresCount: () => {
        const row = stmtGetTotalScoresCount.get();
        return row ? row.count : 0;
    }
};
