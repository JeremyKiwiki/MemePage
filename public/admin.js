document.addEventListener('DOMContentLoaded', function () {
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminPasswordInput = document.getElementById('admin-password');
    const adminContent = document.getElementById('admin-content');
    const proposalsList = document.getElementById('proposals-list');

    adminLoginForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const adminPassword = adminPasswordInput.value;

        fetch('/admin/proposals', {
            method: 'GET',
            headers: {
                'admin-password': adminPassword
            }
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                alert('Mot de passe incorrect');
                throw new Error('Mot de passe incorrect');
            }
        })
        .then(proposals => {
            adminContent.style.display = 'block';
            adminLoginForm.style.display = 'none';
            proposalsList.innerHTML = '';
            proposals.forEach(proposal => {
                const proposalItem = document.createElement('li');
                proposalItem.innerHTML = `Pseudo: ${proposal.pseudo}, Fichier: ${proposal.filename}`;
                
                const previewButton = document.createElement('button');
                previewButton.textContent = 'Aperçu';
                previewButton.addEventListener('click', () => {
                    const filePath = `uploads/${proposal.filename}`;
                    let filePreview;
                    if (filePath.endsWith('.jpg') || filePath.endsWith('.gif') || filePath.endsWith('.png')) {
                        filePreview = `<img src="${filePath}" alt="preview" style="max-width: 200px;">`;
                    } else if (filePath.endsWith('.mp4')) {
                        filePreview = `<video src="${filePath}" controls style="max-width: 200px;"></video>`;
                    }
                    proposalItem.innerHTML += `<div>${filePreview}</div>`;
                });
                proposalItem.appendChild(previewButton);

                const acceptButton = document.createElement('button');
                acceptButton.textContent = 'Accepter';
                acceptButton.addEventListener('click', () => manageProposal(proposal.id, 'accept', adminPassword));
                const rejectButton = document.createElement('button');
                rejectButton.textContent = 'Rejeter';
                rejectButton.addEventListener('click', () => manageProposal(proposal.id, 'reject', adminPassword));
                proposalItem.appendChild(acceptButton);
                proposalItem.appendChild(rejectButton);
                proposalsList.appendChild(proposalItem);
            });
        })
        .catch(error => console.error('Erreur:', error));
    });

    function manageProposal(proposalId, action, password) {
        fetch(`/admin/proposals/${action}/${proposalId}`, {
            method: 'POST',
            headers: {
                'admin-password': password
            }
        })
        .then(response => {
            if (response.ok) {
                alert(`Proposition ${action === 'accept' ? 'acceptée' : 'rejetée'}`);
                location.reload();
            } else {
                alert('Erreur lors de la gestion de la proposition');
                throw new Error('Erreur lors de la gestion de la proposition');
            }
        })
        .catch(error => console.error('Erreur:', error));
    }
});
