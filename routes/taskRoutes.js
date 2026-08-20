const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

// CREATE Task
router.post('/', async (req, res) => {
    try {
        const task = new Task(req.body);
        const savedTask = await task.save();
        res.status(201).json(savedTask);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET Tasks by Project
router.get('/project/:projectId', async (req, res) => {
    try {
        const tasks = await Task.find({ projectId: req.params.projectId });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET Tasks Assigned to User
router.get('/assigned/:username', async (req, res) => {
    try {
        const tasks = await Task.find({ assignedTo: req.params.username });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE Task
router.put('/:id', async (req, res) => {
    try {
        const updated = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE Task
router.delete('/:id', async (req, res) => {
    try {
        await Task.findByIdAndDelete(req.params.id);
        res.json({ msg: "Tâche supprimée" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;