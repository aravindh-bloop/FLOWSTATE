# Coach Portal

Simple coach dashboard for managing FlowState client registrations.

## Features

- View pending registrations
- Approve registrations (triggers Discord bot automation)
- Track approved clients

## Development

```bash
yarn dev:coach
```

Server runs on `http://localhost:3001`

## Workflow

1. Users submit registration → `localhost:3000`
2. Coach receives email with review link
3. Coach visits `localhost:3001` → Coach Portal
4. Coach approves registration
5. Discord bot automatically provisions client

## Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:8080)
