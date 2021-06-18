if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

// requring all the necessary modules
const express = require('express');
const app=express();
const bcrypt = require('bcrypt');
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

//db operations
mongoose.connect("mongodb://localhost:27017/usersDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

var userSchema = new mongoose.Schema({
  id: String,
  name: String,
  email: String,
  password: String
});

var User = mongoose.model('FoodPandaUser', userSchema);


//passport config file
const initializePassport = require('./passport-config')
initializePassport(
  passport,
  email => users.find(user => user.email === email),
  id => users.find(user => user.id === id)
)


const users = [];
var userMail;

// setting view-engine as ejs
app.set('view-engine', 'ejs');

// letting server know that all css files are in this public folder
app.use(express.static("public"));

// using all other modules that are required
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

// setting root as index.ejs file
app.get('/', checkAuthenticated, (req, res) => {
  res.render('index.ejs', { name: req.user.name })
})

// login page redirect
app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

// ergister page redirect
app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register.ejs')
})

// validating data that is posted in register page
app.post('/register', checkNotAuthenticated, async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    var newuser = new User();

    newuser.id = Date.now().toString();
    newuser.name = req.body.name;
    newuser.email = req.body.email;
    newuser.password = hashedPassword;

    let saveuser = newuser.save(function(err, savedUser) {
      if(err) {
        console.log(err);
        return res.status(500).send();
      }

      return res.status(200).send();
    });

    users.push({
      id: Date.now().toString(),
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword
    })
    userMail = req.body.email;
    res.redirect('/login')
  } catch {
    res.redirect('/register')
  }
})

// redirecting to gallery page
app.get('/gallery', async (req,res) => {
  res.render('gallery.ejs');
})

// redirecting to order page
app.get('/order', async (req,res) => {

  res.render('order.ejs');

  //sending mail through nodemailer
    let testAccount = await nodemailer.createTestAccount();
  // create reusable transporter object using the default SMTP transport
   let transporter = nodemailer.createTransport({
     host: "smtp.ethereal.email",
     port: 587,
     secure: false, // true for 465, false for other ports
     auth: {
       user: testAccount.user, // generated ethereal user
       pass: testAccount.pass, // generated ethereal password
     },
   });
   // send mail with defined transport object
   var mailOptions = {
     from: '<foodpanda@gmail.com>',
     to: userMail,
     subject: "FoodPanda - Order Confirmation",
     text: "Your order has been confirmed. Available payment methods: googlepay-foodpanda@okicicibank;",
     html: "<b>Show transaction confirmation to collect your order</b>",
   }
   let info = await transporter.sendMail(mailOptions, function(error, info){
     if(error){
       console.log(error);
     } else {
       console.log("Email sent: " + info.response);
     }
   });
})

// logout functionality
app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('/login')
})

// preventing access to register page when successfully logged in
function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect('/login')
}

// preventing redirect to login page from home page
function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/')
  }
  next()
}

app.listen(3000)
