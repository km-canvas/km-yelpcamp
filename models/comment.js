var mongoose = require("mongoose");
 
var commentSchema = new mongoose.Schema({
    text: String,
    createdAt: {
		type: Date,
		default: Date.now
	},
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User" // ref refers to the model we check for Id
        },
        username: String,
    }
});
 
module.exports = mongoose.model("Comment", commentSchema);