/* eslint-disable no-process-exit */
const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log(err);
  console.log('Uncaught Exception. Shutting down...');
  process.exit(1);
});

dotenv.config({ path: './config.env' });

const app = require('./app');

const DB = process.env.DATABASE;

const port = process.env.PORT || 3000;

mongoose.connect(DB).then(() => console.log('DB connection successful!'));

const server = app.listen(port, () => {
  console.log(`App listening on ${port}`);
});

process.on('unhandledRejection', (err) => {
  console.log(err);
  console.log(err.name, err.message);
  console.log('Unhandled rejection. Shutting down...');
  server.close(() => {
    process.exit(1);
  });
});

module.exports = server;
