const express = require('express');
const router = express.Router();
const moment = require('moment');
const ModelProject = require('../models/project');
const ModelUser = require('../models/user');
const ModelUserStory = require('../models/userStory');
const { ensureAuthenticated } = require('../config/authenticated');

// Page displaying the main information about the selected project
router.get('/project/:projectId', ensureAuthenticated, (req, res) => {
    let projectId = req.params.projectId;
    ModelProject.findOne({ _id: projectId })
        .then(project => {
            ModelUserStory.find({ projectId: projectId })
                .then(userStories => {
                    res.render('project', {
                        project: project,
                        moment: moment,
                        orphanUs: userStories
                    });
                }).catch(err => console.log("Couldn't find this project: " + err));
        }
        )
        .catch(err => console.log("Couldn't find this project: " + err));
});

// Modify Project
router.get('/project/:projectId/ModifyProject', ensureAuthenticated, (req, res) => {
    ModelProject.findOne({ _id: req.params.projectId }).then(project => {
        res.render('modifyProject', {
            project: project
        });
    }).catch(err => console.log(err));

});
// Modification of the name or description of the selected project
router.post('/project/:projectId', ensureAuthenticated, (req, res) => {
    const projectId = req.params.projectId;
    const newProjectName = req.body.projectName;
    const newProjectDescription = req.body.projectDesc;

    let errors = [];

    if (newProjectName) {
        if (newProjectName.length > 40) {
            errors.push({ msg: 'Le nom de votre projet doit être inférieur à 40 caractères' });
        }

        else {
            ModelProject.updateOne({ _id: projectId }, {
                name: newProjectName,
                description: newProjectDescription

            }, function () { });
        }
    }

    else if (newProjectDescription) {
        if (newProjectDescription.length > 300) {
            errors.push({ msg: 'La description de votre projet doit prendre moins de 300 caractères' });
        }
        else {
            ModelProject.updateOne({ _id: projectId }, {
                description: newProjectDescription
            }, function () { });
        }
    }

    else {
        console.log("An error occured when modifying the project attributes")
    }

    if (errors.length == 0) {

        ModelUserStory.find({ projectId: req.params.projectId }).then(userStories => {
            ModelProject.findOne({ _id: req.params.projectId }).then(project => {
                res.render('project', {
                    project: project,
                    moment: moment,
                    orphanUs: userStories
                });
            });

        }).catch(err => console.log(err));
    }
    else {
        ModelProject.findOne({ _id: req.params.projectId }).then(project => {
            res.render('project', {
                errors,
                project: project,
                moment: moment
            });
        });

    }

});

router.get('/project/:projectId/delete', ensureAuthenticated, (req, res) => {
    ModelProject.deleteOne({ _id: req.params.projectId }, function () { });
    ModelProject.find({ 'users.email': req.user.email })
        .then(projects => {
            res.render('index', {
                user: req.user,
                projects: projects
            });
        }).catch(err => console.log(err));

});

router.get('/project/:projectId/addUser', ensureAuthenticated, (req, res) => {
    res.render('addUser', {
        projectId: req.params.projectId,
        user: req.user
    });
});

router.post('/project/:projectId/addUser', ensureAuthenticated, (req, res) => {
    const projectId = req.body.projectId;
    const newUser = req.body.newUser;
    const errors = [];

    ModelUser.findOne({ email: newUser })
        .then(user => {
            if (user) {
                //User is registred 
                var userToadd = { email: newUser };
                ModelProject.find({ _id: projectId, users: { $elemMatch: { email: newUser } } })
                    .then(project => {
                        //Checking if user already assigned to the project
                        if (project.length > 0) {
                            errors.push({ msg: 'l\'utilisateur est deja un collaborateurs du projet' });
                        } else {
                            ModelProject.updateOne({ _id: projectId },
                                { $push: { users: userToadd } }, (succ, err) => {
                                    if (err) {
                                        errors.push({ msg: 'Ajout non effectuer' + err });
                                    }
                                }
                            );
                        }
                    }).catch(err => errors.push({ msg: err }));

            } else {
                errors.push({ msg: 'l\'utilisateur n\'existe pas' });
            }
        }).catch(err => errors.push({ msg: err }));
    if (errors.length > 0) {
        res.render('/project/:projectId/addUser', {
            projectId: projectId,
            errors: errors,
            user: req.user
        });
    } else {
        res.redirect('/');
    }

});

module.exports = router;