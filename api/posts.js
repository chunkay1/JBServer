const express = require("express");
const postsRouter = express.Router();

const { requireUser } = require("./utils");

const { createPost } = require("../db");

postsRouter.post("/", requireUser, async (req, res, next) => {

  const { title, content, tags = "" } = req.body;

  const tagArr = tags.trim().split(/\s+/);
  const postData = {};

  // only send the tags if there are some to send
  if (tagArr.length) {
    postData.tags = tagArr;
  }

  try {
    postData.authorId = req.user.id;
    postData.title = title;
    postData.content = content;

    const post = await createPost(postData);
    // this will create the post and the tags for us

    if (post) {
      res.send(post);
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
