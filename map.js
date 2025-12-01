// Initialize and add the map
function initMap() {
    // The location to center the map on
    const location = { lat: 20, lng: 0 };
    // The map, centered at the specified location
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 3, // Zoom level (higher is closer)
        center: location,
    });

    // Add recenter button handler
    setTimeout(() => {
        const btn = document.getElementById('recenter-btn');
        if (btn) {
            btn.onclick = () => {
                map.setCenter(location);
                map.setZoom(3);
            };
        }
    }, 500);

    // Load the GeoJSON file
    fetch('archaeology_sites_full.geojson')
        .then(response => response.json())
        .then(data => {
            // Store all markers and features for search
            const markers = [];
            const features = data.features;

            // Helper for continent color
            function getContinent(lat, lng) {
                if (lat >= -60 && lat <= 90 && lng >= -170 && lng <= -30) return 'Americas';
                if (lat >= -35 && lat <= 37 && lng >= -20 && lng <= 55) return 'Africa';
                if (lat >= 35 && lat <= 80 && lng >= -25 && lng <= 60) return 'Europe';
                if (lat >= 5 && lat <= 55 && lng >= 60 && lng <= 150) return 'Asia';
                if (lat >= -50 && lat <= 0 && lng >= 110 && lng <= 180) return 'Oceania';
                if (lat < -60) return 'Antarctica';
                return 'Other';
            }
            const continentColors = {
                'Americas': '#67a86aff',
                'Africa': '#759194',
                'Europe': '#f0ded3',
                'Asia': '#DE9C73',
                'Oceania': '#e6ffff',
                'Antarctica': '#f0f8ff',
                'Other': '#f5f5f5'
            };

            features.forEach(feature => {
                const coords = feature.geometry.coordinates;
                const properties = feature.properties;
                const lat = coords[1];
                const lng = coords[0];
                const continent = getContinent(lat, lng);
                const bgColor = continentColors[continent] || '#f5f5f5';
                // Marker icon
                const markerIcon = {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: bgColor,
                    fillOpacity: 1,
                    strokeWeight: 1,
                    strokeColor: '#333'
                };
                const marker = new google.maps.Marker({
                    position: { lat, lng },
                    map: map,
                    title: properties.name,
                    icon: markerIcon
                });
                // InfoWindow
                let arkeyoLinkHtml = '';
                if (properties.arkeyo_link) {
                  arkeyoLinkHtml = `<div style=\"margin-top:8px;\"><a href=\"${properties.arkeyo_link}\" target=\"_blank\" rel=\"noopener\" style=\"color:#047857;font-weight:600;text-decoration:underline;\">Learn more on Arkeyo</a></div>`;
                }
                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div style="padding: 10px 12px; border-radius: 10px; background: ${bgColor}; box-shadow: 0 2px 12px rgba(0,0,0,0.12); font-family: 'Poppins', 'Geist', Arial, sans-serif; min-width: 220px; max-width: 320px; position: relative;">
                            <a href="https://www.google.com/search?q=${encodeURIComponent(properties.name)}" target="_blank" rel="noopener" style="text-decoration:none;">
                                <h2 style="margin: 0 0 8px 0; font-size: 1.35em; font-weight: 700; color: #1a3c6e; line-height: 1.2;">${properties.name}</h2>
                            </a>
                            <div style="margin-bottom: 6px; font-size: 0.98em; color: white;">
                                <span style="font-weight: 600;">Category:</span> ${properties.category}
                            </div>
                            <div style="font-size: 0.98em; color: white;">${properties.description}</div>
                            <div style="margin-top: 8px; font-size: 0.9em; color: black; font-style: italic;">${continent}</div>
                            ${arkeyoLinkHtml}
                        </div>
                    `
                });
                marker.addListener('click', () => {
                    infoWindow.open(map, marker);
                });
                markers.push({ marker, feature });
            });

            // Search bar logic
            const searchBar = document.getElementById('search-bar');
            const searchResults = document.getElementById('search-results');
            let lastResults = [];

            // Store reference to last highlighted marker
            let lastHighlightedMarker = null;
            function showResults(results) {
                if (!searchResults) return;
                searchResults.innerHTML = '';
                if (results.length === 0 || !searchBar.value.trim()) {
                    searchResults.classList.add('hidden');
                    return;
                }
                results.forEach(({ marker, feature }, idx) => {
                    const li = document.createElement('li');
                    li.className = 'px-4 py-2 cursor-pointer hover:bg-emerald-100 text-gray-900';
                    li.textContent = feature.properties.name;
                    li.onclick = () => {
                        const coords = feature.geometry.coordinates;
                        map.setCenter({ lat: coords[1], lng: coords[0] });
                        map.setZoom(7);
                        searchResults.classList.add('hidden');
                        searchBar.value = feature.properties.name;

                        // Highlight marker with dark pastel color
                        if (lastHighlightedMarker) {
                            // Restore previous marker color
                            const prevFeature = lastHighlightedMarker.feature;
                            const prevCoords = prevFeature.geometry.coordinates;
                            const prevLat = prevCoords[1];
                            const prevLng = prevCoords[0];
                            const prevContinent = getContinent(prevLat, prevLng);
                            const prevBgColor = continentColors[prevContinent] || '#f5f5f5';
                            lastHighlightedMarker.marker.setIcon({
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 8,
                                fillColor: prevBgColor,
                                fillOpacity: 1,
                                strokeWeight: 1,
                                strokeColor: '#333'
                            });
                        }
                        // Set new marker color
                        marker.setIcon({
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 10,
                            fillColor: '#2d3748', // dark pastel (gray-800)
                            fillOpacity: 1,
                            strokeWeight: 2,
                            strokeColor: '#60a5fa' // pastel blue border
                        });
                        lastHighlightedMarker = { marker, feature };
                    };
                    searchResults.appendChild(li);
                });
                searchResults.classList.remove('hidden');
            }

            if (searchBar) {
                searchBar.addEventListener('input', (e) => {
                    const val = e.target.value.trim().toLowerCase();
                    if (!val) {
                        showResults([]);
                        return;
                    }
                    const results = markers.filter(({ feature }) =>
                        feature.properties.name.toLowerCase().includes(val)
                    );
                    lastResults = results;
                    showResults(results);
                });
                document.addEventListener('click', (e) => {
                    if (!searchResults.contains(e.target) && e.target !== searchBar) {
                        searchResults.classList.add('hidden');
                    }
                });
            }
        })
        .catch(error => console.error('Error loading GeoJSON:', error));
}
