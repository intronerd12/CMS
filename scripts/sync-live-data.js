const fs = require('fs');
const path = require('path');

const RENDER_BACKEND_URL = process.env.RENDER_URL || 'https://lms-0ot9.onrender.com';

async function syncLiveDatabase() {
    console.log(`[Sync] Connecting to live backend at ${RENDER_BACKEND_URL}...`);

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(`${RENDER_BACKEND_URL}/api/system/backup`, {
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!res.ok) {
            console.log(`[Sync] Live endpoint returned status ${res.status}. Server may be sleeping or updating.`);
            return;
        }

        const data = await res.json();
        console.log(`[Sync] Downloaded live backup from Render: ${data.usersCount || 0} users, ${data.scoresCount || 0} scores, ${data.enrollmentsCount || 0} enrollments.`);

        const usersJsonPath = path.join(__dirname, '..', 'data', 'users.json');
        let currentUsers = [];
        if (fs.existsSync(usersJsonPath)) {
            try {
                currentUsers = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
            } catch (_) {}
        }

        let addedUsers = 0;
        if (Array.isArray(data.users)) {
            for (const liveUser of data.users) {
                const idx = currentUsers.findIndex(u => u.id === liveUser.id || (u.username && u.username.toLowerCase() === liveUser.username.toLowerCase()));
                if (idx !== -1) {
                    // Update any new fields (e.g. profilePic, password)
                    currentUsers[idx] = { ...currentUsers[idx], ...liveUser };
                } else {
                    currentUsers.push(liveUser);
                    addedUsers++;
                }
            }
            fs.writeFileSync(usersJsonPath, JSON.stringify(currentUsers, null, 2), 'utf8');
            console.log(`[Sync] data/users.json updated: ${addedUsers} new users added, total ${currentUsers.length} users.`);
        }

        // Also sync into local SQLite database if database.js is available
        try {
            const db = require('../database');
            if (Array.isArray(data.users)) {
                db.syncRoster(data.users);
            }
            if (Array.isArray(data.enrollments)) {
                const stmtEnroll = db.raw.prepare('INSERT OR IGNORE INTO class_enrollments (id, subjectId, studentId, enrolledAt) VALUES (@id, @subjectId, @studentId, @enrolledAt)');
                data.enrollments.forEach(e => {
                    try { stmtEnroll.run(e); } catch (_) {}
                });
            }
            if (Array.isArray(data.scores)) {
                const stmtScore = db.raw.prepare(`
                    INSERT OR IGNORE INTO scores (id, quizId, topicId, studentId, score, totalQuestions, percentage, passed, answers, timeSpentSeconds, completedAt, retakeAllowed)
                    VALUES (@id, @quizId, @topicId, @studentId, @score, @totalQuestions, @percentage, @passed, @answers, @timeSpentSeconds, @completedAt, @retakeAllowed)
                `);
                data.scores.forEach(s => {
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
                    } catch (_) {}
                });
            }
            console.log('[Sync] Local SQLite database (data/lms.db) successfully merged with live database.');
        } catch (dbErr) {
            console.warn('[Sync] Local SQLite merge warning:', dbErr.message);
        }

    } catch (err) {
        if (err.name === 'AbortError') {
            console.log('[Sync] Connection timed out (Render service may be spinning up).');
        } else {
            console.log('[Sync] Notice:', err.message);
        }
    }
}

if (require.main === module) {
    syncLiveDatabase().then(() => {
        console.log('[Sync] Complete.');
        process.exit(0);
    });
} else {
    module.exports = { syncLiveDatabase };
}
