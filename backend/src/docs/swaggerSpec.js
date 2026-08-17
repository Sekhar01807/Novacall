export const openapiSpecification = {
    openapi: "3.0.0",
    info: {
        title: "NovaCall REST API",
        version: "1.0.0",
        description: "Official OpenAPI 3.0 specification for NovaCall real-time video conferencing platform.",
        contact: {
            name: "NovaCall Engineering Team",
            email: "support@novacall.io"
        }
    },
    servers: [
        {
            url: "/api/v1/users",
            description: "User & Conference API Endpoint Base"
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "Enter your signed JWT access token in the format: Bearer <token>"
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
        "/forgot_password": {
            post: {
                summary: "Initiate password reset flow (In-memory code generation in demo/dev mode)",
                description: "Generates a 6-digit verification code. In development/demo environments, the code is returned in the response for direct testing. In production, configure SMTP for email dispatch.",
                tags: ["Authentication"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email"],
                                properties: {
                                    email: { type: "string", example: "jane@example.com" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Reset code generated and dispatched" },
                    404: { description: "Account not found" }
                }
            }
        },
        "/reset_password": {
            post: {
                summary: "Reset account password with verification code",
                tags: ["Authentication"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email", "resetCode", "newPassword"],
                                properties: {
                                    email: { type: "string", example: "jane@example.com" },
                                    resetCode: { type: "string", example: "123456" },
                                    newPassword: { type: "string", example: "NewSecurePass123" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Password reset successful" },
                    400: { description: "Invalid or expired code" }
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
                    401: { description: "Unauthorized - Invalid or missing token" }
                }
            }
        },
        "/update_profile": {
            post: {
                summary: "Update user profile information and conferencing preferences",
                tags: ["User Profile"],
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    jobTitle: { type: "string" },
                                    company: { type: "string" },
                                    phone: { type: "string" },
                                    country: { type: "string" },
                                    timeZone: { type: "string" },
                                    statusMsg: { type: "string" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Profile updated successfully" },
                    401: { description: "Unauthorized" }
                }
            }
        },
        "/change_password": {
            post: {
                summary: "Change user account password",
                tags: ["User Profile"],
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["currentPassword", "newPassword"],
                                properties: {
                                    currentPassword: { type: "string" },
                                    newPassword: { type: "string" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Password updated successfully" },
                    401: { description: "Incorrect current password or unauthorized" }
                }
            }
        },
        "/signout_all": {
            post: {
                summary: "Sign out of all sessions",
                tags: ["User Profile"],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: "Signed out of all devices" }
                }
            }
        },
        "/delete_account": {
            post: {
                summary: "Permanently delete user account and associated meeting history",
                tags: ["User Profile"],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: "Account and data deleted" },
                    401: { description: "Unauthorized" }
                }
            }
        },
        "/get_all_activity": {
            get: {
                summary: "Fetch user meeting activity history with pagination and search",
                tags: ["Meeting History"],
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "page",
                        in: "query",
                        required: false,
                        schema: { type: "integer", default: 1 },
                        description: "Page number (1-indexed)"
                    },
                    {
                        name: "limit",
                        in: "query",
                        required: false,
                        schema: { type: "integer", default: 10, maximum: 100 },
                        description: "Number of records per page"
                    },
                    {
                        name: "search",
                        in: "query",
                        required: false,
                        schema: { type: "string" },
                        description: "Optional case-insensitive meeting code search query"
                    }
                ],
                responses: {
                    200: { 
                        description: "Paginated meeting history returned",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        meetings: { type: "array", items: { type: "object" } },
                                        pagination: {
                                            type: "object",
                                            properties: {
                                                total: { type: "integer", example: 42 },
                                                page: { type: "integer", example: 1 },
                                                limit: { type: "integer", example: 10 },
                                                totalPages: { type: "integer", example: 5 },
                                                hasNextPage: { type: "boolean", example: true },
                                                hasPrevPage: { type: "boolean", example: false }
                                            }
                                        },
                                        requestId: { type: "string", example: "b9401-6558-48c5" }
                                    }
                                }
                            }
                        }
                    },
                    401: { description: "Unauthorized" }
                }
            }
        },
        "/add_to_activity": {
            post: {
                summary: "Log a completed meeting conference code to user history",
                tags: ["Meeting History"],
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["meeting_code"],
                                properties: {
                                    meeting_code: { type: "string", example: "demo-room" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: { description: "Added to activity history" },
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
                    201: { description: "Meeting scheduled successfully" },
                    401: { description: "Unauthorized" }
                }
            }
        },
        "/get_upcoming_meetings": {
            get: {
                summary: "Retrieve list of all upcoming scheduled meetings for authenticated user",
                tags: ["Scheduled Meetings"],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: "Scheduled meetings list returned" },
                    401: { description: "Unauthorized" }
                }
            }
        },
        "/delete_scheduled_meeting/{id}": {
            delete: {
                summary: "Cancel/delete a scheduled meeting (owner only)",
                tags: ["Scheduled Meetings"],
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "MongoDB ObjectID of the scheduled meeting"
                    }
                ],
                responses: {
                    200: { description: "Scheduled meeting deleted" },
                    403: { description: "Forbidden - You do not own this meeting" },
                    404: { description: "Meeting not found" }
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
  <title>NovaCall API Documentation (OpenAPI 3.0)</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css">
  <style>
    body { margin: 0; background: #0F172A; font-family: 'Inter', sans-serif; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .swagger-ui .info .title { color: #38BDF8 !important; }
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
