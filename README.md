# TaskFlow Pro

A collaborative project and task management web application with role-based access control, team invitations, and real-time status tracking.

## Features

- **User Authentication** — Register/login with JWT tokens (2h expiry)
- **Role-Based Access** — Chef (project leader) and Member roles with different permissions
- **Project Management** — Create, edit, and delete projects
- **Task Management** — Create tasks with status tracking (TODO → IN_PROGRESS → DONE)
- **Team Invitations** — Invite members to projects
- **User Management** — Full CRUD for user accounts (chef-only)
- **Dashboard** — Active projects, completed/in-progress task statistics

## Technologies

| Technology | Usage |
|------------|-------|
| Node.js | Runtime environment |
| Express.js 5.1.0 | REST API framework |
| Mongoose 9.0.0 | MongoDB ODM |
| MongoDB | Database |
| bcryptjs 3.0.3 | Password hashing |
| jsonwebtoken 9.0.2 | JWT authentication |
| HTML5 | Frontend pages |
| CSS3 | Glass-panel UI design |
| Google Fonts (Inter) | Typography |
| Font Awesome 6.4.0 | Icons |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login and receive JWT |
| `/api/projects` | GET/POST/PUT/DELETE | Project CRUD |
| `/api/projects/:id/invite` | POST | Invite member to project |
| `/api/tasks` | GET/POST/PUT/DELETE | Task CRUD |
| `/api/tasks/project/:id` | GET | Tasks by project |
| `/api/tasks/assigned/:username` | GET | Tasks assigned to user |
| `/api/users` | GET/POST/PUT/DELETE | User management |

## Setup

1. Ensure MongoDB is running on `mongodb://127.0.0.1:27017/taskflow-pro`
2. Run `npm install`
3. Start the server: `npm start`
4. Open `http://localhost:3003` in your browser
