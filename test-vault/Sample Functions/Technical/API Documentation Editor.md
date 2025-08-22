# API Documentation Editor

**Function ID**: `technical-api-documentation`
**Category**: Technical Writing
**Mode**: API Documentation

## Function Description

This function analyzes API documentation and code examples to improve clarity, completeness, and developer experience. It ensures documentation follows best practices and includes all necessary information for successful API integration.

## Usage Examples

### Input Text
```
POST /api/users

Creates a user. Send user data in the body. Returns user object.

Parameters:
- name: user name
- email: user email

Example:
POST /api/users
{
  "name": "John",
  "email": "john@example.com"
}
```

### Expected Output
```
## POST /api/users

Creates a new user account in the system.

### Request

**Method:** `POST`
**Endpoint:** `https://api.example.com/v1/users`
**Content-Type:** `application/json`
**Authentication:** Required (Bearer token)

#### Request Body

| Parameter | Type | Required | Description | Constraints |
|-----------|------|----------|-------------|-------------|
| `name` | string | Yes | User's full name | 2-50 characters, letters and spaces only |
| `email` | string | Yes | User's email address | Valid email format, must be unique |
| `phone` | string | No | User's phone number | E.164 format (e.g., +1234567890) |

#### Example Request

```bash
curl -X POST https://api.example.com/v1/users \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "email": "john.smith@example.com",
    "phone": "+1234567890"
  }'
```

### Response

#### Success Response (201 Created)

```json
{
  "id": "usr_1a2b3c4d5e6f",
  "name": "John Smith",
  "email": "john.smith@example.com",
  "phone": "+1234567890",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "status": "active"
}
```

#### Error Responses

**400 Bad Request** - Invalid input data
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "Email format is invalid"
      }
    ]
  }
}
```

**409 Conflict** - Email already exists
```json
{
  "error": {
    "code": "DUPLICATE_EMAIL",
    "message": "A user with this email already exists"
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique user identifier |
| `name` | string | User's full name |
| `email` | string | User's email address |
| `phone` | string | User's phone number (if provided) |
| `created_at` | string | ISO 8601 timestamp of user creation |
| `updated_at` | string | ISO 8601 timestamp of last update |
| `status` | string | User status: `active`, `inactive`, `suspended` |

### Rate Limiting

This endpoint is limited to 100 requests per minute per API key.

### SDKs and Code Examples

#### JavaScript
```javascript
const response = await fetch('https://api.example.com/v1/users', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-api-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'John Smith',
    email: 'john.smith@example.com'
  })
});

const user = await response.json();
console.log(user);
```

#### Python
```python
import requests

response = requests.post(
    'https://api.example.com/v1/users',
    headers={
        'Authorization': 'Bearer your-api-key',
        'Content-Type': 'application/json'
    },
    json={
        'name': 'John Smith',
        'email': 'john.smith@example.com'
    }
)

user = response.json()
print(user)
```
```

## Function Configuration

```json
{
  "functionId": "technical-api-documentation",
  "name": "API Documentation Editor",
  "category": "technical",
  "mode": "api-documentation",
  "description": "Improves API documentation clarity, completeness, and developer experience",
  "parameters": {
    "includeExamples": true,
    "addErrorCodes": true,
    "showRateLimits": true,
    "includeSDKExamples": true,
    "formatTables": true,
    "validateJSON": true,
    "addAuthentication": true
  },
  "prompts": {
    "primary": "Analyze this API documentation and improve its clarity, completeness, and developer experience. Include proper formatting, examples, error handling, and all necessary technical details.",
    "followUp": "Ensure the documentation includes complete request/response examples, error codes, rate limiting information, and code examples in multiple languages."
  }
}
```

## Testing Scenarios

### Scenario 1: Incomplete Endpoint Documentation
**Input**: Basic endpoint description without proper structure
**Expected**: Complete documentation with request/response details, examples, and error handling

### Scenario 2: Missing Code Examples
**Input**: API documentation without practical examples
**Expected**: Multiple code examples in different programming languages

### Scenario 3: Unclear Parameter Descriptions
**Input**: Vague or incomplete parameter documentation
**Expected**: Clear parameter tables with types, constraints, and descriptions

### Scenario 4: Missing Error Documentation
**Input**: API docs without error handling information
**Expected**: Comprehensive error response documentation with codes and examples

### Scenario 5: Inconsistent Formatting
**Input**: Poorly formatted API documentation
**Expected**: Consistent, professional formatting with proper structure

## Advanced Features

### Schema Validation
- Validates JSON schemas in examples
- Ensures request/response consistency
- Checks data type accuracy

### OpenAPI Integration
- Converts documentation to OpenAPI format
- Validates against OpenAPI specifications
- Generates interactive documentation

### Example Generation
- Creates realistic example data
- Ensures examples are consistent
- Validates example syntax

## Success Criteria

- [ ] Provides complete API endpoint documentation
- [ ] Includes proper request/response examples
- [ ] Documents all parameters with types and constraints
- [ ] Shows comprehensive error handling
- [ ] Includes multiple programming language examples
- [ ] Maintains consistent formatting and structure
- [ ] Response time under 5 seconds
- [ ] Validates JSON syntax in examples

## Documentation Standards Enforced

1. **Structure**: Clear hierarchy with consistent formatting
2. **Completeness**: All parameters, responses, and errors documented
3. **Examples**: Working code examples in multiple languages
4. **Clarity**: Plain English descriptions for complex concepts
5. **Consistency**: Uniform naming conventions and formats
6. **Accuracy**: Validated JSON and code examples
7. **Developer Experience**: Easy-to-follow implementation guides