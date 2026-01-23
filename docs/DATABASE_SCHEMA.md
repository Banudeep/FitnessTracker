# FitTrack Database Schema

SQLite database schema for the FitTrack fitness tracker app.

## Tables

### exercises
Stores exercise definitions (built-in and custom).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Unique identifier |
| name | TEXT NOT NULL | Exercise name |
| category | TEXT NOT NULL | Muscle group (chest, back, shoulders, etc.) |
| equipment | TEXT | Equipment type (barbell, dumbbell, machine, etc.) |
| description | TEXT | Exercise description |
| image_url | TEXT | Optional image URL |
| is_custom | INTEGER DEFAULT 0 | 1 if user-created |
| user_id | TEXT | Owner user ID (for custom exercises) |
| created_at | TEXT NOT NULL | ISO timestamp |
| updated_at | TEXT NOT NULL | ISO timestamp |

### workout_templates
User-created and preset workout templates.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Unique identifier |
| user_id | TEXT | Owner user ID |
| name | TEXT NOT NULL | Template name |
| is_preset | INTEGER DEFAULT 0 | 1 if built-in template |
| created_at | TEXT NOT NULL | ISO timestamp |
| updated_at | TEXT NOT NULL | ISO timestamp |

### template_exercises
Junction table linking templates to exercises.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Unique identifier |
| template_id | TEXT NOT NULL | FK to workout_templates |
| exercise_id | TEXT NOT NULL | FK to exercises |
| display_order | INTEGER | Order in template |

### workout_sessions
Logged workout sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Unique identifier |
| user_id | TEXT | Owner user ID |
| template_id | TEXT | FK to workout_templates |
| template_name | TEXT | Template name at time of workout |
| started_at | TEXT NOT NULL | ISO timestamp when workout started |
| completed_at | TEXT | ISO timestamp when workout ended |
| duration_seconds | INTEGER | Total workout duration |
| total_volume | REAL | Sum of weight × reps |
| synced_at | TEXT | When synced to cloud |

### exercise_logs
Individual exercises performed in a session.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Unique identifier |
| session_id | TEXT NOT NULL | FK to workout_sessions |
| exercise_id | TEXT NOT NULL | FK to exercises |
| exercise_name | TEXT | Exercise name at time of workout |
| completed_at | TEXT | When exercise was completed |

### sets
Individual sets within an exercise log.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Unique identifier |
| exercise_log_id | TEXT NOT NULL | FK to exercise_logs |
| set_number | INTEGER NOT NULL | Set order (1, 2, 3...) |
| weight | REAL NOT NULL | Weight used |
| reps | INTEGER NOT NULL | Repetitions completed |
| is_pr | INTEGER DEFAULT 0 | 1 if personal record |
| logged_at | TEXT NOT NULL | ISO timestamp |

### personal_records
Personal records (PRs) for exercises.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Unique identifier |
| user_id | TEXT | Owner user ID |
| exercise_id | TEXT NOT NULL | FK to exercises |
| exercise_name | TEXT | Exercise name |
| weight | REAL NOT NULL | PR weight |
| reps | INTEGER NOT NULL | PR reps |
| achieved_at | TEXT NOT NULL | When PR was achieved |
| session_id | TEXT | FK to workout_sessions |

### body_measurements
Body measurement entries.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Unique identifier |
| user_id | TEXT | Owner user ID |
| weight | REAL | Body weight |
| chest | REAL | Chest measurement |
| waist | REAL | Waist measurement |
| hips | REAL | Hips measurement |
| left_arm | REAL | Left arm measurement |
| right_arm | REAL | Right arm measurement |
| left_thigh | REAL | Left thigh measurement |
| right_thigh | REAL | Right thigh measurement |
| notes | TEXT | Optional notes |
| measured_at | TEXT NOT NULL | ISO timestamp |
| synced_at | TEXT | When synced to cloud |

### streak_history
Weekly workout streak tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Unique identifier |
| user_id | TEXT | Owner user ID |
| week_start | TEXT NOT NULL | Start of week (Sunday) |
| workouts_completed | INTEGER DEFAULT 0 | Count for week |
| goal_met | INTEGER DEFAULT 0 | 1 if weekly goal met |

### settings
App settings key-value store.

| Column | Type | Description |
|--------|------|-------------|
| key | TEXT PRIMARY KEY | Setting key |
| value | TEXT | Setting value |

### app_settings
App-level settings for sample data management.

| Column | Type | Description |
|--------|------|-------------|
| key | TEXT PRIMARY KEY | Setting key |
| value | TEXT NOT NULL | Setting value |

## Entity Relationships

```
exercises <──┬── template_exercises ──> workout_templates
             │
             ├── exercise_logs ──────> workout_sessions
             │
             └── personal_records ───> workout_sessions
```

## Notes

- All timestamps are stored as ISO 8601 strings
- IDs are generated using a combination of random string + timestamp
- The database uses WAL journal mode for better performance
- On web, data is stored in memory and regenerated on each session
