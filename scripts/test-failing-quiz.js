const assert = require('assert');
const db = require('../database.js');

async function testFailingQuizAttempt() {
    console.log('Testing failed quiz attempt logic & structure...');

    // 1. Get faculty & student test users
    const facultyUser = db.getUserByUsername('prof_santos');
    const studentUser = db.getUserByUsername('student_juan');
    assert(facultyUser && studentUser, 'Demo users must exist');

    // 2. Create test subject & topic
    const testSub = db.createSubject({
        code: 'FAIL-' + Math.floor(100 + Math.random() * 900),
        name: 'Quiz Failure Gatekeeper Test',
        term: '1st Semester',
        yearLevel: '3rd Year',
        units: 3,
        description: 'Test verifying student failed attempt and results view',
        createdBy: facultyUser.id
    });
    db.joinSubjectByCode(studentUser.id, testSub.joinCode);

    const topic1 = db.createTopic({
        subjectId: testSub.id,
        orderIndex: 1,
        title: 'Topic 1 - Prerequisite Gate',
        description: 'Testing failure logic',
        isPublished: 1
    });

    const topic2 = db.createTopic({
        subjectId: testSub.id,
        orderIndex: 2,
        title: 'Topic 2 - Locked Content',
        description: 'Should remain locked when topic 1 fails',
        isPublished: 1
    });

    // 3. Create quiz with 75% passing threshold
    const quiz = db.createQuiz({
        subjectId: testSub.id,
        topicId: topic1.id,
        title: 'Topic 1 Diagnostic Quiz',
        timeLimitMinutes: 10,
        passingScorePercent: 75,
        questions: [
            {
                id: 'q1',
                questionText: 'What does CMS stand for?',
                options: [
                    { id: 'opt_a', text: 'Content Management System' },
                    { id: 'opt_b', text: 'Central Machine Store' }
                ],
                correctAnswer: 'opt_a'
            },
            {
                id: 'q2',
                questionText: 'Which CMS is written in PHP?',
                options: [
                    { id: 'opt_c', text: 'WordPress' },
                    { id: 'opt_d', text: 'Django' }
                ],
                correctAnswer: 'opt_c'
            }
        ]
    });

    // 4. Student submits incorrect answers (0/2 = 0%)
    const submission = db.submitQuizAttempt({
        quizId: quiz.id,
        studentId: studentUser.id,
        answers: {
            q1: 'opt_b', // wrong
            q2: 'opt_d'  // wrong
        },
        timeSpentSeconds: 43
    });

    assert.strictEqual(submission.passed, false, 'Student must fail quiz');
    assert.strictEqual(submission.percentage, 0, 'Percentage must be 0%');
    assert.strictEqual(submission.passingScorePercent, 75, 'Passing mark must be 75%');
    assert.strictEqual(submission.score, 0, 'Score must be 0');
    assert.strictEqual(submission.totalQuestions, 2, 'Total must be 2');

    // Check gatekeeper: next topic MUST remain locked
    const progressResult = db.getStudentTopicProgress(studentUser.id, testSub.id);
    const topic1Progress = progressResult.topics.find(p => p.id === topic1.id);
    const topic2Progress = progressResult.topics.find(p => p.id === topic2.id);

    assert.strictEqual(topic1Progress.isPassed, false, 'Topic 1 must not be passed');
    assert.strictEqual(topic1Progress.status, 'failed_retry', 'Topic 1 status should be failed_retry');
    assert.strictEqual(topic2Progress.isUnlocked, false, 'Topic 2 must NOT be unlocked when topic 1 is failed');
    assert.strictEqual(topic2Progress.status, 'locked', 'Topic 2 status should be locked');

    // Clean up
    db.deleteSubject(testSub.id, facultyUser.id);
    console.log('Passed test for failed quiz attempt and progression gatekeeper!');
}

testFailingQuizAttempt().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
