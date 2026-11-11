/**
 * app.js - Application bootstrap, initialization, and global event listeners
 */

window.addEventListener('DOMContentLoaded', () => {
    fetchSpreadsheetData();
    
    // Close modal when pressing ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Close modal when clicking on backdrop
    const modalEl = document.getElementById('dataset-modal');
    if (modalEl) {
        modalEl.addEventListener('click', (e) => {
            if (e.target.id === 'dataset-modal') closeModal();
        });
    }
});
