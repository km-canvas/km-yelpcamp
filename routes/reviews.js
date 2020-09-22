const express = require('express');
const router = express.Router({mergeParams: true});
const Campground 	= require("../models/campground");
const Comment 	= require("../models/comment");
const Review = require("../models/review");
const middleware = require("../middleware"); 

// Route prefix: "/campgrounds/:id/reviews"
// INDEX REVIEW ROUTE
router.get("/", function (req, res) {
	Campground.findById(req.params.id).populate({
		path: "reviews",
		options: { sort: { createdAt: -1 } } // sorting the populated reviews array to show the latest first
	}).exec(function (err, foundCampground) {
		if (err || !foundCampground) {
			req.flash("error", err.message);
			return res.redirect("back");
		}
		res.render("reviews/index", { campground: foundCampground, page: "indexReview" });
	});
});

// NEW REVIEW ROUTE
router.get("/new", middleware.isLoggedIn, middleware.checkReviewExistence, function (req, res) {
	// middleware.checkReviewExistence checks if a user already reviewed the campground, only one review per user is allowed
	Campground.findById(req.params.id, function (err, foundCampground) {
		if (err) {
			req.flash("error", err.message);
			return res.redirect("back");
		}
		res.render("reviews/new", { campground: foundCampground, page: "newReview" });
	});
});

// CREATE REVIEW ROUTE
router.post("/", middleware.isLoggedIn, middleware.checkReviewExistence, function (req, res) {
	//lookup campground using ID
	Campground.findById(req.params.id).populate("reviews").exec(function (err, foundCampground) {
		if (err) {
			req.flash("error", err.message);
			return res.redirect("back");
		}
		Review.create(req.body.review, function (err, newReview) {
			if (err) {
				req.flash("error", err.message);
				return res.redirect("back");
			}
			//add author username/id and associated campground to the review
			newReview.author.id = req.user._id;
			newReview.author.username = req.user.username;
			newReview.campground = foundCampground;
			//save review
			newReview.save();
			foundCampground.reviews.push(newReview);
			// calculate the new average review for the campground
			foundCampground.rating = calculateAverage(foundCampground.reviews);
			//save campground
			foundCampground.save();
			req.flash("success", "Your review has been successfully added.");
			res.redirect('/campgrounds/' + foundCampground._id);
		});
	});
});

// EDIT REVIEWS ROUTE
router.get("/:review_id/edit", middleware.checkReviewOwnership, function (req, res) {
	Review.findById(req.params.review_id, function (err, foundReview) {
		if (err) {
			req.flash("error", err.message);
			return res.redirect("back");
		}
		res.render("reviews/edit", { campground_id: req.params.id, review: foundReview, page: "editReview" });
	});
});

// UPDATE REVIEWS ROUTE
// Find review and submit the modifications 
router.put("/:review_id", middleware.checkReviewOwnership, function (req, res) {
	Review.findByIdAndUpdate(req.params.review_id, req.body.review, { new: true }, function (err, updatedReview) {
		if (err) {
			req.flash("error", err.message);
			return res.redirect("back");
		} // Find the related campground to calculate the new average using our custom calculateAverage function
		Campground.findById(req.params.id).populate("reviews").exec(function (err, foundCampground) {
			if (err) {
				req.flash("error", err.message);
				return res.redirect("back");
			}
			// recalculate campground average and assign the result to foundCampground.rating.
			foundCampground.rating = calculateAverage(foundCampground.reviews);
			//save changes
			foundCampground.save();
			req.flash("success", "Your review was successfully edited.");
			res.redirect('/campgrounds/' + foundCampground._id);
		});
	});
});

//  DESTROY REVIEW ROUTE
router.delete("/:review_id", middleware.checkReviewOwnership, function (req, res) {
	Review.findByIdAndRemove(req.params.review_id, function (err) {
			if (err) {
					req.flash("error", err.message);
					return res.redirect("back");
			}
			Campground.findByIdAndUpdate(req.params.id, {$pull: {reviews: req.params.review_id}}, {new: true}).populate("reviews").exec(function (err, foundCampground) {
					if (err) {
							req.flash("error", err.message);
							return res.redirect("back");
					}
					// recalculate campground average
					foundCampground.rating = calculateAverage(foundCampground.reviews);
					//save changes
					foundCampground.save();
					req.flash("success", "Your review was deleted successfully.");
					res.redirect("/campgrounds/" + req.params.id);
			});
	});
});


// ROUTE FUNCTIONS
// Takes the array of populated reviews, then calculates an average rating and returns it from the function
function calculateAverage(reviews) {
	if (reviews.length === 0) {
			return 0;
	}
	var sum = 0;
	reviews.forEach(function (element) {
			sum += element.rating;
	});
	return sum / reviews.length;
};

module.exports = router;