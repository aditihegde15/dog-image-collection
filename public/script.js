

document.getElementById('userForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('username').value;
    try {
        const response = await fetch(`/loadCollection?username=${username}`);
        const data = await response.json();
        if (data.message) {
            document.getElementById('nextDog').click();
            alert('Images loaded successfully');
        }
        if (data.error) {
            document.getElementById('dogImage').src = '';
            alert(data.error);
        }
    } catch (error) {
        console.error('Error:', error);
    }
});

document.getElementById('fetchDog').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    if (!username) {
        alert('Please enter a username first');
        return;
    }

    const dogImageUrl = await fetchDogImageFromAPI(); 

    try {
        const response = await fetch('/submitDogImage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, imageUrl: dogImageUrl })
        });
        const data = await response.json();
        alert(data.message);
    } catch (error) {
        console.error('Error:', error);
    }
});

document.getElementById('nextDog').addEventListener('click', async () => {
    try {
        const response = await fetch('/cycle');
        const imageUrl = await response.text();
        document.getElementById('dogImage').src = imageUrl;
    } catch (error) {
        console.error('Error:', error);
    }
});

async function fetchDogImageFromAPI() {
    try {
        const response = await fetch('https://dog.ceo/api/breeds/image/random');
        const data = await response.json();
        return data.message;
    } catch (error) {
        console.error('Error:', error);
        return '';
    }
}