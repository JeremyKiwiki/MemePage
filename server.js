const express = require('express');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const multer = require('multer'); // pour gérer les fichiers uploadés
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public'))); // sert les fichiers statiques
app.use(bodyParser.json());

const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS memes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT,
        pseudo TEXT DEFAULT 'Anonyme',
        likes INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0
    )`); // crée la table des memes si elle n'existe pas

    db.run(`CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meme_id INTEGER,
        text TEXT,
        pseudo TEXT DEFAULT 'Anonyme',
        parent_id INTEGER,
        FOREIGN KEY(meme_id) REFERENCES memes(id),
        FOREIGN KEY(parent_id) REFERENCES comments(id)
    )`); // crée la table des comments si elle n'existe pas

    db.run(`CREATE TABLE IF NOT EXISTS proposals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pseudo TEXT DEFAULT 'Anonyme',
        filename TEXT,
        accepted INTEGER DEFAULT 0
    )`); // crée la table des propositions si elle n'existe pas

    // ajoute des memes dans la bdd si elle est vide
    const memeFolder = path.join(__dirname, 'public', 'memes');
    fs.readdir(memeFolder, (err, files) => {
        if (err) {
            console.error('Erreur de lecture du dossier memes', err);
            return;
        }
        files.forEach(file => {
            db.run(`INSERT OR IGNORE INTO memes (filename) VALUES (?)`, [file]);
        });
    });
});

// Configuration de multer pour gérer les uploads de fichiers
const upload = multer({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|mp4/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Erreur : seuls les fichiers des types suivants sont supportés - ' + filetypes);
        }
    }
});

// Endpoint pour obtenir un mème aléatoire
app.get('/meme', (req, res) => {
    db.get('SELECT * FROM memes ORDER BY RANDOM() LIMIT 1', (err, row) => {
        if (err) {
            return res.status(500).send('Erreur de récupération du meme');
        }
        db.run('UPDATE memes SET views = views + 1 WHERE id = ?', [row.id], (err) => {
            if (err) {
                return res.status(500).send('Erreur de mise à jour des vues');
            }
            res.json(row);
        });
    });
});

// Endpoint pour ajouter un like à un mème
app.post('/like/:id', (req, res) => {
    const memeId = req.params.id;
    db.run('UPDATE memes SET likes = likes + 1 WHERE id = ?', [memeId], (err) => {
        if (err) {
            return res.status(500).send('Erreur de mise à jour des likes');
        }
        res.sendStatus(200);
    });
});

// Endpoint pour obtenir les commentaires d'un mème
app.get('/comments/:id', (req, res) => {
    const memeId = req.params.id;
    db.all('SELECT * FROM comments WHERE meme_id = ? AND parent_id IS NULL', [memeId], (err, rows) => {
        if (err) {
            return res.status(500).send('Erreur de récupération des commentaires');
        }
        const comments = rows.map(row => {
            return new Promise((resolve, reject) => {
                db.all('SELECT * FROM comments WHERE parent_id = ?', [row.id], (err, replies) => {
                    if (err) {
                        reject(err);
                    }
                    row.replies = replies;
                    resolve(row);
                });
            });
        });
        Promise.all(comments).then(results => {
            res.json(results);
        }).catch(err => {
            res.status(500).send('Erreur de récupération des réponses');
        });
    });
});

// Endpoint pour ajouter un commentaire à un mème
app.post('/comment', (req, res) => {
    const { memeId, text, pseudo, parentId } = req.body;
    if (typeof text !== 'string' || text.includes("'") || text.includes('"') || text.includes(';')) {
        return res.status(400).send('Commentaire invalide');
    }
    db.run('INSERT INTO comments (meme_id, text, pseudo, parent_id) VALUES (?, ?, ?, ?)', [memeId, text, pseudo || 'Anonyme', parentId], (err) => {
        if (err) {
            return res.status(500).send('Erreur d\'ajout de commentaire');
        }
        res.sendStatus(200);
    });
});

// Endpoint pour proposer un mème
app.post('/propose', upload.single('meme'), (req, res) => {
    const pseudo = req.body.pseudo || 'Anonyme';
    const file = req.file;
    if (!file) {
        return res.status(400).send('Fichier manquant');
    }
    db.run('INSERT INTO proposals (pseudo, filename) VALUES (?, ?)', [pseudo, file.filename], (err) => {
        if (err) {
            return res.status(500).send('Erreur de proposition de mème');
        }
        res.sendStatus(200);
    });
});

// Endpoint pour l'admin pour gérer les propositions de mèmes
app.get('/admin/proposals', (req, res) => {
    const password = req.headers['admin-password'];
    if (password !== 'adminpassword') {
        return res.status(403).send('Accès interdit');
    }
    db.all('SELECT * FROM proposals WHERE accepted = 0', (err, rows) => {
        if (err) {
            return res.status(500).send('Erreur de récupération des propositions');
        }
        res.json(rows);
    });
});

// Endpoint pour accepter une proposition
app.post('/admin/proposals/accept/:id', (req, res) => {
    const password = req.headers['admin-password'];
    if (password !== 'adminpassword') {
        return res.status(403).send('Accès interdit');
    }
    const proposalId = req.params.id;
    db.get('SELECT * FROM proposals WHERE id = ?', [proposalId], (err, row) => {
        if (err) {
            return res.status(500).send('Erreur de récupération de la proposition');
        }
        if (!row) {
            return res.status(404).send('Proposition non trouvée');
        }
        const acceptedPath = path.join(__dirname, 'public', 'memes', row.filename);
        fs.rename(path.join(__dirname, 'uploads', row.filename), acceptedPath, (err) => {
            if (err) {
                return res.status(500).send('Erreur lors de l\'acceptation de la proposition');
            }
            db.run('UPDATE proposals SET accepted = 1 WHERE id = ?', [proposalId], (err) => {
                if (err) {
                    return res.status(500).send('Erreur de mise à jour de la proposition');
                }
                db.run('INSERT INTO memes (filename, pseudo) VALUES (?, ?)', [row.filename, row.pseudo], (err) => {
                    if (err) {
                        return res.status(500).send('Erreur d\'ajout du mème');
                    }
                    res.sendStatus(200);
                });
            });
        });
    });
});

// Endpoint pour refuser une proposition
app.post('/admin/proposals/reject/:id', (req, res) => {
    const password = req.headers['admin-password'];
    if (password !== 'adminpassword') {
        return res.status(403).send('Accès interdit');
    }
    const proposalId = req.params.id;
    db.get('SELECT * FROM proposals WHERE id = ?', [proposalId], (err, row) => {
        if (err) {
            return res.status(500).send('Erreur de récupération de la proposition');
        }
        if (!row) {
            return res.status(404).send('Proposition non trouvée');
        }
        fs.unlink(path.join(__dirname, 'uploads', row.filename), (err) => {
            if (err) {
                return res.status(500).send('Erreur lors du refus de la proposition');
            }
            db.run('DELETE FROM proposals WHERE id = ?', [proposalId], (err) => {
                if (err) {
                    return res.status(500).send('Erreur de suppression de la proposition');
                }
                res.sendStatus(200);
            });
        });
    });
});

// Endpoint pour servir la page d'administration
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Le serveur fonctionne sur http://localhost:${PORT}`);
});
