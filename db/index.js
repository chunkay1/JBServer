const { Client } = require('pg'); // imports the pg module

// supply the db name and location of the database
// const client = new Client('postgres://localhost:5432/juicebox_dev');
const client = new Client('postgres://localhost:5432/juicebox-dev');

async function createUser({
    username,
    password,
    name,
    location
}) {
    try {
        const { rows: [user] } = await client.query(`
            INSERT INTO users (username, password, name, location)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (username) DO NOTHING
            RETURNING *;
        `, [username, password, name, location]);

        return user;
    } catch (error) {
        throw error;
    }
}

async function updateUser(id, fields = {}) {
    //building the set string
    const setString = Object.keys(fields).map(
        (key, index) => `"${key}"=$${index + 1}`
    ).join(`, `);

    //we'd want to return early should this be called w/o fields
    if (setString.length === 0) {
        return;
    }

    try {
        const { rows: [user] } = await client.query(`
            UPDATE users
            SET ${setString}
            WHERE id=${id}
            RETURNING *;
        `, Object.values(fields));

        return user;
    } catch (error) {
        console.log('Error Updating User!');
        throw (error);
    }
}

async function getAllUsers() {

    try {
        const { rows } = await client.query(`
                SELECT 
                id, 
                username, 
                name,
                location,
                active
            FROM users;
        `);

        return rows;
    } catch (error) {
        console.log('Error Getting All Users!');
        throw error;
    }
}

async function getUserById(userId) {
    //This was my original attempt, I later realized you can always just specify the colums you want to return
    // try {
    //     const { rows: [user] } = await client.query(`
    //         SELECT * 
    //         from users
    //         WHERE id=${userId}
    //     `)if (!user) {
    //     return null;
    // }
    // return user;

    try {
        const { rows: [user] } = await client.query(`
            SELECT
                id,
                username,
                name,
                location,
                active
            FROM users
            WHERE id=${userId}
        `)
        if (!user) {
            return null;
        }

        user.posts = await getPostsByUser(userId);

        return user;

    } catch (error) {
        console.log('Error Getting Requested User!')
        throw error;
    }
}

async function getUserByUsername(username) {
    try {
        const { rows: [user] } = await client.query(`
          SELECT *
          FROM users
          WHERE username=$1;
        `, [username]);

        return user;
    } catch (error) {
        throw error;
    }
}

async function createPost({
    authorId,
    title,
    content,
    tags = []
}) {
    try {
        const { rows: [post] } = await client.query(`
            INSERT INTO posts ("authorId", title, content)
            VALUES ($1, $2, $3)
            RETURNING *;
        `, [authorId, title, content]);

        const tagList = await createTags(tags);

        return await addTagsToPost(post.id, tagList);
    } catch (error) {
        console.log('Error Creating Post')
        throw error;
    }
}

async function updatePost(postId, fields = {}) {
    //read tags and remove that field
    const { tags } = fields;

    console.log('const tags =', tags);
    delete fields.tags;

    const setString = Object.keys(fields).map(
        (key, index) => `"${key}"=$${index + 1}`
    ).join(', ');

    console.log('const setString =', setString);

    try {

        if (setString.length > 0) {

            await client.query(`
                UPDATE posts
                SET ${setString}
                WHERE id=${postId}
                RETURNING *;
                `, Object.values(fields));
        }

        if (tags === undefined) {
            return await getPostById(postId);
        }

        const tagList = await createTags(tags);
        const tagListIdString = tagList.map(
            tag => `${tag.id}`
        ).join(', ');

        // const tagListIdString = tagList.map(
        //     tag => `${tag.id}`
        // ).join(', ');

        console.log('const tagList is:', tagList);
        console.log('const tagListIdString is:', tagListIdString);

        console.log('Starting delete query...')
        await client.query(`
        DELETE FROM post_tags
        WHERE "tagId"
        NOT IN (${tagListIdString})
        AND "postId"=$1;
    `, [postId]);

        console.log('delete query complete...');

        await addTagsToPost(postId, tagList);

        return await getPostById(postId);
    } catch (error) {
        console.log('Error Updating Post!')
        throw error;
    }
}

async function getAllPosts() {
    try {
        const { rows: postIds } = await client.query(
            `SELECT id
            FROM posts;
            `);

        const posts = await Promise.all(postIds.map(
            post => getPostById(post.id)
        ));
        return posts;
    } catch (error) {
        console.log('Error Getting All Posts!')
        throw error;
    }
}

async function getPostById(postId) {
    try {
        const { rows: [post] } = await client.query(`
        SELECT *
        FROM posts
        WHERE id=$1;
      `, [postId]);

        const { rows: tags } = await client.query(`
        SELECT tags.*
        FROM tags
        JOIN post_tags ON tags.id=post_tags."tagId"
        WHERE post_tags."postId"=$1;
      `, [postId])

        const { rows: [author] } = await client.query(`
        SELECT id, username, name, location
        FROM users
        WHERE id=$1;
      `, [post.authorId])

        post.tags = tags;
        post.author = author;

        delete post.authorId;

        return post;
    } catch (error) {
        throw error;
    }
}

async function getPostsByUser(userId) {
    try {
        const { rows: postIds } = await client.query(`
            SELECT id 
            FROM posts
            WHERE "authorId"=${userId};
        `);

        const posts = await Promise.all(postIds.map(
            post => getPostById(post.id)
        ));

        return posts;
    } catch (error) {
        console.log('Error Getting User Posts!')
        throw error;
    }
}

async function getPostsByTagName(tagName) {
    try {
        const { rows: postIds } = await client.query(`
        SELECT posts.id
        FROM posts
        JOIN post_tags ON posts.id=post_tags."postId"
        JOIN tags ON tags.id=post_tags."tagId"
        WHERE tags.name=$1;
      `, [tagName]);

        return await Promise.all(postIds.map(
            post => getPostById(post.id)
        ));
    } catch (error) {
        throw error;
    }
}

/**
 * TAG Methods
 */

async function createTags(tagList) {
    if (tagList.length === 0) {
        return [];
    }

    // need something like: $1), ($2), ($3)
    const insertValues = tagList.map(
        (_, index) => `$${index + 1}`).join('), (');
    // then we can use: (${ insertValues }) in our string template

    // need something like $1, $2, $3
    const selectValues = tagList.map(
        (_, index) => `$${index + 1}`).join(', ');
    // then we can use (${ selectValues }) in our string template

    try {
        await client.query(`
            INSERT INTO tags(name)
            VALUES (${insertValues})
            ON CONFLICT (name) DO NOTHING;
        `, tagList)

        // const { rows: [tags] } = await client.query(`

        const { rows } = await client.query(`
            SELECT * FROM tags
            WHERE name
            IN(${selectValues});
        `, tagList);

        console.log('Finished createTags...')
        console.log('Tags are :', rows);


        return rows;
    } catch (error) {
        console.log('Error Creating Tags!');
        throw error;
    }
}

async function createPostTag(postId, tagId) {
    try {
        await client.query(`
            INSERT INTO post_tags("postId", "tagId")
            VALUES($1, $2)
            ON CONFLICT ("postId", "tagId") DO NOTHING;
        `, [postId, tagId]);
    } catch (error) {
        console.log('Error Creating Post Tags');
        throw error;
    }
}

async function addTagsToPost(postId, tagList) {
    try {
        const createPostTagPromises = tagList.map(
            tag => createPostTag(postId, tag.id)
        );


        await Promise.all(createPostTagPromises);

        return await getPostById(postId);
    } catch (error) {
        throw error;
    }
}

async function getAllTags() {
    try {
        const { rows } = await client.query(`
        SELECT * 
        FROM tags;
      `);

        return { rows }
    } catch (error) {
        throw error;
    }
}

module.exports = {
    client,
    createUser,
    updateUser,
    getAllUsers,
    getUserById,
    getUserByUsername,
    createPost,
    updatePost,
    getAllPosts,
    getPostsByUser,
    getPostsByTagName,
    createTags,
    getAllTags,
    createPostTag,
    addTagsToPost
}                                                                                                 