# Homework Tracker (Dark Mode)

A simple, offline-first homework tracking app built with Create React App and React 18. Keep track of assignments, due dates, priorities, and status in a clean dark interface. Data is stored in your browser via localStorage.

## Features
- Task CRUD: add, edit, delete
- Fields: title, subject, notes, due date/time, priority, status, estimate
- Smart grouping: Overdue, Today, Upcoming, Completed
- Filters: search, subject, status; sort by due/priority/status/updated
- Import/Export tasks as JSON
- Dark, modern UI

## Getting Started

Install dependencies and run the dev server:

```bash
pnpm install
pnpm start
```

Build for production:

```bash
pnpm build
```

## Data Persistence
Tasks are saved locally in `localStorage` under the key `homework_tracker_v1`.

## Tech
- React 18
- Create React App (react-scripts)

## License
MIT