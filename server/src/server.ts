import { createApp } from './app.js';
import { connectDB } from './config/database.js';
import { env } from './config/env.js';

const startServer = async () => {
  try {
    await connectDB();
    const app = createApp();

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Preplate API running in ${env.NODE_ENV} mode on http://localhost:${env.PORT}${env.API_PREFIX}`);
      console.log(`📡 Health Check: http://localhost:${env.PORT}/health`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Gracefully shutting down...`);
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Fatal Server Startup Error:', error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
