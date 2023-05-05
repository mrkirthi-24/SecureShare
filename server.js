require("dotenv").config(); //pull environment variables from .env file
const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const File = require("./models/File");

const app = express();

app.use(express.urlencoded({ extended: true })); // to access req.body

const upload = multer({ dest: "uploads" });

mongoose.connect(process.env.DATABASE_URL);

app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/upload", upload.single("file"), async (req, res) => {
  const fileData = {
    path: req.file.path,
    originalName: req.file.originalname,
  };
  // req.body.password is readable because its a multi-part form
  if (req.body.password != null && req.body.password !== "") {
    fileData.password = await bcrypt.hash(req.body.password, 10); // password encryption
  }

  const file = await File.create(fileData);
  res.render("index", { fileLink: `${req.headers.origin}/file/${file.id}` }); //req.headers.origin = "http://localhost:PORT"
});

//right way

app.route("/file/:id").get(handleDownload).post(handleDownload);

//Not the right way
// app.get("/file/:id", handleDownload);
// app.post("/file/:id", handleDownload);

//express by default doesnt know how to read normal form

async function handleDownload(req, res) {
  const file = await File.findById(req.params.id);

  if (file.password != null) {
    // if password entered
    if (req.body.password == null) {
      // to check if password is being passed up
      res.render("password");
      return;
    }

    if (!(await bcrypt.compare(req.body.password, file.password))) {
      res.render("password", { error: true }); //if password is incorrect then send error
      return; //to not download file and skip all step below
    }
  }

  file.downloadCount++;
  await file.save(); //saving file in database

  res.download(file.path, file.originalName); //File to be downloaded from file.path and give file.originalName name
}

app.listen(process.env.PORT, (error) => {
  if (error) throw error;
  console.log(`Port ${process.env.PORT} listening...`);
});
