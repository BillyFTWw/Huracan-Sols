// Basic Imports
const config = require("./config.json");
const express = require("express");
const app = express();
const chalk = require('chalk');
const utils = require('hyperz-utils');
const bcrypt = require('bcrypt');
const axios = require('axios');
const fs = require('node:fs');

// MySQL Setup
const mysql = require('mysql');
config.sql.charset = "utf8mb4";
let con = mysql.createConnection(config.sql); // set = 0 to disable

// Backend Initialization
const backend = require('./backend.js');
backend.init(app, con);

// Passport Initialization
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
passport.serializeUser(function(user, done) { done(null, user) });
passport.deserializeUser(function(obj, done) { done(null, obj) });
passport.use(new LocalStrategy({ usernameField: 'email' }, backend.authenticateUserLocal))

const DiscordStrategy = require('passport-discord-hyperz').Strategy;
passport.use(new DiscordStrategy({
    clientID: config.discord.oauthId,
    clientSecret: config.discord.oauthToken,
    callbackURL: `${(config.domain.endsWith('/') ? config.domain.slice(0, -1) : config.domain)}/auth/discord/callback`, // THIS IS THE CALLBACK URL
    scope: ['identify', 'guilds', 'email'],
    prompt: 'consent'
}, function(accessToken, refreshToken, profile, done) {
    process.nextTick(function() {
        return done(null, profile);
    });
}));
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', {failureRedirect: '/'}), async function(req, res) {
    req.session?.loginRef ? res.redirect(req.session.loginRef) : res.redirect('/account');
    delete req.session?.loginRef
});

// Routing
app.get('', async function(req, res) {
    await backend.resetAppLocals(app);
    let reading = "0 / 0";
    if(app.locals.sitesettings.fivemserverip != 'none') {
        let fivem1 = await axios.get(`http://${app.locals.sitesettings.fivemserverip}/players.json`).catch(e => {});
        let fivem2 = await axios.get(`http://${app.locals.sitesettings.fivemserverip}/info.json`).catch(e => {});
        fivem1 = fivem1?.data?.length;
        fivem2 = fivem2?.data?.vars?.sv_maxClients;
        reading = `${Number(fivem1 || '0').toLocaleString()} / ${Number(fivem2 || '0').toLocaleString()}`;
    };
    con.query(`SELECT * FROM faq`, async function(err, faq) {
        if(err) throw err;
        con.query(`SELECT * FROM users`, async function(err, users) {
            if(err) throw err;
            res.render('index.ejs', { faq: faq, loggedIn: req.isAuthenticated(), reading: reading, discordMembers: await backend.fetchMemberCount(), users: users });
        });
    });
});

app.get('/rules', async function(req, res) {
    backend.resetAppLocals(app);
    res.render('rules.ejs', { loggedIn: req.isAuthenticated() });
});

app.get('/banned', async function(req, res) {
    backend.resetAppLocals(app);
    res.render('banned.ejs', { loggedIn: req.isAuthenticated() });
});

app.get('/feedback', backend.checkAuth, async function(req, res) {
    backend.resetAppLocals(app);
    res.render('feedback.ejs', { loggedIn: req.isAuthenticated(), user: req.user });
});

app.get('/gallery', async function(req, res) {
    backend.resetAppLocals(app);
    con.query(`SELECT * FROM gallery`, function(err, gallery) {
        if(err) throw err;
        res.render('gallery.ejs', { gallery: gallery, loggedIn: req.isAuthenticated() });
    });
});

app.get('/apply', backend.checkAuth, async function(req, res) {
    backend.resetAppLocals(app);
    con.query(`SELECT * FROM applications WHERE closed=false`, function(err, applications) {
        if(err) throw err;
        res.render('apply.ejs', { applications: applications, loggedIn: req.isAuthenticated() });
    });
});

app.get('/apply/:uid', backend.checkAuth, async function(req, res) {
    backend.resetAppLocals(app);
    for(let item of Object.keys(req.params)) {
        req.params[item] = await utils.sanitize(req.params[item]);
    };
    con.query(`SELECT * FROM applications WHERE closed=false AND id="${req.params.uid}"`, function(err, applications) {
        if(err) throw err;
        if(!applications[0]) return res.redirect('/apply');
        con.query(`SELECT * FROM appquestions WHERE appid="${req.params.uid}"`, function(err, questions) {
            if(err) throw err;
            if(!questions[0]) return res.redirect('/apply');
            res.render('applyform.ejs', { application: applications[0], questions: questions, loggedIn: req.isAuthenticated() });
        });
    });
});

app.get('/admin', backend.checkAuth, async function(req, res) {
    backend.resetAppLocals(app);
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) res.redirect('/404');
        let data = {};
        con.query(`SELECT * FROM applications`, function(err, applications) {
            if(err) throw err;
            data.applications = applications;
            con.query(`SELECT * FROM users`, function(err, users) {
                if(err) throw err;
                data.users = users;
                con.query(`SELECT * FROM custompages`, function(err, custompages) {
                    if(err) throw err;
                    data.custompages = custompages;
                    con.query(`SELECT * FROM team`, function(err, team) {
                        if(err) throw err;
                        data.team = team;
                        con.query(`SELECT * FROM prompts`, function(err, prompts) {
                            if(err) throw err;
                            data.prompts = prompts;
                            con.query(`SELECT * FROM faq`, function(err, faq) {
                                if(err) throw err;
                                data.faq = faq;
                                con.query(`SELECT * FROM gallery`, function(err, gallery) {
                                    if(err) throw err;
                                    data.gallery = gallery;
                                    con.query(`SELECT * FROM feedback`, function(err, feedback) {
                                        if(err) throw err;
                                        data.feedback = feedback;
                                        con.query(`SELECT * FROM staff`, function(err, staff) {
                                            if(err) throw err;
                                            data.staff = staff;
                                            con.query(`SELECT * FROM bannedusers`, function(err, bannedusers) {
                                                if(err) throw err;
                                                data.bannedusers = bannedusers;
                                                res.render('admin.ejs', { data: data, loggedIn: req.isAuthenticated(), isOwner: config.ownerIds.includes(req.user.id) });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

app.get('/team', async function(req, res) {
    backend.resetAppLocals(app);
    con.query(`SELECT * FROM team`, function(err, team) {
        if(err) throw err;
        res.render('team.ejs', { team: team, loggedIn: req.isAuthenticated() });
    });
});

app.get('/edit/application/:uid', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.params)) {
        req.params[item] = await utils.sanitize(req.params[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`SELECT * FROM applications WHERE id="${req.params.uid}"`, function(err, application) {
            if(err) throw err;
            con.query(`SELECT * FROM appquestions WHERE appid="${req.params.uid}"`, function(err, questions) {
                if(err) throw err;
                res.render('appquestions.ejs', { loggedIn: req.isAuthenticated(), questions: questions, application: application[0] });
            });
        });
    });
});

app.get('/login', backend.checkNotAuth, async function(req, res) {
    backend.resetAppLocals(app);
    res.render('login.ejs', { loggedIn: false });
});

app.get('/appsubmitted', async function(req, res) {
    backend.resetAppLocals(app);
    res.render('appsubmitted.ejs', { loggedIn: req.isAuthenticated() });
});

app.get('/cookies', async function(req, res) {
    await backend.resetAppLocals(app);
    res.render('cookies.ejs', { loggedIn: req.isAuthenticated() });
});

app.get('/privacy', async function(req, res) {
    await backend.resetAppLocals(app);
    res.render('privacy.ejs', { loggedIn: req.isAuthenticated() });
});

app.get('/account', backend.checkAuth, async function(req, res) {
    backend.resetAppLocals(app);
    con.query(`SELECT * FROM appresponses WHERE user="${req.user.id}"`, function(err, responses) {
        if(err) throw err;
        let newArray = [];
        for(let item of responses) {
            con.query(`SELECT * FROM applications WHERE id="${item.appid}"`, function(err, row) {
                if(err) throw err;
                item.appname = row[0].name;
                newArray.push(item);
            });
        };
        con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
            if(err) throw err;
            let isStaff = false;
            if(row[0]) isStaff = true;
            res.render('account.ejs', { user: req.user, loggedIn: req.isAuthenticated(), isStaff: isStaff, responses: newArray });
        });
    });
});

app.get('/view/application/:uid', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.params)) {
        req.params[item] = await utils.sanitize(req.params[item]);
    };
    let isAllowed = false;
    let isStaff = false;
    con.query(`SELECT * FROM appresponses WHERE id="${req.params.uid}"`, function(err, response) {
        if(err) throw err;
        if(!response[0]) return res.redirect('/404');
        if(response[0].user == req.user.id) isAllowed = true;
        con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
            if(err) throw err;
            if(row[0]) {
                isAllowed = true;
                isStaff = true;
            };
            if(!isAllowed) return res.redirect('/404');
            con.query(`SELECT * FROM applications WHERE id="${response[0].appid}"`, function(err, applications) {
                if(err) throw err;
                response[0].responses = JSON.parse(response[0].responses);
                res.render('appview.ejs', { loggedIn: req.isAuthenticated(), application: applications[0], response: response[0], isStaff: isStaff });
            });
        });
    });
});

app.get('/responses/:appid', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.params)) {
        req.params[item] = await utils.sanitize(req.params[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`SELECT * FROM applications WHERE id="${req.params.appid}"`, function(err, applications) {
            if(err) throw err;
            con.query(`SELECT * FROM appresponses WHERE appid="${req.params.appid}"`, function(err, responses) {
                if(err) throw err;
                res.render('appresponses.ejs', { loggedIn: req.isAuthenticated(), application: applications[0], responses: responses });
            });
        });
    });
});

app.get('/page/:link', async function(req, res) {
    backend.resetAppLocals(app);
    for(let item of Object.keys(req.params)) {
        req.params[item] = await utils.sanitize(req.params[item]);
    };
    con.query(`SELECT * FROM custompages WHERE link="${req.params.link}"`, async function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        row[0].content = await utils.mdConvert(row[0].content);
        res.render('custompage.ejs', { loggedIn: req.isAuthenticated(), page: row[0] });
    });
});

app.get('/backend/delete/prompt/:uid', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.params)) {
        req.params[item] = await utils.sanitize(req.params[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`DELETE FROM prompts WHERE id="${req.params.uid}"`, function(err, row) {
            if(err) throw err;
            res.redirect('/admin')
        });
        backend.sendToWebhook(`A prompt has been deleted!`);
    });
});

app.get('/backend/deleteuser/:uid', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.params)) {
        req.params[item] = await utils.sanitize(req.params[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`DELETE FROM users WHERE id="${req.params.uid}"`, function(err, row) {
            if(err) throw err;
            res.redirect('/admin')
        });
        backend.sendToWebhook(`A users account has been deleted!`);
    });
});

app.get('/backend/delete/team/:uid', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.params)) {
        req.params[item] = await utils.sanitize(req.params[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`DELETE FROM team WHERE id="${req.params.uid}"`, function(err, row) {
            if(err) throw err;
            res.redirect('/admin')
        });
        backend.sendToWebhook(`A team member has been deleted!`);
    });
});

app.get('/backend/delete/gallery/:uid', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.params)) {
        req.params[item] = await utils.sanitize(req.params[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`DELETE FROM gallery WHERE id="${req.params.uid}"`, function(err, row) {
            if(err) throw err;
            res.redirect('/admin')
        });
        backend.sendToWebhook(`A gallery item has been deleted!`);
    });
});

app.get('/backend/delete/feedback/:uid', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.params)) {
        req.params[item] = await utils.sanitize(req.params[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`DELETE FROM feedback WHERE id="${req.params.uid}"`, function(err, row) {
            if(err) throw err;
            res.redirect('/admin')
        });
        backend.sendToWebhook(`A feedback item has been deleted!`);
    });
});

app.get('/backend/delete/custompage/:uid', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.params)) {
        req.params[item] = await utils.sanitize(req.params[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`DELETE FROM custompages WHERE id="${req.params.uid}"`, function(err, row) {
            if(err) throw err;
            res.redirect('/admin')
        });
        backend.sendToWebhook(`A custom page has been deleted!`);
    });
});

app.get('/backend/delete/submission/:uid', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.params)) {
        req.params[item] = await utils.sanitize(req.params[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`DELETE FROM appresponses WHERE id="${req.params.uid}"`, function(err, row) {
            if(err) throw err;
            res.redirect('/admin')
        });
        backend.sendToWebhook(`A application submission has been deleted!`);
    });
});

app.get('/backend/delete/application/:uid', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.params)) {
        req.params[item] = await utils.sanitize(req.params[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`DELETE FROM applications WHERE id="${req.params.uid}"`, function(err, row) {
            if(err) throw err;
            con.query(`DELETE FROM appquestions WHERE appid="${req.params.uid}"`, function(err, row) {
                if(err) throw err;
            });
            res.redirect('/admin')
        });
        backend.sendToWebhook(`An application has been deleted!`);
    });
});

app.get('/backend/delete/appquestion/:appid/:uid', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.params)) {
        req.params[item] = await utils.sanitize(req.params[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`DELETE FROM appquestions WHERE id="${req.params.uid}"`, function(err, row) {
            if(err) throw err;
            res.redirect(`/edit/application/${req.params.appid}`);
        });
        backend.sendToWebhook(`An application question has been deleted!`);
    });
});

app.get('/backend/toggleclosed/application/:uid', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.params)) {
        req.params[item] = await utils.sanitize(req.params[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`SELECT * FROM applications WHERE id="${req.params.uid}"`, function(err, row) {
            if(err) throw err;
            if(!row[0]) return res.redirect('/admin');
            let nowClosed = 0;
            if(!row[0].closed) nowClosed = 1
            con.query(`UPDATE applications SET closed=${nowClosed} WHERE id="${req.params.uid}"`, function(err, row) {
                if(err) throw err;
                res.redirect('/admin')
            });
        });
        backend.sendToWebhook(`An applications closed status has been toggled!`);
    });
});

app.get('/backend/delete/faq/:uid', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.params)) {
        req.params[item] = await utils.sanitize(req.params[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`DELETE FROM faq WHERE id="${req.params.uid}"`, function(err, row) {
            if(err) throw err;
            res.redirect('/admin')
        });
        backend.sendToWebhook(`An FAQ item has been deleted!`);
    });
});

app.get('/backend/delete/bannedusers/:uid', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.params)) {
        req.params[item] = await utils.sanitize(req.params[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`DELETE FROM bannedusers WHERE userid="${req.params.uid}"`, function(err, row) {
            if(err) throw err;
            res.redirect('/admin')
        });
        backend.sendToWebhook(`${req.params.uid} has been unbanned!`);
    });
});

app.post('/backend/application/submit/:appid', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.params)) {
        req.params[item] = await utils.sanitize(req.params[item]);
    };
    for(let item of Object.keys(req.body)) {
        req.body[item] = await utils.sanitize(req.body[item]);
    };
    let responsesArray = [];
    for(let item of Object.keys(req.body)) {
        let qid = item.split('_')[1];
        con.query(`SELECT * FROM appquestions WHERE appid="${req.params.appid}" AND id="${qid}"`, function(err, row) {
            if(err) throw err;
            responsesArray.push({
                question: row[0].content,
                answer: req.body[item]
            });
        });
    };
    res.redirect('/appsubmitted');
    setTimeout(async function() {
        responsesArray = await JSON.stringify(responsesArray).replaceAll('`', '').replaceAll("'", "");
        con.query(`INSERT INTO appresponses (id, appid, user, responses, status) VALUES ('${Date.now()}', '${req.params.appid}', '${req.user.id}', '${responsesArray}', "OPEN")`, function(err, row) {
            if(err) throw err;
        });
    }, 7000);
    backend.sendToWebhook('A user has submitted an application!');
});

app.post('/backend/create/feedback', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.body)) {
        req.body[item] = await utils.sanitize(req.body[item]);
    };
    con.query(`INSERT INTO feedback (id, email, content) VALUES ("${Date.now()}", "${req.user.email}", "${req.body.content}")`, function(err, row) {
        if(err) throw err;
        res.render('custompage.ejs', { loggedIn: req.isAuthenticated(), page: { id: 'feedbackSuccess', title: 'Feedback Submitted!', link: 'submitted', content: 'Your feedback request was successfully submitted!' } });
    });
    backend.sendToWebhook('A user has submitted feedback!');
});

app.post('/backend/create/prompt', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.body)) {
        req.body[item] = await utils.sanitize(req.body[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`INSERT INTO prompts (id, content) VALUES ("${Date.now()}", "${req.body.content}")`, function(err, row) {
            if(err) throw err;
            res.redirect('/admin')
        });
        backend.sendToWebhook('New prompt created in the admin panel!');
    });
});

app.post('/backend/update/application/status/:uid', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.body)) {
        req.body[item] = await utils.sanitize(req.body[item]);
    };
    for(let item of Object.keys(req.params)) {
        req.params[item] = await utils.sanitize(req.params[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`UPDATE appresponses SET status="${req.body.status}" WHERE id="${req.params.uid}"`, function(err, row) {
            if(err) throw err;
            res.redirect(`/view/application/${req.params.uid}`);
        });
        backend.sendToWebhook(`\`${req.params.uid}\`'s application status has been updated!`);
    });
});

app.post('/backend/create/banneduser', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.body)) {
        req.body[item] = await utils.sanitize(req.body[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`INSERT INTO bannedusers (userid) VALUES ("${req.body.userid}")`, function(err, row) {
            if(err) throw err;
            res.redirect('/admin')
        });
        backend.sendToWebhook(`${req.body.userid} has been banned!`);
    });
});

app.post('/backend/create/application', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.body)) {
        req.body[item] = await utils.sanitize(req.body[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`INSERT INTO applications (id, name, closed) VALUES ("${Date.now()}", "${req.body.name}", false)`, function(err, row) {
            if(err) throw err;
            res.redirect('/admin')
        });
        backend.sendToWebhook(`A new application has been created!`);
    });
});

app.post('/backend/create/appquestion/:uid/:type', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.body)) {
        req.body[item] = await utils.sanitize(req.body[item]);
    };
    for(let item of Object.keys(req.params)) {
        req.params[item] = await utils.sanitize(req.params[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`INSERT INTO appquestions (id, appid, content, type, dropdownitems) VALUES ("${Date.now()}", "${req.params.uid}", "${req.body.question}", ${Number(req.params.type)}, "${req.body.dropdownitems}")`, function(err, row) {
            if(err) throw err;
            res.redirect(`/edit/application/${req.params.uid}`);
        });
        backend.sendToWebhook(`A new application question has been created!`);
    });
});

app.post('/backend/create/staff', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.body)) {
        req.body[item] = await utils.sanitize(req.body[item]);
    };
    if(!config.ownerIds.includes(req.user.id)) return res.redirect('/admin');
    con.query(`INSERT INTO staff (userid) VALUES ("${req.body.userid}")`, function(err, row) {
        if(err) throw err;
        res.redirect('/admin')
        backend.sendToWebhook(`${req.body.userid} was added as staff.`);
    });
});

app.get('/backend/delete/staff/:uid', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.params)) {
        req.params[item] = await utils.sanitize(req.params[item]);
    };
    if(!config.ownerIds.includes(req.user.id)) return res.redirect('/admin');
    con.query(`DELETE FROM staff WHERE userid="${req.params.uid}"`, function(err, row) {
        if(err) throw err;
        res.redirect('/admin')
        backend.sendToWebhook(`${req.params.uid} was removed from staff!`);
    });
});

app.post('/backend/create/faq', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.body)) {
        req.body[item] = await utils.sanitize(req.body[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`INSERT INTO faq (id, question, answer) VALUES ("${Date.now()}", "${req.body.question}", "${req.body.answer}")`, function(err, row) {
            if(err) throw err;
            res.redirect('/admin')
        });
        backend.sendToWebhook(`New FAQ item was created in the admin panel!`);
    });
});

app.post('/backend/create/custompage', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.body)) {
        req.body[item] = await utils.sanitize(req.body[item], true);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`INSERT INTO custompages (id, link, title, content) VALUES ("${Date.now()}", "${req.body.link}", "${req.body.title}", "${req.body.content}")`, function(err, row) {
            if(err) throw err;
            res.redirect('/admin')
        });
        backend.sendToWebhook(`New custom page has been created!`);
    });
});

app.post('/backend/create/gallery', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.body)) {
        req.body[item] = await utils.sanitize(req.body[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        let uid = Date.now()
        req.files.forEach(function(file) {
            fs.writeFileSync(`./public/images/gallery_${uid}.png`, file.buffer);
        });
        con.query(`INSERT INTO gallery (id) VALUES ("${uid}")`, function(err, row) {
            if(err) throw err;
            res.redirect('/admin')
        });
        backend.sendToWebhook(`New gallery image was created!`);
    });
});

app.post('/backend/create/team', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.body)) {
        req.body[item] = await utils.sanitize(req.body[item]);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        let uid = Date.now()
        req.files.forEach(function(file) {
            fs.writeFileSync(`./public/images/team_${uid}.png`, file.buffer);
        });
        let isowner = 0;
        if(req.body.isowner == 'yes') isowner = 1;
        con.query(`INSERT INTO team (id, name, about, title, isowner) VALUES ("${uid}", "${req.body.name}", "${req.body.about}", "${req.body.title}", ${isowner})`, function(err, row) {
            if(err) throw err;
            res.redirect('/admin')
        });
        backend.sendToWebhook(`New team member was created!`);
    });
});

app.post('/backend/update/settings', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    for(let item of Object.keys(req.body)) {
        req.body[item] = await utils.sanitize(req.body[item], true);
    };
    con.query(`SELECT * FROM staff WHERE userid="${req.user.id}"`, function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/404');
        con.query(`UPDATE sitesettings SET sitename="${req.body.sitename}", sitedesc="${req.body.sitedesc}", sitecolor="${req.body.sitecolor}", navbarcolor="${req.body.navbarcolor}", backgroundcolor="${req.body.backgroundcolor}", discordcolor="${req.body.discordcolor}", fivemcolor="${req.body.fivemcolor}", rules="${req.body.rules}", about="${req.body.about}", fivemserverip="${req.body.fivemserverip}", webhook="${req.body.webhook}"`, async function(err, row) {
            if(err) throw err;
            if(typeof req.files != 'undefined' && req.files[0]) {
                await req.files.forEach(function(file) {
                    if(file.fieldname == 'logo') {
                        fs.writeFileSync(`./public/assets/logo.png`, file.buffer);
                    } else if(file.fieldname == 'header') {
                        fs.writeFileSync(`./public/assets/header.jpg`, file.buffer);
                    };
                });
            };
            res.redirect('/admin')
        });
        backend.sendToWebhook(`Site settings have been updated!`);
    });
});

app.post('/register', backend.checkNotAuth, async (req, res) => {
    await backend.resetAppLocals(app);
    for(let name of Object.keys(req.body)) {
        req.body[name] = await utils.sanitize(req.body[name]);
    };
    try {
        let userid = await backend.generateUserId(7);
        let hashedPassword = await bcrypt.hash(req.body.password, 13);
        con.query(`SELECT * FROM users WHERE email="${req.body.email}"`, async function (err, row) {
            if(err) throw err;
            if(!row[0]) {
                con.query(`SELECT * FROM sitesettings`, async function(err, row) {
                    if(err) throw err;
                    if(!row[0]) return console.log('No site settings found.');
                    con.query(`INSERT INTO users (id, username, email, password) VALUES ("${userid}", "${req.body.username}", "${req.body.email}", "${hashedPassword}")`, async function (err, row) {
                        if(err) throw err;
                    });
                    res.redirect('/login');
                    backend.sendToWebhook(`A new account has been created!`);
                });
            } else {
                res.redirect('/login')
            };
        });
    } catch {
        res.redirect('/register')
    };
});

app.post('/backend/update/password', backend.checkAuth, async function(req, res) {
    await backend.resetAppLocals(app);
    if(req.body.password !== req.body.confpassword) return res.send('Your passwords do not match...');
    let hashedPassword = await bcrypt.hash(req.body.confpassword, 13);
    con.query(`SELECT * FROM users WHERE id="${req.user.id}"`, async function(err, row) {
        if(err) throw err;
        con.query(`UPDATE users SET password="${hashedPassword}" WHERE id="${req.user.id}"`, function(err, row) { if(err) throw err; });
        req.logout(function(err) {
            if(err) { return next(err); }
        });
        res.redirect('/login');
        backend.sendToWebhook(`${req.user.id} has changed their password!`);
    });
});

app.post('/auth/local', backend.checkNotAuth, passport.authenticate('local', {
    successRedirect: '/account',
    failureRedirect: '/login',
    failureFlash: true
}));

config.ownerIds.forEach(function(item) {
    if(item != 'YOUR_USER_ID') {
        con.query(`SELECT * FROM staff WHERE userid="${item}"`, function(err, row) {
            if(err) throw err;
            if(row[0]) return;
            con.query(`INSERT INTO staff (userid) VALUES ("${item}")`, function(err, row) {
                if(err) throw err;
            });
            backend.sendToWebhook(`${item} was added as staff as they are listed as an owner in the config file!`);
        });
    };
});

// MAKE SURE THIS IS LAST FOR 404 PAGE REDIRECT
app.get('*', function(req, res){
    res.render('404.ejs', { loggedIn: req.isAuthenticated() });
});

// Server Initialization
app.listen(config.port)

// Rejection Handler
process.on('unhandledRejection', (err) => { 
    if(config.debugMode) console.log(chalk.red(err));
});
