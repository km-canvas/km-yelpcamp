const mongoose = require("mongoose");
// Schema setup for campgrounds
const campgroundSchema = new mongoose.Schema({
	name: String,
	price: String,
	image: String,
	imageId: String,
	description: String,
	createdAt: {
		type: Date,
		default: Date.now
	},
	author: {
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		username: String,
	},
	comments: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Comment" // name of the model referenced
		}
	],
	likes: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		}
	],
	reviews: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Review"
		}
	],
	rating: {
		type: Number,
		default: 0
	}
}); 

// Model Schema for campgrounds
module.exports = mongoose.model("Campground", campgroundSchema);