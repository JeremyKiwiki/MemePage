const express = require('express');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public'))); //sert les fichiers statik
app.use(bodyParser.json());

const db = new sqlite3.Database('./database.db');

db.serialize(() => {
db.run(`CREATE TABLE IF NOT EXISTS memes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    likes INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0
)`); //cree la table des memes si elle existe pas

db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meme_id INTEGER,
    text TEXT,
    FOREIGN KEY(meme_id) REFERENCES memes(id)
)`); //cree la table des comments si elle existe pas

//ajoute des memes dans la bdd si elle est vide
const memeFolder = path.join(__dirname, 'public', 'memes');
fs.readdir(memeFolder, (err, files) => {
    if (err) {
        console.error('erreur de lecture du dossier memes', err);
        return;
    }
    files.forEach(file => {
        db.run(`INSERT OR IGNORE INTO memes (filename) VALUES (?)`, [file]);
    });
});
});

//endpoint pour obtenir un mème aléatoire
app.get('/meme', (req, res) => {
db.get('SELECT * FROM memes ORDER BY RANDOM() LIMIT 1', (err, row) => {
    if (err) {
        return res.status(500).send('erreur de récupération du meme');
    }
    db.run('UPDATE memes SET views = views + 1 WHERE id = ?', [row.id], (err) => {
        if (err) {
            return res.status(500).send('erreur de mise à jour des vues');
        }
        res.json(row);
    });
});
});

//endpoint pour ajouter un like à un mème
app.post('/like/:id', (req, res) => {
const memeId = req.params.id;
db.run('UPDATE memes SET likes = likes + 1 WHERE id = ?', [memeId], (err) => {
    if (err) {
        return res.status(500).send('erreur de mise à jour des likes');
    }
    res.sendStatus(200);
});
});

//endpoint pour obtenir les commentaires d'un mème
app.get('/comments/:id', (req, res) => {
const memeId = req.params.id;
db.all('SELECT * FROM comments WHERE meme_id = ?', [memeId], (err, rows) => {
    if (err) {
        return res.status(500).send('erreur de récupération des commentaires');
    }
    res.json(rows);
});
});

//endpoint pour ajouter un commentaire à un mème
app.post('/comment', (req, res) => {
const { memeId, text } = req.body;
db.run('INSERT INTO comments (meme_id, text) VALUES (?, ?)', [memeId, text], (err) => {
    if (err) {
        return res.status(500).send('erreur d\'ajout de commentaire');
    }
    res.sendStatus(200);
});
});

//démarrer le serveur
app.listen(PORT, () => {
console.log(`server is running on http://localhost:${PORT}`);
});
