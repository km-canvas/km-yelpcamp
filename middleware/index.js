const Campground = require("../models/campground");
const Comment = require("../models/comment");
const Review = require("../models/review");
const middlewareObj = {};

// Check to see if user is logged in 
// =======================================================
middlewareObj.isLoggedIn = function(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}
	req.flash("error", "You need to be logged in to access that"); // only shows on the next step, won't display immediately
	res.redirect("/login"); // flash message must then be handled in the "/login" route
};

middlewareObj.checkCampgroundOwnership = function(req, res, next) {
		if(req.isAuthenticated()){
			Campground.findById(req.params.id, function(err, foundCampground){
				if(err || !foundCampground) {
					req.flash("error", "Campground not found");
					res.redirect("back")
				} else { // does user own the campground?
					if(foundCampground.author.id.equals(req.user._id) || req.user.isAdmin){ // .equals is a Mongoose method, can't use "===" b/c author is an object and _id is a string
						next(); // if current user is the author of this post, move onto the next function specified in the separate routes
					} else {
						req.flash("error", "You are not authorized to edit/delete this campground.");
						res.redirect("back")
					}
				}
			});
		} else {
			req.flash("error", "You need to be logged in to access that");
			res.redirect("back");
		}
};

middlewareObj.checkCommentOwnership = function(req, res, next) {
		if(req.isAuthenticated()){
			Comment.findById(req.params.comment_id, function(err, foundComment){
				if(err || !foundComment) {
					req.flash("error", "Comment not found");
					res.redirect("back");
				} else { // does user own the campground?
					if(foundComment.author.id.equals(req.user._id) || req.user.isAdmin){ // .equals is a Mongoose method, can't use "===" b/c author is an object and _id is a string
						next(); // if current user is the author of this post, move onto the next function specified in the separate routes
					} else {
						req.flash("error", "You are not authorized to edit/delete this comment.");
						res.redirect("back")
					}
				}
			});
		} else {
			req.flash("error", "You need to be logged in to access comments");
			res.redirect("back");
		}
};

middlewareObj.checkReviewOwnership = function(req, res, next) {
	if(req.isAuthenticated()){
			Review.findById(req.params.review_id, function(err, foundReview){
					if(err || !foundReview){
							res.redirect("back");
					}  else {
							// does user own the comment?
							if(foundReview.author.id.equals(req.user._id || req.user.isAdmin)) {
									next();
							} else {
									req.flash("error", "You don't have permission to do that");
									res.redirect("back");
							}
					}
			});
	} else {
			req.flash("error", "You need to be logged to access reviews");
			res.redirect("back");
	}
};

middlewareObj.checkReviewExistence = function (req, res, next) {
	if (req.isAuthenticated()) {
			Campground.findById(req.params.id).populate("reviews").exec(function (err, foundCampground) {
					if (err || !foundCampground) {
							req.flash("error", "Campground not found.");
							res.redirect("back");
					} else {
							// check if req.user._id exists in foundCampground.reviews
							var foundUserReview = foundCampground.reviews.some(function (review) {
									return review.author.id.equals(req.user._id || req.user.isAdmin);
							});
							if (foundUserReview) {
									req.flash("error", "You already wrote a review. Please edit your current review if you wish to update the information.");
									return res.redirect("/campgrounds/" + foundCampground._id);
							}
							// if the review was not found, go to the next middleware
							next();
					}
			});
	} else {
			req.flash("error", "You need to login first.");
			res.redirect("back");
	}
};

module.exports = middlewareObj