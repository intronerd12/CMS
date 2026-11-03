const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { randomUUID: uuidv4 } = require('crypto');
const { SYLLABUS_14_TOPICS } = require('./quiz-data');
const { getRandomizedSampleQuiz, SAMPLE_QUESTION_BANKS } = require('./sample-quiz-bank');
const presentations = require('./presentations');
const { extractPptxSlides } = require('./pptx-parser');

const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NOW_REGION ||
    process.env.LAMBDA_TASK_ROOT
);

function resolveDatabasePath() {
    if (process.env.DATABASE_PATH) {
        const customDir = path.dirname(process.env.DATABASE_PATH);
        if (!fs.existsSync(customDir)) {
            fs.mkdirSync(customDir, { recursive: true });
        }
        return process.env.DATABASE_PATH;
    }

    if (process.env.DATA_DIR) {
        if (!fs.existsSync(process.env.DATA_DIR)) {
            fs.mkdirSync(process.env.DATA_DIR, { recursive: true });
        }
        return path.join(process.env.DATA_DIR, 'lms.db');
    }

    if (isServerless) {
        const tmpDbPath = path.join('/tmp', 'lms.db');
        const bundledDbPath = path.join(__dirname, 'data', 'lms.db');

        // Copy bundled SQLite database to writable /tmp if not yet present in this lambda container
        if (!fs.existsSync(tmpDbPath) && fs.existsSync(bundledDbPath)) {
            try {
                fs.copyFileSync(bundledDbPath, tmpDbPath);
                console.log('[SQLite] Copied bundled database to /tmp/lms.db for Vercel');
            } catch (err) {
                console.error('[SQLite] Could not copy bundled database to /tmp:', err.message);
            }
        }
        return tmpDbPath;
    }

    const localDataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(localDataDir)) {
        try {
            fs.mkdirSync(localDataDir, { recursive: true });
        } catch (e) {
            console.warn('[SQLite] Could not create local data dir, falling back to /tmp:', e.message);
            return path.join('/tmp', 'lms.db');
        }
    }
    return path.join(localDataDir, 'lms.db');
}

const DB_PATH = resolveDatabasePath();
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Use DELETE journal mode in serverless to avoid persistent -wal lock issues across lambda freezes, WAL locally
if (isServerless) {
    db.pragma('journal_mode = DELETE');
} else {
    db.pragma('journal_mode = WAL');
}

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
        profilePic TEXT DEFAULT '',
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

    CREATE TABLE IF NOT EXISTS class_enrollments (
        id TEXT PRIMARY KEY,
        subjectId TEXT NOT NULL,
        studentId TEXT NOT NULL,
        enrolledAt TEXT NOT NULL,
        UNIQUE(subjectId, studentId),
        FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
    CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subjectId);
    CREATE INDEX IF NOT EXISTS idx_enrollments_subject ON class_enrollments(subjectId);
    CREATE INDEX IF NOT EXISTS idx_enrollments_student ON class_enrollments(studentId);
`);

// ==================== COLUMN MIGRATIONS ====================

function ensureColumn(table, column, definition) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!cols.some(c => c.name === column)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`[SQLite] Added column ${table}.${column}`);
    }
}

ensureColumn('users', 'profilePic', 'TEXT DEFAULT ""');
ensureColumn('subjects', 'description', 'TEXT');
ensureColumn('subjects', 'updatedAt', 'TEXT');
ensureColumn('subjects', 'joinCode', 'TEXT');
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
ensureColumn('scores', 'retakeAllowed', 'INTEGER NOT NULL DEFAULT 0');

// Assign default seed subject IT 315 to prof_santos if createdBy is NULL
try {
    const santosUser = db.prepare('SELECT id FROM users WHERE username = ?').get('prof_santos');
    if (santosUser) {
        db.prepare('UPDATE subjects SET createdBy = ? WHERE createdBy IS NULL').run(santosUser.id);
    }
} catch (e) {
    console.error('Error assigning seed subject createdBy:', e.message);
}

// Create indexes on migrated columns
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_subjects_joincode ON subjects(joinCode);
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

function generateUniqueJoinCode(preferredCode = null) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    if (preferredCode) {
        const normalized = String(preferredCode).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        const existing = db.prepare('SELECT id FROM subjects WHERE UPPER(joinCode) = ?').get(normalized);
        if (!existing && normalized.length >= 5) {
            return normalized;
        }
    }
    for (let attempt = 0; attempt < 50; attempt++) {
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const existing = db.prepare('SELECT id FROM subjects WHERE UPPER(joinCode) = ?').get(code);
        if (!existing) return code;
    }
    return 'CMS' + Math.floor(100 + Math.random() * 900);
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

function seedRandomizedPptQuizzes(force = false) {
    db.exec('CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT)');
    if (!force) {
        const alreadyDone = db.prepare("SELECT value FROM app_meta WHERE key = 'seed_randomized_ppt_quizzes_v2'").get();
        if (alreadyDone) return;
    }

    const pptDecks = [
        { key: 'cms', orderIndex: 1, targetCount: 11 },
        { key: 'wordpress', orderIndex: 2, targetCount: 8 },
        { key: 'joomla', orderIndex: 3, targetCount: 13 },
        { key: 'drupal', orderIndex: 4, targetCount: 9 },
        { key: 'wix', orderIndex: 5, targetCount: 12 },
        { key: 'shopify', orderIndex: 6, targetCount: 10 },
        { key: 'magento', orderIndex: 7, targetCount: 14 }
    ];

    const now = new Date().toISOString();

    db.transaction(() => {
        pptDecks.forEach(({ key, orderIndex, targetCount }) => {
            let topic = db.prepare("SELECT * FROM topics WHERE presentationKey = ? LIMIT 1").get(key);
            if (!topic) {
                topic = db.prepare("SELECT * FROM topics WHERE orderIndex = ? LIMIT 1").get(orderIndex);
            }
            if (!topic) return;

            const sample = getRandomizedSampleQuiz(key, targetCount);

            let quiz = db.prepare("SELECT * FROM quizzes WHERE topicId = ? LIMIT 1").get(topic.id);
            let quizId;
            if (quiz) {
                quizId = quiz.id;
                db.prepare(`
                    UPDATE quizzes 
                    SET title = ?, description = ?, timeLimitMinutes = ?, passingScorePercent = ?, shuffleChoices = 1, updatedAt = ?
                    WHERE id = ?
                `).run(sample.title, `Comprehensive multiple choice evaluation for ${topic.title} based on lesson slides.`, sample.timeLimitMinutes, sample.passingScorePercent, now, quizId);
            } else {
                quizId = uuidv4();
                db.prepare(`
                    INSERT INTO quizzes (id, topicId, subjectId, title, description, timeLimitMinutes, passingScorePercent, shuffleChoices, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                `).run(quizId, topic.id, topic.subjectId, sample.title, `Comprehensive multiple choice evaluation for ${topic.title} based on lesson slides.`, sample.timeLimitMinutes, sample.passingScorePercent, now, now);
            }

            // Replace questions with randomized set
            db.prepare("DELETE FROM quiz_questions WHERE quizId = ?").run(quizId);
            const insertQStmt = db.prepare(`
                INSERT INTO quiz_questions (id, quizId, questionText, options, correctAnswer, explanation, orderIndex, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            sample.questions.forEach((q, idx) => {
                insertQStmt.run(
                    uuidv4(),
                    quizId,
                    q.questionText,
                    JSON.stringify(q.options),
                    q.correctAnswer,
                    q.explanation || '',
                    idx + 1,
                    now
                );
            });

            console.log(`[SQLite] Seeded PPT quiz for "${topic.title}" with ${sample.questions.length} randomized questions.`);
        });

        db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('seed_randomized_ppt_quizzes_v2', '1')").run();
    })();
}

function seedAndMigrate() {
    // 1. Migrate existing users.json if present
    const usersJsonPath = path.join(__dirname, 'data', 'users.json');
    if (fs.existsSync(usersJsonPath)) {
        try {
            const raw = fs.readFileSync(usersJsonPath, 'utf8');
            const jsonUsers = JSON.parse(raw);
            if (Array.isArray(jsonUsers)) {
                const insertUser = db.prepare(`
                    INSERT OR IGNORE INTO users (id, username, email, password, firstName, lastName, role, profilePic, createdAt, isActive)
                    VALUES (@id, @username, @email, @password, @firstName, @lastName, @role, @profilePic, @createdAt, @isActive)
                `);
                const updateUserPic = db.prepare(`
                    UPDATE users 
                    SET profilePic = @profilePic 
                    WHERE (id = @id OR username = @username) AND (@profilePic != '') AND (profilePic IS NULL OR profilePic = '')
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
                            profilePic: u.profilePic || '',
                            createdAt: u.createdAt || new Date().toISOString(),
                            isActive: u.isActive === false ? 0 : 1
                        });
                        if (u.profilePic && u.profilePic.trim().length > 0) {
                            updateUserPic.run({
                                id: u.id || '',
                                username: u.username || '',
                                profilePic: u.profilePic.trim()
                            });
                        }
                    }
                });
                insertMany(jsonUsers);

                // Sync any updated profile pics from SQLite back to users.json so git/disk keeps them
                const dbUsers = db.prepare('SELECT id, username, email, firstName, lastName, role, profilePic, createdAt, isActive FROM users ORDER BY createdAt DESC').all();
                let changed = false;
                for (const dbu of dbUsers) {
                    const found = jsonUsers.find(u => u.id === dbu.id || (u.username && u.username.toLowerCase() === dbu.username.toLowerCase()));
                    if (found) {
                        if (dbu.profilePic && !found.profilePic) {
                            found.profilePic = dbu.profilePic;
                            changed = true;
                        }
                    } else {
                        jsonUsers.push({
                            id: dbu.id,
                            username: dbu.username,
                            email: dbu.email,
                            firstName: dbu.firstName,
                            lastName: dbu.lastName,
                            role: dbu.role,
                            profilePic: dbu.profilePic || '',
                            createdAt: dbu.createdAt,
                            isActive: dbu.isActive
                        });
                        changed = true;
                    }
                }
                if (changed) {
                    fs.writeFileSync(usersJsonPath, JSON.stringify(jsonUsers, null, 2), 'utf8');
                }
            }
        } catch (err) {
            console.error('[SQLite] Migration error for users.json:', err.message);
        }
    }

    // 2. Ensure standard demo accounts always exist
    try {
        const insertDemoUser = db.prepare(`
            INSERT OR IGNORE INTO users (id, username, email, password, firstName, lastName, role, createdAt, isActive)
            VALUES (@id, @username, @email, @password, @firstName, @lastName, @role, @createdAt, 1)
        `);

        // Faculty: prof_santos / faculty123
        const facultyHash = bcrypt.hashSync('faculty123', 10);
        insertDemoUser.run({
            id: 'fa720e14-7d52-4a0b-93f5-7d8b524cb111',
            username: 'prof_santos',
            email: 'maria.santos@university.edu',
            password: facultyHash,
            firstName: 'Maria',
            lastName: 'Santos',
            role: 'faculty',
            createdAt: new Date().toISOString()
        });

        // Student: student_juan / student123
        const studentHash = bcrypt.hashSync('student123', 10);
        insertDemoUser.run({
            id: 'feb675b3-d156-484f-b00d-d07941e2dc5f',
            username: 'student_juan',
            email: 'juan.delacruz@student.university.edu',
            password: studentHash,
            firstName: 'Juan',
            lastName: 'Dela Cruz',
            role: 'student',
            createdAt: new Date().toISOString()
        });

        // Student: sqlite_student / student123
        insertDemoUser.run({
            id: 'd1b3e379-66d7-42a3-83b5-d308a4c0105f',
            username: 'sqlite_student',
            email: 'carlo.reyes@student.university.edu',
            password: studentHash,
            firstName: 'Carlo',
            lastName: 'Reyes',
            role: 'student',
            createdAt: new Date().toISOString()
        });
    } catch (err) {
        console.error('[SQLite] Error ensuring demo users:', err.message);
    }

    // 3. Clean up any admin accounts - only student and faculty roles exist
    try {
        db.prepare("DELETE FROM users WHERE role = 'admin' OR username = 'admin'").run();
        db.prepare("UPDATE quizzes SET timeLimitMinutes = 10 WHERE timeLimitMinutes = 15").run();
    } catch (e) {
        // Ignore if clean
    }

    // 4. Seed 14 topics & quizzes
    seedFull14TopicsAndQuizzes();

    // 4b. Seed randomized PPT sample quizzes for the 7 presentation slide decks
    seedRandomizedPptQuizzes();

    // 5. Backfill joinCode for any subjects missing one
    try {
        const subjectsWithoutCode = db.prepare("SELECT id, code FROM subjects WHERE joinCode IS NULL OR joinCode = ''").all();
        const updateJoinCodeStmt = db.prepare("UPDATE subjects SET joinCode = ? WHERE id = ?");
        subjectsWithoutCode.forEach(s => {
            const preferred = (s.code && s.code.toUpperCase().replace(/[^A-Z0-9]/g, '') === 'IT315') ? 'CMS315' : null;
            const newCode = generateUniqueJoinCode(preferred);
            updateJoinCodeStmt.run(newCode, s.id);
            console.log(`[SQLite] Assigned Class Join Code ${newCode} to subject ${s.code}`);
        });
    } catch (err) {
        console.error('[SQLite] Error backfilling join codes:', err.message);
    }
}

seedAndMigrate();

// ==================== ENRICH TOPIC HELPER ====================

function enrichTopic(topic) {
    if (!topic) return topic;

    // Deck from uploaded presentations (if presentationKey is a library deck key)
    const isExplicitCustomMode = topic.presentationKey === 'custom';
    const deck = (topic.presentationKey && !isExplicitCustomMode)
        ? presentations.getPresentation(topic.presentationKey)
        : null;

    // Custom slides created by faculty in Slide Studio
    let customSlides = [];
    if (topic.slidesContent) {
        try {
            customSlides = JSON.parse(topic.slidesContent);
            if (!Array.isArray(customSlides)) customSlides = [];
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

    const normalizedCustomFile = typeof topic.customFile === 'string'
        ? topic.customFile
        : (topic.customFile && typeof topic.customFile === 'object' ? (topic.customFile.fileUrl || topic.customFile.fileName || null) : null);
    const hasCustomFile = !!normalizedCustomFile;
    const customSourceName = hasCustomFile ? String(normalizedCustomFile).split('/').pop() : `${topic.title}.pptx`;

    // If custom PPTX file is attached but slidesContent is not yet parsed, extract slides from PPTX
    if (hasCustomFile && customSlides.length === 0 && /\.pptx?$/i.test(normalizedCustomFile)) {
        try {
            const diskPath = path.join(__dirname, 'public', normalizedCustomFile.replace(/^\//, ''));
            const customUploadsDir = process.env.UPLOADS_DIR || (
                isServerless ? path.join('/tmp', 'uploads', 'custom') : path.join(__dirname, 'public', 'uploads', 'custom')
            );
            const altPath = path.join(customUploadsDir, path.basename(normalizedCustomFile));
            const targetPath = fs.existsSync(diskPath) ? diskPath : (fs.existsSync(altPath) ? altPath : null);
            if (targetPath) {
                const parsed = extractPptxSlides(targetPath, {
                    outputDir: path.join(customUploadsDir, 'slides'),
                    publicUrlPrefix: '/uploads/custom/slides',
                    deckSlug: path.basename(normalizedCustomFile, path.extname(normalizedCustomFile)),
                    isServerless
                });
                if (parsed && parsed.length > 0) {
                    customSlides = parsed;
                    try {
                        db.prepare('UPDATE topics SET slidesContent = ? WHERE id = ?').run(JSON.stringify(customSlides), topic.id);
                    } catch (e) {}
                }
            }
        } catch (err) {
            console.error('[enrichTopic] Error auto-parsing PPTX:', err.message);
        }
    }

    const hasCustomSlides = customSlides.length > 0;
    const customCover = (hasCustomSlides && customSlides[0] && customSlides[0].imageUrl)
        ? customSlides[0].imageUrl
        : '/uploads/presentations/placeholder.webp';

    let finalPresentation = null;
    if (isExplicitCustomMode && (hasCustomSlides || hasCustomFile)) {
        finalPresentation = {
            key: 'custom',
            isCustom: true,
            title: topic.title,
            category: hasCustomFile ? 'Uploaded Presentation Deck' : 'Course Slide Deck',
            accent: '#4f46e5',
            slideCount: hasCustomSlides ? customSlides.length : 1,
            cover: customCover,
            slides: hasCustomSlides ? customSlides : [{
                slideNumber: 1,
                title: topic.title,
                subtitle: 'Uploaded Presentation Deck',
                layout: 'bullets',
                theme: 'indigo',
                bullets: [
                    `Presentation file attached: ${customSourceName}`,
                    topic.summary || 'Review the attached presentation deck and syllabus notes.',
                    topic.description || 'Topic presentation deck ready for study.'
                ],
                notes: topic.content || 'Uploaded course material'
            }],
            sourceUrl: topic.customFile || null,
            sourceName: customSourceName
        };
    } else if (deck) {
        finalPresentation = {
            key: deck.key,
            isCustom: false,
            title: deck.title,
            category: deck.category,
            accent: deck.accent,
            slideCount: deck.slideCount,
            cover: deck.cover,
            slides: deck.slides,
            sourceUrl: topic.customFile || deck.sourceUrl,
            sourceName: hasCustomFile ? customSourceName : deck.sourceName
        };
    } else if (hasCustomFile || hasCustomSlides) {
        finalPresentation = {
            key: 'custom',
            isCustom: true,
            title: topic.title,
            category: hasCustomFile ? 'Uploaded Presentation Deck' : 'Course Slide Deck',
            accent: '#4f46e5',
            slideCount: hasCustomSlides ? customSlides.length : 1,
            cover: customCover,
            slides: hasCustomSlides ? customSlides : [{
                slideNumber: 1,
                title: topic.title,
                subtitle: 'Uploaded Presentation Deck',
                layout: 'bullets',
                theme: 'indigo',
                bullets: [
                    `Presentation file attached: ${customSourceName}`,
                    topic.summary || 'Review the attached presentation deck and syllabus notes.',
                    topic.description || 'Topic presentation deck ready for study.'
                ],
                notes: topic.content || 'Uploaded course material'
            }],
            sourceUrl: topic.customFile || null,
            sourceName: customSourceName
        };
    }

    return {
        ...topic,
        customSlides,
        hasQuiz: !!quiz,
        quiz: quiz ? { ...quiz, questionCount } : null,
        presentation: finalPresentation
    };
}

// ==================== PREPARED STATEMENTS ====================

const stmtGetUserByUsername = db.prepare('SELECT * FROM users WHERE username = ?');
const stmtGetUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const stmtGetUserById = db.prepare('SELECT id, username, email, firstName, lastName, role, profilePic, createdAt, isActive FROM users WHERE id = ?');
const stmtGetAllUsers = db.prepare('SELECT id, username, email, firstName, lastName, role, profilePic, createdAt, isActive FROM users ORDER BY createdAt DESC');
const stmtInsertUser = db.prepare(`
    INSERT INTO users (id, username, email, password, firstName, lastName, role, profilePic, createdAt, isActive)
    VALUES (@id, @username, @email, @password, @firstName, @lastName, @role, @profilePic, @createdAt, @isActive)
`);

const stmtUpdateUserProfile = db.prepare(`
    UPDATE users 
    SET firstName = @firstName, lastName = @lastName, email = @email, profilePic = @profilePic 
    WHERE id = @id
`);

const stmtUpdateUserPassword = db.prepare(`
    UPDATE users 
    SET password = @password 
    WHERE id = @id
`);

const stmtGetAllSubjects = db.prepare('SELECT * FROM subjects ORDER BY createdAt DESC');
const stmtGetSubjectById = db.prepare('SELECT * FROM subjects WHERE id = ?');
const stmtGetSubjectByJoinCode = db.prepare('SELECT * FROM subjects WHERE UPPER(joinCode) = UPPER(?)');
const stmtGetSubjectByCode = db.prepare('SELECT * FROM subjects WHERE code = ? COLLATE NOCASE AND term = ? AND year = ?');
const stmtInsertSubject = db.prepare(`
    INSERT INTO subjects (id, name, code, term, year, description, joinCode, createdBy, createdAt, updatedAt)
    VALUES (@id, @name, @code, @term, @year, @description, @joinCode, @createdBy, @createdAt, @createdAt)
`);
const stmtUpdateSubject = db.prepare(`
    UPDATE subjects SET name = @name, code = @code, term = @term, year = @year,
        description = @description, updatedAt = @updatedAt
    WHERE id = @id
`);
const stmtUpdateSubjectJoinCode = db.prepare('UPDATE subjects SET joinCode = ?, updatedAt = ? WHERE id = ?');
const stmtDeleteSubject = db.prepare('DELETE FROM subjects WHERE id = ?');

// Class Enrollment Statements
const stmtCountEnrolledStudents = db.prepare('SELECT COUNT(*) AS count FROM class_enrollments WHERE subjectId = ?');
const stmtIsStudentEnrolled = db.prepare('SELECT 1 FROM class_enrollments WHERE subjectId = ? AND studentId = ?');
const stmtInsertEnrollment = db.prepare(`
    INSERT OR IGNORE INTO class_enrollments (id, subjectId, studentId, enrolledAt)
    VALUES (@id, @subjectId, @studentId, @enrolledAt)
`);
const stmtDeleteEnrollment = db.prepare('DELETE FROM class_enrollments WHERE subjectId = ? AND studentId = ?');
const stmtGetEnrolledStudents = db.prepare(`
    SELECT u.id, u.username, u.email, u.firstName, u.lastName, u.profilePic, ce.enrolledAt
    FROM class_enrollments ce
    JOIN users u ON ce.studentId = u.id
    WHERE ce.subjectId = ? AND u.role = 'student' AND u.isActive = 1
    ORDER BY u.lastName ASC, u.firstName ASC
`);
const stmtGetSubjectsForStudent = db.prepare(`
    SELECT s.*, ce.enrolledAt
    FROM class_enrollments ce
    JOIN subjects s ON ce.subjectId = s.id
    WHERE ce.studentId = ?
    ORDER BY ce.enrolledAt DESC, s.createdAt DESC
`);

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
    LEFT JOIN topics t ON q.topicId = t.id
    WHERE q.subjectId = ?
    ORDER BY COALESCE(t.orderIndex, 999) ASC
`);
const stmtGetQuizById = db.prepare(`
    SELECT q.*, t.title AS topicTitle, t.orderIndex AS topicOrderIndex, COALESCE(q.subjectId, t.subjectId) AS subjectId
    FROM quizzes q
    LEFT JOIN topics t ON q.topicId = t.id
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
    UPDATE quizzes SET 
        title = @title, 
        description = @description, 
        timeLimitMinutes = @timeLimitMinutes,
        passingScorePercent = @passingScorePercent, 
        shuffleChoices = @shuffleChoices,
        topicId = CASE WHEN @topicId IS NOT NULL THEN @topicId ELSE topicId END,
        subjectId = CASE WHEN @subjectId IS NOT NULL THEN @subjectId ELSE subjectId END,
        updatedAt = @updatedAt
    WHERE id = @id
`);
const stmtDeleteQuiz = db.prepare('DELETE FROM quizzes WHERE id = ?');
const stmtDeleteScoresByQuizId = db.prepare('DELETE FROM scores WHERE quizId = ?');
const stmtDeleteScoresByTopicId = db.prepare('DELETE FROM scores WHERE topicId = ?');
const stmtDeleteQuizzesBySubjectId = db.prepare('DELETE FROM quizzes WHERE subjectId = ?');
const stmtDeleteEnrollmentsBySubjectId = db.prepare('DELETE FROM class_enrollments WHERE subjectId = ?');
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
const stmtGetSubjectsForFaculty = db.prepare('SELECT * FROM subjects WHERE createdBy = ? ORDER BY createdAt DESC');
const stmtSetScoreRetakeAllowed = db.prepare(`
    UPDATE scores 
    SET retakeAllowed = ? 
    WHERE quizId = (SELECT quizId FROM scores WHERE id = ?) 
      AND studentId = (SELECT studentId FROM scores WHERE id = ?)
`);
const stmtGetScoresForStudentOnQuiz = db.prepare('SELECT * FROM scores WHERE quizId = ? AND studentId = ? ORDER BY completedAt DESC');

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
    DB_PATH,
    isServerless,
    shuffleArray,
    seedRandomizedPptQuizzes: (force = false) => seedRandomizedPptQuizzes(force),

    // Users
    getUserByUsername: (username) => stmtGetUserByUsername.get(username),
    getUserByEmail: (email) => stmtGetUserByEmail.get(email),
    getUserById: (id) => stmtGetUserById.get(id),
    getAllUsers: () => stmtGetAllUsers.all(),
    createUser: (userData) => {
        const fullUser = {
            id: userData.id || uuidv4(),
            profilePic: '',
            isActive: 1,
            createdAt: new Date().toISOString(),
            ...userData
        };
        const res = stmtInsertUser.run(fullUser);
        try {
            const usersJsonPath = path.join(__dirname, 'data', 'users.json');
            let list = [];
            if (fs.existsSync(usersJsonPath)) {
                list = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
            }
            if (!list.some(u => u.id === fullUser.id || u.username === fullUser.username)) {
                list.push(fullUser);
                fs.writeFileSync(usersJsonPath, JSON.stringify(list, null, 2), 'utf8');
            }
        } catch (_) {}
        return res;
    },
    updateUserProfile: (userData) => {
        const res = stmtUpdateUserProfile.run(userData);
        try {
            const usersJsonPath = path.join(__dirname, 'data', 'users.json');
            if (fs.existsSync(usersJsonPath)) {
                const list = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
                const idx = list.findIndex(u => u.id === userData.id || (userData.username && u.username && u.username.toLowerCase() === userData.username.toLowerCase()));
                if (idx !== -1) {
                    list[idx] = { ...list[idx], ...userData };
                } else {
                    const full = stmtGetUserById.get(userData.id);
                    if (full) list.push(full);
                }
                fs.writeFileSync(usersJsonPath, JSON.stringify(list, null, 2), 'utf8');
            }
        } catch (_) {}
        return res;
    },
    updateUserPassword: (id, password) => {
        const res = stmtUpdateUserPassword.run({ id, password });
        try {
            const usersJsonPath = path.join(__dirname, 'data', 'users.json');
            if (fs.existsSync(usersJsonPath)) {
                const list = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
                const idx = list.findIndex(u => u.id === id);
                if (idx !== -1) {
                    list[idx].password = password;
                    fs.writeFileSync(usersJsonPath, JSON.stringify(list, null, 2), 'utf8');
                }
            }
        } catch (_) {}
        return res;
    },

    // Subjects
    getSubjectsForFaculty: (facultyId, includeUnpublished = true) => {
        if (!facultyId) return [];
        const subjects = stmtGetSubjectsForFaculty.all(facultyId);
        const topicStmt = includeUnpublished ? stmtGetTopicsBySubjectAll : stmtGetTopicsBySubjectPublished;
        return subjects.map(s => {
            const enrolledRow = stmtCountEnrolledStudents.get(s.id);
            return {
                ...s,
                enrolledCount: enrolledRow ? enrolledRow.count : 0,
                topics: topicStmt.all(s.id).map(enrichTopic)
            };
        });
    },
    getAllSubjects: (includeUnpublished = true) => {
        const subjects = stmtGetAllSubjects.all();
        const topicStmt = includeUnpublished ? stmtGetTopicsBySubjectAll : stmtGetTopicsBySubjectPublished;
        return subjects.map(s => {
            const enrolledRow = stmtCountEnrolledStudents.get(s.id);
            return {
                ...s,
                enrolledCount: enrolledRow ? enrolledRow.count : 0,
                topics: topicStmt.all(s.id).map(enrichTopic)
            };
        });
    },
    getSubjectsForStudent: (studentId) => {
        if (!studentId) return [];
        const subjects = stmtGetSubjectsForStudent.all(studentId);
        return subjects.map(s => {
            const enrolledRow = stmtCountEnrolledStudents.get(s.id);
            return {
                ...s,
                isEnrolled: true,
                enrolledCount: enrolledRow ? enrolledRow.count : 0,
                topics: stmtGetTopicsBySubjectPublished.all(s.id).map(enrichTopic)
            };
        });
    },
    getSubjectById: (id, includeUnpublished = true) => {
        const s = stmtGetSubjectById.get(id);
        if (!s) return null;
        const topicStmt = includeUnpublished ? stmtGetTopicsBySubjectAll : stmtGetTopicsBySubjectPublished;
        const enrolledRow = stmtCountEnrolledStudents.get(s.id);
        return {
            ...s,
            enrolledCount: enrolledRow ? enrolledRow.count : 0,
            topics: topicStmt.all(s.id).map(enrichTopic)
        };
    },
    findDuplicateSubject: (code, term, year) => stmtGetSubjectByCode.get(code, term, year),
    createSubject: (subjectData) => {
        const now = new Date().toISOString();
        const joinCode = generateUniqueJoinCode(subjectData.joinCode || null);
        const id = subjectData.id || uuidv4();
        stmtInsertSubject.run({
            id,
            name: subjectData.name,
            code: subjectData.code,
            term: subjectData.term || '1st Semester',
            year: subjectData.year || subjectData.yearLevel || '1st Year',
            description: subjectData.description || null,
            joinCode,
            createdBy: subjectData.createdBy || null,
            createdAt: subjectData.createdAt || now
        });
        return {
            id,
            name: subjectData.name,
            code: subjectData.code,
            term: subjectData.term || '1st Semester',
            year: subjectData.year || subjectData.yearLevel || '1st Year',
            description: subjectData.description || null,
            joinCode,
            createdBy: subjectData.createdBy || null,
            createdAt: subjectData.createdAt || now
        };
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
    regenerateSubjectJoinCode: (subjectId) => {
        const newCode = generateUniqueJoinCode();
        stmtUpdateSubjectJoinCode.run(newCode, new Date().toISOString(), subjectId);
        return newCode;
    },
    joinSubjectByCode: (studentId, rawCode) => {
        if (!studentId || !rawCode) {
            throw new Error('Student ID and Class Code are required.');
        }
        const cleanCode = String(rawCode).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!cleanCode) {
            throw new Error('Please enter a valid Class Code.');
        }
        const subject = stmtGetSubjectByJoinCode.get(cleanCode);
        if (!subject) {
            throw new Error('Invalid Class Code. Please check the code from your instructor and try again.');
        }
        const alreadyEnrolled = stmtIsStudentEnrolled.get(subject.id, studentId);
        if (alreadyEnrolled) {
            return {
                alreadyEnrolled: true,
                subject: module.exports.getSubjectById(subject.id, false)
            };
        }
        stmtInsertEnrollment.run({
            id: uuidv4(),
            subjectId: subject.id,
            studentId,
            enrolledAt: new Date().toISOString()
        });
        return {
            alreadyEnrolled: false,
            subject: module.exports.getSubjectById(subject.id, false)
        };
    },
    leaveSubject: (studentId, subjectId) => {
        return stmtDeleteEnrollment.run(subjectId, studentId);
    },
    removeStudentFromSubject: (subjectId, studentId) => {
        return stmtDeleteEnrollment.run(subjectId, studentId);
    },
    isStudentEnrolled: (studentId, subjectId) => {
        if (!studentId || !subjectId) return false;
        return !!stmtIsStudentEnrolled.get(subjectId, studentId);
    },
    getEnrolledStudents: (subjectId) => {
        return stmtGetEnrolledStudents.all(subjectId);
    },
    deleteSubject: (id) => {
        db.transaction(() => {
            const topics = stmtGetTopicsBySubjectAll.all(id);
            topics.forEach(t => {
                const quiz = stmtGetQuizByTopicId.get(t.id);
                if (quiz) {
                    stmtDeleteScoresByQuizId.run(quiz.id);
                    stmtDeleteQuestionsByQuizId.run(quiz.id);
                    stmtDeleteQuiz.run(quiz.id);
                }
                stmtDeleteScoresByTopicId.run(t.id);
                stmtDeleteTopic.run(t.id);
            });
            stmtDeleteQuizzesBySubjectId.run(id);
            stmtDeleteEnrollmentsBySubjectId.run(id);
            stmtDeleteSubject.run(id);
        })();
    },

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
        const id = topicData.id || uuidv4();
        const order = topicData.orderIndex !== undefined ? topicData.orderIndex : (stmtGetMaxTopicOrder.get(topicData.subjectId).m + 1);
        const isPublished = topicData.isPublished !== undefined ? (topicData.isPublished ? 1 : 0) : 1;
        const normalizedFile = typeof topicData.customFile === 'object' && topicData.customFile
            ? (topicData.customFile.fileUrl || topicData.customFile.fileName || null)
            : (topicData.customFile || null);
        stmtInsertTopic.run({
            id,
            subjectId: topicData.subjectId,
            title: topicData.title,
            description: topicData.description || null,
            orderIndex: order,
            presentationKey: topicData.presentationKey || null,
            outline: topicData.outline || null,
            slidesContent: topicData.slidesContent ? (typeof topicData.slidesContent === 'string' ? topicData.slidesContent : JSON.stringify(topicData.slidesContent)) : null,
            customFile: normalizedFile,
            isPublished,
            summary: topicData.summary || null,
            content: topicData.content || null,
            createdAt: topicData.createdAt || now
        });
        const createdRow = stmtGetTopicById.get(id);
        return createdRow ? enrichTopic(createdRow) : { id, ...topicData };
    },
    updateTopic: (topicData) => {
        const current = stmtGetTopicById.get(topicData.id);
        const isPublished = topicData.isPublished !== undefined 
            ? (topicData.isPublished ? 1 : 0) 
            : (current ? current.isPublished : 1);
        const rawFile = topicData.customFile !== undefined ? topicData.customFile : (current ? current.customFile : null);
        const normalizedFile = typeof rawFile === 'object' && rawFile
            ? (rawFile.fileUrl || rawFile.fileName || null)
            : (rawFile || null);
        return stmtUpdateTopic.run({
            id: topicData.id,
            title: topicData.title,
            description: topicData.description !== undefined ? topicData.description : (current ? current.description : null),
            presentationKey: topicData.presentationKey !== undefined ? topicData.presentationKey : (current ? current.presentationKey : null),
            outline: topicData.outline !== undefined ? topicData.outline : (current ? current.outline : null),
            slidesContent: topicData.slidesContent !== undefined 
                ? (topicData.slidesContent === null ? null : (typeof topicData.slidesContent === 'string' ? topicData.slidesContent : JSON.stringify(topicData.slidesContent))) 
                : (current ? current.slidesContent : null),
            customFile: normalizedFile,
            isPublished,
            summary: topicData.summary !== undefined ? topicData.summary : (current ? current.summary : null),
            content: topicData.content !== undefined ? topicData.content : (current ? current.content : null),
            updatedAt: topicData.updatedAt || new Date().toISOString()
        });
    },
    toggleTopicPublish: (id, isPublished) => {
        return stmtToggleTopicPublish.run(isPublished ? 1 : 0, new Date().toISOString(), id);
    },
    deleteTopicPresentation: (topicId) => {
        const current = stmtGetTopicById.get(topicId);
        if (!current) return null;
        stmtUpdateTopic.run({
            id: topicId,
            title: current.title,
            description: current.description,
            presentationKey: null,
            outline: current.outline,
            slidesContent: null,
            customFile: null,
            isPublished: current.isPublished,
            summary: current.summary,
            content: current.content,
            updatedAt: new Date().toISOString()
        });
        return module.exports.getTopicById(topicId);
    },
    deleteTopic: (id) => {
        const topic = stmtGetTopicById.get(id);
        if (!topic) return;
        db.transaction(() => {
            const quiz = stmtGetQuizByTopicId.get(id);
            if (quiz) {
                stmtDeleteScoresByQuizId.run(quiz.id);
                stmtDeleteQuestionsByQuizId.run(quiz.id);
                stmtDeleteQuiz.run(quiz.id);
            }
            stmtDeleteScoresByTopicId.run(id);
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
        const resolvedQuestions = Array.isArray(questions) && questions.length > 0
            ? questions
            : (Array.isArray(quizData.questions) ? quizData.questions : []);
        if (!resolvedQuestions || resolvedQuestions.length < 1 || resolvedQuestions.length > 20) {
            throw new Error(`Quiz must have between 1 and 20 questions (max 20 questions). You provided ${resolvedQuestions ? resolvedQuestions.length : 0}.`);
        }
        const now = new Date().toISOString();
        const quizId = quizData.id || uuidv4();

        // Foreign Key Safeguard: Ensure target topic and subject exist
        let targetTopic = stmtGetTopicById.get(quizData.topicId);
        let resolvedSubjectId = quizData.subjectId;

        // Ensure subject exists or fallback to first subject
        const subjectRow = resolvedSubjectId ? stmtGetSubjectById.get(resolvedSubjectId) : null;
        if (!subjectRow) {
            const firstSubject = stmtGetAllSubjects.all()[0];
            if (firstSubject) {
                resolvedSubjectId = firstSubject.id;
            }
        }

        if (targetTopic) {
            resolvedSubjectId = targetTopic.subjectId || resolvedSubjectId;
        } else {
            const nextOrder = stmtGetMaxTopicOrder.get(resolvedSubjectId).m + 1;
            stmtInsertTopic.run({
                id: quizData.topicId,
                subjectId: resolvedSubjectId,
                title: quizData.title ? quizData.title.replace(/\s*Quiz.*$/i, '').trim() || 'Curriculum Lesson' : 'Curriculum Lesson',
                description: quizData.description || null,
                orderIndex: nextOrder,
                presentationKey: null,
                outline: null,
                slidesContent: null,
                customFile: null,
                isPublished: 1,
                summary: null,
                content: null,
                createdAt: now
            });
        }

        // Verify createdBy user exists if provided to prevent FK failures
        let validCreatedBy = null;
        if (quizData.createdBy) {
            const userRow = stmtGetUserById.get(quizData.createdBy);
            if (userRow) {
                validCreatedBy = quizData.createdBy;
            }
        }

        db.transaction(() => {
            stmtInsertQuiz.run({
                id: quizId,
                topicId: quizData.topicId,
                subjectId: resolvedSubjectId,
                title: quizData.title,
                description: quizData.description || null,
                timeLimitMinutes: quizData.timeLimitMinutes || 10,
                passingScorePercent: quizData.passingScorePercent || 75.0,
                shuffleChoices: quizData.shuffleChoices !== undefined ? (quizData.shuffleChoices ? 1 : 0) : 1,
                createdBy: validCreatedBy,
                createdAt: now,
                updatedAt: now
            });

            resolvedQuestions.forEach((q, idx) => {
                const opts = typeof q.options === 'string' ? q.options : JSON.stringify(q.options);
                const designatedCorrect = q.correctAnswer || (Array.isArray(q.options) && q.options[0] ? q.options[0].id : 'opt_1');
                stmtInsertQuestion.run({
                    id: uuidv4(),
                    quizId,
                    questionText: q.questionText,
                    options: opts,
                    correctAnswer: designatedCorrect,
                    explanation: q.explanation || null,
                    orderIndex: idx + 1,
                    createdAt: now
                });
            });
        })();

        return module.exports.getQuizById(quizId, true);
    },
    updateQuiz: (quizData, questions = []) => {
        if (!questions || questions.length < 1 || questions.length > 20) {
            throw new Error(`Quiz must have between 1 and 20 questions (max 20 questions). You provided ${questions ? questions.length : 0}.`);
        }
        const now = new Date().toISOString();

        // If quiz record not found in database, seamlessly create it
        const existing = stmtGetQuizById.get(quizData.id);
        if (!existing) {
            return module.exports.createQuiz(quizData, questions);
        }

        db.transaction(() => {
            stmtUpdateQuiz.run({
                id: quizData.id,
                title: quizData.title,
                description: quizData.description || null,
                timeLimitMinutes: quizData.timeLimitMinutes || 10,
                passingScorePercent: quizData.passingScorePercent || 75.0,
                shuffleChoices: quizData.shuffleChoices !== undefined ? (quizData.shuffleChoices ? 1 : 0) : 1,
                topicId: quizData.topicId || null,
                subjectId: quizData.subjectId || null,
                updatedAt: now
            });

            // Replace questions
            stmtDeleteQuestionsByQuizId.run(quizData.id);
            questions.forEach((q, idx) => {
                const opts = typeof q.options === 'string' ? q.options : JSON.stringify(q.options);
                const designatedCorrect = q.correctAnswer || (Array.isArray(q.options) && q.options[0] ? q.options[0].id : 'opt_1');
                stmtInsertQuestion.run({
                    id: uuidv4(),
                    quizId: quizData.id,
                    questionText: q.questionText,
                    options: opts,
                    correctAnswer: designatedCorrect,
                    explanation: q.explanation || null,
                    orderIndex: idx + 1,
                    createdAt: now
                });
            });
        })();

        return module.exports.getQuizById(quizData.id, true);
    },
    deleteQuiz: (id) => {
        db.transaction(() => {
            stmtDeleteScoresByQuizId.run(id);
            stmtDeleteQuestionsByQuizId.run(id);
            stmtDeleteQuiz.run(id);
        })();
    },

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
                retakeAllowed: !isPassed && Boolean(topicScores.some(s => s.retakeAllowed === 1)),
                passedAttempt: passedScore || null,
                bestAttempt: (topicScores.find(s => s.percentage === highestScore)) || topicScores[0] || null,
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
        if (typeof quizId === 'object' && quizId) {
            const opts = quizId;
            quizId = opts.quizId;
            studentId = opts.studentId;
            studentAnswers = opts.answers || opts.studentAnswers || {};
            timeSpentSeconds = opts.timeSpentSeconds || 0;
        }
        const quiz = stmtGetQuizById.get(quizId);
        if (!quiz) throw new Error('Quiz not found');

        const rawQuestions = stmtGetQuestionsByQuizId.all(quizId);
        if (rawQuestions.length === 0) throw new Error('Quiz has no questions');

        let correctCount = 0;
        const reviewDetails = [];

        rawQuestions.forEach(q => {
            let options = [];
            try {
                options = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []);
            } catch (_) {
                options = [];
            }
            const studentSelectedOptionId = studentAnswers[q.id] || null;

            // Flexible option and answer resolution (supports option ID or exact/trimmed text)
            let correctOpt = options.find(o => o.id === q.correctAnswer);
            if (!correctOpt) {
                correctOpt = options.find(o => o.text && o.text.trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase());
            }

            const studentSelectedOpt = options.find(o => o.id === studentSelectedOptionId || (o.text && o.text.trim().toLowerCase() === String(studentSelectedOptionId).trim().toLowerCase()));

            let isCorrect = false;
            if (correctOpt && studentSelectedOpt) {
                isCorrect = (studentSelectedOpt.id === correctOpt.id) || (studentSelectedOpt.text.trim().toLowerCase() === correctOpt.text.trim().toLowerCase());
            } else if (studentSelectedOptionId) {
                isCorrect = studentSelectedOptionId === q.correctAnswer;
            }

            if (isCorrect) correctCount++;

            reviewDetails.push({
                questionId: q.id,
                questionText: q.questionText,
                options,
                selectedOptionId: studentSelectedOptionId,
                selectedText: studentSelectedOpt ? studentSelectedOpt.text : (studentSelectedOptionId || 'No answer provided'),
                correctOptionId: correctOpt ? correctOpt.id : q.correctAnswer,
                correctText: correctOpt ? correctOpt.text : (q.correctAnswer || ''),
                isCorrect,
                explanation: q.explanation || ''
            });
        });

        const totalQuestions = rawQuestions.length;
        const percentage = Number(((correctCount / totalQuestions) * 100).toFixed(1));
        const passed = percentage >= quiz.passingScorePercent ? 1 : 0;
        const scoreId = uuidv4();
        const completedAt = new Date().toISOString();

        // Consume any previous retake permission - every new quiz attempt requires fresh faculty permission if failed
        try {
            db.prepare('UPDATE scores SET retakeAllowed = 0 WHERE quizId = ? AND studentId = ?').run(quizId, studentId);
        } catch (e) {
            console.warn('[SQLite] Reset retakeAllowed notice:', e.message);
        }

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

        // Academic Integrity: If student failed the quiz, protect the answer key and rationales
        const studentReviewDetails = passed === 1 ? reviewDetails : reviewDetails.map(r => ({
            questionId: r.questionId,
            questionText: r.questionText,
            options: (r.options || []).map(o => ({ id: o.id, text: o.text })),
            selectedOptionId: r.selectedOptionId,
            selectedText: r.selectedText,
            isCorrect: r.isCorrect,
            correctOptionId: null,
            correctText: null,
            explanation: null
        }));

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
            reviewDetails: studentReviewDetails,
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
        const students = stmtGetEnrolledStudents.all(subjectId);
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
    },
    setScoreRetakeAllowed: (scoreId, allowed) => {
        const val = allowed ? 1 : 0;
        stmtSetScoreRetakeAllowed.run(val, scoreId, scoreId);
        return stmtGetScoreById.get(scoreId);
    },
    getScoresForStudentOnQuiz: (quizId, studentId) => {
        return stmtGetScoresForStudentOnQuiz.all(quizId, studentId);
    },
    getFacultyStats: (facultyId) => {
        const subjects = stmtGetSubjectsForFaculty.all(facultyId);
        const subjectIds = subjects.map(s => s.id);
        if (subjectIds.length === 0) {
            return {
                totalSubjects: 0,
                totalTopics: 0,
                totalQuizzes: 0,
                totalScores: 0,
                totalStudents: 0
            };
        }
        const placeholders = subjectIds.map(() => '?').join(',');
        const totalTopics = db.prepare(`SELECT COUNT(*) AS count FROM topics WHERE subjectId IN (${placeholders})`).get(...subjectIds).count;
        const totalQuizzes = db.prepare(`SELECT COUNT(*) AS count FROM quizzes WHERE subjectId IN (${placeholders})`).get(...subjectIds).count;
        const totalScores = db.prepare(`
            SELECT COUNT(*) AS count FROM scores s
            JOIN topics t ON s.topicId = t.id
            WHERE t.subjectId IN (${placeholders})
        `).get(...subjectIds).count;
        const totalStudents = db.prepare(`
            SELECT COUNT(DISTINCT studentId) AS count FROM class_enrollments
            WHERE subjectId IN (${placeholders})
        `).get(...subjectIds).count;
        return {
            totalSubjects: subjects.length,
            totalTopics,
            totalQuizzes,
            totalScores,
            totalStudents
        };
    },
    deleteUser: (id) => db.prepare('DELETE FROM users WHERE id = ?').run(id),
    raw: db
};
