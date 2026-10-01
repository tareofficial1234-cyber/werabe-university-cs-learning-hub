function renderAuth() {
  document.body.className = "";
  app.innerHTML = `<div class="auth auth-split">
   <section class="auth-visual">
     <div class="visual-overlay"></div>
     <div class="auth-brand">
       <div class="brandmark xl">WU</div>
       <div>
         <strong>Werabe University</strong>
         <span>CS Learning Hub</span>
       </div>
     </div>

     <div class="auth-copy">
       <span class="badge">COMPUTER SCIENCE LEARNING PLATFORM</span>
       <h1>Learn. Practice.<br>Discuss. Succeed.</h1>
       <p>Courses, PPT/PDF materials, video lessons, quizzes, assignments and student discussions in one place.</p>
       <div class="feature-row">
         <span>▶ Video Courses</span>
         <span>▤ PPT & PDF</span>
         <span>✓ Exams & Quizzes</span>
         <span>💬 Discussions</span>
       </div>
     </div>
   </section>

   <div class="auth-panel">
     <div class="authbox">
       <div class="mobile-logo">
         <div class="brandmark">WU</div>
         <b>Werabe CS Learning Hub</b>
       </div>

       <p class="eyebrow">WELCOME BACK</p>
       <h1>Sign in to your account</h1>
       <p class="muted">Continue your Computer Science learning journey.</p>

       <form class="form" onsubmit="login(event)">
         <label>
           Email or Student ID
           <input id="email" type="email" placeholder="student@werabe.edu.et" required>
         </label>

         <label>
           Password
           <input id="password" type="password" placeholder="Enter your password" required>
         </label>

         <button class="btn big">Sign in</button>
       </form>

       <div class="switch">
         New student?
         <button class="textbtn" onclick="showRegister()">Create account</button>
       </div>

       <div class="demo-card">
         <b>Demo accounts</b>
         <small>Student: student@werabe.edu.et</small>
         <small>Teacher: teacher@werabe.edu.et</small>
         <small>Admin: admin@werabe.edu.et</small>
         <small class="muted">Demo passwords are not displayed publicly.</small>
       </div>
     </div>
   </div>
 </div>`;
}
