1/20:
    - Added .env file to protect our JWT (6.2)
    - Added .env to the .gitignore file

## Troubleshooting Tips!
    1. Make sure you are running the correct postgres link in db/index.js
    2. Make sure your terminal was started with `npm run start:seed`
    3. Make sure the curl command you are running is set to the right port (3001)
    4. Make sure the curl command you are running is using the right token

1/22:
    - Finished! The only real addition was updating the postsRouter.get('/') in api/posts.js.
    7.5 initially has you write it to allow all active posts and any posts belonging to the current user to come
    through, however the final step is edit it so that it filters out any posts which are both inactive and not owned by the current user - lines 16-35 in api/posts.js