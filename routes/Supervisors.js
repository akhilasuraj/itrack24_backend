const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const supervisor = express.Router();
supervisor.use(cors());
const Complain = require("../models/Complain");
const Supervisor = require("../models/Supervisor");
const User = require("../models/User");
const Job = require("../models/job");
const Worker = require("../models/Worker");
const Employment = require("../models/Employment");
const Sequelize = require('sequelize');


//SUPERVISOR_LOGIN
supervisor.post("/login", (req, res, err) => {
    Supervisor.findOne({
        where: {
            email: req.body.email
        }
    }).then((result) => {
        if (result) {
            console.log(result.email);
            console.log(req.body.password);
            if (bcrypt.compareSync(req.body.password, result.password)) {
                let token = jwt.sign(result.dataValues, process.env.SECRET_KEY, {
                    expiresIn: 3600
                });
                res.json({ contactno: result.contactno, firstname: result.firstname, lastname: result.lastname, email: result.email, token: token, supervisorID: result.id, jobcategory1: result.jobcategory1, jobcategory2: result.jobcategory2 }); //SEND_JOBCATEGORIES
            } else {
                console.log("PASSWORD_INCORRECT");
            }
        } else {
            console.log("USER_NOT_EXIST");
        }
    });
});


//GET_SUPERVISOR'S_RELEVANT_ALL_COMPLAINS
supervisor.post("/getjob", (req, res) => {
    const cat1 = req.body.jobcategory1; //SUPERVISOR_CATEGORY
    const cat2 = req.body.jobcategory2;

    Complain.findAll({
        where: {
            [Sequelize.Op.or]: [
                { sectionName: cat1 },
                { sectionName: cat2 }
            ],
            isAssigned: false,
            isAccepted: true
        }
    }).then((result) => {
        res.json(result);
        // console.log(result);
        console.log("SUITABLE_COMPLAINS_FOR_A_SUPERVISOR");
    })
});

//GO_INTO_COMPLAIN
supervisor.post("/viewjob", (req, res) => {
    const id = req.body.id;
    User.hasMany(Complain, { foreignKey: 'user_id' })
    Complain.belongsTo(User, { foreignKey: 'user_id' }) //JOIN_USER_AND_COMPLAIN_TABLE
    Complain.findOne({
        where: {
            id: id
        },
        include: [User]
    }).then((data) => {
        res.json(data);
    })
});

//AVAILABLE_WORKERS_COUNT
supervisor.post("/workerscount", (req,res)=>{
    const category = req.body.category;
    Worker.count({
        where :{
            availability : true,
            [Sequelize.Op.or]:[
                {JobType1:category},
                {JobType2:category}
            ]
        }
    }).then(sum=>{
        res.json(sum);
        console.log("HERE_IS_THE_AVAILABLE_WORKERS_NOW");
    });
});



//ADD_WORKERS_TO_SPECIFIC_JOB_WIHT_SPECIFIC_AMOUNT
supervisor.post("/addworker", (req, res) => {
    const JobType = req.body.category;
    const amount = req.body.amount;
    const jobID = req.body.jobID;
    Worker.findAndCountAll({
        where: {
            [Sequelize.Op.or]: [
                { JobType1: JobType },
                { JobType2: JobType }
            ],
            availability: true
        },
        limit: amount
    })
        .then((result) => {
            result.rows.forEach(element => {
                console.log(element.id);
                EmploymentData = {
                    workerID: element.id,
                    jobID: jobID
                }
                Employment.create(EmploymentData)
                    .then(() => {
                        Worker.update({
                            availability: false,
                            jobID: jobID
                        }, {
                            where: {
                                id: element.id
                            }
                        }),
                            Job.update({
                                isWorkersAdded: true
                            }, {
                                where: {
                                    id: jobID
                                }
                            });
                    }); 
            }), res.send({
                message: "Success"
            });
        });
});



//ACCEPT_BY_THE_SUPERVISOR
supervisor.post("/addjob", (req, res) => {
    const supervisorID = req.body.supervisorID; //GET_THE_SUPERVISOR_ID 
    const complainID = req.body.complainID;
    Job.count({
        where: {
            supervisorID: supervisorID,
            isWorkOn: true
        }
    }).then((result) => {
        console.log(result);
        if (result >= 2) { //CHECK_THE_WORK_ON_COMPLAINS_EXCEED_THE_MAX(2)
            console.log("YOU_HAVE_RECEIVED_MAXIMUM_NUM_OF_COMPLAINS_ALREADY");
            res.json({
                message: 'YOU_HAVE_RECEIVED_MAXIMUM_NUM_OF_COMPLAINS_ALREADY'
            });
        } else {
            const jobData = {
                complainID: complainID,
                supervisorID: supervisorID,
                workStatus: 'in progress',
                isWorkOn: true,
                rating: '0',
                isWorkerAdded: false
            }
            Job.create(jobData)
                .then((result) => {
                    if (result) {
                        Complain.update({
                            isAssigned: true
                        }, {
                            where: {
                                id: complainID
                            }
                        })
                        res.json(result);
                        console.log("NEW_JOB_CREATED_SUCCESFULLY");
                    } else {
                        console.log("JOB_CREATION_FAILED");
                    }
                });

        }
    })


});

//GIVE_STATUS_OF_JOB
supervisor.post("/givestatus", (req, res) => {
    const id = req.body.id //JOB_ID
    Job.update({
        isWorkOn: false
    }, {
        where: {
            id: id
        }
    }).then((data) => {
        console.log("JOB_HAS_BEEN_COMPLETED");
    });
});


//TAKE_ALL_DETAILS_ABOUT_WORKERS
supervisor.post("/getjoblist", (req, res) => {
    const supervisorID = req.body.supervisorID;

    Complain.hasOne(Job, { foreignkey: 'complainID' })
    Job.belongsTo(Complain, { foreignKey: 'complainID' })
    Job.findAll({
        where: {
            supervisorID: supervisorID
        },
        include: [Complain]
    }).then(result => {
        res.json(result);
        
    })

});



//TAKE_ALL_DETAILS_ABOUT_WORKERS_RELATED_TO_CURRENT_JOB
supervisor.post("/getallworkers", (req, res) => {
    const jobID = req.body.jobID; //jobid
    Worker.findAll({
        where: {
            jobID: jobID
        }
    }).then(respond => {
        res.json(respond);
    })
});


//COMPLETED_WORK------------------------------------------->changed
supervisor.post("/workcomplete", (req, res) => {
    const id = req.body.id;
    console.log(id);
    const complainID = req.body.complainID;
    Job.update({
        isWorkOn: false,
        workStatus: "completed"
    }, {
        where: {
            id: id
        }
    }).then(respond => {
        Worker.update({
            availability: true
        }, {
            where: {
                jobID: id
            }
        })
    }).then(data => {
        Complain.update({
            isCompleted: true
        }, {
            where: {
                id: complainID
            }
        }).then(respond => {
            console.log("JOB_COMPLETED_SUCCESFULLY");
            res.send(respond)
        });
    });
});

//GET_COMPLAINED_USER_DETAIL
supervisor.post("/getuserdetails",(req,res)=>{
    const id = req.body.id;
    User.hasMany(Complain, { foreignKey: 'user_id' })
    Complain.belongsTo(User, { foreignKey: 'user_id' }) //JOIN_USER_AND_COMPLAIN_TABLE
    
    Complain.findOne({
        where: {
            id: id
        },
        include:[User]
    }).then(result=>{
        res.json(result);
        console.log("HERE THE DETAILS OF THE COMPLAINER");
    });
});



module.exports = supervisor;