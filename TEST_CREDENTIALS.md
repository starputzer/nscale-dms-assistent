# Test Credentials for Development

## API Authentication

### Admin User
- Email: `martin@danglefeet.com`
- Password: `123`
- Role: `admin`

### JWT Configuration
- Secret Key: `your-secret-key-here-change-in-production`
- Algorithm: `HS256`
- Token Expiry: 24 hours

### Test Token (Admin)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1LCJlbWFpbCI6Im1hcnRpbkBkYW5nbGVmZWV0LmNvbSIsInJvbGUiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0.XXXXX
```

### Environment Variables
```bash
# .env.development
JWT_SECRET_KEY=your-secret-key-here-change-in-production
ADMIN_EMAILS=martin@danglefeet.com,admin@example.com
DEFAULT_ADMIN_PASSWORD=123
```

## How to Use in Tests

1. **For API Tests**:
   ```python
   headers = {
       "Authorization": "Bearer <token>"
   }
   ```

2. **For Direct Database Access**:
   - Users DB: `/opt/nscale-assist/data/db/users.db`
   - Chat DB: `/opt/nscale-assist/data/db/chat_history.db`

## Security Note
⚠️ These are DEVELOPMENT credentials only. Never use in production!