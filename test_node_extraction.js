#!/usr/bin/env node

/**
 * Test Node.js LLM extraction service directly
 */

const { extractWithLLM, detectLanguage } = require('./backend/src/services/llm-extraction.service');

const testTexts = [
    "आज मेरे दो रुपये के दस समोसे बेचे।",
    "मैंने 50 रुपये का दूध खरीदा",
    "maine 20 rupee ka chai becha",
];

console.log("\n" + "=".repeat(70));
console.log("  NODE.JS LLM EXTRACTION SERVICE TEST");
console.log("=".repeat(70) + "\n");

(async () => {
    for (const [i, text] of testTexts.entries()) {
        console.log(`Test ${i + 1}: ${text}`);

        try {
            const language = detectLanguage(text);
            console.log(`Language: ${language}`);

            const result = await extractWithLLM(text);

            console.log(`✓ Extraction succeeded!`);
            console.log(`Result:`, JSON.stringify(result, null, 2));
        } catch (error) {
            console.log(`✗ Extraction failed: ${error.message}`);
        }

        console.log("-".repeat(70) + "\n");
    }
})();
