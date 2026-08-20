const API_URL = 'http://localhost:3000/api';
let currentUser = null;
let allUsers = [];

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
        currentUser = JSON.parse(storedUser);
        showApp();
    } else {
        showAuth();
    }
});

// --- NAVIGATION SPA ---
function switchView(viewName, element) {
    if(element) {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        element.classList.add('active');
    }
    // Masquer tout
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    // Afficher cible
    document.getElementById(`view-${viewName}`).style.display = 'block';

    // Charger données spécifiques
    if(viewName === 'dashboard') fetchProjects();
    if(viewName === 'projects') renderProjectsView();
    if(viewName === 'tasks') renderMyTasksView();
    if(viewName === 'team') renderTeamView();
    if(viewName === 'users-manage') fetchUsersForManagement();
}

// --- AUTH LOGIC ---
function showAuth() {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app-screen').style.display = 'none';
}

function showApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'flex';
    
    // Display User Info
    const roleLabel = currentUser.role === 'chef' ? 'Chef de Projet' : 'Membre';
    document.getElementById('username-display').innerText = currentUser.username;
    document.getElementById('role-display').innerText = roleLabel;

    // RBAC: Cacher bouton création pour les membres
    const btn = document.getElementById('btn-create-project');
    if(currentUser.role === 'member' && btn) btn.style.display = 'none';

    // RBAC: Show/Hide User Management Link
    const userManageLink = document.getElementById('nav-users-manage');
    if(currentUser.role === 'chef') {
        userManageLink.style.display = 'flex';
    } else {
        userManageLink.style.display = 'none';
    }

    // Fetch initiale
    fetchAllUsers();
    switchView('dashboard');
}

function logout() { localStorage.clear(); location.reload(); }

function toggleAuth() {
    const login = document.getElementById('login-box');
    const signup = document.getElementById('signup-box');
    if(login.style.display === 'none') { login.style.display='block'; signup.style.display='none'; }
    else { login.style.display='none'; signup.style.display='block'; }
}

// Forms Auth
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ email: document.getElementById('login-email').value, password: document.getElementById('login-pass').value })
        });
        const data = await res.json();
        if(res.ok){
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            showApp();
        } else { document.getElementById('auth-msg').innerText = data.msg; }
    } catch(err) { console.error(err); }
});

document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ 
                username: document.getElementById('reg-username').value,
                email: document.getElementById('reg-email').value,
                password: document.getElementById('reg-pass').value,
                role: 'chef' // Default to Chef for public signup
            })
        });
        if(res.ok) { showToast('Compte Chef créé ! Connectez-vous.'); toggleAuth(); }
        else { document.getElementById('auth-msg').innerText = "Erreur inscription"; }
    } catch(err) { console.error(err); }
});

// --- DATA LOGIC ---

async function fetchAllUsers() {
    try {
        const res = await fetch(`${API_URL}/users`);
        if(res.ok) allUsers = await res.json();
    } catch(err){ console.error(err); }
}

// 5. USER MANAGEMENT VIEW (CHIEF ONLY)
async function fetchUsersForManagement() {
    const tbody = document.querySelector('#users-manage-table tbody');
    tbody.innerHTML = '<tr><td colspan="4">Chargement...</td></tr>';
    await fetchAllUsers(); // Refresh list
    tbody.innerHTML = '';
    
    allUsers.forEach(u => {
        const isSelf = u._id === currentUser.id;
        const actions = isSelf ? '<small class="text-muted">Vous</small>' : `
            <button onclick="openEditUserModal('${u._id}', '${u.username}', '${u.email}', '${u.role}')" class="btn-icon" title="Modifier"><i class="fas fa-edit"></i></button>
            <button onclick="deleteUser('${u._id}', 'manage')" class="btn-icon delete" title="Supprimer"><i class="fas fa-trash"></i></button>
        `;
        
        tbody.innerHTML += `<tr>
            <td>
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:30px;height:30px;background:#e0e7ff;color:#4f46e5;border-radius:50%;display:flex;justify-content:center;align-items:center;font-size:0.8rem;font-weight:bold;">${u.username.charAt(0).toUpperCase()}</div>
                    ${u.username}
                </div>
            </td>
            <td>${u.email}</td>
            <td><span class="badge bd-${u.role === 'chef' ? 'DONE' : 'TODO'}">${u.role}</span></td>
            <td>${actions}</td>
        </tr>`;
    });
}

// 1. DASHBOARD
async function fetchProjects() {
    const container = document.getElementById('projects-container');
    container.innerHTML = '<p>Chargement...</p>';
    
    const res = await fetch(`${API_URL}/projects`, { headers: { 'x-user-id': currentUser.id } });
    const projects = await res.json();
    
    container.innerHTML = '';
    document.getElementById('total-projects').innerText = projects.length;
    let done = 0, prog = 0;

    if(projects.length === 0) container.innerHTML = '<p class="text-muted">Aucun projet actif.</p>';

    for (const p of projects) {
        // Members Icons
        let membersHtml = (p.members||[]).map(m => 
            `<span title="${m.username}" style="display:inline-block;width:24px;height:24px;background:#e0e7ff;color:#4f46e5;border-radius:50%;text-align:center;font-size:10px;line-height:24px;margin-right:-8px;border:2px solid white;">${m.username.charAt(0).toUpperCase()}</span>`
        ).join('');

        // Invites (Chef & Owner Only)
        let inviteHtml = '';
        const isOwner = (p.createdBy && (p.createdBy._id === currentUser.id || p.createdBy === currentUser.id));
        if(currentUser.role === 'chef' && isOwner) {
            const avail = allUsers.filter(u => !p.members.some(m => m._id === u._id));
            let opts = avail.map(u => `<option value="${u._id}">${u.username}</option>`).join('');
            if(avail.length > 0) {
                inviteHtml = `<div style="margin-top:15px;display:flex;gap:5px;border-top:1px solid #f1f5f9;padding-top:10px;">
                    <select id="sel-${p._id}" style="padding:6px;flex:1;border-radius:6px;border:1px solid #e2e8f0;"><option disabled selected>Inviter...</option>${opts}</select>
                    <button onclick="inviteMember('${p._id}')" class="btn-primary" style="padding:6px 12px;">+</button>
                </div>`;
            }
        }

        const editBtn = isOwner ? `<button onclick="openEditProjectModal('${p._id}', '${p.title}', '${p.description||''}')" class="btn-icon" title="Modifier"><i class="fas fa-edit"></i></button>` : '';
        const deleteBtn = isOwner ? `<button onclick="deleteProject('${p._id}')" class="btn-icon delete" title="Supprimer"><i class="fas fa-trash"></i></button>` : '';

        // Assign Options for New Task
        let assignOpts = (p.members||[]).map(m => `<option value="${m.username}">${m.username}</option>`).join('');
        // Add self if not in members (should not happen but safe)
        if(!p.members.some(m => m.username === currentUser.username)) assignOpts += `<option value="${currentUser.username}">${currentUser.username}</option>`;

        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <div class="p-header">
                <div>
                    <div class="p-title">${p.title}</div>
                    <div style="margin-top:5px;padding-left:8px;">${membersHtml}</div>
                </div>
                <div class="p-actions">
                    ${editBtn}
                    ${deleteBtn}
                </div>
            </div>
            <div class="p-desc">${p.description||'Pas de description'}</div>
            
            <div id="tasks-${p._id}" class="task-list">...</div>
            
            <form onsubmit="addTask(event, '${p._id}')" style="display:flex;gap:5px;">
                <input name="tTitle" placeholder="+ Nouvelle tâche" required style="padding:8px;border:1px solid #e2e8f0;border-radius:6px;flex:1;">
                <select name="tAssign" style="width:100px;padding:8px;border:1px solid #e2e8f0;border-radius:6px;">
                    ${assignOpts}
                </select>
                <button type="submit" class="btn-primary" style="padding:8px 12px;">+</button>
            </form>
            ${inviteHtml}
        `;
        container.appendChild(card);

        // Tasks
        const tRes = await fetch(`${API_URL}/tasks/project/${p._id}`);
        const tasks = await tRes.json();
        tasks.forEach(t => { if(t.status==='DONE') done++; if(t.status==='IN_PROGRESS') prog++; });
        renderTasksList(p._id, tasks, p.members);
    }
    document.getElementById('total-done').innerText = done;
    document.getElementById('total-progress').innerText = prog;
}

function renderTasksList(pid, tasks, members) {
    const list = document.getElementById(`tasks-${pid}`);
    list.innerHTML = '';
    if(tasks.length===0) { list.innerHTML='<small class="text-muted">Aucune tâche</small>'; return; }
    
    tasks.forEach(t => {
        // Serialize members to pass to edit function
        const membersStr = encodeURIComponent(JSON.stringify(members.map(m => m.username)));
        
        list.innerHTML += `<div class="task-row">
            <div style="flex:1;">
                <div style="font-weight:500;">${t.title}</div>
                <div style="font-size:0.75rem;color:#64748b;">Assigné à: ${t.assignedTo}</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
                <span class="badge bd-${t.status}" style="cursor:pointer;" onclick="cycleStatus('${t._id}','${t.status}','dashboard')">${t.status}</span>
                <i class="fas fa-edit" style="color:#6366f1;cursor:pointer;font-size:0.9rem;" onclick="openEditTaskModal('${t._id}', '${t.title}', '${t.status}', '${t.assignedTo}', '${membersStr}')"></i>
                <i class="fas fa-times" style="color:#ef4444;cursor:pointer;font-size:0.9rem;" onclick="deleteTask('${t._id}','dashboard')"></i>
            </div>
        </div>`;
    });
}

// 2. PROJECTS TABLE VIEW
async function renderProjectsView() {
    const tbody = document.querySelector('#projects-table tbody');
    tbody.innerHTML = '<tr><td colspan="4">Chargement...</td></tr>';
    const res = await fetch(`${API_URL}/projects`, { headers: { 'x-user-id': currentUser.id } });
    const projects = await res.json();
    tbody.innerHTML = '';
    if(projects.length===0) tbody.innerHTML = '<tr><td colspan="4">Aucun projet</td></tr>';
    
    projects.forEach(p => {
        const isOwner = (p.createdBy && (p.createdBy._id === currentUser.id || p.createdBy === currentUser.id));
        tbody.innerHTML += `<tr>
            <td><strong>${p.title}</strong><br><small class="text-muted">${p.description||''}</small></td>
            <td>${p.createdBy ? p.createdBy.username : '?'}</td>
            <td>${p.members.length} membres</td>
            <td>${(currentUser.role==='chef' && isOwner) ? `<button onclick="deleteProject('${p._id}')" style="color:red;border:none;background:none;cursor:pointer;">Supprimer</button>` : '-'}</td>
        </tr>`;
    });
}

// 3. MY TASKS VIEW
async function renderMyTasksView() {
    const tbody = document.querySelector('#mytasks-table tbody');
    tbody.innerHTML = '<tr><td colspan="4">Chargement...</td></tr>';
    const res = await fetch(`${API_URL}/tasks/assigned/${currentUser.username}`);
    const tasks = await res.json();
    tbody.innerHTML = '';
    if(tasks.length===0) tbody.innerHTML = '<tr><td colspan="4">Aucune tâche assignée</td></tr>';
    
    // Need to fetch project names... or just show ID. For now, let's leave it simple or do a quick lookup if we had all projects.
    // We can fetch all projects once and map.
    const pRes = await fetch(`${API_URL}/projects`, { headers: { 'x-user-id': currentUser.id } });
    const projects = await pRes.json();
    const pMap = {}; projects.forEach(p => pMap[p._id] = p.title);

    tasks.forEach(t => {
        tbody.innerHTML += `<tr>
            <td>${t.title}</td>
            <td>${pMap[t.projectId] || 'Inconnu'}</td>
            <td><select onchange="updateTaskDirect('${t._id}', this.value)" style="padding:5px;border-radius:4px;border:1px solid #ddd;">
                <option value="TODO" ${t.status==='TODO'?'selected':''}>À FAIRE</option>
                <option value="IN_PROGRESS" ${t.status==='IN_PROGRESS'?'selected':''}>EN COURS</option>
                <option value="DONE" ${t.status==='DONE'?'selected':''}>TERMINÉ</option>
            </select></td>
            <td><button onclick="deleteTask('${t._id}', 'tasks')" style="color:red;border:none;background:none;cursor:pointer;">Supprimer</button></td>
        </tr>`;
    });
}

// 4. TEAM VIEW
async function renderTeamView() {
    const grid = document.getElementById('team-container');
    grid.innerHTML = 'Chargement...';
    await fetchAllUsers();
    grid.innerHTML = '';
    allUsers.forEach(u => {
        const delBtn = (currentUser.role==='chef' && u._id !== currentUser.id) ? `<button onclick="deleteUser('${u._id}')" style="color:red;border:none;background:none;cursor:pointer;margin-top:10px;">Bannir</button>` : '';
        grid.innerHTML += `<div class="user-card">
            <div class="user-avatar-lg">${u.username.charAt(0).toUpperCase()}</div>
            <h3>${u.username}</h3>
            <span class="badge bd-TODO">${u.role}</span><br>${delBtn}
        </div>`;
    });
}

// --- ACTIONS ---
async function addTask(e, pid) { 
    e.preventDefault(); 
    const title = e.target.tTitle.value;
    const assign = e.target.tAssign.value;
    await fetch(`${API_URL}/tasks`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({title, projectId:pid, assignedTo:assign})
    }); 
    showToast('Tâche ajoutée');
    fetchProjects(); 
}

async function cycleStatus(tid, s, view) { 
    const n=s==='TODO'?'IN_PROGRESS':(s==='IN_PROGRESS'?'DONE':'TODO'); 
    await fetch(`${API_URL}/tasks/${tid}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:n})}); 
    if(view==='dashboard') fetchProjects(); 
}

async function updateTaskDirect(tid, s) { 
    await fetch(`${API_URL}/tasks/${tid}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:s})}); 
    showToast('Statut mis à jour');
}

async function deleteProject(id) { 
    if(confirm('Supprimer ce projet et toutes ses tâches ?')) { 
        await fetch(`${API_URL}/projects/${id}`,{method:'DELETE'}); 
        showToast('Projet supprimé');
        switchView('dashboard'); 
    } 
}

async function deleteTask(tid, view) { 
    if(confirm('Supprimer cette tâche ?')) { 
        await fetch(`${API_URL}/tasks/${tid}`,{method:'DELETE'}); 
        showToast('Tâche supprimée');
        if(view==='dashboard') fetchProjects(); else renderMyTasksView(); 
    } 
}

async function inviteMember(pid) { 
    const m=document.getElementById(`sel-${pid}`).value; 
    if(m) {
        await fetch(`${API_URL}/projects/${pid}/invite`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({memberId:m})}); 
        showToast('Membre invité');
        fetchProjects(); 
    }
}

async function deleteUser(uid, view) { 
    if(confirm('Supprimer cet utilisateur ?')) { 
        await fetch(`${API_URL}/users/${uid}`,{method:'DELETE'}); 
        showToast('Utilisateur supprimé');
        if(view === 'manage') fetchUsersForManagement();
        else renderTeamView(); 
    } 
}

// --- MODALS & EDITS ---

// Project Modal
function openModal(id) { document.getElementById(id).style.display='flex'; }
function closeModal(id) { document.getElementById(id).style.display='none'; }

document.getElementById('project-form').addEventListener('submit', async (e) => { 
    e.preventDefault(); 
    await fetch(`${API_URL}/projects`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
            title:document.getElementById('project-title').value,
            description:document.getElementById('project-desc').value,
            userId:currentUser.id
        })
    }); 
    document.getElementById('project-form').reset(); 
    closeModal('project-modal'); 
    showToast('Projet créé');
    fetchProjects(); 
});

// Edit Project
function openEditProjectModal(id, title, desc) {
    document.getElementById('edit-project-id').value = id;
    document.getElementById('edit-project-title').value = title;
    document.getElementById('edit-project-desc').value = desc;
    openModal('edit-project-modal');
}

document.getElementById('edit-project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-project-id').value;
    await fetch(`${API_URL}/projects/${id}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
            title: document.getElementById('edit-project-title').value,
            description: document.getElementById('edit-project-desc').value
        })
    });
    closeModal('edit-project-modal');
    showToast('Projet mis à jour');
    fetchProjects();
});

// Edit Task
function openEditTaskModal(id, title, status, assignedTo, membersStr) {
    document.getElementById('edit-task-id').value = id;
    document.getElementById('edit-task-title').value = title;
    document.getElementById('edit-task-status').value = status;
    
    const members = JSON.parse(decodeURIComponent(membersStr));
    const sel = document.getElementById('edit-task-assign');
    sel.innerHTML = '';
    members.forEach(m => {
        sel.innerHTML += `<option value="${m}" ${m===assignedTo?'selected':''}>${m}</option>`;
    });

    openModal('edit-task-modal');
}

document.getElementById('edit-task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-task-id').value;
    await fetch(`${API_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
            title: document.getElementById('edit-task-title').value,
            status: document.getElementById('edit-task-status').value,
            assignedTo: document.getElementById('edit-task-assign').value
        })
    });
    closeModal('edit-task-modal');
    showToast('Tâche mise à jour');
    fetchProjects();
});

// Create User (Chef)
document.getElementById('create-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('new-user-name').value;
    const email = document.getElementById('new-user-email').value;
    const password = document.getElementById('new-user-pass').value;
    const role = document.getElementById('new-user-role').value;

    const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ username, email, password, role })
    });
    
    if(res.ok) {
        showToast('Utilisateur créé');
        document.getElementById('create-user-form').reset();
        closeModal('create-user-modal');
        fetchUsersForManagement();
    } else {
        const data = await res.json();
        alert(data.msg || 'Erreur');
    }
});

// Edit User (Chef)
function openEditUserModal(id, name, email, role) {
    document.getElementById('edit-user-id').value = id;
    document.getElementById('edit-user-name').value = name;
    document.getElementById('edit-user-email').value = email;
    document.getElementById('edit-user-role').value = role;
    document.getElementById('edit-user-pass').value = ''; // Reset password field
    openModal('edit-user-modal');
}

document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-user-id').value;
    const username = document.getElementById('edit-user-name').value;
    const email = document.getElementById('edit-user-email').value;
    const role = document.getElementById('edit-user-role').value;
    const password = document.getElementById('edit-user-pass').value;

    const body = { username, email, role };
    if(password) body.password = password;

    const res = await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(body)
    });

    if(res.ok) {
        showToast('Utilisateur mis à jour');
        closeModal('edit-user-modal');
        fetchUsersForManagement();
    } else {
        alert('Erreur lors de la mise à jour');
    }
});

// Toast
function showToast(msg) {
    const x = document.getElementById("toast");
    x.innerText = msg;
    x.className = "toast show";
    setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
}