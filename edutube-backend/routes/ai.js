const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const { PDFParse } = require('pdf-parse');
const { Groq } = require('groq-sdk');

const DocumentChunk = require('../models/DocumentChunk');
const Media = require('../models/Media');
const auth = require('../middleware/auth');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Lazy-load the local embedding model so it doesn't block server startup
let extractor;
async function getExtractor() {
    if (!extractor) {
        // Dynamically import the ESM module in a CommonJS environment
        const { pipeline } = await import('@xenova/transformers');
        // all-MiniLM-L6-v2 is a lightweight, highly accurate 384-dimension model
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return extractor;
}

// Helper to generate the 384-length array
async function generateEmbedding(text) {
    const extract = await getExtractor();
    const output = await extract(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}

// 1. Process PDF into Vector Database
router.post('/process/:mediaId', auth, async (req, res) => {
    try {
        const media = await Media.findById(req.params.mediaId);
        if (!media || !media.mimetype.includes('pdf')) {
            return res.status(400).json({ error: 'Invalid media or not a PDF' });
        }

        // Check if we already processed this PDF to avoid redundant work
        const existingChunks = await DocumentChunk.countDocuments({ mediaId: media._id });
        if (existingChunks > 0) {
            return res.json({ message: 'PDF already processed and ready for AI' });
        }

        // Download the PDF file buffer from Cloudinary
        const response = await axios.get(media.fileUrl, { responseType: 'arraybuffer' });
        // Safely convert the Axios arraybuffer to a Node Buffer
        const buffer = Buffer.from(response.data);

        // Initialize the v2 parser
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        const text = result.text;

        // Free up the server memory
        await parser.destroy();

        // Naive chunking: Split by roughly 1000 characters to keep context windows small
        // In a production app, you would use a semantic text splitter (like LangChain's)
        const chunks = text.match(/[\s\S]{1,1000}/g) || [];

        console.log(`Processing ${chunks.length} chunks for ${media.name}... this will take a moment on the first run.`);

        // Generate embeddings and save to MongoDB
        for (let i = 0; i < chunks.length; i++) {
            const chunkText = chunks[i].trim();
            if (chunkText.length < 10) continue; // Skip garbage chunks

            const embedding = await generateEmbedding(chunkText);

            await DocumentChunk.create({
                mediaId: media._id,
                text: chunkText,
                embedding,
                chunkIndex: i
            });
        }

        res.status(201).json({ message: 'PDF successfully processed into vector database' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to process PDF' });
    }
});

// 2. Ask the AI a Question
router.post('/ask/:mediaId', auth, async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) return res.status(400).json({ error: 'Question is required' });

        // 1. Convert the student's question into math
        const questionEmbedding = await generateEmbedding(question);

        // 2. Search MongoDB for the 3 most mathematically similar text chunks
        const results = await DocumentChunk.aggregate([
            {
                $vectorSearch: {
                    index: 'vector_index',
                    path: 'embedding',
                    queryVector: questionEmbedding,
                    numCandidates: 50,
                    limit: 3,
                    filter: { mediaId: new mongoose.Types.ObjectId(req.params.mediaId) } // Strict isolation
                }
            },
            {
                $project: { text: 1, score: { $meta: 'vectorSearchScore' } }
            }
        ]);

        if (results.length === 0) {
            return res.status(400).json({ error: 'No context found. Ensure the PDF is processed first.' });
        }

        // 3. Assemble the context
        const context = results.map(r => r.text).join('\n\n---\n\n');

        // 4. Send to Groq Llama 3
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are an educational AI assistant. Answer the student's question ONLY using the provided context. If the answer is not in the context, say "I cannot find the answer to this in the document."\n\nCONTEXT:\n${context}`
                },
                {
                    role: 'user',
                    content: question
                }
            ],
            model: 'llama-3.1-8b-instant',
            temperature: 0.1, // Keep it strictly factual
        });

        res.json({ answer: chatCompletion.choices[0].message.content });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate AI response' });
    }
});

module.exports = router;