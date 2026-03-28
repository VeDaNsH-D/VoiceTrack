#!/usr/bin/env node

/**
 * Quick test for LLM extraction endpoints
 * Tests both Python and Node.js backends
 */

const axios = require('axios');

const PYTHON_URL = 'http://localhost:8001';
const NODE_URL = 'http://localhost:5001';

const TEST_INPUTS = [
    {
        text: 'आज मेरे दो रुपये के दस समोसे बेचे।',
        lang: 'Hindi',
        expected: 'samosa/samose'
    },
    {
        text: 'maine 2 chai 20 rupya me bechi',
        lang: 'Hinglish',
        expected: 'chai'
    },
    {
        text: 'Sold 3 items for 100 rupees each',
        lang: 'English',
        expected: 'items'
    }
];

async function testPythonExtraction() {
    console.log('\n' + '='.repeat(60));
    console.log('Testing Python Backend (Port 8001)');
    console.log('='.repeat(60));

    for (const test of TEST_INPUTS) {
        console.log(`\n▶ Testing ${test.lang}: "${test.text}"`);
        try {
            const response = await axios.post(
                `${PYTHON_URL}/process-text`,
                { text: test.text },
                { timeout: 15000 }
            );

            console.log('✓ Status:', response.status);
            const data = response.data?.data || response.data;

            if (data?.sales?.length > 0 || data?.expenses?.length > 0) {
                console.log('✓ Extracted:');
                if (data.sales?.length > 0) {
                    data.sales.forEach(s => {
                        console.log(`  - Sale: ${s.qty}x ${s.item} @ ₹${s.price}`);
                    });
                }
                if (data.expenses?.length > 0) {
                    data.expenses.forEach(e => {
                        console.log(`  - Expense: ${e.item} ₹${e.amount}`);
                    });
                }
                console.log(`  Confidence: ${(data.meta?.confidence || 0.5).toFixed(2)}`);
            } else {
                console.log('⚠ No transactions extracted');
                console.log('Response:', JSON.stringify(data, null, 2));
            }
        } catch (error) {
            console.log('✗ Error:', error.message);
            if (error.response?.data) {
                console.log('Details:', error.response.data);
            }
        }
    }
}

async function testNodeExtraction() {
    console.log('\n' + '='.repeat(60));
    console.log('Testing Node.js Backend (Port 5001)');
    console.log('='.repeat(60));

    for (const test of TEST_INPUTS) {
        console.log(`\n▶ Testing ${test.lang}: "${test.text}"`);
        try {
            const response = await axios.post(
                `${NODE_URL}/api/transactions/process-text`,
                { text: test.text },
                { timeout: 15000 }
            );

            console.log('✓ Status:', response.status);
            const data = response.data;

            if (data?.transactions?.length > 0) {
                console.log('✓ Extracted:');
                data.transactions.forEach(t => {
                    console.log(`  - ${t.type}: ${t.quantity}x ${t.item} @ ₹${t.price_per_unit}`);
                });
                console.log(`  Confidence: ${(data.meta?.confidence || 0.5).toFixed(2)}`);
            } else if (data?.sales?.length > 0 || data?.expenses?.length > 0) {
                console.log('✓ Extracted (legacy format):');
                if (data.sales?.length > 0) {
                    data.sales.forEach(s => {
                        console.log(`  - Sale: ${s.qty}x ${s.item} @ ₹${s.price}`);
                    });
                }
                if (data.expenses?.length > 0) {
                    data.expenses.forEach(e => {
                        console.log(`  - Expense: ${e.item} ₹${e.amount}`);
                    });
                }
                console.log(`  Confidence: ${(data.meta?.confidence || 0.5).toFixed(2)}`);
            } else {
                console.log('⚠ No transactions extracted');
                console.log('Response:', JSON.stringify(data, null, 2));
            }
        } catch (error) {
            console.log('✗ Error:', error.message);
            if (error.response?.data) {
                console.log('Details:', error.response.data);
            }
        }
    }
}

async function main() {
    console.log('Transaction Extraction Test Suite');
    console.log('Testing with LLM-first pipeline\n');

    try {
        await testPythonExtraction();
    } catch (error) {
        console.log('Python backend test failed:', error.message);
    }

    try {
        await testNodeExtraction();
    } catch (error) {
        console.log('Node.js backend test failed:', error.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Test Complete');
    console.log('='.repeat(60) + '\n');
}

main();
