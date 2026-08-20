const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

// GET: Projets de l'utilisateur (Créateur ou Membre)
router.get('/', async (req, res) => {
    const userId = req.headers['x-user-id'];
    if(!userId) return res.status(400).json({msg: "ID manquant"});

    try {
        const projects = await Project.find({
            $or: [{ createdBy: userId }, { members: userId }]
        })
        .populate('members', 'username email')
        .populate('createdBy', 'username');
        
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Créer Projet (Chef seulement)
router.post('/', async (req, res) => {
    const { title, description, userId } = req.body;
    try {
        const user = await User.findById(userId);
        if (user.role !== 'chef') return res.status(403).json({ msg: "Interdit aux membres" });

        const project = new Project({
            title, description, createdBy: userId, members: [userId]
        });
        await project.save();
        res.status(201).json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT: Update Project
router.put('/:id', async (req, res) => {
    try {
        const { title, description } = req.body;
        const project = await Project.findByIdAndUpdate(
            req.params.id,
            { title, description },
            { new: true }
        );
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Inviter Membre
router.post('/:id/invite', async (req, res) => {
    try {
        const project = await Project.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { members: req.body.memberId } },
            { new: true }
        ).populate('members', 'username');
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE: Supprimer Projet et ses Tâches
router.delete('/:id', async (req, res) => {
    try {
        await Project.findByIdAndDelete(req.params.id);
        await Task.deleteMany({ projectId: req.params.id });
        res.json({ msg: "Projet supprimé" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;