const express = require('express');
const handlebars = require('express-handlebars');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const nocache = require('nocache');
const passport = require("passport");
const path = require('path');


const logger = require('morgan');  // => For Terminal log messages



const app = express();

// BodyParsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// set view engine 

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.engine('hbs', handlebars.engine({
  layoutsDir: __dirname + '/views/layouts',
  extname: 'hbs',
  defaultLayout: 'layout',
  partialsDir: __dirname + '/views/partials/'
}));

/* 
*   Middleware setup 
*/





app.use(session({
  secret: 'cats',
  resave: false,
  saveUninitialized: true
}));

app.use(cookieParser());

app.use(nocache());


app.use(passport.initialize());
app.use(passport.session());

//static file serving 


app.use(express.static(path.join(__dirname, 'public')));

app.use(logger('dev'));



/* 
*  Utilities  - Db Connection ,Hbs Helpers , moment format .
*/


const mongoose = require('mongoose');
const Handlebars = require('handlebars');
const moment = require('moment');


/* 
*     MongoDB Connection 
*/

require('dotenv').config();

mongoose.set('strictPopulate', false);
mongoose.set('strictQuery', false);
mongoose.connect(process.env.CONNECT, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => {
  console.log('MongoDB connected');
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});


/* 
*    Handlebar Helpers
*/




Handlebars.registerHelper('ifeq', function (a, b, options) {
  if (a == b) { return options.fn(this); }
  return options.inverse(this);
});

Handlebars.registerHelper('ifnoteq', function (a, b, options) {
  if (a != b) { return options.fn(this); }
  return options.inverse(this);
});

Handlebars.registerHelper('increment', function(index) {
  return index + 1;
});

Handlebars.registerHelper('add', function(a, b) {
  return Number(a) + Number(b);
});

Handlebars.registerHelper('subtract', function(a, b) {
  return Number(a) - Number(b);
});

Handlebars.registerHelper('multiply', function(a, b) {
  return Number(a) * Number(b);
});

// moment.js

Handlebars.registerHelper('formatDate', function (date, format) {
  // Ensure the date is valid
  if (!date || !moment(date).isValid()) {
    return "Invalid Date";
  }
  
  // Format the date using moment.js library
  return moment(date).format(format);
});


// User & Admin 

const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');


// Router middleware 

app.use('/', userRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler

app.use(function(req, res, next) {
  res.status(404).render('404',{layout:'emptyLayout'});
});

// error page 

app.use(function(err, req, res, next) {
  res.status(500);
  res.render('error', { error: err });
});
 

app.listen(process.env.PORT);
