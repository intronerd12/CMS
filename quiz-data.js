/**
 * QUIZ-DATA.JS
 * Syllabus data for Topics 1 to 14 with:
 * - Comprehensive outlines and descriptions
 * - Slide content for topics
 * - Complete 10-question multiple-choice quizzes with options and explanations
 */

const SYLLABUS_14_TOPICS = [
    {
        orderIndex: 1,
        key: 'cms',
        title: 'CMS Fundamentals & Architecture',
        description: 'An introduction to Content Management Systems: evolution from early platforms, CMA vs CDA elements, architecture, and lifecycle.',
        outline: [
            'Introduction: How CMS was born',
            'What is a Content Management System (CMS)?',
            'Two Core Elements: Content Management Application (CMA) & Content Delivery Application (CDA)',
            'CMS Architecture & Template Workflows',
            'Life Cycle of CMS (Creation, Management, Publishing, Presentation)'
        ],
        slides: [
            { title: 'CMS Fundamentals & Architecture', subtitle: 'Topic 1 - Evolution & Core Mechanics', bullets: ['Introduction to digital content workflows', 'How web content management evolved from static HTML', 'Bridging non-technical writers and technical systems'], theme: 'indigo' },
            { title: 'The Two Core Elements of CMS', subtitle: 'CMA vs CDA', bullets: ['CMA (Content Management Application): The front-end editor GUI where users create, modify, and remove content without HTML knowledge', 'CDA (Content Delivery Application): The back-end engine that compiles the content and displays it to website visitors', 'Separation of concerns: Content creators focus on messaging; CDA handles layout & rendering'], theme: 'indigo' },
            { title: 'The CMS Content Lifecycle', subtitle: 'From Draft to Archive', bullets: ['Creation: Author drafts content in rich text / WYSIWYG or markdown', 'Management: Content is organized, categorized with taxonomy, and version-controlled', 'Publishing: Workflow approvals and publishing triggers CDA deployment', 'Presentation: Dynamic rendering with caching to end users'], theme: 'indigo' }
        ],
        quiz: {
            title: 'Topic 1 Quiz: CMS Fundamentals',
            passingScorePercent: 75,
            timeLimitMinutes: 10,
            questions: [
                {
                    questionText: 'What does the acronym CMS stand for in web development?',
                    options: ['Content Management System', 'Centralized Media Server', 'Client Markup Structure', 'Cloud Moderation Service'],
                    correctAnswer: 'Content Management System',
                    explanation: 'CMS stands for Content Management System, software that enables users to create, manage, and modify content on a website.'
                },
                {
                    questionText: 'Which CMS element provides the graphical user interface allowing users to create, modify, and remove content without HTML knowledge?',
                    options: ['CMA (Content Management Application)', 'CDA (Content Delivery Application)', 'API Gateway', 'CDN Edge Server'],
                    correctAnswer: 'CMA (Content Management Application)',
                    explanation: 'The CMA (Content Management Application) is the front-end user interface that lets content creators author content without coding.'
                },
                {
                    questionText: 'What is the primary role of the Content Delivery Application (CDA) in a traditional CMS?',
                    options: ['Compiling content and updating the website presentation for visitors', 'Handling user password resets and billing', 'Writing database backup scripts', 'Designing logo graphics'],
                    correctAnswer: 'Compiling content and updating the website presentation for visitors',
                    explanation: 'The CDA takes raw content stored by the CMA, applies templates/themes, and renders HTML for website visitors.'
                },
                {
                    questionText: 'Which of the following is NOT one of the core phases in the CMS lifecycle?',
                    options: ['Content Creation', 'Content Management', 'Hardware Soldering', 'Presentation / Delivery'],
                    correctAnswer: 'Hardware Soldering',
                    explanation: 'Hardware soldering is physical electronics manufacturing, not a phase in the software CMS lifecycle.'
                },
                {
                    questionText: 'Before modern CMS platforms were developed, how were website updates typically performed?',
                    options: ['Manually editing static HTML, CSS, and uploading via FTP', 'Through automated cloud containers', 'Using voice-controlled AI models', 'Via decentralized blockchain ledgers'],
                    correctAnswer: 'Manually editing static HTML, CSS, and uploading via FTP',
                    explanation: 'Early websites required webmasters to manually edit raw static HTML files and upload them to servers using FTP.'
                },
                {
                    questionText: 'What key benefit does a CMS provide to an organization?',
                    options: ['Enables non-technical users to publish content without developer assistance', 'Eliminates the need for web hosting', 'Guarantees 100% immunity from server outages', 'Replaces all operating system software'],
                    correctAnswer: 'Enables non-technical users to publish content without developer assistance',
                    explanation: 'A CMS democratizes web publishing by empowering marketing and editorial teams to update websites directly.'
                },
                {
                    questionText: 'In a dynamic CMS, where is page content typically stored before being requested by a visitor?',
                    options: ['In a relational database (e.g., MySQL or SQLite)', 'On read-only magnetic tape', 'Inside the client browser RAM permanently', 'In compiler bytecode on the GPU'],
                    correctAnswer: 'In a relational database (e.g., MySQL or SQLite)',
                    explanation: 'Dynamic CMS platforms store post text, metadata, and user information in a database, querying it when pages are loaded.'
                },
                {
                    questionText: 'What is "WYSIWYG" an abbreviation for in CMS rich-text editors?',
                    options: ['What You See Is What You Get', 'Where Your System Is Working Your Goal', 'When You Save It Writes Your Guide', 'Web Yields Standard Internet Web Yields Graphs'],
                    correctAnswer: 'What You See Is What You Get',
                    explanation: 'WYSIWYG stands for "What You See Is What You Get", letting authors format text visually as it will appear published.'
                },
                {
                    questionText: 'What role does a "Template" or "Theme" play in a CMS?',
                    options: ['It controls the visual presentation, styling, and layout of content', 'It manages server cooling fans', 'It replaces the database server engine', 'It encrypts local user hard drives'],
                    correctAnswer: 'It controls the visual presentation, styling, and layout of content',
                    explanation: 'Templates separate presentation (HTML/CSS) from content, allowing site-wide design changes without touching article text.'
                },
                {
                    questionText: 'What happens during the "Publishing" stage of the CMS lifecycle?',
                    options: ['Approved content is scheduled or made publicly accessible to visitors', 'The CMS source code is erased', 'All user passwords are regenerated', 'The site domain name is auctioned'],
                    correctAnswer: 'Approved content is scheduled or made publicly accessible to visitors',
                    explanation: 'Publishing makes the authored and approved content live on the production site or schedules it for release.'
                }
            ]
        }
    },
    {
        orderIndex: 2,
        key: 'wordpress',
        title: 'WordPress Core & Architecture',
        description: 'An overview of the world\'s most widely used CMS — architecture, database schema, The Loop, themes, and plugins.',
        outline: [
            'Introduction to WordPress',
            'WordPress Architecture & Database Schema (wp_posts, wp_postmeta)',
            'The WordPress Loop explained',
            'Theme Structure (style.css, index.php, functions.php)',
            'Plugin Extensibility & Best Practices'
        ],
        slides: [
            { title: 'WordPress Core Architecture', subtitle: 'Topic 2 - World\'s Most Popular CMS', bullets: ['Powers over 40% of the world\'s top 10 million websites', 'Started in 2003 as a fork of b2/cafelog', 'Written in PHP with MySQL/MariaDB database backend'], theme: 'blue' },
            { title: 'The WordPress Database & The Loop', subtitle: 'Core Data Engine', bullets: ['wp_posts stores articles, pages, attachments, and custom post types', 'wp_postmeta stores arbitrary key-value pairs (custom fields)', 'The Loop: while(have_posts()) : the_post(); fetches and displays content'], theme: 'blue' }
        ],
        quiz: {
            title: 'Topic 2 Quiz: WordPress Core',
            passingScorePercent: 75,
            timeLimitMinutes: 10,
            questions: [
                {
                    questionText: 'Which programming language is WordPress primarily written in?',
                    options: ['PHP', 'Python', 'C#', 'Ruby'],
                    correctAnswer: 'PHP',
                    explanation: 'WordPress is built primarily with PHP and pairs with MySQL or MariaDB databases.'
                },
                {
                    questionText: 'What is "The Loop" in WordPress theme development?',
                    options: ['PHP code that iterates through posts to display them on the page', 'An infinite memory leak bug in WordPress core', 'The network retry mechanism for failed image uploads', 'A background cron job that cleans spam comments'],
                    correctAnswer: 'PHP code that iterates through posts to display them on the page',
                    explanation: 'The Loop (`while (have_posts()) : the_post();`) is the primary mechanism WordPress uses to process and output each post.'
                },
                {
                    questionText: 'Which WordPress database table stores pages, posts, attachments, and custom post types?',
                    options: ['wp_posts', 'wp_users', 'wp_options', 'wp_comments'],
                    correctAnswer: 'wp_posts',
                    explanation: 'wp_posts is the central table that stores posts, pages, revisions, menu items, and custom post types.'
                },
                {
                    questionText: 'What two files are mandatory for a minimal WordPress theme to be recognized by the CMS?',
                    options: ['index.php and style.css', 'header.php and footer.php', 'functions.php and template.html', 'config.php and app.js'],
                    correctAnswer: 'index.php and style.css',
                    explanation: 'At minimum, a valid WordPress theme requires `style.css` (for theme metadata and styles) and `index.php` (for rendering).'
                },
                {
                    questionText: 'What is the role of `functions.php` in a WordPress theme?',
                    options: ['Defines custom features, enqueues scripts/styles, and registers menus', 'Stores the database password in plaintext', 'Executes client-side CSS media queries', 'Compiles PHP code into native assembly'],
                    correctAnswer: 'Defines custom features, enqueues scripts/styles, and registers menus',
                    explanation: '`functions.php` acts like a theme-specific plugin, enabling theme support, registering widgets, and hooking into core.'
                },
                {
                    questionText: 'Which modern block-based editor was introduced into WordPress core in version 5.0?',
                    options: ['Gutenberg', 'Elementor', 'Visual Composer', 'Divi Builder'],
                    correctAnswer: 'Gutenberg',
                    explanation: 'WordPress 5.0 introduced Gutenberg, a modular block-based content editor replacing the classic TinyMCE editor.'
                },
                {
                    questionText: 'What table in the WordPress database stores site-wide settings such as site URL, active theme, and admin email?',
                    options: ['wp_options', 'wp_settings_master', 'wp_configuration', 'wp_metadata'],
                    correctAnswer: 'wp_options',
                    explanation: '`wp_options` stores global site configuration, plugin options, active theme details, and transients.'
                },
                {
                    questionText: 'What is a Child Theme in WordPress used for?',
                    options: ['To safely customize a parent theme without losing modifications during updates', 'To restrict website access strictly to minor children', 'To build mobile-only AMP pages', 'To lower database server RAM usage'],
                    correctAnswer: 'To safely customize a parent theme without losing modifications during updates',
                    explanation: 'A Child Theme inherits all parent theme styles and functions, ensuring custom edits survive parent theme updates.'
                },
                {
                    questionText: 'What hook type in WordPress allows developers to modify data before it is displayed or saved?',
                    options: ['Filter hook', 'Action hook', 'Trigger switch', 'Event bus'],
                    correctAnswer: 'Filter hook',
                    explanation: 'Filter hooks (`apply_filters()`, `add_filter()`) accept data, modify it, and return the filtered value.'
                },
                {
                    questionText: 'What core WordPress security practice is strongly advised regarding the default admin username?',
                    options: ['Do not use "admin" as the administrator username', 'Share the admin password with all registered subscribers', 'Disable all WordPress updates permanently', 'Leave wp-config.php with world-writable 777 permissions'],
                    correctAnswer: 'Do not use "admin" as the administrator username',
                    explanation: 'Using the default username "admin" makes sites vulnerable to brute-force credential stuffing attacks.'
                }
            ]
        }
    },
    {
        orderIndex: 3,
        key: 'joomla',
        title: 'Joomla Framework & MVC Architecture',
        description: 'Joomla as an open-source CMS: MVC architecture, extensions (components, modules, plugins), and Access Control Lists (ACL).',
        outline: [
            'What is Joomla CMS?',
            'MVC (Model-View-Controller) Architecture in Joomla',
            'Extension Types: Components, Modules, Plugins, and Templates',
            'Joomla Access Control List (ACL) System',
            'Installation, Configuration, and Package Structure'
        ],
        slides: [
            { title: 'Joomla Architecture & MVC', subtitle: 'Topic 3 - Robust Open-Source CMS', bullets: ['Founded in 2005 as a fork of Mambo', 'Strict Model-View-Controller (MVC) architectural separation', 'Built-in multi-lingual capabilities and granular Access Control Lists (ACL)'], theme: 'orange' },
            { title: 'Joomla Extensions Ecosystem', subtitle: 'Components, Modules & Plugins', bullets: ['Components: Large mini-applications handling main body content (e.g. com_content, com_users)', 'Modules: Flexible layout widgets placed around component content (menus, login forms)', 'Plugins: Event-driven handlers modifying output or core behavior'], theme: 'orange' }
        ],
        quiz: {
            title: 'Topic 3 Quiz: Joomla Framework',
            passingScorePercent: 75,
            timeLimitMinutes: 10,
            questions: [
                {
                    questionText: 'In Joomla, which extension type acts as a full mini-application that renders the primary content area?',
                    options: ['Component', 'Module', 'Plugin', 'Template'],
                    correctAnswer: 'Component',
                    explanation: 'Components (e.g., com_content) are the major functional units in Joomla that take center stage in the main content body.'
                },
                {
                    questionText: 'What architectural design pattern does Joomla follow for separating business logic from presentation?',
                    options: ['MVC (Model-View-Controller)', 'Microkernel', 'MVVM (Model-View-ViewModel)', 'P2P Decentralized'],
                    correctAnswer: 'MVC (Model-View-Controller)',
                    explanation: 'Joomla strictly implements the Model-View-Controller (MVC) design pattern across its core components.'
                },
                {
                    questionText: 'What is the function of a "Module" in Joomla?',
                    options: ['A lightweight block/widget positioned around the main body (e.g., search, menu, banners)', 'The core database engine for SQLite', 'The SSL certificate generator', 'The hardware firmware manager'],
                    correctAnswer: 'A lightweight block/widget positioned around the main body (e.g., search, menu, banners)',
                    explanation: 'Modules are auxiliary content boxes rendered in template positions around the main component output.'
                },
                {
                    questionText: 'What does "ACL" stand for in Joomla user permissions management?',
                    options: ['Access Control List', 'Automatic Cache Loader', 'Application Communication Layer', 'Admin Certificate License'],
                    correctAnswer: 'Access Control List',
                    explanation: 'ACL stands for Access Control List, providing granular permissions for who can view, edit, or publish content.'
                },
                {
                    questionText: 'Which extension type in Joomla executes code in response to system triggers and events (e.g., onContentPrepare)?',
                    options: ['Plugin', 'Module', 'Component', 'Theme stylesheet'],
                    correctAnswer: 'Plugin',
                    explanation: 'Plugins are event-driven handlers that hook into core Joomla events to alter data dynamically.'
                },
                {
                    questionText: 'Joomla was originally created in 2005 as an open-source fork of which earlier CMS?',
                    options: ['Mambo', 'Drupal', 'PostNuke', 'Typo3'],
                    correctAnswer: 'Mambo',
                    explanation: 'Joomla was created by core developers who forked the Mambo CMS project in August 2005.'
                },
                {
                    questionText: 'Where are global database connection settings stored in a standard Joomla installation?',
                    options: ['configuration.php', 'settings.xml', 'joomla.ini', 'index.html'],
                    correctAnswer: 'configuration.php',
                    explanation: '`configuration.php` in the root folder contains host, database name, user, password, and site-wide configurations.'
                },
                {
                    questionText: 'What is the purpose of Joomla "Template Positions"?',
                    options: ['Designated placeholders where modules can be assigned and rendered', 'GPS coordinates of the physical web server', 'Database row indexes for cached query tables', 'CSS z-index values for popups'],
                    correctAnswer: 'Designated placeholders where modules can be assigned and rendered',
                    explanation: 'Template positions define named slots (e.g., "top-bar", "sidebar-left", "footer") where modules are displayed.'
                },
                {
                    questionText: 'Which Joomla feature allows native content translation into dozens of languages without external add-ons?',
                    options: ['Built-in Multilingual Content Associations', 'Google Translate iFrame widget', 'Flash language switcher', 'Server OS language patch'],
                    correctAnswer: 'Built-in Multilingual Content Associations',
                    explanation: 'Joomla includes core native multilingual capability, letting administrators assign articles and menus to languages.'
                },
                {
                    questionText: 'In Joomla MVC, what is the role of the "Model"?',
                    options: ['Managing data, business rules, and communicating with the database', 'Rendering final HTML to the browser', 'Handling user mouse clicks and touch events', 'Defining CSS color variables'],
                    correctAnswer: 'Managing data, business rules, and communicating with the database',
                    explanation: 'In MVC, the Model encapsulates data access, business logic, and database state operations.'
                }
            ]
        }
    },
    {
        orderIndex: 4,
        key: 'drupal',
        title: 'Drupal Enterprise CMS & Taxonomy',
        description: 'Drupal architecture: nodes, entity API, content types, blocks, taxonomy vocabularies, views, and enterprise scalability.',
        outline: [
            'What is Drupal and when should it be chosen?',
            'The Concept of "Nodes" and Entities',
            'Content Types & Custom Fields',
            'Taxonomy: Vocabularies and Terms',
            'Drupal Views & Enterprise Comparisons with WordPress'
        ],
        slides: [
            { title: 'Drupal Architecture & Concepts', subtitle: 'Topic 4 - Enterprise Content Platform', bullets: ['Highly extensible platform favored by universities, government, and enterprise', 'Entity API: Content types, users, taxonomy terms are all structured entities', 'Symfony PHP framework components integrated into modern Drupal (8+)'], theme: 'cyan' },
            { title: 'Taxonomy & The Views Engine', subtitle: 'Data Structuring Power', bullets: ['Nodes: Fundamental unit of content with revisions, authors, and publish states', 'Taxonomy: Vocabularies and hierarchical terms for structured categorization', 'Views: Powerful visual query builder creating lists, grids, and feeds without SQL'], theme: 'cyan' }
        ],
        quiz: {
            title: 'Topic 4 Quiz: Drupal Architecture',
            passingScorePercent: 75,
            timeLimitMinutes: 10,
            questions: [
                {
                    questionText: 'In Drupal terminology, what is a "Node"?',
                    options: ['A single piece of authored content (e.g., article, page, product)', 'A physical network router in the server rack', 'A JavaScript runtime process', 'A CSS layout container'],
                    correctAnswer: 'A single piece of authored content (e.g., article, page, product)',
                    explanation: 'A Node is an individual item of content with a unique ID (nid), author, timestamp, and revision history.'
                },
                {
                    questionText: 'What is Drupal "Taxonomy" used for?',
                    options: ['Classifying, categorizing, and tagging content using vocabularies and terms', 'Calculating sales tax on purchases', 'Validating user credit card numbers', 'Minifying JavaScript bundles'],
                    correctAnswer: 'Classifying, categorizing, and tagging content using vocabularies and terms',
                    explanation: 'Taxonomy in Drupal provides a hierarchical vocabulary and term system for organizing content.'
                },
                {
                    questionText: 'What core Drupal module provides a graphical query builder to display custom lists and grids without writing SQL?',
                    options: ['Views', 'Blocks', 'Entities', 'Gutenberg'],
                    correctAnswer: 'Views',
                    explanation: 'The Views module allows site builders to construct custom database queries and output content as lists, tables, or RSS feeds.'
                },
                {
                    questionText: 'Starting with version 8, Drupal incorporated significant architectural components from which PHP framework?',
                    options: ['Symfony', 'Laravel', 'CodeIgniter', 'Yii'],
                    correctAnswer: 'Symfony',
                    explanation: 'Drupal 8+ adopted modern PHP standards by incorporating Symfony components (routing, dependency injection, HTTP kernel).'
                },
                {
                    questionText: 'What command-line tool is widely used by Drupal developers to manage sites, migrations, and cache clearing?',
                    options: ['Drush', 'WP-CLI', 'Artisan', 'Composer-CMS'],
                    correctAnswer: 'Drush',
                    explanation: 'Drush (Drupal Shell) is the official command-line interface and scripting shell for Drupal.'
                },
                {
                    questionText: 'What templating engine is utilized in modern Drupal themes?',
                    options: ['Twig', 'Blade', 'Smarty', 'Mustache'],
                    correctAnswer: 'Twig',
                    explanation: 'Drupal uses Twig as its standard, secure templating engine for formatting HTML templates.'
                },
                {
                    questionText: 'How are extra data attributes added to Content Types in Drupal without modifying database tables directly?',
                    options: ['Using the Field UI to attach fields to entities', 'By manually executing ALTER TABLE in phpMyAdmin', 'By modifying hardcoded core PHP files', 'By uploading CSV files into the web root'],
                    correctAnswer: 'Using the Field UI to attach fields to entities',
                    explanation: 'Drupal\'s Entity and Field system lets administrators attach custom fields (text, image, reference) to any content type.'
                },
                {
                    questionText: 'What feature makes Drupal particularly well-suited for university and governmental organizations?',
                    options: ['Granular role-based access control, revision auditing, and enterprise security', 'It only runs on low-power mobile phones', 'It completely disables all CSS stylesheets', 'It does not require any database'],
                    correctAnswer: 'Granular role-based access control, revision auditing, and enterprise security',
                    explanation: 'Drupal offers strict security standards, detailed audit trails, revisioning, and deep permission hierarchies.'
                },
                {
                    questionText: 'In Drupal, what are "Blocks"?',
                    options: ['Boxes of content rendered in designated regions of a page layout', 'Errors that prevent the server from booting', 'Encrypted hashes stored in blockchain blocks', 'Firewall rules blocking IP addresses'],
                    correctAnswer: 'Boxes of content rendered in designated regions of a page layout',
                    explanation: 'Blocks are discrete units of content or functionality rendered inside theme regions (e.g., sidebar, header, footer).'
                },
                {
                    questionText: 'What file format is used in Drupal 8+ to export and import site configurations between environments?',
                    options: ['YAML (.yml)', 'Binary XML', 'JSON-LD', 'Plain INI'],
                    correctAnswer: 'YAML (.yml)',
                    explanation: 'Drupal\'s Configuration Management system stores configuration files in human-readable YAML format.'
                }
            ]
        }
    },
    {
        orderIndex: 5,
        key: 'wix',
        title: 'Wix & Cloud Website Builders',
        description: 'Template-based web design, online WYSIWYG platforms, visual editors, hosting abstraction, and SaaS CMS trade-offs.',
        outline: [
            'What does "WYSIWYG" mean in practice?',
            'Template-based web design paradigms',
            'SaaS Website Builders vs Self-Hosted CMS platforms',
            'Building responsive pages with the visual editor',
            'Publishing, custom domains, and App Market integrations'
        ],
        slides: [
            { title: 'Wix & Cloud Website Builders', subtitle: 'Topic 5 - SaaS Web Design', bullets: ['Proprietary cloud SaaS (Software as a Service) website builder', 'Drag-and-drop absolute/flex visual canvas with real-time editing', 'All-in-one managed hosting, SSL certificates, and automated updates'], theme: 'blue' },
            { title: 'SaaS vs Self-Hosted CMS Comparison', subtitle: 'Architecture Trade-offs', bullets: ['SaaS Advantages: Zero server maintenance, instant setup, managed security', 'SaaS Limitations: Vendor lock-in, limited code export, recurring subscription costs', 'Self-Hosted Advantages: Full code ownership, database control, limitless extensibility'], theme: 'blue' }
        ],
        quiz: {
            title: 'Topic 5 Quiz: Wix & SaaS Builders',
            passingScorePercent: 75,
            timeLimitMinutes: 10,
            questions: [
                {
                    questionText: 'What delivery model does Wix operate under?',
                    options: ['SaaS (Software as a Service)', 'Self-hosted open source', 'Locally compiled C++ desktop binary', 'Peer-to-peer torrent protocol'],
                    correctAnswer: 'SaaS (Software as a Service)',
                    explanation: 'Wix is a proprietary cloud-based Software as a Service (SaaS) platform where hosting and software are bundled.'
                },
                {
                    questionText: 'What visual editing paradigm is Wix renowned for?',
                    options: ['Drag-and-drop visual WYSIWYG editing', 'Terminal-based Vim editing', 'Strictly writing raw SQL queries', 'Punch card compiling'],
                    correctAnswer: 'Drag-and-drop visual WYSIWYG editing',
                    explanation: 'Wix uses a drag-and-drop visual canvas allowing users to position elements directly where they want them to appear.'
                },
                {
                    questionText: 'What is a major trade-off or limitation of proprietary SaaS website builders compared to self-hosted CMS?',
                    options: ['Vendor lock-in and inability to freely export the raw source code and database', 'They require manual PHP compilation by the user', 'They cannot display any images', 'They do not work over HTTPS'],
                    correctAnswer: 'Vendor lock-in and inability to freely export the raw source code and database',
                    explanation: 'Proprietary SaaS builders generally lock users into their platform; you cannot export the code to host on standard Apache/Nginx servers.'
                },
                {
                    questionText: 'What advanced development platform inside Wix enables custom JavaScript and database collections?',
                    options: ['Velo by Wix (formerly Corvid)', 'Gutenberg', 'NodeBB', 'WebAssembly Core'],
                    correctAnswer: 'Velo by Wix (formerly Corvid)',
                    explanation: 'Velo provides a full-stack JavaScript environment with APIs, custom database collections, and backend web modules in Wix.'
                },
                {
                    questionText: 'Who handles server security patches and infrastructure maintenance on a cloud builder like Wix?',
                    options: ['The SaaS platform provider automatically', 'The end-user student', 'The local ISP technician', 'The web browser developer'],
                    correctAnswer: 'The SaaS platform provider automatically',
                    explanation: 'Managed SaaS builders maintain all underlying server hardware, operating systems, and security patches automatically.'
                },
                {
                    questionText: 'What ecosystem feature allows users to add third-party features like live chat, forms, and bookings to a Wix site?',
                    options: ['Wix App Market', 'WordPress Plugin Repository', 'Docker Hub', 'NPM CLI'],
                    correctAnswer: 'Wix App Market',
                    explanation: 'The Wix App Market provides vetted integrations and widgets that can be installed directly into the visual editor.'
                },
                {
                    questionText: 'What technology ensures a Wix website displays properly across mobile phones, tablets, and desktop computers?',
                    options: ['Responsive Web Design and adaptive mobile breakpoints', 'Printing separate paper flyers', 'Disabling all mobile web browsers', 'Requiring desktop monitors only'],
                    correctAnswer: 'Responsive Web Design and adaptive mobile breakpoints',
                    explanation: 'Responsive and adaptive design principles dynamically adjust layouts, font sizes, and elements for different screen widths.'
                },
                {
                    questionText: 'Which protocol is automatically provisioned by cloud CMS platforms to ensure encrypted browser communication?',
                    options: ['HTTPS / SSL (TLS)', 'Unencrypted FTP', 'Telnet', 'Gopher'],
                    correctAnswer: 'HTTPS / SSL (TLS)',
                    explanation: 'Modern cloud builders automatically provision SSL/TLS certificates for all custom and free domains, delivering HTTPS.'
                },
                {
                    questionText: 'What happens to a free Wix website when a user publishes it without an upgraded plan?',
                    options: ['It displays Wix subdomains and platform brand advertising', 'The website self-destructs after 24 hours', 'The computer keyboard is locked', 'It converts all text to Morse code'],
                    correctAnswer: 'It displays Wix subdomains and platform brand advertising',
                    explanation: 'Free tier sites include platform branding badges and reside on a platform subdomain rather than a custom domain.'
                },
                {
                    questionText: 'For which type of project is a SaaS website builder typically most advantageous?',
                    options: ['Small businesses, portfolios, and rapid marketing landing pages', 'Custom high-frequency trading platforms', 'Operating system kernel development', 'Private internal corporate intranet data warehouses'],
                    correctAnswer: 'Small businesses, portfolios, and rapid marketing landing pages',
                    explanation: 'SaaS builders excel at rapid turnaround, low upfront cost, and zero server management for small business and creative sites.'
                }
            ]
        }
    },
    {
        orderIndex: 6,
        key: 'shopify',
        title: 'Shopify & Hosted E-Commerce',
        description: 'Shopify as a specialized e-commerce CMS: Liquid templating language (objects, tags, filters), checkout flows, and catalog management.',
        outline: [
            'What is Shopify and how does it specialize in e-commerce?',
            'Five core architectural facts about Shopify',
            'The Liquid Templating Engine: Syntax, Objects, Tags & Filters',
            'Catalog Management: Products, Variants, Collections, and Inventory',
            'Advantages, limitations, and App Store integrations'
        ],
        slides: [
            { title: 'Shopify & Hosted E-Commerce', subtitle: 'Topic 6 - Digital Commerce Architecture', bullets: ['World\'s leading hosted e-commerce platform founded in 2006', 'High-availability infrastructure capable of handling massive Black Friday traffic spikes', 'PCI-DSS Level 1 compliant checkout security out of the box'], theme: 'emerald' },
            { title: 'The Liquid Templating Language', subtitle: 'Open-Source Ruby Engine', bullets: ['Liquid: Safe, customer-facing templating engine created by Shopify founder Tobias Lütke', 'Objects {{ product.title }}: Output data to the page', 'Tags {% for product in collection.products %}: Logic, loops, and conditions', 'Filters {{ product.price | money }}: Format and transform outputs'], theme: 'emerald' }
        ],
        quiz: {
            title: 'Topic 6 Quiz: Shopify & E-Commerce',
            passingScorePercent: 75,
            timeLimitMinutes: 10,
            questions: [
                {
                    questionText: 'What templating language did Shopify create to safely render dynamic store data in theme files?',
                    options: ['Liquid', 'Blade', 'Smarty', 'Jinja'],
                    correctAnswer: 'Liquid',
                    explanation: 'Liquid is an open-source templating language created by Shopify, written in Ruby, used to render storefront themes.'
                },
                {
                    questionText: 'In Liquid syntax, which delimiters are used to output variable data (Objects)?',
                    options: ['{{ and }} (Double curly braces)', '{% and %} (Curly percent)', '<% and %> (Angle percent)', '[[ and ]] (Double brackets)'],
                    correctAnswer: '{{ and }} (Double curly braces)',
                    explanation: 'Double curly braces `{{ object.property }}` are used for Liquid Objects that print values onto the webpage.'
                },
                {
                    questionText: 'In Liquid syntax, which delimiters denote control flow and logic (Tags like if, for, assign)?',
                    options: ['{% and %}', '{{ and }}', '<!-- and -->', '(( and ))'],
                    correctAnswer: '{% and %}',
                    explanation: 'Curly percent delimiters `{% tag %}` are used for Liquid Tags that handle programming logic, loops, and assignments.'
                },
                {
                    questionText: 'How is a Liquid Filter applied to transform data (such as formatting currency or uppercase)?',
                    options: ['Using a pipe character: {{ product.price | money }}', 'Using an exclamation point: {{ product.price ! money }}', 'Using a double slash: {{ product.price // money }}', 'Using an arrow: {{ product.price -> money }}'],
                    correctAnswer: 'Using a pipe character: {{ product.price | money }}',
                    explanation: 'Liquid Filters are appended to variables using the pipe character `|` to modify strings, numbers, or dates.'
                },
                {
                    questionText: 'What compliance standard does Shopify maintain natively to guarantee secure payment processing?',
                    options: ['PCI-DSS Level 1 Compliance', 'ISO 9000 Manufacturing', 'HIPAA Privacy only', 'FCC Part 15 Radio'],
                    correctAnswer: 'PCI-DSS Level 1 Compliance',
                    explanation: 'Shopify is certified Level 1 PCI-DSS compliant, adhering to stringent payment card industry data security standards.'
                },
                {
                    questionText: 'In Shopify, what is the relationship between Products and Variants?',
                    options: ['A product can have multiple variants based on size, color, or material attributes', 'Variants are separate websites that sell different brands', 'A variant is an expired product that cannot be purchased', 'Products are only digital; variants are physical'],
                    correctAnswer: 'A product can have multiple variants based on size, color, or material attributes',
                    explanation: 'A product represents the general item (e.g. T-Shirt), while variants represent specific SKUs (e.g. Medium / Blue).'
                },
                {
                    questionText: 'What feature allows merchants to organize related products together for customer browsing in Shopify?',
                    options: ['Collections', 'Taxonomies', 'Catalogs', 'Directories'],
                    correctAnswer: 'Collections',
                    explanation: 'Shopify organizes products into Collections (Manual or Automated based on tags/conditions) for storefront navigation.'
                },
                {
                    questionText: 'Which API format does the Shopify Storefront API support for building custom headless storefronts?',
                    options: ['GraphQL and REST', 'COBOL routines', 'Telnet commands', 'SOAP XML only'],
                    correctAnswer: 'GraphQL and REST',
                    explanation: 'Shopify offers rich GraphQL and REST Storefront and Admin APIs for custom apps and headless implementations.'
                },
                {
                    questionText: 'What is a key financial consideration when choosing Shopify versus a self-hosted e-commerce tool?',
                    options: ['Monthly subscription fees plus transaction percentages on third-party gateways', 'Shopify is completely free for all commercial stores', 'Users must purchase physical server racks', 'Merchants must pay in gold bullion'],
                    correctAnswer: 'Monthly subscription fees plus transaction percentages on third-party gateways',
                    explanation: 'Shopify incurs recurring monthly subscription costs, app fees, and transaction charges unless using Shopify Payments.'
                },
                {
                    questionText: 'What happens when a merchant activates "Inventory Tracking" on a Shopify variant?',
                    options: ['Stock quantities decrement with purchases and sales can pause when stock reaches zero', 'All unsold items are shipped back to the supplier automatically', 'The product price increases by 10% daily', 'The merchant is charged a storage fee per megabyte'],
                    correctAnswer: 'Stock quantities decrement with purchases and sales can pause when stock reaches zero',
                    explanation: 'Inventory tracking automatically decreases available quantity on sales and prevents overselling if configured.'
                }
            ]
        }
    },
    {
        orderIndex: 7,
        key: 'magento',
        title: 'Magento (Adobe Commerce) Platform',
        description: 'Magento architecture: EAV (Entity-Attribute-Value) database model, modules, enterprise scalability, and Magento 2 CLI.',
        outline: [
            'Introduction to Magento (Adobe Commerce)',
            'Architecture overview & The EAV (Entity-Attribute-Value) Data Model',
            'Modules, DI (Dependency Injection), and Layout XML',
            'Magento Connect / Marketplace and Extension Architecture',
            'Performance tuning: Caching, Varnish, Redis, and Elasticsearch'
        ],
        slides: [
            { title: 'Magento Enterprise E-Commerce', subtitle: 'Topic 7 - Adobe Commerce Architecture', bullets: ['Premier enterprise e-commerce platform built for massive product catalogs and multi-store setups', 'Acquired by Adobe in 2018 and rebranded as Adobe Commerce', 'Built on PHP, Composer, and the Zend/Laminas framework with strict OOP standards'], theme: 'orange' },
            { title: 'The EAV Data Model & Caching', subtitle: 'Complex Catalog Scaling', bullets: ['EAV (Entity-Attribute-Value): Allows limitless dynamic attributes per product without altering base tables', 'Entities (Products), Attributes (Color, Weight), Values (Stored across type tables)', 'Heavy reliance on Full Page Cache (FPC), Varnish, and Elasticsearch for performance'], theme: 'orange' }
        ],
        quiz: {
            title: 'Topic 7 Quiz: Magento Platform',
            passingScorePercent: 75,
            timeLimitMinutes: 10,
            questions: [
                {
                    questionText: 'What database design pattern does Magento utilize to allow limitless dynamic product attributes?',
                    options: ['EAV (Entity-Attribute-Value)', 'Star Schema', 'Document Store', 'Flat File CSV'],
                    correctAnswer: 'EAV (Entity-Attribute-Value)',
                    explanation: 'Magento uses the EAV model to store attributes in separate tables (varchar, int, text) linked by entity IDs.'
                },
                {
                    questionText: 'Which major enterprise software corporation acquired Magento in 2018?',
                    options: ['Adobe', 'Oracle', 'Microsoft', 'Salesforce'],
                    correctAnswer: 'Adobe',
                    explanation: 'Adobe acquired Magento in 2018 for $1.68 billion, incorporating it into the Adobe Experience Cloud.'
                },
                {
                    questionText: 'What command-line tool is fundamental to deploying, compiling, and re-indexing Magento 2 installations?',
                    options: ['bin/magento', 'wp-cli', 'drush', 'artisan'],
                    correctAnswer: 'bin/magento',
                    explanation: '`bin/magento` is the central CLI script in Magento 2 used for cache management, static content deployment, and indexing.'
                },
                {
                    questionText: 'What search engine became a mandatory requirement for catalog search starting in Magento 2.4?',
                    options: ['Elasticsearch (or OpenSearch)', 'Apache Lucene desktop', 'Google Search Appliance', 'Bing API'],
                    correctAnswer: 'Elasticsearch (or OpenSearch)',
                    explanation: 'Magento 2.4+ requires Elasticsearch or OpenSearch to perform catalog searches and category filtering.'
                },
                {
                    questionText: 'How are block layouts and template assignments defined in Magento 2 themes?',
                    options: ['XML layout configuration files', 'Python scripts', 'Raw SQL triggers', 'Binary DLL libraries'],
                    correctAnswer: 'XML layout configuration files',
                    explanation: 'Magento 2 heavily relies on layout XML files to position blocks, declare containers, and configure template rendering.'
                },
                {
                    questionText: 'What design pattern does Magento 2 use to pass class dependencies rather than instantiating them directly?',
                    options: ['Dependency Injection (DI)', 'Singleton Anti-pattern', 'Global static pointers', 'Spaghetti inclusion'],
                    correctAnswer: 'Dependency Injection (DI)',
                    explanation: 'Magento 2 utilizes Dependency Injection managed via `di.xml` configuration for loose coupling and testability.'
                },
                {
                    questionText: 'What feature makes Magento a premier choice for global retailers with multiple regional sites?',
                    options: ['Multi-store, multi-currency, and multi-language capabilities from a single backend', 'It runs without any web server', 'It eliminates all shipping fees', 'It prints product catalogs automatically'],
                    correctAnswer: 'Multi-store, multi-currency, and multi-language capabilities from a single backend',
                    explanation: 'A single Magento installation can run dozens of unique storefronts across different domains, currencies, and languages.'
                },
                {
                    questionText: 'Why is Full Page Cache (FPC) with Varnish strongly recommended for Magento stores?',
                    options: ['The EAV model requires numerous database joins that are slow without aggressive caching', 'To prevent images from being visible', 'To bypass all credit card checks', 'To delete customer order history'],
                    correctAnswer: 'The EAV model requires numerous database joins that are slow without aggressive caching',
                    explanation: 'Because EAV joins multiple tables per product, serving cached HTML via Varnish delivers sub-second page response times.'
                },
                {
                    questionText: 'In Magento 2, what folder under `app/code` is used to structure custom extensions?',
                    options: ['Vendor/ModuleName', 'Modules/Code', 'Extensions/Public', 'Plugins/Store'],
                    correctAnswer: 'Vendor/ModuleName',
                    explanation: 'Magento 2 organizes modules under `app/code/[Vendor]/[ModuleName]` with registration.php and etc/module.xml.'
                },
                {
                    questionText: 'What is the purpose of "Re-indexing" in Magento (`bin/magento indexer:reindex`)?',
                    options: ['Transforming complex EAV data into flat index tables for high-speed queries', 'Deleting duplicate customer accounts', 'Recompiling the Linux kernel', 'Downloading new theme graphics'],
                    correctAnswer: 'Transforming complex EAV data into flat index tables for high-speed queries',
                    explanation: 'Indexers flatten complex EAV tables into optimized index tables so queries for price and catalog display run rapidly.'
                }
            ]
        }
    },
    {
        orderIndex: 8,
        key: 'headless-cms',
        title: 'Headless CMS & Decoupled Architecture',
        description: 'Decoupled vs headless architectures, REST & GraphQL content APIs, JAMstack, Strapi, Sanity, and Next.js frontend rendering.',
        outline: [
            'Traditional Monolithic CMS vs Decoupled vs Headless CMS',
            'Content as a Service (CaaS) concept',
            'REST vs GraphQL APIs for content consumption',
            'The JAMstack Paradigm (JavaScript, APIs, Markup)',
            'Survey of Headless Platforms: Strapi, Sanity, Contentful, Ghost'
        ],
        slides: [
            { title: 'Headless CMS Architecture', subtitle: 'Topic 8 - The Decoupled Revolution', bullets: ['Monolithic CMS: Backend and Frontend are tightly coupled in one codebase (e.g. standard WordPress, Drupal)', 'Headless CMS: Backend handles content authoring and database, completely discarding the frontend presentation layer ("the head")', 'Content is served purely as structured data via REST or GraphQL APIs to any client (web, mobile, smart displays)'], theme: 'purple' },
            { title: 'JAMstack & Modern Frontends', subtitle: 'Next.js, static sites, & APIs', bullets: ['JavaScript: Dynamic programming in the browser or on the edge', 'APIs: Reusable server-side operations queried over HTTPS', 'Markup: Pre-rendered HTML templates built at compile time or incrementally generated'], theme: 'purple' }
        ],
        quiz: {
            title: 'Topic 8 Quiz: Headless CMS',
            passingScorePercent: 75,
            timeLimitMinutes: 10,
            questions: [
                {
                    questionText: 'What is the defining characteristic of a "Headless" CMS?',
                    options: ['It manages content in the backend and provides APIs, but has no built-in front-end presentation layer', 'It operates without any database engine', 'It can only be accessed using command-line terminals', 'It does not allow images or videos'],
                    correctAnswer: 'It manages content in the backend and provides APIs, but has no built-in front-end presentation layer',
                    explanation: 'In a headless CMS, the "head" (frontend presentation layer) is decoupled from the content repository and administrative UI.'
                },
                {
                    questionText: 'How do frontend web applications consume content from a headless CMS?',
                    options: ['Via RESTful or GraphQL web APIs', 'Directly executing MySQL queries from the browser client', 'By importing raw C++ header files', 'Via serial port cables'],
                    correctAnswer: 'Via RESTful or GraphQL web APIs',
                    explanation: 'Headless CMSs expose structured JSON endpoints via REST or GraphQL APIs that any frontend client can fetch.'
                },
                {
                    questionText: 'What does the acronym JAMstack stand for?',
                    options: ['JavaScript, APIs, and Markup', 'Java, Apache, and MySQL', 'Joomla, Adobe, and Magento', 'JSON, Asynchronous, and Modern'],
                    correctAnswer: 'JavaScript, APIs, and Markup',
                    explanation: 'JAMstack represents modern web development architecture based on client-side JavaScript, reusable APIs, and pre-built Markup.'
                },
                {
                    questionText: 'Which of the following is a prominent open-source Node.js headless CMS?',
                    options: ['Strapi', 'WordPress Classic', 'Joomla 1.5', 'Magento 1.9'],
                    correctAnswer: 'Strapi',
                    explanation: 'Strapi is a popular open-source, customizable headless CMS built on Node.js that generates REST and GraphQL APIs.'
                },
                {
                    questionText: 'What is a major advantage of a headless CMS when deploying across multiple channels (web, iOS, Android, smartwatch)?',
                    options: ['Single source of truth content delivered universally to any device via APIs', 'Each platform requires its own separate database', 'It forces all devices to run PHP', 'It requires zero internet connectivity'],
                    correctAnswer: 'Single source of truth content delivered universally to any device via APIs',
                    explanation: 'Content creators write once in the headless CMS; developers pull the same JSON data to render natively on any client device.'
                },
                {
                    questionText: 'What benefit does Static Site Generation (SSG) with frameworks like Next.js or Astro provide when paired with a headless CMS?',
                    options: ['Ultra-fast page loads and enhanced security since pre-rendered HTML files are served from CDNs', 'It consumes 100% of the server CPU at all times', 'It eliminates the need for any CSS styling', 'It stores passwords in public GitHub repositories'],
                    correctAnswer: 'Ultra-fast page loads and enhanced security since pre-rendered HTML files are served from CDNs',
                    explanation: 'SSG builds static HTML files at deploy time, allowing pages to be cached on global CDNs for lightning-fast, secure delivery.'
                },
                {
                    questionText: 'Why does a headless CMS architecture significantly improve security over traditional monolithic setups?',
                    options: ['The public cannot directly touch or exploit the administrative backend database server', 'It deletes all user cookies', 'It encrypts the user monitor screen', 'It requires physical smartcards to view pages'],
                    correctAnswer: 'The public cannot directly touch or exploit the administrative backend database server',
                    explanation: 'The frontend is completely isolated from the CMS backend, so SQL injection and admin vulnerabilities cannot be directly attacked from the visitor site.'
                },
                {
                    questionText: 'What query language allows frontend clients to request only the exact fields of content they need from a CMS?',
                    options: ['GraphQL', 'SQL SELECT *', 'RegEx', 'XPath'],
                    correctAnswer: 'GraphQL',
                    explanation: 'GraphQL enables clients to specify exact fields, preventing over-fetching and under-fetching of content data.'
                },
                {
                    questionText: 'What term describes traditional CMSs like WordPress or Drupal when configured to expose API endpoints while still retaining their legacy theme engine?',
                    options: ['Decoupled or Hybrid CMS', 'Pure Headless CMS', 'Flat-file CMS', 'Static HTML site'],
                    correctAnswer: 'Decoupled or Hybrid CMS',
                    explanation: 'A Decoupled or Hybrid CMS provides both traditional theme templates and REST/GraphQL APIs for headless consumption.'
                },
                {
                    questionText: 'What is a "Webhook" commonly used for in a headless CMS workflow?',
                    options: ['Notifying the static site generator to rebuild the website whenever content is created, updated, or published', 'A physical fishing hook used in data centers', 'A browser error indicating an invalid URL', 'An antivirus quarantine mechanism'],
                    correctAnswer: 'Notifying the static site generator to rebuild the website whenever content is created, updated, or published',
                    explanation: 'A webhook sends an HTTP POST request to deployment platforms (e.g., Vercel, Netlify) to trigger an automated rebuild when content changes.'
                }
            ]
        }
    },
    {
        orderIndex: 9,
        key: 'cms-security',
        title: 'CMS Security, Vulnerabilities & Hardening',
        description: 'Common CMS attack vectors: SQL injection, XSS, CSRF, brute-force; password security, file upload hardening, updates, and WAF.',
        outline: [
            'The Threat Landscape: Why CMS platforms are frequent targets',
            'OWASP Top 10 in CMS: SQL Injection, XSS, and CSRF',
            'Securing the Administrative Entry Points & Brute-force mitigation',
            'Secure File Upload validation and directory permissions',
            'Hardening best practices: Updates, WAF (Web Application Firewalls), and 2FA'
        ],
        slides: [
            { title: 'CMS Security & Threat Landscape', subtitle: 'Topic 9 - Defending Web Platforms', bullets: ['Because popular CMSs power millions of sites, automated bots scan continuously for known vulnerabilities', 'Outdated plugins and extensions account for over 90% of all CMS compromises', 'Defense in depth: Layering application security, database protections, and server hardening'], theme: 'rose' },
            { title: 'The Triad of Common CMS Attacks', subtitle: 'SQLi, XSS, and CSRF', bullets: ['SQL Injection (SQLi): Malicious SQL injected into inputs; mitigated with Prepared Statements', 'Cross-Site Scripting (XSS): Malicious scripts injected into pages; mitigated with input sanitization and output escaping', 'Cross-Site Request Forgery (CSRF): Trick authenticated users; mitigated with anti-CSRF tokens'], theme: 'rose' }
        ],
        quiz: {
            title: 'Topic 9 Quiz: CMS Security',
            passingScorePercent: 75,
            timeLimitMinutes: 10,
            questions: [
                {
                    questionText: 'What is the most common root cause of security compromises in CMS platforms like WordPress and Joomla?',
                    options: ['Vulnerable, outdated, or abandoned third-party plugins and themes', 'Core PHP language bugs from 1995', 'Visitors typing in capital letters', 'High network bandwidth'],
                    correctAnswer: 'Vulnerable, outdated, or abandoned third-party plugins and themes',
                    explanation: 'Third-party plugins and themes represent the vast majority of security holes due to poor coding standards or lack of maintenance.'
                },
                {
                    questionText: 'What software development practice completely prevents SQL Injection vulnerabilities in CMS queries?',
                    options: ['Prepared Statements and parameterized queries', 'Using GET requests instead of POST', 'Hiding the database password in CSS', 'Renaming the database table'],
                    correctAnswer: 'Prepared Statements and parameterized queries',
                    explanation: 'Parameterized prepared statements treat user input strictly as data parameters, never executing it as SQL code.'
                },
                {
                    questionText: 'What vulnerability occurs when unsanitized user input is echoed directly into HTML output, allowing arbitrary script execution?',
                    options: ['Cross-Site Scripting (XSS)', 'Denial of Service (DoS)', 'Buffer Overflow', 'Packet Sniffing'],
                    correctAnswer: 'Cross-Site Scripting (XSS)',
                    explanation: 'XSS allows attackers to inject malicious JavaScript into web pages viewed by other users or administrators.'
                },
                {
                    questionText: 'What defense mechanism protects CMS forms against Cross-Site Request Forgery (CSRF)?',
                    options: ['Unique, unpredictable cryptographic Anti-CSRF tokens verified on submission', 'A CAPTCHA on every single link click', 'Disabling all cookies completely', 'Running the site on HTTP instead of HTTPS'],
                    correctAnswer: 'Unique, unpredictable cryptographic Anti-CSRF tokens verified on submission',
                    explanation: 'Anti-CSRF tokens ensure that form submissions originate intentionally from the user\'s active session on the genuine site.'
                },
                {
                    questionText: 'What file permissions setting should NEVER be applied to public uploads folders on web servers?',
                    options: ['777 (World-writable and executable)', '644 (Owner read/write, others read)', '755 (Owner all, others read/execute)', '600 (Owner read/write only)'],
                    correctAnswer: '777 (World-writable and executable)',
                    explanation: 'Permission 777 allows any user to write and execute files, opening the door for uploaded web shell backdoors.'
                },
                {
                    questionText: 'How should CMS administrators protect file upload forms from malicious PHP backdoors?',
                    options: ['Validate MIME types and extensions against strict whitelists and disable PHP execution in uploads folders', 'Rename all files to index.html', 'Trust user filenames without inspection', 'Permit all .php, .phtml, and .phar uploads'],
                    correctAnswer: 'Validate MIME types and extensions against strict whitelists and disable PHP execution in uploads folders',
                    explanation: 'Strict extension whitelisting and disabling PHP execution via .htaccess/Nginx ensures uploaded files cannot be executed.'
                },
                {
                    questionText: 'What authentication feature significantly mitigates unauthorized access even if an admin password is leaked?',
                    options: ['Two-Factor Authentication (2FA / MFA)', 'Password hints visible to the public', 'Saving passwords in browser bookmarks', 'Using the username "admin"'],
                    correctAnswer: 'Two-Factor Authentication (2FA / MFA)',
                    explanation: '2FA requires a physical device or one-time code in addition to the password, blocking brute-force attacks.'
                },
                {
                    questionText: 'What is the function of a Web Application Firewall (WAF) such as Cloudflare or ModSecurity in front of a CMS?',
                    options: ['Filtering and blocking malicious HTTP requests (SQLi, bad bots, XSS) before reaching the server', 'Speeding up the computer monitor refresh rate', 'Printing paper receipts for server uptime', 'Overclocking the server CPU'],
                    correctAnswer: 'Filtering and blocking malicious HTTP requests (SQLi, bad bots, XSS) before reaching the server',
                    explanation: 'A WAF inspects inbound web traffic and drops exploit attempts before they can hit the application server.'
                },
                {
                    questionText: 'What algorithm is widely considered secure for hashing passwords in modern CMS databases?',
                    options: ['bcrypt or Argon2', 'MD5 without salt', 'Plain text base64', 'SHA-1 without rounds'],
                    correctAnswer: 'bcrypt or Argon2',
                    explanation: 'bcrypt and Argon2 are computationally expensive, salted hashing algorithms designed to resist GPU brute-force attacks.'
                },
                {
                    questionText: 'What principle dictates that CMS users should only have the minimum permissions necessary to perform their job?',
                    options: ['Principle of Least Privilege', 'Open Door Policy', 'Root Access for All', 'Maximum Redundancy Rule'],
                    correctAnswer: 'Principle of Least Privilege',
                    explanation: 'The Principle of Least Privilege prevents accidental damage and limits breach impact by giving users only necessary rights.'
                }
            ]
        }
    },
    {
        orderIndex: 10,
        key: 'theme-development',
        title: 'CMS Theme & Template Development',
        description: 'Building modern themes: template hierarchies, component design, responsive styling, template engines (Twig, Liquid), and asset pipelines.',
        outline: [
            'Theme architecture: Separating presentation from data',
            'Understanding Template Hierarchies (fallback resolution)',
            'Templating engines in action: Twig, Liquid, and Blade',
            'Responsive design systems, CSS variables, and modern frameworks',
            'Asset bundling: Compiling CSS, JavaScript, and SVGs with Vite/Webpack'
        ],
        slides: [
            { title: 'Theme & Template Architecture', subtitle: 'Topic 10 - Engineering Presentation', bullets: ['Themes dictate visual identity, layout hierarchy, and user experience', 'Template Hierarchy: The algorithmic order of template file lookups (e.g. single-product.php -> single.php -> index.php)', 'Encapsulation: Keeping business logic in modules/plugins and presentation logic in themes'], theme: 'indigo' },
            { title: 'Template Engines & Asset Pipelines', subtitle: 'Twig, Liquid & Modern CSS', bullets: ['Template engines provide clean, expressive syntax without raw PHP spaghetti', 'CSS Custom Properties (Variables): Facilitate dynamic theme toggles and dark modes', 'Modern bundling: Vite and PostCSS minimize payload sizes for mobile performance'], theme: 'indigo' }
        ],
        quiz: {
            title: 'Topic 10 Quiz: Theme Development',
            passingScorePercent: 75,
            timeLimitMinutes: 10,
            questions: [
                {
                    questionText: 'What is a "Template Hierarchy" in CMS theme development?',
                    options: ['A predefined priority system the CMS follows to decide which template file renders a given request', 'The corporate org chart of design team members', 'A list of font sizes used in headings', 'The hierarchy of CSS z-indexes'],
                    correctAnswer: 'A predefined priority system the CMS follows to decide which template file renders a given request',
                    explanation: 'The template hierarchy defines the fallback sequence (e.g. category-slug.php -> category.php -> archive.php -> index.php).'
                },
                {
                    questionText: 'Why is it considered bad practice to write direct database queries inside theme template files?',
                    options: ['It violates separation of concerns and breaks caching/maintenance between presentation and logic', 'Themes are not allowed to contain any text', 'Browsers cannot parse CSS if database queries exist', 'It makes the monitor flicker'],
                    correctAnswer: 'It violates separation of concerns and breaks caching/maintenance between presentation and logic',
                    explanation: 'Themes should only handle presentation; business logic and database queries belong in controllers, plugins, or models.'
                },
                {
                    questionText: 'Which modern CSS feature allows easy implementation of light/dark mode themes with dynamic color tokens?',
                    options: ['CSS Custom Properties (Variables: var(--color-bg))', 'HTML <font> tags', 'Inline style attributes on every div', 'Photoshop export scripts'],
                    correctAnswer: 'CSS Custom Properties (Variables: var(--color-bg))',
                    explanation: 'CSS Custom Properties let developers define tokens at the root level and reassign them based on user or system preferences.'
                },
                {
                    questionText: 'What is the purpose of an asset bundler like Vite or Webpack in modern theme development?',
                    options: ['Compiling, minifying, and bundling CSS, JavaScript, and images for fast delivery', 'Writing blog articles automatically', 'Formatting the server hard drive', 'Generating fake visitor traffic'],
                    correctAnswer: 'Compiling, minifying, and bundling CSS, JavaScript, and images for fast delivery',
                    explanation: 'Asset bundlers compress code, eliminate dead scripts, compile SASS/TypeScript, and optimize loading performance.'
                },
                {
                    questionText: 'In Drupal and Symfony, what template engine uses `{{ variable }}` and `{% if %}` syntax to prevent raw PHP execution?',
                    options: ['Twig', 'React Native', 'Assembler', 'Django-Python only'],
                    correctAnswer: 'Twig',
                    explanation: 'Twig is a flexible, fast, and secure template engine for PHP, standard in modern Drupal and Symfony.'
                },
                {
                    questionText: 'What meta tag is critical in a CMS theme `<head>` to ensure mobile devices render responsive layouts correctly?',
                    options: ['<meta name="viewport" content="width=device-width, initial-scale=1.0">', '<meta name="device" content="all-smartphones">', '<meta name="screen" content="mobile">', '<meta name="zoom" content="allowed">'],
                    correctAnswer: '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
                    explanation: 'The viewport meta tag instructs mobile browsers to render the page at the device\'s actual screen width.'
                },
                {
                    questionText: 'What is "CSS Minification"?',
                    options: ['Removing whitespace, comments, and redundant code to reduce stylesheet file size', 'Shrinking font sizes to microscopic levels', 'Converting CSS code into binary images', 'Deleting all background colors'],
                    correctAnswer: 'Removing whitespace, comments, and redundant code to reduce stylesheet file size',
                    explanation: 'Minification reduces file byte sizes for faster network transmission without changing browser rendering.'
                },
                {
                    questionText: 'In theme development, what are "Partials" or "Template Parts"?',
                    options: ['Reusable template snippets (e.g., header, footer, card) included across multiple pages', 'Broken themes that failed quality assurance', 'Half-finished CSS styles', 'Corrupted database records'],
                    correctAnswer: 'Reusable template snippets (e.g., header, footer, card) included across multiple pages',
                    explanation: 'Partials keep code DRY (Don\'t Repeat Yourself) by breaking pages into reusable chunks like `header.php` and `card.php`.'
                },
                {
                    questionText: 'What accessibility (a11y) standard should CMS theme developers follow to ensure websites are usable for disabled individuals?',
                    options: ['WCAG (Web Content Accessibility Guidelines)', 'IEEE 802.11 Wi-Fi standard', 'ISO 9001 Business quality', 'TCP/IP Protocol'],
                    correctAnswer: 'WCAG (Web Content Accessibility Guidelines)',
                    explanation: 'WCAG outlines rules for color contrast, screen reader semantics, keyboard navigation, and aria labels.'
                },
                {
                    questionText: 'What is the purpose of theme "Starter Kits" or "Blank Themes" (such as Underscores `_s`)?',
                    options: ['Providing a clean, unstyled semantic foundation to build a bespoke theme rapidly without bloat', 'A toy demo for children', 'A virus scanning test theme', 'A script that disables JavaScript'],
                    correctAnswer: 'Providing a clean, unstyled semantic foundation to build a bespoke theme rapidly without bloat',
                    explanation: 'Starter themes provide the core template files, hooks, and clean HTML5 semantics ready for custom styling.'
                }
            ]
        }
    },
    {
        orderIndex: 11,
        key: 'plugin-development',
        title: 'CMS Plugin & Extension Development',
        description: 'Extending CMS functionality: hook architectures, action/filter lifecycle hooks, custom post types, REST endpoints, and security.',
        outline: [
            'The Hook Architecture: Actions and Filters',
            'Plugin lifecycle: Activation, Deactivation, and Uninstall hooks',
            'Registering Custom Post Types and Custom Fields',
            'Creating custom REST API endpoints in a CMS',
            'Plugin security, sanitization, validation, and database best practices'
        ],
        slides: [
            { title: 'Plugin & Extension Engineering', subtitle: 'Topic 11 - Extending Core Features', bullets: ['Plugins add custom features without touching core CMS files (avoiding update overwrites)', 'Event-Driven Hook Architecture: Allows plugins to listen to core events and inject logic', 'Separation of concerns: Themes provide presentation; plugins provide functionality'], theme: 'blue' },
            { title: 'The Hook Lifecycle & REST Endpoints', subtitle: 'Actions, Filters & APIs', bullets: ['Action Hooks: Execute code at specific execution points (e.g. user_register, wp_head)', 'Filter Hooks: Receive data, modify it, and return it (e.g. the_content, comment_text)', 'Custom REST Endpoints: Expose plugin functionality safely over HTTP with authentication'], theme: 'blue' }
        ],
        quiz: {
            title: 'Topic 11 Quiz: Plugin Development',
            passingScorePercent: 75,
            timeLimitMinutes: 10,
            questions: [
                {
                    questionText: 'Why should custom features be developed as plugins rather than modifying CMS core files directly?',
                    options: ['Core modifications are erased and overwritten whenever the CMS updates', 'CMS core files are read-only physical hardware chips', 'Plugins make the site load 1000x slower', 'Core files cannot be opened in text editors'],
                    correctAnswer: 'Core modifications are erased and overwritten whenever the CMS updates',
                    explanation: 'Modifying core files breaks maintainability; core upgrades will overwrite changes, causing bugs or data loss.'
                },
                {
                    questionText: 'In event-driven CMS architectures, what is the key difference between an "Action" and a "Filter"?',
                    options: ['Actions execute tasks at specific lifecycle points; Filters modify and return data', 'Actions are only for CSS; Filters are for images', 'Filters delete user accounts; Actions create them', 'There is no difference'],
                    correctAnswer: 'Actions execute tasks at specific lifecycle points; Filters modify and return data',
                    explanation: 'Actions trigger code execution; Filters intercept variable data, alter it, and must return the modified value.'
                },
                {
                    questionText: 'What should occur during a plugin\'s "Uninstall" lifecycle event (`register_uninstall_hook`)?',
                    options: ['Permanently removing custom tables and options created by the plugin to keep the database clean', 'Downloading 10GB of random files', 'Deleting the entire operating system', 'Locking the administrator out of the server'],
                    correctAnswer: 'Permanently removing custom tables and options created by the plugin to keep the database clean',
                    explanation: 'Properly engineered plugins clean up their database tables and options on uninstall so no orphaned data remains.'
                },
                {
                    questionText: 'What is a "Custom Post Type" (CPT) used for in WordPress or similar CMSs?',
                    options: ['Creating new content entities like "Books", "Portfolios", or "Events" alongside standard Posts', 'Changing the font of blog titles', 'Compressing video files', 'Sending email newsletters directly from RAM'],
                    correctAnswer: 'Creating new content entities like "Books", "Portfolios", or "Events" alongside standard Posts',
                    explanation: 'Custom Post Types allow developers to model distinct data structures beyond regular posts and pages.'
                },
                {
                    questionText: 'What security practice must every plugin adhere to regarding all incoming request data?',
                    options: ['Sanitize and validate all incoming inputs; escape all outgoing outputs', 'Trust all client parameters without verification', 'Store raw unescaped input directly into database queries', 'Bypass all authentication checks'],
                    correctAnswer: 'Sanitize and validate all incoming inputs; escape all outgoing outputs',
                    explanation: 'Input sanitization cleans dangerous characters, validation checks format, and output escaping prevents XSS.'
                },
                {
                    questionText: 'What mechanism in WordPress protects administrative AJAX and form endpoints from unauthorized submissions?',
                    options: ['Nonces (Numbers used once / cryptographic tokens)', 'Random sleep timers', 'Static HTML tags', 'Browser cookies without HTTPS'],
                    correctAnswer: 'Nonces (Numbers used once / cryptographic tokens)',
                    explanation: 'Nonces (`wp_create_nonce()`, `check_admin_referer()`) verify request intent and origin.'
                },
                {
                    questionText: 'What should a plugin developer use when storing small key-value settings in the database?',
                    options: ['The CMS Options API (e.g., get_option, update_option)', 'Creating a new SQLite file for every setting', 'Hardcoding the settings into system RAM', 'Writing values into paper logbooks'],
                    correctAnswer: 'The CMS Options API (e.g., get_option, update_option)',
                    explanation: 'The Options API manages global configuration key-value pairs stored in the database cleanly with caching.'
                },
                {
                    questionText: 'When creating a custom REST API endpoint in a CMS, what must always be verified before modifying data?',
                    options: ['User permission callbacks (capabilities) and authentication', 'The weather outside the datacenter', 'The client monitor resolution', 'The visitor\'s email inbox size'],
                    correctAnswer: 'User permission callbacks (capabilities) and authentication',
                    explanation: 'REST endpoints must define a `permission_callback` to verify that the requesting user has the capability to perform the action.'
                },
                {
                    questionText: 'What tool is standard in PHP for managing third-party library dependencies in modern CMS plugin development?',
                    options: ['Composer', 'NPM for Java', 'Pip for Python', 'Ruby Gems'],
                    correctAnswer: 'Composer',
                    explanation: 'Composer is the standard dependency manager for PHP, handling external package inclusion and autoloading.'
                },
                {
                    questionText: 'What is "Prefixing" in plugin functions and class names used to prevent?',
                    options: ['Namespace and function naming collisions with core or other plugins', 'File size limits in the operating system', 'CSS border shadows', 'Database table fragmentation'],
                    correctAnswer: 'Namespace and function naming collisions with core or other plugins',
                    explanation: 'PHP does not permit duplicate function names in global scope; prefixing (or PHP namespaces) prevents fatal collision errors.'
                }
            ]
        }
    },
    {
        orderIndex: 12,
        key: 'content-architecture',
        title: 'Content Architecture, Taxonomy & SEO',
        description: 'Structuring digital content: metadata schemas, canonicalization, XML sitemaps, OpenGraph, search indexing, and taxonomy modeling.',
        outline: [
            'Information Architecture (IA) and Taxonomy Modeling',
            'Hierarchical vs Faceted Categorization',
            'Search Engine Optimization (SEO) fundamentals in CMS',
            'Structured Data: Schema.org, JSON-LD, and Rich Snippets',
            'Technical SEO: Canonical URLs, XML Sitemaps, and robots.txt'
        ],
        slides: [
            { title: 'Content Architecture & SEO Strategy', subtitle: 'Topic 12 - Structuring for Humans & Bots', bullets: ['Information Architecture: Structuring and organizing content to maximize findability and user engagement', 'Taxonomy: Grouping content into logical Categories (broad, hierarchical) and Tags (narrow, non-hierarchical)', 'Search engines favor cleanly structured websites with clear hierarchy and fast access'], theme: 'emerald' },
            { title: 'Technical SEO & Structured Data', subtitle: 'Canonicalization, Sitemaps & Schema', bullets: ['Canonical URLs (`rel="canonical"`): Eliminate duplicate content penalties across parameterized URLs', 'XML Sitemaps: Programmatic roadmap of public pages submitted to Google Search Console', 'Schema.org JSON-LD: Structured microdata unlocking Rich Snippets (stars, prices, breadcrumbs) in search results'], theme: 'emerald' }
        ],
        quiz: {
            title: 'Topic 12 Quiz: Content Architecture & SEO',
            passingScorePercent: 75,
            timeLimitMinutes: 10,
            questions: [
                {
                    questionText: 'What is the primary role of a "Canonical URL" tag (`<link rel="canonical">`) in a CMS?',
                    options: ['Telling search engines the preferred master URL to prevent duplicate content penalties', 'Encrypting HTML text for search engines', 'Redirecting desktop visitors to mobile apps', 'Speeding up the internet modem speed'],
                    correctAnswer: 'Telling search engines the preferred master URL to prevent duplicate content penalties',
                    explanation: 'Canonical tags specify the authoritative master URL when identical content is accessible via multiple links or query parameters.'
                },
                {
                    questionText: 'In digital taxonomy, how do "Categories" typically differ from "Tags"?',
                    options: ['Categories are hierarchical and broad; Tags are non-hierarchical and specific', 'Categories can only have numbers; Tags only have letters', 'Tags are hidden from search engines; Categories are public', 'Categories are only for images; Tags are for text'],
                    correctAnswer: 'Categories are hierarchical and broad; Tags are non-hierarchical and specific',
                    explanation: 'Categories form a broad hierarchical tree (Parent/Child), while tags describe specific topics across categories.'
                },
                {
                    questionText: 'What is the purpose of an XML Sitemap (`sitemap.xml`) generated by a CMS?',
                    options: ['Providing search engine crawlers with a structured index of all public URLs on the site', 'Providing graphical roadmaps for human tourists', 'Storing database backup records', 'Defining CSS color styles for mobile browsers'],
                    correctAnswer: 'Providing search engine crawlers with a structured index of all public URLs on the site',
                    explanation: 'An XML sitemap lists URLs with metadata (last updated, change frequency) so search crawlers can index the site efficiently.'
                },
                {
                    questionText: 'What structured data format is officially recommended by Google for implementing Schema.org markup?',
                    options: ['JSON-LD', 'Binary CSV', 'Micro-YAML', 'Plain INI'],
                    correctAnswer: 'JSON-LD',
                    explanation: 'JSON-LD (JavaScript Object Notation for Linked Data) embedded in a `<script>` tag is Google\'s preferred format.'
                },
                {
                    questionText: 'What meta tags are required for social networks like Facebook, LinkedIn, and Discord to generate rich link previews?',
                    options: ['OpenGraph meta tags (og:title, og:image, og:description)', 'Flash activeX plugins', 'Robots exclusion headers', 'C++ compiler flags'],
                    correctAnswer: 'OpenGraph meta tags (og:title, og:image, og:description)',
                    explanation: 'The Open Graph protocol defines standard meta tags so platforms can display rich preview cards with title, description, and image.'
                },
                {
                    questionText: 'What file in the web root provides instructions to automated web crawlers regarding which directories to avoid indexing?',
                    options: ['robots.txt', 'humans.txt', 'crawler.dll', 'firewall.conf'],
                    correctAnswer: 'robots.txt',
                    explanation: '`robots.txt` instructs search bots which paths (e.g., `/admin/`, `/wp-admin/`, `/cart/`) they are disallowed from crawling.'
                },
                {
                    questionText: 'What is a "Slug" in CMS URL architecture?',
                    options: ['The human-readable, URL-friendly version of a post title (e.g., /cms-fundamentals)', 'A slow database query that causes timeouts', 'A computer virus that corrupts hard drives', 'A temporary cache file on disk'],
                    correctAnswer: 'The human-readable, URL-friendly version of a post title (e.g., /cms-fundamentals)',
                    explanation: 'A slug is the URL-encoded string derived from the title, using lowercase words separated by hyphens.'
                },
                {
                    questionText: 'Why is descriptive, semantic Heading hierarchy (h1, h2, h3) important for both users and search engines?',
                    options: ['It establishes a clear content outline and contextual hierarchy for screen readers and search algorithms', 'It decreases web hosting server bills', 'It is required to connect to Wi-Fi networks', 'It prevents users from taking screenshots'],
                    correctAnswer: 'It establishes a clear content outline and contextual hierarchy for screen readers and search algorithms',
                    explanation: 'Proper headings structure the document logically, clarifying main topics (h1) and supporting sub-topics (h2, h3).'
                },
                {
                    questionText: 'What image attribute must be included in CMS image uploads to support visually impaired users and image SEO?',
                    options: ['`alt` (Alternative Text)', '`src-encrypt`', '`dpi`', '`camera-model`'],
                    correctAnswer: '`alt` (Alternative Text)',
                    explanation: 'The `alt` attribute provides descriptive text for screen readers when images fail to load and helps search engines understand image content.'
                },
                {
                    questionText: 'What HTTP status code should be returned when a CMS page has permanently moved to a new URL to preserve SEO equity?',
                    options: ['301 Moved Permanently', '404 Not Found', '500 Server Error', '200 OK'],
                    correctAnswer: '301 Moved Permanently',
                    explanation: 'A 301 redirect passes search engine ranking signals (link equity) from the old URL to the new destination.'
                }
            ]
        }
    },
    {
        orderIndex: 13,
        key: 'database-performance',
        title: 'Database Management & Performance Caching',
        description: 'Optimizing CMS scale: query profiling, table indexes, object caching (Redis, Memcached), HTTP caching, Varnish, and CDNs.',
        outline: [
            'Database bottlenecks in dynamic CMS applications',
            'Indexing strategies for high-frequency queries',
            'Object Caching: In-memory key-value stores (Redis & Memcached)',
            'Page Caching & HTTP reverse proxies (Varnish, Nginx FastCGI)',
            'Content Delivery Networks (CDNs) for edge distribution'
        ],
        slides: [
            { title: 'CMS Database & Caching Optimization', subtitle: 'Topic 13 - Scaling Under Load', bullets: ['The Golden Rule of Performance: The fastest database query is the one you never make', 'Dynamic CMS pages generate dozens of SQL queries per request; caching eliminates redundant database hits', 'The Performance Hierarchy: Browser Cache -> CDN Edge -> Reverse Proxy -> Object Cache -> Database'], theme: 'orange' },
            { title: 'In-Memory Object Caching & CDNs', subtitle: 'Redis, Memcached & Edge Networks', bullets: ['Object Caching (Redis/Memcached): Stores database query results in RAM for microsecond retrieval', 'Full Page Caching: Saves complete rendered HTML so static pages bypass PHP and MySQL entirely', 'CDNs (Cloudflare, Fastly): Distribute assets globally so visitors download from the nearest edge datacenter'], theme: 'orange' }
        ],
        quiz: {
            title: 'Topic 13 Quiz: Database & Caching',
            passingScorePercent: 75,
            timeLimitMinutes: 10,
            questions: [
                {
                    questionText: 'What in-memory data store is widely used as an object cache to store CMS query results in RAM?',
                    options: ['Redis (or Memcached)', 'MS Paint', 'Git Version Control', 'Flash Player'],
                    correctAnswer: 'Redis (or Memcached)',
                    explanation: 'Redis and Memcached store structured objects in high-speed RAM, avoiding costly disk reads and database queries.'
                },
                {
                    questionText: 'What database structure drastically speeds up WHERE clause lookups on columns like `slug`, `email`, or `status`?',
                    options: ['Database Indexes', 'Foreign key cascades', 'Auto-increment resets', 'Full table scans'],
                    correctAnswer: 'Database Indexes',
                    explanation: 'Indexes create balanced-tree search structures allowing the database to locate rows in logarithmic time without full table scans.'
                },
                {
                    questionText: 'What is a "Full Page Cache" (FPC) in a CMS?',
                    options: ['Saving the fully rendered HTML of a page to serve subsequent visitors without executing PHP or database queries', 'Printing the web page onto physical paper', 'Saving a JPEG screenshot to the user desktop', 'Clearing the browser history on reload'],
                    correctAnswer: 'Saving the fully rendered HTML of a page to serve subsequent visitors without executing PHP or database queries',
                    explanation: 'Full page caching delivers pre-rendered HTML immediately, dropping server response times from hundreds of milliseconds to under 10ms.'
                },
                {
                    questionText: 'What is the role of a Content Delivery Network (CDN) like Cloudflare or Akamai?',
                    options: ['Distributing cached static assets (images, CSS, JS, HTML) across global edge servers closest to visitors', 'Writing blog articles for the marketing team', 'Providing physical electricity to user homes', 'Upgrading the user broadband subscription'],
                    correctAnswer: 'Distributing cached static assets (images, CSS, JS, HTML) across global edge servers closest to visitors',
                    explanation: 'CDNs cache content globally so users in Tokyo, London, and New York download assets from local edge points of presence.'
                },
                {
                    questionText: 'What HTTP cache-control header directive instructs browsers that a response can be cached and reused without re-validating for 3600 seconds?',
                    options: ['`Cache-Control: public, max-age=3600`', '`Cache-Control: no-store`', '`Pragma: no-cache`', '`Expire: immediately`'],
                    correctAnswer: '`Cache-Control: public, max-age=3600`',
                    explanation: '`public, max-age=3600` tells both browser caches and intermediate CDN proxies that the resource is valid for 1 hour.'
                },
                {
                    questionText: 'What happens during a "Cache Invalidation" or "Cache Purge" event?',
                    options: ['Stale cached entries are evicted when content is edited or published so visitors see updated content', 'The web server shuts down permanently', 'All user passwords are erased', 'The database drops all tables'],
                    correctAnswer: 'Stale cached entries are evicted when content is edited or published so visitors see updated content',
                    explanation: 'Cache invalidation removes old rendered pages so visitors receive fresh content immediately after an author publishes changes.'
                },
                {
                    questionText: 'What high-performance reverse-proxy HTTP accelerator is commonly placed in front of Magento or Drupal to serve cached pages at extreme speeds?',
                    options: ['Varnish Cache', 'Apache Tomcat', 'Vim Editor', 'FTP Daemon'],
                    correctAnswer: 'Varnish Cache',
                    explanation: 'Varnish is a dedicated HTTP reverse-proxy cache designed specifically to accelerate heavy dynamic CMS websites.'
                },
                {
                    questionText: 'What database diagnostic command shows how an SQL engine executes a query and whether it uses indexes?',
                    options: ['EXPLAIN (or EXPLAIN QUERY PLAN)', 'DESCRIBE HARDWARE', 'SHOW SPEED', 'TEST QUERY TIMEOUT'],
                    correctAnswer: 'EXPLAIN (or EXPLAIN QUERY PLAN)',
                    explanation: '`EXPLAIN` displays the query execution plan, revealing table scans, index usage, and estimated row lookups.'
                },
                {
                    questionText: 'Why can database "Transients" or expired session tokens degrade CMS database performance over time if not purged?',
                    options: ['They bloat options/session tables, making table scans slower and wasting storage space', 'They overheat the server computer fans', 'They change the domain name of the website', 'They overwrite theme stylesheets'],
                    correctAnswer: 'They bloat options/session tables, making table scans slower and wasting storage space',
                    explanation: 'Accumulated transient rows and abandoned cart data inflate table sizes, slowing down SELECT and INSERT queries.'
                },
                {
                    questionText: 'What is the purpose of Database Connection Pooling?',
                    options: ['Reusing an established cache of database connections rather than opening and closing a new connection on every request', 'Combining multiple physical databases into a single swimming pool', 'Sharing passwords across users', 'Backing up tables to USB drives'],
                    correctAnswer: 'Reusing an established cache of database connections rather than opening and closing a new connection on every request',
                    explanation: 'Connection pooling eliminates the latency overhead of SSL handshakes and TCP connection handshakes on every request.'
                }
            ]
        }
    },
    {
        orderIndex: 14,
        key: 'cms-deployment',
        title: 'CMS Migration, Cloud Deployment & DevOps',
        description: 'Managing CMS lifecycles: site migration, database search-and-replace, Docker containers, staging workflows, and automated CI/CD pipelines.',
        outline: [
            'CMS Migration Strategies: Moving files and serialized databases safely',
            'Serialized PHP data hazards and Search-and-Replace tools',
            'Development environments: Localhost vs Staging vs Production',
            'Containerization of CMS stacks using Docker and Docker Compose',
            'Continuous Integration & Deployment (CI/CD) with Git, GitHub Actions, and automated backups'
        ],
        slides: [
            { title: 'CMS Migration & Cloud Deployment', subtitle: 'Topic 14 - DevOps & Professional Workflows', bullets: ['Moving a CMS between environments requires coordinating database records, media uploads, and server configurations', 'The Serialized Data Hazard: Naive SQL string replaces break PHP serialized arrays (breaking site options and widgets)', 'Professional standard: Local development -> Staging verification -> Automated Production deploy'], theme: 'cyan' },
            { title: 'Docker, CI/CD & Disaster Recovery', subtitle: 'Containerized Infrastructure', bullets: ['Docker Compose: Reproducible local development stacks mimicking production versions of PHP, MySQL, and Redis', 'CI/CD Pipelines: Automatically lint, test, and deploy theme/plugin code on Git push', 'The 3-2-1 Backup Rule: 3 copies of data, 2 different media types, 1 offsite cloud location'], theme: 'cyan' }
        ],
        quiz: {
            title: 'Topic 14 Quiz: Migration & DevOps',
            passingScorePercent: 75,
            timeLimitMinutes: 10,
            questions: [
                {
                    questionText: 'Why does performing a raw search-and-replace on a WordPress database SQL dump corrupt serialized PHP data?',
                    options: ['Serialized data stores string length counts; altering the URL length breaks data deserialization', 'SQL files can only store numbers', 'Raw SQL files cannot be opened in text editors', 'It causes the server hard drive to de-magnetize'],
                    correctAnswer: 'Serialized data stores string length counts; altering the URL length breaks data deserialization',
                    explanation: 'Serialized PHP objects store string lengths (e.g. `s:19:"http://old-url.com"`). Changing string length without updating the counter corrupts the data.'
                },
                {
                    questionText: 'What is the standard staging workflow in professional CMS development?',
                    options: ['Develop locally, test on a staging server, deploy to production', 'Edit files live directly on the production server via FTP', 'Develop only in production during peak traffic hours', 'Test changes in email attachments'],
                    correctAnswer: 'Develop locally, test on a staging server, deploy to production',
                    explanation: 'The industry-standard deployment pipeline isolates experiments to local/staging environments, keeping production stable.'
                },
                {
                    questionText: 'What is the role of Docker Compose in modern CMS development workflows?',
                    options: ['Defining and orchestrating multi-container environments (PHP, Web Server, MySQL, Redis) with reproducible configurations', 'A graphic design application for creating banners', 'An audio editing suite for podcasting', 'A replacement for CSS styling'],
                    correctAnswer: 'Defining and orchestrating multi-container environments (PHP, Web Server, MySQL, Redis) with reproducible configurations',
                    explanation: 'Docker Compose spins up identical development environments across team machines with exact PHP/MySQL versions.'
                },
                {
                    questionText: 'What does the "3-2-1 Backup Rule" dictate for enterprise CMS disaster recovery?',
                    options: ['Maintain 3 copies of data, across 2 different storage media, with at least 1 copy off-site in the cloud', 'Backup every 3 minutes, 2 hours, and 1 day', 'Use 3 passwords with 2 numbers and 1 symbol', 'Keep 3 hard drives in 2 rooms of 1 building'],
                    correctAnswer: 'Maintain 3 copies of data, across 2 different storage media, with at least 1 copy off-site in the cloud',
                    explanation: 'The 3-2-1 rule guarantees data recovery even in the event of hardware failure, ransomware, or local facility destruction.'
                },
                {
                    questionText: 'What automated system executes tests, builds assets, and deploys code when changes are pushed to GitHub or GitLab?',
                    options: ['CI/CD Pipeline (e.g., GitHub Actions)', 'Windows Task Manager', 'A manual cron script on a home laptop', 'The browser reload button'],
                    correctAnswer: 'CI/CD Pipeline (e.g., GitHub Actions)',
                    explanation: 'Continuous Integration / Continuous Deployment pipelines automate testing, asset compilation, and deployment on git commits.'
                },
                {
                    questionText: 'What file in a Git repository specifies files that should NEVER be committed (e.g., passwords, node_modules, logs)?',
                    options: ['.gitignore', 'readme.txt', 'license.md', 'index.php'],
                    correctAnswer: '.gitignore',
                    explanation: '`.gitignore` prevents sensitive configuration files (wp-config.php, .env) and bulky dependencies from being tracked in source control.'
                },
                {
                    questionText: 'What command-line tool allows safe database search-and-replace that properly handles serialized PHP data in WordPress?',
                    options: ['wp search-replace (WP-CLI)', 'Notepad.exe Find & Replace', 'cat database.sql', 'mv database.sql'],
                    correctAnswer: 'wp search-replace (WP-CLI)',
                    explanation: '`wp search-replace` deserializes data before string replacement and recalculates byte lengths on reserialization.'
                },
                {
                    questionText: 'What does an Environment File (`.env`) store in modern containerized CMS applications?',
                    options: ['Environment-specific secrets, database credentials, API keys, and configuration variables', 'The weather and room temperature', 'Public CSS animations', 'Images for the homepage slideshow'],
                    correctAnswer: 'Environment-specific secrets, database credentials, API keys, and configuration variables',
                    explanation: '`.env` files keep sensitive credentials out of version control and allow different settings per server environment.'
                },
                {
                    questionText: 'What is a "Blue-Green" or "Zero-Downtime" deployment strategy?',
                    options: ['Deploying new code to an idle environment and switching traffic instantly once verification passes', 'Painting the server racks blue and green', 'Shutting down the website for 48 hours for upgrades', 'Restricting site access to daylight hours'],
                    correctAnswer: 'Deploying new code to an idle environment and switching traffic instantly once verification passes',
                    explanation: 'Blue-Green deployments maintain two identical environments; traffic switches seamlessly to the new release without user downtime.'
                },
                {
                    questionText: 'Why is it essential to regularly test restoring backups rather than just verifying that backup files exist?',
                    options: ['An untested backup may be corrupted, incomplete, or incompatible when a disaster strikes', 'To erase the hard drive deliberately', 'To test internet download speeds', 'To verify the color of the monitor'],
                    correctAnswer: 'An untested backup may be corrupted, incomplete, or incompatible when a disaster strikes',
                    explanation: 'A backup is only as good as its restore; periodic restore drills ensure recovery processes work before an actual outage occurs.'
                }
            ]
        }
    }
];

module.exports = { SYLLABUS_14_TOPICS };
