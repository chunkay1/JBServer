const express = require("express");
const postsRouter = express.Router();

const { requireUser } = require("./utils");

// From users.js to assist w/ 
const { getUserByUsername } = require('../db');

postsRouter.post("/", requireUser, async (req, res, next) => {
  // Placeholder for testing functionality
  // res.send({ message: 'under construction' });

  //Part 3 updates
  const { title, content, tags = "" } = req.body;

  const tagArr = tags.trim().split(/\s+/);
  const postData = {};

  // only send the tags if there are some to send
  if (tagArr.length) {
    postData.tags = tagArr;
  }

  try {
    const currentUser = await getUserByUsername(username);
    const id = currentUser.id
    console.log('currentUser.id =', id);
    // attempt to define user - from users.js
    postData = {currentUser, title, content}
    // add authorId, title, content to postData object
    const post = await createPost(postData);
    // this will create the post and the tags for us
    if (post) {
        res.send({ post });
    // if the post comes back, res.send({ post });
    } else {
        next({
            name: 'PostDataError',
            message: `Post not created properly`
        });
    // otherwise, next an appropriate error object
    }
    
    
  } catch ({ name, message }) {
    next({ name, message });
  }
});

const { getAllPosts } = require("../db");

postsRouter.use((req, res, next) => {
  console.log("A request is being made to /posts");

  next(); // THIS IS DIFFERENT
});

postsRouter.get("/", async (req, res) => {
  const posts = await getAllPosts();
  console.log(posts);
  res.send({
    posts,
  });
});

module.exports = postsRouter;
