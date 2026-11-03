/**
 * SAMPLE-QUIZ-BANK.JS
 * High-quality, syllabus-aligned multiple-choice question banks
 * for the 7 presentation slide decks:
 * 1. CMS Fundamentals (cms)
 * 2. WordPress Core & Architecture (wordpress)
 * 3. Joomla Framework & MVC Architecture (joomla)
 * 4. Drupal Enterprise CMS & Taxonomy (drupal)
 * 5. Wix & Cloud Website Builders (wix)
 * 6. Shopify & Hosted E-Commerce (shopify)
 * 7. Magento (Adobe Commerce) Platform (magento)
 */

const SAMPLE_QUESTION_BANKS = {
    cms: [
        {
            questionText: 'What does the acronym CMS stand for in digital web development?',
            options: ['Content Management System', 'Centralized Media Server', 'Client Markup Structure', 'Cloud Moderation Service'],
            correctAnswer: 'Content Management System',
            explanation: 'CMS stands for Content Management System, software that allows users to create, manage, and modify website content without writing raw code.'
        },
        {
            questionText: 'Which CMS component provides the graphical user interface where content creators draft and edit content without HTML knowledge?',
            options: ['CMA (Content Management Application)', 'CDA (Content Delivery Application)', 'API Gateway', 'CDN Edge Cache'],
            correctAnswer: 'CMA (Content Management Application)',
            explanation: 'The Content Management Application (CMA) provides the authoring GUI and WYSIWYG editor for non-technical users.'
        },
        {
            questionText: 'What is the primary role of the Content Delivery Application (CDA) in a traditional CMS?',
            options: ['Compiling content, applying templates, and rendering HTML for website visitors', 'Managing user billing and payment gateways', 'Writing scheduled database backup scripts', 'Designing vector logo graphics'],
            correctAnswer: 'Compiling content, applying templates, and rendering HTML for website visitors',
            explanation: 'The CDA handles the backend delivery pipeline, fetching raw content from the database and assembling it with templates into web pages for visitors.'
        },
        {
            questionText: 'Which of the following is NOT a stage in the standard CMS Content Lifecycle?',
            options: ['Creation', 'Management & Taxonomy', 'Hardware Soldering', 'Publishing & Delivery'],
            correctAnswer: 'Hardware Soldering',
            explanation: 'Hardware soldering is physical electronics manufacturing, whereas the CMS lifecycle encompasses Creation, Management, Publishing, and Presentation.'
        },
        {
            questionText: 'Prior to modern CMS platforms, how were website content updates conventionally executed?',
            options: ['Manually editing static HTML/CSS files and uploading them via FTP', 'Executing automated container microservices', 'Using voice-controlled neural networks', 'Through decentralized blockchain consensus'],
            correctAnswer: 'Manually editing static HTML/CSS files and uploading them via FTP',
            explanation: 'Early websites relied on webmasters hand-coding static HTML documents and uploading them manually to web servers over FTP.'
        },
        {
            questionText: 'What key organizational advantage does an enterprise CMS provide?',
            options: ['Enables editorial teams to publish content rapidly without requiring software engineers', 'Eliminates the requirement for web servers or domain names', 'Guarantees 100% protection against all internet outages', 'Replaces the server operating system kernel'],
            correctAnswer: 'Enables editorial teams to publish content rapidly without requiring software engineers',
            explanation: 'A CMS decentralizes content publishing across marketing and editorial departments without developer bottlenecks.'
        },
        {
            questionText: 'In a dynamic CMS, where are article body text and metadata persisted prior to page requests?',
            options: ['In a relational database such as MySQL, MariaDB, or SQLite', 'Exclusively on physical magnetic tape', 'Inside the client browser RAM permanently', 'In compiler bytecode on the GPU memory'],
            correctAnswer: 'In a relational database such as MySQL, MariaDB, or SQLite',
            explanation: 'Dynamic CMS platforms store posts, taxonomy, user permissions, and settings in a database management system.'
        },
        {
            questionText: 'What does the acronym WYSIWYG represent in CMS rich-text editors?',
            options: ['What You See Is What You Get', 'Where Your System Is Working Your Goal', 'When You Save It Writes Your Guide', 'Web Yields Standard Internet Web Yields Graphs'],
            correctAnswer: 'What You See Is What You Get',
            explanation: 'WYSIWYG stands for "What You See Is What You Get", providing visual formatting tools that preview the live output.'
        },
        {
            questionText: 'What is the architectural purpose of a "Theme" or "Template" in a CMS?',
            options: ['To separate visual layout and presentation from stored data and content', 'To manage physical CPU cooling fans', 'To replace the database query optimizer', 'To format and partition local hard drives'],
            correctAnswer: 'To separate visual layout and presentation from stored data and content',
            explanation: 'Templates enforce the separation of concerns: design and CSS live in templates, allowing sitewide design changes without modifying stored text.'
        },
        {
            questionText: 'What occurs during the "Publishing" phase of the CMS content workflow?',
            options: ['Approved content is scheduled or made publicly accessible to site visitors', 'The CMS database credentials are wiped', 'All user passwords are automatically reset', 'The website domain registration is auctioned'],
            correctAnswer: 'Approved content is scheduled or made publicly accessible to site visitors',
            explanation: 'Publishing promotes drafted content into production visibility or sets an automated timestamp for release.'
        },
        {
            questionText: 'Why is page and object caching critical in high-traffic dynamic CMS installations?',
            options: ['It avoids repetitive database queries and PHP execution by serving pre-rendered HTML', 'It permanently deletes old database records to free disk space', 'It disables all CSS styling to minimize network bandwidth', 'It encrypts every visitor browser session into a ZIP archive'],
            correctAnswer: 'It avoids repetitive database queries and PHP execution by serving pre-rendered HTML',
            explanation: 'Caching stores assembled HTML or query results in memory (like Redis or Varnish), allowing high traffic loads without database strain.'
        },
        {
            questionText: 'What distinguishes a "Decoupled / Headless" CMS architecture from a "Monolithic" CMS?',
            options: ['The content repository is separated from the presentation layer and accessed via APIs', 'It operates without any database engine whatsoever', 'It only runs on command-line terminal interfaces without CSS', 'It prevents users from uploading any images or videos'],
            correctAnswer: 'The content repository is separated from the presentation layer and accessed via APIs',
            explanation: 'Headless CMS separates backend content management from the frontend UI, delivering content via REST or GraphQL APIs to any device.'
        },
        {
            questionText: 'What role does "Taxonomy" serve within a CMS structure?',
            options: ['Classifying, organizing, and categorizing content through tags, categories, and hierarchical vocabularies', 'Compiling PHP source code into binary executables', 'Configuring server firewall ports and SSH keys', 'Monitoring hardware power consumption'],
            correctAnswer: 'Classifying, organizing, and categorizing content through tags, categories, and hierarchical vocabularies',
            explanation: 'Taxonomy structures content relationships, making it searchable, filterable, and navigable for visitors and search engines.'
        },
        {
            questionText: 'Which CMS capability enables editors to review older revisions and revert accidental text changes?',
            options: ['Version Control / Revision History', 'Real-time Ray Tracing', 'Domain Name System (DNS) Propagation', 'Binary Code Obfuscation'],
            correctAnswer: 'Version Control / Revision History',
            explanation: 'Content revision tracking saves historical snapshots of posts, allowing authors to compare changes and restore previous versions.'
        },
        {
            questionText: 'What is the purpose of Role-Based Access Control (RBAC) in a multi-user CMS?',
            options: ['Granting distinct permissions (Admin, Editor, Author, Subscriber) to protect system integrity', 'Assigning different screen resolutions to each user', 'Controlling the color scheme of the web server room', 'Preventing mobile devices from visiting the website'],
            correctAnswer: 'Granting distinct permissions (Admin, Editor, Author, Subscriber) to protect system integrity',
            explanation: 'RBAC ensures that only authorized administrators can alter system settings or delete content, while authors can only draft their own posts.'
        }
    ],

    wordpress: [
        {
            questionText: 'Which programming language and database engine form the primary foundation of WordPress Core?',
            options: ['PHP and MySQL / MariaDB', 'Ruby and PostgreSQL', 'Python and MongoDB', 'Java and Oracle DB'],
            correctAnswer: 'PHP and MySQL / MariaDB',
            explanation: 'WordPress is built on PHP for server-side logic and uses MySQL or MariaDB to persist content and configuration.'
        },
        {
            questionText: 'What is "The Loop" in WordPress theme and template development?',
            options: ['PHP code that iterates through fetched posts and outputs titles, content, and metadata', 'An endless infinite redirect loop that causes a 508 error', 'The internal cron scheduler for background updates', 'A CSS keyframe animation for spinning loading spinners'],
            correctAnswer: 'PHP code that iterates through fetched posts and outputs titles, content, and metadata',
            explanation: 'The Loop (`while (have_posts()) : the_post();`) is the core mechanism WordPress uses to display posts matching the current query.'
        },
        {
            questionText: 'Which core database table stores pages, posts, attachments, revisions, and custom post types in WordPress?',
            options: ['wp_posts', 'wp_content_items', 'wp_articles', 'wp_documents'],
            correctAnswer: 'wp_posts',
            explanation: 'WordPress stores standard blog posts, static pages, media attachments, navigation items, and custom post types inside `wp_posts`.'
        },
        {
            questionText: 'Where does WordPress store arbitrary custom metadata (key-value pairs) associated with a specific post?',
            options: ['wp_postmeta', 'wp_options', 'wp_metadata_store', 'wp_customfields'],
            correctAnswer: 'wp_postmeta',
            explanation: 'The `wp_postmeta` table links custom metadata keys and values to specific post IDs via foreign key relationships.'
        },
        {
            questionText: 'What is the primary operational difference between a WordPress "Action" and a "Filter"?',
            options: ['Actions execute custom code at specific lifecycle events; Filters modify and return variable data', 'Actions alter database records; Filters delete user accounts', 'Actions only style CSS; Filters only query JavaScript', 'Actions are written in Python; Filters are written in C++'],
            correctAnswer: 'Actions execute custom code at specific lifecycle events; Filters modify and return variable data',
            explanation: 'Actions (`add_action`) trigger side effects when events occur. Filters (`add_filter`) receive data, modify it, and return the modified value.'
        },
        {
            questionText: 'Which hook type in WordPress allows developers to intercept and modify content data using code such as apply_filters("the_content", $content)?',
            options: ['Filter Hook', 'Action Hook', 'Database Trigger', 'REST Endpoint'],
            correctAnswer: 'Filter Hook',
            explanation: 'Filter hooks (`apply_filters()`, `add_filter()`) accept content data, pass it through registered callbacks for modification, and return the filtered value.'
        },
        {
            questionText: 'Which template file is the mandatory fallback at the bottom of the WordPress Template Hierarchy?',
            options: ['index.php', 'single.php', 'front-page.php', 'archive.php'],
            correctAnswer: 'index.php',
            explanation: '`index.php` is the most generic template in the WordPress hierarchy. If a more specific template is not found, WordPress falls back to `index.php`.'
        },
        {
            questionText: 'Why should custom features be developed as plugins rather than directly editing WordPress core files?',
            options: ['Core modifications are permanently overwritten and erased whenever WordPress updates', 'Modifying core files consumes double server RAM', 'Core files cannot interpret PHP syntax', 'Core files are encrypted with proprietary hardware keys'],
            correctAnswer: 'Core modifications are permanently overwritten and erased whenever WordPress updates',
            explanation: 'Editing core files breaks update compatibility; updates replace core files, wiping custom code and exposing security vulnerabilities.'
        },
        {
            questionText: 'Which file in a WordPress theme directory is automatically executed to enqueue scripts, styles, and register sidebars?',
            options: ['functions.php', 'header.php', 'bootstrap.php', 'controller.php'],
            correctAnswer: 'functions.php',
            explanation: '`functions.php` acts as a theme-level plugin where developers hook into WordPress lifecycle events, enqueue assets, and register features.'
        },
        {
            questionText: 'What is the role of the `wp-config.php` file in a WordPress installation?',
            options: ['Contains database connection credentials, table prefix, and unique security auth salts', 'Contains the entire graphical layout of the front page', 'Stores user blog posts in plain text format', 'Translates PHP templates into JavaScript code'],
            correctAnswer: 'Contains database connection credentials, table prefix, and unique security auth salts',
            explanation: '`wp-config.php` holds essential environment configurations: database credentials, security keys/salts, debug settings, and table prefixes.'
        },
        {
            questionText: 'What is the purpose of creating a "Child Theme" in WordPress development?',
            options: ['To customize styles and templates while safely receiving parent theme updates', 'To make the website strictly accessible to children under 13', 'To restrict theme editing to mobile devices only', 'To disable the database connection for testing'],
            correctAnswer: 'To customize styles and templates while safely receiving parent theme updates',
            explanation: 'A child theme inherits the functionality and styling of the parent theme, allowing developer changes to persist through parent theme updates.'
        },
        {
            questionText: 'What is the purpose of the WordPress Transients API?',
            options: ['Temporarily caching complex query results in the options table with an expiration timestamp', 'Permanently archiving deleted comments', 'Translating blog posts into foreign languages', 'Managing user login sessions across browser tabs'],
            correctAnswer: 'Temporarily caching complex query results in the options table with an expiration timestamp',
            explanation: 'Transients provide a standardized way of storing cached data with an explicit time-to-live (TTL), accelerating database performance.'
        },
        {
            questionText: 'Which WordPress core API allows third-party applications to interact with posts, users, and taxonomy via HTTP and JSON?',
            options: ['WordPress REST API', 'SOAP XML Endpoint', 'GraphQL Native Kernel', 'Binary RPC Protocol'],
            correctAnswer: 'WordPress REST API',
            explanation: 'The WordPress REST API provides standardized JSON endpoints, enabling headless websites, mobile apps, and external tools to communicate with WordPress.'
        }
    ],

    joomla: [
        {
            questionText: 'Which architectural software design pattern forms the core structural foundation of the Joomla CMS framework?',
            options: ['Model-View-Controller (MVC)', 'Entity-Component-System (ECS)', 'Microkernel Plugin-Only', 'Pipeline and Filter Pattern'],
            correctAnswer: 'Model-View-Controller (MVC)',
            explanation: 'Joomla is built on the classic MVC pattern: Models manage data logic, Views assemble display data, and Controllers handle user requests.'
        },
        {
            questionText: 'In Joomla extension architecture, what is a "Component"?',
            options: ['A major mini-application that renders the primary content body of the requested page', 'A tiny widget that only floats in sidebars', 'A CSS color stylesheet file', 'A hardware cooling sensor'],
            correctAnswer: 'A major mini-application that renders the primary content body of the requested page',
            explanation: 'Components (prefixed with `com_`, like `com_content`) are the most powerful extension type in Joomla, responsible for the primary body area of a page.'
        },
        {
            questionText: 'What is the specific function of a "Module" in Joomla?',
            options: ['A lightweight presentation box displayed around the main component in designated template positions', 'A database migration script runner', 'An operating system kernel extension', 'A domain name registrar tool'],
            correctAnswer: 'A lightweight presentation box displayed around the main component in designated template positions',
            explanation: 'Modules (e.g. login boxes, breadcrumbs, search bars, menus) render peripheral content in specific module positions defined by the template.'
        },
        {
            questionText: 'What type of Joomla extension executes background event hooks, such as user authentication or content filtering?',
            options: ['Plugins', 'Modules', 'Templates', 'Languages'],
            correctAnswer: 'Plugins',
            explanation: 'Joomla plugins are event handlers triggered by system events (e.g., `onContentPrepare`, `onUserLogin`), modifying behavior without changing core code.'
        },
        {
            questionText: 'Which Joomla core component handles articles, categories, and standard editorial publications?',
            options: ['com_content', 'com_articles', 'com_blog', 'com_editorial'],
            correctAnswer: 'com_content',
            explanation: '`com_content` is Joomla\'s native article management component, governing articles, categories, featured items, and blog layouts.'
        },
        {
            questionText: 'How does Joomla define and render custom visual layouts and designated widget placement areas?',
            options: ['Through Templates and defined "Module Positions"', 'Through compiled C++ DLL libraries', 'Through the client browser registry keys', 'Through server DNS SRV records'],
            correctAnswer: 'Through Templates and defined "Module Positions"',
            explanation: 'Joomla templates define the overall HTML/CSS shell and declare named module positions where administrators assign modules.'
        },
        {
            questionText: 'What enterprise security feature in Joomla provides fine-grained permissions across hierarchical user groups?',
            options: ['Access Control List (ACL)', 'Single-Sign-On Registry', 'Biometric Password Hasher', 'Hardware Token Validator'],
            correctAnswer: 'Access Control List (ACL)',
            explanation: 'Joomla\'s native ACL system allows administrators to control exactly what content and administrative tools each user group can view, edit, or publish.'
        },
        {
            questionText: 'How can a Joomla developer customize the HTML output of a core component without modifying core files?',
            options: ['By creating a Template Override inside the template\'s `html/` directory', 'By deleting the component PHP files', 'By modifying MySQL tables directly in binary format', 'By recompiling the Apache web server'],
            correctAnswer: 'By creating a Template Override inside the template\'s `html/` directory',
            explanation: 'Template Overrides allow developers to copy a component or module view into the active template\'s `html/` folder to safely customize layout markup.'
        },
        {
            questionText: 'Which central file stores Joomla\'s global site configuration parameters and database connection details?',
            options: ['configuration.php', 'settings.ini', 'joomla.conf', 'database.json'],
            correctAnswer: 'configuration.php',
            explanation: 'Joomla stores database credentials, mail server settings, caching parameters, and error reporting flags in `configuration.php`.'
        },
        {
            questionText: 'What is the purpose of Joomla\'s built-in Language Overrides system?',
            options: ['Modifying site text strings without editing core language files or code', 'Translating database column names into foreign alphabets', 'Converting PHP into Python syntax', 'Changing the programming language of the database'],
            correctAnswer: 'Modifying site text strings without editing core language files or code',
            explanation: 'Language Overrides allow administrators to change any interface text constant (e.g., "Read More") safely from the administration panel.'
        },
        {
            questionText: 'What is the role of the `jinput` object in Joomla framework programming?',
            options: ['Safely inspecting and filtering HTTP GET, POST, and COOKIE request variables', 'Measuring keyboard typing latency', 'Controlling touch screen brightness', 'Simulating mouse clicks for unit testing'],
            correctAnswer: 'Safely inspecting and filtering HTTP GET, POST, and COOKIE request variables',
            explanation: 'JInput provides a secure, sanitized API for retrieving request data, preventing cross-site scripting and unauthorized variable injection.'
        },
        {
            questionText: 'What database abstraction layer does the modern Joomla framework utilize for database independence?',
            options: ['Joomla Database Framework (supporting MySQL, PostgreSQL)', 'Raw non-parameterized SQL concatenation', 'Direct memory pointers to disk sectors', 'Exclusive reliance on CSV text flat-files'],
            correctAnswer: 'Joomla Database Framework (supporting MySQL, PostgreSQL)',
            explanation: 'Joomla uses a structured database driver layer that supports multiple RDBMS platforms using parameterized prepared queries.'
        },
        {
            questionText: 'What distinguishes Joomla\'s Menu system from simple website link lists?',
            options: ['Joomla menu items define the routing, active template, modules displayed, and page parameters', 'Joomla menus can only link to external URLs', 'Joomla menus do not support hierarchical sub-menus', 'Joomla menus require flash player to render'],
            correctAnswer: 'Joomla menu items define the routing, active template, modules displayed, and page parameters',
            explanation: 'In Joomla, menu items are central controllers: each item generates a unique ItemID that dictates module assignments, layout parameters, and SEF URLs.'
        }
    ],

    drupal: [
        {
            questionText: 'In Drupal terminology, what is a "Node"?',
            options: ['A discrete piece of content (such as an article, page, or custom entity item)', 'A network router on the local LAN', 'A CPU processor thread', 'A JavaScript browser alert dialog'],
            correctAnswer: 'A discrete piece of content (such as an article, page, or custom entity item)',
            explanation: 'In Drupal, a node is any individual piece of content possessing a title, body, author, publishing status, and unique Node ID (NID).'
        },
        {
            questionText: 'Which powerful core Drupal module provides a graphical query builder for displaying lists, grids, and tables of content without writing SQL?',
            options: ['Views', 'Queries', 'Panels', 'Layouts'],
            correctAnswer: 'Views',
            explanation: 'The Views module is Drupal\'s visual query builder, allowing site builders to query, filter, sort, and render content entities in diverse formats.'
        },
        {
            questionText: 'What is the purpose of Drupal\'s "Taxonomy" system?',
            options: ['Organizing content using Vocabularies and Terms', 'Calculating sales tax on e-commerce transactions', 'Auditing PHP memory leak exceptions', 'Compressing media files into WebP format'],
            correctAnswer: 'Organizing content using Vocabularies and Terms',
            explanation: 'Taxonomy in Drupal allows administrators to create Vocabularies (like "Topic" or "Department") and populate them with hierarchical Terms to categorize nodes.'
        },
        {
            questionText: 'Which modern templating engine was integrated into Drupal 8, replacing raw PHP template files (`.tpl.php`)?',
            options: ['Twig', 'Blade', 'Smarty', 'Handlebars'],
            correctAnswer: 'Twig',
            explanation: 'Drupal transitioned to the Twig templating engine, providing secure, fast, and readable syntax like `{{ content }}` and `{% if %}`.'
        },
        {
            questionText: 'Which prominent enterprise PHP framework provides foundational components (Routing, EventDispatcher, HTTPKernel) for modern Drupal?',
            options: ['Symfony', 'Laravel', 'CodeIgniter', 'Yii Framework'],
            correctAnswer: 'Symfony',
            explanation: 'Modern Drupal (Drupal 8, 9, 10) is built upon robust Symfony PHP components, adhering to modern object-oriented standards.'
        },
        {
            questionText: 'What is the official command-line shell and scripting interface widely used to administer and deploy Drupal sites?',
            options: ['Drush', 'Composer CLI', 'DrupalTerm', 'NodeCLI'],
            correctAnswer: 'Drush',
            explanation: 'Drush (Drupal Shell) is the premier CLI tool for Drupal developers, enabling cache clears (`drush cr`), database updates (`drush updb`), and config exports.'
        },
        {
            questionText: 'How does Drupal\'s Configuration Management System (CMI) facilitate staging and deployment workflows?',
            options: ['It exports site settings, content types, and views into version-controlled YAML files', 'It compiles all website code into a single binary EXE file', 'It streams configuration over live peer-to-peer WebRTC connections', 'It prevents administrators from changing any settings in production'],
            correctAnswer: 'It exports site settings, content types, and views into version-controlled YAML files',
            explanation: 'CMI enables developers to export entire site configurations as YAML files, commit them to Git, and import them seamlessly into production.'
        },
        {
            questionText: 'What is the difference between "Content Entities" and "Configuration Entities" in Drupal?',
            options: ['Content entities store dynamic site data (nodes, users); Configuration entities store administrative settings and views', 'Content entities are written in Python; Configuration entities in Ruby', 'Content entities cannot be deleted; Configuration entities are erased hourly', 'Content entities are stored on client machines; Configuration entities on the server'],
            correctAnswer: 'Content entities store dynamic site data (nodes, users); Configuration entities store administrative settings and views',
            explanation: 'Content entities (nodes, taxonomy terms, custom blocks) represent user data, while Configuration entities represent structural definitions like Views and Content Types.'
        },
        {
            questionText: 'What built-in Drupal module accelerates perceived loading performance by streaming personalized content after cached page shells?',
            options: ['BigPipe', 'SpeedBooster', 'FastHTML', 'StreamCache'],
            correctAnswer: 'BigPipe',
            explanation: 'Drupal\'s BigPipe module sends the main cached page frame immediately to the browser, streaming dynamic/personalized placeholders as they finish rendering.'
        }
    ],

    wix: [
        {
            questionText: 'What hosting and delivery model does Wix operate under?',
            options: ['Software-as-a-Service (SaaS) fully managed cloud platform', 'Self-hosted open source LAMP stack', 'Physical dedicated on-premise hardware only', 'Peer-to-peer decentralized torrent node'],
            correctAnswer: 'Software-as-a-Service (SaaS) fully managed cloud platform',
            explanation: 'Wix is a proprietary SaaS website builder where hosting, security, backups, software updates, and CDN delivery are fully managed by Wix.'
        },
        {
            questionText: 'What visual editing paradigm is Wix renowned for that distinguishes it from traditional flow-based CMS platforms?',
            options: ['Drag-and-drop absolute positioning and visual ADI (Artificial Design Intelligence)', 'Raw markdown file compilation in a terminal', 'Strictly table-based HTML 3.2 coding', 'Voice-only prompt generation without a visual canvas'],
            correctAnswer: 'Drag-and-drop absolute positioning and visual ADI (Artificial Design Intelligence)',
            explanation: 'Wix provides an intuitive WYSIWYG drag-and-drop canvas allowing elements to be placed with pixel precision, alongside ADI automated design.'
        },
        {
            questionText: 'What is "Velo by Wix" (formerly Corvid)?',
            options: ['A full-stack development environment for writing custom JavaScript (front-end and backend) on Wix', 'A 3D virtual reality video player', 'A proprietary operating system for tablets', 'A billing invoice payment calculator'],
            correctAnswer: 'A full-stack development environment for writing custom JavaScript (front-end and backend) on Wix',
            explanation: 'Velo is Wix\'s development platform that lets developers write custom JavaScript APIs, database hooks, and backend web modules on top of Wix.'
        },
        {
            questionText: 'What is a major trade-off or architectural limitation of proprietary SaaS website builders like Wix compared to self-hosted open-source CMS?',
            options: ['Vendor lock-in and the inability to export raw server backend code or database schemas to another host', 'Inability to display digital photographs', 'Zero support for custom domain names', 'Maximum limit of 3 web pages per website'],
            correctAnswer: 'Vendor lock-in and the inability to export raw server backend code or database schemas to another host',
            explanation: 'Because Wix is a closed SaaS ecosystem, users cannot export the underlying backend source code or migrate the database to an independent hosting provider.'
        },
        {
            questionText: 'Where can Wix users discover and install third-party extensions, forms, and marketing integrations?',
            options: ['Wix App Market', 'WordPress Plugin Directory', 'npm Public Registry', 'Google Chrome Web Store'],
            correctAnswer: 'Wix App Market',
            explanation: 'The Wix App Market offers hundreds of vetted integrations, widgets, booking tools, and business applications that plug into Wix sites.'
        },
        {
            questionText: 'In Wix Velo/CMS, what are "Dynamic Pages"?',
            options: ['Single page design templates that dynamically render different content based on items in a database collection', 'Pages that randomly change background colors every second', 'Pages that only display animated GIF images', 'Pages that require users to solve a math puzzle before opening'],
            correctAnswer: 'Single page design templates that dynamically render different content based on items in a database collection',
            explanation: 'Dynamic Pages let developers design a single layout that automatically generates unique URLs and renders content populated from database collection rows.'
        },
        {
            questionText: 'Which built-in Wix feature guides site owners through optimizing meta tags, URL slugs, and indexing with Google Search Console?',
            options: ['Wix SEO Wiz / SEO Setup Checklist', 'Google Rank Booster Pro', 'Search Engine Submitter EXE', 'Robot Validator Tool'],
            correctAnswer: 'Wix SEO Wiz / SEO Setup Checklist',
            explanation: 'Wix SEO Setup Checklist provides step-by-step guidance for setting up page titles, descriptions, canonical URLs, and indexing with Google.'
        },
        {
            questionText: 'How does Wix handle mobile device presentation for sites built in the standard Wix Editor?',
            options: ['It generates a dedicated mobile editor view allowing tailored mobile layout adjustments without breaking desktop design', 'It completely hides the website on smartphones', 'It converts all mobile pages to plain text email', 'It prompts mobile visitors to install a native desktop app'],
            correctAnswer: 'It generates a dedicated mobile editor view allowing tailored mobile layout adjustments without breaking desktop design',
            explanation: 'Wix provides an adaptive Mobile Editor where authors can reorder, resize, or hide elements specifically for mobile screens without affecting desktop.'
        },
        {
            questionText: 'What is the role of Wix Stores within the platform ecosystem?',
            options: ['A native turnkey e-commerce solution for selling physical/digital products with built-in payments and inventory', 'A warehouse for physical shipping pallets', 'An outlet store for second-hand computers', 'A cloud hard drive for video backups'],
            correctAnswer: 'A native turnkey e-commerce solution for selling physical/digital products with built-in payments and inventory',
            explanation: 'Wix Stores provides an integrated e-commerce suite covering product catalogs, payment gateways, tax calculation, and order tracking.'
        },
        {
            questionText: 'How are SSL certificates managed on custom domain websites connected to Wix?',
            options: ['Wix automatically provisions, configures, and renews 256-bit SSL certificates at no extra charge', 'Site owners must manually generate OpenSSL keys in a Linux terminal annually', 'Wix websites do not support HTTPS encrypted traffic', 'Users must purchase physical cryptographic smartcards'],
            correctAnswer: 'Wix automatically provisions, configures, and renews 256-bit SSL certificates at no extra charge',
            explanation: 'Wix automatically provisions and manages TLS/SSL encryption for all domains connected to its platform.'
        },
        {
            questionText: 'What responsive layout engine was introduced in Wix Studio / Editor X to support advanced CSS Grid and Flexbox layouts?',
            options: ['Fluid responsive breakpoints with CSS Grid, Flexbox, and docking', 'Flash ActionScript 3.0 vector engine', 'Direct pixel-only absolute frame tables', 'HTML frameset and iframe nesting'],
            correctAnswer: 'Fluid responsive breakpoints with CSS Grid, Flexbox, and docking',
            explanation: 'Wix Studio / Editor X offers professional design tools utilizing CSS Grid, Flexbox layouts, fluid typography, and custom viewport breakpoints.'
        },
        {
            questionText: 'What security benefit does a managed SaaS builder like Wix provide over unmaintained self-hosted CMS installations?',
            options: ['Server patches, security updates, and vulnerability mitigation are handled automatically without user intervention', 'It makes passwords completely unnecessary for login', 'It prevents users from ever receiving spam emails', 'It encrypts the visitor screen so it cannot be screenshotted'],
            correctAnswer: 'Server patches, security updates, and vulnerability mitigation are handled automatically without user intervention',
            explanation: 'In managed SaaS platforms, the vendor continuously patches server software and core dependencies, eliminating the risk of out-of-date unpatched plugins.'
        }
    ],

    shopify: [
        {
            questionText: 'What open-source templating language did Shopify create to render dynamic storefront data safely in theme files?',
            options: ['Liquid', 'Jinja', 'Handlebars', 'Mustache'],
            correctAnswer: 'Liquid',
            explanation: 'Shopify created the Liquid templating language (now used across many platforms) to safely expose store data inside theme files.'
        },
        {
            questionText: 'In Shopify Liquid syntax, which delimiters are used to output variable content (Objects) to the HTML?',
            options: ['{{ product.title }}', '{% product.title %}', '[[ product.title ]]', '(( product.title ))'],
            correctAnswer: '{{ product.title }}',
            explanation: 'Double curly braces `{{ ... }}` denote Liquid output objects, evaluating and printing dynamic variables directly to the rendered page.'
        },
        {
            questionText: 'In Shopify Liquid syntax, which delimiters denote control flow and logic (Tags like `if`, `for`, `assign`)?',
            options: ['{% for item in cart.items %}', '{{ for item in cart.items }}', '[[ for item in cart.items ]]', '<% for item in cart.items %>'],
            correctAnswer: '{% for item in cart.items %}',
            explanation: 'Curly brace percent delimiters `{% ... %}` represent Liquid logic tags used for loops, conditions, and variable assignments.'
        },
        {
            questionText: 'How are Liquid "Filters" applied to format or manipulate data outputs (e.g. currency formatting)?',
            options: ['Using the pipe character: `{{ product.price | money }}`', 'Using the exclamation mark: `{{ product.price ! money }}`', 'Using the ampersand: `{{ product.price & money }}`', 'Using the hash symbol: `{{ product.price # money }}`'],
            correctAnswer: 'Using the pipe character: `{{ product.price | money }}`',
            explanation: 'Liquid filters are applied from left to right using pipe characters `|`, transforming inputs into formatted currency, dates, or strings.'
        },
        {
            questionText: 'Which security compliance standard does Shopify maintain natively to handle credit card transactions securely?',
            options: ['PCI-DSS Level 1 Compliance', 'ISO 9001 Factory Quality Standard', 'HIPAA Healthcare Record Standard', 'GDPR Cookie Banner Only'],
            correctAnswer: 'PCI-DSS Level 1 Compliance',
            explanation: 'Shopify is certified Level 1 PCI-DSS compliant, adhering to stringent financial security requirements for handling payment card transactions.'
        },
        {
            questionText: 'What is the role of the Shopify Storefront API in modern web architectures?',
            options: ['Enables custom headless commerce frontends (Next.js, mobile apps, kiosks) via GraphQL queries', 'Allows users to edit raw SQL tables directly', 'Replaces credit card processing with cash on delivery only', 'Manages physical shipping truck logistics'],
            correctAnswer: 'Enables custom headless commerce frontends (Next.js, mobile apps, kiosks) via GraphQL queries',
            explanation: 'The Storefront API provides a GraphQL interface, empowering developers to build custom headless frontends powered by Shopify\'s commerce backend.'
        },
        {
            questionText: 'In Shopify theme architecture (Online Store 2.0), what file format defines customizable sections across templates?',
            options: ['JSON templates (`templates/*.json`)', 'XML schemas (`templates/*.xml`)', 'Plain text CSV (`templates/*.csv`)', 'Compiled binary C++ files'],
            correctAnswer: 'JSON templates (`templates/*.json`)',
            explanation: 'Online Store 2.0 uses JSON templates to store section configurations, allowing merchants to add and reorder sections on any page.'
        },
        {
            questionText: 'What mechanism does Shopify provide to inform external systems (like fulfillment warehouses) when an order is created?',
            options: ['Webhooks (HTTP POST event notifications)', 'Printed physical postal letters', 'Dial-up telephone voice calls', 'Manual copy-pasting from email notifications'],
            correctAnswer: 'Webhooks (HTTP POST event notifications)',
            explanation: 'Shopify Webhooks send automated JSON HTTP POST payloads to external endpoints whenever specific events (like `orders/create`) occur.'
        },
        {
            questionText: 'What is the hierarchy relationship between a Shopify "Product" and its "Variants"?',
            options: ['A product represents the general item (e.g. T-Shirt); variants represent specific options (e.g. Small / Red) with distinct SKUs and prices', 'Variants are separate websites; products are blog articles', 'Products are customer reviews; variants are store discounts', 'There is no difference; they are identical synonyms'],
            correctAnswer: 'A product represents the general item (e.g. T-Shirt); variants represent specific options (e.g. Small / Red) with distinct SKUs and prices',
            explanation: 'A product serves as the overarching catalog container, while variants define specific combinations of options (size, color, material) with separate inventory and SKUs.'
        },
        {
            questionText: 'What is the purpose of Shopify App Bridge in app development?',
            options: ['A JavaScript library that embeds third-party app interfaces seamlessly inside the Shopify admin dashboard', 'A physical bridge that connects Shopify servers to internet providers', 'An algorithm that changes product prices based on weather', 'A tool that automatically deletes slow-selling inventory'],
            correctAnswer: 'A JavaScript library that embeds third-party app interfaces seamlessly inside the Shopify admin dashboard',
            explanation: 'Shopify App Bridge provides communication between embedded apps and the Shopify admin, ensuring a native UI feel and unified navigation.'
        }
    ],

    magento: [
        {
            questionText: 'What enterprise software corporation acquired the Magento platform in 2018, rebranding its enterprise cloud solution as Adobe Commerce?',
            options: ['Adobe', 'Oracle', 'Microsoft', 'Salesforce'],
            correctAnswer: 'Adobe',
            explanation: 'Adobe acquired Magento for $1.68 billion in 2018, integrating it into the Adobe Experience Cloud ecosystem as Adobe Commerce.'
        },
        {
            questionText: 'What database architecture pattern does Magento utilize to support infinite dynamic attributes for diverse catalog products?',
            options: ['Entity-Attribute-Value (EAV)', 'Document Key-Value Cache only', 'Single Flat Table with fixed columns', 'Graph Neural Network Matrix'],
            correctAnswer: 'Entity-Attribute-Value (EAV)',
            explanation: 'Magento uses the EAV model: entities (products) have dynamic attributes stored across value tables (varchar, int, text, decimal), allowing unlimited custom attributes.'
        },
        {
            questionText: 'What command-line tool is fundamental to compiling dependency injection, deploying static view files, and re-indexing Magento 2?',
            options: ['bin/magento', 'magento-cli', 'drush', 'artisan'],
            correctAnswer: 'bin/magento',
            explanation: '`bin/magento` is the official CLI tool in Magento 2, executing crucial tasks like `setup:upgrade`, `setup:di:compile`, and `indexer:reindex`.'
        },
        {
            questionText: 'Why is Indexing critical in Magento\'s catalog performance management?',
            options: ['It flattens complex EAV data into optimized lookup tables to accelerate frontend catalog queries', 'It alphabetically sorts product titles in the admin panel', 'It compresses product images into vector graphics', 'It translates product names into different languages'],
            correctAnswer: 'It flattens complex EAV data into optimized lookup tables to accelerate frontend catalog queries',
            explanation: 'Because querying multi-table EAV models is computationally intensive, indexers pre-calculate catalog data into flat index tables for rapid storefront retrieval.'
        },
        {
            questionText: 'Which high-performance HTTP reverse-proxy caching software is recommended and officially supported by Magento for Full Page Caching?',
            options: ['Varnish Cache', 'Apache Tomcat', 'Squid Proxy', 'Memcached CLI'],
            correctAnswer: 'Varnish Cache',
            explanation: 'Magento provides native VCL configurations for Varnish Cache, enabling lightning-fast full page cache delivery directly from RAM.'
        },
        {
            questionText: 'What is the correct multi-tier organizational hierarchy in Magento multi-store architecture?',
            options: ['Global > Website > Store > Store View', 'Website > Global > Store View > Store', 'Store View > Store > Website > Global', 'Store > Website > Global > Store View'],
            correctAnswer: 'Global > Website > Store > Store View',
            explanation: 'Magento structures multi-tenancy as: Global (system-wide) > Website (customer/order scope) > Store (catalog/category scope) > Store View (language/currency display).'
        },
        {
            questionText: 'In Magento 2 extension development, what feature allows developers to intercept and modify public method execution (before, around, after)?',
            options: ['Plugins (Interceptors)', 'Event Listeners only', 'Class Inheritance overrides only', 'Direct PHP monkey patching'],
            correctAnswer: 'Plugins (Interceptors)',
            explanation: 'Magento 2 Plugins (interceptors) allow developers to hook into any public method on any class, executing code before, after, or around the target method.'
        },
        {
            questionText: 'What configuration file in Magento modules specifies Dependency Injection rules, preferences, and plugin interceptors?',
            options: ['etc/di.xml', 'etc/config.xml', 'etc/module.xml', 'etc/routes.xml'],
            correctAnswer: 'etc/di.xml',
            explanation: '`etc/di.xml` configures object manager dependencies, class preferences, parameter injections, and plugin interceptor declarations.'
        },
        {
            questionText: 'Which search engine technology is a mandatory core requirement for catalog search and layered navigation in Magento 2.4+?',
            options: ['Elasticsearch / OpenSearch', 'MySQL Fulltext Search only', 'Apache Solr only', 'SQLite MATCH FTS5'],
            correctAnswer: 'Elasticsearch / OpenSearch',
            explanation: 'Starting in Magento 2.4, Elasticsearch or OpenSearch is a mandatory requirement for catalog search and layered navigation filters.'
        },
        {
            questionText: 'How are visual layouts constructed and blocks declared in Magento 2 themes?',
            options: ['Through XML layout handle declarations (`view/frontend/layout/*.xml`) referencing PHTML templates', 'Through raw HTML files placed in the public root folder', 'Through JSON schema files compiled by Webpack only', 'Through Microsoft Access MDB database forms'],
            correctAnswer: 'Through XML layout handle declarations (`view/frontend/layout/*.xml`) referencing PHTML templates',
            explanation: 'Magento 2 uses declarative XML layout files to position blocks and containers, rendering presentation markup via `.phtml` PHP templates.'
        },
        {
            questionText: 'What package manager does Magento utilize to manage modules, dependencies, and core system upgrades?',
            options: ['Composer', 'npm', 'Pip', 'RubyGems'],
            correctAnswer: 'Composer',
            explanation: 'Magento relies entirely on Composer to declare, install, and manage core libraries and third-party extensions.'
        },
        {
            questionText: 'What is the purpose of "Deploy Modes" (Developer, Production, Default) in Magento 2?',
            options: ['Balancing debugging convenience with maximum performance optimization and static asset pre-compilation', 'Controlling whether the store accepts credit cards or cash', 'Toggling between dark mode and light mode admin theme', 'Restricting store access to developer IP addresses only'],
            correctAnswer: 'Balancing debugging convenience with maximum performance optimization and static asset pre-compilation',
            explanation: 'Production mode enables pre-compiled static assets and symlinks with strict caching, while Developer mode displays verbose errors and dynamic asset generation.'
        },
        {
            questionText: 'What security mechanism does Magento incorporate into forms to prevent Cross-Site Request Forgery (CSRF) attacks?',
            options: ['Form Keys (CSRF tokens)', 'Client IP address hashing only', 'Browser user-agent validation only', 'Enforced password re-entry on every button click'],
            correctAnswer: 'Form Keys (CSRF tokens)',
            explanation: 'Magento validates unique cryptographic Form Keys on POST submissions to guarantee the request originated legitimately from the user\'s active session.'
        },
        {
            questionText: 'What is the primary difference between a "Simple Product" and a "Configurable Product" in Magento?',
            options: ['A configurable product presents options (size/color) that map to individual child simple products with independent stock', 'A simple product cannot have a price; a configurable product can', 'A simple product only sells digital downloads; a configurable sells physical goods', 'A configurable product does not require a database record'],
            correctAnswer: 'A configurable product presents options (size/color) that map to individual child simple products with independent stock',
            explanation: 'A Configurable product is a parent container with drop-down attributes (like Size and Color), where each combination maps to a discrete Simple Product with its own SKU and inventory.'
        }
    ]
};

/**
 * Fisher-Yates array shuffle helper
 */
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Generate a randomized sample quiz for a given topic key or title
 * @param {string} topicKeyOrTitle - 'cms', 'wordpress', 'joomla', 'drupal', 'wix', 'shopify', 'magento'
 * @param {number|null} requestedCount - Optional question count; if omitted, randomly picks between 8 and 14 questions!
 */
function getRandomizedSampleQuiz(topicKeyOrTitle, requestedCount = null) {
    const normalizedKey = (topicKeyOrTitle || '').toLowerCase().trim();
    let key = 'cms';
    if (normalizedKey.includes('word') || normalizedKey.includes('wp')) key = 'wordpress';
    else if (normalizedKey.includes('joom')) key = 'joomla';
    else if (normalizedKey.includes('drup')) key = 'drupal';
    else if (normalizedKey.includes('wix')) key = 'wix';
    else if (normalizedKey.includes('shop')) key = 'shopify';
    else if (normalizedKey.includes('magent') || normalizedKey.includes('adobe')) key = 'magento';
    else if (normalizedKey.includes('cms') || normalizedKey.includes('fund')) key = 'cms';

    const bank = SAMPLE_QUESTION_BANKS[key] || SAMPLE_QUESTION_BANKS.cms;

    // Determine randomized question count (between 8 and Math.min(bank.length, 14))
    const minCount = Math.min(7, bank.length);
    const maxCount = Math.min(14, bank.length);
    const count = requestedCount 
        ? Math.min(Math.max(Number(requestedCount) || 8, 3), bank.length)
        : Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;

    // Pick random subset of questions
    const pickedRaw = shuffle(bank).slice(0, count);

    // Format questions with shuffled options
    const formattedQuestions = pickedRaw.map((q, idx) => {
        // Shuffle options
        const shuffledOpts = shuffle(q.options);
        const optionsWithIds = shuffledOpts.map((optText, oIdx) => ({
            id: `opt_${oIdx + 1}`,
            text: optText
        }));

        // Find which option ID corresponds to correctAnswer text
        const correctMatch = optionsWithIds.find(o => o.text.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase());
        const correctId = correctMatch ? correctMatch.id : 'opt_1';

        return {
            id: `q_${Date.now()}_${idx + 1}`,
            questionText: q.questionText,
            options: optionsWithIds,
            correctAnswer: correctId,
            explanation: q.explanation || `Correct answer is: ${q.correctAnswer}`
        };
    });

    const topicTitles = {
        cms: 'CMS Fundamentals & Architecture',
        wordpress: 'WordPress Core & Architecture',
        joomla: 'Joomla Framework & MVC Architecture',
        drupal: 'Drupal Enterprise CMS & Taxonomy',
        wix: 'Wix & Cloud Website Builders',
        shopify: 'Shopify & Hosted E-Commerce',
        magento: 'Magento (Adobe Commerce) Platform'
    };

    return {
        key,
        title: `${topicTitles[key]} Assessment`,
        passingScorePercent: 75,
        timeLimitMinutes: Math.max(10, Math.ceil(count * 1.5)),
        questionCount: formattedQuestions.length,
        questions: formattedQuestions
    };
}

module.exports = {
    SAMPLE_QUESTION_BANKS,
    getRandomizedSampleQuiz,
    shuffle
};

