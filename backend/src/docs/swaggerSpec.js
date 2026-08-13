export const openapiSpecification = {
    openapi: "3.0.0",
    info: {
        title: "NovaCall REST API",
        version: "1.0.0",
        description: "Official REST API documentation for NovaCall real-time video conferencing platform.",
        contact: {
            name: "NovaCall Engineering Team",
            email: "support@novacall.io"
        }
    },
    servers: [
        {
            url: "/api/v1/users",
            description: "Production & Local API Base"
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT"
            }
        }
    },
    paths: {
        "/register": {
            post: {
                summary: "Register a new user account",
                tags: ["Authentication"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name", "email", "username", "password"],
                                properties: {
                                    name: { type: "string", example: "Jane Doe" },
                                    email: { type: "string", example: "jane@example.com" },
                                    username: { type: "string", example: "janedoe" },
                                    password: { type: "string", example: "SecurePass123" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: { description: "User registered successfully" },
                    400: { description: "Validation error" },
                    409: { description: "User already exists" }
                }
            }
        },
        "/login": {
            post: {
                summary: "Authenticate user and issue JWT access token",
                tags: ["Authentication"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["username", "password"],
                                properties: {
                                    username: { type: "string", example: "janedoe" },
                                    password: { type: "string", example: "SecurePass123" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Login successful with JWT access token" },
                    401: { description: "Invalid credentials" }
                }
            }
        },
        "/get_profile": {
            get: {
                summary: "Get user account profile details",
                tags: ["User Profile"],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: "User profile data returned" },
                    401: { description: "Unauthorized" }
                }
            }
        },
        "/get_all_activity": {
            get: {
                summary: "Fetch user meeting activity history",
                tags: ["Meeting History"],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: "Meeting history list returned" },
                    401: { description: "Unauthorized" }
                }
            }
        },
        "/create_scheduled_meeting": {
            post: {
                summary: "Schedule an upcoming conference session",
                tags: ["Scheduled Meetings"],
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["title", "date", "time", "meeting_code"],
                                properties: {
                                    title: { type: "string", example: "Sprint Planning" },
                                    date: { type: "string", example: "2026-08-20" },
                                    time: { type: "string", example: "10:00 AM" },
                                    meeting_code: { type: "string", example: "plan-room" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: { description: "Meeting scheduled" },
                    401: { description: "Unauthorized" }
                }
            }
        }
    }
};

export const renderSwaggerHTML = (spec) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NovaCall API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css">
  <style>
    body { margin: 0; background: #0F172A; font-family: sans-serif; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui { max-width: 1200px; margin: 0 auto; padding: 20px; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        spec: ${JSON.stringify(spec)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>
`;
