const fs = require('fs');
const path = require('path');
const db = require('../database.js');

console.log('=== TEST 1: Bundle File Integrity Check ===');
const bundlePath = path.resolve(__dirname, '../public/js/tiptap-bundle.min.js');
if (!fs.existsSync(bundlePath)) {
    throw new Error('tiptap-bundle.min.js not found!');
}
const bundleStat = fs.statSync(bundlePath);
console.log('TipTap bundle exists, size:', bundleStat.size, 'bytes');
if (bundleStat.size < 100000) {
    throw new Error('TipTap bundle appears too small / incomplete');
}

console.log('\n=== TEST 2: Presentation Studio TipTap Backend Flow ===');
const faculty = db.getUserByUsername('prof_santos');
if (!faculty) throw new Error('Faculty prof_santos not found');

// Find or create test subject
const subjectCode = 'TEST-' + Math.floor(100 + Math.random() * 900);
const subject = db.createSubject({
    code: subjectCode,
    name: 'TipTap Course Test',
    term: '1st Semester',
    yearLevel: '3rd Year',
    units: 3,
    description: 'Automated test for TipTap presentations and quizzes',
    createdBy: faculty.id
});

console.log('Subject created:', subject.code, subject.id);

// Create a topic for this subject
const topic = db.createTopic({
    subjectId: subject.id,
    orderIndex: 1,
    title: 'Modern CMS Architecture with TipTap',
    description: 'Rich slide presentation and quiz test',
    isPublished: 1
});

console.log('Topic created:', topic.title, topic.id);

// Simulate saving a 4-slide deck created with TipTap
const testSlides = [
    {
        slideNumber: 1,
        title: 'Modern CMS Architecture',
        subtitle: 'TipTap Studio Presentation',
        layout: 'title',
        theme: 'indigo',
        richContent: '<p>Welcome to <strong>Modern CMS Architecture</strong>.</p><p>Built with <em>TipTap</em> rich-text editor.</p>',
        notes: 'Introduce topic'
    },
    {
        slideNumber: 2,
        title: 'Decoupled Content Delivery',
        subtitle: 'Key Concepts',
        layout: 'two-column',
        theme: 'emerald',
        richContent: '<ul><li><strong>Headless Architecture:</strong> Content APIs via REST/GraphQL</li><li><strong>Multi-Channel Publishing:</strong> Web, Mobile, IoT</li><li><strong>Performance:</strong> Edge CDN caching</li></ul>',
        notes: 'Explain decoupled pipelines'
    },
    {
        slideNumber: 3,
        title: 'Code Pattern: Production Configuration',
        subtitle: 'Implementation',
        layout: 'code',
        theme: 'slate',
        richContent: '<pre class="tiptap-code-block"><code>export const cmsConfig = {\n  platform: "Headless LMS",\n  richEditor: "TipTap",\n  version: 2.0\n};</code></pre>',
        notes: 'Walk through code'
    },
    {
        slideNumber: 4,
        title: 'Summary & Quiz Checklist',
        subtitle: 'Ready for Assessment',
        layout: 'bullets',
        theme: 'amber',
        richContent: '<ul><li>Completed module lessons</li><li>Reviewed code pattern</li><li>Ready for Topic Quiz!</li></ul>',
        notes: 'Direct students to quiz'
    }
];

// Update topic slides
db.updateTopic({
    id: topic.id,
    title: topic.title,
    slidesContent: JSON.stringify(testSlides),
    presentationKey: 'custom'
});

const retrievedTopic = db.getTopicById(topic.id);
console.log('Retrieved topic presentation slide count:', retrievedTopic.presentation ? retrievedTopic.presentation.slideCount : 'none');
if (!retrievedTopic.presentation || retrievedTopic.presentation.slideCount !== 4) {
    throw new Error('Slide count mismatch: expected 4, got ' + (retrievedTopic.presentation ? retrievedTopic.presentation.slideCount : 'null'));
}
if (!retrievedTopic.customSlides || retrievedTopic.customSlides[0].richContent !== testSlides[0].richContent) {
    throw new Error('Slide richContent was not saved accurately');
}
console.log('Presentation slides created & verified successfully!');

console.log('\n=== TEST 3: Quiz Studio TipTap Rich Text Questions Flow ===');
const quizData = {
    subjectId: subject.id,
    topicId: topic.id,
    title: 'Topic 1: CMS Architecture Quiz',
    description: 'Assessment with rich TipTap code snippets and formatted stems',
    passingScorePercent: 75,
    timeLimitMinutes: 10,
    questions: [
        {
            id: 'q_1',
            questionText: '<p>Which architecture decouples the content repository from the presentation layer?</p><pre class="tiptap-code-block"><code>GET /api/content/articles/101 HTTP/1.1</code></pre>',
            options: [
                { id: 'opt_1', text: 'Monolithic CMS' },
                { id: 'opt_2', text: 'Headless / Decoupled CMS' },
                { id: 'opt_3', text: 'Flat-file CMS' },
                { id: 'opt_4', text: 'Static HTML' }
            ],
            correctAnswer: 'opt_2',
            explanation: '<p><strong>Headless CMS</strong> provides a raw content repository accessed via RESTful or GraphQL APIs without an attached frontend theme engine.</p>'
        },
        {
            id: 'q_2',
            questionText: '<p>What is the primary benefit of <code>edge caching</code> in web content management?</p>',
            options: [
                { id: 'opt_1', text: 'Reduces database load and accelerates TTFB' },
                { id: 'opt_2', text: 'Encrypts database passwords' },
                { id: 'opt_3', text: 'Compiles PHP into binary' },
                { id: 'opt_4', text: 'Replaces DNS lookups' }
            ],
            correctAnswer: 'opt_1',
            explanation: '<p>Edge caching stores generated HTML/JSON near the user, preventing unnecessary trips to origin database servers.</p>'
        }
    ]
};

const quiz = db.createQuiz(quizData);
console.log('Quiz created with ID:', quiz.id);

const retrievedQuiz = db.getQuizById(quiz.id);
if (!retrievedQuiz || retrievedQuiz.questions.length !== 2) {
    throw new Error('Failed to retrieve created quiz');
}
if (!retrievedQuiz.questions[0].questionText.includes('tiptap-code-block')) {
    throw new Error('Rich code block was not preserved in quiz question!');
}
console.log('Quiz with TipTap rich questions and rationale verified!');

console.log('\n=== TEST 4: Student Attempt & Progression Gatekeeper Check ===');
const student = db.getUserByUsername('student_juan');
if (!student) throw new Error('Student student_juan not found');

// Enroll student
db.joinSubjectByCode(student.id, subject.joinCode);
console.log('Student enrolled in test course with code:', subject.joinCode);

// Submit student attempt (100% score)
const answers = {};
answers[retrievedQuiz.questions[0].id] = retrievedQuiz.questions[0].correctAnswer;
answers[retrievedQuiz.questions[1].id] = retrievedQuiz.questions[1].correctAnswer;

const submission = db.submitQuizAttempt({
    quizId: quiz.id,
    studentId: student.id,
    answers,
    timeSpentSeconds: 45
});

console.log('Submission passed:', submission.passed, 'Score:', submission.score + '/' + submission.totalQuestions, 'Percentage:', submission.percentage + '%');
if (!submission.passed || submission.percentage !== 100) {
    throw new Error('Expected 100% pass grade');
}

// Check student progress on topic
const progressResult = db.getStudentTopicProgress(student.id, subject.id);
const topicProgress = progressResult.topics.find(p => p.id === topic.id);
console.log('Topic quiz passed status:', topicProgress ? topicProgress.isPassed : false);
if (!topicProgress || !topicProgress.isPassed) {
    throw new Error('Topic progress check failed');
}

// Clean up test subject and associated records
db.deleteSubject(subject.id, faculty.id);
console.log('Cleaned up test subject & records successfully.');

console.log('\nALL TIPTAP & QUIZ TESTS PASSED WITH 100% SUCCESS!');
