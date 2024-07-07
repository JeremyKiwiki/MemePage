document.addEventListener('DOMContentLoaded', function () {
    const memeContainer = document.getElementById('meme-container');
    const likeButton = document.getElementById('like-button');
    const commentButton = document.getElementById('submit-comment');
    const commentsList = document.getElementById('comments-list');
    let autoChange = false;
    let currentMemeId;
    
    //fonction pour charger un mème
    function loadMeme() {
    fetch('/meme')
        .then(response => response.json())
        .then(data => {
            currentMemeId = data.id;
            const randomMeme = `memes/${data.filename}`;
            memeContainer.innerHTML = '';
            if (randomMeme.endsWith('.jpg') || randomMeme.endsWith('.gif') || randomMeme.endsWith('.png')) {
                const img = document.createElement('img');
                img.src = randomMeme;
                memeContainer.appendChild(img);
                if (autoChange) {
                    setTimeout(loadMeme, 6000); //change image après 6 secondes
                }
            } else if (randomMeme.endsWith('.mp4')) {
                const video = document.createElement('video');
                video.src = randomMeme;
                video.controls = true;
                memeContainer.appendChild(video);
                if (autoChange) {
                    video.onended = loadMeme; //change video quand elle se termine
                }
            }
            loadComments();
        })
        .catch(error => {
            console.error('y a un problème avec le fetch :', error);
        });
    }
    
    //fonction pour charger les commentaires
    function loadComments() {
    fetch(`/comments/${currentMemeId}`)
        .then(response => response.json())
        .then(comments => {
            commentsList.innerHTML = '';
            comments.forEach(comment => {
                const commentDiv = document.createElement('div');
                commentDiv.classList.add('comment');
                commentDiv.textContent = comment.text;
                commentsList.appendChild(commentDiv);
            });
        })
        .catch(error => {
            console.error('y a un problème avec le fetch des commentaires :', error);
        });
    }
    
    //charger un mème initialement
    loadMeme();
    
    //bouton "like"
    likeButton.addEventListener('click', function () {
    fetch(`/like/${currentMemeId}`, { method: 'POST' })
        .then(response => {
            if (response.ok) {
                alert('vous avez aimé ce mème !');
            } else {
                console.error('erreur lors du like');
            }
        });
    });
    
    //soumettre un commentaire
    commentButton.addEventListener('click', function () {
    const commentText = document.getElementById('comment').value;
    if (commentText.trim()) {
        fetch('/comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ memeId: currentMemeId, text: commentText })
        })
        .then(response => {
            if (response.ok) {
                loadComments();
                document.getElementById('comment').value = '';
            } else {
                console.error('erreur lors de l\'ajout du commentaire');
            }
        });
    }
    });
    
    //option pour changer automatiquement de mème
    const autoChangeCheckbox = document.createElement('input');
    autoChangeCheckbox.type = 'checkbox';
    autoChangeCheckbox.id = 'auto-change';
    const autoChangeLabel = document.createElement('label');
    autoChangeLabel.htmlFor = 'auto-change';
    autoChangeLabel.textContent = 'changer automatiquement de mème';
    memeContainer.parentElement.appendChild(autoChangeCheckbox);
    memeContainer.parentElement.appendChild(autoChangeLabel);
    
    autoChangeCheckbox.addEventListener('change', function () {
    autoChange = this.checked;
    if (autoChange) {
        loadMeme();
    }
    });
    });
    