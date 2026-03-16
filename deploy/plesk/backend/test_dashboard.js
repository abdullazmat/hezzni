const controller = require('./controllers/adminDashboardController');
const db = require('./config/db');

const mockRes = {
    status: (code) => {
        console.log('Status:', code);
        return mockRes;
    },
    json: (data) => {
        console.log('JSON:', JSON.stringify(data, null, 2));
    }
};

const mockReq = {
    query: { region: 'All Regions' },
    user: { id: 1 }
};

async function test() {
    console.log('Testing getMetrics...');
    await controller.getMetrics(mockReq, mockRes);
    console.log('\nTesting getRegionsPerformance...');
    await controller.getRegionsPerformance(mockReq, mockRes);
    process.exit(0);
}

test();
