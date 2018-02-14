const express = require('express');
const Sequelize = require('sequelize');
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const BearerStrategy = require('passport-http-bearer').Strategy;
const jwt = require('jwt-simple');

const TodoFactory =  require('../models/todo');
const Todo = require('./Todo');

//TODO don't hardcode credential
const ADMIN = 'admin';
const ADMIN_PASSWORD = 'password';
const SECRET = 'secret';

//sequelize to connect with the db
const sequelize = new
Sequelize('postgres://kpapachristou:OBMITTED@localhost/rest_api');
sequelize
    .authenticate()
    .then(() => {
        const Todo = TodoFactory(sequelize, Sequelize);
        const app = express();
// Initialize everything needed with *.use()
        app.use(bodyParser.json());
//Middleware to not cache the API by the browser
        app.use((req, res, next) => {
            res.setHeader('cache-control', 'private, max-age=0, no-cache, no-store, must-revalidate');
            res.setHeader('expires', '0');
            res.setHeader('pragma', 'no-cache');
            next();
        });

//Authentication for admin
        passport.use(new LocalStrategy((username, password, done) => {
            if(ADMIN === username && ADMIN_PASSWORD === password) {
                done(null, jwt.encode({username}, SECRET));
                return;
            }
            done(null, false);
        }));
        passport.use(new BearerStrategy((token, done) => {
            try{
                const { username } = jwt.decode(token, SECRET);
                if(ADMIN === username) {
                    done(null, username);
                    return;
                }
                done(null, false);
            }
            catch (error) {
                done(null, false);
            }
        }));

//Login Request
        app.post(
            '/login',
            passport.authenticate('local', { session: false}),
            (req, res) => {
                res.send({
                    token: req.user,
                });
            }
        );

//CRUD methods
        app.get(
            '/todos',
            passport.authenticate('bearer', { session: false }),
            (_, res) => {
                Todo.findAll().then((todos) => {
                    res.send(todos);
                });
            });

        app.post(
            '/todos',
            passport.authenticate('bearer', { session: false }),
            (req, res) => {
                Todo.create({ note: req.params.note})
                    .then((todo) => {
                        res.send(todo);
                    });
            });

        app.delete(
            '/todos/:id',
            passport.authenticate('bearer', { session: false }),
            (req, res) => {
                Todo.findById(req.params.id)
                    .then(todo => todo.destroy())
                    .then(() => res.send());
            });
//Listen to the port
        app.listen(3000, () => console.log('Rest Api'));
    })
    .catch((err) => {
        console.error('Unable to connect to the db:', err);
    });
