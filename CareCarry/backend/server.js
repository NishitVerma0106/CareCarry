const app = require('./src/app');
const { connectDB } = require('./src/config/database');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║         CareCarry API Server          ║
╠═══════════════════════════════════════╣
║  Status  : Running                    ║
║  Port    : ${PORT}                           ║
║  Mode    : ${(process.env.NODE_ENV || 'development').padEnd(27)}║
║  Health  : http://localhost:${PORT}/health ║
╚═══════════════════════════════════════╝
    `);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
