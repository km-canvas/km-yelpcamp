const express = require('express');
const router = express.Router({mergeParams: true});
const Campground 	= require("../models/campground");
const Comment 	= require("../models/comment");
const Review = require("../models/review");
const middleware = require("../middleware"); // due to Express functionality, the index.js file is implied as the default, so we don't need to add it
// const middleware = require("../middleware/index.js") is unnecessary to list the index.js since express automatically reads the an index file.

// Configure Multer package
const multer = require('multer');
const storage = multer.diskStorage({
		filename: function(req, file, callback) {
			callback(null, Date.now() + file.originalname);
		}
});
const imageFilter = function(req, file, callback) {
		if(!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
			return callback(new Error('Only image files (.jpg .jpeg .png .gif) are allowed'), false);
		}
		callback(null, true);
};
const upload = multer({storage: storage, fileFilter: imageFilter});

// Configure Cloudinary package
const cloudinary = require('cloudinary');

cloudinary.config({ 
  cloud_name: 'kmzmowbm', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// INDEX route - show all campgrounds
// Set up the Campgrounds Page
router.get("/", function(req, res){
	var perPage = 4;
	var pageQuery = parseInt(req.query.page);
	var pageNumber = pageQuery ? pageQuery : 1;
	var noMatch = null;
	// Handling search parameters
	if(req.query.search) { // if there is a search query, handle it
		// function for escapeRegex at bottom of page
		const regex = new RegExp(escapeRegex(req.query.search), 'gi');
		// After checking the search, get all campgrounds from database and find the one that matches
		Campground.find({name: regex}).skip((perPage * pageNumber)- perPage).limit(perPage).exec(function(err, allCampgrounds){
			Campground.countDocuments({name: regex}).exec(function (err, count){
				if(err) {
					console.log(err);
					res.redirect("back");
				} else {
					if(allCampgrounds.length < 1) {
						noMatch = "No campgrounds match that search, please try again.";
					}
					res.render("campgrounds/index", {campgrounds: allCampgrounds, noMatch: noMatch,  page: "campgrounds", current: pageNumber, pages: Math.ceil(count/perPage), search: req.query.search});
				}
			});
		});
	} else { // if there is no search query, move onto displaying all campgrounds
		// Get all campgrounds from DB rather than a hard-coded array, using the find method and passing in an empty object {}
		Campground.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function(err, allCampgrounds){
			Campground.countDocuments().exec(function(err, count){
				if(err){
					console.log(err);
				} else { // take "allCampgrounds" from the DB and send them through to the "campgrounds.ejs" file
					// Render all campgrounds in DB
					res.render("campgrounds/index", {campgrounds: allCampgrounds, noMatch: noMatch, page: "campgrounds", current: pageNumber, pages: Math.ceil(count/perPage), search: false});
					// req.user pulls the currently signed in user's id and username from the database and we save is to "currentUser" variable to use in our ejs files
				}				
			});
		});
	};
});
 
// CREATE route = add new campground to database
// Set up the page to add a new Campground
router.post("/", middleware.isLoggedIn, upload.single("image"), function(req, res){
	cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
		if(err) {
			req.flash('error', "Error uploading image");
			return res.redirect('back');
		}
		// add cloudinary url for the image to the campground object under image property
		req.body.campground.image = result.secure_url;
		// add image's public_id to campground object
		req.body.campground.imageId = result.public_id;
		// add author to campground
		req.body.campground.author = { // adding in current user to the campground they created
			id: req.user._id,
			username: req.user.username
		}
		// Create a new campground and save to the database
		Campground.create(req.body.campground, function(err, newlyCreated){
			if(err){
				req.flash("error", err.message)
				return res.redirect('back');
			}
				res.redirect("/campgrounds/" + newlyCreated.id); 
		});
	});
});

// NEW route - show form to create new campground
// Shows the form that will send the data to the post route
router.get("/new", middleware.isLoggedIn, function(req, res){
	res.render("campgrounds/new", {page: "newCampground"});
})

// SHOW route - shows more info about one campground
router.get("/:id", function(req, res){
	//find the campground with provided ID
	// show comments found from campground ID with ".populate("model file").exec(callback function)
	Campground.findById(req.params.id).populate("comments likes").populate({
			path: "reviews",
			options: {sort: {createdAt: -1}}
		}).exec(function(err, foundCampground){
		if(err || !foundCampground){
			req.flash("error", "Campground not found");
			res.redirect("back");
		} else {		//render the show template with that campground
			res.render("campgrounds/show", {campground: foundCampground, page: "showCampground"}); // show.ejs file for expanded info on a single campground
		}
	});
});

// EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
		Campground.findById(req.params.id, function(err, foundCampground){
					res.render("campgrounds/edit", {campground: foundCampground, page: "editCampground"});
		});
});

// UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, upload.single('image'), function(req, res){
	// first find the campground in the database
	Campground.findById(req.params.id, async function(err, updatedCampground){
		if(err){
			req.flash("err", err.message);
			res.redirect("back");
		} else { // after verifying the correct campground, then move on to see if a file/image exists in that campground
				if(req.file) { // find current campground image and delete it from database
					try {
							await cloudinary.v2.uploader.destroy(updatedCampground.imageId);
							let result = await cloudinary.v2.uploader.upload(req.file.path);
							// replace existing information for campground image on cloudinary
							updatedCampground.image = result.secure_url; // add cloudinary url for the image to campground object under image property
							updatedCampground.imageId = result.public_id; // add image's public_id to campground object
						} catch(err) {
							req.flash("error", err.message);
							return res.redirect("back");
						}
					}
				updatedCampground.name = req.body.campground.name;
				updatedCampground.price = req.body.campground.price;
				updatedCampground.description = req.body.campground.description;
				updatedCampground.save();
				req.flash("success", "Changes have been successfully made to \"" + updatedCampground.name + "\" campground");
				res.redirect("/campgrounds/" + req.params.id);
		}
	});
});

// DESTROY CAMPGROUND ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res){
	Campground.findById(req.params.id, async function(err, foundCampground){
		if(err){
			req.flash("error", "Could not find campground to delete");
			return res.redirect("/campgrounds");
		} 
		try {
				await Comment.deleteMany({"_id": { $in: foundCampground.comments} });
				await Review.deleteMany({"_id": { $in: foundCampground.reviews}});
				await cloudinary.v2.uploader.destroy(foundCampground.imageId);	
				foundCampground.remove();
				req.flash("success", "Campground has been deleted")
				res.redirect("/campgrounds");		
		} catch(err) {
				if(err){
					req.flash("error", "Something went wrong, could not delete campground");
					return res.redirect("back");
				}
		}						
	});
});

// LIKE / UNLIKE CAMPGROUND ROUTE
router.post("/:id/like", middleware.isLoggedIn, function (req, res) {
	Campground.findById(req.params.id, function (err, foundCampground) {
			if (err) {
					console.log(err);
					return res.redirect("/campgrounds");
			}
			// check if req.user._id exists in foundCampground.likes
			var foundUserLike = foundCampground.likes.some(function (like) {
					return like.equals(req.user._id);
			});

			if (foundUserLike) {
					// user already liked, removing like
					foundCampground.likes.pull(req.user._id);
			} else {
					// adding the new user like
					foundCampground.likes.push(req.user);
			}
			foundCampground.save(function (err) {
					if (err) {
							console.log(err);
							return res.redirect("/campgrounds");
					}
					return res.redirect("/campgrounds/" + foundCampground._id);
			});
	});
}); 

function escapeRegex(text) {
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

// Original from stackoverflow for above function (/[-[\]{}()*+!<=:?.\/\\^$|#\s,]/g, '\\$&');

// Alternative found on stackoverflow as a future-proof protection for any additions to JS regex engine capabilities
// This function escapes every character except those explicitly guaranteed not be used for syntax in future regular expression flavors.
// function regExpEscapeFuture(text) {
// 	return text.replace(/[^A-Za-z0-9_]/g, '\\$&');
// }

module.exports = router;