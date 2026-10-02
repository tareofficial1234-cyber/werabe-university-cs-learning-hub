const app=document.getElementById("app");
let state={user:null,view:"dashboard",courses:[],currentCourse:null,tab:"overview",dark:localStorage.dark==="1"};

const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
async function api(url,opts={}){
 const r=await fetch(url,{headers:{"Content-Type":"application/json",...(opts.headers||{})},...opts});
 const data=await r.json().catch(()=>({}));
 if(!r.ok) throw Error(data.error||"Request failed");
 return data;
}
function toast(msg){const d=document.createElement("div");d.className="toast";d.textContent=msg;document.body.appendChild(d);setTimeout(()=>d.remove(),2500)}
function formatDate(x){return x?new Date(x.replace(" ","T")+"Z").toLocaleDateString():""}
function toggleDark(){state.dark=!state.dark;localStorage.dark=state.dark?"1":"0";render()}
function layout(content){
 document.body.className=state.dark?"dark":"";
 const nav=["dashboard","courses","materials","announcements"];
 if(state.user.role==="student") nav.push("bookmarks");
  nav.push("account");
 if(["teacher","admin"].includes(state.user.role)) nav.push("manage");
 if(state.user.role==="admin") nav.push("admin");
 const labels={dashboard:"Dashboard",courses:"My Courses",materials:"Materials",announcements:"Announcements",bookmarks:"Bookmarks",manage:"Teacher Tools",admin:"Admin Dashboard",account:"My Account"};
 const icons={dashboard:"⌂",courses:"▣",materials:"▤",announcements:"●",bookmarks:"★",manage:"✦",admin:"⚙",account:"◉"};
 return `<header class="top">
   <div class="brand"><div class="brandmark">WU</div><div><strong>Werabe University</strong><span>CS Learning Hub</span></div></div>
   <div class="top-search">⌕ <input aria-label="Search" placeholder="Search courses, materials, videos..." onkeydown="if(event.key==='Enter'){go('materials');setTimeout(()=>searchMaterials(this.value),60)}"></div>
   <div class="nav"><button class="iconbtn" onclick="toggleDark()" title="Theme">${state.dark?"☀":"☾"}</button><div class="avatar">${esc(state.user.name).slice(0,1).toUpperCase()}</div><button class="logout" onclick="logout()">Logout</button></div>
 </header>
 <div class="layout">
   <aside class="side">
     <div class="side-profile"><div class="avatar large">${esc(state.user.name).slice(0,1).toUpperCase()}</div><div><b>${esc(state.user.name)}</b><small>${esc(state.user.role)}</small></div></div>
     <nav>${nav.map(x=>`<button class="${state.view===x&&!state.currentCourse?'active':''}" onclick="go('${x}')"><span>${icons[x]}</span>${labels[x]}</button>`).join("")}</nav>
     <div class="side-bottom"><button onclick="toggleDark()"><span>◐</span>${state.dark?"Light mode":"Dark mode"}</button><small>Learn • Practice • Discuss • Succeed</small></div>
   </aside>
   <main class="main">${content}</main>
 </div>`;
}
async function boot(){const r=await api("/api/auth/me");state.user=r.user;if(state.user) await render();else renderAuth()}
function renderAuth(){
 document.body.className="";
 app.innerHTML=`<div class="auth auth-split">
   <section class="auth-visual">
     <div class="visual-overlay"></div>
     <div class="auth-brand"><div class="brandmark xl">WU</div><div><strong>Werabe University</strong><span>CS Learning Hub</span></div></div>
     <div class="auth-copy"><span class="badge">COMPUTER SCIENCE LEARNING PLATFORM</span><h1>Learn. Practice.<br>Discuss. Succeed.</h1><p>Courses, PPT/PDF materials, video lessons, quizzes, assignments and student discussions in one place.</p>
       <div class="feature-row"><span>▶ Video Courses</span><span>▤ PPT & PDF</span><span>✓ Exams & Quizzes</span><span>💬 Discussions</span></div>
     </div>
   </section>
   <section class="auth-panel"><div class="authbox">
     <div class="mobile-logo"><div class="brandmark">WU</div><b>Werabe CS Learning Hub</b></div>
     <p class="eyebrow">WELCOME BACK</p><h1>Sign in to your account</h1><p class="muted">Continue your Computer Science learning journey.</p>
     <form class="form" onsubmit="login(event)">
       <label>Email or Student ID<input id="email" type="email" placeholder="student@werabe.edu.et" required></label>
       <label>Password<input id="password" type="password" placeholder="Enter your password" required></label>
       <button class="btn big">Sign in</button>
     </form>
     <div class="switch">New student? <button class="textbtn" onclick="showRegister()">Create account</button></div>
     <div class="demo-card"><b>Demo logins</b><small>Student: student@werabe.edu.et / Student@12345</small><small>Teacher: teacher@werabe.edu.et / Teacher@12345</small><small>Admin: admin@werabe.edu.et / Admin@12345</small></div>
   </div></section>
 </div>`;
}
function showRegister(){
 document.body.className="";
 app.innerHTML=`<div class="auth register-bg"><div class="authbox register-box"><div class="mobile-logo"><div class="brandmark">WU</div><b>Werabe CS Learning Hub</b></div><p class="eyebrow">STUDENT REGISTRATION</p><h1>Create your account</h1><p class="muted">Join the Werabe University Computer Science Learning Hub.</p><form class="form" onsubmit="register(event)"><label>Full name<input id="name" placeholder="Your full name" required></label><label>Email<input id="email" type="email" placeholder="you@example.com" required></label><label>Password<input id="password" type="password" minlength="8" placeholder="Minimum 8 characters" required></label><div class="formgrid"><label>Year<input id="year" placeholder="e.g. 2"></label><label>Section<input id="section" placeholder="e.g. A"></label></div><button class="btn big">Create student account</button></form><div class="switch"><button class="textbtn" onclick="renderAuth()">← Back to login</button></div></div></div>`;
}
async function login(e){e.preventDefault();try{const r=await api("/api/auth/login",{method:"POST",body:JSON.stringify({email:email.value,password:password.value})});state.user=r.user;state.view="dashboard";render()}catch(x){toast(x.message)}}
async function register(e){e.preventDefault();try{const r=await api("/api/auth/register",{method:"POST",body:JSON.stringify({name:name.value,email:email.value,password:password.value,year:year.value,section:section.value})});state.user=r.user;state.view="dashboard";render()}catch(x){toast(x.message)}}
async function logout(){await api("/api/auth/logout",{method:"POST"});state.user=null;renderAuth()}
function go(v){state.view=v;state.currentCourse=null;render()}

async function render(){
 try{
  let html="";
  if(state.view==="dashboard") html=await dashboard();
  if(state.view==="courses") html=await courses();
  if(state.view==="materials") html=await materials();
  if(state.view==="announcements") html=await announcements();
  if(state.view==="bookmarks") html=await bookmarks();
  if(state.view==="manage") html=await manage();
  if(state.view==="admin") html=await admin();
   if(state.view==="account") html=await account();
  if(state.currentCourse) html=await coursePage(state.currentCourse);
  app.innerHTML=layout(html);
 }catch(e){app.innerHTML=layout(`<div class="card"><h2>Something went wrong</h2><p>${esc(e.message)}</p></div>`)}
}
async function dashboard(){
 const d=await api("/api/dashboard");
 const avg=d.courses.length?Math.round(d.courses.reduce((a,c)=>a+c.progress,0)/d.courses.length):0;
 return `<div class="page-head"><div><p class="eyebrow">STUDENT DASHBOARD</p><h1>Good morning, ${esc(state.user.name)} 👋</h1><p class="muted">Keep going — your next Computer Science milestone is close.</p></div><div class="streak">🔥 <b>7 Day Streak</b><small>+50 XP</small></div></div>
 <div class="dashboard-grid">
   <section class="card goal-card"><div class="mini-icon">✓</div><div><small class="muted">Your Study Goal</small><h3>Complete 2 lessons today</h3></div><div class="goal-ring"><span>1/2</span></div></section>
   <section class="card"><small class="muted">Course Progress</small><h3>${avg}% average</h3><div class="progress large"><i style="width:${avg}%"></i></div><small class="muted">${d.courses.length} active courses</small></section>
   <section class="card deadline"><small class="muted">Upcoming Exam</small><h3>${d.quizzes[0]?esc(d.quizzes[0].title):"No exam scheduled"}</h3><span>${d.quizzes[0]?"Practice now":"You're up to date"}</span></section>
   <section class="card deadline"><small class="muted">Upcoming Assignment</small><h3>${d.assignments[0]?esc(d.assignments[0].title):"No assignment due"}</h3><span>${d.assignments[0]?esc(d.assignments[0].deadline||"Open"):"All clear"}</span></section>
 </div>
 <div class="content-grid">
   <section><div class="row section-title"><h2>Continue Learning</h2><button class="textbtn" onclick="go('courses')">View all</button></div><div class="course-list">${d.courses.map((c,i)=>`<article class="continue-card"><div class="course-icon c${i%4}">${["⌘","⌬","▦","{}"][i%4]}</div><div class="grow"><b>${esc(c.title)}</b><small>${esc(c.code)} • ${Math.round(c.progress)}% complete</small><div class="progress"><i style="width:${c.progress}%"></i></div></div><button class="btn small" onclick="openCourse(${c.id})">Continue</button></article>`).join("")||`<article class="card"><h3>Start your first course</h3><button class="btn" onclick="go('courses')">Browse courses</button></article>`}</div></section>
   <aside class="card progress-panel"><h3>My Progress</h3><div class="big-ring" style="--p:${avg}"><span>${avg}%</span></div><div class="legend"><span><i></i>Course progress</span><span><i></i>${d.stats.materials} materials</span><span><i></i>${d.stats.videos} videos</span></div></aside>
 </div>
 <div class="content-grid lower"><section><div class="row section-title"><h2>Recent Announcements</h2><button class="textbtn" onclick="go('announcements')">See all</button></div>${d.announcements.slice(0,4).map(a=>`<article class="announcement"><div class="announce-dot">!</div><div><b>${esc(a.title)}</b><p>${esc(a.content)}</p><small>${formatDate(a.created_at)} • ${esc(a.author)}</small></div></article>`).join("")}</section><aside class="reference-card"><img src="/design-reference.png" alt="Learning Hub design reference"><div><b>Designed from your reference image</b><small>The interface follows the same blue university dashboard style.</small></div></aside></div>`;
}
async function courses(){
 const cs=await api("/api/courses");
 return `<div class="row"><div><h1>Courses</h1><p class="muted">Your Computer Science learning roadmap.</p></div>${["teacher","admin"].includes(state.user.role)?`<button class="btn" onclick="newCourse()">+ Create course</button>`:""}</div><div class="grid3">${cs.map(c=>`<div class="card course"><div><span class="pill">${esc(c.code)}</span><h3>${esc(c.title)}</h3><p class="muted">${esc(c.description)}</p></div><div><p class="muted">👨‍🏫 ${esc(c.teacher||"Not assigned")} • 👥 ${c.students} students</p><button class="btn" onclick="openCourse(${c.id})">Open Course →</button></div></div>`).join("")}</div>`;
}
async function openCourse(id){state.currentCourse=id;state.tab="overview";await render()}
async function coursePage(id){
 const d=await api("/api/courses/"+id); const c=d.course;
 const tabs=["overview","live","materials","videos","notes","quizzes","assignments","discussions"];
 return `<div class="row"><div><button class="btn ghost small" onclick="state.currentCourse=null;render()">← Back</button><h1>${esc(c.title)}</h1><p class="muted">${esc(c.code)} • ${esc(c.teacher||"Instructor")}</p></div></div>
 <div class="hero"><span class="badge">${esc(c.code)}</span><h1>${esc(c.title)}</h1><p>${esc(c.description)}</p>${!d.enrollment&&state.user.role==="student"?`<button class="btn" onclick="enroll(${id})">Enroll in Course</button>`:""}${d.enrollment?`<div style="margin-top:16px"><b>Your progress: ${Math.round(d.enrollment.progress)}%</b><div class="progress"><i style="width:${d.enrollment.progress}%"></i></div></div>`:""}</div>
 <div class="tabs">${tabs.map(t=>`<button class="${state.tab===t?'active':''}" onclick="courseTab('${t}')">${({overview:"Overview",live:"Live Class",materials:"Materials",videos:"Videos",notes:"My Notes",quizzes:"Quizzes",assignments:"Assignments",discussions:"Discussion"})[t]}</button>`).join("")}</div>
 ${courseTabContent(d)}`;
}
function courseTab(t){state.tab=t;render()}
function courseTabContent(d){
 const canManage=["teacher","admin"].includes(state.user.role);
 const isStudent=state.user.role==="student";
 if(state.tab==="overview") return `<div class="grid3"><div class="card"><div class="icon">📄</div><h3>${d.materials.length} Materials</h3><p class="muted">PPT, PDF and study resources.</p></div><div class="card"><div class="icon">🎥</div><h3>${d.videos.length} Videos</h3><p class="muted">Recorded and recommended lessons.</p></div><div class="card"><div class="icon">🧠</div><h3>${d.quizzes.length} Quizzes</h3><p class="muted">Practice your understanding.</p></div></div>`;
 if(state.tab==="materials"){
   const action=canManage?`<button class="btn small" onclick="uploadMaterial(${d.course.id})">+ Upload</button>`:"";
   const list=d.materials.map(m=>`<div class="material"><div class="fileicon">📄</div><div class="grow"><b>${esc(m.title)}</b><div class="muted">${esc(m.description)} • ${esc(m.type)}</div></div><a class="btn secondary small" href="${esc(m.file_url)}" target="_blank">Open</a>${isStudent?`<button class="btn ghost small" onclick="bookmark(${m.id})">🔖</button>`:""}</div>`).join("") || `<div class="card"><p class="muted">No materials yet.</p></div>`;
   return `<div class="row"><h2>Learning Materials</h2>${action}</div>${list}`;
 }
 if(state.tab==="videos"){
   const action=canManage?`<button class="btn small" onclick="addVideo(${d.course.id})">+ Add Video</button>`:"";
   return `<div class="row"><h2>Video Learning</h2>${action}</div><div class="grid3">${d.videos.map(v=>`<div class="card"><div class="icon">🎥</div><h3>${esc(v.title)}</h3><p class="muted">${esc(v.description)}</p><p><span class="pill">${esc(v.duration||"Video")}</span></p>${/^\/uploads\//.test(v.url)?`<video controls preload="metadata" style="width:100%;border-radius:14px;margin:10px 0" src="${esc(v.url)}"></video>`:""}<div class="actions"><a class="btn small" href="${esc(v.url)}" target="_blank">Watch</a>${isStudent?`<button class="btn ghost small" onclick="completeVideo(${v.id})">✓ Completed</button>`:""}</div></div>`).join("")||`<div class="card"><p class="muted">No videos yet.</p></div>`}</div>`;
 }
 if(state.tab==="live"){
  const action=canManage?`<button class="btn small" onclick="startLiveClass(${d.course.id})">+ Start Live Class</button>`:"";
  const live=d.liveClasses||[];
  return `<div class="row"><div><h2>Live Online Class</h2><p class="muted">Join the instructor for a real-time video lesson.</p></div>${action}</div>${live.length?live.map(l=>`<div class="card" style="margin:12px 0"><div class="row"><div><span class="pill">LIVE</span><h3>${esc(l.title)}</h3><small class="muted">Host: ${esc(l.host_name)} • ${formatDate(l.created_at)}</small></div><button class="btn" onclick="joinLiveClass(${l.id},'${esc(l.room_name)}','${esc(l.title)}')">Join Video Class →</button></div></div>`).join(""):`<div class="card"><div class="icon">📹</div><h3>No live class is open</h3><p class="muted">${canManage?"Start a live class when you are ready to teach.":"Your instructor has not started a live class yet."}</p></div>`}`;
 }
 if(state.tab==="notes"){
  if(!isStudent) return `<div class="card"><h2>Student Notes</h2><p class="muted">Notes are private to each student.</p></div>`;
  const notes=d.notes||[];
  return `<div class="row"><div><h2>My Notebook</h2><p class="muted">Write and save your private course notes.</p></div><button class="btn small" onclick="newNote(${d.course.id})">+ New Note</button></div>${notes.map(n=>`<article class="card" style="margin:10px 0"><div class="row"><div><h3>${esc(n.title)}</h3><small class="muted">Updated ${formatDate(n.updated_at)}</small></div><div class="actions"><button class="btn ghost small" onclick="editNote(${n.id})">Edit</button><button class="btn ghost small" onclick="deleteNote(${n.id})">Delete</button></div></div><p style="white-space:pre-wrap">${esc(n.content)}</p></article>`).join("")||`<div class="card"><h3>Your notebook is empty</h3><p class="muted">Create your first note for this course.</p></div>`}`;
 }
 if(state.tab==="quizzes"){
   const action=canManage?`<button class="btn small" onclick="addQuiz(${d.course.id})">+ Create Quiz</button>`:"";
   return `<div class="row"><h2>Quizzes & Exams</h2>${action}</div>${d.quizzes.map(q=>`<div class="card" style="margin:8px 0"><div class="row"><div><h3>${esc(q.title)}</h3><p class="muted">${esc(q.description)} • ${q.time_limit} min</p></div>${isStudent?`<button class="btn" onclick="takeQuiz(${q.id})">Start Quiz</button>`:"<span class=\"pill\">Quiz ready</span>"}</div></div>`).join("") || `<div class="card"><p class="muted">No quizzes yet.</p></div>`}`;
 }
 if(state.tab==="assignments"){
   const action=canManage?`<button class="btn small" onclick="addAssignment(${d.course.id})">+ Assignment</button>`:"";
   return `<div class="row"><h2>Assignments</h2>${action}</div>${d.assignments.map(a=>`<div class="card" style="margin:8px 0"><div class="row"><div><h3>${esc(a.title)}</h3><p>${esc(a.description)}</p><small class="muted">Deadline: ${esc(a.deadline||"Not set")}</small></div>${isStudent?`<button class="btn" onclick="submitAssignment(${a.id})">Submit</button>`:""}</div></div>`).join("") || `<div class="card"><p class="muted">No assignments yet.</p></div>`}`;
 }
 const discussions=d.discussions.map(x=>`<div class="card" style="margin:8px 0"><div class="row"><div><h3>${esc(x.title)}</h3><p>${esc(x.content)}</p><small class="muted">By ${esc(x.author)} • ${x.replies} replies</small></div><button class="btn secondary" onclick="discussion(${x.id})">Open</button></div></div>`).join("") || `<div class="card"><p class="muted">Be the first to ask a question.</p></div>`;
 return `<div class="row"><h2>Course Discussion</h2><button class="btn" onclick="newDiscussion(${d.course.id})">+ Ask Question</button></div>${discussions}`;
}
async function enroll(id){try{await api("/api/courses/"+id+"/enroll",{method:"POST"});toast("Enrolled successfully");render()}catch(e){toast(e.message)}}
async function completeVideo(id){try{await api("/api/videos/"+id+"/complete",{method:"POST"});toast("Video marked complete")}catch(e){toast(e.message)}}
async function materials(){
 const d=await api("/api/materials");
 const rows=d.map(m=>`<div class="material"><div class="fileicon">📄</div><div class="grow"><b>${esc(m.title)}</b><div class="muted">${esc(m.course_title)} • ${esc(m.type)}</div><small>${esc(m.description)}</small></div><a class="btn secondary small" href="${esc(m.file_url)}" target="_blank">Open</a>${state.user.role==="student"?`<button class="btn ghost small" onclick="bookmark(${m.id})">🔖</button>`:""}</div>`).join("") || `<div class="card"><p class="muted">No learning materials found.</p></div>`;
 return `<div class="row"><div><h1>Learning Materials</h1><p class="muted">Search across PPTs, PDFs and other resources.</p></div><input style="max-width:360px" placeholder="Search materials..." onkeydown="if(event.key==='Enter')searchMaterials(this.value)"></div><div style="margin-top:18px">${rows}</div>`;
}
async function searchMaterials(q){
 const d=await api("/api/materials?q="+encodeURIComponent(q));
 toast(`${d.length} result(s) found`);
 const rows=d.map(m=>`<div class="material"><div class="fileicon">📄</div><div class="grow"><b>${esc(m.title)}</b><div class="muted">${esc(m.course_title)}</div></div><a class="btn small" href="${esc(m.file_url)}" target="_blank">Open</a></div>`).join("") || `<div class="card"><p class="muted">No results found.</p></div>`;
 app.innerHTML=layout(`<h1>Search Results</h1>${rows}`);
}
async function announcements(){
 const d=await api("/api/announcements");
 const rows=d.map(a=>`<div class="card" style="margin:10px 0"><div class="row"><h3>${esc(a.title)}</h3><small class="muted">${formatDate(a.created_at)}</small></div><p>${esc(a.content)}</p><small class="muted">${esc(a.author)} ${a.course_title?"• "+esc(a.course_title):""}</small></div>`).join("") || `<div class="card"><p class="muted">No announcements yet.</p></div>`;
 return `<h1>Announcements</h1>${rows}`;
}
async function bookmarks(){
 const d=await api("/api/bookmarks");
 const rows=d.map(m=>`<div class="material"><div class="fileicon">🔖</div><div class="grow"><b>${esc(m.title)}</b><div class="muted">${esc(m.course_title)}</div></div><a class="btn small" href="${esc(m.file_url)}" target="_blank">Open</a></div>`).join("") || `<div class="card"><p class="muted">No bookmarks yet.</p></div>`;
 return `<h1>My Bookmarks</h1>${rows}`;
}
async function account(){
 return `<div class="row"><div><h1>My Account</h1><p class="muted">Manage your profile and password.</p></div></div><div class="grid3"><div class="card"><div class="avatar large">${esc(state.user.name).slice(0,1).toUpperCase()}</div><h2>${esc(state.user.name)}</h2><p class="muted">${esc(state.user.email)}</p><span class="pill">${esc(state.user.role)}</span></div><div class="card"><h3>🔐 Password</h3><p class="muted">Your password is securely hashed and cannot be viewed by teachers or administrators.</p><button class="btn" onclick="changePassword()">Change Password</button></div><div class="card"><h3>🛡️ Security</h3><p class="muted">Use a unique password of at least 8 characters. Never share it with anyone.</p></div></div>`;
}
async function manage(){return `<h1>Teacher Tools</h1><div class="grid3"><div class="card"><h3>📚 Course</h3><p class="muted">Create a course from the Courses page.</p><button class="btn" onclick="newCourse()">Create Course</button></div><div class="card"><h3>📢 Announcement</h3><p class="muted">Publish an update for students.</p><button class="btn" onclick="newAnnouncement()">Post Announcement</button></div><div class="card"><h3>🧠 Content</h3><p class="muted">Open a course to add materials, videos, quizzes and assignments.</p><button class="btn" onclick="go('courses')">Open Courses</button></div></div>`}
async function admin(){const s=await api("/api/admin/stats");return `<h1>Administration</h1><div class="grid"><div class="card"><div class="stat">${s.students}</div><div class="muted">Students</div></div><div class="card"><div class="stat">${s.teachers}</div><div class="muted">Teachers</div></div><div class="card"><div class="stat">${s.courses}</div><div class="muted">Courses</div></div><div class="card"><div class="stat">${s.materials}</div><div class="muted">Materials</div></div><div class="card"><div class="stat">${s.videos}</div><div class="muted">Videos</div></div><div class="card"><div class="stat">${s.quizzes}</div><div class="muted">Quizzes</div></div><div class="card"><div class="stat">${s.assignments}</div><div class="muted">Assignments</div></div><div class="card"><div class="stat">${s.discussions}</div><div class="muted">Discussions</div></div></div><div class="card" style="margin-top:20px"><h2>System</h2><p class="muted">Use this area for user management and future academic administration modules.</p></div>`}

function modal(title,body){const d=document.createElement("div");d.className="modal";d.id="modal";d.innerHTML=`<div class="modalbox"><div class="row"><h2>${title}</h2><button class="btn ghost small" onclick="document.getElementById('modal').remove()">✕</button></div>${body}</div>`;document.body.appendChild(d)}
function newCourse(){modal("Create Course",`<form class="form" onsubmit="createCourse(event)"><input id="ccode" placeholder="Course code e.g. CS205" required><input id="ctitle" placeholder="Course title" required><textarea id="cdesc" placeholder="Description"></textarea><input id="credits" type="number" value="3" min="1" max="10"><button class="btn">Create</button></form>`)}
async function createCourse(e){e.preventDefault();try{await api("/api/courses",{method:"POST",body:JSON.stringify({code:ccode.value,title:ctitle.value,description:cdesc.value,creditHours:+credits.value})});document.getElementById("modal").remove();toast("Course created");render()}catch(x){toast(x.message)}}
function newAnnouncement(){modal("Post Announcement",`<form class="form" onsubmit="createAnnouncement(event)"><input id="atitle" placeholder="Title" required><textarea id="acontent" placeholder="Announcement" required></textarea><button class="btn">Publish</button></form>`)}
async function createAnnouncement(e){e.preventDefault();try{await api("/api/announcements",{method:"POST",body:JSON.stringify({title:atitle.value,content:acontent.value})});document.getElementById("modal").remove();toast("Announcement published");render()}catch(x){toast(x.message)}}
function uploadMaterial(courseId){modal("Upload Learning Material",`<form class="form" enctype="multipart/form-data" onsubmit="sendMaterial(event,${courseId})"><input id="mtitle" placeholder="Title" required><textarea id="mdesc" placeholder="Description"></textarea><input id="mfile" type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,.txt,.jpg,.jpeg,.png" required><small class="muted">Maximum 10 MB.</small><button class="btn">Upload</button></form>`)}
async function sendMaterial(e,id){e.preventDefault();const fd=new FormData();fd.append("title",mtitle.value);fd.append("description",mdesc.value);fd.append("file",mfile.files[0]);try{const r=await fetch("/api/courses/"+id+"/materials",{method:"POST",body:fd});const d=await r.json();if(!r.ok)throw Error(d.error);document.getElementById("modal").remove();toast("Material uploaded");render()}catch(x){toast(x.message)}}
function addVideo(id){modal("Add Video Lesson",`<div class="tabs"><button id="vtaburl" class="active" onclick="videoMode('url')">Video URL</button><button id="vtabfile" onclick="videoMode('file')">Upload Video</button></div><form id="videoForm" class="form" onsubmit="sendVideo(event,${id})"><input id="vtitle" placeholder="Video title" required><textarea id="vdesc" placeholder="Description"></textarea><input id="vduration" placeholder="Duration e.g. 25 min"><div id="videoUrlBox"><input id="vurl" placeholder="YouTube or video URL"></div><div id="videoFileBox" style="display:none"><input id="vfile" type="file" accept=".mp4,.webm,.ogg,.mov,.m4v"><small class="muted">Maximum 200 MB. MP4 is recommended.</small></div><button class="btn">Add Video</button></form>`)}
function videoMode(mode){const url=document.getElementById("videoUrlBox"),file=document.getElementById("videoFileBox"),ut=document.getElementById("vtaburl"),ft=document.getElementById("vtabfile");if(mode==="file"){url.style.display="none";file.style.display="block";ut.classList.remove("active");ft.classList.add("active");vurl.required=false;vfile.required=true}else{url.style.display="block";file.style.display="none";ut.classList.add("active");ft.classList.remove("active");vurl.required=true;vfile.required=false}}
async function sendVideo(e,id){e.preventDefault();try{if(vfile&&vfile.files.length){const fd=new FormData();fd.append("title",vtitle.value);fd.append("description",vdesc.value);fd.append("duration",vduration.value);fd.append("video",vfile.files[0]);const r=await fetch("/api/courses/"+id+"/videos/upload",{method:"POST",body:fd});const d=await r.json();if(!r.ok)throw Error(d.error);document.getElementById("modal").remove();toast("Video uploaded");render()}else{await api("/api/courses/"+id+"/videos",{method:"POST",body:JSON.stringify({title:vtitle.value,description:vdesc.value,url:vurl.value,duration:vduration.value})});document.getElementById("modal").remove();toast("Video added");render()}}catch(x){toast(x.message)}}
function startLiveClass(courseId){modal("Start Live Class",`<form class="form" onsubmit="sendLiveClass(event,${courseId})"><label>Class title<input id="livetitle" placeholder="e.g. CS101 - Week 5 Live Lecture" required></label><p class="muted">A course-specific video room will be created.</p><button class="btn">Start Live Class</button></form>`)}
async function sendLiveClass(e,id){e.preventDefault();try{const r=await api("/api/courses/"+id+"/live-classes",{method:"POST",body:JSON.stringify({title:livetitle.value})});document.getElementById("modal").remove();toast("Live class created");joinLiveClass(r.id,r.roomName,livetitle.value)}catch(x){toast(x.message)}}
function joinLiveClass(id,room,title){const safeRoom=encodeURIComponent(room);modal(esc(title),`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><a class="btn secondary small" href="https://meet.jit.si/${safeRoom}" target="_blank" rel="noopener">Open in New Tab</a>${["teacher","admin"].includes(state.user.role)?`<button class="btn ghost small" onclick="endLiveClass(${id})">End Class</button>`:""}</div><div style="aspect-ratio:16/9;background:#071b33;border-radius:16px;overflow:hidden"><iframe title="Werabe University live class" src="https://meet.jit.si/${safeRoom}" allow="camera; microphone; fullscreen; display-capture; autoplay" style="width:100%;height:100%;border:0"></iframe></div><p class="muted" style="margin-top:10px">Your browser may ask for camera and microphone permission.</p>`)}
async function endLiveClass(id){try{await api("/api/live-classes/"+id+"/end",{method:"POST"});document.getElementById("modal")?.remove();toast("Live class ended");render()}catch(x){toast(x.message)}}
function newNote(courseId){modal("New Note",`<form class="form" onsubmit="sendNote(event,${courseId})"><input id="notetitle" placeholder="Note title" value="My Note" required><textarea id="notecontent" rows="10" placeholder="Write your notes here..." required></textarea><button class="btn">Save Note</button></form>`)}
async function sendNote(e,id){e.preventDefault();try{await api("/api/courses/"+id+"/notes",{method:"POST",body:JSON.stringify({title:notetitle.value,content:notecontent.value})});document.getElementById("modal").remove();toast("Note saved");render()}catch(x){toast(x.message)}}
async function editNote(id){const n=(await api("/api/courses/"+state.currentCourse)).notes.find(x=>x.id===id);if(!n)return toast("Note not found");modal("Edit Note",`<form class="form" onsubmit="saveNote(event,${id})"><input id="editnotetitle" value="${esc(n.title)}" required><textarea id="editnotecontent" rows="10" required>${esc(n.content)}</textarea><button class="btn">Save Changes</button></form>`)}
async function saveNote(e,id){e.preventDefault();try{await api("/api/notes/"+id,{method:"PUT",body:JSON.stringify({title:editnotetitle.value,content:editnotecontent.value})});document.getElementById("modal").remove();toast("Note updated");render()}catch(x){toast(x.message)}}
async function deleteNote(id){if(!confirm("Delete this note?"))return;try{await api("/api/notes/"+id,{method:"DELETE"});toast("Note deleted");render()}catch(x){toast(x.message)}}
function changePassword(){modal("Change Password",`<form class="form" onsubmit="savePassword(event)"><label>Current password<input id="currentpass" type="password" required></label><label>New password<input id="newpass" type="password" minlength="8" required></label><label>Confirm new password<input id="confirmpass" type="password" minlength="8" required></label><p class="muted">Passwords are stored as secure hashes; nobody can view your current password.</p><button class="btn">Update Password</button></form>`)}
async function savePassword(e){e.preventDefault();if(newpass.value!==confirmpass.value)return toast("New passwords do not match");try{await api("/api/auth/change-password",{method:"POST",body:JSON.stringify({currentPassword:currentpass.value,newPassword:newpass.value})});document.getElementById("modal").remove();toast("Password changed successfully")}catch(x){toast(x.message)}}
function addQuiz(id){modal("Create Quiz",`<form class="form" onsubmit="sendQuiz(event,${id})"><input id="qtitle" placeholder="Quiz title" required><textarea id="qdesc" placeholder="Description"></textarea><input id="qlimit" type="number" value="20" placeholder="Minutes"><h3>Question 1</h3><input id="qq" placeholder="Question" required><div class="formgrid"><input id="qa" placeholder="Option A" required><input id="qb" placeholder="Option B" required><input id="qc" placeholder="Option C" required><input id="qd" placeholder="Option D" required></div><select id="qanswer"><option value="A">Correct: A</option><option value="B">Correct: B</option><option value="C">Correct: C</option><option value="D">Correct: D</option></select><p class="muted">The first version creates one question. More questions can be added in the next content-builder upgrade.</p><button class="btn">Create Quiz</button></form>`)}
async function sendQuiz(e,id){e.preventDefault();try{await api("/api/courses/"+id+"/quizzes",{method:"POST",body:JSON.stringify({title:qtitle.value,description:qdesc.value,timeLimit:+qlimit.value,questions:[{question:qq.value,a:qa.value,b:qb.value,c:qc.value,d:qd.value,answer:qanswer.value}]})});document.getElementById("modal").remove();toast("Quiz created");render()}catch(x){toast(x.message)}}
async function takeQuiz(id){const d=await api("/api/quizzes/"+id);modal(esc(d.quiz.title),`<p class="muted">${esc(d.quiz.description)} • ${d.quiz.time_limit} minutes</p><form class="form" onsubmit="submitQuiz(event,${id})">${d.questions.map((q,i)=>`<div class="card"><b>${i+1}. ${esc(q.question)}</b>${["a","b","c","d"].map(k=>`<label style="display:block;margin:10px 0"><input style="width:auto" type="radio" name="q${q.id}" value="${k.toUpperCase()}"> ${k.toUpperCase()}. ${esc(q[k])}</label>`).join("")}</div>`).join("")}<button class="btn">Submit Quiz</button></form>`)}
async function submitQuiz(e,id){e.preventDefault();const answers={};document.querySelectorAll("#modal input[type=radio]:checked").forEach(x=>answers[x.name.slice(1)]=x.value);try{const r=await api("/api/quizzes/"+id+"/submit",{method:"POST",body:JSON.stringify({answers})});document.getElementById("modal").innerHTML=`<div class="modalbox"><h2>Quiz Result 🎉</h2><div class="hero"><h1>${r.score}%</h1><p>${r.correct} correct out of ${r.total}</p></div><button class="btn" onclick="document.getElementById('modal').remove()">Close</button></div>`}catch(x){toast(x.message)}}
function addAssignment(id){modal("Create Assignment",`<form class="form" onsubmit="sendAssignment(event,${id})"><input id="astitle" placeholder="Assignment title" required><textarea id="asdesc" placeholder="Instructions"></textarea><input id="deadline" type="date"><button class="btn">Create</button></form>`)}
async function sendAssignment(e,id){e.preventDefault();try{await api("/api/courses/"+id+"/assignments",{method:"POST",body:JSON.stringify({title:astitle.value,description:asdesc.value,deadline:deadline.value})});document.getElementById("modal").remove();toast("Assignment created");render()}catch(x){toast(x.message)}}
function submitAssignment(id){modal("Submit Assignment",`<form class="form" onsubmit="sendAssignmentSubmission(event,${id})"><textarea id="answer" placeholder="Write your answer or submission notes..." required></textarea><button class="btn">Submit Assignment</button></form>`)}
async function sendAssignmentSubmission(e,id){e.preventDefault();try{await api("/api/assignments/"+id+"/submit",{method:"POST",body:JSON.stringify({answer:answer.value})});document.getElementById("modal").remove();toast("Assignment submitted");}catch(x){toast(x.message)}}
function newDiscussion(id){modal("Start Discussion",`<form class="form" onsubmit="sendDiscussion(event,${id})"><input id="dtitle" placeholder="Question title" required><textarea id="dcontent" placeholder="Describe your question..." required></textarea><button class="btn">Post Question</button></form>`)}
async function sendDiscussion(e,id){e.preventDefault();try{await api("/api/courses/"+id+"/discussions",{method:"POST",body:JSON.stringify({title:dtitle.value,content:dcontent.value})});document.getElementById("modal").remove();toast("Discussion posted");render()}catch(x){toast(x.message)}}
async function discussion(id){const d=await api("/api/discussions/"+id);modal(esc(d.discussion.title),`<div class="card"><b>${esc(d.discussion.author)}</b><p>${esc(d.discussion.content)}</p></div><h3>Replies</h3>${d.replies.map(r=>`<div class="card" style="margin:8px 0"><b>${esc(r.author)}</b><p>${esc(r.content)}</p></div>`).join("")}<form class="form" onsubmit="reply(event,${id})"><textarea id="replytext" placeholder="Write a helpful response..." required></textarea><button class="btn">Reply</button></form>`)}
async function reply(e,id){e.preventDefault();try{await api("/api/discussions/"+id+"/replies",{method:"POST",body:JSON.stringify({content:replytext.value})});toast("Reply added");discussion(id)}catch(x){toast(x.message)}}
async function bookmark(id){try{await api("/api/bookmarks/"+id,{method:"POST"});toast("Bookmark updated")}catch(x){toast(x.message)}}

boot();
