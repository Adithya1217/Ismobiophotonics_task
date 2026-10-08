# API reference

Base path `/api`. JSON in and out. Web sends the `tf_token` cookie; mobile sends `Authorization: Bearer <token>`.

**Error shape (always):**
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Check the highlighted fields", "details": { "email": ["Enter a valid email"] } } }
```
Codes: `VALIDATION_ERROR` 400, `UNAUTHORIZED` / `TOKEN_EXPIRED` / `INVALID_CREDENTIALS` 401, `NOT_FOUND` 404 (also for other users' data), `EMAIL_TAKEN` 409, `RATE_LIMITED` 429, `INTERNAL` 500 (generic text only).

## Auth
| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/auth/register` | `{name, email, password(8+)}` | 201 `{user, token}` + cookie |
| POST | `/auth/login` | `{email, password}` | 200 `{user, token}` + cookie |
| POST | `/auth/logout` | | 200 `{ok}`, clears cookie |
| GET | `/auth/me` | | `{user}` |

## Projects (auth required)
| Method | Path | Notes |
|---|---|---|
| GET | `/projects?search=&status=` | `search` = name contains (case-insensitive); `status` = `NOT_STARTED\|IN_PROGRESS\|COMPLETED`. Each project has `taskCount` |
| POST | `/projects` | `{name, description?, status?, startDate?, endDate? (ISO datetime, end >= start)}` |
| GET / PUT / DELETE | `/projects/:id` | PUT takes the same body as POST |

## Tasks (auth required)
| Method | Path | Notes |
|---|---|---|
| GET | `/projects/:id/tasks?search=&status=&priority=` | `status` = `PENDING\|IN_PROGRESS\|COMPLETED`; `priority` = `LOW\|MEDIUM\|HIGH` |
| GET | `/tasks?search=&status=&priority=&projectId=` | All of the user's tasks, same filters, optional `projectId` |
| POST | `/tasks` | `{projectId, name, description?, priority?, status?, dueDate?}`; 404 if the project isn't yours |
| POST | `/projects/:id/tasks` | `{name, description?, priority?, status?, dueDate? (ISO datetime)}` |
| GET / PUT / DELETE | `/tasks/:id` | PUT takes the same body as POST |

## Dashboard (auth required)
`GET /dashboard` returns
```json
{ "totalProjects": 4, "totalTasks": 13, "completedTasks": 5, "pendingTasks": 6, "inProgressProjects": 2 }
```
`pendingTasks` counts tasks with status `PENDING` only; started tasks are not included. Counts cover the signed-in user only.

`GET /health` returns `{ok:true}` (no auth).
