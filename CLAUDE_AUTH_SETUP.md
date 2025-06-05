# Authentication Setup for Claude

## How to provide credentials to Claude

### Option 1: Environment Variables (Recommended)
Create a `.env.claude` file:
```bash
# Admin credentials for testing
CLAUDE_TEST_EMAIL=martin@danglefeet.com
CLAUDE_TEST_PASSWORD=123
CLAUDE_TEST_ROLE=admin
```

### Option 2: In CLAUDE.md
Add at the top of your CLAUDE.md file:
```markdown
## Test Credentials
- Admin: martin@danglefeet.com / 123
- User: test@example.com / test123
```

### Option 3: Token File
Create a `.claude_token` file that gets updated automatically:
```bash
# This token is auto-generated on each server start
CLAUDE_AUTH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Option 4: Test Mode
Add to your server configuration:
```python
# In server.py or config.py
if os.getenv("CLAUDE_TEST_MODE") == "true":
    # Bypass auth for specific test endpoints
    # Or use a fixed test token
    pass
```

## Current Working Setup

1. **Login Credentials**:
   - Email: `martin@danglefeet.com`
   - Password: `123`
   - Role: `admin`

2. **Token Details**:
   - Algorithm: HS256
   - Expiry: ~24 hours
   - Contains: user_id, email, role

3. **How Claude will use it**:
   ```python
   # Automatic login on each test
   from test_auth_helper import auth_helper
   
   # Get headers with valid token
   headers = auth_helper.get_auth_headers()
   
   # Make authenticated requests
   response = requests.get(url, headers=headers)
   ```

## Security Notes
- ⚠️ These are DEVELOPMENT credentials only
- Never commit real production credentials
- Consider using rotating test tokens
- Use environment-specific configurations