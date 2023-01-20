const express = require('express');
const postsRouter = express.Router();

const { getAllPosts } = require('../db');

postsRouter.use((req, res, next) => {
  console.log("A request is being made to /posts");

  next(); // THIS IS DIFFERENT
});

postsRouter.get('/', async (req, res) => {
  const posts = await getAllPosts();
  console.log(posts);
  res.send({
    posts
  });
});

module.exports = postsRouter;
