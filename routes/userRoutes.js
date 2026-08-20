const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Get All Users (Pour l'équipe et les invitations)
router.get('/', async (req, res) => {
    try {
        const users = await User.find({}, '-password'); // On cache le password
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Create User (Chef creating Member)
router.post('/', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        
        // Check if user exists
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: "Email déjà utilisé" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({ 
            username, 
            email, 
            password: hashedPassword, 
            role: role || 'member' 
        });
        
        await user.save();
        res.status(201).json({ msg: "Utilisateur créé", user: { id: user._id, username: user.username, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT: Update User
router.put('/:id', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        const updateData = { username, email, role };

        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE: Delete User
router.delete('/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ msg: "Utilisateur supprimé" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
