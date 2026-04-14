require('dotenv').config();

const app = require('./server');
const port = process.env.PORT || 8000;

app.listen(port, () => {
  const host = process.env.APP_URL || `http://localhost:${port}`;
  console.log(`Server is running on ${host}`);
});
