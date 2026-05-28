# EduTube 🎓🤖
**An AI-Powered Educational Media Platform with Local RAG, Intent Routing & Conversational Memory**

EduTube is a full-stack role-based learning platform. It allows educators to host secure, cloud-delivered content while empowering students with a custom-built AI Tutor. The platform features a zero-cost local embedding pipeline, MongoDB Atlas Vector Search, a natural language routing agent, and a modern, scalable design system.

---

## 🚀 Architectural Highlights

* **Zero-Cost RAG Pipeline:** Generates 384-dimensional vector embeddings locally within the Node.js process using `@xenova/transformers` (`all-MiniLM-L6-v2`), eliminating the need for paid embedding APIs.
* **Agentic Search Routing & Full-Text Search:** Replaces standard database querying with an AI routing layer. Natural language queries are processed by Groq's Llama 3.1 to extract intent, dynamically mapping to MongoDB Native Full-Text Search (inverted indexes) for O(1) linguistically-aware lookups (stemming), avoiding expensive O(N) regex collection scans.
* **Stateful Conversational Memory:** Bypasses the stateless nature of LLMs by maintaining a rolling conversational window on the client, streaming historical context back to the backend to enable multi-turn, pronoun-aware interactions with the AI Tutor.
* **Cascading Teardowns:** Deleting media triggers a highly optimized concurrent teardown, simultaneously wiping the MongoDB document, purging orphaned vector data from the Atlas Search index, and destroying the physical file on the Cloudinary CDN to prevent storage bloat.
* **Dual-Write Denormalization:** User metrics (like subscriber counts and bookmarked metadata) are strategically denormalized across collections to prevent expensive `$in` array lookups and pipeline bottlenecks on dashboard load.

---

## 🛠️ Tech Stack

**Frontend:** React.js, Vite, Axios, Scalable CSS Variable Architecture

**Backend:** Node.js, Express.js

**Database:** MongoDB Atlas (Document Store, Native Vector Search, & Full-Text Indexes)

**Storage / CDN:** Cloudinary, Multer

**Authentication:** JSON Web Tokens (JWT), bcryptjs

**AI / ML:** Groq SDK (Llama 3.1 8B), `@xenova/transformers`, `pdf-parse`

---

## ⚙️ Core Features

### 👨‍🏫 Educator Portal
* **CDN Integration:** Upload videos, images, and PDFs securely to Cloudinary.
* **Analytics:** Real-time subscriber tracking powered by dual-write database operations.
* **Lifecycle Management:** Complete CRUD control with cascading system cleanup.

### 🎓 Student Portal
* **Dynamic Dashboards:** Track subscribed educators, saved topics, and bookmarked media for hyper-fast `_id` retrieval.
* **Interactive Media:** Upvote content, download files, and stream videos directly.
* **Dual-State Search:** Toggle between strict database filtering and AI natural language intent routing.

### 🧠 Embedded AI Tutor
* **PDF Knowledge Base:** The backend downloads Cloudinary PDFs into memory buffers, chunks the text, and maps the vectors to the Atlas index.
* **Multi-Turn Chat:** Students can query the document in real-time. The AI is strictly prompted to ground its answers exclusively in the retrieved mathematical context while maintaining awareness of previous questions.

---

## 💻 Local Setup & Deployment

### 1. Environment Variables
Create a `.env` file in the `edutube-backend` root directory:
PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_key

CLOUDINARY_CLOUD_NAME=your_cloud_name

CLOUDINARY_API_KEY=your_api_key

CLOUDINARY_API_SECRET=your_api_secret

GROQ_API_KEY=your_groq_api_key

### 2. Install Dependencies
### Backend
cd edutube-backend
npm install

### Frontend
cd edutube-frontend
npm install

### 3. Provision the Atlas Vector Index (Critical)
To enable the RAG pipeline, you must manually create a Vector Search Index in your MongoDB Atlas dashboard. (Note: The standard Full-Text Index is built automatically by Mongoose on startup).
1. Target the `documentchunks` collection.
2. Create an **Atlas Search Index** using the JSON Editor.
3. Name it exactly: `vector_index`
4. Use this schema:

`
{
  "fields": [
    {
      "numDimensions": 384,
      "path": "embedding",
      "similarity": "cosine",
      "type": "vector"
    },
    {
      "path": "mediaId",
      "type": "filter"
    }
  ]
}
`

### 4. Boot the Application
### Start the backend API
npm run dev

### Start the Vite frontend
npm run dev