require('./config/config')

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const { ObjectID } = require('mongodb');

var { mongoose } = require('./db/mongoose');
var { Todo } = require('./models/todo');
var { User } = require('./models/user');
var { authenticate } = require('./middleware/authenticate');

var port = process.env.PORT;

var app = express();

app.use(bodyParser.json());

// Create a new todo
app.post('/todos', authenticate, async (req, res) => {
    const todo = new Todo({
        text: req.body.text,
        _creator: req.user._id
    });
    try {
        const doc = await todo.save();
        res.send(doc);
    } catch (e) {
        res.status(400).send(e);
    }    
});

// Get all the todos
app.get('/todos', authenticate, async (req, res) => {
    try {
        const todos = await Todo.find({
            _creator: req.user._id
        });
        res.send({ todos });
    } catch (e) {
        res.status(400).send(e);
    }
});

// Get a specific todo
app.get('/todos/:id', authenticate, async (req, res) => {    
    try {
        const id = req.params.id;
        if (!ObjectID.isValid(id)) {
            return res.status(400).send();
        }
        const todo = await Todo.findOne({
            _id: id,
            _creator: req.user._id
        });
        if (!todo) {
            return res.status(404).send();
        }
        res.send({ todo });
    } catch (e) {
        res.status(400).send();
    }    
});

// Delete a specific todo
app.delete('/todos/:id', authenticate, async (req, res) => {
    try {
        const id = req.params.id;
        if (!ObjectID.isValid(id)) {
            return res.status(400).send();        
        }
        const todo = await Todo.findOneAndDelete({
            _id: id,
            _creator: req.user._id
        });
        if (!todo) {
            return res.status(404).send();
        }
        res.send({ todo });
    } catch (e) {
        res.status(400).send();
    }
});

// Update a specific todo
app.patch('/todos/:id', authenticate, async (req, res) => {
    try {
        const id = req.params.id;
        let body = _.pick(req.body, ['text', 'completed']);
        if (!ObjectID.isValid(id)) {
            return res.status(400).send();
        }
        if (_.isBoolean(body.completed) && body.completed) {
            body.completedAt = new Date().getTime();
        } else {
            body.completed = false;
            body.completedAt = null;
        }
        const todo = await Todo.findOneAndUpdate({ _id: id, _creator: req.user._id }, { $set: body }, { new: true });
        if (!todo) {
            return res.status(404).send();
        }
        res.send({ todo });
    } catch (e) {
        res.status(400).send();
    }           
});

// Signup for a new user
app.post('/users', async (req, res) => {    
    try {
        const body = _.pick(req.body, ['email', 'password']);
        const user = new User(body);
        await user.save();        
        const token = await user.generateAuthToken();
        res.set('x-auth', token).send(user);
    } catch (e) {
        res.status(400).send(e);
    }    
});

// Get my authentication
app.get('/users/me', authenticate, (req, res) => {
    res.send(req.user);
});

// Login for a existing user
app.post('/users/login', async (req, res) => {
    try {
        const body = _.pick(req.body, ['email', 'password']);
        const user = await User.findByCredentials(body.email, body.password);
        const token = await user.generateAuthToken();
        res.header('x-auth', token).send(user);
    } catch (e) {
        res.status(400).send();
    }
});

// Logout the loggedin user
app.delete('/users/me/token', authenticate, async (req, res) => {
    try {
        await req.user.removeToken(req.token);
        res.status(200).send();
    } catch(e) {
        res.status(400).send();
    }   
});

app.listen(port, () => {
    console.log(`\nStarted up at port ${port}`);
});

module.exports = {
    app
};