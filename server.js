// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var request = require ("request");
var cheerio  = require ("cheerio");
var mongoose = require("mongoose");
var axios = require("axios");

var db = require("./models");




var app = express();

app.use(logger("dev"));

app.use(
  bodyParser.urlencoded({
    extended: true
  })
);
app.use(express.static("public"));


mongoose.Promise = Promise;
mongoose.connect("mongodb://localhost/webscraper");
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/webscraper";

app.get("/", function(req, res) {
  res.send("Hello World");
});

app.get("/scrape", function(req, res) {
  axios.get("http://www2.ljworld.com/news/lawrence/").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);
    $("dt.header").each(function(i, element) {
    var results = {};
    results.title = $(this)
    .children("a")
    .text();
  results.link = $(this)
    .children("a")
    .attr("href");
    // Create a new Article using the `result` object built from scraping
    db.Article.create(results)
    .then(function(dbArticle) {
      // View the added result in the console
      console.log("trying to create a new article",dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      return res.json(err);
    });
});

// If we were able to successfully scrape and save an Article, send a message to the client
res.send("Scrape Complete");
});
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

//  Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});




// Listen on port 3000
app.listen(9001, function() {
  console.log("App running on port 9001!");
});
