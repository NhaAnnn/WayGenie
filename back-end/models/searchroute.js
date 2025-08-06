const mongoose = require("mongoose");

const searchRouteSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  description: {
    type: String,
    trim: true,
    default: "",
  },
  time: {
    type: Date,
    default: Date.now,
  },
  dateKey: {
    type: String,
    required: true, // Đảm bảo dateKey phải có
  },
  count: {
    type: Number,
    default: 1,
  },
});

const SearchRoute = mongoose.model("SearchRoute", searchRouteSchema);
module.exports = SearchRoute;
