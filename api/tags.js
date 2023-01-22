const express = require('express');
const tagsRouter = express.Router();

const { getAllTags, getPostsByTagName } = require('../db');

tagsRouter.use((req, res, next) => {
    console.log("A request is being made to /tags");

    next();
});

tagsRouter.get('/', async (req, res) => {
    const tags = await getAllTags();
    console.log(tags);
    res.send({
        tags
    });
});

tagsRouter.get('/:tagName/posts', async (req, res, next) => {
    // read the tagname from the params
    const { tagName } = req.params;
    console.log('tagname is: ', tagName);

    try {
        const taggedPosts = await getPostsByTagName(tagName);
        console.log(taggedPosts);
        // use our method to get posts by tag name from the db

        res.send({ posts: taggedPosts })
        // send out an object to the client { posts: // the posts }
    } catch ({ name, message }) {
        next({ name, message })
    }
});

module.exports = tagsRouter;