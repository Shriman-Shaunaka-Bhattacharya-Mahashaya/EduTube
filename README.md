# EduTube (MVP)

A conceptual, role-based educational media platform built with the MERN stack. This is an initial Minimum Viable Product (MVP) designed to demonstrate core interactions between Educators and Students, including media uploading, tag-based searching, chunked video streaming, and stateful interaction.

## Features

### Educator Portal
- **ID-Based Authentication:** Simplified role-based login system.
- **Media Uploading:** Supports `.mp4`, `.pdf`, `.jpg`/`.png`, and `.txt` via `multipart/form-data`.
- **Dashboard:** Real-time visibility of historical uploads, upvote metrics, and inline media previews.

### Student Portal
- **Tag-Based Discovery:** Exact-match querying for specific educational topics.
- **HTTP Range Streaming:** Native backend video chunking allowing students to stream and scrub through `.mp4` files without downloading the entire payload.
- **Stateful Upvoting:** Array-based user tracking prevents duplicate upvoting and visually toggles interaction state.

## Tech Stack
- **Frontend:** React (Vite), React Router, Axios.
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB Atlas (Mongoose).
- **File Handling:** Multer, native Node `fs` streams.

## Local Installation & Setup

1. **Clone the repository:**
   `git clone <your-repo-url>`

2. **Backend Setup:**
   - Navigate to the backend: `cd edutube-backend`
   - Install dependencies: `npm install`
   - Create a `.env` file in `edutube-backend` with your MongoDB URI:
     `MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/edutube`
     `PORT=5000`
   - Create the uploads directory: `mkdir uploads`
   - Start the server: `npm run dev`

3. **Frontend Setup:**
   - Open a new terminal and navigate to the frontend: `cd edutube-frontend`
   - Install dependencies: `npm install`
   - Start the Vite server: `npm run dev`

4. **Usage:**
   - Access the application at `http://localhost:5173`.
   - Log in with any string and select "Educator" to upload content.
   - Log in with any string and select "Student" to search tags and stream content.

## Current Architecture Limitations & Roadmap
This repository represents Phase 1 of development. The following architectural updates are required before production deployment:
- **Authentication:** Migrate from ID-based logic to secure JWT + bcrypt authentication.
- **Storage:** Replace ephemeral local `uploads/` directory with persistent cloud storage (AWS S3 / Cloudinary).
- **Optimization:** Implement backend file size limits and MIME-type validation.