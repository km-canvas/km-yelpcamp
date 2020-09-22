const express = require('express');
const router = express.Router({mergeParams: true}); // necessary to share parameters to match the Campground:id to the comments (since "/campgrounds/:id/comments" was shortened in the routes)
const Campground 	= require("../models/campground");
const Comment 	= require("../models/comment");
const Review = require("../models/review");
const middleware = require("../middleware");

// NEW COMMENT ROUTE
router.get("/new", middleware.isLoggedIn, function(req, res){
	// find campground by id
	Campground.findById(req.params.id, function(err, foundCampground){
		if(err) {
			console.log(err);
		} else { // render the new.ejs file in comments and pass through the "foundCampground" returned from the database
			res.render("comments/new", {campground: foundCampground, page: "newComment"}); 
		}
	});
});

// CREATE COMMENT ROUTE
router.post("/", middleware.isLoggedIn, function(req, res){
	//lookup campground using ID
	Campground.findById(req.params.id, function(err, foundCampground){
		if(err){
			console.log(err);
			res.redirect("/campgrounds");
		} else {
	// create new comment
			Comment.create(req.body.comment, function(err, foundComment){
				if(err){
					req.flash("error", "Something went wrong");
					console.log(err);
				} else { 	//connect new comment to campground
					// add username and id to comment
					foundComment.author.id = req.user._id;
					foundComment.author.username = req.user.username;
					foundComment.save(); // once found, we need to save it
					foundCampground.comments.push(foundComment);
					foundCampground.save();
					req.flash("success", "Your comment has been added.");
						//redirect to campground show page
					res.redirect("/campgrounds/" + req.params.id); 
				}
			});
	}});
});

// EDIT COMMENT ROUTE
//"/campgrounds/:id/comments" is already set as the prefix for our routes in the app.js file
// The comment edit route must call the comment id, but can't be written the same as ":id" in the route prefix or there will be an error
// If the route is written "/campgrounds/:id/comments/:id/edit", the second ":id" would overwrite the first ":id" in the parameters
// So the new edit route id should be written differently, i.e. "campgrounds/:id/comments/:comment_id/edit"
router.get("/:comment_id/edit", middleware.checkCommentOwnership, function(req, res){
	// to handle error in case a user makes hard change in query string, we'er making sure that first a campground is found in the database
	Campground.findById(req.params.id, function(err, foundCampground) {
		if(err || !foundCampground) {
			req.flash("error", "Campground not found");
			return res.redirect("back");
		} // Once campground id has been verified, then we move on to handle the comment
		Comment.findById(req.params.comment_id, function(err, foundComment){
			if(err){ // checking "!foundComment" is already being handled in the middleware, so we don't need it here
				res.redirect("back");
			} else {
				res.render("comments/edit", {campground_id: req.params.id, comment: foundComment, page: "editComment"});
			}
		});
	});
});

// UPDATE COMMENT ROUTE
router.put("/:comment_id", middleware.checkCommentOwnership, function(req, res){
	Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
		if(err){
			res.redirect("back");
		} else {
			req.flash("success", "Comment has been updated.");
			res.redirect("/campgrounds/" + req.params.id);
		}
	})
})

// DESTROY COMMENT ROUTE
router.delete("/:comment_id", middleware.checkCommentOwnership, function(req, res){
	Comment.findByIdAndRemove(req.params.comment_id, function(err){
		if(err){
			res.redirect("back");
		} else {
			req.flash("success", "Comment has been deleted.")
			res.redirect("/campgrounds/" + req.params.id); // redirect to campground show page
		}	
	});
});

module.exports = router;