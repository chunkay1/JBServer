const express = require("express");
const postsRouter = express.Router();

const { requireUser } = require("./utils");

const { createPost, updatePost, getAllPosts, getPostById } = require("../db");
// const { getAllPosts } = require("../db");


postsRouter.use((req, res, next) => {
  console.log("A request is being made to /posts");

  next(); // THIS IS DIFFERENT
});

postsRouter.get("/", async (req, res, next) => {
  try {
    const allPosts = await getAllPosts();

    const posts = allPosts.filter(post => {
      // this method should filter out any posts which are both inactive and not owned by the current user.
      // (if request user and the posts authorId matches the requesters user id) AND the post is active
      if ((req.user && post.author.id === req.user.id) && post.active) {
        return true;
      }
      return false;
    })

    res.send({
      posts
    });
  } catch ({ name, message }) {
    next({ name, message });
  }
});

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

postsRouter.patch('/:postId', requireUser, async (req, res, next) => {
  const { postId } = req.params;
  const { title, content, tags } = req.body;

  const updateFields = {};

  if (tags && tags.length > 0) {
    updateFields.tags = tags.trim().split(/\s+/);
  }

  if (title) {
    updateFields.title = title;
  }

  if (content) {
    updateFields.content = content;
  }

  try {
    const originalPost = await getPostById(postId);

    if (originalPost.author.id === req.user.id) {
      const udpatedPost = await updatePost(postId, updateFields);
      res.send({ post: udpatedPost })
    } else {
      next({
        name: 'UnauthorizedUserError',
        message: 'Uh-oh! You cannot update a post that is not yours'
      })
    }
  } catch ({ name, message }) {
    next({ name, message });
  }
});

postsRouter.delete('/:postId', requireUser, async (req, res, next) => {
  try {
    const post = await getPostById(req.params.postId);

    if (post && post.author.id === req.user.id) {
      const updatedPost = await updatePost(post.id, { active: false });

      res.send({ post: updatedPost });
    } else {

      next(
        post

          ?

          {
            name: "UnauthorizedUserError",
            message: "You cannot delete a post which is not yours"
          }

          :

          {
            name: "PostNotFoundError",
            message: "That post does not exist"
          });
    }

  } catch ({ name, message }) {
    next({ name, message })
  }
});

module.exports = postsRouter;
