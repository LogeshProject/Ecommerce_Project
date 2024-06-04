const createError = require('http-errors');
const express = require('express');
const handlebars = require('express-handlebars');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose')
const hbs = require('hbs')
const session = require('express-session')
const Handlebars = require('handlebars')
const exphbs = require('express-handlebars')
const nocache = require('nocache')
const multer = require('multer')
const swal=require('sweetalert')
const passport = require("passport")
 require('dotenv').config()

 mongoose.set('strictQuery', false);
 mongoose.connect(process.env.CONNECT, { useNewUrlParser: true, useUnifiedTopology: true })
 .then(() => {
   console.log('MongoDB connected');
 })
 .catch(err => {
   console.error('MongoDB connection error:', err);
 });

const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');


const app = express();


// let hbss = exphbs.create({})


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.engine('hbs', handlebars.engine({
  layoutsDir: __dirname + '/views/layouts',
  extname: 'hbs',
  defaultLayout: 'layout',
  partialsDir: __dirname + '/views/partials/'
}));



app.use(session({
  secret: 'cats',
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

hbs.registerPartials(path.join(__dirname,'/views/partials'))


Handlebars.registerHelper('ifeq', function (a, b, options) {
  if (a == b) { return options.fn(this); }
  return options.inverse(this);
});




Handlebars.registerHelper('ifnoteq', function (a, b, options) {
  if (a != b) { return options.fn(this); }
  return options.inverse(this);
});


Handlebars.registerHelper("for", function (from, to, incr, block) {
  let accum = "";
  for (let i = from; i <= to; i += incr) {
    accum += block.fn(i);
  }
  return accum;

})


Handlebars.registerHelper('ifCond', function(v1, v2, options) {
  if (v1 === v2) {
    return options.fn ? options.fn(this) : options.fn;
  } else {
    return options.inverse ? options.inverse(this) : options.inverse
  }
})

Handlebars.registerHelper('multiply', function(a, b) {
  return a * b;
});

Handlebars.registerHelper('subtract', function(a, b) {
  return a - b;
});

Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});




app.use(session({
  secret: 'secret',
  saveUninitialized: true,
   cookie: { maxAge: 600000000 },
  resave: false 
}));


app.use(nocache());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
// app.use(multer({dest: 'uploads', storage: fileStorage, fileFilter: fileFilter}).single('image'))

app.use('/', userRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler

app.use(function(req, res, next) {
  res.status(404).render('404',{layout:'emptyLayout'});
});






app.use(function(err, req, res, next) {
  res.status(500);
  res.render('error', { error: err });
});
 

module.exports = app;
