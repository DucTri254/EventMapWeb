const axios = require('axios');

const geocodeAddress = async (address, regionName = null) => {
  try {
    const apiKey = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoibmluamFzY2hvb2wzNyIsImEiOiJjbWs5dWFsN28xdnBqM2VvdTF1dm15dzR2In0.LnfhFNg9JrGVOWdGWjE4KA';
    
    // If no API key or dummy key, return null
    if (!apiKey || apiKey.includes('DummyKey')) {
      console.warn('Mapbox access token not configured. Geocoding disabled.');
      return null;
    }

    // Extract address components
    const addressNumber = address.match(/^\d+/)?.[0];
    const addressLower = address.toLowerCase();
    
    // Build full address with region if provided
    let fullAddress = address.trim();
    if (regionName) {
      fullAddress = `${fullAddress}, ${regionName}, Vietnam`;
    } else {
      fullAddress = `${fullAddress}, Vietnam`;
    }

    // Strategy 1: Try to geocode as specific address with types=address
    // This prioritizes results with house numbers
    try {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json`,
        {
          params: {
            access_token: apiKey,
            country: 'VN',
            types: 'address', // Prioritize address results (with house numbers)
            limit: 10, // Get more results to find the best match
          },
        }
      );

      if (response.data && response.data.features && response.data.features.length > 0) {
        // Find the best match - prefer results with matching house number
        let bestMatch = null;
        let bestScore = 0;
        
        for (const feature of response.data.features) {
          if (feature.place_type && feature.place_type.includes('address')) {
            let score = 0;
            
            // Check if the address number matches exactly
            if (addressNumber) {
              const featureText = feature.text || feature.place_name || '';
              if (featureText.includes(addressNumber)) {
                score += 10; // High score for number match
              }
             
              // Check context (street name) match
              const streetName = address.match(/đường\s+([^,]+)|street\s+([^,]+)/i)?.[1] || address.match(/phố\s+([^,]+)/i)?.[1];
              if (streetName) {
                const cleanStreetName = streetName.trim().toLowerCase();
                if (featureText.toLowerCase().includes(cleanStreetName)) {
                  score += 5;
                }
              }
            }
            
            // Prefer results with higher relevance score
            if (feature.relevance) {
              score += feature.relevance * 2;
            }
            
            if (score > bestScore) {
              bestScore = score;
              bestMatch = feature;
            }
          }
        }

        if (bestMatch) {
          const [longitude, latitude] = bestMatch.center;
          console.log(`Geocoded address: ${address} -> ${bestMatch.place_name || bestMatch.text}`);
          return {
            latitude: latitude,
            longitude: longitude,
          };
        }
      }
    } catch (error) {
      console.warn('Address geocoding failed, trying fallback:', error.message);
    }

    // Strategy 2: Try geocoding with poi (point of interest) to find landmarks
    // This helps when address is near a known landmark
    try {
      // Extract potential landmarks (universities, schools, etc.)
      const landmarkKeywords = ['đại học', 'university', 'trường', 'school', 'bệnh viện', 'hospital'];
      const hasLandmark = landmarkKeywords.some(keyword => addressLower.includes(keyword));
      
      if (hasLandmark) {
        // First, find the landmark
        const landmarkResponse = await axios.get(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json`,
          {
            params: {
              access_token: apiKey,
              country: 'VN',
              types: 'poi', // Point of interest
              limit: 5,
            },
          }
        );

        if (landmarkResponse.data && landmarkResponse.data.features && landmarkResponse.data.features.length > 0) {
          // Use the landmark location as base
          const landmark = landmarkResponse.data.features[0];
          const [landmarkLng, landmarkLat] = landmark.center;
          
          // Now try to find the specific address near this landmark using proximity
          const addressResponse = await axios.get(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json`,
            {
              params: {
                access_token: apiKey,
                country: 'VN',
                types: 'address',
                proximity: `${landmarkLng},${landmarkLat}`, // Search near the landmark
                limit: 10,
              },
            }
          );

          if (addressResponse.data && addressResponse.data.features && addressResponse.data.features.length > 0) {
            // Find best match with number
            let bestMatch = null;
            let bestScore = 0;
            
            for (const feature of addressResponse.data.features) {
              if (feature.place_type && feature.place_type.includes('address')) {
                let score = 0;
                
                if (addressNumber && feature.text && feature.text.includes(addressNumber)) {
                  score += 10;
                }
                
                // Check distance from landmark (closer is better)
                const [featureLng, featureLat] = feature.center;
                const distance = Math.sqrt(
                  Math.pow(featureLng - landmarkLng, 2) + Math.pow(featureLat - landmarkLat, 2)
                );
                score += (1 / (distance + 0.0001)) * 5; // Closer = higher score
                
                if (feature.relevance) {
                  score += feature.relevance * 2;
                }
                
                if (score > bestScore) {
                  bestScore = score;
                  bestMatch = feature;
                }
              }
            }

            if (bestMatch) {
              const [longitude, latitude] = bestMatch.center;
              console.log(`Geocoded address with landmark: ${address} -> ${bestMatch.place_name || bestMatch.text}`);
              return {
                latitude: latitude,
                longitude: longitude,
              };
            }
            
            // If no address found, use landmark location as fallback
            console.log(`Using landmark location for: ${address} -> ${landmark.place_name || landmark.text}`);
            return {
              latitude: landmarkLat,
              longitude: landmarkLng,
            };
          }
        }
      }
    } catch (error) {
      console.warn('Landmark geocoding failed:', error.message);
    }

    // Strategy 3: Fallback - geocode without type restriction
    // This will find the street/area if specific address not found
    try {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json`,
        {
          params: {
            access_token: apiKey,
            country: 'VN',
            limit: 5,
          },
        }
      );

      if (response.data && response.data.features && response.data.features.length > 0) {
        // Prefer street results over region/city
        let bestMatch = response.data.features[0];
        for (const feature of response.data.features) {
          if (feature.place_type && 
              (feature.place_type.includes('street') || 
               feature.place_type.includes('address') ||
               feature.place_type.includes('poi'))) {
            bestMatch = feature;
            break;
          }
        }
        
        const [longitude, latitude] = bestMatch.center;
        console.log(`Geocoded address (fallback): ${address} -> ${bestMatch.place_name || bestMatch.text}`);
        return {
          latitude: latitude,
          longitude: longitude,
        };
      }
    } catch (error) {
      console.warn('Fallback geocoding failed:', error.message);
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error.response?.data || error.message);
    return null;
  }
};

module.exports = { geocodeAddress };
