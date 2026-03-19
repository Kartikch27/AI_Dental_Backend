# AI Dental Backend — API Reference

**Base URL:** `http://localhost:3001/api/v1`

**Auth:** All protected routes require:
```
Authorization: Bearer <jwt_token>
```
Admin routes additionally require `role: "ADMIN"` in the JWT payload.

---

## Authentication

### Register
```
POST /auth/register
```
**Body:**
```json
{
  "email": "student@example.com",
  "password": "yourpassword",
  "name": "John Doe",
  "role": "STUDENT"          // "STUDENT" | "ADMIN" (default: STUDENT)
}
```
**Response:**
```json
{
  "id": "uuid",
  "email": "student@example.com",
  "name": "John Doe",
  "role": "STUDENT"
}
```

---

### Login
```
POST /auth/login
```
**Body:**
```json
{
  "email": "student@example.com",
  "password": "yourpassword",
  "role": "STUDENT"          // must match the account role
}
```
**Response:**
```json
{
  "access_token": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "email": "student@example.com",
    "name": "John Doe",
    "role": "STUDENT"
  }
}
```

---

## Syllabus Tree

All syllabus endpoints are **public** (no auth needed).

The hierarchy is: `YEAR → SUBJECT → CHAPTER → CONCEPT`

### Get Full Tree
```
GET /syllabus/tree
```
**Response:** Nested array of all nodes.
```json
[
  {
    "id": "uuid",
    "name": "BDS 3",
    "type": "YEAR",
    "parentId": null,
    "orderIndex": 0,
    "children": [
      {
        "id": "uuid",
        "name": "Orthodontics",
        "type": "SUBJECT",
        "parentId": "...",
        "orderIndex": 0,
        "children": [
          {
            "id": "uuid",
            "name": "Classification of Malocclusion",
            "type": "CHAPTER",
            "children": []
          }
        ]
      }
    ]
  }
]
```

---

### Get Root Nodes (Years only)
```
GET /syllabus/roots
```
**Response:** Array of YEAR nodes (no children).

---

### Get Children of a Node
```
GET /syllabus/:id/children
```
**Response:** Array of direct child nodes.

---

### Get Node Breadcrumb Path
```
GET /syllabus/:id/path
```
**Response:**
```json
{
  "path": [
    { "id": "uuid", "name": "BDS 3", "type": "YEAR" },
    { "id": "uuid", "name": "Orthodontics", "type": "SUBJECT" },
    { "id": "uuid", "name": "Classification of Malocclusion", "type": "CHAPTER" }
  ],
  "scope": {
    "nodeId": "uuid",
    "yearId": "uuid",
    "subjectId": "uuid",
    "chapterId": "uuid",
    "conceptId": null
  }
}
```

---

### Create Syllabus Node
```
POST /syllabus
```
**Body:**
```json
{
  "name": "Orthodontics",
  "type": "SUBJECT",          // "YEAR" | "SUBJECT" | "CHAPTER" | "CONCEPT"
  "parentId": "uuid"          // required for everything except YEAR
}
```
**Response:** The created node object.

---

## Notes Generation

### Generate Notes  `🔒 JWT required`
```
POST /notes/generate
```
**Body:**
```json
{
  "nodeId": "uuid",           // chapter/concept/subject nodeId from the syllabus tree
  "style": "EXAM_NOTES"       // "EXAM_NOTES" | "DETAILED" | "SUMMARY" | "BULLET_POINTS"
}
```
**Response:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "nodeId": "uuid",
  "style": "EXAM_NOTES",
  "content": "**EXAM NOTES: Classification of Malocclusion**\n\n...",
  "createdAt": "2026-03-18T...",
  "node": {
    "id": "uuid",
    "name": "Classification of Malocclusion",
    "type": "CHAPTER"
  }
}
```

---

### Notes History  `🔒 JWT required`
```
GET /notes/history
```
**Response:** Array of past note generations for the logged-in user.

---

## Test Papers

### Generate Test Paper  `🔒 JWT required`
```
POST /test-papers/generate
```
**Body:**
```json
{
  "nodeId": "uuid",           // chapter/subject nodeId
  "questionCount": 10,        // number of questions
  "difficulty": "MEDIUM"      // "EASY" | "MEDIUM" | "HARD"
}
```
**Response:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "nodeId": "uuid",
  "content": "Q1. What is Angle's classification?...",
  "createdAt": "2026-03-18T..."
}
```

---

### Test Paper History  `🔒 JWT required`
```
GET /test-papers/history
```
**Response:** Array of past test papers for the logged-in user.

---

## Viva (Oral Exam Practice)

### Start Viva Session  `🔒 JWT required`
```
POST /viva/start
```
**Body:**
```json
{
  "nodeId": "uuid"            // chapter/subject to be examined on
}
```
**Response:**
```json
{
  "sessionId": "uuid",
  "question": "What are the key features of Class II malocclusion?",
  "nodeId": "uuid"
}
```

---

### Submit Answer  `🔒 JWT required`
```
POST /viva/answer
```
**Body:**
```json
{
  "sessionId": "uuid",
  "answer": "Class II malocclusion is characterized by..."
}
```
**Response:**
```json
{
  "feedback": "Good answer! You covered the key points...",
  "nextQuestion": "Now explain the treatment options for Class II...",
  "isComplete": false
}
```

---

### Get Session History  `🔒 JWT required`
```
GET /viva/session/:id
```
**Response:** Full message history of the viva session.
```json
{
  "id": "uuid",
  "nodeId": "uuid",
  "status": "active",
  "messages": [
    { "role": "assistant", "content": "What are the key features of..." },
    { "role": "user", "content": "Class II is characterized by..." },
    { "role": "assistant", "content": "Good answer! Next question..." }
  ]
}
```

---

## RAG Search

### Direct Context Query  `🔒 JWT required`
```
POST /rag/generate
```
Use this for custom queries (not needed for notes/viva — those call RAG internally).

**Body:**
```json
{
  "query": "What is Angle's classification?",
  "scope": {
    "yearId": "uuid",         // optional — filter to a year
    "subjectId": "uuid",      // optional — filter to a subject
    "chapterId": "uuid"       // optional — filter to a chapter
  },
  "history": []               // optional prior conversation turns
}
```
**Response:** Streamed text (SSE) or JSON with generated answer + sources.

---

## PDF Export

### Export Content as PDF  `🔒 JWT required`
```
POST /pdf/export
```
**Body:**
```json
{
  "title": "Classification of Malocclusion - Exam Notes",
  "content": "**EXAM NOTES**\n\n..."
}
```
**Response:** Binary PDF file (`Content-Type: application/pdf`).

---

## Admin — RAG Document Management  `🔒 JWT + ADMIN role`

### Ingest a PDF File
```
POST /admin/rag/ingest-file
Content-Type: multipart/form-data
```
**Form fields:**
| Field | Type | Description |
|---|---|---|
| `file` | File | PDF file to ingest |
| `title` | string | Human-readable name |
| `metadata` | JSON string | `{"nodeId":"uuid","sourceType":"notes","autoDetectChapters":true}` |

The `nodeId` should point to a **SUBJECT** node. The system will automatically:
1. Detect if the PDF is scanned (image-based)
2. Extract Table of Contents using Groq Vision (Llama 4 Scout)
3. OCR each chapter with Tesseract (4 chapters in parallel)
4. Create CHAPTER nodes in the syllabus tree automatically
5. Chunk, embed, and index all content

**Response:**
```json
{
  "id": "uuid",
  "title": "Orthodontics - Bhalaji",
  "ingestionStatus": "PENDING",
  "yearId": "uuid",
  "subjectId": "uuid",
  "nodeId": "uuid"
}
```

---

### Preview Chapters (Dry Run)
```
POST /admin/rag/preview-chapters
Content-Type: multipart/form-data
```
**Form fields:** `file` (PDF)

Returns the detected chapter structure WITHOUT ingesting anything. Use this to verify detection before committing.

**Response:**
```json
{
  "strategy": "claude_vision_toc",
  "pdfType": "scanned",
  "pageCount": 686,
  "sectionCount": 9,
  "chapterCount": 42,
  "sections": [
    {
      "title": "Section 1 Introduction & Growth",
      "chapters": [
        { "number": 1, "title": "Introduction to Orthodontics", "page": 1 }
      ]
    }
  ]
}
```

---

### Ingest Plain Text
```
POST /admin/rag/ingest
Content-Type: application/json
```
**Body:**
```json
{
  "title": "Lecture Notes on Cephalometrics",
  "content": "Cephalometrics is the study of...",
  "metadata": {
    "nodeId": "uuid",
    "sourceType": "notes",
    "autoDetectChapters": false
  }
}
```

---

### List All Documents
```
GET /admin/rag/documents
```
**Response:** Array of all ingested documents with status and chunk count.

---

### Get Document Detail
```
GET /admin/rag/documents/:id
```

---

### Get Document Chunks
```
GET /admin/rag/documents/:id/chunks
```
Returns all chunks with their syllabus scope labels (year, subject, chapter).

---

### Retry Failed Ingestion
```
POST /admin/rag/documents/:id/retry
```
Re-queues the ingestion job for a document that failed or is stuck.

---

### Delete Document
```
DELETE /admin/rag/documents/:id
```
Deletes the document and all its chunks from the vector store.

**Response:**
```json
{ "success": true, "message": "Document and its chunks deleted successfully" }
```

---

## Error Responses

All errors follow this shape:
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

| Code | Meaning |
|---|---|
| 400 | Bad request / missing fields |
| 401 | Missing or invalid JWT token |
| 403 | Valid token but insufficient role (need ADMIN) |
| 404 | Resource not found |
| 500 | Server error |

---

## Quick Start for Frontend

```js
// 1. Login
const { access_token } = await POST('/auth/login', { email, password, role: 'STUDENT' })

// 2. Get syllabus tree
const tree = await GET('/syllabus/tree')
// Pick a chapterId from tree[0].children[0].children[0].id

// 3. Generate notes
const notes = await POST('/notes/generate', { nodeId: chapterId, style: 'EXAM_NOTES' }, token)

// 4. Start viva
const viva = await POST('/viva/start', { nodeId: chapterId }, token)
await POST('/viva/answer', { sessionId: viva.sessionId, answer: 'My answer...' }, token)

// 5. Export as PDF
const pdf = await POST('/pdf/export', { title: 'My Notes', content: notes.content }, token)
// Response is binary — create a blob URL
```
