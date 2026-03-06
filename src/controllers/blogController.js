const Blog = require('../models/Blog');

// Get all published blogs
const getBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, tag } = req.query;
    const query = { status: 'published' };
    
    if (category) query.category = category;
    if (tag) query.tags = tag;

    const blogs = await Blog.find(query)
      .populate('author', 'name profileImage')
      .sort({ publishedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      count: blogs.length,
      total,
      data: blogs,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single blog by slug
const getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug })
      .populate('author', 'name profileImage bio');
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    // Increment views
    blog.views += 1;
    await blog.save();

    res.json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create blog (Admin only)
const createBlog = async (req, res) => {
  try {
    const blog = await Blog.create({
      ...req.body,
      author: req.user.id
    });
    res.status(201).json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Like blog
const likeBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const hasLiked = blog.likes.includes(req.user.id);
    if (hasLiked) {
      blog.likes = blog.likes.filter(id => id.toString() !== req.user.id);
    } else {
      blog.likes.push(req.user.id);
    }

    await blog.save();
    res.json({ success: true, likes: blog.likes.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Add comment
const addComment = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    blog.comments.push({
      user: req.user?.id,
      name: req.body.name || req.user?.name,
      email: req.body.email || req.user?.email,
      comment: req.body.comment
    });

    await blog.save();
    res.json({ success: true, message: 'Comment added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
