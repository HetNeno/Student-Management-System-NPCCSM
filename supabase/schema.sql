-- ============================================================================
-- NPCCSM Syllabus Tracker -- Supabase Schema (Production)
-- ============================================================================
--
-- HOW TO APPLY:
--   1. Go to Supabase Dashboard → SQL Editor → New query
--   2. Paste this entire file and hit Run
--
-- DESIGN NOTES:
--   - Curriculum definitions (course code, title, units, topics) live in
--     src/data/syllabusDatabase.js as static JS. The `courses` table below
--     seeds a mirror so SQL queries can JOIN or filter by semester.
--   - Everything that changes at runtime (covered topics, notes, history)
--     lives in Supabase tables.
--   - All data-access logic goes through src/context/SyllabusContext.jsx.
-- ============================================================================

-- ============================================================================
-- COURSES (curriculum master — seeded once, rarely updated)
-- ============================================================================
create table if not exists public.courses (
  id            serial primary key,
  subject_code  text unique not null,   -- e.g. "CAM301-3C"
  title         text not null,
  semester      int  not null check (semester between 1 and 6),
  type          text,                    -- "Major Course • 4 Credits", etc.
  icon_class    text,                    -- FontAwesome class for the UI
  units         jsonb not null default '[]',  -- [{ name, topics: [] }]
  created_at    timestamptz default now()
);

create index if not exists idx_courses_semester
  on public.courses (semester);

-- Seed courses from the bundled syllabus data.
-- Re-run this section after adding new courses to syllabusDatabase.js.
insert into public.courses (subject_code, title, semester, type, icon_class, units) values
  ('CAM201-1C',  'Programming Fundamentals and Problem Solving', 1, 'Major Course • 4 Credits', 'fa-solid fa-code', '[{"name":"Unit I: Intro to Programming & Tools","topics":["Concept of programming language","Algorithm and Flowchart","Translator (Compiler, Interpreter, Linker, Loader)","Overview of C and Structure","Tokens, Constants, Keywords, Identifiers"]},{"name":"Unit II: Basics of C Language","topics":["Arithmetic, Relational & Logical Operators","Bitwise, Conditional & Assignment Operators","Type conversions & Precedence","Mathematical functions (pow, sqrt, ceil, floor)","I/O Functions (printf, scanf, gets)"]},{"name":"Unit III: Control and Iterative Statement","topics":["Decision making (IF, IF ELSE, Nested)","ELSE IF ladder & Switch statement","Looping (WHILE, DO-WHILE, FOR)","Break, continue and Nested Looping"]},{"name":"Unit IV: Array and Strings","topics":["Declaration and initialization of 1D arrays","2D arrays and Multidimensional concepts","Declaring, reading and writing strings","String Handling functions (Copy, Compare, Concat)"]}]'),
  ('CAM202-1C',  'Internet Technology', 1, 'Major Course • 4 Credits', 'fa-solid fa-globe', '[{"name":"Unit I: Intro to Internet","topics":["Internet, Extranet, Intranet","WWW, URL, DNS, FTP, Web Browser","Search Engine usage","Email Communication and Social Networking"]},{"name":"Unit II: Basics of HTML & Forms","topics":["HTML Document Structure & Tags","Text formatting, Lists, Images, Media","HTML Tables & Framesets","HTML Forms and Interactive Fields"]},{"name":"Unit III: Introduction to CSS","topics":["CSS Syntax and Inclusion","CSS Measurement, Colors, Background","CSS Fonts, Text, Links, Tables","ID, Class, Inline, Internal & External Selectors"]},{"name":"Unit IV: Advance CSS & CSS3","topics":["CSS Visibility, Positioning, Layers","CSS3 Rounded corners, Gradients, Shadows","2D and 3D Transform","User Interface and Box Sizing"]}]'),
  ('CAE201-1C',  'Digital Electronics', 1, 'Minor Course • 4 Credits', 'fa-solid fa-microchip', '[{"name":"Unit I: Components of a Computer","topics":["Generation & Classification of Computer","Input/Output Devices","Processing Device (CPU, ALU, CU)","Primary & Secondary Storage (RAM, ROM)"]},{"name":"Unit II: Number systems and Codes","topics":["Decimal & Binary conversions","Hexadecimal conversions","BCD numbers"]},{"name":"Unit III: Logic gates and ALU","topics":["Basic Gates (OR, AND, NOT)","NOR, NAND, XOR, XNOR","De Morgan''s theorems","Multiplexers and Inverter"]},{"name":"Unit IV: Boolean Algebra","topics":["Instruction Cycle/CPU Operation","Binary addition and subtraction","Half/Full Adders & 2''s Complement","Flip-Flops (RS, D, JK)"]}]'),
  ('MDC201-1C',  'Mathematics for Computer Science', 1, 'MDC • 4 Credits', 'fa-solid fa-square-root-variable', '[{"name":"Unit I: Set Theory","topics":["Representation of Sets & Types","Set Operations (Union, Intersection)","De Morgan''s Laws","Cartesian Product of Set"]},{"name":"Unit II: Matrices","topics":["Types of Matrices","Operations (Addition, Scalar, Multiplication)","Determinant, Adjoint and Inverse","System of Linear Eq (Cramer''s, Gauss)"]},{"name":"Unit III: Graph","topics":["Types of Graphs (Directed, Undirected)","Representation (Adjacency, Incidence)","Traversals (BFS, DFS)","Dijkstra''s algorithm"]},{"name":"Unit IV: Functions","topics":["Relations, Domain, Range","Function Types (One-one, Onto, Into)","Algebra of real functions"]}]'),
  ('AEC202-1C',  'Communication Skills', 1, 'AEC • 2 Credits', 'fa-solid fa-comments', '[{"name":"Unit I: Fundamentals of Communication","topics":["Process of Communication","7 C''s of Communication","Barriers to Effective Communication","Active VS Passive listening"]},{"name":"Unit II: Types of Communication","topics":["Verbal (Oral and written)","Non-verbal (Kinesics, Proxemics)","Telephonic Skills","Conversations and Reading comprehension"]},{"name":"Unit III: Professional Comm in Practice","topics":["Presentation skills","Group discussion techniques","Email writing etiquettes","Meetings agenda and minutes"]}]'),
  ('CAM203-1C',  'Programming in ''C''', 2, 'Major Course • 4 Credits', 'fa-solid fa-c', '[{"name":"Unit I: User-Defined Functions","topics":["Function definition, call and declaration","Categories of functions","Nesting of functions","Recursion"]},{"name":"Unit II: Structures and Unions","topics":["Structure declaration and initialization","Array of structures & Nested Structures","Union definition and initialization","Comparison of Structure and Union"]},{"name":"Unit III: Pointers","topics":["Declaring and initializing pointers","Pointer expressions and scale factor","Pointers and arrays","Pointers and functions"]},{"name":"Unit IV: File Management & Dynamic Mem","topics":["Defining, opening, closing a file","File handling functions","Command line arguments","Dynamic Memory (malloc, calloc, free, realloc)"]}]'),
  ('CAM204-1C',  'Database Management System', 2, 'Major Course • 4 Credits', 'fa-solid fa-database', '[{"name":"Unit I: Intro to DBMS & Data Modeling","topics":["Database Models (Hierarchical, Relational)","Entity types, attributes and keys","ER diagrams"]},{"name":"Unit II: Relational Database Model","topics":["Connectivity, Cardinality, Aggregation","Keys (Primary, Foreign, Candidate)","Relational Set Operators"]},{"name":"Unit III: Introduction to SQL","topics":["SQL Statements: DDL, DML, DCL, TCL","Creating, Modifying and Deleting Tables","Queries: Insert, Select, Update, Delete"]},{"name":"Unit IV: Advanced SQL","topics":["Logical operators (BETWEEN, IN, AND, OR)","Aggregate functions (Count, Sum, Avg)","Grouping, Having Clause","Joins (Self, Inner & Outer)"]}]'),
  ('CAE202-1C',  'Software Engineering', 2, 'Minor Course • 4 Credits', 'fa-solid fa-code-branch', '[{"name":"Unit I: Intro to SE & Req Analysis","topics":["Software Process Models (RAD, Agile)","Software Requirement Specification (SRS)","Requirement Elicitation"]},{"name":"Unit II: Managing Project & Design","topics":["Software Metrics & Estimation","Risk Analysis & Management","Component Level Design (Function, Object)","User Interface & Web App Design"]},{"name":"Unit III: Software Coding & Testing","topics":["Coding Standard and Guidelines","Testing Strategies & Test Cases","White Box & Black Box Testing","Testing Tools"]},{"name":"Unit IV: QA and Management","topics":["Software Quality Assurance (SQA)","Quality Standards (ISO 9000, CMM)","Software Maintenance Types","Version Control and Change Control"]}]'),
  ('MDC202-1C',  'Computer Oriented Num & Stat Methods', 2, 'MDC • 4 Credits', 'fa-solid fa-chart-line', '[{"name":"Unit I: Numerical Errors","topics":["Types of errors (Absolute, Relative, Round Off)","Floating point numbers"]},{"name":"Unit II: Numerical Interpolation","topics":["Interpolation & Extrapolation","Forward and Backward Differences","Newton''s Formula","Lagrange Interpolation"]},{"name":"Unit III: Central Tendency & Dispersion","topics":["Types of Data (Discrete, Continuous)","Mean, Median, Mode","Range, Variance, Standard Deviation"]},{"name":"Unit IV: Correlation and Regression","topics":["Correlation Types & Coefficients","Scatter Diagram, Karl Pearson''s Method","Spearman''s Rank Method","Regression lines"]}]'),
  ('CAM205-2C',  'Data Structures and Algorithms', 3, 'Major Course • 4 Credits', 'fa-solid fa-network-wired', '[{"name":"Unit I: Intro to Data Structure & Array","topics":["Primitive vs Non-Primitive data structure","Array Operations (Insert, Delete, Search)"]},{"name":"Unit II: Stack and Queue","topics":["Stack Operations (PUSH, POP, PEEP)","Infix-Prefix-Postfix conversions","Simple Queue and Circular Queue"]},{"name":"Unit III: Linked List","topics":["Singly Linked List","Circular Linked List","Doubly Linked List Operations"]},{"name":"Unit IV: Tree, Sorting & Searching","topics":["Binary Search Tree (Creation, Insert, Delete)","Tree Traversal (In, Pre, Post-Order)","Sorting (Insertion, Selection, Bubble, Quick)","Searching (Linear, Binary)"]}]'),
  ('CAM206-2C',  'Object Oriented Programming with C++', 3, 'Major Course • 4 Credits', 'fa-brands fa-cuttlefish', '[{"name":"Unit I: OOP Concepts & C++ Basics","topics":["Procedural Vs. Object Oriented","I/O Operator, Variables, Data types"]},{"name":"Unit II: Functions & Classes","topics":["Function Overloading & Inline Function","Access Specifiers (private, public)","Array of Objects"]},{"name":"Unit III: Constructors & Inheritance","topics":["Types of Constructor & Destructor","Inheritance Types (Single, Multiple, Multilevel)","Virtual Base class, Abstract class"]},{"name":"Unit IV: Operator Overloading & Exceptions","topics":["Overloading Unary/Binary Operators","Virtual Functions","Exception Handling (try, throw, catch)"]}]'),
  ('CAM207-2C',  'Advanced Database Management System', 3, 'Major Course • 4 Credits', 'fa-solid fa-server', '[{"name":"Unit I: SQL Commands & Normalization","topics":["DDL, DML, DCL and TCL","Data Anomalies","1NF, 2NF, 3NF, BCNF, 4NF"]},{"name":"Unit II: PL/SQL Overview","topics":["PL/SQL Architecture & Blocks","Control Structures (IF, CASE, LOOP)","Stored Procedures and Functions"]},{"name":"Unit III: Exception Handling & Cursor","topics":["Built-in exceptions (ZERO_DIVIDE)","Working with Cursors (OPEN, FETCH)"]},{"name":"Unit IV: Triggers & Index","topics":["Trigger Creation & Implementation","Index Creation (Unique Index)"]}]'),
  ('CAM208-2C',  'Python Programming', 4, 'Major Course • 4 Credits', 'fa-brands fa-python', '[{"name":"Unit I: Intro to Python & Control Statements","topics":["Python Features & Interpreter","Data types, Variables, Operators","IF, ELIF, MATCH...CASE","WHILE, FOR Loops, break, continue"]},{"name":"Unit II: Data Structures","topics":["Lists (append, insert, pop, slice)","Tuples (index, count)","Dictionaries (keys, values, nested)","Strings and Sets"]},{"name":"Unit III: Functions & File Handling","topics":["Defining functions, Lambda functions","map, filter, reduce","File modes (read, write, append)","read(), write(), seek()"]},{"name":"Unit IV: Classes, Exceptions & Libraries","topics":["Classes, Encapsulation, Inheritance","Try-except-else-finally block","Importing Pandas, Numpy, Matplotlib"]}]'),
  ('CAM209-2C',  'Web Design and Development', 4, 'Major Course • 4 Credits', 'fa-brands fa-php', '[{"name":"Unit I: Intro to PHP","topics":["Relationship between PHP, MySQL, Apache","Variables, Data types, Type casting","Control and Looping Statements"]},{"name":"Unit II: Array and User Define Functions","topics":["Numeric and Associated Array","Function parameters & Return statement","Built-in String & Math functions"]},{"name":"Unit III: Form Handling","topics":["HTTP methods: GET and POST","Server-side validation","Date and Super-Global Variables"]},{"name":"Unit IV: Cookies and MySQL","topics":["Create, fetch, delete cookies","MySQL structure and syntax","Integration of PHP with MySQL (CRUD)"]}]'),
  ('CAM210-2C',  'Operating System', 4, 'Major Course • 4 Credits', 'fa-brands fa-linux', '[{"name":"Unit I: OS & Process Management","topics":["Process States & PCB","Schedulers","Process Scheduling Algorithms (FCFS, SJF, RR)"]},{"name":"Unit II: Deadlock, Memory & File","topics":["Deadlock Detection & Recovery","Swapping & Paging","Disk Scheduling algorithms"]},{"name":"Unit III: Linux Commands","topics":["Basic commands (mkdir, cp, ls, ps)","Finding Patterns (grep)","Sorting and Comparing Files"]},{"name":"Unit IV: Basic Shell Script","topics":["Arithmetic operations in script","Loops (for, while, until)","Conditional Statements (if else)"]}]'),
  ('CAE203-2C',  'Data Communication and Network', 4, 'Minor Course • 4 Credits', 'fa-solid fa-wifi', '[{"name":"Unit I: Analog/Digital Signals","topics":["Bandwidth, Throughput, Latency","Transmission modes (Simplex, Duplex)","Error Detection (Parity, Checksum, CRC)"]},{"name":"Unit II: Intro to Networking","topics":["Host, Workstation, Server","Types (LAN, WAN, MAN)","Physical topologies (bus, star, ring)"]},{"name":"Unit III: OSI Model and Guided Media","topics":["OSI model layers","TCP/IP protocol suite","Guided Media (Twisted pair, Fiber optics)","Unguided Media (Radio, Bluetooth, Wi-Fi)"]},{"name":"Unit IV: IP Protocol","topics":["IP v4, IP v6 Addressing","DNS, Email, FTP, HTTP","Network Devices (Hubs, Switches, Routers)"]}]'),
  ('CAM301-3C',  'Object Oriented Programming using Java', 5, 'Major Course • 4 Credits', 'fa-brands fa-java', '[{"name":"Unit I: Intro to Java & Basics","topics":["JDK, JRE, and JVM architecture","Data types, Variables, Operators","Control statements (Conditional & Loops)"]},{"name":"Unit II: OOP Concepts","topics":["Classes, Objects, Constructors","Inheritance (Single, Multilevel)","Polymorphism, Abstraction, Encapsulation"]},{"name":"Unit III: Exceptions & Collections","topics":["Checked vs. Unchecked exceptions","try, catch, finally, custom exceptions","List, Set, Map interfaces (ArrayList, HashMap)"]},{"name":"Unit IV: Multithreading & GUI","topics":["Thread lifecycle and Synchronization","File handling using java.io","GUI Programming with AWT components"]}]'),
  ('CAM302-3C',  'Next Generation Database', 5, 'Major Course • 4 Credits', 'fa-solid fa-leaf', '[{"name":"Unit I: Intro to NoSQL and MongoDB","topics":["Relational vs. NoSQL Databases","MongoDB Installation and Setup","MongoDB Shell (mongosh)"]},{"name":"Unit II: Architecture & CRUD","topics":["Data Model (Documents, Collections)","Replica Sets, Sharding","Create, Read, Update, Delete","Indexing and Performance Tuning"]},{"name":"Unit III: Data Modeling","topics":["Schema Design Best Practices","Embedding vs. Referencing","Schema Validation Implementation"]},{"name":"Unit IV: Aggregation Framework","topics":["Pipeline Stages (Match, Group, Project)","Complex Aggregation Scenarios","Performance Tuning"]}]'),
  ('CAM303-3C',  'Software Testing', 5, 'Major Course • 4 Credits', 'fa-solid fa-bug', '[{"name":"Unit I: Intro to Software Testing","topics":["SDLC and STLC","White Box, Black Box, Grey Box","Levels (Unit, Integration, System, Acceptance)","Smoke and Sanity Testing"]},{"name":"Unit II: Test Case Design","topics":["Equivalence Partitioning, BVA","Decision Table & State Transition","Test Case Format and Data Preparation"]},{"name":"Unit III: Advanced Testing & QA","topics":["Performance, Security, Usability Testing","Compatibility Testing","Quality Control vs Quality Assurance"]},{"name":"Unit IV: Defect Tracking & Planning","topics":["Bug Life Cycle Stages","Test Organization & Planning","Detailed Test Design"]}]'),
  ('CAE301-3C',  'Enterprise Resource Planning', 5, 'Minor Course • 4 Credits', 'fa-solid fa-industry', '[{"name":"Unit I: Intro to ERP","topics":["Evolution of ERP & Structure","Two-tier & Three-tier Architecture","Demand Management"]},{"name":"Unit II: Functional Modules","topics":["Manufacturing, Financial, Distribution","Master Production Scheduling Module","Purchase Control Module"]},{"name":"Unit III: ERP Implementation","topics":["Implementation Life Cycle","Phases of Implementation","Reasons for failure"]},{"name":"Unit IV: ERP Vendor Analysis","topics":["Major Vendors (SAP, Oracle, PeopleSoft)","Case Study: Nestle GLOBE","Case Study: Maruti Suzuki"]}]'),
  ('CAE302-3C',  'Cyber Security', 5, 'Minor Course • 4 Credits', 'fa-solid fa-shield-halved', '[{"name":"Unit I: Cyberspace Definition","topics":["Architecture of cyberspace","Regulation of cyberspace","Issues and challenges of cyber security"]},{"name":"Unit II: Classification of cybercrimes","topics":["Financial frauds, Social engineering","Malware, Ransomware, Zero day attacks","Remedial and mitigation measures"]},{"name":"Unit III: Social Networks Security","topics":["Social media privacy issues","Reporting of inappropriate content","Laws and best practices"]},{"name":"Unit IV: E-Commerce & Payments","topics":["Digital payments components & frauds","RBI guidelines on digital payments","IT Act 2000 and amendments"]}]')
on conflict (subject_code) do nothing;


-- ============================================================================
-- USERS (authentication & roles)
-- ============================================================================
create table if not exists public.users (
  id           uuid default gen_random_uuid() primary key,
  username     text unique not null,
  password     text not null,                    -- TODO: hash with bcrypt
  role         text not null check (role in ('student', 'teacher', 'principal')),
  name         text not null,
  department   text,
  created_at   timestamptz default now()
);

create index if not exists idx_users_username
  on public.users (username);

create index if not exists idx_users_role
  on public.users (role);

alter table public.users enable row level security;

drop policy if exists "public read users" on public.users;
create policy "public read users"
  on public.users for select
  using (true);

-- Seed demo users
insert into public.users (username, password, role, name, department) values
  ('student',    'student123',    'student',    'Student User',            'Computer Science'),
  ('teacher',    'teacher123',    'teacher',    'Prof. Het Gajjar',        'Faculty of CS & IT'),
  ('principal',  'principal123',  'principal',  'Dr. Principal',           'Administration')
on conflict (username) do nothing;


-- ============================================================================
-- SYLLABUS_PROGRESS (current live state — what Principal/Student read)
-- ============================================================================
create table if not exists public.syllabus_progress (
  subject_code   text primary key,
  title          text not null,
  semester       int  not null check (semester between 1 and 6),
  covered_topics jsonb not null default '[]',     -- string[]
  topic_notes    jsonb not null default '{}',     -- { topicName: noteText }
  overall_notes  text,
  faculty_name   text,
  last_updated   date,
  updated_at     timestamptz not null default now()
);

create index if not exists idx_progress_semester
  on public.syllabus_progress (semester);

alter table public.syllabus_progress enable row level security;

drop policy if exists "public read progress"   on public.syllabus_progress;
drop policy if exists "public write progress"  on public.syllabus_progress;

create policy "public read progress"
  on public.syllabus_progress for select
  using (true);

-- Writes are open for now (app is the only writer).
-- Once you add Supabase Auth, replace with:
--   using (auth.jwt().role in (''authenticated'',''service_role''))
create policy "public write progress"
  on public.syllabus_progress for all
  using (true) with check (true);


-- ============================================================================
-- SYLLABUS_HISTORY (append-only audit log — one row per publish action)
-- ============================================================================
create table if not exists public.syllabus_history (
  id             bigint generated always as identity primary key,
  subject_code   text not null,
  title          text not null,
  semester       int  not null check (semester between 1 and 6),
  faculty_name   text,
  lecture_date   date,
  covered_topics jsonb not null default '[]',
  topic_notes    jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

create index if not exists idx_history_subject_code
  on public.syllabus_history (subject_code);

create index if not exists idx_history_created_at
  on public.syllabus_history (created_at desc);

alter table public.syllabus_history enable row level security;

drop policy if exists "public read history"    on public.syllabus_history;
drop policy if exists "public write history"   on public.syllabus_history;

create policy "public read history"
  on public.syllabus_history for select
  using (true);

create policy "public write history"
  on public.syllabus_history for insert
  with check (true);


-- ============================================================================
-- TEACHER_SUBMISSIONS (submission log)
-- ============================================================================
create table if not exists public.teacher_submissions (
  id             uuid default gen_random_uuid() primary key,
  subject_code   text not null,
  lecture_date   date,
  covered_topic  jsonb not null default '[]',
  mandatory_note jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

create index if not exists idx_submissions_subject_code
  on public.teacher_submissions (subject_code);

create index if not exists idx_submissions_created_at
  on public.teacher_submissions (created_at desc);

alter table public.teacher_submissions enable row level security;

drop policy if exists "public read teacher_submissions"    on public.teacher_submissions;
drop policy if exists "public write teacher_submissions"   on public.teacher_submissions;

create policy "public read teacher_submissions"
  on public.teacher_submissions for select
  using (true);

create policy "public write teacher_submissions"
  on public.teacher_submissions for insert
  with check (true);


-- ============================================================================
-- FACULTY_LECTURE_UPDATES (primary live source — Realtime-enabled)
-- The app reads this table as the source of truth. Most recent row per
-- subject_code wins.
-- ============================================================================
create table if not exists public.faculty_lecture_updates (
  id             uuid default gen_random_uuid() primary key,
  subject_code   text not null,
  title          text,
  semester       int,
  faculty_name   text,
  lecture_date   date,
  covered_topic  jsonb not null default '[]',
  mandatory_note jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

create index if not exists idx_flu_subject_code
  on public.faculty_lecture_updates (subject_code);

create index if not exists idx_flu_created_at
  on public.faculty_lecture_updates (created_at desc);

alter table public.faculty_lecture_updates enable row level security;

drop policy if exists "public read faculty_lecture_updates"    on public.faculty_lecture_updates;
drop policy if exists "public write faculty_lecture_updates"   on public.faculty_lecture_updates;

create policy "public read faculty_lecture_updates"
  on public.faculty_lecture_updates for select
  using (true);

create policy "public write faculty_lecture_updates"
  on public.faculty_lecture_updates for insert
  with check (true);


-- ============================================================================
-- CHATBOT_NOTES (per-user study notes for "Nova" chatbot)
-- Replaces the localStorage-only storage used by the student chatbot.
-- ============================================================================
create table if not exists public.chatbot_notes (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid not null,                       -- FK to users.id
  subject_code  text not null,
  notes         jsonb not null default '{}',         -- { topicName: noteText }
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create unique index if not exists idx_chatbot_notes_user_subject
  on public.chatbot_notes (user_id, subject_code);

alter table public.chatbot_notes enable row level security;

drop policy if exists "user read own notes"   on public.chatbot_notes;
drop policy if exists "user write own notes"  on public.chatbot_notes;

-- Users can only read/write their own notes
create policy "user read own notes"
  on public.chatbot_notes for select
  using (user_id = auth.uid());

create policy "user write own notes"
  on public.chatbot_notes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());


-- ============================================================================
-- REALTIME (subscribe to changes in the browser)
-- ============================================================================
alter publication supabase_realtime add table public.syllabus_progress;
alter publication supabase_realtime add table public.teacher_submissions;
alter publication supabase_realtime add table public.faculty_lecture_updates;


-- ============================================================================
-- HELPFUL VIEWS (optional — useful for reporting dashboards)
-- ============================================================================

-- View: one row per subject with its latest lecture date and faculty
create or replace view public.v_subject_latest as
select
  subject_code,
  title,
  semester,
  max(lecture_date)  as last_lecture_date,
  max(faculty_name)  filter (where lecture_date = max(lecture_date)) as last_faculty,
  count(*)           as total_lectures
from public.faculty_lecture_updates
group by subject_code, title, semester;

-- View: completion percentage per subject (topics covered / total topics)
-- Joins against the courses master so total topic count is accurate.
create or replace view public.v_subject_completion as
select
  p.subject_code,
  p.title,
  p.semester,
  p.covered_topics,
  p.overall_notes,
  p.faculty_name,
  p.last_updated,
  jsonb_array_length(p.covered_topics)                                     as topics_covered,
  coalesce(jsonb_array_length(c.units->0->'topics'), 0)                    as total_topics,
  round(
    (jsonb_array_length(p.covered_topics)::numeric /
     nullif(coalesce(
       (select sum(jsonb_array_length(u->'topics')) from jsonb_array_elements(c.units) as u),
       jsonb_array_length(p.covered_topics)
     ), 0)
    ) * 100, 1)                                                            as completion_pct
from public.syllabus_progress p
join public.courses c on c.subject_code = p.subject_code;

-- View: overall progress per semester (aggregated for the Principal dashboard)
create or replace view public.v_semester_progress as
select
  semester,
  count(*)                                         as subject_count,
  sum(jsonb_array_length(covered_topics))          as total_topics_covered,
  sum(
    coalesce(
      (select sum(jsonb_array_length(u->'topics')) from jsonb_array_elements(c.units) as u),
      jsonb_array_length(covered_topics)
    )
  )                                               as total_topics_possible,
  round(
    (sum(jsonb_array_length(covered_topics))::numeric /
     nullif(sum(
       coalesce(
         (select sum(jsonb_array_length(u->'topics')) from jsonb_array_elements(c.units) as u),
         jsonb_array_length(covered_topics)
       )
     ), 0)
    ) * 100, 1)                                   as completion_pct
from public.syllabus_progress p
join public.courses c on c.subject_code = p.subject_code
group by semester
order by semester;
