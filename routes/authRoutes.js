const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SECRET_KEY = "super_secret_key_change_me_in_prod";

router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: "Email déjà utilisé" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({ username, email, password: hashedPassword, role: role || 'member' });
        await user.save();
        res.status(201).json({ msg: "Compte créé" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: "Utilisateur inconnu" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "Mot de passe incorrect" });

        const token = jwt.sign({ id: user._id, role: user.role }, SECRET_KEY, { expiresIn: '2h' });

        res.json({ 
            token, 
            user: { id: user._id, username: user.username, email: user.email, role: user.role } 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;