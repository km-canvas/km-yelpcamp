const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/user');
const Campground = require('../models/campground');
const Review = require("../models/review");


// Set up a Landing Page / Home page
router.get("/", function(req, res){
	res.render("landing");
})

// =======================================================
// 	AUTH ROUTES
// =======================================================
// Show Register Form
router.get("/register", function(req, res){
	res.render("register", {page: "register"});
})

// Handle sign up logic
router.post("/register", function(req, res){
	const newUser = new User({username: req.body.username})
	if(req.body.adminCode === process.env.ADMIN) {
		newUser.isAdmin = true; // default is false, so resetting here
	}
	User.register(newUser, req.body.password, function(err, user){
		if(err){
			console.log(err);
			return res.render("register", {error: err.message});
	}
		passport.authenticate("local")(req, res, function(){
			req.flash("success", "Welcome to YelpCamp " + user.username);
			res.redirect("/campgrounds");
		});
	});
});

// =======================================================
// 	LOGIN / LOGOUT ROUTES
// =======================================================
// show login form
router.get("/login", function(req, res){
	res.render("login", {page: "login"});
	// "message is the variable we use in the login.ejs to render the message 
	// The displayed message is pulled using the flash package, with the variable "error" from the middleware function "isLoggedIn" 
});

router.post("/login", passport.authenticate("local", {
	successRedirect: "/campgrounds",
	failureRedirect: "/login",
	failureFlash: true,
	successFlash: "Welcome to YelpCamp!"
	}), function(req, res){
});

router.get("/logout", function(req, res){
	req.logout();
	req.flash("success", "You have logged out successfully.")
	res.redirect("/campgrounds");
});

// =======================================================
// User profile
// =======================================================
router.get("/users/:id", function(req, res){
	User.findById(req.params.id, function(err, foundUser){
		if(err){
			req.flash("error", "User not found")
			res.redirect("/");
		}
		Campground.find().where("author.id").equals(foundUser._id).exec(function(err, userCampgrounds){
			if(err){
				req.flash("error", "User not found")
				res.redirect("/");
			}
			res.render("users/show", {user: foundUser, campgrounds: userCampgrounds});
		});
	});
});

module.exports = router;