const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  getBlogs,
  getBlogBySlug,
  createBlog,
  likeBlog,
  addComment
} = require('../controllers/blogController');

router.get('/', getBlogs);
router.get('/:slug', getBlogBySlug);
router.post('/', protect, admin, createBlog);
router.post('/:id/like', protect, likeBlog);
router.post('/:id/comments', addComment);

module.exports = router;
