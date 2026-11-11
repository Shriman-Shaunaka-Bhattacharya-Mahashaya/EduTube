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

module.exports = { generateEmbedding };
