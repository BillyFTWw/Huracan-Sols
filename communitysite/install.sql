CREATE DATABASE communitysite CHARACTER SET utf8;
use communitysite;

CREATE TABLE sitesettings (
    sitename TEXT,
    sitedesc TEXT,
    sitecolor TEXT,
    navbarcolor TEXT,
    backgroundcolor TEXT,
    discordcolor TEXT,
    fivemcolor TEXT,
    rules TEXT,
    about TEXT,
    fivemserverip TEXT,
    webhook TEXT
);

CREATE TABLE prompts (
    id TEXT,
    content TEXT
);

CREATE TABLE users (
    id TEXT,
    username TEXT,
    email TEXT,
    password TEXT
);

CREATE TABLE team (
    id TEXT,
    name TEXT,
    about TEXT,
    title TEXT,
    isowner boolean
);

CREATE TABLE gallery (
    id TEXT
);

CREATE TABLE feedback (
    id TEXT,
    email TEXT,
    content TEXT
);

CREATE TABLE custompages (
    id TEXT,
    link TEXT,
    title TEXT,
    content TEXT
);

CREATE TABLE faq (
    id TEXT,
    question TEXT,
    answer TEXT
);

CREATE TABLE applications (
    id TEXT,
    name TEXT,
    closed BOOLEAN
);

CREATE TABLE appquestions (
    id TEXT,
    appid TEXT,
    content TEXT,
    type INT,
    dropdownitems TEXT
);

CREATE TABLE appresponses (
    id TEXT,
    appid TEXT,
    user TEXT,
    responses TEXT,
    status TEXT
);

CREATE TABLE staff (
    userid TEXT
);

CREATE TABLE bannedusers (
    userid TEXT
);

ALTER DATABASE communitysite CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE sitesettings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE prompts CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE team CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE gallery CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE feedback CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE custompages CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE faq CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE applications CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE appquestions CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE appresponses CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE staff CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE bannedusers CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;

INSERT INTO sitesettings (sitename, sitedesc, sitecolor, navbarcolor, backgroundcolor, discordcolor, fivemcolor, rules, about, fivemserverip, webhook) VALUES ('My Community', 'A description placeholder...', '#036FFC', '#14171E', '#1A1D27', '#5865F2', '#F20550', 'Your community rules...', 'Your community description...', 'none', 'none');
INSERT INTO prompts (id, content) VALUES ('firstprompt', 'A realistic roleplay experience!');
INSERT INTO prompts (id, content) VALUES ('secondprompt', 'A friendly and active community!');
INSERT INTO prompts (id, content) VALUES ('thirdprompt', 'Custom vehicles, scripts, and more!');
INSERT INTO prompts (id, content) VALUES ('fourthprompt', 'A truely remarkable staff team!');
INSERT INTO faq (id, question, answer) VALUES ('firstfaq', 'Who made this website?', 'This website was coded by ThatGuyHyperz - https://github.com/itz-hyperz');
INSERT INTO staff (userid) VALUES ('704094587836301392');