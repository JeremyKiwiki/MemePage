document.addEventListener('DOMContentLoaded', function () {
    const memeContainer = document.getElementById('meme-container');
    const likeButton = document.getElementById('like-button');
    const likeCount = document.getElementById('like-count');
    const commentButton = document.getElementById('submit-comment');
    const commentsList = document.getElementById('comments-list');
    const proposeButton = document.getElementById('propose-button');
    const proposeForm = document.getElementById('propose-form');
    const memeAuthor = document.getElementById('meme-author');
    let autoChange = false;
    let currentMemeId;

    proposeButton.addEventListener('click', () => {
        proposeForm.style.display = proposeForm.style.display === 'none' ? 'block' : 'none';
    });

    // Fonction pour charger un mème
    function loadMeme() {
        fetch('/meme')
            .then(response => response.json())
            .then(data => {
                currentMemeId = data.id;
                const randomMeme = `memes/${data.filename}`;
                memeContainer.innerHTML = '';
                memeAuthor.textContent = `Proposé par: ${data.pseudo || 'Anonyme'}`;
                likeCount.textContent = data.likes;

                if (randomMeme.endsWith('.jpg') || randomMeme.endsWith('.gif') || randomMeme.endsWith('.png')) {
                    const img = document.createElement('img');
                    img.src = randomMeme;
                    memeContainer.appendChild(img);
                    if (autoChange) {
                        setTimeout(loadMeme, 6000); // Change image after 6 seconds
                    }
                } else if (randomMeme.endsWith('.mp4')) {
                    const video = document.createElement('video');
                    video.src = randomMeme;
                    video.controls = true;
                    memeContainer.appendChild(video);
                    if (autoChange) {
                        video.onended = loadMeme; // Change video when it ends
                    }
                }
                loadComments();
            })
            .catch(error => {
                console.error('There has been a problem with your fetch operation:', error);
            });
    }

    // Fonction pour charger les commentaires
    function loadComments() {
        fetch(`/comments/${currentMemeId}`)
            .then(response => response.json())
            .then(comments => {
                commentsList.innerHTML = '';
                comments.forEach(comment => {
                    const commentDiv = document.createElement('div');
                    commentDiv.classList.add('comment');
                    commentDiv.innerHTML = `<strong>${comment.pseudo || 'Anonyme'}:</strong> ${comment.text}`;

                    const replyButton = document.createElement('button');
                    replyButton.textContent = 'Répondre';
                    replyButton.classList.add('reply');
                    replyButton.addEventListener('click', () => {
                        const replyForm = document.createElement('div');
                        replyForm.classList.add('comment-reply');
                        replyForm.innerHTML = `
                            <textarea placeholder="Répondre..."></textarea>
                            <input type="text" placeholder="Votre nom (optionnel)">
                            <button>Soumettre</button>
                        `;
                        replyButton.after(replyForm);

                        const submitReplyButton = replyForm.querySelector('button');
                        submitReplyButton.addEventListener('click', () => {
                            const replyText = replyForm.querySelector('textarea').value;
                            const replyPseudo = replyForm.querySelector('input[type="text"]').value || 'Anonyme';
                            if (replyText.trim()) {
                                fetch('/comment', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ memeId: currentMemeId, text: replyText, pseudo: replyPseudo, parentId: comment.id })
                                })
                                    .then(response => {
                                        if (response.ok) {
                                            loadComments();
                                        } else {
                                            console.error('Error adding reply');
                                        }
                                    });
                            }
                        });
                    });

                    commentDiv.appendChild(replyButton);
                    commentsList.appendChild(commentDiv);
                });
            })
            .catch(error => {
                console.error('There has been a problem with your fetch operation:', error);
            });
    }

    // Charger un mème initialement
    loadMeme();

    // Bouton "Like"
    likeButton.addEventListener('click', function () {
        fetch(`/like/${currentMemeId}`, { method: 'POST' })
            .then(response => {
                if (response.ok) {
                    loadMeme();
                } else {
                    console.error('Error liking meme');
                }
            });
    });

    // Soumettre un commentaire
    commentButton.addEventListener('click', function () {
        const commentText = document.getElementById('comment').value;
        const commentPseudo = document.getElementById('comment-pseudo').value || 'Anonyme';
        if (commentText.trim()) {
            fetch('/comment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ memeId: currentMemeId, text: commentText, pseudo: commentPseudo })
            })
                .then(response => {
                    if (response.ok) {
                        loadComments();
                        document.getElementById('comment').value = '';
                        document.getElementById('comment-pseudo').value = '';
                    } else {
                        console.error('Error adding comment');
                    }
                });
        }
    });

    // Soumettre une proposition de mème
    proposeForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const formData = new FormData(proposeForm);
        fetch('/propose', {
            method: 'POST',
            body: formData
        })
            .then(response => {
                if (response.ok) {
                    alert('Proposition de mème envoyée !');
                    proposeForm.reset();
                } else {
                    console.error('Erreur lors de la proposition de mème');
                }
            });
    });
});
