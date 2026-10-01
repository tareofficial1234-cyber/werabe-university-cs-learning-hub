# Werabe University CS Learning Hub

Runnable full-stack Computer Science learning platform designed from the supplied blue university dashboard reference.

## Features
- Student / Teacher / Admin login
- Student registration and role-based access
- Courses and enrollment
- PPT/PDF/document/image uploads
- Video lessons
- Quizzes/exams with automatic scoring
- Assignments and submissions
- Discussions and replies
- Announcements
- Progress dashboard
- Search and bookmarks
- Teacher tools
- Admin statistics
- Dark mode
- Responsive mobile design
- SQLite database
- Password hashing and security headers

## Run
1. Extract the ZIP.
2. Open the folder in VS Code.
3. Open Terminal.
4. Run:
   npm install
   npm start
5. Open http://localhost:3000

## Demo accounts
- Student: student@werabe.edu.et / Student@12345
- Teacher: teacher@werabe.edu.et / Teacher@12345
- Admin: admin@werabe.edu.et / Admin@12345

## Main files
- server.js — Express backend/API/database
- public/app.js — frontend application
- public/style.css — UI based on the supplied reference
- public/design-reference.png — reference image used in the software
- data/ — SQLite database, created automatically
- uploads/ — uploaded learning materials, created automatically

## Before real university deployment
Set a strong SESSION_SECRET, use HTTPS, secure cookies, a production session store, backups, audit logs, rate limiting, file scanning, managed storage/database, and university identity integration.

## Teacher/Admin Content Management

Log in with:
- Teacher: `teacher@werabe.edu.et` / `Teacher@12345`
- Admin: `admin@werabe.edu.et` / `Admin@12345`

Then open **Teacher Tools** or **My Courses**.

### Add a course
1. Click **+ Create course**.
2. Enter course code, title, description, and credit hours.
3. Click **Create**.

### Add PPT/PDF/documents
1. Open the course.
2. Open **Materials**.
3. Click **+ Upload**.
4. Enter a title and description.
5. Select your PPT/PPTX/PDF/DOC/DOCX/ZIP/TXT/JPG/PNG file.
6. Click **Upload**.

Material upload limit: 10 MB.

### Add a video
1. Open the course.
2. Open **Videos**.
3. Click **+ Add Video**.
4. Choose **Video URL** for YouTube or another hosted video, or choose **Upload Video** for a local video file.
5. For uploaded videos, use MP4/WebM/OGG/MOV/M4V. The upload limit is 200 MB.
6. Click **Add Video**.

### Add quizzes and assignments
Open the course and choose **Quizzes** or **Assignments**, then use the create button.
