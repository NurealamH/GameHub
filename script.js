const compass = document.querySelector('.compass');
const qiblaDirection = document.getElementById('qibla-direction');

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

function showPosition(position) {
    const userLat = position.coords.latitude;
    const userLon = position.coords.longitude;
    const qiblaLat = 21.4225;
    const qiblaLon = 39.8262;

    const qiblaAngle = getQiblaAngle(userLat, userLon, qiblaLat, qiblaLon);

    qiblaDirection.textContent = qiblaAngle.toFixed(2);
    compass.style.transform = `rotate(${qiblaAngle}deg)`;

    // Device orientation for interactive compass
    window.addEventListener('deviceorientation', handleOrientation);
}

function getQiblaAngle(lat1, lon1, lat2, lon2) {
    const toRadians = (deg) => deg * Math.PI / 180;
    const toDegrees = (rad) => rad * 180 / Math.PI;

    const latRad1 = toRadians(lat1);
    const lonRad1 = toRadians(lon1);
    const latRad2 = toRadians(lat2);
    const lonRad2 = toRadians(lon2);

    const y = Math.sin(lonRad2 - lonRad1) * Math.cos(latRad2);
    const x = Math.cos(latRad1) * Math.sin(latRad2) - Math.sin(latRad1) * Math.cos(latRad2) * Math.cos(lonRad2 - lonRad1);
    let brng = Math.atan2(y, x);
    brng = toDegrees(brng);
    return (brng + 360) % 360;
}

function handleOrientation(event) {
    const alpha = event.alpha; // Compass direction
    if (alpha !== null) {
        const qiblaAngle = parseFloat(qiblaDirection.textContent);
        const finalRotation = qiblaAngle - alpha;
        compass.style.transform = `rotate(${finalRotation}deg)`;
    }
}


function showError(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            alert("User denied the request for Geolocation.");
            break;
        case error.POSITION_UNAVAILABLE:
            alert("Location information is unavailable.");
            break;
        case error.TIMEOUT:
            alert("The request to get user location timed out.");
            break;
        case error.UNKNOWN_ERROR:
            alert("An unknown error occurred.");
            break;
    }
}

getLocation();
