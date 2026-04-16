require('dotenv').config();

const app = require('./app');
const logger = require('./utils/logger');
const port = process.env.PORT || 8000;
const appUrl = process.env.APP_URL || `http://localhost:${port}`;

app.listen(port, () => {
  logger.info('Server started', { port, url: appUrl });
});
