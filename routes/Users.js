const express = require("express")
const users = express.Router()
const cors = require("cors")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
var async = require("async");
const nodemailer = require("nodemailer");
const User = require("../models/User")
const ProImage = require("../models/ProfileImage")
var multer = require("multer");
const Cryptr = require('cryptr');
const cryptr = new Cryptr('myTotalySecretKey');
const uuidv1 = require('uuid/v1');

users.use(cors())

process.env.SECRET_KEY = 'secret'

//REGISTER
var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './propics');
    },

    filename: (req, file, cb) => {
        var filetype = '';
        console.log(file.mimetype)

        if (file.mimetype === 'image/jpg') {
            filetype = 'jpg';
        }
        if (file.mimetype === 'image/jpeg') {
            filetype = 'jpeg';
        }
        if (file.mimetype === 'image/png') {
            filetype = 'png';
        }
        cb(null, file.originalname + '-' + Date.now() + '.' + filetype);
    }
});

var upload = multer({
    storage: storage,
    limits: {
        fileSize: '10M',

    }
})

users.post('/register', (req, res) => {
    const today = new Date()
    console.log(req.body)
    const token = jwt.sign({  /*sign jwt means creating a token*/
        email: req.body.email,/*these are payloads*/

    },
        process.env.SECRET_KEY,
        {
            expiresIn: '1h'/*this is option*/
        })
    const userData = {
        user_type: 'user',
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        address: req.body.address,
        contact_num: req.body.contact_num,
        email: req.body.email,
        password: req.body.password,
        resetPasswordToken: req.body.resetPasswordToken,
        resetPasswordExpires: req.body.resetPasswordExpires,
        isActivated: false,
        created: today
    }
    User.findOne({
        where: {
            email: req.body.email
        }

    }).then((user) => {
        console.log("user data ->>>>>>>>>>>>>>>")
        if (!user) {
            const hash = bcrypt.hashSync(userData.password, 10)
            userData.password = hash;
            User.create(userData)
                .then(result => {
                    console.log(userData);
                    console.log("user created");
                    async function main() {  //SEND_EMAIL_TO_GIVEN_USER_EMAIL
                        let transporter = nodemailer.createTransport({
                            host: "smtp.gmail.com",
                            auth: {
                                user: "dilina5860717@gmail.com", // generated ethereal user
                                pass: "dIlI1@@$$" // generated ethereal password
                            }
                        });

                        // send mail with defined transport object
                        let info = await transporter.sendMail({
                            from: "dilina5860717@gmail.com", // sender address
                            to: req.body.email, // list of receivers
                            subject: "Active your itrack24✔", // Subject line
                            html: "<b>To Active your itrack24 Account, click this link</b>" + "http://localhost:4200/verify?token=" + token + "&email=" + userData.email// html body
                        });

                        console.log("Message sent: %s", info.messageId);
                        res.send({
                            message: "Verification link has been sent to your email"
                        });
                    }
                    main().catch(console.error);
                })
                .catch(err => {
                    res.send('error' + err)
                })
        } else {
            res.send({
                message: "this email registered already.Try another email"
            });
            console.log("user exist already");
        }
    })
        .catch(err => {
            res.send('error' + err)
        })
})


//VERIFY_USER_ACCOUNT
users.get('/verify', (req, res) => {
    console.log(req.query.token);
    console.log(req.query.email);
    User.update({
        isActivated: true
    },
        {
            where: {
                email: req.query.email //UPDATE_IS_ACTIVATED_AS_TRUE
            }
        }).then((respond) => {
            console.log(respond)
            res.json(respond);
        })
});


// LOGIN
users.post('/login', (req, res) => {
    console.log(req.body)
    User.findOne({
        where: {
            email: req.body.email,
            isActivated: true,

            //req.body kiyana eke thiyenne body parameters
            //req.query kiyana eke thiyenne query parameters
            //postman eken eeka select karala yawanna puluwan. query parameters enne url ekath ekkamai
            // body parameters enne request eke body ekath ekka
        }
    }).then(user => {
        if (user) {
            // let id = user.id;
            if (bcrypt.compareSync(req.body.password, user.password)) {
                let token = jwt.sign(user.dataValues, process.env.SECRET_KEY, {
                    expiresIn: '1h'
                })
                User.update({
                    user_token: token
                }, {
                    where: {
                        email: req.body.email //UPDATE_TOKEN_SUCCESS_HERE
                    }
                })
                res.json({
                    token: token, user_type: user.user_type, firstName: user.first_name, lastName: user.last_name, userId: user.id
                    , message: "Logged succesfully"
                })
            }
            else {
                res.send({
                    message: "Incorrect password"
                })
            }
        } else {
            res.send({
                message: "Incorrect email"
            });
        }
    })
        .catch(err => {
            res.send('error:' + err)
        });
});

//PROFILE
users.post('/userprofile', (req, res) => {
    // var decoded = jwt.verify(req.headers['authorization'], process.env.SECRET_KEY)
    const id = req.body.id
    User.findOne({
        where: {
            id: id
        }
    }).then((data) => {
        res.json(data);
        console.log(data);
    });
});



//UPDATE PROFILE
users.post('/editprofile', (req, res) => {
    User.update({
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        address: req.body.address,
        contact_num: req.body.contact_num,
        email: req.body.email
    }, {
        where: {
            id: req.body.id
        }
    }).then(result => {
        User.findOne({
            where: {
                email: req.body.email,
            }
        }).then(user => {
            let token = jwt.sign(user.dataValues, process.env.SECRET_KEY, {
                expiresIn: 1440
            })
            res.json({ token: token });
        })
            .catch(err => {
                res.send('error:' + err);
            })

    });
});

//FORGOT_PASSWORD
users.post('/forgot', (req, res, err) => {
    User.findOne({
        where: {
            email: req.body.email
        }
    })
        .then(user => {
            if (!user) {
                res.send({
                    message6: "Not any account registered with this emil. Enter validted email"
                });
            }

            else {
                var token = uuidv1();
                console.log(token);
                user.id = req.body.id;
                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now();
                user.save((user) => {
                    res.json(user)
                });
                async function main() {
                    let transporter = nodemailer.createTransport({
                        host: "smtp.gmail.com",
                        auth: {
                            user: "dilina5860717@gmail.com", // generated ethereal user
                            pass: "dIlI1@@$$" // generated ethereal password
                        }
                    });

                    // send mail with defined transport object
                    let info = await transporter.sendMail({
                        from: "dilina5860717@gmail.com", // sender address
                        to: req.body.email, // list of receivers
                        subject: "Hello ✔", // Subject line
                        html: "<b>Hello world?</b>" + "http://localhost:4200/reset-pass-token?token=" + token // html body
                    });

                    console.log("Message sent: %s", info.messageId);
                    res.send({
                        token: token,
                        message7: "Reset password link has been sent to the " + req.body.email + ". Check it"
                    });
                }

                main().catch(console.error);
            }
        });
});


//RESET_PASSWORD
users.post('/reset', (req, res, err) => {
    console.log(req.query.token);
    User.findOne({
        where: {
            resetPasswordToken: req.query.token
        }
    })

        .then(user => {
            if (user) {
                //user.password = req.query.password;
                bcrypt.hash(req.body.password, 10, (err, hash) => {
                    if (err) {
                        console.log(err);
                        res.json({
                            Message: err
                        })
                    }
                    else {
                        user.password = hash;
                        user.save()
                            .then(user => {
                                console.log("password updated");
                                res.send({
                                    message8: "Password reseted succesfully"
                                })

                            })
                            .catch(err => {
                                res.json(err);
                                console.log(err);
                            })
                    }
                })

            }
            else {
                res.send({
                    message9: "Your session has expired. Retry reset the password"
                })
            }
        })
        .catch(err => {
            console.log(err);
        });

});

//VIEW_NAVBAR_IMAGE
users.post('/viewnavimage', (req, res) => {
    const id = req.body.id;
    ProImage.findOne({
        where: {
            U_id: id
        }
    }).then((result) => {
        res.json(result);
        console.log(result);
    });
})

//GET_USER_PASSWORD
users.post('/getpassword', (req, res) => {
    const id = req.body.id;
    const password = req.body.password;
    console.log(password);
    User.findOne({
        where: {
            id: id
        }
    }).then(respond => {
        if (bcrypt.compareSync(password, respond.password)) {
            res.json({
                message1: "PASSWORD_MATCHED"
            });
        }
        else {
            res.json({
                message2: "PASSWORD_MISSMATCHED"
            })
        }
    });
});


//CHENAGE_USER_PASSOWRD
users.post('/changepassword', (req, res) => {
    const id = req.body.id;
    const newpassword = req.body.newpassword;
    User.findOne({
        where: {
            id: id
        }
    }).then(respond => {
        const hash = bcrypt.hashSync(newpassword, 10);
        User.update({
            password: hash
        }, {
            where: {
                id: id
            }
        }).then(result => {
            res.json({
                message: "PASSWORD_HAS_BEEN_CHANGED"
            });
        });
    });
});


module.exports = users

