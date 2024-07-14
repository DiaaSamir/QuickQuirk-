const errorController = require('./controllers/errorController');
const express = require('express');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

const productRouter = require('./routes/productRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const userRouter = require('./routes/userRoutes');
const addToCartRouter = require('./routes/addToCartRoutes');
const paymentRouter = require('./routes/paymentRoutes');
const pastOrdersRouter = require('./routes/pastOrderRoutes');

const app = express();

//Setting HTTP headers
app.use(helmet());

//limiting IP requests with this middleware to avoid DOS & brute force attacks
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, Please try again after an hour!',
});

app.use('/api', limiter);

//Data sanitization against noSql queries injection
app.use(mongoSanitize());
//Data sanitization against XSS
app.use(xss());
//prevent parameter pollution
app.use(
  hpp({
    whitelist: ['ratingsQuantity', 'ratingsAverage', 'price'],
  })
);
//bodyParser, reading data from body into req.body
app.use(express.json({ limit: '50kb' }));

//serving static files
app.use(express.static(`${__dirname}/uploads`));

app.use(express.json());

app.use('/api/v1/product', productRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/addToCart', addToCartRouter);
app.use('/api/v1/checkout', paymentRouter);
app.use('/api/v1/myOrders', pastOrdersRouter);

app.all('*', (req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on the server`,
  });
  next();
});

app.use(errorController);

module.exports = app;