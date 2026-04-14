require('dotenv').config();

const app = require('./server');
const logger = require('./logger');
const port = process.env.PORT || 8000;
const appUrl = process.env.APP_URL || `http://localhost:${port}`;

app.listen(port, () => {
  logger.info('Server started', { port, url: appUrl });
});
