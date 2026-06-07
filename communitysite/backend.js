const config    = require('./config.json');
const passport  = require('passport');
const multer    = require('multer');
const bodyParser= require('body-parser');
const session   = require('express-session');
const express   = require('express');
const flash     = require('express-flash');
const chalk     = require('chalk');
const figlet    = require('figlet');
const utils     = require('hyperz-utils');
const pjson     = require('./package.json');
const axios     = require('axios');
const bcrypt    = require('bcrypt');
const Discord   = require('discord.js');

const client = new Discord.Client({
  intents: [
    'GUILDS', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'DIRECT_MESSAGES',
    'GUILD_MEMBERS', 'GUILD_BANS', 'GUILD_INTEGRATIONS', 'GUILD_WEBHOOKS',
    'GUILD_INVITES', 'GUILD_VOICE_STATES', 'GUILD_PRESENCES', 'GUILD_MESSAGE_TYPING',
    'DIRECT_MESSAGE_REACTIONS', 'DIRECT_MESSAGE_TYPING'
  ],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION', 'ROLE', 'GUILD_MEMBER', 'USER', 'GUILD_INVITES', 'MANAGE_GUILD'],
  allowedMentions: { parse: ['users', 'roles', 'everyone'], repliedUser: true }
});
client.login(config.discord.botToken);

let projectName = 'Community Site';
let storedAppVariable;
let dbcon;

const PRODUCT_ID = '1779591786918Q3MLHjfB59QeRM';

async function init(app, conn) {
  if (Number(process.version.slice(1).split('.')[0]) < 16) {
    throw new Error(
      'Node.js v16 or higher is required, Discord.JS relies on this version, please update @ https://nodejs.org'
    );
  }

  const storage = multer.memoryStorage();
  app.use(multer({ storage: storage }).any());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(flash());
  app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 31556952000 }   // ~1 year
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  app.set('views', './src/views');
  app.set('view engine', 'ejs');

  app.use(express.static('public'));
  app.use(express.static('src/static'));
  app.use('/assets',  express.static(__dirname + 'public/assets'));
  app.use('/images',  express.static(__dirname + 'public/images'));
  app.use('/static',  express.static(__dirname + 'src/static/assets'));

  dbcon = conn;

  figlet.text(projectName, { font: 'Standard', width: 700 }, (err, data) => {
    if (err) throw err;
    console.log(chalk.bold.blue(
      '' + data +
      '\n-------------------------------------------\n' +
      projectName + ' is up and running on port ' + config.port + '!'
    ));
  });

  licenseCheck(PRODUCT_ID, config.licenseKey);
  setInterval(() => licenseCheck(PRODUCT_ID, config.licenseKey), 43200000); // every 12h

  sqlLoop(conn);
  markSqlConnected();
  resetAppLocals(app);
}

console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');
console.log('billy_ftw made this <3');



async function resetAppLocals(app) {
  dbcon.query('SELECT * FROM sitesettings', async (err, sitesettings) => {
    if (err) throw err;

    sitesettings[0].aboutConverted = await utils.mdConvert(sitesettings[0].about);
    sitesettings[0].rulesConverted = await utils.mdConvert(sitesettings[0].rules);

    dbcon.query('SELECT * FROM prompts', (err2, prompts) => {
      if (err2) throw err2;

      const content = [];
      for (const row of prompts) {
        content.push(row.content);
      }

      app.locals = {
        config: config,
        packagejson: require('./package.json'),
        sitesettings: sitesettings[0],
        prompts: JSON.stringify(content)
      };

      storedAppVariable = app;
    });
  });
}

async function sqlLoop(conn) {
  if (conn == 0) return;
  await conn.ping();
  setTimeout(() => sqlLoop(conn), 60000 * 30);
}


async function markSqlConnected() {
  await dbcon.query('SELECT * FROM sitesettings', (err) => {
    if (err) {
      setTimeout(() => {
        console.log('' + chalk.yellow('[SQL Manager]') + ' MySQL connection failed...');
      }, 3400);
    } else {
      setTimeout(() => {
        console.log('' + chalk.yellow('[SQL Manager]') + ' MySQL successfully connected.');
      }, 3400);
    }
  });
}

async function checkAuth(req, res, next) {
  if (req.isAuthenticated()) {
    dbcon.query('SELECT * FROM bannedusers WHERE userid="' + req.user.id + '"', (err, banned) => {
      if (err) throw err;
      if (banned[0]) {
        return res.redirect('/banned');
      }

      dbcon.query('SELECT * FROM users WHERE id="' + req.user.id + '"', (err2, users) => {
        if (err2) throw err2;

        if (!users[0]) {
          // first login: create the account from the Discord profile
          dbcon.query(
            'INSERT INTO users (id, username, email, password) VALUES ("' +
              req.user.id + '", "' + req.user.username + '", "' + req.user.email + '", "discord")',
            (err3) => {
              if (err3) throw err3;
              next();
              sendToWebhook('A new account has been created! ```billy_ftw and WhoYouRe with love <3```');
            }
          );
        } else {
          next();
        }
      });
    });
  } else {
    res.redirect('/login');
  }
}

async function checkNotAuth(req, res, next) {
  if (req.isAuthenticated()) {
    res.redirect('/account');
  } else {
    next();
  }
}

async function authenticateUserLocal(email, password, done) {
  dbcon.query(
    'SELECT * FROM users WHERE email="' + (await utils.sanitize(email)) + '"',
    async (err, users) => {
      if (err) throw err;

      if (!users[0]) {
        return done(null, false, { message: 'No user with that email' });
      }

      try {
        if (await bcrypt.compare(password, users[0].password)) {
          return done(null, users[0]);
        } else {
          return done(null, false, { message: 'Password incorrect' });
        }
      } catch (e) {
        return done(e);
      }
    }
  );
}

function generateUserId(length) {
  let id = '';
  const chars = '0123456789';
  const now = Date.now();
  const len = chars.length;
  for (let i = 0; i < length; i++) {
    id = id + chars.charAt(Math.floor(Math.random() * len));
  }
  return now + id;
}

async function fetchMemberCount() {
  const guild = await client.guilds.cache.get(config.discord.guildId);
  if (typeof guild === 'undefined') return '0';
  return Number(guild?.members?.cache?.size || '0').toLocaleString();
}

async function sendToWebhook(content) {
  if (storedAppVariable.locals.sitesettings.webhook === 'none') return;

  const webhookClient = new Discord.WebhookClient({
    url: storedAppVariable.locals.sitesettings.webhook
  });

  const embed = new Discord.MessageEmbed()
    .setTitle('📋 Website Logging')
    .setDescription(content)
    .setThumbnail('' + config.domain + '/assets/logo.png')
    .setColor('' + storedAppVariable.locals.sitesettings.sitecolor)
    .setFooter({ text: 'Designed by ThatGuyHyperz' });

  await webhookClient.send({ embeds: [embed] }).catch(() => {});
}

module.exports = {
  init,
  checkAuth,
  checkNotAuth,
  authenticateUserLocal,
  generateUserId,
  resetAppLocals,
  fetchMemberCount,
  sendToWebhook
};
