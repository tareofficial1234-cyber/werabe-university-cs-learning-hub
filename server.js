const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const multer = require("multer");
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
fs.mkdirSync(path.join(ROOT, "data"), { recursive: true });
const db = new Database(path.join(ROOT, "data", "werabe.db"));
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

fs.mkdirSync(path.join(ROOT, "uploads"), { recursive: true });

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "CHANGE_THIS_SESSION_SECRET_BEFORE_PRODUCTION",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 8,
    },
  }),
);
app.use(express.static(path.join(ROOT, "public")));
app.use("/uploads", express.static(path.join(ROOT, "uploads")));

db.exec(`
CREATE TABLE IF NOT EXISTS users(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 email TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('student','teacher','admin')),
 year TEXT DEFAULT '',
 section TEXT DEFAULT '',
 department TEXT DEFAULT 'Computer Science',
 bio TEXT DEFAULT '',
 isActive INTEGER DEFAULT 1,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS courses(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 code TEXT UNIQUE NOT NULL,
 title TEXT NOT NULL,
 description TEXT DEFAULT '',
 credit_hours INTEGER DEFAULT 3,
 teacher_id INTEGER,
 published INTEGER DEFAULT 1,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(teacher_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS enrollments(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 course_id INTEGER NOT NULL,
 progress REAL DEFAULT 0,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(user_id,course_id),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS materials(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 title TEXT NOT NULL,
 description TEXT DEFAULT '',
 type TEXT NOT NULL,
 file_url TEXT NOT NULL,
 file_size INTEGER DEFAULT 0,
 course_id INTEGER NOT NULL,
 uploaded_by INTEGER NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
 FOREIGN KEY(uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS videos(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 title TEXT NOT NULL,
 description TEXT DEFAULT '',
 url TEXT NOT NULL,
 duration TEXT DEFAULT '',
 course_id INTEGER NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS video_progress(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 video_id INTEGER NOT NULL,
 completed INTEGER DEFAULT 0,
 UNIQUE(user_id,video_id),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY(video_id) REFERENCES videos(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS quizzes(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 title TEXT NOT NULL,
 description TEXT DEFAULT '',
 course_id INTEGER NOT NULL,
 time_limit INTEGER DEFAULT 20,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS questions(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 quiz_id INTEGER NOT NULL,
 question TEXT NOT NULL,
 option_a TEXT NOT NULL,
 option_b TEXT NOT NULL,
 option_c TEXT NOT NULL,
 option_d TEXT NOT NULL,
 answer TEXT NOT NULL,
 FOREIGN KEY(quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS quiz_attempts(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 quiz_id INTEGER NOT NULL,
 user_id INTEGER NOT NULL,
 score REAL NOT NULL,
 answers_json TEXT NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS assignments(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 title TEXT NOT NULL,
 description TEXT DEFAULT '',
 deadline TEXT,
 course_id INTEGER NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS submissions(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 assignment_id INTEGER NOT NULL,
 user_id INTEGER NOT NULL,
 answer TEXT DEFAULT '',
 file_url TEXT DEFAULT '',
 grade REAL,
 feedback TEXT DEFAULT '',
 submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(assignment_id,user_id),
 FOREIGN KEY(assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS discussions(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 title TEXT NOT NULL,
 content TEXT NOT NULL,
 course_id INTEGER NOT NULL,
 user_id INTEGER NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS replies(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 discussion_id INTEGER NOT NULL,
 content TEXT NOT NULL,
 user_id INTEGER NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(discussion_id) REFERENCES discussions(id) ON DELETE CASCADE,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS announcements(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 title TEXT NOT NULL,
 content TEXT NOT NULL,
 course_id INTEGER,
 user_id INTEGER NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS bookmarks(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 material_id INTEGER NOT NULL,
 UNIQUE(user_id,material_id),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY(material_id) REFERENCES materials(id) ON DELETE CASCADE
);
`);

// Lightweight migration for older local databases.
const userColumns = db
  .prepare("PRAGMA table_info(users)")
  .all()
  .map((x) => x.name);
if (!userColumns.includes("isActive")) {
  db.exec("ALTER TABLE users ADD COLUMN isActive INTEGER DEFAULT 1");
}

function seed() {
  const count = db.prepare("SELECT COUNT(*) c FROM users").get().c;
  if (count) return;
  const hash = (p) => bcrypt.hashSync(p, 12);
  const addUser = db.prepare(
    "INSERT INTO users(name,email,password_hash,role,year,section) VALUES(?,?,?,?,?,?)",
  );
  const admin = addUser.run(
    "System Administrator",
    "admin@werabe.edu.et",
    hash("Admin@12345"),
    "admin",
    "",
    "",
  );
  const teacher = addUser.run(
    "CS Instructor",
    "teacher@werabe.edu.et",
    hash("Teacher@12345"),
    "teacher",
    "",
    "",
  );
  const student = addUser.run(
    "Demo Student",
    "student@werabe.edu.et",
    hash("Student@12345"),
    "student",
    "2",
    "A",
  );
  const addCourse = db.prepare(
    "INSERT INTO courses(code,title,description,credit_hours,teacher_id) VALUES(?,?,?,?,?)",
  );
  const c1 = addCourse.run(
    "CS101",
    "Programming Fundamentals",
    "Learn programming concepts, problem solving, variables, conditions, loops and functions.",
    3,
    teacher.lastInsertRowid,
  );
  const c2 = addCourse.run(
    "CS201",
    "Data Structures",
    "Arrays, linked lists, stacks, queues, trees, graphs and algorithmic thinking.",
    3,
    teacher.lastInsertRowid,
  );
  const c3 = addCourse.run(
    "CS203",
    "Database Systems",
    "Relational databases, SQL, normalization and database design.",
    3,
    teacher.lastInsertRowid,
  );
  const enroll = db.prepare(
    "INSERT INTO enrollments(user_id,course_id,progress) VALUES(?,?,?)",
  );
  enroll.run(student.lastInsertRowid, c1.lastInsertRowid, 68);
  enroll.run(student.lastInsertRowid, c2.lastInsertRowid, 42);
  enroll.run(student.lastInsertRowid, c3.lastInsertRowid, 25);
  const mat = db.prepare(
    "INSERT INTO materials(title,description,type,file_url,file_size,course_id,uploaded_by) VALUES(?,?,?,?,?,?,?)",
  );
  mat.run(
    "Programming Fundamentals - Lecture 01",
    "Introduction to programming concepts",
    "PDF",
    "https://example.com/programming-lecture-01.pdf",
    0,
    c1.lastInsertRowid,
    teacher.lastInsertRowid,
  );
  mat.run(
    "Data Structures - Chapter 1",
    "Introduction to data structures",
    "PPT",
    "https://example.com/data-structures.pptx",
    0,
    c2.lastInsertRowid,
    teacher.lastInsertRowid,
  );
  const vid = db.prepare(
    "INSERT INTO videos(title,description,url,duration,course_id) VALUES(?,?,?,?,?)",
  );
  vid.run(
    "C++ Programming Introduction",
    "Variables, data types and your first program",
    "https://www.youtube.com/watch?v=8jLOx1hD3_o",
    "18 min",
    c1.lastInsertRowid,
  );
  vid.run(
    "Data Structures Introduction",
    "Why data structures matter",
    "https://www.youtube.com/watch?v=RBSGKlAvoiM",
    "22 min",
    c2.lastInsertRowid,
  );
  const q = db.prepare(
    "INSERT INTO quizzes(title,description,course_id,time_limit) VALUES(?,?,?,?)",
  );
  const quiz = q.run(
    "Programming Fundamentals Quick Quiz",
    "Test your basic programming knowledge.",
    c1.lastInsertRowid,
    10,
  );
  const ques = db.prepare(
    "INSERT INTO questions(quiz_id,question,option_a,option_b,option_c,option_d,answer) VALUES(?,?,?,?,?,?,?)",
  );
  ques.run(
    quiz.lastInsertRowid,
    "Which data type stores whole numbers?",
    "int",
    "string",
    "boolean",
    "float",
    "A",
  );
  ques.run(
    quiz.lastInsertRowid,
    "Which keyword creates a function in JavaScript?",
    "func",
    "function",
    "define",
    "method",
    "B",
  );
  const asn = db.prepare(
    "INSERT INTO assignments(title,description,deadline,course_id) VALUES(?,?,?,?)",
  );
  asn.run(
    "C++ Functions Practice",
    "Write three small programs demonstrating functions.",
    "2026-10-20",
    c1.lastInsertRowid,
  );
  const ann = db.prepare(
    "INSERT INTO announcements(title,content,course_id,user_id) VALUES(?,?,?,?)",
  );
  ann.run(
    "Welcome to the Learning Hub",
    "Welcome students. Check your courses and complete the practice quiz.",
    null,
    admin.lastInsertRowid,
  );
  ann.run(
    "Programming Fundamentals Update",
    "Lecture materials and a practice quiz are now available.",
    c1.lastInsertRowid,
    teacher.lastInsertRowid,
  );
}
seed();

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(ROOT, "uploads")),
    filename: (_req, file, cb) =>
      cb(
        null,
        Date.now() + "-" + file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_"),
      ),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(pdf|ppt|pptx|doc|docx|zip|txt|jpg|jpeg|png)$/i.test(
      file.originalname,
    );
    cb(allowed ? null : new Error("Unsupported file type"), allowed);
  },
});

const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(ROOT, "uploads")),
    filename: (_req, file, cb) =>
      cb(
        null,
        "video-" +
          Date.now() +
          "-" +
          file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_"),
      ),
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(mp4|webm|ogg|mov|m4v)$/i.test(file.originalname);
    cb(
      allowed
        ? null
        : new Error("Unsupported video type. Use MP4, WebM, OGG, MOV or M4V."),
      allowed,
    );
  },
});

const auth = (req, res, next) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Login required" });
  next();
};
const role =
  (...roles) =>
  (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role))
      return res.status(403).json({ error: "Permission denied" });
    next();
  };
const user = (req) => req.session.user;

app.post("/api/auth/register", (req, res) => {
  const { name, email, password, year, section } = req.body;
  if (!name || !email || !password || password.length < 8)
    return res
      .status(400)
      .json({
        error:
          "Name, email and a password of at least 8 characters are required",
      });
  try {
    const r = db
      .prepare(
        "INSERT INTO users(name,email,password_hash,role,year,section) VALUES(?,?,?,?,?,?)",
      )
      .run(
        name.trim(),
        email.toLowerCase().trim(),
        bcrypt.hashSync(password, 12),
        "student",
        year || "",
        section || "",
      );
    req.session.user = {
      id: r.lastInsertRowid,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: "student",
    };
    res.json({ user: req.session.user });
  } catch (e) {
    res.status(400).json({ error: "Email is already registered" });
  }
});
app.post("/api/auth/login", (req, res) => {
  const u = db
    .prepare("SELECT * FROM users WHERE email=?")
    .get((req.body.email || "").toLowerCase().trim());
  if (
    !u ||
    !u.isActive ||
    !bcrypt.compareSync(req.body.password || "", u.password_hash)
  )
    return res.status(401).json({ error: "Invalid email or password" });
  req.session.user = {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    year: u.year,
    section: u.section,
  };
  res.json({ user: req.session.user });
});
app.post("/api/auth/logout", (req, res) =>
  req.session.destroy(() => res.json({ ok: true })),
);
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, app: "Werabe CS Learning Hub" }),
);

app.get("/api/auth/me", (req, res) => res.json({ user: user(req) || null }));

app.get("/api/dashboard", auth, (req, res) => {
  const uid = user(req).id;
  const courses = db
    .prepare(
      `SELECT c.*, e.progress FROM courses c JOIN enrollments e ON e.course_id=c.id WHERE e.user_id=? ORDER BY c.title`,
    )
    .all(uid);
  const announcements = db
    .prepare(
      `SELECT a.*, c.title course_title, u.name author FROM announcements a LEFT JOIN courses c ON c.id=a.course_id JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 6`,
    )
    .all();
  const quizzes = db
    .prepare(
      `SELECT q.*,c.title course_title FROM quizzes q JOIN courses c ON c.id=q.course_id ORDER BY q.created_at DESC LIMIT 5`,
    )
    .all();
  const assignments = db
    .prepare(
      `SELECT a.*,c.title course_title FROM assignments a JOIN courses c ON c.id=a.course_id ORDER BY a.deadline LIMIT 5`,
    )
    .all();
  const stats = {
    enrolled: courses.length,
    materials: db.prepare("SELECT COUNT(*) c FROM materials").get().c,
    videos: db.prepare("SELECT COUNT(*) c FROM videos").get().c,
    discussions: db.prepare("SELECT COUNT(*) c FROM discussions").get().c,
  };
  res.json({ courses, announcements, quizzes, assignments, stats });
});

app.get("/api/courses", (req, res) => {
  const courses = db
    .prepare(
      `SELECT c.*,u.name teacher,
 (SELECT COUNT(*) FROM enrollments e WHERE e.course_id=c.id) students
 FROM courses c LEFT JOIN users u ON u.id=c.teacher_id WHERE c.published=1 ORDER BY c.title`,
    )
    .all();
  res.json(courses);
});
app.get("/api/courses/:id", auth, (req, res) => {
  const c = db
    .prepare(
      `SELECT c.*,u.name teacher FROM courses c LEFT JOIN users u ON u.id=c.teacher_id WHERE c.id=?`,
    )
    .get(req.params.id);
  if (!c) return res.status(404).json({ error: "Course not found" });
  const materials = db
    .prepare(
      "SELECT m.*,u.name uploader FROM materials m JOIN users u ON u.id=m.uploaded_by WHERE m.course_id=? ORDER BY m.created_at DESC",
    )
    .all(req.params.id);
  const videos = db
    .prepare("SELECT * FROM videos WHERE course_id=? ORDER BY created_at DESC")
    .all(req.params.id);
  const quizzes = db
    .prepare("SELECT * FROM quizzes WHERE course_id=? ORDER BY created_at DESC")
    .all(req.params.id);
  const assignments = db
    .prepare("SELECT * FROM assignments WHERE course_id=? ORDER BY deadline")
    .all(req.params.id);
  const discussions = db
    .prepare(
      `SELECT d.*,u.name author,(SELECT COUNT(*) FROM replies r WHERE r.discussion_id=d.id) replies FROM discussions d JOIN users u ON u.id=d.user_id WHERE d.course_id=? ORDER BY d.created_at DESC`,
    )
    .all(req.params.id);
  const enrollment = db
    .prepare("SELECT * FROM enrollments WHERE user_id=? AND course_id=?")
    .get(user(req).id, req.params.id);
  res.json({
    course: c,
    materials,
    videos,
    quizzes,
    assignments,
    discussions,
    enrollment,
  });
});
app.post("/api/courses/:id/enroll", role("student"), (req, res) => {
  try {
    db.prepare("INSERT INTO enrollments(user_id,course_id) VALUES(?,?)").run(
      user(req).id,
      req.params.id,
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: "Already enrolled" });
  }
});
app.post("/api/courses", role("teacher", "admin"), (req, res) => {
  const { code, title, description, creditHours = 3, teacherId } = req.body;
  if (!code || !title)
    return res.status(400).json({ error: "Code and title required" });
  try {
    const tid = user(req).role === "teacher" ? user(req).id : teacherId || null;
    const r = db
      .prepare(
        "INSERT INTO courses(code,title,description,credit_hours,teacher_id) VALUES(?,?,?,?,?)",
      )
      .run(code, title, description || "", creditHours, tid);
    res.json({ id: r.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: "Course code already exists" });
  }
});

app.get("/api/materials", auth, (req, res) => {
  const q = (req.query.q || "").trim();
  const rows = q
    ? db
        .prepare(
          `SELECT m.*,c.title course_title FROM materials m JOIN courses c ON c.id=m.course_id WHERE m.title LIKE ? OR m.description LIKE ? ORDER BY m.created_at DESC`,
        )
        .all("%" + q + "%", "%" + q + "%")
    : db
        .prepare(
          `SELECT m.*,c.title course_title FROM materials m JOIN courses c ON c.id=m.course_id ORDER BY m.created_at DESC`,
        )
        .all();
  res.json(rows);
});
app.post(
  "/api/courses/:id/materials",
  role("teacher", "admin"),
  upload.single("file"),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: "File required" });
    const type = path.extname(req.file.originalname).slice(1).toUpperCase();
    const url = "/uploads/" + req.file.filename;
    const r = db
      .prepare(
        "INSERT INTO materials(title,description,type,file_url,file_size,course_id,uploaded_by) VALUES(?,?,?,?,?,?,?)",
      )
      .run(
        req.body.title || req.file.originalname,
        req.body.description || "",
        type,
        url,
        req.file.size,
        req.params.id,
        user(req).id,
      );
    res.json({ id: r.lastInsertRowid });
  },
);

app.post("/api/courses/:id/videos", role("teacher", "admin"), (req, res) => {
  const { title, description, url, duration = "" } = req.body;
  if (!title || !url)
    return res.status(400).json({ error: "Title and URL required" });
  const r = db
    .prepare(
      "INSERT INTO videos(title,description,url,duration,course_id) VALUES(?,?,?,?,?)",
    )
    .run(title, description || "", url, duration, req.params.id);
  res.json({ id: r.lastInsertRowid });
});
app.post(
  "/api/courses/:id/videos/upload",
  role("teacher", "admin"),
  videoUpload.single("video"),
  (req, res) => {
    if (!req.file)
      return res.status(400).json({ error: "Video file required" });
    const title = (req.body.title || req.file.originalname).trim();
    if (!title) return res.status(400).json({ error: "Video title required" });
    const url = "/uploads/" + req.file.filename;
    const r = db
      .prepare(
        "INSERT INTO videos(title,description,url,duration,course_id) VALUES(?,?,?,?,?)",
      )
      .run(
        title,
        req.body.description || "",
        url,
        req.body.duration || "",
        req.params.id,
      );
    res.json({ id: r.lastInsertRowid, url });
  },
);
app.post("/api/videos/:id/complete", role("student"), (req, res) => {
  db.prepare(
    "INSERT INTO video_progress(user_id,video_id,completed) VALUES(?,?,1) ON CONFLICT(user_id,video_id) DO UPDATE SET completed=1",
  ).run(user(req).id, req.params.id);
  res.json({ ok: true });
});

app.post("/api/courses/:id/quizzes", role("teacher", "admin"), (req, res) => {
  const { title, description, timeLimit = 20, questions = [] } = req.body;
  const q = db
    .prepare(
      "INSERT INTO quizzes(title,description,course_id,time_limit) VALUES(?,?,?,?)",
    )
    .run(title, description || "", req.params.id, timeLimit);
  const add = db.prepare(
    "INSERT INTO questions(quiz_id,question,option_a,option_b,option_c,option_d,answer) VALUES(?,?,?,?,?,?,?)",
  );
  for (const x of questions)
    add.run(q.lastInsertRowid, x.question, x.a, x.b, x.c, x.d, x.answer);
  res.json({ id: q.lastInsertRowid });
});
app.get("/api/quizzes/:id", auth, (req, res) => {
  const quiz = db
    .prepare(
      "SELECT q.*,c.title course_title FROM quizzes q JOIN courses c ON c.id=q.course_id WHERE q.id=?",
    )
    .get(req.params.id);
  if (!quiz) return res.status(404).json({ error: "Quiz not found" });
  const questions = db
    .prepare(
      "SELECT id,question,option_a a,option_b b,option_c c,option_d d FROM questions WHERE quiz_id=?",
    )
    .all(req.params.id);
  res.json({ quiz, questions });
});
app.post("/api/quizzes/:id/submit", role("student"), (req, res) => {
  const qs = db
    .prepare("SELECT id,answer FROM questions WHERE quiz_id=?")
    .all(req.params.id);
  const answers = req.body.answers || {};
  let correct = 0;
  for (const q of qs) if (answers[q.id] === q.answer) correct++;
  const score = qs.length ? Math.round((correct / qs.length) * 100) : 0;
  db.prepare(
    "INSERT INTO quiz_attempts(quiz_id,user_id,score,answers_json) VALUES(?,?,?,?)",
  ).run(req.params.id, user(req).id, score, JSON.stringify(answers));
  res.json({ score, correct, total: qs.length });
});

app.post(
  "/api/courses/:id/assignments",
  role("teacher", "admin"),
  (req, res) => {
    const { title, description, deadline } = req.body;
    const r = db
      .prepare(
        "INSERT INTO assignments(title,description,deadline,course_id) VALUES(?,?,?,?)",
      )
      .run(title, description || "", deadline || null, req.params.id);
    res.json({ id: r.lastInsertRowid });
  },
);
app.post("/api/assignments/:id/submit", role("student"), (req, res) => {
  try {
    db.prepare(
      `INSERT INTO submissions(assignment_id,user_id,answer) VALUES(?,?,?)
   ON CONFLICT(assignment_id,user_id) DO UPDATE SET answer=excluded.answer,submitted_at=CURRENT_TIMESTAMP`,
    ).run(req.params.id, user(req).id, req.body.answer || "");
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: "Could not submit" });
  }
});

app.get("/api/discussions/:id", auth, (req, res) => {
  const d = db
    .prepare(
      `SELECT d.*,u.name author,c.title course_title FROM discussions d JOIN users u ON u.id=d.user_id JOIN courses c ON c.id=d.course_id WHERE d.id=?`,
    )
    .get(req.params.id);
  const replies = db
    .prepare(
      `SELECT r.*,u.name author FROM replies r JOIN users u ON u.id=r.user_id WHERE r.discussion_id=? ORDER BY r.created_at`,
    )
    .all(req.params.id);
  res.json({ discussion: d, replies });
});
app.post("/api/courses/:id/discussions", auth, (req, res) => {
  const { title, content } = req.body;
  if (!title || !content)
    return res.status(400).json({ error: "Title and content required" });
  const r = db
    .prepare(
      "INSERT INTO discussions(title,content,course_id,user_id) VALUES(?,?,?,?)",
    )
    .run(title, content, req.params.id, user(req).id);
  res.json({ id: r.lastInsertRowid });
});
app.post("/api/discussions/:id/replies", auth, (req, res) => {
  const r = db
    .prepare("INSERT INTO replies(discussion_id,content,user_id) VALUES(?,?,?)")
    .run(req.params.id, req.body.content, user(req).id);
  res.json({ id: r.lastInsertRowid });
});

app.get("/api/announcements", auth, (req, res) => {
  res.json(
    db
      .prepare(
        `SELECT a.*,c.title course_title,u.name author FROM announcements a LEFT JOIN courses c ON c.id=a.course_id JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC`,
      )
      .all(),
  );
});
app.post("/api/announcements", role("teacher", "admin"), (req, res) => {
  const r = db
    .prepare(
      "INSERT INTO announcements(title,content,course_id,user_id) VALUES(?,?,?,?)",
    )
    .run(
      req.body.title,
      req.body.content,
      req.body.courseId || null,
      user(req).id,
    );
  res.json({ id: r.lastInsertRowid });
});

app.get("/api/bookmarks", role("student"), (req, res) => {
  res.json(
    db
      .prepare(
        `SELECT b.id,m.*,c.title course_title FROM bookmarks b JOIN materials m ON m.id=b.material_id JOIN courses c ON c.id=m.course_id WHERE b.user_id=? ORDER BY b.id DESC`,
      )
      .all(user(req).id),
  );
});
app.post("/api/bookmarks/:materialId", role("student"), (req, res) => {
  try {
    db.prepare("INSERT INTO bookmarks(user_id,material_id) VALUES(?,?)").run(
      user(req).id,
      req.params.materialId,
    );
    res.json({ ok: true });
  } catch (e) {
    db.prepare("DELETE FROM bookmarks WHERE user_id=? AND material_id=?").run(
      user(req).id,
      req.params.materialId,
    );
    res.json({ ok: true, removed: true });
  }
});

app.get("/api/admin/stats", role("admin"), (req, res) => {
  const one = (t) => db.prepare("SELECT COUNT(*) c FROM " + t).get().c;
  res.json({
    users: one("users"),
    students: db
      .prepare("SELECT COUNT(*) c FROM users WHERE role='student'")
      .get().c,
    teachers: db
      .prepare("SELECT COUNT(*) c FROM users WHERE role='teacher'")
      .get().c,
    courses: one("courses"),
    materials: one("materials"),
    videos: one("videos"),
    quizzes: one("quizzes"),
    discussions: one("discussions"),
    assignments: one("assignments"),
  });
});
app.get("/api/users", role("admin"), (req, res) =>
  res.json(
    db
      .prepare(
        "SELECT id,name,email,role,year,section,isActive,created_at FROM users ORDER BY created_at DESC",
      )
      .all(),
  ),
);
app.patch("/api/users/:id/status", role("admin"), (req, res) => {
  db.prepare("UPDATE users SET isActive=? WHERE id=?").run(
    req.body.isActive ? 1 : 0,
    req.params.id,
  );
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || "Request failed" });
});
app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  res.sendFile(path.join(ROOT, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Werabe Learning Hub running on port ${PORT}`);
});
