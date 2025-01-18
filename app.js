const express = require("express");
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const user = require("./models/user");

const app = express();

app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/register", async (req, res) => {
  let { email, name, username, password, age } = req.body;
  let user = await userModel.findOne({ email });
  if (user) return res.status(500).send("User already exists");

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      let user = await userModel.create({
        email,
        name,
        username,
        password: hash,
        age,
      });
      let token = jwt.sign({ email: email, userid: user._id }, "secret");

      res.cookie("token", token);
      res.send("User registered successfully");
    });
  });
});

app.get("/login", async (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  let { username, email, password } = req.body;
  let user = await userModel.findOne({ email, username });
  if (!user) return res.status(500).send("User not found");

  bcrypt.compare(password, user.password, (err, result) => {
    if (!result) return res.status(500).send("Email or  Password is incorrect");

    let token = jwt.sign({ email: email, userid: user._id }, "secret");

    res.cookie("token", token);
    res.redirect("/profile");
  });
});

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

app.get("/profile", isLoggedIn, async (req, res) => {
  let user = await userModel
    .findOne({ email: req.user.email })
    .populate("posts");

  console.log(user);
  res.render("profile", { user });
});

app.post("/post", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  let { content } = req.body;
  let post = await postModel.create({
    content,
    user: user._id,
  });

  user.posts.push(post._id);
  await user.save();

  res.redirect("/profile");
});

function isLoggedIn(req, res, next) {
  let token = req.cookies.token;
  if (!token) return res.status(500).send("User not logged in");
  let data = jwt.verify(token, "secret");
  req.user = data;

  next();
}

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
