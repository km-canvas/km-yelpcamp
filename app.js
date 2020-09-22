const dotenv = require("dotenv").config();

const express 			= require('express'),
			app 					= express(),
			bodyParser 		= require('body-parser'),
			mongoose 			= require('mongoose'),
			passport			= require('passport'),
			flash					= require('connect-flash'),
			LocalStrategy	= require('passport-local'),
			methodOverride= require('method-override'),
			Campground 		= require('./models/campground'),
			Comment				= require('./models/comment'),
			Review 				= require('./models/review'),
			User 					= require('./models/user');

// Requiring routes from split up route files
const	commentRoutes 		= require('./routes/comments'),
			campgroundRoutes 	= require('./routes/campgrounds'),
			indexRoutes 			= require('./routes/index'),
			reviewRoutes			= require('./routes/reviews');

mongoose.connect('mongodb://localhost:27017/yelp_camp_vfinalB4', {
  useNewUrlParser: true,
	useUnifiedTopology: true,
	useFindAndModify: false,
	useCreateIndex: true
})
.then(() => console.log('Connected to DB!'))
.catch(error => console.log(error.message));

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public")); // tells express to serve the content of the public folder directory
app.set("view engine", "ejs");
app.use(methodOverride("_method")); // conventional code for using method override in the application
app.use(flash()); // display flash messages for the user (i.e. warnings, permission denied, instructions to use, etc.)

// =======================================================
// PASSPORT CONFIGURATION
// =======================================================
app.use(require('express-session')({
	secret: "This is the Yelp Camp Secret",
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// This middleware we defined creates the variable for "currentUser: req.user" on ALL routes
// This way we don't need to add that variable to every single individual route
app.use(function(req, res, next){
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	res.locals.moment = require("moment");
	next();
});

app.use(indexRoutes);
app.use("/campgrounds", campgroundRoutes); // appends /campgrounds to the beginning of all routes in campgrounds.js file, so we can shorten it to "/" in the campgrounds.js routes file
app.use("/campgrounds/:id/comments", commentRoutes); // same here, we can remove "/campgrounds/:id/comments" in the comments.js file and replace it with "/"
app.use("/campgrounds/:id/reviews", reviewRoutes);

app.listen(process.env.PORT, function(){
	console.log("Yelp Camp server has started on port " + process.env.PORT);
})